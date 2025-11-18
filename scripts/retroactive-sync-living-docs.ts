#!/usr/bin/env tsx
/**
 * Retroactive Living Docs Sync
 *
 * Syncs all completed increments that don't have living docs yet.
 * Specifically targets increments 0022, 0040, 0041, 0042 (skips 0034 - no spec.md)
 */

import { syncSpecs } from '../src/cli/commands/sync-specs.js';
import fs from 'fs-extra';
import path from 'path';

const MISSING_INCREMENTS = [
  '0022-multi-repo-init-ux',
  // Skip 0034 - no spec.md file!
  '0040-vitest-living-docs-mock-fixes',
  '0041-living-docs-test-fixes',
  '0042-test-infrastructure-cleanup'
];

async function main() {
  console.log('🔄 Starting retroactive living docs sync...\n');
  console.log(`Target increments: ${MISSING_INCREMENTS.length}`);
  console.log(`  - ${MISSING_INCREMENTS.join('\n  - ')}\n`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const incrementId of MISSING_INCREMENTS) {
    console.log(`\n📚 Syncing ${incrementId}...`);

    try {
      // Check if spec.md exists
      const specPath = path.join(
        process.cwd(),
        '.specweave/increments',
        incrementId,
        'spec.md'
      );

      if (!await fs.pathExists(specPath)) {
        console.log(`   ⚠️  Skipped (no spec.md)`);
        skipCount++;
        continue;
      }

      // Sync increment
      await syncSpecs([incrementId]);
      successCount++;
      console.log(`   ✅ Success`);

    } catch (error) {
      failCount++;
      console.error(`   ❌ Failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Retroactive sync complete!\n');
  console.log(`Results:`);
  console.log(`  ✅ Succeeded: ${successCount}`);
  console.log(`  ⚠️  Skipped: ${skipCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log('='.repeat(60));

  // Verify living docs created
  console.log('\n📂 Verifying living docs structure...\n');

  const expectedFeatures = [
    'FS-022',
    // FS-034 skipped (no spec.md)
    'FS-040',
    'FS-041',
    'FS-042'
  ];

  for (const featureId of expectedFeatures) {
    const featurePath = path.join(
      process.cwd(),
      `.specweave/docs/internal/specs/_features/${featureId}/FEATURE.md`
    );

    const exists = await fs.pathExists(featurePath);
    console.log(`  ${exists ? '✅' : '❌'} ${featureId}: ${exists ? 'Created' : 'Missing'}`);
  }

  console.log('\n✅ Retroactive sync verification complete!');
}

main().catch(error => {
  console.error('❌ Retroactive sync failed:', error);
  process.exit(1);
});
