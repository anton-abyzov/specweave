/**
 * GitHub Repository Cloning
 *
 * Handles fetching and cloning GitHub repositories during init.
 * Cloning runs in background (non-blocking) via job manager.
 *
 * Provides parity with ADO multi-repo cloning:
 * - Fetches repos from GitHub org via API
 * - Filters by user-selected pattern (all/glob/regex)
 * - Creates background clone jobs
 * - Tracks progress via /sw:jobs
 *
 * @module cli/helpers/init/github-repo-cloning
 */

import chalk from 'chalk';
import { filterRepositoriesByPattern, type ClonePatternResult } from '../selection-strategy.js';
import { launchCloneJob } from '../../../core/background/job-launcher.js';
import { REPO_FETCH_LIMITS } from './types.js';

/**
 * GitHub repository selection (from init flow)
 */
export interface GitHubRepoSelection {
  /** GitHub organization or owner */
  org: string;
  /** Personal Access Token */
  pat: string;
}

/**
 * Repository info from GitHub API
 *
 * @see https://docs.github.com/en/rest/repos/repos#list-repositories-for-the-authenticated-user
 */
interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  clone_url: string;
  html_url: string;
  owner: {
    login: string;
  };
  /** Whether the repository is archived (read-only, may be stale) */
  archived: boolean;
  /** Whether the repository is a fork of another repo */
  fork: boolean;
  /** Whether the repository is private */
  private: boolean;
  /** Visibility: public, private, or internal (GitHub Enterprise) */
  visibility?: string;
}

/**
 * Rate limit info from GitHub API headers
 */
interface RateLimitInfo {
  remaining: number;
  limit: number;
  reset: Date;
}

/**
 * Fetch result with repos and rate limit info
 */
interface FetchResult {
  repos: GitHubRepository[];
  rateLimit?: RateLimitInfo;
  partial: boolean;
  error?: string;
}

/**
 * Parse rate limit headers from GitHub API response
 */
