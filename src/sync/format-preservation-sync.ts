/**
 * Format Preservation Sync Service (T-034B)
 *
 * Routes sync to comment-only mode for external items (preserves original format)
 * and full sync mode for internal items (allows title/description updates).
 *
 * Architecture:
 * - External US (origin=external): Comment-only sync (no title/description changes)
 * - Internal US (origin=internal): Full sync (title, description, status, comments)
 */

import { LivingDocsUSFile, getOrigin } from '../types/living-docs-us-file.js';
import { GitHubClientV2 } from '../../plugins/specweave-github/lib/github-client-v2.js';
import { JiraClient } from '../integrations/jira/jira-client.js';
import { AdoClient } from '../integrations/ado/ado-client.js';
import { Logger, consoleLogger } from '../utils/logger.js';

export interface SyncConfig {
  /** Allow updating external items from SpecWeave (Internal → External) */
  canUpdateExternalItems?: boolean;

  /** Allow upserting internal items from external tools (External → Internal) */
  canUpsertInternalItems?: boolean;

  /** Allow status updates (both directions) */
  canUpdateStatus?: boolean;
}

export interface TaskCompletionInfo {
  taskId: string;
  title: string;
  completed: boolean;
}

export interface ACCompletionInfo {
  acId: string;
  description: string;
  satisfied: boolean;
}

export interface CompletionCommentData {
  tasks: TaskCompletionInfo[];
  acceptanceCriteria: ACCompletionInfo[];
  progressPercentage: number;
  livingDocsUrl?: string;
}

export class FormatPreservationSyncService {
  private logger: Logger;
  private config: SyncConfig;

  constructor(
    config: SyncConfig = {},
    options: { logger?: Logger } = {}
  ) {
    this.config = {
      canUpdateExternalItems: config.canUpdateExternalItems ?? false,
      canUpsertInternalItems: config.canUpsertInternalItems ?? false,
      canUpdateStatus: config.canUpdateStatus ?? false
    };
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Sync User Story to external tool with origin-based routing
   *
   * - External US (origin=external) → Comment-only sync
   * - Internal US (origin=internal) → Full sync
   */
  async syncUserStory(
    usFile: LivingDocsUSFile,
    completionData: CompletionCommentData,
    externalClient: GitHubClientV2 | JiraClient | AdoClient
  ): Promise<void> {
    const origin = getOrigin(usFile);

    this.logger.log(`📊 Syncing ${usFile.id} (origin: ${origin})`);

    if (origin === 'external') {
      // External US: Comment-only sync (preserves format)
      await this.syncExternalUS(usFile, completionData, externalClient);
    } else {
      // Internal US: Full sync (allows updates)
      await this.syncInternalUS(usFile, completionData, externalClient);
    }
  }

  /**
   * Sync External US (Comment-only mode)
   *
   * Preserves original title/description, only adds completion comments
   */
  private async syncExternalUS(
    usFile: LivingDocsUSFile,
    completionData: CompletionCommentData,
    externalClient: GitHubClientV2 | JiraClient | AdoClient
  ): Promise<void> {
    this.logger.log(`  💬 External US: Comment-only sync (format preserved)`);

    // Build completion comment
    const comment = this.buildCompletionComment(completionData);

    // Post comment to external tool
    if (externalClient instanceof GitHubClientV2) {
      const issueNumber = this.extractIssueNumber(usFile.external_id || '');
      await externalClient.addComment(issueNumber, comment);
    } else if (externalClient instanceof JiraClient) {
      const issueKey = usFile.external_id || '';
      await externalClient.addComment(issueKey, comment);
    } else if (externalClient instanceof AdoClient) {
      const workItemId = parseInt(usFile.external_id || '0', 10);
      await externalClient.addComment(workItemId, comment);
    }

    // Conditional status update (only if config allows)
    if (this.config.canUpdateStatus) {
      this.logger.log(`  ✅ Status update enabled`);
      // TODO: Implement status update logic
    } else {
      this.logger.log(`  ⏭️  Status update skipped (canUpdateStatus=false)`);
    }
  }

  /**
   * Sync Internal US (Full sync mode)
   *
   * Allows updating title, description, status, and comments
   */
  private async syncInternalUS(
    usFile: LivingDocsUSFile,
    completionData: CompletionCommentData,
    externalClient: GitHubClientV2 | JiraClient | AdoClient
  ): Promise<void> {
    this.logger.log(`  🔄 Internal US: Full sync (updates allowed)`);

    // Full sync: Update title, description, comments, status
    if (this.config.canUpdateExternalItems) {
      this.logger.log(`  ✅ External updates enabled`);

      // Build completion comment
      const comment = this.buildCompletionComment(completionData);

      // Post comment
      if (externalClient instanceof GitHubClientV2) {
        const issueNumber = this.extractIssueNumber(usFile.external_id || '');
        await externalClient.addComment(issueNumber, comment);

        // Update title/description if needed
        // TODO: Implement title/description update logic
      } else if (externalClient instanceof JiraClient) {
        const issueKey = usFile.external_id || '';
        await externalClient.addComment(issueKey, comment);
      } else if (externalClient instanceof AdoClient) {
        const workItemId = parseInt(usFile.external_id || '0', 10);
        await externalClient.addComment(workItemId, comment);
      }

      // Update status if allowed
      if (this.config.canUpdateStatus) {
        this.logger.log(`  ✅ Status update enabled`);
        // TODO: Implement status update logic
      }
    } else {
      this.logger.log(`  ⏭️  External updates skipped (canUpdateExternalItems=false)`);
    }
  }

  /**
   * Build completion comment with task/AC progress
   *
   * Format:
   * ## Progress Update
   *
   * ### Completed Tasks
   * - ✅ [T-001] Task title
   * - ✅ [T-002] Another task
   *
   * ### Acceptance Criteria
   * - ✅ **AC-US1-01**: Criteria description
   * - ✅ **AC-US1-02**: Another criteria
   *
   * **Progress**: 8/11 tasks completed (73%)
   *
   * [View Living Docs](url)
   */
  buildCompletionComment(data: CompletionCommentData): string {
    const lines: string[] = [];

    lines.push('## Progress Update');
    lines.push('');

    // Completed tasks
    const completedTasks = data.tasks.filter(t => t.completed);
    if (completedTasks.length > 0) {
      lines.push('### Completed Tasks');
      lines.push('');
      for (const task of completedTasks) {
        lines.push(`- ✅ [${task.taskId}] ${task.title}`);
      }
      lines.push('');
    }

    // Acceptance criteria
    const satisfiedACs = data.acceptanceCriteria.filter(ac => ac.satisfied);
    if (satisfiedACs.length > 0) {
      lines.push('### Acceptance Criteria');
      lines.push('');
      for (const ac of satisfiedACs) {
        lines.push(`- ✅ **${ac.acId}**: ${ac.description}`);
      }
      lines.push('');
    }

    // Progress summary
    const totalTasks = data.tasks.length;
    const completed = completedTasks.length;
    lines.push(`**Progress**: ${completed}/${totalTasks} tasks completed (${data.progressPercentage}%)`);
    lines.push('');

    // Living docs link
    if (data.livingDocsUrl) {
      lines.push(`[View Living Docs](${data.livingDocsUrl})`);
    }

    return lines.join('\n');
  }

  /**
   * Extract issue number from external_id
   * Examples: "GH-#123" → 123, "#456" → 456
   */
  private extractIssueNumber(externalId: string): number {
    const match = externalId.match(/#(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
