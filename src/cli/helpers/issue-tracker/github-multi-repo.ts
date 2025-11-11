/**
 * Enhanced Multi-Repository GitHub Integration
 *
 * Provides improved UX for various GitHub repository configurations:
 * - No repository yet (greenfield)
 * - Single repository
 * - Multiple repositories (microservices/polyrepo)
 * - Monorepo (single repo, multiple projects)
 * - Auto-detection from git remotes
 *
 * @module cli/helpers/issue-tracker/github-multi-repo
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import {
  detectGitHubRemotes,
  detectPrimaryGitHubRemote,
  hasMultipleGitHubRemotes,
  formatGitRemote,
  getUniqueRepositories,
  type GitRemote
} from '../../../utils/git-detector.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';

/**
 * GitHub setup type options
 */
export type GitHubSetupType = 'none' | 'single' | 'multiple' | 'monorepo' | 'auto-detect';

/**
 * GitHub repository profile
 */
export interface GitHubProfile {
  id: string;           // e.g., "frontend", "backend", "main"
  displayName: string;  // e.g., "Frontend Application"
  owner: string;        // e.g., "myorg"
  repo: string;         // e.g., "frontend-app"
  isDefault?: boolean;  // Mark primary repo
}

/**
 * GitHub configuration result
 */
export interface GitHubConfiguration {
  token: string;
  instanceType: 'cloud' | 'enterprise';
  apiEndpoint?: string;
  setupType: GitHubSetupType;
  profiles: GitHubProfile[];
  monorepoProjects?: string[];  // For monorepo setup
}

/**
 * Prompt for GitHub setup type
 *
 * @returns Selected setup type
 */
export async function promptGitHubSetupType(): Promise<GitHubSetupType> {
  console.log(chalk.cyan('\n📂 Repository Configuration\n'));
  console.log(chalk.gray('How should we configure your GitHub repositories?\n'));

  const { setupType } = await inquirer.prompt([{
    type: 'list',
    name: 'setupType',
    message: 'Select your repository setup:',
    choices: [
      {
        name: '⏭️  No repository yet (configure later)',
        value: 'none',
        short: 'No repo'
      },
      {
        name: '📦 Single repository',
        value: 'single',
        short: 'Single'
      },
      {
        name: '🎯 Multiple repositories (microservices/polyrepo)',
        value: 'multiple',
        short: 'Multiple'
      },
      {
        name: '📚 Monorepo (single repo, multiple projects)',
        value: 'monorepo',
        short: 'Monorepo'
      },
      {
        name: '🔍 Auto-detect from git remotes',
        value: 'auto-detect',
        short: 'Auto-detect'
      }
    ],
    default: 'single'
  }]);

  return setupType as GitHubSetupType;
}

/**
 * Configure no repository (defer setup)
 *
 * @returns Empty profiles array
 */
export async function configureNoRepository(): Promise<GitHubProfile[]> {
  console.log(chalk.yellow('\n⏭️  Repository configuration deferred'));
  console.log(chalk.gray('You can configure repositories later using:'));
  console.log(chalk.white('  /specweave-github:setup\n'));

  return [];
}

/**
 * Configure single repository
 *
 * @param projectPath - Path to project directory
 * @returns Single profile array
 */
export async function configureSingleRepository(projectPath: string): Promise<GitHubProfile[]> {
  console.log(chalk.cyan('\n📦 Single Repository Setup\n'));

  // Try to detect from git remote
  const primaryRemote = await detectPrimaryGitHubRemote(projectPath);

  let defaultOwner = '';
  let defaultRepo = '';

  if (primaryRemote && primaryRemote.owner && primaryRemote.repo) {
    console.log(chalk.green(`✓ Detected: ${primaryRemote.owner}/${primaryRemote.repo}`));
    defaultOwner = primaryRemote.owner;
    defaultRepo = primaryRemote.repo;

    const { useDetected } = await inquirer.prompt([{
      type: 'confirm',
      name: 'useDetected',
      message: 'Use detected repository?',
      default: true
    }]);

    if (useDetected) {
      return [{
        id: 'main',
        displayName: 'Main Repository',
        owner: defaultOwner,
        repo: defaultRepo,
        isDefault: true
      }];
    }
  }

  // Manual entry
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'owner',
      message: 'GitHub owner/organization:',
      default: defaultOwner,
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Owner is required';
        }
        if (!/^[a-zA-Z0-9]([a-zA-Z0-9-])*$/.test(input)) {
          return 'Invalid GitHub username/organization format';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'repo',
      message: 'Repository name:',
      default: defaultRepo,
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Repository name is required';
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(input)) {
          return 'Invalid repository name format';
        }
        return true;
      }
    }
  ]);

  return [{
    id: 'main',
    displayName: 'Main Repository',
    owner: answers.owner,
    repo: answers.repo,
    isDefault: true
  }];
}

