#!/usr/bin/env ts-node

/**
 * Migration Script: Convert tasks.md to Checkable Format
 *
 * Purpose: Fix tasks.md files that use non-checkable format (no status checkboxes)
 *
 * Problem:
 * - Some tasks.md files have tasks without completion checkboxes
 * - Format: #### T-001: Task name (no status)
 * - Hooks can't detect completion without checkboxes
 *
 * Solution:
 * - Parse tasks.md
 * - For each task without **Status**: section:
 *   - Extract implementation steps from **Implementation**: section
 *   - Convert to **Status**: section with checkboxes
 *   - Default all to [ ] (unchecked)
 * - Preserve all other metadata (AC, Dependencies, File, etc.)
 *
 * Usage:
 *   ts-node migrate-tasks-to-checkable-format.ts <incrementId>
 *   ts-node migrate-tasks-to-checkable-format.ts 0039
 *
 * Example Before:
 * ```markdown
 * #### T-002: Implement PlanCommand class
 * **AC**: AC-US7-01, AC-US7-02
 * **File**: src/cli/commands/plan.ts
 * **Implementation**:
 * 1. Create PlanCommand class extending BaseCommand
 * 2. Add command registration (name: 'plan', description, options)
 * 3. Implement execute() method
 * **Dependencies**: T-001
 * **Estimated**: 3 hours
 * ```
 *
 * Example After:
 * ```markdown
 * #### T-002: Implement PlanCommand class
 * **AC**: AC-US7-01, AC-US7-02
 * **File**: src/cli/commands/plan.ts
 * **Implementation**:
 * 1. Create PlanCommand class extending BaseCommand
 * 2. Add command registration (name: 'plan', description, options)
 * 3. Implement execute() method
 *
 * **Status**:
 * - [ ] Create PlanCommand class extending BaseCommand
 * - [ ] Add command registration (name: 'plan', description, options)
 * - [ ] Implement execute() method
 *
 * **Dependencies**: T-001
 * **Estimated**: 3 hours
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

interface TaskSection {
  taskId: string;
  header: string;         // Full task header line
  content: string[];      // All lines in this task section
  hasStatus: boolean;     // Does it have **Status**: section?
  hasImplementation: boolean; // Does it have **Implementation**: section?
  implementationSteps: string[]; // Extracted implementation steps
  statusLineIndex: number; // Index where to insert **Status**: section
}

/**
 * Parse tasks.md and extract task sections
 */
function parseTasksFile(content: string): TaskSection[] {
  const lines = content.split('\n');
  const tasks: TaskSection[] = [];

  let currentTask: TaskSection | null = null;
  let inImplementation = false;
  let implementationSteps: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect task header: #### T-###:
    const taskMatch = line.match(/^####\s+(T-\d+):/);
    if (taskMatch) {
      // Save previous task
      if (currentTask) {
        currentTask.implementationSteps = implementationSteps;
        tasks.push(currentTask);
      }

      // Start new task
      currentTask = {
        taskId: taskMatch[1],
        header: line,
        content: [line],
        hasStatus: false,
        hasImplementation: false,
        implementationSteps: [],
        statusLineIndex: -1
      };
      inImplementation = false;
      implementationSteps = [];
      continue;
    }

    // Add line to current task
    if (currentTask) {
      currentTask.content.push(line);

      // Detect **Status**: section
      if (line.match(/^\*\*Status\*\*:/)) {
        currentTask.hasStatus = true;
      }

      // Detect **Implementation**: section
      if (line.match(/^\*\*Implementation\*\*:/)) {
        currentTask.hasImplementation = true;
        inImplementation = true;
        currentTask.statusLineIndex = currentTask.content.length; // Insert **Status**: after **Implementation**
        continue;
      }

      // Collect implementation steps
      if (inImplementation && line.match(/^\d+\.\s+/)) {
        const step = line.replace(/^\d+\.\s+/, '').trim();
        implementationSteps.push(step);
      }

      // End of **Implementation**: section
      if (inImplementation && line.match(/^\*\*/) && !line.match(/^\*\*Implementation\*\*:/)) {
        inImplementation = false;
      }
    }
  }

  // Save last task
  if (currentTask) {
    currentTask.implementationSteps = implementationSteps;
    tasks.push(currentTask);
  }

  return tasks;
}

/**
 * Generate **Status**: section from implementation steps
 */
function generateStatusSection(steps: string[]): string[] {
  const statusLines: string[] = [
    '',
    '**Status**:'
  ];

  for (const step of steps) {
    statusLines.push(`- [ ] ${step}`);
  }

  return statusLines;
}

/**
 * Migrate a task to checkable format
 */
function migrateTask(task: TaskSection): string[] {
  // If task already has **Status**: section, keep as-is
  if (task.hasStatus) {
    return task.content;
  }

  // If task has no **Implementation**: section, can't migrate (warn user)
  if (!task.hasImplementation || task.implementationSteps.length === 0) {
    console.warn(`⚠️  ${task.taskId}: No implementation steps found, cannot generate status checkboxes`);
    return task.content;
  }

  // Generate **Status**: section
  const statusSection = generateStatusSection(task.implementationSteps);

  // Insert **Status**: section after **Implementation**:
  const newContent = [...task.content];

  // Find where to insert (after **Implementation**: block)
  let insertIndex = task.statusLineIndex;

  // Skip to end of **Implementation**: numbered list
  while (insertIndex < newContent.length && (
    newContent[insertIndex].match(/^\d+\.\s+/) ||
    newContent[insertIndex].trim() === ''
  )) {
    insertIndex++;
  }

  // Insert **Status**: section
  newContent.splice(insertIndex, 0, ...statusSection);

  console.log(`✅ ${task.taskId}: Added status section with ${task.implementationSteps.length} checkboxes`);

  return newContent;
}

