/**
 * Azure DevOps Integration for Issue Tracker Setup
 *
 * Handles Azure DevOps authentication and connection validation
 *
 * @module cli/helpers/issue-tracker/ado
 */

import chalk from 'chalk';
import { confirm, input, password, checkbox } from '@inquirer/prompts';
import ora from 'ora';
import { getAzureDevOpsAuth } from '../../../utils/auth-helpers.js';
import {
  parseEnvFile,
  readEnvFile
} from '../../../utils/env-file.js';
import type {
  AzureDevOpsCredentials,
  ExistingCredentials,
  ValidationResult
} from './types.js';
import {
  retryWithBackoff,
  checkRateLimit
} from './utils.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';
import { RateLimitError } from './types.js';

/**
 * Check for existing Azure DevOps credentials
 *
 * @param projectPath - Path to project root
 * @returns Existing credentials or null
 */
export async function checkExistingAzureDevOpsCredentials(
  projectPath: string
): Promise<ExistingCredentials | null> {
  // 1. Check project .env file
  const envContent = readEnvFile(projectPath);
  if (envContent) {
    const parsed = parseEnvFile(envContent);
    if (parsed.AZURE_DEVOPS_PAT && parsed.AZURE_DEVOPS_ORG && parsed.AZURE_DEVOPS_PROJECT) {
      return {
        source: '.env',
        credentials: {
          pat: parsed.AZURE_DEVOPS_PAT,
          org: parsed.AZURE_DEVOPS_ORG,
          project: parsed.AZURE_DEVOPS_PROJECT
        }
      };
    }
  }

  // 2. Check environment variables
  const auth = getAzureDevOpsAuth();
  if (auth) {
    return {
      source: 'env-vars',
      credentials: auth
    };
  }

  return null;
}

/**
 * Prompt user for Azure DevOps credentials with cache support
 *
 * NEW (v0.24.0): Caches last used organization/project for quick re-initialization
 *
 * @param language - User's language
 * @param projectRoot - Project root path (optional, for cache manager)
 * @returns Credentials or null if skipped
 */
