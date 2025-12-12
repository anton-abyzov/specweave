/**
 * Jira Integration for Issue Tracker Setup
 *
 * Handles Jira Cloud and Jira Server/Data Center authentication
 *
 * NEW (v0.33.0): Aligned with ADO init pattern
 * - Single vs multi-project selection
 * - Per-project board selection (2-level structure)
 * - Configuration stored in config.json (ADR-0050)
 *
 * @module cli/helpers/issue-tracker/jira
 */

import chalk from 'chalk';
import { select, input, confirm, checkbox, password } from '@inquirer/prompts';
import ora from 'ora';
import * as path from 'path';
import { getJiraAuth } from '../../../utils/auth-helpers.js';
import {
  parseEnvFile,
  readEnvFile
} from '../../../utils/env-file.js';
import type {
  JiraCredentials,
  ExistingCredentials,
  ValidationResult,
  JiraInstanceType,
  JiraProjectConfig
} from './types.js';
import type {
  JiraStrategy,
  JiraInstanceType as ConfigJiraInstanceType,
  JiraProjectConfig as ConfigJiraProjectConfig,
  JiraBoardConfig
} from '../../../core/config/types.js';
import {
  isValidEmail,
  retryWithBackoff,
  checkRateLimit
} from './utils.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';
import { RateLimitError } from './types.js';
import { JiraClient } from '../../../integrations/jira/jira-client.js';

/**
 * Check for existing Jira credentials
 *
 * @param projectPath - Path to project root
 * @returns Existing credentials or null
 */
export async function checkExistingJiraCredentials(
  projectPath: string
): Promise<ExistingCredentials | null> {
  // 1. Check project .env file
  const envContent = readEnvFile(projectPath);
  if (envContent) {
    const parsed = parseEnvFile(envContent);
    if (parsed.JIRA_API_TOKEN && parsed.JIRA_EMAIL && parsed.JIRA_DOMAIN) {
      return {
        source: '.env',
        credentials: {
          token: parsed.JIRA_API_TOKEN,
          email: parsed.JIRA_EMAIL,
          domain: parsed.JIRA_DOMAIN,
          instanceType: 'cloud' // Assume cloud unless specified
        }
      };
    }
  }

  // 2. Check environment variables
  const auth = getJiraAuth();
  if (auth) {
    return {
      source: 'env-vars',
      credentials: {
        ...auth,
        instanceType: 'cloud'
      }
    };
  }

  return null;
}

/**
 * Auto-discover Jira projects via API with CLI-first smart pagination and cache support
 *
 * NEW (v0.24.0): Uses ProjectCountFetcher + ImportStrategyPrompter + AsyncProjectLoader + CacheManager
 * - Checks cache first (24-hour TTL)
 * - Counts projects first (< 1 second) if cache miss
 * - Prompts for import strategy (import-all is default)
 * - Uses smart pagination (50-project batches) for large imports
 * - Caches results for future use
 *
 * @param credentials - Partial credentials (domain, email, token)
 * @param projectRoot - Project root path (for cache manager)
 * @returns Array of selected project keys
 */
