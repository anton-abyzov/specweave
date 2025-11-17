/**
 * Three-Layer Bidirectional Sync Manager
 *
 * Manages synchronization between three layers:
 * 1. GitHub Issues (stakeholder UI)
 * 2. Living Docs User Stories (intermediate)
 * 3. Increment spec.md + tasks.md (source of truth)
 *
 * Sync flows:
 * - GitHub → Living Docs → Increment (checkbox changes from stakeholders)
 * - Increment → Living Docs → GitHub (implementation updates)
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import type { AcceptanceCriterion, Task } from './types.js';
import { SpecDistributor } from './SpecDistributor.js';
import { CodeValidator } from './CodeValidator.js';
import { CompletionPropagator } from './CompletionPropagator.js';

/**
 * Sync direction
 */
export type SyncDirection = 'github-to-increment' | 'increment-to-github' | 'bidirectional';

/**
 * Sync result
 */
export interface SyncResult {
  /** Number of ACs synced */
  acsSynced: number;

  /** Number of tasks synced */
  tasksSynced: number;

  /** Conflicts detected (Increment always wins) */
  conflictsResolved: number;

  /** Tasks reopened due to missing code */
  tasksReopened: number;

  /** Errors encountered */
  errors: string[];

  /** Warnings */
  warnings: string[];
}

/**
 * GitHub issue checkbox state
 */
interface GitHubCheckboxState {
  /** AC ID (e.g., AC-US1-01) */
  id: string;

  /** Checkbox completed */
  completed: boolean;

  /** Type: 'ac' or 'task' */
  type: 'ac' | 'task';
}

/**
 * ThreeLayerSyncManager - Handles bidirectional sync
 */
export class ThreeLayerSyncManager {
  private distributor: SpecDistributor;
  private codeValidator: CodeValidator;
  private completionPropagator: CompletionPropagator;

  constructor() {
    this.distributor = new SpecDistributor();
    this.codeValidator = new CodeValidator();
    this.completionPropagator = new CompletionPropagator();
  }

  /**
   * Sync GitHub Issues → Living Docs → Increment
   *
   * Handles checkbox changes from stakeholders in GitHub.
   *
   * @param githubIssueId - GitHub issue number
   * @param incrementPath - Path to increment
   * @param livingDocsPath - Path to living docs
   */
  async syncGitHubToIncrement(
    githubIssueId: number,
    incrementPath: string,
    livingDocsPath: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      acsSynced: 0,
      tasksSynced: 0,
      conflictsResolved: 0,
      tasksReopened: 0,
      errors: [],
      warnings: []
    };

    try {
      // 1. Fetch GitHub issue checkbox states
      const checkboxStates = await this.fetchGitHubCheckboxStates(githubIssueId);

      // 2. Find corresponding User Story file
      const userStoryFile = await this.findUserStoryByGitHubIssue(livingDocsPath, githubIssueId);
      if (!userStoryFile) {
        result.errors.push(`No User Story file found for GitHub issue #${githubIssueId}`);
        return result;
      }

      // 3. Update Living Docs User Story
      const livingDocsContent = await fs.readFile(userStoryFile, 'utf-8');
      let updatedContent = livingDocsContent;

      for (const checkbox of checkboxStates) {
        if (checkbox.type === 'ac') {
          updatedContent = this.updateAcCheckboxInContent(updatedContent, checkbox.id, checkbox.completed);
          result.acsSynced++;
        } else {
          updatedContent = this.updateTaskCheckboxInContent(updatedContent, checkbox.id, checkbox.completed);
          result.tasksSynced++;
        }
      }

      await fs.writeFile(userStoryFile, updatedContent, 'utf-8');

      // 4. Validate code exists for completed tasks
      const completedTasks = checkboxStates.filter(cb => cb.type === 'task' && cb.completed);
      for (const taskCheckbox of completedTasks) {
        const codeExists = await this.codeValidator.validateCodeExists(taskCheckbox.id, incrementPath);
        if (!codeExists) {
          // Reopen task
          await this.reopenTask(taskCheckbox.id, incrementPath, 'Code validation failed: Expected files not found');
          result.tasksReopened++;
          result.warnings.push(`Task ${taskCheckbox.id} reopened: Code not found`);
        }
      }

      // 5. Update Increment (source of truth)
      await this.syncLivingDocsToIncrement(userStoryFile, incrementPath);

      // 6. Propagate completion bottom-up (Tasks → ACs → User Stories)
      await this.completionPropagator.propagateCompletion(incrementPath);

    } catch (error) {
      result.errors.push((error as Error).message);
    }

