/**
 * GitHub Pull Sync — GitHub Issues → Spec
 *
 * Fetches GitHub issue state and compares with spec acceptance criteria
 * to detect changes, conflicts, and apply updates.
 *
 * @module github-pull-sync
 */

import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import { parseIssueBody } from './github-issue-body-parser.js';
import type { GitHubUserStoryLink } from '../../../src/core/types/sync-profile.js';

export interface PullSyncOptions {
  owner: string;
  repo: string;
  token?: string;
  dryRun?: boolean;
}

export interface PullSyncChange {
  userStoryId: string;
  field: string;
  specValue: string;
  githubValue: string;
  applied: boolean;
}

export interface PullSyncConflict {
  userStoryId: string;
  field: string;
  specValue: string;
  githubValue: string;
}

export interface PullSyncResult {
  changes: PullSyncChange[];
  conflicts: PullSyncConflict[];
  errors: Array<{ userStoryId: string; error: string }>;
}

/**
 * Pull sync from GitHub — fetch issue state and compare with spec ACs.
 *
 * For each linked user story:
 * 1. Fetch issue via `gh issue view`
 * 2. Parse body to extract AC checkbox states
 * 3. Compare with spec AC states
 * 4. Report changes and conflicts
 */
export async function pullSyncFromGitHub(
  userStoryLinks: Record<string, GitHubUserStoryLink>,
  specAcceptanceCriteria: Record<string, Array<{ id: string; completed: boolean }>>,
  options: PullSyncOptions,
): Promise<PullSyncResult> {
  const result: PullSyncResult = { changes: [], conflicts: [], errors: [] };

  const entries = Object.entries(userStoryLinks);
  if (entries.length === 0) {
    return result;
  }

  const env = getEnv(options.token);
  const repoSlug = `${options.owner}/${options.repo}`;

  for (const [usId, link] of entries) {
    try {
      const issueData = await fetchIssue(link.issueNumber, repoSlug, env);
      const parsed = parseIssueBody(issueData.body || '');
      const specACs = specAcceptanceCriteria[usId] || [];

      // Compare AC checkbox states
      compareACStates(usId, specACs, parsed.acceptanceCriteria, options.dryRun ?? false, result);

      // Compare issue state (open/closed)
      compareIssueState(usId, issueData.state, specACs, result, options.dryRun ?? false);
    } catch (err) {
      result.errors.push({
        userStoryId: usId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}

function compareACStates(
  usId: string,
  specACs: Array<{ id: string; completed: boolean }>,
  githubACs: Record<string, { checked: boolean; description: string }>,
  dryRun: boolean,
  result: PullSyncResult,
): void {
  for (const specAC of specACs) {
    const ghAC = githubACs[specAC.id];
    if (!ghAC) continue;

    const specValue = String(specAC.completed);
    const githubValue = String(ghAC.checked);

    if (specValue !== githubValue) {
      // Both changed from a baseline? That's a conflict.
      // Simple heuristic: if spec says true and GitHub says false, it's a conflict
      // (someone completed on spec side, but GitHub unchecked it)
      if (specAC.completed && !ghAC.checked) {
        result.conflicts.push({
          userStoryId: usId,
          field: specAC.id,
          specValue,
          githubValue,
        });
      } else {
        // GitHub is ahead — record as a change
        result.changes.push({
          userStoryId: usId,
          field: specAC.id,
          specValue,
          githubValue,
          applied: !dryRun,
        });
      }
    }
  }
}

function compareIssueState(
  usId: string,
  githubState: string,
  specACs: Array<{ id: string; completed: boolean }>,
  result: PullSyncResult,
  dryRun: boolean,
): void {
  // Normalize GitHub state
  const normalizedState = githubState.toLowerCase() === 'closed' ? 'closed' : 'open';

  // Check if spec is effectively "complete" (all ACs done) or "open"
  const allDone = specACs.length > 0 && specACs.every(ac => ac.completed);
  const specState = allDone ? 'closed' : 'open';

  if (specState !== normalizedState) {
    result.changes.push({
      userStoryId: usId,
      field: 'status',
      specValue: specState,
      githubValue: normalizedState,
      applied: !dryRun,
    });
  }
}

async function fetchIssue(
  issueNumber: number,
  repoSlug: string,
  env: NodeJS.ProcessEnv,
): Promise<{ title: string; body: string; state: string; labels: Array<{ name: string }> }> {
  const res = await execFileNoThrow('gh', [
    'issue', 'view', String(issueNumber),
    '--repo', repoSlug,
    '--json', 'title,body,state,labels',
  ], { env });

  if (!res.success) {
    throw new Error(res.stderr || 'Failed to fetch issue');
  }

  return JSON.parse(res.stdout);
}

function getEnv(token?: string): NodeJS.ProcessEnv {
  if (token) {
    return { ...process.env, GH_TOKEN: token };
  }
  return process.env;
}

// ============================================================================
// Multi-Repo Pull Sync (v1.0.236+)
// ============================================================================

export interface MultiRepoPullSyncOptions extends PullSyncOptions {}

export interface MultiRepoDisagreement {
  userStoryId: string;
  field: string;
  repoStates: Record<string, boolean>;
}

export interface MultiRepoPullSyncResult {
  changes: PullSyncChange[];
  conflicts: PullSyncConflict[];
  disagreements: MultiRepoDisagreement[];
  errors: Array<{ userStoryId?: string; repo?: string; error: string }>;
}

interface RepoConfig {
  owner: string;
  repo: string;
  relevantStories: string[];
}

interface MultiRepoUserStoryLinks {
  [usId: string]: Record<string, { issueNumber: number }>;
}

/**
 * Pull sync from multiple repos with all-repos-must-agree consensus.
 *
 * For shared user stories (appearing in 2+ repos):
 * - AC is marked done ONLY if ALL repos agree it is done
 * - Disagreements are recorded separately
 *
 * For repo-specific user stories (1 repo):
 * - Standard single-repo logic applies
 *
 * Repo errors are non-blocking: erroring repos are excluded from consensus.
 */
export async function pullSyncMultiRepo(
  repos: RepoConfig[],
  userStoryLinks: MultiRepoUserStoryLinks,
  specAcceptanceCriteria: Record<string, Array<{ id: string; completed: boolean }>>,
  options: MultiRepoPullSyncOptions,
): Promise<MultiRepoPullSyncResult> {
  const result: MultiRepoPullSyncResult = {
    changes: [],
    conflicts: [],
    disagreements: [],
    errors: [],
  };

  if (repos.length === 0) {
    return result;
  }

  const env = getEnv(options.token);

  // Step 1: Fetch per-repo AC states
  // Map: usId → acId → repoSlug → checked
  const perRepoACStates: Record<string, Record<string, Record<string, boolean>>> = {};
  const failedRepos = new Set<string>();

  for (const repo of repos) {
    const repoSlug = `${repo.owner}/${repo.repo}`;

    for (const usId of repo.relevantStories) {
      const links = userStoryLinks[usId];
      if (!links || !links[repoSlug]) continue;

      const issueNumber = links[repoSlug].issueNumber;

      try {
        const issueData = await fetchIssue(issueNumber, repoSlug, env);
        const parsed = parseIssueBody(issueData.body || '');

        // Record AC states for this repo
        if (!perRepoACStates[usId]) {
          perRepoACStates[usId] = {};
        }

        const specACs = specAcceptanceCriteria[usId] || [];
        for (const specAC of specACs) {
          const ghAC = parsed.acceptanceCriteria[specAC.id];
          if (!ghAC) continue;

          if (!perRepoACStates[usId][specAC.id]) {
            perRepoACStates[usId][specAC.id] = {};
          }
          perRepoACStates[usId][specAC.id][repoSlug] = ghAC.checked;
        }
      } catch (err) {
        failedRepos.add(repoSlug);
        result.errors.push({
          userStoryId: usId,
          repo: repoSlug,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Step 2: Build consensus per AC
  for (const [usId, acMap] of Object.entries(perRepoACStates)) {
    const specACs = specAcceptanceCriteria[usId] || [];

    // Determine how many repos this US should appear in (excluding failed)
    const usLinks = userStoryLinks[usId] || {};
    const expectedRepos = Object.keys(usLinks).filter(r => !failedRepos.has(r));

    for (const specAC of specACs) {
      const repoStates = acMap[specAC.id];
      if (!repoStates) continue;

      // Filter out failed repos
      const validStates = Object.entries(repoStates).filter(
        ([repo]) => !failedRepos.has(repo),
      );

      if (validStates.length === 0) continue;

      const allChecked = validStates.every(([, checked]) => checked);
      const allUnchecked = validStates.every(([, checked]) => !checked);
      const isShared = expectedRepos.length > 1;

      if (isShared) {
        // All-repos-must-agree consensus
        if (allChecked && !specAC.completed) {
          result.changes.push({
            userStoryId: usId,
            field: specAC.id,
            specValue: String(specAC.completed),
            githubValue: 'true',
            applied: true,
          });
        } else if (!allChecked && !allUnchecked && !specAC.completed) {
          // Disagreement
          const stateMap: Record<string, boolean> = {};
          for (const [repo, checked] of validStates) {
            stateMap[repo] = checked;
          }
          result.disagreements.push({
            userStoryId: usId,
            field: specAC.id,
            repoStates: stateMap,
          });
        }
      } else {
        // Single-repo: use directly
        const [, checked] = validStates[0];
        if (checked && !specAC.completed) {
          result.changes.push({
            userStoryId: usId,
            field: specAC.id,
            specValue: String(specAC.completed),
            githubValue: 'true',
            applied: true,
          });
        }
      }
    }
  }

  return result;
}