async function autoDiscoverJiraProjects(
  credentials: {
    domain: string;
    email: string;
    token: string;
    instanceType: JiraInstanceType;
  },
  projectRoot?: string
): Promise<string[]> {
  // Step 0: Check cache first (NEW in v0.24.0)
  if (projectRoot) {
    const { CacheManager } = await import('../../../core/cache/cache-manager.js');
    const cacheManager = new CacheManager(projectRoot);
    const cacheKey = `jira-projects-${credentials.domain}`;

    const cachedProjects = await cacheManager.get<string[]>(cacheKey);
    if (cachedProjects && cachedProjects.length > 0) {
      console.log(chalk.cyan('✨ Using cached project list (24h TTL)\n'));
      return cachedProjects;
    }
  }

  // Step 1: Count check (< 1 second)
  const { getProjectCount } = await import('../project-count-fetcher.js');
  const countSpinner = ora('Checking accessible Jira projects...').start();

  try {
    const countResult = await getProjectCount({
      provider: 'jira',
      credentials: {
        domain: credentials.domain,
        email: credentials.email,
        token: credentials.token,
        instanceType: credentials.instanceType
      }
    });

    if (countResult.error) {
      countSpinner.fail('Failed to check project count');
      console.error(chalk.red(`   Error: ${countResult.error}\n`));
      throw new Error(countResult.error);
    }

    const totalCount = countResult.accessible;
    countSpinner.succeed(`Found ${totalCount} accessible project(s)`);

    if (totalCount === 0) {
      console.log(chalk.yellow('\n⚠️  No accessible projects found.'));
      console.log(chalk.gray('   Please check your permissions or create a project first.\n'));
      return [];
    }

    // Step 2: Prompt for import strategy (CLI-first: "Import all" is default)
    const { promptImportStrategy } = await import('../import-strategy-prompter.js');
    const strategyResult = await promptImportStrategy({
      totalCount,
      provider: 'jira'
    });

    // Step 3: Execute based on strategy
    let selectedProjects: string[] = [];

    if (strategyResult.strategy === 'manual-entry') {
      // Manual entry: return provided keys
      selectedProjects = strategyResult.projectKeys || [];
    } else if (strategyResult.strategy === 'import-all') {
      // Import all: use AsyncProjectLoader with smart pagination
      const { AsyncProjectLoader } = await import('../async-project-loader.js');
      const loader = new AsyncProjectLoader(
        {
          domain: credentials.domain,
          email: credentials.email,
          token: credentials.token,
          instanceType: credentials.instanceType
        },
        'jira',
        {
          batchSize: 50,
          updateFrequency: 5,
          showEta: true
        }
      );

      const result = await loader.fetchAllProjects(totalCount);

      if (result.canceled) {
        console.log(chalk.yellow('\n⚠️  Import canceled by user. Returning partial results.\n'));
      }

      if (result.failed > 0) {
        console.log(chalk.yellow(`\n⚠️  ${result.failed} project(s) failed to load. Check logs for details.\n`));
        console.log(chalk.gray('   Error log: .specweave/logs/import-errors.log\n'));
      }

      // Get project keys
      selectedProjects = result.projects.map(p => p.key);
    } else {
      // Select specific: load first 50 projects, show checkbox with all pre-checked
      const spinner = ora('Loading first 50 projects...').start();

      try {
        const { AsyncProjectLoader } = await import('../async-project-loader.js');
        const loader = new AsyncProjectLoader(
          {
            domain: credentials.domain,
            email: credentials.email,
            token: credentials.token,
            instanceType: credentials.instanceType
          },
          'jira'
        );

        // Load first 50 projects
        const firstBatch = await loader.fetchBatch(0, Math.min(50, totalCount));
        spinner.succeed(`Loaded ${firstBatch.length} project(s)`);

        // Show checkbox with ALL pre-checked (CLI-first: deselection workflow)
        const selected = await checkbox({
          message: 'Select Jira projects to sync (Space to deselect, Enter to confirm):',
          choices: firstBatch.map((p: any) => ({
            name: `${p.key} - ${p.name}`,
            value: p.key,
            checked: true  // CLI-first: all pre-checked by default
          }))
        });

        selectedProjects = selected;
      } catch (error: any) {
        spinner.fail('Failed to load projects');
        console.error(chalk.red(`   Error: ${error.message}\n`));
        throw error;
      }
    }

    // Step 4: Cache the results (NEW in v0.24.0)
    if (projectRoot && selectedProjects.length > 0) {
      const { CacheManager } = await import('../../../core/cache/cache-manager.js');
      const cacheManager = new CacheManager(projectRoot);
      const cacheKey = `jira-projects-${credentials.domain}`;
      await cacheManager.set(cacheKey, selectedProjects);
    }

    return selectedProjects;
  } catch (error: any) {
    if (countSpinner.isSpinning) {
      countSpinner.fail('Failed to discover projects');
    }
    console.error(chalk.red(`   Error: ${error.message}\n`));
    throw error;
  }
}

/**
 * Prompt user for Jira credentials
 *
 * Supports:
 * - Jira Cloud (atlassian.net)
 * - Jira Server/Data Center (self-hosted)
 *
 * @param language - User's language
 * @param projectRoot - Project root path (optional, for cache manager)
 * @returns Credentials or null if skipped
 */
