/**
 * Increment Issue Builder - Generate GitHub issues from increment spec.md
 *
 * For brownfield projects without full living docs structure,
 * this builder extracts User Stories and ACs directly from spec.md
 * and generates properly formatted GitHub issues.
 *
 * Correct format: [FS-XXX][US-YYY] User Story Title
 * With ACs as checkable items in issue body.
 *
 * @see ADR-0143 (GitHub Issue Format)
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

export interface IncrementFrontmatter {
  increment: string;
  feature_id?: string;
  type?: string;
  status?: string;
  created?: string;
  priority?: string;
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  completed: boolean;
}

export interface UserStory {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: AcceptanceCriterion[];
  priority?: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  userStories: string[];
  priority?: string;
  description?: string;
}

export interface IncrementData {
  frontmatter: IncrementFrontmatter;
  title: string;
  problemStatement: string;
  userStories: UserStory[];
  tasks: Task[];
  outOfScope: string[];
}

export interface GitHubIssueContent {
  title: string;
  body: string;
  labels: string[];
}

export class IncrementIssueBuilder {
  private incrementPath: string;
  private projectRoot: string;

  constructor(incrementPath: string, projectRoot: string) {
    this.incrementPath = incrementPath;
    this.projectRoot = projectRoot;
  }

  /**
   * Parse increment spec.md and extract all data
   */
  async parse(): Promise<IncrementData> {
    const specPath = path.join(this.incrementPath, 'spec.md');

    if (!existsSync(specPath)) {
      throw new Error(`spec.md not found at ${specPath}`);
    }

    const content = await readFile(specPath, 'utf-8');

    // Extract YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      throw new Error('spec.md missing YAML frontmatter');
    }

    const frontmatter = yaml.parse(frontmatterMatch[1]) as IncrementFrontmatter;
    const bodyContent = content.slice(frontmatterMatch[0].length).trim();

    // Extract main title
    const titleMatch = bodyContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : frontmatter.increment;

    // Extract problem statement
    const problemStatement = this.extractSection(bodyContent, 'Problem Statement');

    // Extract user stories
    const userStories = this.extractUserStories(bodyContent);

    // Extract out of scope
    const outOfScopeSection = this.extractSection(bodyContent, 'Out of Scope');
    const outOfScope = outOfScopeSection
      .split('\n')
      .filter(line => line.startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim());

    // Extract tasks from tasks.md
    const tasks = await this.extractTasks();

    return {
      frontmatter,
      title,
      problemStatement,
      userStories,
      tasks,
      outOfScope,
    };
  }

  /**
   * Extract tasks from tasks.md
   */
  private async extractTasks(): Promise<Task[]> {
    const tasksPath = path.join(this.incrementPath, 'tasks.md');

    if (!existsSync(tasksPath)) {
      return [];
    }

    try {
      const content = await readFile(tasksPath, 'utf-8');
      const tasks: Task[] = [];

      // Split by task headers: ### T-XXX: Title
      const taskBlocks = content.split(/(?=###\s+T-\d+)/);

      for (const block of taskBlocks) {
        const headerMatch = block.match(/###\s+(T-\d+):\s*(.+)/);
        if (!headerMatch) continue;

        const id = headerMatch[1];
        const title = headerMatch[2].trim();

        // Extract status: **Status**: [x] completed or **Status**: [ ] pending
        const statusMatch = block.match(/\*\*Status\*\*:\s*\[([x\s])\]/i);
        const completed = statusMatch ? statusMatch[1].toLowerCase() === 'x' : false;

        // Extract user stories: **User Story**: US-001 or **Satisfies ACs**: AC-US1-01
        const userStoryMatch = block.match(/\*\*User Story\*\*:\s*([^\n]+)/i);
        const satisfiesMatch = block.match(/\*\*Satisfies ACs?\*\*:\s*([^\n]+)/i);

        let userStories: string[] = [];
        if (userStoryMatch) {
          userStories = userStoryMatch[1].split(',').map(s => s.trim());
        } else if (satisfiesMatch) {
          // Extract US IDs from AC IDs (AC-US1-01 → US-001)
          const acIds = satisfiesMatch[1].split(',').map(s => s.trim());
          const usIds = new Set<string>();
          for (const ac of acIds) {
            const usMatch = ac.match(/AC-(US\d+)-/i);
            if (usMatch) {
              usIds.add(usMatch[1]);
            }
          }
          userStories = Array.from(usIds);
        }

        // Extract priority
        const priorityMatch = block.match(/\*\*Priority\*\*:\s*(P\d)/i);
        const priority = priorityMatch ? priorityMatch[1] : undefined;

        tasks.push({
          id,
          title,
          completed,
          userStories,
          priority,
        });
      }

      return tasks;
    } catch {
      return [];
    }
  }

  /**
   * Extract a section by heading
   */
  private extractSection(content: string, heading: string): string {
    const regex = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract user stories from spec.md
   */
  private extractUserStories(content: string): UserStory[] {
    const stories: UserStory[] = [];

    // Find User Stories section
    const userStoriesSection = this.extractSection(content, 'User Stories');
    if (!userStoriesSection) {
      return stories;
    }

    // Split by ### US-XXX headers
    const storyBlocks = userStoriesSection.split(/(?=###\s+US-\d+)/);

    for (const block of storyBlocks) {
      const headerMatch = block.match(/###\s+(US-\d+):\s*(.+)/);
      if (!headerMatch) continue;

      const id = headerMatch[1];
      const title = headerMatch[2].trim();

      // Extract As a/I want/So that
      const asAMatch = block.match(/\*\*As a\*\*\s+([^\n]+)/i);
      const iWantMatch = block.match(/\*\*I want\*\*\s+([^\n]+)/i);
      const soThatMatch = block.match(/\*\*So that\*\*\s+([^\n]+)/i);

      // Extract Acceptance Criteria
      const acceptanceCriteria = this.extractAcceptanceCriteria(block, id);

      stories.push({
        id,
        title,
        asA: asAMatch ? asAMatch[1].trim().replace(/,$/, '') : '',
        iWant: iWantMatch ? iWantMatch[1].trim().replace(/,$/, '') : '',
        soThat: soThatMatch ? soThatMatch[1].trim().replace(/\.$/, '') : '',
        acceptanceCriteria,
      });
    }

    return stories;
  }

  /**
   * Extract acceptance criteria from a user story block
   */
  private extractAcceptanceCriteria(block: string, userStoryId: string): AcceptanceCriterion[] {
    const criteria: AcceptanceCriterion[] = [];

    // Pattern: - [x] **AC-US1-01**: Description or - [ ] **AC-US1-01**: Description
    const acPattern = /-\s*\[([ x])\]\s*\*\*AC-(US\d+)-(\d+)\*\*:\s*(.+)/gi;

    let match;
    while ((match = acPattern.exec(block)) !== null) {
      const completed = match[1].toLowerCase() === 'x';
      const usNum = match[2];
      const acNum = match[3];
      const description = match[4].trim();

      criteria.push({
        id: `AC-${usNum}-${acNum}`,
        description,
        completed,
      });
    }

    return criteria;
  }

  /**
   * Build GitHub issue for a single user story
   */
  buildUserStoryIssue(
    story: UserStory,
    incrementData: IncrementData,
    githubRepo?: string
  ): GitHubIssueContent {
    const featureId = incrementData.frontmatter.feature_id || this.generateFeatureId(incrementData);
    const incrementId = incrementData.frontmatter.increment;

    // Title format: [FS-XXX][US-YYY] User Story Title
    const title = `[${featureId}][${story.id}] ${story.title}`;

    // Build body
    let body = '';

    // ❌ REMOVED: Metadata header (Feature, Status, Priority)
    // WHY: GitHub has NATIVE fields for this (labels, milestones)
    // Body should contain ONLY actual work content (ACs, tasks, user story)
    // See: .specweave/docs/internal/troubleshooting/CRITICAL-remove-metadata-header-from-github-issues.md

    // Progress section (consistency with user-story-issue-builder.ts)
    const completedACs = story.acceptanceCriteria.filter(ac => ac.completed).length;
    const totalACs = story.acceptanceCriteria.length;
    const storyTasks = incrementData.tasks.filter(t =>
      t.userStories.includes(story.id) ||
      t.userStories.some(us => us.toUpperCase() === story.id.toUpperCase())
    );
    const completedTasks = storyTasks.filter(t => t.completed).length;
    const totalTasks = storyTasks.length;
    const overallPercentage = (totalACs + totalTasks) > 0
      ? Math.round(((completedACs + completedTasks) / (totalACs + totalTasks)) * 100)
      : 0;

    body += `## Progress\n\n`;
    body += `**Acceptance Criteria**: ${completedACs}/${totalACs} (${totalACs > 0 ? Math.round((completedACs / totalACs) * 100) : 0}%)\n`;
    body += `**Tasks**: ${completedTasks}/${totalTasks} (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)\n`;
    body += `**Overall**: ${overallPercentage}%\n\n`;

    // Progress bar
    const filledBlocks = Math.floor(overallPercentage / 5);
    const emptyBlocks = 20 - filledBlocks;
    body += `${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)} ${overallPercentage}%\n\n`;
    body += `---\n\n`;

    // User Story description
    body += `## User Story\n\n`;
    if (story.asA && story.iWant && story.soThat) {
      body += `**As a** ${story.asA}\n`;
      body += `**I want** ${story.iWant}\n`;
      body += `**So that** ${story.soThat}\n\n`;
    } else {
      body += `${story.title}\n\n`;
    }

    body += `---\n\n`;

    // Acceptance Criteria (checkable!)
    body += `## Acceptance Criteria\n\n`;
    if (story.acceptanceCriteria.length > 0) {
      const completed = story.acceptanceCriteria.filter(ac => ac.completed).length;
      const total = story.acceptanceCriteria.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      body += `Progress: ${completed}/${total} criteria met (${percentage}%)\n\n`;

      for (const ac of story.acceptanceCriteria) {
        const checkbox = ac.completed ? '[x]' : '[ ]';
        body += `- ${checkbox} **${ac.id}**: ${ac.description}\n`;
      }
      body += '\n';
    } else {
      body += `*No acceptance criteria defined*\n\n`;
    }

    body += `---\n\n`;

    // Tasks for this user story (already calculated above for Progress section)
    if (storyTasks.length > 0) {
      body += `## Tasks\n\n`;
      const completedTasks = storyTasks.filter(t => t.completed).length;
      body += `Progress: ${completedTasks}/${storyTasks.length} tasks\n\n`;

      for (const task of storyTasks) {
        const checkbox = task.completed ? '[x]' : '[ ]';
        body += `- ${checkbox} **${task.id}**: ${task.title}\n`;
      }
      body += '\n---\n\n';
    }

    // Link to increment
    body += `## Implementation\n\n`;
    if (githubRepo) {
      body += `**Increment**: [${incrementId}](https://github.com/${githubRepo}/tree/develop/.specweave/increments/${incrementId})\n\n`;
    } else {
      body += `**Increment**: ${incrementId}\n\n`;
    }

    body += `---\n\n`;
    body += `🤖 Auto-synced by SpecWeave Increment Sync`;

    // Labels
    const labels = ['specweave', 'user-story'];

    // Add type label if available
    if (incrementData.frontmatter.type) {
      labels.push(incrementData.frontmatter.type.toLowerCase());
    }

    // Add priority label (from story or default to p2)
    const priority = story.priority?.toLowerCase() || incrementData.frontmatter.priority?.toLowerCase() || 'p2';
    labels.push(priority);

    return { title, body, labels };
  }

  /**
   * Build GitHub issue for the entire increment (epic-style)
   */
  buildIncrementIssue(
    incrementData: IncrementData,
    githubRepo?: string
  ): GitHubIssueContent {
    const featureId = incrementData.frontmatter.feature_id || this.generateFeatureId(incrementData);
    const incrementId = incrementData.frontmatter.increment;

    // Title format: [FS-XXX] Increment Title
    const title = `[${featureId}] ${incrementData.title}`;

    // Build body
    let body = '';

    // Header with metadata
    body += `**Increment**: ${incrementId}\n`;
    body += `**Status**: ${incrementData.frontmatter.status || 'planning'}\n`;
    body += `**Priority**: P0 (Critical)\n`;

    // Calculate progress
    const totalACs = incrementData.userStories.reduce((sum, us) => sum + us.acceptanceCriteria.length, 0);
    const completedACs = incrementData.userStories.reduce(
      (sum, us) => sum + us.acceptanceCriteria.filter(ac => ac.completed).length, 0
    );
    const percentage = totalACs > 0 ? Math.round((completedACs / totalACs) * 100) : 0;
    body += `**Progress**: ${completedACs}/${totalACs} ACs (${percentage}%)\n`;

    body += `\n---\n\n`;

    // Overview
    body += `## Overview\n\n`;
    body += incrementData.problemStatement || incrementData.title;
    body += `\n\n---\n\n`;

    // User Stories with ACs
    body += `## User Stories\n\n`;
    for (const story of incrementData.userStories) {
      const usCompleted = story.acceptanceCriteria.filter(ac => ac.completed).length;
      const usTotal = story.acceptanceCriteria.length;
      const usCheckbox = usCompleted === usTotal && usTotal > 0 ? '[x]' : '[ ]';

      body += `### ${usCheckbox} ${story.id}: ${story.title}\n\n`;

      if (story.asA && story.iWant && story.soThat) {
        body += `> **As a** ${story.asA}, **I want** ${story.iWant}, **So that** ${story.soThat}\n\n`;
      }

      body += `**Acceptance Criteria:**\n`;
      for (const ac of story.acceptanceCriteria) {
        const checkbox = ac.completed ? '[x]' : '[ ]';
        body += `- ${checkbox} **${ac.id}**: ${ac.description}\n`;
      }
      body += '\n';
    }

    body += `---\n\n`;

    // Tasks section
    if (incrementData.tasks.length > 0) {
      body += `## Tasks\n\n`;
      const completedTasks = incrementData.tasks.filter(t => t.completed).length;
      const totalTasks = incrementData.tasks.length;
      const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      body += `Progress: ${completedTasks}/${totalTasks} tasks (${taskPercentage}%)\n\n`;

      for (const task of incrementData.tasks) {
        const checkbox = task.completed ? '[x]' : '[ ]';
        body += `- ${checkbox} **${task.id}**: ${task.title}\n`;
        if (task.priority || task.userStories.length > 0) {
          const parts: string[] = [];
          if (task.priority) parts.push(`Priority: ${task.priority}`);
          if (task.userStories.length > 0) parts.push(`User ${task.userStories.length === 1 ? 'Story' : 'Stories'}: ${task.userStories.join(', ')}`);
          body += `  - ${parts.join(' | ')}\n`;
        }
      }
      body += '\n---\n\n';
    }

    // Links to increment files
    body += `## SpecWeave Increment\n\n`;
    if (githubRepo) {
      body += `- **Spec**: [\`spec.md\`](https://github.com/${githubRepo}/blob/develop/.specweave/increments/${incrementId}/spec.md)\n`;
      body += `- **Plan**: [\`plan.md\`](https://github.com/${githubRepo}/blob/develop/.specweave/increments/${incrementId}/plan.md)\n`;
      body += `- **Tasks**: [\`tasks.md\`](https://github.com/${githubRepo}/blob/develop/.specweave/increments/${incrementId}/tasks.md)\n`;
    } else {
      body += `- **Spec**: \`spec.md\`\n`;
      body += `- **Plan**: \`plan.md\`\n`;
      body += `- **Tasks**: \`tasks.md\`\n`;
    }

    body += `\n---\n\n`;
    body += `🤖 Auto-synced by SpecWeave Increment Sync`;

    // Labels
    const labels = ['specweave', 'increment'];

    // Add type label (default to 'enhancement' if not specified)
    const typeLabel = incrementData.frontmatter.type?.toLowerCase() || 'enhancement';
    labels.push(typeLabel);

    // Add priority label (default to 'p2' if not specified)
    const priority = incrementData.frontmatter.priority?.toLowerCase() || 'p2';
    labels.push(priority);

    return { title, body, labels };
  }

  /**
   * Generate a feature ID if not present in frontmatter
   * Uses date-based format: FS-YY-MM-DD
   */
  private generateFeatureId(incrementData: IncrementData): string {
    // Try to extract increment number
    const incrementNum = incrementData.frontmatter.increment.match(/^(\d+)/)?.[1];
    if (incrementNum) {
      return `FS-${incrementNum.padStart(3, '0')}`;
    }

    // Fallback to date-based
    const created = incrementData.frontmatter.created;
    if (created) {
      const match = created.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `FS-${match[1].slice(2)}-${match[2]}-${match[3]}`;
      }
    }

    return 'FS-UNKNOWN';
  }
}
