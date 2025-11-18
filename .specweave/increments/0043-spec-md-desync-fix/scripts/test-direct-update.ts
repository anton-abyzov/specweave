#!/usr/bin/env tsx
/**
 * Test direct file update to isolate the issue
 */

import { TaskProjectSpecificGenerator } from '../../../../src/core/living-docs/task-project-specific-generator.js';
import fs from 'fs-extra';
import path from 'path';

const projectRoot = process.cwd();
const incrementId = '0043-spec-md-desync-fix';

async function testDirectUpdate() {
  console.log('🔍 Testing direct task update...\n');

  // 1. Generate tasks for US-001
  const taskGen = new TaskProjectSpecificGenerator(projectRoot);
  const tasks = await taskGen.generateProjectSpecificTasks(incrementId, 'US-001');

  console.log(`📝 Generated ${tasks.length} tasks for US-001`);
  console.log(`   Task IDs: ${tasks.map(t => t.id).join(', ')}\n`);

  // 2. Format as markdown
  const tasksMarkdown = taskGen.formatTasksAsMarkdown(tasks);
  console.log('📄 Formatted markdown:');
  console.log(tasksMarkdown);
  console.log();

  // 3. Update the file
  const userStoryFile = path.join(
    projectRoot,
    '.specweave/docs/internal/specs/specweave/FS-043/us-001-status-line-shows-correct-active-increment.md'
  );

  console.log(`📁 Target file: ${userStoryFile}`);
  console.log(`   File exists: ${fs.existsSync(userStoryFile)}\n`);

  // Read current content
  const content = await fs.readFile(userStoryFile, 'utf-8');
  console.log(`📖 Current content length: ${content.length} chars\n`);

  // Perform replacement
  const tasksRegex = /##\s+Tasks\s+([\s\S]*?)(?=\n##|$)/;

  if (tasksRegex.test(content)) {
    console.log('✅ Tasks section found, replacing...\n');

    const updatedContent = content.replace(
      tasksRegex,
      `## Tasks\n\n${tasksMarkdown}\n`
    );

    console.log(`📝 Updated content length: ${updatedContent.length} chars`);
    console.log(`   Content changed: ${updatedContent !== content}\n`);

    // Write to actual file
    console.log('💾 Writing to file...');
    await fs.writeFile(userStoryFile, updatedContent, 'utf-8');
    console.log('✅ File written successfully!\n');

    // Verify
    const verifyContent = await fs.readFile(userStoryFile, 'utf-8');
    const verifyMatch = verifyContent.match(/##\s+Tasks\s+([\s\S]*?)(?=\n##|---)/);

    if (verifyMatch) {
      console.log('🔍 Verification - Tasks section content:');
      console.log(verifyMatch[1].substring(0, 200));
    } else {
      console.log('❌ Verification failed - Tasks section not found!');
    }

  } else {
    console.log('❌ Tasks section not found in file!');
  }
}

testDirectUpdate();
