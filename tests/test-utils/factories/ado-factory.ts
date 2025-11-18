/**
 * ADOFactory - Builder pattern for creating test Azure DevOps objects
 *
 * Usage:
 * ```typescript
 * const workItem = new ADOFactory()
 *   .workItem()
 *   .withId(12345)
 *   .withTitle('Test Work Item')
 *   .withType('User Story')
 *   .build();
 * ```
 */

import workItemFixture from '../../fixtures/ado/work-item.json';
import sprintFixture from '../../fixtures/ado/sprint.json';
import boardFixture from '../../fixtures/ado/board.json';

export class ADOFactory {
  private data: any;
  private resourceType: 'work-item' | 'sprint' | 'board' = 'work-item';

  constructor() {
    this.data = JSON.parse(JSON.stringify(workItemFixture));
  }

  /**
   * Start building an ADO work item
   */
  workItem(): this {
    this.resourceType = 'work-item';
    this.data = JSON.parse(JSON.stringify(workItemFixture));
    return this;
  }

  /**
   * Start building an ADO sprint
   */
  sprint(): this {
    this.resourceType = 'sprint';
    this.data = JSON.parse(JSON.stringify(sprintFixture));
    return this;
  }

  /**
   * Start building an ADO board
   */
  board(): this {
    this.resourceType = 'board';
    this.data = JSON.parse(JSON.stringify(boardFixture));
    return this;
  }

  /**
   * Set work item ID
   */
  withId(id: number): this {
    this.data.id = id;
    return this;
  }

  /**
   * Set work item title
   */
  withTitle(title: string): this {
    if (this.resourceType === 'work-item') {
      this.data.fields['System.Title'] = title;
    } else {
      this.data.name = title;
    }
    return this;
  }

  /**
   * Set work item type (Epic, Feature, User Story, Task, Bug)
   */
  withType(type: 'Epic' | 'Feature' | 'User Story' | 'Task' | 'Bug'): this {
    if (this.resourceType === 'work-item') {
      this.data.fields['System.WorkItemType'] = type;
    }
    return this;
  }

  /**
   * Set work item state
   */
  withState(state: string): this {
    if (this.resourceType === 'work-item') {
      this.data.fields['System.State'] = state;
    } else if (this.resourceType === 'sprint') {
      this.data.attributes.timeFrame = state;
    }
    return this;
  }

  /**
   * Set work item description
   */
  withDescription(description: string): this {
    if (this.resourceType === 'work-item') {
      this.data.fields['System.Description'] = description;
    }
    return this;
  }

  /**
   * Set work item assignee
   */
  withAssignedTo(assignee: string): this {
    if (this.resourceType === 'work-item') {
      this.data.fields['System.AssignedTo'] = {
        displayName: assignee,
        uniqueName: assignee.toLowerCase().replace(' ', '.') + '@example.com',
      };
    }
    return this;
  }

  /**
   * Set work item tags
   */
  withTags(tags: string[]): this {
    if (this.resourceType === 'work-item') {
      this.data.fields['System.Tags'] = tags.join('; ');
    }
    return this;
  }

  /**
   * Set iteration path (sprint)
   */
  withIterationPath(path: string): this {
    if (this.resourceType === 'work-item') {
      this.data.fields['System.IterationPath'] = path;
    } else if (this.resourceType === 'sprint') {
      this.data.path = path;
    }
    return this;
  }

  /**
   * Set area path
   */
  withAreaPath(path: string): this {
    if (this.resourceType === 'work-item') {
      this.data.fields['System.AreaPath'] = path;
    }
    return this;
  }

  /**
   * Set sprint dates
   */
  withDates(startDate: string, finishDate: string): this {
    if (this.resourceType === 'sprint') {
      this.data.attributes.startDate = startDate;
      this.data.attributes.finishDate = finishDate;
    }
    return this;
  }

  /**
   * Set board columns
   */
  withColumns(columns: Array<{ name: string; itemLimit?: number }>): this {
    if (this.resourceType === 'board') {
      this.data.columns = columns;
    }
    return this;
  }

  /**
   * Set custom field
   */
  withCustomField(fieldName: string, value: any): this {
    if (this.resourceType === 'work-item') {
      this.data.fields[fieldName] = value;
    }
    return this;
  }

  /**
   * Build the final ADO object
   */
  build(): any {
    return this.data;
  }

  /**
   * Reset to default state
   */
  reset(): this {
    this.data = JSON.parse(JSON.stringify(workItemFixture));
    this.resourceType = 'work-item';
    return this;
  }
}
