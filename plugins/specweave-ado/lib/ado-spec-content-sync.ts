/**
 * Azure DevOps Spec Content Sync
 *
 * Syncs spec CONTENT (title, description, user stories) to ADO Features.
 * Does NOT sync STATUS - that's managed in ADO.
 *
 * Sync Direction:
 * - Title/Description: SpecWeave → ADO (we update)
 * - State (New/Active/Resolved/Closed): ADO → SpecWeave (we read)
 */

import { AdoClientV2 } from './ado-client-v2.js';
import {
  parseSpecContent,
  detectContentChanges,
  buildExternalDescription,
  hasExternalLink,
  updateSpecWithExternalLink,
  SpecContent,
  ContentSyncResult,
} from '../../../src/core/spec-content-sync.js';
import { SyncProfile } from '../../../src/core/types/sync-profile.js';
import { SpecIncrementMapper, TaskInfo } from '../../../src/core/sync/spec-increment-mapper.js';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface AdoContentSyncOptions {
  specPath: string;
  client: AdoClientV2;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Sync spec content to ADO feature
 * Creates feature if it doesn't exist, updates if it does
 */
export async function syncSpecContentToAdo(
  options: AdoContentSyncOptions
): Promise<ContentSyncResult> {
  const { specPath, client, dryRun = false, verbose = false } = options;

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

    // 2. Check if feature already exists
    const existingWorkItemId = await hasExternalLink(specPath, 'ado');

    if (existingWorkItemId) {
      // UPDATE existing feature
      return await updateAdoFeature(
        client,
        spec,
        parseInt(existingWorkItemId),
        options
      );
    } else {
      // CREATE new feature
      return await createAdoFeature(client, spec, options);
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
 * Create new ADO feature from spec
 */
async function createAdoFeature(
  client: AdoClientV2,
  spec: SpecContent,
  options: AdoContentSyncOptions
): Promise<ContentSyncResult> {
  const { specPath, dryRun, verbose } = options;

  try {
    // Get task mappings (if available)
    const tasks = await getTaskMappings(specPath, spec.id);

    // Build feature title and description
    const title = `[${spec.id.toUpperCase()}] ${spec.title}`;
    const description = buildAdoDescription(spec, tasks);

    if (verbose) {
      console.log(`\n📝 Creating ADO feature:`);
      console.log(`   Title: ${title}`);
      console.log(`   Description length: ${description.length} chars`);
    }

    if (dryRun) {
      console.log('\n🔍 Dry run - would create feature:');
      console.log(`   Title: ${title}`);
      console.log(`   Description:\n${description}`);

      return {
        success: true,
        action: 'created',
        externalId: 'DRY-RUN',
        externalUrl: 'https://dev.azure.com/DRY-RUN',
      };
    }

    // Create feature
    const tags = ['specweave', 'spec', spec.metadata.priority || 'P2'];
    const workItem = await client.createEpic({
      title,
      description,
      tags,
    });

    if (verbose) {
      console.log(`✅ Created feature #${workItem.id}`);
      console.log(`   URL: ${workItem._links.html.href}`);
    }

    // Update spec with ADO link
    await updateSpecWithExternalLink(
      specPath,
      'ado',
      workItem.id.toString(),
      workItem._links.html.href
    );

    return {
      success: true,
      action: 'created',
      externalId: workItem.id.toString(),
      externalUrl: workItem._links.html.href,
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'error',
      error: `Failed to create ADO feature: ${error.message}`,
    };
  }
}

/**
 * Update existing ADO feature with spec content
 */
async function updateAdoFeature(
  client: AdoClientV2,
  spec: SpecContent,
  workItemId: number,
  options: AdoContentSyncOptions
): Promise<ContentSyncResult> {
  const { specPath, dryRun, verbose } = options;

  try {
    // Get current work item
    const workItem = await client.getWorkItem(workItemId);

    if (verbose) {
      console.log(`\n🔄 Checking for changes in feature #${workItemId}`);
    }

    // Detect changes
    const changes = detectContentChanges(spec, {
      title: workItem.fields['System.Title'].replace(/^\[SPEC-\d+\]\s*/, ''),
      description: stripHtmlTags(workItem.fields['System.Description'] || ''),
      userStoryCount: 0, // TODO: Parse from description
    });

    if (!changes.hasChanges) {
      if (verbose) {
        console.log('   ℹ️  No changes detected');
      }

      return {
        success: true,
        action: 'no-change',
        externalId: workItemId.toString(),
        externalUrl: workItem._links.html.href,
      };
    }

    if (verbose) {
      console.log('   📝 Changes detected:');
      for (const change of changes.changes) {
        console.log(`      - ${change}`);
      }
    }

    // Get task mappings (if available)
    const tasks = await getTaskMappings(specPath, spec.id);

    // Build updated content
    const newTitle = `[${spec.id.toUpperCase()}] ${spec.title}`;
    const newDescription = buildAdoDescription(spec, tasks);

    if (dryRun) {
      console.log('\n🔍 Dry run - would update feature:');
      console.log(`   Title: ${newTitle}`);
      console.log(`   Description:\n${newDescription}`);

      return {
        success: true,
        action: 'updated',
        externalId: workItemId.toString(),
        externalUrl: workItem._links.html.href,
      };
    }

    // Update feature (ONLY title and description, NOT state!)
    await client.updateWorkItem(workItemId, {
      title: newTitle,
      description: newDescription,
    });

    // Note: We do NOT update State (New → Active → Resolved → Closed)
    // State transitions are managed in ADO by humans/workflows

    if (verbose) {
      console.log(`✅ Updated feature #${workItemId}`);
    }

    return {
      success: true,
      action: 'updated',
      externalId: workItemId.toString(),
      externalUrl: workItem._links.html.href,
    };
  } catch (error: any) {
    return {
      success: false,
      action: 'error',
      error: `Failed to update ADO feature: ${error.message}`,
    };
  }
}

/**
 * Build ADO description from spec content with optional task mappings
 * ADO supports HTML in description
 */
function buildAdoDescription(spec: SpecContent, tasks?: TaskInfo[]): string {
  let html = '';

  // Add spec description
  if (spec.description) {
    html += `<p>${escapeHtml(spec.description)}</p>`;
  }

  // Add user stories
  if (spec.userStories.length > 0) {
    html += '<h2>User Stories</h2>';

    for (const us of spec.userStories) {
      html += `<h3>${us.id}: ${escapeHtml(us.title)}</h3>`;

      if (us.acceptanceCriteria.length > 0) {
        html += '<p><strong>Acceptance Criteria:</strong></p><ul>';
        for (const ac of us.acceptanceCriteria) {
          const checkbox = ac.completed ? '☑' : '☐';
          html += `<li>${checkbox} ${ac.id}: ${escapeHtml(ac.description)}</li>`;
        }
        html += '</ul>';
      }
    }
  }

  // Add task mappings (if provided)
  if (tasks && tasks.length > 0) {
    html += '<h2>Implementation Tasks</h2>';
    html += '<ul>';
    for (const task of tasks) {
      html += `<li><strong>${task.id}</strong>: ${escapeHtml(task.title)}`;
      if (task.userStories && task.userStories.length > 0) {
        html += ` (${task.userStories.join(', ')})`;
      }
      html += '</li>';
    }
    html += '</ul>';
  }

  // Add metadata
  if (spec.metadata.priority) {
    html += `<p><strong>Priority:</strong> ${spec.metadata.priority}</p>`;
  }

  return html;
}

/**
 * Get task mappings for a spec (if available)
 */
async function getTaskMappings(specPath: string, specId: string): Promise<TaskInfo[] | undefined> {
  try {
    // Find SpecWeave root
    const rootDir = await findSpecWeaveRoot(specPath);

    // Use SpecIncrementMapper to get task mappings
    const mapper = new SpecIncrementMapper(rootDir);
    const mapping = await mapper.mapSpecToIncrements(specId);

    if (mapping.increments.length > 0) {
      // Return tasks from the first (most recent) increment
      return mapping.increments[0].tasks;
    }

    return undefined;
  } catch (error) {
    // If mapping fails, just return undefined (not critical)
    return undefined;
  }
}

/**
 * Find SpecWeave root directory from spec path
 */
async function findSpecWeaveRoot(specPath: string): Promise<string> {
  let currentDir = path.dirname(specPath);

  while (true) {
    const specweaveDir = path.join(currentDir, '.specweave');
    try {
      await fs.access(specweaveDir);
      return currentDir;
    } catch {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        throw new Error('.specweave directory not found');
      }
      currentDir = parentDir;
    }
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
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
