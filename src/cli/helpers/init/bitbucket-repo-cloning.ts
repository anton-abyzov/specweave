/**
 * Bitbucket Repository Cloning
 *
 * Handles fetching and cloning Bitbucket repositories during init.
 * Cloning runs in background (non-blocking) via job manager.
 *
 * Provides parity with ADO multi-repo cloning:
 * - Fetches repos from Bitbucket workspace via API v2.0
 * - Filters by user-selected pattern (all/glob/regex)
 * - Creates background clone jobs
 * - Tracks progress via /sw:jobs
 *
 * @module cli/helpers/init/bitbucket-repo-cloning
 */

import chalk from 'chalk';
import { filterRepositoriesByPattern, type ClonePatternResult } from '../selection-strategy.js';
import { launchCloneJob } from '../../../core/background/job-launcher.js';
import { REPO_FETCH_LIMITS } from './types.js';

/**
 * Bitbucket repository selection (from init flow)
 */
export interface BitbucketRepoSelection {
  /** Bitbucket workspace slug */
  workspace: string;
  /** Bitbucket username */
  username: string;
  /** Bitbucket App Password */
  appPassword: string;
}

/**
 * Repository info from Bitbucket API v2.0
 */
interface BitbucketRepository {
  uuid: string;
  name: string;
  slug: string;
  full_name: string;
  links: {
    clone: Array<{
      name: string;
      href: string;
    }>;
    html: {
      href: string;
    };
  };
}

/**
 * Bitbucket API paginated response
 */
interface BitbucketPagedResponse {
  values: BitbucketRepository[];
  page: number;
  pagelen: number;
  size: number;
  next?: string;
}

/**
 * Fetch result with repos and metadata
 */
interface FetchResult {
  repos: BitbucketRepository[];
  partial: boolean;
  error?: string;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch repositories from Bitbucket workspace with pagination
 *
 * Uses Bitbucket API v2.0:
 * https://api.bitbucket.org/2.0/repositories/{workspace}
 *
 * @param workspace - Bitbucket workspace slug
 * @param username - Bitbucket username
 * @param appPassword - Bitbucket App Password
 * @param maxRepos - Maximum repos to fetch (default 1000, configurable via REPO_FETCH_LIMITS)
 * @returns Fetch result with repos and metadata
 */
async function fetchBitbucketRepos(
  workspace: string,
  username: string,
  appPassword: string,
  maxRepos: number = REPO_FETCH_LIMITS.DEFAULT_MAX_REPOS
): Promise<FetchResult> {
  const repos: BitbucketRepository[] = [];
  let nextUrl: string | undefined = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}?pagelen=${REPO_FETCH_LIMITS.API_PER_PAGE}`;
  let partial = false;

  // Create Basic Auth header
  const authToken = Buffer.from(`${username}:${appPassword}`).toString('base64');

  console.log(chalk.gray(`   Fetching repositories from workspace ${workspace}...`));

  while (nextUrl && repos.length < maxRepos) {
    // Retry logic with exponential backoff
    let retries = 0;
    const maxRetries = 3;
    let response: Response | undefined;

    while (retries < maxRetries) {
      try {
        response = await fetch(nextUrl, {
          headers: {
            'Authorization': `Basic ${authToken}`,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          break; // Success, exit retry loop
        }

        // Handle rate limit (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const backoffMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : Math.pow(2, retries + 1) * 1000;
          console.log(chalk.yellow(`   ⚠️ Rate limit hit, retrying in ${backoffMs / 1000}s (attempt ${retries + 1}/${maxRetries})`));
          await sleep(backoffMs);
          retries++;
          continue;
        }

        // Handle 401 (invalid credentials)
        if (response.status === 401) {
          return {
            repos: [],
            partial: false,
            error: 'Invalid Bitbucket credentials. Please check your username and app password.'
          };
        }

        // Handle 403 (forbidden)
        if (response.status === 403) {
          return {
            repos: [],
            partial: false,
            error: 'Access denied. Please check your app password has repository:read permission.'
          };
        }

        // Handle 404 (workspace not found)
        if (response.status === 404) {
          return {
            repos: [],
            partial: false,
            error: `Workspace "${workspace}" not found on Bitbucket.`
          };
        }

        // Other error - don't retry
        break;
      } catch (networkError) {
        retries++;
        if (retries >= maxRetries) {
          return {
            repos,
            partial: repos.length > 0,
            error: `Network error after ${maxRetries} retries: ${networkError instanceof Error ? networkError.message : 'Unknown error'}`
          };
        }
        const backoffMs = Math.pow(2, retries) * 1000;
        console.log(chalk.yellow(`   ⚠️ Network error, retrying in ${backoffMs / 1000}s (attempt ${retries}/${maxRetries})`));
        await sleep(backoffMs);
      }
    }

    // Check if we exhausted retries without success
    if (!response || !response.ok) {
      if (repos.length > 0) {
        // Continue with partial results
        console.log(chalk.yellow(`   ⚠️ API error, continuing with ${repos.length} repos fetched`));
        partial = true;
        break;
      }
      return {
        repos: [],
        partial: false,
        error: `Bitbucket API error: ${response?.status || 'No response'}`
      };
    }

    const data: BitbucketPagedResponse = await response.json();

    // Empty values array means no more repos
    if (!data.values || data.values.length === 0) {
      break;
    }

    repos.push(...data.values);

    // Show progress for large workspaces
    if (repos.length >= 100 && repos.length % 100 === 0) {
      console.log(chalk.gray(`   Fetched ${repos.length} repos...`));
    }

    // Get next page URL if available
    nextUrl = data.next;
  }

  return {
    repos,
    partial
  };
}

/**
 * Build HTTPS clone URL with app password authentication
 *
 * @param workspace - Bitbucket workspace slug
 * @param repo - Repository slug
 * @param username - Bitbucket username
 * @param appPassword - Bitbucket App Password
 * @returns Clone URL with embedded authentication
 */
function buildBitbucketCloneUrl(
  workspace: string,
  repo: string,
  username: string,
  appPassword: string
): string {
  // Format: https://{username}:{appPassword}@bitbucket.org/{workspace}/{repo}.git
  // URL-encode to handle special characters in credentials
  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(appPassword);
  const encodedWorkspace = encodeURIComponent(workspace);
  const encodedRepo = encodeURIComponent(repo);
  return `https://${encodedUsername}:${encodedPassword}@bitbucket.org/${encodedWorkspace}/${encodedRepo}.git`;
}

