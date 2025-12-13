#!/usr/bin/env node
/**
 * Remove ADO duplicate project folders (v0.37.0 fix)
 *
 * Cross-platform Node.js script (works on Windows, macOS, Linux)
 *
 * Bug: ADO import created duplicate folders like "Nova CAD" and "nova-cad"
 * Root cause: containerId used display name instead of normalized form
 * Fix: v0.37.0 normalizes containerId before creating folders
 *
 * This script consolidates duplicates into the lowercase version
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SPECS_DIR = '.specweave/docs/internal/specs';

// Normalize name (same logic as normalizeToProjectId)
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Count markdown files in directory
function countMdFiles(dir) {
  let count = 0;
  try {
    const walk = (directory) => {
      const files = fs.readdirSync(directory);
      for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (file.endsWith('.md')) {
          count++;
        }
      }
    };
    walk(dir);
  } catch (err) {
    // Ignore errors
  }
  return count;
}

// Copy directory recursively
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Remove directory recursively
function removeDir(dir) {
  if (fs.existsSync(dir)) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        removeDir(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    }
    fs.rmdirSync(dir);
  }
}

// Ask user a question
async function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  // Check if specs directory exists
  if (!fs.existsSync(SPECS_DIR)) {
    console.error(`❌ Error: ${SPECS_DIR} not found. Run this from project root.`);
    process.exit(1);
  }

  console.log('🔍 Scanning for ADO duplicate folders...\n');

  let duplicatesFound = 0;

  // Find display name folders (with spaces or uppercase)
  const folders = fs.readdirSync(SPECS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const folderName of folders) {
    const folderPath = path.join(SPECS_DIR, folderName);

    // Skip if already normalized (lowercase, no spaces, no special chars)
    const isNormalized = folderName === normalize(folderName);
    if (isNormalized) {
      continue;
    }

    // Generate normalized version
    const normalizedName = normalize(folderName);
    const normalizedPath = path.join(SPECS_DIR, normalizedName);

    // Check if normalized version exists
    if (fs.existsSync(normalizedPath)) {
      console.log('📦 Found duplicate:');
      console.log(`   Display name: ${folderName}/`);
      console.log(`   Normalized:   ${normalizedName}/`);
      console.log('');

      const displayCount = countMdFiles(folderPath);
      const normalizedCount = countMdFiles(normalizedPath);

      console.log(`   Files in display name: ${displayCount}`);
      console.log(`   Files in normalized:   ${normalizedCount}`);
      console.log('');

      console.log('   Options:');
      console.log('   1) Merge display name → normalized (keep normalized)');
      console.log('   2) Merge normalized → display name (keep display name)');
      console.log('   3) Skip this folder');

      const choice = await ask('   Choice (1/2/3): ');
      console.log('');

      switch (choice) {
        case '1':
          console.log(`   ✅ Merging '${folderName}' → '${normalizedName}'...`);
          copyDir(folderPath, normalizedPath);
          removeDir(folderPath);
          console.log(`   ✅ Merged and removed '${folderName}'`);
          console.log('');
          break;

        case '2':
          console.log(`   ✅ Merging '${normalizedName}' → '${folderName}'...`);
          copyDir(normalizedPath, folderPath);
          removeDir(normalizedPath);
          console.log(`   ✅ Merged and removed '${normalizedName}'`);
          console.log('');
          break;

        case '3':
          console.log('   ⏭️  Skipped');
          console.log('');
          break;

        default:
          console.log('   ⚠️  Invalid choice, skipping');
          console.log('');
          break;
      }

      duplicatesFound++;
    }
  }

  // Check for nested duplicates (e.g., nova-cad/nova-cad)
  console.log('');
  console.log('🔍 Scanning for nested duplicate folders...\n');

  for (const projectName of folders) {
    const projectPath = path.join(SPECS_DIR, projectName);

    // Check if subfolder exists with the same name
    const nestedPath = path.join(projectPath, projectName);

    if (fs.existsSync(nestedPath) && fs.statSync(nestedPath).isDirectory()) {
      console.log('📦 Found nested duplicate:');
      console.log(`   Project: ${projectName}/`);
      console.log(`   Nested:  ${projectName}/${projectName}/`);
      console.log('');

      const nestedCount = countMdFiles(nestedPath);
      console.log(`   Files in nested: ${nestedCount}`);
      console.log('');

      if (nestedCount === 0) {
        console.log('   ✅ Empty nested folder - removing automatically');
        removeDir(nestedPath);
        console.log('');
      } else {
        console.log('   Options:');
        console.log('   1) Move files up to parent and remove nested');
        console.log('   2) Keep nested as-is');

        const choice = await ask('   Choice (1/2): ');
        console.log('');

        switch (choice) {
          case '1':
            console.log('   ✅ Moving files from nested to parent...');
            copyDir(nestedPath, projectPath);
            removeDir(nestedPath);
            console.log('   ✅ Moved and removed nested folder');
            console.log('');
            break;

          case '2':
            console.log('   ⏭️  Kept nested folder');
            console.log('');
            break;

          default:
            console.log('   ⚠️  Invalid choice, skipping');
            console.log('');
            break;
        }
      }

      duplicatesFound++;
    }
  }

  console.log('');
  if (duplicatesFound === 0) {
    console.log('✅ No duplicates found!');
  } else {
    console.log(`✅ Processed ${duplicatesFound} duplicate folder(s)`);
    console.log('');
    console.log('💡 Future imports will use normalized names (lowercase, hyphens)');
    console.log('   Example: \'Nova CAD\' → \'nova-cad/\'');
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
