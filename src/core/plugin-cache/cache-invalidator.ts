/**
 * Cache Invalidator
 *
 * Smart cache invalidation strategies with skill memory preservation.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { InvalidationOptions } from './types.js';
import { CacheMetadataManager } from './cache-metadata.js';
import { consoleLogger as logger } from '../../utils/logger.js';

/**
 * Backup metadata interface
 */
interface BackupMetadata {
  pluginName: string;
  version: string;
  timestamp: string;
  fileCount: number;
  files: string[];
}

/**
 * Handles cache invalidation with backup/restore capabilities
 */
export class CacheInvalidator {
  private static readonly BACKUP_DIR = path.join(os.homedir(), '.specweave', 'backups');

  /**
   * Invalidate plugin cache with specified strategy
   *
   * @param pluginName - Plugin name (e.g., "sw")
   * @param version - Plugin version
   * @param options - Invalidation options
   * @param cachePath - Optional cache path override (for testing)
   */
  async invalidatePlugin(
    pluginName: string,
    version: string,
    options: InvalidationOptions,
    cachePath?: string
  ): Promise<void> {
    const actualCachePath = cachePath || CacheMetadataManager.getPluginCachePath(pluginName, version);

    if (!fs.existsSync(actualCachePath)) {
      logger.warn(`Cache path does not exist: ${actualCachePath}`);
      return;
    }

    if (options.strategy === 'soft') {
      // Soft invalidation: mark as stale in metadata
      await this.softInvalidate(actualCachePath);
    } else if (options.strategy === 'hard') {
      // Hard invalidation: backup, delete, restore memories
      await this.hardInvalidate(pluginName, version, actualCachePath, options);
    }
  }