/**
 * Configure multiple repositories
 *
 * @param projectPath - Path to project directory
 * @returns Multiple profiles array
 */
export async function configureMultipleRepositories(projectPath: string): Promise<GitHubProfile[]> {
  console.log(chalk.cyan('\n🎯 Multiple Repositories Setup\n'));
  console.log(chalk.gray('Configure each repository for your microservices/polyrepo architecture.\n'));

  const { repoCount } = await inquirer.prompt([{
    type: 'number',
    name: 'repoCount',
    message: 'How many repositories?',
    default: 2,
    validate: (input: number) => {
      if (input < 2) {
        return 'Please enter at least 2 repositories';
      }
      if (input > 10) {
        return 'Maximum 10 repositories supported';
      }
      return true;
    }
  }]);

  const profiles: GitHubProfile[] = [];

  // Check for existing remotes
  const githubRemotes = await detectGitHubRemotes(projectPath);
  const uniqueRepos = getUniqueRepositories(githubRemotes);

  // If we have detected repos, offer them as suggestions
  if (uniqueRepos.length > 0) {
    console.log(chalk.green('\n✓ Detected GitHub repositories:'));
    uniqueRepos.forEach((repo: { owner: string; repo: string }, index: number) => {
      console.log(chalk.gray(`  ${index + 1}. ${repo.owner}/${repo.repo}`));
    });
    console.log('');
  }

  for (let i = 0; i < repoCount; i++) {
    console.log(chalk.white(`\n📦 Repository ${i + 1} of ${repoCount}:`));

    // Check if we have a suggestion for this index
    let defaultOwner = '';
    let defaultRepo = '';
    if (uniqueRepos[i]) {
      defaultOwner = uniqueRepos[i].owner;
      defaultRepo = uniqueRepos[i].repo;
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'id',
        message: 'Repository ID (e.g., frontend, backend, api):',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'ID is required';
          }
          if (!/^[a-z][a-z0-9-]*$/.test(input)) {
            return 'ID must be lowercase letters, numbers, and hyphens';
          }
          if (profiles.some(p => p.id === input)) {
            return 'ID must be unique';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'displayName',
        message: 'Display name (e.g., Frontend Application):',
        validate: (input: string) => !!input.trim() || 'Display name is required'
      },
      {
        type: 'input',
        name: 'owner',
        message: 'GitHub owner/organization:',
        default: defaultOwner || (profiles[0]?.owner || ''),  // Reuse previous owner
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Owner is required';
          }
          if (!/^[a-zA-Z0-9]([a-zA-Z0-9-])*$/.test(input)) {
            return 'Invalid GitHub username/organization format';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'repo',
        message: 'Repository name:',
        default: defaultRepo,
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Repository name is required';
          }
          if (!/^[a-zA-Z0-9._-]+$/.test(input)) {
            return 'Invalid repository name format';
          }
          return true;
        }
      }
    ]);

    profiles.push({
      id: answers.id,
      displayName: answers.displayName,
      owner: answers.owner,
      repo: answers.repo,
      isDefault: i === 0  // First repo is default
    });
  }

  return profiles;
}

/**
 * Configure monorepo
 *
 * @param projectPath - Path to project directory
 * @returns Single profile with projects
 */
