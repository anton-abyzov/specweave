/**
 * Epic Content Builder - Hierarchical GitHub issue content for Feature Specs
 *
 * Architecture:
 * - Reads FS-* folder (FEATURE.md + us-*.md files)
 * - Reads increment tasks.md files to map tasks to user stories
 * - Generates hierarchical issue body:
 *   1. User Stories section (with status + increment)
 *   2. Tasks section (grouped by User Story)
 *
 * Key Features:
 * - NO single "Increment" field (epics span multiple increments)
 * - User Stories are checkable with status and increment link
 * - Tasks grouped under their User Story
 * - Shows which increment each US/task belongs to
 */

import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface UserStory {
  id: string;
  title: string;
  status: 'complete' | 'active' | 'planning' | 'not-started';
  increment: string | null; // e.g., "0031-external-tool-status-sync"
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  status: boolean; // true = completed, false = not started
  userStoryId: string; // e.g., "US-001"
}

interface EpicFrontmatter {
  id: string;
  title: string;
  status: string;
  created: string;
  last_updated: string;
}

interface UserStoryFrontmatter {
  id: string;
  epic: string;
  title: string;
  status: string;
  created: string;
  completed?: string;
}

export class EpicContentBuilder {
  private epicFolder: string;
  private projectRoot: string;

  constructor(epicFolder: string, projectRoot: string) {
    this.epicFolder = epicFolder;
    this.projectRoot = projectRoot;
  }

  /**
   * Build hierarchical GitHub issue body
   *
   * Format:
   * - Epic overview
   * - User Stories section (checkable, with status + increment)
   * - Tasks section (grouped by User Story)
   */
  async buildIssueBody(): Promise<string> {
    // 1. Read Epic metadata
    const epicData = await this.readEpicMetadata();

    // 2. Read User Stories
    const userStories = await this.readUserStories();

    // 3. Build sections
    const overview = this.buildOverviewSection(epicData);
    const userStoriesSection = this.buildUserStoriesSection(userStories);
    const tasksSection = this.buildTasksSection(userStories);

    // 4. Combine
    return `${overview}\n\n---\n\n${userStoriesSection}\n\n---\n\n${tasksSection}\n\n---\n\n🤖 Auto-created by SpecWeave Epic Sync`;
  }

  /**
   * Read Epic FEATURE.md frontmatter
   */
  private async readEpicMetadata(): Promise<EpicFrontmatter> {
    const featurePath = path.join(this.epicFolder, 'FEATURE.md');
    const content = await readFile(featurePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      throw new Error('FEATURE.md missing YAML frontmatter');
    }

    return yaml.parse(match[1]) as EpicFrontmatter;
  }

  /**
   * Read all user stories from us-*.md files
   */
  private async readUserStories(): Promise<UserStory[]> {
    const files = await readdir(this.epicFolder);
    const usFiles = files.filter((f) => f.startsWith('us-') && f.endsWith('.md'));

    const userStories: UserStory[] = [];

    for (const file of usFiles.sort()) {
      const filePath = path.join(this.epicFolder, file);
      const content = await readFile(filePath, 'utf-8');
      const match = content.match(/^---\n([\s\S]*?)\n---/);

      if (!match) {
        console.warn(`   ⚠️  ${file} missing frontmatter, skipping`);
        continue;
      }

      const frontmatter = yaml.parse(match[1]) as UserStoryFrontmatter;
      const bodyContent = content.slice(match[0].length).trim();

      // Extract increment from Implementation section
      const incrementMatch = bodyContent.match(/\*\*Increment\*\*:\s*\[([^\]]+)\]/);
      const increment = incrementMatch ? incrementMatch[1] : null;

      // Extract tasks from Implementation section
      const tasks = await this.extractTasksForUserStory(
        frontmatter.id,
        increment,
        bodyContent
      );

      userStories.push({
        id: frontmatter.id,
        title: frontmatter.title,
        status: this.normalizeStatus(frontmatter.status),
        increment,
        tasks,
      });
    }

