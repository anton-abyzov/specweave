/**
 * Completion Propagator - Bottom-up completion propagation
 *
 * Propagates completion status from Tasks → ACs → User Stories → Increments
 *
 * Rules:
 * - When all Tasks for AC complete → Mark AC complete
 * - When all ACs for User Story complete → Mark User Story complete
 * - When all User Stories for Increment complete → Mark Increment complete
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Completion statistics
 */
export interface CompletionStats {
  /** Total items */
  total: number;

  /** Completed items */
  completed: number;

  /** Completion percentage */
  percentage: number;

  /** Is 100% complete */
  isComplete: boolean;
}

/**
 * Propagation result
 */
export interface PropagationResult {
  /** ACs marked complete */
  acsCompleted: number;

  /** User Stories marked complete */
  userStoriesCompleted: number;

  /** Increment marked complete */
  incrementCompleted: boolean;

  /** Errors encountered */
  errors: string[];
}

/**
 * CompletionPropagator - Handles bottom-up completion
 */
export class CompletionPropagator {
  /**
   * Propagate completion from Tasks → ACs → User Stories → Increment
   *
   * @param incrementPath - Path to increment
   */
  async propagateCompletion(incrementPath: string): Promise<PropagationResult> {
    const result: PropagationResult = {
      acsCompleted: 0,
      userStoriesCompleted: 0,
      incrementCompleted: false,
      errors: []
    };

    try {
      // 1. Read increment spec.md and tasks.md
      const specPath = path.join(incrementPath, 'spec.md');
      const tasksPath = path.join(incrementPath, 'tasks.md');

      let specContent = await fs.readFile(specPath, 'utf-8');
      const tasksContent = await fs.readFile(tasksPath, 'utf-8');

      // 2. Parse ACs and Tasks
      const acs = this.parseAcs(specContent);
      const tasks = this.parseTasks(tasksContent);

      // 3. For each AC, check if all its tasks are complete
      let specModified = false;

      for (const ac of acs) {
        // Find tasks for this AC
        const acTasks = tasks.filter(t => t.acIds.includes(ac.id));

        if (acTasks.length > 0) {
          // Check if all tasks complete
          const allTasksComplete = acTasks.every(t => t.completed);

          if (allTasksComplete && !ac.completed) {
            // Mark AC as complete
            specContent = this.updateAcCheckbox(specContent, ac.id, true);
            result.acsCompleted++;
            specModified = true;
          } else if (!allTasksComplete && ac.completed) {
            // Mark AC as incomplete (some task was reopened)
            specContent = this.updateAcCheckbox(specContent, ac.id, false);
            specModified = true;
          }
        }
      }

      // 4. Save updated spec.md if modified
      if (specModified) {
        await fs.writeFile(specPath, specContent, 'utf-8');
      }

      // 5. Check User Story completion
      // Parse updated ACs to check if any User Stories are now complete
      const updatedAcs = this.parseAcs(specContent);
      const userStories = this.groupAcsByUserStory(updatedAcs);

      for (const [userStoryId, userStoryAcs] of Object.entries(userStories)) {
        const allAcsComplete = userStoryAcs.every(ac => ac.completed);
        if (allAcsComplete) {
          result.userStoriesCompleted++;
        }
      }

      // 6. Check Increment completion
      const allAcsComplete = updatedAcs.every(ac => ac.completed);
      if (allAcsComplete && updatedAcs.length > 0) {
        result.incrementCompleted = true;
        // TODO: Update increment metadata status to 'completed'
      }

    } catch (error) {
      result.errors.push((error as Error).message);
    }

    return result;
  }

  /**
   * Get completion statistics for an AC
   *
   * @param acId - AC ID (e.g., "AC-US1-01")
   * @param incrementPath - Path to increment
   */
  async getAcCompletionStats(acId: string, incrementPath: string): Promise<CompletionStats> {
    const tasksPath = path.join(incrementPath, 'tasks.md');
    const tasksContent = await fs.readFile(tasksPath, 'utf-8');
    const tasks = this.parseTasks(tasksContent);

    const acTasks = tasks.filter(t => t.acIds.includes(acId));
    const completedTasks = acTasks.filter(t => t.completed);

    return {
      total: acTasks.length,
      completed: completedTasks.length,
      percentage: acTasks.length > 0 ? Math.round((completedTasks.length / acTasks.length) * 100) : 0,
      isComplete: acTasks.length > 0 && completedTasks.length === acTasks.length
    };
  }

