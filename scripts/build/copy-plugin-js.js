#!/usr/bin/env node

/**
 * Transpile plugin TypeScript files to JavaScript using esbuild
 *
 * Plugins cannot be compiled with the main tsconfig because they have
 * complex cross-dependencies. Instead, we use esbuild to quickly transpile
 * them in-place with minimal type checking.
 *
 * All stale files go to ONE esbuild process (no bundling, so each file is
 * transformed on its own and the output matches a per-file run byte for
 * byte). Spawning `npx esbuild` once per file cost 6-13 s per build in CI.
 * If the batch fails, the per-file loop runs so one bad file only warns.
 */

import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const FLAGS = '--format=esm --target=es2020 --platform=node';

function isStale(tsFile) {
  const fullPath = path.join(rootDir, tsFile);
  const jsPath = fullPath.replace(/\.ts$/, '.js');
  // Skip if .js already exists and is newer than .ts
  return !existsSync(jsPath) || statSync(jsPath).mtimeMs <= statSync(fullPath).mtimeMs;
}

function transpileOneByOne(files) {
  let ok = 0;
  for (const tsFile of files) {
    try {
      execSync(`npx esbuild "${tsFile}" --outfile="${tsFile.replace(/\.ts$/, '.js')}" ${FLAGS}`, { cwd: rootDir, stdio: 'pipe' });
      ok++;
    } catch (error) {
      console.warn(`⚠️  Failed to transpile ${tsFile}:`, error.message);
    }
  }
  return ok;
}

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

  const stale = tsFiles.filter(isStale);
  const skipCount = tsFiles.length - stale.length;
  let successCount = 0;

  if (stale.length > 0) {
    try {
      // --outbase keeps every output next to its source, as --outfile did.
      execSync(`npx esbuild ${stale.map(f => `"${f}"`).join(' ')} --outdir=. --outbase=. ${FLAGS}`, { cwd: rootDir, stdio: 'pipe' });
      successCount = stale.length;
    } catch (error) {
      console.warn(`⚠️  Batch transpile failed (${error.message.split('\n')[0]}); retrying file by file`);
      successCount = transpileOneByOne(stale);
    }
  }

  console.log(`✓ Transpiled ${successCount} plugin files (${skipCount} skipped, already up-to-date)`);
}

transpilePlugins().catch(err => {
  console.error('❌ Error transpiling plugin files:', err);
  process.exit(1);
});
