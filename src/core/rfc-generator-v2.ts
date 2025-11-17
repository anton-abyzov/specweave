/**
 * RFC Generator V2 - Universal Flexible Structure Support
 *
 * Modern, multi-platform RFC generator that adapts to any project management structure:
 * - Jira: Epic → Story → Sub-task
 * - Azure DevOps: Feature → User Story → Task
 * - GitHub: Milestone → Issue (or flat issues)
 * - Custom: Any configurable hierarchy
 *
 * Key Features:
 * - Flexible work item types (any string: story, bug, issue, feature, user story, etc.)
 * - 6 grouping strategies: by_type, by_parent, by_priority, by_label, flat, custom
 * - Parent-child relationships (Epic, Feature, Milestone)
 * - Labels/tags support (GitHub-style)
 * - Auto-detection via ProjectStructureDetector
 * - Extensible metadata
 *
 * This is the official RFC generator (V1 deprecated).
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectStructure, ProjectStructureDetector } from './project-structure-detector.js';

export type RFCSource = 'jira' | 'ado' | 'github' | 'manual';

/**
 * Flexible work item that can represent any type
 */
export interface FlexibleWorkItem {
  type: string;  // story, bug, task, issue, feature, etc.
  id: string;
  title: string;
  description?: string;
  priority?: string;
  source_key?: string;
  source_url?: string;
  parent?: {
    type: string;  // epic, feature, milestone, etc.
    key: string;
    title: string;
    url?: string;
  };
  labels?: string[];
  metadata?: Record<string, any>;
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
  // Parent work item (Epic, Feature, Milestone, etc.)
  parent_type?: string;    // 'Epic', 'Feature', 'Milestone'
  parent_key?: string;
  parent_url?: string;
  parent_title?: string;
  // Additional metadata
  repository?: string;
  project?: string;
  board?: string;
}

export interface FlexibleRFCContent {
  metadata: RFCMetadata;
  sourceMetadata?: RFCSourceMetadata;
  summary: string;
  motivation: string;
  workItems: FlexibleWorkItem[];
  alternatives?: string;
  projectStructure?: ProjectStructure;  // Auto-detected or provided
}

/**
 * Grouped work items for display
 */
interface GroupedWorkItems {
  groupName: string;
  displayName: string;
  items: FlexibleWorkItem[];
  metadata?: Record<string, any>;
}

