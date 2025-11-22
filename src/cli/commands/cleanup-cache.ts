/**
 * cleanup-cache - Delete old or all caches
 *
 * Usage:
 *   specweave cleanup-cache --older-than 7d
 *   specweave cleanup-cache --all
 */

import { CacheManager } from '../../core/cache/cache-manager.js';
import chalk from 'chalk';

export interface CleanupCacheOptions {
  olderThan?: string; // e.g., "7d", "14d", "30d"
  all?: boolean;
  logger?: any;
}

export async function cleanupCache(options: CleanupCacheOptions = {}): Promise<void> {
  const projectRoot = process.cwd();
  const cacheManager = new CacheManager(projectRoot, { logger: options.logger });

  console.log(chalk.blue('\n🧹 Cleaning up caches...\n'));

  if (options.all) {
    // Delete all caches
    await cacheManager.clearAll();
    console.log(chalk.green('✅ All caches deleted\n'));
    return;
  }

  if (options.olderThan) {
    // Parse age (e.g., "7d" → 7 days in milliseconds)
    const age = parseAge(options.olderThan);
    const deletedCount = await cacheManager.deleteOlderThan(age);

    console.log(chalk.green(`✅ Deleted ${deletedCount} old cache files\n`));
    return;
  }

  // Show stats by default
  const stats = await cacheManager.getStats();

  console.log(chalk.bold('Cache Statistics:'));
  console.log(`  Total files: ${stats.totalFiles}`);
  console.log(`  Total size: ${formatBytes(stats.totalSize)}`);

  if (stats.oldestCache) {
    console.log(`  Oldest cache: ${stats.oldestCache} (${stats.oldestCacheAge?.toFixed(1)}h old)`);
  }

  console.log(chalk.bold('\n  By provider:'));
  for (const [provider, data] of Object.entries(stats.providers)) {
    console.log(`    ${provider}: ${data.files} files (${formatBytes(data.size)})`);
  }

  console.log(chalk.gray('\n💡 Use --older-than 7d to delete old caches'));
  console.log(chalk.gray('💡 Use --all to delete all caches\n'));
}

function parseAge(age: string): number {
  const match = age.match(/^(\d+)([dhm])$/);

  if (!match) {
    throw new Error('Invalid age format. Use: 7d, 14d, 30d, 24h, etc.');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
  };

  return value * multipliers[unit];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
