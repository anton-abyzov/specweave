#!/usr/bin/env node

/**
 * AC Status Update Hook
 *
 * Updates acceptance criteria checkboxes in spec.md based on completed tasks.
 *
 * Flow:
 * 1. Read tasks.md → Extract completed tasks
 * 2. Extract AC-IDs from **AC**: field (e.g., AC-US1-01, AC-US1-02)
 * 3. Read spec.md → Find all AC checkboxes
 * 4. Check off AC if task implementing it is complete
 * 5. Write updated spec.md
 *
 * Called by: plugins/specweave/hooks/post-task-completion.sh
 *
 * Example:
 * - Task T-001: [x] Completed, **AC**: AC-US1-01, AC-US1-02
 * - spec.md: - [ ] **AC-US1-01**: ... → - [x] **AC-US1-01**: ... ✅
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface ACStatus {
  acId: string;
  isComplete: boolean;
  completedByTasks: string[];
}

/**
 * Main entry point
 */
async function updateACStatus(incrementId: string): Promise<void> {
  try {
    const projectRoot = process.cwd();
    const incrementPath = path.join(projectRoot, '.specweave/increments', incrementId);

    // Verify increment exists
    try {
      await fs.access(incrementPath);
    } catch {
      console.error(`❌ Increment ${incrementId} not found at ${incrementPath}`);
      return;
    }

    console.log(`🔄 Updating AC status for increment ${incrementId}...`);

    // Step 1: Extract completed ACs from tasks.md
    const completedACs = await extractCompletedACsFromTasks(incrementPath);

    if (completedACs.size === 0) {
      console.log(`ℹ️  No completed tasks with AC-IDs found in tasks.md`);
      return;
    }

    console.log(`✓ Found ${completedACs.size} completed AC-IDs from tasks.md`);

    // Step 2: Update spec.md checkboxes
    const updatedCount = await updateSpecACCheckboxes(incrementPath, completedACs);

    if (updatedCount > 0) {
      console.log(`✅ Updated ${updatedCount} AC checkbox(es) in spec.md`);
    } else {
      console.log(`ℹ️  No AC checkboxes needed updating in spec.md`);
    }
  } catch (error) {
    console.error('❌ Error updating AC status:', error);
    // Non-blocking: Don't throw, just log
  }
}

/**
 * Extract AC-IDs from completed tasks in tasks.md
 */
async function extractCompletedACsFromTasks(incrementPath: string): Promise<Set<string>> {
  const tasksPath = path.join(incrementPath, 'tasks.md');
  const completedACs = new Set<string>();

  try {
    const tasksContent = await fs.readFile(tasksPath, 'utf-8');

    // Pattern: Match tasks with completed status and AC field
    // Example:
    // ### T-001: Task Title
    // **Status**: [x] (100% - Completed)
    // **AC**: AC-US1-01, AC-US1-02, AC-US1-03

    // Split by task headings (## or ###)
    const taskSections = tasksContent.split(/^(###+)\s+T-\d+:/gm);

    for (let i = 1; i < taskSections.length; i += 2) {
      const taskContent = taskSections[i + 1];

      // Check if task is completed
      const statusMatch = taskContent.match(/\*\*Status\*\*:\s*\[x\]/i);
      if (!statusMatch) continue;

      // Extract AC-IDs from **AC**: field
      const acMatch = taskContent.match(/\*\*AC\*\*:\s*([^\n]+)/);
      if (!acMatch) continue;

      const acField = acMatch[1]; // "AC-US1-01, AC-US1-02, AC-US1-03"
      const acIds = acField
        .split(',')
        .map(id => id.trim())
        .filter(id => /^AC-[A-Z0-9]+-\d+$/.test(id)); // Validate format

      acIds.forEach(acId => completedACs.add(acId));
    }

    return completedACs;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`ℹ️  tasks.md not found, skipping AC update`);
    } else {
      console.error('Error reading tasks.md:', error);
    }
    return completedACs;
  }
}

/**
 * Update AC checkboxes in spec.md
 */
async function updateSpecACCheckboxes(
  incrementPath: string,
  completedACs: Set<string>
): Promise<number> {
  const specPath = path.join(incrementPath, 'spec.md');

  try {
    let specContent = await fs.readFile(specPath, 'utf-8');
    let updatedCount = 0;

    // Pattern: - [ ] **AC-US1-01**: Description
    // Captures: indent, checkbox state, AC-ID, rest of line
    const acPattern = /^(\s*)-\s+\[([ x])\]\s+\*\*([A-Z]+-[A-Z0-9]+-\d+)\*\*:(.*)$/gm;

    specContent = specContent.replace(acPattern, (match, indent, currentState, acId, description) => {
      const shouldBeChecked = completedACs.has(acId);
      const isCurrentlyChecked = currentState === 'x';

      if (shouldBeChecked && !isCurrentlyChecked) {
        // Check off this AC
        updatedCount++;
        return `${indent}- [x] **${acId}**:${description}`;
      } else if (!shouldBeChecked && isCurrentlyChecked) {
        // Uncheck this AC (task was un-completed?)
        updatedCount++;
        return `${indent}- [ ] **${acId}**:${description}`;
      }

      return match; // No change needed
    });

    if (updatedCount > 0) {
      await fs.writeFile(specPath, specContent, 'utf-8');
    }

    return updatedCount;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`ℹ️  spec.md not found, skipping AC update`);
    } else {
      console.error('Error updating spec.md:', error);
    }
    return 0;
  }
}

// CLI Entry Point (ES Module)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const incrementId = process.argv[2];

  if (!incrementId) {
    console.error('Usage: node update-ac-status.js <increment-id>');
    console.error('Example: node update-ac-status.js 0031-external-tool-status-sync');
    process.exit(1);
  }

  updateACStatus(incrementId)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