export async function promptAzureDevOpsCredentials(
  language: SupportedLanguage,
  projectRoot?: string
): Promise<AzureDevOpsCredentials | null> {
  const locale = getLocaleManager(language);

  console.log(chalk.white('\n📋 Azure DevOps Integration Setup\n'));
  console.log(chalk.gray('SpecWeave will sync increments with Azure DevOps Work Items.\n'));

  // Step 0: Check cache for previous configuration (NEW in v0.24.0)
  let cachedConfig: { org: string; project: string; teams?: string[] } | null = null;
  if (projectRoot) {
    const { CacheManager } = await import('../../../core/cache/cache-manager.js');
    const cacheManager = new CacheManager(projectRoot);
    cachedConfig = await cacheManager.get<{ org: string; project: string; teams?: string[] }>('ado-config');

    if (cachedConfig) {
      console.log(chalk.cyan('✨ Found cached ADO configuration:\n'));
      console.log(chalk.gray(`   Organization: ${cachedConfig.org}`));
      console.log(chalk.gray(`   Project: ${cachedConfig.project}`));
      if (cachedConfig.teams && cachedConfig.teams.length > 0) {
        console.log(chalk.gray(`   Teams: ${cachedConfig.teams.join(', ')}`));
      }
      console.log('');

      const reuseConfig = await confirm({
        message: 'Use cached configuration?',
        default: true
      });

      if (!reuseConfig) {
        cachedConfig = null; // User wants to enter new config
      }
    }
  }

  // Show setup instructions
  console.log(chalk.cyan('📋 Quick Setup:'));
  console.log(chalk.gray('   1. Go to: https://dev.azure.com/{org}/_usersSettings/tokens'));
  console.log(chalk.gray('   2. Click "New Token"'));
  console.log(chalk.gray('   3. Scopes: Work Items (Read, Write, Manage), Code (Read), Project (Read)'));
  console.log(chalk.gray('   4. Copy the token\n'));

  const continueSetup = await confirm({
    message: 'Continue with Azure DevOps setup?',
    default: true
  });

  if (!continueSetup) {
    return null;
  }

  // Collect credentials (use cached values as defaults if available)
  let org: string, project: string, teams: string[];

  if (cachedConfig) {
    // Use cached configuration
    org = cachedConfig.org;
    project = cachedConfig.project;
    teams = cachedConfig.teams || [];
  } else {
    // Prompt for new configuration
    org = await input({
      message: 'Azure DevOps organization name:',
      validate: (value: string) => {
        if (!value || value.trim() === '') {
          return 'Organization cannot be empty';
        }
        return true;
      }
    });

    project = await input({
      message: 'Project name:',
      validate: (value: string) => {
        if (!value || value.trim() === '') {
          return 'Project cannot be empty';
        }
        return true;
      }
    });

    // Teams/areas will be auto-fetched after PAT validation
    teams = [];
  }

  // Step 1: Prompt for PAT (before teams - so we can auto-fetch!)
  const pat = await password({
    message: 'Paste your Personal Access Token:',
    mask: '*',
    validate: (value: string) => {
      if (!value || value.length === 0) {
        return 'Token cannot be empty';
      }
      // ADO PATs are typically 52 characters, but fine-grained tokens can be >= 40
      if (value.length < 40) {
        return 'Azure DevOps tokens should be at least 40 characters';
      }
      return true;
    }
  });

  // Step 2: Validate PAT and auto-fetch teams/areas
  const spinner = ora('Validating PAT and fetching teams/areas...').start();
  let fetchedTeams: Array<{ name: string; id: string }> = [];
  let fetchedAreas: Array<{ name: string; path: string }> = [];
  let areaPaths: string[] = [];

  try {
    // Validate connection first
    const projectEndpoint = `https://dev.azure.com/${org}/_apis/projects/${project}?api-version=7.0`;
    const auth = Buffer.from(`:${pat}`).toString('base64');
    const response = await fetch(projectEndpoint, {
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
    });

    if (!response.ok) {
      spinner.fail('PAT validation failed');
      console.log(chalk.red(`   Error: ${response.status === 401 ? 'Invalid PAT' : 'Check org/project name'}`));
      return null;
    }

    spinner.text = 'Fetching teams and area paths...';

    // Fetch teams and areas in parallel
    const { fetchTeamsForProject, fetchAreaPathsForProject } = await import(
      '../../../../plugins/specweave-ado/lib/ado-board-resolver.js'
    );

    const [teamsResult, areasResult] = await Promise.all([
      fetchTeamsForProject(org, project, pat).catch((): never[] => []),
      fetchAreaPathsForProject(org, project, pat).catch((): never[] => [])
    ]);

    fetchedTeams = teamsResult.map((t: any) => ({ name: t.name, id: t.id }));
    fetchedAreas = areasResult.map((a: any) => ({ name: a.name, path: a.path }));
    spinner.succeed(`Found ${fetchedTeams.length} teams, ${fetchedAreas.length} area paths`);

  } catch (error: any) {
    spinner.warn('Could not auto-fetch teams/areas - using manual input');
  }

  // Step 3: Let user select area paths (if any found)
  if (fetchedAreas.length > 0) {
    const areaChoices = fetchedAreas.map(a => ({
      name: a.path,
      value: a.path,
      checked: false
    }));

    areaPaths = await checkbox({
      message: 'Select area paths to sync (space to select, enter to confirm):',
      choices: areaChoices
    });
  }

  // Step 4: Let user select teams (if any found)
  if (fetchedTeams.length > 0) {
    const teamChoices = fetchedTeams.map(t => ({
      name: t.name,
      value: t.name,
      checked: false
    }));

    teams = await checkbox({
      message: 'Select teams (optional, press enter to skip):',
      choices: teamChoices
    });
  }

  // Cache the configuration (NOT the PAT) for future use
  if (projectRoot) {
    const { CacheManager } = await import('../../../core/cache/cache-manager.js');
    const cacheManager = new CacheManager(projectRoot);
    await cacheManager.set('ado-config', {
      org,
      project,
      teams: teams.length > 0 ? teams : undefined,
      areaPaths: areaPaths.length > 0 ? areaPaths : undefined
    });
  }

  return {
    pat,
    org,
    project,
    team: teams[0],
    teams: teams.length > 0 ? teams : undefined,
    areaPaths: areaPaths.length > 0 ? areaPaths : undefined  // NEW: Selected area paths
  };
}

/**
 * Validate Azure DevOps connection
 *
 * Tests authentication and returns project information
 * Handles rate limiting with retry logic
 *
 * @param credentials - Azure DevOps credentials
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Validation result
 */
