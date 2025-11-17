/**
 * Three-Layer Bidirectional Sync Manager
 *
 * Handles synchronization across three layers:
 * - Layer 1: GitHub Issue (stakeholder UI)
 * - Layer 2: Living Docs User Story files (intermediate representation)
 * - Layer 3: Increment spec.md + tasks.md (source of truth)
 *
 * Supports two sync flows:
 * 1. GitHub → Living Docs → Increment (stakeholder checks checkbox)
 * 2. Increment → Living Docs → GitHub (developer completes work)
 *
 * Features:
 * - Code validation (reopen tasks if code doesn't exist)
 * - Completion propagation (Tasks → ACs → User Stories)
 * - Conflict resolution (Increment always wins)
 *
 * @module ThreeLayerSyncManager
 */

import fs from 'fs-extra';
import path from 'path';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

/**
 * Acceptance Criterion with completion state
 */
export interface AcceptanceCriterion {
  id: string; // e.g., "AC-US1-01"
  userStoryId: string; // e.g., "US1"
  description: string;
  completed: boolean;
  projects: string[]; // ["backend", "frontend", "mobile"]
  rawLine: string; // Original markdown line
}

/**
 * Task with completion state and AC references
 */
export interface Task {
  id: string; // e.g., "T-001"
  title: string;
  completed: boolean;
  completedDate?: string;
  acIds: string[]; // e.g., ["AC-US1-01", "AC-US1-02"]
  filePaths?: string[]; // For code validation
}

/**
 * Change detected during sync
 */
export interface SyncChange {
  type: 'ac' | 'task';
  id: string;
  completed: boolean;
  layer: 'github' | 'living-docs' | 'increment';
  userStoryPath?: string;
  incrementPath?: string;
}

/**
 * Sync result
 */
export interface SyncResult {
  acsUpdated: number;
  tasksUpdated: number;
  tasksReopened: number;
  conflicts: string[];
  errors: string[];
}

export class ThreeLayerSyncManager {
  /**
   * Sync from GitHub to Increment (Flow 1: GitHub → Living Docs → Increment)
   *
   * Triggered when stakeholder checks AC/Task checkbox in GitHub issue.
   */
  async syncGitHubToIncrement(
    issueNumber: number,
    incrementPath: string,
    livingDocsPath: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      acsUpdated: 0,
      tasksUpdated: 0,
      tasksReopened: 0,
      conflicts: [],
      errors: []
    };

    try {
      console.log(`🔄 Syncing GitHub issue #${issueNumber} → Increment`);

      // 1. Fetch GitHub issue state
      const githubState = await this.fetchGitHubIssueState(issueNumber);

      // 2. Extract AC and Task completion state from issue body
      const githubAcs = this.extractAcsFromIssue(githubState.body);
      const githubTasks = this.extractTasksFromIssue(githubState.body);

      // 3. Update Living Docs User Stories (Layer 2)
      for (const ac of githubAcs) {
        const userStoryPath = await this.findUserStoryFile(livingDocsPath, ac.userStoryId);
        if (userStoryPath) {
          await this.updateUserStoryAc(userStoryPath, ac.id, ac.completed);
          result.acsUpdated++;
        }
      }

      for (const task of githubTasks) {
        // Find User Story that contains this task
        const userStoryPath = await this.findUserStoryFileForTask(livingDocsPath, task.id);
        if (userStoryPath) {
          await this.updateUserStoryTask(userStoryPath, task.id, task.completed);
          result.tasksUpdated++;
        }
      }

      // 4. Update Increment (Layer 3 - source of truth)
      await this.updateIncrementAcs(incrementPath, githubAcs);
      await this.updateIncrementTasks(incrementPath, githubTasks);

      // 5. Code validation: If task marked complete, check if code exists
      for (const task of githubTasks) {
        if (task.completed) {
          const codeExists = await this.validateCodeExists(task);
          if (!codeExists) {
            console.log(`⚠️  Task ${task.id} marked complete but code missing - reopening`);
            await this.reopenTask(task.id, incrementPath, livingDocsPath, issueNumber);
            result.tasksReopened++;
          }
        }
      }

      console.log(`✅ Sync complete: ${result.acsUpdated} ACs, ${result.tasksUpdated} tasks updated`);
      if (result.tasksReopened > 0) {
        console.log(`   ${result.tasksReopened} tasks reopened due to missing code`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMsg);
      console.error(`❌ Error syncing GitHub → Increment:`, error);
    }

    return result;
  }

