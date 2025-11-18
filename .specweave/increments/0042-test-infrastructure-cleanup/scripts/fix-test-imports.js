#!/usr/bin/env node

/**
 * Fix Missing .js Extensions in Test File Imports
 * Applies same logic as scripts/fix-js-extensions.js but for test files
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

/**
 * Fix imports in a single file
 */
function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let modified = content;
  let changeCount = 0;

  // Pattern: import ... from './path' or '../path' (without .js or .json)
  const relativeImportRegex = /from\s+(['"])(\.\.?\/[^'"]+?)(['"])/g;

  modified = modified.replace(relativeImportRegex, (match, quote1, importPath, quote2) => {
    // Skip if already has extension
    if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.endsWith('.ts')) {
      return match;
    }

    // Skip node_modules
    if (!importPath.startsWith('.')) {
      return match;
    }

    // Add .js extension
    changeCount++;
    return `from ${quote1}${importPath}.js${quote2}`;
  });

  return { modified, changeCount };
}

/**
 * Process all test files in tests/integration/
 */
async function fixAllTestFiles() {
  console.log('🔍 Finding test files in tests/integration/...\n');

  const testFiles = await glob('tests/integration/**/*.test.ts', {
    cwd: rootDir,
    ignore: ['**/node_modules/**']
  });

  console.log(`📝 Found ${testFiles.length} test files\n`);

  let totalFiles = 0;
  let totalChanges = 0;

  for (const testFile of testFiles) {
    const fullPath = path.join(rootDir, testFile);
    const { modified, changeCount } = fixImportsInFile(fullPath);

    if (changeCount > 0) {
      totalFiles++;
      totalChanges += changeCount;

      fs.writeFileSync(fullPath, modified, 'utf-8');
      console.log(`✓ ${testFile} (${changeCount} changes)`);
    }
  }

  console.log('\n============================================================');
  console.log('📊 Summary:');
  console.log(`   Files modified: ${totalFiles}`);
  console.log(`   Total changes: ${totalChanges}`);
  console.log('============================================================\n');

  if (totalFiles > 0) {
    console.log('✅ Test imports fixed! Run npm run test:integration to verify.');
  } else {
    console.log('ℹ️  No changes needed - all imports already correct.');
  }
}

fixAllTestFiles().catch(console.error);
