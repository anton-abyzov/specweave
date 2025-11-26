/**
 * Import Coordinator
 *
 * Orchestrates multi-platform imports from GitHub, JIRA, and Azure DevOps.
 * Handles parallel execution, progress tracking, and result aggregation.
 */

import type { Importer, ExternalItem, ImportConfig, ImportResult } from './external-importer.js';
import { GitHubImporter } from './github-importer.js';
import { JiraImporter } from './jira-importer.js';
import { ADOImporter } from './ado-importer.js';
import { updateSyncMetadata, type PlatformSyncMetadata } from '../sync/sync-metadata.js';
import { RateLimiter, type RateLimitInfo } from './rate-limiter.js';
import { getGitHubAuthFromProject } from '../utils/auth-helpers.js';

/**
 * Repository configuration for multi-repo imports
 */
export interface RepoConfig {
  owner: string;
  repo: string;
}

/**
 * Enhanced progress info for tracking large imports
 */
export interface ProgressInfo {
  platform: string;
  current: number;
  total?: number;
  percentage?: number;
  rate?: number;  // items per second
  eta?: number;   // seconds remaining
  sourceRepo?: string;
}

export interface CoordinatorConfig {
  /** Import from GitHub (single repo - backwards compatible) */
  github?: {
    owner: string;
    repo: string;
    token?: string;
  };

  /** Import from multiple GitHub repositories (multi-repo support) */
  githubRepositories?: RepoConfig[];

  /** GitHub token (used when githubRepositories is set) */
  githubToken?: string;

  /** Import from JIRA */
  jira?: {
    host: string;
    email?: string;
    apiToken?: string;
    /** Organization mode (auto-detected or user-chosen) */
    mode?: 'simple' | 'by-project' | 'by-board' | 'hybrid';
    /** Project → Board mappings for 2-level folder structure */
    projectMappings?: Array<{
      projectKey: string;
      boardMappings: Array<{
        boardName: string;
        specweaveFolder: string;
      }>;
    }>;
  };

  /** Import from Azure DevOps */
  ado?: {
    orgUrl: string;
    project: string;
    pat?: string;
    /** Organization mode (auto-detected or user-chosen) */
    mode?: 'simple' | 'by-project' | 'by-area';
    /** Project → Area Path mappings for 2-level folder structure */
    projectMappings?: Array<{
      projectName: string;
      areaMappings: Array<{
        areaPath: string;
        specweaveFolder: string;
      }>;
    }>;
  };

  /** Common import configuration */
  importConfig?: ImportConfig;

  /** Run imports in parallel (default: true) */
  parallel?: boolean;

  /** Progress callback (legacy - count only) */
  onProgress?: (platform: string, count: number, total?: number) => void;

  /** Enhanced progress callback with percentage and ETA */
  onProgressEnhanced?: (info: ProgressInfo) => void;

  /** Project root for sync metadata (default: process.cwd()) */
  projectRoot?: string;

  /** Enable sync metadata tracking (default: true) */
  enableSyncMetadata?: boolean;

  /** Enable rate limiting (default: true) */
  enableRateLimiting?: boolean;

  /** Callback when rate limit warning */
  onRateLimitWarning?: (platform: string, rateLimitInfo: RateLimitInfo) => void;

  /** Callback when rate limit pause */
  onRateLimitPause?: (platform: string, seconds: number) => void;
}

export interface CoordinatorResult {
  /** Combined results from all platforms */
  results: ImportResult[];

  /** Total items imported across all platforms */
  totalCount: number;

  /** All imported items */
  allItems: ExternalItem[];

  /** Errors by platform */
  errors: Record<string, string[]>;

  /** Platforms that were imported from */
  platforms: Array<'github' | 'jira' | 'ado'>;

  /** Total items skipped as duplicates (if duplicate detection enabled) */
  totalSkipped?: number;
}

/**
 * Import Coordinator
 */
