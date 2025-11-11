/**
 * Azure DevOps Spec Commit Sync
 *
 * Posts commit/PR comments to ADO work items linked to living docs specs.
 * This enables traceability from spec user stories to actual code changes.
 */
import { getRecentCommits, detectRepository, getCommitUrl, findPRForCommit, getLastSyncCommit, updateLastSyncCommit, } from '../../../src/utils/git-utils.js';
import { getSpecTaskMapping, getCompletedUserStories, } from '../../../src/core/spec-task-mapper.js';
import { buildUserStoryComment, buildCommitBatchComment, buildShortComment, generateSmartSummary, formatForAdo, } from '../../../src/core/comment-builder.js';
import path from 'path';
import fs from 'fs/promises';
/**
 * Sync commits for completed user stories to ADO work item
 */
export async function syncSpecCommitsToAdo(client, options) {
    const { incrementPath, dryRun = false, verbose = false } = options;
    const result = {
        success: true,
        commentsPosted: 0,
        errors: [],
        commits: [],
        userStories: [],
    };
    try {
        // 1. Check if increment has ADO work item linked
        const metadataPath = path.join(incrementPath, 'metadata.json');
        let metadata;
        try {
            metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
        }
        catch {
            result.errors.push('No metadata.json found');
            return result;
        }
        const adoWorkItemId = metadata.ado?.workItemId;
        if (!adoWorkItemId) {
            if (verbose) {
                console.log('No ADO work item linked to increment');
            }
            return result;
        }
        // 2. Detect repository
        const repo = await detectRepository('origin', incrementPath);
        if (!repo) {
            result.errors.push('Git repository not found');
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
        // 6. Post comments for each completed user story
        for (const userStory of completedUserStories) {
            try {
                // Get tasks for this user story
                const relatedTasks = mapping.tasks.filter(t => t.userStories.includes(userStory.id));
                // Find PRs for commits (optional, best effort)
                const pullRequests = [];
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
                const commentContent = {
                    userStory,
                    tasks: relatedTasks,
                    commits,
                    pullRequests,
                    summary,
                };
                const formattedComment = buildUserStoryComment(commentContent, repo);
                const adoComment = formatForAdo(formattedComment);
                if (verbose) {
                    console.log(`\nComment for ${userStory.id} (ADO format):`);
                    console.log(adoComment);
                    console.log('\n---\n');
                }
                // Post comment to ADO
                if (!dryRun) {
                    await client.addComment(adoWorkItemId, adoComment);
                    result.commentsPosted++;
                }
                else {
                    result.commentsPosted++;
                }
            }
            catch (error) {
                result.errors.push(`Failed to post comment for ${userStory.id}: ${error.message}`);
            }
        }
        // 7. If no user stories completed but there are commits, post a simple update
        if (completedUserStories.length === 0 && commits.length > 0) {
            try {
                const summary = `Work in progress: ${commits.length} commit${commits.length > 1 ? 's' : ''}`;
                const formattedComment = buildShortComment(commits, repo, summary);
                const adoComment = formatForAdo(formattedComment);
                if (verbose) {
                    console.log(`\nShort update comment (ADO format):`);
                    console.log(adoComment);
                    console.log('\n---\n');
                }
                if (!dryRun) {
                    await client.addComment(adoWorkItemId, adoComment);
                    result.commentsPosted++;
                }
                else {
                    result.commentsPosted++;
                }
            }
            catch (error) {
                result.errors.push(`Failed to post short update: ${error.message}`);
            }
        }
        // 8. Update last sync commit
        if (!dryRun && commits.length > 0) {
            await updateLastSyncCommit(metadataPath, commits[0].sha);
        }
    }
    catch (error) {
        result.success = false;
        result.errors.push(error.message);
    }
    return result;
}
/**
 * Post batch commit update to ADO work item
 */
export async function postCommitBatchUpdate(client, incrementPath, commits, workItemId, repo, dryRun = false) {
    try {
        // Add commit URLs
        for (const commit of commits) {
            commit.url = getCommitUrl(commit, repo);
        }
        // Build and post comment
        const formattedComment = buildCommitBatchComment(commits, repo, true);
        const adoComment = formatForAdo(formattedComment);
        if (!dryRun) {
            await client.addComment(workItemId, adoComment);
        }
        return true;
    }
    catch (error) {
        console.error(`Failed to post batch update: ${error.message}`);
        return false;
    }
}
/**
 * Check if spec commit sync is enabled in config
 */
export async function isSpecCommitSyncEnabled(projectRoot) {
    try {
        const configPath = path.join(projectRoot, '.specweave', 'config.json');
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        return config.sync?.settings?.postCommitComments !== false;
    }
    catch {
        return true; // Default: enabled
    }
}
/**
 * Get ADO work item ID from spec metadata
 */
export async function getAdoWorkItemForSpec(specPath) {
    try {
        const content = await fs.readFile(specPath, 'utf-8');
        // Extract ADO work item from frontmatter or body
        // Pattern: **ADO Feature**: #12345
        const match = content.match(/\*\*ADO Feature\*\*:\s*#?(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=ado-spec-commit-sync.js.map