#!/usr/bin/env tsx

/**
 * Test script for increment archiving functionality
 */

import { IncrementArchiver } from '../src/core/increment/increment-archiver.js';
import * as path from 'path';

// Simple logger
const logger = {
  error: (msg: string, error?: any) => console.error(`❌ ${msg}`, error || '')
};

async function testArchiving() {
  const rootDir = process.cwd();
  const archiver = new IncrementArchiver(rootDir);

  console.log('\n🧪 Testing Increment Archiver\n');

  // 1. Get current statistics
  console.log('📊 Current Statistics:');
  const stats = await archiver.getStats();
  console.log(`  Active increments: ${stats.active}`);
  console.log(`  Archived increments: ${stats.archived}`);
  console.log(`  Abandoned increments: ${stats.abandoned}`);
  console.log(`  Total archive size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Oldest active: ${stats.oldestActive}`);
  console.log(`  Newest archived: ${stats.newestArchived}\n`);

  // 2. List current increments
  console.log('📁 Current Active Increments:');
  const increments = await archiver['getIncrements']();
  increments.forEach(inc => console.log(`  - ${inc}`));
  console.log('');

  // 3. Dry run - see what would be archived
  console.log('🔍 Dry Run - Archive all but last 5:');
  const dryRunResult = await archiver.archive({
    keepLast: 5,
    dryRun: true
  });

  if (dryRunResult.archived.length > 0) {
    console.log('  Would archive:');
    dryRunResult.archived.forEach(inc => console.log(`    - ${inc}`));
  } else {
    console.log('  Nothing to archive (less than 5 increments or all are active/paused)');
  }

  if (dryRunResult.skipped.length > 0) {
    console.log('  Would skip:');
    dryRunResult.skipped.forEach(inc => console.log(`    - ${inc}`));
  }
  console.log('');

  // 4. Test specific increment archiving (dry run)
  console.log('🎯 Test Specific Increment Archive (dry run):');
  const specificResult = await archiver.archive({
    increments: ['0023'],
    dryRun: true
  });

  if (specificResult.archived.length > 0) {
    console.log(`  Would archive: ${specificResult.archived.join(', ')}`);
  } else {
    console.log('  Cannot archive 0023 (might be active or have external sync)');
  }
  console.log('');

  // 5. List archived increments
  console.log('🗄️  Already Archived Increments:');
  const archived = await archiver.listArchived();
  if (archived.length > 0) {
    // Show first 10 and last 5
    const toShow = archived.length > 15
      ? [...archived.slice(0, 10), '...', ...archived.slice(-5)]
      : archived;
    toShow.forEach(inc => console.log(`  - ${inc}`));
    console.log(`  Total: ${archived.length} increments`);
  } else {
    console.log('  No archived increments');
  }
  console.log('');

  // 6. Test age-based archiving (dry run)
  console.log('⏰ Test Age-Based Archive (>30 days, dry run):');
  const ageResult = await archiver.archive({
    olderThanDays: 30,
    dryRun: true
  });

  if (ageResult.archived.length > 0) {
    console.log('  Would archive (older than 30 days):');
    ageResult.archived.forEach(inc => console.log(`    - ${inc}`));
  } else {
    console.log('  No increments older than 30 days to archive');
  }
  console.log('');

  console.log('✅ Archive testing complete!\n');
  console.log('💡 To actually archive increments, remove the --dry-run flag');
  console.log('   Example: /specweave:archive-increments --keep-last 5\n');
}

// Run the test
testArchiving().catch(error => {
  logger.error('Test failed:', error);
  process.exit(1);
});