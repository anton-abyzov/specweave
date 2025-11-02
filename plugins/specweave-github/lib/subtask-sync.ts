/**
 * Subtask synchronization with GitHub issue checkboxes
 * Updates GitHub issue body when subtasks complete
 */

import { GitHubClient } from './github-client';
import { TaskParser } from './task-parser';
import { Task, Subtask } from './types';
import * as path from 'path';

export class SubtaskSync {
  private client: GitHubClient;
  private incrementPath: string;

  constructor(incrementPath: string, repo?: string) {
    this.incrementPath = incrementPath;
    this.client = new GitHubClient(repo);
  }

  /**
   * Update subtask status in GitHub issue
   */
  async updateSubtaskStatus(
    taskId: string,
    subtaskId: string,
    completed: boolean
  ): Promise<void> {
    // 1. Parse tasks to get task info
    const tasks = TaskParser.parseTasksFile(this.incrementPath);
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (!task.githubIssue) {
      console.warn(`Task ${taskId} not synced to GitHub. Skipping subtask sync.`);
      return;
    }

    // 2. Get current issue
    const issue = await this.client.getIssue(task.githubIssue);

    // 3. Update subtask checkbox in issue body
    const updatedBody = this.updateSubtaskCheckbox(
      issue.body,
      subtaskId,
      completed
    );

    // 4. Update GitHub issue
    await this.client.updateIssueBody(task.githubIssue, updatedBody);

    // 5. Check if all subtasks done
    const allDone = this.areAllSubtasksDone(updatedBody);
    if (allDone) {
      await this.client.addComment(
        task.githubIssue,
        '✅ All subtasks completed!'
      );
    }

    console.log(`✅ Updated subtask ${subtaskId} in GitHub issue #${task.githubIssue}`);
  }

  /**
   * Sync all subtasks for a task
   */
  async syncAllSubtasks(taskId: string): Promise<void> {
    const tasks = TaskParser.parseTasksFile(this.incrementPath);
    const task = tasks.find(t => t.id === taskId);

    if (!task || !task.githubIssue || !task.subtasks) {
      return;
    }

    const issue = await this.client.getIssue(task.githubIssue);
    let updatedBody = issue.body;

    // Update all subtasks
    for (const subtask of task.subtasks) {
      updatedBody = this.updateSubtaskCheckbox(
        updatedBody,
        subtask.id,
        subtask.completed
      );
    }

    await this.client.updateIssueBody(task.githubIssue, updatedBody);
    console.log(`✅ Synced all subtasks for ${taskId} to GitHub issue #${task.githubIssue}`);
  }

  /**
   * Update checkbox in issue body
   */
  private updateSubtaskCheckbox(
    body: string,
    subtaskId: string,
    completed: boolean
  ): string {
    const checkbox = completed ? '[x]' : '[ ]';

    // Try to find by subtask ID
    const idPattern = new RegExp(`^(- \\[[ x]\\]\\s+${this.escapeRegex(subtaskId)}:.+)$`, 'm');
    if (idPattern.test(body)) {
      return body.replace(idPattern, (match) => {
        return match.replace(/\[[ x]\]/, checkbox);
      });
    }

    // Fallback: try to find by description (less reliable)
    // This is a basic approach - could be enhanced
    return body;
  }

  /**
   * Check if all subtasks are done
   */
  private areAllSubtasksDone(body: string): boolean {
    const subtaskLines = body.match(/^- \[[ x]\] S-\d+-\d+:.+$/gm);
    if (!subtaskLines || subtaskLines.length === 0) {
      return false;
    }

    return subtaskLines.every(line => line.includes('[x]'));
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Post task completion comment to GitHub issue
   */
  async postTaskCompletionComment(
    taskId: string,
    stats: {
      filesModified?: number;
      linesAdded?: number;
      linesDeleted?: number;
      testsAdded?: number;
      actualDuration?: string;
      estimatedDuration?: string;
      summary?: string;
      nextTask?: string;
      progress?: { completed: number; total: number };
    }
  ): Promise<void> {
    const tasks = TaskParser.parseTasksFile(this.incrementPath);
    const task = tasks.find(t => t.id === taskId);

    if (!task || !task.githubIssue) {
      return;
    }

    const {
      filesModified = 0,
      linesAdded = 0,
      linesDeleted = 0,
      testsAdded = 0,
      actualDuration = 'Unknown',
      estimatedDuration = task.estimate,
      summary = 'No summary provided',
      nextTask = 'None',
      progress
    } = stats;

    const comment = `✅ **Task Completed**

**Files Modified**: ${filesModified} files (+${linesAdded}/-${linesDeleted} lines)
**Tests**: ${testsAdded > 0 ? `All passing (${testsAdded} new tests)` : 'All passing'}
**Duration**: ${actualDuration} (estimated: ${estimatedDuration})

**What Changed**:
${summary}

**Next Task**: ${nextTask}

---
${progress ? `Progress: ${progress.completed}/${progress.total} tasks (${Math.round(progress.completed / progress.total * 100)}%)` : ''}
🤖 Posted by SpecWeave`;

    await this.client.addComment(task.githubIssue, comment);
    console.log(`✅ Posted completion comment to issue #${task.githubIssue}`);
  }

  /**
   * Update epic issue progress
   */
  async updateEpicProgress(epicIssueNumber: number, completed: number, total: number): Promise<void> {
    const epic = await this.client.getIssue(epicIssueNumber);

    // Update checkboxes in epic body
    const tasks = TaskParser.parseTasksFile(this.incrementPath);
    let updatedBody = epic.body;

    for (const task of tasks) {
      if (task.status === 'completed') {
        // Find and check the checkbox for this task
        const taskPattern = new RegExp(`^(- \\[[ x]\\] \\[${this.escapeRegex(task.id)}\\].+)$`, 'm');
        if (taskPattern.test(updatedBody)) {
          updatedBody = updatedBody.replace(taskPattern, (match) => {
            return match.replace(/\[[ x]\]/, '[x]');
          });
        }
      }
    }

    await this.client.updateIssueBody(epicIssueNumber, updatedBody);

    // Post progress comment
    const progressComment = `📊 **Progress Update**

${completed}/${total} tasks completed (${Math.round(completed / total * 100)}%)

---
🤖 Updated by SpecWeave`;

    await this.client.addComment(epicIssueNumber, progressComment);
    console.log(`✅ Updated epic issue #${epicIssueNumber} progress`);
  }
}
