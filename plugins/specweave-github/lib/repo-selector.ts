/**
 * GitHub Repository Selector with Pagination
 *
 * Features:
 * - Fetches all GitHub repos via gh CLI
 * - Interactive multi-select with search
 * - Manual repo entry (comma-separated, format: owner/repo)
 * - Handles large repo lists (50+ repos)
 * - Validates repo names
 */

import inquirer from 'inquirer';
import { GitHubClient } from './github-client.js';

// ============================================================================
// Types
// ============================================================================

export interface RepoSelectionResult {
  selectedRepos: string[]; // Format: "owner/repo"
  method: 'interactive' | 'manual' | 'all';
}

export interface RepoSelectorOptions {
  /** Allow manual entry of repo names */
  allowManualEntry?: boolean;

  /** Allow "Select All" option */
  allowSelectAll?: boolean;

  /** Pre-select these repos (owner/repo format) */
  preSelected?: string[];

  /** Minimum repos to select (0 = optional) */
  minSelection?: number;

  /** Maximum repos to select (undefined = unlimited) */
  maxSelection?: number;

  /** Page size for pagination */
  pageSize?: number;

  /** Filter by owner/org */
  owner?: string;

  /** Maximum number of repos to fetch (default: 100) */
  limit?: number;
}

// ============================================================================
// GitHub Repository Fetching
// ============================================================================

/**
 * Fetch all GitHub repositories via gh CLI
 */
export async function fetchAllGitHubRepos(
  owner?: string,
  limit: number = 100
): Promise<Array<{owner: string, name: string, fullName: string}>> {
  console.log('🔍 Fetching GitHub repositories...');

  try {
    const repos = await GitHubClient.getRepositories(owner, limit);

    console.log(`✅ Found ${repos.length} GitHub repositories\n`);

    return repos;
  } catch (error) {
    console.error('❌ Failed to fetch GitHub repositories:', (error as Error).message);
    throw error;
  }
}

// ============================================================================
// Interactive Repository Selection
// ============================================================================

/**
 * Interactive repository selector with search and pagination
 */
export async function selectGitHubRepos(
  options: RepoSelectorOptions = {}
): Promise<RepoSelectionResult> {
  const {
    allowManualEntry = true,
    allowSelectAll = true,
    preSelected = [],
    minSelection = 1,
    maxSelection,
    pageSize = 15,
    owner,
    limit = 100,
  } = options;

  // Fetch all repositories
  const allRepos = await fetchAllGitHubRepos(owner, limit);

  if (allRepos.length === 0) {
    console.log('⚠️  No GitHub repositories found');
    return {
      selectedRepos: [],
      method: 'interactive',
    };
  }

  // Show repository overview
  console.log('📋 Available GitHub Repositories:\n');
  console.log(`   Total: ${allRepos.length} repositories\n`);

  // Decide selection method
  const { selectionMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectionMethod',
      message: 'How would you like to select repositories?',
      choices: [
        {
          name: `📋 Interactive (browse and select from ${allRepos.length} repositories)`,
          value: 'interactive',
        },
        {
          name: '✏️  Manual entry (type repository names)',
          value: 'manual',
        },
        ...(allowSelectAll
          ? [
              {
                name: `✨ Select all (${allRepos.length} repositories)`,
                value: 'all',
              },
            ]
          : []),
      ],
    },
  ]);

  if (selectionMethod === 'all') {
    return {
      selectedRepos: allRepos.map((r) => r.fullName),
      method: 'all',
    };
  }

  if (selectionMethod === 'manual') {
    return await manualRepoEntry(allRepos, minSelection, maxSelection);
  }

  // Interactive selection
  return await interactiveRepoSelection(
    allRepos,
    preSelected,
    minSelection,
    maxSelection,
    pageSize
  );
}

/**
 * Interactive repository selection with checkbox
 */