export class FlexibleRFCGenerator {
  private projectRoot: string;
  private structureDetector: ProjectStructureDetector;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.structureDetector = new ProjectStructureDetector(projectRoot);
  }

  /**
   * Generate RFC document with flexible structure support
   */
  public async generateRFC(content: FlexibleRFCContent): Promise<string> {
    const rfcFolder = path.join(this.projectRoot, '.specweave', 'docs', 'rfcs');
    this.ensureDir(rfcFolder);

    // Auto-detect project structure if not provided
    const structure = content.projectStructure || await this.structureDetector.detectStructure();

    const rfcFileName = this.generateRFCFileName(content.metadata);
    const rfcPath = path.join(rfcFolder, rfcFileName);

    const rfcContent = this.buildRFCContent(content, structure);
    fs.writeFileSync(rfcPath, rfcContent, 'utf-8');

    return rfcPath;
  }

  /**
   * Build RFC content with structure-aware formatting
   */
  private buildRFCContent(content: FlexibleRFCContent, structure: ProjectStructure): string {
    let rfc = this.generateHeader(content.metadata, content.sourceMetadata, structure);
    rfc += this.generateSummary(content.summary);
    rfc += this.generateMotivation(content.motivation);
    rfc += this.generateDetailedDesign(content.workItems, structure, content.sourceMetadata);
    rfc += this.generateAlternatives(content.alternatives);
    rfc += this.generateImplementationPlan(content.metadata.incrementId);

    return rfc;
  }

  /**
   * Generate header with source-specific metadata
   */
  private generateHeader(
    metadata: RFCMetadata,
    sourceMetadata?: RFCSourceMetadata,
    structure?: ProjectStructure
  ): string {
    let header = `# RFC ${metadata.incrementId}: ${metadata.title}\n\n`;
    header += `**Status**: ${this.capitalizeFirst(metadata.status)}\n`;
    header += `**Created**: ${metadata.created}\n`;

    if (sourceMetadata && structure) {
      // Show parent work item link (Epic, Feature, Milestone, etc.)
      if (sourceMetadata.parent_key && sourceMetadata.parent_url) {
        const parentType = sourceMetadata.parent_type || structure.workItemTypes.parentLevel || 'Parent';
        header += `**${parentType}**: [${sourceMetadata.parent_key}](${sourceMetadata.parent_url})`;
        if (sourceMetadata.parent_title) {
          header += ` - ${sourceMetadata.parent_title}`;
        }
        header += '\n';
      }

      // Add repository/project context
      if (sourceMetadata.repository) {
        header += `**Repository**: ${sourceMetadata.repository}\n`;
      }
      if (sourceMetadata.project) {
        header += `**Project**: ${sourceMetadata.project}\n`;
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
   * Generate Detailed Design with flexible grouping
   */
  private generateDetailedDesign(
    workItems: FlexibleWorkItem[],
    structure: ProjectStructure,
    sourceMetadata?: RFCSourceMetadata
  ): string {
    let design = `## Detailed Design\n\n`;

    // Group work items according to strategy
    const grouped = this.groupWorkItems(workItems, structure);

    // Generate sections for each group
    grouped.forEach(group => {
      design += `### ${group.displayName}\n\n`;

      group.items.forEach((item, index) => {
        design += `#### ${index + 1}. ${item.title}\n\n`;

        if (item.description) {
          design += `${item.description}\n\n`;
        }

        // Add metadata line
        const metadataItems: string[] = [];

        if (item.priority) {
          metadataItems.push(`**Priority**: ${item.priority}`);
        }

        if (item.parent && structure.groupingStrategy !== 'by_parent') {
          metadataItems.push(`**${item.parent.type}**: ${item.parent.title}`);
        }

        if (item.source_key && item.source_url) {
          const sourceLabel = this.getSourceLabel(sourceMetadata?.source_type);
          metadataItems.push(`**${sourceLabel}**: [${item.source_key}](${item.source_url})`);
        }

        if (item.labels && item.labels.length > 0) {
          metadataItems.push(`**Labels**: ${item.labels.join(', ')}`);
        }

        if (metadataItems.length > 0) {
          design += metadataItems.join(' | ') + '\n\n';
        }
      });
    });

    return design;
  }

  /**
   * Group work items according to project structure
   */
  private groupWorkItems(
    items: FlexibleWorkItem[],
    structure: ProjectStructure
  ): GroupedWorkItems[] {
    switch (structure.groupingStrategy) {
      case 'by_type':
        return this.groupByType(items, structure);

      case 'by_parent':
        return this.groupByParent(items, structure);

      case 'by_priority':
        return this.groupByPriority(items);

      case 'by_label':
        return this.groupByLabel(items);

      case 'flat':
        return [{
          groupName: 'all',
          displayName: 'Work Items',
          items
        }];

      case 'custom':
        if (structure.customGrouping) {
          const customGroups = structure.customGrouping(items);
          return Object.entries(customGroups).map(([name, groupItems]) => ({
            groupName: name,
            displayName: this.formatGroupName(name),
            items: groupItems
          }));
        }
        return this.groupByType(items, structure);

      default:
        return this.groupByType(items, structure);
    }
  }

  /**
   * Group by work item type (story, bug, task, issue, etc.)
   */
  private groupByType(items: FlexibleWorkItem[], structure: ProjectStructure): GroupedWorkItems[] {
    const typeMap = new Map<string, FlexibleWorkItem[]>();

    items.forEach(item => {
      const type = item.type.toLowerCase();
      if (!typeMap.has(type)) {
        typeMap.set(type, []);
      }
      typeMap.get(type)!.push(item);
    });

    // Define display order and names
    const typeDisplayNames: Record<string, string> = {
      story: 'User Stories',
      'user story': 'User Stories',
      bug: 'Bug Fixes',
      task: 'Technical Tasks',
      issue: 'Issues',
      feature: 'Features',
      epic: 'Epics',
      subtask: 'Sub-tasks',
      'sub-task': 'Sub-tasks'
    };

    const typeOrder = ['story', 'user story', 'feature', 'bug', 'task', 'issue', 'subtask', 'sub-task'];

    const groups: GroupedWorkItems[] = [];

    // Add groups in order
    typeOrder.forEach(type => {
      if (typeMap.has(type)) {
        groups.push({
          groupName: type,
          displayName: typeDisplayNames[type] || this.formatGroupName(type),
          items: typeMap.get(type)!
        });
        typeMap.delete(type);
      }
    });

    // Add remaining types not in predefined order
    typeMap.forEach((groupItems, type) => {
      groups.push({
        groupName: type,
        displayName: this.formatGroupName(type),
        items: groupItems
      });
    });

    return groups;
  }

  /**
   * Group by parent (Epic, Feature, Milestone, etc.)
   */
  private groupByParent(items: FlexibleWorkItem[], structure: ProjectStructure): GroupedWorkItems[] {
    const parentMap = new Map<string, FlexibleWorkItem[]>();
    const noParent: FlexibleWorkItem[] = [];

    items.forEach(item => {
      if (item.parent) {
        const parentKey = item.parent.key;
        if (!parentMap.has(parentKey)) {
          parentMap.set(parentKey, []);
        }
        parentMap.get(parentKey)!.push(item);
      } else {
        noParent.push(item);
      }
    });

    const groups: GroupedWorkItems[] = [];

    // Add parent groups
    parentMap.forEach((groupItems, parentKey) => {
      const firstItem = groupItems[0];
      const parentType = firstItem.parent?.type || structure.workItemTypes.parentLevel || 'Parent';
      const parentTitle = firstItem.parent?.title || parentKey;

      groups.push({
        groupName: parentKey,
        displayName: `${parentType}: ${parentTitle}`,
        items: groupItems,
        metadata: {
          parentKey,
          parentType,
          parentUrl: firstItem.parent?.url
        }
      });
    });

    // Add ungrouped items
    if (noParent.length > 0) {
      groups.push({
        groupName: 'ungrouped',
        displayName: 'Other Work Items',
        items: noParent
      });
    }

    return groups;
  }

  /**
   * Group by priority
   */
  private groupByPriority(items: FlexibleWorkItem[]): GroupedWorkItems[] {
    const priorityMap = new Map<string, FlexibleWorkItem[]>();

    items.forEach(item => {
      const priority = item.priority || 'None';
      if (!priorityMap.has(priority)) {
        priorityMap.set(priority, []);
      }
      priorityMap.get(priority)!.push(item);
    });

    const priorityOrder = ['P1', 'P2', 'P3', 'High', 'Medium', 'Low', 'None'];
    const groups: GroupedWorkItems[] = [];

    priorityOrder.forEach(priority => {
      if (priorityMap.has(priority)) {
        groups.push({
          groupName: priority,
          displayName: `Priority: ${priority}`,
          items: priorityMap.get(priority)!
        });
        priorityMap.delete(priority);
      }
    });

    // Add remaining priorities
    priorityMap.forEach((groupItems, priority) => {
      groups.push({
        groupName: priority,
        displayName: `Priority: ${priority}`,
        items: groupItems
      });
    });

    return groups;
  }

  /**
   * Group by labels
   */
  private groupByLabel(items: FlexibleWorkItem[]): GroupedWorkItems[] {
    const labelMap = new Map<string, FlexibleWorkItem[]>();
    const noLabels: FlexibleWorkItem[] = [];

    items.forEach(item => {
      if (item.labels && item.labels.length > 0) {
        item.labels.forEach(label => {
          if (!labelMap.has(label)) {
            labelMap.set(label, []);
          }
          labelMap.get(label)!.push(item);
        });
      } else {
        noLabels.push(item);
      }
    });

    const groups: GroupedWorkItems[] = [];

    labelMap.forEach((groupItems, label) => {
      groups.push({
        groupName: label,
        displayName: `Label: ${label}`,
        items: groupItems
      });
    });

    if (noLabels.length > 0) {
      groups.push({
        groupName: 'unlabeled',
        displayName: 'Unlabeled Items',
        items: noLabels
      });
    }

    return groups;
  }

  /**
   * Generate Alternatives section
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
   * Get source label
   */
  private getSourceLabel(sourceType?: RFCSource): string {
    switch (sourceType) {
      case 'jira': return 'Jira';
      case 'ado': return 'ADO';
      case 'github': return 'GitHub';
      default: return 'Source';
    }
  }

  /**
   * Format group name for display
   */
  private formatGroupName(name: string): string {
    return name
      .split(/[-_\s]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Slugify string
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
