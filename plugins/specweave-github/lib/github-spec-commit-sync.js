import { GitHubClientV2 } from "./github-client-v2.js";
import {
  getRecentCommits,
  detectRepository,
  getCommitUrl,
  findPRForCommit,
  getLastSyncCommit,
  updateLastSyncCommit
} from "../../../src/utils/git-utils.js";
import {
  getSpecTaskMapping,
  getCompletedUserStories
} from "../../../src/core/spec-task-mapper.js";
import {
  buildUserStoryComment,
  buildCommitBatchComment,
  buildShortComment,
  generateSmartSummary
} from "../../../src/core/comment-builder.js";
import path from "path";
import fs from "fs/promises";
async function syncSpecCommitsToGitHub(options) {
  const { incrementPath, dryRun = false, verbose = false } = options;
  const result = {
    success: true,
    commentsPosted: 0,
    errors: [],
    commits: [],
    userStories: []
  };
  try {
    const metadataPath = path.join(incrementPath, "metadata.json");
    let metadata;
    try {
      metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
    } catch {
      result.errors.push("No metadata.json found");
      return result;
    }
    const githubIssue = metadata.github?.issue;
    if (!githubIssue) {
      if (verbose) {
        console.log("No GitHub issue linked to increment");
      }
      return result;
    }
    const repo = await detectRepository("origin", incrementPath);
    if (!repo || repo.provider !== "github") {
      result.errors.push("Not a GitHub repository or remote not found");
      result.success = false;
      return result;
    }
    const mapping = await getSpecTaskMapping(incrementPath);
    if (!mapping) {
      if (verbose) {
        console.log("No spec mapping found for increment");
      }
      return result;
    }
    const completedUserStories = getCompletedUserStories(mapping);
    if (completedUserStories.length === 0) {
      if (verbose) {
        console.log("No completed user stories");
      }
      return result;
    }
    result.userStories = completedUserStories;
    const lastSyncCommit = await getLastSyncCommit(metadataPath);
    const commits = lastSyncCommit ? await getRecentCommits(void 0, lastSyncCommit, incrementPath) : await getRecentCommits("7.days", void 0, incrementPath);
    if (commits.length === 0) {
      if (verbose) {
        console.log("No new commits since last sync");
      }
      return result;
    }
    result.commits = commits;
    for (const commit of commits) {
      commit.url = getCommitUrl(commit, repo);
    }
    const client = GitHubClientV2.fromRepo(repo.owner, repo.repo);
    for (const userStory of completedUserStories) {
      try {
        const relatedTasks = mapping.tasks.filter(
          (t) => t.userStories.includes(userStory.id)
        );
        const pullRequests = [];
        for (const commit of commits.slice(0, 3)) {
          const pr = await findPRForCommit(commit.sha, repo.owner, repo.repo);
          if (pr && !pullRequests.find((p) => p.number === pr.number)) {
            pullRequests.push(pr);
          }
        }
        const summary = generateSmartSummary(commits, relatedTasks);
        const commentContent = {
          userStory,
          tasks: relatedTasks,
          commits,
          pullRequests,
          summary
        };
        const formattedComment = buildUserStoryComment(commentContent, repo);
        if (verbose) {
          console.log(`
Comment for ${userStory.id}:`);
          console.log(formattedComment.markdown);
          console.log("\n---\n");
        }
        if (!dryRun) {
          await client.addComment(githubIssue, formattedComment.markdown);
          result.commentsPosted++;
        } else {
          result.commentsPosted++;
        }
      } catch (error) {
        result.errors.push(`Failed to post comment for ${userStory.id}: ${error.message}`);
      }
    }
    if (completedUserStories.length === 0 && commits.length > 0) {
      try {
        const summary = `Work in progress: ${commits.length} commit${commits.length > 1 ? "s" : ""}`;
        const formattedComment = buildShortComment(commits, repo, summary);
        if (verbose) {
          console.log(`
Short update comment:`);
          console.log(formattedComment.markdown);
          console.log("\n---\n");
        }
        if (!dryRun) {
          await client.addComment(githubIssue, formattedComment.markdown);
          result.commentsPosted++;
        } else {
          result.commentsPosted++;
        }
      } catch (error) {
        result.errors.push(`Failed to post short update: ${error.message}`);
      }
    }
    if (!dryRun && commits.length > 0) {
      await updateLastSyncCommit(metadataPath, commits[0].sha);
    }
  } catch (error) {
    result.success = false;
    result.errors.push(error.message);
  }
  return result;
}
async function postCommitBatchUpdate(incrementPath, commits, issueNumber, repo, dryRun = false) {
  try {
    const client = GitHubClientV2.fromRepo(repo.owner, repo.repo);
    for (const commit of commits) {
      commit.url = getCommitUrl(commit, repo);
    }
    const formattedComment = buildCommitBatchComment(commits, repo, true);
    if (!dryRun) {
      await client.addComment(issueNumber, formattedComment.markdown);
    }
    return true;
  } catch (error) {
    console.error(`Failed to post batch update: ${error.message}`);
    return false;
  }
}
async function isSpecCommitSyncEnabled(projectRoot) {
  try {
    const configPath = path.join(projectRoot, ".specweave", "config.json");
    const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
    return config.sync?.settings?.postCommitComments !== false;
  } catch {
    return true;
  }
}
async function getGitHubIssueForSpec(specPath) {
  try {
    const content = await fs.readFile(specPath, "utf-8");
    const match = content.match(/github\.com\/[\w-]+\/[\w-]+\/issues\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}
export {
  getGitHubIssueForSpec,
  isSpecCommitSyncEnabled,
  postCommitBatchUpdate,
  syncSpecCommitsToGitHub
};
