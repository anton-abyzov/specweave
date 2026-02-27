/**
 * Status Command Utilities
 *
 * Helper functions for pause/resume/abandon/status commands
 * Used by slash commands and CLI
 * Part of increment 0007: Smart Status Management
 */

import chalk from 'chalk';
import { MetadataManager } from './metadata-manager.js';
import { IncrementStatus, IncrementType, TYPE_LIMITS, computeTransitionPath } from '../types/increment-metadata.js';

export interface PauseOptions {
  incrementId: string;
  reason?: string;
  force?: boolean;
}

export interface ResumeOptions {
  incrementId: string;
  force?: boolean;
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
 * Helper: Get WIP limits for increment type
 */
function getTypeLimits(type: IncrementType): { max: number } {
  const limit = TYPE_LIMITS[type];
  return { max: limit === null ? Infinity : limit };
}


/**
 * Pause an active increment
 */
export async function pauseIncrement(options: PauseOptions): Promise<void> {
  const { incrementId, reason, force } = options;

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
        console.log(chalk.gray(`\n   💡 Resume it first: /resume ${incrementId}`));
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
    console.log(chalk.gray(`\n💡 Resume with: /resume ${incrementId}\n`));

  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to pause increment: ${error instanceof Error ? error.message : String(error)}\n`));
    process.exit(1);
  }
}

/**
 * Resume a paused or abandoned increment
 */
export async function resumeIncrement(options: ResumeOptions): Promise<void> {
  const { incrementId, force } = options;

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

    if (metadata.status !== IncrementStatus.PAUSED && metadata.status !== IncrementStatus.ABANDONED) {
      console.log(chalk.red(`❌ Cannot resume increment ${incrementId}`));
      console.log(chalk.gray(`   Current status: ${metadata.status}`));
      console.log(chalk.gray(`   Only paused or abandoned increments can be resumed\n`));
      process.exit(1);
    }

    // Check WIP limits (warn but don't block)
    const activeCount = MetadataManager.getActive().length;
    const type = metadata.type;
    const limits = getTypeLimits(type);

    if (activeCount >= limits.max && limits.max !== Infinity && !force) {
      console.log(chalk.yellow(`\n⚠️  WARNING: WIP Limit Reached`));
      console.log(chalk.gray(`   Current active: ${activeCount}`));
      console.log(chalk.gray(`   Limit for ${type}: ${limits.max}`));
      console.log(chalk.gray(`   Resuming will exceed limit`));
      console.log(chalk.gray(`\n   Complete or pause another increment first`));
      console.log(chalk.gray(`   Or use --force to bypass this warning\n`));
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

    console.log(chalk.gray(`\n💡 Continue work with: /do ${incrementId}\n`));

  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to resume increment: ${error instanceof Error ? error.message : String(error)}\n`));
    process.exit(1);
  }
}

/**
 * Abandon an increment
 */
