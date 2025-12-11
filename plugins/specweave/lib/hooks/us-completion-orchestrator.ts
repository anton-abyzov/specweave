#!/usr/bin/env node
/**
 * User Story Completion Orchestrator (v0.26.1 - Throttle Integration)
 *
 * Orchestrates the sync cascade when user stories become complete:
 * 1. Detect newly completed user stories (all ACs satisfied)
 * 2. Update living docs for completed USs
 * 3. Trigger external tool sync (GitHub/JIRA/ADO)
 *
 * CRITICAL: This is the bridge between AC-level completion and US-level sync.
 * Called by consolidated-sync.js after AC sync completes.
 *
 * Architecture (v0.26.1 Changes):
 * - Uses USCompletionDetector to find newly completed USs
 * - Uses LivingDocsSync to update living docs (which triggers external tools)
 * - **NEW**: Uses USSyncThrottle to prevent spam (60s window)
 * - Non-blocking: Errors logged but don't break workflow
 *
 * Integration:
 * - Called from consolidated-sync.js (OPERATION 6)
 * - Runs after AC sync (ensures ACs are up-to-date)
 * - ~~Skipped if SKIP_US_SYNC=true (REMOVED in v0.26.1)~~
 * - **NEW**: Throttled to once per 60 seconds per increment
 *
 * Safety:
 * - fs.writeFile() verified to NOT trigger Claude Code hooks (test confirmed)
 * - SKIP_EXTERNAL_SYNC still guards actual external tool sync
 * - Throttle prevents rapid sync spam
 * - Circuit breaker active at hook level
 *
 * See:
 * - FS-WRITEFILE-HOOK-TEST-RESULTS-2025-11-24.md (test results)
 * - ADR-0129: US Sync Guard Rails (long-term fix strategy)
 * - src/core/us-sync-throttle.ts (throttle implementation)
 */

// Import REAL implementations
import { USCompletionDetector } from '../../../../dist/src/core/us-completion-detector.js';
import { LivingDocsSync } from '../../../../dist/src/core/living-docs/living-docs-sync.js';
import { USSyncThrottle } from '../../../../dist/src/core/us-sync-throttle.js';
import { consoleLogger } from '../vendor/utils/logger.js';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';

/**
 * Trigger post-user-story-complete hook for external tool updates
 *
 * This bridges the orchestrator to the shell hook that handles:
 * - GitHub issue closure with completion comment
 * - JIRA story transition (if implemented)
 * - ADO work item completion (if implemented)
 *
 * @param incrementId - Increment ID (e.g., "0059-context-optimization")
 * @param usId - User story ID (e.g., "US-003")
 * @param projectRoot - Project root path
 */
