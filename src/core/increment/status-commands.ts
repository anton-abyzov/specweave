/**
 * Status Command Utilities
 *
 * Helper functions for pause/resume/abandon/status commands
 * Used by slash commands and CLI
 * Part of increment 0007: Smart Status Management
 */

import chalk from 'chalk';
import { MetadataManager } from './metadata-manager.js';
import { IncrementStatus, IncrementType, computeTransitionPath, countsTowardWipLimit } from '../types/increment-metadata.js';
import { DisciplineChecker, buildWipNote } from './discipline-checker.js';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { resolveIncrementId } from '../../utils/resolve-increment-id.js';

/**
 * Expand a bare 4-digit id (`0001`) to the folder name (`0001-add-login`).
 *
 * The design says the bare id is accepted wherever an increment id is taken
 * (`specweave complete <NNNN>` spells it out); `pause`/`resume`/`abandon` used
 * to hand the short form straight to MetadataManager and die with
 * "Invalid increment ID format". Unknown / ambiguous ids are returned
 * unchanged so the caller still produces its own error.
 */
export function expandIncrementId(incrementId: string, projectRoot?: string): string {
  if (!incrementId) return incrementId;
  try {
    const resolved = resolveIncrementId(incrementId, projectRoot ?? resolveEffectiveRoot());
    return typeof resolved === 'string' ? resolved : incrementId;
  } catch {
    return incrementId;
  }
}

export interface PauseOptions {
  incrementId: string;
  reason?: string;
  force?: boolean;
}

export interface ResumeOptions {
  incrementId: string;
}

export interface AbandonOptions {
  incrementId: string;
  reason?: string;
  force?: boolean;
}

export interface StatusOptions {
  verbose?: boolean;
  type?: IncrementType;
}

/**
 * Pause an active increment
 */
export async function pauseIncrement(options: PauseOptions): Promise<void> {
  const { reason, force } = options;
  const incrementId = expandIncrementId(options.incrementId);

  console.log(chalk.blue(`\n⏸️  Pausing increment ${incrementId}...\n`));

  try {
    // Check if increment exists
    const metadata = MetadataManager.read(incrementId);

    // Validate can pause
    if (metadata.status === IncrementStatus.PAUSED) {
      if (!force) {
        console.log(chalk.yellow(`⚠️  Increment ${incrementId} is already paused`));
        console.log(chalk.gray(`   Previous reason: ${metadata.pausedReason}`));
        console.log(chalk.gray(`   Paused at: ${metadata.pausedAt}`));
        console.log(chalk.gray(`\n   Use --force to update the reason`));
        return;
      }
    } else if (metadata.status !== IncrementStatus.ACTIVE) {
      console.log(chalk.red(`❌ Cannot pause increment ${incrementId}`));
      console.log(chalk.gray(`   Current status: ${metadata.status}`));
      console.log(chalk.gray(`   Only active increments can be paused`));
      if (metadata.status === IncrementStatus.ABANDONED) {
        console.log(chalk.gray(`\n   💡 Resume it first: specweave resume ${incrementId}`));
      }
      process.exit(1);
    }

    // Prompt for reason if not provided
    const pauseReason = reason || 'No reason provided';

    // Update status
    MetadataManager.updateStatus(incrementId, IncrementStatus.PAUSED, pauseReason);

    // Success message
    console.log(chalk.green(`✅ Increment ${incrementId} paused`));
    console.log(chalk.gray(`📝 Reason: ${pauseReason}`));
    console.log(chalk.gray(`⏸️  No longer counts toward active limit`));
    console.log(chalk.gray(`\n💡 Resume with: specweave resume ${incrementId}\n`));

  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to pause increment: ${error instanceof Error ? error.message : String(error)}\n`));
    process.exit(1);
  }
}

/**
 * Resume a paused or abandoned increment
 */
export async function resumeIncrement(options: ResumeOptions): Promise<void> {
  const incrementId = expandIncrementId(options.incrementId);

  console.log(chalk.blue(`\n▶️  Resuming increment ${incrementId}...\n`));

  try {
    // Check if increment exists
    const metadata = MetadataManager.read(incrementId);

    // Validate can resume
    if (metadata.status === IncrementStatus.ACTIVE) {
      console.log(chalk.yellow(`⚠️  Increment ${incrementId} is already active`));
      console.log(chalk.gray(`   Nothing to resume\n`));
      return;
    }

    if (metadata.status === IncrementStatus.COMPLETED) {
      console.log(chalk.red(`❌ Cannot resume increment ${incrementId}`));
      console.log(chalk.gray(`   Status: completed`));
      console.log(chalk.gray(`   Completed increments cannot be resumed\n`));
      process.exit(1);
    }

    const RESUMABLE = [
      IncrementStatus.PAUSED,
      IncrementStatus.ABANDONED,
      // A never-started increment resumes too: `resume` is how the docs tell
      // you to get back to work, and refusing here left `planned` increments
      // with no CLI path to `active` at all.
      IncrementStatus.PLANNED,
      IncrementStatus.BACKLOG,
    ];
    if (!RESUMABLE.includes(metadata.status)) {
      console.log(chalk.red(`❌ Cannot resume increment ${incrementId}`));
      console.log(chalk.gray(`   Current status: ${metadata.status}`));
      console.log(chalk.gray(`   Resumable statuses: ${RESUMABLE.join(', ')}\n`));
      process.exit(1);
    }

    // Update status
    MetadataManager.updateStatus(incrementId, IncrementStatus.ACTIVE);

    // Success message
    console.log(chalk.green(`✅ Increment ${incrementId} resumed`));
    console.log(chalk.gray(`▶️  Now counts as active`));

    if (metadata.status === IncrementStatus.PAUSED) {
      console.log(chalk.gray(`📝 Was paused for: ${metadata.pausedReason}`));
    } else if (metadata.status === IncrementStatus.ABANDONED) {
      console.log(chalk.gray(`📝 Was abandoned for: ${metadata.abandonedReason}`));
    }

    console.log(chalk.gray(`\n💡 Continue work with: specweave task next ${incrementId}  (Claude Code: /sw:do)\n`));

  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to resume increment: ${error instanceof Error ? error.message : String(error)}\n`));
    process.exit(1);
  }
}

