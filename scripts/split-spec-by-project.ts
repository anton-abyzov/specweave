#!/usr/bin/env ts-node

/**
 * Split Monolithic Spec into Project-Specific Files
 *
 * Usage: ts-node scripts/split-spec-by-project.ts <spec-path> <output-dir> [project-ids...]
 *
 * Example:
 *   ts-node scripts/split-spec-by-project.ts \
 *     .specweave/docs/internal/specs/spec-0001-fitness-tracker.md \
 *     .specweave/docs/internal/specs \
 *     FE BE MOBILE
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import {
  parseSpecFile,
  splitSpecIntoProjects,
  createMultiProjectFolderStructure
} from '../src/utils/spec-splitter.js';
import {
  mapUserStoryToProjects,
  formatProjectMappingReport,
  DEFAULT_PROJECT_RULES,
  type ProjectRule
} from '../src/utils/project-mapper.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: ts-node scripts/split-spec-by-project.ts <spec-path> <output-dir> [project-ids...]');
    process.exit(1);
  }

  const [specPath, outputDir, ...projectIds] = args;

  console.log('🔍 Analyzing spec file...\n');

  // Parse spec
  const parsedSpec = await parseSpecFile(specPath);

  console.log(`✓ Parsed spec: ${parsedSpec.metadata.title}`);
  console.log(`  User stories: ${parsedSpec.userStories.length}`);
  console.log('');

  // Analyze user stories
  console.log('📊 Classifying user stories by project...\n');

  const projectStats = new Map<string, number>();

  for (const userStory of parsedSpec.userStories) {
    const mappings = mapUserStoryToProjects(userStory);

    if (mappings.length > 0) {
      const primary = mappings[0];
      console.log(formatProjectMappingReport(userStory, mappings));
      console.log('');

      projectStats.set(primary.projectId, (projectStats.get(primary.projectId) || 0) + 1);
    } else {
      console.log(`❌ ${userStory.id}: ${userStory.title} → NO MATCH (assign to SHARED)`);
      console.log('');
      projectStats.set('SHARED', (projectStats.get('SHARED') || 0) + 1);
    }
  }

  // Print summary
  console.log('📈 Project Distribution:\n');
  const totalStories = parsedSpec.userStories.length;

  for (const [projectId, count] of projectStats.entries()) {
    const percentage = ((count / totalStories) * 100).toFixed(0);
    console.log(`  ${projectId}: ${count} user stories (${percentage}%)`);
  }

  console.log('');

  // Create folder structure
  console.log('📁 Creating multi-project folder structure...\n');

  const allProjectIds = [...projectStats.keys()];
  await createMultiProjectFolderStructure(outputDir, allProjectIds);

  console.log('✓ Folder structure created\n');

  // Split spec
  console.log('✂️  Splitting spec into project-specific files...\n');

  const outputMap = await splitSpecIntoProjects(specPath, outputDir);

  for (const [projectId, filePath] of outputMap.entries()) {
    console.log(`✓ ${projectId}: ${filePath}`);
  }

  console.log('');
  console.log('✅ Spec splitting complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Review project-specific specs in:', outputDir);
  console.log('2. Configure JIRA sync for each project');
  console.log('3. Run /specweave-jira:sync to create JIRA items');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
