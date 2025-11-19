/**
 * Task Parser with US-Task Linkage Support
 *
 * Parses tasks.md files to extract task metadata including new US linkage fields:
 * - userStory: US-ID this task implements (e.g., "US-001")
 * - satisfiesACs: List of AC-IDs this task satisfies (e.g., ["AC-US1-01", "AC-US1-02"])
 *
 * Supports hierarchical task structure grouped by User Story.
 */

import { readFileSync } from 'fs';
import path from 'path';

/**
 * Task metadata extracted from tasks.md
 */
export interface Task {
  /** Task ID (e.g., "T-001") */
  id: string;

  /** Task title */
  title: string;

  /** User Story this task implements (optional for backward compatibility) */
  userStory?: string;

  /** Acceptance Criteria IDs this task satisfies (optional) */
  satisfiesACs?: string[];

  /** Task completion status */
  status: TaskStatus;

  /** Priority level (P0, P1, P2, P3) */
  priority?: string;

  /** Estimated effort (e.g., "4 hours", "2 days") */
  estimatedEffort?: string;

  /** Task dependencies (task IDs this depends on) */
  dependencies?: string[];

  /** Full task description */
  description?: string;

  /** Files affected by this task */
  filesAffected?: string[];

  /** Line number in tasks.md (for error reporting) */
  lineNumber?: number;
}

/**
 * Task completion status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'transferred' | 'canceled';

/**
 * Tasks grouped by User Story
 */
export interface TasksByUserStory {
  [usId: string]: Task[];
}

/**
 * Validation error for task linkage
 */
export interface TaskLinkageError {
  taskId: string;
  field: 'userStory' | 'satisfiesACs';
  value: string;
  message: string;
  suggestedFix?: string;
}

/**
 * Parse tasks.md and extract all tasks with US linkage
 *
 * @param tasksPath - Path to tasks.md file
 * @returns Map of User Story ID → Tasks
 * @throws Error if tasks.md cannot be read or is malformed
 */
