/**
 * Cross-Project Sync Orchestrator
 *
 * Handles syncing increments that span multiple projects.
 * Groups user stories by their target project and syncs each group
 * to the appropriate project folder in living docs.
 *
 * @module core/living-docs/cross-project-sync
 * @since v0.33.0
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { UserStoryData, SyncResult } from './types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { pathExists, ensureDir } from '../../utils/fs-native.js';

/**
 * Result of syncing to a single project
 */
export interface ProjectSyncResult {
  projectId: string;
  success: boolean;
  userStories: string[];
  filesCreated: string[];
  filesUpdated: string[];
  errors: string[];
}

/**
 * Result of syncing across multiple projects
 */
export interface MultiProjectSyncResult {
  success: boolean;
  projects: ProjectSyncResult[];
  crossReferences: string[];
  totalUserStories: number;
  projectCount: number;
}

/**
 * Options for cross-project sync
 */
export interface CrossProjectSyncOptions {
  dryRun?: boolean;
  force?: boolean;
  generateCrossReferences?: boolean;
}

/**
 * Cross-Project Sync Orchestrator
 */
export class CrossProjectSync {
  private projectRoot: string;
  private logger: Logger;

  constructor(projectRoot: string, options: { logger?: Logger } = {}) {
    this.projectRoot = projectRoot;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Group user stories by their target project
   *
   * @param userStories - User stories to group
   * @param defaultProject - Default project for USs without explicit project
   * @returns Map of project ID to user stories
   */
  groupByProject(
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
   * Check if an increment is cross-project (spans multiple projects)
   */
  isCrossProject(
    userStories: UserStoryData[],
    defaultProject: string
  ): boolean {
    const groups = this.groupByProject(userStories, defaultProject);
    return groups.size > 1;
  }

  /**
   * Get the specs folder path for a project
   */
  getProjectSpecsPath(projectId: string): string {
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/specs',
      projectId
    );
  }

  /**
   * Get the feature folder path for a project and feature
   */
  getFeaturePath(projectId: string, featureId: string): string {
    return path.join(
      this.getProjectSpecsPath(projectId),
      featureId
    );
  }

  /**
   * Ensure project specs folder exists
   */
  async ensureProjectFolder(projectId: string): Promise<string> {
    const folderPath = this.getProjectSpecsPath(projectId);
    await ensureDir(folderPath);
    return folderPath;
  }

  /**
   * Ensure feature folder exists within a project
   */
  async ensureFeatureFolder(projectId: string, featureId: string): Promise<string> {
    const folderPath = this.getFeaturePath(projectId, featureId);
    await ensureDir(folderPath);
    return folderPath;
  }

  /**
   * Generate cross-references section for FEATURE.md
   *
   * @param featureId - The feature ID (e.g., "FS-125")
   * @param allProjects - All projects this feature spans
   * @param currentProject - The current project being generated
   * @returns Markdown content for "Related Projects" section
   */
  generateCrossReferences(
    featureId: string,
    allProjects: string[],
    currentProject: string
  ): string {
    const otherProjects = allProjects.filter(p => p !== currentProject);

    if (otherProjects.length === 0) {
      return '';
    }

    const lines = [
      '',
      '## Related Projects',
      '',
      'This feature spans multiple projects:',
      ''
    ];

    for (const projectId of otherProjects) {
      // Relative path from current project to other project
      const relativePath = `../../${projectId}/${featureId}/`;
      lines.push(`- [${projectId}](${relativePath})`);
    }

    lines.push('');
    return lines.join('\n');
  }

  /**
   * Generate cross-reference frontmatter for US files
   */
  generateRelatedProjectsFrontmatter(
    allProjects: string[],
    currentProject: string
  ): string {
    const otherProjects = allProjects.filter(p => p !== currentProject);

    if (otherProjects.length === 0) {
      return '';
    }

    return `related_projects: [${otherProjects.join(', ')}]`;
  }

  /**
   * Log cross-project sync summary
   */
  logSyncSummary(result: MultiProjectSyncResult): void {
    this.logger.log('');
    this.logger.log('📦 Cross-Project Sync Summary:');
    this.logger.log(`   Projects: ${result.projectCount}`);
    this.logger.log(`   User Stories: ${result.totalUserStories}`);

    for (const project of result.projects) {
      const status = project.success ? '✅' : '❌';
      this.logger.log(`   ${status} ${project.projectId}: ${project.userStories.length} USs`);

      if (project.errors.length > 0) {
        for (const error of project.errors) {
          this.logger.warn(`      ⚠️ ${error}`);
        }
      }
    }

    if (result.crossReferences.length > 0) {
      this.logger.log(`   🔗 Cross-references: ${result.crossReferences.length} links created`);
    }
  }
}