/**
 * Start an increment: `planned`/`backlog`/`paused` → `active`.
 *
 * The 2.0 loop resolves the single ACTIVE increment for `task`, `verify` and
 * `handoff`. `create-increment` already creates in `active`; this is the
 * explicit CLI transition for `--planned` (backlog) increments, for imported
 * ones, and for 1.x increments still carrying `planning`. Idempotent.
 */
export async function startIncrement(options: ResumeOptions): Promise<void> {
  const incrementId = expandIncrementId(options.incrementId);

  try {
    const metadata = MetadataManager.read(incrementId);

    if (metadata.status === IncrementStatus.ACTIVE) {
      console.log(chalk.gray(`Increment ${incrementId} is already active`));
      return;
    }

    const STARTABLE = [IncrementStatus.PLANNED, IncrementStatus.BACKLOG, IncrementStatus.PAUSED];
    if (!STARTABLE.includes(metadata.status)) {
      console.log(chalk.red(`❌ Cannot start increment ${incrementId}`));
      console.log(chalk.gray(`   Current status: ${metadata.status}`));
      console.log(chalk.gray(`   Startable statuses: ${STARTABLE.join(', ')}`));
      if (metadata.status === IncrementStatus.ABANDONED) {
        console.log(chalk.gray(`\n   💡 Bring it back first: specweave resume ${incrementId}`));
      }
      process.exit(1);
    }

    MetadataManager.updateStatus(incrementId, IncrementStatus.ACTIVE);
    console.log(chalk.green(`✅ Increment ${incrementId} started (${metadata.status} → active)`));
    console.log(chalk.gray(`\n💡 Next: specweave task next\n`));
  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to start increment: ${error instanceof Error ? error.message : String(error)}\n`));
    process.exit(1);
  }
}

/**
 * Abandon an increment
 */
export async function abandonIncrement(options: AbandonOptions): Promise<void> {
  const { reason, force } = options;
  const incrementId = expandIncrementId(options.incrementId);

  console.log(chalk.blue(`\n🗑️  Abandoning increment ${incrementId}...\n`));

  try {
    // Check if increment exists
    const metadata = MetadataManager.read(incrementId);

    // Validate can abandon
    if (metadata.status === IncrementStatus.ABANDONED) {
      if (!force) {
        console.log(chalk.yellow(`⚠️  Increment ${incrementId} is already abandoned`));
        console.log(chalk.gray(`   Previous reason: ${metadata.abandonedReason}`));
        console.log(chalk.gray(`   Abandoned at: ${metadata.abandonedAt}`));
        console.log(chalk.gray(`\n   Use --force to update the reason`));
        return;
      }
    } else if (metadata.status === IncrementStatus.COMPLETED) {
      console.log(chalk.red(`❌ Cannot abandon increment ${incrementId}`));
      console.log(chalk.gray(`   Status: completed`));
      console.log(chalk.gray(`   Completed increments cannot be abandoned\n`));
      process.exit(1);
    }

    // Prompt for reason if not provided
    const abandonReason = reason || 'No reason provided';

    // Confirmation (if not forced)
    if (!force) {
      console.log(chalk.yellow(`⚠️  WARNING: This will permanently abandon the increment`));
      console.log(chalk.gray(`   Reason: ${abandonReason}`));
      console.log(chalk.gray(`\n   Continue? Type 'yes' to confirm, or Ctrl+C to cancel\n`));

      // In a real implementation, would prompt for confirmation
      // For now, proceeding (assuming force or confirmation)
    }

    // Update status
    MetadataManager.updateStatus(incrementId, IncrementStatus.ABANDONED, abandonReason);

    // Success message
    console.log(chalk.green(`✅ Increment ${incrementId} abandoned`));
    console.log(chalk.gray(`📝 Reason: ${abandonReason}`));
    console.log(chalk.gray(`🗑️  No longer counts toward active limit`));
    console.log(chalk.gray(`\n💡 Can be resumed later with: specweave resume ${incrementId}\n`));

  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to abandon increment: ${error instanceof Error ? error.message : String(error)}\n`));
    process.exit(1);
  }
}

