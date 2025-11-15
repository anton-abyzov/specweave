#!/usr/bin/env tsx
/**
 * Migration Script: Add **AC**: fields to legacy tasks.md files
 *
 * Purpose: Migrate increments 0002-0009 from OLD format to NEW format
 *
 * OLD format:
 * ### T-001: Task Title
 * **Status**: [x] Completed
 * **Acceptance Criteria**:
 * - ✅ Bullet point 1
 * - ✅ Bullet point 2
 *
 * NEW format:
 * ### T-001: Task Title
 * **Status**: [x] Completed
 *
 * **User Story**: [US-001: Title](../../docs/internal/specs/default/feature/us-001-title.md)
 *
 * **AC**: AC-US1-01, AC-US1-02, AC-US1-03
 *
 * **Test Plan** (BDD):
 * - **Given** ... → **When** ... → **Then** ...
 */

import fs from 'fs-extra';
import path from 'path';

interface Task {
  id: string;
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

interface UserStory {
  id: string;
  title: string;
  acIds: string[];
}

/**
 * Extract user stories from spec.md
 */
function extractUserStories(specContent: string): UserStory[] {
  const userStories: UserStory[] = [];

  // Pattern: ### US-001: Title or ### US-A001: Title or ### US1: Title
  // Supports: US-001, US-A001, US1, US-B002, etc.
  const usPattern = /^###+\s+(US-?[A-Z]?\d+):\s+(.+?)\s*\n([\s\S]*?)(?=^###+\s+US-|\n---\n|$)/gm;

  let match;
  while ((match = usPattern.exec(specContent)) !== null) {
    const id = match[1]; // US-001
    const title = match[2];
    const content = match[3];

    // Extract AC-IDs from acceptance criteria
    const acIds: string[] = [];
    const acPattern = /\*\*AC-([A-Z0-9-]+)\*\*/g;
    let acMatch;
    while ((acMatch = acPattern.exec(content)) !== null) {
      acIds.push(`AC-${acMatch[1]}`);
    }

    userStories.push({ id, title, acIds });
  }

  return userStories;
}

/**
 * Extract tasks from tasks.md
 * Supports: T-001, T001, T1, etc.
 */
function extractTasks(tasksContent: string): Task[] {
  const tasks: Task[] = [];

  // Pattern: ### T-001: Title or ### T001: Title (with or without dash and colon)
  const taskPattern = /^##+ (T-?\d+):?\s+(.+?)$/gm;

  let match;
  const matches: Array<{ id: string; title: string; index: number }> = [];

  while ((match = taskPattern.exec(tasksContent)) !== null) {
    matches.push({
      id: match[1],
      title: match[2],
      index: match.index,
    });
  }

  // Extract content for each task (from task heading to next task or end)
  for (let i = 0; i < matches.length; i++) {
    const task = matches[i];
    const nextTask = matches[i + 1];

    const startIndex = task.index;
    const endIndex = nextTask ? nextTask.index : tasksContent.length;
    const content = tasksContent.substring(startIndex, endIndex);

    tasks.push({
      id: task.id,
      title: task.title,
      content,
      startIndex,
      endIndex,
    });
  }

  return tasks;
}

/**
 * Map tasks to user stories based on title keywords and order
 */
function mapTasksToUserStories(tasks: Task[], userStories: UserStory[]): Map<string, string> {
  const mapping = new Map<string, string>(); // taskId → userStoryId

  // Simple heuristic: Map tasks sequentially to user stories
  // For better accuracy, could analyze task titles for keywords
  const tasksPerStory = Math.ceil(tasks.length / userStories.length);

  let usIndex = 0;
  for (let i = 0; i < tasks.length; i++) {
    if (i > 0 && i % tasksPerStory === 0 && usIndex < userStories.length - 1) {
      usIndex++;
    }

    if (userStories[usIndex]) {
      mapping.set(tasks[i].id, userStories[usIndex].id);
    }
  }

  return mapping;
}

/**
 * Generate AC-IDs for a user story
 * Supports: US-001, US-A001, US1, etc.
 */
function generateACIds(userStoryId: string, count: number): string[] {
  // Extract the identifier part (handles US-001, US-A001, US1, etc.)
  const match = userStoryId.match(/US-?([A-Z]?\d+)/);
  const usId = match?.[1] || '001';

  const acIds: string[] = [];

  for (let i = 1; i <= count; i++) {
    const acNum = String(i).padStart(2, '0');
    // Format: AC-US001-01, AC-USA001-01, AC-US1-01, etc.
    acIds.push(`AC-US${usId}-${acNum}`);
  }

  return acIds;
}

/**
 * Migrate a single increment
 */
async function migrateIncrement(incrementId: string, dryRun: boolean = false): Promise<void> {
  const incrementPath = path.join(process.cwd(), '.specweave', 'increments', incrementId);
  const specPath = path.join(incrementPath, 'spec.md');
  const tasksPath = path.join(incrementPath, 'tasks.md');

  console.log(`\n🔍 Migrating ${incrementId}...`);

  // Check files exist
  if (!fs.existsSync(specPath)) {
    console.log(`   ⚠️  spec.md not found, skipping`);
    return;
  }

  if (!fs.existsSync(tasksPath)) {
    console.log(`   ⚠️  tasks.md not found, skipping`);
    return;
  }

  // Read files
  const specContent = await fs.readFile(specPath, 'utf-8');
  const tasksContent = await fs.readFile(tasksPath, 'utf-8');

  // Check if already migrated
  if (tasksContent.includes('**AC**: AC-')) {
    console.log(`   ✅ Already migrated (AC fields found)`);
    return;
  }

  // Extract user stories and tasks
  const userStories = extractUserStories(specContent);
  const tasks = extractTasks(tasksContent);

  console.log(`   📊 Found ${userStories.length} user stories, ${tasks.length} tasks`);

  if (userStories.length === 0) {
    console.log(`   ⚠️  No user stories found in spec.md, skipping`);
    return;
  }

  if (tasks.length === 0) {
    console.log(`   ⚠️  No tasks found in tasks.md, skipping`);
    return;
  }

  // Map tasks to user stories
  const taskToUS = mapTasksToUserStories(tasks, userStories);

  // Build new tasks.md content
  let newTasksContent = tasksContent;

  // Process tasks in reverse order (to preserve indices)
  for (let i = tasks.length - 1; i >= 0; i--) {
    const task = tasks[i];
    const userStoryId = taskToUS.get(task.id);

    if (!userStoryId) continue;

    const userStory = userStories.find((us) => us.id === userStoryId);
    if (!userStory) continue;

    // Generate AC-IDs for this user story if not already defined
    const acIds = userStory.acIds.length > 0
      ? userStory.acIds.slice(0, 3) // Use first 3 AC-IDs from spec
      : generateACIds(userStoryId, 3); // Generate 3 generic AC-IDs

    // Find insertion point (after **Status**: line)
    const statusMatch = task.content.match(/\*\*Status\*\*:[^\n]+\n/);
    if (!statusMatch) {
      console.log(`   ⚠️  ${task.id}: No Status field found, skipping`);
      continue;
    }

    const insertionPoint = task.startIndex + statusMatch.index! + statusMatch[0].length;

    // Build insertion text
    const userStoryLink = `\n**User Story**: [${userStoryId}: ${userStory.title}](../../docs/internal/specs/default/${incrementId.replace(/^\d+-/, '')}/us-${userStoryId.toLowerCase().replace('us-', '')}-*.md)\n`;
    const acField = `\n**AC**: ${acIds.join(', ')}\n`;

    const insertion = userStoryLink + acField;

    // Insert into content
    newTasksContent = newTasksContent.slice(0, insertionPoint) + insertion + newTasksContent.slice(insertionPoint);
  }

  // Save or preview
  if (dryRun) {
    console.log(`   📝 DRY RUN - Would update tasks.md`);
    console.log(`   Sample changes:\n`);
    const firstTask = tasks[0];
    const sampleStart = firstTask.startIndex;
    const sampleEnd = Math.min(firstTask.endIndex, firstTask.startIndex + 500);
    console.log(newTasksContent.substring(sampleStart, sampleEnd));
  } else {
    await fs.writeFile(tasksPath, newTasksContent, 'utf-8');
    console.log(`   ✅ Updated tasks.md with AC fields and User Story links`);
  }
}

/**
 * Main migration
 */
async function main() {
  const increments = [
    '0002-core-enhancements',
    '0003-intelligent-model-selection',
    '0004-plugin-architecture',
    '0006-llm-native-i18n',
    '0007-smart-increment-discipline',
    '0008-user-education-faq',
    '0009-intelligent-reopen-logic',
  ];

  const dryRun = process.argv.includes('--dry-run');

  console.log(`🚀 Legacy Tasks Migration Script`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Increments: ${increments.length}`);

  for (const incrementId of increments) {
    try {
      await migrateIncrement(incrementId, dryRun);
    } catch (error: any) {
      console.error(`   ❌ Error migrating ${incrementId}: ${error.message}`);
    }
  }

  console.log(`\n✅ Migration complete!`);

  if (!dryRun) {
    console.log(`\nNext steps:`);
    console.log(`  1. Re-sync living docs: /specweave:sync-docs update 0002`);
    console.log(`  2. Re-sync GitHub epics: /specweave-github:sync-spec`);
  }
}

main().catch(console.error);
