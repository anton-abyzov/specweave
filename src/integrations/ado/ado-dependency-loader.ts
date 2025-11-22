/**
 * AdoDependencyLoader - Three-Tier Dependency Loading for Azure DevOps
 *
 * Architecture (ADR-0056):
 * - Tier 1 (Init): Metadata only (< 5 seconds, 1 API call)
 * - Tier 2 (On-Demand): Lazy loading per project (2-5 seconds, 3-4 API calls)
 * - Tier 3 (Bulk): Optional pre-load command (1-2 minutes for 50 projects)
 *
 * Features:
 * - 24-hour TTL caching via CacheManager
 * - Rate limit detection (ADO: 200 req/hour, stricter than JIRA)
 * - Per-project dependency caching
 * - Automatic cache invalidation on 404 errors
 *
 * @module integrations/ado/ado-dependency-loader
 */

import { CacheManager } from '../../core/cache/cache-manager.js';
import { RateLimitChecker } from '../../core/cache/rate-limit-checker.js';
import { AdoClient } from './ado-client.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { ProgressTracker } from '../../core/progress/progress-tracker.js';
import { CancelationHandler } from '../../core/progress/cancelation-handler.js';

/**
 * Project metadata (Tier 1)
 */
export interface AdoProjectMetadata {
  id: string;
  name: string;
  description?: string;
  visibility: string; // 'private' or 'public'
  state: string; // 'wellFormed', 'creating', 'deleting'
}

/**
 * Project dependencies (Tier 2)
 */
export interface AdoProjectDependencies {
  projectId: string;
  projectName: string;
  areaPaths: Array<{
    id: number;
    name: string;
    path: string;
    hasChildren?: boolean;
    children?: any[];
  }>;
  teams: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  lastUpdated: string;
}

/**
 * AdoDependencyLoader - Three-tier dependency loading with smart caching
 */
export class AdoDependencyLoader {
  private cacheManager: CacheManager;
  private rateLimitChecker: RateLimitChecker;
  private adoClient: AdoClient;
  private logger: Logger;

  constructor(options: {
    adoClient: AdoClient;
    cacheManager: CacheManager;
    rateLimitChecker?: RateLimitChecker;
    logger?: Logger;
  }) {
    this.adoClient = options.adoClient;
    this.cacheManager = options.cacheManager;
    this.rateLimitChecker = options.rateLimitChecker ?? new RateLimitChecker({ threshold: 20 }); // ADO stricter limit
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Tier 1: Load project metadata only (init)
   *
   * Performance: < 5 seconds for 50 projects (1 API call)
   * Cache: 24-hour TTL in `ado-projects.json`
   *
   * @param maxProjects Maximum projects to load (default: 50)
   * @returns Array of project metadata
   */
  async loadProjectMetadata(maxProjects: number = 50): Promise<AdoProjectMetadata[]> {
    const cacheKey = 'ado-projects';

    // Check cache first
    const cached = await this.cacheManager.get<{ projects: AdoProjectMetadata[] }>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit: ${cacheKey} (${cached.projects.length} projects)`);
      return cached.projects;
    }

    // Cache miss - fetch from API
    this.logger.log(`Cache miss: ${cacheKey}, fetching from ADO API...`);

    try {
      // Use ADO search API for batch loading
      const response = await this.adoClient.searchProjects({
        top: maxProjects,
      });

      // Extract rate limit headers
      const rateLimitHeaders = this.rateLimitChecker.extractHeaders(response);
      const rateLimitCheck = this.rateLimitChecker.shouldProceed(rateLimitHeaders);

      if (!rateLimitCheck.canProceed) {
        this.logger.warn(
          `Rate limit warning: ${rateLimitCheck.reason}. Consider using cached data.`
        );
      }

      // Parse projects
      const projects: AdoProjectMetadata[] = response.value.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        visibility: project.visibility || 'private',
        state: project.state || 'wellFormed',
      }));

      // Cache result
      await this.cacheManager.set(cacheKey, { projects });
      this.logger.log(`Cached ${projects.length} projects with 24-hour TTL`);

      return projects;
    } catch (error: any) {
      // Check for rate limit error (429)
      if (this.rateLimitChecker.isRateLimitError(error)) {
        await this.rateLimitChecker.handleRateLimitError(error);

        // Try to use stale cache
        const staleCache = await this.cacheManager.getStale<{ projects: AdoProjectMetadata[] }>(
          cacheKey
        );

        if (staleCache) {
          return staleCache.projects;
        }
      }

      // Re-throw if not rate limit or no stale cache available
      throw error;
    }
  }

  /**
   * Tier 2: Load dependencies for specific project (on-demand)
   *
   * Performance: 2-5 seconds per project (3-4 API calls, cached)
   * Cache: 24-hour TTL in `ado-{PROJECT}-deps.json`
   *
   * @param projectName Project name or ID
   * @returns Project dependencies
   */
  async loadProjectDependencies(projectName: string): Promise<AdoProjectDependencies> {
    const cacheKey = `ado-${projectName}-deps`;

    // Check cache first
    const cached = await this.cacheManager.get<AdoProjectDependencies>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit: ${cacheKey}`);
      return cached;
    }

