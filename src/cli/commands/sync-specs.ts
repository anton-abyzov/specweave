/**
 * CLI Command: sync-specs
 *
 * Syncs increment specifications to living docs structure
 */

import fs from 'fs-extra';
import path from 'path';
import { LivingDocsSync, SyncOptions } from '../../core/living-docs/living-docs-sync.js';

export interface SyncSpecsArgs {
  incrementId?: string;
  all?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

/**
 * Sync specs command entry point
 */
export async function syncSpecs(args: string[]): Promise<void> {
  const parsedArgs = parseArgs(args);
  const projectRoot = process.cwd();

  const sync = new LivingDocsSync(projectRoot);

  try {
    if (parsedArgs.all) {
      // Sync all completed increments
      console.log('🔄 Syncing all completed increments...\n');
      const increments = await findCompletedIncrements(projectRoot);

      let successCount = 0;
      let failCount = 0;

      for (const incrementId of increments) {
        try {
          const result = await sync.syncIncrement(incrementId, {
            dryRun: parsedArgs.dryRun,
            force: parsedArgs.force
          });

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            console.error(`   ❌ Failed: ${result.errors.join(', ')}`);
          }
        } catch (error) {
          failCount++;
          console.error(`   ❌ Failed to sync ${incrementId}:`, error);
        }
      }

      console.log(`\n✅ Sync complete: ${successCount} succeeded, ${failCount} failed`);

    } else {
      // Sync single increment
      const incrementId = parsedArgs.incrementId || await findLatestCompletedIncrement(projectRoot);

      if (!incrementId) {
        console.error('❌ No increment specified and no completed increments found');
        process.exit(1);
      }

      const result = await sync.syncIncrement(incrementId, {
        dryRun: parsedArgs.dryRun,
        force: parsedArgs.force
      });

      if (!result.success) {
        console.error('❌ Sync failed:', result.errors.join(', '));
        process.exit(1);
      }

      console.log('\n✅ Sync complete!');
      if (parsedArgs.dryRun) {
        console.log('   (Dry run - no files were actually created)');
      }
    }

  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

/**
 * Parse command-line arguments
 */
function parseArgs(args: string[]): SyncSpecsArgs {
  const parsed: SyncSpecsArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--all') {
      parsed.all = true;
    } else if (arg === '--force') {
      parsed.force = true;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (!arg.startsWith('--')) {
      // Assume it's the increment ID
      parsed.incrementId = arg;
    }
  }

  return parsed;
}

/**
 * Find all completed increments
 */
async function findCompletedIncrements(projectRoot: string): Promise<string[]> {
  const incrementsDir = path.join(projectRoot, '.specweave/increments');

  if (!await fs.pathExists(incrementsDir)) {
    return [];
  }

  const entries = await fs.readdir(incrementsDir);
  const completed: string[] = [];

  for (const entry of entries) {
    if (!entry.match(/^\d{4}-/)) continue;

    const metadataPath = path.join(incrementsDir, entry, 'metadata.json');
    const specPath = path.join(incrementsDir, entry, 'spec.md');

    // Skip if no spec.md
    if (!await fs.pathExists(specPath)) {
      console.log(`   ⚠️  Skipping ${entry} (no spec.md)`);
      continue;
    }

    // Check if completed
    if (await fs.pathExists(metadataPath)) {
      const metadata = await fs.readJson(metadataPath);
      if (metadata.status === 'completed') {
        completed.push(entry);
      }
    }
  }

  return completed.sort();
}

/**
 * Find latest completed increment
 */
async function findLatestCompletedIncrement(projectRoot: string): Promise<string | null> {
  const completed = await findCompletedIncrements(projectRoot);
  return completed.length > 0 ? completed[completed.length - 1] : null;
}
