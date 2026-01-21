/**
 * Markdown Generator for Living Docs
 *
 * Generates markdown content for User Stories imported from external tools.
 * Extracted from item-converter.ts to reduce file size and improve maintainability.
 *
 * @module importers/markdown-generator
 */

import type { ExternalItem } from './external-importer.js';

/**
 * Task data for checkbox rendering (v0.30.3+)
 */
export interface TaskData {
  /** Task ID (e.g., "T-001") */
  id: string;
  /** Task title/description */
  title: string;
  /** Task status - determines checkbox state */
  status: 'pending' | 'in_progress' | 'completed' | 'done' | 'closed';
}

/**
 * User Story markdown data
 */
export interface UserStoryMarkdownData {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority?: string;
  status: string;
  originBadge: string;
  /** Tasks as checkbox items (v0.30.3+) */
  tasks?: TaskData[];
  metadata: {
    externalId: string;
    externalUrl: string;
    externalPlatform: string;
    importedAt: string;
    createdAt: string;
    updatedAt: string;
    labels: string[];
    sourceRepo?: string;
    // Parent tracking (for re-import hierarchy updates)
    parentId?: string;
    featureId?: string;
    isOrphan?: boolean;
    adoWorkItemType?: string;
    adoAreaPath?: string;
  };
}

/**
 * Platform display names and emojis
 */
const PLATFORM_INFO: Record<string, { emoji: string; name: string }> = {
  'github': { emoji: '🔗', name: 'GitHub' },
  'jira': { emoji: '🔗', name: 'JIRA' },
  'ado': { emoji: '🔗', name: 'Azure DevOps' }
};

/**
 * Status mapping from external to SpecWeave format
 */
const STATUS_MAP: Record<string, string> = {
  'open': 'Open',
  'in-progress': 'In Progress',
  'completed': 'Completed',
  'closed': 'Completed'
};

/**
 * MarkdownGenerator - Generates markdown for living docs
 */
export class MarkdownGenerator {
  /**
   * Generate origin badge for living docs
   */
  generateOriginBadge(item: ExternalItem): string {
    const platform = PLATFORM_INFO[item.platform] || { emoji: '🔗', name: item.platform };

    // Extract issue/ticket number from external ID
    // v0.29+ format: github#owner/repo#123 → extract "123"
    // Legacy format: github#123 → extract "123"
    let issueNumber = item.id;
    const newFormatMatch = item.id.match(/#(\d+)$/);
    if (newFormatMatch) {
      issueNumber = newFormatMatch[1];
    } else {
      issueNumber = item.id.replace(/^(GITHUB|JIRA|ADO)-/, '');
    }

    return `${platform.emoji} [${platform.name} #${issueNumber}](${item.url})`;
  }

  /**
   * Map external status to SpecWeave status
   */
  mapStatus(externalStatus: ExternalItem['status']): string {
    return STATUS_MAP[externalStatus] || 'Open';
  }

  /**
   * Generate markdown content for living docs User Story
   * CRITICAL: Includes parent tracking info for re-import hierarchy updates
   */
  generateUserStoryMarkdown(data: UserStoryMarkdownData): string {
    const parts: string[] = [];

    // Title
    parts.push(`# ${data.id}: ${data.title}`);
    parts.push('');

    // Origin badge
    parts.push(`**Origin**: ${data.originBadge}`);
    parts.push('');

    // Status and Priority
    parts.push(`**Status**: ${data.status}`);
    if (data.priority) {
      parts.push(`**Priority**: ${data.priority}`);
    }
    parts.push('');

    // Description
    parts.push('## Description');
    parts.push('');
    parts.push(data.description || 'No description provided.');
    parts.push('');

    // Acceptance Criteria
    if (data.acceptanceCriteria.length > 0) {
      parts.push('## Acceptance Criteria');
      parts.push('');
      data.acceptanceCriteria.forEach((ac, index) => {
        const acId = `AC-${data.id.replace('E', '')}-${String(index + 1).padStart(2, '0')}`;
        parts.push(`- [ ] **${acId}**: ${ac}`);
      });
      parts.push('');
    }

    // Tasks (v0.30.3+: render as checkboxes if provided)
    parts.push('## Tasks');
    parts.push('');
    if (data.tasks && data.tasks.length > 0) {
      // Render tasks as checkboxes
      data.tasks.forEach((task) => {
        const isCompleted = ['completed', 'done', 'closed'].includes(task.status);
        const checkbox = isCompleted ? '[x]' : '[ ]';
        parts.push(`- ${checkbox} **${task.id}**: ${task.title}`);
      });
      parts.push('');
    } else {
      // Placeholder when no tasks imported
      parts.push('> **Note**: This User Story was imported from an external tool.');
      parts.push('> Create an increment to implement this user story, then tasks will sync here.');
      parts.push('');
    }

    // Metadata (frontmatter-style at bottom)
    parts.push('---');
    parts.push('');
    parts.push('## External Metadata');
    parts.push('');
    parts.push(`- **External ID**: ${data.metadata.externalId}`);
    parts.push(`- **External URL**: ${data.metadata.externalUrl}`);
    parts.push(`- **Platform**: ${data.metadata.externalPlatform}`);
    parts.push(`- **Imported At**: ${data.metadata.importedAt}`);
    parts.push(`- **Created At**: ${data.metadata.createdAt}`);
    parts.push(`- **Updated At**: ${data.metadata.updatedAt}`);
    if (data.metadata.labels.length > 0) {
      parts.push(`- **Labels**: ${data.metadata.labels.join(', ')}`);
    }
    if (data.metadata.sourceRepo) {
      parts.push(`- **Source Repository**: ${data.metadata.sourceRepo}`);
    }
    // Parent tracking for re-import hierarchy updates
    if (data.metadata.featureId) {
      parts.push(`- **Feature ID**: ${data.metadata.featureId}`);
    }
    if (data.metadata.parentId) {
      parts.push(`- **Parent ID**: ${data.metadata.parentId}`);
    }
    if (data.metadata.isOrphan) {
      parts.push(`- **Orphan**: true (no parent in external tool)`);
    }
    if (data.metadata.adoWorkItemType) {
      parts.push(`- **ADO Work Item Type**: ${data.metadata.adoWorkItemType}`);
    }
    if (data.metadata.adoAreaPath) {
      parts.push(`- **ADO Area Path**: ${data.metadata.adoAreaPath}`);
    }

    return parts.join('\n');
  }

  /**
   * Generate file name for living docs User Story
   *
   * Format: us-001e-title-here.md
   */
  generateFileName(usId: string, title: string): string {
    // Convert US-001E to us-001e
    const idPart = usId.toLowerCase();

    // Convert title to kebab-case
    const titlePart = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/-+/g, '-')           // Remove duplicate hyphens
      .slice(0, 50);                 // Limit to 50 chars

    return `${idPart}-${titlePart}.md`;
  }

