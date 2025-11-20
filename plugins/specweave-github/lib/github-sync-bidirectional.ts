/**
 * Bidirectional GitHub Sync
 *
 * @deprecated This module is deprecated as of v0.24.0 (Three-Permission Architecture).
 * The "bidirectional" terminology has been replaced with granular permission controls:
 * - canUpsertInternalItems: CREATE + UPDATE internal items
 * - canUpdateExternalItems: UPDATE external items (full content)
 * - canUpdateStatus: UPDATE status (both types)
 *
 * This file is kept for backward compatibility but is no longer actively maintained.
 * See: .specweave/increments/0047-us-task-linkage/reports/THREE-PERMISSION-ARCHITECTURE-CHANGES.md
 *
 * Syncs state from GitHub back to SpecWeave.
 * Handles issue state changes, comments, assignees, labels, milestones.
 *
 * @module github-sync-bidirectional
 */

import fs from 'fs-extra';
import path from 'path';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import {
  loadIncrementMetadata,
  IncrementMetadata,
  detectRepo
} from './github-issue-updater.js';

export interface GitHubIssueState {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  milestone?: string;
  comments: GitHubComment[];
  updated_at: string;
}

export interface GitHubComment {
  id: number;
  author: string;
  body: string;
  created_at: string;
}

export interface SyncConflict {
  type: 'status' | 'assignee' | 'label';
  githubValue: any;
  specweaveValue: any;
  resolution: 'github-wins' | 'specweave-wins' | 'prompt';
}

/**
 * Sync from GitHub to SpecWeave
 */
export async function syncFromGitHub(incrementId: string): Promise<void> {
  console.log(`\n🔄 Syncing from GitHub for increment: ${incrementId}`);

  try {
    // 1. Load metadata
    const metadata = await loadIncrementMetadata(incrementId);
    if (!metadata?.github?.issue) {
      console.log('ℹ️  No GitHub issue linked, nothing to sync');
      return;
    }

    // 2. Detect repository
    const repoInfo = await detectRepo();
    if (!repoInfo) {
      console.log('⚠️  Could not detect GitHub repository');
      return;
    }

    const { owner, repo } = repoInfo;
    const issueNumber = metadata.github.issue;

    console.log(`   Syncing from ${owner}/${repo}#${issueNumber}`);

    // 3. Fetch current GitHub state
    const githubState = await fetchGitHubIssueState(issueNumber, owner, repo);

    // 4. Compare with local state
    const conflicts = detectConflicts(metadata, githubState);

    if (conflicts.length === 0) {
      console.log('✅ No conflicts - GitHub and SpecWeave in sync');
      return;
    }

    console.log(`⚠️  Detected ${conflicts.length} conflict(s)`);

    // 5. Resolve conflicts
    await resolveConflicts(incrementId, metadata, githubState, conflicts);

    // 6. Sync comments
    await syncComments(incrementId, githubState.comments);

    // 7. Update metadata
    await updateMetadata(incrementId, githubState);

    console.log('✅ Three-permission sync complete');

  } catch (error) {
    console.error('❌ Error syncing from GitHub:', error);
    throw error;
  }
}

/**
 * Fetch current GitHub issue state
 */
