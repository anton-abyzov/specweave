/**
 * Smart Jira Setup Wizard
 *
 * Intelligent credential detection and setup flow:
 * 1. Check .env for credentials (uses credentialsManager)
 * 2. Interactive prompt only if missing
 * 3. Never ask twice for same credentials
 */

import inquirer from 'inquirer';
import { credentialsManager, JiraCredentials } from '../../../src/core/credentials-manager.js';

// ============================================================================
// Types
// ============================================================================

export { JiraCredentials } from '../../../src/core/credentials-manager.js';

export interface CredentialDetectionResult {
  found: boolean;
  credentials?: JiraCredentials;
  source?: 'env' | 'interactive';
}

// ============================================================================
// Credential Detection
// ============================================================================

/**
 * Smart credential detection - uses existing credentialsManager
 */
export async function detectJiraCredentials(): Promise<CredentialDetectionResult> {
  if (credentialsManager.hasJiraCredentials()) {
    try {
      const credentials = credentialsManager.getJiraCredentials();
      console.log('✅ Found Jira credentials in .env');
      return {
        found: true,
        credentials,
        source: 'env',
      };
    } catch (error) {
      // Credentials exist but invalid format
      return { found: false };
    }
  }

  return { found: false };
}

// ============================================================================
// Interactive Setup
// ============================================================================

/**
 * Interactive Jira credential setup
 * Only runs if credentials not found
 */
export async function setupJiraCredentials(): Promise<JiraCredentials> {
  console.log('\n🔧 Jira Setup Wizard\n');

  // Check for existing credentials first
  const detected = await detectJiraCredentials();

  if (detected.found) {
    // Ask user if they want to use existing or re-enter
    const { useExisting } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useExisting',
        message: `Found credentials in ${detected.source}. Use these credentials?`,
        default: true,
      },
    ]);

    if (useExisting) {
      return detected.credentials!;
    }

    console.log('\n📝 Enter new credentials:\n');
  } else {
    console.log('⚠️  No Jira credentials found\n');
    console.log('📝 Let\'s set up your Jira connection:\n');
  }

  // Interactive credential entry
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'setupType',
      message: 'How would you like to connect to Jira?',
      choices: [
        {
          name: 'Cloud (*.atlassian.net)',
          value: 'cloud',
        },
        {
          name: 'Server/Data Center (self-hosted)',
          value: 'server',
        },
      ],
    },
    {
      type: 'input',
      name: 'domain',
      message: (answers: any) =>
        answers.setupType === 'cloud'
          ? 'Jira domain (e.g., mycompany.atlassian.net):'
          : 'Jira server URL (e.g., jira.mycompany.com):',
      validate: (value: string) => {
        if (!value) return 'Domain is required';
        if (answers.setupType === 'cloud' && !value.includes('.atlassian.net')) {
          return 'Cloud domain must end with .atlassian.net';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'email',
      message: 'Email address:',
      validate: (value: string) => {
        if (!value) return 'Email is required';
        if (!value.includes('@')) return 'Must be a valid email';
        return true;
      },
    },
    {
      type: 'password',
      name: 'apiToken',
      message: 'API token:',
      mask: '*',
      validate: (value: string) => {
        if (!value) return 'API token is required';
        if (value.length < 10) return 'API token seems too short';
        return true;
      },
    },
  ]);

  const credentials: JiraCredentials = {
    domain: answers.domain,
    email: answers.email,
    apiToken: answers.apiToken,
  };

  // Test connection
  console.log('\n🔍 Testing connection...');
  const isValid = await testJiraConnection(credentials);

  if (!isValid) {
    console.log('❌ Failed to connect to Jira');
    console.log('💡 Please check your credentials and try again\n');

    const { retry } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'retry',
        message: 'Would you like to try again?',
        default: true,
      },
    ]);

    if (retry) {
      return setupJiraCredentials();
    }

    throw new Error('Jira connection failed');
  }

  console.log('✅ Connection successful!\n');

  // Save to .env using credentialsManager
  await saveCredentialsToEnv(credentials);

  return credentials;
}

/**
 * Test Jira connection with credentials
 */
async function testJiraConnection(credentials: JiraCredentials): Promise<boolean> {
  try {
    const https = await import('https');

    const auth = Buffer.from(`${credentials.email}:${credentials.apiToken}`).toString('base64');

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: credentials.domain,
          path: '/rest/api/3/myself',
          method: 'GET',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          resolve(res.statusCode === 200);
        }
      );

      req.on('error', () => resolve(false));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  } catch (error) {
    return false;
  }
}

/**
 * Save credentials to .env using credentialsManager
 */
async function saveCredentialsToEnv(credentials: JiraCredentials): Promise<void> {
  console.log('💡 Save credentials to .env for future use\n');

  const { saveToEnv } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'saveToEnv',
      message: 'Save credentials to .env file?',
      default: true,
    },
  ]);

  if (saveToEnv) {
    credentialsManager.saveToEnvFile({ jira: credentials });
    console.log('✅ Credentials saved to .env');
    console.log('✅ .env added to .gitignore');
  } else {
    console.log('⚠️  Credentials not saved. You\'ll need to enter them again next time.');
  }
}

// ============================================================================
// Export Helpers
// ============================================================================

/**
 * Get Jira credentials - smart detection with fallback to interactive setup
 */
export async function getJiraCredentials(): Promise<JiraCredentials> {
  const detected = await detectJiraCredentials();

  if (detected.found) {
    return detected.credentials!;
  }

  // Not found - run interactive setup
  return setupJiraCredentials();
}