  /**
   * Sync from Increment to GitHub (Flow 2: Increment → Living Docs → GitHub)
   *
   * Triggered when developer completes work and updates increment files.
   */
  async syncIncrementToGitHub(
    incrementPath: string,
    livingDocsPath: string,
    issueNumber: number
  ): Promise<SyncResult> {
    const result: SyncResult = {
      acsUpdated: 0,
      tasksUpdated: 0,
      tasksReopened: 0,
      conflicts: [],
      errors: []
    };

    try {
      console.log(`🔄 Syncing Increment → GitHub issue #${issueNumber}`);

      // 1. Read increment spec.md and tasks.md
      const specPath = path.join(incrementPath, 'spec.md');
      const tasksPath = path.join(incrementPath, 'tasks.md');

      const specContent = await fs.readFile(specPath, 'utf-8');
      const tasksContent = await fs.readFile(tasksPath, 'utf-8');

      // 2. Parse ACs and Tasks
      const acs = this.parseAcceptanceCriteria(specContent);
      const tasks = this.parseTasks(tasksContent);

      // 3. Update Living Docs User Stories (Layer 2)
      const acsByUserStory = this.groupAcsByUserStory(acs);

      for (const [userStoryId, userStoryAcs] of Object.entries(acsByUserStory)) {
        const userStoryPath = await this.findUserStoryFile(livingDocsPath, userStoryId);
        if (userStoryPath) {
          // Update ACs in User Story
          await this.updateUserStoryAcs(userStoryPath, userStoryAcs);
          result.acsUpdated += userStoryAcs.length;

          // Update Tasks in User Story (filter by AC IDs)
          const acIds = userStoryAcs.map(ac => ac.id);
          const userStoryTasks = this.filterTasksByAcIds(tasks, acIds);
          await this.updateUserStoryTasks(userStoryPath, userStoryTasks);
          result.tasksUpdated += userStoryTasks.length;
        }
      }

      // 4. Update GitHub issue (Layer 1)
      await this.updateGitHubIssue(issueNumber, acs, tasks);

      console.log(`✅ Sync complete: ${result.acsUpdated} ACs, ${result.tasksUpdated} tasks updated`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMsg);
      console.error(`❌ Error syncing Increment → GitHub:`, error);
    }

    return result;
  }

  /**
   * Validate that code exists for completed task
   */
  private async validateCodeExists(task: Task): Promise<boolean> {
    if (!task.filePaths || task.filePaths.length === 0) {
      // No file paths specified - assume validation passes
      return true;
    }

    for (const filePath of task.filePaths) {
      // Check if file exists
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        return false;
      }

      // Check if file has meaningful content (not just empty or whitespace)
      const content = await fs.readFile(filePath, 'utf-8');
      if (content.trim().length < 10) {
        return false;
      }
    }

