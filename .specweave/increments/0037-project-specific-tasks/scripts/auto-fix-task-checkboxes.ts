#!/usr/bin/env tsx

/**
 * Auto-Fix Task Checkboxes
 *
 * For tasks marked "✅ COMPLETE", automatically marks all implementation
 * checkboxes as [x] to reflect completion status.
 *
 * This is a one-time fix for the inconsistency where headers say COMPLETE
 * but checkboxes are unchecked.
 */

import fs from 'fs-extra';
import path from 'path';

async function autoFixCheckboxes() {
  const tasksPath = path.join(
    process.cwd(),
    '.specweave/increments/0037-project-specific-tasks/tasks.md'
  );

  let content = await fs.readFile(tasksPath, 'utf-8');
  const lines = content.split('\n');

  let fixedCount = 0;
  const taskPattern = /^###\s+(T-\d+):\s+(.+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const taskMatch = line.match(taskPattern);

    if (!taskMatch) continue;

    const taskId = taskMatch[1];
    const taskTitle = taskMatch[2];
    const hasCompleteMarker = taskTitle.includes('✅ COMPLETE');

    if (!hasCompleteMarker) continue;

    // Find implementation section
    const taskEndIndex = findNextTaskStart(lines, i + 1);
    const implStart = findImplementationSectionStart(lines, i, taskEndIndex);

    if (implStart === -1) continue;

    // Check if any unchecked boxes exist
    let hasUnchecked = false;
    for (let j = implStart; j < taskEndIndex; j++) {
      if (lines[j].includes('- [ ]')) {
        hasUnchecked = true;
        break;
      }
    }

    if (!hasUnchecked) continue;

    // Fix all checkboxes in this task's implementation section
    let taskFixed = false;
    for (let j = implStart; j < taskEndIndex; j++) {
      const originalLine = lines[j];

      // Stop at next section
      if (originalLine.trim().startsWith('**') && !originalLine.startsWith('- [')) {
        if (!originalLine.includes('**Implementation**:')) break;
      }
      if (originalLine.trim().startsWith('---')) break;
      if (originalLine.trim().startsWith('###')) break;

      // Replace unchecked boxes
      if (originalLine.includes('- [ ]')) {
        lines[j] = originalLine.replace('- [ ]', '- [x]');
        taskFixed = true;
      }
    }

    if (taskFixed) {
      fixedCount++;
      console.log(`✅ Fixed ${taskId}`);
    }
  }

  // Write back
  const updatedContent = lines.join('\n');
  await fs.writeFile(tasksPath, updatedContent, 'utf-8');

  console.log(`\n🎉 Fixed ${fixedCount} tasks!`);
  console.log(`📝 Updated: ${tasksPath}\n`);

  return fixedCount;
}

function findNextTaskStart(lines: string[], startIndex: number): number {
  const taskPattern = /^###\s+T-\d+/;
  for (let i = startIndex; i < lines.length; i++) {
    if (taskPattern.test(lines[i])) return i;
  }
  return lines.length;
}

function findImplementationSectionStart(lines: string[], taskStartIndex: number, taskEndIndex: number): number {
  for (let i = taskStartIndex; i < taskEndIndex; i++) {
    if (lines[i].includes('**Implementation**:')) {
      return i + 1; // Return line after "**Implementation**:"
    }
  }
  return -1;
}

// Run auto-fix
autoFixCheckboxes().catch(err => {
  console.error('❌ Auto-fix failed:', err);
  process.exit(1);
});
