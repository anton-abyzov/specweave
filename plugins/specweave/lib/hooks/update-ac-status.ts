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
 * - **NEW v1.0.68**: Auto-syncs AC checkboxes to GitHub issues
 *
 * Flow:
 * 1. Parse tasks.md → Map AC-IDs to completion status
 * 2. Parse spec.md → Extract current AC definitions
 * 3. Compare task completion vs spec checkboxes
 * 4. Update spec.md only for 100% complete ACs
 * 5. Log conflicts, warnings, and changes
 * 6. **NEW**: Sync updated ACs to linked GitHub issues
 *
 * Called by: plugins/specweave/hooks/post-task-completion.sh
 *
 * Example:
 * - Tasks: T-001 [x], T-002 [x] (both have AC-US1-01) → AC-US1-01 100% complete
 * - spec.md: - [ ] AC-US1-01 → - [x] AC-US1-01 ✅
 * - GitHub issue: - [ ] **AC-US1-01** → - [x] **AC-US1-01** 🔗
 * - Tasks: T-003 [x], T-004 [ ] (both have AC-US1-02) → AC-US1-02 50% complete
 * - spec.md: - [ ] AC-US1-02 → NO CHANGE (partial completion)
 */

import { ACStatusManager } from '../vendor/core/increment/ac-status-manager.js';
import { SyncCoordinator } from '../../../../dist/src/sync/sync-coordinator.js';
import { consoleLogger } from '../vendor/utils/logger.js';
import { readFileSync, existsSync } from 'fs';
import * as path from 'path';

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

      // NEW v1.0.68: Auto-sync AC checkboxes to GitHub issues
      await syncACsToGitHub(projectRoot, incrementId);
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

/**
 * Sync AC checkboxes to GitHub issues (v1.0.68)
 *
 * CRITICAL FIX: Previously, AC completion only updated spec.md locally.
 * GitHub issues were NOT updated until manual /sw:sync-progress was run.
 * This fixes issue #966 by auto-syncing to GitHub after AC updates.
 *
 * @param projectRoot - Project root directory
 * @param incrementId - Increment ID
 */
async function syncACsToGitHub(projectRoot: string, incrementId: string): Promise<void> {
  try {
    // Check if GitHub sync is enabled in config
    const configPath = path.join(projectRoot, '.specweave/config.json');
    if (!existsSync(configPath)) {
      console.log('ℹ️  No config.json found, skipping GitHub sync');
      return;
    }

    const configContent = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Check for GitHub sync enabled
    const isGitHubEnabled =
      config.sync?.github?.enabled ||
      (config.sync?.profiles && Object.values(config.sync.profiles).some(
        (p: any) => p?.provider === 'github'
      )) ||
      config.sync?.provider === 'github';

    if (!isGitHubEnabled) {
      console.log('ℹ️  GitHub sync not enabled, skipping');
      return;
    }

    // Check if external sync is allowed
    const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems !== false;
    if (!canUpdateExternal) {
      console.log('ℹ️  canUpdateExternalItems=false, skipping GitHub sync');
      return;
    }

    console.log('\n🔗 Syncing AC checkboxes to GitHub...');

    // Use SyncCoordinator for GitHub sync
    const coordinator = new SyncCoordinator({
      projectRoot,
      incrementId,
      logger: consoleLogger
    });

    const syncResult = await coordinator.syncACCheckboxesToGitHub(config, {
      addComment: false // Don't add comment on every AC update (prevent spam)
    });

    if (syncResult.success && syncResult.updated > 0) {
      console.log(`   ✅ Updated ${syncResult.updated} AC(s) in GitHub issues`);
      if (syncResult.issues.length > 0) {
        console.log(`   📝 Issues updated: ${syncResult.issues.join(', ')}`);
      }
    } else if (syncResult.success) {
      console.log('   ℹ️  No GitHub updates needed');
    } else {
      console.log('   ⚠️  GitHub sync had errors (non-blocking)');
    }

  } catch (error: any) {
    // Non-blocking: Log but don't fail the hook
    console.log(`   ⚠️  GitHub sync failed: ${error.message}`);
    // Continue - local AC sync already succeeded
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
