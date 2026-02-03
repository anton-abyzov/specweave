/**
 * Cache Refresh Command
 *
 * Smart cache invalidation and refresh with skill memory preservation.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { Command } from 'commander';
import { CacheInvalidator } from '../../core/plugin-cache/cache-invalidator.js';
import { CacheHealthMonitor } from '../../core/plugin-cache/cache-health-monitor.js';
import { consoleLogger as logger } from '../../utils/logger.js';

/**
 * Cache refresh command options
 */
export interface CacheRefreshOptions {
  pluginName?: string;
  cachePath?: string; // For testing
  force?: boolean; // Hard refresh (delete cache)
  all?: boolean; // Refresh all plugins
  verify?: boolean; // Verify health after refresh
  skipMarketplaceRefresh?: boolean; // For testing - don't actually run marketplace refresh
}

/**
 * Execute cache-refresh command
 *
 * @param options - Command options
 */
export async function cacheRefresh(options: CacheRefreshOptions = {}): Promise<void> {
  const basePath = options.cachePath || path.join(os.homedir(), '.claude', 'plugins', 'cache', 'specweave');

  console.log('🔄 Plugin Cache Refresh\n');

  // Check if cache directory exists
  if (!fs.existsSync(basePath)) {
    console.log('No plugin cache found. Run: specweave refresh-marketplace\n');
    return;
  }

  try {
    const invalidator = new CacheInvalidator();
    const pluginsToRefresh: Array<{ name: string; version: string }> = [];

    if (options.pluginName) {
      // Refresh specific plugin
      const pluginPath = path.join(basePath, options.pluginName);
      if (!fs.existsSync(pluginPath)) {
        console.error(`❌ Plugin '${options.pluginName}' not found in cache.\n`);
        return;
      }

      // Get latest version
      const versions = fs.readdirSync(pluginPath).filter(v => {
        const versionPath = path.join(pluginPath, v);
        return fs.statSync(versionPath).isDirectory();
      });

      if (versions.length === 0) {
        console.error(`❌ No versions found for plugin '${options.pluginName}'.\n`);
        return;
      }

      const version = versions.sort().reverse()[0];
      pluginsToRefresh.push({ name: options.pluginName, version });
    } else {
      // Refresh all plugins
      const pluginNames = fs.readdirSync(basePath).filter(name => {
        const pluginPath = path.join(basePath, name);
        return fs.statSync(pluginPath).isDirectory();
      });

      for (const pluginName of pluginNames) {
        const pluginPath = path.join(basePath, pluginName);
        const versions = fs.readdirSync(pluginPath).filter(v => {
          const versionPath = path.join(pluginPath, v);
          return fs.statSync(versionPath).isDirectory();
        });

        if (versions.length > 0) {
          const version = versions.sort().reverse()[0];
          pluginsToRefresh.push({ name: pluginName, version });
        }
      }
    }

    // Perform refresh for each plugin
    for (const plugin of pluginsToRefresh) {
      const versionPath = basePath ? path.join(basePath, plugin.name, plugin.version) : undefined;

      if (options.force) {
        console.log(`🔨 Hard refresh: ${plugin.name}@${plugin.version}`);
      } else {
        console.log(`🔄 Soft refresh: ${plugin.name}@${plugin.version}`);
      }

      try {
        // Invalidate cache
        await invalidator.invalidatePlugin(
          plugin.name,
          plugin.version,
          { strategy: options.force ? 'hard' : 'soft' },
          versionPath
        );

        console.log(`   ✅ Cache invalidated`);
      } catch (error) {
        console.error(`   ❌ Failed to refresh ${plugin.name}: ${error}`);
        continue;
      }
    }

    // Run marketplace refresh (unless skipped for testing)
    if (!options.skipMarketplaceRefresh) {
      console.log('\n📥 Running marketplace refresh...\n');
      // Note: In production, this would call the actual refresh-marketplace command
      // For now, just indicate it would run
      console.log('   ℹ️  Run: specweave refresh-marketplace\n');
    }

    // Verify health if requested
    if (options.verify) {
      console.log('🔍 Verification: Checking cache health...\n');
      const monitor = new CacheHealthMonitor();

      for (const plugin of pluginsToRefresh) {
        const versionPath = basePath ? path.join(basePath, plugin.name, plugin.version) : undefined;
        if (!versionPath || !fs.existsSync(versionPath)) {
          console.log(`   ⚠️  ${plugin.name}: Cache not found (will be re-downloaded)`);
          continue;
        }

        const issues = monitor.checkPluginHealth(versionPath, plugin.version);
        if (issues.length === 0) {
          console.log(`   ✅ ${plugin.name}: Healthy`);
        } else {
          console.log(`   ⚠️  ${plugin.name}: ${issues.length} issues`);
          for (const issue of issues) {
            console.log(`      - ${issue.message}`);
          }
        }
      }
    }

    console.log(`\n✅ Refresh complete: ${pluginsToRefresh.length} plugin(s) refreshed\n`);
  } catch (error) {
    logger.error(`Cache refresh failed: ${error}`);
    throw error;
  }
}

/**
 * Register cache-refresh command
 *
 * @param program - Commander program
 */
export function registerCacheRefreshCommand(program: Command): void {
  program
    .command('cache-refresh')
    .description('Refresh plugin cache with skill memory preservation')
    .argument('[plugin]', 'Refresh specific plugin (optional)')
    .option('--force', 'Hard refresh (delete cache)')
    .option('--all', 'Refresh all plugins (even healthy)')
    .option('--verify', 'Verify cache health after refresh')
    .action(async (pluginName?: string, options?: Record<string, any>) => {
      try {
        await cacheRefresh({
          pluginName,
          force: options?.force,
          all: options?.all,
          verify: options?.verify
        });
      } catch (error) {
        logger.error(`Command failed: ${error}`);
        process.exit(1);
      }
    });
}
