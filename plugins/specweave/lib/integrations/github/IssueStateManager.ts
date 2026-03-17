/**
 * Issue State Manager - Auto-update GitHub issue state based on progress
 *
 * Rules:
 * - 0% complete → State = open
 * - 1-99% complete → State = open, label = in-progress
 * - 100% complete → State = closed
 */

/**
 * Issue state
 */
export type IssueState = 'open' | 'closed';

/**
 * State change result
 */
export interface StateChangeResult {
  /** Previous state */
  previousState: IssueState;

  /** New state */
  newState: IssueState;

  /** State changed */
  changed: boolean;

  /** Labels added */
  labelsAdded: string[];

  /** Labels removed */
  labelsRemoved: string[];
}

/**
 * Progress info
 */
export interface ProgressInfo {
  /** Total ACs */
  totalAcs: number;

  /** Completed ACs */
  completedAcs: number;

  /** AC completion percentage */
  acPercentage: number;

  /** Total tasks */
  totalTasks: number;

  /** Completed tasks */
  completedTasks: number;

  /** Task completion percentage */
  taskPercentage: number;

  /** Overall completion percentage */
  overallPercentage: number;

  /** Is 100% complete */
  isComplete: boolean;
}

/**
 * IssueStateManager - Manages GitHub issue state
 */
export class IssueStateManager {
  /**
   * Determine issue state based on progress
   *
   * @param progress - Progress information
   * @param currentState - Current issue state
   * @returns State change result
   */
  static determineState(
    progress: ProgressInfo,
    currentState: IssueState
  ): StateChangeResult {
    const result: StateChangeResult = {
      previousState: currentState,
      newState: currentState,
      changed: false,
      labelsAdded: [],
      labelsRemoved: []
    };

    // Determine new state based on progress
    if (progress.isComplete) {
      // 100% complete → Close issue
      result.newState = 'closed';
      result.labelsRemoved.push('in-progress');
    } else if (progress.overallPercentage > 0) {
      // 1-99% complete → Open with in-progress label
      result.newState = 'open';
      result.labelsAdded.push('in-progress');
    } else {
      // 0% complete → Open without in-progress label
      result.newState = 'open';
      result.labelsRemoved.push('in-progress');
    }

    // Check if state changed
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
  static calculateProgress(
    acs: Array<{ completed: boolean }>,
    tasks: Array<{ completed: boolean }>
  ): ProgressInfo {
    const totalAcs = acs.length;
    const completedAcs = acs.filter(ac => ac.completed).length;
    const acPercentage = totalAcs > 0 ? Math.round((completedAcs / totalAcs) * 100) : 0;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Overall percentage: average of AC and Task percentages
    // If no tasks, use AC percentage only
    const overallPercentage = totalTasks > 0
      ? Math.round((acPercentage + taskPercentage) / 2)
      : acPercentage;

    const isComplete = totalAcs > 0 && completedAcs === totalAcs &&
      (totalTasks === 0 || completedTasks === totalTasks);

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
  static formatProgressMarkdown(progress: ProgressInfo): string {
    const sections: string[] = [];

    sections.push('## Progress');
    sections.push('');

    // AC progress
    sections.push(`**Acceptance Criteria**: ${progress.completedAcs}/${progress.totalAcs} (${progress.acPercentage}%)`);

    // Task progress
    if (progress.totalTasks > 0) {
      sections.push(`**Tasks**: ${progress.completedTasks}/${progress.totalTasks} (${progress.taskPercentage}%)`);
    }

    // Overall progress
    sections.push(`**Overall**: ${progress.overallPercentage}%`);

    // Progress bar
    const progressBar = this.generateProgressBar(progress.overallPercentage);
    sections.push('');
    sections.push(progressBar);

    return sections.join('\n');
  }

  /**
   * Generate ASCII progress bar
   *
   * @param percentage - Completion percentage (0-100)
   * @returns Progress bar string
   */
  private static generateProgressBar(percentage: number): string {
    const total = 20;
    const filled = Math.round((percentage / 100) * total);
    const empty = total - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);

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
  static buildGitHubCommand(
    issueNumber: number,
    state: IssueState,
    labelsToAdd: string[],
    labelsToRemove: string[]
  ): string {
    const commands: string[] = [];

    // Update state
    if (state === 'closed') {
      commands.push(`gh issue close ${issueNumber}`);
    } else {
      commands.push(`gh issue reopen ${issueNumber}`);
    }

    // Add labels
    if (labelsToAdd.length > 0) {
      commands.push(`gh issue edit ${issueNumber} --add-label "${labelsToAdd.join(',')}"`);
    }

    // Remove labels
    if (labelsToRemove.length > 0) {
      commands.push(`gh issue edit ${issueNumber} --remove-label "${labelsToRemove.join(',')}"`);
    }

    return commands.join(' && ');
  }
}
