/**
 * Enhanced Azure DevOps Spec Content Sync
 *
 * Uses EnhancedContentBuilder and SpecIncrementMapper for rich feature descriptions.
 */

import { AdoClientV2 } from './ado-client-v2.js';
import { EnhancedContentBuilder, EnhancedSpecContent } from '../../../src/core/sync/enhanced-content-builder.js';
import { SpecIncrementMapper, TaskInfo } from '../../../src/core/sync/spec-increment-mapper.js';
import { parseSpecContent } from '../../../src/core/spec-content-sync.js';
import path from 'path';
import fs from 'fs/promises';

export interface EnhancedAdoSyncOptions {
  specPath: string;
  organization?: string;
  project?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface EnhancedAdoSyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'no-change' | 'error';
  featureId?: number;
  featureUrl?: string;
  error?: string;
  tasksLinked?: number;
}

/**
 * Enhanced sync with rich content including task mappings
 */
export async function syncSpecToAdoWithEnhancedContent(
  options: EnhancedAdoSyncOptions
): Promise<EnhancedAdoSyncResult> {
  const { specPath, organization, project, dryRun = false, verbose = false } = options;

  try {
    // 1. Parse spec content
    const baseSpec = await parseSpecContent(specPath);
    if (!baseSpec) {
      return {
        success: false,
        action: 'error',
        error: 'Failed to parse spec content',
      };
    }

    if (verbose) {
      console.log(`📄 Parsed spec: ${baseSpec.identifier.compact}`);
    }

    // 2. Build enhanced spec with task mappings
    const specId = baseSpec.identifier.full || baseSpec.identifier.compact;
    const rootDir = await findSpecWeaveRoot(specPath);
    const mapper = new SpecIncrementMapper(rootDir);
    const mapping = await mapper.mapSpecToIncrements(specId);

    if (verbose) {
      console.log(`🔗 Found ${mapping.increments.length} related increments`);
    }

    // 3. Build enhanced spec content
    const taskMapping = buildTaskMapping(mapping.increments, organization!, project!);
    const architectureDocs = await findArchitectureDocs(rootDir, specId);

    const enhancedSpec: EnhancedSpecContent = {
      ...baseSpec,
      summary: baseSpec.description,
      taskMapping,
      architectureDocs
    };

    // 4. Build external description
    const builder = new EnhancedContentBuilder();
    const description = builder.buildExternalDescription(enhancedSpec);

    if (verbose) {
      console.log(`📝 Generated description: ${description.length} characters`);
    }

    if (dryRun) {
      console.log('🔍 DRY RUN - Would create/update feature with:');
      console.log(`   Title: ${baseSpec.title}`);
      console.log(`   Description length: ${description.length}`);
      return {
        success: true,
        action: 'no-change',
        tasksLinked: taskMapping?.tasks.length || 0
      };
    }

    // 5. Create or update ADO feature
    if (!organization || !project) {
      return {
        success: false,
        action: 'error',
        error: 'Azure DevOps organization/project not specified',
      };
    }

    const client = new AdoClientV2({ organization, project });

    // Check if feature already exists
    const existingFeature = await findExistingFeature(client, baseSpec.identifier.compact);

    let result: EnhancedAdoSyncResult;

    if (existingFeature) {
      // Update existing feature
      await client.updateWorkItem(existingFeature.id, {
        title: `[${baseSpec.identifier.compact}] ${baseSpec.title}`,
        description
      });

      result = {
        success: true,
        action: 'updated',
        featureId: existingFeature.id,
        featureUrl: `https://dev.azure.com/${organization}/${project}/_workitems/edit/${existingFeature.id}`,
        tasksLinked: taskMapping?.tasks.length || 0
      };
    } else {
      // Create new feature
      const feature = await client.createFeature({
        title: `[${baseSpec.identifier.compact}] ${baseSpec.title}`,
        description,
        tags: 'spec;external-tool-sync'
      });

      result = {
        success: true,
        action: 'created',
        featureId: feature.id,
        featureUrl: `https://dev.azure.com/${organization}/${project}/_workitems/edit/${feature.id}`,
        tasksLinked: taskMapping?.tasks.length || 0
      };
    }

    if (verbose) {
      console.log(`✅ ${result.action === 'created' ? 'Created' : 'Updated'} feature #${result.featureId}`);
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      action: 'error',
      error: error.message
    };
  }
}

// Helper functions

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

function buildTaskMapping(
  increments: any[],
  organization: string,
  project: string
): any {
  if (increments.length === 0) return undefined;

  const firstIncrement = increments[0];
  const tasks = firstIncrement.tasks.map((task: TaskInfo) => ({
    id: task.id,
    title: task.title,
    userStories: task.userStories
  }));

  return {
    incrementId: firstIncrement.id,
    tasks,
    tasksUrl: `https://dev.azure.com/${organization}/${project}/_git/repo?path=/.specweave/increments/${firstIncrement.id}/tasks.md`
  };
}

async function findArchitectureDocs(rootDir: string, specId: string): Promise<any[]> {
  const docs: any[] = [];
  const archDir = path.join(rootDir, '.specweave/docs/internal/architecture');

  try {
    const adrDir = path.join(archDir, 'adr');
    try {
      const adrs = await fs.readdir(adrDir);
      const relatedAdrs = adrs.filter(file => file.includes(specId.replace('spec-', '')));

      for (const adr of relatedAdrs) {
        docs.push({
          type: 'adr',
          path: path.join(adrDir, adr),
          title: adr.replace('.md', '').replace(/-/g, ' ')
        });
      }
    } catch {}
  } catch {}

  return docs;
}

async function findExistingFeature(client: AdoClientV2, specId: string): Promise<any | null> {
  try {
    const features = await client.queryWorkItems(`[System.Title] Contains '[${specId}]' AND [System.WorkItemType] = 'Feature'`);
    return features[0] || null;
  } catch {
    return null;
  }
}
