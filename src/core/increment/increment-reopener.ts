/**
 * Increment Reopener
 *
 * Handles reopening of completed increments, tasks, and user stories
 * when issues are discovered after completion.
 *
 * Part of smart reopen functionality (increment 0032)
 */

import fs from 'fs-extra';
import path from 'path';
import { MetadataManager } from './metadata-manager.js';
import { ActiveIncrementManager } from './active-increment-manager.js';
import {
  IncrementMetadata,
  IncrementStatus,
  TYPE_LIMITS
} from '../types/increment-metadata.js';

/**
 * Reopen target types
 */
export enum ReopenTarget {
  /** Reopen entire increment */
  INCREMENT = 'increment',

  /** Reopen specific task(s) */
  TASK = 'task',

  /** Reopen user story + related tasks */
  USER_STORY = 'user-story'
}

/**
 * Reopen context
 */
export interface ReopenContext {
  /** What to reopen */
  target: ReopenTarget;

  /** Increment ID */
  incrementId: string;

  /** Task ID (if target = TASK) */
  taskId?: string;

  /** User story ID (if target = USER_STORY) */
  userStoryId?: string;

  /** Reason for reopening (required for audit trail) */
  reason: string;

  /** Force reopen (bypass WIP checks) */
  force?: boolean;
}

/**
 * Reopen result
 */
export interface ReopenResult {
  /** Success flag */
  success: boolean;

  /** Items that were reopened */
  itemsReopened: string[];

  /** Warning messages */
  warnings: string[];

  /** Error messages */
  errors: string[];

  /** WIP limit exceeded? */
  wipLimitExceeded?: boolean;

  /** Increment metadata after reopen */
  metadata?: IncrementMetadata;
}

/**
 * WIP validation result
 */
export interface WIPValidationResult {
  /** Is reopen allowed? */
  allowed: boolean;

  /** Warning flag */
  warning: boolean;

  /** Message */
  message?: string;

  /** Current active count */
  activeCount?: number;

  /** Limit for increment type */
  limit?: number;
}

/**
 * Reopen history entry (audit trail)
 */
export interface ReopenHistoryEntry {
  /** When reopened */
  date: string;

  /** Why reopened */
  reason: string;

  /** Previous status */
  previousStatus: IncrementStatus;

  /** Who reopened (always 'user' for now) */
  by: string;
}

/**
 * Extended metadata with reopen history
 */
export interface IncrementMetadataWithReopen extends IncrementMetadata {
  /** Reopen tracking */
  reopened?: {
    /** Number of times reopened */
    count: number;

    /** Reopen history */
    history: ReopenHistoryEntry[];
  };
}

/**
 * Increment Reopener
 *
 * Provides smart reopen functionality for increments, tasks, and user stories
 */
