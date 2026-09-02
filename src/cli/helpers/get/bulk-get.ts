/**
 * Bulk Get Helpers for `specweave get`
 *
 * Wires fetchGitHubRepos + matchByGlob + launchCloneJob into a bulk clone path.
 */

import { fetchGitHubRepos } from '../init/github-repo-cloning.js';
import { matchByGlob } from '../selection-strategy.js';
import { REPO_FETCH_LIMITS } from '../init/types.js';
import { resolveGitHubToken } from '../../../utils/auth-helpers.js';

export interface BulkSource {
  org: string;
  /** null = all repos in org, string = glob pattern to filter by */
  pattern: string | null;
}

export interface BulkRepoEntry {
  owner: string;
  name: string;
  /** Relative path within umbrella: repositories/{owner}/{name} */
  path: string;
  cloneUrl: string;
}

export interface BuildBulkOptions {
  noArchived?: boolean;
  noForks?: boolean;
  limit?: number;
}

/**
 * Parse source into org + optional glob pattern.
 * Returns null if source should be handled by the single-repo path.
 */
export function parseBulkSource(
  source: string,
  options: { all?: boolean; pattern?: string },
): BulkSource | null {
  const trimmed = source.trim();

  // Skip local paths and full URLs — not bulk targets
  if (
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('~') ||
    trimmed.startsWith('http') ||
    trimmed.startsWith('git@')
  ) {
    return null;
  }

  const slashIdx = trimmed.indexOf('/');

  if (slashIdx === -1) {
    // Bare org name — only bulk if --all is set
    if (!options.all) return null;
    return { org: trimmed, pattern: options.pattern ?? null };
  }

  const org = trimmed.slice(0, slashIdx);
  const repoOrPattern = trimmed.slice(slashIdx + 1);

  // Contains glob chars → bulk mode
  if (repoOrPattern.includes('*') || repoOrPattern.includes('?')) {
    const pattern = repoOrPattern === '*' ? null : repoOrPattern;
    return { org, pattern };
  }

  // --all flag with org/something form — treat something as pattern override
  if (options.all) {
    return { org, pattern: options.pattern ?? repoOrPattern };
  }

  return null;
}

/**
 * Resolve the GitHub auth token through the single resolver
 * (config → process.env → .env → gh CLI).
 */
export async function getAuthToken(projectRoot: string = process.cwd()): Promise<string> {
  const auth = resolveGitHubToken(projectRoot);
  if (auth.token) return auth.token;

  throw new Error(
    'GitHub auth required for bulk clone.\n' +
    'Fix: run `gh auth login` or set the GITHUB_TOKEN environment variable.',
  );
}

/**
 * Fetch repos from a GitHub org, apply pattern + filters, and return
 * the CloneLaunchOptions.repositories array ready for launchCloneJob().
 */
export async function buildBulkRepoList(
  org: string,
  token: string,
  pattern: string | null,
  options: BuildBulkOptions,
): Promise<BulkRepoEntry[]> {
  const limit = options.limit ?? REPO_FETCH_LIMITS.DEFAULT_MAX_REPOS;
  const fetchResult = await fetchGitHubRepos(org, token, limit);

  if (fetchResult.error) {
    throw new Error(fetchResult.error);
  }

  let repos = fetchResult.repos;

  // Apply pre-filter on archived/forks before pattern matching
  if (options.noArchived) repos = repos.filter(r => !r.archived);
  if (options.noForks) repos = repos.filter(r => !r.fork);

  // Apply glob pattern
  if (pattern !== null) {
    const matched = matchByGlob(
      repos.map(r => ({ name: r.name, value: r.name })),
      pattern,
      'name',
    );
    const matchedNames = new Set(matched.map(m => m.name));
    repos = repos.filter(r => matchedNames.has(r.name));
  }

  return repos.map(r => ({
    owner: r.owner.login,
    name: r.name,
    path: `repositories/${r.owner.login}/${r.name}`,
    cloneUrl: r.clone_url,
  }));
}
