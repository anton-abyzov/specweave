/**
 * JIRA Spec Content Sync
 *
 * Syncs spec CONTENT (title, description, user stories) to JIRA Epics.
 * Does NOT sync STATUS - that's managed in JIRA.
 *
 * Sync Direction:
 * - Title/Description: SpecWeave → JIRA (we update)
 * - Status (To Do/In Progress/Done): JIRA → SpecWeave (we read)
 */

import axios, { AxiosInstance } from 'axios';
import {
  parseSpecContent,
  detectContentChanges,
  buildExternalDescription,
  hasExternalLink,
  updateSpecWithExternalLink,
  SpecContent,
  ContentSyncResult,
} from '../../../src/core/spec-content-sync.js';
import path from 'path';
import fs from 'fs/promises';

export interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

export interface JiraContentSyncOptions {
  specPath: string;
  config: JiraConfig;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Sync spec content to JIRA epic
 * Creates epic if it doesn't exist, updates if it does
 */
export async function syncSpecContentToJira(
  options: JiraContentSyncOptions
): Promise<ContentSyncResult> {
  const { specPath, config, dryRun = false, verbose = false } = options;

  try {
    // 1. Parse spec content
    const spec = await parseSpecContent(specPath);
    if (!spec) {
      return {
        success: false,
        action: 'error',
        error: 'Failed to parse spec content',
      };
    }

    if (verbose) {
      console.log(`📄 Parsed spec: ${spec.id}`);
      console.log(`   Title: ${spec.title}`);
      console.log(`   User Stories: ${spec.userStories.length}`);
    }

    // 2. Create JIRA client
    const client = axios.create({
      baseURL: `https://${config.domain}/rest/api/3`,
      auth: {
        username: config.email,
        password: config.apiToken,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // 3. Check if epic already exists
    const existingEpicKey = await hasExternalLink(specPath, 'jira');

    if (existingEpicKey) {
      // UPDATE existing epic
      return await updateJiraEpic(client, spec, existingEpicKey, options);
    } else {
      // CREATE new epic
      return await createJiraEpic(client, spec, options);
    }
  } catch (error: any) {
    return {
      success: false,
      action: 'error',
      error: error.message,
    };
  }
}

/**
 * Create new JIRA epic from spec
 */
async function createJiraEpic(
  client: AxiosInstance,
  spec: SpecContent,
  options: JiraContentSyncOptions
): Promise<ContentSyncResult> {
  const { specPath, config, dryRun, verbose } = options;

  try {
    // Build epic summary and description
    const summary = `[${spec.id.toUpperCase()}] ${spec.title}`;
    const description = buildJiraDescription(spec);

    if (verbose) {
      console.log(`\n📝 Creating JIRA epic:`);
      console.log(`   Summary: ${summary}`);
      console.log(`   Description length: ${description.length} chars`);
    }

    if (dryRun) {
      console.log('\n🔍 Dry run - would create epic:');
      console.log(`   Summary: ${summary}`);
      console.log(`   Description:\n${description}`);

      return {
        success: true,
        action: 'created',
        externalId: 'DRY-RUN',
        externalUrl: `https://${options.config.domain}/browse/DRY-RUN`,
      };
    }

    // Create epic
    const response = await client.post('/issue', {
      fields: {
        project: { key: config.projectKey },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description,
                },
              ],
            },
          ],
        },
        issuetype: { name: 'Epic' },
        labels: ['specweave', 'spec', spec.metadata.priority || 'P2'],
      },
    });

    const epicKey = response.data.key;
    const epicUrl = `https://${config.domain}/browse/${epicKey}`;

    if (verbose) {
      console.log(`✅ Created epic ${epicKey}`);
      console.log(`   URL: ${epicUrl}`);
    }

    // Update spec with JIRA link
    await updateSpecWithExternalLink(specPath, 'jira', epicKey, epicUrl);

    return {
      success: true,
      action: 'created',
      externalId: epicKey,
      externalUrl: epicUrl,
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'error',
      error: `Failed to create JIRA epic: ${error.message}`,
    };
  }
}

