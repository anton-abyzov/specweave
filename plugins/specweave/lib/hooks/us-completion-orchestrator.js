#!/usr/bin/env node
/**
 * User Story Completion Orchestrator
 *
 * Orchestrates the sync cascade when user stories become complete:
 * 1. Detect newly completed user stories (all ACs satisfied)
 * 2. Update living docs for completed USs
 * 3. Trigger external tool sync (GitHub/JIRA/ADO)
 *
 * CRITICAL: This is the bridge between AC-level completion and US-level sync.
 * Called by consolidated-sync.js after AC sync completes.
 *
 * Architecture:
 * - Uses USCompletionDetector to find newly completed USs
 * - Uses LivingDocsSync to update living docs (which triggers external tools)
 * - Non-blocking: Errors logged but don't break workflow
 *
 * Integration:
 * - Called from consolidated-sync.js (OPERATION 6)
 * - Runs after AC sync (ensures ACs are up-to-date)
 * - Skipped if SKIP_US_SYNC=true (performance optimization)
 */

// Import REAL implementations
import { USCompletionDetector } from '../../../../dist/src/core/us-completion-detector.js';
import { LivingDocsSync } from '../../../../dist/src/core/living-docs/living-docs-sync.js';
import { consoleLogger } from '../vendor/utils/logger.js';

/**
 * Detect and sync newly completed user stories
 *
 * @param incrementId - Increment ID (e.g., "0053-safe-feature-deletion")
 * @returns Result object with success status and sync details
 */
export async function syncCompletedUserStories(incrementId) {
  try {
    console.log(`\n🎯 [6/6] Detecting completed user stories for ${incrementId}...`);

    const projectRoot = process.cwd();

    // Skip if disabled (performance optimization)
    if (process.env.SKIP_US_SYNC === 'true') {
      console.log('ℹ️  User story sync skipped (SKIP_US_SYNC=true)');
      return { success: true, message: 'Sync skipped', skipped: true };
    }

    // 1. Initialize US completion detector
    const detector = new USCompletionDetector(projectRoot, {
      logger: consoleLogger
    });

    // 2. Detect newly completed user stories
    const newlyCompleted = await detector.getNewlyCompletedUSs(incrementId);

    if (newlyCompleted.length === 0) {
      console.log('✅ No newly completed user stories detected (no sync needed)');
      return { success: true, newlyCompleted: [], message: 'No new completions' };
    }

    console.log(`\n🎉 DETECTED ${newlyCompleted.length} NEWLY COMPLETED USER STORIES:`);
    for (const us of newlyCompleted) {
      console.log(`   ${us.usId}: ${us.title} (${us.completedACs}/${us.totalACs} ACs complete)`);
    }

    // 3. Save completion state (mark USs as complete to prevent re-sync)
    const allCompletions = await detector.detectCompletions(incrementId);
    await detector.saveCompletionState(incrementId, allCompletions);

    // 4. Trigger living docs sync (which will sync to external tools)
    console.log(`\n📚 Syncing living docs for ${incrementId}...`);

    const livingDocsSync = new LivingDocsSync(projectRoot, {
      logger: consoleLogger
    });

    const syncResult = await livingDocsSync.syncIncrement(incrementId);

    if (syncResult.success) {
      console.log(`✅ Living docs synced successfully`);
      console.log(`   Feature: ${syncResult.featureId}`);
      console.log(`   Files updated: ${syncResult.filesCreated.length + syncResult.filesUpdated.length}`);

      // External tool sync happens automatically inside livingDocsSync.syncIncrement()
      // It calls syncToExternalTools() which handles GitHub/JIRA/ADO
      console.log(`\n📡 External tool sync completed (GitHub/JIRA/ADO updated if configured)`);
    } else {
      console.warn(`⚠️  Living docs sync had errors (see logs)`);
      console.warn(`   Errors: ${syncResult.errors.join(', ')}`);
    }

    return {
      success: true,
      newlyCompleted: newlyCompleted.map(us => ({
        usId: us.usId,
        title: us.title,
        totalACs: us.totalACs,
        completedACs: us.completedACs
      })),
      syncResult,
      message: `${newlyCompleted.length} user stories synced`
    };

  } catch (error) {
    // Non-blocking: Log error but don't break workflow
    console.error('❌ Error in US completion orchestrator:', error.message);
    return { success: false, error: error.message };
  }
}

// CLI Interface (for manual testing)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const incrementId = process.argv[2];

  if (!incrementId) {
    console.error('Usage: node us-completion-orchestrator.js <increment-id>');
    console.error('Example: node us-completion-orchestrator.js 0053-safe-feature-deletion');
    process.exit(1);
  }

  syncCompletedUserStories(incrementId)
    .then(result => {
      if (result.success) {
        console.log('\n✅ US completion orchestration completed successfully');
        process.exit(0);
      } else {
        console.error('\n❌ US completion orchestration failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}
