/**
 * cache - Dashboard cache management
 *
 * Usage:
 *   specweave cache --rebuild     # Rebuild dashboard cache
 *   specweave cache --status      # Show cache status
 *   specweave cache --clear       # Clear cache
 */

import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export interface CacheOptions {
  rebuild?: boolean;
  status?: boolean;
  clear?: boolean;
  quiet?: boolean;
  debug?: boolean;
}

export async function cacheCommand(options: CacheOptions = {}): Promise<void> {
  const projectRoot = process.cwd();
  const specweavePath = path.join(projectRoot, '.specweave');
  const cachePath = path.join(specweavePath, 'state', 'dashboard.json');
  const rebuildScript = path.join(projectRoot, 'plugins', 'specweave', 'scripts', 'rebuild-dashboard-cache.sh');

  // Check if SpecWeave project exists
  if (!fs.existsSync(specweavePath)) {
    console.log(chalk.yellow('\nNo SpecWeave project found in current directory.'));
    console.log(chalk.gray('Run `specweave init` to initialize a project.\n'));
    return;
  }

  // Handle --rebuild
  if (options.rebuild) {
    if (!fs.existsSync(rebuildScript)) {
      console.log(chalk.red('\n❌ Rebuild script not found.'));
      console.log(chalk.gray('Expected: plugins/specweave/scripts/rebuild-dashboard-cache.sh\n'));
      process.exit(1);
    }

    if (!options.quiet) {
      console.log(chalk.blue('\n🔄 Rebuilding dashboard cache...\n'));
    }

    try {
      const start = Date.now();
      execSync(`bash "${rebuildScript}"${options.quiet ? ' --quiet' : ''}`, {
        cwd: projectRoot,
        stdio: options.quiet ? 'pipe' : 'inherit',
      });
      const elapsed = Date.now() - start;

      if (!options.quiet) {
        console.log(chalk.green(`\n✅ Cache rebuilt successfully (${elapsed}ms)\n`));
      }
    } catch (error) {
      console.log(chalk.red('\n❌ Cache rebuild failed'));
      if (error instanceof Error) {
        console.log(chalk.gray(error.message));
      }
      process.exit(1);
    }
    return;
  }

  // Handle --clear
  if (options.clear) {
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
      console.log(chalk.green('\n✅ Dashboard cache cleared\n'));
    } else {
      console.log(chalk.yellow('\n⚠️  No cache to clear\n'));
    }
    return;
  }

  // Default: show status
  console.log(chalk.blue('\n📊 Dashboard Cache Status\n'));

  if (!fs.existsSync(cachePath)) {
    console.log(chalk.yellow('  Status: Not found'));
    console.log(chalk.gray('  Run: specweave cache --rebuild\n'));
    return;
  }

  // Read cache and show stats
  try {
    const cacheContent = fs.readFileSync(cachePath, 'utf-8');
    const cache = JSON.parse(cacheContent);
    const stats = fs.statSync(cachePath);
    const ageStr = formatTimeAgo(stats.mtimeMs);

    console.log(`  Status: ${chalk.green('Valid')}`);
    console.log(`  Version: ${cache.version || 'unknown'}`);
    console.log(`  Last Updated: ${ageStr}`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(1)} KB`);

    // Summary
    if (cache.summary) {
      console.log(chalk.bold('\n  Summary:'));
      console.log(`    Total increments: ${cache.summary.total || 0}`);
      console.log(`    Active: ${cache.summary.active || 0}`);
      console.log(`    Completed: ${cache.summary.completed || 0}`);
      console.log(`    Archived: ${cache.summary.archived || 0}`);
    }

    // Debug mode: show more details
    if (options.debug) {
      console.log(chalk.bold('\n  Debug Info:'));
      console.log(`    Cache file: ${cachePath}`);
      console.log(`    Created: ${cache.updatedAt || 'unknown'}`);
      console.log(`    Increments tracked: ${Object.keys(cache.increments || {}).length}`);
      if (cache.jobs) {
        console.log(`    Jobs: ${(cache.jobs.running?.length || 0)} running, ${cache.jobs.completedCount || 0} completed`);
      }
    }

    console.log(chalk.gray('\n  Use --rebuild to refresh cache'));
    console.log(chalk.gray('  Use --debug for more details\n'));

  } catch (error) {
    console.log(chalk.red('  Status: Corrupted (invalid JSON)'));
    console.log(chalk.gray('  Run: specweave cache --rebuild to fix\n'));
  }
}

/** Format time elapsed since timestamp */
function formatTimeAgo(timestampMs: number): string {
  const seconds = Math.floor((Date.now() - timestampMs) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`;
  return `${seconds}s ago`;
}
