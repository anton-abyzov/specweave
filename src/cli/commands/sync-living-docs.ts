/**
 * CLI Command: sync-living-docs
 *
 * Sync living documentation for a specific increment.
 * Generates or updates feature specs and user story files
 * under .specweave/docs/internal/specs/.
 *
 * This is a focused command that ONLY syncs living docs.
 * For full progress sync (including external tools), use sync-progress.
 */

import path from 'path';
import { existsSync, readdirSync } from 'fs';
import { LivingDocsSync } from '../../core/living-docs/living-docs-sync.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { ActiveIncrementManager } from '../../core/increment/active-increment-manager.js';

export interface SyncLivingDocsArgs {
  incrementId?: string;
  dryRun?: boolean;
  force?: boolean;
}

export async function syncLivingDocs(
  args: string[],
  options: { logger?: Logger } = {}
): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const parsedArgs = parseArgs(args);
  const projectRoot = process.cwd();

  // Resolve increment ID
  let incrementId = parsedArgs.incrementId;
  if (!incrementId) {
    incrementId = detectActiveIncrement(projectRoot, logger) ?? undefined;
  }

  if (!incrementId) {
    logger.error('No active increment found.');
    logger.error('Usage: specweave sync-living-docs <increment-id>');
    process.exit(1);
    return;
  }

  // Verify increment exists
  if (!incrementExists(projectRoot, incrementId)) {
    logger.error(`Increment ${incrementId} not found.`);
    process.exit(1);
    return;
  }

  if (parsedArgs.dryRun) {
    logger.log('[DRY RUN] No files will be modified.');
  }

  logger.log(`Syncing living docs for increment: ${incrementId}`);

  try {
    const sync = new LivingDocsSync(projectRoot, { logger });
    const result = await sync.syncIncrement(incrementId, {
      dryRun: parsedArgs.dryRun,
      force: parsedArgs.force,
    });

    // Report results
    logger.log('');
    if (result.success) {
      logger.log('Living Docs Sync Results:');
      logger.log(`  Feature ID: ${result.featureId}`);
      logger.log(`  Files created: ${result.filesCreated.length}`);
      logger.log(`  Files updated: ${result.filesUpdated.length}`);
    } else {
      logger.error('Living docs sync failed.');
    }

    if (result.errors.length > 0) {
      logger.log('  Warnings:');
      for (const err of result.errors) {
        logger.log(`    - ${err}`);
      }
    }

    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Sync failed: ${msg}`);
    process.exit(1);
  }
}

function parseArgs(args: string[]): SyncLivingDocsArgs {
  const result: SyncLivingDocsArgs = {};
  for (const arg of args) {
    if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--force') {
      result.force = true;
    } else if (!arg.startsWith('-') && !result.incrementId) {
      result.incrementId = arg;
    }
  }
  return result;
}

function detectActiveIncrement(projectRoot: string, logger: Logger): string | null {
  try {
    const manager = new ActiveIncrementManager(projectRoot);
    const active = manager.getActive();
    if (active.length > 0) {
      logger.log(`Auto-detected active increment: ${active[0]}`);
      return active[0];
    }
  } catch {
    // Silent fallback
  }
  return null;
}

function incrementExists(projectRoot: string, id: string): boolean {
  const incrementsDir = path.join(projectRoot, '.specweave/increments');

  // Direct match
  if (existsSync(path.join(incrementsDir, id))) return true;

  // Archive match
  if (existsSync(path.join(incrementsDir, '_archive', id))) return true;

  // Prefix match (e.g., "0001" matching "0001-feature-name")
  try {
    const entries = readdirSync(incrementsDir);
    for (const entry of entries) {
      if (entry.startsWith(id + '-') || entry === id) return true;
    }
  } catch {
    // Directory doesn't exist
  }

  return false;
}

// Main entry point when run directly
if (process.argv[1]?.endsWith('sync-living-docs.js') || process.argv[1]?.endsWith('sync-living-docs.ts')) {
  const args = process.argv.slice(2);
  syncLivingDocs(args).catch(console.error);
}
