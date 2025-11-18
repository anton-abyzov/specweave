/**
 * JiraFactory - Builder pattern for creating test Jira API objects
 *
 * Usage:
 * ```typescript
 * const issue = new JiraFactory()
 *   .issue()
 *   .withKey('SPEC-999')
 *   .withSummary('Test Issue')
 *   .withType('Story')
 *   .build();
 * ```
 */

import issueFixture from '../../fixtures/jira/issue.json';
import epicFixture from '../../fixtures/jira/epic.json';
import sprintFixture from '../../fixtures/jira/sprint.json';

export class JiraFactory {
  private data: any;
  private resourceType: 'issue' | 'epic' | 'sprint' = 'issue';

  constructor() {
    this.data = JSON.parse(JSON.stringify(issueFixture));
  }

  /**
   * Start building a Jira issue
   */
  issue(): this {
    this.resourceType = 'issue';
    this.data = JSON.parse(JSON.stringify(issueFixture));
    return this;
  }

  /**
   * Start building a Jira epic
   */
  epic(): this {
    this.resourceType = 'epic';
    this.data = JSON.parse(JSON.stringify(epicFixture));
    return this;
  }

  /**
   * Start building a Jira sprint
   */
  sprint(): this {
    this.resourceType = 'sprint';
    this.data = JSON.parse(JSON.stringify(sprintFixture));
    return this;
  }

  /**
   * Set issue key (e.g., 'SPEC-999')
   */
  withKey(key: string): this {
    this.data.key = key;
    return this;
  }

  /**
   * Set issue ID
   */
  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  /**
   * Set issue summary (title)
   */
  withSummary(summary: string): this {
    if (this.resourceType === 'issue' || this.resourceType === 'epic') {
      this.data.fields.summary = summary;
    } else if (this.resourceType === 'sprint') {
      this.data.name = summary;
    }
    return this;
  }

  /**
   * Set issue type (Story, Task, Bug, Epic)
   */
  withType(type: 'Story' | 'Task' | 'Bug' | 'Epic'): this {
    if (this.resourceType === 'issue' || this.resourceType === 'epic') {
      this.data.fields.issuetype = {
        name: type,
        id: type === 'Epic' ? '10000' : type === 'Story' ? '10001' : '10002',
      };
    }
    return this;
  }

  /**
   * Set status
   */
  withStatus(status: string): this {
    if (this.resourceType === 'issue' || this.resourceType === 'epic') {
      this.data.fields.status = {
        name: status,
        id: '10001',
      };
    } else if (this.resourceType === 'sprint') {
      this.data.state = status;
    }
    return this;
  }

  /**
   * Set priority
   */
  withPriority(priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest'): this {
    if (this.resourceType === 'issue' || this.resourceType === 'epic') {
      this.data.fields.priority = {
        name: priority,
        id: priority === 'Highest' ? '1' : '3',
      };
    }
    return this;
  }

  /**
   * Set description
   */
  withDescription(description: string): this {
    if (this.resourceType === 'issue' || this.resourceType === 'epic') {
      this.data.fields.description = description;
    }
    return this;
  }

  /**
   * Set assignee
   */
  withAssignee(assignee: string): this {
    if (this.resourceType === 'issue' || this.resourceType === 'epic') {
      this.data.fields.assignee = {
        displayName: assignee,
        emailAddress: assignee.toLowerCase().replace(' ', '.') + '@example.com',
      };
    }
    return this;
  }

  /**
   * Set labels
   */
  withLabels(labels: string[]): this {
    if (this.resourceType === 'issue' || this.resourceType === 'epic') {
      this.data.fields.labels = labels;
    }
    return this;
  }

  /**
   * Add single label
   */
  addLabel(label: string): this {
    if (this.resourceType === 'issue' || this.resourceType === 'epic') {
      if (!this.data.fields.labels) {
        this.data.fields.labels = [];
      }
      this.data.fields.labels.push(label);
    }
    return this;
  }

  /**
   * Set sprint
   */
  withSprint(sprintId: number, sprintName: string): this {
    if (this.resourceType === 'issue') {
      this.data.fields.sprint = {
        id: sprintId,
        name: sprintName,
      };
    }
    return this;
  }

  /**
   * Set epic link (for issues)
   */
  withEpicLink(epicKey: string): this {
    if (this.resourceType === 'issue') {
      this.data.fields.customfield_10014 = epicKey;
    }
    return this;
  }

  /**
   * Set epic name (for epics)
   */
  withEpicName(name: string): this {
    if (this.resourceType === 'epic') {
      this.data.fields.customfield_10011 = name;
    }
    return this;
  }

  /**
   * Set story points
   */
  withStoryPoints(points: number): this {
    if (this.resourceType === 'issue') {
      this.data.fields.customfield_10016 = points;
    }
    return this;
  }

  /**
   * Set sprint dates
   */
  withDates(startDate: string, endDate: string): this {
    if (this.resourceType === 'sprint') {
      this.data.startDate = startDate;
      this.data.endDate = endDate;
    }
    return this;
  }

  /**
   * Set custom field
   */
  withCustomField(fieldName: string, value: any): this {
    if (this.resourceType === 'issue' || this.resourceType === 'epic') {
      this.data.fields[fieldName] = value;
    }
    return this;
  }

  /**
   * Build the final Jira object
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
