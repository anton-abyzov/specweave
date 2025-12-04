#!/usr/bin/env node

/**
 * Cross-platform script to copy locale files from src/ to dist/
 * Replaces Unix commands (mkdir -p, cp -r) with Node.js fs operations
 */

import { mkdirSync, cpSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const srcLocales = join(projectRoot, 'src', 'locales');
const distLocales = join(projectRoot, 'dist', 'src', 'locales');

try {
  // Create dist/locales directory if it doesn't exist
  if (!existsSync(distLocales)) {
    mkdirSync(distLocales, { recursive: true });
  }

  // Copy all locale files recursively
  cpSync(srcLocales, distLocales, { recursive: true });

  console.log('✓ Locales copied successfully');
} catch (error) {
  console.error('✗ Failed to copy locales:', error.message);
  process.exit(1);
}
