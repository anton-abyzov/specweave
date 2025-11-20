#!/usr/bin/env tsx
/**
 * US Progress Chart Generator (T-019)
 *
 * Generates Mermaid Gantt chart showing User Story completion progress.
 *
 * Usage:
 *   npx tsx scripts/generate-us-progress-chart.ts <increment-id>
 *
 * Example:
 *   npx tsx scripts/generate-us-progress-chart.ts 0047-us-task-linkage
 */

import fs from 'fs-extra';
import path from 'path';
import { parseTasksWithUSLinks, getAllTasks } from '../dist/src/generators/spec/task-parser.js';

interface USProgress {
  usId: string;
  title: string;
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  status: 'done' | 'active' | 'pending';
}

async function main() {
  const incrementId = process.argv[2];

  if (!incrementId) {
    console.error('❌ Usage: npx tsx scripts/generate-us-progress-chart.ts <increment-id>');
    console.error('   Example: npx tsx scripts/generate-us-progress-chart.ts 0047-us-task-linkage');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const incrementDir = path.join(projectRoot, '.specweave', 'increments', incrementId);
  const tasksPath = path.join(incrementDir, 'tasks.md');
  const specPath = path.join(incrementDir, 'spec.md');

  // Validate files exist
  if (!fs.existsSync(tasksPath)) {
    console.error(`❌ tasks.md not found: ${tasksPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(specPath)) {
    console.error(`❌ spec.md not found: ${specPath}`);
    process.exit(1);
  }

  console.log(`📊 Generating US progress chart for ${incrementId}...\n`);

  // Parse tasks.md
  const tasksByUS = parseTasksWithUSLinks(tasksPath);
  const allTasks = getAllTasks(tasksByUS);

  // Parse spec.md to get US titles
  const specContent = await fs.readFile(specPath, 'utf-8');
  const usTitles = extractUSTitles(specContent);

  // Calculate progress for each US
  const usProgress: USProgress[] = [];

  for (const [usId, tasks] of Object.entries(tasksByUS)) {
    if (usId === 'unassigned') continue; // Skip unassigned tasks

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let status: 'done' | 'active' | 'pending';
    if (percentage === 100) {
      status = 'done';
    } else if (percentage > 0) {
      status = 'active';
    } else {
      status = 'pending';
    }

    usProgress.push({
      usId,
      title: usTitles[usId] || 'Unknown',
      totalTasks,
      completedTasks,
      percentage,
      status
    });
  }

  // Sort by US-ID
  usProgress.sort((a, b) => a.usId.localeCompare(b.usId));

  // Generate Mermaid Gantt chart
  const mermaidChart = generateMermaidGantt(usProgress);

  // Generate text summary
  const textSummary = generateTextSummary(usProgress, allTasks.length);

  // Write to reports directory
  const reportsDir = path.join(incrementDir, 'reports');
  await fs.ensureDir(reportsDir);

  const reportPath = path.join(reportsDir, 'us-progress-chart.md');
  const reportContent = `# User Story Progress Chart

**Increment**: ${incrementId}
**Generated**: ${new Date().toISOString()}

## Summary

${textSummary}

## Progress Visualization

\`\`\`mermaid
${mermaidChart}
\`\`\`

## Detailed Progress

${generateDetailedTable(usProgress)}

---

**Note**: This chart is auto-generated. Run \`npx tsx scripts/generate-us-progress-chart.ts ${incrementId}\` to update.
`;

  await fs.writeFile(reportPath, reportContent, 'utf-8');

  console.log(`✅ Progress chart generated: ${reportPath}\n`);
  console.log(textSummary);
  console.log(`\n📈 View the chart: ${reportPath}`);
}

/**
 * Extract User Story titles from spec.md
 */
function extractUSTitles(specContent: string): Record<string, string> {
  const titles: Record<string, string> = {};

  // Match: ### US-001: User Story Title
  const usPattern = /^###\s+(US-\d{3}(?:A)?)\s*:\s*(.+)$/gm;
  let match;

  while ((match = usPattern.exec(specContent)) !== null) {
    titles[match[1]] = match[2].trim();
  }

  return titles;
}

/**
 * Generate Mermaid Gantt chart
 */
function generateMermaidGantt(usProgress: USProgress[]): string {
  const lines = [
    'gantt',
    '  title User Story Progress',
    '  dateFormat YYYY-MM-DD',
    '  axisFormat %m-%d',
    ''
  ];

  const today = new Date().toISOString().split('T')[0];

  for (const us of usProgress) {
    const statusTag = us.status === 'done' ? 'done' : us.status === 'active' ? 'active' : 'crit';
    const shortTitle = us.title.length > 30 ? us.title.substring(0, 27) + '...' : us.title;

    lines.push(`  ${us.usId} (${us.percentage}%) ${shortTitle} :${statusTag}, ${us.usId.toLowerCase()}, ${today}, 1d`);
  }

  return lines.join('\n');
}

/**
 * Generate text summary
 */
function generateTextSummary(usProgress: USProgress[], totalTasks: number): string {
  const completed = usProgress.filter(us => us.status === 'done').length;
  const inProgress = usProgress.filter(us => us.status === 'active').length;
  const pending = usProgress.filter(us => us.status === 'pending').length;

  const completedTasks = usProgress.reduce((sum, us) => sum + us.completedTasks, 0);
  const overallPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return `**User Stories**: ${usProgress.length} total
- ✅ Completed: ${completed}
- 🔄 In Progress: ${inProgress}
- ⏳ Pending: ${pending}

**Tasks**: ${completedTasks}/${totalTasks} completed (${overallPercentage}%)`;
}

/**
 * Generate detailed progress table
 */
function generateDetailedTable(usProgress: USProgress[]): string {
  const rows = [
    '| User Story | Title | Tasks | Progress | Status |',
    '|------------|-------|-------|----------|--------|'
  ];

  for (const us of usProgress) {
    const statusEmoji = us.status === 'done' ? '✅' : us.status === 'active' ? '🔄' : '⏳';
    const progressBar = generateProgressBar(us.percentage);

    rows.push(`| ${us.usId} | ${us.title} | ${us.completedTasks}/${us.totalTasks} | ${progressBar} ${us.percentage}% | ${statusEmoji} ${us.status} |`);
  }

  return rows.join('\n');
}

/**
 * Generate ASCII progress bar
 */
function generateProgressBar(percentage: number): string {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

// Run the script
main().catch(error => {
  console.error('❌ Error generating progress chart:', error);
  process.exit(1);
});