export class IncrementReopener {
  /**
   * Reopen a completed increment
   *
   * @param context - Reopen context
   * @returns Reopen result
   */
  static async reopenIncrement(context: ReopenContext): Promise<ReopenResult> {
    const { incrementId, reason, force } = context;
    const result: ReopenResult = {
      success: false,
      itemsReopened: [],
      warnings: [],
      errors: []
    };

    try {
      // 1. Validate increment exists
      if (!MetadataManager.exists(incrementId)) {
        result.errors.push(`Increment ${incrementId} not found`);
        return result;
      }

      // 2. Read metadata
      const metadata = MetadataManager.read(incrementId) as IncrementMetadataWithReopen;

      // 3. Check current status
      if (metadata.status !== IncrementStatus.COMPLETED) {
        result.errors.push(
          `Cannot reopen: increment status is ${metadata.status}, not completed`
        );
        return result;
      }

      // 4. Validate WIP limits
      const wipValidation = this.validateWIPLimits(metadata, force);
      if (!wipValidation.allowed && !force) {
        result.errors.push(
          wipValidation.message || 'WIP limit exceeded'
        );
        result.wipLimitExceeded = true;
        return result;
      }

      if (wipValidation.warning) {
        result.warnings.push(
          wipValidation.message || 'WIP limit will be exceeded'
        );
        result.wipLimitExceeded = true;
      }

      // 5. Update metadata: COMPLETED → ACTIVE
      const previousStatus = metadata.status;
      metadata.status = IncrementStatus.ACTIVE;
      metadata.lastActivity = new Date().toISOString();

      // 6. Add reopen history (audit trail)
      if (!metadata.reopened) {
        metadata.reopened = { count: 0, history: [] };
      }

      metadata.reopened.count++;
      metadata.reopened.history.push({
        date: new Date().toISOString(),
        reason,
        previousStatus,
        by: 'user'
      });

      // 7. Write metadata
      MetadataManager.write(incrementId, metadata);

      // 8. Update active increment cache
      const activeManager = new ActiveIncrementManager();
      activeManager.setActive(incrementId);

      // 9. Reopen uncompleted tasks (if any)
      const tasksReopened = await this.reopenUncompletedTasks(incrementId, reason);
      result.itemsReopened.push(...tasksReopened);

      // Success!
      result.success = true;
      result.itemsReopened.push(`Increment ${incrementId}`);
      result.metadata = metadata;

      return result;

    } catch (error) {
      result.errors.push(
        `Failed to reopen increment: ${error instanceof Error ? error.message : String(error)}`
      );
      return result;
    }
  }

  /**
   * Reopen specific task(s) in an increment
   *
   * @param context - Reopen context
   * @returns Reopen result
   */
  static async reopenTask(context: ReopenContext): Promise<ReopenResult> {
    const { incrementId, taskId, reason } = context;
    const result: ReopenResult = {
      success: false,
      itemsReopened: [],
      warnings: [],
      errors: []
    };

    try {
      // 1. Validate increment exists
      if (!MetadataManager.exists(incrementId)) {
        result.errors.push(`Increment ${incrementId} not found`);
        return result;
      }

      // 2. Validate task ID provided
      if (!taskId) {
        result.errors.push('Task ID required for task reopen');
        return result;
      }

      // 3. Read tasks.md
      const incrementPath = path.join(
        process.cwd(),
        '.specweave',
        'increments',
        incrementId
      );
      const tasksPath = path.join(incrementPath, 'tasks.md');

      if (!fs.existsSync(tasksPath)) {
        result.errors.push(`tasks.md not found for increment ${incrementId}`);
        return result;
      }

      let tasksContent = fs.readFileSync(tasksPath, 'utf-8');

      // 4. Find task and reopen it
      const taskPattern = new RegExp(
        `^(#{2,3}) (${taskId}): (.+)$`,
        'gm'
      );

      let taskFound = false;
      tasksContent = tasksContent.replace(taskPattern, (match, hashes, id, title) => {
        taskFound = true;
        return `${hashes} ${id}: ${title}`;
      });

      if (!taskFound) {
        result.errors.push(`Task ${taskId} not found in tasks.md`);
        return result;
      }

      // 5. Update task status: [x] → [ ]
      // Find the Status line after the task heading
      const statusPattern = new RegExp(
        `(#{2,3} ${taskId}:[^\\n]+\\n[^\\n]*?\\n\\*\\*Status\\*\\*: )\\[x\\]`,
        'gi'
      );

      tasksContent = tasksContent.replace(statusPattern, (match, prefix) => {
        return `${prefix}[ ] (Reopened: ${new Date().toISOString().split('T')[0]} - ${reason})`;
      });

      // 6. Write updated tasks.md
      fs.writeFileSync(tasksPath, tasksContent, 'utf-8');

      // 7. Touch increment (update lastActivity)
      MetadataManager.touch(incrementId);

      // Success!
      result.success = true;
      result.itemsReopened.push(`Task ${taskId}`);

      return result;

    } catch (error) {
      result.errors.push(
        `Failed to reopen task: ${error instanceof Error ? error.message : String(error)}`
      );
      return result;
    }
  }

