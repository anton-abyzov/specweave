/**
 * JIRA Reconciler (NEW in v0.33.0)
 *
 * Reconciles JIRA issue states with increment metadata.json statuses.
 * Fixes drift between local SpecWeave state and JIRA:
 * - Closes issues for completed increments that are still open
 * - Reopens issues for in-progress increments that are closed
 *
 * Mirrors the GitHub reconciler pattern for consistency.
 *
 * Triggered by:
 * - /specweave-jira:reconcile command (manual)
 * - SessionStart hook (automatic, if configured)
 * - post-increment-status-change.sh (on resume/abandon)
 */

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { Logger, consoleLogger } from '../utils/logger.js';

export interface JiraReconcileOptions {
  projectRoot: string;
  dryRun?: boolean;
  logger?: Logger;
}

export interface IncrementJiraState {
  incrementId: string;
  incrementPath: string;
  metadataStatus: string;
  featureId?: string;
  issue?: {
    key: string;
    url?: string;
  };
  userStoryIssues: Array<{
    userStoryId: string;
    issueKey: string;
  }>;
}

export interface JiraReconcileResult {
  scanned: number;
  mismatches: number;
  closed: number;
  reopened: number;
  errors: string[];
  details: Array<{
    incrementId: string;
    action: 'close' | 'reopen' | 'skip' | 'error';
    issueKey: string;
    reason: string;
  }>;
}

/**
 * JIRA Status Mapping
 */
const JIRA_STATUSES = {
  CLOSED: ['Done', 'Closed', 'Resolved', "Won't Do"],
  OPEN: ['To Do', 'In Progress', 'In Review', 'Open', 'Reopened'],
};

export class JiraReconciler {
  private projectRoot: string;
  private dryRun: boolean;
  private logger: Logger;
  private domain: string = '';
  private auth: string = '';