export async function promptJiraCredentials(
  language: SupportedLanguage,
  projectRoot?: string
): Promise<JiraCredentials | null> {
  const locale = getLocaleManager(language);

  console.log(chalk.white('\n📋 Jira Integration Setup\n'));
  console.log(chalk.gray('SpecWeave will sync increments with Jira Issues.\n'));

  // Step 1: Ask about instance type (Cloud vs Server)
  const instanceType = await select({
    message: 'Which Jira instance are you using?',
    choices: [
      { name: 'Jira Cloud (*.atlassian.net)', value: 'cloud' },
      { name: 'Jira Server/Data Center (self-hosted)', value: 'server' }
    ],
    default: 'cloud'
  });

  // Step 1.5: Note - Strategy will be auto-detected after project selection

  // Step 2: Show setup instructions
  console.log(chalk.cyan('\n📋 Quick Setup:'));

  if (instanceType === 'cloud') {
    console.log(chalk.gray('   1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens'));
    console.log(chalk.gray('   2. Click "Create API token"'));
    console.log(chalk.gray('   3. Label: "SpecWeave - [your-project]"'));
    console.log(chalk.gray('   4. Copy the token\n'));
  } else {
    console.log(chalk.gray('   1. Go to your Jira settings → Personal Access Tokens'));
    console.log(chalk.gray('   2. Create new token with "Read/Write" permissions'));
    console.log(chalk.gray('   3. Label: "SpecWeave - [your-project]"'));
    console.log(chalk.gray('   4. Copy the token\n'));
  }

  const continueSetup = await confirm({
    message: 'Continue with Jira setup?',
    default: true
  });

  if (!continueSetup) {
    return null;
  }

  // Step 3: Collect credentials
  const domain = await input({
    message: instanceType === 'cloud'
      ? 'Jira domain (e.g., your-company.atlassian.net):'
      : 'Jira Server URL (e.g., jira.company.com):',
    validate: (val: string) => {
      if (!val || val.trim() === '') {
        return 'Domain cannot be empty';
      }

      // Prevent SSRF attacks - block localhost and internal IP addresses
      if (/localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\./i.test(val)) {
        return 'Internal IP addresses and localhost are not allowed';
      }

      // For cloud, suggest .atlassian.net but don't enforce (user might have custom domain)
      if (instanceType === 'cloud' && !val.includes('.')) {
        return 'Please enter a valid domain (e.g., your-company.atlassian.net)';
      }
      return true;
    }
  });

  const email = await input({
    message: 'Your Jira email:',
    validate: (val: string) => {
      if (!isValidEmail(val)) {
        return 'Please enter a valid email address';
      }
      return true;
    }
  });

  const token = await password({
    message: 'Paste your Jira API token:',
    mask: true,
    validate: (val: string) => {
      if (!val || val.length === 0) {
        return 'Token cannot be empty';
      }
      return true;
    }
  });

  // Step 3.5: Validate PAT and fetch all accessible projects (similar to ADO)
  const spinner = ora('Validating credentials and fetching projects...').start();
  let allProjects: Array<{ key: string; name: string; id: string }> = [];

  try {
    const { getProjectCount } = await import('../project-count-fetcher.js');
    const countResult = await getProjectCount({
      provider: 'jira',
      credentials: {
        domain,
        email,
        token,
        instanceType: instanceType as JiraInstanceType
      }
    });

    if (countResult.error) {
      spinner.fail('Credential validation failed');
      console.log(chalk.red(`   Error: ${countResult.error}`));
      return null;
    }

    const totalCount = countResult.accessible;
    spinner.succeed(`Found ${totalCount} accessible project${totalCount === 1 ? '' : 's'}`);

    if (totalCount === 0) {
      console.log(chalk.yellow('\n⚠️  No accessible projects found.'));
      console.log(chalk.gray('   Please check your permissions or create a project first.\n'));
      return null;
    }

    // Fetch projects for selection
    const { AsyncProjectLoader } = await import('../async-project-loader.js');
    const loader = new AsyncProjectLoader(
      { domain, email, token, instanceType: instanceType as JiraInstanceType },
      'jira',
      { batchSize: 50 }
    );

    const result = await loader.fetchAllProjects(Math.min(100, totalCount));
    allProjects = result.projects.map(p => ({
      key: p.key,
      name: p.name,
      id: p.id || ''
    }));
  } catch (error: any) {
    spinner.fail('Failed to fetch projects');
    console.log(chalk.red(`   Error: ${error.message}`));
    return null;
  }

  // Step 4: Ask single vs multi-project (ALIGNED WITH ADO!)
  const projectMode = await select<'single' | 'multi'>({
    message: 'How many projects do you want to configure?',
    choices: [
      {
        name: `Single project (quick setup)`,
        value: 'single' as const
      },
      {
        name: `Multiple projects (enterprise setup - ${allProjects.length} available)`,
        value: 'multi' as const
      }
    ],
    default: allProjects.length > 1 ? 'multi' : 'single'
  });

  // Handle multi-project selection (NEW - mirrors ADO pattern)
  if (projectMode === 'multi') {
    return handleMultiProjectSelection(domain, email, token, instanceType as JiraInstanceType, allProjects, projectRoot);
  }

  // Single project flow
  return handleSingleProjectSelection(domain, email, token, instanceType as JiraInstanceType, allProjects, projectRoot);
}