export async function abandonIncrement(options: AbandonOptions): Promise<void> {
  const { incrementId, reason, force } = options;

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
    console.log(chalk.gray(`\n💡 Can be resumed later with: /resume ${incrementId}\n`));

  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to abandon increment: ${error instanceof Error ? error.message : String(error)}\n`));
    process.exit(1);
  }
}

export interface CompleteOptions {
  incrementId: string;
  silent?: boolean;  // For auto mode - suppress output
  skipValidation?: boolean;  // DANGEROUS: Skip quality gates
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
  const { incrementId, silent = false, skipValidation = false } = options;

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
      return false;
    }

    // Walk intermediate transitions (all states before the final COMPLETED)
    const intermediateSteps = path.slice(0, -1);
    for (const intermediateStatus of intermediateSteps) {
      log(chalk.gray(`   Transitioning: ${metadata.status} → ${intermediateStatus}`));
      try {
        MetadataManager.updateStatus(incrementId, intermediateStatus);
        Object.assign(metadata, MetadataManager.read(incrementId));
      } catch (error) {
        log(chalk.red(`❌ Failed during intermediate transition to ${intermediateStatus}`));
        log(chalk.gray(`   ${error instanceof Error ? error.message : String(error)}`));
        return false;
      }
    }

    // Run quality gate validation unless skipped
    if (!skipValidation) {
      // Dynamic import to avoid circular dependency
      const { IncrementCompletionValidator } = await import('./completion-validator.js');
      const validation = await IncrementCompletionValidator.validateCompletion(incrementId);

      if (!validation.isValid) {
        log(chalk.red(`❌ Increment ${incrementId} failed quality gates:\n`));
        validation.errors.forEach((err) => log(chalk.red(`   • ${err}`)));
        if (validation.warnings && validation.warnings.length > 0) {
          log(chalk.yellow(`\n⚠️  Warnings:\n`));
          validation.warnings.forEach((warn) => log(chalk.yellow(`   • ${warn}`)));
        }
        return false;
      }

      // Show warnings but continue
      if (validation.warnings && validation.warnings.length > 0) {
        log(chalk.yellow(`\n⚠️  Warnings (non-blocking):\n`));
        validation.warnings.forEach((warn) => log(chalk.yellow(`   • ${warn}`)));
      }
    } else {
      log(chalk.yellow(`⚠️  Validation skipped — quality gate reports (grill, judge-llm) not checked`));
      log(chalk.gray(`   Run: specweave complete ${incrementId} --yes (without --skip-validation) for enforced closure`));
    }

    // Pre-completion sync: ensure GitHub issues exist before marking COMPLETED.
    // This catches up if planning sync was missed (e.g., increment created without
    // running through LifecycleHookDispatcher.onIncrementPlanned()).
    try {
      const { LivingDocsSync } = await import(
        '../living-docs/living-docs-sync.js'
      );
      const sync = new LivingDocsSync(process.cwd());
      await sync.syncIncrement(incrementId);
      log(chalk.gray(`   Pre-completion sync: living docs synced`));
    } catch (syncError) {
      const msg = syncError instanceof Error ? syncError.message : String(syncError);
      log(chalk.yellow(`⚠️  Pre-completion sync warning: ${msg}`));
    }

    // Update status to completed (final transition)
    // This triggers StatusChangeSyncTrigger → external tool sync!
    MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);

    // Dispatch post-increment-done hooks (awaited, error-isolated)
    try {
      const { LifecycleHookDispatcher } = await import(
        '../hooks/LifecycleHookDispatcher.js'
      );
      await LifecycleHookDispatcher.onIncrementDone(process.cwd(), incrementId);
    } catch (hookError) {
      const msg = hookError instanceof Error ? hookError.message : String(hookError);
      process.stderr.write(`[completeIncrement] Post-closure hook error: ${msg}\n`);
    }

    // Direct GitHub issue closure from metadata (fallback).
    // The hook chain above may silently skip GitHub closure when living docs
    // files don't exist. This fallback reads issue numbers directly from
    // metadata.json and closes any that are still open. Idempotent.
    try {
      const { GitHubReconciler } = await import('../../sync/github-reconciler.js');
      const closureResult = await GitHubReconciler.closeCompletedIncrementIssues(
        process.cwd(),
        incrementId,
        log,
      );
      if (closureResult.closed > 0) {
        log(chalk.green(`   Closed ${closureResult.closed} GitHub issue(s)`));
      }
      if (closureResult.milestoneClose) {
        log(chalk.green(`   Closed GitHub milestone`));
      }
      for (const err of closureResult.errors) {
        log(chalk.yellow(`   GitHub sync: ${err}`));
      }
    } catch (fallbackError) {
      const msg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      log(chalk.yellow(`   GitHub closure: ${msg}`));
    }

    log(chalk.green(`\n✅ Increment ${incrementId} completed!`));
    log(chalk.gray(`📦 Status changed to: completed`));

    return true;

  } catch (error) {
    log(chalk.red(`\n❌ Failed to complete increment: ${error instanceof Error ? error.message : String(error)}\n`));
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

    // Group by status
    // CRITICAL: "active" includes planning, active, and ready_for_review (all count towards WIP limits)
    const active = increments.filter(m =>
      m.status === IncrementStatus.PLANNING ||
      m.status === IncrementStatus.ACTIVE ||
      m.status === IncrementStatus.READY_FOR_REVIEW
    );
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

    // Show WIP limits status (simplified: just show total active vs limit)
    const totalActive = active.length;
    const overLimit = totalActive > 1;
    const limitIcon = overLimit ? chalk.red('⚠️') : chalk.green('✅');

    console.log(chalk.cyan.bold(`📈 WIP Limit:`));
    console.log(`  ${limitIcon} Active increments: ${totalActive}/1 ${overLimit ? '(EXCEEDS LIMIT!)' : ''}`);
    if (overLimit) {
      console.log(chalk.yellow(`     💡 Run 'specweave pause <id>' to pause one before starting new work`));
    }
    console.log('');

    // Show summary
    console.log(chalk.gray(`📊 Summary:`));
    console.log(chalk.gray(`   Active: ${active.length}`));
    console.log(chalk.gray(`   Paused: ${paused.length}`));
    console.log(chalk.gray(`   Completed: ${completed.length}`));
    console.log(chalk.gray(`   Abandoned: ${abandoned.length}`));
    console.log(chalk.gray(`   Total: ${increments.length}\n`));

    // Show next actions
    if (active.length === 0 && paused.length > 0) {
      console.log(chalk.gray(`💡 Resume a paused increment: /resume <id>`));
    } else if (active.length === 0) {
      console.log(chalk.gray(`💡 Start new increment: /inc "feature description"`));
    }

  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to show status: ${error instanceof Error ? error.message : String(error)}\n`));
    process.exit(1);
  }
}
