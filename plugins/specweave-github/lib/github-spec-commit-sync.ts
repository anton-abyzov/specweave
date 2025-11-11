/**
 * GitHub Spec Commit Sync
 *
 * Posts commit/PR comments to GitHub issues linked to living docs specs.
 * This enables traceability from spec user stories to actual code changes.
 */

import { GitHubClientV2 } from './github-client-v2.js';
import {
  getRecentCommits,
  detectRepository,
  getCommitUrl,
  findPRForCommit,
  getLastSyncCommit,
  updateLastSyncCommit,
  GitCommit,
  GitRepository,
  PullRequest,
} from '../../../src/utils/git-utils.js';
import {
  getSpecTaskMapping,
  getCompletedUserStories,
  SpecTaskMapping,
  UserStory,
} from '../../../src/core/spec-task-mapper.js';
import {
  buildUserStoryComment,
  buildCommitBatchComment,
  buildShortComment,
  generateSmartSummary,
  CommentContent,
} from '../../../src/core/comment-builder.js';
import path from 'path';
import fs from 'fs/promises';

export interface SyncOptions {
  incrementPath: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface SyncResult {
  success: boolean;
  commentsPosted: number;
  errors: string[];
  commits: GitCommit[];
  userStories: UserStory[];
}

/**
 * Sync commits for completed user stories to GitHub issue
 */
export async function syncSpecCommitsToGitHub(
  options: SyncOptions
): Promise<SyncResult> {
  const { incrementPath, dryRun = false, verbose = false } = options;

  const result: SyncResult = {
    success: true,
    commentsPosted: 0,
    errors: [],
    commits: [],
    userStories: [],
  };

  try {
    // 1. Check if increment has GitHub issue linked
    const metadataPath = path.join(incrementPath, 'metadata.json');
    let metadata: any;

    try {
      metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    } catch {
      result.errors.push('No metadata.json found');
      return result;
    }

    const githubIssue = metadata.github?.issue;
    if (!githubIssue) {
      if (verbose) {
        console.log('No GitHub issue linked to increment');
      }
      return result;
    }

    // 2. Detect repository
    const repo = await detectRepository('origin', incrementPath);
    if (!repo || repo.provider !== 'github') {
      result.errors.push('Not a GitHub repository or remote not found');
      result.success = false;
      return result;
    }

    // 3. Get spec-task mapping
    const mapping = await getSpecTaskMapping(incrementPath);
    if (!mapping) {
      if (verbose) {
        console.log('No spec mapping found for increment');
      }
      return result;
    }

    // 4. Get completed user stories
    const completedUserStories = getCompletedUserStories(mapping);
    if (completedUserStories.length === 0) {
      if (verbose) {
        console.log('No completed user stories');
      }
      return result;
    }

    result.userStories = completedUserStories;

    // 5. Get recent commits (since last sync)
    const lastSyncCommit = await getLastSyncCommit(metadataPath);
    const commits = lastSyncCommit
      ? await getRecentCommits(undefined, lastSyncCommit, incrementPath)
      : await getRecentCommits('7.days', undefined, incrementPath);

    if (commits.length === 0) {
      if (verbose) {
        console.log('No new commits since last sync');
      }
      return result;
    }

    result.commits = commits;

    // Add commit URLs
    for (const commit of commits) {
      commit.url = getCommitUrl(commit, repo);
    }

    // 6. Initialize GitHub client
    const client = GitHubClientV2.fromRepo(repo.owner, repo.repo);

    // 7. Post comments for each completed user story
    for (const userStory of completedUserStories) {
      try {
        // Get tasks for this user story
        const relatedTasks = mapping.tasks.filter(t =>
          t.userStories.includes(userStory.id)
        );

        // Find PRs for commits (optional, best effort)
        const pullRequests: PullRequest[] = [];
        for (const commit of commits.slice(0, 3)) { // Check first 3 commits only
          const pr = await findPRForCommit(commit.sha, repo.owner, repo.repo);
          if (pr && !pullRequests.find(p => p.number === pr.number)) {
            pullRequests.push(pr);
          }
        }

        // Build comment
        const summary = generateSmartSummary(commits, relatedTasks);
        const commentContent: CommentContent = {
          userStory,
          tasks: relatedTasks,
          commits,
          pullRequests,
          summary,
        };

        const formattedComment = buildUserStoryComment(commentContent, repo);

        if (verbose) {
          console.log(`\nComment for ${userStory.id}:`);
          console.log(formattedComment.markdown);
          console.log('\n---\n');
        }

        // Post comment
        if (!dryRun) {
          await client.addComment(githubIssue, formattedComment.markdown);
          result.commentsPosted++;
        } else {
          result.commentsPosted++; // Count as "would post"
        }
      } catch (error: any) {
        result.errors.push(`Failed to post comment for ${userStory.id}: ${error.message}`);
      }
    }

    // 8. If no user stories completed but there are commits, post a simple update
    if (completedUserStories.length === 0 && commits.length > 0) {
      try {
        const summary = `Work in progress: ${commits.length} commit${commits.length > 1 ? 's' : ''}`;
        const formattedComment = buildShortComment(commits, repo, summary);

        if (verbose) {
          console.log(`\nShort update comment:`);
          console.log(formattedComment.markdown);
          console.log('\n---\n');
        }

        if (!dryRun) {
          await client.addComment(githubIssue, formattedComment.markdown);
          result.commentsPosted++;
        } else {
          result.commentsPosted++;
        }
      } catch (error: any) {
        result.errors.push(`Failed to post short update: ${error.message}`);
      }
    }

    // 9. Update last sync commit
    if (!dryRun && commits.length > 0) {
      await updateLastSyncCommit(metadataPath, commits[0].sha);
    }

  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);
  }

  return result;
}

/**
 * Post batch commit update to GitHub issue (for multiple commits)
 */
export async function postCommitBatchUpdate(
  incrementPath: string,
  commits: GitCommit[],
  issueNumber: number,
  repo: GitRepository,
  dryRun: boolean = false
): Promise<boolean> {
  try {
    const client = GitHubClientV2.fromRepo(repo.owner, repo.repo);

    // Add commit URLs
    for (const commit of commits) {
      commit.url = getCommitUrl(commit, repo);
    }

    // Build and post comment
    const formattedComment = buildCommitBatchComment(commits, repo, true);

    if (!dryRun) {
      await client.addComment(issueNumber, formattedComment.markdown);
    }

    return true;
  } catch (error: any) {
    console.error(`Failed to post batch update: ${error.message}`);
    return false;
  }
}

/**
 * Check if spec commit sync is enabled in config
 */
export async function isSpecCommitSyncEnabled(
  projectRoot: string
): Promise<boolean> {
  try {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

    return config.sync?.settings?.postCommitComments !== false;
  } catch {
    return true; // Default: enabled
  }
}

/**
 * Get GitHub issue number from spec metadata
 */
export async function getGitHubIssueForSpec(
  specPath: string
): Promise<number | null> {
  try {
    const content = await fs.readFile(specPath, 'utf-8');

    // Extract GitHub issue from frontmatter or body
    // Pattern: **GitHub Project**: https://github.com/owner/repo/issues/123
    const match = content.match(/github\.com\/[\w-]+\/[\w-]+\/issues\/(\d+)/);

    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}