/**
 * Handle single project selection (mirrors ADO pattern)
 */
async function handleSingleProjectSelection(
  domain: string,
  email: string,
  token: string,
  instanceType: JiraInstanceType,
  allProjects: Array<{ key: string; name: string; id: string }>,
  projectRoot?: string
): Promise<JiraCredentials | null> {
  // Select a single project
  const projectKey = await select<string>({
    message: 'Select project:',
    choices: allProjects.map(p => ({
      name: `${p.key} - ${p.name}`,
      value: p.key
    })),
    default: allProjects[0]?.key
  });

  const selectedProject = allProjects.find(p => p.key === projectKey);

  // Fetch boards for selected project (2-level: project → boards)
  const spinner = ora('Fetching boards...').start();
  let boards: Array<{ id: string; name: string }> = [];

  try {
    boards = await fetchProjectBoards(domain, email, token, instanceType, projectKey);
    spinner.succeed(`Found ${boards.length} board${boards.length === 1 ? '' : 's'}`);
  } catch {
    spinner.succeed('No boards found (will use project root)');
  }

  // CRITICAL SIMPLIFICATION (v0.35.3): Remove board selection
  // JIRA boards are just VIEWS/FILTERS over project data - not organizational units!
  // Correct mapping: JIRA Project → SpecWeave Project (1:1)
  // Folder structure: AAC/FS-XXX/ (no board level)

  // Build credentials with single project (NO boards)
  return {
    token,
    email,
    domain,
    instanceType,
    strategy: 'project-per-team',  // Legacy field (ignored)
    projects: [projectKey],
    projectConfigs: [{
      key: projectKey,
      name: selectedProject?.name,
      id: selectedProject?.id,
      // boards: REMOVED (v0.35.3) - boards are views, not organizational structure!
      isDefault: true
    }]
  };
}

/**
 * Handle multi-project selection (NEW - mirrors ADO pattern)
 */