  /**
   * Reopen user story + related tasks
   *
   * @param context - Reopen context
   * @returns Reopen result
   */
  static async reopenUserStory(context: ReopenContext): Promise<ReopenResult> {
    const { incrementId, userStoryId, reason } = context;
    const result: ReopenResult = {
      success: false,
      itemsReopened: [],
      warnings: [],
      errors: []
    };

    try {
      // 1. Validate user story ID provided
      if (!userStoryId) {
        result.errors.push('User story ID required for user story reopen');
        return result;
      }

      // 2. Find tasks related to user story (AC field matching)
      const tasks = await this.findTasksForUserStory(incrementId, userStoryId);

      if (tasks.length === 0) {
        result.warnings.push(`No tasks found for user story ${userStoryId}`);
        // Still proceed to mark user story as reopened in living docs
      }

      // 3. Reopen each task
      for (const taskId of tasks) {
        const taskResult = await this.reopenTask({
          target: ReopenTarget.TASK,
          incrementId,
          taskId,
          reason: `Reopened via user story ${userStoryId}: ${reason}`,
          force: context.force
        });

        if (taskResult.success) {
          result.itemsReopened.push(...taskResult.itemsReopened);
        } else {
          result.warnings.push(
            `Failed to reopen task ${taskId}: ${taskResult.errors.join(', ')}`
          );
        }
      }

      // 4. Update user story status in living docs (if exists)
      const userStoryUpdated = await this.updateUserStoryStatus(
        incrementId,
        userStoryId,
        'reopened',
        reason
      );

      if (userStoryUpdated) {
        result.itemsReopened.push(`User story ${userStoryId}`);
      } else {
        result.warnings.push(`Could not update user story ${userStoryId} in living docs`);
      }

      // Success if at least one item reopened
      result.success = result.itemsReopened.length > 0;

      return result;

    } catch (error) {
      result.errors.push(
        `Failed to reopen user story: ${error instanceof Error ? error.message : String(error)}`
      );
      return result;
    }
  }

  /**
   * Validate WIP limits before reopening
   *
   * @param metadata - Increment metadata
   * @param force - Force reopen?
   * @returns Validation result
   */
  private static validateWIPLimits(
    metadata: IncrementMetadata,
    force?: boolean
  ): WIPValidationResult {
    const type = metadata.type;
    const limit = TYPE_LIMITS[type];

    // If unlimited type (hotfix, bug, experiment), allow
    if (limit === null) {
      return { allowed: true, warning: false };
    }

    // Count current active of same type
    const activeCount = MetadataManager.getActive()
      .filter(m => m.type === type)
      .length;

    // If reopening would exceed limit, warn or block
    if (activeCount >= limit) {
      const message = `Reopening will exceed WIP limit (${activeCount + 1}/${limit} active ${type}s). Complete or pause another ${type} first, or use --force.`;

      if (force) {
        return {
          allowed: true,
          warning: true,
          message,
          activeCount,
          limit
        };
      }

      return {
        allowed: false,
        warning: true,
        message,
        activeCount,
        limit
      };
    }

    return { allowed: true, warning: false, activeCount, limit };
  }