/**
 * Trigger Bitbucket repository cloning during init
 *
 * This function:
 * 1. Fetches repository list from Bitbucket workspace
 * 2. Filters repositories by clone pattern (glob/regex)
 * 3. Creates a background job for cloning
 * 4. Starts cloning asynchronously (non-blocking)
 *
 * @param projectPath - Target directory for cloning
 * @param bitbucketRepoSelection - Bitbucket workspace and credentials
 * @param clonePattern - Clone pattern configuration
 * @returns Job ID for dependency tracking, or undefined if skipped/failed
 */
export async function triggerBitbucketRepoCloning(
  projectPath: string,
  bitbucketRepoSelection: BitbucketRepoSelection,
  clonePattern: ClonePatternResult
): Promise<string | undefined> {
  // Skip if user chose to skip cloning
  if (clonePattern.strategy === 'skip') {
    console.log(chalk.gray('\n   Skipping repository cloning (can configure later with /specweave-bitbucket:clone-repos)\n'));
    return undefined;
  }

  const { workspace, username, appPassword } = bitbucketRepoSelection;

  if (!workspace) {
    console.log(chalk.yellow('\n   No Bitbucket workspace specified for cloning.\n'));
    return undefined;
  }

  if (!username || !appPassword) {
    console.log(chalk.yellow('\n   No Bitbucket credentials provided. Cannot clone repositories.\n'));
    return undefined;
  }

  // Security warning about credential visibility
  console.log(chalk.yellow('\n   ⚠️ Note: Credentials will be visible in process list during clone (Git limitation)'));
  console.log(chalk.gray('   💡 Tip: Use App Password with minimal scope (repository:read) for cloning\n'));

  console.log(chalk.blue('\n📦 Fetching Bitbucket Repositories\n'));

  // Fetch repos from Bitbucket API
  const fetchResult = await fetchBitbucketRepos(workspace, username, appPassword);

  if (fetchResult.error) {
    console.log(chalk.red(`   ❌ ${fetchResult.error}\n`));
    return undefined;
  }

  if (fetchResult.partial) {
    console.log(chalk.yellow(`   ⚠️ Partial fetch: Got ${fetchResult.repos.length} repos before limit\n`));
  }

  const allRepos = fetchResult.repos;

  if (allRepos.length === 0) {
    console.log(chalk.yellow('\n   No repositories found in workspace.\n'));
    return undefined;
  }

  console.log(chalk.green(`   ✓ Found ${allRepos.length} repositories in ${workspace}`));

  // Filter by pattern - use 'slug' field for Bitbucket (consistent repo identifier)
  // Map to expected format for filterRepositoriesByPattern
  const reposWithName = allRepos.map(r => ({ ...r, name: r.slug }));
  const filteredRepos = filterRepositoriesByPattern(reposWithName, clonePattern);

  if (filteredRepos.length === 0) {
    const patternDesc = clonePattern.pattern ? ` matching "${clonePattern.pattern}"` : '';
    console.log(chalk.yellow(`\n   No repositories${patternDesc} to clone.\n`));
    return undefined;
  }

  console.log(chalk.blue(`\n🔄 Starting background clone for ${filteredRepos.length} repositories...\n`));

  // Show repos to be cloned
  const previewCount = Math.min(filteredRepos.length, 10);
  for (let i = 0; i < previewCount; i++) {
    console.log(chalk.gray(`   📁 ${filteredRepos[i].slug}`));
  }
  if (filteredRepos.length > 10) {
    console.log(chalk.gray(`   ... and ${filteredRepos.length - 10} more`));
  }
  console.log('');

  // Prepare repositories with clone URLs
  const reposWithUrls = filteredRepos.map(r => ({
    owner: workspace,
    name: r.slug,
    path: r.slug, // Clone directly into project path
    cloneUrl: buildBitbucketCloneUrl(workspace, r.slug, username, appPassword)
  }));

  // Launch background clone job
  const result = await launchCloneJob({
    projectPath,
    repositories: reposWithUrls
  });

  // Show progress info
  console.log(chalk.gray(`   Repositories will be cloned to: ${projectPath}/`));
  console.log(chalk.gray(`   Job ID: ${result.job.id}`));

  if (result.isBackground) {
    console.log(chalk.green(`   ✓ Clone job started in background (PID: ${result.pid})`));
    console.log(chalk.cyan('\n   Check progress: /sw:jobs'));
    console.log(chalk.cyan(`   Kill if needed: /sw:jobs --kill ${result.job.id}`));
    console.log(chalk.gray('\n   Init will continue - cloning runs independently.\n'));
  } else {
    console.log(chalk.yellow('   ⚠️ Running in foreground (clone worker not found)'));
    console.log(chalk.gray('   Init will block until cloning completes.\n'));
  }

  // Return job ID for dependency tracking
  return result.job.id;
}
