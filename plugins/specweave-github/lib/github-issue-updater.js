import fs from "fs-extra";
import path from "path";
import { execFileNoThrow } from "../../../src/utils/execFileNoThrow.js";
async function updateIssueLivingDocs(issueNumber, livingDocs, owner, repo) {
  console.log(`\u{1F4DD} Updating GitHub issue #${issueNumber} with living docs...`);
  const currentBody = await getIssueBody(issueNumber, owner, repo);
  const livingDocsSection = buildLivingDocsSection(livingDocs, owner, repo);
  const updatedBody = updateBodyWithLivingDocs(currentBody, livingDocsSection);
  await updateIssueBody(issueNumber, updatedBody, owner, repo);
  console.log(`\u2705 Living docs section updated in issue #${issueNumber}`);
}
async function postArchitectureComment(issueNumber, docPath, owner, repo) {
  const docType = getDocType(docPath);
  const docName = path.basename(docPath, ".md");
  const docUrl = `https://github.com/${owner}/${repo}/blob/develop/${docPath}`;
  const comment = `
\u{1F3D7}\uFE0F **${docType} Created**

**Document**: [${docName}](${docUrl})

**Path**: \`${docPath}\`

---
\u{1F916} Auto-updated by SpecWeave
`.trim();
  await postComment(issueNumber, comment, owner, repo);
  console.log(`\u2705 Posted ${docType} comment to issue #${issueNumber}`);
}
async function postScopeChangeComment(issueNumber, changes, owner, repo) {
  const parts = ["**Scope Change Detected**", ""];
  if (changes.added && changes.added.length > 0) {
    parts.push("**Added**:");
    changes.added.forEach((item) => parts.push(`- \u2705 ${item}`));
    parts.push("");
  }
  if (changes.removed && changes.removed.length > 0) {
    parts.push("**Removed**:");
    changes.removed.forEach((item) => parts.push(`- \u274C ${item}`));
    parts.push("");
  }
  if (changes.modified && changes.modified.length > 0) {
    parts.push("**Modified**:");
    changes.modified.forEach((item) => parts.push(`- \u{1F504} ${item}`));
    parts.push("");
  }
  if (changes.reason) {
    parts.push(`**Reason**: ${changes.reason}`);
    parts.push("");
  }
  if (changes.impact) {
    parts.push(`**Impact**: ${changes.impact}`);
    parts.push("");
  }
  parts.push("---");
  parts.push("\u{1F916} Auto-updated by SpecWeave");
  await postComment(issueNumber, parts.join("\n"), owner, repo);
  console.log(`\u2705 Posted scope change comment to issue #${issueNumber}`);
}
async function postStatusChangeComment(issueNumber, status, reason, owner, repo) {
  const emoji = {
    paused: "\u23F8\uFE0F",
    resumed: "\u25B6\uFE0F",
    abandoned: "\u{1F5D1}\uFE0F"
  }[status];
  const title = {
    paused: "Increment Paused",
    resumed: "Increment Resumed",
    abandoned: "Increment Abandoned"
  }[status];
  const comment = `
${emoji} **${title}**

**Reason**: ${reason}

**Timestamp**: ${(/* @__PURE__ */ new Date()).toISOString()}

---
\u{1F916} Auto-updated by SpecWeave
`.trim();
  await postComment(issueNumber, comment, owner, repo);
  console.log(`\u2705 Posted ${status} comment to issue #${issueNumber}`);
}
async function collectLivingDocs(incrementId) {
  const livingDocs = {
    specs: [],
    architecture: [],
    diagrams: []
  };
  const specsDir = path.join(process.cwd(), ".specweave/docs/internal/specs");
  if (await fs.pathExists(specsDir)) {
    const specFiles = await fs.readdir(specsDir);
    for (const file of specFiles) {
      if (file.endsWith(".md") && !file.startsWith("README")) {
        livingDocs.specs.push(path.join(".specweave/docs/internal/specs", file));
      }
    }
  }
  const archDir = path.join(process.cwd(), ".specweave/docs/internal/architecture");
  if (await fs.pathExists(archDir)) {
    const adrDir = path.join(archDir, "adr");
    if (await fs.pathExists(adrDir)) {
      const adrFiles = await fs.readdir(adrDir);
      for (const file of adrFiles) {
        if (file.endsWith(".md")) {
          livingDocs.architecture.push(path.join(".specweave/docs/internal/architecture/adr", file));
        }
      }
    }
    const hldFiles = await fs.readdir(archDir);
    for (const file of hldFiles) {
      if (file.startsWith("hld-") && file.endsWith(".md")) {
        livingDocs.architecture.push(path.join(".specweave/docs/internal/architecture", file));
      }
    }
  }
  const diagramsDir = path.join(process.cwd(), ".specweave/docs/internal/architecture/diagrams");
  if (await fs.pathExists(diagramsDir)) {
    const diagramFiles = await fs.readdir(diagramsDir);
    for (const file of diagramFiles) {
      if (file.endsWith(".mmd") || file.endsWith(".svg")) {
        livingDocs.diagrams.push(path.join(".specweave/docs/internal/architecture/diagrams", file));
      }
    }
  }
  return livingDocs;
}
async function loadIncrementMetadata(incrementId) {
  const metadataPath = path.join(
    process.cwd(),
    ".specweave/increments",
    incrementId,
    "metadata.json"
  );
  if (!await fs.pathExists(metadataPath)) {
    return null;
  }
  return await fs.readJson(metadataPath);
}
async function detectRepo() {
  try {
    const result = await execFileNoThrow("git", ["remote", "get-url", "origin"]);
    if (result.exitCode !== 0) {
      return null;
    }
    const remote = result.stdout.trim();
    const match = remote.match(/github\.com[:/](.+)\/(.+?)(?:\.git)?$/);
    if (!match) {
      return null;
    }
    return {
      owner: match[1],
      repo: match[2]
    };
  } catch (error) {
    return null;
  }
}
async function getIssueBody(issueNumber, owner, repo) {
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
  return result.stdout.trim();
}
async function updateIssueBody(issueNumber, body, owner, repo) {
  const result = await execFileNoThrow("gh", [
    "issue",
    "edit",
    String(issueNumber),
    "--repo",
    `${owner}/${repo}`,
    "--body",
    body
  ]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to update issue body: ${result.stderr}`);
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
function buildLivingDocsSection(livingDocs, owner, repo) {
  const parts = ["## \u{1F4DA} Living Documentation", ""];
  if (livingDocs.specs.length > 0) {
    parts.push("**Specifications**:");
    livingDocs.specs.forEach((spec) => {
      const name = path.basename(spec, ".md");
      const url = `https://github.com/${owner}/${repo}/blob/develop/${spec}`;
      parts.push(`- [${name}](${url})`);
    });
    parts.push("");
  }
  if (livingDocs.architecture.length > 0) {
    parts.push("**Architecture**:");
    livingDocs.architecture.forEach((doc) => {
      const name = path.basename(doc, ".md");
      const url = `https://github.com/${owner}/${repo}/blob/develop/${doc}`;
      parts.push(`- [${name}](${url})`);
    });
    parts.push("");
  }
  if (livingDocs.diagrams.length > 0) {
    parts.push("**Diagrams**:");
    livingDocs.diagrams.forEach((diagram) => {
      const name = path.basename(diagram);
      const url = `https://github.com/${owner}/${repo}/blob/develop/${diagram}`;
      parts.push(`- [${name}](${url})`);
    });
    parts.push("");
  }
  parts.push("---");
  return parts.join("\n");
}
function updateBodyWithLivingDocs(currentBody, livingDocsSection) {
  const marker = "## \u{1F4DA} Living Documentation";
  if (currentBody.includes(marker)) {
    const beforeMarker = currentBody.substring(0, currentBody.indexOf(marker));
    const afterMarker = currentBody.substring(currentBody.indexOf(marker));
    const nextSection = afterMarker.indexOf("\n## ", 1);
    const replacement = nextSection > 0 ? afterMarker.substring(0, nextSection) : afterMarker;
    return beforeMarker + livingDocsSection + (nextSection > 0 ? afterMarker.substring(nextSection) : "");
  } else {
    return currentBody + "\n\n" + livingDocsSection;
  }
}
function getDocType(docPath) {
  if (docPath.includes("/adr/")) {
    return "Architecture Decision Record (ADR)";
  }
  if (docPath.includes("/diagrams/")) {
    return "Architecture Diagram";
  }
  if (docPath.startsWith("hld-")) {
    return "High-Level Design (HLD)";
  }
  if (docPath.includes("/specs/")) {
    return "Specification";
  }
  return "Documentation";
}
export {
  collectLivingDocs,
  detectRepo,
  loadIncrementMetadata,
  postArchitectureComment,
  postScopeChangeComment,
  postStatusChangeComment,
  updateIssueLivingDocs
};
