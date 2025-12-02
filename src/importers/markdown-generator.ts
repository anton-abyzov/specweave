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

    // Tasks
    parts.push('## Tasks');
    parts.push('');
    parts.push('> **Note**: This User Story was imported from an external tool.');
    parts.push('> Create tasks manually when ready to implement.');
    parts.push('');

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
   *
   * @param featureId - Feature ID (e.g., "FS-001E")
   * @param firstItem - First item in the group (used for metadata)
   * @param groupKey - Group key for determining type
   * @param options - Additional options
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

    // Platform-specific labels
    let platformLabel: string;
    switch (firstItem.platform) {
      case 'ado':
        platformLabel = 'Azure DevOps';
        break;
      case 'jira':
        platformLabel = 'JIRA';
        break;
      case 'github':
        platformLabel = 'GitHub';
        break;
      default:
        platformLabel = firstItem.platform || 'external tool';
    }

    // Determine title and description based on item type
    let featureTitle: string;
    let description: string;
    let externalLink: string;
    let witTypeLabel: string;

    if (isAdoFeatureLevelItem) {
      witTypeLabel = firstItem.adoWorkItemType || 'Feature';
      featureTitle = `${witTypeLabel}: ${firstItem.title}`;
      description = firstItem.description || `This ${witTypeLabel.toLowerCase()} was imported from ${platformLabel}.`;
      externalLink = `[${witTypeLabel} in ${platformLabel}](${firstItem.url})`;
    } else if (isOrphanGroup) {
      witTypeLabel = firstItem.adoWorkItemType || 'User Story';
      featureTitle = `${witTypeLabel}: ${firstItem.title}`;
      description = firstItem.description ||
        `This ${witTypeLabel.toLowerCase()} was imported from ${platformLabel} without a parent Epic/Feature.`;
      externalLink = firstItem.url ? `[${witTypeLabel} in ${platformLabel}](${firstItem.url})` : '';
    } else if (firstItem.sourceRepo) {
      featureTitle = `Feature: ${firstItem.sourceRepo} External Items`;
      description = 'This feature folder contains User Stories imported from external tools.';
      externalLink = '';
      witTypeLabel = 'Feature';
    } else {
      featureTitle = `Feature: Imported from ${platformLabel}`;
      description = 'This feature folder contains User Stories imported from external tools.';
      externalLink = '';
      witTypeLabel = 'Feature';
    }

    const includeExternalMetadata = isAdoFeatureLevelItem || isOrphanGroup;
    const hasParentEpic = parentEpicId !== undefined;
    const parentEpicLink = hasParentEpic
      ? `[${parentEpicId}](../_epics/${parentEpicId}/EPIC.md)`
      : '';

    return `---
id: ${featureId}
title: ${featureTitle}
origin: external
source: ${firstItem.platform}
${firstItem.sourceRepo ? `source_repo: ${firstItem.sourceRepo}` : ''}
${firstItem.adoProjectName ? `ado_project: ${firstItem.adoProjectName}` : ''}
${firstItem.adoAreaPath ? `ado_area_path: ${firstItem.adoAreaPath}` : ''}
${includeExternalMetadata ? `work_item_type: ${witTypeLabel}` : ''}
${includeExternalMetadata ? `external_id: ${firstItem.id}` : ''}
${hasParentEpic ? `parent_epic: ${parentEpicId}` : ''}
${isOrphanGroup ? `orphan: true` : ''}
created: ${new Date().toISOString()}
---

# ${featureTitle}

**Origin**: 🔗 ${externalLink || `Imported from ${platformLabel}`}
${hasParentEpic ? `\n**Parent Epic**: ${parentEpicLink}` : ''}

## Description

${description}

${firstItem.sourceRepo ? `**Source Repository**: ${firstItem.sourceRepo}` : ''}
${firstItem.adoAreaPath ? `**Area Path**: ${firstItem.adoAreaPath}` : ''}
${hasParentEpic ? `\n> **Hierarchy**: This feature belongs to Epic ${parentEpicId} (Capability in Azure DevOps).` : ''}
${isOrphanGroup ? `\n> **Note**: This feature was created from an orphan item (no parent Epic/Feature in ${platformLabel} or parent not imported).` : ''}

## User Stories

User stories in this ${witTypeLabel.toLowerCase()} will be listed here.

## Status

- **Created**: ${new Date().toISOString()}
- **Source**: ${platformLabel}
${includeExternalMetadata ? `- **External ID**: ${firstItem.id}` : ''}
${hasParentEpic ? `- **Parent Epic**: ${parentEpicId}` : ''}
${isOrphanGroup ? `- **Type**: Orphan (no parent Epic)` : ''}
`;
  }
}

// Export singleton instance for convenience
export const markdownGenerator = new MarkdownGenerator();
