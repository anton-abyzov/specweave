/**
 * Azure DevOps Integration for Issue Tracker Setup
 *
 * Handles Azure DevOps authentication and connection validation
 *
 * @module cli/helpers/issue-tracker/ado
 */

import chalk from 'chalk';
import { confirm, input, password, checkbox, select } from '@inquirer/prompts';
import ora from 'ora';
import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import { getAzureDevOpsAuth } from '../../../utils/auth-helpers.js';
import {
  parseEnvFile,
  readEnvFile
} from '../../../utils/env-file.js';
import { normalizeToProjectId } from '../../../utils/project-id-generator.js';
import type {
  AzureDevOpsCredentials,
  AzureDevOpsProjectConfig,
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
import { selectAreaPaths, toAreaPathObjects } from '../ado-area-selector.js';
import type { AdoProcessTemplate } from './types.js';

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
 * Fetch all accessible projects for an ADO organization
 *
 * @param org - Organization name
 * @param pat - Personal Access Token
 * @returns Array of project objects with name and id
 */
async function fetchAdoProjects(
  org: string,
  pat: string
): Promise<Array<{ name: string; id: string }>> {
  const auth = Buffer.from(`:${pat}`).toString('base64');
  const endpoint = `https://dev.azure.com/${org}/_apis/projects?api-version=7.0`;

  const response = await fetch(endpoint, {
    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.status}`);
  }

  const data: any = await response.json();
  return (data.value || []).map((p: any) => ({ name: p.name, id: p.id }));
}

/**
 * Fetch area paths for a specific project
 *
 * @param org - Organization name
 * @param project - Project name
 * @param pat - Personal Access Token
 * @returns Array of area path objects
 */
async function fetchProjectAreaPaths(
  org: string,
  project: string,
  pat: string
): Promise<Array<{ name: string; path: string }>> {
  try {
    const { fetchAreaPathsForProject } = await import(
      '../../../../plugins/specweave-ado/lib/ado-board-resolver.js'
    );

    const areasResult = await fetchAreaPathsForProject(org, project, pat).catch((): never[] => []);
    return areasResult.map((a: any) => ({ name: a.name, path: a.path }));
  } catch {
    return [];
  }
}

/**
 * Detect process template for an ADO project
 *
 * Determines if project uses SAFe (5-level hierarchy) by checking for Capability work item type.
 * This is critical for proper hierarchy mapping during import:
 * - SAFe: Capability → Epic → Feature → Story → Task (5 levels)
 * - Others: Epic → Feature → Story → Task (4 levels or less)
 *
 * @param org - Organization name
 * @param project - Project name
 * @param pat - Personal Access Token
 * @returns Process template info (template name and hasCapability flag)
 */
async function detectProjectProcessTemplate(
  org: string,
  project: string,
  pat: string
): Promise<{ template: AdoProcessTemplate; hasCapability: boolean }> {
  try {
    const auth = Buffer.from(`:${pat}`).toString('base64');
    const apiVersion = '7.0';

    // Step 1: Get project properties (includes process template)
    const projectUrl = `https://dev.azure.com/${org}/_apis/projects/${project}?includeCapabilities=true&api-version=${apiVersion}`;
    const projectResponse = await fetch(projectUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!projectResponse.ok) {
      return { template: 'unknown', hasCapability: false };
    }

    const projectData: any = await projectResponse.json();

    // Extract template from capabilities.processTemplate.templateName
    let detectedTemplate: AdoProcessTemplate = 'unknown';
    const templateName = projectData.capabilities?.processTemplate?.templateName;
    if (templateName) {
      // Normalize template names
      const normalized = templateName.toLowerCase();
      if (normalized.includes('safe')) {
        detectedTemplate = 'SAFe';
      } else if (normalized.includes('agile')) {
        detectedTemplate = 'Agile';
      } else if (normalized.includes('scrum')) {
        detectedTemplate = 'Scrum';
      } else if (normalized.includes('cmmi')) {
        detectedTemplate = 'CMMI';
      } else if (normalized.includes('basic')) {
        detectedTemplate = 'Basic';
      }
    }

    // Step 2: Check for Capability work item type (indicates SAFe)
    const witUrl = `https://dev.azure.com/${org}/${project}/_apis/wit/workitemtypes?api-version=${apiVersion}`;
    const witResponse = await fetch(witUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    let hasCapability = false;
    if (witResponse.ok) {
      const witData: any = await witResponse.json();
      const workItemTypes = (witData.value || []).map((w: any) => w.name);
      hasCapability = workItemTypes.some((t: string) =>
        t.toLowerCase() === 'capability'
      );

      // If Capability exists but template wasn't detected as SAFe, upgrade it
      if (hasCapability && detectedTemplate !== 'SAFe') {
        detectedTemplate = 'SAFe';
      }
    }

    return {
      template: detectedTemplate,
      hasCapability
    };
  } catch {
    // If detection fails, return unknown (safe default)
    return { template: 'unknown', hasCapability: false };
  }
}

/**
 * Prompt user for Azure DevOps credentials with cache support
 *
 * NEW (v0.24.0): Caches last used organization/project for quick re-initialization
 * NEW (v0.28.x): Multi-project selection for enterprise users (AC-US5-01 to AC-US5-05)
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

  // Step 0: Check cache for previous configuration
  interface CachedAdoConfig {
    org: string;
    project?: string;
    projects?: AzureDevOpsProjectConfig[];
    areaPaths?: string[];
  }
  let cachedConfig: CachedAdoConfig | null = null;
  if (projectRoot) {
    const { CacheManager } = await import('../../../core/cache/cache-manager.js');
    const cacheManager = new CacheManager(projectRoot);
    cachedConfig = await cacheManager.get<CachedAdoConfig>('ado-config');

    if (cachedConfig) {
      console.log(chalk.cyan('✨ Found cached ADO configuration:\n'));
      console.log(chalk.gray(`   Organization: ${cachedConfig.org}`));

      if (cachedConfig.projects && cachedConfig.projects.length > 0) {
        console.log(chalk.gray(`   Projects: ${cachedConfig.projects.map(p => p.name).join(', ')}`));
        for (const proj of cachedConfig.projects) {
          if (proj.areaPaths && proj.areaPaths.length > 0) {
            console.log(chalk.gray(`     ${proj.name} → ${proj.areaPaths.join(', ')}`));
          }
        }
      } else if (cachedConfig.project) {
        console.log(chalk.gray(`   Project: ${cachedConfig.project}`));
        if (cachedConfig.areaPaths && cachedConfig.areaPaths.length > 0) {
          console.log(chalk.gray(`   Area Paths: ${cachedConfig.areaPaths.join(', ')}`));
        }
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

  // Step 1: Get organization name (use cached if available)
  let org: string;
  if (cachedConfig) {
    org = cachedConfig.org;
    console.log(chalk.gray(`   Using cached organization: ${org}`));
  } else {
    org = await input({
      message: 'Azure DevOps organization name:',
      validate: (value: string) => {
        if (!value || value.trim() === '') {
          return 'Organization cannot be empty';
        }
        return true;
      }
    });
  }

  // Step 2: Prompt for PAT
  const pat = await password({
    message: 'Paste your Personal Access Token:',
    mask: true,
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

  // Step 3: Validate PAT and fetch all accessible projects
  const spinner = ora('Validating PAT and fetching projects...').start();
  let allProjects: Array<{ name: string; id: string }> = [];

  try {
    // Validate PAT by fetching projects
    allProjects = await fetchAdoProjects(org, pat);

    if (allProjects.length === 0) {
      spinner.fail('No accessible projects found');
      console.log(chalk.red('   Error: Your PAT may not have Project (Read) scope'));
      return null;
    }

    spinner.succeed(`Found ${allProjects.length} accessible project${allProjects.length === 1 ? '' : 's'}`);

  } catch (error: any) {
    spinner.fail('PAT validation failed');
    console.log(chalk.red(`   Error: ${error.message.includes('401') ? 'Invalid PAT' : 'Check organization name'}`));
    return null;
  }

  // Step 4: Ask single vs multi-project
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

  // Handle multi-project selection
  if (projectMode === 'multi') {
    return handleMultiProjectSelection(org, pat, allProjects, projectRoot);
  }

  // Single project flow (original behavior)
  return handleSingleProjectSelection(org, pat, allProjects, projectRoot);
}

/**
 * Handle single project selection (original flow)
 */
async function handleSingleProjectSelection(
  org: string,
  pat: string,
  allProjects: Array<{ name: string; id: string }>,
  projectRoot?: string
): Promise<AzureDevOpsCredentials | null> {

  // Select a single project
  const project = await select<string>({
    message: 'Select project:',
    choices: allProjects.map(p => ({
      name: p.name,
      value: p.name
    })),
    default: allProjects[0]?.name
  });

  // Fetch area paths for selected project
  const spinner = ora('Fetching area paths...').start();
  const fetchedAreas = await fetchProjectAreaPaths(org, project, pat);
  spinner.succeed(`Found ${fetchedAreas.length} area paths`);

  // Detect process template (SAFe detection for 5-level hierarchy)
  const templateSpinner = ora('Detecting process template...').start();
  const templateInfo = await detectProjectProcessTemplate(org, project, pat);
  if (templateInfo.hasCapability) {
    templateSpinner.succeed(`Process template: ${templateInfo.template} (SAFe 5-level hierarchy detected)`);
  } else {
    templateSpinner.succeed(`Process template: ${templateInfo.template}`);
  }

  // Let user select area paths
  let areaPaths: string[] = [];
  if (fetchedAreas.length > 0) {
    const areaPathObjects = toAreaPathObjects(fetchedAreas.map(a => a.path));
    const selectionResult = await selectAreaPaths(areaPathObjects, project);
    if (selectionResult) {
      areaPaths = selectionResult.areaPaths;
    }
  }

  // Cache the configuration (NOT the PAT)
  if (projectRoot) {
    const { CacheManager } = await import('../../../core/cache/cache-manager.js');
    const cacheManager = new CacheManager(projectRoot);
    await cacheManager.set('ado-config', {
      org,
      project,
      areaPaths: areaPaths.length > 0 ? areaPaths : undefined,
      processTemplate: templateInfo.template,
      hasCapability: templateInfo.hasCapability
    });
  }

  // For single project, also build projects array for consistent handling
  return {
    pat,
    org,
    project,
    areaPaths: areaPaths.length > 0 ? areaPaths : undefined,
    // Also provide projects array for consistent downstream processing
    projects: [{
      name: project,
      areaPaths: areaPaths.length > 0 ? areaPaths : undefined,
      isDefault: true,
      processTemplate: templateInfo.template,
      hasCapability: templateInfo.hasCapability
    }]
  };
}

/**
 * Handle multi-project selection (new in v0.28.x)
 *
 * Implements AC-US5-01 to AC-US5-05
 */
async function handleMultiProjectSelection(
  org: string,
  pat: string,
  allProjects: Array<{ name: string; id: string }>,
  projectRoot?: string
): Promise<AzureDevOpsCredentials | null> {

  console.log('');
  console.log(chalk.cyan('📦 Multi-Project Selection'));
  console.log(chalk.gray('   Select the projects you want to manage with SpecWeave.\n'));

  // AC-US5-02: Multi-select checkbox for projects (default: first project selected)
  const selectedProjectNames = await checkbox({
    message: 'Select projects to configure:',
    choices: allProjects.map((p, index) => ({
      name: p.name,
      value: p.name,
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

  if (selectedProjectNames.length === 0) {
    console.log(chalk.yellow('\n⚠️  No projects selected'));
    return null;
  }

  console.log(chalk.green(`\n✓ Selected ${selectedProjectNames.length} project${selectedProjectNames.length > 1 ? 's' : ''}`));

  // AC-US5-03: For each project, prompt for area path selection
  const projects: AzureDevOpsProjectConfig[] = [];

  for (let i = 0; i < selectedProjectNames.length; i++) {
    const projectName = selectedProjectNames[i];
    console.log('');
    console.log(chalk.cyan(`📁 Configuring: ${projectName} (${i + 1}/${selectedProjectNames.length})`));

    // Fetch area paths for this project
    const spinner = ora('Fetching area paths...').start();
    const fetchedAreas = await fetchProjectAreaPaths(org, projectName, pat);
    spinner.succeed(`Found ${fetchedAreas.length} area paths`);

    // Detect process template (SAFe detection for 5-level hierarchy)
    const templateSpinner = ora('Detecting process template...').start();
    const templateInfo = await detectProjectProcessTemplate(org, projectName, pat);
    if (templateInfo.hasCapability) {
      templateSpinner.succeed(`Process template: ${templateInfo.template} (SAFe 5-level hierarchy detected)`);
    } else {
      templateSpinner.succeed(`Process template: ${templateInfo.template}`);
    }

    let areaPaths: string[] = [];
    if (fetchedAreas.length > 0) {
      const areaPathObjects = toAreaPathObjects(fetchedAreas.map(a => a.path));
      const selectionResult = await selectAreaPaths(areaPathObjects, projectName);
      if (selectionResult) {
        areaPaths = selectionResult.areaPaths;
      }
    }

    projects.push({
      name: projectName,
      areaPaths: areaPaths.length > 0 ? areaPaths : undefined,
      isDefault: i === 0, // First project is default
      processTemplate: templateInfo.template,
      hasCapability: templateInfo.hasCapability
    });
  }

  // Ask about umbrella/parent project (optional)
  if (projects.length > 1) {
    const NONE_OPTION = '__none__';

    console.log('');
    console.log(chalk.gray('   Umbrella project: a parent project that may contain a few shared items'));
    console.log(chalk.gray('   but work is primarily tracked in dedicated project area paths.'));
    console.log(chalk.gray('   If selected, items from umbrella project import to a separate folder.\n'));

    const umbrellaProject = await select<string>({
      message: 'Umbrella/parent project?',
      choices: [
        {
          name: 'None - all work items are in dedicated project area paths',
          value: NONE_OPTION
        },
        ...projects.map(p => ({
          name: `${p.name} (folder structure + import shared items)`,
          value: p.name
        }))
      ],
      default: NONE_OPTION
    });

    // Mark umbrella project (if any)
    for (const proj of projects) {
      proj.isUmbrella = umbrellaProject !== NONE_OPTION && proj.name === umbrellaProject;
    }

    // Set default for validation purposes (first non-umbrella project)
    // NOTE: ALL projects will be synced and imported - this is just for connection validation
    const syncableProjects = projects.filter(p => !p.isUmbrella);

    if (syncableProjects.length > 0) {
      // First syncable project is default (for validation and activeProfile)
      syncableProjects[0].isDefault = true;
    }
  }

  // AC-US5-04: Cache the multi-project configuration (NOT the PAT)
  if (projectRoot) {
    const { CacheManager } = await import('../../../core/cache/cache-manager.js');
    const cacheManager = new CacheManager(projectRoot);
    await cacheManager.set('ado-config', {
      org,
      projects
    });
  }

  console.log('');
  console.log(chalk.green('✓ Multi-project configuration complete'));
  console.log(chalk.gray(`   ${projects.length} project${projects.length > 1 ? 's' : ''} configured`));

  // Show clear message about what will happen
  const syncableCount = projects.filter(p => !p.isUmbrella).length;
  const umbrellaCount = projects.filter(p => p.isUmbrella).length;
  if (syncableCount > 0) {
    console.log(chalk.cyan(`   → Work items will be imported from ALL ${syncableCount} project${syncableCount > 1 ? 's' : ''}`));
  }
  if (umbrellaCount > 0) {
    console.log(chalk.gray(`   → ${umbrellaCount} umbrella project${umbrellaCount > 1 ? 's' : ''} (folder structure only)`));
  }

  return {
    pat,
    org,
    projects
  };
}

/**
 * Validate Azure DevOps connection
 *
 * Tests authentication and returns project information
 * Handles rate limiting with retry logic
 *
 * Supports both single-project and multi-project credentials:
 * - Single: Uses `credentials.project`
 * - Multi: Validates the default project from `credentials.projects`
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

  // Determine which project to validate
  let projectToValidate: string | undefined;

  if (credentials.projects && credentials.projects.length > 0) {
    // Multi-project mode: validate the default project or first project
    const defaultProject = credentials.projects.find(p => p.isDefault) || credentials.projects[0];
    projectToValidate = defaultProject.name;
  } else {
    // Single project mode
    projectToValidate = credentials.project;
  }

  if (!projectToValidate) {
    spinner.fail('No project specified for validation');
    return {
      success: false,
      error: 'No project specified'
    };
  }

  try {
    const result = await retryWithBackoff(async () => {
      // Test connection by fetching project details
      const projectEndpoint =
        `https://dev.azure.com/${credentials.org}/_apis/projects/${projectToValidate}?api-version=7.0`;

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

    const projectCount = credentials.projects?.length || 1;
    const projectLabel = projectCount > 1 ? `${projectCount} projects` : result.name;
    spinner.succeed(`Connected to Azure DevOps: ${projectLabel}`);

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
 * IMPORTANT: Only PAT goes in .env (secret). Non-secrets go to config.json.
 * See writeSyncConfig() for config.json structure.
 *
 * @param credentials - Azure DevOps credentials
 * @returns Array of key-value pairs for .env
 */
export function getAzureDevOpsEnvVars(
  credentials: AzureDevOpsCredentials
): Array<{ key: string; value: string }> {
  // Only store PAT in .env (secrets only!)
  // Non-secrets (org, project, teams, areas) go to config.json
  const envVars = [
    { key: 'AZURE_DEVOPS_PAT', value: credentials.pat }
  ];

  return envVars;
}

/**
 * Create folder structure for a single ADO project
 *
 * @param specsDir - Base specs directory
 * @param projectName - ADO project name
 * @param areaPaths - Area paths for the project (optional)
 * @param strategy - Team mapping strategy
 * @param teams - Teams for team-based strategy (deprecated)
 */
function createSingleProjectFolders(
  specsDir: string,
  projectName: string,
  areaPaths?: string[],
  strategy?: string,
  teams?: string[]
): void {
  // CRITICAL FIX (2025-12-01): Use normalizeToProjectId() for consistent folder names
  // Bug: Using raw project name created "My Project" folder while other code paths
  // created "my-project", causing duplicate folders for the same ADO project
  const normalizedProject = normalizeToProjectId(projectName);
  const projectDir = path.join(specsDir, normalizedProject);
  fs.mkdirSync(projectDir, { recursive: true });
  console.log(chalk.green(`✓ Created ${projectDir}`));

  const effectiveStrategy = strategy || 'area-path-based';

  if (effectiveStrategy === 'area-path-based' && areaPaths?.length) {
    for (const areaPath of areaPaths) {
      const areaName = areaPath.split('\\').pop() || areaPath;
      // CRITICAL FIX: Normalize area path names too
      const normalizedArea = normalizeToProjectId(areaName);
      const areaDir = path.join(projectDir, normalizedArea);
      fs.mkdirSync(areaDir, { recursive: true });
      console.log(chalk.gray(`  ✓ Created area folder: ${normalizedArea}`));
    }
  } else if (effectiveStrategy === 'team-based' && teams?.length) {
    for (const team of teams) {
      // CRITICAL FIX: Normalize team names too
      const normalizedTeam = normalizeToProjectId(team);
      const teamDir = path.join(projectDir, normalizedTeam);
      fs.mkdirSync(teamDir, { recursive: true });
      console.log(chalk.gray(`  ✓ Created team folder: ${normalizedTeam}`));
    }
  }
}

/**
 * Create ADO project folder structure in .specweave/docs/internal/specs/
 *
 * Supports both single-project and multi-project configurations (AC-US5-05)
 *
 * @param projectPath - Path to project root
 * @param credentials - ADO credentials with org, project(s), areaPaths
 */
export function createAdoProjectFolders(
  projectPath: string,
  credentials: AzureDevOpsCredentials
): void {
  const specsDir = path.join(projectPath, '.specweave', 'docs', 'internal', 'specs');

  if (!fs.existsSync(specsDir)) {
    fs.mkdirSync(specsDir, { recursive: true });
  }

  // Handle multi-project configuration (new in v0.28.x)
  if (credentials.projects && credentials.projects.length > 0) {
    console.log(chalk.cyan(`\n📁 Creating folder structure for ${credentials.projects.length} project(s)...`));

    for (const project of credentials.projects) {
      createSingleProjectFolders(
        specsDir,
        project.name,
        project.areaPaths,
        credentials.strategy
      );
    }

    console.log(chalk.green(`✓ ADO folder structure created for ${credentials.projects.length} project(s)`));
    return;
  }

  // Handle single-project configuration (backward compatibility)
  const projectName = credentials.project;
  if (!projectName) {
    console.log(chalk.yellow('⚠️  No project specified, skipping folder creation'));
    return;
  }

  createSingleProjectFolders(
    specsDir,
    projectName,
    credentials.areaPaths,
    credentials.strategy,
    credentials.teams
  );

  console.log(chalk.green(`✓ ADO folder structure created`));
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
  console.log(chalk.cyan('💡 Tip: Use /sw:increment "feature" to create an increment'));
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
