/**
 * Enhanced GitHub Spec Content Sync
 *
 * Uses EnhancedContentBuilder and SpecIncrementMapper for rich external descriptions.
 */

import { GitHubClientV2 } from './github-client-v2.js';
import { EnhancedContentBuilder, EnhancedSpecContent } from '../../../src/core/sync/enhanced-content-builder.js';
import { SpecIncrementMapper, TaskInfo } from '../../../src/core/sync/spec-increment-mapper.js';
import { parseSpecContent, SpecContent } from '../../../src/core/spec-content-sync.js';
import path from 'path';
import fs from 'fs/promises';

export interface EnhancedGitHubSyncOptions {
  specPath: string;
  owner?: string;
  repo?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface EnhancedSyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'no-change' | 'error';
  issueNumber?: number;
  issueUrl?: string;
  error?: string;
  tasksLinked?: number;
}

/**
 * Enhanced sync with rich content including task mappings
 */
export async function syncSpecWithEnhancedContent(
  options: EnhancedGitHubSyncOptions
): Promise<EnhancedSyncResult> {
  const { specPath, owner, repo, dryRun = false, verbose = false } = options;

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
      console.log(`📋 Mapped ${Object.keys(mapping.userStoryMappings).length} user stories to tasks`);
    }

    // 3. Build task mapping for EnhancedSpecContent
    const taskMapping = buildTaskMapping(mapping.increments, owner!, repo!);

    // 4. Build architecture docs references
    const architectureDocs = await findArchitectureDocs(rootDir, specId);

    // 5. Build source links
    const sourceLinks = buildSourceLinks(mapping.increments[0]?.id, owner!, repo!);

    // 6. Create enhanced spec content
    const enhancedSpec: EnhancedSpecContent = {
      ...baseSpec,
      summary: baseSpec.description,
      taskMapping,
      architectureDocs,
      sourceLinks
    };

    // 7. Build external description
    const builder = new EnhancedContentBuilder();
    const description = builder.buildExternalDescription(enhancedSpec);

    if (verbose) {
      console.log(`📝 Generated description: ${description.length} characters`);
    }

    if (dryRun) {
      console.log('🔍 DRY RUN - Would create/update issue with:');
      console.log(`   Title: ${baseSpec.title}`);
      console.log(`   Description length: ${description.length}`);
      console.log(`   Tasks linked: ${taskMapping?.tasks.length || 0}`);
      return {
        success: true,
        action: 'no-change',
        tasksLinked: taskMapping?.tasks.length || 0
      };
    }

    // 8. Create or update GitHub issue
    if (!owner || !repo) {
      return {
        success: false,
        action: 'error',
        error: 'GitHub owner/repo not specified',
      };
    }

    const client = new GitHubClientV2({ owner, repo });

    // Check if issue already exists
    const existingIssue = await findExistingIssue(client, baseSpec.identifier.compact);

    let result: EnhancedSyncResult;

    if (existingIssue) {
      // Update existing issue
      await client.updateIssue(existingIssue.number, {
        title: `[${baseSpec.identifier.compact}] ${baseSpec.title}`,
        body: description
      });

      result = {
        success: true,
        action: 'updated',
        issueNumber: existingIssue.number,
        issueUrl: existingIssue.url,
        tasksLinked: taskMapping?.tasks.length || 0
      };
    } else {
      // Create new issue
      const issue = await client.createIssue({
        title: `[${baseSpec.identifier.compact}] ${baseSpec.title}`,
        body: description,
        labels: ['spec', 'external-tool-sync']
      });

      result = {
        success: true,
        action: 'created',
        issueNumber: issue.number,
        issueUrl: issue.url,
        tasksLinked: taskMapping?.tasks.length || 0
      };

      // Update spec with GitHub link
      await mapper.updateSpecWithIncrementLinks(specId, mapping.increments[0]?.id);
    }

    if (verbose) {
      console.log(`✅ ${result.action === 'created' ? 'Created' : 'Updated'} issue #${result.issueNumber}`);
      console.log(`   URL: ${result.issueUrl}`);
      console.log(`   Tasks linked: ${result.tasksLinked}`);
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
  owner: string,
  repo: string
): any {
  if (increments.length === 0) return undefined;

  const firstIncrement = increments[0];
  const tasks = firstIncrement.tasks.map((task: TaskInfo) => ({
    id: task.id,
    title: task.title,
    userStories: task.userStories,
    githubIssue: task.githubIssue
  }));

  return {
    incrementId: firstIncrement.id,
    tasks,
    tasksUrl: `https://github.com/${owner}/${repo}/blob/develop/.specweave/increments/${firstIncrement.id}/tasks.md`
  };
}

async function findArchitectureDocs(
  rootDir: string,
  specId: string
): Promise<any[]> {
  const docs: any[] = [];
  const archDir = path.join(rootDir, '.specweave/docs/internal/architecture');

  try {
    // Check for ADRs
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

    // Check for HLD
    const hlds = await fs.readdir(archDir);
    const relatedHlds = hlds.filter(file => file.includes('hld') && file.includes(specId.replace('spec-', '')));

    for (const hld of relatedHlds) {
      docs.push({
        type: 'hld',
        path: path.join(archDir, hld),
        title: hld.replace('.md', '').replace(/-/g, ' ')
      });
    }
  } catch {}

  return docs;
}

function buildSourceLinks(incrementId: string | undefined, owner: string, repo: string): any {
  if (!incrementId) return undefined;

  const baseUrl = `https://github.com/${owner}/${repo}/blob/develop/.specweave`;

  return {
    spec: `${baseUrl}/docs/internal/specs/default/spec-${incrementId.replace(/^\d+-/, '')}.md`,
    plan: `${baseUrl}/increments/${incrementId}/plan.md`,
    tasks: `${baseUrl}/increments/${incrementId}/tasks.md`
  };
}

async function findExistingIssue(client: GitHubClientV2, specId: string): Promise<any | null> {
  try {
    const issues = await client.listIssues({ state: 'all', labels: 'spec' });
    return issues.find(issue => issue.title.includes(`[${specId}]`)) || null;
  } catch {
    return null;
  }
}
