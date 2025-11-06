/**
 * Jira Integration for Issue Tracker Setup
 *
 * Handles Jira Cloud and Jira Server/Data Center authentication
 *
 * @module cli/helpers/issue-tracker/jira
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { getJiraAuth } from '../../../utils/auth-helpers.js';
import {
  parseEnvFile,
  readEnvFile
} from '../../../utils/env-file.js';
import type {
  JiraCredentials,
  ExistingCredentials,
  ValidationResult,
  JiraInstanceType
} from './types.js';
import {
  isValidEmail,
  retryWithBackoff,
  checkRateLimit
} from './utils.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';
import { RateLimitError } from './types.js';

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
 * Prompt user for Jira credentials
 *
 * Supports:
 * - Jira Cloud (atlassian.net)
 * - Jira Server/Data Center (self-hosted)
 *
 * @param language - User's language
 * @returns Credentials or null if skipped
 */
export async function promptJiraCredentials(
  language: SupportedLanguage
): Promise<JiraCredentials | null> {
  const locale = getLocaleManager(language);

  console.log(chalk.white('\n📋 Jira Integration Setup\n'));
  console.log(chalk.gray('SpecWeave will sync increments with Jira Issues.\n'));

  // Step 1: Ask about instance type (Cloud vs Server)
  const { instanceType } = await inquirer.prompt([{
    type: 'list',
    name: 'instanceType',
    message: 'Which Jira instance are you using?',
    choices: [
      { name: 'Jira Cloud (*.atlassian.net)', value: 'cloud' },
      { name: 'Jira Server/Data Center (self-hosted)', value: 'server' }
    ],
    default: 'cloud'
  }]);

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

  const { continueSetup } = await inquirer.prompt([{
    type: 'confirm',
    name: 'continueSetup',
    message: 'Continue with Jira setup?',
    default: true
  }]);

  if (!continueSetup) {
    return null;
  }

  // Step 3: Collect credentials
  const questions: any[] = [
    {
      type: 'input',
      name: 'domain',
      message: instanceType === 'cloud'
        ? 'Jira domain (e.g., your-company.atlassian.net):'
        : 'Jira Server URL (e.g., jira.company.com):',
      validate: (input: string) => {
        if (!input || input.trim() === '') {
          return 'Domain cannot be empty';
        }

        // Prevent SSRF attacks - block localhost and internal IP addresses
        if (/localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\./i.test(input)) {
          return 'Internal IP addresses and localhost are not allowed';
        }

        // For cloud, suggest .atlassian.net but don't enforce (user might have custom domain)
        if (instanceType === 'cloud' && !input.includes('.')) {
          return 'Please enter a valid domain (e.g., your-company.atlassian.net)';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'email',
      message: 'Your Jira email:',
      validate: (input: string) => {
        if (!isValidEmail(input)) {
          return 'Please enter a valid email address';
        }
        return true;
      }
    },
    {
      type: 'password',
      name: 'token',
      message: 'Paste your Jira API token:',
      mask: '*',
      validate: (input: string) => {
        if (!input || input.length === 0) {
          return 'Token cannot be empty';
        }
        return true;
      }
    }
  ];

  const answers = await inquirer.prompt(questions);

  return {
    token: answers.token,
    email: answers.email,
    domain: answers.domain,
    instanceType: instanceType as JiraInstanceType
  };
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
 * @param credentials - Jira credentials
 * @returns Array of key-value pairs for .env
 */
export function getJiraEnvVars(credentials: JiraCredentials): Array<{ key: string; value: string }> {
  const vars = [
    { key: 'JIRA_API_TOKEN', value: credentials.token },
    { key: 'JIRA_EMAIL', value: credentials.email },
    { key: 'JIRA_DOMAIN', value: credentials.domain }
  ];

  // Add Server-specific variables if needed
  if (credentials.instanceType === 'server') {
    vars.push({ key: 'JIRA_INSTANCE_TYPE', value: 'server' });
  }

  return vars;
}

/**
 * Show Jira setup complete message
 *
 * @param language - User's language
 */
export function showJiraSetupComplete(language: SupportedLanguage): void {
  const locale = getLocaleManager(language);

  console.log(chalk.green.bold('\n✅ Jira integration complete!\n'));
  console.log(chalk.white('Available commands:'));
  console.log(chalk.gray('  /specweave-jira:sync'));
  console.log(chalk.gray('  /specweave-jira:status\n'));
  console.log(chalk.cyan('💡 Tip: Use /specweave:inc "feature" to create an increment'));
  console.log(chalk.gray('   It will automatically sync to Jira Issues!\n'));
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
  console.log(chalk.gray('  1. Add JIRA_API_TOKEN, JIRA_EMAIL, JIRA_DOMAIN to .env'));
  console.log(chalk.gray('  2. Install plugin: /plugin install specweave-jira\n'));
}
