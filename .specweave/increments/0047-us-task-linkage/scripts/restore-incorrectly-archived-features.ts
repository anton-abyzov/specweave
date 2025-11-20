#!/usr/bin/env tsx
/**
 * Restore Features Incorrectly Archived by Buggy Logic
 *
 * This script restores features that were incorrectly archived due to two bugs:
 * 1. String search instead of frontmatter parsing (false positive matches)
 * 2. Partial string matching with .includes() instead of exact match
 *
 * Features to restore (incorrectly archived on 2025-11-20):
 * - FS-046, FS-045, FS-044 (Console Elimination - still has active increments)
 * - FS-038, FS-037, FS-035, FS-033 (still have active increments)
 * - FS-031, FS-028, FS-023, FS-022 (still have active increments)
 *
 * ONLY FS-039 should have been archived (all increments actually archived).
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..', '..', '..');

interface RestoreResult {
  featureId: string;
  restored: boolean;
  reason: string;
  projectFolders: string[];
}

/**
 * Restore a feature from _archive back to active
 */
async function restoreFeature(featureId: string): Promise<RestoreResult> {
  const result: RestoreResult = {
    featureId,
    restored: false,
    reason: '',
    projectFolders: []
  };

  const specsDir = path.join(rootDir, '.specweave', 'docs', 'internal', 'specs');
  const featuresArchive = path.join(specsDir, '_features', '_archive', featureId);
  const featuresActive = path.join(specsDir, '_features', featureId);

  // Check if feature is in archive
  if (!await fs.pathExists(featuresArchive)) {
    result.reason = 'Not in archive (already active or never existed)';
    return result;
  }

  // Check if already active (duplicate)
  if (await fs.pathExists(featuresActive)) {
    result.reason = 'Already exists in active location (manual restoration needed)';
    return result;
  }

  // Restore _features folder
  await fs.move(featuresArchive, featuresActive);
  console.log(`  ✅ Restored _features/${featureId}`);

  // Restore project-specific folders
  const projectDirs = await fs.readdir(specsDir);

  for (const projectId of projectDirs) {
    if (projectId.startsWith('_')) continue; // Skip _features, _epics, _archive

    const projectArchive = path.join(specsDir, projectId, '_archive', featureId);
    const projectActive = path.join(specsDir, projectId, featureId);

    if (await fs.pathExists(projectArchive)) {
      await fs.move(projectArchive, projectActive);
      console.log(`  ✅ Restored ${projectId}/${featureId}`);
      result.projectFolders.push(projectId);
    }
  }

  result.restored = true;
  result.reason = 'Successfully restored from archive';
  return result;
}

/**
 * Main restoration logic
 */
async function main() {
  console.log('🔄 Restoring Incorrectly Archived Features\n');
  console.log('Root cause: Two critical bugs in feature archiving logic:');
  console.log('  1. String search (.includes()) instead of frontmatter parsing');
  console.log('  2. Partial matching (.includes()) instead of exact match (===)');
  console.log('');

  // Features that were incorrectly archived
  const featuresToRestore = [
    'FS-046', // Console Elimination - still has active increment 0046
    'FS-045', // Living Docs External Sync - still has active increment 0045
    'FS-044', // Integration Testing Status Hooks - still has active increment 0044
    'FS-043', // Spec MD Desync Fix - still has active increment 0043
    'FS-042', // Test Infrastructure Cleanup - still has active increment 0042
    'FS-041', // Living Docs Test Fixes - still has active increment 0041
    'FS-040', // Vitest Living Docs Mock Fixes - still has active increment 0040
    'FS-038', // Unknown - check if has active increments
    'FS-037', // Unknown - check if has active increments
    'FS-035', // Unknown - check if has active increments
    'FS-033', // Unknown - check if has active increments
    'FS-031', // Unknown - check if has active increments
    'FS-028', // Unknown - check if has active increments
    'FS-023', // Unknown - check if has active increments
    'FS-022', // Unknown - check if has active increments
  ];

  console.log(`📦 Attempting to restore ${featuresToRestore.length} features\n`);

  const results: RestoreResult[] = [];

  for (const featureId of featuresToRestore) {
    console.log(`\n🔍 ${featureId}:`);
    const result = await restoreFeature(featureId);
    results.push(result);

    if (result.restored) {
      console.log(`  ✅ ${result.reason}`);
      if (result.projectFolders.length > 0) {
        console.log(`  📁 Project folders restored: ${result.projectFolders.join(', ')}`);
      }
    } else {
      console.log(`  ⏭️  ${result.reason}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Restoration Summary\n');

  const restored = results.filter(r => r.restored);
  const skipped = results.filter(r => !r.restored);

  console.log(`✅ Restored: ${restored.length} features`);
  if (restored.length > 0) {
    restored.forEach(r => console.log(`   - ${r.featureId}`));
  }

  console.log(`\n⏭️  Skipped: ${skipped.length} features`);
  if (skipped.length > 0) {
    skipped.forEach(r => console.log(`   - ${r.featureId}: ${r.reason}`));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Restoration complete!');
  console.log('\nNext steps:');
  console.log('1. Verify features are in correct location');
  console.log('2. Run increment archiving again with fixed logic');
  console.log('3. Only FS-039 should be archived (all increments actually archived)');
}

main().catch(console.error);
