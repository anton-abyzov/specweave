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

export interface SyncCoordinatorOptions {
  projectRoot: string;
  incrementId: string;
  logger?: Logger;
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

  constructor(options: SyncCoordinatorOptions) {
    this.projectRoot = options.projectRoot;
    this.incrementId = options.incrementId;
    this.logger = options.logger ?? consoleLogger;
    this.frontmatterUpdater = new FrontmatterUpdater({ logger: this.logger });
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
  async createGitHubIssuesForUserStories(config: any): Promise<GitHubIssue[]> {
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
        this.logger.log('⚠️  No feature ID found in increment spec - skipping GitHub sync');
        return createdIssues;
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

      // Create issue for each user story (with idempotency)
      for (const usFile of userStories) {
        try {
          // LAYER 1: Check user story frontmatter for existing GitHub issue
          const cachedIssue = await this.frontmatterUpdater.getGitHubIssueFromFrontmatter(
            this.projectRoot,
            featureId,
            usFile.id
          );

          if (cachedIssue) {
            this.logger.log(`  ⏭️  ${usFile.id} - Issue #${cachedIssue.number} already exists (cached in frontmatter)`);
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
            const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf-8'));
            const githubIssues = metadata.github?.issues || [];
            const found = githubIssues.find((i: any) => i.userStory === usFile.id);
            if (found) {
              this.logger.log(`  ⏭️  ${usFile.id} - Issue #${found.number} already exists (cached in metadata)`);
              existingIssue = found.number;
              // TODO: Backfill Layer 1 (update user story frontmatter)
              continue;
            }
          }

          // LAYER 3: Query GitHub API to check for existing issue
          const searchTitle = `[${featureId}][${usFile.id}]`;
          const existingOnGitHub = await client.searchIssueByTitle(searchTitle);

          if (existingOnGitHub) {
            this.logger.log(`  ⏭️  ${usFile.id} - Issue #${existingOnGitHub.number} already exists on GitHub`);

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
                (i: any) => i.userStory === usFile.id
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

          // All 3 layers miss - create new issue
          this.logger.log(`  📝 Creating GitHub issue for ${usFile.id}...`);

          // Format issue body
          const issueBody = this.formatUserStoryBody(usFile);

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

    parts.push('This issue was auto-created by SpecWeave.');
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push('🤖 **Auto-synced from SpecWeave**');
    parts.push('');
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
          const githubEnabled = config.sync?.github?.enabled ?? false;
          if (githubEnabled) {
            this.logger.log('✅ GitHub sync enabled (sync.github.enabled=true)');
            this.logger.log('\n🔹 Creating GitHub issues for user stories...');
            try {
              await this.createGitHubIssuesForUserStories(config);
            } catch (error) {
              this.logger.error('⚠️  GitHub issue creation failed (non-blocking):', error);
              result.errors.push(`GitHub sync error: ${error}`);
              // Continue with rest of sync even if GitHub fails
            }
          } else {
            this.logger.log('ℹ️  GitHub sync disabled (sync.github.enabled=false)');
            this.logger.log('   Set sync.github.enabled=true to enable automatic GitHub issue creation');
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
    config: any
  ): Promise<void> {
    const origin = getOrigin(usFile);
    this.logger.log(`\n  📝 ${usFile.id} (${origin})`);

    // Load completion data
    const completionData = await this.loadCompletionData(usFile);

    // Determine external tool and create client
    const externalSource = usFile.external_source || 'github'; // Default to GitHub

    // GATE 4: Check if the specific tool is enabled
    if (externalSource === 'github') {
      const githubEnabled = config.sync?.github?.enabled ?? false;
      if (!githubEnabled) {
        this.logger.log('  ⏭️  GitHub sync SKIPPED (sync.github.enabled = false)');
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
      const jiraEnabled = config.sync?.jira?.enabled ?? false;
      if (!jiraEnabled) {
        this.logger.log('  ⏭️  JIRA sync SKIPPED (sync.jira.enabled = false)');
        return;
      }

      // TODO: Implement JIRA sync
      this.logger.log('  ⚠️  JIRA sync not yet fully implemented');
      this.logger.log('  💡 Use /specweave-jira:sync for manual JIRA sync');
    } else if (externalSource === 'ado' || externalSource === 'azure-devops') {
      const adoEnabled = config.sync?.ado?.enabled ?? false;
      if (!adoEnabled) {
        this.logger.log('  ⏭️  Azure DevOps sync SKIPPED (sync.ado.enabled = false)');
        return;
      }

      // TODO: Implement ADO sync
      this.logger.log('  ⚠️  Azure DevOps sync not yet fully implemented');
      this.logger.log('  💡 Use /specweave-ado:sync for manual ADO sync');
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
      livingDocsUrl: `${this.projectRoot}/.specweave/docs/internal/specs/specweave/${usFile.id}/`
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
    const featureId = frontmatter.feature_id || frontmatter.epic || frontmatter.feature;

    if (!featureId) {
      return [];
    }

    // Find living docs for this feature
    const featurePath = path.join(
      this.projectRoot,
      '.specweave/docs/internal/specs/specweave',
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
            origin: fm.origin
          });
        }
      }
    }

    return usFiles;
  }

  /**
   * Load config
   */
  private async loadConfig(): Promise<any> {
    const configPath = path.join(this.projectRoot, '.specweave/config.json');

    if (!existsSync(configPath)) {
      return {};
    }

    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Detect GitHub repository from config or git
   */
  private async detectGitHubRepo(githubConfig: any): Promise<{ owner: string; repo: string } | null> {
    // Check config first
    if (githubConfig.owner && githubConfig.repo) {
      return { owner: githubConfig.owner, repo: githubConfig.repo };
    }

    // Try to detect from git remote
    try {
      const { execSync } = await import('child_process');
      const remote = execSync('git remote get-url origin', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      }).trim();

      // Parse GitHub URL: git@github.com:owner/repo.git or https://github.com/owner/repo.git
      const match = remote.match(/github\.com[:/]([^/]+)\/([^.]+)/);
      if (match) {
        return { owner: match[1], repo: match[2].replace('.git', '') };
      }
    } catch {
      // Ignore git errors
    }

    return null;
  }
}
