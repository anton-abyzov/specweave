/**
 * Hierarchy Builder Service
 *
 * Handles project/board hierarchy resolution for living docs sync.
 * Extracted from living-docs-sync.ts for better separation of concerns.
 *
 * Responsibilities:
 * - Resolve project path for increments
 * - Detect multi-project mode
 * - Match project names with fuzzy logic
 * - Handle 2-level structures (project/board)
 *
 * @module core/living-docs/sync-helpers/hierarchy-builder
 * @since v1.0.115
 */

import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { Logger, consoleLogger } from '../../../utils/logger.js';
import { readJson } from './file-utils.js';

/**
 * Multi-project detection result
 */
export interface MultiProjectDetection {
  isMultiProject: boolean;
  projects: Array<{ id: string; name: string; source: string }>;
  detectionReason: string;
}

/**
 * Hierarchy builder options
 */
export interface HierarchyBuilderOptions {
  logger?: Logger;
}

/**
 * Hierarchy Builder - Handles project/board hierarchy resolution
 */
export class HierarchyBuilder {
  private projectRoot: string;
  private logger: Logger;

  constructor(projectRoot: string, options: HierarchyBuilderOptions = {}) {
    this.projectRoot = projectRoot;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Detect if multi-project mode is enabled
   *
   * Checks config.json for:
   * - umbrella.enabled (multi-repo setup)
   * - multiProject.enabled (explicit multi-project)
   * - Multiple board/area mappings in sync profiles
   * - Multiple folders in specs directory
   *
   * @returns Detection result with projects and reason
   */
  async detectMultiProjectMode(): Promise<MultiProjectDetection> {
    const configPath = path.join(this.projectRoot, '.specweave/config.json');

    if (!existsSync(configPath)) {
      return { isMultiProject: false, projects: [], detectionReason: 'no-config' };
    }

    try {
      const config = await readJson(configPath);
      const projects: Array<{ id: string; name: string; source: string }> = [];

      // Check umbrella.enabled (multi-repo setup)
      if (config.umbrella?.enabled && config.umbrella?.childRepos?.length > 0) {
        for (const repo of config.umbrella.childRepos) {
          if (typeof repo === 'string') {
            projects.push({ id: repo, name: repo, source: 'umbrella' });
          } else if (repo.name) {
            projects.push({ id: repo.name, name: repo.name, source: 'umbrella' });
          }
        }
        if (projects.length > 0) {
          return { isMultiProject: true, projects, detectionReason: 'umbrella' };
        }
      }

      // Check multiProject.enabled
      if (config.multiProject?.enabled && config.multiProject?.projects) {
        const configProjects = config.multiProject.projects;
        for (const [id, project] of Object.entries(configProjects)) {
          const p = project as { name?: string };
          projects.push({ id, name: p.name || id, source: 'multiProject' });
        }
        if (projects.length > 0) {
          return { isMultiProject: true, projects, detectionReason: 'multiProject' };
        }
      }

      // Check ADO area path mapping
      if (config.sync?.profiles) {
        for (const [_profileName, profile] of Object.entries(config.sync.profiles)) {
          const p = profile as {
            provider?: string;
            config?: {
              areaPathMapping?: { mappings?: Array<{ specweaveProject: string }> };
              boardMapping?: { boards?: Array<{ specweaveProject: string }> };
            };
          };
          if (p.provider === 'ado' && p.config?.areaPathMapping?.mappings?.length) {
            for (const mapping of p.config.areaPathMapping.mappings) {
              if (!projects.find(proj => proj.id === mapping.specweaveProject)) {
                projects.push({
                  id: mapping.specweaveProject,
                  name: mapping.specweaveProject,
                  source: 'ado-area-path'
                });
              }
            }
          }
          // Check JIRA board mapping
          if (p.provider === 'jira' && p.config?.boardMapping?.boards?.length) {
            for (const board of p.config.boardMapping.boards) {
              if (!projects.find(proj => proj.id === board.specweaveProject)) {
                projects.push({
                  id: board.specweaveProject,
                  name: board.specweaveProject,
                  source: 'jira-board'
                });
              }
            }
          }
        }
        if (projects.length > 1) {
          return { isMultiProject: true, projects, detectionReason: 'sync-profiles' };
        }
      }

      // Check existing folders in specs/
      const specsBase = path.join(this.projectRoot, '.specweave/docs/internal/specs');
      if (existsSync(specsBase)) {
        try {
          const entries = await fs.readdir(specsBase, { withFileTypes: true });
          const folders = entries
            .filter(e => e.isDirectory() && !e.name.startsWith('_'))
            .map(e => e.name);
          if (folders.length > 1) {
            for (const folder of folders) {
              if (!projects.find(p => p.id === folder)) {
                projects.push({ id: folder, name: folder, source: 'existing-folder' });
              }
            }
            return { isMultiProject: true, projects, detectionReason: 'multiple-folders' };
          }
        } catch {
          // Ignore read errors
        }
      }

      return { isMultiProject: false, projects, detectionReason: 'single-project' };
    } catch {
      return { isMultiProject: false, projects: [], detectionReason: 'config-error' };
    }
  }

  /**
   * Find the best matching project path in existing specs structure
   *
   * Searches for:
   * 1. Direct match: specs/{project}/
   * 2. Hierarchical match: specs/{org}/{project}/
   * 3. Fuzzy match: specs/{org}/{similar-project}/
   *
   * @param specsBase - Base specs folder path
   * @param projectName - Project name to search for
   * @returns Full relative path or null
   */
  async findBestProjectMatch(specsBase: string, projectName: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(specsBase, { withFileTypes: true });

      // 1. Check for direct match at root level
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('_')) {
          if (this.projectNamesMatch(entry.name, projectName)) {
            return entry.name;
          }
        }
      }

