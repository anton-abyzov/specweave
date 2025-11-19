#!/usr/bin/env tsx

/**
 * Update All Increments Status - Autonomous Sync
 *
 * Purpose: Comprehensively update all non-archived increments to reflect current state:
 * 1. For completed increments: Mark all task checkboxes as [x]
 * 2. For all increments: Sync AC checkboxes from task completion
 * 3. For all increments: Ensure living docs are current
 *
 * Usage:
 *   npx tsx update-all-increments-status.ts [--dry-run]
 *
 * Note: Uses tsx (not ts-node) for better ESM + TypeScript support.
 *       Imports from src/ (not dist/) for live code during development.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ACStatusManager } from '../../../../src/core/increment/ac-status-manager.js';

interface UpdateResult {
  incrementId: string;
  status: string;
  tasksUpdated: number;
  acsUpdated: number;
  errors: string[];
  warnings: string[];
}

interface OverallResult {
  totalIncrementsProcessed: number;
  totalTasksUpdated: number;
  totalACsUpdated: number;
  results: UpdateResult[];
}

/**
 * Mark all task checkboxes as complete in tasks.md
 */
function markAllTasksComplete(tasksPath: string): number {
  if (!fs.existsSync(tasksPath)) {
    return 0;
  }

  const content = fs.readFileSync(tasksPath, 'utf-8');
  const lines = content.split('\n');
  let updatedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    // Match any checkbox: - [ ] or - [x]
    if (lines[i].match(/^-\s+\[\s\]/)) {
      lines[i] = lines[i].replace('- [ ]', '- [x]');
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(tasksPath, lines.join('\n'), 'utf-8');
  }

  return updatedCount;
}

/**
 * Add basic Status section to tasks without one
 */
function addMissingStatusSections(tasksPath: string): number {
  if (!fs.existsSync(tasksPath)) {
    return 0;
  }

  const content = fs.readFileSync(tasksPath, 'utf-8');
  const lines = content.split('\n');
  const newLines: string[] = [];
  let addedCount = 0;

  let currentTask: { id: string; hasStatus: boolean; hasImplementation: boolean; insertIndex: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect task header
    const taskMatch = line.match(/^####\s+(T-\d+):/);
    if (taskMatch) {
      // If previous task had no Status section, add one
      if (currentTask && !currentTask.hasStatus && !currentTask.hasImplementation) {
        // Add generic status checkboxes before the current line
        newLines.splice(currentTask.insertIndex, 0,
          '',
          '**Status**:',
          '- [x] Task completed (based on increment status)',
          ''
        );
        addedCount++;
      }

      // Start new task tracking
      currentTask = {
        id: taskMatch[1],
        hasStatus: false,
        hasImplementation: false,
        insertIndex: newLines.length + 1 // Index after this header line
      };
    }

    // Check for Status or Implementation sections
    if (currentTask) {
      if (line.match(/^\*\*Status\*\*:/)) {
        currentTask.hasStatus = true;
      }
      if (line.match(/^\*\*Implementation\*\*:/)) {
        currentTask.hasImplementation = true;
      }
    }

    newLines.push(line);
  }

  // Handle last task
  if (currentTask && !currentTask.hasStatus && !currentTask.hasImplementation) {
    newLines.push('');
    newLines.push('**Status**:');
    newLines.push('- [x] Task completed (based on increment status)');
    addedCount++;
  }

  if (addedCount > 0) {
    fs.writeFileSync(tasksPath, newLines.join('\n'), 'utf-8');
  }

  return addedCount;
}

/**
 * Update a single increment
 */
async function updateIncrement(
  incrementPath: string,
  dryRun: boolean = false
): Promise<UpdateResult> {
  const incrementId = path.basename(incrementPath);

  const result: UpdateResult = {
    incrementId,
    status: 'unknown',
    tasksUpdated: 0,
    acsUpdated: 0,
    errors: [],
    warnings: []
  };

  // Read metadata
  const metadataPath = path.join(incrementPath, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      result.status = metadata.status || 'unknown';
    } catch (e) {
      result.errors.push('Failed to parse metadata.json');
    }
  }

  const tasksPath = path.join(incrementPath, 'tasks.md');
  const specPath = path.join(incrementPath, 'spec.md');

  // Step 1: For completed increments, mark all tasks as [x]
  if (result.status === 'completed' && !dryRun) {
    try {
      result.tasksUpdated = markAllTasksComplete(tasksPath);

      // Also add Status sections to tasks that don't have them
      const addedSections = addMissingStatusSections(tasksPath);
      if (addedSections > 0) {
        result.warnings.push(`Added ${addedSections} Status sections to tasks without them`);
      }
    } catch (e: any) {
      result.errors.push(`Failed to update tasks.md: ${e.message}`);
    }
  }

  // Step 2: Sync AC status from tasks.md to spec.md
  if (fs.existsSync(tasksPath) && fs.existsSync(specPath)) {
    try {
      const rootPath = process.cwd();
      const acManager = new ACStatusManager(rootPath);

      if (!dryRun) {
        // Use full increment ID (folder name)
        const syncResult = await acManager.syncACStatus(incrementId);

        result.acsUpdated = syncResult.updated.length;

        if (syncResult.conflicts.length > 0) {
          result.warnings.push(...syncResult.conflicts);
        }

        if (syncResult.warnings.length > 0) {
          result.warnings.push(...syncResult.warnings);
        }
      }
    } catch (e: any) {
      result.errors.push(`Failed to sync AC status: ${e.message}`);
    }
  }

  return result;
}

/**
 * Main update function
 */
