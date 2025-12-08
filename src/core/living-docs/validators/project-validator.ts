/**
 * Project Validator for Cross-Project User Story Targeting
 *
 * Validates that User Story project fields reference valid projects
 * in either projectMappings or multiProject.projects config.
 *
 * @module core/living-docs/validators/project-validator
 * @since v0.33.0
 */

import type { UserStoryData } from '../types.js';
import { Logger, consoleLogger } from '../../../utils/logger.js';

/**
 * Project mapping entry from config
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
 * Config structure for validation
 */
export interface ProjectValidationConfig {
  projectMappings?: Record<string, ProjectMapping>;
  multiProject?: {
    enabled?: boolean;
    projects?: Array<{ id: string; name: string }>;
  };
}

/**
 * Validation result for a single user story
 */
export interface USProjectValidationResult {
  usId: string;
  project: string | undefined;
  isValid: boolean;
  hasMapping: boolean;
  warning?: string;
}

/**
 * Overall validation result
 */
export interface ProjectValidationResult {
  valid: boolean;
  validCount: number;
  invalidCount: number;
  unmappedCount: number;
  results: USProjectValidationResult[];
  warnings: string[];
}

/**
 * Project Validator class
 */
export class ProjectValidator {
  private logger: Logger;

  constructor(options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Get all valid project IDs from config
   */
  getValidProjectIds(config: ProjectValidationConfig): Set<string> {
    const validIds = new Set<string>();

    // Add projectMappings keys
    if (config.projectMappings) {
      for (const projectId of Object.keys(config.projectMappings)) {
        validIds.add(projectId);
      }
    }

    // Add multiProject.projects IDs
    if (config.multiProject?.projects) {
      for (const project of config.multiProject.projects) {
        validIds.add(project.id);
      }
    }

    return validIds;
  }

  /**
   * Check if a project has external tool mapping
   */
  hasExternalMapping(projectId: string, config: ProjectValidationConfig): boolean {
    const mapping = config.projectMappings?.[projectId];
    if (!mapping) return false;

    return !!(mapping.github || mapping.jira || mapping.ado);
  }

  /**
   * Validate a single user story's project field
   */
  validateUSProject(
    us: UserStoryData,
    config: ProjectValidationConfig
  ): USProjectValidationResult {
    const validIds = this.getValidProjectIds(config);

    // No project specified
    if (!us.project) {
      return {
        usId: us.id,
        project: undefined,
        isValid: false,
        hasMapping: false,
        warning: `${us.id} has no project specified (neither explicit nor default)`
      };
    }

    // Check if project exists
    if (!validIds.has(us.project)) {
      return {
        usId: us.id,
        project: us.project,
        isValid: false,
        hasMapping: false,
        warning: `${us.id}: Project '${us.project}' not found in config (projectMappings or multiProject.projects)`
      };
    }

    // Check if project has external mapping (for sync)
    const hasMapping = this.hasExternalMapping(us.project, config);

    if (!hasMapping) {
      return {
        usId: us.id,
        project: us.project,
        isValid: true,
        hasMapping: false,
        warning: `${us.id}: Project '${us.project}' exists but has no external tool mapping (sync will be skipped)`
      };
    }

    return {
      usId: us.id,
      project: us.project,
      isValid: true,
      hasMapping: true
    };
  }

  /**
   * Validate all user stories in an increment
   */
  validateAllUSProjects(
    userStories: UserStoryData[],
    config: ProjectValidationConfig
  ): ProjectValidationResult {
    const results: USProjectValidationResult[] = [];
    const warnings: string[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let unmappedCount = 0;

    for (const us of userStories) {
      const result = this.validateUSProject(us, config);
      results.push(result);

      if (result.isValid) {
        validCount++;
        if (!result.hasMapping) {
          unmappedCount++;
        }
      } else {
        invalidCount++;
      }

      if (result.warning) {
        warnings.push(result.warning);
      }
    }

    return {
      valid: invalidCount === 0,
      validCount,
      invalidCount,
      unmappedCount,
      results,
      warnings
    };
  }

  /**
   * Log validation results
   */
  logValidationResults(result: ProjectValidationResult): void {
    if (result.valid && result.warnings.length === 0) {
      this.logger.log(`✅ All ${result.validCount} user stories have valid projects`);
      return;
    }

    if (result.invalidCount > 0) {
      this.logger.warn(`⚠️  ${result.invalidCount} user stories have invalid projects:`);
    }

    if (result.unmappedCount > 0) {
      this.logger.log(`📝 ${result.unmappedCount} user stories have no external mapping (will not sync)`);
    }

    for (const warning of result.warnings) {
      this.logger.warn(`   - ${warning}`);
    }
  }
}
