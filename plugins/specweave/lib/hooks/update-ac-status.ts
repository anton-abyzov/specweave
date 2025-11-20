#!/usr/bin/env node

/**
 * AC Status Update Hook (ACStatusManager Integration)
 *
 * Uses ACStatusManager for sophisticated AC status synchronization:
 * - Tracks completion percentage per AC (only updates at 100%)
 * - Detects conflicts (AC checked but tasks incomplete)
 * - Warns about orphaned ACs (no implementing tasks)
 * - Provides detailed sync result with diff
 * - Atomic file writes to prevent corruption
 *
 * Flow:
 * 1. Parse tasks.md → Map AC-IDs to completion status
 * 2. Parse spec.md → Extract current AC definitions
 * 3. Compare task completion vs spec checkboxes
 * 4. Update spec.md only for 100% complete ACs
 * 5. Log conflicts, warnings, and changes
 *
 * Called by: plugins/specweave/hooks/post-task-completion.sh
 *
 * Example:
 * - Tasks: T-001 [x], T-002 [x] (both have AC-US1-01) → AC-US1-01 100% complete
 * - spec.md: - [ ] AC-US1-01 → - [x] AC-US1-01 ✅
 * - Tasks: T-003 [x], T-004 [ ] (both have AC-US1-02) → AC-US1-02 50% complete
 * - spec.md: - [ ] AC-US1-02 → NO CHANGE (partial completion)
 */

import { ACStatusManager } from '../vendor/core/increment/ac-status-manager.js';

/**
 * Main entry point - uses ACStatusManager for sophisticated sync
 */
async function updateACStatus(incrementId: string): Promise<void> {
  try {
    const projectRoot = process.cwd();

    // Check if --skip-ac-sync flag is set (allows disabling hook temporarily)
    if (process.env.SKIP_AC_SYNC === 'true') {
      console.log('ℹ️  AC sync skipped (SKIP_AC_SYNC=true)');
      return;
    }

    console.log(`🔄 Syncing AC status for increment ${incrementId}...`);

    // Initialize ACStatusManager with project root
    const manager = new ACStatusManager(projectRoot);

    // Perform sophisticated sync
    const result = await manager.syncACStatus(incrementId);

    // Display results
    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((warning: string) => console.log(`   ${warning}`));
    }

    if (result.conflicts && result.conflicts.length > 0) {
      console.log('\n⚠️  Conflicts detected:');
      result.conflicts.forEach((conflict: string) => console.log(`   ${conflict}`));
    }

    if (result.updated && result.updated.length > 0) {
      console.log('\n✅ Updated AC checkboxes:');
      result.updated.forEach((acId: string) => console.log(`   ${acId} → [x]`));

      if (result.changes && result.changes.length > 0) {
        console.log('\n📝 Changes:');
        result.changes.forEach((change: string) => console.log(`   ${change}`));
      }
    } else if (result.synced) {
      console.log('✅ All ACs already in sync (no changes needed)');
    } else {
      console.log('ℹ️  No AC updates needed');
    }

  } catch (error) {
    console.error('❌ Error updating AC status:', error);
    // Non-blocking: Don't throw, just log
  }
}

// CLI Entry Point (ES Module)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const incrementId = process.argv[2];

  if (!incrementId) {
    console.error('Usage: node update-ac-status.js <increment-id>');
    console.error('Example: node update-ac-status.js 0039-ultra-smart-next-command');
    process.exit(1);
  }

  updateACStatus(incrementId)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
