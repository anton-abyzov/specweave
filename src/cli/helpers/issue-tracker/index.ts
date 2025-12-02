/**
 * Issue Tracker Integration - Main Coordinator
 *
 * Guides users through issue tracker setup during `specweave init`
 * Supports GitHub, Jira, and Azure DevOps
 *
 * @module cli/helpers/issue-tracker
 */

import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import type { IssueTracker, TrackerCredentials, SetupOptions, AzureDevOpsCredentials, SyncSettings, SyncPermissions } from './types.js';
import { detectDefaultTracker, getTrackerDisplayName, installTrackerPlugin, isClaudeCliAvailable } from './utils.js';
import { writeSyncConfig } from './sync-config-writer.js';
import {
  readEnvFile,
  writeEnvFile,
  createEnvFromTemplate,
  updateEnvVars,
  ensureEnvGitignored
} from '../../../utils/env-file.js';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';
import { getConfigManager } from '../../../core/config/index.js';

// GitHub
import {
  checkExistingGitHubCredentials,
  promptGitHubCredentials,
  validateGitHubConnection,
  getGitHubEnvVars,
  showGitHubSetupComplete,
  showGitHubSetupSkipped
} from './github.js';

// Jira
import {
  checkExistingJiraCredentials,
  promptJiraCredentials,
  validateJiraConnection,
  getJiraEnvVars,
  getJiraConfig,
  showJiraSetupComplete,
  showJiraSetupSkipped
} from './jira.js';

// Azure DevOps
import {
  checkExistingAzureDevOpsCredentials,
  promptAzureDevOpsCredentials,
  validateAzureDevOpsConnection,
  getAzureDevOpsEnvVars,
  createAdoProjectFolders,
  showAzureDevOpsSetupComplete,
  showAzureDevOpsSetupSkipped
} from './ado.js';

/**
 * Setup ADO with credentials from repository setup
 *
 * When user selects ADO for both repos and issues, we reuse credentials
 * to avoid duplicate prompts. Still need to:
 * 1. Ask about sync permissions
 * 2. Fetch and configure area paths for each project
 * 3. Validate connection
 * 4. Save credentials and config
 */