      // 2. Check for hierarchical match (org/project)
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('FS-')) {
          // This could be an organization folder, check inside
          const orgPath = path.join(specsBase, entry.name);
          try {
            const orgEntries = await fs.readdir(orgPath, { withFileTypes: true });

            for (const subEntry of orgEntries) {
              if (subEntry.isDirectory() && !subEntry.name.startsWith('_') && !subEntry.name.startsWith('FS-')) {
                if (this.projectNamesMatch(subEntry.name, projectName)) {
                  return `${entry.name}/${subEntry.name}`;
                }
              }
            }
          } catch {
            // Not a directory or can't read, skip
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Compare project names with fuzzy matching
   *
   * Handles common variations:
   * - "operation" vs "operations"
   * - "service" vs "services"
   * - Different separators (hyphen vs underscore)
   *
   * @param existing - Existing folder name
   * @param target - Target project name to match
   * @returns true if names match (exact or fuzzy)
   */
  projectNamesMatch(existing: string, target: string): boolean {
    // Normalize both names - standardize to singular form
    const normalizeForComparison = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[-_\s]+/g, '-')
        .replace(/\boperations\b/g, 'operation')
        .replace(/\bservices\b/g, 'service');
    };

    const normalizedExisting = normalizeForComparison(existing);
    const normalizedTarget = normalizeForComparison(target);

    // Exact match after normalization
    if (normalizedExisting === normalizedTarget) {
      return true;
    }

    // SECURITY: Minimum length check to prevent false positive matches
    const minLength = Math.min(normalizedExisting.length, normalizedTarget.length);
    if (minLength < 5) {
      return false;
    }

    // Check if one contains the other (for partial matches)
    if (normalizedExisting.includes(normalizedTarget) || normalizedTarget.includes(normalizedExisting)) {
      const lengthRatio = minLength / Math.max(normalizedExisting.length, normalizedTarget.length);
      return lengthRatio > 0.7;
    }

    return false;
  }

  /**
   * Validate and normalize a project/board name
   *
   * SECURITY: Prevents path traversal and validates format
   *
   * @param rawName - Raw name to validate
   * @param fieldType - Type of field for logging
   * @returns Normalized name or null if invalid
   */
  validateAndNormalizeName(rawName: string, fieldType: 'project' | 'board'): string | null {
    if (!rawName) return null;

    const normalized = rawName.toLowerCase().replace(/\s+/g, '-');

    // Minimum length check
    if (normalized.length < 2) {
      this.logger.warn(`   ⚠️  ${fieldType} name too short: ${normalized}`);
      return null;
    }

    // Block path traversal attempts
    if (normalized.includes('..') ||
        normalized.includes('/') ||
        normalized.includes('\\') ||
        normalized.includes('\0')) {
      this.logger.warn(`   ⚠️  Invalid ${fieldType} name (potential path traversal): ${normalized}`);
      return null;
    }

    // Validate characters
    if (!/^[a-z0-9_-]+$/.test(normalized)) {
      this.logger.warn(`   ⚠️  Invalid ${fieldType} name (invalid characters): ${normalized}`);
      return null;
    }

    return normalized;
  }

  /**
   * Get list of available projects from specs folder
   *
   * @returns Array of project folder names
   */
  async getAvailableProjects(): Promise<string[]> {
    const specsBase = path.join(this.projectRoot, '.specweave/docs/internal/specs');

    if (!existsSync(specsBase)) {
      return [];
    }

    try {
      const entries = await fs.readdir(specsBase, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('FS-'))
        .map(e => e.name);
    } catch {
      return [];
    }
  }

  /**
   * Check if a path represents a 2-level structure (project/board)
   *
   * @param projectPath - Path to check
   * @returns true if 2-level structure
   */
  is2LevelPath(projectPath: string): boolean {
    return projectPath.includes('/') && !projectPath.startsWith('./');
  }

  /**
   * Split a 2-level path into project and board
   *
   * @param fullPath - Full path (e.g., "acme/digital-ops")
   * @returns Object with project and board
   */
  splitPath(fullPath: string): { project: string; board: string | null } {
    const normalized = fullPath.replace(/^\.\//, '');
    const parts = normalized.split('/');

    if (parts.length >= 2) {
      return { project: parts[0], board: parts.slice(1).join('/') };
    }

    return { project: normalized, board: null };
  }
}
