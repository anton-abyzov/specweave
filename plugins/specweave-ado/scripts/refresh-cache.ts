#!/usr/bin/env node

/**
 * refresh-cache.ts - Azure DevOps Plugin Cache Refresh
 *
 * Clears and refreshes ADO sync cache to prevent stale data issues
 *
 * Usage:
 *   /specweave-ado:refresh-cache
 */

import { existsSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';

export async function refreshAdoCache(projectRoot: string = process.cwd()): Promise<void> {
  const cacheDir = join(projectRoot, '.specweave', 'cache', 'ado');

  if (!existsSync(cacheDir)) {
    console.log('✅ No ADO cache found');
    return;
  }

  console.log('🧹 Clearing ADO cache...');

  const files = readdirSync(cacheDir);
  let cleared = 0;

  for (const file of files) {
    const filePath = join(cacheDir, file);
    unlinkSync(filePath);
    cleared++;
  }

  console.log(`✅ Cleared ${cleared} cache files`);
}

// CLI entry
if (require.main === module) {
  refreshAdoCache().catch(console.error);
}
