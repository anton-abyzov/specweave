class IssueStateManager {
  /**
   * Determine issue state based on progress
   *
   * @param progress - Progress information
   * @param currentState - Current issue state
   * @returns State change result
   */
  static determineState(progress, currentState) {
    const result = {
      previousState: currentState,
      newState: currentState,
      changed: false,
      labelsAdded: [],
      labelsRemoved: []
    };
    if (progress.isComplete) {
      result.newState = "closed";
      result.labelsRemoved.push("in-progress");
    } else if (progress.overallPercentage > 0) {
      result.newState = "open";
      result.labelsAdded.push("in-progress");
    } else {
      result.newState = "open";
      result.labelsRemoved.push("in-progress");
    }
    result.changed = result.newState !== result.previousState;
    return result;
  }
  /**
   * Calculate progress from acceptance criteria and tasks
   *
   * @param acs - Acceptance criteria
   * @param tasks - Tasks
   * @returns Progress information
   */
  static calculateProgress(acs, tasks) {
    const totalAcs = acs.length;
    const completedAcs = acs.filter((ac) => ac.completed).length;
    const acPercentage = totalAcs > 0 ? Math.round(completedAcs / totalAcs * 100) : 0;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const taskPercentage = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0;
    const overallPercentage = totalTasks > 0 ? Math.round((acPercentage + taskPercentage) / 2) : acPercentage;
    const isComplete = totalAcs > 0 && completedAcs === totalAcs && (totalTasks === 0 || completedTasks === totalTasks);
    return {
      totalAcs,
      completedAcs,
      acPercentage,
      totalTasks,
      completedTasks,
      taskPercentage,
      overallPercentage,
      isComplete
    };
  }
  /**
   * Format progress as markdown
   *
   * @param progress - Progress information
   * @returns Markdown string
   */
  static formatProgressMarkdown(progress) {
    const sections = [];
    sections.push("## Progress");
    sections.push("");
    sections.push(`**Acceptance Criteria**: ${progress.completedAcs}/${progress.totalAcs} (${progress.acPercentage}%)`);
    if (progress.totalTasks > 0) {
      sections.push(`**Tasks**: ${progress.completedTasks}/${progress.totalTasks} (${progress.taskPercentage}%)`);
    }
    sections.push(`**Overall**: ${progress.overallPercentage}%`);
    const progressBar = this.generateProgressBar(progress.overallPercentage);
    sections.push("");
    sections.push(progressBar);
    return sections.join("\n");
  }
  /**
   * Generate ASCII progress bar
   *
   * @param percentage - Completion percentage (0-100)
   * @returns Progress bar string
   */
  static generateProgressBar(percentage) {
    const total = 20;
    const filled = Math.round(percentage / 100 * total);
    const empty = total - filled;
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
    return `\`${bar}\` ${percentage}%`;
  }
  /**
   * Build GitHub CLI command to update issue state
   *
   * @param issueNumber - GitHub issue number
   * @param state - New state
   * @param labelsToAdd - Labels to add
   * @param labelsToRemove - Labels to remove
   * @returns gh CLI command
   */
  static buildGitHubCommand(issueNumber, state, labelsToAdd, labelsToRemove) {
    const commands = [];
    if (state === "closed") {
      commands.push(`gh issue close ${issueNumber}`);
    } else {
      commands.push(`gh issue reopen ${issueNumber}`);
    }
    if (labelsToAdd.length > 0) {
      commands.push(`gh issue edit ${issueNumber} --add-label "${labelsToAdd.join(",")}"`);
    }
    if (labelsToRemove.length > 0) {
      commands.push(`gh issue edit ${issueNumber} --remove-label "${labelsToRemove.join(",")}"`);
    }
    return commands.join(" && ");
  }
}
export {
  IssueStateManager
};
