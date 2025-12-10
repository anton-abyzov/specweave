/**
 * Azure DevOps Reconciler (NEW in v0.33.0)
 *
 * Reconciles ADO work item states with increment metadata.json statuses.
 * Fixes drift between local SpecWeave state and ADO:
 * - Closes work items for completed increments that are still active
 * - Reactivates work items for in-progress increments that are closed
 *
 * Mirrors the GitHub reconciler pattern for consistency.
 *
 * Triggered by:
 * - /specweave-ado:reconcile command (manual)
 * - SessionStart hook (automatic, if configured)
 * - post-increment-status-change.sh (on resume/abandon)
 */

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { Logger, consoleLogger } from '../utils/logger.js';
import { ConfigManager } from '../core/config/config-manager.js';

export interface AdoReconcileOptions {
  projectRoot: string;
  dryRun?: boolean;
  logger?: Logger;
}

export interface IncrementAdoState {
  incrementId: string;
  incrementPath: string;
  metadataStatus: string;
  featureId?: string;
  workItem?: {
    id: number;
    url?: string;
  };
  userStoryWorkItems: Array<{
    userStoryId: string;
    workItemId: number;
  }>;
}

export interface AdoReconcileResult {
  scanned: number;
  mismatches: number;
  closed: number;
  reopened: number;
  errors: string[];
  details: Array<{
    incrementId: string;
    action: 'close' | 'reopen' | 'skip' | 'error';
    workItemId: number;
    reason: string;
  }>;
}

/**
 * ADO Status Mapping
 */
const ADO_STATUSES = {
  CLOSED: ['Closed', 'Done', 'Resolved', 'Removed'],
  ACTIVE: ['Active', 'New', 'In Progress', 'Committed'],
};

export class AdoReconciler {
  private projectRoot: string;
  private dryRun: boolean;
  private logger: Logger;
  private configManager: ConfigManager;

  constructor(options: AdoReconcileOptions) {
    this.projectRoot = options.projectRoot;
    this.dryRun = options.dryRun ?? false;
    this.logger = options.logger ?? consoleLogger;
    this.configManager = new ConfigManager(options.projectRoot);
  }

