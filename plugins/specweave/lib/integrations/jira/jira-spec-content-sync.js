import axios from "axios";
import {
  parseSpecContent,
  detectContentChanges,
  hasExternalLink,
  updateSpecWithExternalLink
} from "../../../../../src/core/specs/spec-content-sync.js";
import path from "path";
import fs from "fs/promises";
async function syncSpecContentToJira(options) {
  const { specPath, config, dryRun = false, verbose = false } = options;
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
    const client = axios.create({
      baseURL: `https://${config.domain}/rest/api/3`,
      auth: {
        username: config.email,
        password: config.apiToken
      },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });
    const existingEpicKey = await hasExternalLink(specPath, "jira");
    if (existingEpicKey) {
      return await updateJiraEpic(client, spec, existingEpicKey, options);
    } else {
      return await createJiraEpic(client, spec, options);
    }
  } catch (error) {
    return {
      success: false,
      action: "error",
      error: error.message
    };
  }
}
async function createJiraEpic(client, spec, options) {
  const { specPath, config, dryRun, verbose } = options;
  try {
    const summary = `[${spec.id.toUpperCase()}] ${spec.title}`;
    const description = buildJiraDescription(spec);
    if (verbose) {
      console.log(`
\u{1F4DD} Creating JIRA epic:`);
      console.log(`   Summary: ${summary}`);
      console.log(`   Description length: ${description.length} chars`);
    }
    if (dryRun) {
      console.log("\n\u{1F50D} Dry run - would create epic:");
      console.log(`   Summary: ${summary}`);
      console.log(`   Description:
${description}`);
      return {
        success: true,
        action: "created",
        externalId: "DRY-RUN",
        externalUrl: `https://${options.config.domain}/browse/DRY-RUN`
      };
    }
    const response = await client.post("/issue", {
      fields: {
        project: { key: config.projectKey },
        summary,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: description
                }
              ]
            }
          ]
        },
        issuetype: { name: "Epic" },
        labels: ["specweave", "spec", spec.metadata.priority || "P2"]
      }
    });
    const epicKey = response.data.key;
    const epicUrl = `https://${config.domain}/browse/${epicKey}`;
    if (verbose) {
      console.log(`\u2705 Created epic ${epicKey}`);
      console.log(`   URL: ${epicUrl}`);
    }
    await updateSpecWithExternalLink(specPath, "jira", epicKey, epicUrl);
    return {
      success: true,
      action: "created",
      externalId: epicKey,
      externalUrl: epicUrl
    };
  } catch (error) {
    return {
      success: false,
      action: "error",
      error: `Failed to create JIRA epic: ${error.message}`
    };
  }
}
async function updateJiraEpic(client, spec, epicKey, options) {
  const { specPath, config, dryRun, verbose } = options;
  try {
    const response = await client.get(`/issue/${epicKey}`);
    const epic = response.data;
    if (verbose) {
      console.log(`
\u{1F504} Checking for changes in epic ${epicKey}`);
    }
    const changes = detectContentChanges(spec, {
      title: epic.fields.summary.replace(/^\[SPEC-\d+\]\s*/, ""),
      description: extractTextFromJiraADF(epic.fields.description),
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
        externalId: epicKey,
        externalUrl: `https://${config.domain}/browse/${epicKey}`
      };
    }
    if (verbose) {
      console.log("   \u{1F4DD} Changes detected:");
      for (const change of changes.changes) {
        console.log(`      - ${change}`);
      }
    }
    const newSummary = `[${spec.id.toUpperCase()}] ${spec.title}`;
    const newDescription = buildJiraDescription(spec);
    if (dryRun) {
      console.log("\n\u{1F50D} Dry run - would update epic:");
      console.log(`   Summary: ${newSummary}`);
      console.log(`   Description:
${newDescription}`);
      return {
        success: true,
        action: "updated",
        externalId: epicKey,
        externalUrl: `https://${config.domain}/browse/${epicKey}`
      };
    }
    await client.put(`/issue/${epicKey}`, {
      fields: {
        summary: newSummary,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: newDescription
                }
              ]
            }
          ]
        }
      }
    });
    if (verbose) {
      console.log(`\u2705 Updated epic ${epicKey}`);
    }
    return {
      success: true,
      action: "updated",
      externalId: epicKey,
      externalUrl: `https://${config.domain}/browse/${epicKey}`
    };
  } catch (error) {
    return {
      success: false,
      action: "error",
      error: `Failed to update JIRA epic: ${error.message}`
    };
  }
}
function buildJiraDescription(spec) {
  let description = "";
  if (spec.description) {
    description += spec.description + "\n\n";
  }
  if (spec.userStories.length > 0) {
    description += "h2. User Stories\n\n";
    for (const us of spec.userStories) {
      description += `h3. ${us.id}: ${us.title}

`;
      if (us.acceptanceCriteria.length > 0) {
        description += "*Acceptance Criteria:*\n";
        for (const ac of us.acceptanceCriteria) {
          const checkbox = ac.completed ? "(/)" : "(x)";
          description += `* ${checkbox} ${ac.id}: ${ac.description}
`;
        }
        description += "\n";
      }
    }
  }
  if (spec.metadata.priority) {
    description += `
*Priority:* ${spec.metadata.priority}
`;
  }
  return description;
}
function extractTextFromJiraADF(adf) {
  if (!adf || !adf.content) {
    return "";
  }
  let text = "";
  function traverse(node) {
    if (node.type === "text") {
      text += node.text;
    }
    if (node.content) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  }
  traverse(adf);
  return text.trim();
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
  syncSpecContentToJira
};
