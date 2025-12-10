/**
 * Per-US Azure DevOps Sync (v0.34.0+)
 *
 * Syncs each User Story to its explicitly declared project's ADO project/area.
 * Uses the **Project**: and **Board**: fields in spec.md (NOT keyword-based classification).
 *
 * Key difference from multi-project-sync:
 * - Multi-project sync uses keyword/heuristic classification
 * - Per-US sync uses EXPLICIT **Project**: and **Board**: fields from spec.md
 *
 * @module per-us-sync
 * @since v0.34.0
 */

import type { UserStoryData } from '../../../src/core/living-docs/types.js';
import type { ProjectMappings, AdoMapping } from '../../../src/core/types/config.js';
import type { USExternalRefsMap } from '../../../src/core/types/increment-metadata.js';
import { Logger, consoleLogger } from '../../../src/utils/logger.js';

/**
 * Result of syncing a single US to ADO
 */
export interface USSyncResult {
  usId: string;
  projectId: string;
  adoProject: string;
  areaPath: string;
  workItemId: number;
  url: string;
  action: 'created' | 'updated' | 'skipped';
  error?: string;
}

/**
 * Result of syncing all USs in an increment
 */
export interface PerUSSyncResult {
  success: boolean;
  synced: USSyncResult[];
  failed: USSyncResult[];
  externalRefs: USExternalRefsMap;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

/**
 * Options for per-US sync
 */
export interface PerUSSyncOptions {
  dryRun?: boolean;
  force?: boolean;
  defaultProject?: string;
  defaultBoard?: string;
  logger?: Logger;
}

/**
 * ADO client interface (to be injected)
 */
export interface AdoClient {
  createWorkItem(
    project: string,
    workItemType: string,
    title: string,
    description: string,
    areaPath?: string
  ): Promise<{ id: number; url: string }>;
  updateWorkItem(
    project: string,
    workItemId: number,
    title: string,
    description: string,
    areaPath?: string
  ): Promise<void>;
  searchWorkItems(project: string, query: string): Promise<Array<{ id: number; fields: { 'System.Title': string } }>>;
  getWorkItemUrl(project: string, workItemId: number): string;
}

/**
 * Per-US ADO Sync
 *
 * Syncs each US to its declared project's ADO project/area path.
 * For 2-level structures, uses **Board**: to determine area path.
 */
export class PerUSAdoSync {
  private projectMappings: ProjectMappings;
  private adoClient: AdoClient;
  private logger: Logger;

