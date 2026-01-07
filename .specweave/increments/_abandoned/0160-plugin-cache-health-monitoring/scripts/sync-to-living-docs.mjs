#!/usr/bin/env node
/**
 * Sync increment 0160 to living docs
 */

import { LivingDocsSync } from '../../../../dist/src/core/living-docs/living-docs-sync.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../../../..');
const incrementId = '0160-plugin-cache-health-monitoring';

console.log('🔄 Syncing increment to living docs...');
console.log(`📁 Project root: ${projectRoot}`);
console.log(`🎯 Increment: ${incrementId}`);
console.log('');

try {
  const sync = new LivingDocsSync(projectRoot);
  const result = await sync.syncIncrement(incrementId, { dryRun: false, force: false });

  if (result.success) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ SYNC COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(`Increment: ${incrementId}`);
    console.log(`Feature ID: ${result.featureId}`);
    console.log(`Project: ${result.project || 'N/A'}`);
    console.log('');
    console.log('Files created:');
    for (const file of result.filesCreated || []) {
      console.log(`  • ${file}`);
    }
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
  } else {
    console.log('❌ SYNC FAILED');
    console.log('');
    console.log('Errors:');
    for (const error of result.errors || []) {
      console.log(`  • ${error}`);
    }
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error syncing increment:', error.message);
  console.error(error.stack);
  process.exit(1);
}