async function triggerUserStoryCompleteHook(
  incrementId: string,
  usId: string,
  projectRoot: string
): Promise<void> {
  // Find the hook in multiple possible locations
  const hookPaths = [
    path.join(projectRoot, 'plugins/specweave/hooks/post-user-story-complete.sh'),
    path.join(projectRoot, '.claude/hooks/post-user-story-complete.sh'),
  ];

  let hookPath: string | null = null;
  for (const p of hookPaths) {
    if (existsSync(p)) {
      hookPath = p;
      break;
    }
  }

  if (!hookPath) {
    console.log(`   ℹ️  post-user-story-complete.sh hook not found (skipping external sync)`);
    return;
  }

  return new Promise((resolve, reject) => {
    // Call hook with spec-id and user-story-id as arguments
    const hookProcess = spawn('bash', [hookPath, incrementId, usId], {
      cwd: projectRoot,
      env: {
        ...process.env,
        SPECWEAVE_INCREMENT_ID: incrementId,
        SPECWEAVE_USER_STORY_ID: usId,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    hookProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    hookProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    hookProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Hook exited with code ${code}: ${stderr || stdout}`));
      }
    });

    hookProcess.on('error', (error) => {
      reject(new Error(`Hook spawn failed: ${error.message}`));
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      hookProcess.kill('SIGTERM');
      reject(new Error('Hook timed out after 30s'));
    }, 30000);
  });
}

export interface USSyncResult {
  success: boolean;
  newlyCompleted?: Array<{
    usId: string;
    title: string;
    totalACs: number;
    completedACs: number;
  }>;
  syncResult?: any;
  message: string;
  skipped?: boolean;
  throttled?: boolean;
  error?: string;
}

/**
 * Detect and sync newly completed user stories
 *
 * v0.26.1: Now includes smart throttling (60s window) to prevent spam
 *
 * @param incrementId - Increment ID (e.g., "0053-safe-feature-deletion")
 * @returns Result object with success status and sync details
 */
export async function syncCompletedUserStories(incrementId: string): Promise<USSyncResult> {
  try {
    console.log(`\n🎯 [6/6] Detecting completed user stories for ${incrementId}...`);

    const projectRoot = process.cwd();

    // ========================================================================
    // THROTTLE CHECK (v0.26.1 - NEW!)
    // ========================================================================
    // Prevent spam: Limit US sync to once per 60 seconds per increment
    // Rationale:
    // - Rapid task completions (10 in 5s) → 10 US sync attempts
    // - Without throttle: 100+ GitHub API calls (rate limit risk)
    // - With throttle: 1 US sync, 9 throttled (10 GitHub calls)
    //
    // Safety:
    // - fs.writeFile() confirmed to NOT trigger hooks (no infinite loop risk)
    // - SKIP_EXTERNAL_SYNC still guards external tool sync layer
    // - Users can manually sync if needed: /sw:sync-progress
    //
    // Trade-off:
    // - Potential 60s delay for US completion visibility
    // - Acceptable for UX (tasks complete immediately, US sync deferred)

    const throttle = USSyncThrottle.getInstance({ projectRoot });

    if (throttle.shouldSkipSync(incrementId)) {
      const timeSinceLastSync = throttle.getTimeSinceLastSync(incrementId);
      const secondsRemaining = Math.ceil((60000 - timeSinceLastSync) / 1000);

      console.log(`⏭️  US sync throttled (last sync ${Math.floor(timeSinceLastSync / 1000)}s ago)`);
      console.log(`   ℹ️  Sync will be available in ${secondsRemaining}s`);
      console.log(`   💡 Manual sync: /sw:sync-progress ${incrementId}`);

      return {
        success: true,
        message: 'Sync throttled',
        throttled: true,
        skipped: true
      };
    }

    // 1. Initialize US completion detector
    const detector = new USCompletionDetector(projectRoot, {
      logger: consoleLogger
    });

    // 2. Detect newly completed user stories
    const newlyCompleted = await detector.getNewlyCompletedUSs(incrementId);

    if (newlyCompleted.length === 0) {
      console.log('✅ No newly completed user stories detected (no sync needed)');

      return {
        success: true,
        newlyCompleted: [],
        message: 'No new completions'
      };
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

      // ========================================================================
      // EXTERNAL TOOL SYNC: Close issues for completed user stories (v0.26.15)
      // ========================================================================
      // livingDocsSync.syncIncrement() updates CONTENT but doesn't CLOSE issues.
      // We need to explicitly trigger post-user-story-complete hook for each US.
      //
      // Flow:
      // 1. For each newly completed US
      // 2. Call post-user-story-complete.sh with spec-id and us-id
      // 3. Hook handles: find issue, add completion comment, close issue
      //
      // Gate checks happen inside the hook based on config flags.

      console.log(`\n📡 Triggering external tool updates for ${newlyCompleted.length} completed user stories...`);

      for (const us of newlyCompleted) {
        try {
          await triggerUserStoryCompleteHook(incrementId, us.usId, projectRoot);
          console.log(`   ✅ ${us.usId}: External tool updated`);
        } catch (hookError: any) {
          // Non-blocking: Log but continue with next US
          console.warn(`   ⚠️  ${us.usId}: Hook failed (${hookError.message})`);
        }
      }

      // Record successful sync for throttling
      throttle.recordSync(incrementId);
      console.log(`   ⏱️  Throttle recorded (next sync allowed in 60s)`);
    } else {
      console.warn(`⚠️  Living docs sync had errors (see logs)`);
      console.warn(`   Errors: ${syncResult.errors.join(', ')}`);

      // Don't record sync on failure (allow immediate retry)
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

  } catch (error: any) {
    // Non-blocking: Log error but don't break workflow
    console.error('❌ Error in US completion orchestrator:', error.message);

    return {
      success: false,
      error: error.message,
      message: 'Orchestrator error'
    };
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
        if (result.throttled) {
          console.log('   (Throttled - no sync performed)');
        }
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
