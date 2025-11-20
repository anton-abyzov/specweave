#!/usr/bin/env node
// Find Hook Dependencies Recursively
// Analyzes compiled JS files to find all transitive dependencies

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const ENTRY_POINTS = [
  'dist/src/core/increment/ac-status-manager.js',
  'dist/src/core/increment/auto-transition-manager.js',
  'dist/src/generators/spec/task-parser.js',
  'dist/src/utils/translation.js'
];

const visited = new Set();
const dependencies = new Set();

async function analyzeDependencies(filePath) {
  const normalizedPath = path.normalize(filePath);

  if (visited.has(normalizedPath)) {
    return;
  }

  visited.add(normalizedPath);
  dependencies.add(normalizedPath);

  const fullPath = path.join(projectRoot, filePath);

  if (!await fs.pathExists(fullPath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return;
  }

  const content = await fs.readFile(fullPath, 'utf-8');

  // Extract imports (both single and double quotes)
  const importRegex = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    let importPath = match[1];

    // Skip node built-ins and external packages
    if (!importPath.startsWith('.')) {
      continue;
    }

    // Resolve relative import
    const dir = path.dirname(fullPath);
    const resolvedPath = path.resolve(dir, importPath);
    const relativePath = path.relative(projectRoot, resolvedPath);

    // Recursively analyze
    await analyzeDependencies(relativePath);
  }
}

async function main() {
  console.log('🔍 Finding all hook dependencies recursively...\n');

  for (const entry of ENTRY_POINTS) {
    console.log(`Analyzing: ${entry}`);
    await analyzeDependencies(entry);
  }

  console.log(`\n📊 Found ${dependencies.size} total dependencies:\n`);

  const sortedDeps = Array.from(dependencies).sort();
  sortedDeps.forEach(dep => {
    console.log(`  - ${dep}`);
  });

  console.log('\n✅ Copy this list to PLUGIN_DEPENDENCIES in copy-hook-dependencies.js');
}

main();