export function parseTasksWithUSLinks(tasksPath: string): TasksByUserStory {
  try {
    const content = readFileSync(tasksPath, 'utf-8');
    const tasks: TasksByUserStory = {};

    // Split content into lines for line number tracking
    const lines = content.split('\n');

    // Regex patterns for task parsing
    const taskHeaderRegex = /^###\s+(T-\d{3}):\s*(.+)$/;
    const userStoryRegex = /^\*\*User Story\*\*:\s*(US-\d{3})/;
    const satisfiesACsRegex = /^\*\*Satisfies ACs\*\*:\s*(AC-US\d+-\d{2}(?:,\s*AC-US\d+-\d{2})*)/;
    const statusRegex = /^\*\*Status\*\*:\s*\[([x ])\]\s*(\w+)/;
    const priorityRegex = /^\*\*Priority\*\*:\s*(.+)/;
    const estimatedEffortRegex = /^\*\*Estimated Effort\*\*:\s*(.+)/;
    const dependenciesRegex = /^\*\*Dependencies\*\*:\s*(.+)/;

    let currentTask: Task | null = null;
    let currentDescription: string[] = [];
    let currentSection: 'none' | 'description' | 'implementation' | 'test' | 'files' = 'none';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for task header (### T-XXX: Title)
      const taskHeaderMatch = line.match(taskHeaderRegex);
      if (taskHeaderMatch) {
        // Save previous task if exists
        if (currentTask) {
          saveTask(tasks, currentTask, currentDescription);
        }

        // Start new task
        currentTask = {
          id: taskHeaderMatch[1],
          title: taskHeaderMatch[2],
          status: 'pending',
          lineNumber
        };
        currentDescription = [];
        currentSection = 'none';
        continue;
      }

      // Skip if no current task
      if (!currentTask) continue;

      // Parse task fields
      const userStoryMatch = line.match(userStoryRegex);
      if (userStoryMatch) {
        currentTask.userStory = userStoryMatch[1];
        continue;
      }

      const satisfiesACsMatch = line.match(satisfiesACsRegex);
      if (satisfiesACsMatch) {
        // Split comma-separated AC-IDs and trim whitespace
        currentTask.satisfiesACs = satisfiesACsMatch[1]
          .split(',')
          .map(ac => ac.trim());
        continue;
      }

      const statusMatch = line.match(statusRegex);
      if (statusMatch) {
        const checkbox = statusMatch[1];
        const statusText = statusMatch[2].toLowerCase();

        // Map checkbox and status text to TaskStatus
        if (checkbox === 'x') {
          currentTask.status = 'completed';
        } else if (statusText.includes('progress')) {
          currentTask.status = 'in_progress';
        } else if (statusText.includes('transfer')) {
          currentTask.status = 'transferred';
        } else if (statusText.includes('cancel')) {
          currentTask.status = 'canceled';
        } else {
          currentTask.status = 'pending';
        }
        continue;
      }

      const priorityMatch = line.match(priorityRegex);
      if (priorityMatch) {
        currentTask.priority = priorityMatch[1];
        continue;
      }

      const estimatedEffortMatch = line.match(estimatedEffortRegex);
      if (estimatedEffortMatch) {
        currentTask.estimatedEffort = estimatedEffortMatch[1];
        continue;
      }

      const dependenciesMatch = line.match(dependenciesRegex);
      if (dependenciesMatch) {
        // Parse dependencies (T-001, T-002, etc.)
        currentTask.dependencies = dependenciesMatch[1]
          .split(',')
          .map(dep => dep.trim())
          .filter(dep => dep.match(/^T-\d{3}$/));
        continue;
      }

      // Track sections for description parsing
      if (line.startsWith('**Description**:')) {
        currentSection = 'description';
        continue;
      }
      if (line.startsWith('**Implementation Steps**:')) {
        currentSection = 'implementation';
        continue;
      }
      if (line.startsWith('**Test Plan**:')) {
        currentSection = 'test';
        continue;
      }
      if (line.startsWith('**Files Affected**:')) {
        currentSection = 'files';
        currentTask.filesAffected = [];
        continue;
      }

      // Collect description lines
      if (currentSection === 'description' && line.trim() && !line.startsWith('**')) {
        currentDescription.push(line.trim());
      }

      // Collect files affected
      if (currentSection === 'files' && line.trim().startsWith('- `')) {
        const filePath = line.trim().replace(/^- `(.+)`/, '$1');
        if (currentTask.filesAffected) {
          currentTask.filesAffected.push(filePath);
        }
      }
    }

    // Save last task
    if (currentTask) {
      saveTask(tasks, currentTask, currentDescription);
    }

    return tasks;
  } catch (error) {
    throw new Error(`Failed to parse tasks.md at ${tasksPath}: ${error}`);
  }
}

/**
 * Helper: Save task to tasks map, grouped by User Story
 */
function saveTask(tasks: TasksByUserStory, task: Task, description: string[]): void {
  // Set description
  if (description.length > 0) {
    task.description = description.join(' ');
  }

  // Group by User Story (or "unassigned" if no userStory field)
  const usId = task.userStory || 'unassigned';

  if (!tasks[usId]) {
    tasks[usId] = [];
  }
  tasks[usId].push(task);
}

/**
 * Validate task US and AC linkage
 *
 * @param task - Task to validate
 * @param validUSIds - List of valid US-IDs from spec.md
 * @param validACIds - List of valid AC-IDs from spec.md
 * @returns Array of validation errors (empty if valid)
 */
