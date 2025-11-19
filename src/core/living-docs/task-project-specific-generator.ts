/**
 * Task Project-Specific Generator
 *
 * Generates project-specific tasks for user stories from increment tasks.md
 *
 * Key Concepts:
 * - Increment tasks.md contains ALL tasks for ALL projects
 * - Each user story should show ONLY relevant tasks for its project
 * - Tasks are filtered by:
 *   1. User Story ID (via AC-IDs)
 *   2. Project keywords (optional, for multi-project features)
 * - Completion status is preserved from source tasks
 *
 * Example:
 *   Increment tasks.md:
 *     T-001: Setup API endpoint (AC: AC-US1-01) [x]
 *     T-002: Create React component (AC: AC-US1-01) [ ]
 *     T-003: Add DB migration (AC: AC-US1-02) [x]
 *
 *   Backend US-001 tasks:
 *     - [x] T-001: Setup API endpoint
 *     - [x] T-003: Add DB migration
 *
 *   Frontend US-001 tasks:
 *     - [ ] T-002: Create React component
 */

import fs from 'fs-extra';
import path from 'path';

export interface ProjectSpecificTask {
  id: string;           // T-001
  title: string;        // Setup API endpoint
  completed: boolean;   // Read from increment tasks.md
  acIds: string[];      // [AC-US1-01, AC-US1-02]
  userStoryIds?: string[]; // [US-001, US-002] - Direct User Story mapping (NEW)
  project?: string;     // backend, frontend, etc. (for filtering)
  sourceIncrement?: string; // 0031-external-tool-sync
}

export interface TaskReference {
  id: string;           // T-001
  title: string;        // Setup API endpoint
  anchor: string;       // #t-001-setup-api-endpoint
  path: string;         // ../../../../../increments/0031/tasks.md#...
  acIds: string[];      // [AC-US1-01, AC-US1-02]
}

export interface ProjectContext {
  id: string;           // backend, frontend, mobile
  name: string;         // Backend, Frontend, Mobile
  type: 'backend' | 'frontend' | 'mobile' | 'infrastructure' | 'generic';
  techStack: string[];  // ['Node.js', 'PostgreSQL']
  keywords: string[];   // ['api', 'database', 'backend']
}

export class TaskProjectSpecificGenerator {
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * Generate project-specific tasks for a user story
   *
   * Filters increment tasks by:
   * 1. User Story ID (via AC-IDs)
   * 2. Project keywords (optional)
   * 3. Preserves completion status
   */
  async generateProjectSpecificTasks(
    incrementId: string,
    userStoryId: string,
    projectContext?: ProjectContext
  ): Promise<ProjectSpecificTask[]> {
    // 1. Load all tasks from increment tasks.md
    const allTasks = await this.loadIncrementTasks(incrementId);

    // 2. Filter tasks by User Story (via AC-IDs)
    const userStoryTasks = this.filterTasksByUserStory(allTasks, userStoryId);

    // 3. Optionally filter by project keywords
    const projectTasks = projectContext
      ? this.filterTasksByProject(userStoryTasks, projectContext)
      : userStoryTasks;

    return projectTasks;
  }

  /**
   * Load all tasks from increment tasks.md with completion status
   */
  private async loadIncrementTasks(incrementId: string): Promise<ProjectSpecificTask[]> {
    const tasksPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'tasks.md'
    );

    if (!fs.existsSync(tasksPath)) {
      console.warn(`   ⚠️  tasks.md not found for ${incrementId}`);
      return [];
    }

    const content = await fs.readFile(tasksPath, 'utf-8');
    const tasks: ProjectSpecificTask[] = [];

