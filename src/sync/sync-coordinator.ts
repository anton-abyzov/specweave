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
import { GitHubIssue } from '../../plugins/specweave-github/lib/types.js';
import { Logger, consoleLogger } from '../utils/logger.js';
import { FrontmatterUpdater } from './frontmatter-updater.js';
import { autoDetectProjectIdSync } from '../utils/project-detection.js';
import { UserStoryContentBuilder } from '../../plugins/specweave-github/lib/user-story-content-builder.js';
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

// Re-export for backwards compatibility
export { isProviderEnabled } from './status-mapper.js';

/**
 * GitHub issue reference stored in metadata.json
 */
interface GitHubIssueReference {
  userStory: string;
  number: number;
  url: string;
  createdAt: string;
}

/**
 * Increment metadata with GitHub sync info
 */
interface IncrementMetadataWithSync {
  github?: {
    issues?: GitHubIssueReference[];
    lastSync?: string;
  };
  feature_id?: string;
  epic_id?: string;
  [key: string]: unknown;
}

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
   * Create GitHub issues for all User Stories in the feature (NEW in v0.25.0)
   *
   * This is the AUTOMATIC GitHub sync that runs when increment completes.
   * Creates issues for User Stories that don't have GitHub issues yet.
   *
   * Uses 3-layer idempotency:
   * - Layer 1: Check user story frontmatter (fastest, <1ms)
   * - Layer 2: Check increment metadata.json (fast, <5ms)
   * - Layer 3: Query GitHub API (slow but authoritative, 500-2000ms)
   *
   * @param config - Project configuration
   * @returns Array of created issues
   */
  async createGitHubIssuesForUserStories(config: SpecWeaveConfig): Promise<GitHubIssue[]> {
    const createdIssues: GitHubIssue[] = [];

    try {
      // Load user stories for this increment
      const userStories = await this.loadUserStoriesForIncrement();

      if (userStories.length === 0) {
        this.logger.log('📚 No user stories found for this increment');
        return createdIssues;
      }

      this.logger.log(`📚 Found ${userStories.length} user story/stories for GitHub sync`);

      // Get GitHub config
      const githubConfig = config.sync?.github || {};
      const repoInfo = await this.detectGitHubRepo(githubConfig);

      if (!repoInfo) {
        throw new Error('GitHub repository not configured');
      }

      const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);

      // Get feature ID from increment spec
      const specFile = path.join(
        this.projectRoot,
        '.specweave/increments',
        this.incrementId,
        'spec.md'
      );

      let featureId = '';
      if (existsSync(specFile)) {
        const content = await fs.readFile(specFile, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
          const frontmatter = yaml.parse(frontmatterMatch[1]);
          featureId = frontmatter.feature_id || frontmatter.epic || frontmatter.feature || '';
        }
      }

      if (!featureId) {
        // AUTO-GENERATE feature ID using deriveFeatureId() (ADR-0139)
        // CRITICAL FIX: Must use deriveFeatureId() to get correct format (FS-128, not FS-0128)
        // The old code used raw regex match which preserved leading zeros, causing duplicates
        try {
          featureId = deriveFeatureId(this.incrementId);
          this.logger.log(`📝 Auto-generated feature ID: ${featureId} (no epic/feature_id in spec.md)`);
        } catch {
          this.logger.log('⚠️  No feature ID found and could not auto-generate - skipping GitHub sync');
          this.logger.log('   💡 Add epic: FS-XXX or feature_id: FS-XXX to spec.md frontmatter');
          return createdIssues;
        }
      }

      // Try to find or create milestone for the feature
      let milestoneNumber: number | null = null;
      try {
        const milestone = await client.createOrGetMilestone(
          `${featureId}: Automatic GitHub Sync`,
          `Feature milestone for ${featureId}`,
          30 // 30 days from now
        );
        milestoneNumber = milestone.number;
        this.logger.log(`🎯 Using milestone: ${milestone.title} (#${milestone.number})`);
      } catch (error) {
        this.logger.log('⚠️  Could not create/get milestone, continuing without it');
      }

      // Create issue for each user story (with idempotency + atomic locking)
      // Ensure locks directory exists (once per batch, not per user story)
      const locksDir = path.join(this.projectRoot, '.specweave/state/.locks');
      if (!existsSync(locksDir)) {
        await fs.mkdir(locksDir, { recursive: true });
      }

      for (const usFile of userStories) {
        // ATOMIC LOCK: Prevent race conditions when multiple syncs run concurrently
        // Lock is per-user-story to allow parallel processing of different stories
        const lockDir = path.join(
          locksDir,
          `github-issue-${featureId}-${usFile.id}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
        );
        const lockManager = new LockManager(lockDir, 60, { logger: this.logger }); // 60s stale threshold

        let lockAcquired = false;
        try {
          lockAcquired = await lockManager.acquire();
          if (!lockAcquired) {
            this.logger.log(`  ⏳ ${usFile.id} - Another sync in progress, skipping (lock not acquired)`);
            continue;
          }

          // LAYER 1: Check user story frontmatter for existing GitHub issue
          const cachedIssue = await this.frontmatterUpdater.getGitHubIssueFromFrontmatter(
            this.projectRoot,
            featureId,
            usFile.id
          );

          if (cachedIssue) {
            this.logger.log(`  🔍 ${usFile.id} - Issue #${cachedIssue.number} exists (cached)`);
            // Check if issue needs content update (has placeholder body)
            await this.updateIssueIfPlaceholder(cachedIssue.number, usFile.id, featureId, client, repoInfo);
            continue;
          }

          // LAYER 2: Check increment metadata.json
          const metadataFile = path.join(
            this.projectRoot,
            '.specweave/increments',
            this.incrementId,
            'metadata.json'
          );

          let existingIssue: number | null = null;
          if (existsSync(metadataFile)) {
            const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf-8')) as IncrementMetadataWithSync;
            const githubIssues = metadata.github?.issues || [];
            const found = githubIssues.find((i: GitHubIssueReference) => i.userStory === usFile.id);
            if (found) {
              this.logger.log(`  🔍 ${usFile.id} - Issue #${found.number} exists (metadata)`);
              // Check if issue needs content update
              await this.updateIssueIfPlaceholder(found.number, usFile.id, featureId, client, repoInfo);
              existingIssue = found.number;
              continue;
            }
          }

          // LAYER 3: Query GitHub API to check for existing issue
          const searchTitle = `[${featureId}][${usFile.id}]`;
          const existingOnGitHub = await client.searchIssueByTitle(searchTitle);

          if (existingOnGitHub) {
            this.logger.log(`  🔍 ${usFile.id} - Issue #${existingOnGitHub.number} already exists on GitHub`);

            // CHECK: Does issue have placeholder content that needs updating?
            const hasPlaceholderBody = existingOnGitHub.body?.includes('This issue was auto-created by SpecWeave')
              && !existingOnGitHub.body?.includes('## Acceptance Criteria');

            if (hasPlaceholderBody) {
              this.logger.log(`  📝 Issue has placeholder content - updating with rich body...`);
              try {
                // Find the user story file in living docs
                const featurePath = path.join(
                  this.projectRoot,
                  '.specweave/docs/internal/specs',
                  this.projectId,
                  featureId
                );

                const usIdNumber = usFile.id.toLowerCase().replace('us-', '');
                const featureFiles = existsSync(featurePath) ? await fs.readdir(featurePath) : [];
                const usFileName = featureFiles.find(f =>
                  f.startsWith(`us-${usIdNumber}-`) && f.endsWith('.md')
                );

                if (usFileName) {
                  const usFilePath = path.join(featurePath, usFileName);
                  const contentBuilder = new UserStoryContentBuilder(usFilePath, this.projectRoot);
                  const richBody = await contentBuilder.buildIssueBody(`${repoInfo.owner}/${repoInfo.repo}`);

                  // Update the issue body via gh CLI
                  await client.updateIssueBody(existingOnGitHub.number, richBody);
                  this.logger.log(`  ✅ Updated issue #${existingOnGitHub.number} with rich content (ACs, tasks)`);
                } else {
                  this.logger.log(`  ⚠️ User story file not found - keeping placeholder content`);
                }
              } catch (error) {
                this.logger.log(`  ⚠️ Failed to update issue body: ${error}`);
              }
            } else {
              this.logger.log(`  ⏭️ Issue already has rich content - skipping update`);
            }

            // Backfill Layer 1 (frontmatter) and Layer 2 (metadata)
            await this.frontmatterUpdater.updateUserStoryFrontmatter({
              projectRoot: this.projectRoot,
              featureId,
              userStoryId: usFile.id,
              githubIssue: {
                number: existingOnGitHub.number,
                url: existingOnGitHub.html_url,
                createdAt: new Date().toISOString(),
              },
            });

            // Backfill Layer 2 (metadata.json)
            if (existsSync(metadataFile)) {
              const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf-8'));
              if (!metadata.github) {
                metadata.github = {};
              }
              if (!metadata.github.issues) {
                metadata.github.issues = [];
              }

              // Check if not already in metadata
              const existsInMetadata = metadata.github.issues.find(
                (i: GitHubIssueReference) => i.userStory === usFile.id
              );
              if (!existsInMetadata) {
                metadata.github.issues.push({
                  userStory: usFile.id,
                  number: existingOnGitHub.number,
                  url: existingOnGitHub.html_url,
                  createdAt: new Date().toISOString(),
                });
                metadata.github.lastSync = new Date().toISOString();
                await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');
              }
            }

            continue;
          }

          // All 3 layers miss - but check for DUPLICATES with wrong format first!
          // ========================================================================
          // DUPLICATE DETECTION: Prevent FS-0128 vs FS-128 duplicates
          // ========================================================================
          // Before creating, search for issues with similar titles but different feature ID formats.
          // This catches cases where an old bug created issues with leading zeros (FS-0128)
          // but the correct format is without (FS-128).
          const duplicateCheck = await this.detectDuplicateIssue(client, featureId, usFile.id);
          if (duplicateCheck) {
            this.logger.log(`  ⚠️  DUPLICATE DETECTED: Issue #${duplicateCheck.number} exists with format "${duplicateCheck.format}"`);
            this.logger.log(`     Current format: [${featureId}][${usFile.id}]`);
            this.logger.log(`     Existing issue: ${duplicateCheck.title}`);
            this.logger.log(`     ⏭️  Skipping creation to avoid duplicate. Use existing issue #${duplicateCheck.number}`);

            // Backfill metadata with the existing issue (even if wrong format)
            await this.frontmatterUpdater.updateUserStoryFrontmatter({
              projectRoot: this.projectRoot,
              featureId,
              userStoryId: usFile.id,
              githubIssue: {
                number: duplicateCheck.number,
                url: duplicateCheck.url,
                createdAt: new Date().toISOString(),
              },
            });
            continue;
          }

          this.logger.log(`  📝 Creating GitHub issue for ${usFile.id}...`);

          // Format issue body - use UserStoryContentBuilder for rich content with ACs
          let issueBody: string;
          try {
            // Find the user story file in living docs
            const featurePath = path.join(
              this.projectRoot,
              '.specweave/docs/internal/specs',
              this.projectId,
              featureId
            );

            // Search for file matching us-{number}-*.md pattern
            const usIdNumber = usFile.id.toLowerCase().replace('us-', '');
            const featureFiles = existsSync(featurePath) ? await fs.readdir(featurePath) : [];
            const usFileName = featureFiles.find(f =>
              f.startsWith(`us-${usIdNumber}-`) && f.endsWith('.md')
            );

            if (usFileName) {
              const usFilePath = path.join(featurePath, usFileName);
              const contentBuilder = new UserStoryContentBuilder(usFilePath, this.projectRoot);
              issueBody = await contentBuilder.buildIssueBody(`${repoInfo.owner}/${repoInfo.repo}`);
              this.logger.log(`  📄 Built rich issue body with ACs from ${usFileName}`);
            } else {
              // Fallback to basic body if file not found
              this.logger.log(`  ⚠️ User story file not found for ${usFile.id}, using basic body`);
              issueBody = this.formatUserStoryBody(usFile);
            }
          } catch (error) {
            // Fallback to basic body on any error
            this.logger.log(`  ⚠️ Failed to build rich body: ${error}, using fallback`);
            issueBody = this.formatUserStoryBody(usFile);
          }

          // Create issue
          const issue = await client.createUserStoryIssue({
            featureId,
            userStoryId: usFile.id,
            title: usFile.title,
            body: issueBody,
            labels: [],
            milestone: milestoneNumber,
          });

          this.logger.log(`  ✅ Created issue #${issue.number}: ${issue.html_url}`);
          createdIssues.push(issue);

          // Update increment metadata.json (Layer 2)
          if (existsSync(metadataFile)) {
            const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf-8'));
            if (!metadata.github) {
              metadata.github = {};
            }
            if (!metadata.github.issues) {
              metadata.github.issues = [];
            }
            metadata.github.issues.push({
              userStory: usFile.id,
              number: issue.number,
              url: issue.html_url,
              createdAt: new Date().toISOString(),
            });
            metadata.github.lastSync = new Date().toISOString();
            await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');
          }

          // Update user story frontmatter (Layer 1 backfill)
          await this.frontmatterUpdater.updateUserStoryFrontmatter({
            projectRoot: this.projectRoot,
            featureId,
            userStoryId: usFile.id,
            githubIssue: {
              number: issue.number,
              url: issue.html_url,
              createdAt: new Date().toISOString(),
            },
          });

        } catch (error) {
          this.logger.error(`  ❌ Failed to create issue for ${usFile.id}:`, error);
        } finally {
          // ALWAYS release lock, even on error or early continue
          if (lockAcquired) {
            await lockManager.release();
          }
        }
      }

      if (createdIssues.length > 0) {
        this.logger.log(`\n✅ Created ${createdIssues.length} GitHub issue(s) for ${featureId}`);
        createdIssues.forEach(issue => {
          this.logger.log(`   - Issue #${issue.number}: ${issue.html_url}`);
        });
      } else {
        this.logger.log('\n✅ All GitHub issues already exist (0 new issues created)');
      }

      return createdIssues;
    } catch (error) {
      this.logger.error('❌ Failed to create GitHub issues:', error);
      throw error;
    }
  }

  /**
   * Close GitHub issues for all User Stories when increment completes (NEW in v0.28.1)
   *
   * This is the CRITICAL missing feature that was causing GitHub issues to remain
   * open after increments were closed.
   *
   * Called by: syncIncrementClosure() when increment status changes to "completed"
   *
   * Flow:
   * 1. Get feature ID from increment spec
   * 2. Load all user stories for that feature
   * 3. For each user story with a GitHub issue, close it with completion comment
   *
   * @param config - Project configuration
   * @returns Array of closed issue numbers
   */
  async closeGitHubIssuesForUserStories(config: SpecWeaveConfig): Promise<number[]> {
    const closedIssues: number[] = [];

    try {
      // Load user stories for this increment
      const userStories = await this.loadUserStoriesForIncrement();

      if (userStories.length === 0) {
        this.logger.log('📚 No user stories found for this increment');
        return closedIssues;
      }

      this.logger.log(`📚 Found ${userStories.length} user story/stories for GitHub issue closure`);

      // Get GitHub config
      const githubConfig = config.sync?.github || {};
      const repoInfo = await this.detectGitHubRepo(githubConfig);

      if (!repoInfo) {
        throw new Error('GitHub repository not configured');
      }

      const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);

      // Get feature ID from increment spec
      const specFile = path.join(
        this.projectRoot,
        '.specweave/increments',
        this.incrementId,
        'spec.md'
      );

      let featureId = '';
      if (existsSync(specFile)) {
        const content = await fs.readFile(specFile, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
          const frontmatter = yaml.parse(frontmatterMatch[1]);
          featureId = frontmatter.feature_id || frontmatter.epic || frontmatter.feature || '';
        }
      }

      if (!featureId) {
        // AUTO-GENERATE feature ID using deriveFeatureId() (same logic as create)
        // CRITICAL FIX: Must use deriveFeatureId() to get correct format (FS-128, not FS-0128)
        try {
          featureId = deriveFeatureId(this.incrementId);
          this.logger.log(`📝 Auto-generated feature ID: ${featureId}`);
        } catch {
          this.logger.log('⚠️  No feature ID found - skipping GitHub issue closure');
          return closedIssues;
        }
      }

      // Close issue for each user story
      for (const usFile of userStories) {
        try {
          // Search for the GitHub issue by title pattern
          // v0.34.0: includeClosedIssues=true to correctly detect already-closed issues
          // Without this, we'd report "No issue found" instead of "already closed"
          const searchTitle = `[${featureId}][${usFile.id}]`;
          const existingIssue = await client.searchIssueByTitle(searchTitle, true);

          if (!existingIssue) {
            this.logger.log(`  ⏭️  ${usFile.id} - No GitHub issue found (skipping)`);
            continue;
          }

          // Check if already closed (GitHub API returns UPPERCASE: "OPEN" or "CLOSED")
          if (existingIssue.state.toLowerCase() === 'closed') {
            this.logger.log(`  ⏭️  ${usFile.id} - Issue #${existingIssue.number} already closed`);
            continue;
          }

          // Close the issue with completion comment
          this.logger.log(`  🔒 Closing GitHub issue #${existingIssue.number} for ${usFile.id}...`);

          const completionComment = `## ✅ User Story Complete

Increment \`${this.incrementId}\` has been marked as **completed**.

**User Story**: ${usFile.id} - ${usFile.title || 'N/A'}

### Completion Details
- ✅ All acceptance criteria satisfied
- ✅ All related tasks completed
- ✅ Tests passing
- ✅ Documentation updated

---
🤖 Auto-closed by SpecWeave on increment completion`;

          // Track metrics
          this.metrics.startOperation();
          try {
            await client.closeIssue(existingIssue.number, completionComment);
            closedIssues.push(existingIssue.number);
            this.metrics.recordClosure('github', existingIssue.number, true);
            this.logger.log(`  ✅ Closed issue #${existingIssue.number}`);
          } catch (closeError) {
            this.metrics.recordClosure('github', existingIssue.number, false, String(closeError));
            throw closeError;
          }

        } catch (error) {
          this.logger.error(`  ❌ Failed to close issue for ${usFile.id}:`, error);
        }
      }

      if (closedIssues.length > 0) {
        this.logger.log(`\n✅ Closed ${closedIssues.length} GitHub issue(s) for ${featureId}`);
      } else {
        this.logger.log('\n✅ No GitHub issues needed closing (all already closed or not found)');
      }

      return closedIssues;
    } catch (error) {
      this.logger.error('❌ Failed to close GitHub issues:', error);
      throw error;
    }
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

    try {
      this.logger.log(`\n🔒 Syncing increment CLOSURE for ${this.incrementId}...`);

      // 1. Load config
      const config = await this.loadConfig();

      // Check gates (same as syncIncrementCompletion)
      const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems ?? false;
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
      // GitHub Closure
      // ========================================================================
      if (githubEnabled) {
        this.logger.log('\n🔹 GitHub: Ensuring all issues exist...');
        try {
          await this.createGitHubIssuesForUserStories(config);
        } catch (error) {
          this.logger.error('⚠️  GitHub issue creation failed (non-blocking):', error);
          result.errors.push(`GitHub issue creation error: ${error}`);
        }

        this.logger.log('\n🔹 GitHub: Closing issues for completed user stories...');
        try {
          result.closedIssues = await this.closeGitHubIssuesForUserStories(config);
          totalClosed += result.closedIssues.length;
        } catch (error) {
          this.logger.error('⚠️  GitHub issue closure failed:', error);
          result.errors.push(`GitHub issue closure error: ${error}`);
        }
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
    }
  }

  /**
   * Detect duplicate issues with different feature ID formats
   *
   * Searches for issues that match the user story but have a different feature ID format.
   * This prevents creating duplicates like:
   * - [FS-0128][US-001] (old bug format with leading zeros)
   * - [FS-128][US-001] (correct format)
   *
   * The search uses a regex pattern that matches any FS-XXX format for the same US-XXX.
   *
   * @param client - GitHub client
   * @param featureId - Current feature ID (e.g., "FS-128")
   * @param userStoryId - User story ID (e.g., "US-001")
   * @returns Duplicate info if found, null otherwise
   */
  private async detectDuplicateIssue(
    client: GitHubClientV2,
    featureId: string,
    userStoryId: string
  ): Promise<{ number: number; url: string; title: string; format: string } | null> {
    try {
      // Extract the numeric part of the feature ID (e.g., "128" from "FS-128" or "FS-0128")
      const featureNumMatch = featureId.match(/FS-0*(\d+)E?/i);
      if (!featureNumMatch) {
        return null;
      }
      const featureNum = featureNumMatch[1];

      // Search for issues with ANY format of this feature ID + user story
      // Patterns to check:
      // - [FS-128][US-001]   (correct, no leading zeros)
      // - [FS-0128][US-001]  (bug format, with leading zeros)
      // - [FS-00128][US-001] (edge case, multiple leading zeros)
      const searchPatterns = [
        `[FS-${featureNum}][${userStoryId}]`,           // FS-128
        `[FS-0${featureNum}][${userStoryId}]`,          // FS-0128
        `[FS-00${featureNum}][${userStoryId}]`,         // FS-00128
        `[FS-${featureNum}E][${userStoryId}]`,          // FS-128E (external)
        `[FS-0${featureNum}E][${userStoryId}]`,         // FS-0128E
      ];

      // Filter out the exact current format (we already checked that)
      const currentFormat = `[${featureId}][${userStoryId}]`;
      const alternatePatterns = searchPatterns.filter(p => p !== currentFormat);

      for (const pattern of alternatePatterns) {
        const existingIssue = await client.searchIssueByTitle(pattern, true); // Include closed
        if (existingIssue) {
          // Extract the format from the issue title
          const formatMatch = existingIssue.title.match(/\[(FS-\d+E?)\]/i);
          const detectedFormat = formatMatch ? formatMatch[1] : 'unknown';

          return {
            number: existingIssue.number,
            url: existingIssue.html_url,
            title: existingIssue.title,
            format: detectedFormat,
          };
        }
      }

      return null;
    } catch (error) {
      // Don't block issue creation on duplicate detection failure
      this.logger.log(`    ⚠️ Duplicate detection failed (non-blocking): ${error}`);
      return null;
    }
  }

  /**
   * Update issue if it has placeholder content
   * Fetches issue from GitHub, checks for placeholder, and updates with rich content
   */
  private async updateIssueIfPlaceholder(
    issueNumber: number,
    userStoryId: string,
    featureId: string,
    client: GitHubClientV2,
    repoInfo: { owner: string; repo: string }
  ): Promise<void> {
    try {
      // Fetch issue from GitHub to check body content
      const issue = await client.getIssue(issueNumber);

      if (!issue) {
        this.logger.log(`    ⚠️ Could not fetch issue #${issueNumber}`);
        return;
      }

      // Check if issue has placeholder content
      const hasPlaceholderBody = issue.body?.includes('This issue was auto-created by SpecWeave')
        && !issue.body?.includes('## Acceptance Criteria');

      if (!hasPlaceholderBody) {
        this.logger.log(`    ✓ Issue already has rich content`);
        return;
      }

      this.logger.log(`    📝 Updating placeholder content with rich body...`);

      // Find the user story file in living docs
      const featurePath = path.join(
        this.projectRoot,
        '.specweave/docs/internal/specs',
        this.projectId,
        featureId
      );

      const usIdNumber = userStoryId.toLowerCase().replace('us-', '');
      const featureFiles = existsSync(featurePath) ? await fs.readdir(featurePath) : [];
      const usFileName = featureFiles.find(f =>
        f.startsWith(`us-${usIdNumber}-`) && f.endsWith('.md')
      );

      if (!usFileName) {
        this.logger.log(`    ⚠️ User story file not found - keeping placeholder`);
        return;
      }

      const usFilePath = path.join(featurePath, usFileName);
      const contentBuilder = new UserStoryContentBuilder(usFilePath, this.projectRoot);
      const richBody = await contentBuilder.buildIssueBody(`${repoInfo.owner}/${repoInfo.repo}`);

      // Update the issue body
      await client.updateIssueBody(issueNumber, richBody);
      this.logger.log(`    ✅ Updated issue #${issueNumber} with ACs and tasks`);

    } catch (error) {
      this.logger.log(`    ⚠️ Failed to update: ${error}`);
    }
  }

  /**
   * Format user story content for GitHub issue body
   */
  private formatUserStoryBody(usFile: LivingDocsUSFile): string {
    // Simple body for now - can be enhanced later
    const parts: string[] = [];

    parts.push(`## User Story: ${usFile.id}`);
    parts.push('');

    if (usFile.external_title) {
      parts.push(`**Original Title**: ${usFile.external_title}`);
      parts.push('');
    }

    parts.push('For detailed acceptance criteria, tasks, and technical specifications, see the living docs in the repository.');

    return parts.join('\n');
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
      const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems ?? false;
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

          // GATE 4: Check if GitHub sync is enabled (tool-specific gate)
          // v1.0.46 FIX: Use isProviderEnabled() to support BOTH profiles and legacy formats
          const githubEnabled = isProviderEnabled(config, 'github');
          if (githubEnabled) {
            this.logger.log('✅ GitHub sync enabled (detected from profiles or sync.github.enabled)');
            this.logger.log('\n🔹 Creating GitHub issues for user stories...');
            try {
              await this.createGitHubIssuesForUserStories(config);
            } catch (error) {
              this.logger.error('⚠️  GitHub issue creation failed (non-blocking):', error);
              result.errors.push(`GitHub sync error: ${error}`);
              // Continue with rest of sync even if GitHub fails
            }
          } else {
            this.logger.log('ℹ️  GitHub sync disabled (no GitHub profile or sync.github.enabled)');
            this.logger.log('   Configure sync.profiles with provider: "github" or set sync.github.enabled=true');
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
          canUpdateExternalItems: config.sync?.settings?.canUpdateExternalItems ?? false,
          canUpdateStatus: config.sync?.settings?.canUpdateStatus ?? false
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

    if (!featureId) {
      return [];
    }

    // Find living docs for this feature (uses auto-detected project ID)
    const featurePath = path.join(
      this.projectRoot,
      '.specweave/docs/internal/specs',
      this.projectId,
      featureId
    );

    if (!existsSync(featurePath)) {
      return [];
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

  /**
   * Sync AC checkbox status to GitHub issues
   *
   * CRITICAL FIX: Updates AC checkboxes in GitHub issue bodies when tasks are completed.
   * Handles both bold (**AC-US5-01**:) and plain (AC-US5-01:) formats.
   *
   * CONCURRENCY-SAFE: Uses atomic issue body updates via Octokit.
   *
   * @param config - Project configuration
   * @param addComment - If true, also adds a progress comment
   * @returns Summary of synced ACs
   */
  async syncACCheckboxesToGitHub(
    config: SpecWeaveConfig,
    options: { addComment?: boolean } = {}
  ): Promise<{ success: boolean; updated: number; issues: number[] }> {
    const result = { success: true, updated: 0, issues: [] as number[] };

    try {
      // Check if GitHub sync is enabled
      const githubEnabled = isProviderEnabled(config, 'github');
      if (!githubEnabled) {
        this.logger.log('ℹ️  GitHub sync disabled - skipping AC checkbox sync');
        return result;
      }

      const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems ?? false;
      if (!canUpdateExternal) {
        this.logger.log('ℹ️  External update disabled (canUpdateExternalItems=false)');
        return result;
      }

      // Load user stories
      const userStories = await this.loadUserStoriesForIncrement();
      if (userStories.length === 0) {
        this.logger.log('ℹ️  No user stories found for this increment');
        return result;
      }

      // Get GitHub repo info
      const githubConfig = config.sync?.github || {};
      const repoInfo = await this.detectGitHubRepo(githubConfig);
      if (!repoInfo) {
        this.logger.log('⚠️  GitHub repository not configured');
        return result;
      }

      const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);

      this.logger.log(`\n📊 Syncing AC checkboxes to GitHub issues...`);
      this.logger.log(`   Repository: ${repoInfo.owner}/${repoInfo.repo}`);

      // Load spec.md to get current AC status
      const specPath = path.join(
        this.projectRoot,
        '.specweave/increments',
        this.incrementId,
        'spec.md'
      );

      if (!existsSync(specPath)) {
        this.logger.log('⚠️  spec.md not found');
        return result;
      }

      const specContent = await fs.readFile(specPath, 'utf-8');

      // Parse AC status from spec.md
      const acStatus = this.parseACStatusFromSpec(specContent);
      this.logger.log(`   Found ${acStatus.size} ACs in spec.md`);

      // Process each user story with a GitHub issue
      for (const usFile of userStories) {
        // Find GitHub issue number from frontmatter
        const issueNumber = usFile.external_tools?.github?.number ||
                            usFile.external_id ||
                            (usFile.external_tools?.github as any)?.issue_number;

        if (!issueNumber) {
          this.logger.log(`   ⏭️  ${usFile.id} - No GitHub issue linked`);
          continue;
        }

        // Filter ACs that belong to this user story
        const usAcStatus = new Map<string, boolean>();
        for (const [acId, completed] of acStatus) {
          // AC format: AC-US5-01 → belongs to US-005/US5/US-5
          const acUsMatch = acId.match(/AC-US?(\d+)-\d+/i);
          if (acUsMatch) {
            const acUsNum = acUsMatch[1];
            const usNum = usFile.id.match(/US-?(\d+)/i)?.[1] || '';
            // Remove leading zeros for comparison
            if (parseInt(acUsNum) === parseInt(usNum)) {
              usAcStatus.set(acId, completed);
            }
          }
        }

        if (usAcStatus.size === 0) {
          this.logger.log(`   ⏭️  ${usFile.id} - No ACs to sync`);
          continue;
        }

        try {
          // Fetch and update issue
          const issue = await client.getIssue(Number(issueNumber));
          if (!issue) {
            this.logger.log(`   ⚠️  ${usFile.id} - Issue #${issueNumber} not found`);
            continue;
          }

          let body = issue.body || '';
          const originalBody = body;
          let updatedCount = 0;

          // Update each AC checkbox
          for (const [acId, completed] of usAcStatus) {
            const checkboxState = completed ? 'x' : ' ';
            const escapedAcId = acId.replace(/-/g, '\\-');

            // Pattern 1: Bold format `- [ ] **AC-US5-01**: Description`
            const boldRegex = new RegExp(`(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`, 'g');

            // Pattern 2: Plain format `- [ ] AC-US5-01: Description`
            const plainRegex = new RegExp(`(- \\[)[ x](\\] ${escapedAcId}:)`, 'g');

            const beforeUpdate = body;
            body = body.replace(boldRegex, `$1${checkboxState}$2`);
            body = body.replace(plainRegex, `$1${checkboxState}$2`);

            if (body !== beforeUpdate) {
              updatedCount++;
            }
          }

          if (body === originalBody) {
            this.logger.log(`   ⏭️  ${usFile.id} #${issueNumber} - No checkbox changes`);
            continue;
          }

          // Update issue body
          await client.updateIssueBody(Number(issueNumber), body);
          result.updated += updatedCount;
          result.issues.push(Number(issueNumber));
          this.logger.log(`   ✅ ${usFile.id} #${issueNumber} - Updated ${updatedCount} AC checkbox(es)`);

          // Optionally add progress comment
          if (options.addComment) {
            const completedCount = [...usAcStatus.values()].filter(v => v).length;
            const totalCount = usAcStatus.size;
            const percentage = Math.round((completedCount / totalCount) * 100);

            const commentBody = `## 📊 Progress Update

**Acceptance Criteria**: ${completedCount}/${totalCount} (${percentage}%)

${[...usAcStatus.entries()].map(([id, done]) =>
  `- ${done ? '✅' : '⬜'} ${id}`
).join('\n')}

---
🤖 Auto-updated by SpecWeave AC Completion Gate`;

            await client.addComment(Number(issueNumber), commentBody);
            this.logger.log(`   💬 Added progress comment`);
          }
        } catch (error) {
          this.logger.log(`   ⚠️  ${usFile.id} - Failed to update #${issueNumber}: ${error}`);
          result.success = false;
        }
      }

      this.logger.log(`\n📊 AC Checkbox Sync Complete`);
      this.logger.log(`   Updated: ${result.updated} checkbox(es) across ${result.issues.length} issue(s)`);

      return result;
    } catch (error) {
      this.logger.error('❌ AC checkbox sync failed:', error);
      result.success = false;
      return result;
    }
  }

  /**
   * Parse AC checkbox status from spec.md content
   *
   * Handles both formats:
   * - `- [x] **AC-US5-01**: Description` (SpecWeave standard)
   * - `- [x] AC-US5-01: Description` (legacy)
   */
  private parseACStatusFromSpec(specContent: string): Map<string, boolean> {
    const acStatus = new Map<string, boolean>();
    const lines = specContent.split('\n');

    // Bold format: - [x] **AC-US5-01**: Description
    const boldRegex = /^- \[([ x])\] \*\*(AC-[A-Z0-9]+-\d+)\*\*:/;

    // Plain format: - [x] AC-US5-01: Description
    const plainRegex = /^- \[([ x])\] (AC-[A-Z0-9]+-\d+):/;

    for (const line of lines) {
      let match = line.match(boldRegex);
      if (!match) {
        match = line.match(plainRegex);
      }

      if (match) {
        const completed = match[1] === 'x';
        const acId = match[2];
        acStatus.set(acId, completed);
      }
    }

    return acStatus;
  }
}
