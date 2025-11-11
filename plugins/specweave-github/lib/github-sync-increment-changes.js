import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import {
  loadIncrementMetadata,
  detectRepo,
  postScopeChangeComment
} from "./github-issue-updater.js";
import { execFileNoThrow } from "../../../src/utils/execFileNoThrow.js";
async function syncIncrementChanges(incrementId, changedFile) {
  console.log(`
\u{1F504} Syncing ${changedFile} changes to GitHub...`);
  try {
    const metadata = await loadIncrementMetadata(incrementId);
    if (!metadata?.github?.issue) {
      console.log("\u2139\uFE0F  No GitHub issue linked, skipping sync");
      return;
    }
    const repoInfo = await detectRepo();
    if (!repoInfo) {
      console.log("\u26A0\uFE0F  Could not detect GitHub repository, skipping sync");
      return;
    }
    const { owner, repo } = repoInfo;
    const issueNumber = metadata.github.issue;
    switch (changedFile) {
      case "spec.md":
        await syncSpecChanges(incrementId, issueNumber, owner, repo);
        break;
      case "plan.md":
        await syncPlanChanges(incrementId, issueNumber, owner, repo);
        break;
      case "tasks.md":
        await syncTasksChanges(incrementId, issueNumber, owner, repo);
        break;
    }
    console.log(`\u2705 ${changedFile} changes synced to issue #${issueNumber}`);
  } catch (error) {
    console.error(`\u274C Error syncing ${changedFile}:`, error);
    console.error("   (Non-blocking - continuing...)");
  }
}
async function syncSpecChanges(incrementId, issueNumber, owner, repo) {
  const specPath = path.join(
    process.cwd(),
    ".specweave/increments",
    incrementId,
    "spec.md"
  );
  const changes = await detectSpecChanges(specPath);
  if (changes.added.length === 0 && changes.removed.length === 0 && changes.modified.length === 0) {
    console.log("\u2139\uFE0F  No significant spec changes detected");
    return;
  }
  await postScopeChangeComment(
    issueNumber,
    {
      added: changes.added,
      removed: changes.removed,
      modified: changes.modified,
      reason: "Spec updated",
      impact: estimateImpact(changes)
    },
    owner,
    repo
  );
  const title = await extractSpecTitle(specPath);
  if (title) {
    await updateIssueTitle(issueNumber, title, owner, repo);
  }
}
async function syncPlanChanges(incrementId, issueNumber, owner, repo) {
  const comment = `
\u{1F3D7}\uFE0F **Architecture Plan Updated**

The implementation plan has been updated. See [\`plan.md\`](https://github.com/${owner}/${repo}/blob/develop/.specweave/increments/${incrementId}/plan.md) for details.

**Timestamp**: ${(/* @__PURE__ */ new Date()).toISOString()}

---
\u{1F916} Auto-updated by SpecWeave
`.trim();
  await postComment(issueNumber, comment, owner, repo);
}
async function syncTasksChanges(incrementId, issueNumber, owner, repo) {
  const tasksPath = path.join(
    process.cwd(),
    ".specweave/increments",
    incrementId,
    "tasks.md"
  );
  const tasks = await extractTasks(tasksPath);
  await updateIssueTaskChecklist(issueNumber, tasks, owner, repo);
  const comment = `
\u{1F4CB} **Task List Updated**

Tasks have been updated. Total tasks: ${tasks.length}

**Timestamp**: ${(/* @__PURE__ */ new Date()).toISOString()}

---
\u{1F916} Auto-updated by SpecWeave
`.trim();
  await postComment(issueNumber, comment, owner, repo);
}
async function detectSpecChanges(specPath) {
  const changes = {
    added: [],
    removed: [],
    modified: []
  };
  try {
    const diff = execSync(`git diff HEAD~1 "${specPath}" 2>/dev/null || true`, {
      encoding: "utf-8",
      cwd: process.cwd()
    });
    if (!diff) {
      return changes;
    }
    const lines = diff.split("\n");
    for (const line of lines) {
      if (line.startsWith("+") && line.includes("US-")) {
        const match = line.match(/US-\d+:([^(]+)/);
        if (match) {
          changes.added.push(match[1].trim());
        }
      } else if (line.startsWith("-") && line.includes("US-")) {
        const match = line.match(/US-\d+:([^(]+)/);
        if (match) {
          changes.removed.push(match[1].trim());
        }
      }
    }
  } catch (error) {
    console.warn("\u26A0\uFE0F  Could not detect spec changes:", error);
  }
  return changes;
}
async function extractSpecTitle(specPath) {
  try {
    const content = await fs.readFile(specPath, "utf-8");
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  } catch (error) {
    return null;
  }
}
async function extractTasks(tasksPath) {
  try {
    const content = await fs.readFile(tasksPath, "utf-8");
    const tasks = [];
    const lines = content.split("\n");
    for (const line of lines) {
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
function estimateImpact(changes) {
  const addedCount = changes.added.length;
  const removedCount = changes.removed.length;
  if (addedCount > removedCount) {
    return `+${addedCount * 8} hours (${addedCount} user stories added)`;
  } else if (removedCount > addedCount) {
    return `-${removedCount * 8} hours (${removedCount} user stories removed)`;
  } else {
    return "Neutral (scope adjusted)";
  }
}
async function updateIssueTitle(issueNumber, title, owner, repo) {
  const result = await execFileNoThrow("gh", [
    "issue",
    "edit",
    String(issueNumber),
    "--repo",
    `${owner}/${repo}`,
    "--title",
    title
  ]);
  if (result.exitCode !== 0) {
    console.warn(`\u26A0\uFE0F  Could not update issue title: ${result.stderr}`);
  }
}
async function updateIssueTaskChecklist(issueNumber, tasks, owner, repo) {
  const result = await execFileNoThrow("gh", [
    "issue",
    "view",
    String(issueNumber),
    "--repo",
    `${owner}/${repo}`,
    "--json",
    "body",
    "-q",
    ".body"
  ]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to get issue body: ${result.stderr}`);
  }
  const currentBody = result.stdout.trim();
  const taskChecklist = tasks.map((task) => `- [ ] ${task}`).join("\n");
  const taskSectionRegex = /## Tasks\n\n[\s\S]*?(?=\n## |$)/;
  const newTaskSection = `## Tasks

Progress: 0/${tasks.length} tasks (0%)

${taskChecklist}
`;
  let updatedBody;
  if (taskSectionRegex.test(currentBody)) {
    updatedBody = currentBody.replace(taskSectionRegex, newTaskSection);
  } else {
    updatedBody = currentBody + "\n\n" + newTaskSection;
  }
  const updateResult = await execFileNoThrow("gh", [
    "issue",
    "edit",
    String(issueNumber),
    "--repo",
    `${owner}/${repo}`,
    "--body",
    updatedBody
  ]);
  if (updateResult.exitCode !== 0) {
    throw new Error(`Failed to update issue body: ${updateResult.stderr}`);
  }
}
async function postComment(issueNumber, comment, owner, repo) {
  const result = await execFileNoThrow("gh", [
    "issue",
    "comment",
    String(issueNumber),
    "--repo",
    `${owner}/${repo}`,
    "--body",
    comment
  ]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to post comment: ${result.stderr}`);
  }
}
export {
  syncIncrementChanges
};