    // Split content into task blocks
    // Pattern: ## T-001: or ### T-001: Task Title followed by task metadata
    const taskBlocks = content.split(/^#{2,3}\s+(T-\d+):/gm);

    for (let i = 1; i < taskBlocks.length; i += 2) {
      const taskId = taskBlocks[i].trim();           // T-001
      const taskContent = taskBlocks[i + 1] || '';   // Task metadata block

      // Extract task title (first line after task ID)
      const titleMatch = taskContent.match(/^\s*(.+?)$/m);
      const taskTitle = titleMatch ? titleMatch[1].trim() : '';

      // Extract User Story IDs (NEW - use **User Story**: field directly)
      const userStoryMatch = taskContent.match(/\*\*User Story\*\*:\s*(.+?)$/m);
      const userStoryList = userStoryMatch ? userStoryMatch[1].trim() : '';
      const userStoryIds = userStoryList ? userStoryList.split(',').map(id => id.trim()) : [];

      // Extract Acceptance Criteria IDs (for backward compatibility)
      // Matches both "**AC**:" and "**Acceptance Criteria**:"
      const acMatch = taskContent.match(/\*\*(AC|Acceptance Criteria)\*\*:\s*(.+?)$/m);
      const acList = acMatch ? acMatch[2].trim() : '';
      const acIds: string[] = [];
      const acPattern = /AC-[A-Z]+\d+-\d+/g;
      let acIdMatch;
      while ((acIdMatch = acPattern.exec(acList)) !== null) {
        acIds.push(acIdMatch[0]);
      }

      // Extract completion status
      // Handles both: **Status**: [x] completed AND **Status**: [ ] pending
      const statusMatch = taskContent.match(/\*\*Status\*\*:\s*\[([x ])\]/);
      const statusChar = statusMatch ? statusMatch[1] : ' ';

      const task: ProjectSpecificTask = {
        id: taskId,
        title: taskTitle,
        completed: statusChar === 'x',
        acIds,
        sourceIncrement: incrementId,
      };

      // Only include userStoryIds if non-empty
      if (userStoryIds.length > 0) {
        task.userStoryIds = userStoryIds;
      }

      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Filter tasks by User Story
   *
   * Uses direct User Story IDs from **User Story**: field (NEW approach).
   * Falls back to AC-ID extraction for backward compatibility.
   *
   * Example:
   *   User Story: US-001
   *   Task **User Story**: US-001, US-003
   *   Match: Direct match
   */
  private filterTasksByUserStory(
    tasks: ProjectSpecificTask[],
    userStoryId: string
  ): ProjectSpecificTask[] {
    return tasks.filter((task) => {
      // NEW: Direct User Story ID matching (preferred)
      if (task.userStoryIds && task.userStoryIds.length > 0) {
        return task.userStoryIds.includes(userStoryId);
      }

      // FALLBACK: Extract US number from AC-IDs (backward compatibility)
      const usMatch = userStoryId.match(/US-(\d+)/);
      if (!usMatch) {
        return false;
      }

      const usNumber = parseInt(usMatch[1], 10); // 1

      return task.acIds.some((acId) => {
        // Extract US number from AC-ID (AC-US1-01 → "1")
        const acMatch = acId.match(/AC-US(\d+)-\d+/);
        if (!acMatch) return false;

        const acUsNumber = parseInt(acMatch[1], 10);
        return acUsNumber === usNumber;
      });
    });
  }

  /**
   * Filter tasks by project keywords (optional, for multi-project features)
   *
   * Uses keyword matching to determine if a task belongs to a project.
   * Example:
   *   Project: backend
   *   Keywords: ['api', 'database', 'backend']
   *   Task: "Setup API endpoint"
   *   Match: "api" found in title
   */
  private filterTasksByProject(
    tasks: ProjectSpecificTask[],
    projectContext: ProjectContext
  ): ProjectSpecificTask[] {
    // If no keywords, return all tasks (no project filtering)
    if (!projectContext.keywords || projectContext.keywords.length === 0) {
      return tasks;
    }

    // Filter tasks by keyword matching
    return tasks.filter((task) => {
      const taskText = task.title.toLowerCase();

      // Check if any project keyword appears in task title
      const hasKeyword = projectContext.keywords.some((keyword) =>
        taskText.includes(keyword.toLowerCase())
      );

      return hasKeyword;
    }).map((task) => ({
      ...task,
      project: projectContext.id, // Tag task with project ID
    }));
  }

  /**
   * Convert TaskReference to ProjectSpecificTask (with completion status)
   *
   * This is a helper method for migrating existing code that uses TaskReference.
   * It reads the increment tasks.md to extract completion status.
   */
  async enrichTaskReferencesWithStatus(
    taskReferences: TaskReference[],
    incrementId: string
  ): Promise<ProjectSpecificTask[]> {
    const allTasks = await this.loadIncrementTasks(incrementId);

    return taskReferences.map((taskRef) => {
      const fullTask = allTasks.find((t) => t.id === taskRef.id);

      return {
        id: taskRef.id,
        title: taskRef.title,
        completed: fullTask?.completed || false,
        acIds: taskRef.acIds,
        sourceIncrement: incrementId,
      };
    });
  }

  /**
   * Format tasks as markdown checkboxes for user story files
   */
  formatTasksAsMarkdown(tasks: ProjectSpecificTask[]): string {
    if (tasks.length === 0) {
      return '_No tasks defined for this user story_';
    }

    const lines = tasks.map((task) => {
      const checkbox = task.completed ? '[x]' : '[ ]';
      return `- ${checkbox} **${task.id}**: ${task.title}`;
    });

    return lines.join('\n');
  }

  /**
   * Extract task checkboxes from user story markdown
   *
   * Used for bidirectional sync (reading task state from user story file)
   */
  parseTasksFromMarkdown(content: string): ProjectSpecificTask[] {
    const tasks: ProjectSpecificTask[] = [];

    // Look for ## Tasks section
    const tasksMatch = content.match(/##\s+Tasks\s*\n+([\s\S]*?)(?=\n##|---+|$)/i);

    if (!tasksMatch) {
      return tasks;
    }

    const tasksSection = tasksMatch[1];

    // Pattern: - [x] **T-001**: Task title
    const taskPattern = /^[-*]\s+\[([x ])\]\s+\*\*(T-\d+)\*\*:\s+(.+)$/gm;

    let match;
    while ((match = taskPattern.exec(tasksSection)) !== null) {
      const completed = match[1] === 'x';
      const taskId = match[2];
      const taskTitle = match[3].trim();

      tasks.push({
        id: taskId,
        title: taskTitle,
        completed,
        acIds: [], // Not extracted from user story (would need to read increment tasks.md)
      });
    }

    return tasks;
  }

  /**
   * Update task checkboxes in user story markdown
   *
   * Used for bidirectional sync (updating user story file with new task state)
   */
  updateTaskCheckboxes(
    content: string,
    taskUpdates: Map<string, boolean> // taskId → completed
  ): string {
    let updatedContent = content;

    for (const [taskId, completed] of taskUpdates.entries()) {
      const checkbox = completed ? '[x]' : '[ ]';

      // Pattern: - [x] **T-001**: Title or - [ ] **T-001**: Title
      const pattern = new RegExp(
        `^(\\s*[-*]\\s*)\\[[x ]\\](\\s*\\*\\*${taskId}\\*\\*:.*)$`,
        'gm'
      );

      updatedContent = updatedContent.replace(pattern, `$1${checkbox}$2`);
    }

    return updatedContent;
  }
}
