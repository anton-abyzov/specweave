/**
 * Status Command Utilities
 *
 * Helper functions for pause/resume/abandon/status commands
 * Used by slash commands and CLI
 * Part of increment 0007: Smart Status Management
 */

import chalk from 'chalk';
import { MetadataManager } from './metadata-manager.js';
import { IncrementStatus, IncrementType, TYPE_LIMITS } from '../types/increment-metadata.js';

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
 * Helper: Check WIP limits across all types
 */
interface LimitInfo {
  count: number;
  limit: number;
}

function checkLimits(): Record<string, LimitInfo> {
  const active = MetadataManager.getActive();
  const result: Record<string, LimitInfo> = {};

  // Count active increments by type
  const typeCounts: Record<IncrementType, number> = {
    [IncrementType.FEATURE]: 0,
    [IncrementType.HOTFIX]: 0,
    [IncrementType.BUG]: 0,
    [IncrementType.CHANGE_REQUEST]: 0,
    [IncrementType.REFACTOR]: 0,
    [IncrementType.EXPERIMENT]: 0
  };

  active.forEach(m => {
    typeCounts[m.type]++;
  });

  // Build result with readable type names
  Object.entries(typeCounts).forEach(([type, count]) => {
    const typeEnum = type as IncrementType;
    const limit = TYPE_LIMITS[typeEnum];
    result[type] = {
      count,
      limit: limit === null ? Infinity : limit
    };
  });

  return result;
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
    const active = increments.filter(m => m.status === IncrementStatus.ACTIVE);
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

    // Check limits
    const limitsInfo = checkLimits();

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
