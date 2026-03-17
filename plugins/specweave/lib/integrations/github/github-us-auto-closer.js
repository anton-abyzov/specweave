import { readFile } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import { execFileNoThrow } from "../../../../../src/utils/execFileNoThrow.js";
async function autoCloseCompletedUserStories(incrementId, affectedUSIds, specPath, options) {
  const result = { closed: [], skipped: [], errors: [] };
  if (affectedUSIds.length === 0) {
    return result;
  }
  let content;
  try {
    content = await readFile(specPath, "utf-8");
  } catch (err) {
    result.errors.push({
      usId: affectedUSIds[0],
      error: err instanceof Error ? err.message : String(err)
    });
    return result;
  }
  const issueLinks = await parseIssueLinks(specPath);
  const repoSlug = `${options.owner}/${options.repo}`;
  const env = options.token ? { GH_TOKEN: options.token } : void 0;
  const execOpts = env ? { env } : {};
  for (const usId of affectedUSIds) {
    const acStates = parseACStatesForUS(content, usId);
    if (acStates.length === 0 || acStates.some((ac) => !ac.completed)) {
      result.skipped.push({ usId, reason: "incomplete-acs" });
      continue;
    }
    const link = issueLinks[usId];
    if (!link) {
      result.skipped.push({ usId, reason: "no-issue-link" });
      continue;
    }
    const issueNum = String(link.issueNumber);
    const viewResult = await execFileNoThrow(
      "gh",
      ["issue", "view", issueNum, "--json", "state", "-R", repoSlug],
      execOpts
    );
    if (viewResult.success) {
      try {
        const issueState = JSON.parse(viewResult.stdout);
        if (issueState.state === "CLOSED") {
          result.skipped.push({ usId, reason: "already-closed" });
          continue;
        }
      } catch {
      }
    }
    const commentBody = buildCompletionComment(incrementId, usId, acStates);
    await execFileNoThrow(
      "gh",
      ["issue", "comment", issueNum, "--body", commentBody, "-R", repoSlug],
      execOpts
    );
    const closeResult = await execFileNoThrow(
      "gh",
      ["issue", "close", issueNum, "-R", repoSlug],
      execOpts
    );
    if (closeResult.success) {
      await ensureLabelExists("status:completed", repoSlug, execOpts, {
        color: "6f42c1",
        description: "Completed work item"
      });
      await execFileNoThrow(
        "gh",
        ["issue", "edit", issueNum, "--remove-label", "status:active", "--add-label", "status:completed", "-R", repoSlug],
        execOpts
      );
      result.closed.push({ usId, issueNumber: link.issueNumber });
    } else {
      result.errors.push({
        usId,
        error: closeResult.stderr || "Unknown error closing issue"
      });
    }
  }
  return result;
}
function buildCompletionComment(incrementId, usId, acStates) {
  const total = acStates.length;
  let comment = `**All acceptance criteria completed** \u2014 ${usId} (Increment ${incrementId})

`;
  comment += `**Status**: ${total}/${total} ACs complete (100%)

`;
  comment += `**Completed**:
`;
  for (const ac of acStates) {
    comment += `- [x] **${ac.id}**: ${ac.description}
`;
  }
  comment += "\n";
  comment += `---
`;
  comment += `Auto-closed by SpecWeave | ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
`;
  return comment;
}
async function parseIssueLinks(specPath) {
  const links = {};
  try {
    const metadataPath = path.join(path.dirname(specPath), "metadata.json");
    if (!existsSync(metadataPath)) return links;
    const raw = await readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(raw);
    if (metadata.github?.issues && Array.isArray(metadata.github.issues)) {
      for (const entry of metadata.github.issues) {
        if (entry.userStory && entry.number) {
          links[entry.userStory] = {
            issueNumber: entry.number,
            issueUrl: entry.url || ""
          };
        }
      }
    }
    if (metadata.externalLinks?.github?.issues) {
      const issues = metadata.externalLinks.github.issues;
      for (const [usId, data] of Object.entries(issues)) {
        const issueData = data;
        if (issueData.issueNumber) {
          links[usId] = {
            issueNumber: issueData.issueNumber,
            issueUrl: issueData.issueUrl || ""
          };
        }
      }
    }
  } catch {
  }
  return links;
}
async function ensureLabelExists(labelName, repoSlug, execOpts, defaults) {
  const checkResult = await execFileNoThrow(
    "gh",
    ["label", "list", "--repo", repoSlug, "--search", labelName, "--json", "name", "--jq", ".[].name"],
    execOpts
  );
  if (checkResult.success) {
    const existing = (checkResult.stdout || "").trim().split("\n").filter(Boolean);
    if (existing.some((name) => name === labelName)) {
      return;
    }
  }
  const createResult = await execFileNoThrow(
    "gh",
    ["label", "create", labelName, "--repo", repoSlug, "--color", defaults.color, "--description", defaults.description, "--force"],
    execOpts
  );
  if (!createResult.success) {
    console.warn(`\u26A0\uFE0F  Could not create label "${labelName}": ${createResult.stderr || "unknown error"} (continuing without label)`);
  }
}
function buildACPrefix(usId) {
  const compoundMatch = usId.match(/^US-([A-Z]+)-(\d+)$/);
  if (compoundMatch) {
    return `AC-${compoundMatch[1]}-US${parseInt(compoundMatch[2], 10)}-`;
  }
  const simpleMatch = usId.match(/^US-(\d+)$/);
  if (simpleMatch) {
    return `AC-US${parseInt(simpleMatch[1], 10)}-`;
  }
  const fallback = usId.match(/(\d+)$/);
  const num = fallback ? parseInt(fallback[1], 10) : 0;
  return `AC-US${num}-`;
}
function parseACStatesForUS(content, usId) {
  const states = [];
  const acPrefix = buildACPrefix(usId);
  const escapedPrefix = acPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const acPattern = new RegExp(
    `- \\[([ x])\\] (?:\\*\\*)?${escapedPrefix}(\\d+)(?:\\*\\*)?:\\s*(.+)`,
    "g"
  );
  let match;
  while ((match = acPattern.exec(content)) !== null) {
    states.push({
      id: `${acPrefix}${match[2]}`,
      description: match[3].trim(),
      completed: match[1] === "x"
    });
  }
  return states;
}
export {
  autoCloseCompletedUserStories
};
