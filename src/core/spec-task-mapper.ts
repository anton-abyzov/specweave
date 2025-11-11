/**
 * Spec-Task Mapper for SpecWeave
 *
 * Maps tasks to spec user stories based on AC-IDs (Acceptance Criteria IDs).
 * Enables traceability from increment tasks back to living docs specs.
 */

import path from 'path';
import fs from 'fs/promises';

export interface UserStory {
  id: string; // US-001, US-002, etc.
  title: string;
  description?: string;
  acceptanceCriteria: AcceptanceCriterion[];
}

export interface AcceptanceCriterion {
  id: string; // AC-US1-01, AC-US1-02, etc.
  description: string;
  priority?: string;
  testable: boolean;
  completed: boolean;
}

export interface Task {
  id: string; // T-001, T-002, etc.
  title: string;
  description?: string;
  acIds: string[]; // AC-IDs this task addresses
  completed: boolean;
  userStories: string[]; // Derived from AC-IDs (US-001, etc.)
}

export interface SpecTaskMapping {
  specId: string; // spec-001, spec-002, etc.
  specPath: string;
  incrementId: string; // 0001, 0002, etc.
  incrementPath: string;
  userStories: UserStory[];
  tasks: Task[];
  mappings: TaskToUserStoryMapping[];
}

export interface TaskToUserStoryMapping {
  taskId: string;
  userStoryIds: string[];
  acIds: string[];
  completed: boolean;
}

/**
 * Parse spec.md to extract user stories and acceptance criteria
 */
export async function parseSpec(specPath: string): Promise<UserStory[]> {
  const content = await fs.readFile(specPath, 'utf-8');
  const userStories: UserStory[] = [];

  // Match user story patterns:
  // **US-001**: As a developer, I want...
  const userStoryRegex = /\*\*US-(\d+)\*\*:\s*(.+)/g;
  const matches = [...content.matchAll(userStoryRegex)];

  for (const match of matches) {
    const usNumber = match[1];
    const usId = `US-${usNumber}`;
    const title = match[2].trim();

    // Find acceptance criteria for this user story
    // Pattern: - [x] **AC-US1-01**: Description (P1, testable)
    const acRegex = new RegExp(
      `- \\[([ x])\\] \\*\\*AC-US${usNumber}-(\\d+)\\*\\*:\\s*([^(]+)(?:\\(([^)]+)\\))?`,
      'g'
    );

    const acceptanceCriteria: AcceptanceCriterion[] = [];
    const acMatches = [...content.matchAll(acRegex)];

    for (const acMatch of acMatches) {
      const completed = acMatch[1] === 'x';
      const acNumber = acMatch[2];
      const description = acMatch[3].trim();
      const metadata = acMatch[4] || '';

      acceptanceCriteria.push({
        id: `AC-US${usNumber}-${acNumber}`,
        description,
        priority: metadata.includes('P1') ? 'P1' : metadata.includes('P2') ? 'P2' : undefined,
        testable: metadata.includes('testable'),
        completed,
      });
    }

    userStories.push({
      id: usId,
      title,
      acceptanceCriteria,
    });
  }

  return userStories;
}

/**
 * Parse tasks.md to extract tasks with AC-IDs
 */
export async function parseTasks(tasksPath: string): Promise<Task[]> {
  const content = await fs.readFile(tasksPath, 'utf-8');
  const tasks: Task[] = [];

  // Match task patterns:
  // ## T-001: Task Title
  const taskRegex = /##\s+T-(\d+):\s*(.+)/g;
  const taskMatches = [...content.matchAll(taskRegex)];

  for (const match of taskMatches) {
    const taskNumber = match[1];
    const taskId = `T-${taskNumber}`;
    const title = match[2].trim();

    // Extract AC-IDs for this task
    // Pattern: **AC**: AC-US1-01, AC-US1-02, AC-US2-01
    const taskSection = extractTaskSection(content, taskId);
    const acLine = taskSection.match(/\*\*AC\*\*:\s*(.+)/);
    const acIds: string[] = [];

    if (acLine) {
      const acText = acLine[1];
      const acMatches = acText.matchAll(/AC-US\d+-\d+/g);
      for (const acMatch of acMatches) {
        acIds.push(acMatch[0]);
      }
    }

    // Derive user story IDs from AC-IDs
    const userStories = [...new Set(
      acIds.map(acId => {
        const match = acId.match(/AC-US(\d+)-/);
        return match ? `US-${match[1]}` : null;
      }).filter(Boolean) as string[]
    )];

    // Check if task is completed
    // Pattern: [x] T-001 or - [x] T-001
    const completedRegex = new RegExp(`\\[(x)\\]\\s+T-${taskNumber}\\b`, 'i');
    const completed = completedRegex.test(content);

    tasks.push({
      id: taskId,
      title,
      acIds,
      userStories,
      completed,
    });
  }

  return tasks;
}

