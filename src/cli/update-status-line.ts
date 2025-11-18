#!/usr/bin/env node
/**
 * Update Status Line CLI
 *
 * Force-updates status line cache synchronously.
 *
 * Usage:
 *   node dist/src/cli/update-status-line.js
 *   node dist/src/cli/update-status-line.js /path/to/project
 *
 * Exit Codes:
 *   0 - Success (cache updated)
 *   1 - Error (cache update failed)
 */

import { StatusLineUpdater } from '../core/status-line/status-line-updater.js';

async function main() {
  // Get project root from args or default to cwd
  const projectRoot = process.argv[2] || process.cwd();

  try {
    const updater = new StatusLineUpdater(projectRoot);
    await updater.update();

    // Get updated cache to show user-friendly output
    const cache = await updater.getCurrentCache();

    if (!cache || !cache.current) {
      // No active increments - show default state message
      console.log('ℹ️  No active increments');
      console.log('   Start new work with: /specweave:increment "feature name"');
    } else {
      // Active increment exists - show progress
      console.log('✅ Status line updated');
      console.log(`   Current increment: ${cache.current.id} (${cache.current.completed}/${cache.current.total} tasks, ${cache.current.percentage}%)`);
      console.log(`   Open increments: ${cache.openCount}`);
    }

    process.exit(0);
  } catch (error) {
    // Error output
    console.error('❌ Failed to update status line:', error);
    process.exit(1);
  }
}

main();
