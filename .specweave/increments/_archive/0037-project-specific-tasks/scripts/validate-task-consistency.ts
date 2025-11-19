#!/usr/bin/env tsx

/**
 * Task Consistency Validator
 *
 * Scans tasks.md to find discrepancies between:
 * - Task headers with "✅ COMPLETE" marker
 * - Implementation checkbox status
 *
 * Reports tasks that have inconsistent completion state.
 */

import fs from 'fs-extra';
import path from 'path';

interface TaskAnalysis {
  taskId: string;
  hasCompleteMarker: boolean;
  implementationCheckboxes: {
    total: number;
    checked: number;
    unchecked: number;
  };
  isConsistent: boolean;
  issue?: string;
}

async function validateTaskConsistency() {
  const tasksPath = path.join(
    process.cwd(),
    '.specweave/increments/0037-project-specific-tasks/tasks.md'
  );

  const content = await fs.readFile(tasksPath, 'utf-8');
  const lines = content.split('\n');

  const analyses: TaskAnalysis[] = [];
  const taskPattern = /^###\s+(T-\d+):\s+(.+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const taskMatch = line.match(taskPattern);

    if (!taskMatch) continue;

    const taskId = taskMatch[1];
    const taskTitle = taskMatch[2];
    const hasCompleteMarker = taskTitle.includes('✅ COMPLETE');

    // Find implementation section
    const taskEndIndex = findNextTaskStart(lines, i + 1);
    const implementationSection = findImplementationSection(lines, i, taskEndIndex);

    let checkboxStats = { total: 0, checked: 0, unchecked: 0 };

    if (implementationSection) {
      const checkboxes = implementationSection.filter(l => l.includes('- ['));
      checkboxStats.total = checkboxes.length;
      checkboxStats.checked = checkboxes.filter(l => l.includes('- [x]')).length;
      checkboxStats.unchecked = checkboxes.filter(l => l.includes('- [ ]')).length;
    }

    // Determine consistency
    let isConsistent = true;
    let issue: string | undefined;

    if (hasCompleteMarker && checkboxStats.total > 0) {
      // Task marked complete - all checkboxes should be checked
      if (checkboxStats.unchecked > 0) {
        isConsistent = false;
        issue = `Header says COMPLETE but ${checkboxStats.unchecked}/${checkboxStats.total} checkboxes unchecked`;
      }
    } else if (!hasCompleteMarker && checkboxStats.total > 0) {
      // Task not marked complete
      if (checkboxStats.unchecked === 0 && checkboxStats.checked > 0) {
        isConsistent = false;
        issue = `All checkboxes checked but header missing ✅ COMPLETE`;
      }
    }

    analyses.push({
      taskId,
      hasCompleteMarker,
      implementationCheckboxes: checkboxStats,
      isConsistent,
      issue
    });
  }

  // Report results
  console.log('🔍 Task Consistency Validation Report\n');
  console.log('=' . repeat(70));

  const inconsistent = analyses.filter(a => !a.isConsistent);

  if (inconsistent.length === 0) {
    console.log('✅ ALL TASKS CONSISTENT!\n');
    console.log(`Validated ${analyses.length} tasks - no discrepancies found.`);
    return;
  }

  console.log(`❌ Found ${inconsistent.length} inconsistent tasks:\n`);

  for (const task of inconsistent) {
    console.log(`${task.taskId}:`);
    console.log(`  Header: ${task.hasCompleteMarker ? '✅ COMPLETE' : '⏳ PENDING'}`);
    console.log(`  Checkboxes: ${task.implementationCheckboxes.checked}/${task.implementationCheckboxes.total} checked`);
    console.log(`  Issue: ${task.issue}`);
    console.log('');
  }

  console.log('=' . repeat(70));
  console.log('\n📊 Summary:');
  console.log(`  Total tasks: ${analyses.length}`);
  console.log(`  Consistent: ${analyses.length - inconsistent.length}`);
  console.log(`  Inconsistent: ${inconsistent.length}`);
  console.log(`  Accuracy: ${Math.round((analyses.length - inconsistent.length) / analyses.length * 100)}%\n`);

  // Save detailed report
  const reportPath = path.join(
    process.cwd(),
    '.specweave/increments/0037-project-specific-tasks/reports/TASK-CONSISTENCY-VALIDATION.md'
  );

  const report = generateMarkdownReport(analyses, inconsistent);
  await fs.writeFile(reportPath, report, 'utf-8');

  console.log(`📝 Detailed report saved: ${reportPath}\n`);
}