export function validateTaskLinkage(
  task: Task,
  validUSIds: string[],
  validACIds: string[]
): TaskLinkageError[] {
  const errors: TaskLinkageError[] = [];

  // Validate userStory field
  if (task.userStory) {
    // Check format (US-XXX)
    if (!task.userStory.match(/^US-\d{3}$/)) {
      errors.push({
        taskId: task.id,
        field: 'userStory',
        value: task.userStory,
        message: `Invalid US-ID format: "${task.userStory}" (expected format: US-001)`,
        suggestedFix: 'Use format: US-XXX where XXX is a 3-digit number'
      });
    }
    // Check if US exists in spec.md
    else if (!validUSIds.includes(task.userStory)) {
      errors.push({
        taskId: task.id,
        field: 'userStory',
        value: task.userStory,
        message: `User Story ${task.userStory} not found in spec.md`,
        suggestedFix: `Valid User Stories: ${validUSIds.join(', ')}`
      });
    }
  }

  // Validate satisfiesACs field
  if (task.satisfiesACs && task.satisfiesACs.length > 0) {
    for (const acId of task.satisfiesACs) {
      // Check format (AC-USXX-YY)
      if (!acId.match(/^AC-US\d+-\d{2}$/)) {
        errors.push({
          taskId: task.id,
          field: 'satisfiesACs',
          value: acId,
          message: `Invalid AC-ID format: "${acId}" (expected format: AC-US1-01)`,
          suggestedFix: 'Use format: AC-USXX-YY where XX is US number, YY is AC number'
        });
        continue;
      }

      // Check if AC exists in spec.md
      if (!validACIds.includes(acId)) {
        errors.push({
          taskId: task.id,
          field: 'satisfiesACs',
          value: acId,
          message: `Acceptance Criteria ${acId} not found in spec.md`,
          suggestedFix: `Check spec.md for valid AC-IDs in this User Story`
        });
        continue;
      }

      // Check if AC belongs to correct User Story
      if (task.userStory) {
        const acUSNumber = extractUSNumberFromACId(acId);
        const taskUSNumber = extractUSNumber(task.userStory);

        if (acUSNumber !== taskUSNumber) {
          errors.push({
            taskId: task.id,
            field: 'satisfiesACs',
            value: acId,
            message: `AC ${acId} belongs to US-${String(acUSNumber).padStart(3, '0')}, but task is linked to ${task.userStory}`,
            suggestedFix: `Either link task to US-${String(acUSNumber).padStart(3, '0')} or use different AC-ID`
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Extract US number from AC-ID (AC-US1-01 → 1)
 */
function extractUSNumberFromACId(acId: string): number {
  const match = acId.match(/^AC-US(\d+)-\d{2}$/);
  return match ? parseInt(match[1], 10) : -1;
}

/**
 * Extract US number from US-ID (US-001 → 1)
 */
function extractUSNumber(usId: string): number {
  const match = usId.match(/^US-(\d{3})$/);
  return match ? parseInt(match[1], 10) : -1;
}

/**
 * Get all tasks (flattened, not grouped by US)
 *
 * @param tasksByUS - Tasks grouped by User Story
 * @returns Array of all tasks
 */
export function getAllTasks(tasksByUS: TasksByUserStory): Task[] {
  return Object.values(tasksByUS).flat();
}

/**
 * Count tasks by status
 *
 * @param tasksByUS - Tasks grouped by User Story
 * @returns Map of status → count
 */
export function countTasksByStatus(tasksByUS: TasksByUserStory): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    transferred: 0,
    canceled: 0
  };

  const allTasks = getAllTasks(tasksByUS);
  allTasks.forEach(task => {
    counts[task.status]++;
  });

  return counts;
}

/**
 * Calculate completion percentage
 *
 * @param tasksByUS - Tasks grouped by User Story
 * @returns Completion percentage (0-100)
 */
export function calculateCompletionPercentage(tasksByUS: TasksByUserStory): number {
  const allTasks = getAllTasks(tasksByUS);
  if (allTasks.length === 0) return 0;

  const completedTasks = allTasks.filter(t => t.status === 'completed').length;
  return Math.round((completedTasks / allTasks.length) * 100);
}
