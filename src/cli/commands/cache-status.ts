/**
 * Cache Status Command
 *
 * Display plugin cache health with fix suggestions.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { Command } from 'commander';
import { CacheMetadataManager } from '../../core/plugin-cache/cache-metadata.js';
import { CacheHealthMonitor } from '../../core/plugin-cache/cache-health-monitor.js';
import { GitHubVersionDetector } from '../../core/plugin-cache/github-version-detector.js';
import { consoleLogger as logger } from '../../utils/logger.js';
import type { CacheHealthIssue } from '../../core/plugin-cache/types.js';

/**
 * Cache status command options
 */
export interface CacheStatusOptions {
  pluginName?: string;
  cachePath?: string; // For testing
  verbose?: boolean;
  checkGithub?: boolean;
  fix?: boolean;
}

/**
 * Plugin health summary
 */
interface PluginHealthSummary {
  name: string;
  version: string;
  status: 'healthy' | 'critical' | 'stale';
  issues: CacheHealthIssue[];
  staleness?: {
    cacheCommit: string;
    githubCommit?: string;
    age: number; // days
  };
}

/**
 * Execute cache-status command
 *
 * @param options - Command options
 */
export async function cacheStatus(options: CacheStatusOptions = {}): Promise<void> {
  const basePath = options.cachePath || path.join(os.homedir(), '.claude', 'plugins', 'cache', 'specweave');

  console.log('🔍 Plugin Cache Health Check\n');

  // Check if cache directory exists
  if (!fs.existsSync(basePath)) {
    console.log('No plugin cache found.');
    console.log('Run: specweave refresh-marketplace\n');
    return;
  }

  try {
    const summaries: PluginHealthSummary[] = [];

    if (options.pluginName) {
      // Check specific plugin
      const summary = await checkPlugin(basePath, options.pluginName, options);
      if (summary) {
        summaries.push(summary);
      } else {
        console.error(`❌ Plugin '${options.pluginName}' not found in cache.\n`);
        return;
      }
    } else {
      // Check all plugins
      const pluginNames = fs.readdirSync(basePath).filter(name => {
        const pluginPath = path.join(basePath, name);
        return fs.statSync(pluginPath).isDirectory();
      });

      for (const pluginName of pluginNames) {
        const summary = await checkPlugin(basePath, pluginName, options);
        if (summary) {
          summaries.push(summary);
        }
      }
    }

    // Display results
    displayResults(summaries, options);

  } catch (error) {
    logger.error(`Cache status check failed: ${error}`);
    throw error;
  }
}

/**
 * Check health of a single plugin
 *
 * @param basePath - Base cache directory
 * @param pluginName - Plugin name
 * @param options - Command options
 * @returns Plugin health summary or null if not found
 */
