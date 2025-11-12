#!/usr/bin/env node

/**
 * Migration Script: Convert existing increment specs to intelligent living docs
 *
 * Usage:
 *   ts-node scripts/migrate-to-intelligent-living-docs.ts [--dry-run] [--increment <id>]
 *
 * Options:
 *   --dry-run        Preview changes without writing files
 *   --increment <id> Migrate specific increment only
 *   --verbose        Show detailed output
 *   --help           Show this help message
 *
 * Examples:
 *   # Migrate all increments
 *   ts-node scripts/migrate-to-intelligent-living-docs.ts
 *
 *   # Dry run (preview only)
 *   ts-node scripts/migrate-to-intelligent-living-docs.ts --dry-run
 *
 *   # Migrate specific increment
 *   ts-node scripts/migrate-to-intelligent-living-docs.ts --increment 0016-self-reflection-system
 */

import fs from 'fs-extra';
import path from 'path';
import { IntelligentLivingDocsSync } from '../dist/src/core/living-docs/index.js';

interface MigrationOptions {
  dryRun: boolean;
  incrementId?: string;
  verbose: boolean;
}

interface MigrationResult {
  incrementId: string;
  success: boolean;
  filesCreated: number;
  filesUpdated: number;
  filesSkipped: number;
  duration: number;
  errors: string[];
}

/**
 * Parse command-line arguments
 */
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: false,
    verbose: false,
  };

  if (args.includes('--help')) {
    console.log(`
Migration Script: Convert existing increment specs to intelligent living docs

Usage:
  ts-node scripts/migrate-to-intelligent-living-docs.ts [--dry-run] [--increment <id>]

Options:
  --dry-run        Preview changes without writing files
  --increment <id> Migrate specific increment only
  --verbose        Show detailed output
  --help           Show this help message

Examples:
  # Migrate all increments
  ts-node scripts/migrate-to-intelligent-living-docs.ts

  # Dry run (preview only)
  ts-node scripts/migrate-to-intelligent-living-docs.ts --dry-run

  # Migrate specific increment
  ts-node scripts/migrate-to-intelligent-living-docs.ts --increment 0016-self-reflection-system
`);
    process.exit(0);
  }

  options.dryRun = args.includes('--dry-run');
  options.verbose = args.includes('--verbose');

  const incrementIndex = args.indexOf('--increment');
  if (incrementIndex !== -1 && args[incrementIndex + 1]) {
    options.incrementId = args[incrementIndex + 1];
  }

  return options;
}

/**
 * Get all increment IDs from .specweave/increments/
 */
async function getAllIncrements(projectRoot: string): Promise<string[]> {
  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

  if (!fs.existsSync(incrementsDir)) {
    return [];
  }

  const entries = await fs.readdir(incrementsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && /^\d{4}-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Check if increment has spec.md
 */
function hasSpec(projectRoot: string, incrementId: string): boolean {
  const specPath = path.join(
    projectRoot,
    '.specweave',
    'increments',
    incrementId,
    'spec.md'
  );
  return fs.existsSync(specPath);
}

/**
 * Migrate single increment
 */
async function migrateIncrement(
  projectRoot: string,
  incrementId: string,
  options: MigrationOptions
): Promise<MigrationResult> {
  const startTime = Date.now();
  const result: MigrationResult = {
    incrementId,
    success: false,
    filesCreated: 0,
    filesUpdated: 0,
    filesSkipped: 0,
    duration: 0,
    errors: [],
  };

  try {
    // Check if spec exists
    if (!hasSpec(projectRoot, incrementId)) {
      result.errors.push('spec.md not found');
      result.duration = Date.now() - startTime;
      return result;
    }

    // Create sync instance
    const sync = new IntelligentLivingDocsSync({
      verbose: options.verbose,
      dryRun: options.dryRun,
    });

    // Run intelligent sync
    const syncResult = await sync.syncIncrement(incrementId);

    // Extract results
    result.success = syncResult.success;
    result.filesCreated = syncResult.distribution.summary.filesCreated;
    result.filesUpdated = syncResult.distribution.summary.filesUpdated;
    result.filesSkipped = syncResult.distribution.summary.filesSkipped;
    result.errors = syncResult.errors;
    result.duration = Date.now() - startTime;

    return result;
  } catch (error) {
    result.errors.push(String(error));
    result.duration = Date.now() - startTime;
    return result;
  }
}

/**
 * Main migration function
 */
async function main() {
  const projectRoot = process.cwd();
  const options = parseArgs();

  console.log('🔄 Intelligent Living Docs Migration');
  console.log('====================================');
  console.log('');

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No files will be written');
    console.log('');
  }

  // Get increments to migrate
  let incrementIds: string[];
  if (options.incrementId) {
    incrementIds = [options.incrementId];
    console.log(`📋 Migrating specific increment: ${options.incrementId}`);
  } else {
    incrementIds = await getAllIncrements(projectRoot);
    console.log(`📋 Found ${incrementIds.length} increments to migrate`);
  }
  console.log('');

  // Migrate each increment
  const results: MigrationResult[] = [];
  for (const incrementId of incrementIds) {
    console.log(`🔄 Migrating ${incrementId}...`);
    const result = await migrateIncrement(projectRoot, incrementId, options);
    results.push(result);

    if (result.success) {
      console.log(`   ✅ Success: ${result.filesCreated} created, ${result.filesUpdated} updated, ${result.filesSkipped} skipped (${result.duration}ms)`);
    } else {
      console.log(`   ❌ Failed: ${result.errors.join(', ')}`);
    }
  }

  // Summary
  console.log('');
  console.log('📊 Migration Summary');
  console.log('===================');
  console.log('');

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalCreated = results.reduce((sum, r) => sum + r.filesCreated, 0);
  const totalUpdated = results.reduce((sum, r) => sum + r.filesUpdated, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.filesSkipped, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`✅ Successful: ${successful}/${results.length} increments`);
  console.log(`❌ Failed: ${failed}/${results.length} increments`);
  console.log('');
  console.log(`📄 Files created: ${totalCreated}`);
  console.log(`📝 Files updated: ${totalUpdated}`);
  console.log(`⏭️  Files skipped: ${totalSkipped}`);
  console.log(`⏱️  Total duration: ${totalDuration}ms`);
  console.log('');

  if (failed > 0) {
    console.log('❌ Failed Increments:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   ${r.incrementId}: ${r.errors.join(', ')}`);
      });
    console.log('');
  }

  if (options.dryRun) {
    console.log('⚠️  This was a DRY RUN - no files were actually written');
    console.log('   Run without --dry-run to apply changes');
    console.log('');
  } else {
    console.log('✅ Migration complete!');
    console.log('');
    console.log('📁 Living docs location:');
    console.log(`   ${path.join(projectRoot, '.specweave', 'docs', 'internal')}`);
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run main function
main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
