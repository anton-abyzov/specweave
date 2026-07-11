#!/usr/bin/env node

/**
 * Transpile plugin TypeScript files to JavaScript using esbuild
 *
 * Plugins cannot be compiled with the main tsconfig because they have
 * complex cross-dependencies. Instead, we use esbuild to quickly transpile
 * them in-place with minimal type checking.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

async function transpilePlugins() {
  console.log('📦 Transpiling plugin TypeScript files with esbuild...');

  // Find all .ts files in plugins/*/lib/ and plugins/*/commands/
  const tsFiles = await glob('plugins/**/{lib,commands}/**/*.ts', {
    cwd: rootDir,
    ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**']
  });

  if (tsFiles.length === 0) {
    console.log('⚠️  No plugin TypeScript files found.');
    return;
  }

  let successCount = 0;
  let skipCount = 0;

  for (const tsFile of tsFiles) {
    const fullPath = path.join(rootDir, tsFile);
    const jsPath = fullPath.replace(/\.ts$/, '.js');

    // Skip if .js already exists and is newer than .ts
    if (existsSync(jsPath)) {
      const tsStats = statSync(fullPath);
      const jsStats = statSync(jsPath);
      if (jsStats.mtimeMs > tsStats.mtimeMs) {
        skipCount++;
        continue;
      }
    }

    try {
      // Use esbuild to transpile single file (fast, no type checking)
      execSync(
        `npx esbuild ${tsFile} --outfile=${tsFile.replace(/\.ts$/, '.js')} --format=esm --target=es2020 --platform=node`,
        { cwd: rootDir, stdio: 'pipe' }
      );
      successCount++;
    } catch (error) {
      console.warn(`⚠️  Failed to transpile ${tsFile}:`, error.message);
    }
  }

  console.log(`✓ Transpiled ${successCount} plugin files (${skipCount} skipped, already up-to-date)`);
}

transpilePlugins().catch(err => {
  console.error('❌ Error transpiling plugin files:', err);
  process.exit(1);
});
