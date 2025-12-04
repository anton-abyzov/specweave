#!/usr/bin/env node

/**
 * Fix Missing .js Extensions in TypeScript Imports
 *
 * TypeScript ES modules REQUIRE .js extensions in relative imports.
 * This script automatically adds missing .js extensions to all imports.
 *
 * Usage:
 *   node scripts/fix-js-extensions.js [--dry-run]
 *
 * See: .specweave/increments/0039/reports/HOOK-IMPORT-ERROR-ULTRATHINK-ANALYSIS.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Fix imports in a single file
 */
function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let modified = content;
  let changeCount = 0;

  // Pattern 1: import ... from './path' or '../path' (without .js or .json)
  // Matches: import { foo } from './bar'
  // Matches: import { foo } from '../bar/baz'
  // Does NOT match: import { foo } from './bar.js'
  // Does NOT match: import { foo } from './bar.json'
  // Does NOT match: import { foo } from 'external-package'
  const relativeImportRegex = /from\s+(['"])(\.\.?\/[^'"]+)(?<!\.js|\.json)(['"])/g;

  modified = modified.replace(relativeImportRegex, (match, quote1, importPath, quote2) => {
    // Skip if already has .js or .json
    if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
      return match;
    }

    // Add .js extension
    changeCount++;
    return `from ${quote1}${importPath}.js${quote2}`;
  });

  // Pattern 2: export ... from './path' (same logic)
  const relativeExportRegex = /from\s+(['"])(\.\.?\/[^'"]+)(?<!\.js|\.json)(['"])/g;

  modified = modified.replace(relativeExportRegex, (match, quote1, importPath, quote2) => {
    if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
      return match;
    }

    changeCount++;
    return `from ${quote1}${importPath}.js${quote2}`;
  });

  return { modified, changeCount };
}

/**
 * Process all TypeScript files in src/
 */
async function fixAllFiles() {
  console.log('🔍 Finding TypeScript files in src/...');

  const tsFiles = await glob('src/**/*.ts', {
    cwd: rootDir,
    ignore: ['**/*.test.ts', '**/*.spec.ts', '**/*.d.ts', '**/node_modules/**']
  });

  console.log(`📝 Found ${tsFiles.length} TypeScript files\n`);

  let totalFiles = 0;
  let totalChanges = 0;
  const modifiedFiles = [];

  for (const tsFile of tsFiles) {
    const fullPath = path.join(rootDir, tsFile);
    const { modified, changeCount } = fixImportsInFile(fullPath);

    if (changeCount > 0) {
      totalFiles++;
      totalChanges += changeCount;
      modifiedFiles.push({ file: tsFile, changes: changeCount });

      if (!DRY_RUN) {
        fs.writeFileSync(fullPath, modified, 'utf-8');
        console.log(`✓ ${tsFile} (${changeCount} changes)`);
      } else {
        console.log(`[DRY RUN] Would fix ${tsFile} (${changeCount} changes)`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   Files modified: ${totalFiles}`);
  console.log(`   Total changes: ${totalChanges}`);
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No files were actually modified');
    console.log('   Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ All imports fixed! Run `npm run rebuild` to verify.');
  }

  // Show top 10 most affected files
  if (modifiedFiles.length > 0) {
    console.log('\n📋 Top affected files:');
    modifiedFiles
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 10)
      .forEach(({ file, changes }) => {
        console.log(`   ${changes.toString().padStart(3, ' ')} changes - ${file}`);
      });
  }
}

// Run the script
fixAllFiles().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