export interface CompleteOptions {
  incrementId: string;
  silent?: boolean;  // For auto mode - suppress output
  skipValidation?: boolean;  // DANGEROUS: Skip quality gates
  /** Close despite a missing/failing reports/verify.json (stored as metadata.closeReason). */
  reason?: string;
}

/**
 * Complete an active increment
 *
 * This transitions the increment to "completed" status, which triggers:
 * 1. StatusChangeSyncTrigger → External tool sync (GitHub/JIRA/ADO)
 * 2. Living docs update
 *
 * Quality gates (unless skipValidation=true):
 * - All tasks must be marked complete
 * - All ACs must be checked
 * - External tool drift check (warns if >24h, blocks if >7d)
 *
 * @since v4.0 - Auto mode stop hook integration
 */
export async function completeIncrement(options: CompleteOptions): Promise<boolean> {
  // Sync suppression must span the ENTIRE closure, not just the final
  // updateStatus() call. MetadataManager.updateStatus() fires the status-change
  // trigger from a floating async IIFE, so a flag toggled around that one call
  // is already back to `false` by the time the trigger actually looks at it —
  // which is why a single `complete` used to print "Auto-synced …" twice and
  // run the auto-close path from two places. onIncrementDone() is the single
  // sync point during completion.
  const { StatusChangeSyncTrigger } = await import('./status-change-sync-trigger.js');
  const previouslySuppressed = StatusChangeSyncTrigger.suppressForCompletion;
  StatusChangeSyncTrigger.suppressForCompletion = true;
  // Intermediate auto-walk transitions (planning → active → ready_for_review)
  // are bookkeeping, not milestones: their notices contradicted the
  // "completed!" line printed seconds later.
  const previouslySilentTransitions = MetadataManager.suppressTransitionNotices;
  MetadataManager.suppressTransitionNotices = true;
  try {
    return await runCompleteIncrement(options);
  } finally {
    StatusChangeSyncTrigger.suppressForCompletion = previouslySuppressed;
    MetadataManager.suppressTransitionNotices = previouslySilentTransitions;
  }
}

