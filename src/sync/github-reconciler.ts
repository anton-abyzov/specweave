/**
 * GitHub Reconciler (NEW in v0.28.33)
 *
 * Reconciles GitHub issue states with increment metadata.json statuses.
 * Fixes drift between local SpecWeave state and GitHub:
 * - Closes issues for completed increments that are still open
 * - Reopens issues for in-progress increments that are closed
 *
 * Triggered by:
 * - /specweave-github:reconcile command (manual)
 * - SessionStart hook (automatic, if configured)
 * - post-increment-status-change.sh (on resume/abandon)
 */

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { GitHubClientV2 } from '../../plugins/specweave-github/lib/github-client-v2.js';
import { Logger, consoleLogger } from '../utils/logger.js';
import { resolvePermissions, SyncPreset } from './config.js';
import { deriveFeatureId } from '../utils/feature-id-derivation.js';

export interface ReconcileOptions {
  projectRoot: string;
  dryRun?: boolean;
  logger?: Logger;
}

export interface IncrementGitHubState {
  incrementId: string;
  incrementPath: string;
  metadataStatus: string;
  featureId?: string;
  mainIssue?: {
    number: number;
    url?: string;
  };
  userStoryIssues: Array<{
    userStoryId: string;
    issueNumber: number;
  }>;
}

export interface ReconcileResult {
  scanned: number;
  mismatches: number;
  closed: number;
  reopened: number;
  errors: string[];
  details: Array<{
    incrementId: string;
    action: 'close' | 'reopen' | 'skip' | 'error';
    issueNumber: number;
    reason: string;
  }>;
}

export class GitHubReconciler {
  private projectRoot: string;
  private dryRun: boolean;
  private logger: Logger;
  private client: GitHubClientV2 | null = null;
  private configCache: any | null = null;

