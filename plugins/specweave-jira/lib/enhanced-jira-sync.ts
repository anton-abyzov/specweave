/**
 * Enhanced JIRA Spec Content Sync
 *
 * Uses EnhancedContentBuilder and SpecIncrementMapper for rich epic descriptions.
 */

import { JiraClientV2 } from './jira-client-v2.js';
import { EnhancedContentBuilder, EnhancedSpecContent } from '../../../src/core/sync/enhanced-content-builder.js';
import { SpecIncrementMapper, TaskInfo } from '../../../src/core/sync/spec-increment-mapper.js';
import { parseSpecContent } from '../../../src/core/spec-content-sync.js';
import path from 'path';
import fs from 'fs/promises';

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

    // 5. Create or update JIRA epic
    if (!domain || !project) {
      return {
        success: false,
        action: 'error',
        error: 'JIRA domain/project not specified',
      };
    }

    const client = new JiraClientV2({ domain, project });

    // Check if epic already exists
    const existingEpic = await findExistingEpic(client, baseSpec.identifier.compact);

    let result: EnhancedJiraSyncResult;

    if (existingEpic) {
      // Update existing epic
      await client.updateEpic(existingEpic.key, {
        summary: `[${baseSpec.identifier.compact}] ${baseSpec.title}`,
        description
      });

      result = {
        success: true,
        action: 'updated',
        epicKey: existingEpic.key,
        epicUrl: `https://${domain}/browse/${existingEpic.key}`,
        tasksLinked: taskMapping?.tasks.length || 0
      };
    } else {
      // Create new epic
      const epic = await client.createEpic({
        summary: `[${baseSpec.identifier.compact}] ${baseSpec.title}`,
        description,
        labels: ['spec', 'external-tool-sync']
      });

      result = {
        success: true,
        action: 'created',
        epicKey: epic.key,
        epicUrl: `https://${domain}/browse/${epic.key}`,
        tasksLinked: taskMapping?.tasks.length || 0
      };
    }

    if (verbose) {
      console.log(`✅ ${result.action === 'created' ? 'Created' : 'Updated'} epic ${result.epicKey}`);
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

async function findExistingEpic(client: JiraClientV2, specId: string): Promise<any | null> {
  try {
    const epics = await client.searchEpics(`summary ~ "[${specId}]"`);
    return epics[0] || null;
  } catch {
    return null;
  }
}