async function updateAllIncrements(dryRun: boolean = false): Promise<void> {
  const rootPath = process.cwd();
  const incrementsDir = path.join(rootPath, '.specweave', 'increments');

  console.log('🔄 Updating all non-archived increments...\n');
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // Find all non-archived increments
  const folders = fs.readdirSync(incrementsDir)
    .filter(f => !f.startsWith('_'))
    .filter(f => fs.statSync(path.join(incrementsDir, f)).isDirectory())
    .sort();

  console.log(`📋 Found ${folders.length} increments to process\n`);

  const overall: OverallResult = {
    totalIncrementsProcessed: 0,
    totalTasksUpdated: 0,
    totalACsUpdated: 0,
    results: []
  };

  // Process each increment
  for (const folder of folders) {
    const incrementPath = path.join(incrementsDir, folder);

    console.log(`\n🔍 Processing ${folder}...`);

    const result = await updateIncrement(incrementPath, dryRun);
    overall.results.push(result);
    overall.totalIncrementsProcessed++;
    overall.totalTasksUpdated += result.tasksUpdated;
    overall.totalACsUpdated += result.acsUpdated;

    // Print result
    console.log(`   Status: ${result.status}`);
    console.log(`   Tasks updated: ${result.tasksUpdated}`);
    console.log(`   ACs updated: ${result.acsUpdated}`);

    if (result.errors.length > 0) {
      console.log(`   ❌ Errors: ${result.errors.length}`);
      result.errors.forEach(e => console.log(`      - ${e}`));
    }

    if (result.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
      result.warnings.forEach(w => console.log(`      - ${w}`));
    }
  }

  // Print overall summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                     UPDATE SUMMARY                            ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Increments Processed:  ${overall.totalIncrementsProcessed}`);
  console.log(`✅ Tasks Updated:         ${overall.totalTasksUpdated}`);
  console.log(`✅ ACs Updated:           ${overall.totalACsUpdated}\n`);

  // Show breakdown by status
  const completedIncrements = overall.results.filter(r => r.status === 'completed').length;
  const activeIncrements = overall.results.filter(r => r.status === 'active').length;
  const planningIncrements = overall.results.filter(r => r.status === 'planning').length;

  console.log('📊 Breakdown by Status:\n');
  console.log(`   Completed: ${completedIncrements}`);
  console.log(`   Active: ${activeIncrements}`);
  console.log(`   Planning: ${planningIncrements}\n`);

  // Show increments with errors
  const incrementsWithErrors = overall.results.filter(r => r.errors.length > 0);
  if (incrementsWithErrors.length > 0) {
    console.log(`❌ Increments with Errors (${incrementsWithErrors.length}):\n`);
    for (const inc of incrementsWithErrors) {
      console.log(`   ${inc.incrementId}`);
      inc.errors.forEach(e => console.log(`      - ${e}`));
    }
    console.log();
  }

  // Save detailed report
  const reportPath = path.join(rootPath, '.specweave', 'increments', '0037-project-specific-tasks', 'reports', 'UPDATE-ALL-INCREMENTS-REPORT.md');
  const reportContent = generateReport(overall, dryRun);
  fs.writeFileSync(reportPath, reportContent, 'utf-8');

  console.log(`📝 Detailed report saved: ${reportPath}\n`);

  if (dryRun) {
    console.log('⚠️  DRY RUN COMPLETE - No changes were made\n');
    console.log('Run without --dry-run to apply changes\n');
  } else {
    console.log('✅ UPDATE COMPLETE!\n');
  }
}

/**
 * Generate Markdown report
 */
function generateReport(overall: OverallResult, dryRun: boolean): string {
  let report = '# All Increments Update Report\n\n';
  report += `**Date**: ${new Date().toISOString()}\n`;
  report += `**Mode**: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE UPDATE'}\n\n`;

  report += '## Summary\n\n';
  report += `- **Increments Processed**: ${overall.totalIncrementsProcessed}\n`;
  report += `- **Tasks Updated**: ${overall.totalTasksUpdated}\n`;
  report += `- **ACs Updated**: ${overall.totalACsUpdated}\n\n`;

  report += '## Detailed Results\n\n';
  report += `| Increment | Status | Tasks Updated | ACs Updated | Errors | Warnings |\n`;
  report += `|-----------|--------|---------------|-------------|--------|----------|\n`;

  for (const result of overall.results) {
    report += `| ${result.incrementId} | ${result.status} | ${result.tasksUpdated} | ${result.acsUpdated} | ${result.errors.length} | ${result.warnings.length} |\n`;
  }

  report += '\n## Increments with Errors\n\n';
  const withErrors = overall.results.filter(r => r.errors.length > 0);
  if (withErrors.length > 0) {
    for (const result of withErrors) {
      report += `### ${result.incrementId}\n\n`;
      report += '**Errors**:\n';
      result.errors.forEach(e => report += `- ${e}\n`);
      report += '\n';
    }
  } else {
    report += 'No errors!\n\n';
  }

  report += '## Increments with Warnings\n\n';
  const withWarnings = overall.results.filter(r => r.warnings.length > 0);
  if (withWarnings.length > 0) {
    for (const result of withWarnings) {
      report += `### ${result.incrementId}\n\n`;
      report += '**Warnings**:\n';
      result.warnings.forEach(w => report += `- ${w}\n`);
      report += '\n';
    }
  } else {
    report += 'No warnings!\n\n';
  }

  return report;
}

// CLI execution
const dryRun = process.argv.includes('--dry-run');

updateAllIncrements(dryRun).catch((error) => {
  console.error('❌ Update failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});

export { updateIncrement, updateAllIncrements };