  /**
   * Generate FEATURE.md content for a feature folder
   */
  generateFeatureMarkdown(
    featureId: string,
    firstItem: ExternalItem,
    options: {
      isOrphanGroup?: boolean;
      isAdoFeatureLevelItem?: boolean;
      parentEpicId?: string;
    } = {}
  ): string {
    const { isOrphanGroup, isAdoFeatureLevelItem, parentEpicId } = options;

    const platformLabel = this.getPlatformLabel(firstItem.platform);
    const { featureTitle, description, externalLink, witTypeLabel } = this.getFeatureMetadata(
      firstItem,
      platformLabel,
      isAdoFeatureLevelItem,
      isOrphanGroup
    );

    const includeExternalMetadata = Boolean(isAdoFeatureLevelItem || isOrphanGroup);
    const hasParentEpic = parentEpicId !== undefined;

    return this.buildFeatureMarkdown({
      featureId,
      featureTitle,
      description,
      externalLink,
      witTypeLabel,
      platformLabel,
      firstItem,
      includeExternalMetadata,
      hasParentEpic,
      parentEpicId,
      isOrphanGroup,
    });
  }

  private getPlatformLabel(platform: string): string {
    const labels: Record<string, string> = {
      'ado': 'Azure DevOps',
      'jira': 'JIRA',
      'github': 'GitHub',
    };
    return labels[platform] || platform || 'external tool';
  }