async function handleMultiProjectSelection(
  domain: string,
  email: string,
  token: string,
  instanceType: JiraInstanceType,
  allProjects: Array<{ key: string; name: string; id: string }>,
  projectRoot?: string
): Promise<JiraCredentials | null> {
  console.log('');
  console.log(chalk.cyan('📦 Multi-Project Selection'));
  console.log(chalk.gray('   Select the projects you want to manage with SpecWeave.\n'));

  // Multi-select checkbox for projects (default: first project selected)
  const selectedProjectKeys = await checkbox({
    message: 'Select projects to configure:',
    choices: allProjects.map((p, index) => ({
      name: `${p.key} - ${p.name}`,
      value: p.key,
      checked: index === 0 // Default: first project selected
    })),
    pageSize: 15,
    validate: (selected) => {
      if (selected.length === 0) {
        return 'Please select at least one project';
      }
      return true;
    }
  });

  if (selectedProjectKeys.length === 0) {
    console.log(chalk.yellow('\n⚠️  No projects selected'));
    return null;
  }

  console.log(chalk.green(`\n✓ Selected ${selectedProjectKeys.length} project${selectedProjectKeys.length > 1 ? 's' : ''}`));

  // For each project, prompt for board selection (2-level structure)
  const projectConfigs: JiraProjectConfig[] = [];

  for (let i = 0; i < selectedProjectKeys.length; i++) {
    const projectKey = selectedProjectKeys[i];
    const projectInfo = allProjects.find(p => p.key === projectKey);
    console.log('');
    console.log(chalk.cyan(`📁 Configuring: ${projectKey} (${i + 1}/${selectedProjectKeys.length})`));

    // Fetch boards for this project
    const spinner = ora('Fetching boards...').start();
    let boards: Array<{ id: string; name: string }> = [];

    try {
      boards = await fetchProjectBoards(domain, email, token, instanceType, projectKey);
      spinner.succeed(`Found ${boards.length} board${boards.length === 1 ? '' : 's'}`);
    } catch {
      spinner.succeed('No boards found (will use project root)');
    }

    // CRITICAL SIMPLIFICATION (v0.35.3): Skip board selection
    // JIRA boards are views, not organizational units
    // Use 1-level structure: JIRA Project → SpecWeave Project

    projectConfigs.push({
      key: projectKey,
      name: projectInfo?.name,
      id: projectInfo?.id,
      // boards: REMOVED (v0.35.3) - not needed for folder structure
      isDefault: i === 0 // First project is default
    });
  }

  // Cache the configuration (NOT the token)
  if (projectRoot) {
    const { CacheManager } = await import('../../../core/cache/cache-manager.js');
    const cacheManager = new CacheManager(projectRoot);
    await cacheManager.set('jira-config', {
      domain,
      projectConfigs
    });
  }

  console.log('');
  console.log(chalk.green('✓ Multi-project configuration complete'));
  console.log(chalk.gray(`   ${projectConfigs.length} project${projectConfigs.length > 1 ? 's' : ''} configured`));

  const strategy = projectConfigs.length === 1 ? 'single-project' : 'project-per-team';
  console.log(chalk.gray(`\n📊 Detected strategy: ${strategy === 'single-project' ? 'Single project' : 'Project-per-team'}\n`));

  return {
    token,
    email,
    domain,
    instanceType,
    strategy: strategy as any,
    projects: selectedProjectKeys,
    projectConfigs
  };
}

/**
 * Fetch boards for a Jira project
 *
 * Uses Jira Agile API to fetch boards associated with a project
 */
async function fetchProjectBoards(
  domain: string,
  email: string,
  token: string,
  instanceType: JiraInstanceType,
  projectKey: string
): Promise<Array<{ id: string; name: string }>> {
  const apiBase = instanceType === 'cloud'
    ? `https://${domain}/rest/agile/1.0`
    : `https://${domain}/rest/agile/1.0`;

  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  const response = await fetch(`${apiBase}/board?projectKeyOrId=${projectKey}`, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    return [];
  }

  const data: any = await response.json();
  return (data.values || []).map((b: any) => ({
    id: String(b.id),
    name: b.name
  }));
}

/**
 * Prompt user to select boards for a project
 *
 * Similar to ADO's selectAreaPaths function
 */
async function selectBoards(
  boards: Array<{ id: string; name: string }>,
  projectKey: string
): Promise<Array<{ id: string; name?: string }> | null> {
  const useAllBoards = await confirm({
    message: `Use all ${boards.length} board${boards.length === 1 ? '' : 's'} for ${projectKey}?`,
    default: true
  });

  if (useAllBoards) {
    return boards.map(b => ({ id: b.id, name: b.name }));
  }

  // Let user select specific boards
  const selected = await checkbox({
    message: `Select boards for ${projectKey}:`,
    choices: boards.map((b, index) => ({
      name: `${b.name} (ID: ${b.id})`,
      value: b.id,
      checked: index === 0 // Default: first board selected
    })),
    pageSize: 10
  });

  if (selected.length === 0) {
    console.log(chalk.gray(`   No boards selected, using project root`));
    return null;
  }

  return selected.map(id => {
    const board = boards.find(b => b.id === id);
    return { id, name: board?.name };
  });
}

/**
 * Validate Jira connection
 *
 * Tests authentication and returns user information
 * Handles rate limiting with retry logic
 *
 * @param credentials - Jira credentials
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Validation result
 */
