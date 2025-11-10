/**
 * GitHub Sync for Increment Changes
 *
 * Handles syncing spec.md, plan.md, and tasks.md changes to GitHub issues.
 * Detects scope changes, architecture updates, and task modifications.
 *
 * @module github-sync-increment-changes
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import {
  loadIncrementMetadata,
  detectRepo,
  postScopeChangeComment
} from './github-issue-updater.js';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

export interface SpecChanges {
  added: string[];
  removed: string[];
  modified: string[];
}

/**
 * Sync increment file changes to GitHub
 */
export async function syncIncrementChanges(
  incrementId: string,
  changedFile: 'spec.md' | 'plan.md' | 'tasks.md'
): Promise<void> {
  console.log(`\n🔄 Syncing ${changedFile} changes to GitHub...`);

  try {
    // 1. Load metadata
    const metadata = await loadIncrementMetadata(incrementId);
    if (!metadata?.github?.issue) {
      console.log('ℹ️  No GitHub issue linked, skipping sync');
      return;
    }

    // 2. Detect repository
    const repoInfo = await detectRepo();
    if (!repoInfo) {
      console.log('⚠️  Could not detect GitHub repository, skipping sync');
      return;
    }

    const { owner, repo } = repoInfo;
    const issueNumber = metadata.github.issue;

    // 3. Handle different file types
    switch (changedFile) {
      case 'spec.md':
        await syncSpecChanges(incrementId, issueNumber, owner, repo);
        break;
      case 'plan.md':
        await syncPlanChanges(incrementId, issueNumber, owner, repo);
        break;
      case 'tasks.md':
        await syncTasksChanges(incrementId, issueNumber, owner, repo);
        break;
    }

    console.log(`✅ ${changedFile} changes synced to issue #${issueNumber}`);

  } catch (error) {
    console.error(`❌ Error syncing ${changedFile}:`, error);
    console.error('   (Non-blocking - continuing...)');
  }
}

/**
 * Sync spec.md changes (scope changes)
 */
async function syncSpecChanges(
  incrementId: string,
  issueNumber: number,
  owner: string,
  repo: string
): Promise<void> {
  const specPath = path.join(
    process.cwd(),
    '.specweave/increments',
    incrementId,
    'spec.md'
  );

  // Detect what changed in spec.md
  const changes = await detectSpecChanges(specPath);

  if (changes.added.length === 0 && changes.removed.length === 0 && changes.modified.length === 0) {
    console.log('ℹ️  No significant spec changes detected');
    return;
  }

  // Post scope change comment
  await postScopeChangeComment(
    issueNumber,
    {
      added: changes.added,
      removed: changes.removed,
      modified: changes.modified,
      reason: 'Spec updated',
      impact: estimateImpact(changes)
    },
    owner,
    repo
  );

  // Update issue title if needed
  const title = await extractSpecTitle(specPath);
  if (title) {
    await updateIssueTitle(issueNumber, title, owner, repo);
  }
}

/**
 * Sync plan.md changes (architecture updates)
 */
async function syncPlanChanges(
  incrementId: string,
  issueNumber: number,
  owner: string,
  repo: string
): Promise<void> {
  const comment = `
🏗️ **Architecture Plan Updated**

The implementation plan has been updated. See [\`plan.md\`](https://github.com/${owner}/${repo}/blob/develop/.specweave/increments/${incrementId}/plan.md) for details.

**Timestamp**: ${new Date().toISOString()}

---
🤖 Auto-updated by SpecWeave
`.trim();

  await postComment(issueNumber, comment, owner, repo);
}

/**
 * Sync tasks.md changes (task updates)
 */
async function syncTasksChanges(
  incrementId: string,
  issueNumber: number,
  owner: string,
  repo: string
): Promise<void> {
  const tasksPath = path.join(
    process.cwd(),
    '.specweave/increments',
    incrementId,
    'tasks.md'
  );

  // Extract task list
  const tasks = await extractTasks(tasksPath);

  // Update issue body with new task checklist
  await updateIssueTaskChecklist(issueNumber, tasks, owner, repo);

  const comment = `
📋 **Task List Updated**

Tasks have been updated. Total tasks: ${tasks.length}

**Timestamp**: ${new Date().toISOString()}

---
🤖 Auto-updated by SpecWeave
`.trim();

  await postComment(issueNumber, comment, owner, repo);
}

/**
 * Detect changes in spec.md by comparing with git history
 */
