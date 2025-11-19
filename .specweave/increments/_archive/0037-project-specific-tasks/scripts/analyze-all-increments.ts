#!/usr/bin/env ts-node

/**
 * Analyze All Increments - Comprehensive Status Check
 *
 * Purpose: Scan all non-archived increments and analyze:
 * - tasks.md format (checkable vs non-checkable)
 * - AC completion status
 * - Living docs sync state
 * - Overall health
 *
 * Usage:
 *   npx ts-node analyze-all-increments.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface IncrementAnalysis {
  id: string;
  fullPath: string;
  hasSpec: boolean;
  hasPlan: boolean;
  hasTasks: boolean;
  tasksFormat: 'checkable' | 'non-checkable' | 'mixed' | 'unknown';
  totalTasks: number;
  tasksWithStatus: number;
  tasksWithoutStatus: number;
  totalCheckboxes: number;
  totalACs: number;
  checkedACs: number;
  acCompletionPercentage: number;
  needsMigration: boolean;
  status: string; // from metadata.json
}

interface OverallSummary {
  totalIncrements: number;
  checkableFormat: number;
  nonCheckableFormat: number;
  mixedFormat: number;
  needsMigration: number;
  totalTasks: number;
  totalCheckboxes: number;
  totalACs: number;
  increments: IncrementAnalysis[];
}

/**
 * Analyze a single increment
 */
