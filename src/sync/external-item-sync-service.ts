/**
 * External Item Sync Service
 *
 * Handles synchronization with external tools (GitHub, JIRA, ADO) while
 * preserving original item format and preventing unintended modifications.
 *
 * Key Features:
 * - Comment-based updates for external items (format preservation)
 * - Full sync for internal items (title, description, ACs)
 * - Format preservation validation
 * - External title immutability
 *
 * Part of increment 0047-us-task-linkage (T-034B)
 */

import * as fs from '../utils/fs-native.js';
import path from 'path';
import matter from 'gray-matter';
import type { Logger } from '../utils/logger.js';
import { consoleLogger } from '../utils/logger.js';
import type { LivingDocsUSFile } from '../types/living-docs-us-file.js';
import { FormatPreservationValidator } from '../validators/format-preservation-validator.js';
import type { SyncOperation } from '../validators/format-preservation-validator.js';

/**
 * Task completion data for sync
 */
export interface TaskCompletionData {
  /** Task ID (e.g., "T-034") */
  taskId: string;

  /** Feature ID (e.g., "FS-047") */
  featureId: string;

  /** User Story ID (e.g., "US-009") */
  usId: string;

  /** Acceptance criteria satisfied by this task */
  satisfiesACs: string[];

  /** Completed tasks count */
  completedTasks: number;

  /** Total tasks count */
  totalTasks: number;

  /** Completion percentage */
  percentage: number;

  /** Living docs URL */
  livingDocsUrl?: string;

  /** Task title */
  taskTitle: string;

  /** Task status */
  status: 'completed' | 'in_progress' | 'pending';
}

/**
 * Sync options
 */
export interface SyncOptions {
  /** Project root directory */
  projectRoot: string;

  /** External tool (github, jira, ado) */
  externalTool?: 'github' | 'jira' | 'ado';

  /** Force full sync (ignore format_preservation flag) */
  forceFullSync?: boolean;

  /** Dry run (don't actually sync, just log what would happen) */
  dryRun?: boolean;

  /** Logger instance */
  logger?: Logger;
}

/**
 * Sync result
 */
export interface SyncResult {
  /** Success flag */
  success: boolean;

  /** Sync mode used */
  mode: 'comment-only' | 'full-sync' | 'skipped';

  /** Reason for mode selection */
  reason: string;

  /** Comment posted (if comment-only mode) */
  comment?: string;

  /** Fields updated (if full-sync mode) */
  updatedFields?: string[];

  /** Error message (if failed) */
  error?: string;
}

/**
 * External Item Sync Service
 *
 * Routes sync operations based on format_preservation flag.
 * External items (format_preservation=true) → comment-only sync
 * Internal items (format_preservation=false) → full sync
 */
export class ExternalItemSyncService {
  private logger: Logger;
  private validator: FormatPreservationValidator;

  constructor(options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.validator = new FormatPreservationValidator({ logger: this.logger });
  }

  /**
   * Sync task completion to external tool
   *
   * Routes to comment-only or full sync based on format_preservation flag
   *
   * @param completionData - Task completion data
   * @param options - Sync options
   * @returns Sync result
   */
  async syncTaskCompletion(
    completionData: TaskCompletionData,
    options: SyncOptions
  ): Promise<SyncResult> {
    try {
      this.logger.log(`   🔄 Syncing task ${completionData.taskId} completion for ${completionData.usId}...`);

      // Read format preservation flag from living docs
      const formatPreservation = await this.getFormatPreservation(
        completionData.usId,
        completionData.featureId,
        options.projectRoot
      );

      // Force full sync if requested (e.g., for internal items or testing)
      if (options.forceFullSync) {
        this.logger.log(`   📝 Full sync mode (force flag enabled)`);
        return await this.fullSync(completionData, options);
      }

      // Route based on format_preservation flag
      if (formatPreservation) {
        this.logger.log(`   💬 Comment-only mode (format preservation enabled)`);
        return await this.commentOnlySync(completionData, options);
      } else {
        this.logger.log(`   📝 Full sync mode (format preservation disabled)`);
        return await this.fullSync(completionData, options);
      }
    } catch (error: any) {
      this.logger.error(`   ❌ Sync failed for ${completionData.taskId}:`, error);
      return {
        success: false,
        mode: 'skipped',
        reason: 'Error during sync',
        error: error.message
      };
    }
  }

