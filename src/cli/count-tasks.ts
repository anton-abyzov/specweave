#!/usr/bin/env node
/**
 * Count Tasks CLI
 *
 * CLI utility for counting tasks in tasks.md files.
 * Used by status line hook to get accurate task counts.
 *
 * Usage:
 *   count-tasks <path-to-tasks.md>
 *
 * Output (JSON):
 *   {"total": 23, "completed": 15, "percentage": 65}
 *
 * Exit codes:
 *   0 - Success
 *   1 - File not found or read error
 *   2 - Invalid arguments
 */

import * as fs from 'fs/promises';
import { TaskCounter } from '../core/status-line/task-counter.js';

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: count-tasks <path-to-tasks.md>');
    process.exit(2);
  }

  const tasksFilePath = args[0];

  try {
    // Read tasks.md
    const content = await fs.readFile(tasksFilePath, 'utf8');

    // Count tasks
    const counts = TaskCounter.countTasks(content);

    // Output JSON
    console.log(JSON.stringify(counts));
    process.exit(0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File not found - output zero counts (graceful fallback)
      console.log(JSON.stringify({ total: 0, completed: 0, percentage: 0 }));
      process.exit(0);
    }

    // Other errors
    console.error(`Error reading tasks file: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
