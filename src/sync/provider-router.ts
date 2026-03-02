/**
 * Provider Router Service
 *
 * Routes sync operations to the correct external provider (GitHub, JIRA, ADO).
 * Extracted from sync-coordinator.ts for better separation of concerns.
 *
 * @module sync/provider-router
 * @since v1.0.115
 */

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { Logger, consoleLogger } from '../utils/logger.js';
import { StatusMapper, SyncProvider, isProviderEnabled } from './status-mapper.js';
import type { SpecWeaveConfig } from '../core/config/types.js';

/**
 * GitHub repository configuration
 */
export interface GitHubRepoConfig {
  enabled?: boolean;
  owner?: string;
  repo?: string;
}

/**
 * Repository information
 */
export interface RepoInfo {
  owner: string;
  repo: string;
}

/**
 * Provider router options
 */
export interface ProviderRouterOptions {
  projectRoot: string;
  logger?: Logger;
}

/**
 * Provider Router - Routes sync operations to the correct external provider
 */
export class ProviderRouter {
  private projectRoot: string;
  private logger: Logger;

  constructor(options: ProviderRouterOptions) {
    this.projectRoot = options.projectRoot;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Detect GitHub repository from config or git remote
   *
   * @param githubConfig - Optional GitHub config from config.json
   * @returns Repository info or null if not detected
   */
  async detectGitHubRepo(githubConfig: GitHubRepoConfig = {}): Promise<RepoInfo | null> {
    // Check config first
    if (githubConfig.owner && githubConfig.repo) {
      return { owner: githubConfig.owner, repo: githubConfig.repo };
    }

    // Try to detect from git remote
    try {
      const { execSync } = await import('child_process');
      const remote = execSync('git remote get-url origin', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe'
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

  /**
   * Get the external provider for a user story
   *
   * Determines which external provider to use based on the user story's
   * external_source field.
   *
   * @param externalSource - The external source from user story (github, jira, ado, azure-devops)
   * @returns Normalized provider name
   */
  normalizeProvider(externalSource: string | undefined): SyncProvider | null {
    if (!externalSource) {
      return 'github'; // Default to GitHub
    }

    const source = externalSource.toLowerCase();

    if (source === 'github') {
      return 'github';
    }

    if (source === 'jira') {
      return 'jira';
    }

    if (source === 'ado' || source === 'azure-devops' || source === 'azuredevops') {
      return 'ado';
    }

    return null;
  }

  /**
   * Check which providers are available for sync
   *
   * @param config - Project configuration
   * @returns Object with provider availability
   */
  getAvailableProviders(config: SpecWeaveConfig): Record<SyncProvider, boolean> {
    return {
      github: isProviderEnabled(config, 'github'),
      jira: isProviderEnabled(config, 'jira'),
      ado: isProviderEnabled(config, 'ado')
    };
  }

  /**
   * Load project configuration
   *
   * @returns Project configuration or empty object
   */
  async loadConfig(): Promise<SpecWeaveConfig> {
    const configPath = path.join(this.projectRoot, '.specweave/config.json');

    if (!existsSync(configPath)) {
      return {} as SpecWeaveConfig;
    }

    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as SpecWeaveConfig;
  }

  /**
   * Get status mapper instance for the current config
   *
   * @param config - Project configuration
   * @returns StatusMapper instance
   */
  getStatusMapper(config: SpecWeaveConfig): StatusMapper {
    return new StatusMapper(config);
  }

  /**
   * Log provider availability for debugging
   *
   * @param config - Project configuration
   */
  logProviderStatus(config: SpecWeaveConfig): void {
    const providers = this.getAvailableProviders(config);
    const statusMapper = this.getStatusMapper(config);

    this.logger.log('📊 Provider Status:');

    if (providers.github) {
      this.logger.log('  ✅ GitHub: enabled');
    } else {
      this.logger.log('  ⬜ GitHub: disabled');
    }

    if (providers.jira) {
      this.logger.log(`  ✅ JIRA: enabled (completion status: ${statusMapper.getJiraCompletedStatus()})`);
    } else {
      this.logger.log('  ⬜ JIRA: disabled');
    }

    if (providers.ado) {
      this.logger.log(`  ✅ ADO: enabled (completion state: ${statusMapper.getAdoCompletedState()})`);
    } else {
      this.logger.log('  ⬜ ADO: disabled');
    }

    this.logger.log('');
    this.logger.log('📋 Sync Settings:');
    this.logger.log(`  canUpdateExternalItems: ${statusMapper.canUpdateExternal()}`);
    this.logger.log(`  canUpdateStatus: ${statusMapper.canUpdateStatus()}`);
    this.logger.log(`  autoSyncOnCompletion: ${statusMapper.isAutoSyncEnabled()}`);
    this.logger.log(`  canUpsertInternalItems: ${statusMapper.canUpsertInternal()}`);
  }
}