  constructor(options: ReconcileOptions) {
    this.projectRoot = options.projectRoot;
    this.dryRun = options.dryRun ?? false;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Main reconciliation entry point
   */
  async reconcile(): Promise<ReconcileResult> {
    const result: ReconcileResult = {
      scanned: 0,
      mismatches: 0,
      closed: 0,
      reopened: 0,
      errors: [],
      details: [],
    };

    try {
      // 1. Check if GitHub sync is enabled
      const config = await this.loadConfig();
      // v1.0.240 FIX: Honor preset when explicit settings absent
      const syncAny = config.sync as Record<string, unknown> | undefined;
      const permissions = resolvePermissions(
        syncAny?.preset as SyncPreset | undefined,
        undefined,
        config.sync?.settings,
      );
      const canUpdate = config.sync?.settings?.canUpdateExternalItems ?? permissions.canUpsert;
      const githubEnabled = config.sync?.github?.enabled ?? false;

      if (!canUpdate || !githubEnabled) {
        this.logger.log('ℹ️  GitHub sync is disabled - skipping reconciliation');
        this.logger.log('   Enable with: canUpdateExternalItems=true AND sync.github.enabled=true');
        return result;
      }

      // 2. Initialize GitHub client
      await this.initClient(config);
      if (!this.client) {
        result.errors.push('Failed to initialize GitHub client');
        return result;
      }

      // 3. Scan all non-archived increments
      const increments = await this.scanIncrements();
      result.scanned = increments.length;

      this.logger.log(`\n📊 Scanning ${increments.length} increment(s) for GitHub state drift...\n`);

      // 4. Check and fix each increment
      for (const inc of increments) {
        await this.reconcileIncrement(inc, result);
      }

      // 5. Report summary
      this.logger.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log('📊 RECONCILIATION SUMMARY');
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log(`   Increments scanned: ${result.scanned}`);
      this.logger.log(`   Mismatches found:   ${result.mismatches}`);
      this.logger.log(`   Issues closed:      ${result.closed}`);
      this.logger.log(`   Issues reopened:    ${result.reopened}`);
      this.logger.log(`   Errors:             ${result.errors.length}`);
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
    inc: IncrementGitHubState,
    result: ReconcileResult
  ): Promise<void> {
    const status = inc.metadataStatus;

    // Determine expected GitHub state
    const shouldBeClosed = status === 'completed' || status === 'abandoned';
    const shouldBeOpen = status === 'active' || status === 'planning' || status === 'backlog' || status === 'ready_for_review';

    // Check main issue
    if (inc.mainIssue) {
      await this.reconcileIssue(
        inc.incrementId,
        inc.mainIssue.number,
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
        us.issueNumber,
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
    issueNumber: number,
    shouldBeClosed: boolean,
    shouldBeOpen: boolean,
    metadataStatus: string,
    result: ReconcileResult
  ): Promise<void> {
    try {
      // Get current GitHub state
      const issue = await this.client!.getIssue(issueNumber);
      const isCurrentlyClosed = issue.state === 'closed';

      // Check for mismatch
      if (shouldBeClosed && !isCurrentlyClosed) {
        // Should be closed but is open
        result.mismatches++;
        this.logger.log(`  ❌ Issue #${issueNumber} (${context}): OPEN but should be CLOSED (status=${metadataStatus})`);

        if (!this.dryRun) {
          const comment = `## 🔄 Auto-Reconciled

This issue was closed by SpecWeave reconciliation.

**Reason**: Increment status is \`${metadataStatus}\` but GitHub issue was still open.

---
🤖 Auto-reconciled by SpecWeave`;

          await this.client!.closeIssue(issueNumber, comment);
          result.closed++;
          this.logger.log(`     ✅ Closed issue #${issueNumber}`);
        } else {
          this.logger.log(`     [DRY RUN] Would close issue #${issueNumber}`);
        }

        result.details.push({
          incrementId: context,
          action: this.dryRun ? 'skip' : 'close',
          issueNumber,
          reason: `Status=${metadataStatus}, GH=open`,
        });

      } else if (shouldBeOpen && isCurrentlyClosed) {
        // Should be open but is closed
        result.mismatches++;
        this.logger.log(`  ❌ Issue #${issueNumber} (${context}): CLOSED but should be OPEN (status=${metadataStatus})`);

        if (!this.dryRun) {
          const comment = `## 🔄 Auto-Reopened

This issue was reopened by SpecWeave reconciliation.

**Reason**: Increment status is \`${metadataStatus}\` but GitHub issue was closed.

This typically happens when:
- Increment was resumed after being paused/completed
- Manual status change in metadata.json

---
🤖 Auto-reconciled by SpecWeave`;

          await this.client!.reopenIssue(issueNumber, comment);
          result.reopened++;
          this.logger.log(`     ✅ Reopened issue #${issueNumber}`);
        } else {
          this.logger.log(`     [DRY RUN] Would reopen issue #${issueNumber}`);
        }

        result.details.push({
          incrementId: context,
          action: this.dryRun ? 'skip' : 'reopen',
          issueNumber,
          reason: `Status=${metadataStatus}, GH=closed`,
        });

      } else {
        // State matches - no action needed
        this.logger.log(`  ✅ Issue #${issueNumber} (${context}): State matches (${isCurrentlyClosed ? 'closed' : 'open'})`);
      }

    } catch (error: any) {
      result.errors.push(`Issue #${issueNumber}: ${error.message}`);
      result.details.push({
        incrementId: context,
        action: 'error',
        issueNumber,
        reason: error.message,
      });
      this.logger.error(`  ⚠️  Error checking issue #${issueNumber}: ${error.message}`);
    }
  }

  /**
   * Scan all non-archived increments and extract GitHub state
   */
  private async scanIncrements(): Promise<IncrementGitHubState[]> {
    const incrementsDir = path.join(this.projectRoot, '.specweave/increments');
    const results: IncrementGitHubState[] = [];

    if (!existsSync(incrementsDir)) {
      return results;
    }

    const entries = await fs.readdir(incrementsDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip non-directories and archive
      if (!entry.isDirectory() || entry.name === '_archive' || entry.name.startsWith('.')) {
        continue;
      }

      const incrementPath = path.join(incrementsDir, entry.name);
      const metadataPath = path.join(incrementPath, 'metadata.json');

      if (!existsSync(metadataPath)) {
        continue;
      }

      try {
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
        const state: IncrementGitHubState = {
          incrementId: entry.name,
          incrementPath,
          metadataStatus: metadata.status || 'unknown',
          featureId: metadata.feature_id,
          userStoryIssues: [],
        };

        // Extract main issue
        if (metadata.github?.issue) {
          state.mainIssue = {
            number: metadata.github.issue,
            url: metadata.github.url,
          };
        }

        // Extract User Story issues from metadata (OLD format: metadata.github.issues[])
        if (metadata.github?.issues && Array.isArray(metadata.github.issues)) {
          for (const issue of metadata.github.issues) {
            if (issue.userStory && issue.number) {
              state.userStoryIssues.push({
                userStoryId: issue.userStory,
                issueNumber: issue.number,
              });
            }
          }
        }

        // v1.0.240 FIX: Also read NEW format (externalLinks.github.issues{})
        // Hook path (github-auto-create-handler.sh) writes this keyed object format
        if (state.userStoryIssues.length === 0 && metadata.externalLinks?.github?.issues) {
          const newFormatIssues = metadata.externalLinks.github.issues;
          for (const [usId, issueData] of Object.entries(newFormatIssues)) {
            if (issueData && typeof issueData === 'object' && 'issueNumber' in (issueData as Record<string, unknown>)) {
              state.userStoryIssues.push({
                userStoryId: usId,
                issueNumber: (issueData as { issueNumber: number }).issueNumber,
              });
            }
          }
          if (state.userStoryIssues.length > 0) {
            this.logger.log(`  📋 Found ${state.userStoryIssues.length} issue(s) from externalLinks format`);
          }
        }

        // v1.0.240 FIX: Auto-derive featureId when metadata.feature_id is null
        if (!state.featureId) {
          try {
            state.featureId = deriveFeatureId(entry.name) || undefined;
          } catch {
            // Non-critical: featureId derivation may fail for non-standard names
          }
        }

        // FALLBACK: Search GitHub if metadata doesn't have issues stored
        // v1.0.240 FIX: Removed user_stories.length requirement — search by featureId alone
        if (state.userStoryIssues.length === 0 && state.featureId && this.client) {
          this.logger.log(`  🔍 Searching GitHub for ${state.featureId} issues (not in metadata)...`);

          try {
            // Search for all issues matching the feature pattern
            const foundIssues = await this.client.searchIssuesByFeature(state.featureId);

            for (const issue of foundIssues) {
              // Extract user story ID from title: [FS-063][US-001] Title
              const match = issue.title.match(/\[([A-Z]+-\d+)\]\[([A-Z]+-\d+)\]/);
              if (match && match[1] === state.featureId) {
                const usId = match[2];
                state.userStoryIssues.push({
                  userStoryId: usId,
                  issueNumber: issue.number,
                });
              }
            }

            if (state.userStoryIssues.length > 0) {
              this.logger.log(`     Found ${state.userStoryIssues.length} issue(s) via GitHub search`);
            }
          } catch (error: any) {
            this.logger.log(`  ⚠️  GitHub search failed: ${error.message}`);
          }
        }

        // Only include if has GitHub links
        if (state.mainIssue || state.userStoryIssues.length > 0) {
          results.push(state);
        }

      } catch (error) {
        // Skip invalid metadata
        this.logger.log(`  ⚠️  Skipping ${entry.name}: Invalid metadata.json`);
      }
    }

    return results;
  }

  /**
   * Initialize GitHub client
   *
   * Prefers sync.github.owner/repo from config (critical for umbrella repos
   * where git remote points to a different repo than where issues live).
   * Falls back to git remote detection.
   */
  private async initClient(config?: any): Promise<void> {
    const cfg = config ?? await this.loadConfig();
    const ghConfig = cfg.sync?.github;

    if (ghConfig?.owner && ghConfig?.repo) {
      this.client = GitHubClientV2.fromRepo(ghConfig.owner, ghConfig.repo);
      this.logger.log(`🔗 GitHub repository: ${ghConfig.owner}/${ghConfig.repo} (from config)`);
    } else {
      const repoInfo = await GitHubClientV2.detectRepo(this.projectRoot);
      if (!repoInfo) {
        throw new Error('Could not detect GitHub repository. Ensure sync.github.owner/repo is configured or a git remote exists.');
      }
      this.client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
      this.logger.log(`🔗 GitHub repository: ${repoInfo.owner}/${repoInfo.repo} (from git remote)`);
    }
  }

  /**
   * Load config (cached after first read)
   */
  private async loadConfig(): Promise<any> {
    if (this.configCache !== null) {
      return this.configCache;
    }

    const configPath = path.join(this.projectRoot, '.specweave/config.json');

    if (!existsSync(configPath)) {
      this.configCache = {};
      return this.configCache;
    }

    const content = await fs.readFile(configPath, 'utf-8');
    this.configCache = JSON.parse(content);
    return this.configCache;
  }

  /**
   * Resolve GitHub owner/repo from config, falling back to git remote.
   * Critical for umbrella repos where git remote != issue target repo.
   */
  private static async resolveRepoInfo(
    projectRoot: string
  ): Promise<{ owner: string; repo: string } | null> {
    try {
      const configPath = path.join(projectRoot, '.specweave/config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        const ghConfig = config.sync?.github;
        if (ghConfig?.owner && ghConfig?.repo) {
          return { owner: ghConfig.owner, repo: ghConfig.repo };
        }
      }
    } catch {
      // Fall through to git detection
    }
    return GitHubClientV2.detectRepo(projectRoot);
  }

  // ==========================================================================
  // Static helpers for single-increment operations (used by hooks)
  // ==========================================================================

  /**
   * Reopen all GitHub issues for an increment
   * Called by post-increment-status-change.sh when resuming
   */
  static async reopenIncrementIssues(
    projectRoot: string,
    incrementId: string,
    reason: string,
    logger?: Logger
  ): Promise<{ reopened: number; errors: string[] }> {
    const log = logger ?? consoleLogger;
    const result = { reopened: 0, errors: [] as string[] };

    try {
      // Load metadata
      const metadataPath = path.join(
        projectRoot,
        '.specweave/increments',
        incrementId,
        'metadata.json'
      );

      if (!existsSync(metadataPath)) {
        result.errors.push('metadata.json not found');
        return result;
      }

      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

      // Initialize client (prefer config over git remote for umbrella repos)
      const repoInfo = await GitHubReconciler.resolveRepoInfo(projectRoot);
      if (!repoInfo) {
        result.errors.push('Could not detect GitHub repository');
        return result;
      }

      const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);

      const comment = `## ▶️ Increment Resumed

This issue was reopened because increment \`${incrementId}\` was resumed.

**Reason**: ${reason}

---
🤖 Auto-reopened by SpecWeave`;

      // Reopen main issue
      if (metadata.github?.issue) {
        try {
          const issue = await client.getIssue(metadata.github.issue);
          if (issue.state === 'closed') {
            await client.reopenIssue(metadata.github.issue, comment);
            result.reopened++;
            log.log(`  ✅ Reopened main issue #${metadata.github.issue}`);
          }
        } catch (error: any) {
          result.errors.push(`Main issue: ${error.message}`);
        }
      }

      // Reopen User Story issues
      if (metadata.github?.issues && Array.isArray(metadata.github.issues)) {
        for (const usIssue of metadata.github.issues) {
          if (usIssue.number) {
            try {
              const issue = await client.getIssue(usIssue.number);
              if (issue.state === 'closed') {
                await client.reopenIssue(usIssue.number, comment);
                result.reopened++;
                log.log(`  ✅ Reopened User Story issue #${usIssue.number}`);
              }
            } catch (error: any) {
              result.errors.push(`Issue #${usIssue.number}: ${error.message}`);
            }
          }
        }
      }

      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Close all GitHub issues for an abandoned increment
   * Called by post-increment-status-change.sh when abandoning
   */
  static async closeAbandonedIncrementIssues(
    projectRoot: string,
    incrementId: string,
    reason: string,
    logger?: Logger
  ): Promise<{ closed: number; errors: string[] }> {
    const log = logger ?? consoleLogger;
    const result = { closed: 0, errors: [] as string[] };

    try {
      // Load metadata
      const metadataPath = path.join(
        projectRoot,
        '.specweave/increments',
        incrementId,
        'metadata.json'
      );

      if (!existsSync(metadataPath)) {
        result.errors.push('metadata.json not found');
        return result;
      }

      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

      // Initialize client (prefer config over git remote for umbrella repos)
      const repoInfo = await GitHubReconciler.resolveRepoInfo(projectRoot);
      if (!repoInfo) {
        result.errors.push('Could not detect GitHub repository');
        return result;
      }

      const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);

      const comment = `## 🗑️ Increment Abandoned

This issue was closed because increment \`${incrementId}\` was abandoned.

**Reason**: ${reason}

---
🤖 Auto-closed by SpecWeave`;

      // Close main issue
      if (metadata.github?.issue) {
        try {
          const issue = await client.getIssue(metadata.github.issue);
          if (issue.state === 'open') {
            await client.closeIssue(metadata.github.issue, comment);
            result.closed++;
            log.log(`  ✅ Closed main issue #${metadata.github.issue}`);
          }
        } catch (error: any) {
          result.errors.push(`Main issue: ${error.message}`);
        }
      }

      // Close User Story issues
      if (metadata.github?.issues && Array.isArray(metadata.github.issues)) {
        for (const usIssue of metadata.github.issues) {
          if (usIssue.number) {
            try {
              const issue = await client.getIssue(usIssue.number);
              if (issue.state === 'open') {
                await client.closeIssue(usIssue.number, comment);
                result.closed++;
                log.log(`  ✅ Closed User Story issue #${usIssue.number}`);
              }
            } catch (error: any) {
              result.errors.push(`Issue #${usIssue.number}: ${error.message}`);
            }
          }
        }
      }

      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      return result;
    }
  }
}
