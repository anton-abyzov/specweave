import { readFile } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import { execFileNoThrow } from "../../../../../src/utils/execFileNoThrow.js";
async function postACProgressComments(incrementId, affectedUSIds, specPath, options) {
  const result = { posted: [], errors: [] };
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
  for (const usId of affectedUSIds) {
    const link = issueLinks[usId];
    if (!link) {
      continue;
    }
    const acStates = parseACStatesForUS(content, usId);
    const allComplete = acStates.length > 0 && acStates.every((ac) => ac.completed);
    if (!allComplete) {
      const commentBody = buildProgressCommentForUS(incrementId, usId, acStates);
      const execResult = await execFileNoThrow(
        "gh",
        ["issue", "comment", String(link.issueNumber), "--body", commentBody, "-R", repoSlug],
        env ? { env } : {}
      );
      if (execResult.success) {
        result.posted.push({ usId, issueNumber: link.issueNumber });
      } else {
        result.errors.push({
          usId,
          error: execResult.stderr || "Unknown error posting comment"
        });
      }
    }
    if (acStates.length > 0) {
      try {
        await patchIssueBodyCheckboxes(link.issueNumber, acStates, repoSlug, env);
      } catch (patchErr) {
        result.errors.push({
          usId,
          error: `body-patch: ${patchErr instanceof Error ? patchErr.message : String(patchErr)}`
        });
      }
    }
  }
  return result;
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
function parseUSIdParts(usId) {
  const compoundMatch = usId.match(/^US-([A-Z]+)-(\d+)$/);
  if (compoundMatch) {
    return { prefix: compoundMatch[1], num: parseInt(compoundMatch[2], 10) };
  }
  const simpleMatch = usId.match(/^US-(\d+)$/);
  if (simpleMatch) {
    return { num: parseInt(simpleMatch[1], 10) };
  }
  const fallback = usId.match(/(\d+)$/);
  return { num: fallback ? parseInt(fallback[1], 10) : 0 };
}
function buildACPrefix(usId) {
  const { prefix, num } = parseUSIdParts(usId);
  return prefix ? `AC-${prefix}-US${num}-` : `AC-US${num}-`;
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
function buildProgressCommentForUS(incrementId, usId, acStates) {
  const total = acStates.length;
  const completed = acStates.filter((ac) => ac.completed).length;
  const percentage = total > 0 ? Math.round(completed / total * 100) : 0;
  let comment = `**Progress Update** \u2014 ${usId} (Increment ${incrementId})

`;
  comment += `**Status**: ${completed}/${total} ACs complete (${percentage}%)

`;
  if (completed > 0) {
    comment += `**Completed**:
`;
    for (const ac of acStates.filter((a) => a.completed)) {
      comment += `- [x] **${ac.id}**: ${ac.description}
`;
    }
    comment += "\n";
  }
  if (completed < total) {
    comment += `**Remaining**:
`;
    for (const ac of acStates.filter((a) => !a.completed)) {
      comment += `- [ ] **${ac.id}**: ${ac.description}
`;
    }
    comment += "\n";
  }
  comment += `---
`;
  comment += `Auto-synced by SpecWeave | ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
`;
  return comment;
}
async function patchIssueBodyCheckboxes(issueNumber, acStates, repoSlug, env) {
  const acMap = new Map(acStates.map((ac) => [ac.id, ac.completed]));
  const fetchResult = await execFileNoThrow(
    "gh",
    ["issue", "view", String(issueNumber), "--json", "body", "-q", ".body", "-R", repoSlug],
    env ? { env } : {}
  );
  if (!fetchResult.success || !fetchResult.stdout) return;
  const body = fetchResult.stdout;
  const patchedBody = body.replace(
    /^(- \[)[ x](\] (?:\*\*)?)(AC-[A-Z0-9]+-\d+)((?:\*\*)?: .+)$/gm,
    (_match, prefix, mid, acId, suffix) => {
      const completed = acMap.get(acId);
      if (completed !== void 0) {
        return `${prefix}${completed ? "x" : " "}${mid}${acId}${suffix}`;
      }
      return _match;
    }
  );
  if (patchedBody === body) return;
  const editResult = await execFileNoThrow(
    "gh",
    ["issue", "edit", String(issueNumber), "--body", patchedBody, "-R", repoSlug],
    env ? { env } : {}
  );
  if (!editResult.success) {
    throw new Error(editResult.stderr || "Failed to update issue body");
  }
}
export {
  postACProgressComments
};
