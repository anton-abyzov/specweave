#!/usr/bin/env tsx
/**
 * Update all user story files with their tasks from tasks.md
 */

import { TaskProjectSpecificGenerator } from '../../../../src/core/living-docs/task-project-specific-generator.js';
import fs from 'fs-extra';
import path from 'path';

const projectRoot = process.cwd();
const incrementId = '0043-spec-md-desync-fix';

const userStories = [
  { id: 'US-001', file: 'us-001-status-line-shows-correct-active-increment.md' },
  { id: 'US-002', file: 'us-002-spec-md-and-metadata-json-stay-in-sync.md' },
  { id: 'US-003', file: 'us-003-hooks-read-correct-increment-status.md' },
  { id: 'US-004', file: 'us-004-existing-desyncs-detected-and-repaired.md' },
  { id: 'US-005', file: 'us-005-living-docs-sync-triggers-external-tool-updates.md' }
];

async function updateUserStoryTasks() {
  console.log('🔄 Updating all user story files with tasks from tasks.md...\n');

  const taskGen = new TaskProjectSpecificGenerator(projectRoot);
  const basePath = path.join(projectRoot, '.specweave/docs/internal/specs/specweave/FS-043');

  for (const story of userStories) {
    try {
      console.log(`📝 Processing ${story.id}...`);

      // Generate tasks for this user story
      const tasks = await taskGen.generateProjectSpecificTasks(incrementId, story.id);

      console.log(`   - Found ${tasks.length} tasks`);

      if (tasks.length === 0) {
        console.log(`   - Skipping (no tasks)\n`);
        continue;
      }

      // Format as markdown
      const tasksMarkdown = taskGen.formatTasksAsMarkdown(tasks);

      // Update file
      const filePath = path.join(basePath, story.file);

      if (!fs.existsSync(filePath)) {
        console.log(`   ❌ File not found: ${filePath}\n`);
        continue;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const tasksRegex = /##\s+Tasks\s+([\s\S]*?)(?=\n##|$)/;

      if (tasksRegex.test(content)) {
        const updatedContent = content.replace(
          tasksRegex,
          `## Tasks\n\n${tasksMarkdown}\n`
        );

        await fs.writeFile(filePath, updatedContent, 'utf-8');
        console.log(`   ✅ Updated ${story.file}\n`);
      } else {
        console.log(`   ⚠️  Tasks section not found in file\n`);
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error}\n`);
    }
  }

  console.log('✅ All user story files updated!\n');
}

updateUserStoryTasks();
