/**
 * Repository hosting setup
 * Handles git provider detection and configuration
 */

import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import type { RepositoryHosting, GitHubRemote } from './types.js';

/**
 * Options for repository setup
 */
export interface RepositorySetupOptions {
  targetDir: string;
  isCI: boolean;
  gitHubRemote: GitHubRemote | null;
}

/**
 * Result of repository setup
 */
export interface RepositorySetupResult {
  hosting: RepositoryHosting;
  isMultiRepo: boolean;
}

/**
 * Prompt user for repository hosting configuration
 *
 * @param options - Setup options
 * @returns Repository configuration
 */
export async function setupRepositoryHosting(options: RepositorySetupOptions): Promise<RepositorySetupResult> {
  const { isCI, gitHubRemote } = options;

  console.log('');
  console.log(chalk.cyan.bold('📦 Repository Hosting'));
  console.log('');

  let repositoryHosting: RepositoryHosting = 'github-single';
  let isMultiRepo = false;

  if (isCI) {
    // CI mode: auto-detect
    repositoryHosting = gitHubRemote ? 'github-single' : 'local';
    console.log(chalk.gray(`   → CI mode: Auto-detected ${repositoryHosting} hosting\n`));
    return { hosting: repositoryHosting, isMultiRepo: false };
  }

  // Step 1: Ask about repository structure
  const structure = await select({
    message: 'What is your repository structure?',
    choices: [
      {
        name: 'single   - One repository (monorepo or standard project)',
        value: 'single' as const
      },
      {
        name: 'multiple - Multiple repos (microservices, EDA, parent/child)',
        value: 'multirepo' as const
      }
    ],
    default: 'single'
  });

  isMultiRepo = structure === 'multirepo';

  // Step 2: Ask about git provider
  const provider = await select({
    message: 'Which Git provider do you use?',
    choices: [
      {
        name: `🐙 GitHub ${gitHubRemote ? '(detected)' : '(recommended)'}`,
        value: 'github' as const
      },
      {
        name: '🪣 Bitbucket',
        value: 'bitbucket' as const
      },
      {
        name: '🔷 Azure DevOps',
        value: 'ado' as const
      },
      {
        name: '💻 Local (no remote)',
        value: 'local' as const
      },
      {
        name: '🔧 Other (GitLab, etc - coming soon)',
        value: 'other' as const
      }
    ],
    default: gitHubRemote ? 'github' : 'local'
  });

  // Combine structure + provider
  if (provider === 'local') {
    repositoryHosting = 'local';
  } else {
    repositoryHosting = `${provider}-${structure}` as RepositoryHosting;
  }

  return { hosting: repositoryHosting, isMultiRepo };
}
