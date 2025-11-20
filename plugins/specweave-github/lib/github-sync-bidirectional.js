import fs from "fs-extra";
import path from "path";
import { execFileNoThrow } from "../../../src/utils/execFileNoThrow.js";
import {
  loadIncrementMetadata,
  detectRepo
} from "./github-issue-updater.js";
async function syncFromGitHub(incrementId) {
  console.log(`
\u{1F504} Syncing from GitHub for increment: ${incrementId}`);
  try {
    const metadata = await loadIncrementMetadata(incrementId);
    if (!metadata?.github?.issue) {
      console.log("\u2139\uFE0F  No GitHub issue linked, nothing to sync");
      return;
    }
    const repoInfo = await detectRepo();
    if (!repoInfo) {
      console.log("\u26A0\uFE0F  Could not detect GitHub repository");
      return;
    }
    const { owner, repo } = repoInfo;
    const issueNumber = metadata.github.issue;
    console.log(`   Syncing from ${owner}/${repo}#${issueNumber}`);
    const githubState = await fetchGitHubIssueState(issueNumber, owner, repo);
    const conflicts = detectConflicts(metadata, githubState);
    if (conflicts.length === 0) {
      console.log("\u2705 No conflicts - GitHub and SpecWeave in sync");
      return;
    }
    console.log(`\u26A0\uFE0F  Detected ${conflicts.length} conflict(s)`);
    await resolveConflicts(incrementId, metadata, githubState, conflicts);
    await syncComments(incrementId, githubState.comments);
    await updateMetadata(incrementId, githubState);
    console.log("\u2705 Three-permission sync complete");
  } catch (error) {
    console.error("\u274C Error syncing from GitHub:", error);
    throw error;
  }
}
async function fetchGitHubIssueState(issueNumber, owner, repo) {
  const issueResult = await execFileNoThrow("gh", [
    "issue",
    "view",
    String(issueNumber),
    "--repo",
    `${owner}/${repo}`,
    "--json",
    "number,title,body,state,labels,assignees,milestone,updatedAt"
  ]);
  if (issueResult.exitCode !== 0) {
    throw new Error(`Failed to fetch issue: ${issueResult.stderr}`);
  }
  const issue = JSON.parse(issueResult.stdout);
  const commentsResult = await execFileNoThrow("gh", [
    "api",
    `repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    "--jq",
    ".[] | {id: .id, author: .user.login, body: .body, created_at: .created_at}"
  ]);
  let comments = [];
  if (commentsResult.exitCode === 0 && commentsResult.stdout.trim()) {
    const commentLines = commentsResult.stdout.trim().split("\n");
    comments = commentLines.map((line) => JSON.parse(line));
  }
  return {
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    labels: issue.labels?.map((l) => l.name) || [],
    assignees: issue.assignees?.map((a) => a.login) || [],
    milestone: issue.milestone?.title,
    comments,
    updated_at: issue.updatedAt
  };
}
function detectConflicts(metadata, githubState) {
  const conflicts = [];
  const specweaveStatus = metadata.status;
  const githubStatus = githubState.state;
  const expectedGitHubStatus = mapSpecWeaveStatusToGitHub(specweaveStatus);
  if (githubStatus !== expectedGitHubStatus) {
    conflicts.push({
      type: "status",
      githubValue: githubStatus,
      specweaveValue: specweaveStatus,
      resolution: "prompt"
      // Ask user
    });
  }
  return conflicts;
}
async function resolveConflicts(incrementId, metadata, githubState, conflicts) {
  for (const conflict of conflicts) {
    console.log(`
\u26A0\uFE0F  Conflict detected: ${conflict.type}`);
    console.log(`   GitHub: ${conflict.githubValue}`);
    console.log(`   SpecWeave: ${conflict.specweaveValue}`);
    if (conflict.type === "status") {
      await resolveStatusConflict(incrementId, metadata, githubState);
    }
  }
}
async function resolveStatusConflict(incrementId, metadata, githubState) {
  const specweaveStatus = metadata.status;
  const githubStatus = githubState.state;
  if (githubStatus === "closed" && specweaveStatus === "active") {
    console.log(`
\u26A0\uFE0F  **CONFLICT**: GitHub issue closed but SpecWeave increment still active!`);
    console.log(`   Recommendation: Run /specweave:done ${incrementId} to close increment`);
    console.log(`   Or reopen issue on GitHub if work is not complete`);
  }
  if (githubStatus === "open" && specweaveStatus === "completed") {
    console.log(`
\u26A0\uFE0F  **CONFLICT**: SpecWeave increment completed but GitHub issue still open!`);
    console.log(`   Recommendation: Close GitHub issue #${metadata.github.issue}`);
  }
  if (githubStatus === "open" && specweaveStatus === "paused") {
    console.log(`
\u2139\uFE0F  GitHub issue open, SpecWeave increment paused (OK)`);
  }
  if (githubStatus === "open" && specweaveStatus === "abandoned") {
    console.log(`
\u26A0\uFE0F  **CONFLICT**: SpecWeave increment abandoned but GitHub issue still open!`);
    console.log(`   Recommendation: Close GitHub issue #${metadata.github.issue} with reason`);
  }
}
async function syncComments(incrementId, comments) {
  if (comments.length === 0) {
    console.log("\u2139\uFE0F  No comments to sync");
    return;
  }
  const commentsPath = path.join(
    process.cwd(),
    ".specweave/increments",
    incrementId,
    "logs/github-comments.md"
  );
  await fs.ensureFile(commentsPath);
  let existingContent = "";
  if (await fs.pathExists(commentsPath)) {
    existingContent = await fs.readFile(commentsPath, "utf-8");
  }
  const existingIds = /* @__PURE__ */ new Set();
  const idMatches = existingContent.matchAll(/<!-- comment-id: (\d+) -->/g);
  for (const match of idMatches) {
    existingIds.add(parseInt(match[1], 10));
  }
  const newComments = comments.filter((c) => !existingIds.has(c.id));
  if (newComments.length === 0) {
    console.log("\u2139\uFE0F  All comments already synced");
    return;
  }
  console.log(`\u{1F4DD} Syncing ${newComments.length} new comment(s)`);
  const commentsMarkdown = newComments.map((comment) => `
---

<!-- comment-id: ${comment.id} -->

**Author**: @${comment.author}
**Date**: ${new Date(comment.created_at).toLocaleString()}

${comment.body}
`.trim()).join("\n\n");
  await fs.appendFile(
    commentsPath,
    (existingContent ? "\n\n" : "") + commentsMarkdown
  );
  console.log(`\u2705 Comments saved to: logs/github-comments.md`);
}
async function updateMetadata(incrementId, githubState) {
  const metadataPath = path.join(
    process.cwd(),
    ".specweave/increments",
    incrementId,
    "metadata.json"
  );
  const metadata = await fs.readJson(metadataPath);
  metadata.github = metadata.github || {};
  metadata.github.synced = (/* @__PURE__ */ new Date()).toISOString();
  metadata.github.lastUpdated = githubState.updated_at;
  metadata.github.state = githubState.state;
  await fs.writeJson(metadataPath, metadata, { spaces: 2 });
  console.log("\u2705 Metadata updated");
}
function mapSpecWeaveStatusToGitHub(status) {
  switch (status) {
    case "completed":
    case "abandoned":
      return "closed";
    case "active":
    case "paused":
    case "planning":
    default:
      return "open";
  }
}
export {
  syncFromGitHub
};