export async function configureMonorepo(projectPath: string): Promise<{
  profiles: GitHubProfile[];
  projects: string[]
}> {
  console.log(chalk.cyan('\n📚 Monorepo Setup\n'));
  console.log(chalk.gray('Configure a single repository with multiple projects.\n'));

  // First configure the repository (similar to single repo)
  const profiles = await configureSingleRepository(projectPath);

  // Then ask for projects within the monorepo
  console.log(chalk.cyan('\n📂 Projects in Monorepo\n'));
  console.log(chalk.gray('List the projects/packages in your monorepo.\n'));

  const { projectsInput } = await inquirer.prompt([{
    type: 'input',
    name: 'projectsInput',
    message: 'Project names (comma-separated, e.g., frontend,backend,shared):',
    validate: (input: string) => {
      if (!input.trim()) {
        return 'At least one project is required';
      }
      const projects = input.split(',').map(p => p.trim());
      if (projects.length < 2) {
        return 'Monorepo should have at least 2 projects';
      }
      return true;
    }
  }]);

  const projects = projectsInput.split(',').map((p: string) => p.trim());

  return { profiles, projects };
}

/**
 * Auto-detect and configure repositories
 *
 * @param projectPath - Path to project directory
 * @returns Detected profiles
 */
export async function autoDetectRepositories(projectPath: string): Promise<GitHubProfile[]> {
  const spinner = ora('Detecting GitHub repositories...').start();

  const githubRemotes = await detectGitHubRemotes(projectPath);
  const uniqueRepos = getUniqueRepositories(githubRemotes);

  if (uniqueRepos.length === 0) {
    spinner.fail('No GitHub repositories detected');
    console.log(chalk.yellow('\n⚠️  No GitHub remotes found'));
    console.log(chalk.gray('   Falling back to manual configuration\n'));

    // Fall back to single repo configuration
    return configureSingleRepository(projectPath);
  }

  spinner.succeed(`Found ${uniqueRepos.length} GitHub repositor${uniqueRepos.length === 1 ? 'y' : 'ies'}`);

  console.log(chalk.green('\n✓ Detected repositories:'));
  uniqueRepos.forEach((repo: { owner: string; repo: string }, index: number) => {
    console.log(chalk.white(`  ${index + 1}. ${repo.owner}/${repo.repo}`));
  });

  const { confirmDetected } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmDetected',
    message: 'Use all detected repositories?',
    default: true
  }]);

  if (!confirmDetected) {
    // Ask which setup type they want instead
    const setupType = await promptGitHubSetupType();
    switch (setupType) {
      case 'none':
        return configureNoRepository();
      case 'single':
        return configureSingleRepository(projectPath);
      case 'multiple':
        return configureMultipleRepositories(projectPath);
      case 'monorepo':
        const result = await configureMonorepo(projectPath);
        return result.profiles;
      default:
        return [];
    }
  }

  // Create profiles from detected repos
  const profiles: GitHubProfile[] = [];

  for (let i = 0; i < uniqueRepos.length; i++) {
    const repo = uniqueRepos[i];

    if (uniqueRepos.length === 1) {
      // Single repo - use simple ID
      profiles.push({
        id: 'main',
        displayName: 'Main Repository',
        owner: repo.owner,
        repo: repo.repo,
        isDefault: true
      });
    } else {
      // Multiple repos - need IDs
      console.log(chalk.white(`\n📦 Repository: ${repo.owner}/${repo.repo}`));

      const { id, displayName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'id',
          message: 'Repository ID:',
          default: repo.repo.replace(/-app$|-service$|-api$/, ''),  // Smart default
          validate: (input: string) => {
            if (!input.trim()) {
              return 'ID is required';
            }
            if (!/^[a-z][a-z0-9-]*$/.test(input)) {
              return 'ID must be lowercase letters, numbers, and hyphens';
            }
            if (profiles.some(p => p.id === input)) {
              return 'ID must be unique';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'displayName',
          message: 'Display name:',
          default: repo.repo.split('-').map((w: string) =>
            w.charAt(0).toUpperCase() + w.slice(1)
          ).join(' ')  // Smart default: "frontend-app" -> "Frontend App"
        }
      ]);

      profiles.push({
        id,
        displayName,
        owner: repo.owner,
        repo: repo.repo,
        isDefault: i === 0
      });
    }
  }

  return profiles;
}