    // Cache miss - fetch from API
    this.logger.log(`Cache miss: ${cacheKey}, fetching from ADO API...`);

    try {
      // Fetch area paths and teams in parallel
      const [areaPathsResponse, teamsResponse] = await Promise.all([
        this.adoClient.getAreaPaths(projectName, 10),
        this.adoClient.getTeams(projectName),
      ]);

      // Flatten area path tree
      const flattenAreaPaths = (node: any, parentPath: string = ''): any[] => {
        const currentPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
        const result = [
          {
            id: node.id,
            name: node.name,
            path: currentPath,
            hasChildren: node.hasChildren || false,
          },
        ];

        if (node.children) {
          node.children.forEach((child: any) => {
            result.push(...flattenAreaPaths(child, currentPath));
          });
        }

        return result;
      };

      const areaPaths = areaPathsResponse ? flattenAreaPaths(areaPathsResponse) : [];

      // Build dependencies object
      const dependencies: AdoProjectDependencies = {
        projectId: projectName, // Will be updated if we get project details
        projectName,
        areaPaths,
        teams: teamsResponse.map((team: any) => ({
          id: team.id,
          name: team.name,
          description: team.description,
        })),
        lastUpdated: new Date().toISOString(),
      };

      // Cache result
      await this.cacheManager.set(cacheKey, dependencies);
      this.logger.log(
        `Cached dependencies for ${projectName}: ${dependencies.areaPaths.length} area paths, ${dependencies.teams.length} teams`
      );

      return dependencies;
    } catch (error: any) {
      // Handle 404 (project not found) - invalidate cache
      if (error.response?.status === 404) {
        this.logger.warn(`Project ${projectName} not found (404), invalidating cache...`);
        await this.cacheManager.delete(cacheKey);
        throw new Error(`Project ${projectName} not found`);
      }

      // Handle rate limit errors
      if (this.rateLimitChecker.isRateLimitError(error)) {
        await this.rateLimitChecker.handleRateLimitError(error);

        // Try to use stale cache
        const staleCache = await this.cacheManager.getStale<AdoProjectDependencies>(cacheKey);

        if (staleCache) {
          return staleCache;
        }
      }

      // Re-throw if not handled
      throw error;
    }
  }

  /**
   * Tier 3: Bulk pre-load all dependencies (optional command)
   *
   * Performance: 1-2 minutes for 50 projects (150-200 API calls, batched)
   * Progress: Real-time progress tracking with ProgressTracker, cancelation with CancelationHandler
   *
   * @param projectNames Array of project names to preload
   * @returns void (results cached)
   */
  async preloadAllDependencies(
    projectNames: string[],
    options: {
      onProgress?: (current: number, total: number) => void;
      signal?: AbortSignal; // Backward compatibility
    } = {}
  ): Promise<void> {
    const { onProgress, signal } = options;
    const total = projectNames.length;

    this.logger.log(`Preloading dependencies for ${total} projects...`);

    // Initialize ProgressTracker
    const progressTracker = new ProgressTracker({
      total,
      label: 'Preloading ADO dependencies',
      updateFrequency: 5, // Update every 5 projects
      showEta: true,
      logger: this.logger
    });

    // Initialize CancelationHandler
    let succeeded = 0;
    let failed = 0;
    let loadedProjects: string[] = [];

    const cancelHandler = new CancelationHandler({
      onSaveState: async () => {
        this.logger.log(`\nPartial preload saved: ${loadedProjects.length}/${total} projects cached`);
        this.logger.log(`Success: ${succeeded}, Failed: ${failed}`);
      },
      logger: this.logger
    });

    // Register SIGINT handler
    cancelHandler.register();

    for (let i = 0; i < total; i++) {
      // Check for cancelation (both new handler and legacy signal)
      if (cancelHandler.shouldCancel() || signal?.aborted) {
        this.logger.warn('\n⚠️  Preload canceled by user');
        this.logger.log(`\n💡 Resume with: /specweave-ado:preload-dependencies --resume`);
        cancelHandler.unregister();
        throw new Error('Preload canceled');
      }

      const projectName = projectNames[i];

      try {
        await this.loadProjectDependencies(projectName);
        loadedProjects.push(projectName);
        succeeded++;

        // Update progress
        progressTracker.update(projectName, 'success');

        // Legacy callback support
        if (onProgress) {
          onProgress(i + 1, total);
        }
      } catch (error: any) {
        failed++;
        progressTracker.update(projectName, 'error');
        this.logger.error(`Failed to preload ${projectName}: ${error.message}`);
        // Continue with next project (don't fail entire batch)
      }

      // Add delay to avoid rate limiting (300ms between requests for ADO's stricter limits)
      if (i < total - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // Unregister handler and show final summary
    cancelHandler.unregister();
    progressTracker.finish(succeeded, failed, 0);
  }
}