async function fetchGitHubIssueState(
  issueNumber: number,
  owner: string,
  repo: string
): Promise<GitHubIssueState> {
  // Fetch issue details
  const issueResult = await execFileNoThrow('gh', [
    'issue',
    'view',
    String(issueNumber),
    '--repo',
    `${owner}/${repo}`,
    '--json',
    'number,title,body,state,labels,assignees,milestone,updatedAt'
  ]);

  if (issueResult.exitCode !== 0) {
    throw new Error(`Failed to fetch issue: ${issueResult.stderr}`);
  }

  const issue = JSON.parse(issueResult.stdout);

  // Fetch comments
  const commentsResult = await execFileNoThrow('gh', [
    'api',
    `repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    '--jq',
    '.[] | {id: .id, author: .user.login, body: .body, created_at: .created_at}'
  ]);

  let comments: GitHubComment[] = [];
  if (commentsResult.exitCode === 0 && commentsResult.stdout.trim()) {
    const commentLines = commentsResult.stdout.trim().split('\n');
    comments = commentLines.map(line => JSON.parse(line));
  }

  return {
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    labels: issue.labels?.map((l: any) => l.name) || [],
    assignees: issue.assignees?.map((a: any) => a.login) || [],
    milestone: issue.milestone?.title,
    comments,
    updated_at: issue.updatedAt
  };
}

/**
 * Detect conflicts between GitHub and SpecWeave
 */
function detectConflicts(
  metadata: IncrementMetadata,
  githubState: GitHubIssueState
): SyncConflict[] {
  const conflicts: SyncConflict[] = [];

  // Status conflict
  const specweaveStatus = metadata.status; // "active", "completed", "paused", "abandoned"
  const githubStatus = githubState.state; // "open", "closed"

  const expectedGitHubStatus = mapSpecWeaveStatusToGitHub(specweaveStatus);

  if (githubStatus !== expectedGitHubStatus) {
    conflicts.push({
      type: 'status',
      githubValue: githubStatus,
      specweaveValue: specweaveStatus,
      resolution: 'prompt' // Ask user
    });
  }

  // TODO: Add assignee/label conflicts if needed in future

  return conflicts;
}

/**
 * Resolve conflicts
 */
async function resolveConflicts(
  incrementId: string,
  metadata: IncrementMetadata,
  githubState: GitHubIssueState,
  conflicts: SyncConflict[]
): Promise<void> {
  for (const conflict of conflicts) {
    console.log(`\n⚠️  Conflict detected: ${conflict.type}`);
    console.log(`   GitHub: ${conflict.githubValue}`);
    console.log(`   SpecWeave: ${conflict.specweaveValue}`);

    if (conflict.type === 'status') {
      await resolveStatusConflict(incrementId, metadata, githubState);
    }
  }
}

/**
 * Resolve status conflict
 */
async function resolveStatusConflict(
  incrementId: string,
  metadata: IncrementMetadata,
  githubState: GitHubIssueState
): Promise<void> {
  const specweaveStatus = metadata.status;
  const githubStatus = githubState.state;

  // GitHub closed but SpecWeave active
  if (githubStatus === 'closed' && specweaveStatus === 'active') {
    console.log(`\n⚠️  **CONFLICT**: GitHub issue closed but SpecWeave increment still active!`);
    console.log(`   Recommendation: Run /specweave:done ${incrementId} to close increment`);
    console.log(`   Or reopen issue on GitHub if work is not complete`);
  }

  // GitHub open but SpecWeave completed
  if (githubStatus === 'open' && specweaveStatus === 'completed') {
    console.log(`\n⚠️  **CONFLICT**: SpecWeave increment completed but GitHub issue still open!`);
    console.log(`   Recommendation: Close GitHub issue #${metadata.github!.issue}`);
  }

  // GitHub open but SpecWeave paused
  if (githubStatus === 'open' && specweaveStatus === 'paused') {
    console.log(`\nℹ️  GitHub issue open, SpecWeave increment paused (OK)`);
  }

  // GitHub open but SpecWeave abandoned
  if (githubStatus === 'open' && specweaveStatus === 'abandoned') {
    console.log(`\n⚠️  **CONFLICT**: SpecWeave increment abandoned but GitHub issue still open!`);
    console.log(`   Recommendation: Close GitHub issue #${metadata.github!.issue} with reason`);
  }
}

/**
 * Sync comments from GitHub to SpecWeave
 */
async function syncComments(
  incrementId: string,
  comments: GitHubComment[]
): Promise<void> {
  if (comments.length === 0) {
    console.log('ℹ️  No comments to sync');
    return;
  }

  const commentsPath = path.join(
    process.cwd(),
    '.specweave/increments',
    incrementId,
    'logs/github-comments.md'
  );

  await fs.ensureFile(commentsPath);

  // Load existing comments
  let existingContent = '';
  if (await fs.pathExists(commentsPath)) {
    existingContent = await fs.readFile(commentsPath, 'utf-8');
  }

  // Extract existing comment IDs
  const existingIds = new Set<number>();
  const idMatches = existingContent.matchAll(/<!-- comment-id: (\d+) -->/g);
  for (const match of idMatches) {
    existingIds.add(parseInt(match[1], 10));
  }

  // Append new comments
  const newComments = comments.filter(c => !existingIds.has(c.id));

  if (newComments.length === 0) {
    console.log('ℹ️  All comments already synced');
    return;
  }

  console.log(`📝 Syncing ${newComments.length} new comment(s)`);

  const commentsMarkdown = newComments.map(comment => `
---

<!-- comment-id: ${comment.id} -->

**Author**: @${comment.author}
**Date**: ${new Date(comment.created_at).toLocaleString()}

${comment.body}
`.trim()).join('\n\n');

  await fs.appendFile(
    commentsPath,
    (existingContent ? '\n\n' : '') + commentsMarkdown
  );

  console.log(`✅ Comments saved to: logs/github-comments.md`);
}

/**
 * Update metadata with GitHub state
 */
async function updateMetadata(
  incrementId: string,
  githubState: GitHubIssueState
): Promise<void> {
  const metadataPath = path.join(
    process.cwd(),
    '.specweave/increments',
    incrementId,
    'metadata.json'
  );

  const metadata = await fs.readJson(metadataPath);

  // Update GitHub section
  metadata.github = metadata.github || {};
  metadata.github.synced = new Date().toISOString();
  metadata.github.lastUpdated = githubState.updated_at;
  metadata.github.state = githubState.state;

  await fs.writeJson(metadataPath, metadata, { spaces: 2 });

  console.log('✅ Metadata updated');
}

/**
 * Map SpecWeave status to GitHub state
 */
function mapSpecWeaveStatusToGitHub(status: string): 'open' | 'closed' {
  switch (status) {
    case 'completed':
    case 'abandoned':
      return 'closed';
    case 'active':
    case 'paused':
    case 'planning':
    default:
      return 'open';
  }
}
