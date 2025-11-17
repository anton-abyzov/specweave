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
 * Detect which tasks are completed (STRICT VALIDATION)
 *
 * Detection strategies (ALL must be true):
 * 1. Task header has "✅ COMPLETE" marker AND
 *    all implementation checkboxes are marked [x]
 * 2. OR: Task header has "Status: [x] Completed" (legacy format)
 *
 * This prevents inconsistencies where header says COMPLETE but checkboxes
 * are unchecked. Both must match for a task to be considered complete.
 *
 * @see .specweave/increments/0037/reports/ULTRATHINK-COMPLETE-MARKER-VS-CHECKBOXES.md
 */
function detectCompletedTasks(lines: string[]): string[] {
  const completedTasks: string[] = [];
  const warnings: string[] = [];
  const taskPattern = /^###\s+(T-\d+[-A-Z]*):?\s+(.+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const taskMatch = line.match(taskPattern);

    if (!taskMatch) continue;

    const taskId = taskMatch[1];
    const taskTitle = taskMatch[2];
    const hasCompleteMarker = taskTitle.includes('✅ COMPLETE');

    // Get implementation section
    const taskEndIndex = findNextTaskStart(lines, i + 1);
    const implementationSection = findImplementationSection(lines, i, taskEndIndex);

    let allCheckboxesComplete = false;
    if (implementationSection) {
      allCheckboxesComplete = checkAllCheckboxesComplete(implementationSection);
    }

    // STRICT VALIDATION: Require BOTH header AND checkboxes to match
    if (hasCompleteMarker && implementationSection) {
      if (allCheckboxesComplete) {
        // ✅ CONSISTENT: Header says COMPLETE and all checkboxes checked
        if (!completedTasks.includes(taskId)) {
          completedTasks.push(taskId);
        }
      } else {
        // ⚠️  INCONSISTENT: Header says COMPLETE but checkboxes incomplete
        warnings.push(`${taskId}: Header has ✅ COMPLETE but not all checkboxes checked`);
      }
      continue;
    }

    // If no implementation section, trust the header marker
    if (hasCompleteMarker && !implementationSection) {
      if (!completedTasks.includes(taskId)) {
        completedTasks.push(taskId);
      }
      continue;
    }

    // Warn if checkboxes all complete but header missing marker
    if (!hasCompleteMarker && implementationSection && allCheckboxesComplete) {
      warnings.push(`${taskId}: All checkboxes checked but header missing ✅ COMPLETE`);
      // Still count as complete (checkboxes are source of truth for work done)
      if (!completedTasks.includes(taskId)) {
        completedTasks.push(taskId);
      }
      continue;
    }

    // Strategy 2: Check for "Status: [x] Completed" (legacy format)
    for (let j = i + 1; j < Math.min(i + 10, taskEndIndex); j++) {
      const statusLine = lines[j];
      if (statusLine.includes('**Status**:') && statusLine.includes('[x] Completed')) {
        if (!completedTasks.includes(taskId)) {
          completedTasks.push(taskId);
        }
        break;
      }
    }
  }

  // Report warnings if any
  if (warnings.length > 0) {
    console.warn('\n⚠️  Task Consistency Warnings:');
    warnings.forEach(w => console.warn(`   ${w}`));
    console.warn('');
  }

  return completedTasks;
}

/**
 * Find the next task header start index
 */
function findNextTaskStart(lines: string[], startIndex: number): number {
  const taskPattern = /^###\s+T-\d+/;

  for (let i = startIndex; i < lines.length; i++) {
    if (taskPattern.test(lines[i])) {
      return i;
    }
  }

  return lines.length;
}

/**
 * Find the Implementation section within a task
 */
function findImplementationSection(lines: string[], taskStartIndex: number, taskEndIndex: number): string[] | null {
  let inImplementation = false;
  const implementationLines: string[] = [];

  for (let i = taskStartIndex; i < taskEndIndex; i++) {
    const line = lines[i];

    if (line.includes('**Implementation**:')) {
      inImplementation = true;
      continue;
    }

    if (inImplementation) {
      // Stop at next section header (**, ---, or ###)
      if (line.trim().startsWith('**') && !line.startsWith('- [')) {
        break;
      }
      if (line.trim().startsWith('---')) {
        break;
      }
      if (line.trim().startsWith('###')) {
        break;
      }

      implementationLines.push(line);
    }
  }

  return implementationLines.length > 0 ? implementationLines : null;
}

/**
 * Check if all checkboxes in implementation section are complete
 */
function checkAllCheckboxesComplete(implementationLines: string[]): boolean {
  const checkboxes = implementationLines.filter(line => line.includes('- ['));

  if (checkboxes.length === 0) {
    return false; // No checkboxes = can't determine completion
  }

  // All checkboxes must be [x], none can be [ ]
  const allComplete = checkboxes.every(line => line.includes('- [x]'));
  const noneIncomplete = checkboxes.every(line => !line.includes('- [ ]'));

  return allComplete && noneIncomplete;
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
 *
 * Recognizes multiple completion indicators:
 * 1. "✅ COMPLETE" marker in task header
 * 2. "**Status**: [x] Completed" line
 * 3. All implementation checkboxes marked [x]
 */
function countCompletedTasks(lines: string[]): number {
  let count = 0;
  const taskPattern = /^###\s+(T-?\d+[-A-Z]*):?\s+(.+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const taskMatch = line.match(taskPattern);

    if (taskMatch) {
      const taskTitle = taskMatch[2];

      // Strategy 1: Check for ✅ COMPLETE marker in header
      if (taskTitle.includes('✅ COMPLETE')) {
        count++;
        continue;
      }

      // Strategy 2: Check for Status: [x] Completed
      let found = false;
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j];
        if (nextLine.includes('**Status**:') && nextLine.includes('[x] Completed')) {
          count++;
          found = true;
          break;
        }
      }

      if (found) continue;

      // Strategy 3: Check if all implementation checkboxes are [x]
      const taskEndIndex = findNextTaskStart(lines, i + 1);
      const implementationSection = findImplementationSection(lines, i, taskEndIndex);

      if (implementationSection) {
        const allCheckboxesComplete = checkAllCheckboxesComplete(implementationSection);
        if (allCheckboxesComplete) {
          count++;
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