  /**
   * Get format_preservation flag from living docs User Story file
   *
   * @param usId - User Story ID (e.g., "US-009")
   * @param featureId - Feature ID (e.g., "FS-047")
   * @param projectRoot - Project root directory
   * @returns True if format preservation enabled
   */
  private async getFormatPreservation(
    usId: string,
    featureId: string,
    projectRoot: string
  ): Promise<boolean> {
    try {
      // Find US file in living docs
      const usFilePath = await this.findUSFile(projectRoot, featureId, usId);

      if (!usFilePath) {
        this.logger.warn(`   ⚠️  Living docs file not found for ${usId}, defaulting to full sync`);
        return false;
      }

      // Parse frontmatter
      const content = await fs.readFile(usFilePath, 'utf-8');
      const parsed = matter(content);
      const frontmatter = parsed.data as Partial<LivingDocsUSFile>;

      // Default to false (full sync) if not specified
      return frontmatter.format_preservation === true;
    } catch (error: any) {
      this.logger.warn(`   ⚠️  Failed to read format_preservation for ${usId}: ${error.message}`);
      return false; // Default to full sync on error
    }
  }

  /**
   * Find User Story file in living docs
   *
   * @param projectRoot - Project root
   * @param featureId - Feature ID (e.g., "FS-047")
   * @param usId - User Story ID (e.g., "US-009")
   * @returns Path to US file or null if not found
   */
  private async findUSFile(
    projectRoot: string,
    featureId: string,
    usId: string
  ): Promise<string | null> {
    // Pattern: .specweave/docs/internal/specs/{project}/{feature}/us-{id}-*.md
    const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');

    // Search in all projects (default and multi-project)
    const projectDirs = await this.getProjectDirs(specsDir);

    for (const projectDir of projectDirs) {
      const featureDir = path.join(projectDir, featureId);

      if (!await fs.pathExists(featureDir)) continue;

      const files = await fs.readdir(featureDir);
      const usFile = files.find(f => f.toLowerCase().startsWith(`${usId.toLowerCase()}-`));

      if (usFile) {
        return path.join(featureDir, usFile);
      }
    }

    return null;
  }

  /**
   * Get all project directories in specs
   *
   * @param specsDir - Specs directory
   * @returns Array of project directory paths
   */
  private async getProjectDirs(specsDir: string): Promise<string[]> {
    if (!await fs.pathExists(specsDir)) {
      return [];
    }

    const entries = await fs.readdir(specsDir, { withFileTypes: true });
    const projectDirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('_'))
      .map(e => path.join(specsDir, e.name));

