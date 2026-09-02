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

  /** Files owned by this task (2.0 `Files:` field, legacy `**Files Affected**:` list). */
  filesAffected?: string[];

  /** All AC ids referenced (2.0 `AC:` field or legacy `**Satisfies ACs**`), any AC id format. */
  acs?: string[];

  /** Verification command (2.0 `Test:` field, or legacy `**Test**:` value). */
  test?: string;

  /** True when a rendered state checkbox (`- [x] done …`) was found (2.0 format). */
  hasStateLine?: boolean;

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
 * Parse task status from checkbox and status text
 */
function parseTaskStatus(checkbox: string, statusText: string): TaskStatus {
  if (checkbox === 'x') return 'completed';
  if (statusText.includes('progress')) return 'in_progress';
  if (statusText.includes('transfer')) return 'transferred';
  if (statusText.includes('cancel')) return 'canceled';
  return 'pending';
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

    // Regex patterns for task parsing (T-029: Support E suffix for external IDs)
    // Updated: Support 3+ digits for T-XXX and US-XXX (Y2K fix)
    //
    // 0867: These field regexes are NOT `^`-anchored. The canonical task format
    // combines several fields on ONE line separated by `|`:
    //   **User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
    // The line is split on `|` and each segment matched independently (see
    // below). Previously these were `^`-anchored and the userStory match
    // early-`continue`d, silently dropping same-line `Satisfies ACs`/`Status` —
    // making every combined-format task read as `pending` (whole-codebase bug).
    // The multi-line format (each `**Field**:` on its own line) still parses
    // because each line is a single segment.
    // 2.0 header is `### T-01 Title` (no colon, 2+ digits); legacy is `### T-001: Title`.
    const taskHeaderRegex = /^###\s+(T-\d{2,}E?):?\s+(.+)$/;
    const userStoryRegex = /\*\*User Story\*\*:\s*(US-\d{3,}E?)/;
    const satisfiesACsRegex = /\*\*Satisfies ACs\*\*:\s*(AC-US\d+E?-\d{2}(?:,\s*AC-US\d+E?-\d{2})*)/;
    // Trailing status word is OPTIONAL: a checkbox-only `**Status**: [x]` is a
    // valid completed task. The checkbox is the source of truth (see
    // parseTaskStatus), so requiring `(\w+)` here would silently under-report a
    // bare-checkbox task as pending — the same drop-class T-019 fixed.
    const statusRegex = /\*\*Status\*\*:\s*\[([x ])\]\s*(\w+)?/;
    const priorityRegex = /\*\*Priority\*\*:\s*([^|]+)/;
    const estimatedEffortRegex = /\*\*Estimated Effort\*\*:\s*([^|]+)/;
    const dependenciesRegex = /\*\*Dependencies\*\*:\s*([^|]+)/;
    // 2.0 one-line field form: `- AC: AC-01, AC-02 | Files: src/a.ts, src/b.ts | Test: <cmd>`
    // (bold `**AC**:` / `**Files**:` / `**Test**:` accepted too). `Test:` MUST be
    // the last segment — its value runs to end of line so shell pipes survive.
    const acFieldRegex = /(?:^-?\s*|\|\s*)\*{0,2}AC\*{0,2}:\s*([^|]+)/;
    const filesFieldRegex = /(?:^-?\s*|\|\s*)\*{0,2}Files\*{0,2}:\s*([^|]+)/;
    const testFieldRegex = /(?:^-?\s*|\|\s*)\*{0,2}Test\*{0,2}:\s*(.+)$/;
    // Rendered state line written by `specweave task render` (2.0). Restricted to
    // known state words so BDD sub-checkboxes (`- [ ] Given …`) never match.
    // `[-]` = skipped (rendered by `specweave task skip`), `[x]` = done.
    const stateLineRegex = /^- \[([ x-])\](?:\s+(?:done|open|pending|claimed|stale|blocked|skipped)\b.*)?$/i;

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

      // Parse task fields. A single line may carry MULTIPLE `**Field**:`
      // segments separated by `|`, so we extract EVERY recognized field from
      // the line instead of early-`continue`ing after the first match. The
      // regexes are unanchored (above), and value-capturing fields stop at `|`
      // so a later segment's value isn't swallowed.
      let matchedAnyField = false;

      const userStoryMatch = line.match(userStoryRegex);
      if (userStoryMatch) {
        currentTask.userStory = userStoryMatch[1];
        matchedAnyField = true;
      }

      const satisfiesACsMatch = line.match(satisfiesACsRegex);
      if (satisfiesACsMatch) {
        // Split comma-separated AC-IDs and trim whitespace
        currentTask.satisfiesACs = satisfiesACsMatch[1]
          .split(',')
          .map(ac => ac.trim());
        if (!currentTask.acs) currentTask.acs = [...currentTask.satisfiesACs];
        matchedAnyField = true;
      }

      const statusMatch = line.match(statusRegex);
      if (statusMatch) {
        const checkbox = statusMatch[1];
        // statusMatch[2] is optional (bare `[x]` has no trailing word).
        const statusText = (statusMatch[2] ?? '').toLowerCase();

        currentTask.status = parseTaskStatus(checkbox, statusText);
        matchedAnyField = true;
      }

      const priorityMatch = line.match(priorityRegex);
      if (priorityMatch) {
        currentTask.priority = priorityMatch[1].trim();
        matchedAnyField = true;
      }

      const estimatedEffortMatch = line.match(estimatedEffortRegex);
      if (estimatedEffortMatch) {
        currentTask.estimatedEffort = estimatedEffortMatch[1].trim();
        matchedAnyField = true;
      }

      const dependenciesMatch = line.match(dependenciesRegex);
      if (dependenciesMatch) {
        // Parse dependencies (T-001, T-002, T-1000, etc.)
        currentTask.dependencies = dependenciesMatch[1]
          .split(',')
          .map(dep => dep.trim())
          .filter(dep => dep.match(/^T-\d{2,}E?$/));
        matchedAnyField = true;
      }

      const acFieldMatch = line.match(acFieldRegex);
      if (acFieldMatch) {
        const acs = acFieldMatch[1].split(',').map(a => a.trim()).filter(a => /^AC-[A-Z0-9-]+$/i.test(a));
        if (acs.length > 0) {
          currentTask.acs = acs;
          const usAcs = acs.filter(a => /^AC-US\d+E?-\d{2}$/.test(a));
          if (usAcs.length > 0 && !currentTask.satisfiesACs) currentTask.satisfiesACs = usAcs;
          matchedAnyField = true;
        }
      }

      const filesFieldMatch = line.match(filesFieldRegex);
      if (filesFieldMatch) {
        const files = filesFieldMatch[1].split(',').map(f => f.trim().replace(/^`|`$/g, '')).filter(Boolean);
        if (files.length > 0 && files[0] !== '-') {
          currentTask.filesAffected = files;
          matchedAnyField = true;
        }
      }

      const testFieldMatch = line.match(testFieldRegex);
      if (testFieldMatch) {
        const test = testFieldMatch[1].trim().replace(/^`(.+)`$/, '$1');
        if (test && test !== '-') {
          currentTask.test = test;
          matchedAnyField = true;
        }
      }

      const stateLineMatch = line.match(stateLineRegex);
      if (stateLineMatch) {
        currentTask.hasStateLine = true;
        currentTask.status =
          stateLineMatch[1] === 'x' ? 'completed'
          : stateLineMatch[1] === '-' ? 'canceled'
          : currentTask.status === 'completed' ? 'completed'
          : 'pending';
        matchedAnyField = true;
      }

      if (matchedAnyField) continue;

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
    // Check format (US-XXX, 3+ digits)
    if (!task.userStory.match(/^US-\d{3,}$/)) {
      errors.push({
        taskId: task.id,
        field: 'userStory',
        value: task.userStory,
        message: `Invalid US-ID format: "${task.userStory}" (expected format: US-001 or US-1000)`,
        suggestedFix: 'Use format: US-XXX where XXX is 3 or more digits'
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
 * Extract US number from US-ID (US-001 → 1, US-1000 → 1000)
 */
function extractUSNumber(usId: string): number {
  const match = usId.match(/^US-(\d{3,})$/);
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

  for (const task of getAllTasks(tasksByUS)) {
    counts[task.status]++;
  }

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
