/**
 * SpecDistributor - Copy-Based Sync Implementation
 *
 * Distributes (copies) ACs and Tasks from increment spec.md/tasks.md
 * to User Story files in living docs.
 *
 * This is the core of the copy-based sync paradigm where:
 * - Increment files = source of truth
 * - Living docs = copy for stakeholder visibility
 */

import fs from 'fs/promises';
import path from 'path';
import type { AcceptanceCriterion, Task, UserStory, ProjectType } from './types.js';
import { detectProject, matchesProject } from './ProjectDetector.js';

/**
 * SpecDistributor - Handles copying ACs and Tasks to User Story files
 */
export class SpecDistributor {
  /**
   * Copy ACs and Tasks from increment to User Story files
   *
   * @param incrementPath - Path to increment folder (e.g., .specweave/increments/0037-feature)
   * @param livingDocsPath - Path to living docs folder (e.g., .specweave/docs/public/user-stories)
   */
  async copyAcsAndTasksToUserStories(
    incrementPath: string,
    livingDocsPath: string
  ): Promise<void> {
    // 1. Read increment spec.md and tasks.md
    const specPath = path.join(incrementPath, 'spec.md');
    const tasksPath = path.join(incrementPath, 'tasks.md');

    const specContent = await fs.readFile(specPath, 'utf-8');
    const tasksContent = await fs.readFile(tasksPath, 'utf-8');

    // 2. Parse ACs and Tasks
    const acs = this.parseAcceptanceCriteria(specContent);
    const tasks = this.parseTasks(tasksContent);

    // 3. Group ACs by User Story ID
    const acsByUserStory = this.groupAcsByUserStory(acs);

    // 4. For each User Story, update its file
    for (const [userStoryId, userStoryAcs] of Object.entries(acsByUserStory)) {
      // Detect projects from ACs
      const projects = this.detectProjectsFromAcs(userStoryAcs);

      // Filter ACs by project (if multiple projects exist)
      const filteredAcs = userStoryAcs; // For now, include all ACs

      // Filter Tasks by AC-IDs
      const acIds = filteredAcs.map(ac => ac.id);
      const filteredTasks = this.filterTasksByAcIds(tasks, acIds);

      // Update User Story file
      const userStoryPath = await this.findUserStoryFile(livingDocsPath, userStoryId);
      if (userStoryPath) {
        await this.updateUserStoryFile(userStoryPath, filteredAcs, filteredTasks);
      }
    }
  }

  /**
   * Parse acceptance criteria from spec.md
   */
  private parseAcceptanceCriteria(specContent: string): AcceptanceCriterion[] {
    const acs: AcceptanceCriterion[] = [];
    const lines = specContent.split('\n');

    // Match lines like: - [ ] AC-US1-01: Description
    const acRegex = /^- \[([ x])\] (AC-[A-Z0-9]+-\d+):\s*(.+)$/;

    for (const line of lines) {
      const match = line.match(acRegex);
      if (match) {
        const completed = match[1] === 'x';
        const id = match[2];
        const description = match[3];

        // Extract User Story ID from AC ID (e.g., AC-US1-01 -> US1)
        const userStoryMatch = id.match(/AC-([A-Z0-9]+)-\d+/);
        const userStoryId = userStoryMatch ? userStoryMatch[1] : '';

        // Detect projects from description
        const projectResult = detectProject(description);

        acs.push({
          id,
          userStoryId,
          description,
          completed,
          projects: projectResult.projects,
          rawLine: line
        });
      }
    }

    return acs;
  }

