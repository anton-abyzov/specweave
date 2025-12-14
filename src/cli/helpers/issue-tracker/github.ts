/**
 * GitHub Integration for Issue Tracker Setup
 *
 * Handles GitHub.com and GitHub Enterprise authentication
 * Supports manual token entry and gh CLI auto-detection
 *
 * @module cli/helpers/issue-tracker/github
 */

import chalk from 'chalk';
import { select, input, password } from '@inquirer/prompts';
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
  const instanceType = await select<GitHubInstanceType>({
    message: 'Which GitHub instance are you using?',
    choices: [
      { name: 'GitHub.com (cloud)', value: 'cloud' },
      { name: 'GitHub Enterprise (self-hosted)', value: 'enterprise' }
    ],
    default: 'cloud'
  });

  let apiEndpoint: string | undefined;

  // Step 1.5: Repository configuration will be handled separately after credentials

  // Step 2: If Enterprise, ask for API endpoint
  if (instanceType === 'enterprise') {
    console.log(chalk.gray('\nGitHub Enterprise requires a custom API endpoint.\n'));

    apiEndpoint = await input({
      message: 'GitHub Enterprise API endpoint:',
      default: 'https://github.company.com/api/v3',
      validate: (value: string) => {
        if (!value.startsWith('https://')) {
          return 'API endpoint must use HTTPS (http:// is not secure)';
        }
        return true;
      }
    });
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

  const method = await select({
    message: 'How would you like to authenticate?',
    choices
  });

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
      const retryMethod = await select({
        message: 'What would you like to do?',
        choices: [
          { name: 'Enter token manually', value: 'manual' },
          { name: 'Skip for now', value: 'skip' }
        ]
      });

      if (retryMethod === 'skip') {
        return null;
      }

      // Fall through to manual entry
    }
  }

  // Manual token entry
  if (method === 'manual' || !token!) {
    const manualToken = await password({
      message: 'Paste your GitHub token:',
      mask: true,
      validate: (value: string) => {
        if (!value || value.length < 20) {
          return 'Invalid token format (should be at least 20 characters)';
        }
        // GitHub tokens start with ghp_ (classic) or github_pat_ (fine-grained)
        if (instanceType === 'cloud') {
          if (!value.startsWith('ghp_') && !value.startsWith('github_pat_')) {
            return 'GitHub tokens typically start with "ghp_" or "github_pat_"';
          }
        }
        return true;
      }
    });

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
  // CRITICAL FIX (2025-11-26): Use GITHUB_TOKEN as the standard variable name
  // Previously used GH_TOKEN, but loadEnvConfig() and other code expect GITHUB_TOKEN
  const vars = [
    { key: 'GITHUB_TOKEN', value: credentials.token }
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
  console.log(chalk.cyan('💡 Tip: Use /sw:increment "feature" to create an increment'));
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
 * CRITICAL OPTIMIZATION (v0.36.0+): When GitHub is used for BOTH repositories AND issue tracking,
 * this function detects existing repository configuration and reuses it instead of asking again.
 *
 * This is called after credentials are validated to set up repository profiles
 * Enhanced to support:
 * - Smart detection of existing repo config (GitHub repos + GitHub Issues case)
 * - Repository creation via GitHub API
 * - Parent repo selection for multi-repo case
 *
 * @param projectPath - Path to project directory
 * @param language - User's language
 * @param githubToken - Optional GitHub token for repository creation
 * @param repositoryHosting - Optional repository hosting choice from init.ts (prevents duplicate prompts)
 * @param githubCredentialsFromRepoSetup - Optional GitHub credentials from repository setup
 * @param gitUrlFormat - Optional Git URL format from repository setup (SSH or HTTPS) - v1.0.8+
 * @returns Repository profiles
 */
export async function configureGitHubRepositories(
  projectPath: string,
  language: SupportedLanguage,
  githubToken?: string,
  repositoryHosting?: string,
  githubCredentialsFromRepoSetup?: { org: string; pat: string; clonedRepos?: string[] },
  gitUrlFormat?: 'ssh' | 'https'
): Promise<{ profiles: any[]; monorepoProjects?: string[] }> {
  // CRITICAL OPTIMIZATION (v1.0.5): If GitHub credentials provided from repository setup, reuse them!
  // This prevents asking the same questions twice (repos during init, then again for issue tracker)
  if (githubCredentialsFromRepoSetup) {
    const { org, pat, clonedRepos } = githubCredentialsFromRepoSetup;

    // v1.0.9: If cloned repos are provided, ask for parent repo selection, then create profiles
    // v1.0.10: Added parent repo selection for multi-repo setups (aligned with multi-repo-configurator.ts)
    // v1.0.11: CRITICAL FIX - Prompt for PAT if missing (SSH flow) since GitHub Issues API requires it
    if (clonedRepos && clonedRepos.length > 0) {
      console.log(chalk.cyan('\n📂 Using Cloned GitHub Repositories\n'));
      console.log(chalk.green(`   ✓ ${clonedRepos.length} repositories cloned`));

      // CRITICAL (v1.0.11): If PAT is missing (SSH flow), prompt for it NOW
      // GitHub Issues API requires authentication for private repos
      let effectivePat = pat;
      if (!effectivePat) {
        console.log(chalk.yellow('\n⚠️  GitHub Personal Access Token (PAT) Required\n'));
        console.log(chalk.gray('   You used SSH for cloning, but GitHub Issues API requires a PAT.'));
        console.log(chalk.gray('   The PAT needs "repo" scope to access issues in private repositories.\n'));

        effectivePat = await password({
          message: 'GitHub Personal Access Token (PAT):',
          mask: '*',
          validate: (val: string) => {
            if (!val.trim()) return 'PAT is required for GitHub Issues integration';
            if (val.length < 20) return 'Token appears too short - please check';
            return true;
          }
        });

        // Save PAT to .env file immediately so it persists
        const { writeEnvFile, readEnvFile, parseEnvFile } = await import('../../../utils/env-file.js');
        const existingEnv = readEnvFile(projectPath) || '';
        const parsed = parseEnvFile(existingEnv);

        // Use GH_TOKEN (preferred) if no token exists, or update existing
        if (!parsed.GH_TOKEN && !parsed.GITHUB_TOKEN) {
          const updatedEnv = existingEnv.trim()
            ? `${existingEnv.trim()}\nGH_TOKEN=${effectivePat}\n`
            : `GH_TOKEN=${effectivePat}\n`;
          writeEnvFile(projectPath, updatedEnv);
          console.log(chalk.green('\n   ✓ PAT saved to .env file (GH_TOKEN)\n'));
        } else {
          console.log(chalk.gray('\n   ℹ️  Using existing token from .env\n'));
        }
      }

      // Ask user which repository is the parent (same format as multi-repo-configurator.ts:169-186)
      console.log(chalk.cyan('\n Select Parent Repository\n'));
      console.log(chalk.gray('Choose which repository will be the parent (contains .specweave/ structure)\n'));

      // Build choices: all cloned repos + option to enter manually
      const parentChoices = [
        ...clonedRepos.map(repoName => ({
          name: `${chalk.bold(repoName)}\n${chalk.gray(`${org}/${repoName}`)}`,
          value: repoName,
          short: repoName
        })),
        {
          name: `${chalk.yellow(' Enter parent manually')} ${chalk.gray('(not in discovered list)')}`,
          value: '__manual__',
          short: 'Enter manually'
        }
      ];

      let parentRepoName = await select({
        message: 'Which repository is the parent?',
        choices: parentChoices,
        pageSize: 15
      });

      // Handle manual entry
      if (parentRepoName === '__manual__') {
        parentRepoName = await input({
          message: 'Enter parent repository name:',
          validate: (val: string) => {
            if (!val.trim()) return 'Repository name is required';
            if (val.length > 100) return 'Repository name too long';
            return true;
          }
        });
      }

      // Count implementation repos (exclude parent from count)
      const implRepoCount = clonedRepos.filter(r => r !== parentRepoName).length;
      console.log(chalk.green(`\n✓ Using repository: ${org}/${parentRepoName}\n`));
      console.log(chalk.gray(` Implementation repositories: ${implRepoCount}\n`));

      // Create profiles: parent repo first (marked as default), then implementation repos
      const profiles = clonedRepos.map(repoName => ({
        id: repoName,
        displayName: repoName.split('-').map((w: string) =>
          w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' '),  // Convert "my-repo-name" to "My Repo Name"
        owner: org,
        repo: repoName,
        isDefault: repoName === parentRepoName  // Parent repo is marked as default
      }));

      // Move parent to first position for clarity
      const parentIndex = profiles.findIndex(p => p.isDefault);
      if (parentIndex > 0) {
        const [parent] = profiles.splice(parentIndex, 1);
        profiles.unshift(parent);
      }

      return {
        profiles,
        monorepoProjects: undefined  // Multi-repo, not monorepo
      };
    }

    // Legacy flow: credentials provided but no cloned repos list
    console.log(chalk.cyan('\n📂 Reusing GitHub Repository Configuration\n'));
    console.log(chalk.gray('   Using credentials from repository setup phase...\n'));

    // CRITICAL FIX (v1.0.5): Skip loadExistingGitHubRepoConfig() - it never works during init!
    // Config.json is written AFTER both repository AND issue tracker setup complete.
    // Attempting to load it here always returns null and shows confusing messages.

    // Use provided credentials directly with minimal prompting
    // For single-repo: just use the org as owner
    // For multi-repo: RepoStructureManager will collect repo details (but skip architecture prompt)
    const token = pat || githubToken;

    const { promptGitHubSetupType } = await import('./github-multi-repo.js');
    // v1.0.8: Pass gitUrlFormat to avoid asking about SSH/HTTPS again
    const setupResult = await promptGitHubSetupType(projectPath, token, repositoryHosting, 0, gitUrlFormat);

    if (setupResult.profiles) {
      // Multi-repo case: if we have multiple profiles, user has already selected parent in RepoStructureManager
      // The default is set by RepoStructureManager based on user's choice
      return {
        profiles: setupResult.profiles,
        monorepoProjects: setupResult.monorepoProjects
      };
    }

    // Fallback for single-repo: create single profile from org
    return {
      profiles: [{
        id: '1',
        owner: org,
        repo: org,
        isDefault: true
      }]
    };
  }

  // LEGACY FLOW: GitHub Issues without GitHub repos, or config not found
  // Import the multi-repo module
  const {
    promptGitHubSetupType,
    configureNoRepository,
    configureSingleRepository,
    configureMultipleRepositories,
    configureMonorepo,
    autoDetectRepositories
  } = await import('./github-multi-repo.js');

  // Pass projectPath, token, repositoryHosting, and gitUrlFormat to avoid duplicate prompts (v1.0.8)
  const setupResult = await promptGitHubSetupType(projectPath, githubToken, repositoryHosting, 0, gitUrlFormat);

  // If RepoStructureManager was used, profiles are already extracted - return them directly
  if (setupResult.profiles) {
    return {
      profiles: setupResult.profiles,
      monorepoProjects: setupResult.monorepoProjects
    };
  }

  // Otherwise, use legacy flow to collect profiles
  const { setupType } = setupResult;

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

/**
 * Select parent repository for GitHub Issues (multi-repo case)
 *
 * When user has multiple repos configured, they need to choose which one
 * will be the "parent" for issue tracking. This is where GitHub Issues
 * will be created for cross-repo features.
 *
 * @param profiles - List of configured repository profiles
 * @returns Selected parent profile
 */
async function selectParentRepoForIssues(profiles: any[]): Promise<any> {
  console.log(chalk.cyan.bold('📌 Parent Repository Selection\n'));
  console.log(chalk.gray('For multi-repo setups, choose which repository should host GitHub Issues.\n'));
  console.log(chalk.gray('This is typically your "parent" or "umbrella" repository.\n'));

  // If one is already marked as default, suggest it
  const currentDefault = profiles.find(p => p.isDefault);

  const selectedId = await select({
    message: 'Which repository should host GitHub Issues?',
    choices: profiles.map(p => ({
      name: `${p.owner}/${p.repo}${p.id === currentDefault?.id ? ' (current parent)' : ''}`,
      value: p.id
    })),
    default: currentDefault?.id || profiles[0]?.id
  });

  return profiles.find(p => p.id === selectedId) || profiles[0];
}

/**
 * Validate GitHub write access to a specific repository
 *
 * CRITICAL (v0.33.0): This function tests that the token has WRITE permissions
 * to the configured repository. This catches permission issues DURING init
 * instead of later when user tries to sync.
 *
 * Test methodology:
 * 1. Try to get repo (confirms read access and repo exists)
 * 2. Try to create a test label (confirms write access)
 * 3. Clean up test label immediately
 *
 * @param credentials - GitHub credentials
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Validation result with specific error messages
 */
export async function validateGitHubWriteAccess(
  credentials: GitHubCredentials,
  owner: string,
  repo: string
): Promise<{
  success: boolean;
  error?: string;
  errorType?: 'repo_not_found' | 'no_read_access' | 'no_write_access' | 'token_scope' | 'rate_limit' | 'unknown';
  suggestion?: string;
}> {
  const apiBase = credentials.apiEndpoint || 'https://api.github.com';
  const headers = {
    'Authorization': `Bearer ${credentials.token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // Step 1: Check repository access
  try {
    const repoResponse = await fetch(`${apiBase}/repos/${owner}/${repo}`, { headers });

    if (repoResponse.status === 404) {
      return {
        success: false,
        error: `Repository ${owner}/${repo} not found or not accessible`,
        errorType: 'repo_not_found',
        suggestion: 'Check that the repository exists and your token has access to it'
      };
    }

    if (repoResponse.status === 403) {
      // Check if it's a rate limit issue
      const rateLimitRemaining = repoResponse.headers.get('x-ratelimit-remaining');
      if (rateLimitRemaining === '0') {
        return {
          success: false,
          error: 'GitHub API rate limit exceeded',
          errorType: 'rate_limit',
          suggestion: 'Wait a few minutes and try again'
        };
      }

      return {
        success: false,
        error: `Access forbidden to ${owner}/${repo}`,
        errorType: 'no_read_access',
        suggestion: 'Your token may lack the "repo" scope. Create a new token with full repo access.'
      };
    }

    if (!repoResponse.ok) {
      return {
        success: false,
        error: `Failed to access repository: HTTP ${repoResponse.status}`,
        errorType: 'unknown',
        suggestion: 'Check your network connection and try again'
      };
    }

    // Parse repo info to check permissions
    const repoInfo: any = await repoResponse.json();

    // Check if we have push permission (required for creating issues)
    if (repoInfo.permissions && !repoInfo.permissions.push && !repoInfo.permissions.admin) {
      return {
        success: false,
        error: `No write access to ${owner}/${repo}`,
        errorType: 'no_write_access',
        suggestion: 'You need push or admin access to this repository. Ask the repo owner to add you as a collaborator.'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Network error checking repository: ${error.message}`,
      errorType: 'unknown',
      suggestion: 'Check your network connection and try again'
    };
  }

  // Step 2: Test write access by creating a temporary label
  // Using labels because they're non-disruptive and easily reversible
  const testLabelName = `specweave-test-${Date.now()}`;

  try {
    const createLabelResponse = await fetch(`${apiBase}/repos/${owner}/${repo}/labels`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: testLabelName,
        color: '000000',
        description: 'SpecWeave write access test - safe to delete'
      })
    });

    if (createLabelResponse.status === 403) {
      // This is the key check - 403 on label creation means no write access
      const errorBody = await createLabelResponse.text();

      // Check for specific permission error
      if (errorBody.includes('must have admin rights') || errorBody.includes('Resource not accessible')) {
        return {
          success: false,
          error: 'Token lacks write permissions to create labels/issues',
          errorType: 'token_scope',
          suggestion: 'Your token needs the "repo" scope with write access. Create a Personal Access Token (PAT) at:\n   https://github.com/settings/tokens/new?scopes=repo'
        };
      }

      return {
        success: false,
        error: 'Write access denied to repository',
        errorType: 'no_write_access',
        suggestion: 'You need collaborator access with write permissions'
      };
    }

    if (createLabelResponse.status === 422) {
      // Label already exists - this still proves we have read access, try to delete
      // This counts as a successful permissions check
    } else if (!createLabelResponse.ok && createLabelResponse.status !== 422) {
      return {
        success: false,
        error: `Write test failed: HTTP ${createLabelResponse.status}`,
        errorType: 'unknown',
        suggestion: 'Unable to verify write permissions'
      };
    }

    // Step 3: Clean up test label (best effort)
    try {
      await fetch(`${apiBase}/repos/${owner}/${repo}/labels/${encodeURIComponent(testLabelName)}`, {
        method: 'DELETE',
        headers
      });
    } catch {
      // Ignore cleanup errors - label will be harmless if left behind
    }

    // Success! Token has write access
    return { success: true };

  } catch (error: any) {
    return {
      success: false,
      error: `Write access test failed: ${error.message}`,
      errorType: 'unknown',
      suggestion: 'Network error during write test'
    };
  }
}

