/**
 * Repository Bulk Discovery Helper
 *
 * Provides functionality to bulk-discover and filter GitHub repositories
 * during the SpecWeave init flow, optimizing repository configuration
 * for users with many repositories.
 *
 * Features:
 * - Bulk import all repos from owner/organization
 * - Pattern matching (starts-with, ends-with, contains)
 * - Regex matching (advanced filtering)
 * - Preview and confirmation before auto-populating configs
 */

import { Octokit } from '@octokit/rest';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { minimatch } from 'minimatch';

export interface DiscoveredRepo {
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  private: boolean;
  updated_at: string;
}

export interface BulkDiscoveryResult {
  repositories: DiscoveredRepo[];
  strategy: 'manual' | 'all-repos' | 'pattern' | 'regex';
  pattern?: string;
  source?: string; // 'personal' | 'org:name'
}

/**
 * Fetch all repositories from owner (user or organization)
 */
async function fetchAllRepositories(
  octokit: Octokit,
  owner: string,
  isOrg: boolean
): Promise<DiscoveredRepo[]> {
  const repos: DiscoveredRepo[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const { data } = isOrg
        ? await octokit.repos.listForOrg({
            org: owner,
            per_page: 100,
            page,
            type: 'all'
          })
        : await octokit.repos.listForAuthenticatedUser({
            affiliation: 'owner',
            per_page: 100,
            page
          });

      repos.push(
        ...data.map((repo: any) => ({
          name: repo.name,
          full_name: repo.full_name,
          owner: repo.owner.login,
          description: repo.description,
          private: repo.private,
          updated_at: repo.updated_at
        }))
      );

      hasMore = data.length === 100;
      page++;
    } catch (error) {
      console.error(
        chalk.yellow(
          `⚠️  Failed to fetch repositories:`,
          error instanceof Error ? error.message : String(error)
        )
      );
      hasMore = false;
    }
  }

  return repos;
}

/**
 * Filter repositories by pattern (starts-with, ends-with, contains, glob)
 */
function filterByPattern(repos: DiscoveredRepo[], pattern: string): DiscoveredRepo[] {
  const trimmedPattern = pattern.trim();

  // Detect pattern type
  if (trimmedPattern.startsWith('^') || trimmedPattern.includes('$')) {
    // Looks like regex, but we handle it separately
    return repos;
  }

  // Check for special pattern prefixes
  if (trimmedPattern.startsWith('starts:')) {
    const prefix = trimmedPattern.substring(7);
    return repos.filter(repo => repo.name.startsWith(prefix));
  }

  if (trimmedPattern.startsWith('ends:')) {
    const suffix = trimmedPattern.substring(5);
    return repos.filter(repo => repo.name.endsWith(suffix));
  }

  if (trimmedPattern.startsWith('contains:')) {
    const substring = trimmedPattern.substring(9);
    return repos.filter(repo => repo.name.includes(substring));
  }

  // Default: glob pattern matching (supports *, ?, [])
  return repos.filter(repo => minimatch(repo.name, trimmedPattern));
}

/**
 * Filter repositories by regex
 */
