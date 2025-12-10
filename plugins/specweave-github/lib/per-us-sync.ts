/**
 * Per-US GitHub Sync (v0.34.0+)
 *
 * Syncs each User Story to its explicitly declared project's GitHub repo.
 * Uses the **Project**: field in spec.md (NOT keyword-based classification).
 *
 * Key difference from multi-project-sync:
 * - Multi-project sync uses keyword/heuristic classification
 * - Per-US sync uses EXPLICIT **Project**: field from spec.md
 *
 * @module per-us-sync
 * @since v0.34.0
 */

import { Octokit } from '@octokit/rest';
import type { UserStoryData } from '../../../src/core/living-docs/types.js';
import type { ProjectMappings, GitHubMapping } from '../../../src/core/types/config.js';
import type { USExternalRef, USExternalRefsMap } from '../../../src/core/types/increment-metadata.js';
import { Logger, consoleLogger } from '../../../src/utils/logger.js';

/**
 * Result of syncing a single US to GitHub
 */
export interface USSyncResult {
  usId: string;
  projectId: string;
  repo: string;
  issueNumber: number;
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
 * Per-US GitHub Sync
 *
 * Syncs each US to its declared project's GitHub repository.
 */
export class PerUSGitHubSync {
  private token: string;
  private projectMappings: ProjectMappings;
  private octokit: Octokit;
  private logger: Logger;

  constructor(
    token: string,
    projectMappings: ProjectMappings,
    options: { logger?: Logger } = {}
  ) {
    this.token = token;
    this.projectMappings = projectMappings;
    this.octokit = new Octokit({ auth: token });
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Sync all user stories to their respective GitHub repos
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

    this.logger.log(`📡 Per-US GitHub Sync: ${userStories.length} USs across ${groups.size} projects`);

    for (const [projectId, stories] of groups) {
      // Get GitHub mapping for this project
      const mapping = this.projectMappings[projectId]?.github;

      if (!mapping) {
        // No GitHub mapping for this project
        this.logger.warn(`   ⚠️  No GitHub mapping for project "${projectId}" - skipping ${stories.length} USs`);
        for (const story of stories) {
          failed.push({
            usId: story.id,
            projectId,
            repo: 'N/A',
            issueNumber: 0,
            url: '',
            action: 'skipped',
            error: `No GitHub mapping for project "${projectId}"`
          });
        }
        continue;
      }

      // Sync each US to this project's repo
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
              github: {
                provider: 'github',
                issueNumber: result.issueNumber,
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
            repo: `${mapping.owner}/${mapping.repo}`,
            issueNumber: 0,
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
   * Sync a single user story to GitHub
   */
  private async syncUserStory(
    story: UserStoryData,
    mapping: GitHubMapping,
    featureId: string,
    options: PerUSSyncOptions
  ): Promise<USSyncResult> {
    const title = `[${featureId}][${story.id}] ${story.title}`;
    const body = this.buildIssueBody(story, featureId);

    if (options.dryRun) {
      this.logger.log(`   🔍 [DRY-RUN] Would sync ${story.id} to ${mapping.owner}/${mapping.repo}`);
      return {
        usId: story.id,
        projectId: story.project || 'unknown',
        repo: `${mapping.owner}/${mapping.repo}`,
        issueNumber: 0,
        url: '',
        action: 'skipped'
      };
    }

    // Check for existing issue
    const existingIssue = await this.findExistingIssue(mapping, story.id);

    if (existingIssue) {
      // Update existing issue
      const response = await this.octokit.issues.update({
        owner: mapping.owner,
        repo: mapping.repo,
        issue_number: existingIssue.number,
        title,
        body
      });

      this.logger.log(`   🔄 Updated ${story.id} → ${mapping.owner}/${mapping.repo}#${response.data.number}`);

      return {
        usId: story.id,
        projectId: story.project || 'unknown',
        repo: `${mapping.owner}/${mapping.repo}`,
        issueNumber: response.data.number,
        url: response.data.html_url,
        action: 'updated'
      };
    } else {
      // Create new issue
      const response = await this.octokit.issues.create({
        owner: mapping.owner,
        repo: mapping.repo,
        title,
        body,
        labels: ['specweave', 'user-story']
      });

      this.logger.log(`   ✅ Created ${story.id} → ${mapping.owner}/${mapping.repo}#${response.data.number}`);

      return {
        usId: story.id,
        projectId: story.project || 'unknown',
        repo: `${mapping.owner}/${mapping.repo}`,
        issueNumber: response.data.number,
        url: response.data.html_url,
        action: 'created'
      };
    }
  }

  /**
   * Find existing issue by US ID in title
   */
  private async findExistingIssue(
    mapping: GitHubMapping,
    usId: string
  ): Promise<{ number: number } | null> {
    try {
      const response = await this.octokit.issues.listForRepo({
        owner: mapping.owner,
        repo: mapping.repo,
        labels: 'specweave',
        state: 'all',
        per_page: 100
      });

      const existing = response.data.find(issue =>
        issue.title.includes(`[${usId}]`)
      );

      return existing ? { number: existing.number } : null;
    } catch {
      return null;
    }
  }

  /**
   * Build issue body from user story
   */
  private buildIssueBody(story: UserStoryData, featureId: string): string {
    const lines: string[] = [];

    lines.push(`# ${story.title}`);
    lines.push('');

    if (story.description) {
      lines.push(story.description);
      lines.push('');
    }

    if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      lines.push('## Acceptance Criteria');
      lines.push('');
      for (const ac of story.acceptanceCriteria) {
        lines.push(`- [ ] ${ac}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push(`**Feature**: ${featureId}`);
    lines.push(`**User Story**: ${story.id}`);
    if (story.project) {
      lines.push(`**Project**: ${story.project}`);
    }
    if (story.board) {
      lines.push(`**Board**: ${story.board}`);
    }
    lines.push('');
    lines.push('🤖 Auto-generated by SpecWeave');

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
  lines.push('📊 Per-US GitHub Sync Results');
  lines.push('');

  // Group by project
  const byProject = new Map<string, USSyncResult[]>();
  for (const r of [...result.synced, ...result.failed]) {
    const existing = byProject.get(r.projectId) || [];
    existing.push(r);
    byProject.set(r.projectId, existing);
  }

  for (const [projectId, results] of byProject) {
    lines.push(`**${projectId}**:`);
    for (const r of results) {
      const icon = r.action === 'created' ? '✅' :
                   r.action === 'updated' ? '🔄' :
                   r.error ? '❌' : '⏭️';
      if (r.issueNumber > 0) {
        lines.push(`  ${icon} ${r.usId} → ${r.repo}#${r.issueNumber}`);
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
