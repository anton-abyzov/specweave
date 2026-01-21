#!/usr/bin/env node

/**
 * CLI Command: sync-living-docs-acs
 *
 * Synchronizes AC and task completion status from increment spec.md
 * to all corresponding living docs US files.
 *
 * Usage:
 *   specweave sync-living-docs-acs <increment-id>
 *   specweave sync-living-docs-acs --all
 *
 * @module cli/commands/sync-living-docs-acs
 */

import { Command } from 'commander';
import path from 'path';
import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { SpecToLivingDocsSync } from '../../sync/spec-to-living-docs-sync.js';
import { consoleLogger } from '../../utils/logger.js';

const program = new Command();

program
  .name('sync-living-docs-acs')
  .description('Sync AC/task completion from spec.md to living docs US files')
  .argument('[increment-id]', 'Increment ID to sync (e.g., 0156 or 0156-feature-name)')
  .option('--all', 'Sync all active increments')
  .option('--dry-run', 'Show what would be updated without making changes')
  .option('--verbose', 'Show detailed output')
  .action(async (incrementId: string | undefined, options) => {
    try {
      const projectRoot = process.cwd();

      // Validate project root
      const specweavePath = path.join(projectRoot, '.specweave');
      if (!existsSync(specweavePath)) {
        console.error('❌ Error: Not a SpecWeave project (no .specweave/ folder found)');
        console.error('   Run this command from your project root.');
        process.exit(1);
      }

      // Get increment IDs to sync
      let incrementIds: string[];

      if (options.all) {
        // Find all active increments
        const incrementsPath = path.join(specweavePath, 'increments');
        const entries = await readdir(incrementsPath, { withFileTypes: true });

        incrementIds = entries
          .filter(entry => entry.isDirectory() && /^\d{4}/.test(entry.name))
          .map(entry => entry.name);

        if (incrementIds.length === 0) {
          console.log('ℹ️  No increments found to sync');
          process.exit(0);
        }

        console.log(`\n🔄 Syncing ${incrementIds.length} increments...\n`);
      } else if (incrementId) {
        incrementIds = [incrementId];
      } else {
        console.error('❌ Error: Increment ID required');
        console.error('   Usage: specweave sync-living-docs-acs <increment-id>');
        console.error('   Or: specweave sync-living-docs-acs --all');
        process.exit(1);
      }

      // Sync each increment
      let totalFilesUpdated = 0;
      let totalACsUpdated = 0;
      let totalTasksUpdated = 0;
      const errors: string[] = [];

      for (const id of incrementIds) {
        const syncer = new SpecToLivingDocsSync({
          projectRoot,
          incrementId: id,
          logger: options.verbose ? consoleLogger : undefined,
          dryRun: options.dryRun,
        });

        const result = await syncer.sync();

        totalFilesUpdated += result.filesUpdated;
        totalACsUpdated += result.totalACsUpdated;
        totalTasksUpdated += result.totalTasksUpdated;

        if (result.errors.length > 0) {
          errors.push(`${id}: ${result.errors.join(', ')}`);
        }
      }

      // Summary
      console.log(`\n${'='.repeat(60)}`);
      console.log('📊 SYNC SUMMARY');
      console.log(`${'='.repeat(60)}`);
      console.log(`Increments processed: ${incrementIds.length}`);
      console.log(`Files updated: ${totalFilesUpdated}`);
      console.log(`Total ACs synced: ${totalACsUpdated}`);
      console.log(`Total tasks synced: ${totalTasksUpdated}`);

      if (options.dryRun) {
        console.log(`\n⚠️  DRY RUN - No files were actually modified`);
      }

      if (errors.length > 0) {
        console.log(`\n⚠️  Errors: ${errors.length}`);
        errors.forEach(err => console.error(`   ${err}`));
        process.exit(1);
      }

      console.log(`\n✅ Living docs sync complete!`);
    } catch (error: any) {
      console.error(`\n❌ Fatal error: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
