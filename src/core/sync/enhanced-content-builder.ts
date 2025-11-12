/**
 * Enhanced Content Builder
 *
 * Builds rich external issue descriptions with full spec content including:
 * - Executive summary
 * - User stories with collapsible sections
 * - Acceptance criteria
 * - Task links with GitHub issue numbers
 * - Architecture references
 * - Source links
 */

import { SpecContent, SpecUserStory, SpecAcceptanceCriterion } from '../spec-content-sync.js';

export interface TaskMapping {
  incrementId: string;
  tasks: Task[];
  tasksUrl: string;
}

export interface Task {
  id: string;
  title: string;
  userStories: string[];
  githubIssue?: number;
}

export interface ArchitectureDoc {
  type: 'adr' | 'hld' | 'diagram';
  path: string;
  title: string;
}

export interface SourceLinks {
  spec?: string;
  plan?: string;
  tasks?: string;
}

export interface EnhancedSpecContent extends SpecContent {
  summary?: string;
  taskMapping?: TaskMapping;
  architectureDocs?: ArchitectureDoc[];
  sourceLinks?: SourceLinks;
}

export class EnhancedContentBuilder {
  /**
   * Build complete external issue description with all spec content
   */
  buildExternalDescription(spec: EnhancedSpecContent): string {
    const sections: string[] = [];

    // Summary section
    sections.push(this.buildSummarySection(spec));

    // User stories section
    if (spec.userStories && spec.userStories.length > 0) {
      sections.push(this.buildUserStoriesSection(spec.userStories));
    }

    // Tasks section
    if (spec.taskMapping) {
      sections.push(this.buildTasksSection(spec.taskMapping));
    }

    // Architecture section
    if (spec.architectureDocs && spec.architectureDocs.length > 0) {
      sections.push(this.buildArchitectureSection(spec.architectureDocs));
    }

    // Source links section
    if (spec.sourceLinks) {
      sections.push(this.buildSourceLinksSection(spec.sourceLinks));
    }

    return sections.filter(s => s.length > 0).join('\n\n---\n\n');
  }

  /**
   * Build summary section with executive overview
   */
  buildSummarySection(spec: EnhancedSpecContent): string {
    return `## Summary\n\n${spec.summary || spec.description}`;
  }

  /**
   * Build user stories section with collapsible GitHub sections
   */
  buildUserStoriesSection(userStories: SpecUserStory[]): string {
    const lines: string[] = ['## User Stories'];

    for (const story of userStories) {
      lines.push('');
      lines.push(`<details>`);
      lines.push(`<summary><strong>${story.id}: ${story.title}</strong></summary>`);
      lines.push('');

      if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
        lines.push('**Acceptance Criteria**:');
        for (const ac of story.acceptanceCriteria) {
          const priority = ac.priority ? ` (${ac.priority}` : '';
          const testable = ac.testable ? ', testable)' : ')';
          const suffix = priority || ac.testable ? `${priority}${testable}` : '';
          const checkbox = ac.completed ? '[x]' : '[ ]';
          lines.push(`- ${checkbox} **${ac.id}**: ${ac.description}${suffix}`);
        }
        lines.push('');
      }

      lines.push('</details>');
    }

    return lines.join('\n');
  }

  /**
   * Build tasks section with GitHub issue links
   */
  buildTasksSection(taskMapping: TaskMapping): string {
    const lines: string[] = ['## Tasks'];
    lines.push('');
    lines.push(`This epic includes ${taskMapping.tasks.length} tasks from increment ${taskMapping.incrementId}:`);
    lines.push('');

    for (const task of taskMapping.tasks) {
      const issueLink = task.githubIssue ? ` (#${task.githubIssue})` : '';
      lines.push(`- **${task.id}**: ${task.title}${issueLink}`);

      if (task.userStories && task.userStories.length > 0) {
        lines.push(`  - Implements: ${task.userStories.join(', ')}`);
      }
    }

    lines.push('');
    lines.push(`See full task list: [tasks.md](${taskMapping.tasksUrl})`);

    return lines.join('\n');
  }

  /**
   * Build architecture references section
   */
  buildArchitectureSection(architectureDocs: ArchitectureDoc[]): string {
    if (architectureDocs.length === 0) {
      return '';
    }

    const lines: string[] = ['## Architecture'];
    lines.push('');

    // Group by type
    const adrs = architectureDocs.filter(doc => doc.type === 'adr');
    const hlds = architectureDocs.filter(doc => doc.type === 'hld');
    const diagrams = architectureDocs.filter(doc => doc.type === 'diagram');

    if (adrs.length > 0) {
      lines.push('**Architecture Decision Records (ADRs)**:');
      for (const adr of adrs) {
        lines.push(`- [${adr.title}](${adr.path})`);
      }
      lines.push('');
    }

    if (hlds.length > 0) {
      lines.push('**High-Level Design (HLD)**:');
      for (const hld of hlds) {
        lines.push(`- [${hld.title}](${hld.path})`);
      }
      lines.push('');
    }

    if (diagrams.length > 0) {
      lines.push('**Diagrams**:');
      for (const diagram of diagrams) {
        lines.push(`- [${diagram.title}](${diagram.path})`);
      }
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  /**
   * Build source links section
   */
  buildSourceLinksSection(sourceLinks: SourceLinks): string {
    const lines: string[] = ['## Source'];
    lines.push('');

    if (sourceLinks.spec) {
      lines.push(`- [spec.md](${sourceLinks.spec})`);
    }

    if (sourceLinks.plan) {
      lines.push(`- [plan.md](${sourceLinks.plan})`);
    }

    if (sourceLinks.tasks) {
      lines.push(`- [tasks.md](${sourceLinks.tasks})`);
    }

    return lines.join('\n');
  }
}