  /**
   * Main reconciliation entry point
   */
  async reconcile(): Promise<AdoReconcileResult> {
    const result: AdoReconcileResult = {
      scanned: 0,
      mismatches: 0,
      closed: 0,
      reopened: 0,
      errors: [],
      details: [],
    };

    try {
      // 1. Check if ADO sync is enabled
      const config = await this.loadConfig();
      const canUpdate = config.sync?.settings?.canUpdateExternalItems ?? false;
      const adoEnabled = config.sync?.ado?.enabled ?? false;

      if (!canUpdate || !adoEnabled) {
        this.logger.log('ℹ️  ADO sync is disabled - skipping reconciliation');
        this.logger.log('   Enable with: canUpdateExternalItems=true AND sync.ado.enabled=true');
        return result;
      }

      // 2. Verify ADO credentials
      const hasCredentials = this.hasAdoCredentials();
      if (!hasCredentials) {
        result.errors.push('ADO credentials not configured');
        this.logger.error('❌ ADO PAT not found. Set AZURE_DEVOPS_PAT environment variable.');
        return result;
      }

      // 3. Scan all non-archived increments
      const increments = await this.scanIncrements();
      result.scanned = increments.length;

      this.logger.log(`\n📊 Scanning ${increments.length} increment(s) for ADO state drift...\n`);

      // 4. Check and fix each increment
      for (const inc of increments) {
        await this.reconcileIncrement(inc, result);
      }

      // 5. Report summary
      this.logger.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log('📊 ADO RECONCILIATION SUMMARY');
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log(`   Increments scanned:   ${result.scanned}`);
      this.logger.log(`   Mismatches found:     ${result.mismatches}`);
      this.logger.log(`   Work items closed:    ${result.closed}`);
      this.logger.log(`   Work items reopened:  ${result.reopened}`);
      this.logger.log(`   Errors:               ${result.errors.length}`);
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
    inc: IncrementAdoState,
    result: AdoReconcileResult
  ): Promise<void> {
    const status = inc.metadataStatus;

    // Determine expected ADO state
    const shouldBeClosed = status === 'completed' || status === 'abandoned';
    const shouldBeActive = status === 'active' || status === 'planning' || status === 'backlog' || status === 'ready_for_review';

    // Check main work item
    if (inc.workItem) {
      await this.reconcileWorkItem(
        inc.incrementId,
        inc.workItem.id,
        shouldBeClosed,
        shouldBeActive,
        status,
        result
      );
    }

    // Check User Story work items
    for (const us of inc.userStoryWorkItems) {
      await this.reconcileWorkItem(
        `${inc.incrementId}/${us.userStoryId}`,
        us.workItemId,
        shouldBeClosed,
        shouldBeActive,
        status,
        result
      );
    }
  }

  /**
   * Reconcile a single work item
   */
  private async reconcileWorkItem(
    context: string,
    workItemId: number,
    shouldBeClosed: boolean,
    shouldBeActive: boolean,
    metadataStatus: string,
    result: AdoReconcileResult
  ): Promise<void> {
    try {
      // Get current ADO state
      const workItem = await this.getWorkItem(workItemId);
      const currentState = workItem?.fields?.['System.State'] ?? 'Unknown';
      const isCurrentlyClosed = ADO_STATUSES.CLOSED.includes(currentState);

      // Check for mismatch
      if (shouldBeClosed && !isCurrentlyClosed) {
        // Should be closed but is active
        result.mismatches++;
        this.logger.log(`  ❌ Work Item #${workItemId} (${context}): ${currentState} but should be CLOSED (status=${metadataStatus})`);

        if (!this.dryRun) {
          const comment = `## 🔄 Auto-Reconciled by SpecWeave

This work item was closed by SpecWeave reconciliation.

**Reason**: Increment status is \`${metadataStatus}\` but ADO work item was still active.

---
🤖 Auto-reconciled by SpecWeave`;

          await this.updateWorkItemState(workItemId, 'Closed', comment);
          result.closed++;
          this.logger.log(`     ✅ Closed work item #${workItemId}`);
        } else {
          this.logger.log(`     [DRY RUN] Would close work item #${workItemId}`);
        }

        result.details.push({
          incrementId: context,
          action: this.dryRun ? 'skip' : 'close',
          workItemId,
          reason: `Status=${metadataStatus}, ADO=${currentState}`,
        });

      } else if (shouldBeActive && isCurrentlyClosed) {
        // Should be active but is closed
        result.mismatches++;
        this.logger.log(`  ❌ Work Item #${workItemId} (${context}): CLOSED but should be ACTIVE (status=${metadataStatus})`);

        if (!this.dryRun) {
          const comment = `## 🔄 Auto-Reconciled by SpecWeave

This work item was reactivated by SpecWeave reconciliation.

**Reason**: Increment status is \`${metadataStatus}\` but ADO work item was closed.
This typically happens when an increment was resumed after being paused/completed.

---
🤖 Auto-reconciled by SpecWeave`;

          await this.updateWorkItemState(workItemId, 'Active', comment);
          result.reopened++;
          this.logger.log(`     ✅ Reactivated work item #${workItemId}`);
        } else {
          this.logger.log(`     [DRY RUN] Would reactivate work item #${workItemId}`);
        }

        result.details.push({
          incrementId: context,
          action: this.dryRun ? 'skip' : 'reopen',
          workItemId,
          reason: `Status=${metadataStatus}, ADO=${currentState}`,
        });

      } else {
        // State matches
        this.logger.log(`  ✅ Work Item #${workItemId} (${context}): State matches (${currentState})`);
        result.details.push({
          incrementId: context,
          action: 'skip',
          workItemId,
          reason: 'State matches',
        });
      }
    } catch (error: any) {
      result.errors.push(`Work item #${workItemId}: ${error.message}`);
      result.details.push({
        incrementId: context,
        action: 'error',
        workItemId,
        reason: error.message,
      });
    }
  }

  /**
   * Scan increments directory for non-archived increments
   */
  private async scanIncrements(): Promise<IncrementAdoState[]> {
    const incrementsPath = path.join(this.projectRoot, '.specweave', 'increments');
    const results: IncrementAdoState[] = [];

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

        // Check for ADO work item link
        const adoSync = metadata.external_sync?.ado;
        if (!adoSync?.workItemId) continue;

        const state: IncrementAdoState = {
          incrementId: entry.name,
          incrementPath,
          metadataStatus: metadata.status || 'unknown',
          featureId: metadata.featureId,
          workItem: {
            id: adoSync.workItemId,
            url: adoSync.workItemUrl,
          },
          userStoryWorkItems: [],
        };

        // Extract user story work items if present
        if (adoSync.userStories && Array.isArray(adoSync.userStories)) {
          for (const us of adoSync.userStories) {
            if (us.workItemId) {
              state.userStoryWorkItems.push({
                userStoryId: us.id || us.userStoryId,
                workItemId: us.workItemId,
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
   * Check if ADO credentials are configured
   */
  private hasAdoCredentials(): boolean {
    return !!(process.env.AZURE_DEVOPS_PAT || process.env.AZURE_DEVOPS_TOKEN);
  }

  /**
   * Get work item from ADO API
   * Reads secrets (PAT) from process.env
   * Reads config (organization) from ConfigManager (config.json)
   */
  private async getWorkItem(workItemId: number): Promise<any> {
    // Config from ConfigManager (correct - organization is not secret)
    const config = await this.configManager.read();
    const org = config.issueTracker?.organization_ado || config.sync?.ado?.organization || '';

    // Secret from .env (correct - PAT is sensitive)
    const pat = process.env.AZURE_DEVOPS_PAT || process.env.AZURE_DEVOPS_TOKEN;

    if (!org || !pat) {
      throw new Error('ADO credentials not configured. Set AZURE_DEVOPS_PAT in .env and issueTracker.organization_ado in config.json.');
    }

    const url = `https://dev.azure.com/${org}/_apis/wit/workitems/${workItemId}?api-version=7.1`;
    const auth = Buffer.from(`:${pat}`).toString('base64');

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get work item: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update work item state in ADO
   * Reads secrets (PAT) from process.env
   * Reads config (organization) from ConfigManager (config.json)
   */
  private async updateWorkItemState(
    workItemId: number,
    newState: string,
    comment: string
  ): Promise<void> {
    // Config from ConfigManager (correct - organization is not secret)
    const config = await this.configManager.read();
    const org = config.issueTracker?.organization_ado || config.sync?.ado?.organization || '';

    // Secret from .env (correct - PAT is sensitive)
    const pat = process.env.AZURE_DEVOPS_PAT || process.env.AZURE_DEVOPS_TOKEN;

    if (!org || !pat) {
      throw new Error('ADO credentials not configured. Set AZURE_DEVOPS_PAT in .env and issueTracker.organization_ado in config.json.');
    }

    const url = `https://dev.azure.com/${org}/_apis/wit/workitems/${workItemId}?api-version=7.1`;
    const auth = Buffer.from(`:${pat}`).toString('base64');

    const operations = [
      {
        op: 'add',
        path: '/fields/System.State',
        value: newState,
      },
      {
        op: 'add',
        path: '/fields/System.History',
        value: comment,
      },
    ];

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json-patch+json',
      },
      body: JSON.stringify(operations),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update work item: ${response.status} - ${error}`);
    }
  }
}

/**
 * Convenience function for quick reconciliation
 */
export async function reconcileAdo(
  projectRoot: string = process.cwd(),
  dryRun: boolean = false
): Promise<AdoReconcileResult> {
  const reconciler = new AdoReconciler({ projectRoot, dryRun });
  return reconciler.reconcile();
}

export default AdoReconciler;
