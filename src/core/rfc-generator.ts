/**
 * RFC Generator
 *
 * Generates RFC documents with proper structure based on source system (Jira, ADO, GitHub).
 * Adapts to project type and organizes work items appropriately.
 */

import * as fs from 'fs';
import * as path from 'path';

export type RFCSource = 'jira' | 'ado' | 'github' | 'manual';

export interface WorkItem {
  type: 'story' | 'bug' | 'task' | 'epic';
  id: string;
  title: string;
  description?: string;
  priority?: string;
  source_key?: string;  // e.g., JIRA-123, 12345 (ADO), #123 (GitHub)
  source_url?: string;
}

export interface RFCMetadata {
  incrementId: string;
  title: string;
  status: 'draft' | 'review' | 'approved' | 'deprecated';
  source: RFCSource;
  created: string;
}

export interface RFCSourceMetadata {
  source_type: RFCSource;
  epic_key?: string;      // For Jira
  epic_url?: string;
  work_item_id?: string;  // For ADO
  work_item_url?: string;
  issue_number?: string;  // For GitHub
  issue_url?: string;
  pull_request?: string;
  repository?: string;
}

export interface RFCContent {
  metadata: RFCMetadata;
  sourceMetadata?: RFCSourceMetadata;
  summary: string;
  motivation: string;
  stories: WorkItem[];
  bugs: WorkItem[];
  tasks: WorkItem[];
  alternatives?: string;
}

export class RFCGenerator {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Generate RFC document
   */
  public async generateRFC(content: RFCContent): Promise<string> {
    const rfcFolder = path.join(this.projectRoot, '.specweave', 'docs', 'rfcs');
    this.ensureDir(rfcFolder);

    const rfcFileName = this.generateRFCFileName(content.metadata);
    const rfcPath = path.join(rfcFolder, rfcFileName);

    const rfcContent = this.buildRFCContent(content);
    fs.writeFileSync(rfcPath, rfcContent, 'utf-8');

    return rfcPath;
  }

  /**
   * Build RFC content with proper structure
   */
  private buildRFCContent(content: RFCContent): string {
    const { metadata, sourceMetadata, summary, motivation, stories, bugs, tasks, alternatives } = content;

    let rfc = this.generateHeader(metadata, sourceMetadata);
    rfc += this.generateSummary(summary);
    rfc += this.generateMotivation(motivation);
    rfc += this.generateDetailedDesign(stories, bugs, tasks, sourceMetadata);
    rfc += this.generateAlternatives(alternatives);
    rfc += this.generateImplementationPlan(metadata.incrementId);

    return rfc;
  }

  /**
   * Generate RFC header with metadata
   */
  private generateHeader(metadata: RFCMetadata, sourceMetadata?: RFCSourceMetadata): string {
    let header = `# RFC ${metadata.incrementId}: ${metadata.title}\n\n`;
    header += `**Status**: ${this.capitalizeFirst(metadata.status)}\n`;
    header += `**Created**: ${metadata.created}\n`;

    // Add source-specific metadata
    if (sourceMetadata) {
      switch (sourceMetadata.source_type) {
        case 'jira':
          if (sourceMetadata.epic_key && sourceMetadata.epic_url) {
            header += `**Jira Epic**: [${sourceMetadata.epic_key}](${sourceMetadata.epic_url})\n`;
          }
          break;
        case 'ado':
          if (sourceMetadata.work_item_id && sourceMetadata.work_item_url) {
            header += `**ADO Work Item**: [#${sourceMetadata.work_item_id}](${sourceMetadata.work_item_url})\n`;
          }
          break;
        case 'github':
          if (sourceMetadata.issue_number && sourceMetadata.issue_url) {
            header += `**GitHub Issue**: [#${sourceMetadata.issue_number}](${sourceMetadata.issue_url})\n`;
          }
          if (sourceMetadata.repository) {
            header += `**Repository**: ${sourceMetadata.repository}\n`;
          }
          break;
      }
    }

    header += '\n';
    return header;
  }

  /**
   * Generate Summary section
   */
  private generateSummary(summary: string): string {
    return `## Summary\n\n${summary}\n\n`;
  }

  /**
   * Generate Motivation section
   */
  private generateMotivation(motivation: string): string {
    return `## Motivation\n\n${motivation}\n\n`;
  }

  /**
   * Generate Detailed Design section with work items grouped by type
   */
  private generateDetailedDesign(
    stories: WorkItem[],
    bugs: WorkItem[],
    tasks: WorkItem[],
    sourceMetadata?: RFCSourceMetadata
  ): string {
    let design = `## Detailed Design\n\n`;

    // User Stories
    if (stories.length > 0) {
      design += `### User Stories\n\n`;
      stories.forEach((story, index) => {
        design += `#### ${index + 1}. ${story.title}\n\n`;
        if (story.description) {
          design += `${story.description}\n\n`;
        }
        if (story.source_key && story.source_url) {
          design += `**${this.getSourceLabel(sourceMetadata)}**: [${story.source_key}](${story.source_url})\n\n`;
        }
      });
    }

    // Bug Fixes
    if (bugs.length > 0) {
      design += `### Bug Fixes\n\n`;
      bugs.forEach((bug, index) => {
        design += `#### ${index + 1}. ${bug.title}\n\n`;
        if (bug.description) {
          design += `${bug.description}\n\n`;
        }
        if (bug.priority) {
          design += `**Priority**: ${bug.priority}`;
        }
        if (bug.source_key && bug.source_url) {
          design += ` | **${this.getSourceLabel(sourceMetadata)}**: [${bug.source_key}](${bug.source_url})`;
        }
        design += '\n\n';
      });
    }

    // Technical Tasks
    if (tasks.length > 0) {
      design += `### Technical Tasks\n\n`;
      tasks.forEach((task, index) => {
        design += `#### ${index + 1}. ${task.title}\n\n`;
        if (task.description) {
          design += `${task.description}\n\n`;
        }
        if (task.source_key && task.source_url) {
          design += `**${this.getSourceLabel(sourceMetadata)}**: [${task.source_key}](${task.source_url})\n\n`;
        }
      });
    }

    return design;
  }

  /**
   * Generate Alternatives Considered section
   */
  private generateAlternatives(alternatives?: string): string {
    let alt = `## Alternatives Considered\n\n`;
    if (alternatives) {
      alt += `${alternatives}\n\n`;
    } else {
      alt += `(To be filled in during design phase)\n\n`;
    }
    return alt;
  }

  /**
   * Generate Implementation Plan section
   */
  private generateImplementationPlan(incrementId: string): string {
    return `## Implementation Plan\n\nSee increment ${incrementId} in \`.specweave/increments/${incrementId}/\`\n`;
  }

  /**
   * Generate RFC file name
   */
  private generateRFCFileName(metadata: RFCMetadata): string {
    const slug = this.slugify(metadata.title);
    return `rfc-${metadata.incrementId}-${slug}.md`;
  }

  /**
   * Get source label based on source type
   */
  private getSourceLabel(sourceMetadata?: RFCSourceMetadata): string {
    if (!sourceMetadata) return 'Source';

    switch (sourceMetadata.source_type) {
      case 'jira':
        return 'Jira';
      case 'ado':
        return 'ADO';
      case 'github':
        return 'GitHub';
      default:
        return 'Source';
    }
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Slugify string for file names
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50);
  }

  /**
   * Ensure directory exists
   */
  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