export class ImportCoordinator {
  private importers: Map<string, Importer> = new Map();
  /** Multi-repo importers keyed by "github:owner/repo" */
  private githubRepoImporters: Map<string, GitHubImporter> = new Map();
  private config: CoordinatorConfig;
  private rateLimiter: RateLimiter | null = null;
  private projectRoot: string;
  private importStartTime: number = 0;

  constructor(config: CoordinatorConfig) {
    this.config = {
      enableSyncMetadata: true,
      enableRateLimiting: true,
      projectRoot: process.cwd(),
      ...config,
    };
    this.projectRoot = this.config.projectRoot!;

    // Initialize rate limiter if enabled
    if (this.config.enableRateLimiting) {
      this.rateLimiter = new RateLimiter();
    }

    this.initializeImporters();
  }

  /**
   * Initialize importers based on configuration
   */
  private initializeImporters(): void {
    // Multi-repo GitHub support (preferred over single repo)
    if (this.config.githubRepositories && this.config.githubRepositories.length > 0) {
      // CRITICAL FIX (2025-11-26): Use getGitHubAuthFromProject to load from .env file
      // Bug: process.env.GITHUB_TOKEN is empty unless dotenv is explicitly loaded
      const auth = getGitHubAuthFromProject(this.projectRoot);
      const token = this.config.githubToken || this.config.github?.token || auth.token;

      for (const repo of this.config.githubRepositories) {
        try {
          const importer = new GitHubImporter(repo.owner, repo.repo, token);
          const key = `github:${repo.owner}/${repo.repo}`;
          this.githubRepoImporters.set(key, importer);
        } catch (error: any) {
          console.warn(`Failed to initialize GitHub importer for ${repo.owner}/${repo.repo}: ${error.message}`);
        }
      }

      // If we have multi-repo, don't create single repo importer
      if (this.githubRepoImporters.size > 0) {
        // Mark that we have GitHub configured (for platform detection)
        // We'll handle multi-repo in importAll()
      }
    } else if (this.config.github) {
      // Single repo GitHub importer (backwards compatible)
      try {
        const importer = new GitHubImporter(
          this.config.github.owner,
          this.config.github.repo,
          this.config.github.token
        );
        this.importers.set('github', importer);
      } catch (error: any) {
        console.warn(`Failed to initialize GitHub importer: ${error.message}`);
      }
    }

    // JIRA importer
    if (this.config.jira) {
      try {
        const importer = new JiraImporter(
          this.config.jira.host,
          this.config.jira.email,
          this.config.jira.apiToken
        );
        this.importers.set('jira', importer);
      } catch (error: any) {
        console.warn(`Failed to initialize JIRA importer: ${error.message}`);
      }
    }

    // Azure DevOps importer
    if (this.config.ado) {
      try {
        const importer = new ADOImporter(
          this.config.ado.orgUrl,
          this.config.ado.project,
          this.config.ado.pat
        );
        this.importers.set('ado', importer);
      } catch (error: any) {
        console.warn(`Failed to initialize ADO importer: ${error.message}`);
      }
    }

    if (this.importers.size === 0 && this.githubRepoImporters.size === 0) {
      throw new Error('No importers configured. Provide at least one platform configuration.');
    }
  }

  /**
   * Import from all configured platforms
   */
  async importAll(): Promise<CoordinatorResult> {
    this.importStartTime = Date.now();
    const parallel = this.config.parallel !== false; // Default to true

    if (parallel) {
      return this.importParallel();
    } else {
      return this.importSequential();
    }
  }

  /**
   * Import from platforms in parallel
   */
  private async importParallel(): Promise<CoordinatorResult> {
    const promises: Array<Promise<ImportResult>> = [];

    // Add standard platform importers
    for (const [platform, importer] of this.importers.entries()) {
      promises.push(this.importFromPlatform(platform, importer));
    }

    // Add multi-repo GitHub importers
    for (const [key, importer] of this.githubRepoImporters.entries()) {
      const sourceRepo = key.replace('github:', '');
      promises.push(this.importFromGitHubRepo(importer, sourceRepo));
    }

    const results = await Promise.allSettled(promises);

    return this.aggregateResults(results);
  }