  constructor(options: JiraReconcileOptions) {
    this.projectRoot = options.projectRoot;
    this.dryRun = options.dryRun ?? false;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Main reconciliation entry point
   */
  async reconcile(): Promise<JiraReconcileResult> {
    const result: JiraReconcileResult = {
      scanned: 0,
      mismatches: 0,
      closed: 0,
      reopened: 0,
      errors: [],
      details: [],
    };

    try {
      // 1. Check if JIRA sync is enabled
      const config = await this.loadConfig();
      const canUpdate = config.sync?.settings?.canUpdateExternalItems ?? false;
      const canUpdateStatus = config.sync?.settings?.canUpdateStatus ?? false;
      const jiraEnabled = config.sync?.jira?.enabled ?? false;

      if (!canUpdate || !jiraEnabled) {
        this.logger.log('ℹ️  JIRA sync is disabled - skipping reconciliation');
        this.logger.log('   Enable with: canUpdateExternalItems=true AND sync.jira.enabled=true');
        return result;
      }

      if (!canUpdateStatus) {
        this.logger.log('ℹ️  JIRA status updates are disabled - skipping reconciliation');
        this.logger.log('   Enable with: canUpdateStatus=true');
        return result;
      }

      // 2. Verify JIRA credentials
      if (!this.initCredentials()) {
        result.errors.push('JIRA credentials not configured');
        this.logger.error('❌ JIRA credentials not found. Set JIRA_API_TOKEN and JIRA_EMAIL environment variables.');
        return result;
      }

      // 3. Scan all non-archived increments
      const increments = await this.scanIncrements();
      result.scanned = increments.length;

      this.logger.log(`\n📊 Scanning ${increments.length} increment(s) for JIRA state drift...\n`);

      // 4. Check and fix each increment
      for (const inc of increments) {
        await this.reconcileIncrement(inc, result);
      }

      // 5. Report summary
      this.logger.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log('📊 JIRA RECONCILIATION SUMMARY');
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log(`   Increments scanned:  ${result.scanned}`);
      this.logger.log(`   Mismatches found:    ${result.mismatches}`);
      this.logger.log(`   Issues closed:       ${result.closed}`);
      this.logger.log(`   Issues reopened:     ${result.reopened}`);
      this.logger.log(`   Errors:              ${result.errors.length}`);
      if (this.dryRun) {
        this.logger.log('\n   ⚠️  DRY RUN - No changes were made');
      }
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return result;
    } catch (error: any) {
      result.errors.push(`Reconciliation error: ${error.message}`);
      this.logger.error('❌ Reconciliation failed:', error.message);
      return result;
    }
  }

  /**
   * Reconcile a single increment
   */
  private async reconcileIncrement(
    inc: IncrementJiraState,
    result: JiraReconcileResult
  ): Promise<void> {
    const status = inc.metadataStatus;

    // Determine expected JIRA state
    const shouldBeClosed = status === 'completed' || status === 'abandoned';
    const shouldBeOpen = status === 'active' || status === 'planning' || status === 'backlog' || status === 'ready_for_review';

    // Check main issue
    if (inc.issue) {
      await this.reconcileIssue(
        inc.incrementId,
        inc.issue.key,
        shouldBeClosed,
        shouldBeOpen,
        status,
        result
      );
    }

    // Check User Story issues
    for (const us of inc.userStoryIssues) {
      await this.reconcileIssue(
        `${inc.incrementId}/${us.userStoryId}`,
        us.issueKey,
        shouldBeClosed,
        shouldBeOpen,
        status,
        result
      );
    }
  }

  /**
   * Reconcile a single issue
   */
  private async reconcileIssue(
    context: string,
    issueKey: string,
    shouldBeClosed: boolean,
    shouldBeOpen: boolean,
    metadataStatus: string,
    result: JiraReconcileResult
  ): Promise<void> {
    try {
      // Get current JIRA state
      const issue = await this.getIssue(issueKey);
      const currentStatus = issue?.fields?.status?.name ?? 'Unknown';
      const isCurrentlyClosed = JIRA_STATUSES.CLOSED.includes(currentStatus);

      // Check for mismatch
      if (shouldBeClosed && !isCurrentlyClosed) {
        // Should be closed but is open
        result.mismatches++;
        this.logger.log(`  ❌ Issue ${issueKey} (${context}): ${currentStatus} but should be CLOSED (status=${metadataStatus})`);

        if (!this.dryRun) {
          const comment = `h2. 🔄 Auto-Reconciled by SpecWeave

This issue was closed by SpecWeave reconciliation.

*Reason*: Increment status is \`${metadataStatus}\` but JIRA issue was still open.

----
🤖 Auto-reconciled by SpecWeave`;

          await this.transitionIssue(issueKey, 'Done', comment);
          result.closed++;
          this.logger.log(`     ✅ Closed issue ${issueKey}`);
        } else {
          this.logger.log(`     [DRY RUN] Would close issue ${issueKey}`);
        }

        result.details.push({
          incrementId: context,
          action: this.dryRun ? 'skip' : 'close',
          issueKey,
          reason: `Status=${metadataStatus}, JIRA=${currentStatus}`,
        });

      } else if (shouldBeOpen && isCurrentlyClosed) {
        // Should be open but is closed
        result.mismatches++;
        this.logger.log(`  ❌ Issue ${issueKey} (${context}): CLOSED but should be OPEN (status=${metadataStatus})`);

        if (!this.dryRun) {
          const comment = `h2. 🔄 Auto-Reconciled by SpecWeave

This issue was reopened by SpecWeave reconciliation.

*Reason*: Increment status is \`${metadataStatus}\` but JIRA issue was closed.
This typically happens when an increment was resumed after being paused/completed.

----
🤖 Auto-reconciled by SpecWeave`;

          await this.transitionIssue(issueKey, 'To Do', comment);
          result.reopened++;
          this.logger.log(`     ✅ Reopened issue ${issueKey}`);
        } else {
          this.logger.log(`     [DRY RUN] Would reopen issue ${issueKey}`);
        }

        result.details.push({
          incrementId: context,
          action: this.dryRun ? 'skip' : 'reopen',
          issueKey,
          reason: `Status=${metadataStatus}, JIRA=${currentStatus}`,
        });

      } else {
        // State matches
        this.logger.log(`  ✅ Issue ${issueKey} (${context}): State matches (${currentStatus})`);
        result.details.push({
          incrementId: context,
          action: 'skip',
          issueKey,
          reason: 'State matches',
        });
      }
    } catch (error: any) {
      result.errors.push(`Issue ${issueKey}: ${error.message}`);
      result.details.push({
        incrementId: context,
        action: 'error',
        issueKey,
        reason: error.message,
      });
    }
  }

  /**
   * Scan increments directory for non-archived increments
   */
  private async scanIncrements(): Promise<IncrementJiraState[]> {
    const incrementsPath = path.join(this.projectRoot, '.specweave', 'increments');
    const results: IncrementJiraState[] = [];

    if (!existsSync(incrementsPath)) {
      return results;
    }

    const entries = await fs.readdir(incrementsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === '_archive' || entry.name.startsWith('.')) continue;

      const incrementPath = path.join(incrementsPath, entry.name);
      const metadataPath = path.join(incrementPath, 'metadata.json');

      if (!existsSync(metadataPath)) continue;

      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        // Check for JIRA issue link (support both new and legacy naming)
        const jiraSync = metadata.external_sync?.jira || metadata.external_ids?.jira;
        if (!jiraSync?.issueKey && !jiraSync?.epic) continue;

        const state: IncrementJiraState = {
          incrementId: entry.name,
          incrementPath,
          metadataStatus: metadata.status || 'unknown',
          featureId: metadata.featureId,
          issue: {
            key: jiraSync.issueKey || jiraSync.epic,
            url: jiraSync.issueUrl,
          },
          userStoryIssues: [],
        };

        // Extract user story issues if present
        if (jiraSync.stories && Array.isArray(jiraSync.stories)) {
          for (const story of jiraSync.stories) {
            if (story.issueKey || story.key) {
              state.userStoryIssues.push({
                userStoryId: story.id || story.userStoryId,
                issueKey: story.issueKey || story.key,
              });
            }
          }
        }

        results.push(state);
      } catch {
        // Skip invalid metadata
      }
    }

