#!/usr/bin/env node
/**
 * Consolidated Sync Hook
 *
 * PERFORMANCE OPTIMIZATION (v0.24.4):
 * =====================================
 * This script consolidates ALL post-task-completion operations into a SINGLE
 * Node.js process instead of spawning 5-6 separate processes.
 *
 * BEFORE (v0.24.3):
 * - Spawn 1: update-tasks-md.js       (10KB)
 * - Spawn 2: sync-living-docs.js      (18KB)
 * - Spawn 3: update-ac-status.js      (2KB)
 * - Spawn 4: translate-living-docs.js (4.4KB)
 * - Spawn 5: run-self-reflection.js   (4.1KB - conditional)
 * Total: 5-6 Node.js processes per TodoWrite
 *
 * AFTER (v0.24.4):
 * - Spawn 1: consolidated-sync.js (runs all operations sequentially)
 * Total: 1 Node.js process per TodoWrite
 *
 * IMPACT:
 * - 83% reduction in process spawning overhead
 * - Faster execution (shared Node.js context)
 * - Better error handling (single error boundary)
 * - Reduced system resource usage
 *
 * ROOT CAUSE ADDRESSED:
 * Multiple rapid TodoWrite calls were spawning 12+ concurrent Node.js processes,
 * causing process exhaustion and Claude Code crashes. This consolidation prevents
 * that by limiting to 1 process per hook fire.
 *
 * See: .specweave/increments/0051-automatic-github-sync/reports/HOOK-CRASH-ANALYSIS.md
 * ADR: (pending - will be created after testing)
 */

// Import REAL implementations from existing modules
import { updateTasksMd } from './update-tasks-md.js';
import { syncLivingDocs } from './sync-living-docs.js';
import { translateLivingDocs } from './translate-living-docs.js';

// Import for AC status (uses ACStatusManager directly)
import { ACStatusManager } from '../vendor/core/increment/ac-status-manager.js';

// ============================================================================
// WRAPPER: UPDATE AC STATUS
// ============================================================================
// Note: update-ac-status.js doesn't export a function, it only has CLI logic
// So we replicate the core logic here using ACStatusManager
async function updateACStatus(incrementId) {
  try {
    console.log(`\n🔄 [3/5] Syncing AC status for increment ${incrementId}...`);

    const projectRoot = process.cwd();

    if (process.env.SKIP_AC_SYNC === 'true') {
      console.log('ℹ️  AC sync skipped (SKIP_AC_SYNC=true)');
      return { success: true, message: 'Sync skipped' };
    }

    const manager = new ACStatusManager(projectRoot);
    const result = await manager.syncACStatus(incrementId);

    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((warning) => console.log(`   ${warning}`));
    }

    if (result.conflicts && result.conflicts.length > 0) {
      console.log('\n⚠️  Conflicts detected:');
      result.conflicts.forEach((conflict) => console.log(`   ${conflict}`));
    }

    if (result.updated && result.updated.length > 0) {
      console.log('\n✅ Updated AC checkboxes:');
      result.updated.forEach((acId) => console.log(`   ${acId} → [x]`));
    } else if (result.synced) {
      console.log('✅ All ACs already in sync (no changes needed)');
    } else {
      console.log('ℹ️  No AC updates needed');
    }

    return { success: true, result };
  } catch (error) {
    console.error('❌ Error updating AC status:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function runConsolidatedSync(incrementId) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 CONSOLIDATED SYNC: ${incrementId}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const startTime = Date.now();
  const results = {};

  try {
    // OPERATION 1: Update tasks.md (uses imported function)
    console.log('\n🔄 [1/4] Updating tasks.md...');
    try {
      await updateTasksMd(incrementId);
      results.updateTasks = { success: true };
    } catch (error) {
      console.error('❌ Error updating tasks.md:', error.message);
      results.updateTasks = { success: false, error: error.message };
    }

    // OPERATION 2: Sync living docs (uses imported function)
    console.log('\n📚 [2/4] Syncing living docs...');
    try {
      await syncLivingDocs(incrementId);
      results.syncDocs = { success: true };
    } catch (error) {
      console.error('❌ Error syncing living docs:', error.message);
      results.syncDocs = { success: false, error: error.message };
    }

    // OPERATION 3: Update AC status (uses local wrapper)
    try {
      results.updateAC = await updateACStatus(incrementId);
    } catch (error) {
      console.error('❌ Error updating AC status:', error.message);
      results.updateAC = { success: false, error: error.message };
    }

    // OPERATION 4: Translate living docs (uses imported function)
    console.log('\n🌐 [4/4] Checking translation needs...');
    try {
      await translateLivingDocs(incrementId);
      results.translate = { success: true };
    } catch (error) {
      console.error('❌ Error translating docs:', error.message);
      results.translate = { success: false, error: error.message };
    }

    const duration = Date.now() - startTime;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ CONSOLIDATED SYNC COMPLETED in ${duration}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Summary of results
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    console.log(`📊 Results: ${successCount}/${totalCount} operations successful`);

    // Check for any failures (non-blocking - we tolerate partial failures)
    const failures = Object.entries(results).filter(([_, result]) => !result.success);
    if (failures.length > 0) {
      console.warn('\n⚠️  Some operations had issues (non-blocking):');
      failures.forEach(([op, result]) => {
        console.warn(`   ${op}: ${result.error || 'Unknown error'}`);
      });
    }

    // Always exit 0 to prevent hook failures from blocking Claude Code
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FATAL ERROR in consolidated sync:', error);
    // Even on fatal error, exit 0 to prevent blocking Claude Code
    process.exit(0);
  }
}

// CLI Interface
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const incrementId = process.argv[2];

  if (!incrementId) {
    console.error('Usage: node consolidated-sync.js <increment-id>');
    console.error('Example: node consolidated-sync.js 0051-automatic-github-sync');
    process.exit(1);
  }

  runConsolidatedSync(incrementId);
}

export { runConsolidatedSync };
