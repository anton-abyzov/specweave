/**
 * GitHub Push Sync — User Stories → GitHub Issues
 *
 * Creates or updates GitHub issues from SpecWeave user stories.
 * Uses `gh` CLI for all operations (no direct HTTP).
 *
 * @module github-push-sync
 */

import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import { generateIssueBody } from './github-issue-body-generator.js';

export interface UserStoryForSync {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  acceptanceCriteria: Array<{ id: string; description: string; completed: boolean }>;
  specId?: string;
}

export interface PushSyncOptions {
  owner: string;
  repo: string;
  token?: string;
  dryRun?: boolean;
}

export interface PushSyncResult {
  created: Array<{ userStoryId: string; issueNumber: number; issueUrl: string; issueNodeId: string }>;
  updated: Array<{ userStoryId: string; issueNumber: number; issueUrl: string }>;
  errors: Array<{ userStoryId: string; error: string }>;
}

/**
 * Push sync user stories to GitHub issues.
 * For each US: search by [US-XXX] prefix, create if new, update if existing.
 */
export async function pushSyncUserStories(
  userStories: UserStoryForSync[],
  options: PushSyncOptions,
): Promise<PushSyncResult> {
  const result: PushSyncResult = { created: [], updated: [], errors: [] };

  if (options.dryRun) {
    return result;
  }

  const env = getEnv(options.token);
  const repoSlug = `${options.owner}/${options.repo}`;

  for (const us of userStories) {
    try {
      const existing = await searchIssueByPrefix(us.id, repoSlug, env);

      const body = generateIssueBody({
        id: us.id,
        title: us.title,
        description: us.description,
        priority: us.priority,
        acceptanceCriteria: us.acceptanceCriteria,
        specId: us.specId,
      });

      const title = `[${us.id}] ${us.title}`;

      if (existing) {
        // Update existing issue
        const updated = await updateIssue(existing.number, title, body, repoSlug, env);
        result.updated.push({
          userStoryId: us.id,
          issueNumber: updated.number,
          issueUrl: updated.url,
        });
      } else {
        // Create new issue
        const created = await createIssue(title, body, us, repoSlug, env);
        result.created.push({
          userStoryId: us.id,
          issueNumber: created.number,
          issueUrl: created.url,
          issueNodeId: created.node_id,
        });
      }
    } catch (err) {
      result.errors.push({
        userStoryId: us.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}

async function searchIssueByPrefix(
  usId: string,
  repoSlug: string,
  env: NodeJS.ProcessEnv,
): Promise<{ number: number; title: string; node_id: string } | null> {
  const res = await execFileNoThrow('gh', [
    'issue', 'list',
    '--repo', repoSlug,
    '--state', 'all',
    '--search', `[${usId}] in:title`,
    '--json', 'number,title,node_id',
    '--limit', '1',
  ], { env });

  if (!res.success) {
    throw new Error(`Search failed: ${res.stderr}`);
  }

  const issues = JSON.parse(res.stdout);
  return issues.length > 0 ? issues[0] : null;
}

async function createIssue(
  title: string,
  body: string,
  us: UserStoryForSync,
  repoSlug: string,
  env: NodeJS.ProcessEnv,
): Promise<{ number: number; url: string; node_id: string }> {
  const args = [
    'issue', 'create',
    '--repo', repoSlug,
    '--title', title,
    '--body', body,
    '--label', 'user-story',
    '--label', `spec:${us.specId || 'unknown'}`,
    '--label', `priority:${us.priority}`,
    '--json', 'number,url,node_id',
  ];

  const res = await execFileNoThrow('gh', args, { env });

  if (!res.success) {
    throw new Error(`Create failed: ${res.stderr}`);
  }

  return JSON.parse(res.stdout);
}

async function updateIssue(
  issueNumber: number,
  title: string,
  body: string,
  repoSlug: string,
  env: NodeJS.ProcessEnv,
): Promise<{ number: number; url: string }> {
  const args = [
    'issue', 'edit', String(issueNumber),
    '--repo', repoSlug,
    '--title', title,
    '--body', body,
    '--json', 'number,url',
  ];

  const res = await execFileNoThrow('gh', args, { env });

  if (!res.success) {
    throw new Error(`Update failed: ${res.stderr}`);
  }

  return JSON.parse(res.stdout);
}

function getEnv(token?: string): NodeJS.ProcessEnv {
  if (token) {
    return { ...process.env, GH_TOKEN: token };
  }
  return process.env;
}