  /**
   * Reopen uncompleted tasks in increment
   *
   * @param incrementId - Increment ID
   * @param reason - Reason for reopening
   * @returns List of reopened task IDs
   */
  private static async reopenUncompletedTasks(
    incrementId: string,
    reason: string
  ): Promise<string[]> {
    const incrementPath = path.join(
      process.cwd(),
      '.specweave',
      'increments',
      incrementId
    );
    const tasksPath = path.join(incrementPath, 'tasks.md');

    if (!fs.existsSync(tasksPath)) {
      return [];
    }

    let tasksContent = fs.readFileSync(tasksPath, 'utf-8');
    const reopenedTasks: string[] = [];

    // Find all completed tasks: **Status**: [x]
    const completedTaskPattern = /^(#{2,3}) (T-\d+): (.+)$[\s\S]*?\*\*Status\*\*: \[x\]/gm;

    const matches = tasksContent.matchAll(completedTaskPattern);
    for (const match of matches) {
      const taskId = match[2];
      reopenedTasks.push(taskId);
    }

    // Reopen all completed tasks
    if (reopenedTasks.length > 0) {
      tasksContent = tasksContent.replace(
        /\*\*Status\*\*: \[x\]/g,
        `**Status**: [ ] (Reopened: ${new Date().toISOString().split('T')[0]} - ${reason})`
      );

      fs.writeFileSync(tasksPath, tasksContent, 'utf-8');
    }

    return reopenedTasks;
  }

  /**
   * Find tasks that implement a user story (by AC field)
   *
   * @param incrementId - Increment ID
   * @param userStoryId - User story ID (e.g., "US-001")
   * @returns List of task IDs
   */
  private static async findTasksForUserStory(
    incrementId: string,
    userStoryId: string
  ): Promise<string[]> {
    const incrementPath = path.join(
      process.cwd(),
      '.specweave',
      'increments',
      incrementId
    );
    const tasksPath = path.join(incrementPath, 'tasks.md');

    if (!fs.existsSync(tasksPath)) {
      return [];
    }

    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
    const tasks: string[] = [];

    // Extract user story number (US-001 → 001 or 1)
    const usNumber = userStoryId.replace(/^US-0*/, '');

    // Find tasks with AC field referencing this user story
    // Pattern: **AC**: AC-US1-01, AC-US1-02, ...
    const acPattern = new RegExp(
      `^#{2,3} (T-\\d+):[^\\n]+[\\s\\S]*?\\*\\*AC\\*\\*:[^\\n]*AC-US${usNumber}-`,
      'gm'
    );

    const matches = tasksContent.matchAll(acPattern);
    for (const match of matches) {
      tasks.push(match[1]);
    }

    return tasks;
  }

  /**
   * Update user story status in living docs
   *
   * @param incrementId - Increment ID
   * @param userStoryId - User story ID
   * @param status - New status
   * @param reason - Reason
   * @returns Success flag
   */
  private static async updateUserStoryStatus(
    incrementId: string,
    userStoryId: string,
    status: string,
    reason: string
  ): Promise<boolean> {
    try {
      // Find user story file in living docs
      const specPath = path.join(
        process.cwd(),
        '.specweave',
        'docs',
        'internal',
        'specs'
      );

      // Search for user story file (pattern: us-001-*.md)
      const usFiles = await this.findUserStoryFiles(specPath, userStoryId);

      if (usFiles.length === 0) {
        return false;
      }

      // Update status in each file
      for (const usFile of usFiles) {
        let content = fs.readFileSync(usFile, 'utf-8');

        // Update frontmatter status
        content = content.replace(
          /^status: .+$/m,
          `status: ${status}`
        );

        // Add reopen note
        const reopenNote = `\n\n---\n**Reopened**: ${new Date().toISOString().split('T')[0]} - ${reason}\n`;
        if (!content.includes('**Reopened**')) {
          content += reopenNote;
        }

        fs.writeFileSync(usFile, content, 'utf-8');
      }

      return true;

    } catch (error) {
      console.error(`Failed to update user story status: ${error}`);
      return false;
    }
  }

  /**
   * Find user story files in living docs
   *
   * @param basePath - Base search path
   * @param userStoryId - User story ID (e.g., "US-001")
   * @returns List of file paths
   */
  private static async findUserStoryFiles(
    basePath: string,
    userStoryId: string
  ): Promise<string[]> {
    const files: string[] = [];

    if (!fs.existsSync(basePath)) {
      return files;
    }

    // Extract user story number (US-001 → 001)
    const usNumber = userStoryId.replace(/^US-/, '').toLowerCase();

    // Recursively search for us-XXX-*.md files
    const searchDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else if (entry.isFile() && entry.name.match(new RegExp(`^us-${usNumber}-.*\\.md$`, 'i'))) {
          files.push(fullPath);
        }
      }
    };

    searchDir(basePath);
    return files;
  }
}