function findNextTaskStart(lines: string[], startIndex: number): number {
  const taskPattern = /^###\s+T-\d+/;
  for (let i = startIndex; i < lines.length; i++) {
    if (taskPattern.test(lines[i])) return i;
  }
  return lines.length;
}

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
      if (line.trim().startsWith('**') && !line.startsWith('- [')) break;
      if (line.trim().startsWith('---')) break;
      if (line.trim().startsWith('###')) break;
      implementationLines.push(line);
    }
  }

  return implementationLines.length > 0 ? implementationLines : null;
}

function generateMarkdownReport(all: TaskAnalysis[], inconsistent: TaskAnalysis[]): string {
  const timestamp = new Date().toISOString();

  let md = `# Task Consistency Validation Report\n\n`;
  md += `**Generated**: ${timestamp}\n`;
  md += `**Validator**: validate-task-consistency.ts\n\n`;
  md += `---\n\n`;

  md += `## Summary\n\n`;
  md += `- **Total Tasks**: ${all.length}\n`;
  md += `- **Consistent**: ${all.length - inconsistent.length}\n`;
  md += `- **Inconsistent**: ${inconsistent.length}\n`;
  md += `- **Accuracy**: ${Math.round((all.length - inconsistent.length) / all.length * 100)}%\n\n`;

  if (inconsistent.length === 0) {
    md += `✅ **ALL TASKS CONSISTENT** - No action needed.\n\n`;
    return md;
  }

  md += `---\n\n`;
  md += `## ❌ Inconsistent Tasks (${inconsistent.length})\n\n`;

  for (const task of inconsistent) {
    md += `### ${task.taskId}\n\n`;
    md += `- **Header Status**: ${task.hasCompleteMarker ? '✅ COMPLETE' : '⏳ PENDING'}\n`;
    md += `- **Checkboxes**: ${task.implementationCheckboxes.checked}/${task.implementationCheckboxes.total} checked\n`;
    md += `- **Issue**: ${task.issue}\n\n`;

    if (task.hasCompleteMarker && task.implementationCheckboxes.unchecked > 0) {
      md += `**Recommended Fix**: Mark all implementation checkboxes as [x]\n\n`;
    } else if (!task.hasCompleteMarker && task.implementationCheckboxes.unchecked === 0) {
      md += `**Recommended Fix**: Add ✅ COMPLETE to task header\n\n`;
    }

    md += `---\n\n`;
  }

  md += `## Consistent Tasks (${all.length - inconsistent.length})\n\n`;

  const consistent = all.filter(a => a.isConsistent);
  for (const task of consistent) {
    md += `- ${task.taskId}: `;
    if (task.hasCompleteMarker) {
      md += `✅ Complete (${task.implementationCheckboxes.checked}/${task.implementationCheckboxes.total} checked)\n`;
    } else {
      md += `⏳ Pending (${task.implementationCheckboxes.unchecked}/${task.implementationCheckboxes.total} unchecked)\n`;
    }
  }

  md += `\n---\n\n`;
  md += `## Next Steps\n\n`;
  md += `1. Review inconsistent tasks above\n`;
  md += `2. Verify if work was actually completed\n`;
  md += `3. Update checkboxes to match reality\n`;
  md += `4. Implement strict validation in detectCompletedTasks()\n\n`;

  return md;
}

// Run validation
validateTaskConsistency().catch(err => {
  console.error('❌ Validation failed:', err);
  process.exit(1);
});
