#!/usr/bin/env node

/**
 * Test script for intelligent living docs sync
 * Usage: node test-intelligent-sync.js [increment-id]
 */

import { IntelligentLivingDocsSync } from './dist/src/core/living-docs/index.js';
import path from 'path';
import fs from 'fs-extra';

const incrementId = process.argv[2] || '0016-self-reflection-system';
const projectRoot = process.cwd();
const incrementPath = path.join(projectRoot, '.specweave/increments', incrementId);
const specPath = path.join(incrementPath, 'spec.md');

console.log('🧠 Testing Intelligent Living Docs Sync');
console.log('========================================');
console.log('');
console.log(`Increment: ${incrementId}`);
console.log(`Spec path: ${specPath}`);
console.log('');

// Check if spec exists
if (!fs.existsSync(specPath)) {
  console.error(`❌ Spec file not found: ${specPath}`);
  process.exit(1);
}

// Read spec content
const specContent = fs.readFileSync(specPath, 'utf-8');
console.log(`✓ Spec file loaded (${specContent.length} bytes)`);
console.log('');

// Run intelligent sync
console.log('🔄 Running intelligent sync...');
console.log('');

try {
  const sync = new IntelligentLivingDocsSync({
    verbose: true, // Enable verbose logging
  });

  const result = await sync.syncIncrement(incrementId);

  console.log('');
  console.log('✅ Sync complete!');
  console.log('');
  console.log('📊 Results:');
  console.log(`   Files created: ${result.distribution.summary.filesCreated}`);
  console.log(`   Files updated: ${result.distribution.summary.filesUpdated}`);
  console.log(`   Files skipped: ${result.distribution.summary.filesSkipped}`);
  console.log(`   Links generated: ${result.links.length}`);
  console.log(`   Project: ${result.project.name} (${result.project.id})`);
  console.log(`   Confidence: ${(result.project.confidence * 100).toFixed(1)}%`);
  console.log(`   Duration: ${result.duration}ms`);
  console.log(`   Success: ${result.success ? '✅' : '❌'}`);
  if (result.errors.length > 0) {
    console.log(`   Errors: ${result.errors.length}`);
    result.errors.forEach((err, i) => console.log(`     ${i + 1}. ${err}`));
  }
  console.log('');
  console.log('📁 Output directory:');
  console.log(`   ${path.join(projectRoot, '.specweave/docs/internal')}`);
  console.log('');

  process.exit(0);
} catch (error) {
  console.error('❌ Sync failed:', error.message);
  console.error('');
  console.error('Stack trace:');
  console.error(error.stack);
  process.exit(1);
}