/**
 * Extract task section from tasks.md content
 */
function extractTaskSection(content: string, taskId: string): string {
  const taskRegex = new RegExp(`##\\s+${taskId}:(.+?)(?=##\\s+T-\\d+:|---|\$)`, 's');
  const match = content.match(taskRegex);
  return match ? match[1] : '';
}

/**
 * Create mapping between tasks and user stories
 */
export function createTaskToUserStoryMapping(
  tasks: Task[],
  userStories: UserStory[]
): TaskToUserStoryMapping[] {
  const mappings: TaskToUserStoryMapping[] = [];

  for (const task of tasks) {
    mappings.push({
      taskId: task.id,
      userStoryIds: task.userStories,
      acIds: task.acIds,
      completed: task.completed,
    });
  }

  return mappings;
}

/**
 * Get full mapping for an increment
 */
export async function getSpecTaskMapping(
  incrementPath: string,
  specPath?: string
): Promise<SpecTaskMapping | null> {
  try {
    // Read increment spec.md
    const incrementSpecPath = path.join(incrementPath, 'spec.md');
    const incrementSpec = await fs.readFile(incrementSpecPath, 'utf-8');

    // Extract spec ID from increment spec
    // Pattern: **Implements**: SPEC-001-core-framework-architecture
    const specIdMatch = incrementSpec.match(/\*\*Implements\*\*:\s*SPEC-(\d+)-/);
    const specId = specIdMatch ? `spec-${specIdMatch[1]}` : null;

    if (!specId && !specPath) {
      // No spec linked to this increment
      return null;
    }

    // Determine spec path
    let actualSpecPath = specPath;
    if (!actualSpecPath && specId) {
      // Try to find spec in living docs
      const projectRoot = incrementPath.split('.specweave')[0];
      const possiblePaths = [
        path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs', `${specId}-*.md`),
        path.join(projectRoot, '.specweave', 'docs', 'internal', 'projects', 'default', 'specs', `${specId}-*.md`),
      ];

      for (const possiblePath of possiblePaths) {
        const glob = await import('glob');
        const matches = glob.sync(possiblePath);
        if (matches.length > 0) {
          actualSpecPath = matches[0];
          break;
        }
      }
    }

    if (!actualSpecPath) {
      return null;
    }

    // Parse spec and tasks
    const userStories = await parseSpec(actualSpecPath);
    const tasksPath = path.join(incrementPath, 'tasks.md');
    const tasks = await parseTasks(tasksPath);

    // Create mappings
    const mappings = createTaskToUserStoryMapping(tasks, userStories);

    return {
      specId: specId || 'unknown',
      specPath: actualSpecPath,
      incrementId: path.basename(incrementPath),
      incrementPath,
      userStories,
      tasks,
      mappings,
    };
  } catch (error: any) {
    console.error(`Failed to get spec-task mapping: ${error.message}`);
    return null;
  }
}

/**
 * Get completed user stories from mappings
 */
export function getCompletedUserStories(
  mapping: SpecTaskMapping
): UserStory[] {
  const completedUSIds = new Set<string>();

  // Find user stories where ALL tasks are complete
  for (const us of mapping.userStories) {
    const relatedTasks = mapping.tasks.filter(t =>
      t.userStories.includes(us.id)
    );

    if (relatedTasks.length > 0 && relatedTasks.every(t => t.completed)) {
      completedUSIds.add(us.id);
    }
  }

  return mapping.userStories.filter(us => completedUSIds.has(us.id));
}

/**
 * Get recently completed tasks (completed since last sync)
 */
export function getRecentlyCompletedTasks(
  mapping: SpecTaskMapping,
  lastSyncDate?: Date
): Task[] {
  // If no last sync date, return all completed tasks
  if (!lastSyncDate) {
    return mapping.tasks.filter(t => t.completed);
  }

  // For now, return all completed tasks
  // In the future, we could track completion timestamps in metadata
  return mapping.tasks.filter(t => t.completed);
}

/**
 * Find spec path for an increment
 */
export async function findSpecForIncrement(
  incrementPath: string
): Promise<string | null> {
  const mapping = await getSpecTaskMapping(incrementPath);
  return mapping?.specPath || null;
}