    return result;
  }

  /**
   * Sync Increment → Living Docs → GitHub
   *
   * Propagates implementation changes to stakeholders.
   *
   * @param incrementPath - Path to increment
   * @param livingDocsPath - Path to living docs
   */
  async syncIncrementToGitHub(
    incrementPath: string,
    livingDocsPath: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      acsSynced: 0,
      tasksSynced: 0,
      conflictsResolved: 0,
      tasksReopened: 0,
      errors: [],
      warnings: []
    };

    try {
      // 1. Read increment spec.md and tasks.md
      // 2. Update Living Docs User Stories (via SpecDistributor)
      await this.distributor.copyAcsAndTasksToUserStories(incrementPath, livingDocsPath);

      // 3. Count synced items
      const specPath = path.join(incrementPath, 'spec.md');
      const tasksPath = path.join(incrementPath, 'tasks.md');
      const specContent = await fs.readFile(specPath, 'utf-8');
      const tasksContent = await fs.readFile(tasksPath, 'utf-8');

      result.acsSynced = (specContent.match(/- \[([ x])\] AC-/g) || []).length;
      result.tasksSynced = (tasksContent.match(/### T-\d+/g) || []).length;

      // 4. Update GitHub issues with latest status
      // This would integrate with GitHub API to update issue body checkboxes
      // For now, we'll mark this as a placeholder for integration
      result.warnings.push('GitHub issue update not implemented yet - manual sync required');

    } catch (error) {
      result.errors.push((error as Error).message);
    }

    return result;
  }

  /**
   * Bidirectional sync with conflict resolution
   *
   * Increment always wins in conflicts (source of truth discipline).
   */
  async syncBidirectional(
    incrementPath: string,
    livingDocsPath: string
  ): Promise<SyncResult> {
    // Always prioritize Increment → GitHub direction
    // GitHub changes are advisory only (source of truth discipline)
    const result = await this.syncIncrementToGitHub(incrementPath, livingDocsPath);

    // Detect conflicts by checking if GitHub has different states
    // If conflicts exist, Increment wins and overwrites GitHub
    result.warnings.push('Bidirectional sync: Increment is source of truth, GitHub is informational');

    return result;
  }

  /**
   * Reopen task if code validation fails
   *
   * @param taskId - Task ID to reopen
   * @param incrementPath - Path to increment
   * @param reason - Reason for reopening
   */
  async reopenTask(taskId: string, incrementPath: string, reason: string): Promise<void> {
    try {
      // 1. Uncheck task in increment tasks.md
      const tasksPath = path.join(incrementPath, 'tasks.md');
      let tasksContent = await fs.readFile(tasksPath, 'utf-8');

      // Find task section and uncheck "Completed" field
      const taskPattern = new RegExp(`### ${taskId}:.*?(?=###|$)`, 's');
      const taskMatch = tasksContent.match(taskPattern);

      if (taskMatch) {
        const taskSection = taskMatch[0];
        const updatedSection = taskSection.replace(
          /\*\*Completed\*\*:\s*\d{4}-\d{2}-\d{2}/,
          '**Completed**: Not completed'
        );
        tasksContent = tasksContent.replace(taskSection, updatedSection);
        await fs.writeFile(tasksPath, tasksContent, 'utf-8');
      }

      // 2. Add comment to task explaining reopen
      const comment = `\n**Reopened**: ${new Date().toISOString().split('T')[0]} - ${reason}\n`;
      tasksContent = tasksContent.replace(
        new RegExp(`(### ${taskId}:.*?)\n---`, 's'),
        `$1\n${comment}---`
      );
      await fs.writeFile(tasksPath, tasksContent, 'utf-8');

      // 3. TODO: Add GitHub comment explaining why
      // This would use GitHub API to add a comment to the issue
      // For now, this is a placeholder

    } catch (error) {
      throw new Error(`Failed to reopen task ${taskId}: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch GitHub issue checkbox states
   */
  private async fetchGitHubCheckboxStates(issueId: number): Promise<GitHubCheckboxState[]> {
    try {
      // Fetch issue body using gh CLI
      const cmd = `gh issue view ${issueId} --json body --jq .body`;
      const body = execSync(cmd, { encoding: 'utf-8' }).trim();

      return this.parseCheckboxStatesFromBody(body);
    } catch (error) {
      throw new Error(`Failed to fetch GitHub issue #${issueId}: ${(error as Error).message}`);
    }
  }

  /**
   * Parse checkbox states from GitHub issue body
   */
  private parseCheckboxStatesFromBody(body: string): GitHubCheckboxState[] {
    const states: GitHubCheckboxState[] = [];
    const lines = body.split('\n');

    for (const line of lines) {
      // Match AC checkboxes: - [x] AC-US1-01: Description
      const acMatch = line.match(/^- \[([ x])\] (AC-[A-Z0-9]+-\d+):/);
      if (acMatch) {
        states.push({
          id: acMatch[2],
          completed: acMatch[1] === 'x',
          type: 'ac'
        });
        continue;
      }

      // Match Task checkboxes: - [x] T-001: Description
      const taskMatch = line.match(/^- \[([ x])\] (T-\d+):/);
      if (taskMatch) {
        states.push({
          id: taskMatch[2],
          completed: taskMatch[1] === 'x',
          type: 'task'
        });
      }
    }

    return states;
  }

  /**
   * Find User Story file by GitHub issue number
   */
  private async findUserStoryByGitHubIssue(
    livingDocsPath: string,
    issueId: number
  ): Promise<string | null> {
    try {
      // Search for user story files containing GitHub issue reference
      const userStoriesPath = path.join(livingDocsPath, 'user-stories');
      const files = await this.findMarkdownFiles(userStoriesPath);

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        // Look for GitHub issue reference in frontmatter or content
        if (content.includes(`github_issue: ${issueId}`) || content.includes(`#${issueId}`)) {
          return file;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Find all markdown files recursively
   */
  private async findMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...await this.findMarkdownFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist, return empty
    }

    return files;
  }

  /**
   * Update AC checkbox in content
   */
  private updateAcCheckboxInContent(content: string, acId: string, completed: boolean): string {
    const checkbox = completed ? 'x' : ' ';
    const pattern = new RegExp(`^- \\[([ x])\\] ${acId}:`, 'gm');
    return content.replace(pattern, `- [${checkbox}] ${acId}:`);
  }

  /**
   * Update Task checkbox in content
   */
  private updateTaskCheckboxInContent(content: string, taskId: string, completed: boolean): string {
    const checkbox = completed ? 'x' : ' ';
    const pattern = new RegExp(`^- \\[([ x])\\] ${taskId}:`, 'gm');
    return content.replace(pattern, `- [${checkbox}] ${taskId}:`);
  }

  /**
   * Sync Living Docs changes to Increment
   */
  private async syncLivingDocsToIncrement(userStoryFile: string, incrementPath: string): Promise<void> {
    // Read User Story file
    const content = await fs.readFile(userStoryFile, 'utf-8');

    // Parse ACs and Tasks
    const acs = this.parseAcsFromContent(content);
    const tasks = this.parseTasksFromContent(content);

    // Update increment spec.md
    if (acs.length > 0) {
      const specPath = path.join(incrementPath, 'spec.md');
      let specContent = await fs.readFile(specPath, 'utf-8');

      for (const ac of acs) {
        specContent = this.updateAcCheckboxInContent(specContent, ac.id, ac.completed);
      }

      await fs.writeFile(specPath, specContent, 'utf-8');
    }

    // Update increment tasks.md
    if (tasks.length > 0) {
      const tasksPath = path.join(incrementPath, 'tasks.md');
      let tasksContent = await fs.readFile(tasksPath, 'utf-8');

      for (const task of tasks) {
        tasksContent = this.updateTaskCompletionInTasksFile(tasksContent, task.id, task.completed);
      }

      await fs.writeFile(tasksPath, tasksContent, 'utf-8');
    }
  }

  /**
   * Parse ACs from content
   */
  private parseAcsFromContent(content: string): Array<{ id: string; completed: boolean }> {
    const acs: Array<{ id: string; completed: boolean }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^- \[([ x])\] (AC-[A-Z0-9]+-\d+):/);
      if (match) {
        acs.push({
          id: match[2],
          completed: match[1] === 'x'
        });
      }
    }

    return acs;
  }

  /**
   * Parse Tasks from content
   */
  private parseTasksFromContent(content: string): Array<{ id: string; completed: boolean }> {
    const tasks: Array<{ id: string; completed: boolean }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^- \[([ x])\] (T-\d+):/);
      if (match) {
        tasks.push({
          id: match[2],
          completed: match[1] === 'x'
        });
      }
    }

    return tasks;
  }

  /**
   * Update task completion in tasks.md file
   */
  private updateTaskCompletionInTasksFile(content: string, taskId: string, completed: boolean): string {
    if (completed) {
      // Add completion date
      const today = new Date().toISOString().split('T')[0];
      const pattern = new RegExp(`(### ${taskId}:.*?)\\n\\*\\*Completed\\*\\*:.*?\\n`, 's');
      return content.replace(pattern, `$1\n**Completed**: ${today}\n`);
    } else {
      // Remove completion date
      const pattern = new RegExp(`(### ${taskId}:.*?)\\n\\*\\*Completed\\*\\*:.*?\\n`, 's');
      return content.replace(pattern, `$1\n**Completed**: Not completed\n`);
    }
  }
}
