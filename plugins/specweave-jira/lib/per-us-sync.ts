/**
 * Per-US JIRA Sync (v0.34.0+)
 *
 * Syncs each User Story to its explicitly declared project's JIRA project.
 * Uses the **Project**: field in spec.md (NOT keyword-based classification).
 *
 * Key difference from multi-project-sync:
 * - Multi-project sync uses keyword/heuristic classification
 * - Per-US sync uses EXPLICIT **Project**: field from spec.md
 *
 * @module per-us-sync
 * @since v0.34.0
 */

import type { UserStoryData } from '../../../src/core/living-docs/types.js';
import type { ProjectMappings, JiraMapping } from '../../../src/core/types/config.js';
import type { USExternalRefsMap } from '../../../src/core/types/increment-metadata.js';
import { Logger, consoleLogger } from '../../../src/utils/logger.js';

/**
 * Result of syncing a single US to JIRA
 */
export interface USSyncResult {
  usId: string;
  projectId: string;
  jiraProject: string;
  issueKey: string;
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
  logger?: Logger;
}

/**
 * JIRA client interface (to be injected)
 */
export interface JiraClient {
  createIssue(project: string, issueType: string, summary: string, description: string): Promise<{ key: string; self: string }>;
  updateIssue(issueKey: string, summary: string, description: string): Promise<void>;
  searchIssues(jql: string): Promise<Array<{ key: string; fields: { summary: string } }>>;
  getIssueUrl(issueKey: string): string;
}

/**
 * Per-US JIRA Sync
 *
 * Syncs each US to its declared project's JIRA project.
 */
export class PerUSJiraSync {
  private projectMappings: ProjectMappings;
  private jiraClient: JiraClient;
  private logger: Logger;

  constructor(
    jiraClient: JiraClient,
    projectMappings: ProjectMappings,
    options: { logger?: Logger } = {}
  ) {
    this.jiraClient = jiraClient;
    this.projectMappings = projectMappings;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Sync all user stories to their respective JIRA projects
   *
   * @param userStories - User stories with explicit project fields
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

    this.logger.log(`📡 Per-US JIRA Sync: ${userStories.length} USs across ${groups.size} projects`);

    for (const [projectId, stories] of groups) {
      // Get JIRA mapping for this project
      const mapping = this.projectMappings[projectId]?.jira;

      if (!mapping) {
        // No JIRA mapping for this project
        this.logger.warn(`   ⚠️  No JIRA mapping for project "${projectId}" - skipping ${stories.length} USs`);
        for (const story of stories) {
          failed.push({
            usId: story.id,
            projectId,
            jiraProject: 'N/A',
            issueKey: '',
            url: '',
            action: 'skipped',
            error: `No JIRA mapping for project "${projectId}"`
          });
        }
        continue;
      }

      // Sync each US to this project's JIRA project
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
              jira: {
                provider: 'jira',
                issueNumber: result.issueKey,
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
            jiraProject: mapping.project,
            issueKey: '',
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
   * Sync a single user story to JIRA
   */
  private async syncUserStory(
    story: UserStoryData,
    mapping: JiraMapping,
    featureId: string,
    options: PerUSSyncOptions
  ): Promise<USSyncResult> {
    const summary = `[${featureId}][${story.id}] ${story.title}`;
    const description = this.buildIssueDescription(story, featureId);

    if (options.dryRun) {
      this.logger.log(`   🔍 [DRY-RUN] Would sync ${story.id} to JIRA project ${mapping.project}`);
      return {
        usId: story.id,
        projectId: story.project || 'unknown',
        jiraProject: mapping.project,
        issueKey: '',
        url: '',
        action: 'skipped'
      };
    }

    // Check for existing issue
    const existingIssue = await this.findExistingIssue(mapping.project, story.id);

    if (existingIssue) {
      // Update existing issue
      await this.jiraClient.updateIssue(existingIssue.key, summary, description);

      this.logger.log(`   🔄 Updated ${story.id} → ${existingIssue.key}`);

      return {
        usId: story.id,
        projectId: story.project || 'unknown',
        jiraProject: mapping.project,
        issueKey: existingIssue.key,
        url: this.jiraClient.getIssueUrl(existingIssue.key),
        action: 'updated'
      };
    } else {
      // Create new issue
      const newIssue = await this.jiraClient.createIssue(
        mapping.project,
        'Story',
        summary,
        description
      );

      this.logger.log(`   ✅ Created ${story.id} → ${newIssue.key}`);

      return {
        usId: story.id,
        projectId: story.project || 'unknown',
        jiraProject: mapping.project,
        issueKey: newIssue.key,
        url: this.jiraClient.getIssueUrl(newIssue.key),
        action: 'created'
      };
    }
  }

  /**
   * Find existing issue by US ID in summary
   */
  private async findExistingIssue(
    project: string,
    usId: string
  ): Promise<{ key: string } | null> {
    try {
      const jql = `project = "${project}" AND summary ~ "[${usId}]"`;
      const results = await this.jiraClient.searchIssues(jql);

      return results.length > 0 ? { key: results[0].key } : null;
    } catch {
      return null;
    }
  }

  /**
   * Build issue description from user story
   */
  private buildIssueDescription(story: UserStoryData, featureId: string): string {
    const lines: string[] = [];

    lines.push(`h1. ${story.title}`);
    lines.push('');

    if (story.description) {
      lines.push(story.description);
      lines.push('');
    }

    if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      lines.push('h2. Acceptance Criteria');
      lines.push('');
      for (const ac of story.acceptanceCriteria) {
        lines.push(`* ${ac}`);
      }
      lines.push('');
    }

    lines.push('----');
    lines.push('');
    lines.push(`*Feature*: ${featureId}`);
    lines.push(`*User Story*: ${story.id}`);
    if (story.project) {
      lines.push(`*Project*: ${story.project}`);
    }
    if (story.board) {
      lines.push(`*Board*: ${story.board}`);
    }
    lines.push('');
    lines.push('_Auto-generated by SpecWeave_');

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
  lines.push('📊 Per-US JIRA Sync Results');
  lines.push('');

  // Group by project
  const byProject = new Map<string, USSyncResult[]>();
  for (const r of [...result.synced, ...result.failed]) {
    const existing = byProject.get(r.projectId) || [];
    existing.push(r);
    byProject.set(r.projectId, existing);
  }

  for (const [projectId, results] of byProject) {
    lines.push(`**${projectId}** (→ ${results[0]?.jiraProject || 'N/A'}):`);
    for (const r of results) {
      const icon = r.action === 'created' ? '✅' :
                   r.action === 'updated' ? '🔄' :
                   r.error ? '❌' : '⏭️';
      if (r.issueKey) {
        lines.push(`  ${icon} ${r.usId} → ${r.issueKey}`);
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
