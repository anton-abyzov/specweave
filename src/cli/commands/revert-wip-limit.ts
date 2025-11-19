import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { Logger, consoleLogger } from '../../utils/logger.js';

// NOTE: This CLI WIP limit command is primarily user-facing output (console.log/console.error).
// All console.* calls in this file are legitimate user-facing exceptions
// as defined in CONTRIBUTING.md (status messages, configuration updates, warnings).
// Logger infrastructure available for future internal debug logs if needed.

/**
 * Revert WIP limit to original value after temporary adjustment
 *
 * This command restores the WIP (Work In Progress) limit to its original value
 * after it was temporarily adjusted using the migration system.
 */
export async function revertWipLimitCommand(): Promise<void> {
  const configPath = path.join(process.cwd(), '.specweave', 'config.json');
  const backupPath = `${configPath}.bak`;

  // Check if config exists
  if (!fs.existsSync(configPath)) {
    console.error(chalk.red('❌ Config file not found: .specweave/config.json'));
    console.log(chalk.yellow('   Run from project root with .specweave/ folder'));
    process.exit(1);
  }

  // Read config
  const config = await fs.readJson(configPath);

  // Check if WIP was adjusted
  if (!config.limits || !config.limits.originalHardCap) {
    console.log(chalk.yellow('ℹ️  No temporary WIP adjustment to revert'));
    console.log(chalk.gray('   Current WIP limit: ' + (config.limits?.hardCap || 2)));
    return;
  }

  // Store values for confirmation message
  const originalValue = config.limits.originalHardCap;
  const currentValue = config.limits.hardCap;
  const adjustedAt = config.limits.wipAdjustedAt;

  // Calculate duration
  let durationMessage = '';
  if (adjustedAt) {
    const duration = Date.now() - new Date(adjustedAt).getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    durationMessage = `${hours} hours ${minutes} minutes`;
  }

  // Create backup
  await fs.copy(configPath, backupPath);

  // Revert WIP limit
  config.limits.hardCap = originalValue;
  delete config.limits.originalHardCap;
  delete config.limits.wipAdjustedAt;

  // Save config
  await fs.writeJson(configPath, config, { spaces: 2 });

  // Success message
  console.log(chalk.green('✅ WIP limit reverted to original value: ' + originalValue));
  console.log(chalk.gray('   Previous limit: ' + currentValue));
  if (adjustedAt) {
    console.log(chalk.gray('   Adjusted at: ' + adjustedAt));
  }
  if (durationMessage) {
    console.log(chalk.gray('   Duration: ' + durationMessage));
  }
  console.log(chalk.gray('   Backup saved: ' + backupPath));

  // Reminder
  console.log('');
  console.log(chalk.cyan('💡 Remember: Focus on ONE increment at a time for maximum productivity!'));
}