    return true;
  }

  /**
   * Reopen task if code validation fails
   */
  private async reopenTask(
    taskId: string,
    incrementPath: string,
    livingDocsPath: string,
    issueNumber: number
  ): Promise<void> {
    // 1. Reopen in increment tasks.md
    const tasksPath = path.join(incrementPath, 'tasks.md');
    let tasksContent = await fs.readFile(tasksPath, 'utf-8');

    // Find task and mark as incomplete
    const taskRegex = new RegExp(`(### ${taskId}:[^#]*?)\\*\\*Completed\\*\\*:[^\\n]*\\n`, 's');
    tasksContent = tasksContent.replace(taskRegex, '$1');

    await fs.writeFile(tasksPath, tasksContent, 'utf-8');

    // 2. Propagate to Living Docs
    const userStoryPath = await this.findUserStoryFileForTask(livingDocsPath, taskId);
    if (userStoryPath) {
      await this.updateUserStoryTask(userStoryPath, taskId, false);
    }

    // 3. Propagate to GitHub (add comment explaining why)
    await this.addGitHubComment(
      issueNumber,
      `⚠️ Task ${taskId} reopened: Code validation failed (missing or empty file). Please implement the required code.`
    );
  }

  /**
   * Propagate completion from Tasks → ACs → User Stories (bottom-up)
   */
  async propagateCompletion(
    incrementPath: string,
    livingDocsPath: string
  ): Promise<void> {
    // 1. Read increment files
    const specPath = path.join(incrementPath, 'spec.md');
    const tasksPath = path.join(incrementPath, 'tasks.md');

    const specContent = await fs.readFile(specPath, 'utf-8');
    const tasksContent = await fs.readFile(tasksPath, 'utf-8');

    const acs = this.parseAcceptanceCriteria(specContent);
    const tasks = this.parseTasks(tasksContent);

    // 2. For each AC, check if all its tasks are complete
    for (const ac of acs) {
      const acTasks = tasks.filter(t => t.acIds.includes(ac.id));
      const allTasksComplete = acTasks.length > 0 && acTasks.every(t => t.completed);

      if (allTasksComplete && !ac.completed) {
        // Mark AC as complete
        console.log(`✅ All tasks for ${ac.id} complete - marking AC as complete`);
        await this.updateIncrementAc(incrementPath, ac.id, true);

        // Propagate to Living Docs
        const userStoryPath = await this.findUserStoryFile(livingDocsPath, ac.userStoryId);
        if (userStoryPath) {
          await this.updateUserStoryAc(userStoryPath, ac.id, true);
        }
      }
    }

    // 3. For each User Story, check if all ACs are complete
    const acsByUserStory = this.groupAcsByUserStory(acs);

    for (const [userStoryId, userStoryAcs] of Object.entries(acsByUserStory)) {
      const allAcsComplete = userStoryAcs.every(ac => ac.completed);

      if (allAcsComplete) {
        console.log(`✅ All ACs for ${userStoryId} complete - User Story complete`);
        // Could trigger User Story completion workflow here
      }
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Fetch GitHub issue state
   */
  private async fetchGitHubIssueState(issueNumber: number): Promise<{ body: string; state: string }> {
    const result = await execFileNoThrow('gh', [
      'issue',
      'view',
      String(issueNumber),
      '--json',
      'body,state'
    ]);

    if (result.stderr) {
      throw new Error(`Failed to fetch GitHub issue: ${result.stderr}`);
    }

    return JSON.parse(result.stdout);
  }

  /**
   * Extract ACs from GitHub issue body
   */
  private extractAcsFromIssue(body: string): AcceptanceCriterion[] {
    const acs: AcceptanceCriterion[] = [];
    const lines = body.split('\n');

    // Match lines like: - [x] AC-US1-01: Description
    const acRegex = /^- \[([ x])\] (AC-[A-Z0-9]+-\d+):\s*(.+)$/;

    for (const line of lines) {
      const match = line.match(acRegex);
      if (match) {
        const completed = match[1] === 'x';
        const id = match[2];
        const description = match[3];

        const userStoryMatch = id.match(/AC-([A-Z0-9]+)-\d+/);
        const userStoryId = userStoryMatch ? userStoryMatch[1] : '';

        acs.push({
          id,
          userStoryId,
          description,
          completed,
          projects: [],
          rawLine: line
        });
      }
    }

    return acs;
  }

  /**
   * Extract Tasks from GitHub issue body
   */
  private extractTasksFromIssue(body: string): Task[] {
    const tasks: Task[] = [];
    const lines = body.split('\n');

    // Match lines like: - [x] T-001: Description
    const taskRegex = /^- \[([ x])\] (T-\d+):\s*(.+)$/;

    for (const line of lines) {
      const match = line.match(taskRegex);
      if (match) {
        const completed = match[1] === 'x';
        const id = match[2];
        const title = match[3];

        tasks.push({
          id,
          title,
          completed,
          acIds: []
        });
      }
    }

    return tasks;
  }

  /**
   * Parse ACs from spec.md
   */
  private parseAcceptanceCriteria(specContent: string): AcceptanceCriterion[] {
    const acs: AcceptanceCriterion[] = [];
    const lines = specContent.split('\n');

    const acRegex = /^- \[([ x])\] (AC-[A-Z0-9]+-\d+):\s*(.+)$/;

    for (const line of lines) {
      const match = line.match(acRegex);
      if (match) {
        const completed = match[1] === 'x';
        const id = match[2];
        const description = match[3];

        const userStoryMatch = id.match(/AC-([A-Z0-9]+)-\d+/);
        const userStoryId = userStoryMatch ? userStoryMatch[1] : '';

        acs.push({
          id,
          userStoryId,
          description,
          completed,
          projects: [],
          rawLine: line
        });
      }
    }

    return acs;
  }

  /**
   * Parse Tasks from tasks.md
   */
  private parseTasks(tasksContent: string): Task[] {
    const tasks: Task[] = [];
    const lines = tasksContent.split('\n');

    let currentTask: Partial<Task> | null = null;

    for (const line of lines) {
      // Match task header: ### T-001: Title (P1)
      const headerMatch = line.match(/^### (T-\d+):\s*(.+?)\s*\(P\d+\)$/);
      if (headerMatch) {
        if (currentTask && currentTask.id) {
          tasks.push(currentTask as Task);
        }

        currentTask = {
          id: headerMatch[1],
          title: headerMatch[2],
          completed: false,
          acIds: []
        };
        continue;
      }

      // Check for completion
      const completedMatch = line.match(/^\*\*Completed\*\*:\s*(.+)$/);
      if (completedMatch && currentTask) {
        currentTask.completed = true;
        currentTask.completedDate = completedMatch[1];
      }

      // Extract AC IDs
      const acMatch = line.match(/\*\*AC\*\*:\s*(.+)$/);
      if (acMatch && currentTask) {
        const acIds = acMatch[1].split(',').map(id => id.trim());
        currentTask.acIds = acIds;
      }
    }

    if (currentTask && currentTask.id) {
      tasks.push(currentTask as Task);
    }

    return tasks;
  }

  /**
   * Group ACs by User Story ID
   */
  private groupAcsByUserStory(acs: AcceptanceCriterion[]): Record<string, AcceptanceCriterion[]> {
    const grouped: Record<string, AcceptanceCriterion[]> = {};

    for (const ac of acs) {
      if (!grouped[ac.userStoryId]) {
        grouped[ac.userStoryId] = [];
      }
      grouped[ac.userStoryId].push(ac);
    }

    return grouped;
  }

  /**
   * Filter tasks by AC IDs
   */
  private filterTasksByAcIds(tasks: Task[], acIds: string[]): Task[] {
    return tasks.filter(task =>
      task.acIds.some(acId => acIds.includes(acId))
    );
  }

  /**
   * Find User Story file by ID
   */
  private async findUserStoryFile(livingDocsPath: string, userStoryId: string): Promise<string | null> {
    // Search in specs directory
    const specsPath = path.join(livingDocsPath, 'internal', 'specs');

    // Use glob to find user story files
    const pattern = `**/us-*${userStoryId.toLowerCase()}*.md`;
    const { glob } = await import('glob');
    const files = await glob(pattern, { cwd: specsPath, absolute: true });

    return files.length > 0 ? files[0] : null;
  }

  /**
   * Find User Story file that contains specific task
   */
  private async findUserStoryFileForTask(livingDocsPath: string, taskId: string): Promise<string | null> {
    // Search all user story files for the task
    const specsPath = path.join(livingDocsPath, 'internal', 'specs');
    const { glob } = await import('glob');
    const files = await glob('**/us-*.md', { cwd: specsPath, absolute: true });

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes(taskId)) {
        return file;
      }
    }

    return null;
  }

  /**
   * Update AC in User Story file
   */
  private async updateUserStoryAc(userStoryPath: string, acId: string, completed: boolean): Promise<void> {
    let content = await fs.readFile(userStoryPath, 'utf-8');

    // Update checkbox state
    const checkboxState = completed ? 'x' : ' ';
    const regex = new RegExp(`(- \\[)[ x](\\] ${acId}:)`, 'g');
    content = content.replace(regex, `$1${checkboxState}$2`);

    await fs.writeFile(userStoryPath, content, 'utf-8');
  }

  /**
   * Update Task in User Story file
   */
  private async updateUserStoryTask(userStoryPath: string, taskId: string, completed: boolean): Promise<void> {
    let content = await fs.readFile(userStoryPath, 'utf-8');

    // Update checkbox state
    const checkboxState = completed ? 'x' : ' ';
    const regex = new RegExp(`(- \\[)[ x](\\] ${taskId}:)`, 'g');
    content = content.replace(regex, `$1${checkboxState}$2`);

    await fs.writeFile(userStoryPath, content, 'utf-8');
  }

  /**
   * Update multiple ACs in User Story file
   */
  private async updateUserStoryAcs(userStoryPath: string, acs: AcceptanceCriterion[]): Promise<void> {
    let content = await fs.readFile(userStoryPath, 'utf-8');

    for (const ac of acs) {
      const checkboxState = ac.completed ? 'x' : ' ';
      const regex = new RegExp(`(- \\[)[ x](\\] ${ac.id}:)`, 'g');
      content = content.replace(regex, `$1${checkboxState}$2`);
    }

    await fs.writeFile(userStoryPath, content, 'utf-8');
  }

  /**
   * Update multiple Tasks in User Story file
   */
  private async updateUserStoryTasks(userStoryPath: string, tasks: Task[]): Promise<void> {
    let content = await fs.readFile(userStoryPath, 'utf-8');

    for (const task of tasks) {
      const checkboxState = task.completed ? 'x' : ' ';
      const regex = new RegExp(`(- \\[)[ x](\\] ${task.id}:)`, 'g');
      content = content.replace(regex, `$1${checkboxState}$2`);
    }

    await fs.writeFile(userStoryPath, content, 'utf-8');
  }

  /**
   * Update AC in increment spec.md
   */
  private async updateIncrementAc(incrementPath: string, acId: string, completed: boolean): Promise<void> {
    const specPath = path.join(incrementPath, 'spec.md');
    let content = await fs.readFile(specPath, 'utf-8');

    const checkboxState = completed ? 'x' : ' ';
    const regex = new RegExp(`(- \\[)[ x](\\] ${acId}:)`, 'g');
    content = content.replace(regex, `$1${checkboxState}$2`);

    await fs.writeFile(specPath, content, 'utf-8');
  }

  /**
   * Update multiple ACs in increment spec.md
   */
  private async updateIncrementAcs(incrementPath: string, acs: AcceptanceCriterion[]): Promise<void> {
    const specPath = path.join(incrementPath, 'spec.md');
    let content = await fs.readFile(specPath, 'utf-8');

    for (const ac of acs) {
      const checkboxState = ac.completed ? 'x' : ' ';
      const regex = new RegExp(`(- \\[)[ x](\\] ${ac.id}:)`, 'g');
      content = content.replace(regex, `$1${checkboxState}$2`);
    }

    await fs.writeFile(specPath, content, 'utf-8');
  }

  /**
   * Update multiple Tasks in increment tasks.md
   */
  private async updateIncrementTasks(incrementPath: string, tasks: Task[]): Promise<void> {
    const tasksPath = path.join(incrementPath, 'tasks.md');
    let content = await fs.readFile(tasksPath, 'utf-8');

    for (const task of tasks) {
      if (task.completed) {
        // Add **Completed** marker if not present
        const taskHeader = `### ${task.id}:`;
        const completedMarker = `**Completed**: ${new Date().toISOString().split('T')[0]}`;

        if (!content.includes(`${taskHeader}`) || !content.includes(`**Completed**`)) {
          // Find task section and add completed marker
          const regex = new RegExp(`(### ${task.id}:[^#]*?)(###|$)`, 's');
          content = content.replace(regex, `$1\n${completedMarker}\n\n$2`);
        }
      }
    }

    await fs.writeFile(tasksPath, content, 'utf-8');
  }

  /**
   * Update GitHub issue with ACs and Tasks
   */
  private async updateGitHubIssue(issueNumber: number, acs: AcceptanceCriterion[], tasks: Task[]): Promise<void> {
    // Fetch current issue
    const result = await execFileNoThrow('gh', [
      'issue',
      'view',
      String(issueNumber),
      '--json',
      'body'
    ]);

    const { body } = JSON.parse(result.stdout);

    // Update AC checkboxes
    let updatedBody = body;
    for (const ac of acs) {
      const checkboxState = ac.completed ? 'x' : ' ';
      const regex = new RegExp(`(- \\[)[ x](\\] ${ac.id}:)`, 'g');
      updatedBody = updatedBody.replace(regex, `$1${checkboxState}$2`);
    }

    // Update Task checkboxes
    for (const task of tasks) {
      const checkboxState = task.completed ? 'x' : ' ';
      const regex = new RegExp(`(- \\[)[ x](\\] ${task.id}:)`, 'g');
      updatedBody = updatedBody.replace(regex, `$1${checkboxState}$2`);
    }

    // Update issue via gh CLI
    await execFileNoThrow('gh', [
      'issue',
      'edit',
      String(issueNumber),
      '--body',
      updatedBody
    ]);
  }

  /**
   * Add comment to GitHub issue
   */
  private async addGitHubComment(issueNumber: number, comment: string): Promise<void> {
    await execFileNoThrow('gh', [
      'issue',
      'comment',
      String(issueNumber),
      '--body',
      comment
    ]);
  }
}
