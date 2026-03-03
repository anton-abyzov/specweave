/**
 * Status Auto-Transition Module
 *
 * Automatically transitions increment status based on file activity:
 * - When spec.md created → status = PLANNING (if not already set)
 * - When tasks.md created → status = ACTIVE (if currently PLANNING)
 * - When first task marked in-progress → status = ACTIVE (if not already)
 * - When ALL tasks completed → status = READY_FOR_REVIEW (v0.35.0+)
 *
 * CRITICAL (v0.35.0+): ACTIVE → READY_FOR_REVIEW auto-transition prevents
 * the auto-completion bug where increments get marked "completed" without
 * user approval. Only /sw:done can transition READY_FOR_REVIEW → COMPLETED.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import { IncrementStatus } from '../types/increment-metadata.js';
import { MetadataManager } from './metadata-manager.js';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';

/**
 * File paths that trigger status transitions
 */
const TRANSITION_TRIGGERS = {
  /** spec.md existence indicates planning started */
  SPEC_FILE: 'spec.md',
  /** tasks.md existence indicates ready for active work */
  TASKS_FILE: 'tasks.md'
} as const;

/**
 * Check if increment folder has specific file
 */
function hasFile(incrementId: string, fileName: string): boolean {
  const incrementPath = path.join(resolveEffectiveRoot(), '.specweave', 'increments', incrementId);
  const filePath = path.join(incrementPath, fileName);
  return fs.existsSync(filePath);
}

/**
 * Check if tasks.md has any in-progress tasks
 */
