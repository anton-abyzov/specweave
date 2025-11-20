/**
 * Item Converter
 *
 * Converts external items (GitHub/JIRA/ADO) to SpecWeave living docs User Stories.
 * CRITICAL: Does NOT create increments - only creates living docs.
 */

import type { ExternalItem } from './external-importer.js';
import fs from 'fs-extra';
import path from 'path';
import { FSIdAllocator, type ExternalWorkItem } from '../living-docs/fs-id-allocator.js';
import { IDRegistry } from '../living-docs/id-registry.js';
import { createExternalMetadata } from '../core/types/origin-metadata.js';

export interface ConvertedUserStory {
  /** User Story ID with E suffix (e.g., US-001E) */
  id: string;

  /** User Story title */
  title: string;

  /** User Story description */
  description: string;

  /** Acceptance criteria */
  acceptanceCriteria: string[];

  /** Priority (P0-P4) */
  priority?: string;

  /** Status (open, in-progress, completed) */
  status: string;

  /** External metadata */
  metadata: {
    externalId: string;
    externalUrl: string;
    externalPlatform: 'github' | 'jira' | 'ado';
    importedAt: string;
    createdAt: string;
    updatedAt: string;
    labels: string[];
  };

  /** Living docs file path */
  filePath: string;

  /** Living docs markdown content */
  markdown: string;
}

export interface ItemConverterOptions {
  /** Base directory for living docs (e.g., .specweave/docs/internal/specs) */
  specsDir: string;

  /** Starting US-ID number for imported items (default: 1) */
  startingId?: number;

  /** Project root for FS-ID allocator and ID registry */
  projectRoot?: string;

  /** Enable feature-level organization with FS-ID allocation */
  enableFeatureAllocation?: boolean;
}

/**
 * Convert external items to living docs User Stories
 *
 * CRITICAL: This function ONLY creates living docs files.
 * It does NOT create increments or populate .specweave/increments/.
 */
export class ItemConverter {
  private options: ItemConverterOptions;

  constructor(options: ItemConverterOptions) {
    this.options = options;
  }

  /**
   * Convert a single external item to a User Story with E suffix
   */
  convertItem(item: ExternalItem, usId: number): ConvertedUserStory {
    // Generate US-ID with E suffix
    const id = `US-${String(usId).padStart(3, '0')}E`;

    // Map external status to SpecWeave status
    const status = this.mapStatus(item.status);

    // Extract acceptance criteria
    const acceptanceCriteria = item.acceptanceCriteria || [];

    // Generate origin badge
    const originBadge = this.generateOriginBadge(item);

    // Generate markdown content for living docs
    const markdown = this.generateMarkdown({
      id,
      title: item.title,
      description: item.description,
      acceptanceCriteria,
      priority: item.priority,
      status,
      originBadge,
      metadata: {
        externalId: item.id,
        externalUrl: item.url,
        externalPlatform: item.platform,
        importedAt: new Date().toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        labels: item.labels
      }
    });

    // Generate file path
    const fileName = this.generateFileName(id, item.title);
    const filePath = path.join(this.options.specsDir, fileName);

    return {
      id,
      title: item.title,
      description: item.description,
      acceptanceCriteria,
      priority: item.priority,
      status,
      metadata: {
        externalId: item.id,
        externalUrl: item.url,
        externalPlatform: item.platform,
        importedAt: new Date().toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        labels: item.labels
      },
      filePath,
      markdown
    };
  }

  /**
   * Convert multiple external items to User Stories
   *
   * CRITICAL: This method ONLY creates living docs files.
   * It does NOT create increments.
   */
  async convertItems(items: ExternalItem[]): Promise<ConvertedUserStory[]> {
    const startingId = this.options.startingId || 1;
    const converted: ConvertedUserStory[] = [];

    // Ensure specs directory exists
    fs.mkdirSync(this.options.specsDir, { recursive: true });

    // Convert each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const usId = startingId + i;

      const userStory = this.convertItem(item, usId);
      converted.push(userStory);

      // Write living docs file
      fs.writeFileSync(userStory.filePath, userStory.markdown, 'utf-8');
    }

    return converted;
  }

  /**
   * Map external status to SpecWeave status
   */
  private mapStatus(externalStatus: ExternalItem['status']): string {
    const statusMap: Record<string, string> = {
      'open': 'Open',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'closed': 'Completed'
    };

    return statusMap[externalStatus] || 'Open';
  }

  /**
   * Generate origin badge for living docs
   */
  private generateOriginBadge(item: ExternalItem): string {
    const platformEmoji: Record<string, string> = {
      'github': '🔗',
      'jira': '🔗',
      'ado': '🔗'
    };

    const platformName: Record<string, string> = {
      'github': 'GitHub',
      'jira': 'JIRA',
      'ado': 'Azure DevOps'
    };

    const emoji = platformEmoji[item.platform] || '🔗';
    const name = platformName[item.platform] || item.platform;

    // Extract issue/ticket number from external ID
    const issueNumber = item.id.replace(/^(GITHUB|JIRA|ADO)-/, '');

    return `${emoji} [${name} #${issueNumber}](${item.url})`;
  }

  /**
   * Generate markdown content for living docs User Story
   */
  private generateMarkdown(data: {
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
    };
  }): string {
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

    return parts.join('\n');
  }

  /**
   * Generate file name for living docs User Story
   *
   * Format: us-001e-title-here.md
   */
  private generateFileName(usId: string, title: string): string {
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
   * Validate that no increments were created
   *
   * CRITICAL: This validation ensures we're not auto-creating increments.
   */
  static validateNoIncrementsCreated(projectRoot: string): void {
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

    if (!fs.existsSync(incrementsDir)) {
      return; // No increments directory - that's fine
    }

    // Check for any numbered increment directories
    const items = fs.readdirSync(incrementsDir);
    const incrementDirs = items.filter(item => {
      const fullPath = path.join(incrementsDir, item);
      return fs.statSync(fullPath).isDirectory() && /^\d{4}-/.test(item);
    });

    if (incrementDirs.length > 0) {
      throw new Error(
        `VALIDATION FAILED: Increments were auto-created during import. ` +
        `Found: ${incrementDirs.join(', ')}. ` +
        `Import should ONLY create living docs, not increments.`
      );
    }
  }
}
