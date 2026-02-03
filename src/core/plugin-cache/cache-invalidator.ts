/**
 * Cache Invalidator
 *
 * Smart cache invalidation strategies for plugin cache management.
 * Skill memories are stored in CLAUDE.md and .specweave/skill-memories/ (project level),
 * NOT in the plugin cache - so no backup/restore needed here.
 *
 * @module core/plugin-cache/cache-invalidator
 */

import fs from 'fs';
import path from 'path';
import { InvalidationOptions } from './types.js';
import { CacheMetadataManager } from './cache-metadata.js';
import { consoleLogger as logger } from '../../utils/logger.js';

/**
 * Handles cache invalidation for plugins
 */
export class CacheInvalidator {
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
      await this.softInvalidate(actualCachePath);
    } else {
      await this.hardInvalidate(actualCachePath);
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
   * Hard invalidation: delete cache directory
   */
  private async hardInvalidate(cachePath: string): Promise<void> {
    try {
      if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true });
        logger.info(`Hard invalidation: deleted ${cachePath}`);
      }
    } catch (error) {
      logger.error(`Hard invalidation failed: ${error}`);
      throw error;
    }
  }
}
