/**
 * Sync Coordinator (T-034E)
 *
 * High-level coordinator that integrates FormatPreservationSyncService
 * with living docs sync workflow. Called by post-task-completion hook.
 */

import { promises as fs, existsSync, readFileSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { LivingDocsUSFile, getOrigin } from '../types/living-docs-us-file.js';
import { FormatPreservationSyncService, CompletionCommentData } from './format-preservation-sync.js';
import { GitHubClientV2 } from '../../plugins/specweave-github/lib/github-client-v2.js';
import { Logger, consoleLogger } from '../utils/logger.js';
import { FrontmatterUpdater } from './frontmatter-updater.js';
import { autoDetectProjectIdSync } from '../utils/project-detection.js';
import { AdoClient } from '../integrations/ado/ado-client.js';
import { ResolvedAdoProfile } from '../integrations/ado/ado-client-factory.js';
import { getAdoPat } from '../integrations/ado/ado-pat-provider.js';
import { deriveFeatureId } from '../utils/feature-id-derivation.js';
import { ClosureMetrics, createClosureMetrics } from './closure-metrics.js';
import { LockManager } from '../utils/lock-manager.js';
import type {
  SpecWeaveConfig,
  JiraConfig,
} from '../core/config/types.js';
import {
  isProviderEnabled,
  StatusMapper,
  SyncConfigurationExtended,
} from './status-mapper.js';
import {
  ProviderRouter,
  GitHubRepoConfig,
  RepoInfo,
} from './provider-router.js';
import { resolvePermissions, SyncPreset } from './config.js';

// Re-export for backwards compatibility
export { isProviderEnabled } from './status-mapper.js';


/**
 * Extended Jira config with runtime email field
 * (email comes from credentials, not persisted in config types)
 */
interface JiraConfigExtended extends JiraConfig {
  email?: string;
}

export interface SyncCoordinatorOptions {
  projectRoot: string;
  incrementId: string;
  logger?: Logger;
  /**
   * Resolved ADO profile for multi-project sync support
   * If provided, used for ADO sync operations instead of global credentials
   */
  adoProfile?: ResolvedAdoProfile;
}

export interface SyncResult {
  success: boolean;
  userStoriesSynced: number;
  syncMode: 'comment-only' | 'full-sync' | 'read-only' | 'manual-only' | 'living-docs-only' | 'external-disabled';
  errors: string[];
}

export class SyncCoordinator {
  private projectRoot: string;
  private incrementId: string;
  private logger: Logger;
  private frontmatterUpdater: FrontmatterUpdater;
  private projectId: string;
  private adoProfile?: ResolvedAdoProfile;
  private metrics: ClosureMetrics;
  private providerRouter: ProviderRouter;

  constructor(options: SyncCoordinatorOptions) {
    this.projectRoot = options.projectRoot;
    this.incrementId = options.incrementId;
    this.logger = options.logger ?? consoleLogger;
    this.frontmatterUpdater = new FrontmatterUpdater({ logger: this.logger });
    // Auto-detect project ID from git remote, sync config, or use "default"
    this.projectId = autoDetectProjectIdSync(this.projectRoot, { silent: true });
    // Store resolved ADO profile for multi-project sync
    this.adoProfile = options.adoProfile;
    // Initialize closure metrics
    this.metrics = createClosureMetrics(this.projectRoot, this.incrementId, this.logger);
    // Initialize provider router
    this.providerRouter = new ProviderRouter({
      projectRoot: this.projectRoot,
      logger: this.logger
    });
  }

  /**
   * Get closure sync metrics summary
   *
   * Returns aggregated metrics for all external tool closure operations.
   * Useful for monitoring and alerting on sync health.
   */
  getClosureMetrics(): ReturnType<ClosureMetrics['getSummary']> {
    return this.metrics.getSummary();
  }

  /**
   * Get formatted closure metrics for display
   */
  getFormattedClosureMetrics(): string {
    return this.metrics.formatSummary();
  }


  /**
   * @deprecated (0348) GitHub issue creation now handled by GitHubFeatureSync via LivingDocsSync chain.
   */
  async createGitHubIssuesForUserStories(_config: SpecWeaveConfig): Promise<any[]> {
    this.logger.log('GitHub issue creation handled by GitHubFeatureSync pipeline');
    return [];
  }

  /**
   * @deprecated (0348) GitHub closure now handled by GitHubFeatureSync via LivingDocsSync chain.
   */
  async closeGitHubIssuesForUserStories(_config: SpecWeaveConfig): Promise<number[]> {
    this.logger.log('GitHub closure handled by GitHubFeatureSync pipeline');
    return [];
  }

  /**
   * Close JIRA issues for completed user stories
   *
   * Transitions JIRA issues to "Done" status when increment is completed.
   * Reads issue references from user story frontmatter (external.jira.issue_key).
   *
   * @param config - Project config with JIRA settings
   * @returns Number of closed JIRA issues
   */
  async closeJiraIssuesForUserStories(config: SpecWeaveConfig): Promise<number> {
    let closedCount = 0;

    try {
      const userStories = await this.loadUserStoriesForIncrement();
      this.logger.log(`📚 Found ${userStories.length} user stor${userStories.length === 1 ? 'y' : 'ies'} for JIRA closure`);

      if (userStories.length === 0) {
        return 0;
      }

      // Get JIRA config (use extended type for runtime email field)
      const jiraConfig = config.sync?.jira as JiraConfigExtended | undefined;
      if (!jiraConfig?.domain) {
        this.logger.log('⚠️  JIRA config incomplete (missing domain)');
        return 0;
      }

      // Import JIRA client dynamically to avoid circular deps
      // JiraClient uses credentialsManager internally to get credentials from env
      const { JiraClient } = await import('../integrations/jira/jira-client.js');
      const jiraClient = new JiraClient();

      // Target status for completion (configurable via statusSync.mappings.jira.completed)
      const syncConfigExt = config.sync as SyncConfigurationExtended | undefined;
      const targetStatus = syncConfigExt?.statusSync?.mappings?.jira?.completed || 'Done';

      for (const usFile of userStories) {
        try {
          // Check if US has JIRA reference in frontmatter (key not issue_key per type def)
          const jiraKey = usFile.external_tools?.jira?.key || usFile.external_id;
          if (!jiraKey || !String(jiraKey).includes('-')) {
            this.logger.log(`  ⏭️  ${usFile.id} - No JIRA issue reference`);
            continue;
          }

          // Get current issue status
          const issue = await jiraClient.getIssue(jiraKey);
          if (!issue) {
            this.logger.log(`  ⚠️  ${usFile.id} - JIRA issue ${jiraKey} not found`);
            continue;
          }

          // Check if already in target status (status is nested in fields)
          const currentStatus = issue.fields?.status?.name || '';
          if (currentStatus.toLowerCase() === targetStatus.toLowerCase()) {
            this.logger.log(`  ⏭️  ${usFile.id} - ${jiraKey} already ${targetStatus}`);
            continue;
          }

          // Transition to Done
          this.logger.log(`  🔒 Transitioning JIRA ${jiraKey} to ${targetStatus}...`);

          // Track metrics
          this.metrics.startOperation();
          try {
            await jiraClient.updateIssue({
              key: jiraKey,
              status: targetStatus
            });
            this.metrics.recordClosure('jira', jiraKey, true);
            this.logger.log(`  ✅ Transitioned ${jiraKey}`);
            closedCount++;
          } catch (updateError) {
            this.metrics.recordClosure('jira', jiraKey, false, String(updateError));
            throw updateError;
          }
        } catch (error) {
          this.logger.error(`  ❌ Failed to close JIRA issue for ${usFile.id}:`, error);
        }
      }

      return closedCount;
    } catch (error) {
      this.logger.error('❌ Failed to close JIRA issues:', error);
      throw error;
    }
  }

  /**
   * Close ADO work items for completed user stories
   *
   * Transitions ADO work items to "Closed" state when increment is completed.
   * Reads work item references from user story frontmatter (external.ado.id).
   *
   * @param config - Project config with ADO settings
   * @returns Number of closed ADO work items
   */
  async closeAdoWorkItemsForUserStories(config: SpecWeaveConfig): Promise<number> {
    let closedCount = 0;

    try {
      const userStories = await this.loadUserStoriesForIncrement();
      this.logger.log(`📚 Found ${userStories.length} user stor${userStories.length === 1 ? 'y' : 'ies'} for ADO closure`);

      if (userStories.length === 0) {
        return 0;
      }

      // Get ADO config
      const adoConfig = config.sync?.ado;
      if (!adoConfig?.organization || !adoConfig?.project) {
        this.logger.log('⚠️  ADO config incomplete (missing organization or project)');
        return 0;
      }

      // Get PAT from environment
      const adoPat = await getAdoPat(adoConfig.organization);
      if (!adoPat) {
        this.logger.log('⚠️  ADO PAT not available');
        return 0;
      }

      // Create ADO client
      const adoClient = new AdoClient({
        organization: adoConfig.organization,
        project: adoConfig.project,
        pat: adoPat
      });

      // Target state for completion (configurable via statusSync.mappings.ado.completed)
      const adoSyncConfigExt = config.sync as SyncConfigurationExtended | undefined;
      const targetStateConfig = adoSyncConfigExt?.statusSync?.mappings?.ado?.completed || { state: 'Closed' };
      const targetState = typeof targetStateConfig === 'string' ? targetStateConfig : targetStateConfig.state;

      // Collect work item IDs to fetch
      const workItemIds: { id: number; usId: string }[] = [];
      for (const usFile of userStories) {
        // Check if US has ADO reference in frontmatter (id not work_item_id per type def)
        const adoId = usFile.external_tools?.ado?.id || usFile.external_id;
        if (adoId && !isNaN(Number(adoId))) {
          workItemIds.push({ id: Number(adoId), usId: usFile.id });
        } else {
          this.logger.log(`  ⏭️  ${usFile.id} - No ADO work item reference`);
        }
      }

      if (workItemIds.length === 0) {
        return 0;
      }

      // Fetch work items in batch (ADO supports batch retrieval)
      const workItems = await adoClient.listWorkItems({
        workItemIds: workItemIds.map(w => w.id)
      });

      // Create lookup map
      const workItemMap = new Map(workItems.map(w => [w.id, w]));

      // Close each work item
      for (const { id: workItemId, usId } of workItemIds) {
        try {
          const workItem = workItemMap.get(workItemId);
          if (!workItem) {
            this.logger.log(`  ⚠️  ${usId} - ADO work item #${workItemId} not found`);
            continue;
          }

          // Check if already in target state (state is in fields['System.State'])
          const currentState = workItem.fields?.['System.State'] || '';
          if (currentState.toLowerCase() === targetState.toLowerCase()) {
            this.logger.log(`  ⏭️  ${usId} - #${workItemId} already ${targetState}`);
            continue;
          }

          // Update to Closed state
          this.logger.log(`  🔒 Closing ADO work item #${workItemId}...`);

          // Track metrics
          this.metrics.startOperation();
          try {
            await adoClient.updateWorkItem({
              id: workItemId,
              state: targetState
            });
            this.metrics.recordClosure('ado', workItemId, true);
            this.logger.log(`  ✅ Closed #${workItemId}`);
            closedCount++;
          } catch (updateError) {
            this.metrics.recordClosure('ado', workItemId, false, String(updateError));
            throw updateError;
          }
        } catch (error) {
          this.logger.error(`  ❌ Failed to close ADO work item for ${usId}:`, error);
        }
      }

      return closedCount;
    } catch (error) {
      this.logger.error('❌ Failed to close ADO work items:', error);
      throw error;
    }
  }

  /**
   * Sync increment closure to external tools (NEW in v0.28.1)
   *
   * This method is called when an increment is marked as "completed".
   * It handles the complete closure flow including:
   * - Creating any missing GitHub issues (idempotent)
   * - Closing all User Story GitHub issues
   * - Syncing final status to external tools
   *
   * CRITICAL: This was the missing piece causing issues to stay open!
   *
   * @returns SyncResult with closure details
   */
  async syncIncrementClosure(): Promise<SyncResult & { closedIssues: number[] }> {
    const result: SyncResult & { closedIssues: number[] } = {
      success: false,
      userStoriesSynced: 0,
      syncMode: 'read-only',
      errors: [],
      closedIssues: []
    };

    // Filesystem lock to prevent concurrent closure from dual triggers
    // (StatusChangeSyncTrigger + LifecycleHookDispatcher both call this)
    const lockDir = path.join(
      this.projectRoot,
      '.specweave/state/.locks',
      `sync-closure-${this.incrementId}`
    );
    const lockManager = new LockManager(lockDir, 60, { logger: this.logger });

    let lockAcquired = false;
    try {
      lockAcquired = await lockManager.acquire();
      if (!lockAcquired) {
        this.logger.log(`⏳ Increment ${this.incrementId} - Closure sync already in progress, skipping`);
        result.success = true;
        return result;
      }
    } catch {
      // Lock acquisition failed — proceed anyway (dedup layer protects against duplicates)
      this.logger.log(`⚠️  Lock acquisition failed for ${this.incrementId}, proceeding with dedup protection`);
    }

    try {
      this.logger.log(`\n🔒 Syncing increment CLOSURE for ${this.incrementId}...`);

      // 1. Load config
      const config = await this.loadConfig();

      // Check gates (same as syncIncrementCompletion)
      // v1.0.240 FIX: Use resolvePermissions() to honor "bidirectional" preset when
      // explicit settings are absent. Previously defaulted to false, blocking all closure.
      const syncAny = config.sync as Record<string, unknown> | undefined;
      const permissions = resolvePermissions(
        syncAny?.preset as SyncPreset | undefined,
        undefined,
        config.sync?.settings,
      );
      const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems ?? permissions.canUpsert;
      // v1.0.46 FIX: Use isProviderEnabled() to support BOTH profiles and legacy formats
      const githubEnabled = isProviderEnabled(config, 'github');
      const autoSync = config.sync?.settings?.autoSyncOnCompletion ?? true;

      if (!canUpdateExternal) {
        this.logger.log('ℹ️  External tool sync disabled (canUpdateExternalItems=false)');
        this.logger.log('   GitHub issues will NOT be closed automatically');
        result.syncMode = 'living-docs-only';
        result.success = true;
        return result;
      }

      if (!autoSync) {
        this.logger.log('⚠️  Automatic external sync disabled (autoSyncOnCompletion=false)');
        this.logger.log('   GitHub issues will NOT be closed automatically');
        this.logger.log('   Run /specweave-github:sync to close issues manually');
        result.syncMode = 'manual-only';
        result.success = true;
        return result;
      }

      // Check which external tools are enabled
      // v1.0.46 FIX: Use isProviderEnabled() to support BOTH profiles and legacy formats
      const jiraEnabled = isProviderEnabled(config, 'jira');
      const adoEnabled = isProviderEnabled(config, 'ado');

      if (!githubEnabled && !jiraEnabled && !adoEnabled) {
        this.logger.log('ℹ️  No external tools enabled (GitHub/JIRA/ADO all disabled)');
        result.syncMode = 'external-disabled';
        result.success = true;
        return result;
      }

      this.logger.log('✅ All gates passed - closing external issues for user stories');

      // Track closed items across all tools
      let totalClosed = 0;

      // ========================================================================
      // GitHub Closure — handled by GitHubFeatureSync (0348 consolidation)
      // ========================================================================
      if (githubEnabled) {
        this.logger.log('\n🔹 GitHub: Handled by GitHubFeatureSync pipeline (skipping SyncCoordinator path)');
      }

      // ========================================================================
      // JIRA Closure
      // ========================================================================
      if (jiraEnabled) {
        this.logger.log('\n🔹 JIRA: Closing issues for completed user stories...');
        try {
          const jiraClosed = await this.closeJiraIssuesForUserStories(config);
          totalClosed += jiraClosed;
          this.logger.log(`   ✅ Closed ${jiraClosed} JIRA issue(s)`);
        } catch (error) {
          this.logger.error('⚠️  JIRA issue closure failed:', error);
          result.errors.push(`JIRA issue closure error: ${error}`);
        }
      }

      // ========================================================================
      // ADO Closure
      // ========================================================================
      if (adoEnabled) {
        this.logger.log('\n🔹 ADO: Closing work items for completed user stories...');
        try {
          const adoClosed = await this.closeAdoWorkItemsForUserStories(config);
          totalClosed += adoClosed;
          this.logger.log(`   ✅ Closed ${adoClosed} ADO work item(s)`);
        } catch (error) {
          this.logger.error('⚠️  ADO work item closure failed:', error);
          result.errors.push(`ADO work item closure error: ${error}`);
        }
      }

      result.success = result.errors.length === 0;
      result.syncMode = 'full-sync';

      this.logger.log(`\n✅ Increment closure sync complete`);
      this.logger.log(`   Total items closed: ${totalClosed}`);
      if (result.closedIssues.length > 0) {
        this.logger.log(`   GitHub: ${result.closedIssues.length}`);
      }
      if (result.errors.length > 0) {
        this.logger.log(`   ⚠️  ${result.errors.length} error(s) occurred`);
      }

      // Check for high failure rate and warn (v0.34.0 metrics)
      const tools: Array<'github' | 'jira' | 'ado'> = ['github', 'jira', 'ado'];
      for (const tool of tools) {
        if (this.metrics.isFailureRateHigh(tool)) {
          this.logger.log(`   ⚠️  ${tool.toUpperCase()} has high failure rate - check credentials/permissions`);
        }
      }

      return result;
    } catch (error) {
      result.errors.push(`Sync closure error: ${error}`);
      this.logger.error('❌ Increment closure sync failed:', error);
      return result;
    } finally {
      if (lockAcquired) {
        await lockManager.release();
      }
    }
  }


  /**
   * Sync increment completion to external tools using format preservation
   */
  async syncIncrementCompletion(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      userStoriesSynced: 0,
      syncMode: 'read-only',
      errors: []
    };

    try {
      this.logger.log(`\n🔄 Syncing increment ${this.incrementId} with format preservation...`);

      // 1. Load config
      const config = await this.loadConfig();

      // GATE 1: Check if living docs sync is enabled (canUpsertInternalItems)
      const canUpsertInternal = config.sync?.settings?.canUpsertInternalItems ?? true;
      if (!canUpsertInternal) {
        this.logger.log('ℹ️  Living docs sync disabled (canUpsertInternalItems=false)');
        this.logger.log('   Running in read-only mode - no changes will be made to living docs or external tools');
        result.syncMode = 'read-only';
        result.success = true;
        return result;
      }

      // GATE 2: Check if external sync is enabled (canUpdateExternalItems)
      // v1.0.240 FIX: Honor preset when explicit settings absent
      const syncAny2 = config.sync as Record<string, unknown> | undefined;
      const perms2 = resolvePermissions(syncAny2?.preset as SyncPreset | undefined, undefined, config.sync?.settings);
      const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems ?? perms2.canUpsert;
      if (!canUpdateExternal) {
        this.logger.log('✅ Living docs sync enabled (canUpsertInternalItems=true)');
        this.logger.log('ℹ️  External tool sync disabled (canUpdateExternalItems=false)');
        this.logger.log('   Living docs will be updated, but external tools (GitHub, JIRA, ADO) will not be synced');
        result.syncMode = 'living-docs-only';
        // Continue to sync living docs (without external tools)
        // Note: GitHub issue creation will be skipped due to this gate
      } else {
        this.logger.log('✅ Living docs sync enabled (canUpsertInternalItems=true)');
        this.logger.log('✅ External tool sync enabled (canUpdateExternalItems=true)');
      }

      // GATE 3: Check if automatic sync is enabled (only relevant if GATE 2 is true)
      // DEFAULT: true (automatic sync enabled for better UX)
      if (canUpdateExternal) {
        const autoSync = config.sync?.settings?.autoSyncOnCompletion ?? true;
        if (!autoSync) {
          this.logger.log('⚠️  Automatic external sync disabled (autoSyncOnCompletion=false)');
          this.logger.log('   Living docs will be updated, but external tools require manual sync');
          this.logger.log('   Run /specweave-github:sync or /specweave-jira:sync to sync manually');
          result.syncMode = 'manual-only';
          // Continue to sync living docs only (skip GitHub sync)
        } else {
          this.logger.log('✅ Automatic external sync enabled (autoSyncOnCompletion=true)');

          // GitHub sync handled by LivingDocsSync → GitHubFeatureSync pipeline (0348)
          const githubEnabled = isProviderEnabled(config, 'github');
          if (githubEnabled) {
            this.logger.log('✅ GitHub sync handled by GitHubFeatureSync pipeline');
          } else {
            this.logger.log('ℹ️  GitHub sync disabled');
            result.syncMode = 'external-disabled';
          }
        }
      }

      // 3. Load living docs User Stories for this increment
      const userStories = await this.loadUserStoriesForIncrement();

      if (userStories.length === 0) {
        this.logger.log('ℹ️  No user stories found for this increment');
        result.success = true;
        return result;
      }

      this.logger.log(`📚 Found ${userStories.length} user story/stories`);

      // 4. Initialize sync service
      const syncService = new FormatPreservationSyncService(
        {
          canUpdateExternalItems: config.sync?.settings?.canUpdateExternalItems ?? perms2.canUpsert,
          canUpdateStatus: config.sync?.settings?.canUpdateStatus ?? perms2.canUpdateStatus
        },
        { logger: this.logger }
      );

      // 5. Sync each user story
      for (const usFile of userStories) {
        try {
          await this.syncUserStory(usFile, syncService, config);
          result.userStoriesSynced++;

          const origin = getOrigin(usFile);
          if (origin === 'external') {
            result.syncMode = 'comment-only';
          } else {
            result.syncMode = 'full-sync';
          }
        } catch (error) {
          const errorMsg = `Failed to sync ${usFile.id}: ${error}`;
          this.logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.errors.length === 0;

      this.logger.log(`\n✅ Sync complete: ${result.userStoriesSynced}/${userStories.length} synced`);
      if (result.errors.length > 0) {
        this.logger.log(`⚠️  ${result.errors.length} error(s) occurred`);
      }

      return result;
    } catch (error) {
      result.errors.push(`Sync coordinator error: ${error}`);
      this.logger.error('❌ Sync failed:', error);
      return result;
    }
  }

  /**
   * Sync individual user story
   */
  private async syncUserStory(
    usFile: LivingDocsUSFile,
    syncService: FormatPreservationSyncService,
    config: SpecWeaveConfig
  ): Promise<void> {
    const origin = getOrigin(usFile);
    this.logger.log(`\n  📝 ${usFile.id} (${origin})`);

    // Load completion data
    const completionData = await this.loadCompletionData(usFile);

    // Determine external tool and create client
    const externalSource = usFile.external_source || 'github'; // Default to GitHub

    // GATE 4: Check if the specific tool is enabled
    // v1.0.46 FIX: Use isProviderEnabled() to support BOTH profiles and legacy formats
    if (externalSource === 'github') {
      const githubEnabled = isProviderEnabled(config, 'github');
      if (!githubEnabled) {
        this.logger.log('  ⏭️  GitHub sync SKIPPED (no GitHub profile or sync.github.enabled)');
        return;
      }

      // Extract owner/repo from config or detect from git
      const githubConfig = config.sync?.github || {};
      const repoInfo = await this.detectGitHubRepo(githubConfig);

      if (!repoInfo) {
        throw new Error('GitHub repository not configured');
      }

      const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
      await syncService.syncUserStory(usFile, completionData, client);
    } else if (externalSource === 'jira') {
      // v1.0.46 FIX: Use isProviderEnabled() to support BOTH profiles and legacy formats
      const jiraEnabled = isProviderEnabled(config, 'jira');
      if (!jiraEnabled) {
        this.logger.log('  ⏭️  JIRA sync SKIPPED (no JIRA profile or sync.jira.enabled)');
        return;
      }

      // Get JIRA config from config.json (domain) and env (secrets)
      const jiraConfig = config.sync?.jira;
      if (!jiraConfig?.domain) {
        this.logger.log('  ⚠️  JIRA domain not configured in config.json (sync.jira.domain)');
        this.logger.log('  💡 Run: specweave config set sync.jira.domain "your-domain.atlassian.net"');
        return;
      }

      // Get issue key from user story
      // Check multiple possible locations: external_tools.jira.key, external_id
      const jiraKey = usFile.external_tools?.jira?.key ||
                      usFile.external_id;

      if (!jiraKey || !String(jiraKey).includes('-')) {
        this.logger.log(`  ⏭️  ${usFile.id} - No valid JIRA issue key found`);
        this.logger.log(`     external_id: ${usFile.external_id || 'none'}`);
        return;
      }

      this.logger.log(`  📊 JIRA sync → ${jiraKey}`);

      try {
        // Import JIRA client dynamically to avoid circular deps
        const { JiraClient } = await import('../integrations/jira/jira-client.js');
        const jiraClient = new JiraClient();

        // Format completion comment for JIRA (uses ADF format internally)
        const completionComment = this.formatJiraCompletionComment(usFile, completionData);

        // Idempotency check: Don't post duplicate comments
        // See: ADR-0051 - Idempotent sync operations
        const lastComment = await jiraClient.getLastComment(jiraKey);
        if (lastComment && lastComment.body === completionComment) {
          this.logger.log(`  ⏭️  Skipping duplicate comment (already posted to ${jiraKey})`);
          return;
        }

        await jiraClient.addComment(jiraKey, completionComment);

        this.logger.log(`  ✅ Added progress comment to JIRA issue ${jiraKey}`);

        // STATUS UPDATE: Transition JIRA issue when progress reaches 100%
        // Only if canUpdateStatus=true (permission gate)
        const canUpdateStatus = config.sync?.settings?.canUpdateStatus ?? false;
        if (canUpdateStatus && completionData.progressPercentage === 100) {
          // Get target status from config or default to "Done"
          const jiraSyncConfigExt = config.sync as SyncConfigurationExtended | undefined;
          const targetStatus = jiraSyncConfigExt?.statusSync?.mappings?.jira?.completed || 'Done';

          // Get current issue status to avoid unnecessary transition
          const currentIssue = await jiraClient.getIssue(jiraKey);
          const currentStatus = currentIssue?.fields?.status?.name || '';

          if (currentStatus.toLowerCase() !== targetStatus.toLowerCase()) {
            this.logger.log(`  🔀 Transitioning JIRA ${jiraKey} to ${targetStatus} (100% complete)`);
            try {
              await jiraClient.updateIssue({
                key: jiraKey,
                status: targetStatus
              });
              this.logger.log(`  ✅ Transitioned ${jiraKey} to ${targetStatus}`);
            } catch (transitionError) {
              // Non-blocking: log warning but don't fail the sync
              this.logger.log(`  ⚠️  Status transition failed: ${transitionError}`);
              this.logger.log(`     Manual transition may be required`);
            }
          } else {
            this.logger.log(`  ⏭️  ${jiraKey} already in ${targetStatus} status`);
          }
        } else if (!canUpdateStatus && completionData.progressPercentage === 100) {
          this.logger.log(`  ℹ️  Status update skipped (canUpdateStatus=false)`);
          this.logger.log(`     Enable with: specweave config set sync.settings.canUpdateStatus true`);
        }
      } catch (error) {
        this.logger.error(`  ❌ JIRA sync failed: ${error}`);
        throw error;
      }
    } else if (externalSource === 'ado' || externalSource === 'azure-devops') {
      // v1.0.46 FIX: Use isProviderEnabled() to support BOTH profiles and legacy formats
      const adoEnabled = isProviderEnabled(config, 'ado');
      if (!adoEnabled) {
        this.logger.log('  ⏭️  Azure DevOps sync SKIPPED (no ADO profile or sync.ado.enabled)');
        return;
      }

      // Multi-project ADO sync using resolved profile
      // Stricter validation: check profile AND required fields
      if (!this.adoProfile || !this.adoProfile.organization || !this.adoProfile.project) {
        this.logger.log('  ⚠️  No ADO profile resolved or incomplete configuration');
        this.logger.log('  💡 Set external_sync.ado.profile in increment metadata.json');
        this.logger.log('  💡 Or run /specweave-ado:sync to select a profile');
        return;
      }

      this.logger.log(
        `  📊 ADO sync → ${this.adoProfile.organization}/${this.adoProfile.project} ` +
        `(profile: ${this.adoProfile.profileName})`
      );

      try {
        // Get PAT from shared provider (supports org-specific PATs)
        const pat = getAdoPat(this.adoProfile.organization);

        // Create client with resolved profile
        const adoClient = new AdoClient({
          pat,
          organization: this.adoProfile.organization,
          project: this.adoProfile.project,
        });

        // Get external ID from user story
        const externalId = usFile.external_id;
        if (!externalId) {
          this.logger.log('  ⚠️  No external_id in user story - skipping ADO update');
          return;
        }

        // Extract work item ID (e.g., "ADO-123" → 123)
        const workItemIdMatch = externalId.match(/ADO-(\d+)/i) || externalId.match(/^(\d+)$/);
        if (!workItemIdMatch) {
          this.logger.log(`  ⚠️  Cannot parse work item ID from external_id: ${externalId}`);
          return;
        }

        const workItemId = parseInt(workItemIdMatch[1], 10);

        // Add completion comment to work item
        const completionComment = this.formatAdoCompletionComment(usFile, completionData);

        // Idempotency check: Don't post duplicate comments (mirrors JIRA dedup pattern)
        const lastAdoComment = await adoClient.getLastComment(workItemId);
        if (lastAdoComment && lastAdoComment.text === completionComment) {
          this.logger.log(`  ⏭️  Skipping duplicate comment (already posted to ADO #${workItemId})`);
          return;
        }

        await adoClient.addComment(workItemId, completionComment);

        this.logger.log(`  ✅ Added completion comment to ADO work item #${workItemId}`);
      } catch (error) {
        this.logger.error(`  ❌ ADO sync failed: ${error}`);
        throw error;
      }
    } else {
      this.logger.log(`  ⚠️  Unknown external source: ${externalSource}`);
    }
  }

  /**
   * Load completion data for user story
   */
  private async loadCompletionData(usFile: LivingDocsUSFile): Promise<CompletionCommentData> {
    // Parse tasks from increment tasks.md
    const tasksFile = path.join(
      this.projectRoot,
      '.specweave/increments',
      this.incrementId,
      'tasks.md'
    );

    const tasks = [];
    const acs = [];

    if (existsSync(tasksFile)) {
      const content = await fs.readFile(tasksFile, 'utf-8');

      // Parse tasks (simplified - just count completed for now)
      const taskMatches = content.match(/### T-\d+:/g) || [];
      const completedMatches = content.match(/\*\*Status\*\*: \[x\] completed/g) || [];

      // Add mock data for demo (real implementation would parse tasks.md properly)
      for (let i = 0; i < taskMatches.length; i++) {
        tasks.push({
          taskId: `T-${String(i + 1).padStart(3, '0')}`,
          title: 'Task title',
          completed: i < completedMatches.length
        });
      }
    }

    // Parse ACs from spec.md
    const specFile = path.join(
      this.projectRoot,
      '.specweave/increments',
      this.incrementId,
      'spec.md'
    );

    if (existsSync(specFile)) {
      const content = await fs.readFile(specFile, 'utf-8');

      // Parse ACs
      const acMatches = content.match(/- \[x\] \*\*AC-[^:]+\*\*:/g) || [];

      for (const match of acMatches) {
        const acId = match.match(/AC-[^*]+/)?.[0] || '';
        acs.push({
          acId: acId.trim(),
          description: 'AC description',
          satisfied: true
        });
      }
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const progressPercentage = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    return {
      tasks,
      acceptanceCriteria: acs,
      progressPercentage,
      livingDocsUrl: `${this.projectRoot}/.specweave/docs/internal/specs/${this.projectId}/${usFile.id}/`
    };
  }

  /**
   * Load user stories affected by this increment
   */
  private async loadUserStoriesForIncrement(): Promise<LivingDocsUSFile[]> {
    const specFile = path.join(
      this.projectRoot,
      '.specweave/increments',
      this.incrementId,
      'spec.md'
    );

    if (!existsSync(specFile)) {
      return [];
    }

    const content = await fs.readFile(specFile, 'utf-8');

    // Parse frontmatter to get feature ID
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return [];
    }

    const frontmatter = yaml.parse(frontmatterMatch[1]);
    let featureId = frontmatter.feature_id || frontmatter.epic || frontmatter.feature;

    // v0.34.0: Fallback to metadata.json if spec.md doesn't have feature_id
    // This handles legacy increments where feature_id was only in metadata.json
    if (!featureId) {
      const metadataFile = path.join(
        this.projectRoot,
        '.specweave/increments',
        this.incrementId,
        'metadata.json'
      );
      if (existsSync(metadataFile)) {
        try {
          const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf-8'));
          featureId = metadata.feature_id || metadata.epic_id;
          if (featureId) {
            this.logger.log(`  📎 Using feature_id from metadata.json: ${featureId}`);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // FIX (v1.0.302 / 0271): Add deriveFeatureId() fallback when featureId not in frontmatter/metadata
    if (!featureId) {
      try {
        featureId = deriveFeatureId(this.incrementId);
        this.logger.log(`  📎 Derived feature ID for user story loading: ${featureId}`);
      } catch {
        this.logger.warn(`  ⚠️ Could not derive feature ID from ${this.incrementId} - no user stories loaded`);
        return [];
      }
    }

    // Find living docs for this feature (uses auto-detected project ID)
    const featurePath = path.join(
      this.projectRoot,
      '.specweave/docs/internal/specs',
      this.projectId,
      featureId
    );

    if (!existsSync(featurePath)) {
      // FIX (v1.0.302 / 0271): Fall back to parsing user stories from spec.md
      // when living docs folder is missing (same approach as ExternalIssueAutoCreator)
      this.logger.warn(`  ⚠️ Living docs folder missing: ${this.projectId}/${featureId}/`);
      this.logger.warn(`     Falling back to parsing user stories from spec.md`);
      this.logger.warn(`     Run /sw:progress-sync to create living docs`);
      return this.parseUserStoriesFromSpec(content, featureId);
    }

    // Load all US files
    const files = await fs.readdir(featurePath);
    const usFiles: LivingDocsUSFile[] = [];

    for (const file of files) {
      if (file.startsWith('us-') && file.endsWith('.md')) {
        const filePath = path.join(featurePath, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');

        // Parse frontmatter
        const match = fileContent.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
          const fm = yaml.parse(match[1]);
          usFiles.push({
            id: fm.id,
            title: fm.title,
            format_preservation: fm.format_preservation,
            external_title: fm.external_title,
            external_source: fm.external_source,
            external_id: fm.external_id,
            external_url: fm.external_url,
            imported_at: fm.imported_at,
            origin: fm.origin,
            external_tools: fm.external_tools  // FIX: Include external_tools (Layer 1 cache)
          });
        }
      }
    }

    return usFiles;
  }

  /**
   * Parse user stories from spec.md content when living docs folder is missing
   * FIX (v1.0.302 / 0271): Fallback for when living docs haven't been synced yet
   * Uses the same regex approach as ExternalIssueAutoCreator.parseUserStories()
   */
  private parseUserStoriesFromSpec(specContent: string, featureId: string): LivingDocsUSFile[] {
    const usFiles: LivingDocsUSFile[] = [];
    const usRegex = /^### (US-\d+):?\s*(.+?)(?:\s*\(P\d\))?\s*$/gm;
    let match;

    while ((match = usRegex.exec(specContent)) !== null) {
      const usId = match[1];
      const title = match[2].trim();

      usFiles.push({
        id: usId,
        title,
        format_preservation: false,
        origin: 'internal',
      });
    }

    if (usFiles.length > 0) {
      this.logger.log(`  📄 Parsed ${usFiles.length} user story/stories from spec.md (fallback)`);
    } else {
      this.logger.warn(`  ⚠️ No user stories found in spec.md body`);
    }

    return usFiles;
  }

  /**
   * Load config
   */
  private async loadConfig(): Promise<SpecWeaveConfig> {
    const configPath = path.join(this.projectRoot, '.specweave/config.json');

    if (!existsSync(configPath)) {
      return {} as SpecWeaveConfig;
    }

    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as SpecWeaveConfig;
  }

  /**
   * Detect GitHub repository from config or git
   * Delegates to ProviderRouter
   */
  private async detectGitHubRepo(githubConfig: GitHubRepoConfig): Promise<RepoInfo | null> {
    return this.providerRouter.detectGitHubRepo(githubConfig);
  }

  /**
   * Format completion comment for ADO work item
   */
  private formatAdoCompletionComment(
    usFile: LivingDocsUSFile,
    completionData: CompletionCommentData
  ): string {
    const lines: string[] = [];

    lines.push(`## ✅ SpecWeave Progress Update`);
    lines.push(``);
    lines.push(`**User Story**: ${usFile.id} - ${usFile.title || 'N/A'}`);
    lines.push(`**Increment**: ${this.incrementId}`);
    lines.push(``);

    // Progress
    lines.push(`### Progress: ${completionData.progressPercentage}%`);
    lines.push(``);

    // Tasks
    if (completionData.tasks.length > 0) {
      lines.push(`### Tasks`);
      for (const task of completionData.tasks) {
        const status = task.completed ? '✅' : '⬜';
        lines.push(`- ${status} ${task.taskId}: ${task.title}`);
      }
      lines.push(``);
    }

    // Acceptance Criteria
    if (completionData.acceptanceCriteria.length > 0) {
      lines.push(`### Acceptance Criteria`);
      for (const ac of completionData.acceptanceCriteria) {
        const status = ac.satisfied ? '✅' : '⬜';
        lines.push(`- ${status} ${ac.acId}: ${ac.description}`);
      }
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(`🤖 Auto-synced by SpecWeave`);

    return lines.join('\n');
  }

  /**
   * Format completion comment for JIRA issue
   *
   * Uses plain text with emoji (not JIRA wiki markup) because JiraClient.addComment()
   * wraps content in ADF paragraph format where wiki syntax doesn't render.
   * Emoji checkmarks work in both plain text and ADF contexts.
   */
  private formatJiraCompletionComment(
    usFile: LivingDocsUSFile,
    completionData: CompletionCommentData
  ): string {
    const lines: string[] = [];

    lines.push(`✅ SpecWeave Progress Update`);
    lines.push(``);
    lines.push(`User Story: ${usFile.id} - ${usFile.title || 'N/A'}`);
    lines.push(`Increment: ${this.incrementId}`);
    lines.push(``);

    // Progress
    lines.push(`📊 Progress: ${completionData.progressPercentage}%`);
    lines.push(``);

    // Tasks
    if (completionData.tasks.length > 0) {
      lines.push(`📋 Tasks`);
      for (const task of completionData.tasks) {
        const status = task.completed ? '✅' : '⬜';
        lines.push(`  ${status} ${task.taskId}: ${task.title}`);
      }
      lines.push(``);
    }

    // Acceptance Criteria
    if (completionData.acceptanceCriteria.length > 0) {
      lines.push(`🎯 Acceptance Criteria`);
      for (const ac of completionData.acceptanceCriteria) {
        const status = ac.satisfied ? '✅' : '⬜';
        lines.push(`  ${status} ${ac.acId}: ${ac.description}`);
      }
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(`🤖 Auto-synced by SpecWeave`);

    return lines.join('\n');
  }

}
