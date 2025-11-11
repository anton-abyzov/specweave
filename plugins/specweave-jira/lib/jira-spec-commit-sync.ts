/**
 * JIRA Spec Commit Sync
 *
 * Posts commit/PR comments to JIRA issues linked to living docs specs.
 * This enables traceability from spec user stories to actual code changes.
 */

import axios, { AxiosInstance } from 'axios';
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
  formatForJira,
  CommentContent,
} from '../../../src/core/comment-builder.js';
import path from 'path';
import fs from 'fs/promises';

export interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

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
 * Sync commits for completed user stories to JIRA epic/story
 */
export async function syncSpecCommitsToJira(
  config: JiraConfig,
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
    // 1. Check if increment has JIRA issue linked
    const metadataPath = path.join(incrementPath, 'metadata.json');
    let metadata: any;

    try {
      metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    } catch {
      result.errors.push('No metadata.json found');
      return result;
    }

    const jiraIssueKey = metadata.jira?.issueKey;
    if (!jiraIssueKey) {
      if (verbose) {
        console.log('No JIRA issue linked to increment');
      }
      return result;
    }

    // 2. Create JIRA client
    const client = axios.create({
      baseURL: `https://${config.domain}/rest/api/3`,
      auth: {
        username: config.email,
        password: config.apiToken,
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // 3. Detect repository
    const repo = await detectRepository('origin', incrementPath);
    if (!repo) {
      result.errors.push('Git repository not found');
      result.success = false;
      return result;
    }

    // 4. Get spec-task mapping
    const mapping = await getSpecTaskMapping(incrementPath);
    if (!mapping) {
      if (verbose) {
        console.log('No spec mapping found for increment');
      }
      return result;
    }

    // 5. Get completed user stories
    const completedUserStories = getCompletedUserStories(mapping);
    if (completedUserStories.length === 0) {
      if (verbose) {
        console.log('No completed user stories');
      }
      return result;
    }

    result.userStories = completedUserStories;

    // 6. Get recent commits (since last sync)
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

    // 7. Post comments for each completed user story
    for (const userStory of completedUserStories) {
      try {
        // Get tasks for this user story
        const relatedTasks = mapping.tasks.filter(t =>
          t.userStories.includes(userStory.id)
        );

        // Find PRs for commits (optional, best effort)
        const pullRequests: PullRequest[] = [];
        if (repo.provider === 'github') {
          for (const commit of commits.slice(0, 3)) {
            const pr = await findPRForCommit(commit.sha, repo.owner, repo.repo);
            if (pr && !pullRequests.find(p => p.number === pr.number)) {
              pullRequests.push(pr);
            }
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
        const jiraComment = formatForJira(formattedComment);

        if (verbose) {
          console.log(`\nComment for ${userStory.id} (JIRA format):`);
          console.log(jiraComment);
          console.log('\n---\n');
        }

        // Post comment to JIRA
        if (!dryRun) {
          await client.post(`/issue/${jiraIssueKey}/comment`, {
            body: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: jiraComment,
                    },
                  ],
                },
              ],
            },
          });
          result.commentsPosted++;
        } else {
          result.commentsPosted++;
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
        const jiraComment = formatForJira(formattedComment);

        if (verbose) {
          console.log(`\nShort update comment (JIRA format):`);
          console.log(jiraComment);
          console.log('\n---\n');
        }

        if (!dryRun) {
          await client.post(`/issue/${jiraIssueKey}/comment`, {
            body: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: jiraComment,
                    },
                  ],
                },
              ],
            },
          });
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
 * Post batch commit update to JIRA issue
 */
export async function postCommitBatchUpdate(
  config: JiraConfig,
  incrementPath: string,
  commits: GitCommit[],
  issueKey: string,
  repo: GitRepository,
  dryRun: boolean = false
): Promise<boolean> {
  try {
    const client = axios.create({
      baseURL: `https://${config.domain}/rest/api/3`,
      auth: {
        username: config.email,
        password: config.apiToken,
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Add commit URLs
    for (const commit of commits) {
      commit.url = getCommitUrl(commit, repo);
    }

    // Build and post comment
    const formattedComment = buildCommitBatchComment(commits, repo, true);
    const jiraComment = formatForJira(formattedComment);

    if (!dryRun) {
      await client.post(`/issue/${issueKey}/comment`, {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: jiraComment,
                },
              ],
            },
          ],
        },
      });
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
 * Get JIRA issue key from spec metadata
 */
export async function getJiraIssueForSpec(
  specPath: string
): Promise<string | null> {
  try {
    const content = await fs.readFile(specPath, 'utf-8');

    // Extract JIRA issue from frontmatter or body
    // Pattern: **JIRA Epic**: PROJ-123
    const match = content.match(/\*\*JIRA Epic\*\*:\s*([A-Z]+-\d+)/);

    return match ? match[1] : null;
  } catch {
    return null;
  }
}
