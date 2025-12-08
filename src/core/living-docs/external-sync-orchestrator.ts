/**
 * External Sync Orchestrator
 *
 * Coordinates syncing user stories to multiple external tools based on
 * per-US project targeting. Groups USs by their target project and
 * syncs each group to the appropriate external system.
 *
 * @module core/living-docs/external-sync-orchestrator
 * @since v0.33.0
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { UserStoryData } from './types.js';
import type { USExternalRef, USExternalRefsMap } from '../types/increment-metadata.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { pathExists, readJson } from './sync-helpers/file-utils.js';

/**
 * Project mapping configuration
 */
export interface ProjectMapping {
  github?: {
    owner: string;
    repo: string;
  };
  jira?: {
    project: string;
    board?: string;
  };
  ado?: {
    project: string;
    areaPath?: string;
  };
}

/**
 * Result of syncing a single US to an external tool
 */
export interface USSyncResult {
  usId: string;
  provider: 'github' | 'jira' | 'ado';
  success: boolean;
  issueNumber?: number | string;
  url?: string;
  error?: string;
}

/**
 * Result of syncing all USs in a project group
 */
export interface ProjectSyncResult {
  projectId: string;
  provider: 'github' | 'jira' | 'ado';
  success: boolean;
  synced: USSyncResult[];
  errors: string[];
}

/**
 * Result of complete cross-project sync
 */
export interface CrossProjectExternalSyncResult {
  success: boolean;
  projects: ProjectSyncResult[];
  externalRefs: USExternalRefsMap;
  summary: {
    totalUSs: number;
    syncedUSs: number;
    failedUSs: number;
    projectCount: number;
  };
}

/**
 * External Sync Orchestrator
 */
export class ExternalSyncOrchestrator {
  private projectRoot: string;
  private logger: Logger;
  private projectMappings: Record<string, ProjectMapping> = {};

  constructor(projectRoot: string, options: { logger?: Logger } = {}) {
    this.projectRoot = projectRoot;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Load project mappings from config
   */
  async loadProjectMappings(): Promise<void> {
    const configPath = path.join(this.projectRoot, '.specweave/config.json');

    if (await pathExists(configPath)) {
      try {
        const config = await readJson(configPath);
        this.projectMappings = config.projectMappings || {};
      } catch (error) {
        this.logger.warn('Failed to load projectMappings from config');
      }
    }
  }

  /**
   * Get project mapping for a project ID
   */
  getProjectMapping(projectId: string): ProjectMapping | undefined {
    return this.projectMappings[projectId];
  }

  /**
   * Group user stories by their target project
   */
  groupUSsByProject(
    userStories: UserStoryData[],
    defaultProject: string
  ): Map<string, UserStoryData[]> {
    const groups = new Map<string, UserStoryData[]>();

    for (const us of userStories) {
      const project = us.project || defaultProject;

      if (!groups.has(project)) {
        groups.set(project, []);
      }
      groups.get(project)!.push(us);
    }

    return groups;
  }

  /**
   * Get preferred provider for a US
   * Priority: US.externalProvider > first available in mapping
   */
  getPreferredProvider(
    us: UserStoryData,
    mapping: ProjectMapping
  ): 'github' | 'jira' | 'ado' | null {
    // Explicit preference in US
    if (us.externalProvider && mapping[us.externalProvider]) {
      return us.externalProvider;
    }

    // Fall back to first available in mapping
    if (mapping.github) return 'github';
    if (mapping.jira) return 'jira';
    if (mapping.ado) return 'ado';

    return null;
  }

  /**
   * Build external refs map from sync results
   */
  buildExternalRefsMap(results: ProjectSyncResult[]): USExternalRefsMap {
    const refsMap: USExternalRefsMap = {};

    for (const projectResult of results) {
      for (const usResult of projectResult.synced) {
        if (!usResult.success) continue;

        if (!refsMap[usResult.usId]) {
          refsMap[usResult.usId] = {};
        }

        refsMap[usResult.usId][usResult.provider] = {
          provider: usResult.provider,
          issueNumber: usResult.issueNumber!,
          url: usResult.url!,
          targetProject: projectResult.projectId,
          lastSynced: new Date().toISOString()
        };
      }
    }

    return refsMap;
  }

  /**
   * Log sync summary
   */
  logSyncSummary(result: CrossProjectExternalSyncResult): void {
    this.logger.log('');
    this.logger.log('🔗 Cross-Project External Sync Summary:');
    this.logger.log(`   Projects: ${result.summary.projectCount}`);
    this.logger.log(`   User Stories: ${result.summary.syncedUSs}/${result.summary.totalUSs} synced`);

    for (const project of result.projects) {
      const status = project.success ? '✅' : '❌';
      this.logger.log(`   ${status} ${project.projectId} (${project.provider}): ${project.synced.length} USs`);

      if (project.errors.length > 0) {
        for (const error of project.errors) {
          this.logger.warn(`      ⚠️ ${error}`);
        }
      }
    }
  }

  /**
   * Create placeholder sync result for dry-run or when sync is skipped
   */
  createPlaceholderResult(
    userStories: UserStoryData[],
    defaultProject: string
  ): CrossProjectExternalSyncResult {
    const groups = this.groupUSsByProject(userStories, defaultProject);

    return {
      success: true,
      projects: [...groups.entries()].map(([projectId, stories]) => ({
        projectId,
        provider: 'github' as const,
        success: true,
        synced: stories.map(us => ({
          usId: us.id,
          provider: 'github' as const,
          success: false,
          error: 'Sync skipped (dry-run or SKIP_EXTERNAL_SYNC)'
        })),
        errors: [] as string[]
      })),
      externalRefs: {},
      summary: {
        totalUSs: userStories.length,
        syncedUSs: 0,
        failedUSs: 0,
        projectCount: groups.size
      }
    };
  }
}