  /**
   * Soft invalidation: mark cache as stale without deletion
   */
  private async softInvalidate(cachePath: string): Promise<void> {
    const metadataPath = path.join(cachePath, '.cache-metadata.json');

    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      metadata.stale = true;
      metadata.staleSince = new Date().toISOString();
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      logger.info(`Soft invalidation: marked ${cachePath} as stale`);
    }
  }

  /**
   * Hard invalidation: backup, delete cache, optionally restore memories
   */
  private async hardInvalidate(
    pluginName: string,
    version: string,
    cachePath: string,
    options: InvalidationOptions
  ): Promise<void> {
    let backupPath = '';

    try {
      // Backup first if requested
      if (options.backupFirst) {
        backupPath = await this.backupSkillMemories(pluginName, version, cachePath);

        if (backupPath && !(await this.validateBackup(backupPath, cachePath))) {
          throw new Error('Backup validation failed');
        }
      }

      // Delete cache directory
      if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true });
        logger.info(`Hard invalidation: deleted ${cachePath}`);
      }

      // Restore memories if requested
      if (options.preserveMemories && backupPath) {
        // Note: memories will be restored after marketplace refresh completes
        logger.info(`Skill memories backed up to: ${backupPath}`);
      }
    } catch (error) {
      logger.error(`Hard invalidation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Backup skill memories to backup directory
   *
   * @param pluginName - Plugin name
   * @param version - Plugin version
   * @param cachePath - Optional cache path override (for testing)
   * @returns Path to backup directory, or empty string if no memories exist
   */
  async backupSkillMemories(pluginName: string, version: string, cachePath?: string): Promise<string> {
    const actualCachePath = cachePath || CacheMetadataManager.getPluginCachePath(pluginName, version);
    const skillsPath = path.join(actualCachePath, 'skills');

    if (!fs.existsSync(skillsPath)) {
      logger.info(`No skill memories to backup for ${pluginName}@${version}`);
      return '';
    }

    // Create backup directory with timestamp (YYYY-MM-DD-HHMMSS format)
    const now = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHMMSS
    const timestamp = `${date}-${time}`;
    const backupPath = path.join(
      CacheInvalidator.BACKUP_DIR,
      `${pluginName}-${version}-${timestamp}`
    );

    try {
      fs.mkdirSync(backupPath, { recursive: true });

      // Copy all skill memory files
      const files = fs.readdirSync(skillsPath, { recursive: true });
      let fileCount = 0;

      for (const file of files) {
        if (typeof file !== 'string') continue;

        const sourcePath = path.join(skillsPath, file);
        const destPath = path.join(backupPath, file);

        if (fs.statSync(sourcePath).isFile()) {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.copyFileSync(sourcePath, destPath);
          fileCount++;
        }
      }

      // Write backup metadata
      const metadata: BackupMetadata = {
        pluginName,
        version,
        timestamp: new Date().toISOString(),
        fileCount,
        files: files.filter(f => typeof f === 'string') as string[]
      };

      fs.writeFileSync(
        path.join(backupPath, '.backup-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      logger.info(`Backed up ${fileCount} skill memory files to ${backupPath}`);
      return backupPath;
    } catch (error) {
      logger.error(`Backup failed: ${error}`);
      throw error;
    }
  }

  /**
   * Restore skill memories from backup
   *
   * @param backupPath - Path to backup directory
   * @param cachePath - Destination cache path
   */
  async restoreSkillMemories(backupPath: string, cachePath: string): Promise<void> {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup path does not exist: ${backupPath}`);
    }

    const skillsPath = path.join(cachePath, 'skills');
    fs.mkdirSync(skillsPath, { recursive: true });

    try {
      const files = fs.readdirSync(backupPath, { recursive: true });

      for (const file of files) {
        if (typeof file !== 'string') continue;
        if (file === '.backup-metadata.json') continue;

        const sourcePath = path.join(backupPath, file);
        const destPath = path.join(skillsPath, file);

        if (fs.statSync(sourcePath).isFile()) {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });

          // Merge with existing if file already exists
          if (fs.existsSync(destPath)) {
            // For now, keep existing file (don't overwrite)
            logger.info(`Skipping ${file} (already exists in cache)`);
          } else {
            fs.copyFileSync(sourcePath, destPath);
          }
        }
      }

      logger.info(`Restored skill memories from ${backupPath}`);
    } catch (error) {
      logger.error(`Restore failed: ${error}`);
      throw error;
    }
  }

  /**
   * Validate backup completeness
   *
   * @param backupPath - Path to backup
   * @param cachePath - Original cache path
   * @returns True if backup is valid
   */
  async validateBackup(backupPath: string, cachePath: string): Promise<boolean> {
    if (!fs.existsSync(backupPath)) {
      return false;
    }

    try {
      const metadataPath = path.join(backupPath, '.backup-metadata.json');
      if (!fs.existsSync(metadataPath)) {
        return false;
      }

      const metadata: BackupMetadata = JSON.parse(
        fs.readFileSync(metadataPath, 'utf8')
      );

      // Check if all files from backup metadata exist
      for (const file of metadata.files) {
        const backupFilePath = path.join(backupPath, file);
        if (!fs.existsSync(backupFilePath) && !file.includes('.backup-metadata.json')) {
          logger.warn(`Missing file in backup: ${file}`);
          return false;
        }
      }

      // Check if backup is complete (all current cache files are in backup)
      const skillsPath = path.join(cachePath, 'skills');
      if (fs.existsSync(skillsPath)) {
        // Get all current files in cache
        const currentFiles = fs.readdirSync(skillsPath, { recursive: true })
          .filter(f => typeof f === 'string' && fs.statSync(path.join(skillsPath, f as string)).isFile()) as string[];

        // Check if all current files exist in backup metadata
        for (const file of currentFiles) {
          if (!metadata.files.includes(file)) {
            logger.warn(`File ${file} exists in cache but not in backup`);
            return false;
          }
        }

        // Check if file contents match
        for (const file of metadata.files) {
          const originalPath = path.join(skillsPath, file);
          const backupFilePath = path.join(backupPath, file);

          if (fs.existsSync(originalPath) && fs.existsSync(backupFilePath)) {
            const originalContent = fs.readFileSync(originalPath, 'utf8');
            const backupContent = fs.readFileSync(backupFilePath, 'utf8');

            if (originalContent !== backupContent) {
              logger.warn(`Content mismatch for ${file}`);
              return false;
            }
          }
        }
      }

      return true;
    } catch (error) {
      logger.error(`Backup validation failed: ${error}`);
      return false;
    }
  }

  /**
   * Get backup metadata
   *
   * @param backupPath - Path to backup
   * @returns Backup metadata
   */
  async getBackupMetadata(backupPath: string): Promise<BackupMetadata> {
    const metadataPath = path.join(backupPath, '.backup-metadata.json');

    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Backup metadata not found: ${metadataPath}`);
    }

    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  }
}
