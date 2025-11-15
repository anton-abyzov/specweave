#!/usr/bin/env ts-node

/**
 * Test script for the feature archiving system
 *
 * This script tests:
 * 1. Feature archiving when increments are archived
 * 2. Epic archiving when features are archived
 * 3. Link updating in all files
 * 4. Restoration of features and epics
 */

import { FeatureArchiver } from '../dist/src/core/living-docs/feature-archiver.js';
import { IncrementArchiver } from '../dist/src/core/increment/increment-archiver.js';

async function main() {
  const rootDir = process.cwd();

  console.log('🧪 Testing Feature Archiving System\n');

  // Initialize archivers
  const incrementArchiver = new IncrementArchiver(rootDir);
  const featureArchiver = new FeatureArchiver(rootDir);

  // Step 1: Get current statistics
  console.log('📊 Current Archive Statistics:');
  const initialStats = await featureArchiver.getArchiveStats();
  console.log(`  Features: ${initialStats.features.active} active, ${initialStats.features.archived} archived`);
  console.log(`  Epics: ${initialStats.epics.active} active, ${initialStats.epics.archived} archived`);

  if (Object.keys(initialStats.projects).length > 0) {
    console.log('  Per Project:');
    for (const [project, counts] of Object.entries(initialStats.projects)) {
      console.log(`    ${project}: ${counts.active} active, ${counts.archived} archived`);
    }
  }

  // Step 2: Dry run to see what would be archived
  console.log('\n🔍 Running dry-run to preview archiving...');
  const dryRunResult = await featureArchiver.archiveFeatures({
    dryRun: true,
    updateLinks: false,
    preserveActiveFeatures: true,
    archiveOrphanedFeatures: true,
    archiveOrphanedEpics: true
  });

  console.log('\n📋 Dry Run Results:');
  console.log(`  Features that would be archived: ${dryRunResult.archivedFeatures.length}`);
  if (dryRunResult.archivedFeatures.length > 0) {
    console.log(`    ${dryRunResult.archivedFeatures.join(', ')}`);
  }

  console.log(`  Epics that would be archived: ${dryRunResult.archivedEpics.length}`);
  if (dryRunResult.archivedEpics.length > 0) {
    console.log(`    ${dryRunResult.archivedEpics.join(', ')}`);
  }

  if (dryRunResult.errors.length > 0) {
    console.error('\n❌ Errors during dry run:');
    dryRunResult.errors.forEach(err => console.error(`  - ${err}`));
  }

  // Step 3: Check archived increments
  console.log('\n📦 Checking archived increments...');
  const archivedIncrements = await incrementArchiver.listArchived();
  console.log(`  Found ${archivedIncrements.length} archived increments`);
  if (archivedIncrements.length > 0) {
    console.log(`  Latest 5: ${archivedIncrements.slice(-5).join(', ')}`);
  }

  // Step 4: Perform actual archiving if confirmed
  // For testing, we'll skip the interactive prompt and use command line args
  const confirm = process.argv.includes('--confirm');

  if (confirm) {
    console.log('\n🚀 Performing actual archiving...');
    const result = await featureArchiver.archiveFeatures({
      dryRun: false,
      updateLinks: true,
      preserveActiveFeatures: true,
      archiveOrphanedFeatures: true,
      archiveOrphanedEpics: true
    });

    console.log('\n✅ Archive Results:');
    console.log(`  Features archived: ${result.archivedFeatures.length}`);
    if (result.archivedFeatures.length > 0) {
      console.log(`    ${result.archivedFeatures.join(', ')}`);
    }

    console.log(`  Epics archived: ${result.archivedEpics.length}`);
    if (result.archivedEpics.length > 0) {
      console.log(`    ${result.archivedEpics.join(', ')}`);
    }

    console.log(`  Links updated: ${result.updatedLinks.length}`);
    if (result.updatedLinks.length > 0) {
      const uniqueFiles = new Set(result.updatedLinks.map(u => u.file));
      console.log(`    in ${uniqueFiles.size} files`);
    }

    if (result.errors.length > 0) {
      console.error('\n❌ Errors:');
      result.errors.forEach(err => console.error(`  - ${err}`));
    }

    // Final statistics
    console.log('\n📊 Final Archive Statistics:');
    const finalStats = await featureArchiver.getArchiveStats();
    console.log(`  Features: ${finalStats.features.active} active, ${finalStats.features.archived} archived`);
    console.log(`  Epics: ${finalStats.epics.active} active, ${finalStats.epics.archived} archived`);

    if (Object.keys(finalStats.projects).length > 0) {
      console.log('  Per Project:');
      for (const [project, counts] of Object.entries(finalStats.projects)) {
        console.log(`    ${project}: ${counts.active} active, ${counts.archived} archived`);
      }
    }

    // Test restoration
    if (result.archivedFeatures.length > 0) {
      const restoreConfirm = process.argv.includes('--test-restore');

      if (restoreConfirm) {
        const featureToRestore = result.archivedFeatures[0];
        console.log(`\n🔄 Testing restoration of ${featureToRestore}...`);

        try {
          await featureArchiver.restoreFeature(featureToRestore);
          console.log(`✅ Successfully restored ${featureToRestore}`);

          const restoredStats = await featureArchiver.getArchiveStats();
          console.log(`\n📊 After Restoration:`);
          console.log(`  Features: ${restoredStats.features.active} active, ${restoredStats.features.archived} archived`);
        } catch (error) {
          console.error(`❌ Failed to restore: ${error.message}`);
        }
      }
    }
  } else {
    console.log('❌ Archiving cancelled');
  }

  console.log('\n✅ Test complete!');
}

// Run the test
main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});