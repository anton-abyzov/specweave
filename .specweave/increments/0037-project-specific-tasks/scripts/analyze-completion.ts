#!/usr/bin/env ts-node
/**
 * Analyze Increment 0037 Implementation Status
 *
 * This script checks which tasks are actually implemented by:
 * 1. Reading tasks.md to extract all task IDs and associated files
 * 2. Checking if those files exist
 * 3. Analyzing file size and content to determine if implemented
 * 4. Generating completion report
 */

import fs from 'fs/promises';
import path from 'path';

interface TaskAnalysis {
  taskId: string;
  title: string;
  files: string[];
  filesExist: boolean[];
  implemented: boolean;
  reason: string;
}

async function analyzeImplementation(): Promise<void> {
  const incrementPath = '/Users/antonabyzov/Projects/github/specweave/.specweave/increments/0037-project-specific-tasks';
  const tasksPath = path.join(incrementPath, 'tasks.md');
  const rootPath = '/Users/antonabyzov/Projects/github/specweave';

  // Read tasks.md
  const tasksContent = await fs.readFile(tasksPath, 'utf-8');

  // Extract all tasks
  const tasks = extractTasks(tasksContent);

  console.log(`\n📊 Analyzing ${tasks.length} tasks...\n`);

  const analyses: TaskAnalysis[] = [];
  let implementedCount = 0;

  for (const task of tasks) {
    const analysis = await analyzeTask(task, rootPath);
    analyses.push(analysis);

    if (analysis.implemented) {
      implementedCount++;
      console.log(`✅ ${analysis.taskId}: ${analysis.title}`);
    } else {
      console.log(`❌ ${analysis.taskId}: ${analysis.title} (${analysis.reason})`);
    }
  }

  // Generate report
  const completionPercentage = Math.round((implementedCount / tasks.length) * 100);

  console.log(`\n📈 COMPLETION SUMMARY\n`);
  console.log(`Total Tasks: ${tasks.length}`);
  console.log(`Implemented: ${implementedCount}`);
  console.log(`Pending: ${tasks.length - implementedCount}`);
  console.log(`Completion: ${completionPercentage}%\n`);

  // Save detailed report
  const reportPath = path.join(incrementPath, 'reports', 'implementation-status.md');
  await saveReport(analyses, reportPath);

  console.log(`\n📝 Detailed report saved to: ${reportPath}\n`);

  // List files to mark as complete
  console.log(`\n✅ Tasks ready to mark as complete:\n`);
  for (const analysis of analyses) {
    if (analysis.implemented) {
      console.log(`- ${analysis.taskId}`);
    }
  }
}

function extractTasks(content: string): Array<{id: string; title: string; files: string[]}> {
  const tasks: Array<{id: string; title: string; files: string[]}> = [];

  // Match task headers: ### T-001: title
  const taskPattern = /### (T-\d+): [^\n]+ (.+?)\n[\s\S]*?(?=###|$)/g;
  const matches = content.matchAll(taskPattern);

  for (const match of matches) {
    const taskId = match[1];
    const taskSection = match[0];

    // Extract title from first line
    const titleMatch = taskSection.match(/### T-\d+: [^\n]+ (.+)/);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract files from **Files**: section
    const filesMatch = taskSection.match(/\*\*Files\*\*:\s*\n((?:- .+\n?)+)/);
    const files: string[] = [];

    if (filesMatch) {
      const fileLines = filesMatch[1].split('\n');
      for (const line of fileLines) {
        const fileMatch = line.match(/^- `([^`]+)`/);
        if (fileMatch) {
          files.push(fileMatch[1]);
        }
      }
    }

    tasks.push({ id: taskId, title, files });
  }

  return tasks;
}

async function analyzeTask(
  task: {id: string; title: string; files: string[]},
  rootPath: string
): Promise<TaskAnalysis> {
  const analysis: TaskAnalysis = {
    taskId: task.id,
    title: task.title,
    files: task.files,
    filesExist: [],
    implemented: false,
    reason: ''
  };

  if (task.files.length === 0) {
    // No files specified - check if it's a documentation or planning task
    if (task.title.toLowerCase().includes('documentation') ||
        task.title.toLowerCase().includes('test')) {
      analysis.reason = 'No files specified (documentation/testing task)';
      return analysis;
    }
  }

  // Check each file
  let allFilesExist = true;
  let someFilesHaveContent = false;

  for (const file of task.files) {
    const filePath = path.join(rootPath, file);

    try {
      const stats = await fs.stat(filePath);
      const exists = stats.isFile();
      analysis.filesExist.push(exists);

      if (exists && stats.size > 0) {
        // Check if file has meaningful content (not just imports)
        const content = await fs.readFile(filePath, 'utf-8');
        const hasContent = content.length > 200; // Basic heuristic

        if (hasContent) {
          someFilesHaveContent = true;
        }
      }

      if (!exists) {
        allFilesExist = false;
      }
    } catch {
      analysis.filesExist.push(false);
      allFilesExist = false;
    }
  }

  // Determine implementation status
  if (task.files.length > 0 && allFilesExist && someFilesHaveContent) {
    analysis.implemented = true;
    analysis.reason = 'All files exist with content';
  } else if (task.files.length > 0 && !allFilesExist) {
    analysis.reason = 'Some files missing';
  } else if (task.files.length > 0 && allFilesExist && !someFilesHaveContent) {
    analysis.reason = 'Files exist but minimal content';
  } else {
    analysis.reason = 'Not implemented';
  }

  return analysis;
}

async function saveReport(analyses: TaskAnalysis[], reportPath: string): Promise<void> {
  let report = `# Implementation Status Report\n\n`;
  report += `**Generated**: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;

  const implemented = analyses.filter(a => a.implemented).length;
  const total = analyses.length;
  const percentage = Math.round((implemented / total) * 100);

  report += `- **Total Tasks**: ${total}\n`;
  report += `- **Implemented**: ${implemented}\n`;
  report += `- **Pending**: ${total - implemented}\n`;
  report += `- **Completion**: ${percentage}%\n\n`;

  report += `## Implemented Tasks (${implemented})\n\n`;
  for (const analysis of analyses) {
    if (analysis.implemented) {
      report += `### ${analysis.taskId}: ${analysis.title}\n\n`;
      report += `**Files**:\n`;
      for (const file of analysis.files) {
        report += `- ✅ \`${file}\`\n`;
      }
      report += `\n**Status**: ${analysis.reason}\n\n`;
      report += `---\n\n`;
    }
  }

  report += `## Pending Tasks (${total - implemented})\n\n`;
  for (const analysis of analyses) {
    if (!analysis.implemented) {
      report += `### ${analysis.taskId}: ${analysis.title}\n\n`;
      report += `**Reason**: ${analysis.reason}\n\n`;
      if (analysis.files.length > 0) {
        report += `**Expected Files**:\n`;
        for (let i = 0; i < analysis.files.length; i++) {
          const exists = analysis.filesExist[i];
          const icon = exists ? '⚠️' : '❌';
          report += `- ${icon} \`${analysis.files[i]}\`\n`;
        }
        report += `\n`;
      }
      report += `---\n\n`;
    }
  }

  // Ensure reports directory exists
  const reportsDir = path.dirname(reportPath);
  await fs.mkdir(reportsDir, { recursive: true });

  await fs.writeFile(reportPath, report, 'utf-8');
}

// Run analysis
analyzeImplementation().catch(console.error);
