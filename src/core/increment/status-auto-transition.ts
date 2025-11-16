/**
 * Status Auto-Transition Module
 *
 * Automatically transitions increment status based on file activity:
 * - When spec.md created → status = PLANNING (if not already set)
 * - When tasks.md created → status = ACTIVE (if currently PLANNING)
 * - When first task marked in-progress → status = ACTIVE (if not already)
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { IncrementStatus } from '../types/increment-metadata.js';
import { MetadataManager } from './metadata-manager.js';

/**
 * File paths that trigger status transitions
 */
const TRANSITION_TRIGGERS = {
  /** spec.md existence indicates planning started */
  SPEC_FILE: 'spec.md',

  /** plan.md existence indicates detailed planning */
  PLAN_FILE: 'plan.md',

  /** tasks.md existence indicates ready for active work */
  TASKS_FILE: 'tasks.md'
} as const;

/**
 * Check if increment folder has specific file
 */
function hasFile(incrementId: string, fileName: string): boolean {
  const incrementPath = path.join(process.cwd(), '.specweave', 'increments', incrementId);
  const filePath = path.join(incrementPath, fileName);
  return fs.existsSync(filePath);
}

/**
 * Check if tasks.md has any in-progress tasks
 */
function hasInProgressTasks(incrementId: string): boolean {
  const incrementPath = path.join(process.cwd(), '.specweave', 'increments', incrementId);
  const tasksPath = path.join(incrementPath, TRANSITION_TRIGGERS.TASKS_FILE);

  if (!fs.existsSync(tasksPath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(tasksPath, 'utf-8');
    // Match tasks with in-progress markers: [⏳], [🔄], or [ ] followed by **T-XXX**
    const inProgressPattern = /^\s*-\s*\[(?:⏳|🔄|x)\]\s+\*\*T-\d+\*\*/m;
    return inProgressPattern.test(content);
  } catch (error) {
    return false;
  }
}

/**
 * Auto-transition increment status based on file activity
 *
 * Transition Rules:
 * 1. PLANNING → ACTIVE: When tasks.md created or first task in-progress
 * 2. BACKLOG → PLANNING: When spec.md created (resume planning)
 * 3. Any status → ACTIVE: When first task in-progress (override)
 *
 * @param incrementId - Increment ID to check
 * @param triggerFile - File that triggered the check (optional, for logging)
 * @returns true if status was transitioned, false otherwise
 */
export function autoTransitionStatus(incrementId: string, triggerFile?: string): boolean {
  try {
    // Read current metadata
    const metadata = MetadataManager.read(incrementId);
    const currentStatus = metadata.status;

    // Rule 1: PLANNING → ACTIVE (when tasks.md created)
    if (currentStatus === IncrementStatus.PLANNING && hasFile(incrementId, TRANSITION_TRIGGERS.TASKS_FILE)) {
      MetadataManager.updateStatus(incrementId, IncrementStatus.ACTIVE);
      console.log(`✅ Auto-transitioned ${incrementId}: PLANNING → ACTIVE (tasks.md created)`);
      return true;
    }

    // Rule 2: BACKLOG → PLANNING (when spec.md created)
    if (currentStatus === IncrementStatus.BACKLOG && hasFile(incrementId, TRANSITION_TRIGGERS.SPEC_FILE)) {
      MetadataManager.updateStatus(incrementId, IncrementStatus.PLANNING);
      console.log(`✅ Auto-transitioned ${incrementId}: BACKLOG → PLANNING (spec.md created)`);
      return true;
    }

    // Rule 3: Any non-ACTIVE status → ACTIVE (when tasks in-progress)
    if (currentStatus !== IncrementStatus.ACTIVE && hasInProgressTasks(incrementId)) {
      MetadataManager.updateStatus(incrementId, IncrementStatus.ACTIVE);
      console.log(`✅ Auto-transitioned ${incrementId}: ${currentStatus} → ACTIVE (tasks in-progress)`);
      return true;
    }

    return false; // No transition needed
  } catch (error) {
    console.warn(`⚠️  Auto-transition failed for ${incrementId}:`, error);
    return false;
  }
}

/**
 * Auto-transition based on specific file creation
 *
 * This is called by file watchers or post-write hooks
 *
 * @param incrementId - Increment ID
 * @param createdFile - File that was just created
 */
export function onFileCreated(incrementId: string, createdFile: string): void {
  const fileName = path.basename(createdFile);

  // Only trigger on known files
  if (!Object.values(TRANSITION_TRIGGERS).includes(fileName as any)) {
    return;
  }

  autoTransitionStatus(incrementId, fileName);
}

/**
 * Check if increment should auto-transition to ACTIVE
 *
 * Used by /specweave:do command before execution
 */
export function shouldTransitionToActive(incrementId: string): boolean {
  try {
    const metadata = MetadataManager.read(incrementId);

    // Already active, no transition needed
    if (metadata.status === IncrementStatus.ACTIVE) {
      return false;
    }

    // Planning with tasks.md → should transition
    if (metadata.status === IncrementStatus.PLANNING && hasFile(incrementId, TRANSITION_TRIGGERS.TASKS_FILE)) {
      return true;
    }

    // Any status with in-progress tasks → should transition
    if (hasInProgressTasks(incrementId)) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Validate and fix "planned" vs "planning" inconsistency
 *
 * Legacy increments may have "planned" status (not in enum).
 * This migrates them to "planning" (valid enum value).
 */
export function migrateLegacyStatuses(): number {
  let migratedCount = 0;

  try {
    const incrementsPath = path.join(process.cwd(), '.specweave', 'increments');

    if (!fs.existsSync(incrementsPath)) {
      return 0;
    }

    const increments = fs.readdirSync(incrementsPath)
      .filter(name => !name.startsWith('_')) // Skip _archive, _templates
      .filter(name => fs.statSync(path.join(incrementsPath, name)).isDirectory());

    for (const incrementId of increments) {
      const metadataPath = path.join(incrementsPath, incrementId, 'metadata.json');

      if (!fs.existsSync(metadataPath)) {
        continue;
      }

      try {
        const metadata = fs.readJsonSync(metadataPath);

        // Migrate "planned" → "planning"
        if (metadata.status === 'planned') {
          metadata.status = IncrementStatus.PLANNING;
          fs.writeJsonSync(metadataPath, metadata, { spaces: 2 });
          console.log(`✅ Migrated ${incrementId}: "planned" → "planning"`);
          migratedCount++;
        }
      } catch (error) {
        console.warn(`⚠️  Failed to migrate ${incrementId}:`, error);
      }
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  return migratedCount;
}
