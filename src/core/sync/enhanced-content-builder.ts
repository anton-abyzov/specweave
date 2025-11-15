import { SpecContent, UserStory, TaskLink, AcceptanceCriterion, EnhancedSpecContent } from './types';

// Re-export for backward compatibility
export { EnhancedSpecContent };

/**
 * Enhanced Content Builder
 *
 * Builds rich external issue descriptions with full spec content
 * for GitHub, JIRA, and Azure DevOps integrations.
 */
export class EnhancedContentBuilder {
  /**
   * Build complete external description from spec
   */
  public buildExternalDescription(spec: SpecContent): string {
    const sections: string[] = [];

    // 1. Executive Summary
    sections.push(this.buildSummarySection(spec));

    // 2. User Stories (collapsible in GitHub)
    sections.push(this.buildUserStoriesSection(spec.userStories));

    // 3. Linked Tasks (if available)
    if (spec.tasks && spec.tasks.length > 0) {
      sections.push(this.buildTasksSection(spec.tasks));
    }

    // 4. Architecture References (if available)
    if (spec.architectureDocs && spec.architectureDocs.length > 0) {
      sections.push(this.buildArchitectureSection(spec.architectureDocs));
    }

    // 5. Source Links (if available)
    if (spec.sourceLinks) {
      sections.push(this.buildSourceLinksSection(spec.sourceLinks));
    }

    return sections.join('\n\n');
  }

  /**
   * Build summary section
   */
  public buildSummarySection(spec: SpecContent | { summary: string }): string {
    return `## Summary\n\n${spec.summary}`;
  }

  /**
   * Build user stories section with collapsible details
   */
  public buildUserStoriesSection(userStories: UserStory[]): string {
    if (!userStories || userStories.length === 0) {
      return `## User Stories\n\nNo user stories defined.`;
    }

    const sections: string[] = ['## User Stories'];

    for (const story of userStories) {
      const storySection = this.buildUserStoryDetails(story);
      sections.push(storySection);
    }

    return sections.join('\n\n');
  }

  /**
   * Build individual user story with collapsible details
   */
  private buildUserStoryDetails(story: UserStory): string {
    const lines: string[] = [];

    // Use GitHub collapsible format
    lines.push(`<details>`);
    lines.push(`<summary><strong>${story.id}: ${story.title}</strong></summary>`);
    lines.push('');

    // Add description if available
    if (story.description) {
      lines.push(`**Description**: ${story.description}`);
      lines.push('');
    }

    // Acceptance Criteria
    if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      lines.push('**Acceptance Criteria**:');
      lines.push('');

      // Group by priority
      const byPriority = this.groupAcceptanceCriteriaByPriority(story.acceptanceCriteria);

      for (const priority of ['P1', 'P2', 'P3', 'OTHER']) {
        const criteria = byPriority[priority];
        if (criteria && criteria.length > 0) {
          for (const ac of criteria) {
            const priorityLabel = ac.priority ? ` (${ac.priority})` : '';
            const checkbox = ac.completed ? '[x]' : '[ ]';
            lines.push(`- ${checkbox} **${ac.id}**${priorityLabel}: ${ac.description}`);
          }
        }
      }
    } else {
      lines.push('**Acceptance Criteria**: No acceptance criteria defined.');
    }

    lines.push('');
    lines.push('</details>');

    return lines.join('\n');
  }

  /**
   * Group acceptance criteria by priority
   */
  private groupAcceptanceCriteriaByPriority(criteria: AcceptanceCriterion[]): Record<string, AcceptanceCriterion[]> {
    const grouped: Record<string, AcceptanceCriterion[]> = {
      P1: [],
      P2: [],
      P3: [],
      OTHER: []  // For criteria without priority or with other priorities
    };

    for (const ac of criteria) {
      const priority = ac.priority || 'OTHER';
      if (priority in grouped) {
        grouped[priority].push(ac);
      } else {
        grouped.OTHER.push(ac);
      }
    }

    return grouped;
  }

  /**
   * Build tasks section with GitHub issue links
   * Supports both simple array and options object for backward compatibility
   */
  public buildTasksSection(
    tasks: TaskLink[] | any,
    ownerOrOptions?: string | { showCheckboxes?: boolean; showProgressBar?: boolean; showCompletionStatus?: boolean; provider?: string },
    repo?: string
  ): string {
    // Handle both old and new signatures
    let taskList: TaskLink[];
    let owner: string | undefined;
    let options: { showCheckboxes?: boolean; showProgressBar?: boolean; showCompletionStatus?: boolean; provider?: string } = {};

    if (Array.isArray(tasks)) {
      taskList = tasks;
      if (typeof ownerOrOptions === 'string') {
        owner = ownerOrOptions;
      } else if (typeof ownerOrOptions === 'object') {
        options = ownerOrOptions;
      }
    } else {
      // tasks is actually taskMapping object
      taskList = tasks?.tasks || [];
      if (typeof ownerOrOptions === 'object') {
        options = ownerOrOptions;
        owner = tasks?.owner;
        repo = tasks?.repo;
      }
    }

    if (!taskList || taskList.length === 0) {
      return `## Tasks\n\nNo tasks defined.`;
    }

    const lines: string[] = ['## Tasks'];
    lines.push('');

    // Add progress bar if requested
    if (options.showProgressBar && taskList.length > 0) {
      const completed = taskList.filter(t => t.completed).length;
      const total = taskList.length;
      const percentage = Math.round((completed / total) * 100);
      lines.push(`**Progress**: ${completed}/${total} tasks (${percentage}%)`);
      lines.push('');
    }

    for (const task of taskList) {
      let taskLine = '';

      // Add checkbox if requested
      if (options.showCheckboxes) {
        taskLine += task.completed ? '- [x] ' : '- [ ] ';
      } else {
        taskLine += '- ';
      }

      taskLine += `**${task.id}**: ${task.title}`;

      // Add GitHub issue link if available
      if (task.githubIssue && owner && repo) {
        const issueUrl = `https://github.com/${owner}/${repo}/issues/${task.githubIssue}`;
        taskLine += ` ([#${task.githubIssue}](${issueUrl}))`;
      }

      // Add user story references
      if (task.userStoryIds && task.userStoryIds.length > 0) {
        taskLine += ` → Implements: ${task.userStoryIds.join(', ')}`;
      }

      // Add completion status if requested
      if (options.showCompletionStatus && task.completed) {
        taskLine += ' ✅';
      }

      lines.push(taskLine);
    }

    return lines.join('\n');
  }

  /**
   * Build architecture section
   */
  public buildArchitectureSection(docs: string[]): string {
    const lines: string[] = ['## Architecture'];
    lines.push('');
    lines.push('Related architecture documentation:');
    lines.push('');

    for (const doc of docs) {
      const fileName = doc.split('/').pop() || doc;
      lines.push(`- [${fileName}](${doc})`);
    }

    return lines.join('\n');
  }

  /**
   * Build source links section
   */
  public buildSourceLinksSection(sourceLinks: { spec: string; plan: string; tasks: string }): string {
    const lines: string[] = ['## Source Files'];
    lines.push('');
    lines.push(`- **Specification**: [spec.md](${sourceLinks.spec})`);
    lines.push(`- **Technical Plan**: [plan.md](${sourceLinks.plan})`);
    lines.push(`- **Task List**: [tasks.md](${sourceLinks.tasks})`);

    return lines.join('\n');
  }
}
