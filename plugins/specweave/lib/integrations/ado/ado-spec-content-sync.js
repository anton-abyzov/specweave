import {
  parseSpecContent,
  detectContentChanges,
  hasExternalLink,
  updateSpecWithExternalLink
} from "../../../../../src/core/specs/spec-content-sync.js";
import { SpecIncrementMapper } from "../../../../../src/core/sync/spec-increment-mapper.js";
import * as path from "path";
import * as fs from "fs/promises";
async function syncSpecContentToAdo(options) {
  const { specPath, client, dryRun = false, verbose = false } = options;
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
      console.log(`\u{1F4C4} Parsed spec: ${spec.id}`);
      console.log(`   Title: ${spec.title}`);
      console.log(`   User Stories: ${spec.userStories.length}`);
    }
    const existingWorkItemId = await hasExternalLink(specPath, "ado");
    if (existingWorkItemId) {
      return await updateAdoFeature(
        client,
        spec,
        parseInt(existingWorkItemId),
        options
      );
    } else {
      return await createAdoFeature(client, spec, options);
    }
  } catch (error) {
    return {
      success: false,
      action: "error",
      error: error.message
    };
  }
}
async function createAdoFeature(client, spec, options) {
  const { specPath, dryRun, verbose } = options;
  try {
    const tasks = await getTaskMappings(specPath, spec.id);
    const title = `[${spec.id.toUpperCase()}] ${spec.title}`;
    const description = buildAdoDescription(spec, tasks);
    if (verbose) {
      console.log(`
\u{1F4DD} Creating ADO feature:`);
      console.log(`   Title: ${title}`);
      console.log(`   Description length: ${description.length} chars`);
    }
    if (dryRun) {
      console.log("\n\u{1F50D} Dry run - would create feature:");
      console.log(`   Title: ${title}`);
      console.log(`   Description:
${description}`);
      return {
        success: true,
        action: "created",
        externalId: "DRY-RUN",
        externalUrl: "https://dev.azure.com/DRY-RUN"
      };
    }
    const tags = ["specweave", "spec", spec.metadata.priority || "P2"];
    const workItem = await client.createEpic({
      title,
      description,
      tags
    });
    if (verbose) {
      console.log(`\u2705 Created feature #${workItem.id}`);
      console.log(`   URL: ${workItem._links.html.href}`);
    }
    await updateSpecWithExternalLink(
      specPath,
      "ado",
      workItem.id.toString(),
      workItem._links.html.href
    );
    return {
      success: true,
      action: "created",
      externalId: workItem.id.toString(),
      externalUrl: workItem._links.html.href
    };
  } catch (error) {
    return {
      success: false,
      action: "error",
      error: `Failed to create ADO feature: ${error.message}`
    };
  }
}
async function updateAdoFeature(client, spec, workItemId, options) {
  const { specPath, dryRun, verbose } = options;
  try {
    const workItem = await client.getWorkItem(workItemId);
    if (verbose) {
      console.log(`
\u{1F504} Checking for changes in feature #${workItemId}`);
    }
    const changes = detectContentChanges(spec, {
      title: workItem.fields["System.Title"].replace(/^\[SPEC-\d+\]\s*/, ""),
      description: stripHtmlTags(workItem.fields["System.Description"] || ""),
      userStoryCount: 0
      // TODO: Parse from description
    });
    if (!changes.hasChanges) {
      if (verbose) {
        console.log("   \u2139\uFE0F  No changes detected");
      }
      return {
        success: true,
        action: "no-change",
        externalId: workItemId.toString(),
        externalUrl: workItem._links.html.href
      };
    }
    if (verbose) {
      console.log("   \u{1F4DD} Changes detected:");
      for (const change of changes.changes) {
        console.log(`      - ${change}`);
      }
    }
    const tasks = await getTaskMappings(specPath, spec.id);
    const newTitle = `[${spec.id.toUpperCase()}] ${spec.title}`;
    const newDescription = buildAdoDescription(spec, tasks);
    if (dryRun) {
      console.log("\n\u{1F50D} Dry run - would update feature:");
      console.log(`   Title: ${newTitle}`);
      console.log(`   Description:
${newDescription}`);
      return {
        success: true,
        action: "updated",
        externalId: workItemId.toString(),
        externalUrl: workItem._links.html.href
      };
    }
    await client.updateWorkItem(workItemId, {
      title: newTitle,
      description: newDescription
    });
    if (verbose) {
      console.log(`\u2705 Updated feature #${workItemId}`);
    }
    return {
      success: true,
      action: "updated",
      externalId: workItemId.toString(),
      externalUrl: workItem._links.html.href
    };
  } catch (error) {
    return {
      success: false,
      action: "error",
      error: `Failed to update ADO feature: ${error.message}`
    };
  }
}
function buildAdoDescription(spec, tasks) {
  let html = "";
  if (spec.description) {
    html += `<p>${escapeHtml(spec.description)}</p>`;
  }
  if (spec.userStories.length > 0) {
    html += "<h2>User Stories</h2>";
    for (const us of spec.userStories) {
      html += `<h3>${us.id}: ${escapeHtml(us.title)}</h3>`;
      if (us.acceptanceCriteria.length > 0) {
        html += "<p><strong>Acceptance Criteria:</strong></p><ul>";
        for (const ac of us.acceptanceCriteria) {
          const checkbox = ac.completed ? "\u2611" : "\u2610";
          html += `<li>${checkbox} ${ac.id}: ${escapeHtml(ac.description)}</li>`;
        }
        html += "</ul>";
      }
    }
  }
  if (tasks && tasks.length > 0) {
    html += "<h2>Implementation Tasks</h2>";
    html += "<ul>";
    for (const task of tasks) {
      html += `<li><strong>${task.id}</strong>: ${escapeHtml(task.title)}`;
      if (task.userStories && task.userStories.length > 0) {
        html += ` (${task.userStories.join(", ")})`;
      }
      html += "</li>";
    }
    html += "</ul>";
  }
  if (spec.metadata.priority) {
    html += `<p><strong>Priority:</strong> ${spec.metadata.priority}</p>`;
  }
  return html;
}
async function getTaskMappings(specPath, specId) {
  try {
    const rootDir = await findSpecWeaveRoot(specPath);
    const mapper = new SpecIncrementMapper(rootDir);
    const mapping = await mapper.mapSpecToIncrements(specId);
    if (mapping.increments.length > 0) {
      return mapping.increments[0].tasks;
    }
    return void 0;
  } catch (error) {
    return void 0;
  }
}
async function findSpecWeaveRoot(specPath) {
  let currentDir = path.dirname(specPath);
  while (true) {
    const specweaveDir = path.join(currentDir, ".specweave");
    try {
      await fs.access(specweaveDir);
      return currentDir;
    } catch {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        throw new Error(".specweave directory not found");
      }
      currentDir = parentDir;
    }
  }
}
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function stripHtmlTags(html) {
  return html.replace(/<[^>]*>/g, "").trim();
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
  syncSpecContentToAdo
};
