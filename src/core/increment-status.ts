/**
 * Increment Status Detection
 *
 * Utility to detect increment completion status and enforce increment discipline.
 *
 * **The Iron Rule**: Cannot start increment N+1 until increment N is DONE.
 *
 * DONE means one of:
 * 1. All tasks in tasks.md marked [x] Completed
 * 2. COMPLETION-SUMMARY.md exists with "COMPLETE" status
 * 3. All tasks removed/moved with documentation
 */

import fs from 'fs-extra';
import path from 'path';

export interface PendingTask {
  id: string;
  title: string;
  priority?: string;
  phase?: string;
}

export interface IncrementStatus {
  id: string;
  path: string;
  exists: boolean;
  isComplete: boolean;
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;
  pendingTasks: PendingTask[];
  completionReports: string[];
  hasCompletionMarker: boolean;
  reason?: string; // Why incomplete
}

export class IncrementStatusDetector {
  private incrementsPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.incrementsPath = path.join(projectPath, '.specweave/increments');
  }

  /**
   * Get status for a specific increment
   */
  async getStatus(incrementId: string): Promise<IncrementStatus> {
    const incrementPath = path.join(this.incrementsPath, incrementId);

    if (!await fs.pathExists(incrementPath)) {
      return {
        id: incrementId,
        path: incrementPath,
        exists: false,
        isComplete: false,
        totalTasks: 0,
        completedTasks: 0,
        percentComplete: 0,
        pendingTasks: [],
        completionReports: [],
        hasCompletionMarker: false,
        reason: 'Increment directory does not exist',
      };
    }

    // Check for completion markers
    const completionReports = await this.findCompletionReports(incrementPath);
    const hasCompletionMarker = completionReports.length > 0;

    // Parse tasks.md
    const tasksPath = path.join(incrementPath, 'tasks.md');
    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks: PendingTask[] = [];

    if (await fs.pathExists(tasksPath)) {
      const tasksContent = await fs.readFile(tasksPath, 'utf-8');
      const taskStats = this.parseTasksFile(tasksContent);

      totalTasks = taskStats.totalTasks;
      completedTasks = taskStats.completedTasks;
      pendingTasks = taskStats.pendingTasks;
    }

    const percentComplete = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : (hasCompletionMarker ? 100 : 0);

    const isComplete = hasCompletionMarker || (totalTasks > 0 && completedTasks === totalTasks);

    let reason: string | undefined;
    if (!isComplete) {
      if (totalTasks === 0) {
        reason = 'No tasks found (tasks.md missing or empty)';
      } else {
        reason = `${totalTasks - completedTasks} tasks incomplete (${percentComplete}% complete)`;
      }
    }

    return {
      id: incrementId,
      path: incrementPath,
      exists: true,
      isComplete,
      totalTasks,
      completedTasks,
      percentComplete,
      pendingTasks,
      completionReports,
      hasCompletionMarker,
      reason,
    };
  }

  /**
   * Get all incomplete increments
   */
  async getAllIncomplete(): Promise<IncrementStatus[]> {
    if (!await fs.pathExists(this.incrementsPath)) {
      return [];
    }

    const entries = await fs.readdir(this.incrementsPath, { withFileTypes: true });
    const incrementDirs = entries
      .filter(entry => entry.isDirectory())
      .filter(entry => /^\d{4}-/.test(entry.name)) // Only numbered increments
      .map(entry => entry.name);

    const statuses = await Promise.all(
      incrementDirs.map(id => this.getStatus(id))
    );

    return statuses.filter(status => status.exists && !status.isComplete);
  }

  /**
   * Get latest increment ID
   */
  async getLatest(): Promise<string | null> {
    if (!await fs.pathExists(this.incrementsPath)) {
      return null;
    }

    const entries = await fs.readdir(this.incrementsPath, { withFileTypes: true });
    const incrementDirs = entries
      .filter(entry => entry.isDirectory())
      .filter(entry => /^\d{4}-/.test(entry.name))
      .map(entry => entry.name)
      .sort()
      .reverse();

    return incrementDirs[0] || null;
  }

  /**
   * Check if increment is complete
   */
  async isComplete(incrementId: string): Promise<boolean> {
    const status = await this.getStatus(incrementId);
    return status.isComplete;
  }

  /**
   * Find completion reports (COMPLETION-SUMMARY.md, etc.)
   */
  private async findCompletionReports(incrementPath: string): Promise<string[]> {
    const reportPatterns = [
      'COMPLETION-SUMMARY.md',
      'COMPLETION-REPORT.md',
      'FINAL-REPORT.md',
      'DONE.md',
    ];

    const reports: string[] = [];

    for (const pattern of reportPatterns) {
      const reportPath = path.join(incrementPath, pattern);
      if (await fs.pathExists(reportPath)) {
        // Check if report contains "COMPLETE" status
        const content = await fs.readFile(reportPath, 'utf-8');
        if (/Status.*:.*COMPLETE/i.test(content) || /✅.*COMPLETE/i.test(content)) {
          reports.push(pattern);
        }
      }
    }

    return reports;
  }

  /**
   * Parse tasks.md to extract task statistics
   */
  private parseTasksFile(content: string): {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: PendingTask[];
  } {
    const lines = content.split('\n');
    let totalTasks = 0;
    let completedTasks = 0;
    const pendingTasks: PendingTask[] = [];

    let currentTaskId: string | null = null;
    let currentTaskTitle: string | null = null;
    let currentTaskPriority: string | null = null;
    let currentTaskPhase: string | null = null;

    for (const line of lines) {
      // Match task header: ### T-001: Task Title OR ### T-001-DISCIPLINE: Task Title
      const taskHeaderMatch = line.match(/^###\s+(T-\d+(?:-[A-Z]+)?):\s+(.+)/);
      if (taskHeaderMatch) {
        currentTaskId = taskHeaderMatch[1];
        currentTaskTitle = taskHeaderMatch[2];
        currentTaskPriority = null;
        currentTaskPhase = null;
        continue;
      }

      // Match priority: **Priority**: P0
      const priorityMatch = line.match(/\*\*Priority\*\*:\s+(\w+)/);
      if (priorityMatch && currentTaskId) {
        currentTaskPriority = priorityMatch[1];
        continue;
      }

      // Match phase: **Phase**: Week 1
      const phaseMatch = line.match(/\*\*Phase\*\*:\s+(.+)/);
      if (phaseMatch && currentTaskId) {
        currentTaskPhase = phaseMatch[1];
        continue;
      }

      // Match status: **Status**: [x] Completed OR pending
      const statusMatch = line.match(/\*\*Status\*\*:\s+\[([x ])\]\s+(\w+)/);
      if (statusMatch && currentTaskId && currentTaskTitle) {
        totalTasks++;

        const isComplete = statusMatch[1] === 'x';
        if (isComplete) {
          completedTasks++;
        } else {
          pendingTasks.push({
            id: currentTaskId,
            title: currentTaskTitle,
            priority: currentTaskPriority || undefined,
            phase: currentTaskPhase || undefined,
          });
        }

        // Reset for next task
        currentTaskId = null;
        currentTaskTitle = null;
        currentTaskPriority = null;
        currentTaskPhase = null;
      }
    }

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
    };
  }
}

/**
 * Convenience function to check if an increment is complete
 */
export async function isIncrementComplete(
  incrementId: string,
  projectPath?: string
): Promise<boolean> {
  const detector = new IncrementStatusDetector(projectPath);
  return detector.isComplete(incrementId);
}

/**
 * Convenience function to get all incomplete increments
 */
export async function getAllIncompleteIncrements(
  projectPath?: string
): Promise<IncrementStatus[]> {
  const detector = new IncrementStatusDetector(projectPath);
  return detector.getAllIncomplete();
}

/**
 * Convenience function to get latest increment
 */
export async function getLatestIncrement(
  projectPath?: string
): Promise<string | null> {
  const detector = new IncrementStatusDetector(projectPath);
  return detector.getLatest();
}