    return userStories;
  }

  /**
   * Extract tasks for a user story from its Implementation section
   */
  private async extractTasksForUserStory(
    userStoryId: string,
    incrementId: string | null,
    content: string
  ): Promise<Task[]> {
    if (!incrementId) {
      return []; // No increment yet, no tasks
    }

    // Find increment folder
    const incrementFolder = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId
    );

    if (!existsSync(incrementFolder)) {
      console.warn(`   ⚠️  Increment folder not found: ${incrementId}`);
      return [];
    }

    const tasksPath = path.join(incrementFolder, 'tasks.md');
    if (!existsSync(tasksPath)) {
      console.warn(`   ⚠️  tasks.md not found in ${incrementId}`);
      return [];
    }

    // Read tasks.md
    const tasksContent = await readFile(tasksPath, 'utf-8');

    // Extract task links from user story's Implementation section
    // Format: - [T-001: Title](link#t-001-title)
    const taskLinkPattern = /- \[([T-\d]+):\s*([^\]]+)\]/g;
    const taskLinks: Array<{ id: string; title: string }> = [];

    let match;
    while ((match = taskLinkPattern.exec(content)) !== null) {
      taskLinks.push({
        id: match[1], // e.g., "T-001"
        title: match[2].trim(),
      });
    }

    // Parse tasks from tasks.md to get completion status
    const tasks: Task[] = [];

    for (const taskLink of taskLinks) {
      // Find task in tasks.md by heading pattern: ### T-001: Title
      const taskPattern = new RegExp(
        `###\\s+${taskLink.id}:\\s*([^\\n]+)[\\s\\S]*?\\*\\*Status\\*\\*:\\s*\\[([x\\s])\\]`,
        'i'
      );
      const taskMatch = tasksContent.match(taskPattern);

      const isCompleted = taskMatch ? taskMatch[2] === 'x' : false;

      tasks.push({
        id: taskLink.id,
        title: taskLink.title,
        status: isCompleted,
        userStoryId,
      });
    }

    return tasks;
  }

  /**
   * Build overview section
   */
  private buildOverviewSection(epic: EpicFrontmatter): string {
    return `# [${epic.id}] ${epic.title}\n\n**Status**: ${epic.status}\n**Created**: ${epic.created}\n**Last Updated**: ${epic.last_updated}`;
  }

  /**
   * Build User Stories section
   */
  private buildUserStoriesSection(userStories: UserStory[]): string {
    const total = userStories.length;
    const completed = userStories.filter((us) => us.status === 'complete').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    let section = `## User Stories\n\nProgress: ${completed}/${total} user stories complete (${percentage}%)\n\n`;

    for (const us of userStories) {
      const checkbox = us.status === 'complete' ? '[x]' : '[ ]';
      const statusEmoji = this.getStatusEmoji(us.status);
      const incrementLink = us.increment
        ? `[${us.increment}](../../increments/${us.increment}/)`
        : 'TBD';

      section += `- ${checkbox} **${us.id}: ${us.title}** (${statusEmoji} ${us.status} | Increment: ${incrementLink})\n`;
    }

    return section;
  }

  /**
   * Build Tasks section (grouped by User Story)
   */
  private buildTasksSection(userStories: UserStory[]): string {
    const totalTasks = userStories.reduce((sum, us) => sum + us.tasks.length, 0);
    const completedTasks = userStories.reduce(
      (sum, us) => sum + us.tasks.filter((t) => t.status).length,
      0
    );
    const percentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let section = `## Tasks by User Story\n\nProgress: ${completedTasks}/${totalTasks} tasks complete (${percentage}%)\n\n`;

    for (const us of userStories) {
      if (us.tasks.length === 0) {
        continue; // Skip user stories with no tasks yet
      }

      const incrementLink = us.increment
        ? `[${us.increment}](../../increments/${us.increment}/tasks.md)`
        : 'TBD';

      section += `### ${us.id}: ${us.title} (Increment: ${incrementLink})\n\n`;

      for (const task of us.tasks) {
        const checkbox = task.status ? '[x]' : '[ ]';
        section += `- ${checkbox} ${task.id}: ${task.title}\n`;
      }

      section += '\n';
    }

    return section;
  }

  /**
   * Normalize status values
   */
  private normalizeStatus(
    status: string
  ): 'complete' | 'active' | 'planning' | 'not-started' {
    const normalized = status.toLowerCase();
    if (normalized === 'complete' || normalized === 'completed') return 'complete';
    if (normalized === 'active' || normalized === 'in-progress') return 'active';
    if (normalized === 'planning') return 'planning';
    return 'not-started';
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(
    status: 'complete' | 'active' | 'planning' | 'not-started'
  ): string {
    switch (status) {
      case 'complete':
        return '✅';
      case 'active':
        return '🚧';
      case 'planning':
        return '📋';
      case 'not-started':
        return '⏳';
      default:
        return '❓';
    }
  }
}