async function runCompleteIncrement(options: CompleteOptions): Promise<boolean> {
  const { silent = false, skipValidation = false } = options;
  const incrementId = expandIncrementId(options.incrementId);
  const closeReason = options.reason?.trim() || undefined;

  const log = (msg: string) => !silent && console.log(msg);

  log(chalk.blue(`\n✅ Completing increment ${incrementId}...\n`));

  try {
    // Check if increment exists
    const metadata = MetadataManager.read(incrementId);

    // Validate can complete
    if (metadata.status === IncrementStatus.COMPLETED) {
      log(chalk.yellow(`⚠️  Increment ${incrementId} is already completed`));
      return true;  // Not an error - already complete
    }

    // Compute transition path to COMPLETED (auto-walk intermediate states)
    const path = computeTransitionPath(metadata.status, IncrementStatus.COMPLETED);

    if (path === null || path.length === 0) {
      log(chalk.red(`❌ Cannot complete increment ${incrementId}`));
      log(chalk.gray(`   Current status: ${metadata.status}`));
      log(chalk.gray(`   No valid transition path to completed`));
      // Always log to stderr so auto/silent mode failures are visible
      process.stderr.write(`[completeIncrement] Cannot complete ${incrementId}: no valid transition from "${metadata.status}" to "completed"\n`);
      return false;
    }

    // Run quality gate validation unless skipped
    if (!skipValidation) {
      // Dynamic import to avoid circular dependency
      const { IncrementCompletionValidator } = await import('./completion-validator.js');
      const validation = await IncrementCompletionValidator.validateCompletion(incrementId, { reason: closeReason });

      if (!validation.isValid) {
        log(chalk.red(`❌ Increment ${incrementId} failed quality gates:\n`));
        validation.errors.forEach((err) => log(chalk.red(`   • ${err}`)));
        if (validation.warnings && validation.warnings.length > 0) {
          log(chalk.yellow(`\n⚠️  Warnings:\n`));
          validation.warnings.forEach((warn) => log(chalk.yellow(`   • ${warn}`)));
        }
        // Always log to stderr so auto/silent mode failures are visible
        process.stderr.write(`[completeIncrement] ${incrementId} failed quality gates: ${validation.errors.join('; ')}\n`);
        return false;
      }

      // A PASSING verify is a RESULT, not a warning. It used to be printed
      // under the "⚠️  Warnings (non-blocking)" header, so a clean close read
      // as three problems — the loudest of which was the gate that passed.
      if (validation.info && validation.info.length > 0) {
        log(chalk.gray(`\nℹ️  Checks:\n`));
        validation.info.forEach((line) => log(chalk.gray(`   • ${line}`)));
      }

      // Show warnings but continue
      if (validation.warnings && validation.warnings.length > 0) {
        log(chalk.yellow(`\n⚠️  Warnings (non-blocking):\n`));
        validation.warnings.forEach((warn) => log(chalk.yellow(`   • ${warn}`)));
      }
    } else {
      log(chalk.yellow(`⚠️  Validation skipped — reports/verify.json not checked`));
      log(chalk.gray(`   Run: specweave complete ${incrementId} --yes (without --skip-validation) for enforced closure`));
    }

    // Walk intermediate transitions (all states before the final COMPLETED)
    const intermediateSteps = path.slice(0, -1);
    for (const intermediateStatus of intermediateSteps) {
      log(chalk.gray(`   Transitioning: ${metadata.status} → ${intermediateStatus}`));
      try {
        MetadataManager.updateStatus(incrementId, intermediateStatus);
        Object.assign(metadata, MetadataManager.read(incrementId));
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        log(chalk.red(`❌ Failed during intermediate transition to ${intermediateStatus}`));
        log(chalk.gray(`   ${errMsg}`));
        process.stderr.write(`[completeIncrement] Failed transition ${incrementId} to "${intermediateStatus}": ${errMsg}\n`);
        return false;
      }
    }

    // Living docs sync is handled by LifecycleHookDispatcher.onIncrementDone()
    // after status is set to COMPLETED. Suppress StatusChangeSyncTrigger so
    // sync runs exactly once (via onIncrementDone, not twice).
    if (closeReason) {
      try {
        const current = MetadataManager.read(incrementId);
        MetadataManager.write(incrementId, { ...current, closeReason });
      } catch {
        // best-effort: never block closure on the audit field
      }
    }

    // Suppression is held for the whole of completeIncrement() (see above).
    MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);

    // Dispatch post-increment-done hooks (awaited, error-isolated)
    let hookSyncErrors: string[] = [];
    let hookSyncSuccess: string[] = [];
    try {
      const { LifecycleHookDispatcher } = await import(
        '../hooks/LifecycleHookDispatcher.js'
      );
      // `specweave complete` is an explicit user-invoked closure — the
      // closure hook runs inline (living docs → external close → retry drain).
      const hookResult = await LifecycleHookDispatcher.onIncrementDone(
        resolveEffectiveRoot(),
        incrementId,
      );
      hookSyncErrors = hookResult.syncErrors;
      hookSyncSuccess = hookResult.syncSuccess;
    } catch (hookError) {
      const msg = hookError instanceof Error ? hookError.message : String(hookError);
      hookSyncErrors.push(`Hook dispatch failed: ${msg}`);
      process.stderr.write(`[completeIncrement] Post-closure hook error: ${msg}\n`);
    }

    // Direct GitHub issue closure from metadata.
    // Reads issue numbers from metadata.json (populated by the lifecycle hook above)
    // and closes any that are still open. Does NOT re-trigger sync — just closes.
    let ghClosed = 0;
    let ghMilestoneClosed = false;
    const ghErrors: string[] = [];
    try {
      const { GitHubReconciler } = await import('../../sync/github-reconciler.js');
      const closureResult = await GitHubReconciler.closeCompletedIncrementIssues(
        resolveEffectiveRoot(),
        incrementId,
        log,
      );
      ghClosed = closureResult.closed;
      ghMilestoneClosed = closureResult.milestoneClose;
      ghErrors.push(...closureResult.errors);
    } catch (fallbackError) {
      const msg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      ghErrors.push(msg);
    }

    log(chalk.green(`\n✅ Increment ${incrementId} completed!`));
    log(chalk.gray(`📦 Status changed to: completed`));

    // ── Sync status summary ──────────────────────────────────
    // GitHub issue/milestone closure summary
    if (ghClosed > 0 || ghMilestoneClosed) {
      const parts: string[] = [];
      if (ghClosed > 0) parts.push(`${ghClosed} issue(s) closed`);
      if (ghMilestoneClosed) parts.push('milestone closed');
      log(chalk.green(`   GitHub sync: ${parts.join(', ')}`));
    }
    for (const err of ghErrors) {
      log(chalk.yellow(`   GitHub sync: failed (${err}) — run specweave sync push to retry`));
    }

    // Hook-level sync results (living docs, GitHub project, closure coordinator)
    for (const s of hookSyncSuccess) {
      log(chalk.green(`   Sync: ${s}`));
    }
    for (const e of hookSyncErrors) {
      log(chalk.yellow(`   Sync: ${e} — run specweave sync push to retry`));
    }

    return true;

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(chalk.red(`\n❌ Failed to complete increment: ${msg}\n`));
    // Always write to stderr so auto/silent mode failures are visible
    process.stderr.write(`[completeIncrement] Unexpected failure for ${incrementId}: ${msg}\n`);
    return false;
  }
}