  constructor(
    adoClient: AdoClient,
    projectMappings: ProjectMappings,
    options: { logger?: Logger } = {}
  ) {
    this.adoClient = adoClient;
    this.projectMappings = projectMappings;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Sync all user stories to their respective ADO projects
   *
   * @param userStories - User stories with explicit project/board fields
   * @param featureId - Feature ID (e.g., "FS-137")
   * @param options - Sync options
   */
  async syncUserStories(
    userStories: UserStoryData[],
    featureId: string,
    options: PerUSSyncOptions = {}
  ): Promise<PerUSSyncResult> {
    const synced: USSyncResult[] = [];
    const failed: USSyncResult[] = [];
    const externalRefs: USExternalRefsMap = {};

    // Group USs by their declared project
    const groups = this.groupByProject(userStories, options.defaultProject);

    this.logger.log(`📡 Per-US ADO Sync: ${userStories.length} USs across ${groups.size} projects`);

    for (const [projectId, stories] of groups) {
      // Get ADO mapping for this project
      const mapping = this.projectMappings[projectId]?.ado;

      if (!mapping) {
        // No ADO mapping for this project
        this.logger.warn(`   ⚠️  No ADO mapping for project "${projectId}" - skipping ${stories.length} USs`);
        for (const story of stories) {
          failed.push({
            usId: story.id,
            projectId,
            adoProject: 'N/A',
            areaPath: '',
            workItemId: 0,
            url: '',
            action: 'skipped',
            error: `No ADO mapping for project "${projectId}"`
          });
        }
        continue;
      }

      // Sync each US to this project's ADO project
      for (const story of stories) {
        try {
          const result = await this.syncUserStory(story, mapping, featureId, options);
          synced.push({
            ...result,
            projectId
          });

          // Build external ref
          if (!options.dryRun && result.action !== 'skipped') {
            externalRefs[story.id] = {
              ado: {
                provider: 'ado',
                issueNumber: result.workItemId,
                url: result.url,
                targetProject: projectId,
                lastSynced: new Date().toISOString()
              }
            };
          }
        } catch (error) {
          failed.push({
            usId: story.id,
            projectId,
            adoProject: mapping.project,
            areaPath: mapping.areaPath || '',
            workItemId: 0,
            url: '',
            action: 'skipped',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    // Calculate summary
    const created = synced.filter(r => r.action === 'created').length;
    const updated = synced.filter(r => r.action === 'updated').length;
    const skipped = synced.filter(r => r.action === 'skipped').length;

    return {
      success: failed.length === 0,
      synced,
      failed,
      externalRefs,
      summary: {
        total: userStories.length,
        created,
        updated,
        skipped,
        failed: failed.length
      }
    };
  }

  /**
   * Sync a single user story to ADO
   *
   * For 2-level structures:
   * - **Project**: maps to ADO project
   * - **Board**: maps to area path under the project
   */
  private async syncUserStory(
    story: UserStoryData,
    mapping: AdoMapping,
    featureId: string,
    options: PerUSSyncOptions
  ): Promise<USSyncResult> {
    const title = `[${featureId}][${story.id}] ${story.title}`;
    const description = this.buildWorkItemDescription(story, featureId);

    // Determine area path:
    // - Use story.board if available (2-level structure)
    // - Fall back to mapping.areaPath
    // - Fall back to project root
    let areaPath = mapping.areaPath || mapping.project;
    if (story.board) {
      // 2-level structure: append board as area path segment
      areaPath = `${mapping.project}\\${story.board}`;
    }

    if (options.dryRun) {
      this.logger.log(`   🔍 [DRY-RUN] Would sync ${story.id} to ${mapping.project} (area: ${areaPath})`);
      return {
        usId: story.id,
        projectId: story.project || 'unknown',
        adoProject: mapping.project,
        areaPath,
        workItemId: 0,
        url: '',
        action: 'skipped'
      };
    }

    // Check for existing work item
    const existingItem = await this.findExistingWorkItem(mapping.project, story.id);

    if (existingItem) {
      // Update existing work item
      await this.adoClient.updateWorkItem(
        mapping.project,
        existingItem.id,
        title,
        description,
        areaPath
      );

      this.logger.log(`   🔄 Updated ${story.id} → ${mapping.project}/${existingItem.id}`);

      return {
        usId: story.id,
        projectId: story.project || 'unknown',
        adoProject: mapping.project,
        areaPath,
        workItemId: existingItem.id,
        url: this.adoClient.getWorkItemUrl(mapping.project, existingItem.id),
        action: 'updated'
      };
    } else {
      // Create new work item
      const newItem = await this.adoClient.createWorkItem(
        mapping.project,
        'User Story',
        title,
        description,
        areaPath
      );

      this.logger.log(`   ✅ Created ${story.id} → ${mapping.project}/${newItem.id}`);

      return {
        usId: story.id,
        projectId: story.project || 'unknown',
        adoProject: mapping.project,
        areaPath,
        workItemId: newItem.id,
        url: newItem.url,
        action: 'created'
      };
    }
  }

  /**
   * Find existing work item by US ID in title
   */
  private async findExistingWorkItem(
    project: string,
    usId: string
  ): Promise<{ id: number } | null> {
    try {
      const query = `[System.Title] Contains '[${usId}]'`;
      const results = await this.adoClient.searchWorkItems(project, query);

      return results.length > 0 ? { id: results[0].id } : null;
    } catch {
      return null;
    }
  }

  /**
   * Build work item description from user story
   */
  private buildWorkItemDescription(story: UserStoryData, featureId: string): string {
    const lines: string[] = [];

    lines.push(`<h1>${story.title}</h1>`);
    lines.push('');

    if (story.description) {
      lines.push(`<p>${story.description}</p>`);
      lines.push('');
    }

    if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      lines.push('<h2>Acceptance Criteria</h2>');
      lines.push('<ul>');
      for (const ac of story.acceptanceCriteria) {
        lines.push(`  <li>${ac}</li>`);
      }
      lines.push('</ul>');
      lines.push('');
    }

    lines.push('<hr/>');
    lines.push('');
    lines.push(`<p><strong>Feature</strong>: ${featureId}</p>`);
    lines.push(`<p><strong>User Story</strong>: ${story.id}</p>`);
    if (story.project) {
      lines.push(`<p><strong>Project</strong>: ${story.project}</p>`);
    }
    if (story.board) {
      lines.push(`<p><strong>Board</strong>: ${story.board}</p>`);
    }
    lines.push('');
    lines.push('<p><em>Auto-generated by SpecWeave</em></p>');

    return lines.join('\n');
  }

  /**
   * Group user stories by their explicit project field
   */
  private groupByProject(
    userStories: UserStoryData[],
    defaultProject?: string
  ): Map<string, UserStoryData[]> {
    const groups = new Map<string, UserStoryData[]>();

    for (const story of userStories) {
      const project = story.project || defaultProject || 'default';

      if (!groups.has(project)) {
        groups.set(project, []);
      }
      groups.get(project)!.push(story);
    }

    return groups;
  }
}

/**
 * Format per-US sync results for display
 */
export function formatPerUSSyncResults(result: PerUSSyncResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('📊 Per-US ADO Sync Results');
  lines.push('');

  // Group by project
  const byProject = new Map<string, USSyncResult[]>();
  for (const r of [...result.synced, ...result.failed]) {
    const existing = byProject.get(r.projectId) || [];
    existing.push(r);
    byProject.set(r.projectId, existing);
  }

  for (const [projectId, results] of byProject) {
    const adoProject = results[0]?.adoProject || 'N/A';
    const areaPath = results[0]?.areaPath || '';
    lines.push(`**${projectId}** (→ ${adoProject}${areaPath ? ` [${areaPath}]` : ''}):`);
    for (const r of results) {
      const icon = r.action === 'created' ? '✅' :
                   r.action === 'updated' ? '🔄' :
                   r.error ? '❌' : '⏭️';
      if (r.workItemId > 0) {
        lines.push(`  ${icon} ${r.usId} → ${r.adoProject}/${r.workItemId}`);
      } else if (r.error) {
        lines.push(`  ${icon} ${r.usId}: ${r.error}`);
      } else {
        lines.push(`  ${icon} ${r.usId} (${r.action})`);
      }
    }
    lines.push('');
  }

  lines.push(`📈 Summary: ${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.failed} failed`);

  return lines.join('\n');
}
