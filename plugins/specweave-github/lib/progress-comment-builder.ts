/**
 * Progress Comment Builder - Generate progress update comments for GitHub issues
 *
 * Architecture:
 * - Reads user story files from living docs
 * - Extracts current AC completion status
 * - Formats progress comment with checkboxes
 * - Creates audit trail of changes over time
 *
 * Key Principle: IMMUTABLE DESCRIPTIONS
 * - Issue description created once (snapshot)
 * - All updates via progress comments (current state)
 * - Complete audit trail preserved
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
  created: string;
  completed?: string;
}

interface AcceptanceCriterion {
  id: string; // AC-US4-01
  description: string;
  completed: boolean;
  priority: string; // P1, P2, P3
  testable: boolean;
}

interface Task {
  id: string; // T-008
  title: string;
  status: boolean; // true = completed
}

export interface ProgressSummary {
  totalACs: number;
  completedACs: number;
  percentage: number;
  statusSummary: string; // "Core Complete", "Complete", "In Progress"
  completedCriteria: AcceptanceCriterion[];
  remainingCriteria: AcceptanceCriterion[];
  tasks: Task[];
}

export class ProgressCommentBuilder {
  private userStoryPath: string;
  private projectRoot: string;

  constructor(userStoryPath: string, projectRoot: string = process.cwd()) {
    this.userStoryPath = userStoryPath;
    this.projectRoot = projectRoot;
  }

  /**
   * Build complete progress comment
   */
  async buildProgressComment(incrementId: string): Promise<string> {
    const summary = await this.calculateProgressSummary();
    const frontmatter = await this.extractFrontmatter();

    let comment = '';

    // Header
    comment += `📊 **Progress Update from Increment ${incrementId}**\n\n`;
    comment += `**Status**: ${summary.statusSummary} (${summary.completedACs}/${summary.totalACs} AC implemented - ${summary.percentage}%)\n\n`;

    // Completed Acceptance Criteria
    if (summary.completedCriteria.length > 0) {
      comment += `## ✅ Completed Acceptance Criteria\n\n`;
      for (const ac of summary.completedCriteria) {
        const priority = ac.priority ? ` (${ac.priority})` : '';
        const testable = ac.testable ? ' [testable]' : '';
        comment += `- [x] **${ac.id}**: ${ac.description}${priority}${testable}\n`;
      }
      comment += '\n';
    }

    // Remaining Work
    if (summary.remainingCriteria.length > 0) {
      // Group by priority
      const p1 = summary.remainingCriteria.filter(ac => ac.priority === 'P1');
      const p2 = summary.remainingCriteria.filter(ac => ac.priority === 'P2');
      const p3 = summary.remainingCriteria.filter(ac => ac.priority === 'P3');

      if (p1.length > 0) {
        comment += `## 🔴 Remaining Work (P1 - Critical)\n\n`;
        for (const ac of p1) {
          const testable = ac.testable ? ' [testable]' : '';
          comment += `- [ ] **${ac.id}**: ${ac.description} (P1)${testable}\n`;
        }
        comment += '\n';
      }

      if (p2.length > 0 || p3.length > 0) {
        comment += `## ⏳ Remaining Work (P2-P3)\n\n`;
        for (const ac of [...p2, ...p3]) {
          const priority = ac.priority ? ` (${ac.priority})` : '';
          const testable = ac.testable ? ' [testable]' : '';
          comment += `- [ ] **${ac.id}**: ${ac.description}${priority}${testable}\n`;
        }
        comment += '\n';
      }
    }

    // Tasks (if any)
    if (summary.tasks.length > 0) {
      const completedTasks = summary.tasks.filter(t => t.status).length;
      const totalTasks = summary.tasks.length;
      comment += `## 📋 Implementation Tasks (${completedTasks}/${totalTasks})\n\n`;

      for (const task of summary.tasks) {
        const checkbox = task.status ? '[x]' : '[ ]';
        comment += `- ${checkbox} ${task.id}: ${task.title}\n`;
      }
      comment += '\n';
    }

    // Footer
    comment += `---\n\n`;
    comment += `🤖 Auto-synced by SpecWeave | `;
    comment += `[View increment](../../increments/${incrementId}) | `;
    comment += `${new Date().toISOString().split('T')[0]}\n`;

    return comment;
  }

  /**
   * Calculate progress summary
   */
  async calculateProgressSummary(): Promise<ProgressSummary> {
    const content = await readFile(this.userStoryPath, 'utf-8');
    const acceptanceCriteria = this.extractAcceptanceCriteria(content);
    const tasks = await this.extractTasks(content);

    const completedCriteria = acceptanceCriteria.filter(ac => ac.completed);
    const remainingCriteria = acceptanceCriteria.filter(ac => !ac.completed);

    const totalACs = acceptanceCriteria.length;
    const completedACs = completedCriteria.length;
    const percentage = totalACs > 0 ? Math.round((completedACs / totalACs) * 100) : 0;

    // Determine status summary
    let statusSummary = 'In Progress';
    if (completedACs === totalACs && totalACs > 0) {
      statusSummary = 'Complete';
    } else if (completedACs > 0) {
      // Check if all P1 are done
      const p1Criteria = acceptanceCriteria.filter(ac => ac.priority === 'P1');
      const p1Completed = p1Criteria.filter(ac => ac.completed).length;
      if (p1Completed === p1Criteria.length && p1Criteria.length > 0) {
        statusSummary = 'Core Complete';
      }
    }

    return {
      totalACs,
      completedACs,
      percentage,
      statusSummary,
      completedCriteria,
      remainingCriteria,
      tasks,
    };
  }

  /**
   * Format AC checkboxes (for inline display)
   */
  formatACCheckboxes(): string {
    // This method is for simple inline formatting
    // The full buildProgressComment does structured formatting
    return ''; // Placeholder for CLI usage if needed
  }

  /**
   * Format task checkboxes (for inline display)
   */
  formatTaskCheckboxes(): string {
    // This method is for simple inline formatting
    // The full buildProgressComment does structured formatting
    return ''; // Placeholder for CLI usage if needed
  }

  /**
   * Calculate progress percentage
   */
  async calculateProgressPercentage(): Promise<number> {
    const summary = await this.calculateProgressSummary();
    return summary.percentage;
  }

  /**
   * Extract frontmatter from user story file
   */
  private async extractFrontmatter(): Promise<UserStoryFrontmatter> {
    const content = await readFile(this.userStoryPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (!match) {
      throw new Error(`User story file missing YAML frontmatter: ${this.userStoryPath}`);
    }

    return yaml.parse(match[1]) as UserStoryFrontmatter;
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
        priority: metadata.includes('P1') ? 'P1' : metadata.includes('P2') ? 'P2' : metadata.includes('P3') ? 'P3' : '',
        testable: metadata.includes('testable'),
      });
    }

    return criteria;
  }

  /**
   * Extract tasks from Implementation section
   */
  private async extractTasks(content: string): Promise<Task[]> {
    const tasks: Task[] = [];

    // Extract increment ID from Implementation section
    const incrementMatch = content.match(/\*\*Increment\*\*:\s*\[([^\]]+)\]/);
    if (!incrementMatch) {
      return tasks; // No increment linked
    }

    const incrementId = incrementMatch[1];

    // Find tasks.md file
    const tasksPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'tasks.md'
    );

    if (!existsSync(tasksPath)) {
      return tasks; // Tasks file not found
    }

    const tasksContent = await readFile(tasksPath, 'utf-8');

    // Extract task links from user story (e.g., - [T-001: Title](link))
    const taskLinkPattern = /- \[([T-\d]+):\s*([^\]]+)\]/g;
    let match;

    while ((match = taskLinkPattern.exec(content)) !== null) {
      const taskId = match[1];
      const taskTitle = match[2].trim();

      // Check if task is completed in tasks.md
      const taskPattern = new RegExp(`### ${taskId}[:\\s].*?\\n\\*\\*Status\\*\\*:\\s*\\[([x ]?)\\]`, 's');
      const taskMatch = tasksContent.match(taskPattern);
      const completed = taskMatch ? taskMatch[1] === 'x' : false;

      tasks.push({
        id: taskId,
        title: taskTitle,
        status: completed,
      });
    }

    return tasks;
  }
}

/**
 * CLI entry point for generating progress comments
 */
export async function main() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.error('Usage: node progress-comment-builder.js --user-story <path> --increment <id>');
    process.exit(1);
  }

  const userStoryPath = args[args.indexOf('--user-story') + 1];
  const incrementId = args[args.indexOf('--increment') + 1];

  const builder = new ProgressCommentBuilder(userStoryPath);
  const comment = await builder.buildProgressComment(incrementId);

  console.log(comment);
}

// Run if called directly (ESM compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error generating progress comment:', error.message);
    process.exit(1);
  });
}
