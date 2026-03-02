#!/usr/bin/env node

/**
 * refresh-cache.ts - JIRA Plugin Cache Refresh
 *
 * Clears and refreshes JIRA sync cache to prevent stale data issues
 *
 * Usage:
 *   /specweave-jira:refresh-cache
 */

import { existsSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';

export async function refreshJiraCache(projectRoot: string = process.cwd()): Promise<void> {
  const cacheDir = join(projectRoot, '.specweave', 'cache', 'jira');

  if (!existsSync(cacheDir)) {
    console.log('✅ No JIRA cache found');
    return;
  }

  console.log('🧹 Clearing JIRA cache...');

  const files = readdirSync(cacheDir);
  let cleared = 0;

  for (const file of files) {
    const filePath = join(cacheDir, file);
    unlinkSync(filePath);
    cleared++;
  }

  console.log(`✅ Cleared ${cleared} cache files`);
}

// CLI entry (ESM-compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  refreshJiraCache().catch(console.error);
}
