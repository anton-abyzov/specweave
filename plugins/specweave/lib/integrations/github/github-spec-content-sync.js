import { GitHubClientV2 } from "./github-client-v2.js";
import {
  parseSpecContent,
  detectContentChanges,
  buildExternalDescription,
  hasExternalLink,
  updateSpecWithExternalLink
} from "../../../../../src/core/specs/spec-content-sync.js";
import { ProgressCommentBuilder } from "./progress-comment-builder.js";
import path from "path";
import fs from "fs/promises";
async function getGitHubRepoForProject(project, specPath) {
  try {
    let currentDir = path.dirname(specPath);
    let configPath = path.join(currentDir, ".specweave", "config.json");
    while (!await fs.access(configPath).then(() => true).catch(() => false)) {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        return null;
      }
      currentDir = parentDir;
      configPath = path.join(currentDir, ".specweave", "config.json");
    }
    const configContent = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configContent);
    const projectConfig = config.specs?.projects?.[project];
    if (!projectConfig?.github) {
      return null;
    }
    return {
      owner: projectConfig.github.owner,
      repo: projectConfig.github.repo
    };
  } catch {
    return null;
  }
}
async function syncSpecContentToGitHub(options) {
  let { specPath, owner, repo, dryRun = false, verbose = false } = options;
  try {
    const spec = await parseSpecContent(specPath);
    if (!spec) {
      return {
        success: false,
        action: "error",
        error: "Failed to parse spec content"
      };
    }
    if (verbose) {
      console.log(`\u{1F4C4} Parsed spec: ${spec.identifier.compact}`);
      console.log(`   Project: ${spec.project}`);
      console.log(`   Title: ${spec.title}`);
      console.log(`   User Stories: ${spec.userStories.length}`);
    }
    if (!owner || !repo) {
      const repoConfig = await getGitHubRepoForProject(spec.project, specPath);
      if (!repoConfig) {
        return {
          success: false,
          action: "error",
          error: `No GitHub repository configured for project "${spec.project}". Add specs.projects.${spec.project}.github in config.json`
        };
      }
      owner = repoConfig.owner;
      repo = repoConfig.repo;
      if (verbose) {
        console.log(`   Auto-detected repo: ${owner}/${repo}`);
      }
    }
    const existingIssueNumber = await hasExternalLink(specPath, "github");
    const client = GitHubClientV2.fromRepo(owner, repo);
    if (existingIssueNumber) {
      return await updateGitHubIssue(client, spec, parseInt(existingIssueNumber), options);
    } else {
      return await createGitHubIssue(client, spec, options);
    }
  } catch (error) {
    return {
      success: false,
      action: "error",
      error: error.message
    };
  }
}
async function createGitHubIssue(client, spec, options) {
  const { specPath, dryRun, verbose } = options;
  try {
    const permissions = await loadSyncPermissions(specPath);
    if (!permissions.canCreate) {
      if (verbose) {
        console.log("   \u26A0\uFE0F  Skipping create - canUpsertInternalItems is disabled in config");
      }
      return {
        success: false,
        action: "skipped",
        error: "canUpsertInternalItems is disabled in .specweave/config.json"
      };
    }
    const titleId = spec.project === "_features" ? spec.identifier.display : spec.identifier.compact;
    const title = `[${titleId}] ${spec.title}`;
    const body = buildExternalDescription(spec);
    if (verbose) {
      console.log(`
\u{1F4DD} Creating GitHub issue:`);
      console.log(`   Title: ${title}`);
      console.log(`   Body length: ${body.length} chars`);
    }
    if (dryRun) {
      console.log("\n\u{1F50D} Dry run - would create issue:");
      console.log(`   Title: ${title}`);
      console.log(`   Body:
${body}`);
      return {
        success: true,
        action: "created",
        externalId: "DRY-RUN",
        externalUrl: "https://github.com/DRY-RUN"
      };
    }
    const labels = [
      "specweave",
      "spec",
      spec.project,
      // backend, frontend, mobile, etc.
      spec.metadata.priority || "P2"
    ].filter(Boolean);
    const issue = await client.createEpicIssue(title, body, void 0, labels);
    if (verbose) {
      console.log(`\u2705 Created issue #${issue.number}`);
      console.log(`   URL: ${issue.html_url}`);
    }
    await updateSpecWithExternalLink(
      specPath,
      "github",
      issue.number.toString(),
      issue.html_url
    );
    return {
      success: true,
      action: "created",
      externalId: issue.number.toString(),
      externalUrl: issue.html_url
    };
  } catch (error) {
    return {
      success: false,
      action: "error",
      error: `Failed to create GitHub issue: ${error.message}`
    };
  }
}
async function updateGitHubIssue(client, spec, issueNumber, options) {
  const { specPath, dryRun, verbose } = options;
  try {
    const permissions = await loadSyncPermissions(specPath);
    if (!permissions.canUpdate) {
      if (verbose) {
        console.log("   \u26A0\uFE0F  Skipping update - canUpdateExternalItems is disabled in config");
      }
      return {
        success: false,
        action: "skipped",
        error: "canUpdateExternalItems is disabled in .specweave/config.json"
      };
    }
    const issue = await client.getIssue(issueNumber);
    if (verbose) {
      console.log(`
\u{1F504} Checking for changes in issue #${issueNumber}`);
    }
    const cleanTitle = issue.title.replace(/^\[[A-Z]{2,4}-[A-Z0-9-]+\]\s*/, "");
    const changes = detectContentChanges(spec, {
      title: cleanTitle,
      description: issue.body || "",
      userStoryCount: countUserStoriesInBody(issue.body || "")
    });
    if (!changes.hasChanges) {
      if (verbose) {
        console.log("   \u2139\uFE0F  No changes detected");
      }
      return {
        success: true,
        action: "no-change",
        externalId: issueNumber.toString(),
        externalUrl: issue.html_url
      };
    }
    if (verbose) {
      console.log("   \u{1F4DD} Changes detected:");
      for (const change of changes.changes) {
        console.log(`      - ${change}`);
      }
    }
    if (dryRun) {
      console.log("\n\u{1F50D} Dry run - would post progress comment");
      return {
        success: true,
        action: "updated-via-comment",
        externalId: issueNumber.toString(),
        externalUrl: issue.html_url
      };
    }
    const labels = [
      "specweave",
      "spec",
      spec.project,
      spec.metadata.priority || "P2"
    ].filter(Boolean);
    await client.addLabels(issueNumber, labels);
    await postProgressComment(
      client,
      specPath,
      issueNumber,
      spec,
      verbose
    );
    if (verbose) {
      console.log(`\u2705 Posted progress comment to issue #${issueNumber}`);
    }
    return {
      success: true,
      action: "updated-via-comment",
      externalId: issueNumber.toString(),
      externalUrl: issue.html_url
    };
  } catch (error) {
    return {
      success: false,
      action: "error",
      error: `Failed to update GitHub issue: ${error.message}`
    };
  }
}
async function postProgressComment(client, specPath, issueNumber, spec, verbose = false) {
  try {
    let incrementId = "unknown";
    const incrementMatch = specPath.match(/increments\/([^/]+)/);
    if (incrementMatch) {
      incrementId = incrementMatch[1];
    } else {
      incrementId = spec.identifier.compact;
    }
    const builder = new ProgressCommentBuilder(specPath);
    const comment = await builder.buildProgressComment(incrementId);
    await client.addComment(issueNumber, comment);
    if (verbose) {
      console.log(`   \u{1F4CA} Progress comment posted (${comment.length} chars)`);
    }
  } catch (error) {
    if (verbose) {
      console.error(`   \u26A0\uFE0F  Failed to post progress comment: ${error.message}`);
    }
  }
}
function countUserStoriesInBody(body) {
  const matches = body.match(/###\s+US-\d+:/g);
  return matches ? matches.length : 0;
}
async function loadSyncPermissions(specPath) {
  try {
    let currentDir = path.dirname(specPath);
    let configPath = path.join(currentDir, ".specweave", "config.json");
    while (!await fs.access(configPath).then(() => true).catch(() => false)) {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        return { canCreate: true, canUpdate: true, canUpdateStatus: true };
      }
      currentDir = parentDir;
      configPath = path.join(currentDir, ".specweave", "config.json");
    }
    const configContent = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configContent);
    const settings = config.sync?.settings || {};
    return {
      canCreate: settings.canUpsertInternalItems !== false,
      // Default: true
      canUpdate: settings.canUpdateExternalItems !== false,
      // Default: true
      canUpdateStatus: settings.canUpdateStatus !== false
      // Default: true
    };
  } catch {
    return { canCreate: true, canUpdate: true, canUpdateStatus: true };
  }
}
async function isContentSyncEnabled(projectRoot) {
  try {
    const configPath = path.join(projectRoot, ".specweave", "config.json");
    const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
    return config.sync?.settings?.syncSpecContent !== false;
  } catch {
    return true;
  }
}
export {
  isContentSyncEnabled,
  syncSpecContentToGitHub
};
