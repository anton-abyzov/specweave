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
  const userStoryRegex = /\*\*US-(\d+)(E?)\*\*:\s*(.+)/g;

  return [...content.matchAll(userStoryRegex)].map(match => {
    const usNumber = match[1];
    const usESuffix = match[2];
    const usId = `US-${usNumber}${usESuffix}`;

    return {
      id: usId,
      title: match[3].trim(),
      acceptanceCriteria: parseAcceptanceCriteriaFromContent(content, usNumber, usESuffix)
    };
  });
}

/**
 * Parse acceptance criteria for a user story from content
 */
function parseAcceptanceCriteriaFromContent(
  content: string,
  usNumber: string,
  usESuffix: string
): AcceptanceCriterion[] {
  const acRegex = new RegExp(
    `- \\[([ x])\\] \\*\\*AC-US${usNumber}${usESuffix}-(\\d+)\\*\\*:\\s*([^(]+)(?:\\(([^)]+)\\))?`,
    'g'
  );

  return [...content.matchAll(acRegex)].map(acMatch => {
    const metadata = acMatch[4] || '';
    let priority: string | undefined;
    if (metadata.includes('P1')) priority = 'P1';
    else if (metadata.includes('P2')) priority = 'P2';

    return {
      id: `AC-US${usNumber}${usESuffix}-${acMatch[2]}`,
      description: acMatch[3].trim(),
      priority,
      testable: metadata.includes('testable'),
      completed: acMatch[1] === 'x'
    };
  });
}

/**
 * Parse tasks.md to extract tasks with AC-IDs
 */
export async function parseTasks(tasksPath: string): Promise<Task[]> {
  const content = await fs.readFile(tasksPath, 'utf-8');
  const taskRegex = /##\s+T-(\d+):\s*(.+)/g;

  return [...content.matchAll(taskRegex)].map(match => {
    const taskNumber = match[1];
    const taskId = `T-${taskNumber}`;
    const acIds = extractACIds(content, taskId);
    const userStories = deriveUserStoriesFromACIds(acIds);
    const completed = new RegExp(`\\[(x)\\]\\s+T-${taskNumber}\\b`, 'i').test(content);

    return { id: taskId, title: match[2].trim(), acIds, userStories, completed };
  });
}

/**
 * Extract AC-IDs from a task section
 */
function extractACIds(content: string, taskId: string): string[] {
  const taskSection = extractTaskSection(content, taskId);
  const acLine = taskSection.match(/\*\*AC\*\*:\s*(.+)/);
  if (!acLine) return [];

  return [...acLine[1].matchAll(/AC-US\d+-\d+/g)].map(m => m[0]);
}

/**
 * Derive user story IDs from AC-IDs
 */
function deriveUserStoriesFromACIds(acIds: string[]): string[] {
  return [...new Set(
    acIds
      .map(acId => acId.match(/AC-US(\d+)-/)?.[1])
      .filter((n): n is string => n !== undefined)
      .map(n => `US-${n}`)
  )];
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
  _userStories: UserStory[]
): TaskToUserStoryMapping[] {
  return tasks.map(task => ({
    taskId: task.id,
    userStoryIds: task.userStories,
    acIds: task.acIds,
    completed: task.completed
  }));
}

/**
 * Get full mapping for an increment
 */
export async function getSpecTaskMapping(
  incrementPath: string,
  specPath?: string
): Promise<SpecTaskMapping | null> {
  try {
    const incrementSpecPath = path.join(incrementPath, 'spec.md');
    const incrementSpec = await fs.readFile(incrementSpecPath, 'utf-8');

    const specIdMatch = incrementSpec.match(/\*\*Implements\*\*:\s*SPEC-(\d+)-/);
    const specId = specIdMatch ? `spec-${specIdMatch[1]}` : null;

    if (!specId && !specPath) {
      return null;
    }

    const actualSpecPath = specPath || await findSpecPath(incrementPath, specId);
    if (!actualSpecPath) {
      return null;
    }

    const userStories = await parseSpec(actualSpecPath);
    const tasksPath = path.join(incrementPath, 'tasks.md');
    const tasks = await parseTasks(tasksPath);

    return {
      specId: specId || 'unknown',
      specPath: actualSpecPath,
      incrementId: path.basename(incrementPath),
      incrementPath,
      userStories,
      tasks,
      mappings: createTaskToUserStoryMapping(tasks, userStories)
    };
  } catch (error: any) {
    console.error(`Failed to get spec-task mapping: ${error.message}`);
    return null;
  }
}

/**
 * Find spec path in living docs structure
 */
async function findSpecPath(incrementPath: string, specId: string | null): Promise<string | null> {
  if (!specId) return null;

  const projectRoot = incrementPath.split('.specweave')[0];
  const glob = await import('glob');
  const specPattern = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs', '*', `${specId}-*.md`);
  const matches = glob.sync(specPattern);

  return matches.length > 0 ? matches[0] : null;
}

/**
 * Get completed user stories from mappings (all related tasks complete)
 */
export function getCompletedUserStories(mapping: SpecTaskMapping): UserStory[] {
  return mapping.userStories.filter(us => {
    const relatedTasks = mapping.tasks.filter(t => t.userStories.includes(us.id));
    return relatedTasks.length > 0 && relatedTasks.every(t => t.completed);
  });
}

/**
 * Get recently completed tasks (completed since last sync)
 * Note: Currently returns all completed tasks; timestamp tracking could be added in the future
 */
export function getRecentlyCompletedTasks(
  mapping: SpecTaskMapping,
  _lastSyncDate?: Date
): Task[] {
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