export async function validateJiraConnection(
  credentials: JiraCredentials,
  maxRetries: number = 3
): Promise<ValidationResult> {
  const spinner = ora('Testing connection...').start();

  try {
    const result = await retryWithBackoff(async () => {
      // Determine API endpoint based on instance type
      const apiBase = credentials.instanceType === 'cloud'
        ? `https://${credentials.domain}/rest/api/3`
        : `https://${credentials.domain}/rest/api/2`;

      const userEndpoint = `${apiBase}/myself`;

      // Basic auth header
      const auth = Buffer.from(`${credentials.email}:${credentials.token}`).toString('base64');

      const response = await fetch(userEndpoint, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      // Check for rate limiting
      const rateLimitInfo = checkRateLimit(response);
      if (rateLimitInfo) {
        throw new RateLimitError(
          'Jira API rate limit exceeded',
          rateLimitInfo
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Authentication failed';

        if (response.status === 401) {
          errorMessage = 'Invalid credentials (check email and token)';
        } else if (response.status === 403) {
          errorMessage = 'Access forbidden (check token permissions)';
        } else if (response.status === 404) {
          errorMessage = 'Jira instance not found (check domain)';
        } else {
          errorMessage = `HTTP ${response.status}: ${errorText}`;
        }

        throw new Error(errorMessage);
      }

      const user: any = await response.json();
      return user;
    }, maxRetries);

    spinner.succeed(`Connected to Jira as ${result.displayName || result.name}`);

    return {
      success: true,
      username: result.displayName || result.name
    };
  } catch (error: any) {
    spinner.fail('Jira authentication failed');

    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Get Jira environment variables for .env file
 *
 * ONLY SECRETS - All non-sensitive config goes to config.json via getJiraConfig()
 *
 * @param credentials - Jira credentials
 * @returns Array of key-value pairs for .env (secrets only)
 */
export function getJiraEnvVars(credentials: JiraCredentials): Array<{ key: string; value: string }> {
  // ONLY secrets (tokens, emails)
  return [
    { key: 'JIRA_API_TOKEN', value: credentials.token },
    { key: 'JIRA_EMAIL', value: credentials.email }
  ];
}

/**
 * Get Jira configuration for config.json
 *
 * Extracts non-sensitive configuration from credentials
 *
 * @param credentials - Jira credentials
 * @returns Partial config object for config.json
 */
export function getJiraConfig(credentials: JiraCredentials): {
  issueTracker: {
    provider: 'jira';
    domain: string;
    instanceType?: ConfigJiraInstanceType;
    strategy?: JiraStrategy;
    projects?: ConfigJiraProjectConfig[];
    project?: string;
    components?: string[];
    boards?: JiraBoardConfig[];
  };
} {
  const config: {
    issueTracker: {
      provider: 'jira';
      domain: string;
      instanceType?: ConfigJiraInstanceType;
      strategy?: JiraStrategy;
      projects?: ConfigJiraProjectConfig[];
      project?: string;
      components?: string[];
      boards?: JiraBoardConfig[];
    };
  } = {
    issueTracker: {
      provider: 'jira',
      domain: credentials.domain,
      instanceType: credentials.instanceType
    }
  };

  // Add strategy if specified
  if (credentials.strategy) {
    config.issueTracker.strategy = credentials.strategy as JiraStrategy;
  }

  // NEW (v0.33.0): Handle multi-project with per-project boards (2-level structure)
  if (credentials.projectConfigs && credentials.projectConfigs.length > 0) {
    config.issueTracker.projects = credentials.projectConfigs.map((projConfig: JiraProjectConfig) => ({
      key: projConfig.key,
      name: projConfig.name,
      id: projConfig.id,
      boards: projConfig.boards?.map(b => ({ id: b.id, name: b.name }))
    }));
    return config;
  }

  // Legacy: Strategy 1: Project-per-team (string array)
  if (credentials.strategy === 'project-per-team' && credentials.projects) {
    config.issueTracker.projects = credentials.projects.map((key: string) => ({ key }));
  }
  // Strategy 2: Component-based
  else if (credentials.strategy === 'component-based') {
    if (credentials.project) {
      config.issueTracker.project = credentials.project;
    }
    if (credentials.components) {
      config.issueTracker.components = credentials.components;
    }
  }
  // Strategy 3: Board-based
  else if (credentials.strategy === 'board-based') {
    if (credentials.project) {
      config.issueTracker.project = credentials.project;
    }
    if (credentials.boards) {
      config.issueTracker.boards = credentials.boards.map((id: string) => ({ id }));
    }
  }

  return config;
}

/**
 * Create Jira project folder structure (similar to ADO)
 *
 * NEW (v0.33.0): Creates living docs folder structure for Jira projects
 * - 1-level: project only (e.g., .specweave/docs/internal/specs/frontend/)
 * - 2-level: project + board (e.g., .specweave/docs/internal/specs/frontend/sprint-board/)
 *
 * @param projectPath - Path to project root
 * @param credentials - Jira credentials with projectConfigs
 */
export function createJiraProjectFolders(
  projectPath: string,
  credentials: JiraCredentials
): void {
  const specsDir = path.join(projectPath, '.specweave', 'docs', 'internal', 'specs');
  const fs = require('fs');

  if (!fs.existsSync(specsDir)) {
    fs.mkdirSync(specsDir, { recursive: true });
  }

  // Handle multi-project configuration (v0.33.0+)
  if (credentials.projectConfigs && credentials.projectConfigs.length > 0) {
    console.log(chalk.cyan(`\n📁 Creating folder structure for ${credentials.projectConfigs.length} project(s)...`));

    for (const projConfig of credentials.projectConfigs) {
      const projectKey = projConfig.key.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const projectDir = path.join(specsDir, projectKey);

      // Create project folder
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
        console.log(chalk.gray(`   Created: ${projectKey}/`));
      }

      // Create board folders (2-level structure)
      if (projConfig.boards && projConfig.boards.length > 0) {
        for (const board of projConfig.boards) {
          const boardName = (board.name || `board-${board.id}`).toLowerCase().replace(/[^a-z0-9]/g, '-');
          const boardDir = path.join(projectDir, boardName);

          if (!fs.existsSync(boardDir)) {
            fs.mkdirSync(boardDir, { recursive: true });
            console.log(chalk.gray(`   Created: ${projectKey}/${boardName}/`));
          }
        }
      }
    }

    console.log(chalk.green(`✓ JIRA folder structure created for ${credentials.projectConfigs.length} project(s)`));
    return;
  }

  // Handle legacy single-project or string array configuration
  if (credentials.projects && credentials.projects.length > 0) {
    console.log(chalk.cyan(`\n📁 Creating folder structure for ${credentials.projects.length} project(s)...`));

    for (const projectKey of credentials.projects) {
      const sanitizedKey = projectKey.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const projectDir = path.join(specsDir, sanitizedKey);

      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
        console.log(chalk.gray(`   Created: ${sanitizedKey}/`));
      }
    }

    console.log(chalk.green(`✓ JIRA folder structure created for ${credentials.projects.length} project(s)`));
    return;
  }

  // Handle single project (backward compatibility)
  if (credentials.project) {
    const projectKey = credentials.project.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const projectDir = path.join(specsDir, projectKey);

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
      console.log(chalk.gray(`   Created: ${projectKey}/`));
    }

    console.log(chalk.green(`✓ JIRA folder structure created`));
  }
}

/**
 * Show Jira setup complete message
 *
 * @param language - User's language
 */
export function showJiraSetupComplete(language: SupportedLanguage): void {
  const locale = getLocaleManager(language);

  console.log(chalk.green.bold('\n✅ Jira integration configured!\n'));
  console.log(chalk.gray('Credentials saved to .env (gitignored)\n'));
  console.log(chalk.cyan('💡 Tip: Run /sw:increment "feature" to create an increment'));
  console.log(chalk.gray('   It will automatically sync to Jira!\n'));
}

/**
 * Show Jira setup skipped message
 *
 * @param language - User's language
 */
export function showJiraSetupSkipped(language: SupportedLanguage): void {
  const locale = getLocaleManager(language);

  console.log(chalk.yellow('\n⏭️  Skipped Jira setup\n'));
  console.log(chalk.white('You can configure later:'));
  console.log(chalk.gray('  1. Add JIRA_API_TOKEN, JIRA_EMAIL to .env (secrets only)'));
  console.log(chalk.gray('  2. Run: specweave init to configure Jira\n'));
  console.log(chalk.cyan('💡 Configuration is stored in .specweave/config.json:'));
  console.log(chalk.gray('   issueTracker.provider: "jira"'));
  console.log(chalk.gray('   issueTracker.domain: "your-domain.atlassian.net"'));
  console.log(chalk.gray('   issueTracker.projects: [{ key: "PROJ", boards: [...] }]\n'));
}
