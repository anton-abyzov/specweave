#!/usr/bin/env node

/**
 * Cross-platform script to copy adapter assets (non-TS files) from src/ to dist/
 * Copies .md, .json, and other non-compiled files that adapters need at runtime
 */

import { cpSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '../..');
const srcAdapters = join(projectRoot, 'src', 'adapters');
const distAdapters = join(projectRoot, 'dist', 'src', 'adapters');

// Extensions to skip (handled by TypeScript compiler)
const SKIP_EXTENSIONS = ['.ts', '.tsx'];

/**
 * Recursively copy non-TS files from src to dist
 */
function copyNonTsFiles(srcDir, destDir) {
  if (!existsSync(srcDir)) return;

  const entries = readdirSync(srcDir);

  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyNonTsFiles(srcPath, destPath);
    } else {
      const ext = extname(entry).toLowerCase();
      if (!SKIP_EXTENSIONS.includes(ext)) {
        // Ensure parent directory exists (cross-platform safety)
        mkdirSync(dirname(destPath), { recursive: true });
        cpSync(srcPath, destPath);
      }
    }
  }
}

try {
  if (!existsSync(srcAdapters)) {
    console.log('✓ No src/adapters directory - skipping');
    process.exit(0);
  }

  // Ensure dist/src/adapters exists
  if (!existsSync(distAdapters)) {
    mkdirSync(distAdapters, { recursive: true });
  }

  copyNonTsFiles(srcAdapters, distAdapters);
  console.log('✓ Adapter assets copied successfully');
} catch (error) {
  // Log the error but don't fail the build - adapters are optional
  console.warn('⚠ Warning: Could not copy adapter assets:', error.message);
  console.warn('  This is non-fatal - continuing build...');
  // Exit with 0 so it doesn't break the build
  process.exit(0);
}