function hasInProgressTasks(incrementId: string): boolean {
  const incrementPath = path.join(resolveEffectiveRoot(), '.specweave', 'increments', incrementId);
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
 * Task completion status result
 */
export interface TaskCompletionStatus {
  /** Total number of tasks found */
  totalTasks: number;
  /** Number of completed tasks */
  completedTasks: number;
  /** Number of pending tasks */
  pendingTasks: number;
  /** Whether all tasks are completed (100%) */
  allCompleted: boolean;
  /** Completion percentage (0-100) */
  percentage: number;
}

/**
 * Check task completion status from tasks.md
 *
 * Parses tasks.md to count completed vs pending tasks.
 * A task is considered completed if it has:
 * - **Status**: [x] completed
 * - Or checkbox [x] before task ID
 *
 * @param incrementId - Increment ID to check
 * @returns Task completion status or null if tasks.md doesn't exist
 */
export function getTaskCompletionStatus(incrementId: string): TaskCompletionStatus | null {
  const incrementPath = path.join(resolveEffectiveRoot(), '.specweave', 'increments', incrementId);
  const tasksPath = path.join(incrementPath, TRANSITION_TRIGGERS.TASKS_FILE);

  if (!fs.existsSync(tasksPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(tasksPath, 'utf-8');

    // Count tasks by looking for ### T-XXX headers
    const taskHeaders = content.match(/^###\s+T-\d+/gm) || [];
    const totalTasks = taskHeaders.length;

    if (totalTasks === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        allCompleted: false,
        percentage: 0
      };
    }

    // Count completed tasks by looking for **Status**: [x] completed pattern
    // This is the canonical way to mark tasks complete in SpecWeave
    const completedPattern = /\*\*Status\*\*:\s*\[x\]\s*completed/gi;
    const completedMatches = content.match(completedPattern) || [];
    const completedTasks = completedMatches.length;

    const pendingTasks = totalTasks - completedTasks;
    const percentage = Math.round((completedTasks / totalTasks) * 100);
    const allCompleted = completedTasks === totalTasks && totalTasks > 0;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      allCompleted,
      percentage
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if ALL tasks in tasks.md are completed
 *
 * CRITICAL (v0.35.0+): This is used to auto-transition from ACTIVE → READY_FOR_REVIEW.
 * This prevents the auto-completion bug where increments could be marked "completed"
 * without going through the proper review gate.
 *
 * @param incrementId - Increment ID to check
 * @returns true if all tasks are completed, false otherwise
 */
export function areAllTasksCompleted(incrementId: string): boolean {
  const status = getTaskCompletionStatus(incrementId);
  return status !== null && status.allCompleted;
}

/**
 * Auto-transition increment status based on file activity
 *
 * Transition Rules:
 * 1. PLANNING → ACTIVE: When tasks.md created or first task in-progress
 * 2. BACKLOG → PLANNING: When spec.md created (resume planning)
 * 3. Any status → ACTIVE: When first task in-progress (override)
 * 4. ACTIVE → READY_FOR_REVIEW: When ALL tasks completed (v0.35.0+ - CRITICAL!)
 *
 * CRITICAL (v0.35.0+): Rule 4 prevents the auto-completion bug.
 * ACTIVE cannot transition directly to COMPLETED - it MUST go through READY_FOR_REVIEW.
 * Only /sw:done can transition READY_FOR_REVIEW → COMPLETED with user approval.
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

    // Rule 4 (HIGHEST PRIORITY - v0.35.0+): ACTIVE → READY_FOR_REVIEW (when ALL tasks completed)
    // CRITICAL: This prevents the auto-completion bug! Must be checked FIRST.
    // When all tasks are done, increment goes to READY_FOR_REVIEW, NOT completed.
    // Only /sw:done can then transition to COMPLETED with user approval.
    if (currentStatus === IncrementStatus.ACTIVE && areAllTasksCompleted(incrementId)) {
      MetadataManager.updateStatus(incrementId, IncrementStatus.READY_FOR_REVIEW);
      console.log(`📋 Auto-transitioned ${incrementId}: ACTIVE → READY_FOR_REVIEW (all tasks completed)`);
      console.log(`   Run /sw:done ${incrementId} to close this increment with user approval.`);
      return true;
    }

    // Rule 1: PLANNING → ACTIVE (when tasks.md created AND tasks in-progress)
    if (currentStatus === IncrementStatus.PLANNING && hasFile(incrementId, TRANSITION_TRIGGERS.TASKS_FILE) && hasInProgressTasks(incrementId)) {
      MetadataManager.updateStatus(incrementId, IncrementStatus.ACTIVE);
      console.log(`✅ Auto-transitioned ${incrementId}: PLANNING → ACTIVE (tasks in-progress)`);
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
 * Check and auto-transition increment to READY_FOR_REVIEW if all tasks completed
 *
 * CRITICAL (v0.35.0+): This function should be called after every task completion
 * to ensure increments transition to READY_FOR_REVIEW when all work is done.
 *
 * This is the ONLY path from ACTIVE to closure - prevents auto-completion bug.
 *
 * @param incrementId - Increment ID to check
 * @returns Object with transition result
 */
export function checkAndTransitionToReadyForReview(incrementId: string): {
  transitioned: boolean;
  from?: IncrementStatus;
  to?: IncrementStatus;
  taskStatus?: TaskCompletionStatus;
  message: string;
} {
  try {
    const metadata = MetadataManager.read(incrementId);
    const currentStatus = metadata.status;
    const taskStatus = getTaskCompletionStatus(incrementId);

    // Only transition from ACTIVE
    if (currentStatus !== IncrementStatus.ACTIVE) {
      return {
        transitioned: false,
        taskStatus: taskStatus || undefined,
        message: `Increment is ${currentStatus}, not active - no transition needed`
      };
    }

    // Check task completion
    if (!taskStatus) {
      return {
        transitioned: false,
        message: 'No tasks.md found - cannot determine completion status'
      };
    }

    if (!taskStatus.allCompleted) {
      return {
        transitioned: false,
        taskStatus,
        message: `${taskStatus.completedTasks}/${taskStatus.totalTasks} tasks completed (${taskStatus.percentage}%) - not ready for review`
      };
    }

    // All tasks completed! Transition to READY_FOR_REVIEW
    MetadataManager.updateStatus(incrementId, IncrementStatus.READY_FOR_REVIEW);

    return {
      transitioned: true,
      from: IncrementStatus.ACTIVE,
      to: IncrementStatus.READY_FOR_REVIEW,
      taskStatus,
      message: `All ${taskStatus.totalTasks} tasks completed - transitioned to READY_FOR_REVIEW. Run /sw:done to close.`
    };
  } catch (error) {
    return {
      transitioned: false,
      message: `Error checking transition: ${error instanceof Error ? error.message : String(error)}`
    };
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
 * Used by /sw:do command before execution
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
    const incrementsPath = path.join(resolveEffectiveRoot(), '.specweave', 'increments');

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
