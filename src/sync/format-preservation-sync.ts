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

import path from 'path';
import { LivingDocsUSFile, getOrigin } from '../types/living-docs-us-file.js';
import { GitHubClientV2 } from '../../plugins/specweave-github/lib/github-client-v2.js';
import { JiraClient } from '../integrations/jira/jira-client.js';
import { AdoClient } from '../integrations/ado/ado-client.js';
import { Logger, consoleLogger } from '../utils/logger.js';
import { LockManager } from '../utils/lock-manager.js';

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
  private projectRoot: string;

  constructor(
    config: SyncConfig = {},
    options: { logger?: Logger; projectRoot?: string } = {}
  ) {
    this.config = {
      canUpdateExternalItems: config.canUpdateExternalItems ?? true,
      canUpsertInternalItems: config.canUpsertInternalItems ?? true,
      canUpdateStatus: config.canUpdateStatus ?? true
    };
    this.logger = options.logger ?? consoleLogger;
    this.projectRoot = options.projectRoot ?? process.cwd();
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

    const comment = this.buildCompletionComment(completionData);
    await this.postCommentWithIdempotency(usFile, comment, externalClient);

    // Conditional status update (only if config allows AND progress is 100%)
    if (this.config.canUpdateStatus && completionData.progressPercentage === 100) {
      this.logger.log(`  🔀 Status update enabled (100% complete)`);
      await this.updateExternalStatus(usFile, 'Done', externalClient);
    } else if (this.config.canUpdateStatus) {
      this.logger.log(`  ⏭️  Status update skipped (progress: ${completionData.progressPercentage}% < 100%)`);
    } else {
      this.logger.log(`  ⏭️  Status update skipped (canUpdateStatus=false)`);
    }
  }

  /**
   * Post comment to external tool with idempotency check + atomic locking
   *
   * Handles GitHub, JIRA, and ADO with platform-specific logic.
   * Uses atomic locking to prevent TOCTOU race conditions.
   */
  private async postCommentWithIdempotency(
    usFile: LivingDocsUSFile,
    comment: string,
    externalClient: GitHubClientV2 | JiraClient | AdoClient
  ): Promise<void> {
    if (externalClient instanceof GitHubClientV2) {
      await this.postGitHubCommentWithIdempotency(externalClient, usFile, comment);
    } else if (externalClient instanceof JiraClient) {
      const issueKey = usFile.external_id || usFile.external_tools?.jira?.key || '';
      await this.postJiraCommentWithIdempotency(externalClient, String(issueKey), comment);
    } else if (externalClient instanceof AdoClient) {
      const adoId = usFile.external_id || usFile.external_tools?.ado?.id || '0';
      const workItemId = parseInt(String(adoId), 10);
      await this.postAdoCommentWithIdempotency(externalClient, workItemId, comment);
    }
  }

  /**
   * Post GitHub comment with atomic locking to prevent concurrent duplicates
   */
  private async postGitHubCommentWithIdempotency(
    client: GitHubClientV2,
    usFile: LivingDocsUSFile,
    comment: string
  ): Promise<void> {
    const issueNumber = usFile.external_tools?.github?.number || 0;
    if (!issueNumber) {
      this.logger.log(`  ⚠️ No GitHub issue number, skipping comment`);
      return;
    }

    const lockDir = path.join(
      this.projectRoot,
      '.specweave/state/.locks',
      `github-comment-${issueNumber}`
    );
    const lockManager = new LockManager(lockDir, 30, { logger: this.logger });

    let lockAcquired = false;
    try {
      lockAcquired = await lockManager.acquire();
      if (!lockAcquired) {
        this.logger.log(`  ⏳ Issue #${issueNumber} - Another comment in progress, skipping`);
        return;
      }

      const lastComment = await client.getLastComment(issueNumber);
      if (lastComment && lastComment.body === comment) {
        this.logger.log(`  ⏭️  Skipping duplicate comment (already posted)`);
        return;
      }

      await client.addComment(issueNumber, comment);
      this.logger.log(`  ✅ Posted progress comment to issue #${issueNumber}`);
    } finally {
      if (lockAcquired) {
        await lockManager.release();
      }
    }
  }

  /**
   * Update external tool status to target state
   *
   * @param usFile - User story file with external tool info
   * @param targetStatus - Target status name (e.g., "Done", "Closed")
   * @param externalClient - External tool client instance
   */
  private async updateExternalStatus(
    usFile: LivingDocsUSFile,
    targetStatus: string,
    externalClient: GitHubClientV2 | JiraClient | AdoClient
  ): Promise<void> {
    try {
      if (externalClient instanceof JiraClient) {
        const issueKey = usFile.external_tools?.jira?.key || usFile.external_id || '';
        if (issueKey && issueKey.includes('-')) {
          await externalClient.updateIssue({
            key: issueKey,
            status: targetStatus
          });
          this.logger.log(`  ✅ Transitioned JIRA ${issueKey} to ${targetStatus}`);
        }
      } else if (externalClient instanceof AdoClient) {
        const workItemId = usFile.external_tools?.ado?.id || parseInt(usFile.external_id || '0', 10);
        if (workItemId > 0) {
          await externalClient.updateWorkItem({
            id: workItemId,
            state: targetStatus === 'Done' ? 'Closed' : targetStatus
          });
          this.logger.log(`  ✅ Updated ADO work item #${workItemId} to ${targetStatus}`);
        }
      } else if (externalClient instanceof GitHubClientV2) {
        const issueNumber = usFile.external_tools?.github?.number || 0;
        if (issueNumber > 0) {
          await externalClient.closeIssue(issueNumber, `Closed automatically by SpecWeave (100% complete)`);
          this.logger.log(`  ✅ Closed GitHub issue #${issueNumber}`);
        }
      }
    } catch (error) {
      this.logger.log(`  ⚠️  Status update failed: ${error}`);
      this.logger.log(`     Manual status update may be required`);
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

    if (!this.config.canUpdateExternalItems) {
      this.logger.log(`  ⏭️  External updates skipped (canUpdateExternalItems=false)`);
      return;
    }

    this.logger.log(`  ✅ External updates enabled`);

    const comment = this.buildCompletionComment(completionData);
    await this.postCommentWithIdempotency(usFile, comment, externalClient);

    // Update status if allowed AND progress is 100%
    if (this.config.canUpdateStatus && completionData.progressPercentage === 100) {
      this.logger.log(`  🔀 Status update enabled (100% complete)`);
      await this.updateExternalStatus(usFile, 'Done', externalClient);
    } else if (this.config.canUpdateStatus) {
      this.logger.log(`  ⏭️  Status update skipped (progress: ${completionData.progressPercentage}% < 100%)`);
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
   * Post JIRA comment with atomic locking to prevent concurrent duplicates
   * FIX: Prevent duplicate comments under concurrent load
   *
   * Note: JIRA doesn't have a simple getComments API exposed in our client,
   * so we rely on atomic locking to serialize comment posts per issue.
   */
  private async postJiraCommentWithIdempotency(
    client: JiraClient,
    issueKey: string,
    comment: string
  ): Promise<void> {
    if (!issueKey) {
      this.logger.log(`  ⚠️ No JIRA issue key, skipping comment`);
      return;
    }

    // ATOMIC LOCK: Serialize comment posts per issue to prevent duplicates
    const lockDir = path.join(
      this.projectRoot,
      '.specweave/state/.locks',
      `jira-comment-${issueKey}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    );
    const lockManager = new LockManager(lockDir, 30, { logger: this.logger });

    let lockAcquired = false;
    try {
      lockAcquired = await lockManager.acquire();
      if (!lockAcquired) {
        this.logger.log(`  ⏳ JIRA ${issueKey} - Another comment in progress, skipping`);
        return;
      }

      await client.addComment(issueKey, comment);
      this.logger.log(`  ✅ Posted progress comment to JIRA ${issueKey}`);
    } finally {
      if (lockAcquired) {
        await lockManager.release();
      }
    }
  }

  /**
   * Post ADO comment with atomic locking to prevent concurrent duplicates
   * FIX: Prevent duplicate comments under concurrent load
   *
   * Note: ADO doesn't have a simple getComments API exposed in our client,
   * so we rely on atomic locking to serialize comment posts per work item.
   */
  private async postAdoCommentWithIdempotency(
    client: AdoClient,
    workItemId: number,
    comment: string
  ): Promise<void> {
    if (!workItemId) {
      this.logger.log(`  ⚠️ No ADO work item ID, skipping comment`);
      return;
    }

    // ATOMIC LOCK: Serialize comment posts per work item to prevent duplicates
    const lockDir = path.join(
      this.projectRoot,
      '.specweave/state/.locks',
      `ado-comment-${workItemId}`
    );
    const lockManager = new LockManager(lockDir, 30, { logger: this.logger });

    let lockAcquired = false;
    try {
      lockAcquired = await lockManager.acquire();
      if (!lockAcquired) {
        this.logger.log(`  ⏳ ADO #${workItemId} - Another comment in progress, skipping`);
        return;
      }

      await client.addComment(workItemId, comment);
      this.logger.log(`  ✅ Posted progress comment to ADO #${workItemId}`);
    } finally {
      if (lockAcquired) {
        await lockManager.release();
      }
    }
  }
}
