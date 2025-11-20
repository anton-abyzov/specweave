/**
 * Sync Coordinator (T-034E)
 *
 * High-level coordinator that integrates FormatPreservationSyncService
 * with living docs sync workflow. Called by post-task-completion hook.
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { LivingDocsUSFile, getOrigin } from '../types/living-docs-us-file.js';
import { FormatPreservationSyncService, CompletionCommentData } from './format-preservation-sync.js';
import { GitHubClientV2 } from '../../plugins/specweave-github/lib/github-client-v2.js';
import { Logger, consoleLogger } from '../utils/logger.js';

export interface SyncCoordinatorOptions {
  projectRoot: string;
  incrementId: string;
  logger?: Logger;
}

export interface SyncResult {
  success: boolean;
  userStoriesSynced: number;
  syncMode: 'comment-only' | 'full-sync' | 'read-only' | 'manual-only';
  errors: string[];
}

export class SyncCoordinator {
  private projectRoot: string;
  private incrementId: string;
  private logger: Logger;

  constructor(options: SyncCoordinatorOptions) {
    this.projectRoot = options.projectRoot;
    this.incrementId = options.incrementId;
    this.logger = options.logger ?? consoleLogger;
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

      // 2. Check if sync is enabled (GATE 2: canUpdateExternalItems)
      if (!config.sync?.settings?.canUpdateExternalItems) {
        this.logger.log('ℹ️  External sync disabled (canUpdateExternalItems=false)');
        result.syncMode = 'read-only';
        result.success = true;
        return result;
      }

      // GATE 3: Check if automatic sync is enabled
      // DEFAULT: true (automatic sync enabled for better UX)
      const autoSync = config.sync?.settings?.autoSyncOnCompletion ?? true;
      if (!autoSync) {
        this.logger.log('⚠️  Automatic sync disabled (autoSyncOnCompletion=false)');
        this.logger.log('   Living docs updated locally, but external tools require manual sync');
        this.logger.log('   Run /specweave-github:sync or /specweave-jira:sync to sync manually');
        result.syncMode = 'manual-only';
        result.success = true;
        return result;
      }

      this.logger.log('✅ Automatic sync enabled (autoSyncOnCompletion=true)');

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

    if (await fs.pathExists(tasksFile)) {
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

    if (await fs.pathExists(specFile)) {
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

    if (!await fs.pathExists(specFile)) {
      return [];
    }

    const content = await fs.readFile(specFile, 'utf-8');

    // Parse frontmatter to get feature ID
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return [];
    }

    const frontmatter = yaml.parse(frontmatterMatch[1]);
    const featureId = frontmatter.epic || frontmatter.feature;

    if (!featureId) {
      return [];
    }

    // Find living docs for this feature
    const featurePath = path.join(
      this.projectRoot,
      '.specweave/docs/internal/specs/specweave',
      featureId
    );

    if (!await fs.pathExists(featurePath)) {
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

    if (!await fs.pathExists(configPath)) {
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
