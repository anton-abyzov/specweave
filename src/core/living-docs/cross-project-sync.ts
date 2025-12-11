/**
 * Cross-Project Sync Orchestrator
 *
 * Handles syncing increments that span multiple projects.
 * Groups user stories by their target project and syncs each group
 * to the appropriate project folder in living docs.
 *
 * Supports both 1-level (project) and 2-level (project/board) structures.
 *
 * @module core/living-docs/cross-project-sync
 * @since v0.33.0
 * @updated v0.34.0 - Added 2-level structure support (project/board)
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { UserStoryData, SyncResult } from './types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { pathExists, ensureDir } from '../../utils/fs-native.js';
import { detectStructureLevel, type StructureLevelConfig } from '../../utils/structure-level-detector.js';
import { ProjectResolutionService } from '../project/project-resolution.js';

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
  private structureConfig: StructureLevelConfig | null = null;
  private projectResolution: ProjectResolutionService;

  constructor(projectRoot: string, options: { logger?: Logger; projectResolution?: ProjectResolutionService } = {}) {
    this.projectRoot = projectRoot;
    this.logger = options.logger ?? consoleLogger;
    this.projectResolution = options.projectResolution ?? new ProjectResolutionService(projectRoot, { logger: this.logger });
  }

  /**
   * Get structure level configuration (cached)
   */
  private getStructureConfig(): StructureLevelConfig {
    if (!this.structureConfig) {
      this.structureConfig = detectStructureLevel(this.projectRoot);
    }
    return this.structureConfig;
  }

  /**
   * Check if 2-level structure is detected
   */
  is2LevelStructure(): boolean {
    return this.getStructureConfig().level === 2;
  }

  /**
   * Get full target path for a user story
   *
   * For 1-level: returns project
   * For 2-level: returns project/board
   *
   * @param us - User story
   * @param defaultProject - Default project if US doesn't specify
   * @param defaultBoard - Default board if US doesn't specify (2-level only)
   * @returns Full path like "project" or "project/board"
   */
  getUSTargetPath(
    us: UserStoryData,
    defaultProject: string,
    defaultBoard?: string
  ): string {
    const project = us.project || defaultProject;

    if (this.is2LevelStructure()) {
      const board = us.board || defaultBoard || 'default';
      return `${project}/${board}`;
    }

    return project;
  }

  /**
   * Group user stories by their target path (project or project/board)
   *
   * @param userStories - User stories to group
   * @param defaultProject - Default project for USs without explicit project
   * @param defaultBoard - Default board for USs without explicit board (2-level only)
   * @returns Map of target path to user stories
   */
  groupByProject(
    userStories: UserStoryData[],
    defaultProject: string,
    defaultBoard?: string
  ): Map<string, UserStoryData[]> {
    const groups = new Map<string, UserStoryData[]>();

    for (const us of userStories) {
      const targetPath = this.getUSTargetPath(us, defaultProject, defaultBoard);

      if (!groups.has(targetPath)) {
        groups.set(targetPath, []);
      }
      groups.get(targetPath)!.push(us);
    }

    return groups;
  }

  /**
   * Group user stories by project only (ignoring board)
   * Useful for project-level operations like external sync
   */
  groupByProjectOnly(
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
   * Check if an increment is cross-project (spans multiple projects/boards)
   *
   * For 1-level: checks if USs target different projects
   * For 2-level: checks if USs target different project/board combinations
   */
  isCrossProject(
    userStories: UserStoryData[],
    defaultProject: string,
    defaultBoard?: string
  ): boolean {
    const groups = this.groupByProject(userStories, defaultProject, defaultBoard);
    return groups.size > 1;
  }

  /**
   * Check if an increment spans multiple projects (ignoring boards)
   * Useful for external sync which groups at project level
   */
  spansMultipleProjects(
    userStories: UserStoryData[],
    defaultProject: string
  ): boolean {
    const groups = this.groupByProjectOnly(userStories, defaultProject);
    return groups.size > 1;
  }

  /**
   * Get the specs folder path for a target path
   * Handles both 1-level (project) and 2-level (project/board)
   *
   * @param targetPath - Either "project" or "project/board"
   */
  getSpecsPath(targetPath: string): string {
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/specs',
      targetPath
    );
  }

  /**
   * Get the feature folder path for a target path and feature
   * Handles both 1-level and 2-level structures
   *
   * @param targetPath - Either "project" or "project/board"
   * @param featureId - Feature ID (e.g., "FS-125")
   */
  getFeaturePath(targetPath: string, featureId: string): string {
    return path.join(
      this.getSpecsPath(targetPath),
      featureId
    );
  }

  /**
   * Ensure specs folder exists for a target path
   * Handles both 1-level and 2-level structures
   *
   * CRITICAL v0.35.1: Validates project before folder creation to prevent pollution
   * @throws Error if project validation fails
   */
  async ensureSpecsFolder(targetPath: string): Promise<string> {
    // Extract project from path (handles both "project" and "project/board")
    const projectId = targetPath.split('/')[0];

    // Validate project before creating folder
    const validation = await this.projectResolution.validateProjectForFolderCreation(projectId);
    if (!validation.valid) {
      throw new Error(
        `Cannot create specs folder for invalid project '${projectId}': ${validation.reason}. ` +
        `Allowed projects: [${validation.allowedProjects.join(', ')}]`
      );
    }

    const folderPath = this.getSpecsPath(targetPath);
    await ensureDir(folderPath);
    return folderPath;
  }

  /**
   * Ensure feature folder exists within a target path
   * Handles both 1-level and 2-level structures
   *
   * CRITICAL v0.35.1: Validates project before folder creation to prevent pollution
   * @throws Error if project validation fails
   */
  async ensureFeatureFolder(targetPath: string, featureId: string): Promise<string> {
    // Extract project from path (handles both "project" and "project/board")
    const projectId = targetPath.split('/')[0];

    // Validate project before creating folder
    const validation = await this.projectResolution.validateProjectForFolderCreation(projectId);
    if (!validation.valid) {
      throw new Error(
        `Cannot create feature folder for invalid project '${projectId}': ${validation.reason}. ` +
        `Allowed projects: [${validation.allowedProjects.join(', ')}]`
      );
    }

    const folderPath = this.getFeaturePath(targetPath, featureId);
    await ensureDir(folderPath);
    return folderPath;
  }

  /**
   * Generate cross-references section for FEATURE.md
   *
   * @param featureId - The feature ID (e.g., "FS-125")
   * @param allTargetPaths - All target paths this feature spans (can be "project" or "project/board")
   * @param currentTargetPath - The current target path being generated
   * @returns Markdown content for "Related Projects" section
   */
  generateCrossReferences(
    featureId: string,
    allTargetPaths: string[],
    currentTargetPath: string
  ): string {
    const otherPaths = allTargetPaths.filter(p => p !== currentTargetPath);

    if (otherPaths.length === 0) {
      return '';
    }

    // Determine depth of current path for relative link calculation
    const currentDepth = currentTargetPath.split('/').length;

    const lines = [
      '',
      '## Related Projects',
      '',
      this.is2LevelStructure()
        ? 'This feature spans multiple project/board combinations:'
        : 'This feature spans multiple projects:',
      ''
    ];

    for (const targetPath of otherPaths) {
      // Calculate relative path based on depth
      // From project/board/FS-XXX/FEATURE.md to ../../../other-project/other-board/FS-XXX/
      const upLevels = '../'.repeat(currentDepth + 1); // +1 for featureId folder
      const relativePath = `${upLevels}${targetPath}/${featureId}/`;

      // Display label (show full path for clarity)
      const label = targetPath;
      lines.push(`- [${label}](${relativePath})`);
    }

    lines.push('');
    return lines.join('\n');
  }

  /**
   * Generate cross-reference frontmatter for US files
   *
   * @param allTargetPaths - All target paths (can be "project" or "project/board")
   * @param currentTargetPath - Current target path
   */
  generateRelatedProjectsFrontmatter(
    allTargetPaths: string[],
    currentTargetPath: string
  ): string {
    const otherPaths = allTargetPaths.filter(p => p !== currentTargetPath);

    if (otherPaths.length === 0) {
      return '';
    }

    return `related_projects: [${otherPaths.join(', ')}]`;
  }

  /**
   * Extract project ID from target path
   * "project" -> "project"
   * "project/board" -> "project"
   */
  extractProjectId(targetPath: string): string {
    return targetPath.split('/')[0];
  }

  /**
   * Extract board ID from target path (for 2-level structures)
   * "project" -> undefined
   * "project/board" -> "board"
   */
  extractBoardId(targetPath: string): string | undefined {
    const parts = targetPath.split('/');
    return parts.length > 1 ? parts[1] : undefined;
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
