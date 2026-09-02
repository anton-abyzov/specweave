/**
 * Sync Gaps CLI Command
 *
 * Detects increments with partial external sync coverage.
 * Optionally attempts missing syncs with --fix.
 *
 * Usage: specweave sync-gaps [--json] [--fix]
 *
 * @module cli/commands/sync-gaps
 */

import * as fs from 'fs';
import * as path from 'path';
import { consoleLogger as logger } from '../../utils/logger.js';

export interface SyncGapItem {
  incrementId: string;
  syncedProviders: string[];
  missingProviders: string[];
  lastSyncTimestamp?: string;
}

export interface SyncGapsOptions {
  json?: boolean;
  fix?: boolean;
}

export interface SyncGapsResult {
  gaps: SyncGapItem[];
  fixed: number;
  exitCode: number;
}

export async function syncGapsCommand(
  projectRoot: string,
  options: SyncGapsOptions = {},
  deps?: {
    fixFn?: (incrementId: string, provider: string) => Promise<void>;
  },
): Promise<SyncGapsResult> {
  const gaps = await detectSyncGaps(projectRoot);
  const result: SyncGapsResult = { gaps, fixed: 0, exitCode: gaps.length > 0 ? 1 : 0 };

  if (gaps.length === 0) {
    if (options.json) {
      logger.log('[]');
    } else {
      logger.log('No sync gaps detected. All increments are fully synced.');
    }
    return result;
  }

  if (options.json) {
    logger.log(JSON.stringify(gaps, null, 2));
    return result;
  }

  logger.log(`Found ${gaps.length} increment(s) with partial sync coverage:\n`);
  for (const gap of gaps) {
    logger.log(`  ${gap.incrementId}`);
    logger.log(`    Synced:  ${gap.syncedProviders.join(', ') || 'none'}`);
    logger.log(`    Missing: ${gap.missingProviders.join(', ')}`);
    if (gap.lastSyncTimestamp) {
      logger.log(`    Last activity: ${gap.lastSyncTimestamp}`);
    }
    logger.log('');
  }

  if (options.fix && deps?.fixFn) {
    logger.log('Attempting to fix sync gaps...\n');
    for (const gap of gaps) {
      for (const provider of gap.missingProviders) {
        try {
          await deps.fixFn(gap.incrementId, provider);
          result.fixed++;
          logger.log(`  [ok] ${gap.incrementId} → ${provider}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.log(`  [fail] ${gap.incrementId} → ${provider}: ${msg}`);
        }
      }
    }
    logger.log(`\nFixed ${result.fixed} of ${gaps.reduce((n, g) => n + g.missingProviders.length, 0)} missing syncs.`);
  } else if (options.fix) {
    logger.log('No sync function available — run with full SpecWeave context to fix gaps.');
  }

  return result;
}

export async function detectSyncGaps(projectRoot: string): Promise<SyncGapItem[]> {
  const gaps: SyncGapItem[] = [];

  // Read config to find configured providers
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  let config: any;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return [];
  }

  const configuredProviders = new Set<string>();
  if (config.hooks?.post_increment_done?.sync_to_github_project) configuredProviders.add('github');
  if (config.hooks?.post_increment_done?.close_github_issue) configuredProviders.add('github');
  if (config.sync?.github) configuredProviders.add('github');
  if (config.sync?.jira) configuredProviders.add('jira');
  if (config.sync?.ado) configuredProviders.add('ado');

  if (configuredProviders.size === 0) return [];

  // Scan increments
  const incBase = path.join(projectRoot, '.specweave', 'increments');
  let entries: string[];
  try {
    entries = fs.readdirSync(incBase);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const metaPath = path.join(incBase, entry, 'metadata.json');
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      if (meta.status !== 'active' && meta.status !== 'in-progress') continue;

      const syncedProviders = new Set<string>();
      if (meta.externalLinks?.github) syncedProviders.add('github');
      if (meta.externalLinks?.jira) syncedProviders.add('jira');
      if (meta.externalLinks?.ado) syncedProviders.add('ado');

      const missing = [...configuredProviders].filter((p) => !syncedProviders.has(p));
      if (missing.length > 0) {
        gaps.push({
          incrementId: meta.id || entry,
          syncedProviders: [...syncedProviders],
          missingProviders: missing,
          lastSyncTimestamp: meta.lastActivity || meta.created,
        });
      }
    } catch {
      // Skip unreadable metadata
    }
  }

  return gaps;
}
