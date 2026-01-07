/**
 * Cache Metadata Manager
 *
 * Manages plugin cache metadata files for version tracking and validation.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { CacheMetadata } from './types.js';
import { consoleLogger as logger } from '../../utils/logger.js';

/**
 * Manages cache metadata operations
 */
export class CacheMetadataManager {
  private static readonly METADATA_FILENAME = '.cache-metadata.json';

  /**
   * Read metadata from plugin cache directory
   *
   * @param pluginPath - Absolute path to plugin version directory
   * @returns Metadata object or null if invalid/missing
   */
  readMetadata(pluginPath: string): CacheMetadata | null {
    const metadataPath = path.join(pluginPath, CacheMetadataManager.METADATA_FILENAME);

    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(content) as CacheMetadata;

      // Validate required fields
      if (
        !metadata.pluginName ||
        !metadata.version ||
        !metadata.commitSha ||
        !metadata.lastUpdated ||
        !metadata.checksums
      ) {
        logger.warn(`Invalid metadata file at ${metadataPath}: missing required fields`);
        return null;
      }

      return metadata;
    } catch (error) {
      logger.warn(`Failed to read metadata from ${metadataPath}: ${error}`);
      return null;
    }
  }

  /**
   * Write metadata to plugin cache directory
   *
   * @param pluginPath - Absolute path to plugin version directory
   * @param metadata - Metadata to write
   */
  writeMetadata(pluginPath: string, metadata: CacheMetadata): void {
    // Ensure directory exists
    if (!fs.existsSync(pluginPath)) {
      fs.mkdirSync(pluginPath, { recursive: true });
    }

    const metadataPath = path.join(pluginPath, CacheMetadataManager.METADATA_FILENAME);

    try {
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      logger.debug(`Wrote cache metadata to ${metadataPath}`);
    } catch (error) {
      logger.error(`Failed to write metadata to ${metadataPath}:`, error);
      throw error;
    }
  }

  /**
   * Get plugin cache path
   *
   * Resolves the cache directory path for a given plugin and version.
   *
   * @param pluginName - Plugin name (e.g., "sw", "sw-github")
   * @param version - Plugin version (e.g., "1.0.0")
   * @returns Absolute path to plugin cache directory
   */
  static getPluginCachePath(pluginName: string, version: string): string {
    return path.join(
      os.homedir(),
      '.claude',
      'plugins',
      'cache',
      'specweave',
      pluginName,
      version
    );
  }

  /**
   * Compute SHA256 checksum for a file
   *
   * @param filePath - Absolute path to file
   * @returns SHA256 hash in hexadecimal format (64 characters)
   */
  computeChecksum(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  }

  /**
   * Generate metadata for a plugin cache directory
   *
   * Recursively scans the directory and computes checksums for all files.
   *
   * @param pluginPath - Absolute path to plugin version directory
   * @param pluginName - Plugin name
   * @param version - Plugin version
   * @param commitSha - Git commit SHA
   * @returns Generated metadata
   */
  generateMetadata(
    pluginPath: string,
    pluginName: string,
    version: string,
    commitSha: string
  ): CacheMetadata {
    const checksums: Record<string, string> = {};

    // Recursively scan directory
    const scanDirectory = (dir: string, relativeTo: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(relativeTo, fullPath);

        // Skip metadata file itself
        if (entry.name === CacheMetadataManager.METADATA_FILENAME) {
          continue;
        }

        if (entry.isDirectory()) {
          scanDirectory(fullPath, relativeTo);
        } else if (entry.isFile()) {
          try {
            checksums[relativePath] = this.computeChecksum(fullPath);
          } catch (error) {
            logger.warn(`Failed to compute checksum for ${relativePath}: ${error}`);
          }
        }
      }
    };

    if (fs.existsSync(pluginPath)) {
      scanDirectory(pluginPath, pluginPath);
    }

    return {
      pluginName,
      version,
      commitSha,
      lastUpdated: new Date().toISOString(),
      checksums
    };
  }
}
