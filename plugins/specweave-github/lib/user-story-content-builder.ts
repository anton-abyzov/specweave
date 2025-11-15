/**
 * User Story Content Builder - GitHub issue content for individual user stories
 *
 * Architecture:
 * - Reads individual us-*.md files from living docs
 * - Extracts ACs and converts to GitHub task checkboxes
 * - Finds and links related tasks from increment tasks.md
 * - Generates rich GitHub issue body with proper formatting
 *
 * Key Features:
 * - Checkable ACs (GitHub task checkboxes)
 * - Task connections (links to increment tasks)
 * - User story description (As a... I want... So that...)
 * - Implementation details
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface UserStoryFrontmatter {
  id: string;
  epic: string;
  title: string;
  status: 'complete' | 'active' | 'planning' | 'not-started';
  project: string;
  priority: string;
  created: string;
  completed?: string;
}

interface AcceptanceCriterion {
  id: string; // AC-US4-01
  description: string;
  completed: boolean;
  priority: string;
  testable: boolean;
}

interface Task {
  id: string; // T-008
  title: string;
  status: boolean; // true = completed
  link: string; // Link to tasks.md
}

export interface UserStoryContent {
  frontmatter: UserStoryFrontmatter;
  userStoryDescription: {
    asA: string;
    iWant: string;
    soThat: string;
  } | null;
  acceptanceCriteria: AcceptanceCriterion[];
  tasks: Task[];
  incrementId: string | null;
  featureId: string; // FS-031
}

export class UserStoryContentBuilder {
  private userStoryPath: string;
  private projectRoot: string;

  constructor(userStoryPath: string, projectRoot: string) {
    this.userStoryPath = userStoryPath;
    this.projectRoot = projectRoot;
  }

  /**
   * Parse user story file and extract all content
   */
  async parse(): Promise<UserStoryContent> {
    const content = await readFile(this.userStoryPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      throw new Error('User story file missing YAML frontmatter');
    }

    const frontmatter = yaml.parse(match[1]) as UserStoryFrontmatter;
    const bodyContent = content.slice(match[0].length).trim();

    // Extract feature ID from epic or path
    const featureId = this.extractFeatureId(frontmatter.epic, this.userStoryPath);

    // Extract user story description
    const userStoryDescription = this.extractUserStoryDescription(bodyContent);

    // Extract acceptance criteria
    const acceptanceCriteria = this.extractAcceptanceCriteria(bodyContent);

    // Extract increment ID and tasks
    const incrementId = this.extractIncrementId(bodyContent);
    const tasks = incrementId
      ? await this.extractTasks(bodyContent, incrementId, frontmatter.id)
      : [];

    return {
      frontmatter,
      userStoryDescription,
      acceptanceCriteria,
      tasks,
      incrementId,
      featureId,
    };
  }

  /**
   * Build GitHub issue body from user story content
   *
   * @param githubRepo Optional GitHub repo in format "owner/repo" for generating URLs
   */
  async buildIssueBody(githubRepo?: string): Promise<string> {
    const content = await this.parse();

    let body = '';

    // Extract priority from ACs (highest priority wins)
    const priority = this.extractPriorityFromACs(content.acceptanceCriteria);

    // Detect GitHub repo from git remote if not provided
    const repo = githubRepo || await this.detectGitHubRepo();

    // Header with metadata
    if (repo) {
      body += `**Feature**: [${content.featureId}](https://github.com/${repo}/tree/develop/.specweave/docs/internal/specs/_features/${content.featureId})\n`;
    } else {
      body += `**Feature**: ${content.featureId}\n`;
    }
    body += `**Status**: ${content.frontmatter.status}\n`;
    if (priority) {
      body += `**Priority**: ${priority}\n`;
    }

    body += `\n---\n\n`;

    // User Story description
    body += `## User Story\n\n`;
    if (content.userStoryDescription) {
      body += `**As a** ${content.userStoryDescription.asA}\n`;
      body += `**I want** ${content.userStoryDescription.iWant}\n`;
      body += `**So that** ${content.userStoryDescription.soThat}\n\n`;
    } else {
      body += `*User story description not found*\n\n`;
    }

    // Link to full user story file (GitHub URL)
    const usFilename = path.basename(this.userStoryPath);
    if (repo) {
      const relativePath = this.userStoryPath
        .replace(this.projectRoot, '')
        .replace(/^\//, '');
      body += `📄 View full story: [\`${usFilename}\`](https://github.com/${repo}/tree/develop/${relativePath})\n\n`;
    }

    body += `---\n\n`;

    // Acceptance Criteria (checkable!)
    body += `## Acceptance Criteria\n\n`;
    if (content.acceptanceCriteria.length > 0) {
      const completed = content.acceptanceCriteria.filter((ac) => ac.completed).length;
      const total = content.acceptanceCriteria.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      body += `Progress: ${completed}/${total} criteria met (${percentage}%)\n\n`;

      for (const ac of content.acceptanceCriteria) {
        const checkbox = ac.completed ? '[x]' : '[ ]';
        const priority = ac.priority ? ` (${ac.priority})` : '';
        const testable = ac.testable ? ' [testable]' : '';
        body += `- ${checkbox} **${ac.id}**: ${ac.description}${priority}${testable}\n`;
      }
      body += '\n';
    } else {
      body += `*No acceptance criteria defined*\n\n`;
    }

    body += `---\n\n`;

    // Tasks (linked to increment!)
    body += `## Implementation Tasks\n\n`;
    if (content.tasks.length > 0) {
      const completed = content.tasks.filter((t) => t.status).length;
      const total = content.tasks.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      body += `Progress: ${completed}/${total} tasks complete (${percentage}%)\n\n`;

      if (content.incrementId) {
        if (repo) {
          body += `**Increment**: [${content.incrementId}](https://github.com/${repo}/tree/develop/.specweave/increments/${content.incrementId})\n\n`;
        } else {
          body += `**Increment**: ${content.incrementId}\n\n`;
        }
      }

      for (const task of content.tasks) {
        const checkbox = task.status ? '[x]' : '[ ]';
        // Convert relative link to GitHub URL if repo is known
        let taskLink = task.link;
        if (repo && taskLink.startsWith('../../')) {
          const relativePath = taskLink.replace(/^\.\.\/\.\.\//, '.specweave/');
          taskLink = `https://github.com/${repo}/tree/develop/${relativePath}`;
        }
        body += `- ${checkbox} [${task.id}: ${task.title}](${taskLink})\n`;
      }
      body += '\n';
    } else {
      body += `*No tasks defined yet*\n\n`;
    }

    body += `---\n\n`;
    body += `🤖 Auto-synced by SpecWeave User Story Sync`;

    return body;
  }

  /**
   * Extract feature ID from epic or path
   */
  private extractFeatureId(epic: string, filePath: string): string {
    // Try epic first (e.g., "FS-031")
    if (epic && epic.startsWith('FS-')) {
      return epic;
    }

    // Extract from path: .../specs/default/FS-031/us-001-...md
    const match = filePath.match(/FS-\d+/);
    return match ? match[0] : 'FS-UNKNOWN';
  }

  /**
   * Extract user story description (As a... I want... So that...)
   */
  private extractUserStoryDescription(content: string): {
    asA: string;
    iWant: string;
    soThat: string;
  } | null {
    const asAMatch = content.match(/\*\*As a\*\*\s+([^\n]+)/);
    const iWantMatch = content.match(/\*\*I want\*\*\s+([^\n]+)/);
    const soThatMatch = content.match(/\*\*So that\*\*\s+([^\n]+)/);

    if (asAMatch && iWantMatch && soThatMatch) {
      return {
        asA: asAMatch[1].trim(),
        iWant: iWantMatch[1].trim(),
        soThat: soThatMatch[1].trim(),
      };
    }

    return null;
  }

  /**
   * Extract acceptance criteria from content
   */
  private extractAcceptanceCriteria(content: string): AcceptanceCriterion[] {
    const criteria: AcceptanceCriterion[] = [];

    // Pattern: - [x] **AC-US4-01**: Description (P1, testable)
    const acPattern =
      /- \[([ x])\] \*\*AC-US(\d+)-(\d+)\*\*:\s*([^(]+)(?:\(([^)]+)\))?/g;

    let match;
    while ((match = acPattern.exec(content)) !== null) {
      const completed = match[1] === 'x';
      const usNumber = match[2];
      const acNumber = match[3];
      const description = match[4].trim();
      const metadata = match[5] || '';

      criteria.push({
        id: `AC-US${usNumber}-${acNumber}`,
        description,
        completed,
        priority: metadata.includes('P1') ? 'P1' : metadata.includes('P2') ? 'P2' : '',
        testable: metadata.includes('testable'),
      });
    }

    return criteria;
  }

  /**
   * Extract increment ID from Implementation section
   */
  private extractIncrementId(content: string): string | null {
    // Pattern: **Increment**: [0031-external-tool-status-sync](...)
    const match = content.match(/\*\*Increment\*\*:\s*\[([^\]]+)\]/);
    return match ? match[1] : null;
  }

  /**
   * Extract tasks for this user story from increment tasks.md
   */
  private async extractTasks(
    content: string,
    incrementId: string,
    userStoryId: string
  ): Promise<Task[]> {
    const tasks: Task[] = [];

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
    // Format: - [T-008: Create Status Sync Engine](link#t-008-create-status-sync-engine)
    const taskLinkPattern = /- \[([T-\d]+):\s*([^\]]+)\]/g;

    let match;
    while ((match = taskLinkPattern.exec(content)) !== null) {
      const taskId = match[1]; // e.g., "T-008"
      const taskTitle = match[2].trim();

      // Find task in tasks.md to get completion status
      // Pattern: ### T-008: Create Status Sync Engine ... **Status**: [x]
      const taskPattern = new RegExp(
        `###\\s+${taskId}:\\s*([^\\n]+)[\\s\\S]*?\\*\\*Status\\*\\*:\\s*\\[([x\\s])\\]`,
        'i'
      );
      const taskMatch = tasksContent.match(taskPattern);

      const isCompleted = taskMatch ? taskMatch[2] === 'x' : false;

      // Build link to task in tasks.md
      const taskAnchor = taskId.toLowerCase() + '-' + taskTitle.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      const link = `../../increments/${incrementId}/tasks.md#${taskAnchor}`;

      tasks.push({
        id: taskId,
        title: taskTitle,
        status: isCompleted,
        link,
      });
    }

    return tasks;
  }

  /**
   * Extract highest priority from acceptance criteria
   * Priority order: P1 > P2 > P3
   */
  private extractPriorityFromACs(acceptanceCriteria: AcceptanceCriterion[]): string | null {
    if (acceptanceCriteria.length === 0) {
      return null;
    }

    // Check for P1 first (highest priority)
    if (acceptanceCriteria.some(ac => ac.priority === 'P1')) {
      return 'P1';
    }

    // Then P2
    if (acceptanceCriteria.some(ac => ac.priority === 'P2')) {
      return 'P2';
    }

    // Then P3
    if (acceptanceCriteria.some(ac => ac.priority === 'P3')) {
      return 'P3';
    }

    return null; // No priority found
  }

  /**
   * Detect GitHub repository from git remote
   * Returns "owner/repo" format
   */
  private async detectGitHubRepo(): Promise<string | null> {
    try {
      const { execFileNoThrow } = await import('../../../src/utils/execFileNoThrow.js');
      const result = await execFileNoThrow('git', ['remote', 'get-url', 'origin']);

      if (result.exitCode !== 0 || !result.stdout) {
        return null;
      }

      const remoteUrl = result.stdout.trim();

      // Parse GitHub URL
      // Formats: git@github.com:owner/repo.git or https://github.com/owner/repo.git
      const githubMatch = remoteUrl.match(/github\.com[:/](.+\/.+?)(?:\.git)?$/);
      if (githubMatch) {
        return githubMatch[1]; // "owner/repo"
      }

      return null;
    } catch {
      return null;
    }
  }
}
