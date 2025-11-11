/**
 * GitHub Integration for Issue Tracker Setup
 *
 * Handles GitHub.com and GitHub Enterprise authentication
 * Supports manual token entry and gh CLI auto-detection
 *
 * @module cli/helpers/issue-tracker/github
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { getGitHubAuth } from '../../../utils/auth-helpers.js';
import {
  parseEnvFile,
  readEnvFile
} from '../../../utils/env-file.js';
import type {
  GitHubCredentials,
  ExistingCredentials,
  ValidationResult,
  GitHubInstanceType
} from './types.js';
import {
  isGhCliAvailable,
  maskSensitiveValue,
  retryWithBackoff,
  checkRateLimit
} from './utils.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';
import { RateLimitError } from './types.js';

/**
 * Check for existing GitHub credentials
 *
 * Priority: .env > GH_TOKEN > GITHUB_TOKEN > gh CLI config
 *
 * @param projectPath - Path to project root
 * @returns Existing credentials or null
 */
export async function checkExistingGitHubCredentials(
  projectPath: string
): Promise<ExistingCredentials | null> {
  // 1. Check project .env file
  const envContent = readEnvFile(projectPath);
  if (envContent) {
    const parsed = parseEnvFile(envContent);
    if (parsed.GH_TOKEN) {
      return {
        source: '.env',
        credentials: {
          token: parsed.GH_TOKEN,
          instanceType: 'cloud' // Assume cloud unless specified
        }
      };
    }
  }

  // 2. Check environment variables and gh CLI
  const auth = getGitHubAuth();
  if (auth.source !== 'none') {
    return {
      source: auth.source,
      credentials: {
        token: auth.token,
        instanceType: 'cloud'
      }
    };
  }

  return null;
}

/**
 * Prompt user for GitHub credentials
 *
 * Supports:
 * - Manual token entry
 * - gh CLI auto-detection
 * - GitHub.com vs GitHub Enterprise selection
 *
 * @param language - User's language
 * @returns Credentials or null if skipped
 */
export async function promptGitHubCredentials(
  language: SupportedLanguage
): Promise<GitHubCredentials | null> {
  const locale = getLocaleManager(language);

  console.log(chalk.white('\n📋 GitHub Integration Setup\n'));
  console.log(chalk.gray('SpecWeave will sync increments with GitHub Issues.\n'));

  // Step 1: Ask about instance type (Cloud vs Enterprise)
  const { instanceType } = await inquirer.prompt([{
    type: 'list',
    name: 'instanceType',
    message: 'Which GitHub instance are you using?',
    choices: [
      { name: 'GitHub.com (cloud)', value: 'cloud' },
      { name: 'GitHub Enterprise (self-hosted)', value: 'enterprise' }
    ],
    default: 'cloud'
  }]);

  let apiEndpoint: string | undefined;

  // Step 1.5: Repository configuration will be handled separately after credentials

  // Step 2: If Enterprise, ask for API endpoint
  if (instanceType === 'enterprise') {
    console.log(chalk.gray('\nGitHub Enterprise requires a custom API endpoint.\n'));

    const { endpoint } = await inquirer.prompt([{
      type: 'input',
      name: 'endpoint',
      message: 'GitHub Enterprise API endpoint:',
      default: 'https://github.company.com/api/v3',
      validate: (input: string) => {
        if (!input.startsWith('https://')) {
          return 'API endpoint must use HTTPS (http:// is not secure)';
        }
        return true;
      }
    }]);

    apiEndpoint = endpoint;
  }

  // Step 3: Show setup instructions
  console.log(chalk.cyan('\n📋 Quick Setup:'));
  if (instanceType === 'cloud') {
    console.log(chalk.gray('   1. Go to: https://github.com/settings/tokens/new'));
  } else {
    console.log(chalk.gray(`   1. Go to: ${apiEndpoint}/settings/tokens/new`));
  }
  console.log(chalk.gray('   2. Token name: "SpecWeave - [your-project]"'));
  console.log(chalk.gray('   3. Scopes needed: ☑ repo, ☑ workflow'));
  console.log(chalk.gray('   4. Click "Generate token"'));
  console.log(chalk.gray('   5. Copy the token (ghp_...)\n'));

  // Step 4: Check if gh CLI is available (only for GitHub.com)
  const ghCliAvailable = instanceType === 'cloud' && await isGhCliAvailable();

  const choices = [
    { name: 'Enter token manually', value: 'manual' },
    ...(ghCliAvailable ? [{ name: 'Use gh CLI (auto-detect)', value: 'gh-cli' }] : []),
    { name: 'Skip for now', value: 'skip' }
  ];

  const { method } = await inquirer.prompt([{
    type: 'list',
    name: 'method',
    message: 'How would you like to authenticate?',
    choices
  }]);

  if (method === 'skip') {
    return null;
  }

  // Step 5: Get token based on method
  let token: string;

  if (method === 'gh-cli') {
    const auth = getGitHubAuth();
    if (auth.source === 'gh-cli') {
      console.log(chalk.green('✓ Found gh CLI token'));
      token = auth.token;
    } else {
      console.log(chalk.red('❌ Could not detect gh CLI token'));
      console.log(chalk.yellow('   Make sure you\'re logged in: gh auth login\n'));

      // Fallback to manual entry
      const { retryMethod } = await inquirer.prompt([{
        type: 'list',
        name: 'retryMethod',
        message: 'What would you like to do?',
        choices: [
          { name: 'Enter token manually', value: 'manual' },
          { name: 'Skip for now', value: 'skip' }
        ]
      }]);

      if (retryMethod === 'skip') {
        return null;
      }

      // Fall through to manual entry
    }
  }

  // Manual token entry
  if (method === 'manual' || !token!) {
    const { manualToken } = await inquirer.prompt([{
      type: 'password',
      name: 'manualToken',
      message: 'Paste your GitHub token:',
      mask: '*',
      validate: (input: string) => {
        if (!input || input.length < 20) {
          return 'Invalid token format (should be at least 20 characters)';
        }
        // GitHub tokens start with ghp_ (classic) or github_pat_ (fine-grained)
        if (instanceType === 'cloud') {
          if (!input.startsWith('ghp_') && !input.startsWith('github_pat_')) {
            return 'GitHub tokens typically start with "ghp_" or "github_pat_"';
          }
        }
        return true;
      }
    }]);

    token = manualToken;
  }

  // Repository configuration will be handled separately
  // Just return credentials here
  return {
    token,
    instanceType: instanceType as GitHubInstanceType,
    apiEndpoint
  };
}

