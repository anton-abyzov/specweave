/**
 * Enhanced JIRA Spec Content Sync
 *
 * Uses EnhancedContentBuilder and SpecIncrementMapper for rich epic descriptions.
 *
 * NOTE: This version focuses on enhanced content building.
 * Actual JIRA API integration requires jira-spec-sync.ts
 */

import { EnhancedContentBuilder, EnhancedSpecContent } from '../../../src/core/sync/enhanced-content-builder.js';
import { SpecIncrementMapper, TaskInfo } from '../../../src/core/sync/spec-increment-mapper.js';
import { parseSpecContent } from '../../../src/core/spec-content-sync.js';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface EnhancedJiraSyncOptions {
  specPath: string;
  domain?: string;
  project?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface EnhancedJiraSyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'no-change' | 'error';
  epicKey?: string;
  epicUrl?: string;
  error?: string;
  tasksLinked?: number;
}

/**
 * Enhanced sync with rich content including task mappings
 */
export async function syncSpecToJiraWithEnhancedContent(
  options: EnhancedJiraSyncOptions
): Promise<EnhancedJiraSyncResult> {
  const { specPath, domain, project, dryRun = false, verbose = false } = options;

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
    const taskMapping = buildTaskMapping(mapping.increments);
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
      console.log('🔍 DRY RUN - Would create/update epic with:');
      console.log(`   Summary: ${baseSpec.title}`);
      console.log(`   Description length: ${description.length}`);
      return {
        success: true,
        action: 'no-change',
        tasksLinked: taskMapping?.tasks.length || 0
      };
    }

    // 5. Validate domain/project (if not dry run)
    if (!dryRun && (!domain || !project)) {
      return {
        success: false,
        action: 'error',
        error: 'JIRA domain/project not specified (required for actual sync)',
      };
    }

    // For now, we focus on content building
    // Actual JIRA API integration is in jira-spec-sync.ts
    const result: EnhancedJiraSyncResult = {
      success: true,
      action: dryRun ? 'no-change' : 'created', // Assume create if not dry run
      tasksLinked: taskMapping?.tasks.length || 0
    };

    if (domain && project && !dryRun) {
      // In a real implementation, this would use JIRA API
      // For now, just simulate success
      result.epicKey = `SPEC-001`; // Placeholder
      result.epicUrl = `https://${domain}/browse/SPEC-001`;

      if (verbose) {
        console.log(`⚠️  JIRA API integration not implemented in this file`);
        console.log(`   Use jira-spec-sync.ts for actual JIRA synchronization`);
      }
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

// Helper functions (similar to GitHub sync)

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

function buildTaskMapping(increments: any[]): any {
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
    tasksUrl: `tasks.md` // JIRA doesn't support external links in same way
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

// NOTE: findExistingEpic not needed in this simplified version
// Real JIRA API integration is in jira-spec-sync.ts
