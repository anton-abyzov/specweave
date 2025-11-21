/**
 * Issue Tracker Integration - Main Coordinator
 *
 * Guides users through issue tracker setup during `specweave init`
 * Supports GitHub, Jira, and Azure DevOps
 *
 * @module cli/helpers/issue-tracker
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import type { IssueTracker, TrackerCredentials, SetupOptions } from './types.js';
import { detectDefaultTracker, getTrackerDisplayName, installTrackerPlugin, isClaudeCliAvailable } from './utils.js';
import {
  readEnvFile,
  writeEnvFile,
  createEnvFromTemplate,
  updateEnvVars,
  ensureEnvGitignored
} from '../../../utils/env-file.js';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';

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
  showJiraSetupComplete,
  showJiraSetupSkipped
} from './jira.js';

// Azure DevOps
import {
  checkExistingAzureDevOpsCredentials,
  promptAzureDevOpsCredentials,
  validateAzureDevOpsConnection,
  getAzureDevOpsEnvVars,
  showAzureDevOpsSetupComplete,
  showAzureDevOpsSetupSkipped
} from './ado.js';

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
  const { projectPath, language, maxRetries = 3, repositoryHosting } = options;
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

  // Smart default based on repository hosting
  let defaultTracker: IssueTracker = detection.tracker;
  if (repositoryHosting === 'github') {
    // If hosting on GitHub, strongly suggest GitHub Issues
    defaultTracker = 'github';
  } else if (repositoryHosting === 'local') {
    // If local-only, default to skipping
    defaultTracker = 'none';
  }

  // Show contextual message based on repository hosting
  if (repositoryHosting === 'github') {
    console.log(chalk.gray('💡 GitHub hosting detected - GitHub Issues recommended for seamless integration'));
    console.log('');
  } else if (repositoryHosting === 'local') {
    console.log(chalk.gray('💡 Local-only repository - you can skip issue tracker or use external tools'));
    console.log('');
  }

  // Build choices based on repository hosting
  const choices: Array<{ name: string; value: IssueTracker }> = [];

  // GitHub Issues - only show if GitHub or local repo (local can add GitHub remote later)
  if (repositoryHosting === 'github' || repositoryHosting === 'local') {
    choices.push({
      name: `🐙 GitHub Issues ${repositoryHosting === 'github' ? '(recommended)' : detection.tracker === 'github' && detection.detected ? '(detected)' : ''}`,
      value: 'github'
    });
  }

  // Jira - available for all repository types
  choices.push({
    name: `📋 Jira`,
    value: 'jira'
  });

  // Azure DevOps - available for all repository types
  choices.push({
    name: `🔷 Azure DevOps ${detection.tracker === 'ado' && detection.detected ? '(detected)' : ''}`,
    value: 'ado'
  });

  // None - always available
  choices.push({
    name: `⏭️  None (skip)${repositoryHosting === 'local' ? ' - recommended for local-only' : ''}`,
    value: 'none'
  });

  const { tracker } = await inquirer.prompt([{
    type: 'list',
    name: 'tracker',
    message: 'Which issue tracker do you use?',
    choices,
    default: defaultTracker
  }]);

  if (tracker === 'none') {
    console.log(chalk.gray('\n⏭️  Skipping issue tracker setup'));
    console.log(chalk.gray('   You can configure later via /plugin install\n'));
    return true;
  }

  // Step 1.5: Ask about sync settings (v0.24.0+: Three-Permission Architecture)
  console.log('');
  console.log(chalk.cyan.bold('⚙️  External Tool Sync Permissions'));
  console.log(chalk.gray('Control what SpecWeave can modify in external tools (GitHub, JIRA, ADO)'));
  console.log('');

  const syncPermissions = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'canUpsertInternalItems',
      message: 'Q1: Can SpecWeave CREATE and UPDATE work items it created? (UPSERT = CREATE initially + UPDATE on progress)',
      default: false
    },
    {
      type: 'confirm',
      name: 'canUpdateExternalItems',
      message: 'Q2: Can SpecWeave UPDATE work items created externally? (Full content: title, description, ACs, tasks)',
      default: false
    },
    {
      type: 'confirm',
      name: 'canUpdateStatus',
      message: 'Q3: Can SpecWeave UPDATE status of work items? (Both internal & external items)',
      default: false
    }
  ]);

  // Additional Sync Settings - always enabled (configurable manually in .specweave/config.json)
  const syncSettings = {
    includeStatus: true,      // Always include work item status in sync
    autoApplyLabels: true     // Always auto-apply labels based on increment type
  };

  // Step 2: Check for existing credentials
  const existing = await checkExistingCredentials(tracker, projectPath);

  if (existing) {
    console.log(chalk.green(`\n✓ Found existing credentials (${existing.source})`));

    const { useExisting } = await inquirer.prompt([{
      type: 'confirm',
      name: 'useExisting',
      message: `Use existing ${getTrackerDisplayName(tracker)} credentials?`,
      default: true
    }]);

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
            const repoConfig = await configureGitHubRepositories(projectPath, language, githubToken);
            repositoryProfiles = repoConfig.profiles;
            monorepoProjects = repoConfig.monorepoProjects;
          } catch (error: any) {
            // Repository configuration failed - show error but continue with empty profiles
            console.log(chalk.red(`\n❌ Repository configuration failed: ${error.message}`));
            console.log(chalk.yellow('   Continuing with manual sync configuration\n'));

            if (process.env.DEBUG && error.stack) {
              console.log(chalk.gray(error.stack));
            }

            // Leave repositoryProfiles empty - will be created with defaults
          }
        }

        // Step 5.2: Write sync config to .specweave/config.json
        await writeSyncConfig(projectPath, tracker, credentials, syncSettings, syncPermissions, repositoryProfiles, monorepoProjects);

        // Step 5.5: Validate resources (Jira only - auto-create missing projects/boards)
        if (tracker === 'jira') {
          await validateResources(tracker, credentials, projectPath);
        }

        // Install plugin
        await installPlugin(tracker, language);
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

    const { retry } = await inquirer.prompt([{
      type: 'confirm',
      name: 'retry',
      message: 'Try again?',
      default: true
    }]);

    if (retry) {
      // Recursive retry (will respect maxRetries in validation)
      return setupIssueTracker(options);
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
      const repoConfig = await configureGitHubRepositories(projectPath, language, githubToken);
      repositoryProfiles = repoConfig.profiles;
      monorepoProjects = repoConfig.monorepoProjects;
    } catch (error: any) {
      // Repository configuration failed - show error but continue with empty profiles
      console.log(chalk.red(`\n❌ Repository configuration failed: ${error.message}`));
      console.log(chalk.yellow('   Continuing with manual sync configuration\n'));

      if (process.env.DEBUG && error.stack) {
        console.log(chalk.gray(error.stack));
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
    await validateResources(tracker, credentials, projectPath);
  }

  // Step 6: Install plugin
  await installPlugin(tracker, language);

  // Step 7: Show success message
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
 */