/**
 * Validate GitHub connection
 *
 * Tests authentication and returns user information
 * Handles rate limiting with retry logic
 *
 * @param credentials - GitHub credentials
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Validation result
 */
export async function validateGitHubConnection(
  credentials: GitHubCredentials,
  maxRetries: number = 3
): Promise<ValidationResult> {
  const spinner = ora('Testing connection...').start();

  try {
    const result = await retryWithBackoff(async () => {
      // Determine API endpoint
      const apiBase = credentials.apiEndpoint || 'https://api.github.com';
      const userEndpoint = `${apiBase}/user`;

      const response = await fetch(userEndpoint, {
        headers: {
          'Authorization': `Bearer ${credentials.token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      // Check for rate limiting
      const rateLimitInfo = checkRateLimit(response);
      if (rateLimitInfo) {
        throw new RateLimitError(
          'GitHub API rate limit exceeded',
          rateLimitInfo
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Authentication failed';

        if (response.status === 401) {
          errorMessage = 'Invalid authentication credentials';
        } else if (response.status === 403) {
          errorMessage = 'Access forbidden (check token scopes)';
        } else {
          errorMessage = `HTTP ${response.status}: ${errorText}`;
        }

        throw new Error(errorMessage);
      }

      const user: any = await response.json();
      return user;
    }, maxRetries);

    spinner.succeed(`Connected to GitHub as @${result.login}`);

    return {
      success: true,
      username: result.login
    };
  } catch (error: any) {
    spinner.fail('GitHub authentication failed');

    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Get GitHub environment variables for .env file
 *
 * @param credentials - GitHub credentials
 * @returns Array of key-value pairs for .env
 */
export function getGitHubEnvVars(credentials: GitHubCredentials): Array<{ key: string; value: string }> {
  const vars = [
    { key: 'GH_TOKEN', value: credentials.token }
  ];

  // Add Enterprise-specific variables
  if (credentials.instanceType === 'enterprise' && credentials.apiEndpoint) {
    vars.push({ key: 'GITHUB_API_URL', value: credentials.apiEndpoint });
  }

  // Note: Repository configuration will be stored in config.json profiles
  // not in .env file, for better multi-repo support

  return vars;
}

/**
 * Show GitHub setup complete message
 *
 * @param language - User's language
 */
export function showGitHubSetupComplete(language: SupportedLanguage): void {
  const locale = getLocaleManager(language);

  console.log(chalk.green.bold('\n✅ GitHub integration complete!\n'));
  console.log(chalk.white('Available commands:'));
  console.log(chalk.gray('  /specweave-github:create-issue'));
  console.log(chalk.gray('  /specweave-github:sync'));
  console.log(chalk.gray('  /specweave-github:close-issue'));
  console.log(chalk.gray('  /specweave-github:status\n'));
  console.log(chalk.cyan('💡 Tip: Use /specweave:increment "feature" to create an increment'));
  console.log(chalk.gray('   It will automatically sync to GitHub Issues!\n'));
}

/**
 * Show GitHub setup skipped message
 *
 * @param language - User's language
 */
export function showGitHubSetupSkipped(language: SupportedLanguage): void {
  const locale = getLocaleManager(language);

  console.log(chalk.yellow('\n⏭️  Skipped GitHub setup\n'));
  console.log(chalk.white('You can configure later:'));
  console.log(chalk.gray('  1. Add GH_TOKEN to .env file'));
  console.log(chalk.gray('  2. Install plugin: /plugin install specweave-github\n'));
}

/**
 * Configure GitHub repositories
 *
 * This is called after credentials are validated to set up repository profiles
 * Enhanced to support repository creation via GitHub API
 *
 * @param projectPath - Path to project directory
 * @param language - User's language
 * @param githubToken - Optional GitHub token for repository creation
 * @returns Repository profiles
 */
export async function configureGitHubRepositories(
  projectPath: string,
  language: SupportedLanguage,
  githubToken?: string
): Promise<{ profiles: any[]; monorepoProjects?: string[] }> {
  // Import the multi-repo module
  const {
    promptGitHubSetupType,
    configureNoRepository,
    configureSingleRepository,
    configureMultipleRepositories,
    configureMonorepo,
    autoDetectRepositories
  } = await import('./github-multi-repo.js');

  // Pass projectPath and token for enhanced flow with repo creation
  const setupType = await promptGitHubSetupType(projectPath, githubToken);

  switch (setupType) {
    case 'none':
      return { profiles: await configureNoRepository() };

    case 'single':
      return { profiles: await configureSingleRepository(projectPath) };

    case 'multiple':
      return { profiles: await configureMultipleRepositories(projectPath) };

    case 'monorepo':
      const result = await configureMonorepo(projectPath);
      return {
        profiles: result.profiles,
        monorepoProjects: result.projects
      };

    case 'auto-detect':
      return { profiles: await autoDetectRepositories(projectPath) };

    default:
      return { profiles: [] };
  }
}
