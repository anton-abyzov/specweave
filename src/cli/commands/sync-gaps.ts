/**
 * Sync Gaps CLI Command
 *
 * Detects increments with partial external sync coverage.
 * Optionally attempts missing syncs with --fix.
 *
 * Used by `specweave sync status` (partial-coverage report). [--json] [--fix]
 *
 * @module cli/commands/sync-gaps
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SyncGapItem {
  incrementId: string;
  syncedProviders: string[];
  missingProviders: string[];
  lastSyncTimestamp?: string;
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