async function checkPlugin(
  basePath: string,
  pluginName: string,
  options: CacheStatusOptions
): Promise<PluginHealthSummary | null> {
  // Find latest version
  const pluginPath = path.join(basePath, pluginName);
  if (!fs.existsSync(pluginPath)) {
    return null;
  }

  const versions = fs.readdirSync(pluginPath).filter(v => {
    const versionPath = path.join(pluginPath, v);
    return fs.statSync(versionPath).isDirectory();
  });

  if (versions.length === 0) {
    return null;
  }

  // Use latest version (sorted descending)
  const version = versions.sort().reverse()[0];
  const versionPath = path.join(pluginPath, version);

  // Read metadata
  const metadataManager = new CacheMetadataManager();
  const metadata = metadataManager.readMetadata(versionPath);

  if (!metadata) {
    logger.warn(`No metadata found for ${pluginName}@${version}`);
    return {
      name: pluginName,
      version,
      status: 'critical',
      issues: [{
        severity: 'critical',
        type: 'missing_file',
        file: '.cache-metadata.json',
        message: 'Missing cache metadata',
        suggestion: `specweave cache-refresh ${pluginName} --force`
      }]
    };
  }

  // Run health checks
  const healthMonitor = new CacheHealthMonitor();
  const issues = healthMonitor.checkPluginHealth(versionPath, version);

  // Determine status
  let status: 'healthy' | 'critical' | 'stale' = 'healthy';
  if (issues.some(i => i.severity === 'critical')) {
    status = 'critical';
  } else if (issues.length > 0) {
    status = 'stale';
  }

  // Check GitHub staleness if requested
  let staleness: PluginHealthSummary['staleness'] | undefined;
  if (options.checkGithub && metadata) {
    const detector = new GitHubVersionDetector();
    try {
      const result = await detector.checkStaleness(metadata, versionPath);
      if (result.stale && result.cacheCommit && result.githubCommit) {
        staleness = {
          cacheCommit: result.cacheCommit,
          githubCommit: result.githubCommit,
          age: Math.floor((Date.now() - new Date(metadata.lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
        };
        if (status === 'healthy') {
          status = 'stale';
        }
      }
    } catch (error) {
      logger.debug(`GitHub check failed for ${pluginName}: ${error}`);
    }
  }

  return {
    name: pluginName,
    version,
    status,
    issues,
    staleness
  };
}

/**
 * Display health check results
 *
 * @param summaries - Plugin health summaries
 * @param options - Command options
 */
function displayResults(summaries: PluginHealthSummary[], options: CacheStatusOptions): void {
  if (summaries.length === 0) {
    console.log('No plugins found in cache.\n');
    return;
  }

  // Group by status
  const healthy = summaries.filter(s => s.status === 'healthy');
  const critical = summaries.filter(s => s.status === 'critical');
  const stale = summaries.filter(s => s.status === 'stale');

  // Display healthy plugins
  for (const summary of healthy) {
    console.log(`✅ ${summary.name} (${summary.version}) - Healthy`);
    if (options.verbose && summary.staleness) {
      console.log(`   Cache commit: ${summary.staleness.cacheCommit}`);
      console.log(`   Last updated: ${summary.staleness.age} days ago`);
    }
  }

  // Display critical issues
  for (const summary of critical) {
    console.log(`❌ ${summary.name} (${summary.version}) - Critical Issues\n`);
    for (const issue of summary.issues) {
      console.log(`   Issue: ${issue.message}`);
      console.log(`   File: ${issue.file}`);
      if (options.verbose && issue.type === 'merge_conflict') {
        // Show line number if available (would need to parse file)
        console.log(`   Type: Merge conflict`);
      }
      console.log(`   → Run: ${issue.suggestion}\n`);
    }
  }

  // Display stale plugins
  for (const summary of stale) {
    console.log(`⚠️  ${summary.name} (${summary.version}) - Stale`);
    if (summary.staleness) {
      console.log(`   Latest GitHub commit: ${summary.staleness.githubCommit}`);
      console.log(`   Cached commit: ${summary.staleness.cacheCommit}`);
      console.log(`   Age: ${summary.staleness.age} days`);
      console.log(`   → Run: specweave cache-refresh ${summary.name}\n`);
    }
    if (summary.issues.length > 0 && options.verbose) {
      for (const issue of summary.issues) {
        console.log(`   - ${issue.message} (${issue.file})`);
      }
    }
  }

  // Summary
  console.log('─'.repeat(50));
  console.log(`Summary: ${healthy.length} healthy, ${critical.length} critical, ${stale.length} stale\n`);
}

/**
 * Register cache-status command
 *
 * @param program - Commander program
 */
export function registerCacheStatusCommand(program: Command): void {
  program
    .command('cache-status')
    .description('Display plugin cache health status')
    .argument('[plugin]', 'Check specific plugin (optional)')
    .option('--verbose', 'Show detailed information')
    .option('--check-github', 'Check GitHub for updates (uses API)')
    .option('--fix', 'Auto-fix issues (not implemented)')
    .action(async (pluginName?: string, options?: Record<string, any>) => {
      try {
        await cacheStatus({
          pluginName,
          verbose: options?.verbose,
          checkGithub: options?.checkGithub,
          fix: options?.fix
        });
      } catch (error) {
        logger.error(`Command failed: ${error}`);
        process.exit(1);
      }
    });
}
