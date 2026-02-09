/**
 * GitHub Cross-Repo Sync — Distributed multi-repo issue creation and linking
 *
 * Creates issues in different repos based on user story target repo tags,
 * then adds cross-reference sections for stories spanning multiple repos.
 *
 * @module github-cross-repo-sync
 */

import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import { generateIssueBody } from './github-issue-body-generator.js';

export interface CrossRepoUserStory {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  acceptanceCriteria: Array<{ id: string; description: string; completed: boolean }>;
  targetRepos: string[];
  specId?: string;
}

export interface CrossRepoSyncOptions {
  owner: string;
  defaultRepo: string;
  token?: string;
}

interface CreatedIssue {
  userStoryId: string;
  repo: string;
  issueNumber: number;
  issueUrl: string;
  issueNodeId: string;
}

interface UpdatedIssue {
  userStoryId: string;
  repo: string;
  issueNumber: number;
  issueUrl: string;
}

interface CrossReference {
  repo: string;
  issueNumber: number;
  linkedTo: Array<{ repo: string; issueNumber: number }>;
}

export interface CrossRepoSyncResult {
  created: CreatedIssue[];
  updated: UpdatedIssue[];
  errors: Array<{ userStoryId: string; repo: string; error: string }>;
  crossReferences: CrossReference[];
}

/**
 * Create/update issues across multiple repos and add cross-references.
 */
export async function crossRepoSync(
  stories: CrossRepoUserStory[],
  options: CrossRepoSyncOptions,
): Promise<CrossRepoSyncResult> {
  const result: CrossRepoSyncResult = {
    created: [],
    updated: [],
    errors: [],
    crossReferences: [],
  };

  if (stories.length === 0) return result;

  const env = getEnv(options.token);

  // Track per-story issues for cross-referencing
  const storyIssueMap = new Map<string, Array<{ repo: string; issueNumber: number }>>();

  // Step 1: Create/update issues in target repos
  for (const story of stories) {
    const repos = story.targetRepos.length > 0
      ? story.targetRepos
      : [`${options.owner}/${options.defaultRepo}`];

    const storyIssues: Array<{ repo: string; issueNumber: number }> = [];

    for (const repo of repos) {
      try {
        const body = generateIssueBody({
          id: story.id,
          title: story.title,
          description: story.description,
          priority: story.priority,
          acceptanceCriteria: story.acceptanceCriteria,
          specId: story.specId,
        });

        const title = `[${story.id}] ${story.title}`;
        const existing = await searchIssue(story.id, repo, env);

        if (existing) {
          await updateIssue(existing.number, title, body, repo, env);
          result.updated.push({
            userStoryId: story.id,
            repo,
            issueNumber: existing.number,
            issueUrl: `https://github.com/${repo}/issues/${existing.number}`,
          });
          storyIssues.push({ repo, issueNumber: existing.number });
        } else {
          const created = await createIssue(title, body, story, repo, env);
          result.created.push({
            userStoryId: story.id,
            repo,
            issueNumber: created.number,
            issueUrl: created.url,
            issueNodeId: created.node_id,
          });
          storyIssues.push({ repo, issueNumber: created.number });
        }
      } catch (err) {
        result.errors.push({
          userStoryId: story.id,
          repo,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (storyIssues.length > 1) {
      storyIssueMap.set(story.id, storyIssues);
    }
  }

  // Step 2: Add cross-references for multi-repo stories
  for (const [, issues] of storyIssueMap) {
    for (const issue of issues) {
      const linkedTo = issues.filter(i => i.repo !== issue.repo);
      result.crossReferences.push({
        repo: issue.repo,
        issueNumber: issue.issueNumber,
        linkedTo,
      });

      // Add cross-reference comment via issue edit (append to body)
      const crossRefSection = buildCrossRefSection(linkedTo);
      try {
        await appendToIssueBody(issue.issueNumber, issue.repo, crossRefSection, env);
      } catch {
        // Non-fatal: cross-ref is nice-to-have
      }
    }
  }

  return result;
}

async function searchIssue(
  usId: string,
  repo: string,
  env: NodeJS.ProcessEnv,
): Promise<{ number: number; title: string; node_id: string } | null> {
  const res = await execFileNoThrow('gh', [
    'issue', 'list',
    '--repo', repo,
    '--search', `[${usId}] in:title`,
    '--json', 'number,title,node_id',
    '--limit', '1',
  ], { env });

  if (!res.success) {
    throw new Error(`Search failed for ${repo}: ${res.stderr}`);
  }

  const issues = JSON.parse(res.stdout);
  return issues.length > 0 ? issues[0] : null;
}

async function createIssue(
  title: string,
  body: string,
  story: CrossRepoUserStory,
  repo: string,
  env: NodeJS.ProcessEnv,
): Promise<{ number: number; url: string; node_id: string }> {
  const res = await execFileNoThrow('gh', [
    'issue', 'create',
    '--repo', repo,
    '--title', title,
    '--body', body,
    '--label', 'user-story',
    '--label', `priority:${story.priority}`,
    '--json', 'number,url,node_id',
  ], { env });

  if (!res.success) {
    throw new Error(`Create failed for ${repo}: ${res.stderr}`);
  }

  return JSON.parse(res.stdout);
}

async function updateIssue(
  issueNumber: number,
  title: string,
  body: string,
  repo: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  const res = await execFileNoThrow('gh', [
    'issue', 'edit', String(issueNumber),
    '--repo', repo,
    '--title', title,
    '--body', body,
    '--json', 'number,url',
  ], { env });

  if (!res.success) {
    throw new Error(`Update failed for ${repo}: ${res.stderr}`);
  }
}

async function appendToIssueBody(
  issueNumber: number,
  repo: string,
  section: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  // Use gh issue edit with --add-body
  const res = await execFileNoThrow('gh', [
    'issue', 'edit', String(issueNumber),
    '--repo', repo,
    '--body', section,
    '--json', 'number,url',
  ], { env });

  if (!res.success) {
    throw new Error(`Cross-ref update failed: ${res.stderr}`);
  }
}

function buildCrossRefSection(linkedTo: Array<{ repo: string; issueNumber: number }>): string {
  const refs = linkedTo.map(l => `- ${l.repo}#${l.issueNumber}`).join('\n');
  return `\n\n---\n**Also tracked in:**\n${refs}`;
}

function getEnv(token?: string): NodeJS.ProcessEnv {
  if (token) {
    return { ...process.env, GH_TOKEN: token };
  }
  return process.env;
}