function parseRateLimitHeaders(headers: Headers): RateLimitInfo | undefined {
  const remaining = headers.get('x-ratelimit-remaining');
  const limit = headers.get('x-ratelimit-limit');
  const reset = headers.get('x-ratelimit-reset');

  if (remaining && limit && reset) {
    return {
      remaining: parseInt(remaining, 10),
      limit: parseInt(limit, 10),
      reset: new Date(parseInt(reset, 10) * 1000)
    };
  }

  return undefined;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch repositories from GitHub organization with pagination and rate limit handling
 *
 * @param org - GitHub organization or owner
 * @param pat - Personal Access Token
 * @param maxRepos - Maximum repos to fetch (default 1000, configurable via REPO_FETCH_LIMITS)
 * @returns Fetch result with repos and metadata
 */
async function fetchGitHubRepos(
  org: string,
  pat: string,
  maxRepos: number = REPO_FETCH_LIMITS.DEFAULT_MAX_REPOS
): Promise<FetchResult> {
  const repos: GitHubRepository[] = [];
  let page = 1;
  const perPage = REPO_FETCH_LIMITS.API_PER_PAGE;
  let rateLimit: RateLimitInfo | undefined;
  let partial = false;

  console.log(chalk.gray(`   Fetching repositories from ${org}...`));

  while (repos.length < maxRepos) {
    // Retry logic with exponential backoff
    let retries = 0;
    const maxRetries = 3;
    let response: Response | undefined;

    while (retries < maxRetries) {
      try {
        response = await fetch(
          `https://api.github.com/orgs/${encodeURIComponent(org)}/repos?per_page=${perPage}&page=${page}`,
          {
            headers: {
              'Authorization': `Bearer ${pat}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28'
            }
          }
        );

        // Parse rate limit from every response
        rateLimit = parseRateLimitHeaders(response.headers);

        // Warn if rate limit is low
        if (rateLimit && rateLimit.remaining < 100) {
          console.log(chalk.yellow(`   ⚠️ GitHub API rate limit low: ${rateLimit.remaining}/${rateLimit.limit} remaining`));
        }

        if (response.ok) {
          break; // Success, exit retry loop
        }

        // Handle rate limit (403)
        if (response.status === 403) {
          const errorBody = await response.text();
          if (errorBody.includes('rate limit') || errorBody.includes('secondary rate limit')) {
            const backoffMs = Math.pow(2, retries + 1) * 1000; // 2s, 4s, 8s
            console.log(chalk.yellow(`   ⚠️ Rate limit hit, retrying in ${backoffMs / 1000}s (attempt ${retries + 1}/${maxRetries})`));
            await sleep(backoffMs);
            retries++;
            continue;
          }
          // Other 403 error - not rate limit
          break;
        }

        // Handle 401 (invalid PAT)
        if (response.status === 401) {
          return {
            repos: [],
            rateLimit,
            partial: false,
            error: 'Invalid GitHub PAT. Please check your token has repo:read access.'
          };
        }

        // Handle 404 (org not found) - try user repos instead
        if (response.status === 404) {
          // CRITICAL: Use /user/repos (singular) to get authenticated user's private + public repos
          // /users/{username}/repos only returns public repos even with authentication!
          const userResponse = await fetch(
            `https://api.github.com/user/repos?per_page=${perPage}&page=${page}`,
            {
              headers: {
                'Authorization': `Bearer ${pat}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
              }
            }
          );

          if (userResponse.ok) {
            response = userResponse;
            break;
          }

          return {
            repos: [],
            rateLimit,
            partial: false,
            error: `Organization or user "${org}" not found on GitHub.`
          };
        }

        // Other error - don't retry
        break;
      } catch (networkError) {
        retries++;
        if (retries >= maxRetries) {
          return {
            repos,
            rateLimit,
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
        console.log(chalk.yellow(`   ⚠️ Rate limit reached, continuing with ${repos.length} repos fetched`));
        partial = true;
        break;
      }
      return {
        repos: [],
        rateLimit,
        partial: false,
        error: `GitHub API error: ${response?.status || 'No response'}`
      };
    }

    const batch: GitHubRepository[] = await response.json();

    // Empty batch means no more repos
    if (batch.length === 0) {
      break;
    }

    // CRITICAL FIX (v1.0.12): Filter repos to only include those owned by the target org/user
    // The /user/repos endpoint returns ALL repos the user has access to, including repos from
    // other organizations. We must filter to only include repos owned by the target org.
    // See: https://docs.github.com/en/rest/repos/repos#list-repositories-for-the-authenticated-user
    //
    // CRITICAL FIX (v1.0.14): Also exclude archived and forked repos
    // - Archived repos: Read-only, often stale/deleted on web but still in API
    // - Forked repos: User forks that may no longer exist upstream
    // These "ghost" repos cause confusion in parent repo selection (e.g., ec-typescript)
    const validRepos = batch.filter(repo => {
      // Must be owned by the target org/user
      if (repo.owner.login.toLowerCase() !== org.toLowerCase()) {
        return false;
      }
      // Exclude archived repos (read-only, often stale)
      if (repo.archived) {
        return false;
      }
      // Exclude forked repos (user forks, may not be "real" org repos)
      if (repo.fork) {
        return false;
      }
      return true;
    });

    repos.push(...validRepos);

    // Show progress for large orgs
    if (repos.length >= 100 && repos.length % 100 === 0) {
      console.log(chalk.gray(`   Fetched ${repos.length} repos...`));
    }

    // Last page if we got fewer than perPage
    if (batch.length < perPage) {
      break;
    }

    page++;
  }

  return {
    repos,
    rateLimit,
    partial
  };
}

/**
 * Result of GitHub repo cloning trigger
 */
export interface GitHubCloningResult {
  /** Job ID for tracking background clone */
  jobId?: string;
  /** List of repo names being cloned (for 1:1 project mapping) */
  clonedRepos: string[];
}

/**
 * Build HTTPS clone URL with PAT authentication
 *
 * @param owner - Repository owner (org or user)
 * @param repo - Repository name
 * @param pat - Personal Access Token
 * @returns Clone URL with embedded authentication
 */
function buildGitHubHttpsCloneUrl(owner: string, repo: string, pat: string): string {
  // Format: https://{pat}@github.com/{owner}/{repo}.git
  // URL-encode to handle special characters
  const encodedOwner = encodeURIComponent(owner);
  const encodedRepo = encodeURIComponent(repo);
  return `https://${pat}@github.com/${encodedOwner}/${encodedRepo}.git`;
}

/**
 * Build SSH clone URL
 *
 * @param owner - Repository owner (org or user)
 * @param repo - Repository name
 * @returns SSH clone URL (requires SSH key configured)
 */
function buildGitHubSshCloneUrl(owner: string, repo: string): string {
  // Format: git@github.com:{owner}/{repo}.git
  return `git@github.com:${owner}/${repo}.git`;
}

/**
 * Build clone URL based on user's URL format preference
 *
 * @param owner - Repository owner (org or user)
 * @param repo - Repository name
 * @param pat - Personal Access Token (only used for HTTPS)
 * @param gitUrlFormat - User's preference: 'ssh' or 'https'
 * @returns Clone URL in the requested format
 */
function buildGitHubCloneUrl(
  owner: string,
  repo: string,
  pat: string,
  gitUrlFormat: 'ssh' | 'https' = 'https'
): string {
  if (gitUrlFormat === 'ssh') {
    return buildGitHubSshCloneUrl(owner, repo);
  }
  return buildGitHubHttpsCloneUrl(owner, repo, pat);
}

/**
 * Trigger GitHub repository cloning during init
 *
 * This function:
 * 1. Fetches repository list from GitHub organization
 * 2. Filters repositories by clone pattern (glob/regex)
 * 3. Creates a background job for cloning
 * 4. Starts cloning asynchronously (non-blocking)
 *
 * @param projectPath - Target directory for cloning
 * @param githubRepoSelection - GitHub org and PAT
 * @param clonePattern - Clone pattern configuration
 * @param gitUrlFormat - Git URL format preference ('ssh' or 'https') - v1.0.10+
 * @returns Cloning result with job ID and list of repos being cloned (v1.0.9)
 */
export async function triggerGitHubRepoCloning(
  projectPath: string,
  githubRepoSelection: GitHubRepoSelection,
  clonePattern: ClonePatternResult,
  gitUrlFormat: 'ssh' | 'https' = 'https'
): Promise<GitHubCloningResult> {
  // Skip if user chose to skip cloning
  if (clonePattern.strategy === 'skip') {
    console.log(chalk.gray('\n   Skipping repository cloning (can configure later with /specweave-github:clone-repos)\n'));
    return { clonedRepos: [] };
  }

  const { org, pat } = githubRepoSelection;

  if (!org) {
    console.log(chalk.yellow('\n   No GitHub organization specified for cloning.\n'));
    return { clonedRepos: [] };
  }

  if (!pat) {
    console.log(chalk.yellow('\n   No GitHub PAT provided. Cannot clone repositories.\n'));
    return { clonedRepos: [] };
  }

  // Security warning based on URL format
  if (gitUrlFormat === 'ssh') {
    console.log(chalk.green('\n   ✓ Using SSH for cloning (secure, no PAT exposed in process list)'));
    console.log(chalk.gray('   💡 Make sure your SSH key is configured: ssh -T git@github.com\n'));
  } else {
    console.log(chalk.yellow('\n   ⚠️ Note: PAT will be visible in process list during clone (Git limitation)'));
    console.log(chalk.gray('   💡 Tip: Use PAT with minimal scope (repo:read) for cloning\n'));
  }

  console.log(chalk.blue('\n📦 Fetching GitHub Repositories\n'));

  // Fetch repos from GitHub API
  const fetchResult = await fetchGitHubRepos(org, pat);

  if (fetchResult.error) {
    console.log(chalk.red(`   ❌ ${fetchResult.error}\n`));
    return { clonedRepos: [] };
  }

  if (fetchResult.partial) {
    console.log(chalk.yellow(`   ⚠️ Partial fetch: Got ${fetchResult.repos.length} repos before rate limit\n`));
  }

  const allRepos = fetchResult.repos;

  if (allRepos.length === 0) {
    console.log(chalk.yellow('\n   No repositories found in organization.\n'));
    return { clonedRepos: [] };
  }

  console.log(chalk.green(`   ✓ Found ${allRepos.length} repositories in ${org}`));

  // Filter by pattern
  const filteredRepos = filterRepositoriesByPattern(allRepos, clonePattern);

  if (filteredRepos.length === 0) {
    const patternDesc = clonePattern.pattern ? ` matching "${clonePattern.pattern}"` : '';
    console.log(chalk.yellow(`\n   No repositories${patternDesc} to clone.\n`));
    return { clonedRepos: [] };
  }

  console.log(chalk.blue(`\n🔄 Starting background clone for ${filteredRepos.length} repositories...\n`));

  // Show repos to be cloned
  const previewCount = Math.min(filteredRepos.length, 10);
  for (let i = 0; i < previewCount; i++) {
    console.log(chalk.gray(`   📁 ${filteredRepos[i].name}`));
  }
  if (filteredRepos.length > 10) {
    console.log(chalk.gray(`   ... and ${filteredRepos.length - 10} more`));
  }
  console.log('');

  // Prepare repositories with clone URLs (v1.0.10: respects gitUrlFormat)
  // v1.0.12: Use actual owner from repo object instead of user-provided org
  // This ensures we use the correct owner even if filtering missed something
  const reposWithUrls = filteredRepos.map(r => ({
    owner: r.owner.login,
    name: r.name,
    path: r.name, // Clone directly into project path
    cloneUrl: buildGitHubCloneUrl(r.owner.login, r.name, pat, gitUrlFormat)
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

  // Return job ID and list of cloned repos (v1.0.9)
  // Repo names are used for 1:1 project mapping in issue tracker setup
  return {
    jobId: result.job.id,
    clonedRepos: filteredRepos.map(r => r.name)
  };
}