async function setupAdoWithExistingCredentials(
  projectPath: string,
  language: string,
  adoCredentials: { org: string; pat: string; projects: string[] },
  maxRetries: number,
  options: SetupOptions
): Promise<boolean> {
  // Step 1: Ask about sync settings
  console.log('');
  console.log(chalk.cyan.bold('⚙️  External Tool Sync Permissions'));
  console.log(chalk.gray('Control what SpecWeave can modify in Azure DevOps'));
  console.log('');

  const canUpsertInternalItems = await confirm({
    message: 'Q1: Can SpecWeave CREATE and UPDATE work items it created? (UPSERT = CREATE initially + UPDATE on progress)',
    default: false
  });
  const canUpdateExternalItems = await confirm({
    message: 'Q2: Can SpecWeave UPDATE work items created externally? (Full content: title, description, ACs, tasks)',
    default: false
  });
  const canUpdateStatus = await confirm({
    message: 'Q3: Can SpecWeave UPDATE status of work items? (Both internal & external items)',
    default: false
  });
  const syncPermissions = { canUpsertInternalItems, canUpdateExternalItems, canUpdateStatus };

  const syncSettings = {
    includeStatus: true,
    autoApplyLabels: true
  };

  // Step 2: Build credentials with area path selection for each project
  console.log('');
  console.log(chalk.cyan.bold('📁 Area Path Configuration'));
  console.log(chalk.gray('Configure area paths for each project'));
  console.log('');

  const { selectAreaPaths, toAreaPathObjects } = await import('../ado-area-selector.js');

  // Dynamic import for area path fetching
  const projects: Array<{ name: string; areaPaths?: string[]; isDefault?: boolean }> = [];

  for (let i = 0; i < adoCredentials.projects.length; i++) {
    const projectName = adoCredentials.projects[i];
    console.log(chalk.cyan(`\n📁 Configuring: ${projectName} (${i + 1}/${adoCredentials.projects.length})`));

    // Fetch area paths for this project
    const spinner = ora('Fetching area paths...').start();
    let fetchedAreas: Array<{ name: string; path: string }> = [];

    try {
      const { fetchAreaPathsForProject } = await import(
        '../../../../plugins/specweave-ado/lib/ado-board-resolver.js'
      );
      const areasResult = await fetchAreaPathsForProject(
        adoCredentials.org,
        projectName,
        adoCredentials.pat
      ).catch((): never[] => []);
      fetchedAreas = areasResult.map((a: { name: string; path: string }) => ({ name: a.name, path: a.path }));
      spinner.succeed(`Found ${fetchedAreas.length} area paths`);
    } catch {
      spinner.succeed('No area paths found (will use project root)');
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
      isDefault: i === 0 // First project is default
    });
  }

  // Build full ADO credentials
  const credentials: AzureDevOpsCredentials = {
    pat: adoCredentials.pat,
    org: adoCredentials.org,
    projects: projects.map(p => ({
      name: p.name,
      areaPaths: p.areaPaths,
      isDefault: p.isDefault
    }))
  };

  // Step 3: Validate connection
  const validationResult = await validateAzureDevOpsConnection(credentials, maxRetries);

  if (!validationResult.success) {
    console.log(chalk.red(`\n❌ Connection validation failed: ${validationResult.error}`));
    return false;
  }

  // Step 4: Save credentials to .env
  await saveCredentialsHelper(projectPath, 'ado', credentials);

  // Step 5: Write sync config
  await writeSyncConfigHelper(projectPath, 'ado', credentials, syncSettings, syncPermissions);

  // Step 6: Validate resources (read-only if all permissions disabled)
  const isReadOnly = !syncPermissions.canUpsertInternalItems &&
    !syncPermissions.canUpdateExternalItems &&
    !syncPermissions.canUpdateStatus;

  try {
    const { validateAzureDevOpsResources } = await import('../../../utils/external-resource-validator.js');
    await validateAzureDevOpsResources(`${projectPath}/.env`, { readOnly: isReadOnly });
  } catch {
    console.log(chalk.gray('   Resource validation skipped - can run "specweave validate-ado" later'));
  }

  // Step 7: Create ADO folder structure
  createAdoProjectFolders(projectPath, credentials);

  // Step 8: Show success message
  showAzureDevOpsSetupComplete(language as any);

  return true;
}

/**
 * Helper to save credentials (extracted from main function)
 */
async function saveCredentialsHelper(
  projectPath: string,
  tracker: IssueTracker,
  credentials: TrackerCredentials
): Promise<void> {
  let envContent = readEnvFile(projectPath);

  if (!envContent) {
    envContent = createEnvFromTemplate(projectPath);
  }

  const envVars = getAzureDevOpsEnvVars(credentials as AzureDevOpsCredentials);
  const updatedContent = updateEnvVars(envContent, envVars);
  writeEnvFile(projectPath, updatedContent);
  ensureEnvGitignored(projectPath);

  console.log(chalk.green('✓ Credentials saved to .env (gitignored)'));
}

/**
 * Helper to write sync config (extracted from main function)
 */