function filterByRegex(repos: DiscoveredRepo[], regexPattern: string): DiscoveredRepo[] {
  try {
    const regex = new RegExp(regexPattern);
    return repos.filter(repo => regex.test(repo.name));
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Show repository preview table with enhanced context
 */
function showRepositoryPreview(
  repos: DiscoveredRepo[],
  owner: string,
  strategy: string,
  pattern?: string,
  maxDisplay: number = 20
): void {
  console.log(chalk.cyan(`\n📋 Discovered Repositories from ${chalk.bold(owner)}:\n`));

  // Show discovery context
  if (strategy === 'pattern' && pattern) {
    console.log(chalk.gray(`   Strategy: Pattern matching`));
    console.log(chalk.gray(`   Pattern: ${pattern}`));
    console.log(chalk.gray(`   Matches: ${repos.length} repositories\n`));
  } else if (strategy === 'regex' && pattern) {
    console.log(chalk.gray(`   Strategy: Regex matching`));
    console.log(chalk.gray(`   Pattern: ${pattern}`));
    console.log(chalk.gray(`   Matches: ${repos.length} repositories\n`));
  } else if (strategy === 'all-repos') {
    console.log(chalk.gray(`   Strategy: All repositories`));
    console.log(chalk.gray(`   Found: ${repos.length} repositories\n`));
  }

  if (repos.length === 0) {
    console.log(chalk.yellow('   No repositories found matching criteria\n'));
    return;
  }

  const displayRepos = repos.slice(0, maxDisplay);

  displayRepos.forEach((repo, index) => {
    const number = `${index + 1}.`.padEnd(4);
    const visibility = repo.private ? chalk.red('🔒') : chalk.green('🌐');
    const name = chalk.white(repo.name);
    const desc = repo.description ? chalk.gray(` - ${repo.description.substring(0, 50)}`) : '';
    console.log(`   ${number} ${visibility} ${name}${desc}`);
  });

  if (repos.length > maxDisplay) {
    console.log(chalk.gray(`\n   ... and ${repos.length - maxDisplay} more repositories`));
  }

  console.log(chalk.green(`\n✅ Ready to configure! Next: Select which one is the parent.\n`));
}

/**
 * Main bulk discovery flow
 */
export async function discoverRepositories(
  octokit: Octokit,
  owner: string,
  isOrg: boolean,
  expectedCount: number
): Promise<BulkDiscoveryResult | null> {
  console.log(chalk.cyan('\n🚀 Repository Configuration Optimization\n'));
  console.log(chalk.gray('You can bulk-discover repositories instead of entering them one by one.\n'));

  // Step 1: Ask how to configure
  const { strategy } = await inquirer.prompt<{ strategy: BulkDiscoveryResult['strategy'] }>([
    {
      type: 'list',
      name: 'strategy',
      message: 'How do you want to configure these repositories?',
      choices: [
        {
          name: `${chalk.bold('Manual entry')} - Enter each repository one by one ${chalk.gray('(current behavior)')}`,
          value: 'manual'
        },
        {
          name: `${chalk.bold('Bulk import')} - Discover all repositories from ${owner} ${chalk.gray('(automatic)')}`,
          value: 'all-repos'
        },
        {
          name: `${chalk.bold('Pattern matching')} - Filter by pattern (starts-with, ends-with, contains, glob) ${chalk.gray('(e.g., "sw-*")')}`,
          value: 'pattern'
        },
        {
          name: `${chalk.bold('Regex matching')} - Advanced filtering with regular expressions ${chalk.gray('(e.g., "^ec-.*-api$")')}`,
          value: 'regex'
        }
      ],
      default: 'manual'
    }
  ]);

  // If manual, return early
  if (strategy === 'manual') {
    return { repositories: [], strategy: 'manual' };
  }

  // Step 2: Fetch all repositories
  console.log(chalk.gray(`\n⏳ Fetching repositories from ${owner}...\n`));
  const allRepos = await fetchAllRepositories(octokit, owner, isOrg);

  if (allRepos.length === 0) {
    console.log(chalk.yellow(`⚠️  No repositories found for ${owner}\n`));
    return null;
  }

  console.log(chalk.green(`✓ Found ${allRepos.length} repositories\n`));

  let filteredRepos = allRepos;
  let pattern: string | undefined;

  // Step 3: Apply filtering based on strategy
  if (strategy === 'pattern') {
    console.log(chalk.cyan('📝 Pattern Matching Options:\n'));
    console.log(chalk.gray('   • starts:PREFIX    - Repositories starting with PREFIX'));
    console.log(chalk.gray('   • ends:SUFFIX      - Repositories ending with SUFFIX'));
    console.log(chalk.gray('   • contains:TEXT    - Repositories containing TEXT'));
    console.log(chalk.gray('   • sw-*             - Glob pattern (supports *, ?, [])'));
    console.log(chalk.gray('   • *-api            - Glob pattern\n'));

    const { patternInput } = await inquirer.prompt<{ patternInput: string }>([
      {
        type: 'input',
        name: 'patternInput',
        message: 'Enter pattern:',
        default: `starts:${owner.split('-')[0] || 'my'}-`,
        validate: (input: string) => (input.trim() ? true : 'Pattern is required')
      }
    ]);

    pattern = patternInput.trim();
    filteredRepos = filterByPattern(allRepos, pattern);
  } else if (strategy === 'regex') {
    console.log(chalk.cyan('🔧 Regex Matching:\n'));
    console.log(chalk.gray('   • ^sw-.*$          - Starts with "sw-"'));
    console.log(chalk.gray('   • .*-api$          - Ends with "-api"'));
    console.log(chalk.gray('   • ^ec-\\w+-service$ - Matches "ec-NAME-service"\n'));

    const { regexInput } = await inquirer.prompt<{ regexInput: string }>([
      {
        type: 'input',
        name: 'regexInput',
        message: 'Enter regex pattern:',
        default: `^${owner.split('-')[0] || 'my'}-.*`,
        validate: (input: string) => {
          if (!input.trim()) return 'Regex pattern is required';
          try {
            new RegExp(input.trim());
            return true;
          } catch (error) {
            return `Invalid regex: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      }
    ]);

    pattern = regexInput.trim();
    try {
      filteredRepos = filterByRegex(allRepos, pattern);
    } catch (error) {
      console.log(chalk.red(`\n❌ ${error instanceof Error ? error.message : String(error)}\n`));
      return null;
    }
  }

  // Step 4: Show preview
  showRepositoryPreview(filteredRepos, owner, strategy, pattern);

  // Step 5: Validate count
  if (filteredRepos.length === 0) {
    console.log(chalk.yellow('⚠️  No repositories match the criteria. Please try again.\n'));
    return null;
  }

  if (filteredRepos.length !== expectedCount) {
    console.log(chalk.yellow(`⚠️  Found ${filteredRepos.length} repositories, but you specified ${expectedCount}`));

    const { proceed } = await inquirer.prompt<{ proceed: 'use-discovered' | 'adjust-count' | 'manual' }>([
      {
        type: 'list',
        name: 'proceed',
        message: 'What would you like to do?',
        choices: [
          {
            name: `Use discovered ${filteredRepos.length} repositories (update count)`,
            value: 'use-discovered'
          },
          {
            name: `Go back and adjust the pattern`,
            value: 'adjust-count'
          },
          {
            name: `Switch to manual entry`,
            value: 'manual'
          }
        ]
      }
    ]);

    if (proceed === 'adjust-count') {
      return null; // Return null to trigger retry
    }

    if (proceed === 'manual') {
      return { repositories: [], strategy: 'manual' };
    }

    // proceed === 'use-discovered' - continue with discovered repos
  }

  // Step 6: Confirm
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Use these ${filteredRepos.length} repositories?`,
      default: true
    }
  ]);

  if (!confirm) {
    console.log(chalk.gray('\n✓ Repository discovery cancelled. Switching to manual entry.\n'));
    return { repositories: [], strategy: 'manual' };
  }

  console.log(chalk.green(`\n✅ Discovered ${filteredRepos.length} repositories\n`));

  return {
    repositories: filteredRepos,
    strategy,
    pattern,
    source: isOrg ? `org:${owner}` : 'personal'
  };
}