  private getFeatureMetadata(
    item: ExternalItem,
    platformLabel: string,
    isAdoFeatureLevelItem?: boolean,
    isOrphanGroup?: boolean
  ): { featureTitle: string; description: string; externalLink: string; witTypeLabel: string } {
    if (isAdoFeatureLevelItem) {
      const witTypeLabel = item.adoWorkItemType || 'Feature';
      return {
        witTypeLabel,
        featureTitle: `${witTypeLabel}: ${item.title}`,
        description: item.description || `This ${witTypeLabel.toLowerCase()} was imported from ${platformLabel}.`,
        externalLink: `[${witTypeLabel} in ${platformLabel}](${item.url})`,
      };
    }

    if (isOrphanGroup) {
      const witTypeLabel = item.adoWorkItemType || 'User Story';
      return {
        witTypeLabel,
        featureTitle: `${witTypeLabel}: ${item.title}`,
        description: item.description || `This ${witTypeLabel.toLowerCase()} was imported from ${platformLabel} without a parent Epic/Feature.`,
        externalLink: item.url ? `[${witTypeLabel} in ${platformLabel}](${item.url})` : '',
      };
    }

    if (item.sourceRepo) {
      return {
        witTypeLabel: 'Feature',
        featureTitle: `Feature: ${item.sourceRepo} External Items`,
        description: 'This feature folder contains User Stories imported from external tools.',
        externalLink: '',
      };
    }

    return {
      witTypeLabel: 'Feature',
      featureTitle: `Feature: Imported from ${platformLabel}`,
      description: 'This feature folder contains User Stories imported from external tools.',
      externalLink: '',
    };
  }

  private buildFeatureMarkdown(params: {
    featureId: string;
    featureTitle: string;
    description: string;
    externalLink: string;
    witTypeLabel: string;
    platformLabel: string;
    firstItem: ExternalItem;
    includeExternalMetadata: boolean;
    hasParentEpic: boolean;
    parentEpicId?: string;
    isOrphanGroup?: boolean;
  }): string {
    const {
      featureId, featureTitle, description, externalLink, witTypeLabel, platformLabel,
      firstItem, includeExternalMetadata, hasParentEpic, parentEpicId, isOrphanGroup
    } = params;

    const lines: string[] = ['---'];
    lines.push(`id: ${featureId}`);
    lines.push(`title: ${featureTitle}`);
    lines.push('origin: external');
    lines.push(`source: ${firstItem.platform}`);
    if (firstItem.sourceRepo) lines.push(`source_repo: ${firstItem.sourceRepo}`);
    if (firstItem.adoProjectName) lines.push(`ado_project: ${firstItem.adoProjectName}`);
    if (firstItem.adoAreaPath) lines.push(`ado_area_path: ${firstItem.adoAreaPath}`);
    if (includeExternalMetadata) {
      lines.push(`work_item_type: ${witTypeLabel}`);
      lines.push(`external_id: ${firstItem.id}`);
    }
    if (hasParentEpic) lines.push(`parent_epic: ${parentEpicId}`);
    if (isOrphanGroup) lines.push('orphan: true');
    lines.push(`created: ${new Date().toISOString()}`);
    lines.push('---');
    lines.push('');
    lines.push(`# ${featureTitle}`);
    lines.push('');
    lines.push(`**Origin**: ${externalLink || `Imported from ${platformLabel}`}`);
    if (hasParentEpic) {
      lines.push('');
      lines.push(`**Parent Epic**: [${parentEpicId}](../_epics/${parentEpicId}/EPIC.md)`);
    }
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(description);
    lines.push('');
    if (firstItem.sourceRepo) lines.push(`**Source Repository**: ${firstItem.sourceRepo}`);
    if (firstItem.adoAreaPath) lines.push(`**Area Path**: ${firstItem.adoAreaPath}`);
    if (hasParentEpic) {
      lines.push('');
      lines.push(`> **Hierarchy**: This feature belongs to Epic ${parentEpicId} (Capability in Azure DevOps).`);
    }
    if (isOrphanGroup) {
      lines.push('');
      lines.push(`> **Note**: This feature was created from an orphan item (no parent Epic/Feature in ${platformLabel} or parent not imported).`);
    }
    lines.push('');
    lines.push('## User Stories');
    lines.push('');
    lines.push(`User stories in this ${witTypeLabel.toLowerCase()} will be listed here.`);
    lines.push('');
    lines.push('## Status');
    lines.push('');
    lines.push(`- **Created**: ${new Date().toISOString()}`);
    lines.push(`- **Source**: ${platformLabel}`);
    if (includeExternalMetadata) lines.push(`- **External ID**: ${firstItem.id}`);
    if (hasParentEpic) lines.push(`- **Parent Epic**: ${parentEpicId}`);
    if (isOrphanGroup) lines.push('- **Type**: Orphan (no parent Epic)');
    lines.push('');

    return lines.join('\n');
  }
}

// Export singleton instance for convenience
export const markdownGenerator = new MarkdownGenerator();