  /**
   * Import from platforms sequentially
   */
  private async importSequential(): Promise<CoordinatorResult> {
    const results: Array<PromiseSettledResult<ImportResult>> = [];

    // Standard platform importers
    for (const [platform, importer] of this.importers.entries()) {
      try {
        const result = await this.importFromPlatform(platform, importer);
        results.push({ status: 'fulfilled', value: result });
      } catch (error: any) {
        results.push({
          status: 'rejected',
          reason: error,
        });
      }
    }

    // Multi-repo GitHub importers (sequentially to avoid rate limits)
    for (const [key, importer] of this.githubRepoImporters.entries()) {
      const sourceRepo = key.replace('github:', '');
      try {
        const result = await this.importFromGitHubRepo(importer, sourceRepo);
        results.push({ status: 'fulfilled', value: result });
      } catch (error: any) {
        results.push({
          status: 'rejected',
          reason: error,
        });
      }
    }

    return this.aggregateResults(results);
  }

  /**
   * Import from a single GitHub repo with source tagging
   */
  private async importFromGitHubRepo(importer: GitHubImporter, sourceRepo: string): Promise<ImportResult> {
    const errors: string[] = [];
    const items: ExternalItem[] = [];
    let totalEstimate: number | undefined;

    try {
      // Use pagination for progress tracking
      for await (const page of importer.paginate(this.config.importConfig)) {
        // Tag each item with source repo
        for (const item of page) {
          item.sourceRepo = sourceRepo;
        }
        items.push(...page);

        // Calculate progress info
        const elapsed = (Date.now() - this.importStartTime) / 1000;
        const rate = elapsed > 0 ? items.length / elapsed : 0;
        const eta = totalEstimate && rate > 0 ? (totalEstimate - items.length) / rate : undefined;

        // Report enhanced progress
        if (this.config.onProgressEnhanced) {
          this.config.onProgressEnhanced({
            platform: 'github',
            current: items.length,
            total: totalEstimate,
            percentage: totalEstimate ? Math.round((items.length / totalEstimate) * 100) : undefined,
            rate: Math.round(rate * 10) / 10,
            eta: eta ? Math.round(eta) : undefined,
            sourceRepo,
          });
        }

        // Legacy progress callback
        if (this.config.onProgress) {
          this.config.onProgress(`github (${sourceRepo})`, items.length, totalEstimate);
        }
      }

      // Update sync metadata if enabled
      if (this.config.enableSyncMetadata && items.length > 0) {
        const metadata: PlatformSyncMetadata = {
          lastImport: new Date().toISOString(),
          lastImportCount: items.length,
          lastSyncResult: errors.length > 0 ? 'partial' : 'success',
        };

        try {
          updateSyncMetadata(this.projectRoot, 'github', metadata);
        } catch (error: any) {
          errors.push(`Failed to update sync metadata: ${error.message}`);
        }
      }
    } catch (error: any) {
      errors.push(error.message || String(error));

      if (this.config.enableSyncMetadata) {
        const metadata: PlatformSyncMetadata = {
          lastImport: new Date().toISOString(),
          lastImportCount: 0,
          lastSyncResult: 'failed',
        };

        try {
          updateSyncMetadata(this.projectRoot, 'github', metadata);
        } catch {
          // Ignore
        }
      }
    }

    return {
      count: items.length,
      items,
      errors,
      platform: 'github',
      totalEstimate,
      sourceRepo,
    };
  }

