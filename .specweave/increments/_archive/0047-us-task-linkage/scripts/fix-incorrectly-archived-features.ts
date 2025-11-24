#!/usr/bin/env tsx
/**
 * Fix Incorrectly Archived Features
 *
 * Restores features that were incorrectly archived even though
 * they have active increments.
 *
 * Root Cause: ALL features were moved to _archive/ but increments
 * 0040-0047 are still active. This breaks consistency.
 *
 * Solution: Restore any feature that has at least one active increment.
 */

import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { FeatureArchiver } from '../../../../dist/src/core/living-docs/feature-archiver.js';

const rootDir = process.cwd();

interface FeatureRestoreResult {
  featureId: string;
  activeIncrements: string[];
  restored: boolean;
  error?: string;
}

async function getActiveIncrements(): Promise<string[]> {
  const pattern = path.join(rootDir, '.specweave', 'increments', '[0-9]*-*');
  const paths = await glob(pattern);

  const increments = [];
  for (const p of paths) {
    const stats = await fs.stat(p);
    if (stats.isDirectory()) {
      increments.push(path.basename(p));
    }
  }

  return increments;
}

async function getFeatureIdFromIncrement(increment: string): Promise<string | null> {
  const specPath = path.join(rootDir, '.specweave', 'increments', increment, 'spec.md');

  if (!await fs.pathExists(specPath)) {
    return null;
  }

  const content = await fs.readFile(specPath, 'utf-8');

  // Support both new format (feature_id) and legacy format (epic)
  const featureIdMatch = content.match(/^feature_id:\s*["']?([^"'\n]+)["']?$/m);
  const epicMatch = content.match(/^epic:\s*["']?([^"'\n]+)["']?$/m);

  const featureId = featureIdMatch ? featureIdMatch[1].trim() :
                   epicMatch ? epicMatch[1].trim() : null;

  return featureId;
}

async function getArchivedFeatures(): Promise<string[]> {
  const archiveDir = path.join(rootDir, '.specweave', 'docs', 'internal', 'specs', '_features', '_archive');

  if (!await fs.pathExists(archiveDir)) {
    return [];
  }

  const pattern = path.join(archiveDir, 'FS-*');
  const paths = await glob(pattern);

  const features = [];
  for (const p of paths) {
    const stats = await fs.stat(p);
    if (stats.isDirectory()) {
      features.push(path.basename(p));
    }
  }

  return features;
}

async function main() {
  console.log('🔍 Analyzing incorrectly archived features...\n');

  // 1. Get all active increments
  const activeIncrements = await getActiveIncrements();
  console.log(`📊 Found ${activeIncrements.length} active increments\n`);

  // 2. Get all archived features
  const archivedFeatures = await getArchivedFeatures();
  console.log(`📊 Found ${archivedFeatures.length} archived features\n`);

  // 3. Build map: feature → active increments
  const featureMap = new Map<string, string[]>();

  for (const increment of activeIncrements) {
    const featureId = await getFeatureIdFromIncrement(increment);
    if (featureId) {
      if (!featureMap.has(featureId)) {
        featureMap.set(featureId, []);
      }
      featureMap.get(featureId)!.push(increment);
    }
  }

  console.log(`📊 Found ${featureMap.size} unique features with active increments\n`);

  // 4. Identify features to restore (archived but have active increments)
  const toRestore: { featureId: string; activeIncrements: string[] }[] = [];

  for (const [featureId, increments] of featureMap.entries()) {
    if (archivedFeatures.includes(featureId)) {
      toRestore.push({ featureId, activeIncrements: increments });
    }
  }

  if (toRestore.length === 0) {
    console.log('✅ No incorrectly archived features found. All is well!');
    return;
  }

  console.log(`⚠️  Found ${toRestore.length} incorrectly archived features:\n`);

  for (const item of toRestore) {
    console.log(`  ${item.featureId}:`);
    console.log(`    Active increments: ${item.activeIncrements.join(', ')}`);
  }

  console.log('\n🔄 Restoring features...\n');

  // 5. Restore each feature
  const results: FeatureRestoreResult[] = [];
  const featureArchiver = new FeatureArchiver(rootDir);

  for (const item of toRestore) {
    const result: FeatureRestoreResult = {
      featureId: item.featureId,
      activeIncrements: item.activeIncrements,
      restored: false
    };

    try {
      await featureArchiver.restoreFeature(item.featureId);
      result.restored = true;
      console.log(`✅ Restored: ${item.featureId}`);
    } catch (error: any) {
      result.error = error.message;
      console.error(`❌ Failed: ${item.featureId} - ${error.message}`);
    }

    results.push(result);
  }

  // 6. Summary
  console.log('\n📊 Summary:\n');

  const restored = results.filter(r => r.restored).length;
  const failed = results.filter(r => !r.restored).length;

  console.log(`  ✅ Restored: ${restored} features`);
  console.log(`  ❌ Failed: ${failed} features`);

  if (restored > 0) {
    console.log('\n✅ Features restored to active location:');
    results.filter(r => r.restored).forEach(r => {
      console.log(`  - ${r.featureId} (${r.activeIncrements.length} active increments)`);
    });
  }

  if (failed > 0) {
    console.log('\n❌ Failed restorations:');
    results.filter(r => !r.restored).forEach(r => {
      console.log(`  - ${r.featureId}: ${r.error}`);
    });
  }

  console.log('\n✅ Recovery complete!');
  console.log('\nNext: Verify living docs are now in sync with active increments');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
