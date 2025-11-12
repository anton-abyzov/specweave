import { GitHubClient } from "./github-client";
import { TaskParser } from "./task-parser";
class SubtaskSync {
  constructor(incrementPath, repo) {
    this.incrementPath = incrementPath;
    this.client = new GitHubClient(repo);
  }
  /**
   * Update subtask status in GitHub issue
   */
  async updateSubtaskStatus(taskId, subtaskId, completed) {
    const tasks = TaskParser.parseTasksFile(this.incrementPath);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    if (!task.githubIssue) {
      console.warn(`Task ${taskId} not synced to GitHub. Skipping subtask sync.`);
      return;
    }
    const issue = await this.client.getIssue(task.githubIssue);
    const updatedBody = this.updateSubtaskCheckbox(
      issue.body,
      subtaskId,
      completed
    );
    await this.client.updateIssueBody(task.githubIssue, updatedBody);
    const allDone = this.areAllSubtasksDone(updatedBody);
    if (allDone) {
      await this.client.addComment(
        task.githubIssue,
        "\u2705 All subtasks completed!"
      );
    }
    console.log(`\u2705 Updated subtask ${subtaskId} in GitHub issue #${task.githubIssue}`);
  }
  /**
   * Sync all subtasks for a task
   */
  async syncAllSubtasks(taskId) {
    const tasks = TaskParser.parseTasksFile(this.incrementPath);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.githubIssue || !task.subtasks) {
      return;
    }
    const issue = await this.client.getIssue(task.githubIssue);
    let updatedBody = issue.body;
    for (const subtask of task.subtasks) {
      updatedBody = this.updateSubtaskCheckbox(
        updatedBody,
        subtask.id,
        subtask.completed
      );
    }
    await this.client.updateIssueBody(task.githubIssue, updatedBody);
    console.log(`\u2705 Synced all subtasks for ${taskId} to GitHub issue #${task.githubIssue}`);
  }
  /**
   * Update checkbox in issue body
   */
  updateSubtaskCheckbox(body, subtaskId, completed) {
    const checkbox = completed ? "[x]" : "[ ]";
    const idPattern = new RegExp(`^(- \\[[ x]\\]\\s+${this.escapeRegex(subtaskId)}:.+)$`, "m");
    if (idPattern.test(body)) {
      return body.replace(idPattern, (match) => {
        return match.replace(/\[[ x]\]/, checkbox);
      });
    }
    return body;
  }
  /**
   * Check if all subtasks are done
   */
  areAllSubtasksDone(body) {
    const subtaskLines = body.match(/^- \[[ x]\] S-\d+-\d+:.+$/gm);
    if (!subtaskLines || subtaskLines.length === 0) {
      return false;
    }
    return subtaskLines.every((line) => line.includes("[x]"));
  }
  /**
   * Escape special regex characters
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  /**
   * Post task completion comment to GitHub issue
   */
  async postTaskCompletionComment(taskId, stats) {
    const tasks = TaskParser.parseTasksFile(this.incrementPath);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.githubIssue) {
      return;
    }
    const {
      filesModified = 0,
      linesAdded = 0,
      linesDeleted = 0,
      testsAdded = 0,
      actualDuration = "Unknown",
      estimatedDuration = task.estimate,
      summary = "No summary provided",
      nextTask = "None",
      progress
    } = stats;
    const comment = `\u2705 **Task Completed**

**Files Modified**: ${filesModified} files (+${linesAdded}/-${linesDeleted} lines)
**Tests**: ${testsAdded > 0 ? `All passing (${testsAdded} new tests)` : "All passing"}
**Duration**: ${actualDuration} (estimated: ${estimatedDuration})

**What Changed**:
${summary}

**Next Task**: ${nextTask}

---
${progress ? `Progress: ${progress.completed}/${progress.total} tasks (${Math.round(progress.completed / progress.total * 100)}%)` : ""}
\u{1F916} Posted by SpecWeave`;
    await this.client.addComment(task.githubIssue, comment);
    console.log(`\u2705 Posted completion comment to issue #${task.githubIssue}`);
  }
  /**
   * Update epic issue progress
   */
  async updateEpicProgress(epicIssueNumber, completed, total) {
    const epic = await this.client.getIssue(epicIssueNumber);
    const tasks = TaskParser.parseTasksFile(this.incrementPath);
    let updatedBody = epic.body;
    for (const task of tasks) {
      if (task.status === "completed") {
        const taskPattern = new RegExp(`^(- \\[[ x]\\] \\[${this.escapeRegex(task.id)}\\].+)$`, "m");
        if (taskPattern.test(updatedBody)) {
          updatedBody = updatedBody.replace(taskPattern, (match) => {
            return match.replace(/\[[ x]\]/, "[x]");
          });
        }
      }
    }
    await this.client.updateIssueBody(epicIssueNumber, updatedBody);
    const progressComment = `\u{1F4CA} **Progress Update**

${completed}/${total} tasks completed (${Math.round(completed / total * 100)}%)

---
\u{1F916} Updated by SpecWeave`;
    await this.client.addComment(epicIssueNumber, progressComment);
    console.log(`\u2705 Updated epic issue #${epicIssueNumber} progress`);
  }
}
export {
  SubtaskSync
};
