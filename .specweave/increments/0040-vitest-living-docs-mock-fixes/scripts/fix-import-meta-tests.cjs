#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files in the integration directory
const testFiles = glob.sync('tests/integration/**/*.test.ts');

console.log(`Found ${testFiles.length} test files to check...`);

let fixedCount = 0;

testFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');

  // Check if the file contains the problematic import.meta.url pattern
  if (content.includes('import.meta.url')) {
    console.log(`Fixing ${file}...`);

    // Replace the import.meta.url check with a simpler version that doesn't use ES modules
    // This pattern is used to check if the file is being run directly
    let newContent = content.replace(
      /const isMainModule = process\.argv\[1\] === new URL\(import\.meta\.url\)\.pathname;/g,
      '// const isMainModule = process.argv[1] === new URL(import.meta.url).pathname; // Commented out for Jest compatibility\nconst isMainModule = false; // Set to false for Jest tests'
    );

    // Also handle slight variations of this pattern
    newContent = newContent.replace(
      /const __filename = fileURLToPath\(import\.meta\.url\);/g,
      '// const __filename = fileURLToPath(import.meta.url); // Commented out for Jest compatibility\nconst __filename = __filename || "";'
    );

    // Write the fixed content back
    fs.writeFileSync(file, newContent);
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files with import.meta.url issues`);