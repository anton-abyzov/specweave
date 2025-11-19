#!/usr/bin/env tsx
/**
 * Show Progress Script
 *
 * Displays task completion progress for active increments,
 * grouped by User Story for increments that use US-task linkage.
 *
 * Usage:
 *   npx tsx scripts/show-progress.ts [increment-id]
 *   npx tsx scripts/show-progress.ts            # Show all active
 *   npx tsx scripts/show-progress.ts 0047      # Show specific increment
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import {
  calculateProgressFromTasksFile,
  sortUSByID,
  getProgressBar,
  getProgressColor,
  formatAggregateProgress,
  type USProgress,
} from '../dist/src/progress/us-progress-tracker.js';

interface IncrementMetadata {
  status: string;
  title?: string;
}

async function showIncrementProgress(incrementPath: string, incrementId: string): Promise<void> {
  // Read metadata
  const metadataPath = path.join(incrementPath, 'metadata.json');
  if (!await fs.pathExists(metadataPath)) {
    return;
  }

  const metadata: IncrementMetadata = await fs.readJson(metadataPath);

  // Skip completed/archived
  if (metadata.status === 'completed' || metadata.status === 'archived') {
    return;
  }

  // Read tasks.md
  const tasksPath = path.join(incrementPath, 'tasks.md');
  if (!await fs.pathExists(tasksPath)) {
    console.log(chalk.yellow(`\n⚠️  ${incrementId}: No tasks.md found`));
    return;
  }

  // Calculate progress
  const progress = await calculateProgressFromTasksFile(tasksPath);

  // Display header
  const statusIcon = metadata.status === 'in-progress' ? '🟢' : '⏸️ ';
  const statusText =
    metadata.status === 'in-progress'
      ? chalk.green.bold('ACTIVE')
      : chalk.yellow(metadata.status.toUpperCase());

  console.log(`\n${statusIcon} ${statusText}: ${chalk.cyan(incrementId)}`);
  if (metadata.title) {
    console.log(chalk.gray(`   ${metadata.title}`));
  }

  // Display overall progress
  const overallColor = getProgressColor(progress.percentage);
  const overallBar = getProgressBar(progress.percentage, 30);
  const overallText = chalk[overallColor](
    `${overallBar} ${progress.percentage}% (${progress.completedTasks}/${progress.totalTasks} tasks)`
  );
  console.log(`   ${overallText}`);

  // Display per-US progress (if US linkage exists)
  if (progress.byUserStory.size > 0) {
    console.log(chalk.gray('\n   Progress by User Story:'));

    const sortedUSs = sortUSByID(progress.byUserStory);
    for (const us of sortedUSs) {
      const usColor = getProgressColor(us.percentage);
      const usBar = getProgressBar(us.percentage, 20);
      const usText = `${us.usId}: ${chalk[usColor](
        `${usBar} ${us.percentage}%`
      )} (${us.completedTasks}/${us.totalTasks})`;

      // Determine prefix based on status
      const allCompleted = us.completedTasks === us.totalTasks;
      const prefix = allCompleted ? '   ✅' : '   ├─';

      console.log(`${prefix} ${usText}`);
    }
  }

  // Display orphan tasks warning
  if (progress.orphanTasks.length > 0) {
    console.log(
      chalk.yellow(
        `\n   ⚠️  ${progress.orphanTasks.length} task(s) without User Story linkage`
      )
    );
  }

  // Display next action
  if (metadata.status === 'in-progress') {
    console.log(chalk.gray(`\n   Next: /specweave:do ${incrementId}`));
  } else {
    console.log(chalk.gray(`\n   Resume: /specweave:resume ${incrementId}`));
  }
}

async function showAllActiveProgress(): Promise<void> {
  const incrementsDir = path.join(process.cwd(), '.specweave/increments');

  if (!await fs.pathExists(incrementsDir)) {
    console.log(chalk.yellow('⚠️  No increments directory found'));
    return;
  }

  console.log(chalk.blue.bold('\n📊 Increment Progress'));
  console.log(chalk.gray('='.repeat(60)));

  const entries = await fs.readdir(incrementsDir);
  let activeCount = 0;
  let otherCount = 0;

  for (const entry of entries) {
    const incrementPath = path.join(incrementsDir, entry);
    const stats = await fs.stat(incrementPath);

    if (!stats.isDirectory()) continue;

    const metadataPath = path.join(incrementPath, 'metadata.json');
    if (!await fs.pathExists(metadataPath)) continue;

    const metadata: IncrementMetadata = await fs.readJson(metadataPath);

    if (metadata.status === 'completed' || metadata.status === 'archived') continue;

    if (metadata.status === 'in-progress') {
      activeCount++;
    } else {
      otherCount++;
    }

    await showIncrementProgress(incrementPath, entry);
  }

  // Summary
  console.log(chalk.gray('\n' + '='.repeat(60)));
  console.log(chalk.blue.bold('Summary:'));
  console.log(`  ${chalk.green('Active increments')}: ${activeCount}`);
  console.log(`  ${chalk.yellow('Other non-completed')}: ${otherCount}`);

  if (activeCount === 0) {
    console.log(
      chalk.gray('\n💡 No active work. Run /specweave:increment to start new work')
    );
  } else if (activeCount > 0) {
    console.log(chalk.gray('\n💡 Continue with /specweave:do'));
  }

  console.log('');
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const incrementId = process.argv[2];

  if (incrementId) {
    // Show specific increment
    const incrementPath = path.join(
      process.cwd(),
      '.specweave/increments',
      incrementId
    );

    if (!fs.existsSync(incrementPath)) {
      console.error(chalk.red(`Error: Increment ${incrementId} not found`));
      process.exit(1);
    }

    showIncrementProgress(incrementPath, incrementId)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(chalk.red('Error showing progress:'), error);
        process.exit(1);
      });
  } else {
    // Show all active
    showAllActiveProgress()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(chalk.red('Error showing progress:'), error);
        process.exit(1);
      });
  }
}

export { showIncrementProgress, showAllActiveProgress };
