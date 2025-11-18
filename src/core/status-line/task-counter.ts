/**
 * Task Counter Utility
 *
 * Accurately counts tasks in tasks.md by parsing task headings
 * and checking for completion markers within each task's section.
 *
 * Fixes overcounting bug where multiple completion markers in same task
 * were counted separately.
 *
 * Algorithm:
 * 1. Split content by ## T- or ### T- headings (task markers)
 * 2. For each task section, check if it contains ANY completion marker
 * 3. Count task ONCE regardless of how many markers it has
 *
 * Supported completion markers:
 * - [x] at line start (legacy checkbox format)
 * - **Status**: [x] inline (legacy status format)
 * - **Completed**: <date> (current format)
 */

export interface TaskCount {
  total: number;
  completed: number;
  percentage: number;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  section: string;
}

export class TaskCounter {
  /**
   * Count tasks in tasks.md content
   *
   * @param content - Raw tasks.md file content
   * @returns Task counts with total, completed, and percentage
   */
  static countTasks(content: string): TaskCount {
    const tasks = this.parseTasks(content);

    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const percentage = total > 0 ? Math.floor((completed / total) * 100) : 0;

    return { total, completed, percentage };
  }

  /**
   * Parse tasks from tasks.md content
   *
   * Splits content into task sections and determines completion status
   * for each task based on presence of completion markers.
   *
   * @param content - Raw tasks.md file content
   * @returns Array of parsed tasks
   */
  static parseTasks(content: string): Task[] {
    const tasks: Task[] = [];

    // Split by task headings (## T- or ### T-)
    // Use regex to match heading pattern
    const taskHeadingRegex = /^##+ (T-\d+[^:\n]*):?\s*(.*)$/gm;

    let match: RegExpExecArray | null;
    const sections: Array<{
      id: string;
      title: string;
      start: number;
      end?: number;
    }> = [];

    // Find all task headings and their positions
    while ((match = taskHeadingRegex.exec(content)) !== null) {
      const id = match[1].trim();
      const title = match[2].trim();
      const start = match.index;

      // Close previous section
      if (sections.length > 0) {
        sections[sections.length - 1].end = start;
      }

      sections.push({ id, title, start });
    }

    // Close last section
    if (sections.length > 0) {
      sections[sections.length - 1].end = content.length;
    }

    // Parse each section
    for (const section of sections) {
      const sectionContent = content.substring(
        section.start,
        section.end ?? content.length
      );

      const completed = this.isTaskCompleted(sectionContent);

      tasks.push({
        id: section.id,
        title: section.title,
        completed,
        section: sectionContent,
      });
    }

    return tasks;
  }

  /**
   * Check if task section contains ANY completion marker
   *
   * Checks for:
   * - [x] at line start (legacy)
   * - **Status**: [x] inline (legacy)
   * - **Completed**: <date> (current)
   *
   * @param sectionContent - Content of task section
   * @returns true if task is completed
   */
  static isTaskCompleted(sectionContent: string): boolean {
    const completionPatterns = [
      /^\[x\]/m, // [x] at line start
      /\*\*Status\*\*:\s*\[x\]/i, // **Status**: [x]
      /\*\*Completed\*\*:\s*\S/i, // **Completed**: <something>
    ];

    return completionPatterns.some((pattern) => pattern.test(sectionContent));
  }

  /**
   * Get detailed task breakdown (for debugging)
   *
   * @param content - Raw tasks.md file content
   * @returns Array of tasks with details
   */
  static getTaskDetails(content: string): Task[] {
    return this.parseTasks(content);
  }
}
