#!/usr/bin/env node
/**
 * Diagnostic script to debug Windows .specweave detection issue
 *
 * Usage:
 *   node scripts/diagnose-windows-detection.js "C:\Users\aabyzovext\Documents\TestLab\sw-demo-expense-splitter"
 */

const fs = require('fs');
const path = require('path');

function diagnoseDetection(targetDir) {
  console.log('=== SpecWeave Windows Detection Diagnostic ===\n');
  console.log('Target directory:', targetDir);
  console.log('Resolved target:', path.resolve(targetDir));
  console.log('');

  // Start from parent of target directory
  let currentDir = path.dirname(path.resolve(targetDir));
  const root = path.parse(currentDir).root;

  console.log('Starting search from:', currentDir);
  console.log('Root:', root);
  console.log('');

  let iteration = 0;
  const maxIterations = 20; // Safety limit

  // Walk up the directory tree
  while (currentDir !== root && iteration < maxIterations) {
    iteration++;
    const specweavePath = path.join(currentDir, '.specweave');

    console.log(`[${iteration}] Checking: ${currentDir}`);
    console.log(`    .specweave path: ${specweavePath}`);

    // Check if .specweave/ exists at this level
    const exists = fs.existsSync(specweavePath);
    console.log(`    Exists: ${exists}`);

    if (exists) {
      // Check if it's actually a directory
      try {
        const stats = fs.statSync(specweavePath);
        console.log(`    Is directory: ${stats.isDirectory()}`);
        console.log(`    Is file: ${stats.isFile()}`);
        console.log(`    Is hidden: ${specweavePath.includes('\\.')}`);

        // List contents if it's a directory
        if (stats.isDirectory()) {
          try {
            const contents = fs.readdirSync(specweavePath);
            console.log(`    Contents (${contents.length} items):`, contents.slice(0, 5).join(', '));
          } catch (err) {
            console.log(`    Contents: ERROR - ${err.message}`);
          }
        }
      } catch (err) {
        console.log(`    Stat error: ${err.message}`);
      }

      console.log('');
      console.log('❌ FOUND .specweave/ at:', currentDir);
      console.log('   This is blocking initialization');
      return currentDir;
    }

    // Move up one level
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      console.log('    Reached root (parent === current)');
      break;
    }
    currentDir = parentDir;
    console.log('');
  }

  if (iteration >= maxIterations) {
    console.log('⚠️  Safety limit reached (20 iterations)');
  }

  console.log('✅ No parent .specweave/ folder found');
  console.log('   Initialization should work!');
  return null;
}

// Main execution
const targetDir = process.argv[2] || process.cwd();

try {
  diagnoseDetection(targetDir);
} catch (error) {
  console.error('\n❌ Diagnostic failed:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
