/**
 * GitHubFactory - Builder pattern for creating test GitHub API objects
 *
 * Usage:
 * ```typescript
 * const issue = new GitHubFactory()
 *   .issue()
 *   .withNumber(42)
 *   .withTitle('Test Issue')
 *   .build();
 * ```
 */

import issueFixture from '../../fixtures/github/issue.json';
import prFixture from '../../fixtures/github/pull-request.json';
import commentFixture from '../../fixtures/github/comment.json';
import labelFixture from '../../fixtures/github/label.json';
import milestoneFixture from '../../fixtures/github/milestone.json';

export class GitHubFactory {
  private data: any;
  private resourceType: 'issue' | 'pull-request' | 'comment' | 'label' | 'milestone' = 'issue';

  constructor() {
    this.data = JSON.parse(JSON.stringify(issueFixture));
  }

  /**
   * Start building a GitHub issue
   */
  issue(): this {
    this.resourceType = 'issue';
    this.data = JSON.parse(JSON.stringify(issueFixture));
    return this;
  }

  /**
   * Start building a GitHub pull request
   */
  pullRequest(): this {
    this.resourceType = 'pull-request';
    this.data = JSON.parse(JSON.stringify(prFixture));
    return this;
  }

  /**
   * Start building a GitHub comment
   */
  comment(): this {
    this.resourceType = 'comment';
    this.data = JSON.parse(JSON.stringify(commentFixture));
    return this;
  }

  /**
   * Start building a GitHub label
   */
  label(): this {
    this.resourceType = 'label';
    this.data = JSON.parse(JSON.stringify(labelFixture));
    return this;
  }

  /**
   * Start building a GitHub milestone
   */
  milestone(): this {
    this.resourceType = 'milestone';
    this.data = JSON.parse(JSON.stringify(milestoneFixture));
    return this;
  }

  /**
   * Set issue/PR number
   */
  withNumber(number: number): this {
    this.data.number = number;
    return this;
  }

  /**
   * Set title
   */
  withTitle(title: string): this {
    this.data.title = title;
    return this;
  }

  /**
   * Set body content
   */
  withBody(body: string): this {
    this.data.body = body;
    return this;
  }

  /**
   * Set state (open/closed)
   */
  withState(state: 'open' | 'closed'): this {
    this.data.state = state;
    return this;
  }

  /**
   * Add label(s)
   */
  withLabels(labels: Array<{ name: string; color: string }>): this {
    this.data.labels = labels;
    return this;
  }

  /**
   * Add single label
   */
  addLabel(name: string, color: string = '0E8A16'): this {
    if (!this.data.labels) {
      this.data.labels = [];
    }
    this.data.labels.push({ name, color });
    return this;
  }

  /**
   * Set milestone
   */
  withMilestone(milestone: { number: number; title: string }): this {
    this.data.milestone = milestone;
    return this;
  }

  /**
   * Set assignees
   */
  withAssignees(assignees: string[]): this {
    this.data.assignees = assignees;
    return this;
  }

  /**
   * Set created/updated timestamps
   */
  withTimestamps(created: string, updated?: string): this {
    this.data.created_at = created;
    this.data.updated_at = updated || created;
    return this;
  }

  /**
   * Set HTML URL
   */
  withUrl(url: string): this {
    this.data.html_url = url;
    return this;
  }

  /**
   * For labels: set name and color
   */
  withNameAndColor(name: string, color: string): this {
    this.data.name = name;
    this.data.color = color;
    return this;
  }

  /**
   * For milestones: set due date
   */
  withDueDate(dueDate: string): this {
    this.data.due_on = dueDate;
    return this;
  }

  /**
   * For milestones: set progress
   */
  withProgress(open: number, closed: number): this {
    this.data.open_issues = open;
    this.data.closed_issues = closed;
    return this;
  }

  /**
   * Build the final GitHub object
   */
  build(): any {
    return this.data;
  }

  /**
   * Reset to default state
   */
  reset(): this {
    this.data = JSON.parse(JSON.stringify(issueFixture));
    this.resourceType = 'issue';
    return this;
  }
}
