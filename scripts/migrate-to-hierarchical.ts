#!/usr/bin/env tsx
/**
 * Quick Migration: Flat Specs → Hierarchical Structure
 * 
 * Migrates existing flat specs to hierarchical structure using SpecDistributor.
 * 
 * Usage:
 *   npx tsx scripts/migrate-to-hierarchical.ts [increment-id]
 *   npx tsx scripts/migrate-to-hierarchical.ts --all
 *   npx tsx scripts/migrate-to-hierarchical.ts --help
 */

import { SpecDistributor } from '../src/core/living-docs/index.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const projectRoot = path.join(__dirname, '..');
  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

  // Get list of increments to migrate
  let incrementIds: string[];

  if (args.includes('--all')) {
    // Find all increments with spec.md
    const allIncrements = await fs.readdir(incrementsDir);
    incrementIds = [];

    for (const dir of allIncrements) {
      const specPath = path.join(incrementsDir, dir, 'spec.md');
      if (await fs.pathExists(specPath)) {
        incrementIds.push(dir);
      }
    }

    console.log(`🔍 Found ${incrementIds.length} increments with spec.md\n`);
  } else if (args.length > 0) {
    // Specific increment
    incrementIds = args.filter(arg => !arg.startsWith('--'));

    if (incrementIds.length === 0) {
      console.error('❌ No increment ID provided');
      console.error('   Usage: npx tsx scripts/migrate-to-hierarchical.ts <increment-id>');
      process.exit(1);
    }
  } else {
    printHelp();
    return;
  }

  // Perform migrations
  let successCount = 0;
  let failureCount = 0;

  for (const incrementId of incrementIds) {
    console.log(`\n📦 Migrating increment: ${incrementId}`);

    try {
      // Create distributor
      const distributor = new SpecDistributor(projectRoot, {
        overwriteExisting: false,
        createBackups: true,
      });

      // Distribute increment
      const result = await distributor.distribute(incrementId);

      if (!result.success) {
        console.error(`   ❌ Distribution failed:`);
        for (const error of result.errors) {
          console.error(`      - ${error}`);
        }
        failureCount++;
        continue;
      }

      // Log summary
      console.log(`   ✅ Distribution successful:`);
      console.log(`      Epic ID: ${result.specId}`);
      console.log(`      User Stories: ${result.totalStories}`);
      console.log(`      Files created: ${result.totalFiles}`);

      if (result.warnings.length > 0) {
        console.log(`   ⚠️  Warnings:`);
        for (const warning of result.warnings) {
          console.log(`      - ${warning}`);
        }
      }

      successCount++;

    } catch (error) {
      console.error(`   ❌ Migration failed: ${error}`);
      failureCount++;
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`   📋 Total: ${incrementIds.length}`);

  if (successCount > 0) {
    console.log(`\n✅ Migration complete!`);
    console.log(`\n📁 New hierarchical structure created in:`);
    console.log(`   .specweave/docs/internal/specs/default/`);
  }

  if (failureCount > 0) {
    console.log(`\n⚠️  Some migrations failed. Check errors above.`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
🔄 Hierarchical Migration Script

Migrates increment specs to hierarchical living docs structure:
  - Epic file (SPEC-###.md) - High-level summary
  - User story files (us-###.md) - Detailed requirements
  - Task links with anchors (#t-001-...)

Usage:
  npx tsx scripts/migrate-to-hierarchical.ts <increment-id>
  npx tsx scripts/migrate-to-hierarchical.ts --all
  npx tsx scripts/migrate-to-hierarchical.ts --help

Examples:
  npx tsx scripts/migrate-to-hierarchical.ts 0031-external-tool-status-sync
  npx tsx scripts/migrate-to-hierarchical.ts 0030-intelligent-living-docs
  npx tsx scripts/migrate-to-hierarchical.ts --all
  `);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
