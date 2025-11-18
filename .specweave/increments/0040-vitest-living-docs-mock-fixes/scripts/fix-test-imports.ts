#!/usr/bin/env tsx
/**
 * Fix Test Import Paths After Reorganization
 *
 * After moving tests from tests/integration/* to tests/integration/{category}/*,
 * all relative imports need an extra '../' to reach src/, plugins/, tests/helpers/, etc.
 *
 * This script automatically fixes all import paths in reorganized test files.
 *
 * Usage:
 *   npx tsx scripts/fix-test-imports.ts
 *   npx tsx scripts/fix-test-imports.ts --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const DRY_RUN = process.argv.includes('--dry-run');

const testDirs = [
  'tests/integration/external-tools',
  'tests/integration/core',
  'tests/integration/generators',
  'tests/integration/features',
];

let filesFixed = 0;
let totalChanges = 0;

console.log(DRY_RUN ? '🔍 DRY RUN MODE' : '🔧 FIXING IMPORT PATHS');
console.log('');

for (const dir of testDirs) {
  console.log(`\n📂 Processing ${dir}...`);

  const files = glob.sync(`${dir}/**/*.{test,spec}.ts`, {
    ignore: ['**/node_modules/**'],
  });

  console.log(`   Found ${files.length} test files`);

  for (const file of files) {
    const originalContent = fs.readFileSync(file, 'utf-8');
    let content = originalContent;
    let fileChanges = 0;

    // Fix imports from src/
    const srcMatches = content.match(/from ['"](\.\.\/)+(src\/[^'"]+)['"]/g);
    if (srcMatches) {
      content = content.replace(
        /from ['"](\.\.\/)+(src\/[^'"]+)['"]/g,
        (match, dots, rest) => {
          fileChanges++;
          return `from '${dots}../${rest}'`;
        }
      );
    }

    // Fix imports from helpers/ (tests/helpers/)
    const helpersMatches = content.match(
      /from ['"](\.\.\/)+(helpers\/[^'"]+)['"]/g
    );
    if (helpersMatches) {
      content = content.replace(
        /from ['"](\.\.\/)+(helpers\/[^'"]+)['"]/g,
        (match, dots, rest) => {
          fileChanges++;
          return `from '${dots}../${rest}'`;
        }
      );
    }

    // Fix imports from plugins/
    const pluginsMatches = content.match(
      /from ['"](\.\.\/)+(plugins\/[^'"]+)['"]/g
    );
    if (pluginsMatches) {
      content = content.replace(
        /from ['"](\.\.\/)+(plugins\/[^'"]+)['"]/g,
        (match, dots, rest) => {
          fileChanges++;
          return `from '${dots}../${rest}'`;
        }
      );
    }

    if (fileChanges > 0) {
      console.log(`   ✅ ${path.basename(file)}: ${fileChanges} imports fixed`);
      filesFixed++;
      totalChanges += fileChanges;

      if (!DRY_RUN) {
        fs.writeFileSync(file, content);
      }
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Summary:`);
console.log(`   Files processed: ${filesFixed}`);
console.log(`   Total imports fixed: ${totalChanges}`);
console.log('');

if (DRY_RUN) {
  console.log('🔍 DRY RUN - No files were modified');
  console.log('   Run without --dry-run to apply changes');
} else {
  console.log('✅ Import paths fixed successfully!');
}