    return results;
  }

  /**
   * Load config.json
   */
  private async loadConfig(): Promise<any> {
    const configPath = path.join(this.projectRoot, '.specweave', 'config.json');

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Initialize JIRA credentials
   */
  private initCredentials(): boolean {
    const token = process.env.JIRA_API_TOKEN;
    const email = process.env.JIRA_EMAIL;
    this.domain = process.env.JIRA_DOMAIN || '';

    if (!token || !email || !this.domain) {
      return false;
    }

    this.auth = Buffer.from(`${email}:${token}`).toString('base64');
    return true;
  }

  /**
   * Get issue from JIRA API
   */
  private async getIssue(issueKey: string): Promise<any> {
    const url = `https://${this.domain}/rest/api/3/issue/${issueKey}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${this.auth}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get issue: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get available transitions for an issue
   */
  private async getTransitions(issueKey: string): Promise<any[]> {
    const url = `https://${this.domain}/rest/api/3/issue/${issueKey}/transitions`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${this.auth}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get transitions: ${response.status}`);
    }

    const data = await response.json();
    return data.transitions || [];
  }

  /**
   * Transition issue to new status and add comment
   */
  private async transitionIssue(
    issueKey: string,
    targetStatus: string,
    comment: string
  ): Promise<void> {
    // First, add comment
    await this.addComment(issueKey, comment);

    // Get available transitions
    const transitions = await this.getTransitions(issueKey);

    // Find transition matching target status
    const transition = transitions.find(
      (t: any) => t.name.toLowerCase() === targetStatus.toLowerCase() ||
        t.to?.name?.toLowerCase() === targetStatus.toLowerCase()
    );

    if (!transition) {
      // Try common alternatives
      const alternatives = targetStatus === 'Done'
        ? ['Closed', 'Resolved', 'Complete']
        : ['Open', 'Reopened', 'In Progress'];

      const altTransition = transitions.find(
        (t: any) => alternatives.some(
          alt => t.name.toLowerCase() === alt.toLowerCase() ||
            t.to?.name?.toLowerCase() === alt.toLowerCase()
        )
      );

      if (!altTransition) {
        throw new Error(`No transition found to "${targetStatus}". Available: ${transitions.map((t: any) => t.name).join(', ')}`);
      }

      await this.doTransition(issueKey, altTransition.id);
    } else {
      await this.doTransition(issueKey, transition.id);
    }
  }

  /**
   * Execute transition
   */
  private async doTransition(issueKey: string, transitionId: string): Promise<void> {
    const url = `https://${this.domain}/rest/api/3/issue/${issueKey}/transitions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transition: { id: transitionId },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to transition issue: ${response.status} - ${error}`);
    }
  }

  /**
   * Add comment to issue
   */
  private async addComment(issueKey: string, comment: string): Promise<void> {
    const url = `https://${this.domain}/rest/api/3/issue/${issueKey}/comment`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment,
                },
              ],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      // Non-fatal, just log warning
      this.logger.log(`     ⚠️  Failed to add comment to ${issueKey}`);
    }
  }
}

/**
 * Convenience function for quick reconciliation
 */
export async function reconcileJira(
  projectRoot: string = process.cwd(),
  dryRun: boolean = false
): Promise<JiraReconcileResult> {
  const reconciler = new JiraReconciler({ projectRoot, dryRun });
  return reconciler.reconcile();
}

export default JiraReconciler;