async function validateResources(
  tracker: IssueTracker,
  credentials: TrackerCredentials,
  projectPath: string
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

      // Run validation
      const result = await validateAzureDevOpsResources(`${projectPath}/.env`);

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
 * Save credentials to .env file
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

  // Get tracker-specific env vars
  let envVars: Array<{ key: string; value: string }> = [];

  switch (tracker) {
    case 'github':
      envVars = getGitHubEnvVars(credentials as any);
      break;
    case 'jira':
      envVars = getJiraEnvVars(credentials as any);
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
}

/**
 * Write sync config to .specweave/config.json
 *
 * This is CRITICAL for hooks to fire! Without this, the post-task-completion hook
 * won't sync to GitHub/Jira/ADO.
 *
 * NEW (v0.21.0): Includes sync settings (status sync, task checkboxes, auto-labels)
 */
async function writeSyncConfig(
  projectPath: string,
  tracker: IssueTracker,
  credentials: TrackerCredentials,
  syncSettings: { includeStatus: boolean; autoApplyLabels: boolean },
  syncPermissions: { canUpsertInternalItems: boolean; canUpdateExternalItems: boolean; canUpdateStatus: boolean },
  repositoryProfiles?: any[],
  monorepoProjects?: string[]
): Promise<void> {
  const configPath = path.join(projectPath, '.specweave', 'config.json');

  // Read existing config or create new one
  let config: any = {
    project: {
      name: path.basename(projectPath),
      version: '0.1.0'
    },
    adapters: {
      default: 'claude'
    }
  };

  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  // Add hooks configuration (enables auto-sync!)
  config.hooks = {
    post_task_completion: {
      sync_living_docs: true,
      sync_tasks_md: true,
      external_tracker_sync: true
    },
    post_increment_planning: {
      auto_create_github_issue: tracker === 'github' // Only for GitHub
    }
  };

  // Detect repository info
  let owner = '';
  let repo = '';
  let domain = '';
  let organization = '';
  let project = '';

  if (tracker === 'github') {
    // Try to detect from git remote
    try {
      const remote = execSync('git remote get-url origin', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();

      // Parse owner/repo from: https://github.com/owner/repo.git or git@github.com:owner/repo.git
      const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
      if (match) {
        owner = match[1];
        repo = match[2];
      }
    } catch {
      // Fallback to current directory name
      repo = path.basename(projectPath);
      owner = 'YOUR_GITHUB_USERNAME'; // User must update manually
    }
  } else if (tracker === 'jira') {
    const jiraCreds = credentials as any;
    domain = jiraCreds.domain || '';

    // Handle different Jira strategies
    if (jiraCreds.strategy === 'project-per-team' && jiraCreds.projects) {
      // For project-per-team, store array of project keys
      project = jiraCreds.projects; // This will be an array
    } else {
      // For component-based or board-based, single project
      project = jiraCreds.projectKey || jiraCreds.project || '';
    }
  } else if (tracker === 'ado') {
    const adoCreds = credentials as any;
    organization = adoCreds.organization || '';
    project = adoCreds.project || '';
  }

  // Add sync configuration
  const profiles: any = {};

  // Handle GitHub with multiple repository profiles
  if (tracker === 'github' && repositoryProfiles && repositoryProfiles.length > 0) {
    // Create profiles from repository configuration
    for (const profile of repositoryProfiles) {
      profiles[profile.id] = {
        provider: 'github',
        displayName: profile.displayName,
        config: {
          owner: profile.owner,
          repo: profile.repo
        },
        timeRange: {
          default: '1M',
          max: '6M'
        },
        rateLimits: {
          maxItemsPerSync: 500,
          warnThreshold: 100
        }
      };
    }

    // Handle monorepo projects if present
    if (monorepoProjects && monorepoProjects.length > 0) {
      // Store monorepo projects in the single profile
      const mainProfile = Object.values(profiles)[0] as any;
      if (mainProfile) {
        mainProfile.config.monorepoProjects = monorepoProjects;
      }
    }

    // Set default profile to the first one or the one marked as default
    const defaultProfile = repositoryProfiles.find(p => p.isDefault) || repositoryProfiles[0];
    config.sync = {
      enabled: true,
      provider: tracker,                                    // NEW: Exclusive provider
      includeStatus: syncSettings.includeStatus,            // NEW: Status sync toggle
      autoApplyLabels: syncSettings.autoApplyLabels,        // NEW: Auto-labeling
      activeProfile: defaultProfile?.id || 'main',
      settings: {
        canUpsertInternalItems: syncPermissions.canUpsertInternalItems,
        canUpdateExternalItems: syncPermissions.canUpdateExternalItems,
        canUpdateStatus: syncPermissions.canUpdateStatus
      },
      profiles
    };
  } else if (tracker === 'github') {
    // Fallback for legacy single-repo configuration
    profiles[`${tracker}-default`] = {
      provider: 'github',
      displayName: 'GitHub Default',
      config: {
        owner,
        repo
      },
      timeRange: {
        default: '1M',
        max: '6M'
      },
      rateLimits: {
        maxItemsPerSync: 500,
        warnThreshold: 100
      }
    };
    config.sync = {
      enabled: true,
      provider: tracker,                                    // NEW: Exclusive provider
      includeStatus: syncSettings.includeStatus,            // NEW: Status sync toggle
      autoApplyLabels: syncSettings.autoApplyLabels,        // NEW: Auto-labeling
      activeProfile: `${tracker}-default`,
      settings: {
        canUpsertInternalItems: syncPermissions.canUpsertInternalItems,
        canUpdateExternalItems: syncPermissions.canUpdateExternalItems,
        canUpdateStatus: syncPermissions.canUpdateStatus
      },
      profiles
    };
  } else if (tracker === 'jira') {
    profiles[`${tracker}-default`] = {
      provider: 'jira',
      displayName: 'Jira Default',
      config: {
        domain,
        // Handle both single project (string) and multiple projects (array)
        ...(Array.isArray(project)
          ? { projects: project }  // project-per-team: array of project keys
          : { projectKey: project } // component/board-based: single project key
        )
      },
      timeRange: {
        default: '1M',
        max: '6M'
      }
    };
    config.sync = {
      enabled: true,
      provider: tracker,                                    // NEW: Exclusive provider
      includeStatus: syncSettings.includeStatus,            // NEW: Status sync toggle
      autoApplyLabels: syncSettings.autoApplyLabels,        // NEW: Auto-labeling
      activeProfile: `${tracker}-default`,
      settings: {
        canUpsertInternalItems: syncPermissions.canUpsertInternalItems,
        canUpdateExternalItems: syncPermissions.canUpdateExternalItems,
        canUpdateStatus: syncPermissions.canUpdateStatus
      },
      profiles
    };
  } else if (tracker === 'ado') {
    profiles[`${tracker}-default`] = {
      provider: 'ado',
      displayName: 'Azure DevOps Default',
      config: {
        organization,
        project
      },
      timeRange: {
        default: '1M',
        max: '6M'
      }
    };
    config.sync = {
      enabled: true,
      provider: tracker,                                    // NEW: Exclusive provider
      includeStatus: syncSettings.includeStatus,            // NEW: Status sync toggle
      autoApplyLabels: syncSettings.autoApplyLabels,        // NEW: Auto-labeling
      activeProfile: `${tracker}-default`,
      settings: {
        canUpsertInternalItems: syncPermissions.canUpsertInternalItems,
        canUpdateExternalItems: syncPermissions.canUpdateExternalItems,
        canUpdateStatus: syncPermissions.canUpdateStatus
      },
      profiles
    };
  }

  // Write config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

  console.log(chalk.green(`✓ Sync config written to .specweave/config.json`));
  console.log(chalk.gray(`   Provider: ${tracker}`));
  console.log(chalk.gray(`   Auto-sync: enabled`));
  console.log(chalk.gray(`   Status sync: ${syncSettings.includeStatus ? 'enabled' : 'disabled'}`));
  console.log(chalk.gray(`   Auto-labeling: ${syncSettings.autoApplyLabels ? 'enabled' : 'disabled'}`));
  console.log(chalk.gray(`   Hooks: post_task_completion, post_increment_planning`));
}

/**
 * Install tracker plugin
 */
async function installPlugin(tracker: IssueTracker, language: string): Promise<void> {
  const spinner = ora(`Installing ${getTrackerDisplayName(tracker)} plugin...`).start();

  // Check if Claude CLI is available
  if (!isClaudeCliAvailable()) {
    spinner.warn('Claude CLI not found');
    console.log(chalk.yellow('\n📦 Manual plugin installation required:'));
    console.log(chalk.white(`   /plugin install specweave-${tracker}\n`));
    return;
  }

  // Install plugin
  const result = installTrackerPlugin(tracker);

  if (result.success) {
    if (result.alreadyInstalled) {
      spinner.succeed(`${getTrackerDisplayName(tracker)} plugin already installed`);
    } else {
      spinner.succeed(`${getTrackerDisplayName(tracker)} plugin installed`);
    }
  } else {
    spinner.fail(`Could not auto-install plugin`);
    console.log(chalk.yellow('\n📦 Manual plugin installation:'));
    console.log(chalk.white(`   /plugin install specweave-${tracker}`));

    // Show error details in DEBUG mode
    if (process.env.DEBUG && result.error) {
      console.log(chalk.gray(`   Error: ${result.error}`));
    }
    console.log('');
  }
}

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
