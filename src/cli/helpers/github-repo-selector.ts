/**
 * GitHub Repository Selection Helper
 *
 * Implements US-011: Multi-Repo Selection Strategy for GitHub Init
 *
 * Provides functionality to:
 * - Detect user's GitHub organizations and personal repos
 * - Prompt for repository selection strategy (all org, all personal, pattern, explicit list)
 * - Filter repositories by pattern (glob)
 * - Validate repository access
 * - Save selection to config
 */

import { Octokit } from '@octokit/rest';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { minimatch } from 'minimatch';

export interface GitHubRepo {
  name: string;
  full_name: string;
  owner: {
    login: string;
    type: 'User' | 'Organization';
  };
  private: boolean;
  updated_at: string;
  visibility?: 'public' | 'private' | 'internal';
}

export interface RepoSelectionConfig {
  repositories: string[]; // Array of "owner/repo" strings
  selectionStrategy: 'all-org' | 'all-personal' | 'pattern' | 'explicit';
  pattern?: string; // For pattern strategy
  organizationName?: string; // For all-org strategy
}

/**
 * Fetch user's organizations
 */
export async function fetchUserOrganizations(octokit: Octokit): Promise<string[]> {
  try {
    const { data: orgs } = await octokit.orgs.listForAuthenticatedUser({
      per_page: 100
    });
    return orgs.map(org => org.login);
  } catch (error) {
    console.error(chalk.yellow('⚠️  Failed to fetch organizations:', error instanceof Error ? error.message : String(error)));
    return [];
  }
}

/**
 * Fetch all repositories for a specific organization (with pagination)
 */
export async function fetchOrgRepositories(
  octokit: Octokit,
  org: string
): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const { data } = await octokit.repos.listForOrg({
        org,
        per_page: 100,
        page
      });

      repos.push(...data as GitHubRepo[]);
      hasMore = data.length === 100; // GitHub returns 100 per page max
      page++;
    } catch (error) {
      console.error(chalk.yellow(`⚠️  Failed to fetch repos for org ${org}:`, error instanceof Error ? error.message : String(error)));
      hasMore = false;
    }
  }

  return repos;
}

/**
 * Fetch all personal repositories (owned by authenticated user)
 */
export async function fetchPersonalRepositories(octokit: Octokit): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        affiliation: 'owner',
        per_page: 100,
        page
      });

      repos.push(...data as GitHubRepo[]);
      hasMore = data.length === 100;
      page++;
    } catch (error) {
      console.error(chalk.yellow('⚠️  Failed to fetch personal repos:', error instanceof Error ? error.message : String(error)));
      hasMore = false;
    }
  }

  return repos;
}

/**
 * Filter repositories by glob pattern
 */
export function filterRepositoriesByPattern(repos: GitHubRepo[], pattern: string): GitHubRepo[] {
  return repos.filter(repo => {
    // Match against repo name only
    return minimatch(repo.name, pattern);
  });
}

/**
 * Validate repository access (checks if user has at least read access)
 */