async function interactiveRepoSelection(
  allRepos: Array<{owner: string, name: string, fullName: string}>,
  preSelected: string[],
  minSelection: number,
  maxSelection: number | undefined,
  pageSize: number
): Promise<RepoSelectionResult> {
  console.log('💡 Use <space> to select, <a> to toggle all, <i> to invert\n');

  const choices = allRepos.map((r) => ({
    name: formatRepoChoice(r),
    value: r.fullName,
    checked: preSelected.includes(r.fullName),
  }));

  // Add manual entry option at the end
  choices.push(
    new inquirer.Separator(),
    {
      name: '✏️  Enter repository names manually instead',
      value: '__MANUAL__',
      checked: false,
    } as any
  );

  const { selectedRepos } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedRepos',
      message: `Select GitHub repositories (${minSelection}${maxSelection ? `-${maxSelection}` : '+'} required):`,
      choices,
      pageSize,
      loop: false,
      validate: (selected: string[]) => {
        const actualSelected = selected.filter((k) => k !== '__MANUAL__');

        if (actualSelected.length < minSelection) {
          return `Please select at least ${minSelection} repository(ies)`;
        }

        if (maxSelection && actualSelected.length > maxSelection) {
          return `Please select at most ${maxSelection} repository(ies)`;
        }

        return true;
      },
    },
  ]);

  // Check if user chose manual entry
  if (selectedRepos.includes('__MANUAL__')) {
    return await manualRepoEntry(allRepos, minSelection, maxSelection);
  }

  console.log(`\n✅ Selected ${selectedRepos.length} repositories: ${selectedRepos.join(', ')}\n`);

  return {
    selectedRepos,
    method: 'interactive',
  };
}

/**
 * Manual repository entry (comma-separated, format: owner/repo)
 */
async function manualRepoEntry(
  allRepos: Array<{owner: string, name: string, fullName: string}>,
  minSelection: number,
  maxSelection: number | undefined
): Promise<RepoSelectionResult> {
  console.log('\n📝 Enter repository names manually\n');
  console.log('💡 Format: Comma-separated owner/repo format (e.g., octocat/Hello-World,owner/repo2)\n');

  if (allRepos.length > 0) {
    console.log('Available repositories:');
    console.log(
      allRepos
        .map((r) => r.fullName)
        .join(', ')
        .substring(0, 100) + (allRepos.length > 20 ? '...' : '')
    );
    console.log('');
  }

  const { manualRepos } = await inquirer.prompt([
    {
      type: 'input',
      name: 'manualRepos',
      message: 'Repository names:',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Please enter at least one repository name';
        }

        const repos = input
          .split(',')
          .map((r) => r.trim())
          .filter((r) => r.length > 0);

        if (repos.length < minSelection) {
          return `Please enter at least ${minSelection} repository name(s)`;
        }

        if (maxSelection && repos.length > maxSelection) {
          return `Please enter at most ${maxSelection} repository name(s)`;
        }

        // Validate format (owner/repo)
        const invalidRepos = repos.filter((r) => !/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(r));
        if (invalidRepos.length > 0) {
          return `Invalid repository format: ${invalidRepos.join(', ')}. Use owner/repo format (e.g., octocat/Hello-World).`;
        }

        return true;
      },
    },
  ]);

  const selectedRepos = manualRepos
    .split(',')
    .map((r: string) => r.trim())
    .filter((r: string) => r.length > 0);

  // Warn about unknown repositories
  const knownRepos = allRepos.map((r) => r.fullName);
  const unknownRepos = selectedRepos.filter((r) => !knownRepos.includes(r));

  if (unknownRepos.length > 0) {
    console.log(`\n⚠️  Unknown repository names (will be used anyway): ${unknownRepos.join(', ')}`);
    console.log('   Make sure these repositories exist and you have access to them.\n');
  }

  console.log(`✅ Selected ${selectedRepos.length} repositories: ${selectedRepos.join(', ')}\n`);

  return {
    selectedRepos,
    method: 'manual',
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format repository choice for display
 */
function formatRepoChoice(repo: {owner: string, name: string, fullName: string}): string {
  return `${repo.fullName.padEnd(40)} (${repo.owner})`;
}

/**
 * Quick repo selector - select single repository
 */
export async function selectSingleGitHubRepo(
  message: string = 'Select GitHub repository:',
  owner?: string
): Promise<string> {
  const result = await selectGitHubRepos({
    allowManualEntry: true,
    allowSelectAll: false,
    minSelection: 1,
    maxSelection: 1,
    owner,
  });

  return result.selectedRepos[0];
}
