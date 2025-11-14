/**
 * Auto-Migration: Single Project → Multi-Project Structure
 *
 * Automatically migrates existing specs/ to projects/{detected-id}/specs/
 * Auto-detects project ID from git remote or sync config
 * Transparent to users - no behavior changes, just new structure
 */

import path from 'path';
import fs from 'fs-extra';
import { ProjectManager } from '../../core/project-manager';
import { ConfigManager } from '../../core/config-manager';
import { autoDetectProjectIdSync, formatProjectName } from '../../utils/project-detection';

export interface MigrationResult {
  success: boolean;
  migratedSpecsCount: number;
  backupCreated: boolean;
  backupPath?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Auto-migrate from single project to multi-project structure
 *
 * @param projectRoot - Project root directory
 * @returns MigrationResult
 */
export async function autoMigrateSingleToMulti(
  projectRoot: string
): Promise<MigrationResult> {
  console.log('🔄 Auto-migrating to multi-project structure...\n');

  const result: MigrationResult = {
    success: false,
    migratedSpecsCount: 0,
    backupCreated: false,
    errors: [],
    warnings: []
  };

  try {
    const configManager = new ConfigManager(projectRoot);
    const config = configManager.load();

    // Auto-detect project ID (git remote, sync config, or "default")
    const projectId = autoDetectProjectIdSync(projectRoot);
    console.log(`📝 Detected project: ${projectId}`);

    // Check if already migrated
    if (config.multiProject?.enabled) {
      console.log('✅ Already using multi-project structure (enabled)');
      result.success = true;
      return result;
    }

    // Check if projects/{projectId}/ already exists (migration already done, just not enabled)
    const projectPath = path.join(
      projectRoot,
      `.specweave/docs/internal/projects/${projectId}`
    );

    if (await fs.pathExists(projectPath)) {
      console.log(`✅ Already using multi-project structure (projects/${projectId}/ exists)`);

      // Update config to reflect reality
      if (!config.multiProject) {
        config.multiProject = {
          enabled: false,
          activeProject: projectId,
          projects: {
            [projectId]: {
              id: projectId,
              name: config.project?.name || formatProjectName(projectId),
              description: config.project?.description || `${formatProjectName(projectId)} project`,
              techStack: config.project?.techStack || [],
              team: config.project?.team || 'Engineering Team'
            }
          }
        };
        await configManager.save(config);
        console.log('📝 Updated config to reflect multi-project structure');
      }

      result.success = true;
      return result;
    }

    // 1. Backup current config
    const backupPath = path.join(
      projectRoot,
      `.specweave/config.backup.${Date.now()}.json`
    );

    try {
      await fs.writeJson(backupPath, config, { spaces: 2 });
      console.log(`📦 Backed up config to: ${path.basename(backupPath)}`);
      result.backupCreated = true;
      result.backupPath = backupPath;
    } catch (error) {
      result.warnings.push(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 2. Check if old specs/ folder exists
    const oldSpecsPath = path.join(
      projectRoot,
      '.specweave/docs/internal/specs'
    );

    const hasOldSpecs = await fs.pathExists(oldSpecsPath);

    // 3. Create project structure with auto-detected ID
    const projectManager = new ProjectManager(projectRoot);

    // Ensure multiProject section exists
    if (!config.multiProject) {
      config.multiProject = {
        enabled: false,  // Still single project, just using new structure
        activeProject: projectId,
        projects: {
          [projectId]: {
            id: projectId,
            name: config.project?.name || formatProjectName(projectId),
            description: config.project?.description || `${formatProjectName(projectId)} project`,
            techStack: config.project?.techStack || [],
            team: config.project?.team || 'Engineering Team'
          }
        }
      };
    }

    // Save config before creating structure (so ProjectManager can read it)
    await configManager.save(config);

    // Create structure
    await projectManager.createProjectStructure(projectId);
    console.log(`📁 Created projects/${projectId}/ structure`);

    // 4. Migrate old specs if they exist
    if (hasOldSpecs) {
      const newSpecsPath = path.join(
        projectRoot,
        `.specweave/docs/internal/specs/${projectId}`
      );

      try {
        const entries = await fs.readdir(oldSpecsPath, { withFileTypes: true });
        let migratedCount = 0;

        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith('.md')) {
            const sourcePath = path.join(oldSpecsPath, entry.name);
            const destPath = path.join(newSpecsPath, entry.name);

            await fs.copy(sourcePath, destPath);
            migratedCount++;
          }
        }

        result.migratedSpecsCount = migratedCount;
        console.log(`📋 Migrated ${migratedCount} spec(s) to specs/${projectId}/`);

        // Rename old folder (preserve as backup)
        const oldSpecsBackupPath = path.join(
          projectRoot,
          '.specweave/docs/internal/specs.old'
        );

        await fs.move(oldSpecsPath, oldSpecsBackupPath, { overwrite: true });
        console.log('📦 Renamed old specs/ to specs.old/ (backup)');
      } catch (error) {
        result.errors.push(`Failed to migrate specs: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('ℹ️  No existing specs/ folder to migrate');
    }

    console.log(`\n✅ Migration complete! Using flattened specs/${projectId}/ structure`);
    console.log('💡 Run /specweave:init-multiproject to enable multi-project mode\n');

    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
    result.success = false;
    return result;
  }
}

/**
 * Check if migration is needed
 *
 * @param projectRoot - Project root directory
 * @returns true if migration needed
 */
export async function isMigrationNeeded(projectRoot: string): Promise<boolean> {
  // Auto-detect project ID
  const projectId = autoDetectProjectIdSync(projectRoot, { silent: true });

  // Check if projects/{projectId}/ exists
  const projectPath = path.join(
    projectRoot,
    `.specweave/docs/internal/projects/${projectId}`
  );

  if (await fs.pathExists(projectPath)) {
    return false; // Already migrated
  }

  // Check if old specs/ exists
  const oldSpecsPath = path.join(
    projectRoot,
    '.specweave/docs/internal/specs'
  );

  return await fs.pathExists(oldSpecsPath);
}

/**
 * Rollback migration (restore from backup)
 *
 * @param projectRoot - Project root directory
 * @param backupPath - Path to backup file
 */
export async function rollbackMigration(
  projectRoot: string,
  backupPath: string
): Promise<void> {
  console.log('🔄 Rolling back migration...\n');

  try {
    // Restore config from backup
    const backup = await fs.readJson(backupPath);
    const configPath = path.join(projectRoot, '.specweave/config.json');
    await fs.writeJson(configPath, backup, { spaces: 2 });
    console.log('✅ Restored config from backup');

    // Remove projects/default/ if it exists
    const defaultProjectPath = path.join(
      projectRoot,
      '.specweave/docs/internal/projects/default'
    );

    if (await fs.pathExists(defaultProjectPath)) {
      await fs.remove(defaultProjectPath);
      console.log('🗑️  Removed projects/default/');
    }

    // Restore specs.old/ to specs/
    const oldSpecsBackupPath = path.join(
      projectRoot,
      '.specweave/docs/internal/specs.old'
    );

    const specsPath = path.join(
      projectRoot,
      '.specweave/docs/internal/specs'
    );

    if (await fs.pathExists(oldSpecsBackupPath)) {
      await fs.move(oldSpecsBackupPath, specsPath, { overwrite: true });
      console.log('✅ Restored specs/ from specs.old/');
    }

    console.log('\n✅ Rollback complete!');
  } catch (error) {
    console.error(`❌ Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