export async function validateAzureDevOpsConnection(
  credentials: AzureDevOpsCredentials,
  maxRetries: number = 3
): Promise<ValidationResult> {
  const spinner = ora('Testing connection...').start();

  try {
    const result = await retryWithBackoff(async () => {
      // Test connection by fetching project details
      const projectEndpoint =
        `https://dev.azure.com/${credentials.org}/_apis/projects/${credentials.project}?api-version=7.0`;

      // Basic auth with PAT (username can be empty)
      const auth = Buffer.from(`:${credentials.pat}`).toString('base64');

      const response = await fetch(projectEndpoint, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      // Check for rate limiting
      const rateLimitInfo = checkRateLimit(response);
      if (rateLimitInfo) {
        throw new RateLimitError(
          'Azure DevOps API rate limit exceeded',
          rateLimitInfo
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Authentication failed';

        if (response.status === 401) {
          errorMessage = 'Invalid Personal Access Token';
        } else if (response.status === 403) {
          errorMessage = 'Access forbidden (check token scopes)';
        } else if (response.status === 404) {
          errorMessage = 'Project not found (check organization and project name)';
        } else {
          errorMessage = `HTTP ${response.status}: ${errorText}`;
        }

        throw new Error(errorMessage);
      }

      const project: any = await response.json();
      return project;
    }, maxRetries);

    spinner.succeed(`Connected to Azure DevOps project: ${result.name}`);

    return {
      success: true,
      username: result.name
    };
  } catch (error: any) {
    spinner.fail('Azure DevOps authentication failed');

    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Get Azure DevOps environment variables for .env file
 *
 * @param credentials - Azure DevOps credentials
 * @returns Array of key-value pairs for .env
 */
export function getAzureDevOpsEnvVars(
  credentials: AzureDevOpsCredentials
): Array<{ key: string; value: string }> {
  const envVars = [
    { key: 'AZURE_DEVOPS_PAT', value: credentials.pat },
    { key: 'AZURE_DEVOPS_ORG', value: credentials.org },
    { key: 'AZURE_DEVOPS_PROJECT', value: credentials.project }  // Always singular (one project)
  ];

  // Write teams as comma-separated if multiple, otherwise single
  if (credentials.teams && credentials.teams.length > 1) {
    envVars.push({ key: 'AZURE_DEVOPS_TEAMS', value: credentials.teams.join(',') });
  } else if (credentials.team) {
    envVars.push({ key: 'AZURE_DEVOPS_TEAM', value: credentials.team });
  }

  return envVars;
}

/**
 * Show Azure DevOps setup complete message
 *
 * @param language - User's language
 */
export function showAzureDevOpsSetupComplete(language: SupportedLanguage): void {
  const locale = getLocaleManager(language);

  console.log(chalk.green.bold('\n✅ Azure DevOps integration complete!\n'));
  console.log(chalk.white('Available commands:'));
  console.log(chalk.gray('  /specweave-ado:sync'));
  console.log(chalk.gray('  /specweave-ado:status\n'));
  console.log(chalk.cyan('💡 Tip: Use /specweave:increment "feature" to create an increment'));
  console.log(chalk.gray('   It will automatically sync to Azure DevOps Work Items!\n'));
}

/**
 * Show Azure DevOps setup skipped message
 *
 * @param language - User's language
 */
export function showAzureDevOpsSetupSkipped(language: SupportedLanguage): void {
  const locale = getLocaleManager(language);

  console.log(chalk.yellow('\n⏭️  Skipped Azure DevOps setup\n'));
  console.log(chalk.white('You can configure later:'));
  console.log(chalk.gray('  1. Add AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT to .env'));
  console.log(chalk.gray('  2. Install plugin: /plugin install specweave-ado\n'));
  console.log(chalk.cyan('💡 Per-Project Configuration (Advanced):'));
  console.log(chalk.gray('   AZURE_DEVOPS_PROJECTS=Backend,Frontend,Mobile'));
  console.log(chalk.gray('   AZURE_DEVOPS_AREA_PATHS_Backend=API,Database,Cache'));
  console.log(chalk.gray('   AZURE_DEVOPS_AREA_PATHS_Frontend=Web,Admin,Public'));
  console.log(chalk.gray('   AZURE_DEVOPS_TEAMS_Backend=Alpha,Beta\n'));
}

// Export auto-discovery (NEW in v0.24.0)
export { autoDiscoverAdoProjects } from './ado-auto-discover.js';
