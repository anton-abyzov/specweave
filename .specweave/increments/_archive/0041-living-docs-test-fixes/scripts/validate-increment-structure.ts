#!/usr/bin/env tsx
/**
 * Increment Structure Validation Script
 *
 * Validates that all increments follow the mandatory folder structure:
 * - ONLY spec.md, plan.md, tasks.md, metadata.json, README.md at root
 * - ALL other files in subfolders: reports/, scripts/, logs/, diagrams/
 *
 * Usage:
 *   npx tsx .specweave/increments/0041-living-docs-test-fixes/scripts/validate-increment-structure.ts
 *   npx tsx .specweave/increments/0041-living-docs-test-fixes/scripts/validate-increment-structure.ts --fix
 */

import {
  validateAllIncrements,
  formatValidationResults
} from '../../../../src/core/validation/increment-structure-validator.js';
import * as path from 'path';
import * as fs from 'fs/promises';

const SPECWEAVE_ROOT = path.join(process.cwd(), '.specweave');
const FIX_MODE = process.argv.includes('--fix');

async function main() {
  console.log('🔍 Validating increment structure...\n');

  const results = await validateAllIncrements(SPECWEAVE_ROOT);

  // Display results
  const formatted = formatValidationResults(results);
  console.log(formatted);

  // Check if there are any violations
  const hasViolations = Array.from(results.values()).some(result => !result.valid);

  if (!hasViolations) {
    console.log('\n✅ All increments have clean structure!\n');
    process.exit(0);
  }

  // If fix mode, move files to appropriate folders
  if (FIX_MODE) {
    console.log('\n🔧 Fix mode enabled - moving misplaced files...\n');

    for (const [incrementId, result] of results) {
      if (!result.valid) {
        const incrementPath = path.join(SPECWEAVE_ROOT, 'increments', incrementId);

        for (const error of result.errors) {
          // Extract filename from error message "Unknown root-level file: filename.ext. Move to..."
          const match = error.match(/Unknown root-level file: ([^\s]+\.[^\s]+?)\./);
          if (match) {
            const filename = match[1];

            // Determine destination folder
            if (filename.endsWith('.md')) {
              // Markdown files go to reports/
              await moveToFolder(incrementPath, filename, 'reports');
            } else if (filename.endsWith('.ts') || filename.endsWith('.js') || filename.endsWith('.sh')) {
              // Scripts go to scripts/
              await moveToFolder(incrementPath, filename, 'scripts');
            } else if (filename.endsWith('.log')) {
              // Logs go to logs/
              await moveToFolder(incrementPath, filename, 'logs');
            } else {
              // Everything else goes to reports/ as fallback
              await moveToFolder(incrementPath, filename, 'reports');
            }
          }
        }
      }
    }

    console.log('✅ Files moved to appropriate folders\n');
  } else {
    console.log('\n💡 Run with --fix flag to automatically move misplaced files\n');
    process.exit(1);
  }
}

async function moveToFolder(incrementPath: string, filename: string, folder: string) {
  const sourcePath = path.join(incrementPath, filename);
  const destDir = path.join(incrementPath, folder);
  const destPath = path.join(destDir, filename);

  try {
    // Check if source exists
    await fs.access(sourcePath);

    // Create destination directory if it doesn't exist
    await fs.mkdir(destDir, { recursive: true });

    // Move file
    await fs.rename(sourcePath, destPath);
    console.log(`  ✓ Moved ${filename} to ${folder}/`);
  } catch (error) {
    console.error(`  ✗ Failed to move ${filename}:`, error instanceof Error ? error.message : String(error));
  }
}

main().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