async function writeSyncConfigHelper(
  projectPath: string,
  tracker: IssueTracker,
  credentials: AzureDevOpsCredentials,
  syncSettings: { includeStatus: boolean; autoApplyLabels: boolean },
  syncPermissions: { canUpsertInternalItems: boolean; canUpdateExternalItems: boolean; canUpdateStatus: boolean }
): Promise<void> {
  const configManager = getConfigManager(projectPath);
  const config = await configManager.read();

  config.hooks = {
    post_task_completion: {
      sync_living_docs: true,
      sync_tasks_md: true,
      external_tracker_sync: true
    },
    post_increment_planning: {
      auto_create_github_issue: false
    }
  };

  const profiles: Record<string, {
    provider: string;
    displayName: string;
    config: Record<string, unknown>;
    timeRange: { default: string; max: string };
  }> = {};
  let activeProfile = '';

  if (credentials.projects && credentials.projects.length > 0) {
    for (const proj of credentials.projects) {
      const profileId = `ado-${proj.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      profiles[profileId] = {
        provider: 'ado',
        displayName: `Azure DevOps - ${proj.name}`,
        config: {
          organization: credentials.org,
          project: proj.name,
          ...(proj.areaPaths?.length ? { areaPaths: proj.areaPaths } : {})
        },
        timeRange: {
          default: '1M',
          max: '6M'
        }
      };

      if (proj.isDefault) {
        activeProfile = profileId;
      }
    }

    if (!activeProfile) {
      activeProfile = Object.keys(profiles)[0];
    }
  }

  (config as any).sync = {
    enabled: true,
    direction: 'bidirectional' as const,
    autoSync: false,
    provider: tracker,
    includeStatus: syncSettings.includeStatus,
    autoApplyLabels: syncSettings.autoApplyLabels,
    activeProfile,
    settings: {
      canUpsertInternalItems: syncPermissions.canUpsertInternalItems,
      canUpdateExternalItems: syncPermissions.canUpdateExternalItems,
      canUpdateStatus: syncPermissions.canUpdateStatus
    },
    profiles
  };

  // CRITICAL FIX (2025-11-30): Set multiProject.enabled for ADO multi-project setups
  // This prevents detectActiveProfileId() from using "ado-projectname" as folder name
  // Instead, it will properly extract the project name from profile.config.project
  if (credentials.projects && credentials.projects.length > 0) {
    const defaultProject = credentials.projects.find(p => p.isDefault) || credentials.projects[0];
    (config as any).multiProject = {
      enabled: true,
      activeProject: defaultProject.name.toLowerCase().replace(/\s+/g, '-')
    };
  }

  await configManager.write(config);

  console.log(chalk.green('✓ Sync config written to .specweave/config.json'));
  console.log(chalk.gray(`   Provider: ado`));
  console.log(chalk.gray(`   Auto-sync: enabled`));
}

/**
 * Setup issue tracker integration during init
 *
 * Main entry point called from init.ts
 * Guides user through tracker selection and setup
 *
 * @param options - Setup options
 * @returns True if setup completed successfully
 */
export async function setupIssueTracker(options: SetupOptions): Promise<boolean> {
  const { projectPath, language, maxRetries = 3, repositoryHosting, adoCredentialsFromRepoSetup } = options;
  const locale = getLocaleManager(language);

  // Check if running in CI/non-interactive environment
  const isCI = process.env.CI === 'true' ||
               process.env.GITHUB_ACTIONS === 'true' ||
               process.env.GITLAB_CI === 'true' ||
               process.env.CIRCLECI === 'true' ||
               !process.stdin.isTTY;

  if (isCI) {
    // In CI, skip issue tracker setup (non-interactive)
    console.log('');
    console.log(chalk.gray('⏭️  CI environment detected - skipping issue tracker setup'));
    console.log(chalk.gray('   You can configure later via /plugin install\n'));
    return true;
  }

  console.log('');
  console.log(chalk.cyan.bold('🎯 Issue Tracker Integration'));
  console.log('');

  // Step 1: Ask which tracker to use
  const detection = detectDefaultTracker(projectPath);

  // Use detection only (no automatic mapping based on hosting)
  const defaultTracker: IssueTracker = detection.tracker;

  // Build choices - all options always available
  const choices: Array<{ name: string; value: IssueTracker }> = [];

  // GitHub Issues
  choices.push({
    name: `🐙 GitHub Issues ${detection.tracker === 'github' && detection.detected ? '(detected)' : ''}`,
    value: 'github'
  });

  // Jira
  choices.push({
    name: `📋 Jira ${detection.tracker === 'jira' && detection.detected ? '(detected)' : ''}`,
    value: 'jira'
  });

  // Azure DevOps
  choices.push({
    name: `🔷 Azure DevOps ${detection.tracker === 'ado' && detection.detected ? '(detected)' : ''}`,
    value: 'ado'
  });

  // None - always available
  choices.push({
    name: `⏭️  None (skip)`,
    value: 'none'
  });

  const tracker = await select<IssueTracker>({
    message: 'Which issue tracker do you use?',
    choices,
    default: defaultTracker
  });

  if (tracker === 'none') {
    console.log(chalk.gray('\n⏭️  Skipping issue tracker setup'));
    console.log(chalk.gray('   You can configure later via /plugin install\n'));
    return true;
  }

  // Smart credential reuse: If ADO was selected for repos AND for issues, reuse credentials
  if (tracker === 'ado' && adoCredentialsFromRepoSetup) {
    console.log(chalk.green('\n✓ Using Azure DevOps credentials from repository setup'));
    console.log(chalk.gray(`   Organization: ${adoCredentialsFromRepoSetup.org}`));
    console.log(chalk.gray(`   Projects: ${adoCredentialsFromRepoSetup.projects.join(', ')}`));
    return await setupAdoWithExistingCredentials(
      projectPath,
      language,
      adoCredentialsFromRepoSetup,
      maxRetries,
      options
    );
  }

  // Step 1.5: Ask about sync settings (v0.24.0+: Three-Permission Architecture)
  console.log('');
  console.log(chalk.cyan.bold('⚙️  External Tool Sync Permissions'));
  console.log(chalk.gray('Control what SpecWeave can modify in external tools (GitHub, JIRA, ADO)'));
  console.log('');

  const canUpsertInternalItems = await confirm({
    message: 'Q1: Can SpecWeave CREATE and UPDATE work items it created? (UPSERT = CREATE initially + UPDATE on progress)',
    default: false
  });
  const canUpdateExternalItems = await confirm({
    message: 'Q2: Can SpecWeave UPDATE work items created externally? (Full content: title, description, ACs, tasks)',
    default: false
  });
  const canUpdateStatus = await confirm({
    message: 'Q3: Can SpecWeave UPDATE status of work items? (Both internal & external items)',
    default: false
  });
  const syncPermissions = { canUpsertInternalItems, canUpdateExternalItems, canUpdateStatus };

  // Additional Sync Settings - always enabled (configurable manually in .specweave/config.json)
  const syncSettings = {
    includeStatus: true,      // Always include work item status in sync
    autoApplyLabels: true     // Always auto-apply labels based on increment type
  };

  // Step 2: Check for existing credentials
  const existing = await checkExistingCredentials(tracker, projectPath);

  if (existing) {
    console.log(chalk.green(`\n✓ Found existing credentials (${existing.source})`));

    const useExisting = await confirm({
      message: `Use existing ${getTrackerDisplayName(tracker)} credentials?`,
      default: true
    });

    if (useExisting) {
      // Validate existing credentials
      const validationResult = await validateConnection(tracker, existing.credentials, maxRetries);

      if (validationResult.success) {
        // Don't return early! We still need to configure repositories
        // Save existing credentials to flow through normal path
        const credentials = existing.credentials;

        // Step 5.1: Configure repositories (GitHub only)
        // CRITICAL: Must wrap in try-catch to prevent silent failure!
        let repositoryProfiles = [];
        let monorepoProjects = undefined;

        if (tracker === 'github') {
          try {
            // Import the configuration function
            const { configureGitHubRepositories } = await import('./github.js');
            // Pass the GitHub token for repository creation
            const githubToken = (credentials as any).token;
            // Pass repositoryHosting to avoid duplicate prompts
            const repoConfig = await configureGitHubRepositories(projectPath, language, githubToken, repositoryHosting);
            repositoryProfiles = repoConfig.profiles;
            monorepoProjects = repoConfig.monorepoProjects;
          } catch (error: any) {
            // Repository configuration failed - show error but continue with empty profiles
            console.log(chalk.red(`\n❌ Repository configuration failed: ${error.message}`));
            console.log(chalk.yellow('   Continuing with manual sync configuration\n'));

            // Issue #3 fix: Enhanced error logging
            if (process.env.DEBUG || process.env.SPECWEAVE_DEBUG) {
              console.error(chalk.gray('\n📋 Stack trace (DEBUG mode):'));
              console.error(chalk.gray(error.stack || 'No stack trace available'));
              console.error('');
            }

            // Leave repositoryProfiles empty - will be created with defaults
          }
        }

        // Step 5.2: Write sync config to .specweave/config.json
        await writeSyncConfig(projectPath, tracker, credentials, syncSettings, syncPermissions, repositoryProfiles, monorepoProjects);

        // Step 5.5: Validate resources (Jira/ADO - auto-create missing projects/boards/teams)
        if (tracker === 'jira' || tracker === 'ado') {
          await validateResources(tracker, credentials, projectPath, syncPermissions);
        }

        // Step 5.6: Create ADO folder structure (ADO only)
        if (tracker === 'ado') {
          createAdoProjectFolders(projectPath, credentials as any);
        }

        // Show setup complete message (plugins managed via marketplace)
        showSetupComplete(tracker, language);
        return true;
      } else {
        console.log(chalk.red(`\n❌ Validation failed: ${validationResult.error}`));
        console.log(chalk.yellow('   Let\'s configure new credentials\n'));
        // Fall through to prompt for new credentials
      }
    }
  }

  // Step 3: Prompt for credentials
  const credentials = await promptCredentials(tracker, language);

  if (!credentials) {
    showSetupSkipped(tracker, language);
    return false;
  }

  // Step 4: Validate connection
  const validationResult = await validateConnection(tracker, credentials, maxRetries);

  if (!validationResult.success) {
    console.log(chalk.red(`\n❌ Connection failed: ${validationResult.error}\n`));

    // Check retry limit to prevent infinite recursion (Issue #1 fix)
    const setupRetryCount = options.setupRetryCount || 0;
    const MAX_SETUP_RETRIES = 3;

    if (setupRetryCount >= MAX_SETUP_RETRIES) {
      console.log(chalk.red(`\n❌ Maximum retry attempts (${MAX_SETUP_RETRIES}) reached`));
      console.log(chalk.yellow('   Please check your credentials and try again later\n'));
      showSetupSkipped(tracker, language);
      return false;
    }

    const retry = await confirm({
      message: `Try again? (${setupRetryCount + 1}/${MAX_SETUP_RETRIES} attempts)`,
      default: true
    });

    if (retry) {
      // Recursive retry with incremented counter to prevent stack overflow
      return setupIssueTracker({ ...options, setupRetryCount: setupRetryCount + 1 });
    }

    showSetupSkipped(tracker, language);
    return false;
  }

  // Step 5: Save credentials to .env
  await saveCredentials(projectPath, tracker, credentials);

  // Step 5.1: Configure repositories FIRST (GitHub only)
  // CRITICAL: This must happen BEFORE project validation!
  // Repository strategy (single/multiple/monorepo) determines how projects are organized
  // MUST wrap in try-catch to prevent silent failure!
  let repositoryProfiles = [];
  let monorepoProjects = undefined;

  if (tracker === 'github') {
    try {
      // Import the configuration function
      const { configureGitHubRepositories } = await import('./github.js');
      // Pass the GitHub token for repository creation
      const githubToken = (credentials as any).token;
      // Pass repositoryHosting to avoid duplicate prompts
      const repoConfig = await configureGitHubRepositories(projectPath, language, githubToken, repositoryHosting);
      repositoryProfiles = repoConfig.profiles;
      monorepoProjects = repoConfig.monorepoProjects;
    } catch (error: any) {
      // Repository configuration failed - show error but continue with empty profiles
      console.log(chalk.red(`\n❌ Repository configuration failed: ${error.message}`));
      console.log(chalk.yellow('   Continuing with manual sync configuration\n'));

      // Issue #3 fix: Enhanced error logging
      if (process.env.DEBUG || process.env.SPECWEAVE_DEBUG) {
        console.error(chalk.gray('\n📋 Stack trace (DEBUG mode):'));
        console.error(chalk.gray(error.stack || 'No stack trace available'));
        console.error('');
      }

      // Leave repositoryProfiles empty - will be created with defaults
    }
  }

  // Step 5.2: Write sync config to .specweave/config.json
  await writeSyncConfig(projectPath, tracker, credentials, syncSettings, syncPermissions, repositoryProfiles, monorepoProjects);

  // Step 5.3: Validate project configuration (GitHub only)
  // NOW we can ask about project contexts (after repos are configured)
  if (tracker === 'github') {
    const { validateProjectConfiguration, promptCreateProject } = await import('../../../utils/project-validator.js');

    console.log(chalk.cyan('\n🔍 Validating Project Configuration\n'));

    const validation = await validateProjectConfiguration(projectPath);

    if (!validation.valid) {
      const shouldCreate = await promptCreateProject(projectPath);

      if (shouldCreate) {
        // TODO: Invoke project creation flow
        console.log(chalk.yellow('   ⚠️  Project creation not yet implemented - manual setup required'));
        console.log(chalk.gray('   → Run: /specweave:project create\n'));
      } else {
        console.log(chalk.gray('   → You can create projects later with: /specweave:project create\n'));
      }
    } else {
      console.log(chalk.green(`✓ Found ${validation.projectCount} project context(s): ${validation.projects.join(', ')}\n`));
    }
  }

  // Step 5.5: Validate resources (Jira/ADO - auto-create missing projects/boards/teams)
  if (tracker === 'jira' || tracker === 'ado') {
    await validateResources(tracker, credentials, projectPath, syncPermissions);
  }

  // Step 5.6: Create ADO folder structure (ADO only)
  if (tracker === 'ado') {
    createAdoProjectFolders(projectPath, credentials as any);
  }

  // Step 6: Show success message (plugins managed via marketplace)
  showSetupComplete(tracker, language);

  return true;
}

/**
 * Check for existing credentials
 */
async function checkExistingCredentials(
  tracker: IssueTracker,
  projectPath: string
): Promise<{ source: string; credentials: TrackerCredentials } | null> {
  switch (tracker) {
    case 'github':
      return checkExistingGitHubCredentials(projectPath);
    case 'jira':
      return checkExistingJiraCredentials(projectPath);
    case 'ado':
      return checkExistingAzureDevOpsCredentials(projectPath);
    default:
      return null;
  }
}

/**
 * Prompt for credentials
 */
async function promptCredentials(
  tracker: IssueTracker,
  language: string
): Promise<TrackerCredentials | null> {
  switch (tracker) {
    case 'github':
      return promptGitHubCredentials(language as any);
    case 'jira':
      return promptJiraCredentials(language as any);
    case 'ado':
      return promptAzureDevOpsCredentials(language as any);
    default:
      return null;
  }
}

/**
 * Validate connection
 */
async function validateConnection(
  tracker: IssueTracker,
  credentials: TrackerCredentials,
  maxRetries: number
): Promise<{ success: boolean; error?: string }> {
  switch (tracker) {
    case 'github':
      return validateGitHubConnection(credentials as any, maxRetries);
    case 'jira':
      return validateJiraConnection(credentials as any, maxRetries);
    case 'ado':
      return validateAzureDevOpsConnection(credentials as any, maxRetries);
    default:
      return { success: false, error: 'Unknown tracker' };
  }
}

/**
 * Validate resources (projects/boards/teams) - Jira and Azure DevOps
 *
 * Uses the smart validator to:
 * - Check if projects exist, prompt to create if missing
 * - For Jira: Check if boards exist (IDs) or create them (names), update .env with board IDs
 * - For ADO: Check if teams/area paths exist, create if missing
 *
 * @param tracker - Issue tracker type
 * @param credentials - Tracker credentials
 * @param projectPath - Path to project root
 * @param syncPermissions - Sync permissions (if all false, use read-only mode)
 */
async function validateResources(
  tracker: IssueTracker,
  credentials: TrackerCredentials,
  projectPath: string,
  syncPermissions?: { canUpsertInternalItems: boolean; canUpdateExternalItems: boolean; canUpdateStatus: boolean }
): Promise<void> {
  if (tracker !== 'jira' && tracker !== 'ado') {
    return; // Only Jira and ADO need resource validation
  }

  try {
    console.log('');

    if (tracker === 'jira') {
      // Import the Jira validator (dynamic import for ESM)
      const { validateJiraResources } = await import('../../../utils/external-resource-validator.js');

      // Run validation
      const result = await validateJiraResources(`${projectPath}/.env`);

      if (!result.valid) {
        console.log(chalk.yellow('⚠️  Some Jira resources could not be validated'));
        console.log(chalk.gray('   You can run "specweave validate-jira" later to fix this\n'));
      }
    } else if (tracker === 'ado') {
      // Import the ADO validator (dynamic import for ESM)
      const { validateAzureDevOpsResources } = await import('../../../utils/external-resource-validator.js');

      // CRITICAL FIX: If all sync permissions are disabled, use read-only mode
      const isReadOnly = syncPermissions &&
        !syncPermissions.canUpsertInternalItems &&
        !syncPermissions.canUpdateExternalItems &&
        !syncPermissions.canUpdateStatus;

      // Run validation (read-only skips create operations)
      const result = await validateAzureDevOpsResources(`${projectPath}/.env`, { readOnly: isReadOnly });

      if (!result.valid) {
        console.log(chalk.yellow('⚠️  Some Azure DevOps resources could not be validated'));
        console.log(chalk.gray('   You can run "specweave validate-ado" later to fix this\n'));
      }
    }
  } catch (error: any) {
    // Non-blocking - validation can happen later
    if (process.env.DEBUG) {
      console.log(chalk.gray(`\n   Resource validation skipped: ${error.message}`));
    }
    const validatorCommand = tracker === 'jira' ? 'validate-jira' : 'validate-ado';
    console.log(chalk.gray(`   You can run "specweave ${validatorCommand}" later\n`));
  }
}

/**
 * Generate .env.example template for team onboarding
 *
 * Creates a template file showing required environment variables
 * with placeholder values and setup instructions
 */
function generateEnvExample(projectPath: string, tracker: IssueTracker): void {
  const examplePath = path.join(projectPath, '.env.example');

  let content = `# SpecWeave Environment Variables
#
# IMPORTANT: Copy this file to .env and replace placeholder values with your actual credentials
# NEVER commit .env to git! It's already in .gitignore
#
# Setup Instructions:
# 1. Copy: cp .env.example .env
# 2. Replace placeholder values below with your actual credentials
# 3. Run: specweave init . (to validate credentials)

`;

  if (tracker === 'jira') {
    content += `# ==========================================
# Jira Credentials (REQUIRED)
# ==========================================
# Get your Jira API token from:
# Cloud: https://id.atlassian.com/manage-profile/security/api-tokens
# Server: Your Jira instance → Settings → Personal Access Tokens

JIRA_API_TOKEN=your_jira_api_token_here
JIRA_EMAIL=your_email@company.com

# NOTE: Domain, strategy, and projects are now in .specweave/config.json
# (This makes them shareable across the team via git)
`;
  } else if (tracker === 'github') {
    content += `# ==========================================
# GitHub Credentials (REQUIRED)
# ==========================================
# Get your GitHub token from:
# https://github.com/settings/tokens
# Required scopes: repo, read:org

GITHUB_TOKEN=your_github_token_here
`;
  } else if (tracker === 'ado') {
    content += `# ==========================================
# Azure DevOps Credentials (REQUIRED)
# ==========================================
# Get your PAT from:
# https://dev.azure.com/YOUR_ORG/_usersSettings/tokens

ADO_PAT=your_ado_pat_here
`;
  }

  content += `
# ==========================================
# Optional: Additional Integrations
# ==========================================
# Uncomment and configure if you use multiple tools:

# GitHub (if using with Jira)
# GITHUB_TOKEN=your_github_token_here

# Bitbucket
# BITBUCKET_TOKEN=your_bitbucket_token_here

# GitLab
# GITLAB_TOKEN=your_gitlab_token_here
`;

  fs.writeFileSync(examplePath, content, 'utf-8');
  console.log(chalk.green('✓ Generated .env.example (commit this to git!)'));
  console.log(chalk.gray('   Team members can copy it to .env and add their credentials'));
}

/**
 * Save credentials to .env file AND configuration to config.json
 *
 * NEW (v0.23.0): Implements ADR-0050 secrets/config separation
 * - Secrets (tokens, emails) → .env (gitignored)
 * - Configuration (domains, strategies, projects) → config.json (committed)
 */
async function saveCredentials(
  projectPath: string,
  tracker: IssueTracker,
  credentials: TrackerCredentials
): Promise<void> {
  // Read existing .env or create from template
  let envContent = readEnvFile(projectPath);

  if (!envContent) {
    envContent = createEnvFromTemplate(projectPath);
  }

  // Get tracker-specific env vars (ONLY secrets)
  let envVars: Array<{ key: string; value: string }> = [];

  switch (tracker) {
    case 'github':
      envVars = getGitHubEnvVars(credentials as any);
      break;
    case 'jira':
      envVars = getJiraEnvVars(credentials as any); // NOW returns ONLY secrets
      break;
    case 'ado':
      envVars = getAzureDevOpsEnvVars(credentials as any);
      break;
  }

  // Update .env content
  const updatedContent = updateEnvVars(envContent, envVars);

  // Write .env file
  writeEnvFile(projectPath, updatedContent);

  // Ensure .env is gitignored
  ensureEnvGitignored(projectPath);

  console.log(chalk.green('✓ Credentials saved to .env (gitignored)'));

  // Save non-sensitive configuration to config.json
  if (tracker === 'jira') {
    const configManager = getConfigManager(projectPath);
    const jiraConfig = getJiraConfig(credentials as any);

    await configManager.update(jiraConfig);

    console.log(chalk.green('✓ Configuration saved to .specweave/config.json'));
    console.log(chalk.gray(`   Domain: ${jiraConfig.issueTracker.domain}`));
    console.log(chalk.gray(`   Strategy: ${jiraConfig.issueTracker.strategy}`));
    console.log(chalk.gray(`   Projects: ${jiraConfig.issueTracker.projects?.map(p => p.key).join(', ')}`));
  }

  // Generate .env.example for team onboarding
  generateEnvExample(projectPath, tracker);
}

// writeSyncConfig moved to ./sync-config-writer.ts

// Removed installPlugin() function - plugins are managed via marketplace, not during init

/**
 * Show setup complete message
 */
function showSetupComplete(tracker: IssueTracker, language: string): void {
  switch (tracker) {
    case 'github':
      showGitHubSetupComplete(language as any);
      break;
    case 'jira':
      showJiraSetupComplete(language as any);
      break;
    case 'ado':
      showAzureDevOpsSetupComplete(language as any);
      break;
  }
}

/**
 * Show setup skipped message
 */
function showSetupSkipped(tracker: IssueTracker, language: string): void {
  switch (tracker) {
    case 'github':
      showGitHubSetupSkipped(language as any);
      break;
    case 'jira':
      showJiraSetupSkipped(language as any);
      break;
    case 'ado':
      showAzureDevOpsSetupSkipped(language as any);
      break;
  }
}

// Export all types and utilities for external use
export * from './types.js';
export * from './utils.js';
