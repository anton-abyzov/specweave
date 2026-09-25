#!/usr/bin/env node
// Copy Hook Dependencies
//
// Problem: plugin lib integrations import shared src/ modules, which are not
// reachable by a relative path from a marketplace install of the plugin
// Solution: Copy the required compiled files from dist/src/ to plugins/*/lib/vendor/
//
// Architecture:
// - Build: tsc compiles src/**/*.ts → dist/src/**/*.js
// - Copy: This script copies the listed dist/src files → plugins/*/lib/vendor/
// - Plugin lib: imports ../../vendor/... instead of ../../../../dist/src/...
//
// Benefits:
// - Self-contained plugins (work with or without dist/)
// - Marketplace-compatible (no build step required)
// - Simple build process (just copy files)

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Native fs helpers (fs-extra compatibility)
const fs = {
  async ensureDir(dir) {
    await fsPromises.mkdir(dir, { recursive: true });
  },
  async copy(src, dest) {
    await fsPromises.copyFile(src, dest);
  },
  async pathExists(filepath) {
    return existsSync(filepath);
  },
  async remove(filepath) {
    if (existsSync(filepath)) {
      rmSync(filepath, { recursive: true, force: true });
    }
  }
};

// Runtime modules imported by plugins/specweave/lib/integrations/** through
// ../../vendor/... (their full transitive closure; type-only imports are elided).
const PLUGIN_DEPENDENCIES = {
  'specweave': [
    'dist/src/utils/logger.js',
    'dist/src/utils/credential-masker.js',
    'dist/src/utils/feature-id-derivation.js',
    'dist/src/utils/execFileNoThrow.js',
    'dist/src/utils/clean-env.js',
    'dist/src/utils/auth-helpers.js',
    'dist/src/sync/provider-router.js',
    'dist/src/sync/status-mapper.js',
    'dist/src/sync/config.js',
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

  // Also copy to dist/plugins/ so imports work from compiled living-docs-sync
  const distVendorDir = path.join(projectRoot, 'dist', 'plugins', pluginName, 'lib', 'vendor');

  // Clean vendor directories
  if (await fs.pathExists(vendorDir)) {
    await fs.remove(vendorDir);
  }
  if (await fs.pathExists(distVendorDir)) {
    await fs.remove(distVendorDir);
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
    const distDestPath = path.join(distVendorDir, relativePath);

    await copyFile(srcPath, destPath);
    await copyFile(srcPath, distDestPath);
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
  } catch (error) {
    console.error('\n❌ Copy failed:', error);
    process.exit(1);
  }
}

main();
