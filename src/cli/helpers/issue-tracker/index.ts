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
  const { projectPath, language, maxRetries = 3 } = options;
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

  const { tracker } = await inquirer.prompt([{
    type: 'list',
    name: 'tracker',
    message: 'Which issue tracker do you use?',
    choices: [
      {
        name: `🐙 GitHub Issues ${detection.tracker === 'github' && detection.detected ? '(detected)' : ''}`,
        value: 'github'
      },
      {
        name: `📋 Jira`,
        value: 'jira'
      },
      {
        name: `🔷 Azure DevOps ${detection.tracker === 'ado' && detection.detected ? '(detected)' : ''}`,
        value: 'ado'
      },
      {
        name: '⏭️  None (skip)',
        value: 'none'
      }
    ],
    default: detection.tracker
  }]);

  if (tracker === 'none') {
    console.log(chalk.gray('\n⏭️  Skipping issue tracker setup'));
    console.log(chalk.gray('   You can configure later via /plugin install\n'));
    return true;
  }

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
 * Install tracker plugin
 */
async function installPlugin(tracker: IssueTracker, language: string): Promise<void> {
  const spinner = ora(`Installing ${getTrackerDisplayName(tracker)} plugin...`).start();

  // Check if Claude CLI is available
  if (!isClaudeCliAvailable()) {
    spinner.warn('Claude CLI not found');
    console.log(chalk.yellow('\n📦 Manual plugin installation required:'));
    console.log(chalk.white(`   /plugin install specweave-${tracker}@specweave\n`));
    return;
  }

  // Install plugin
  const success = installTrackerPlugin(tracker);

  if (success) {
    spinner.succeed(`${getTrackerDisplayName(tracker)} plugin installed`);
  } else {
    spinner.fail(`Could not auto-install plugin`);
    console.log(chalk.yellow('\n📦 Manual plugin installation:'));
    console.log(chalk.white(`   /plugin install specweave-${tracker}@specweave\n`));
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
