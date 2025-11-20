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

export interface CoordinatorConfig {
  /** Import from GitHub */
  github?: {
    owner: string;
    repo: string;
    token?: string;
  };

  /** Import from JIRA */
  jira?: {
    host: string;
    email?: string;
    apiToken?: string;
  };

  /** Import from Azure DevOps */
  ado?: {
    orgUrl: string;
    project: string;
    pat?: string;
  };

  /** Common import configuration */
  importConfig?: ImportConfig;

  /** Run imports in parallel (default: true) */
  parallel?: boolean;

  /** Progress callback */
  onProgress?: (platform: string, count: number, total?: number) => void;

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
  private config: CoordinatorConfig;
  private rateLimiter: RateLimiter | null = null;
  private projectRoot: string;

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
    // GitHub importer
    if (this.config.github) {
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

    if (this.importers.size === 0) {
      throw new Error('No importers configured. Provide at least one platform configuration.');
    }
  }

  /**
   * Import from all configured platforms
   */
  async importAll(): Promise<CoordinatorResult> {
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
    const promises = Array.from(this.importers.entries()).map(([platform, importer]) =>
      this.importFromPlatform(platform, importer)
    );

    const results = await Promise.allSettled(promises);

    return this.aggregateResults(results);
  }

  /**
   * Import from platforms sequentially
   */
  private async importSequential(): Promise<CoordinatorResult> {
    const results: Array<PromiseSettledResult<ImportResult>> = [];

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

    return this.aggregateResults(results);
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
    return Array.from(this.importers.keys()) as Array<'github' | 'jira' | 'ado'>;
  }

  /**
   * Check if a platform is configured
   */
  isPlatformConfigured(platform: 'github' | 'jira' | 'ado'): boolean {
    return this.importers.has(platform);
  }
}
