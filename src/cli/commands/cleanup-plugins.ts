#!/usr/bin/env node
/**
 * Clean up stale plugin references
 *
 * Removes plugin references from ~/.claude/settings.json that no longer
 * exist in the SpecWeave marketplace. This fixes "Plugin not found" errors
 * for plugins that were removed or renamed.
 *
 * Usage:
 *   specweave cleanup-plugins
 *   specweave cleanup-plugins --dry-run
 *   specweave cleanup-plugins --verbose
 *
 * @since 0.35.2
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { cleanupStalePlugins, detectStalePlugins } from '../../utils/cleanup-stale-plugins.js';
import { findSourceDir } from '../helpers/init/path-utils.js';
import { getDirname } from '../../utils/esm-helpers.js';

const __dirname = getDirname(import.meta.url);

const program = new Command();

program
  .name('cleanup-plugins')
  .description('Clean up stale plugin references from Claude settings')
  .option('--dry-run', 'Show what would be removed without removing')
  .option('--verbose', 'Show detailed output')
  .action(async (options: { dryRun?: boolean; verbose?: boolean }) => {
    try {
      console.log(chalk.blue.bold('\n🧹 SpecWeave Plugin Cleanup\n'));

      // Find marketplace.json
      const marketplaceJsonPath = findSourceDir('.claude-plugin/marketplace.json', __dirname);

      // Detect stale plugins
      const stalePlugins = await detectStalePlugins(marketplaceJsonPath);

      if (stalePlugins.length === 0) {
        console.log(chalk.green('✓ No stale plugins found'));
        console.log(chalk.gray('  Your Claude settings are clean!\n'));
        return;
      }

      // Show what will be removed
      console.log(chalk.yellow(`Found ${stalePlugins.length} stale plugin reference(s):\n`));
      stalePlugins.forEach(p => {
        console.log(chalk.gray(`  - ${p}`));
      });
      console.log('');

      if (options.dryRun) {
        console.log(chalk.cyan('Dry run - no changes made'));
        console.log(chalk.gray('Run without --dry-run to remove these plugins\n'));
        return;
      }

      // Clean up
      const result = await cleanupStalePlugins(marketplaceJsonPath, options.verbose ?? false);

      if (!result.success) {
        console.error(chalk.red(`\n✗ Cleanup failed: ${result.error}\n`));
        process.exit(1);
      }

      console.log(chalk.green(`\n✓ Removed ${result.removedCount} stale plugin reference(s)`));
      console.log(chalk.gray('  Settings saved to ~/.claude/settings.json\n'));

      console.log(chalk.cyan('What this means:'));
      console.log(chalk.gray('  • Removed plugins that no longer exist in SpecWeave marketplace'));
      console.log(chalk.gray('  • This fixes "Plugin not found" errors on startup'));
      console.log(chalk.gray('  • Your enabled plugins list is now clean\n'));

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`\n✗ Error: ${errorMsg}\n`));
      process.exit(1);
    }
  });

program.parse();
