/**
 * Single-Project Migrator
 *
 * Automatically detects and migrates repositories with exactly 1 project
 * from multi-project mode (multiProject.enabled=true) to single-project mode
 * (multiProject.enabled=false).
 *
 * This is part of the fix for the auto-enable multi-project bug where
 * single-project repositories were incorrectly configured with multi-project mode.
 *
 * @module core/config/single-project-migrator
 * @since v0.34.0
 */

import type { Logger } from '../../utils/logger.js';
import { consoleLogger } from '../../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Project data structure (extracted from multiProject.projects)
 */
export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  keywords?: string[];
  techStack?: string[];
  team?: string;
  externalTools?: {
    github?: { repository: string };
    jira?: { project: string; board?: string };
    ado?: { project: string; areaPath?: string };
  };
}

/**
 * Multi-project configuration structure
 */
export interface MultiProjectConfig {
  enabled: boolean;
  activeProject?: string;
  projects: Record<string, ProjectData>;
}

/**
 * Config structure with both project and multiProject fields
 */
export interface Config {
  project?: {
    name: string;
    version?: string;
    description?: string;
    techStack?: string[];
    team?: string;
  };
  multiProject?: MultiProjectConfig;
  [key: string]: any;
}

/**
 * Migration result
 */
export interface MigrationResult {
  migrated: boolean;
  reason: string;
  preservedFields: string[];
  backupPath?: string;
}

/**
 * Result of migration attempt
 */
export interface MigrationAttempt {
  config: Config;
  result: MigrationResult;
}

/**
 * Single-project migrator options
 */
export interface MigratorOptions {
  logger?: Logger;
  projectRoot?: string;
  createBackup?: boolean;
}

/**
 * Detects and migrates single-project repositories from multi-project mode to single-project mode
 *
 * Algorithm:
 * 1. Check if multiProject.enabled === true
 * 2. Count projects in multiProject.projects
 * 3. If exactly 1 project:
 *    a. Extract project data
 *    b. Move to top-level project field
 *    c. Set multiProject.enabled = false
 *    d. Log migration
 * 4. Return updated config
 *
 * @param config - Current configuration object
 * @param options - Migration options
 * @returns Updated config and migration result
 */
export async function detectAndMigrateSingleProject(
  config: Config,
  options: MigratorOptions = {}
): Promise<MigrationAttempt> {
  const logger = options.logger ?? consoleLogger;
  const projectRoot = options.projectRoot ?? process.cwd();
  const createBackup = options.createBackup ?? true;

  // Check if multi-project mode is enabled
  if (config.multiProject?.enabled !== true) {
    return {
      config,
      result: {
        migrated: false,
        reason: 'Already in single-project mode (multiProject.enabled=false)',
        preservedFields: []
      }
    };
  }

  // Count projects
  const projects = config.multiProject.projects || {};
  const projectCount = Object.keys(projects).length;

  // If 0 projects, this is an error state
  if (projectCount === 0) {
    logger.warn('⚠️  Multi-project mode enabled but no projects defined');
    return {
      config,
      result: {
        migrated: false,
        reason: 'No projects found in multiProject.projects (error state)',
        preservedFields: []
      }
    };
  }

  // If multiple projects, genuinely multi-project
  if (projectCount > 1) {
    return {
      config,
      result: {
        migrated: false,
        reason: `Genuinely multi-project (${projectCount} projects configured)`,
        preservedFields: []
      }
    };
  }

  // Single project with multi-project enabled = BUG
  const [projectId, projectData] = Object.entries(projects)[0];

  logger.log(`🔧 Auto-migrating to single-project mode (found 1 project: ${projectId})`);

  // Create backup if enabled
  let backupPath: string | undefined;
  if (createBackup) {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    backupPath = `${configPath}.backup-${Date.now()}`;

    try {
      await fs.promises.copyFile(configPath, backupPath);
      logger.log(`   📦 Backup created: ${backupPath}`);
    } catch (error) {
      logger.warn(`   ⚠️  Could not create backup: ${error instanceof Error ? error.message : String(error)}`);
      backupPath = undefined;
    }
  }

  // Track preserved fields
  const preservedFields: string[] = [];

  // Build top-level project object from projectData
  const migratedProject: Config['project'] = {
    name: projectData.id,
    version: projectData.name || projectData.id, // Use name as version if available
    description: projectData.description,
    techStack: projectData.techStack,
    team: projectData.team
  };

  // Track what was preserved
  if (projectData.description) preservedFields.push('description');
  if (projectData.techStack) preservedFields.push('techStack');
  if (projectData.team) preservedFields.push('team');
  if (projectData.externalTools) preservedFields.push('externalTools');

  // Create migrated config
  const migratedConfig: Config = {
    ...config,
    project: migratedProject,
    multiProject: {
      enabled: false,
      projects: {} // Clear projects array
    }
  };

  // Log migration to file
  await logMigration(projectRoot, {
    timestamp: new Date().toISOString(),
    projectId,
    projectCount,
    preservedFields,
    backupPath
  }, logger);

  logger.log(`   ✅ Migrated: multiProject.enabled = false`);
  logger.log(`   📁 Project: ${projectId}`);
  logger.log(`   🔐 Preserved: ${preservedFields.join(', ') || 'no additional fields'}`);

  return {
    config: migratedConfig,
    result: {
      migrated: true,
      reason: `Single project detected (${projectId})`,
      preservedFields,
      backupPath
    }
  };
}

/**
 * Logs migration to .specweave/logs/migration.log
 */
async function logMigration(
  projectRoot: string,
  details: {
    timestamp: string;
    projectId: string;
    projectCount: number;
    preservedFields: string[];
    backupPath?: string;
  },
  logger: Logger
): Promise<void> {
  const logsDir = path.join(projectRoot, '.specweave', 'logs');
  const logFile = path.join(logsDir, 'migration.log');

  try {
    // Ensure logs directory exists
    await fs.promises.mkdir(logsDir, { recursive: true });

    const logEntry = [
      `[${details.timestamp}] Single-Project Migration`,
      `  Project ID: ${details.projectId}`,
      `  Project Count: ${details.projectCount}`,
      `  Preserved Fields: ${details.preservedFields.join(', ') || 'none'}`,
      details.backupPath ? `  Backup: ${details.backupPath}` : '',
      `  Result: SUCCESS`,
      ''
    ].filter(Boolean).join('\n');

    await fs.promises.appendFile(logFile, logEntry);
    logger.debug(`   📝 Migration logged to ${logFile}`);
  } catch (error) {
    logger.warn(`   ⚠️  Could not write migration log: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Checks if config needs migration (exported for testing)
 *
 * @param config - Configuration to check
 * @returns true if migration needed, false otherwise
 */
export function needsMigration(config: Config): boolean {
  if (config.multiProject?.enabled !== true) {
    return false;
  }

  const projectCount = Object.keys(config.multiProject.projects || {}).length;
  return projectCount === 1;
}
