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

  // Default to --all if no increment ID provided
  const shouldSyncAll = parsedArgs.all || !parsedArgs.incrementId;

  if (shouldSyncAll) {
    // Sync all increments (not just completed)
    console.log('🔄 Syncing all increments...\n');

    let increments: string[];
    try {
      increments = await findAllSyncableIncrements(projectRoot);
    } catch (error) {
      console.error('❌ Failed to find increments:', error);
      process.exit(1);
      return; // For type safety (unreachable)
    }

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
    let incrementId: string | null;
    try {
      incrementId = parsedArgs.incrementId || await findLatestCompletedIncrement(projectRoot);
    } catch (error) {
      console.error('❌ Failed to find latest increment:', error);
      process.exit(1);
      return; // For type safety (unreachable)
    }

    if (!incrementId) {
      console.error('❌ No increment specified and no completed increments found');
      process.exit(1);
      return; // For type safety (unreachable)
    }

    let result;
    try {
      result = await sync.syncIncrement(incrementId, {
        dryRun: parsedArgs.dryRun,
        force: parsedArgs.force
      });
    } catch (error) {
      console.error('❌ Sync failed with unexpected error:', error);
      process.exit(1);
      return; // For type safety (unreachable)
    }

    if (!result.success) {
      console.error('❌ Sync failed:', result.errors.join(', '));
      process.exit(1);
      return; // For type safety (unreachable)
    }

    console.log('\n✅ Sync complete!');
    if (parsedArgs.dryRun) {
      console.log('   (Dry run - no files were actually created)');
    }
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
 * Find all syncable increments (with spec.md, regardless of status)
 * Excludes non-increment directories like _archive, _backup, etc.
 */
async function findAllSyncableIncrements(projectRoot: string): Promise<string[]> {
  const incrementsDir = path.join(projectRoot, '.specweave/increments');

  if (!await fs.pathExists(incrementsDir)) {
    return [];
  }

  const entries = await fs.readdir(incrementsDir);
  const syncable: string[] = [];

  for (const entry of entries) {
    // Skip non-increment directories (_archive, _backup, etc.)
    if (!entry.match(/^\d{4}-/)) {
      continue;
    }

    // Require spec.md to exist
    const specPath = path.join(incrementsDir, entry, 'spec.md');
    if (!await fs.pathExists(specPath)) {
      console.log(`   ⚠️  Skipping ${entry} (no spec.md)`);
      continue;
    }

    syncable.push(entry);
  }

  return syncable.sort();
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