  /**
   * Parse tasks from tasks.md
   */
  private parseTasks(tasksContent: string): Task[] {
    const tasks: Task[] = [];
    const lines = tasksContent.split('\n');

    let currentTask: Partial<Task> | null = null;

    for (const line of lines) {
      // Match task header: ### T-001: Title (P1)
      const headerMatch = line.match(/^### (T-\d+):\s*(.+?)\s*\(P\d+\)$/);
      if (headerMatch) {
        // Save previous task
        if (currentTask && currentTask.id) {
          tasks.push(currentTask as Task);
        }

        // Start new task
        currentTask = {
          id: headerMatch[1],
          title: headerMatch[2],
          completed: false,
          acIds: []
        };
        continue;
      }

      // Check for completion date
      const completedMatch = line.match(/^\*\*Completed\*\*:\s*(.+)$/);
      if (completedMatch && currentTask) {
        currentTask.completed = true;
        currentTask.completedDate = completedMatch[1];
      }

      // Extract AC IDs from task (e.g., **AC**: AC-US1-01, AC-US1-02)
      const acMatch = line.match(/\*\*AC\*\*:\s*(.+)$/);
      if (acMatch && currentTask) {
        const acIds = acMatch[1].split(',').map(id => id.trim());
        currentTask.acIds = acIds;
      }
    }

    // Save last task
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
   * Detect projects from ACs
   */
  private detectProjectsFromAcs(acs: AcceptanceCriterion[]): ProjectType[] {
    const allProjects = new Set<ProjectType>();

    for (const ac of acs) {
      if (ac.projects) {
        ac.projects.forEach(p => allProjects.add(p as ProjectType));
      }
    }

    return Array.from(allProjects);
  }

  /**
   * Filter tasks by AC IDs
   */
  private filterTasksByAcIds(tasks: Task[], acIds: string[]): Task[] {
    return tasks.filter(task => {
      // Include task if it implements any of the AC IDs
      return task.acIds.some(acId => acIds.includes(acId));
    });
  }

  /**
   * Find User Story file by ID
   */
  private async findUserStoryFile(livingDocsPath: string, userStoryId: string): Promise<string | null> {
    try {
      // Look for files matching pattern: US1.md, us1.md, US-1.md, etc.
      const files = await fs.readdir(livingDocsPath);
      
      const pattern = new RegExp(`^${userStoryId.toLowerCase()}(-|_)?.*\\.md$`, 'i');
      const matchingFile = files.find(f => pattern.test(f));

      if (matchingFile) {
        return path.join(livingDocsPath, matchingFile);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Update User Story file with ACs and Tasks
   */
  private async updateUserStoryFile(
    filePath: string,
    acs: AcceptanceCriterion[],
    tasks: Task[]
  ): Promise<void> {
    let content = await fs.readFile(filePath, 'utf-8');

    // Backward compatibility: Check if ## Implementation section exists
    const hasImplementationSection = this.hasImplementationSection(content);

    if (!hasImplementationSection) {
      console.log(`🔄 [Backward Compatibility] Auto-generating ## Implementation section for ${path.basename(filePath)}`);
    }

    // Update ## Acceptance Criteria section
    content = this.updateSection(content, '## Acceptance Criteria', acs.map(ac => {
      const checkbox = ac.completed ? '[x]' : '[ ]';
      return `- ${checkbox} **${ac.id}**: ${ac.description}`;
    }));

    // Update ## Implementation section (Tasks)
    content = this.updateSection(content, '## Implementation', [
      ...tasks.map(task => {
        const checkbox = task.completed ? '[x]' : '[ ]';
        const dateStr = task.completedDate ? ` (completed ${task.completedDate})` : '';
        return `- ${checkbox} **${task.id}**: ${task.title}${dateStr}`;
      }),
      '',
      '> **Note**: Task status syncs from increment tasks.md'
    ]);

    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Check if User Story has ## Implementation section
   * Used for backward compatibility detection
   */
  private hasImplementationSection(content: string): boolean {
    return /##\s*Implementation/i.test(content);
  }

  /**
   * Update a section in markdown content
   */
  private updateSection(content: string, sectionHeader: string, lines: string[]): string {
    const sectionRegex = new RegExp(`(${sectionHeader}\\n)(.*?)(\\n#{1,2} |$)`, 's');
    const match = content.match(sectionRegex);

    if (match) {
      // Replace section content
      const newSection = `${sectionHeader}\n\n${lines.join('\n')}\n\n`;
      return content.replace(sectionRegex, newSection + '$3');
    } else {
      // Append section at end
      return content + `\n\n${sectionHeader}\n\n${lines.join('\n')}\n`;
    }
  }
}