/**
 * Show status of all increments
 */
export async function showStatus(options: StatusOptions = {}): Promise<void> {
  const { verbose, type } = options;

  console.log(chalk.blue.bold(`\n📊 Increment Status\n`));

  try {
    // Get all increments
    let allIncrements = MetadataManager.getAll();
    let increments = allIncrements;

    // Filter by type if specified
    if (type) {
      increments = increments.filter(m => m.type === type);
    }

    // Group by status. "Active" is exactly what the advisory WIP note counts
    // (countsTowardWipLimit) so `status` and `check-discipline` never disagree;
    // not-started increments are shown as their own group.
    const planning = increments.filter(
      m => m.status === IncrementStatus.PLANNED || m.status === IncrementStatus.BACKLOG,
    );
    const active = increments.filter(m => countsTowardWipLimit(m.status));
    const paused = increments.filter(m => m.status === IncrementStatus.PAUSED);
    const completed = increments.filter(m => m.status === IncrementStatus.COMPLETED);
    const abandoned = increments.filter(m => m.status === IncrementStatus.ABANDONED);

    // Calculate overall progress
    const totalIncrements = allIncrements.length;
    const completedCount = allIncrements.filter(m => m.status === IncrementStatus.COMPLETED).length;
    const overallProgress = totalIncrements > 0 ? Math.round((completedCount / totalIncrements) * 100) : 0;

    // Show overall progress (prominent)
    console.log(chalk.cyan.bold(`📈 Overall Progress: ${completedCount}/${totalIncrements} increments complete (${overallProgress}%)`));
    console.log('');

    // Show planning increments (not counted as active)
    if (planning.length > 0) {
      console.log(chalk.magenta.bold(`📝 Planned (${planning.length}):`));
      planning.forEach(m => {
        console.log(`  ${chalk.magenta('○')} ${m.id} [${m.type}]`);
      });
      console.log('');
    }

    // Show active increments
    if (active.length > 0) {
      console.log(chalk.cyan.bold(`▶️  Active (${active.length}):`));
      active.forEach(m => {
        const extended = MetadataManager.getExtended(m.id);
        console.log(`  ${chalk.green('●')} ${m.id} [${m.type}]`);
        if (verbose) {
          console.log(chalk.gray(`     Progress: ${extended.progress || 0}%`));
          console.log(chalk.gray(`     Age: ${extended.ageInDays} days`));
        }
      });
      console.log('');
    }

    // Show paused increments (ALWAYS show reason - critical info)
    if (paused.length > 0) {
      console.log(chalk.yellow.bold(`⏸️  Paused (${paused.length}):`));
      paused.forEach(m => {
        const extended = MetadataManager.getExtended(m.id);
        console.log(`  ${chalk.yellow('⏸')} ${m.id} [${m.type}]`);
        console.log(chalk.gray(`     Reason: ${m.pausedReason || 'No reason provided'}`));
        if (verbose) {
          console.log(chalk.gray(`     Paused: ${extended.daysPaused} days ago`));
        }
      });
      console.log('');
    }

    // Advisory WIP note (never blocks)
    const wipNote = buildWipNote(active.length, new DisciplineChecker(resolveEffectiveRoot()).getLimits().activeIncrements);
    if (wipNote) {
      console.log(chalk.blue(`ℹ️  ${wipNote.message}`));
      console.log('');
    }

    // Show summary
    console.log(chalk.gray(`📊 Summary:`));
    console.log(chalk.gray(`   Planned: ${planning.length}`));
    console.log(chalk.gray(`   Active: ${active.length}`));
    console.log(chalk.gray(`   Paused: ${paused.length}`));
    console.log(chalk.gray(`   Completed: ${completed.length}`));
    console.log(chalk.gray(`   Abandoned: ${abandoned.length}`));
    console.log(chalk.gray(`   Total: ${increments.length}\n`));

    // Show next actions
    if (active.length === 0 && planning.length > 0) {
      console.log(chalk.gray(`💡 Start a planned increment: specweave start <id>`));
    } else if (active.length === 0 && paused.length > 0) {
      console.log(chalk.gray(`💡 Resume a paused increment: specweave resume <id>`));
    } else if (active.length === 0) {
      console.log(chalk.gray(`💡 Start new increment: specweave create-increment "<title>"`));
    }

  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to show status: ${error instanceof Error ? error.message : String(error)}\n`));
    process.exit(1);
  }
}
