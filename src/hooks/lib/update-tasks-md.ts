#!/usr/bin/env node

/**
 * SpecWeave Tasks.md Auto-Updater
 *
 * Automatically updates tasks.md completion status after TodoWrite completes tasks.
 *
 * Usage:
 *   node dist/hooks/lib/update-tasks-md.js <incrementId>
 *
 * Example:
 *   node dist/hooks/lib/update-tasks-md.js 0006-llm-native-i18n
 *
 * What it does:
 * 1. Reads tasks.md for the given increment
 * 2. Finds recently completed tasks from TodoWrite
 * 3. Updates "[ ]" to "[x]" for completed tasks
 * 4. Updates "Status: ⏳ Pending" to "Status: [x] Completed"
 * 5. Recalculates progress percentage
 * 6. Writes back to tasks.md
 *
 * @author SpecWeave Team
 * @version 1.0.0
 */

import fs from 'fs-extra';
import path from 'path';

interface TaskMatch {
  taskId: string;
  lineNumber: number;
  currentStatus: 'pending' | 'in_progress' | 'completed';
}

/**
 * Main function - update tasks.md for given increment
 */
async function updateTasksMd(incrementId: string): Promise<void> {
  try {
    console.log(`\n🔄 Updating tasks.md for increment: ${incrementId}`);

    // 1. Validate increment exists
    const incrementDir = path.join(process.cwd(), '.specweave', 'increments', incrementId);
    if (!fs.existsSync(incrementDir)) {
      console.error(`❌ Increment directory not found: ${incrementDir}`);
      process.exit(1);
    }

    const tasksPath = path.join(incrementDir, 'tasks.md');
    if (!fs.existsSync(tasksPath)) {
      console.error(`❌ tasks.md not found: ${tasksPath}`);
      process.exit(1);
    }

    // 2. Read tasks.md
    const originalContent = await fs.readFile(tasksPath, 'utf-8');
    const lines = originalContent.split('\n');

    console.log(`📖 Read tasks.md (${lines.length} lines)`);

    // 3. Parse task completion status
    const tasks = parseTaskStatus(lines);
    console.log(`📋 Found ${tasks.length} tasks`);

    // 4. Get recently completed tasks from environment (passed by hook)
    // For now, we'll mark tasks as complete if they match a heuristic
    // TODO: In future, hook will pass completed task IDs via env var
    const completedTasks = detectCompletedTasks(lines);

    if (completedTasks.length === 0) {
      console.log('✅ No new task completions detected');
      return;
    }

    console.log(`🎯 Detected ${completedTasks.length} completed task(s):`, completedTasks);

    // 5. Update task status in content
    let updatedContent = originalContent;

    for (const taskId of completedTasks) {
      updatedContent = markTaskComplete(updatedContent, taskId);
    }

    // 6. Recalculate progress
    const updatedLines = updatedContent.split('\n');
    const totalTasks = countTotalTasks(updatedLines);
    const completedCount = countCompletedTasks(updatedLines);
    const progress = Math.round((completedCount / totalTasks) * 100);

    console.log(`📊 Progress: ${completedCount}/${totalTasks} (${progress}%)`);

    // 7. Update header with new progress
    updatedContent = updateProgressHeader(updatedContent, completedCount, totalTasks, progress);

    // 8. Write back to tasks.md
    await fs.writeFile(tasksPath, updatedContent, 'utf-8');

    console.log(`✅ Updated ${tasksPath}`);
    console.log(`   Completed: ${completedCount}/${totalTasks}`);
    console.log(`   Progress: ${progress}%\n`);

  } catch (error) {
    console.error('❌ Error updating tasks.md:', error);
    process.exit(1);
  }
}

/**
 * Parse task status from lines
 */
function parseTaskStatus(lines: string[]): TaskMatch[] {
  const tasks: TaskMatch[] = [];
  const taskPattern = /^###\s+(T-?\d+[-A-Z]*):?\s+(.+)/; // Matches "### T-001: Task Name" or "### T-001-DISCIPLINE:"

  lines.forEach((line, index) => {
    const match = line.match(taskPattern);
    if (match) {
      const taskId = match[1];

      // Look ahead for status line
      let status: 'pending' | 'in_progress' | 'completed' = 'pending';

      for (let i = index + 1; i < Math.min(index + 5, lines.length); i++) {
        const nextLine = lines[i];
        if (nextLine.includes('**Status**:')) {
          if (nextLine.includes('[x] Completed')) {
            status = 'completed';
          } else if (nextLine.includes('⏳ Pending') || nextLine.includes('[ ] Pending')) {
            status = 'pending';
          } else if (nextLine.includes('🔄 In Progress') || nextLine.includes('in_progress')) {
            status = 'in_progress';
          }
          break;
        }
      }

      tasks.push({
        taskId,
        lineNumber: index,
        currentStatus: status,
      });
    }
  });

  return tasks;
}

/**
 * Detect which tasks are completed (heuristic-based for now)
 * TODO: In future, hook will pass completed task IDs via env var
 */
function detectCompletedTasks(lines: string[]): string[] {
  // For now, this is a placeholder - we'll mark tasks as complete
  // if they have implementation sections or "COMPLETE" markers
  const completedTasks: string[] = [];

  // This function will be enhanced in future versions
  // For MVP, we'll rely on manual marking in tasks.md

  return completedTasks;
}

/**
 * Mark a specific task as complete
 */
function markTaskComplete(content: string, taskId: string): string {
  let updated = content;

  // Pattern: "**Status**: [ ] Pending" or "**Status**: ⏳ Pending"
  const statusPattern = new RegExp(
    `(###\\s+${taskId.replace(/[-]/g, '\\-')}[^\\n]*[\\s\\S]*?\\*\\*Status\\*\\*:)\\s*\\[?\\s*\\]?\\s*⏳?\\s*Pending`,
    'i'
  );

  updated = updated.replace(statusPattern, '$1 [x] Completed');

  return updated;
}

/**
 * Count total tasks
 */
function countTotalTasks(lines: string[]): number {
  let count = 0;
  const taskPattern = /^###\s+(T-?\d+[-A-Z]*):?\s+/;

  for (const line of lines) {
    if (taskPattern.test(line)) {
      count++;
    }
  }

  return count;
}

/**
 * Count completed tasks
 */
function countCompletedTasks(lines: string[]): number {
  let count = 0;
  const taskPattern = /^###\s+(T-?\d+[-A-Z]*):?\s+/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (taskPattern.test(line)) {
      // Look ahead for status line
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j];
        if (nextLine.includes('**Status**:') && nextLine.includes('[x] Completed')) {
          count++;
          break;
        }
      }
    }
  }

  return count;
}

/**
 * Update progress header
 */
function updateProgressHeader(content: string, completed: number, total: number, progress: number): string {
  let updated = content;

  // Update "**Completed**: X"
  updated = updated.replace(/\*\*Completed\*\*:\s*\d+/, `**Completed**: ${completed}`);

  // Update "**Progress**: X%"
  updated = updated.replace(/\*\*Progress\*\*:\s*\d+%/, `**Progress**: ${progress}%`);

  // Update "**Total Tasks**: X"
  updated = updated.replace(/\*\*Total Tasks\*\*:\s*\d+/, `**Total Tasks**: ${total}`);

  return updated;
}

// CLI entry point
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const incrementId = process.argv[2];

  if (!incrementId) {
    console.error('❌ Usage: update-tasks-md <incrementId>');
    console.error('   Example: update-tasks-md 0006-llm-native-i18n');
    process.exit(1);
  }

  updateTasksMd(incrementId).catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { updateTasksMd };