/**
 * Update existing JIRA epic with spec content
 */
async function updateJiraEpic(
  client: AxiosInstance,
  spec: SpecContent,
  epicKey: string,
  options: JiraContentSyncOptions
): Promise<ContentSyncResult> {
  const { specPath, config, dryRun, verbose } = options;

  try {
    // Get current epic
    const response = await client.get(`/issue/${epicKey}`);
    const epic = response.data;

    if (verbose) {
      console.log(`\n🔄 Checking for changes in epic ${epicKey}`);
    }

    // Detect changes
    const changes = detectContentChanges(spec, {
      title: epic.fields.summary.replace(/^\[SPEC-\d+\]\s*/, ''),
      description: extractTextFromJiraADF(epic.fields.description),
      userStoryCount: 0, // TODO: Parse from description
    });

    if (!changes.hasChanges) {
      if (verbose) {
        console.log('   ℹ️  No changes detected');
      }

      return {
        success: true,
        action: 'no-change',
        externalId: epicKey,
        externalUrl: `https://${config.domain}/browse/${epicKey}`,
      };
    }

    if (verbose) {
      console.log('   📝 Changes detected:');
      for (const change of changes.changes) {
        console.log(`      - ${change}`);
      }
    }

    // Build updated content
    const newSummary = `[${spec.id.toUpperCase()}] ${spec.title}`;
    const newDescription = buildJiraDescription(spec);

    if (dryRun) {
      console.log('\n🔍 Dry run - would update epic:');
      console.log(`   Summary: ${newSummary}`);
      console.log(`   Description:\n${newDescription}`);

      return {
        success: true,
        action: 'updated',
        externalId: epicKey,
        externalUrl: `https://${config.domain}/browse/${epicKey}`,
      };
    }

    // Update epic (ONLY summary and description, NOT status!)
    await client.put(`/issue/${epicKey}`, {
      fields: {
        summary: newSummary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: newDescription,
                },
              ],
            },
          ],
        },
      },
    });

    // Note: We do NOT update status - that's managed in JIRA
    // We do NOT transition issues (To Do → In Progress → Done)

    if (verbose) {
      console.log(`✅ Updated epic ${epicKey}`);
    }

    return {
      success: true,
      action: 'updated',
      externalId: epicKey,
      externalUrl: `https://${config.domain}/browse/${epicKey}`,
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'error',
      error: `Failed to update JIRA epic: ${error.message}`,
    };
  }
}

/**
 * Build JIRA description from spec content
 * Converts markdown to JIRA markup
 */
function buildJiraDescription(spec: SpecContent): string {
  let description = '';

  // Add spec description
  if (spec.description) {
    description += spec.description + '\n\n';
  }

  // Add user stories
  if (spec.userStories.length > 0) {
    description += 'h2. User Stories\n\n';

    for (const us of spec.userStories) {
      description += `h3. ${us.id}: ${us.title}\n\n`;

      if (us.acceptanceCriteria.length > 0) {
        description += '*Acceptance Criteria:*\n';
        for (const ac of us.acceptanceCriteria) {
          const checkbox = ac.completed ? '(/)' : '(x)';
          description += `* ${checkbox} ${ac.id}: ${ac.description}\n`;
        }
        description += '\n';
      }
    }
  }

  // Add metadata
  if (spec.metadata.priority) {
    description += `\n*Priority:* ${spec.metadata.priority}\n`;
  }

  return description;
}

/**
 * Extract plain text from JIRA ADF (Atlassian Document Format)
 */
function extractTextFromJiraADF(adf: any): string {
  if (!adf || !adf.content) {
    return '';
  }

  let text = '';

  function traverse(node: any) {
    if (node.type === 'text') {
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

/**
 * Check if spec content sync is enabled
 */
export async function isContentSyncEnabled(projectRoot: string): Promise<boolean> {
  try {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

    return config.sync?.settings?.syncSpecContent !== false;
  } catch {
    return true; // Default: enabled
  }
}
