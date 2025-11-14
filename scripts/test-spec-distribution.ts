#!/usr/bin/env ts-node
/**
 * Test script for SpecDistributor
 *
 * Tests distributing increment 0031 into hierarchical living docs
 */

import { SpecDistributor } from '../src/core/living-docs/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('🧪 Testing SpecDistributor with increment 0031...\n');

  const projectRoot = path.join(__dirname, '..');
  const distributor = new SpecDistributor(projectRoot, {
    overwriteExisting: false,
    createBackups: true,
  });

  try {
    // Distribute increment 0031
    const result = await distributor.distribute('0031-external-tool-status-sync');

    console.log('✅ Distribution successful!');
    console.log(`\nResults:`);
    console.log(`- Epic ID: ${result.specId}`);
    console.log(`- Total Stories: ${result.totalStories}`);
    console.log(`- Total Files: ${result.totalFiles}`);
    console.log(`\nEpic File:`);
    console.log(`- ${result.epicPath}`);
    console.log(`\nUser Story Files:`);
    for (const path of result.userStoryPaths) {
      console.log(`- ${path}`);
    }

    console.log(`\nEpic Content Preview:`);
    console.log('---');
    const lines = result.epic.overview.split('\n');
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      console.log(lines[i]);
    }
    console.log('...');

    console.log(`\nUser Stories:`);
    for (const story of result.userStories) {
      console.log(`- ${story.id}: ${story.title} (${story.acceptanceCriteria.length} AC, ${story.implementation.tasks.length} tasks)`);
    }

    if (result.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      for (const warning of result.warnings) {
        console.log(`- ${warning}`);
      }
    }
  } catch (error) {
    console.error('❌ Distribution failed:', error);
    process.exit(1);
  }
}

main();