async function detectSpecChanges(specPath: string): Promise<SpecChanges> {
  const changes: SpecChanges = {
    added: [],
    removed: [],
    modified: []
  };

  try {
    // Get git diff for spec.md
    const diff = execSync(`git diff HEAD~1 "${specPath}" 2>/dev/null || true`, {
      encoding: 'utf-8',
      cwd: process.cwd()
    });

    if (!diff) {
      return changes;
    }

    // Parse diff to find user story changes
    const lines = diff.split('\n');
    for (const line of lines) {
      // Look for user story additions/removals
      if (line.startsWith('+') && line.includes('US-')) {
        const match = line.match(/US-\d+:([^(]+)/);
        if (match) {
          changes.added.push(match[1].trim());
        }
      } else if (line.startsWith('-') && line.includes('US-')) {
        const match = line.match(/US-\d+:([^(]+)/);
        if (match) {
          changes.removed.push(match[1].trim());
        }
      }
    }

  } catch (error) {
    console.warn('⚠️  Could not detect spec changes:', error);
  }

  return changes;
}

/**
 * Extract title from spec.md frontmatter
 */
async function extractSpecTitle(specPath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(specPath, 'utf-8');
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  } catch (error) {
    return null;
  }
}

/**
 * Extract tasks from tasks.md
 */
async function extractTasks(tasksPath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(tasksPath, 'utf-8');
    const tasks: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Match task headers: ## T-001: Task name
      const match = line.match(/^##\s+(T-\d+):\s*(.+)$/);
      if (match) {
        tasks.push(`${match[1]}: ${match[2]}`);
      }
    }

    return tasks;
  } catch (error) {
    return [];
  }
}

/**
 * Estimate impact of spec changes
 */
function estimateImpact(changes: SpecChanges): string {
  const addedCount = changes.added.length;
  const removedCount = changes.removed.length;

  if (addedCount > removedCount) {
    return `+${addedCount * 8} hours (${addedCount} user stories added)`;
  } else if (removedCount > addedCount) {
    return `-${removedCount * 8} hours (${removedCount} user stories removed)`;
  } else {
    return 'Neutral (scope adjusted)';
  }
}

/**
 * Update issue title
 */
async function updateIssueTitle(
  issueNumber: number,
  title: string,
  owner: string,
  repo: string
): Promise<void> {
  const result = await execFileNoThrow('gh', [
    'issue',
    'edit',
    String(issueNumber),
    '--repo',
    `${owner}/${repo}`,
    '--title',
    title
  ]);

  if (result.status !== 0) {
    console.warn(`⚠️  Could not update issue title: ${result.stderr}`);
  }
}

/**
 * Update issue task checklist
 */
async function updateIssueTaskChecklist(
  issueNumber: number,
  tasks: string[],
  owner: string,
  repo: string
): Promise<void> {
  // Get current issue body
  const result = await execFileNoThrow('gh', [
    'issue',
    'view',
    String(issueNumber),
    '--repo',
    `${owner}/${repo}`,
    '--json',
    'body',
    '-q',
    '.body'
  ]);

  if (result.status !== 0) {
    throw new Error(`Failed to get issue body: ${result.stderr}`);
  }

  const currentBody = result.stdout.trim();

  // Build new task checklist
  const taskChecklist = tasks.map(task => `- [ ] ${task}`).join('\n');

  // Find and replace task section
  const taskSectionRegex = /## Tasks\n\n[\s\S]*?(?=\n## |$)/;
  const newTaskSection = `## Tasks\n\nProgress: 0/${tasks.length} tasks (0%)\n\n${taskChecklist}\n`;

  let updatedBody: string;
  if (taskSectionRegex.test(currentBody)) {
    updatedBody = currentBody.replace(taskSectionRegex, newTaskSection);
  } else {
    // Append task section
    updatedBody = currentBody + '\n\n' + newTaskSection;
  }

  // Update issue
  const updateResult = await execFileNoThrow('gh', [
    'issue',
    'edit',
    String(issueNumber),
    '--repo',
    `${owner}/${repo}`,
    '--body',
    updatedBody
  ]);

  if (updateResult.status !== 0) {
    throw new Error(`Failed to update issue body: ${updateResult.stderr}`);
  }
}

/**
 * Post comment to issue
 */
async function postComment(
  issueNumber: number,
  comment: string,
  owner: string,
  repo: string
): Promise<void> {
  const result = await execFileNoThrow('gh', [
    'issue',
    'comment',
    String(issueNumber),
    '--repo',
    `${owner}/${repo}`,
    '--body',
    comment
  ]);

  if (result.status !== 0) {
    throw new Error(`Failed to post comment: ${result.stderr}`);
  }
}