export async function validateRepositoryAccess(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<boolean> {
  try {
    await octokit.repos.get({ owner, repo });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Show repository preview table
 */
export function showRepositoryPreview(repos: GitHubRepo[]): void {
  console.log(chalk.blue('\n📋 Repository Preview:\n'));

  const header = `${chalk.bold('Repository')}${' '.repeat(40)}${chalk.bold('Owner')}${' '.repeat(15)}${chalk.bold('Visibility')}${' '.repeat(5)}${chalk.bold('Last Updated')}`;
  console.log(header);
  console.log('-'.repeat(100));

  repos.slice(0, 20).forEach(repo => {
    const repoName = repo.name.padEnd(45);
    const owner = repo.owner.login.padEnd(20);
    const visibility = (repo.private ? 'private' : 'public').padEnd(10);
    const lastUpdated = new Date(repo.updated_at).toLocaleDateString();

    console.log(`${repoName}${owner}${visibility}${lastUpdated}`);
  });

  if (repos.length > 20) {
    console.log(chalk.gray(`\n... and ${repos.length - 20} more repositories\n`));
  } else {
    console.log('');
  }
}

/**
 * Main repository selection flow
 */
export async function selectRepositories(
  octokit: Octokit,
  githubToken: string
): Promise<RepoSelectionConfig | null> {
  console.log(chalk.blue('\n🔗 GitHub Multi-Repository Selection\n'));

  // Step 1: Detect organizations
  const orgs = await fetchUserOrganizations(octokit);

  // Step 2: Prompt for selection strategy
  const strategyChoices = [
    { name: 'All repositories from a specific organization', value: 'all-org', disabled: orgs.length === 0 ? 'No organizations found' : false },
    { name: 'All repositories from your personal account', value: 'all-personal' },
    { name: 'Pattern matching (e.g., "ec-*", "*-backend")', value: 'pattern' },
    { name: 'Explicit list (comma-separated repo names)', value: 'explicit' }
  ];

  const { strategy } = await inquirer.prompt<{ strategy: RepoSelectionConfig['selectionStrategy'] }>([
    {
      type: 'list',
      name: 'strategy',
      message: 'How do you want to select repositories?',
      choices: strategyChoices
    }
  ]);

  let selectedRepos: GitHubRepo[] = [];
  let selectionConfig: RepoSelectionConfig = {
    repositories: [],
    selectionStrategy: strategy
  };

  // Step 3: Execute strategy
  switch (strategy) {
    case 'all-org': {
      // Prompt to select organization
      const { selectedOrg } = await inquirer.prompt<{ selectedOrg: string }>([
        {
          type: 'list',
          name: 'selectedOrg',
          message: 'Select organization:',
          choices: orgs
        }
      ]);

      console.log(chalk.gray(`\n⏳ Fetching repositories from ${selectedOrg}...\n`));
      selectedRepos = await fetchOrgRepositories(octokit, selectedOrg);
      selectionConfig.organizationName = selectedOrg;
      break;
    }

    case 'all-personal': {
      console.log(chalk.gray('\n⏳ Fetching your personal repositories...\n'));
      selectedRepos = await fetchPersonalRepositories(octokit);
      break;
    }

    case 'pattern': {
      // First, get source (org or personal)
      const sourceChoices = [
        { name: 'Personal repositories', value: 'personal' },
        ...orgs.map(org => ({ name: `Organization: ${org}`, value: `org:${org}` }))
      ];

      const { source } = await inquirer.prompt<{ source: string }>([
        {
          type: 'list',
          name: 'source',
          message: 'Select repository source:',
          choices: sourceChoices
        }
      ]);

      let allRepos: GitHubRepo[] = [];
      if (source === 'personal') {
        console.log(chalk.gray('\n⏳ Fetching your personal repositories...\n'));
        allRepos = await fetchPersonalRepositories(octokit);
      } else {
        const orgName = source.replace('org:', '');
        console.log(chalk.gray(`\n⏳ Fetching repositories from ${orgName}...\n`));
        allRepos = await fetchOrgRepositories(octokit, orgName);
        selectionConfig.organizationName = orgName;
      }

      // Prompt for pattern
      const { pattern } = await inquirer.prompt<{ pattern: string }>([
        {
          type: 'input',
          name: 'pattern',
          message: 'Enter pattern (e.g., "ec-*", "*-backend", "microservice-*"):',
          validate: (input: string) => input.trim() ? true : 'Pattern is required'
        }
      ]);

      selectedRepos = filterRepositoriesByPattern(allRepos, pattern.trim());
      selectionConfig.pattern = pattern.trim();

      if (selectedRepos.length === 0) {
        console.log(chalk.yellow(`\n⚠️  No repositories match pattern "${pattern}"\n`));
        return null;
      }
      break;
    }

    case 'explicit': {
      const { repoList } = await inquirer.prompt<{ repoList: string }>([
        {
          type: 'input',
          name: 'repoList',
          message: 'Enter repository names (comma-separated, e.g., "repo1, repo2, repo3"):',
          validate: (input: string) => input.trim() ? true : 'At least one repository is required'
        }
      ]);

      const repoNames = repoList.split(',').map(s => s.trim()).filter(Boolean);

      // Fetch authenticated user to get owner name
      const { data: user } = await octokit.users.getAuthenticated();
      const owner = user.login;

      // Validate each repository
      console.log(chalk.gray('\n⏳ Validating repository access...\n'));
      for (const repoName of repoNames) {
        try {
          const { data: repo } = await octokit.repos.get({ owner, repo: repoName });
          selectedRepos.push(repo as GitHubRepo);
        } catch (error) {
          console.log(chalk.yellow(`⚠️  Cannot access repository: ${repoName}`));
        }
      }

      if (selectedRepos.length === 0) {
        console.log(chalk.red('\n❌ No accessible repositories found\n'));
        return null;
      }
      break;
    }
  }

  // Step 4: Show preview and confirm
  showRepositoryPreview(selectedRepos);

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Connect these ${selectedRepos.length} repositories?`,
      default: true
    }
  ]);

  if (!confirm) {
    console.log(chalk.gray('\n✓ Repository selection cancelled\n'));
    return null;
  }

  // Step 5: Build final configuration
  selectionConfig.repositories = selectedRepos.map(repo => repo.full_name);

  console.log(chalk.green(`\n✅ Selected ${selectionConfig.repositories.length} repositories\n`));

  return selectionConfig;
}
