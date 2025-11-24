#!/usr/bin/env tsx
/**
 * Script to run living docs sync for increment 0043
 * This will populate tasks in user story files
 */

import { LivingDocsSync } from '../../../../src/core/living-docs/living-docs-sync.js';
import { TaskProjectSpecificGenerator } from '../../../../src/core/living-docs/task-project-specific-generator.js';
import * as path from 'path';

const projectRoot = path.resolve(process.cwd());
const incrementId = '0043-spec-md-desync-fix';

async function debugTaskGeneration() {
  console.log('\n🔍 DEBUG: Testing TaskProjectSpecificGenerator directly...');

  const taskGen = new TaskProjectSpecificGenerator(projectRoot);

  // Test for US-001
  const tasksUS001 = await taskGen.generateProjectSpecificTasks(
    incrementId,
    'US-001'
  );

  console.log(`   - Tasks for US-001: ${tasksUS001.length}`);
  if (tasksUS001.length > 0) {
    console.log('   - Task IDs:', tasksUS001.map(t => t.id).join(', '));
  }
}

async function main() {
  console.log('🔄 Starting living docs sync...');
  console.log(`📁 Project root: ${projectRoot}`);
  console.log(`📋 Increment: ${incrementId}`);

  // Debug task generation first
  await debugTaskGeneration();

  const sync = new LivingDocsSync(projectRoot);

  try {
    const result = await sync.syncIncrement(incrementId, {
      dryRun: false,
      verbose: true
    });

    console.log('\n✅ Living docs sync completed successfully!');
    console.log(`\n📊 Result:`);
    console.log(`   - Feature ID: ${result.featureId}`);
    console.log(`   - Feature spec: ${result.featureSpec}`);
    console.log(`   - User stories synced: ${result.userStories?.length || 0}`);

    if (result.userStories) {
      console.log('\n📝 User stories:');
      for (const story of result.userStories) {
        console.log(`   - ${story.id}: ${story.title}`);
      }
    }

    // Verify tasks were written
    console.log('\n🔍 Verifying tasks were written to user story files...');
    const fs = await import('fs-extra');
    const path = await import('path');

    const usFile = path.default.join(
      projectRoot,
      '.specweave/docs/internal/specs/specweave/FS-043/us-001-status-line-shows-correct-active-increment.md'
    );

    const content = await fs.default.readFile(usFile, 'utf-8');
    const tasksMatch = content.match(/##\s+Tasks\s+([\s\S]*?)(?=\n##|---)/);

    if (tasksMatch) {
      console.log('   ✅ Tasks section found:');
      console.log(tasksMatch[1].substring(0, 200) + '...');
    } else {
      console.log('   ❌ Tasks section NOT found!');
    }

  } catch (error) {
    console.error('\n❌ Error during sync:', error);
    process.exit(1);
  }
}

main();
