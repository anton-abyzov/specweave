#!/usr/bin/env node
// Copy Hook Dependencies
//
// Problem: Hooks import from ../../../../dist/src/... which doesn't exist in marketplace
// Solution: Copy required compiled files from dist/src/ to plugins/*/lib/vendor/
//
// Architecture:
// - Build: tsc compiles src/**/*.ts → dist/src/**/*.js
// - Copy: This script copies dist/src/core → plugins/*/lib/vendor/core
// - Hooks: Import from ./vendor/core/... instead of ../../../../dist/src/core/...
//
// Benefits:
// - Self-contained plugins (work with or without dist/)
// - Marketplace-compatible (no build step required)
// - Simple build process (just copy files)

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Dependencies to copy for each plugin
// Auto-detected by scripts/find-hook-dependencies.js
const PLUGIN_DEPENDENCIES = {
  'specweave': [
    'dist/src/core/increment/ac-status-manager.js',
    'dist/src/core/increment/active-increment-manager.js',
    'dist/src/core/increment/auto-transition-manager.js',
    'dist/src/core/increment/duplicate-detector.js',
    'dist/src/core/increment/metadata-manager.js',
    'dist/src/core/types/increment-metadata.js',
    'dist/src/generators/spec/task-parser.js',
    'dist/src/utils/logger.js',
    'dist/src/utils/translation.js'
  ]
};

// Copy a single file and its .d.ts if exists
async function copyFile(srcPath, destPath) {
  await fs.ensureDir(path.dirname(destPath));
  await fs.copy(srcPath, destPath);

  // Copy .d.ts file if it exists
  const dtsPath = srcPath.replace(/\.js$/, '.d.ts');
  if (await fs.pathExists(dtsPath)) {
    const destDtsPath = destPath.replace(/\.js$/, '.d.ts');
    await fs.copy(dtsPath, destDtsPath);
  }

  // Copy .js.map if it exists
  const mapPath = srcPath + '.map';
  if (await fs.pathExists(mapPath)) {
    await fs.copy(mapPath, destPath + '.map');
  }
}

// Copy dependencies for a plugin
async function copyPluginDependencies(pluginName, dependencies) {
  console.log(`\n📦 Copying dependencies for plugin: ${pluginName}`);

  const pluginDir = path.join(projectRoot, 'plugins', pluginName);
  const vendorDir = path.join(pluginDir, 'lib', 'vendor');

  // Clean vendor directory
  if (await fs.pathExists(vendorDir)) {
    await fs.remove(vendorDir);
  }

  let copiedCount = 0;

  for (const dep of dependencies) {
    const srcPath = path.join(projectRoot, dep);

    if (!await fs.pathExists(srcPath)) {
      console.warn(`   ⚠️  Source not found: ${dep}`);
      continue;
    }

    // Convert dist/src/core/foo.js → lib/vendor/core/foo.js
    const relativePath = dep.replace('dist/src/', '');
    const destPath = path.join(vendorDir, relativePath);

    await copyFile(srcPath, destPath);
    console.log(`   ✅ Copied: ${relativePath}`);
    copiedCount++;
  }

  console.log(`   📊 Copied ${copiedCount}/${dependencies.length} files`);
}

// Main copy process
async function main() {
  console.log('🔧 Copying hook dependencies to plugin vendor directories...\n');

  // Check if dist/ exists
  const distPath = path.join(projectRoot, 'dist');
  if (!await fs.pathExists(distPath)) {
    console.error('❌ dist/ directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  try {
    for (const [pluginName, dependencies] of Object.entries(PLUGIN_DEPENDENCIES)) {
      await copyPluginDependencies(pluginName, dependencies);
    }

    console.log('\n✅ All hook dependencies copied successfully!');
    console.log('\nNext steps:');
    console.log('1. Update hook imports to use ./vendor/ instead of ../../../../dist/src/');
    console.log('2. Test hooks work without project dist/ directory');
    console.log('3. Add this script to build process');
  } catch (error) {
    console.error('\n❌ Copy failed:', error);
    process.exit(1);
  }
}

main();