function analyzeIncrement(incrementPath: string): IncrementAnalysis {
  const id = path.basename(incrementPath);

  const analysis: IncrementAnalysis = {
    id,
    fullPath: incrementPath,
    hasSpec: false,
    hasPlan: false,
    hasTasks: false,
    tasksFormat: 'unknown',
    totalTasks: 0,
    tasksWithStatus: 0,
    tasksWithoutStatus: 0,
    totalCheckboxes: 0,
    totalACs: 0,
    checkedACs: 0,
    acCompletionPercentage: 0,
    needsMigration: false,
    status: 'unknown'
  };

  // Check file existence
  const specPath = path.join(incrementPath, 'spec.md');
  const planPath = path.join(incrementPath, 'plan.md');
  const tasksPath = path.join(incrementPath, 'tasks.md');
  const metadataPath = path.join(incrementPath, 'metadata.json');

  analysis.hasSpec = fs.existsSync(specPath);
  analysis.hasPlan = fs.existsSync(planPath);
  analysis.hasTasks = fs.existsSync(tasksPath);

  // Read metadata
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      analysis.status = metadata.status || 'unknown';
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Analyze tasks.md format
  if (analysis.hasTasks) {
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');

    // Count total tasks (#### T-###:)
    const taskMatches = tasksContent.match(/####\s+T-\d+:/g);
    analysis.totalTasks = taskMatches ? taskMatches.length : 0;

    // Count tasks with **Status**: section
    const statusSections = tasksContent.match(/\*\*Status\*\*:/g);
    analysis.tasksWithStatus = statusSections ? statusSections.length : 0;
    analysis.tasksWithoutStatus = analysis.totalTasks - analysis.tasksWithStatus;

    // Count total checkboxes (- [ ] or - [x])
    const checkboxMatches = tasksContent.match(/^-\s+\[[x ]\]/gm);
    analysis.totalCheckboxes = checkboxMatches ? checkboxMatches.length : 0;

    // Determine format
    if (analysis.tasksWithStatus === analysis.totalTasks) {
      analysis.tasksFormat = 'checkable';
    } else if (analysis.tasksWithStatus === 0) {
      analysis.tasksFormat = 'non-checkable';
    } else {
      analysis.tasksFormat = 'mixed';
    }

    // Needs migration if any tasks don't have status
    analysis.needsMigration = analysis.tasksWithoutStatus > 0;
  }

  // Analyze spec.md ACs
  if (analysis.hasSpec) {
    const specContent = fs.readFileSync(specPath, 'utf-8');

    // Count total ACs (- [ ] AC-XXX or - [x] AC-XXX)
    const acMatches = specContent.match(/^-\s+\[[x ]\]\s+AC-/gm);
    analysis.totalACs = acMatches ? acMatches.length : 0;

    // Count checked ACs
    const checkedACMatches = specContent.match(/^-\s+\[x\]\s+AC-/gm);
    analysis.checkedACs = checkedACMatches ? checkedACMatches.length : 0;

    // Calculate completion percentage
    if (analysis.totalACs > 0) {
      analysis.acCompletionPercentage = Math.round((analysis.checkedACs / analysis.totalACs) * 100);
    }
  }

  return analysis;
}

/**
 * Main analysis function
 */
async function analyzeAllIncrements(): Promise<void> {
  const rootPath = process.cwd();
  const incrementsDir = path.join(rootPath, '.specweave', 'increments');

  console.log('🔍 Analyzing all non-archived increments...\n');

  // Find all non-archived increments (exclude folders starting with _)
  const folders = fs.readdirSync(incrementsDir)
    .filter(f => !f.startsWith('_'))
    .filter(f => fs.statSync(path.join(incrementsDir, f)).isDirectory())
    .sort();

  console.log(`📋 Found ${folders.length} increments to analyze\n`);

  const summary: OverallSummary = {
    totalIncrements: folders.length,
    checkableFormat: 0,
    nonCheckableFormat: 0,
    mixedFormat: 0,
    needsMigration: 0,
    totalTasks: 0,
    totalCheckboxes: 0,
    totalACs: 0,
    increments: []
  };

  // Analyze each increment
  for (const folder of folders) {
    const incrementPath = path.join(incrementsDir, folder);
    const analysis = analyzeIncrement(incrementPath);
    summary.increments.push(analysis);

    // Update summary stats
    if (analysis.tasksFormat === 'checkable') {
      summary.checkableFormat++;
    } else if (analysis.tasksFormat === 'non-checkable') {
      summary.nonCheckableFormat++;
    } else if (analysis.tasksFormat === 'mixed') {
      summary.mixedFormat++;
    }

    if (analysis.needsMigration) {
      summary.needsMigration++;
    }

    summary.totalTasks += analysis.totalTasks;
    summary.totalCheckboxes += analysis.totalCheckboxes;
    summary.totalACs += analysis.totalACs;
  }

  // Print detailed results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                   INCREMENT ANALYSIS REPORT                    ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📊 Overall Summary:\n');
  console.log(`  Total Increments:        ${summary.totalIncrements}`);
  console.log(`  ✅ Checkable Format:      ${summary.checkableFormat} (${Math.round(summary.checkableFormat/summary.totalIncrements*100)}%)`);
  console.log(`  ❌ Non-Checkable Format:  ${summary.nonCheckableFormat} (${Math.round(summary.nonCheckableFormat/summary.totalIncrements*100)}%)`);
  console.log(`  ⚠️  Mixed Format:          ${summary.mixedFormat} (${Math.round(summary.mixedFormat/summary.totalIncrements*100)}%)`);
  console.log(`  🔄 Need Migration:        ${summary.needsMigration}\n`);

  console.log(`  Total Tasks:             ${summary.totalTasks}`);
  console.log(`  Total Checkboxes:        ${summary.totalCheckboxes}`);
  console.log(`  Total ACs:               ${summary.totalACs}\n`);

  console.log('───────────────────────────────────────────────────────────────\n');
  console.log('📋 Detailed Increment Analysis:\n');

  // Print table header
  console.log('ID'.padEnd(40) +
              'Status'.padEnd(12) +
              'Tasks'.padEnd(10) +
              'Format'.padEnd(15) +
              'ACs'.padEnd(10) +
              'Migration');
  console.log('─'.repeat(100));

  // Print each increment
  for (const inc of summary.increments) {
    const formatIcon = inc.tasksFormat === 'checkable' ? '✅' :
                       inc.tasksFormat === 'non-checkable' ? '❌' :
                       inc.tasksFormat === 'mixed' ? '⚠️' : '❓';

    const migrationIcon = inc.needsMigration ? '🔄 YES' : '✅ NO';

    const taskInfo = inc.hasTasks ?
      `${inc.tasksWithStatus}/${inc.totalTasks}` :
      'N/A';

    const acInfo = inc.hasSpec ?
      `${inc.checkedACs}/${inc.totalACs}` :
      'N/A';

    console.log(
      inc.id.padEnd(40) +
      inc.status.padEnd(12) +
      taskInfo.padEnd(10) +
      `${formatIcon} ${inc.tasksFormat}`.padEnd(15) +
      acInfo.padEnd(10) +
      migrationIcon
    );
  }

  console.log('\n───────────────────────────────────────────────────────────────\n');

  // Print increments needing migration
  if (summary.needsMigration > 0) {
    console.log('🔄 Increments Needing Migration:\n');
    for (const inc of summary.increments) {
      if (inc.needsMigration) {
        console.log(`  ${inc.id}`);
        console.log(`    - Total tasks: ${inc.totalTasks}`);
        console.log(`    - Tasks with status: ${inc.tasksWithStatus}`);
        console.log(`    - Tasks without status: ${inc.tasksWithoutStatus}`);
        console.log(`    - Current format: ${inc.tasksFormat}\n`);
      }
    }
  } else {
    console.log('✅ All increments have checkable format!\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  // Save report to file
  const reportPath = path.join(rootPath, '.specweave', 'increments', '0037-project-specific-tasks', 'reports', 'ALL-INCREMENTS-ANALYSIS.md');
  const reportContent = generateMarkdownReport(summary);
  fs.writeFileSync(reportPath, reportContent, 'utf-8');
  console.log(`📝 Full report saved: ${reportPath}\n`);
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport(summary: OverallSummary): string {
  let report = '# All Increments Analysis Report\n\n';
  report += `**Date**: ${new Date().toISOString()}\n`;
  report += `**Total Increments Analyzed**: ${summary.totalIncrements}\n\n`;

  report += '## Overall Summary\n\n';
  report += `| Metric | Count | Percentage |\n`;
  report += `|--------|-------|------------|\n`;
  report += `| Total Increments | ${summary.totalIncrements} | 100% |\n`;
  report += `| ✅ Checkable Format | ${summary.checkableFormat} | ${Math.round(summary.checkableFormat/summary.totalIncrements*100)}% |\n`;
  report += `| ❌ Non-Checkable Format | ${summary.nonCheckableFormat} | ${Math.round(summary.nonCheckableFormat/summary.totalIncrements*100)}% |\n`;
  report += `| ⚠️ Mixed Format | ${summary.mixedFormat} | ${Math.round(summary.mixedFormat/summary.totalIncrements*100)}% |\n`;
  report += `| 🔄 Need Migration | ${summary.needsMigration} | ${Math.round(summary.needsMigration/summary.totalIncrements*100)}% |\n\n`;

  report += `**Totals**:\n`;
  report += `- Tasks: ${summary.totalTasks}\n`;
  report += `- Checkboxes: ${summary.totalCheckboxes}\n`;
  report += `- ACs: ${summary.totalACs}\n\n`;

  report += '## Detailed Breakdown\n\n';
  report += `| Increment | Status | Tasks | Format | Checkboxes | ACs | Migration Needed |\n`;
  report += `|-----------|--------|-------|--------|------------|-----|------------------|\n`;

  for (const inc of summary.increments) {
    const formatIcon = inc.tasksFormat === 'checkable' ? '✅' :
                       inc.tasksFormat === 'non-checkable' ? '❌' :
                       inc.tasksFormat === 'mixed' ? '⚠️' : '❓';

    const migrationIcon = inc.needsMigration ? '🔄' : '✅';

    const taskInfo = inc.hasTasks ? `${inc.tasksWithStatus}/${inc.totalTasks}` : 'N/A';
    const acInfo = inc.hasSpec ? `${inc.checkedACs}/${inc.totalACs}` : 'N/A';

    report += `| ${inc.id} | ${inc.status} | ${taskInfo} | ${formatIcon} ${inc.tasksFormat} | ${inc.totalCheckboxes} | ${acInfo} | ${migrationIcon} |\n`;
  }

  report += '\n## Increments Needing Migration\n\n';

  const needsMigration = summary.increments.filter(i => i.needsMigration);
  if (needsMigration.length > 0) {
    for (const inc of needsMigration) {
      report += `### ${inc.id}\n\n`;
      report += `- **Total tasks**: ${inc.totalTasks}\n`;
      report += `- **Tasks with status**: ${inc.tasksWithStatus}\n`;
      report += `- **Tasks without status**: ${inc.tasksWithoutStatus}\n`;
      report += `- **Current format**: ${inc.tasksFormat}\n`;
      report += `- **Status**: ${inc.status}\n\n`;
    }
  } else {
    report += 'No increments need migration. All tasks have checkable format!\n\n';
  }

  report += '## Next Steps\n\n';
  if (summary.needsMigration > 0) {
    report += `1. Run migration script on ${summary.needsMigration} increment(s)\n`;
    report += `2. Sync AC status from tasks.md to spec.md\n`;
    report += `3. Update living docs\n`;
  } else {
    report += '1. Sync AC status from tasks.md to spec.md (ensure current state)\n';
    report += '2. Update living docs to reflect latest AC completion\n';
  }

  return report;
}

// CLI execution
analyzeAllIncrements().catch((error) => {
  console.error('❌ Analysis failed:', error.message);
  process.exit(1);
});

export { analyzeIncrement, analyzeAllIncrements };