/**
 * Force prompt for a new GitHub token with proper scopes
 *
 * Called when existing token (e.g., from gh CLI) lacks write permissions.
 * User MUST provide a new token - cannot skip this step.
 *
 * @param language - User's language
 * @param currentSource - Source of the failing token (for user context)
 * @param errorMessage - Error message explaining why new token is needed
 * @returns New credentials or null if user refuses (setup will fail)
 */
export async function forcePromptGitHubToken(
  language: SupportedLanguage,
  currentSource: string,
  errorMessage: string
): Promise<GitHubCredentials | null> {
  console.log(chalk.red('\n⚠️  GitHub Token Permission Issue Detected\n'));
  console.log(chalk.yellow(`Current token source: ${currentSource}`));
  console.log(chalk.yellow(`Problem: ${errorMessage}\n`));

  console.log(chalk.white('Your current token cannot create GitHub issues for syncing.'));
  console.log(chalk.white('This is required for SpecWeave to work properly.\n'));

  console.log(chalk.cyan('📋 To fix this, create a new Personal Access Token (PAT):'));
  console.log(chalk.gray('   1. Go to: https://github.com/settings/tokens/new'));
  console.log(chalk.gray('   2. Set expiration (recommended: 90 days)'));
  console.log(chalk.gray('   3. Select scopes: ☑ repo (full control)'));
  console.log(chalk.gray('   4. Click "Generate token"'));
  console.log(chalk.gray('   5. Copy the token (starts with ghp_ or github_pat_)\n'));

  const proceed = await select({
    message: 'How would you like to proceed?',
    choices: [
      { name: '🔑 Enter a new token with proper permissions', value: 'enter' },
      { name: '⏭️  Skip GitHub sync (can configure later)', value: 'skip' }
    ]
  });

  if (proceed === 'skip') {
    console.log(chalk.yellow('\n⚠️  GitHub sync will be DISABLED'));
    console.log(chalk.gray('   You can configure it later by re-running: specweave init\n'));
    return null;
  }

  // Prompt for new token
  const newToken = await password({
    message: 'Paste your new GitHub Personal Access Token:',
    validate: (value: string) => {
      if (!value || value.length < 20) {
        return 'Invalid token format (should be at least 20 characters)';
      }
      if (!value.startsWith('ghp_') && !value.startsWith('github_pat_')) {
        return 'GitHub tokens typically start with "ghp_" or "github_pat_"';
      }
      return true;
    }
  });

  return {
    token: newToken,
    instanceType: 'cloud' // Assume cloud for now, Enterprise users went through full flow
  };
}