/**
 * Main migration logic
 */
async function migrateTasksToCheckableFormat(incrementId: string): Promise<void> {
  const rootPath = process.cwd();

  // Find increment folder (may have suffix like 0039-ultra-smart-next-command)
  const incrementsDir = path.join(rootPath, '.specweave', 'increments');
  const folders = fs.readdirSync(incrementsDir).filter(f => {
    return f.startsWith(incrementId) && fs.statSync(path.join(incrementsDir, f)).isDirectory();
  });

  if (folders.length === 0) {
    console.error(`❌ Error: Increment ${incrementId} not found in ${incrementsDir}`);
    process.exit(1);
  }

  if (folders.length > 1) {
    console.error(`❌ Error: Multiple increments found starting with ${incrementId}:`);
    folders.forEach(f => console.error(`  - ${f}`));
    console.error('Please specify full increment ID');
    process.exit(1);
  }

  const incrementPath = path.join(incrementsDir, folders[0]);
  const tasksPath = path.join(incrementPath, 'tasks.md');

  // Check if tasks.md exists
  if (!fs.existsSync(tasksPath)) {
    console.error(`❌ Error: tasks.md not found at ${tasksPath}`);
    process.exit(1);
  }

  // Read tasks.md
  const content = fs.readFileSync(tasksPath, 'utf-8');
  console.log(`📖 Reading tasks.md for increment ${incrementId}...`);

  // Parse tasks
  const tasks = parseTasksFile(content);
  console.log(`📋 Found ${tasks.length} tasks`);

  // Count tasks needing migration
  const tasksNeedingMigration = tasks.filter(t => !t.hasStatus && t.hasImplementation);
  const tasksAlreadyMigrated = tasks.filter(t => t.hasStatus);
  const tasksCannotMigrate = tasks.filter(t => !t.hasStatus && !t.hasImplementation);

  console.log(`\n📊 Migration Analysis:`);
  console.log(`  ✅ Already checkable: ${tasksAlreadyMigrated.length}`);
  console.log(`  🔄 Need migration: ${tasksNeedingMigration.length}`);
  console.log(`  ⚠️  Cannot migrate (no implementation): ${tasksCannotMigrate.length}`);

  if (tasksNeedingMigration.length === 0) {
    console.log(`\n✅ All tasks already in checkable format! No migration needed.`);
    return;
  }

  console.log(`\n🚀 Starting migration...`);

  // Migrate tasks
  const migratedContent: string[] = [];

  // Keep frontmatter (before first task)
  const firstTaskIndex = tasks[0] ? content.indexOf(tasks[0].header) : -1;
  if (firstTaskIndex > 0) {
    const frontmatter = content.substring(0, firstTaskIndex);
    migratedContent.push(...frontmatter.split('\n'));
  }

  // Migrate each task
  for (const task of tasks) {
    const taskLines = migrateTask(task);
    migratedContent.push(...taskLines);
  }

  // Write migrated content
  const newContent = migratedContent.join('\n');

  // Backup original
  const backupPath = tasksPath + '.backup';
  fs.writeFileSync(backupPath, content, 'utf-8');
  console.log(`\n💾 Backup saved: ${backupPath}`);

  // Write new tasks.md
  fs.writeFileSync(tasksPath, newContent, 'utf-8');
  console.log(`✅ Migration complete: ${tasksPath}`);

  console.log(`\n📝 Summary:`);
  console.log(`  - Migrated: ${tasksNeedingMigration.length} tasks`);
  console.log(`  - Total checkboxes added: ${tasksNeedingMigration.reduce((sum, t) => sum + t.implementationSteps.length, 0)}`);
  console.log(`  - Backup: ${backupPath}`);

  if (tasksCannotMigrate.length > 0) {
    console.log(`\n⚠️  Warning: ${tasksCannotMigrate.length} tasks could not be migrated (no implementation steps)`);
    console.log(`  These tasks will need manual status checkboxes:`);
    for (const task of tasksCannotMigrate) {
      console.log(`    - ${task.taskId}`);
    }
  }

  console.log(`\n💡 Next steps:`);
  console.log(`  1. Review the migrated tasks.md`);
  console.log(`  2. Manually add status checkboxes for tasks without implementation`);
  console.log(`  3. Mark completed tasks as [x]`);
  console.log(`  4. Test hooks: mark a task [x] and verify AC sync works`);
}

// CLI execution
const incrementId = process.argv[2];

if (!incrementId) {
  console.error('Usage: ts-node migrate-tasks-to-checkable-format.ts <incrementId>');
  console.error('Example: ts-node migrate-tasks-to-checkable-format.ts 0039');
  process.exit(1);
}

migrateTasksToCheckableFormat(incrementId).catch((error) => {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
});

export { migrateTasksToCheckableFormat, parseTasksFile, generateStatusSection };
