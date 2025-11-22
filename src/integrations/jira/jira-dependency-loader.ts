/**
 * JiraDependencyLoader - Three-Tier Dependency Loading for JIRA
 *
 * Architecture (ADR-0056):
 * - Tier 1 (Init): Metadata only (< 5 seconds, 1 API call)
 * - Tier 2 (On-Demand): Lazy loading per project (2-5 seconds, 4-7 API calls)
 * - Tier 3 (Bulk): Optional pre-load command (1-2 minutes for 50 projects)
 *
 * Features:
 * - 24-hour TTL caching via CacheManager
 * - Rate limit detection and stale cache fallback
 * - Per-project dependency caching
 * - Automatic cache invalidation on 404 errors
 *
 * @module integrations/jira/jira-dependency-loader
 */

import { CacheManager } from '../../core/cache/cache-manager.js';
import { RateLimitChecker } from '../../core/cache/rate-limit-checker.js';
import { JiraClient } from './jira-client.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Project metadata (Tier 1)
 */
export interface ProjectMetadata {
  key: string; // e.g., "BACKEND"
  name: string; // e.g., "Backend Services"
  type: string; // e.g., "software", "business"
  lead?: {
    displayName: string;
  };
}

/**
 * Project dependencies (Tier 2)
 */
export interface ProjectDependencies {
  projectKey: string;
  boards: Array<{
    id: number;
    name: string;
    type?: string;
  }>;
  components: Array<{
    id: string;
    name: string;
  }>;
  versions: Array<{
    id: string;
    name: string;
    released?: boolean;
  }>;
  lastUpdated: string;
}

/**
 * JiraDependencyLoader - Three-tier dependency loading with smart caching
 */
export class JiraDependencyLoader {
  private cacheManager: CacheManager;
  private rateLimitChecker: RateLimitChecker;
  private jiraClient: JiraClient;
  private logger: Logger;

  constructor(options: {
    jiraClient: JiraClient;
    cacheManager: CacheManager;
    rateLimitChecker?: RateLimitChecker;
    logger?: Logger;
  }) {
    this.jiraClient = options.jiraClient;
    this.cacheManager = options.cacheManager;
    this.rateLimitChecker = options.rateLimitChecker ?? new RateLimitChecker();
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Tier 1: Load project metadata only (init)
   *
   * Performance: < 5 seconds for 50 projects (1 API call)
   * Cache: 24-hour TTL in `jira-projects.json`
   *
   * @param maxProjects Maximum projects to load (default: 50)
   * @returns Array of project metadata
   */
  async loadProjectMetadata(maxProjects: number = 50): Promise<ProjectMetadata[]> {
    const cacheKey = 'jira-projects';

    // Check cache first
    const cached = await this.cacheManager.get<{ projects: ProjectMetadata[] }>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit: ${cacheKey} (${cached.projects.length} projects)`);
      return cached.projects;
    }

    // Cache miss - fetch from API
    this.logger.log(`Cache miss: ${cacheKey}, fetching from JIRA API...`);

    try {
      // Use JIRA search API for batch loading
      const response = await this.jiraClient.searchProjects({
        maxResults: maxProjects,
        orderBy: 'name',
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
      const projects: ProjectMetadata[] = response.values.map((project: any) => ({
        key: project.key,
        name: project.name,
        type: project.projectTypeKey || 'software',
        lead: project.lead
          ? {
              displayName: project.lead.displayName,
            }
          : undefined,
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
        const staleCache = await this.cacheManager.getStale<{ projects: ProjectMetadata[] }>(
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
   * Performance: 2-5 seconds per project (4-7 API calls, cached)
   * Cache: 24-hour TTL in `jira-{PROJECT}-deps.json`
   *
   * @param projectKey Project key (e.g., "BACKEND")
   * @returns Project dependencies
   */
  async loadProjectDependencies(projectKey: string): Promise<ProjectDependencies> {
    const cacheKey = `jira-${projectKey}-deps`;

    // Check cache first
    const cached = await this.cacheManager.get<ProjectDependencies>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit: ${cacheKey}`);
      return cached;
    }

    // Cache miss - fetch from API
    this.logger.log(`Cache miss: ${cacheKey}, fetching from JIRA API...`);

    try {
      // Fetch boards, components, versions in parallel
      const [boardsResponse, componentsResponse, versionsResponse] = await Promise.all([
        this.jiraClient.getBoards(projectKey),
        this.jiraClient.getComponents(projectKey),
        this.jiraClient.getVersions(projectKey),
      ]);

      // Build dependencies object
      const dependencies: ProjectDependencies = {
        projectKey,
        boards: boardsResponse.values?.map((board: any) => ({
          id: board.id,
          name: board.name,
          type: board.type,
        })) || [],
        components: componentsResponse.map((component: any) => ({
          id: component.id,
          name: component.name,
        })),
        versions: versionsResponse.map((version: any) => ({
          id: version.id,
          name: version.name,
          released: version.released,
        })),
        lastUpdated: new Date().toISOString(),
      };

      // Cache result
      await this.cacheManager.set(cacheKey, dependencies);
      this.logger.log(
        `Cached dependencies for ${projectKey}: ${dependencies.boards.length} boards, ${dependencies.components.length} components, ${dependencies.versions.length} versions`
      );

      return dependencies;
    } catch (error: any) {
      // Handle 404 (project not found) - invalidate cache
      if (error.response?.status === 404) {
        this.logger.warn(`Project ${projectKey} not found (404), invalidating cache...`);
        await this.cacheManager.delete(cacheKey);
        throw new Error(`Project ${projectKey} not found`);
      }

      // Handle rate limit errors
      if (this.rateLimitChecker.isRateLimitError(error)) {
        await this.rateLimitChecker.handleRateLimitError(error);

        // Try to use stale cache
        const staleCache = await this.cacheManager.getStale<ProjectDependencies>(cacheKey);

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
   * Performance: 1-2 minutes for 50 projects (200-350 API calls, batched)
   * Progress: Real-time progress tracking, cancelation support
   *
   * @param projectKeys Array of project keys to preload
   * @returns void (results cached)
   */
  async preloadAllDependencies(
    projectKeys: string[],
    options: {
      onProgress?: (current: number, total: number) => void;
      signal?: AbortSignal; // Cancelation support
    } = {}
  ): Promise<void> {
    const { onProgress, signal } = options;
    const total = projectKeys.length;

    this.logger.log(`Preloading dependencies for ${total} projects...`);

    for (let i = 0; i < total; i++) {
      // Check for cancelation
      if (signal?.aborted) {
        this.logger.warn('Preload canceled by user');
        throw new Error('Preload canceled');
      }

      const projectKey = projectKeys[i];
      this.logger.log(`[${i + 1}/${total}] Preloading ${projectKey}...`);

      try {
        await this.loadProjectDependencies(projectKey);

        // Report progress
        if (onProgress) {
          onProgress(i + 1, total);
        }
      } catch (error: any) {
        this.logger.error(`Failed to preload ${projectKey}: ${error.message}`);
        // Continue with next project (don't fail entire batch)
      }

      // Add delay to avoid rate limiting (200ms between requests)
      if (i < total - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    this.logger.log('Preload complete!');
  }
}
