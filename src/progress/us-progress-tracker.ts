/**
 * User Story Progress Tracking
 *
 * Calculates task completion statistics grouped by User Story.
 * Provides per-US and aggregate completion percentages.
 */

import { parseTasksWithUSLinks, getAllTasks, type Task, type TasksByUserStory, type TaskStatus } from '../generators/spec/task-parser.js';

/**
 * Progress statistics for a single User Story
 */
export interface USProgress {
  usId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  percentage: number;
  tasks: Task[];
}

/**
 * Aggregate progress across all User Stories
 */
export interface AggregateProgress {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  percentage: number;
  byUserStory: Map<string, USProgress>;
  orphanTasks: Task[]; // Tasks without userStory field
}

/**
 * Count tasks by status predicate
 */
function countByStatus(tasks: Task[], predicate: (t: Task) => boolean): number {
  return tasks.filter(predicate).length;
}

/**
 * Calculate task completion statistics for a single User Story
 */
export function calculateUSProgress(usId: string, tasks: Task[]): USProgress {
  const totalTasks = tasks.length;
  const completedTasks = countByStatus(tasks, t => t.status === 'completed');
  const inProgressTasks = countByStatus(tasks, t => t.status === 'in_progress');
  const pendingTasks = totalTasks - completedTasks - inProgressTasks;
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return { usId, totalTasks, completedTasks, inProgressTasks, pendingTasks, percentage, tasks };
}

/**
 * Calculate aggregate progress across all User Stories
 */
export function calculateAggregateProgress(tasksByUS: TasksByUserStory): AggregateProgress {
  const byUserStory = new Map<string, USProgress>();
  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let pendingTasks = 0;

  for (const [usId, tasks] of Object.entries(tasksByUS)) {
    if (usId === 'orphan' || usId === 'unknown') continue;

    const usProgress = calculateUSProgress(usId, tasks);
    byUserStory.set(usId, usProgress);

    totalTasks += usProgress.totalTasks;
    completedTasks += usProgress.completedTasks;
    inProgressTasks += usProgress.inProgressTasks;
    pendingTasks += usProgress.pendingTasks;
  }

  const orphanTasks = tasksByUS['orphan'] || tasksByUS['unknown'] || [];
  if (orphanTasks.length > 0) {
    const orphanProgress = calculateUSProgress('orphan', orphanTasks);
    totalTasks += orphanProgress.totalTasks;
    completedTasks += orphanProgress.completedTasks;
    inProgressTasks += orphanProgress.inProgressTasks;
    pendingTasks += orphanProgress.pendingTasks;
  }

  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return { totalTasks, completedTasks, inProgressTasks, pendingTasks, percentage, byUserStory, orphanTasks };
}

/**
 * Calculate progress from tasks.md file
 */
export async function calculateProgressFromTasksFile(tasksPath: string): Promise<AggregateProgress> {
  const tasksByUS = await parseTasksWithUSLinks(tasksPath);
  return calculateAggregateProgress(tasksByUS);
}

/**
 * Format US progress as string
 */
export function formatUSProgress(progress: USProgress, includePercentage: boolean = true): string {
  const percentStr = includePercentage ? ` (${progress.percentage}%)` : '';
  return `${progress.usId}: ${progress.completedTasks}/${progress.totalTasks} tasks${percentStr}`;
}

/**
 * Format aggregate progress as string
 */
export function formatAggregateProgress(progress: AggregateProgress): string {
  return `Overall: ${progress.completedTasks}/${progress.totalTasks} tasks (${progress.percentage}%)`;
}

/**
 * Get progress bar visualization
 */
export function getProgressBar(percentage: number, width: number = 20): string {
  const filledChars = Math.round((percentage / 100) * width);
  const emptyChars = width - filledChars;
  return '█'.repeat(filledChars) + '░'.repeat(emptyChars);
}

/**
 * Get color indicator based on percentage
 */
export function getProgressColor(percentage: number): 'green' | 'yellow' | 'red' {
  return percentage >= 80 ? 'green' : percentage >= 50 ? 'yellow' : 'red';
}

/**
 * Sort User Stories by completion percentage (descending)
 */
export function sortUSByCompletion(progressMap: Map<string, USProgress>): USProgress[] {
  return Array.from(progressMap.values()).sort((a, b) => b.percentage - a.percentage);
}

/**
 * Sort User Stories by US-ID (ascending)
 */
export function sortUSByID(progressMap: Map<string, USProgress>): USProgress[] {
  return Array.from(progressMap.values()).sort((a, b) => {
    const aNum = parseInt(a.usId.replace('US-', ''));
    const bNum = parseInt(b.usId.replace('US-', ''));
    return aNum - bNum;
  });
}