  /**
   * Import from a single platform with progress tracking
   */
  private async importFromPlatform(platform: string, importer: Importer): Promise<ImportResult> {
    const errors: string[] = [];
    const items: ExternalItem[] = [];

    try {
      // Use pagination for progress tracking
      for await (const page of importer.paginate(this.config.importConfig)) {
        items.push(...page);

        // Report progress
        if (this.config.onProgress) {
          this.config.onProgress(platform, items.length);
        }
      }

      // Update sync metadata if enabled
      if (this.config.enableSyncMetadata && items.length > 0) {
        const metadata: PlatformSyncMetadata = {
          lastImport: new Date().toISOString(),
          lastImportCount: items.length,
          lastSyncResult: errors.length > 0 ? 'partial' : 'success',
        };

        try {
          updateSyncMetadata(this.projectRoot, platform as 'github' | 'jira' | 'ado', metadata);
        } catch (error: any) {
          // Log metadata update error but don't fail the import
          errors.push(`Failed to update sync metadata: ${error.message}`);
        }
      }
    } catch (error: any) {
      errors.push(error.message || String(error));

      // Update sync metadata with failed status
      if (this.config.enableSyncMetadata) {
        const metadata: PlatformSyncMetadata = {
          lastImport: new Date().toISOString(),
          lastImportCount: 0,
          lastSyncResult: 'failed',
        };

        try {
          updateSyncMetadata(this.projectRoot, platform as 'github' | 'jira' | 'ado', metadata);
        } catch {
          // Ignore metadata update errors on failed imports
        }
      }
    }

    return {
      count: items.length,
      items,
      errors,
      platform: importer.platform,
    };
  }

  /**
   * Aggregate results from all platforms
   */
  private aggregateResults(
    results: Array<PromiseSettledResult<ImportResult>>
  ): CoordinatorResult {
    const allResults: ImportResult[] = [];
    const allItems: ExternalItem[] = [];
    const errors: Record<string, string[]> = {};
    const platforms: Array<'github' | 'jira' | 'ado'> = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const importResult = result.value;
        allResults.push(importResult);
        allItems.push(...importResult.items);
        platforms.push(importResult.platform);

        if (importResult.errors.length > 0) {
          errors[importResult.platform] = importResult.errors;
        }
      } else {
        // Rejected promise
        const error = result.reason;
        const errorMsg = error?.message || String(error);

        // Try to determine which platform failed
        const platformMatch = errorMsg.match(/(GitHub|JIRA|ADO)/i);
        const platform = platformMatch ? platformMatch[1].toLowerCase() : 'unknown';

        errors[platform] = errors[platform] || [];
        errors[platform].push(errorMsg);
      }
    }

    return {
      results: allResults,
      totalCount: allItems.length,
      allItems,
      errors,
      platforms,
    };
  }

  /**
   * Import from a specific platform only
   */
  async importFrom(platform: 'github' | 'jira' | 'ado'): Promise<ImportResult> {
    // Handle multi-repo GitHub case
    if (platform === 'github' && this.githubRepoImporters.size > 0) {
      const results: ImportResult[] = [];

      for (const [key, importer] of this.githubRepoImporters.entries()) {
        const sourceRepo = key.replace('github:', '');
        const result = await this.importFromGitHubRepo(importer, sourceRepo);
        results.push(result);
      }

      // Aggregate all results into single ImportResult
      return {
        count: results.reduce((sum, r) => sum + r.count, 0),
        items: results.flatMap(r => r.items),
        errors: results.flatMap(r => r.errors),
        platform: 'github',
      };
    }

    // Single-repo fallback
    const importer = this.importers.get(platform);

    if (!importer) {
      throw new Error(`${platform} importer not configured`);
    }

    return this.importFromPlatform(platform, importer);
  }

  /**
   * Get list of configured platforms
   */
  getConfiguredPlatforms(): Array<'github' | 'jira' | 'ado'> {
    const platforms = Array.from(this.importers.keys()) as Array<'github' | 'jira' | 'ado'>;

    // Add 'github' if multi-repo importers are configured
    if (this.githubRepoImporters.size > 0 && !platforms.includes('github')) {
      platforms.push('github');
    }

    return platforms;
  }

  /**
   * Check if a platform is configured
   */
  isPlatformConfigured(platform: 'github' | 'jira' | 'ado'): boolean {
    if (platform === 'github') {
      return this.importers.has(platform) || this.githubRepoImporters.size > 0;
    }
    return this.importers.has(platform);
  }

  /**
   * Get list of configured GitHub repositories (for multi-repo support)
   */
  getConfiguredGitHubRepos(): string[] {
    return Array.from(this.githubRepoImporters.keys()).map(key => key.replace('github:', ''));
  }
}