    return projectDirs;
  }

  /**
   * Get User Story file frontmatter (for external issue links)
   *
   * @param usId - User Story ID (e.g., "US-009")
   * @param featureId - Feature ID (e.g., "FS-047")
   * @param projectRoot - Project root directory
   * @returns Parsed frontmatter or null
   */
  private async getUsFileFrontmatter(
    usId: string,
    featureId: string,
    projectRoot: string
  ): Promise<Record<string, any> | null> {
    try {
      const usFilePath = await this.findUSFile(projectRoot, featureId, usId);
      if (!usFilePath) return null;
      const content = await fs.readFile(usFilePath, 'utf-8');
      const parsed = matter(content);
      return parsed.data as Record<string, any>;
    } catch {
      return null;
    }
  }

  /**
   * Comment-only sync: Post completion update as comment
   *
   * Does NOT modify external item title, description, or acceptance criteria.
   * Only posts a comment with task completion status.
   *
   * @param completionData - Task completion data
   * @param options - Sync options
   * @returns Sync result
   */
  private async commentOnlySync(
    completionData: TaskCompletionData,
    options: SyncOptions
  ): Promise<SyncResult> {
    // Format completion comment
    const comment = this.formatCompletionComment(completionData);

    if (options.dryRun) {
      this.logger.log(`   🔍 [DRY RUN] Would post comment:\n${comment}`);
      return {
        success: true,
        mode: 'comment-only',
        reason: 'Format preservation enabled (external item)',
        comment
      };
    }

    // Post comment via external tool API
    if (options.externalTool === 'github') {
      try {
        const { GitHubClientV2 } = await import('../../plugins/specweave-github/lib/github-client-v2.js');
        const configPath = path.join(options.projectRoot, '.specweave/config.json');
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        const owner = config.sync?.github?.owner ?? config.sync?.profiles?.default?.config?.owner;
        const repo = config.sync?.github?.repo ?? config.sync?.profiles?.default?.config?.repo;
        if (owner && repo) {
          const client = GitHubClientV2.fromRepo(owner, repo);
          const usFile = await this.getUsFileFrontmatter(completionData.usId, completionData.featureId, options.projectRoot);
          const issueNumber = usFile?.external?.github?.issue;
          if (issueNumber) {
            await client.addComment(issueNumber, comment);
            this.logger.log(`   ✅ Comment posted to GitHub issue #${issueNumber}`);
          } else {
            this.logger.log(`   ⚠️ No GitHub issue linked to ${completionData.usId} — comment logged only`);
          }
        }
      } catch (error: any) {
        this.logger.error(`   ⚠️ Failed to post comment to GitHub: ${error.message}`);
      }
    } else if (options.externalTool === 'jira') {
      try {
        const { JiraClient } = await import('../integrations/jira/jira-client.js');
        const jiraClient = new JiraClient();
        const usFile = await this.getUsFileFrontmatter(completionData.usId, completionData.featureId, options.projectRoot);
        const jiraKey = usFile?.external?.jira?.issueKey;
        if (jiraKey) {
          await jiraClient.addComment(jiraKey, comment);
          this.logger.log(`   ✅ Comment posted to JIRA issue ${jiraKey}`);
        } else {
          this.logger.log(`   ⚠️ No JIRA issue linked to ${completionData.usId} — comment logged only`);
        }
      } catch (error: any) {
        this.logger.error(`   ⚠️ Failed to post comment to JIRA: ${error.message}`);
      }
    } else if (options.externalTool === 'ado') {
      try {
        const usFile = await this.getUsFileFrontmatter(completionData.usId, completionData.featureId, options.projectRoot);
        const workItemId = usFile?.external?.ado?.workItemId;
        if (workItemId) {
          const { AdoClient } = await import('../integrations/ado/ado-client.js');
          const { getAdoPat } = await import('../integrations/ado/ado-pat-provider.js');
          const configPath = path.join(options.projectRoot, '.specweave/config.json');
          const configContent = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(configContent);
          const org = config.sync?.ado?.organization ?? config.sync?.profiles?.default?.config?.organization;
          const project = config.sync?.ado?.project ?? config.sync?.profiles?.default?.config?.project;
          if (org && project) {
            const pat = getAdoPat(org);
            const adoClient = new AdoClient({ pat, organization: org, project });
            await adoClient.addComment(workItemId, comment);
            this.logger.log(`   ✅ Comment posted to ADO work item #${workItemId}`);
          }
        } else {
          this.logger.log(`   ⚠️ No ADO work item linked to ${completionData.usId} — comment logged only`);
        }
      } catch (error: any) {
        this.logger.error(`   ⚠️ Failed to post comment to ADO: ${error.message}`);
      }
    } else {
      this.logger.log(`   💬 Comment to post (no external tool configured):\n${comment}`);
    }

    return {
      success: true,
      mode: 'comment-only',
      reason: 'Format preservation enabled (external item)',
      comment
    };
  }

  /**
   * Full sync: Update external item title, description, ACs
   *
   * Used for internal items or when format preservation disabled.
   *
   * @param completionData - Task completion data
   * @param options - Sync options
   * @returns Sync result
   */
  private async fullSync(
    completionData: TaskCompletionData,
    options: SyncOptions
  ): Promise<SyncResult> {
    const updatedFields: string[] = [];

    // Validate sync operation (NEW - T-034C)
    const formatPreservation = await this.getFormatPreservation(
      completionData.usId,
      completionData.featureId,
      options.projectRoot
    );

    const syncOperation: SyncOperation = {
      usId: completionData.usId,
      formatPreservation,
      updates: ['title', 'description', 'acceptance_criteria'],
      origin: formatPreservation ? 'external' : 'internal'
    };

    const validation = this.validator.validate(syncOperation);

    if (!validation.valid) {
      this.logger.error(`   ❌ Full sync blocked by format preservation validation:`, validation.errors?.join(', '));
      return {
        success: false,
        mode: 'skipped',
        reason: 'Format preservation validation failed',
        error: validation.errors?.join('; ')
      };
    }

    if (options.dryRun) {
      this.logger.log(`   🔍 [DRY RUN] Would perform full sync for ${completionData.usId}`);
      return {
        success: true,
        mode: 'full-sync',
        reason: 'Format preservation disabled (internal item)',
        updatedFields: validation.allowedFields
      };
    }

    // TODO: Implement full sync logic
    // - Update external item title
    // - Update external item description
    // - Update acceptance criteria checkboxes
    this.logger.log(`   📝 Full sync for ${completionData.usId} (not yet implemented)`);

    return {
      success: true,
      mode: 'full-sync',
      reason: 'Format preservation disabled (internal item)',
      updatedFields: validation.allowedFields
    };
  }

  /**
   * Format completion comment for external tool
   *
   * @param data - Task completion data
   * @returns Formatted comment
   */
  private formatCompletionComment(data: TaskCompletionData): string {
    const statusEmoji = data.status === 'completed' ? '✅' : '🔄';

    return `${statusEmoji} **[${data.featureId}][${data.taskId}]** ${data.taskTitle}

**Status**: ${data.status}
**Acceptance Criteria Satisfied**: ${data.satisfiesACs.length > 0 ? data.satisfiesACs.join(', ') : 'None'}
**Progress**: ${data.completedTasks}/${data.totalTasks} tasks (${data.percentage}%)
${data.livingDocsUrl ? `**Living Docs**: [View spec](${data.livingDocsUrl})` : ''}

---
*Auto-posted by SpecWeave format preservation sync*`;
  }
}