  /**
   * Get completion statistics for a User Story
   *
   * @param userStoryId - User Story ID (e.g., "US1")
   * @param incrementPath - Path to increment
   */
  async getUserStoryCompletionStats(userStoryId: string, incrementPath: string): Promise<CompletionStats> {
    const specPath = path.join(incrementPath, 'spec.md');
    const specContent = await fs.readFile(specPath, 'utf-8');
    const acs = this.parseAcs(specContent);

    const userStoryAcs = acs.filter(ac => ac.userStoryId === userStoryId);
    const completedAcs = userStoryAcs.filter(ac => ac.completed);

    return {
      total: userStoryAcs.length,
      completed: completedAcs.length,
      percentage: userStoryAcs.length > 0 ? Math.round((completedAcs.length / userStoryAcs.length) * 100) : 0,
      isComplete: userStoryAcs.length > 0 && completedAcs.length === userStoryAcs.length
    };
  }

  /**
   * Get completion statistics for entire increment
   *
   * @param incrementPath - Path to increment
   */
  async getIncrementCompletionStats(incrementPath: string): Promise<CompletionStats> {
    const specPath = path.join(incrementPath, 'spec.md');
    const specContent = await fs.readFile(specPath, 'utf-8');
    const acs = this.parseAcs(specContent);

    const completedAcs = acs.filter(ac => ac.completed);

    return {
      total: acs.length,
      completed: completedAcs.length,
      percentage: acs.length > 0 ? Math.round((completedAcs.length / acs.length) * 100) : 0,
      isComplete: acs.length > 0 && completedAcs.length === acs.length
    };
  }

  /**
   * Parse ACs from spec.md content
   */
  private parseAcs(content: string): Array<{ id: string; userStoryId: string; completed: boolean }> {
    const acs: Array<{ id: string; userStoryId: string; completed: boolean }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^- \[([ x])\] (AC-([A-Z0-9]+)-\d+):/);
      if (match) {
        acs.push({
          id: match[2],
          userStoryId: match[3],
          completed: match[1] === 'x'
        });
      }
    }

    return acs;
  }

  /**
   * Parse Tasks from tasks.md content
   */
  private parseTasks(content: string): Array<{ id: string; acIds: string[]; completed: boolean }> {
    const tasks: Array<{ id: string; acIds: string[]; completed: boolean }> = [];

    // Split by task headers
    const taskPattern = /### (T-\d+):.*?(?=###|$)/gs;
    const matches = content.matchAll(taskPattern);

    for (const match of matches) {
      const taskId = match[1];
      const taskContent = match[0];

      // Extract AC-IDs from task content
      const acIdMatches = taskContent.matchAll(/AC-([\w]+-\d+)/g);
      const acIds = Array.from(acIdMatches, m => `AC-${m[1]}`);

      // Check if task is completed
      const completedMatch = taskContent.match(/\*\*Completed\*\*:\s*(\d{4}-\d{2}-\d{2})/);
      const completed = !!completedMatch;

      tasks.push({
        id: taskId,
        acIds,
        completed
      });
    }

    return tasks;
  }

  /**
   * Group ACs by User Story ID
   */
  private groupAcsByUserStory(
    acs: Array<{ id: string; userStoryId: string; completed: boolean }>
  ): Record<string, Array<{ id: string; userStoryId: string; completed: boolean }>> {
    const grouped: Record<string, Array<{ id: string; userStoryId: string; completed: boolean }>> = {};

    for (const ac of acs) {
      if (!grouped[ac.userStoryId]) {
        grouped[ac.userStoryId] = [];
      }
      grouped[ac.userStoryId].push(ac);
    }

    return grouped;
  }

  /**
   * Update AC checkbox in content
   */
  private updateAcCheckbox(content: string, acId: string, completed: boolean): string {
    const checkbox = completed ? 'x' : ' ';
    const pattern = new RegExp(`^- \\[([ x])\\] ${acId}:`, 'gm');
    return content.replace(pattern, `- [${checkbox}] ${acId}:`);
  }
}
