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

// Import for GitHub sync (uses SyncCoordinator directly)
// NOTE: Import from project root dist (not relative path)
import { SyncCoordinator } from '../../../../dist/src/sync/sync-coordinator.js';
import { consoleLogger } from '../vendor/utils/logger.js';

// Import US completion orchestrator (NEW in v0.25.0+)
import { syncCompletedUserStories } from './us-completion-orchestrator.js';

// Import auto-transition (NEW in v0.35.0+ - CRITICAL for preventing auto-completion bug)
import { checkAndTransitionToReadyForReview } from '../vendor/core/increment/status-auto-transition.js';

// ============================================================================
// WRAPPER: UPDATE AC STATUS
// ============================================================================
// Note: update-ac-status.js doesn't export a function, it only has CLI logic
// So we replicate the core logic here using ACStatusManager
async function updateACStatus(incrementId) {
  try {
    console.log(`\n🔄 [3/6] Syncing AC status for increment ${incrementId}...`);

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
// WRAPPER: GITHUB SYNC
// ============================================================================
async function syncGitHub(incrementId) {
  try {
    console.log(`\n🔗 [5/6] Syncing to GitHub...`);

    const projectRoot = process.cwd();

    const coordinator = new SyncCoordinator({
      projectRoot,
      incrementId,
      logger: consoleLogger
    });

    const result = await coordinator.syncIncrementCompletion();

    if (result.success) {
      console.log(`✅ GitHub sync completed (${result.userStoriesSynced} user stories synced)`);
    } else {
      console.warn(`⚠️  GitHub sync had errors (see logs)`);
    }

    return { success: result.success, result };
  } catch (error) {
    console.error('❌ Error syncing to GitHub:', error.message);
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
    // OPERATION 0 (v0.35.0+ - CRITICAL): Check for ACTIVE → READY_FOR_REVIEW transition
    // This MUST run FIRST to prevent the auto-completion bug!
    // When all tasks are done, increment transitions to READY_FOR_REVIEW (not COMPLETED).
    // Only /specweave:done can then transition to COMPLETED with user approval.
    console.log('\n📋 [0/6] Checking for status auto-transition...');
    try {
      const transitionResult = checkAndTransitionToReadyForReview(incrementId);
      if (transitionResult.transitioned) {
        console.log(`\n🎉 ${transitionResult.message}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 INCREMENT READY FOR REVIEW');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Status: ACTIVE → READY_FOR_REVIEW`);
        console.log(`   Tasks: ${transitionResult.taskStatus?.completedTasks}/${transitionResult.taskStatus?.totalTasks} completed`);
        console.log('');
        console.log('   To close this increment, run:');
        console.log(`   /specweave:done ${incrementId}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } else {
        console.log(`   ${transitionResult.message}`);
      }
      results.autoTransition = { success: true, ...transitionResult };
    } catch (error) {
      console.error('❌ Error checking auto-transition:', error.message);
      results.autoTransition = { success: false, error: error.message };
    }

    // OPERATION 1: Update tasks.md (uses imported function)
    console.log('\n🔄 [1/6] Updating tasks.md...');
    try {
      await updateTasksMd(incrementId);
      results.updateTasks = { success: true };
    } catch (error) {
      console.error('❌ Error updating tasks.md:', error.message);
      results.updateTasks = { success: false, error: error.message };
    }

    // OPERATION 2: Sync living docs (uses imported function)
    console.log('\n📚 [2/6] Syncing living docs...');
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
    console.log('\n🌐 [4/6] Checking translation needs...');
    try {
      await translateLivingDocs(incrementId);
      results.translate = { success: true };
    } catch (error) {
      console.error('❌ Error translating docs:', error.message);
      results.translate = { success: false, error: error.message };
    }

    // OPERATION 5: Detect and sync newly completed user stories (NEW in v0.25.0+)
    // CRITICAL: This operation runs AFTER AC sync to ensure ACs are up-to-date
    // When a user story becomes fully complete (all ACs satisfied), this:
    // - Detects the completion
    // - Updates living docs
    // - Triggers external tool sync (GitHub/JIRA/ADO)
    try {
      results.usCompletion = await syncCompletedUserStories(incrementId);
    } catch (error) {
      console.error('❌ Error detecting completed user stories:', error.message);
      results.usCompletion = { success: false, error: error.message };
    }

    // OPERATION 6: Sync to GitHub (NEW in v0.24.0+)
    // FIX (v0.26.0): Skip GitHub sync in post-task-completion hook!
    // WHY: GitHub sync should ONLY run on increment COMPLETION, not task completion
    // This prevents 27 duplicate comments on every TodoWrite (see root cause analysis)
    //
    // GitHub sync is now ONLY triggered by:
    // - post-increment-completion.sh (when status → "completed")
    // - Manual sync via /specweave-github:sync command
    // - US completion orchestrator (OPERATION 5) when user stories complete
    //
    // See: .specweave/increments/0051-*/reports/GITHUB-COMMENT-RECURSION-ROOT-CAUSE-2025-11-24.md
    if (process.env.SKIP_GITHUB_SYNC === 'true') {
      console.log('\n⏭️  [6/6] GitHub sync SKIPPED (called from post-task-completion hook)');
      console.log('    GitHub sync will run automatically on increment completion.');
      results.syncGitHub = { success: true, skipped: true };
    } else {
      try {
        results.syncGitHub = await syncGitHub(incrementId);
      } catch (error) {
        console.error('❌ Error syncing to GitHub:', error.message);
        results.syncGitHub = { success: false, error: error.message };
      }
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
