/**
 * Living Docs Updater for Pull Sync (Increment 0089)
 *
 * Applies pulled changes from external tools to living documentation.
 * Updates YAML frontmatter with sync metadata and changed field values.
 *
 * Features:
 * - Apply status/priority/assignee changes to living docs
 * - Add sync metadata (lastPulledAt, externalModifiedAt, externalModifiedBy)
 * - Preserve format of non-synced fields (title, description, ACs)
 *
 * @module sync/living-docs-updater
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { Logger, consoleLogger } from '../utils/logger.js';
import { ExternalChange } from './external-change-puller.js';
import { ConflictResolver, ConflictResolution } from '../../plugins/specweave-ado/lib/conflict-resolver.js';

/**
 * Options for applying a single change
 */
export interface ApplyChangeOptions {
  /**
   * Path to the living doc file (spec.md, user-story.md, etc.)
   */
  filePath: string;

  /**
   * External change to apply
   */
  change: ExternalChange;

  /**
   * Local file modification timestamp (for conflict resolution)
   */
  localModified?: string;
}

/**
 * Result of applying a change
 */
export interface ApplyChangeResult {
  applied: boolean;
  filePath: string;
  conflictResolution?: ConflictResolution;
  error?: string;
}

/**
 * Living Docs Updater Options
 */
export interface LivingDocsUpdaterOptions {
  /**
   * Project root directory
   */
  projectRoot: string;

  /**
   * Logger instance
   */
  logger?: Logger;
}

/**
 * LivingDocsUpdater - Applies external changes to living documentation
 */
export class LivingDocsUpdater {
  private readonly projectRoot: string;
  private readonly logger: Logger;
  private readonly conflictResolver: ConflictResolver;

  constructor(options: LivingDocsUpdaterOptions) {
    this.projectRoot = options.projectRoot;
    this.logger = options.logger ?? consoleLogger;
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * Apply multiple changes to living docs
   *
   * @param changes - Array of external changes to apply
   * @param fileMapping - Map of externalId -> filePath for linked docs
   * @returns Array of results for each change
   */
  async applyChanges(
    changes: ExternalChange[],
    fileMapping: Map<string, string>
  ): Promise<ApplyChangeResult[]> {
    const results: ApplyChangeResult[] = [];

    for (const change of changes) {
      const filePath = fileMapping.get(change.externalId);

      if (!filePath) {
        this.logger.debug(`No linked file for ${change.externalId}, skipping`);
        continue;
      }

      if (!existsSync(filePath)) {
        results.push({
          applied: false,
          filePath,
          error: `File not found: ${filePath}`,
        });
        continue;
      }

      const result = await this.applyChange({
        filePath,
        change,
      });

      results.push(result);
    }

    const appliedCount = results.filter(r => r.applied).length;
    this.logger.log(`📝 Applied ${appliedCount}/${results.length} changes to living docs`);

    return results;
  }

  /**
   * Apply a single change to a living doc file
   */
  async applyChange(options: ApplyChangeOptions): Promise<ApplyChangeResult> {
    const { filePath, change, localModified } = options;

    try {
      // Read current content
      const content = await readFile(filePath, 'utf-8');

      // Parse frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        return {
          applied: false,
          filePath,
          error: 'No frontmatter found',
        };
      }

      const frontmatterText = frontmatterMatch[1];
      const frontmatter = yaml.parse(frontmatterText);

      // Get local modification timestamp from frontmatter or file stat
      const localTimestamp = localModified || frontmatter.lastModified || null;

      // Resolve conflict using timestamps
      const statusResolution = this.conflictResolver.resolveWithTimestamp(
        'status',
        frontmatter.status,
        change.currentState.status,
        localTimestamp,
        change.changedAt
      );

      // If local wins, don't apply changes
      if (statusResolution.resolution === 'local') {
        this.logger.log(`  ⏭️  ${path.basename(filePath)}: Local is newer, skipping`);
        return {
          applied: false,
          filePath,
          conflictResolution: statusResolution,
        };
      }

      // Apply status change (external wins)
      if (frontmatter.status !== change.currentState.status) {
        const mappedStatus = this.mapExternalStatus(change.platform, change.currentState.status);
        frontmatter.status = mappedStatus;
        this.logger.log(`  ✏️  ${path.basename(filePath)}: status → ${mappedStatus}`);
      }

      // Apply priority change if available
      if (change.currentState.priority && frontmatter.priority !== change.currentState.priority) {
        frontmatter.priority = change.currentState.priority;
        this.logger.log(`  ✏️  ${path.basename(filePath)}: priority → ${change.currentState.priority}`);
      }

      // Apply assignee change if available
      if (change.currentState.assignee !== undefined) {
        if (!frontmatter.assigned_to || frontmatter.assigned_to !== change.currentState.assignee) {
          frontmatter.assigned_to = change.currentState.assignee;
          this.logger.log(`  ✏️  ${path.basename(filePath)}: assigned_to → ${change.currentState.assignee}`);
        }
      }

      // Add sync metadata
      this.updateSyncMetadata(frontmatter, change);

      // Serialize updated frontmatter
      const newFrontmatter = yaml.stringify(frontmatter);

      // Replace frontmatter in content
      const newContent = content.replace(
        /^---\n[\s\S]*?\n---/,
        `---\n${newFrontmatter.trim()}\n---`
      );

      // Write back to file
      await writeFile(filePath, newContent, 'utf-8');

      return {
        applied: true,
        filePath,
        conflictResolution: statusResolution,
      };
    } catch (error: any) {
      return {
        applied: false,
        filePath,
        error: error.message,
      };
    }
  }

  /**
   * Update frontmatter with sync metadata
   */
  private updateSyncMetadata(frontmatter: any, change: ExternalChange): void {
    // Ensure external_tools section exists
    if (!frontmatter.external_tools) {
      frontmatter.external_tools = {};
    }

    // Get platform section
    const platformKey = change.platform;
    if (!frontmatter.external_tools[platformKey]) {
      frontmatter.external_tools[platformKey] = {};
    }

    const platformSection = frontmatter.external_tools[platformKey];

    // Add sync metadata
    platformSection.last_pulled_at = new Date().toISOString();
    platformSection.external_modified_at = change.changedAt;
    platformSection.external_modified_by = change.changedBy;

    // Update lastModified for future conflict resolution
    frontmatter.lastModified = new Date().toISOString();
  }

  /**
   * Map external status to SpecWeave status
   */
  private mapExternalStatus(platform: string, externalStatus: string): string {
    const statusMaps: Record<string, Record<string, string>> = {
      ado: {
        'New': 'draft',
        'Active': 'in-progress',
        'Resolved': 'implemented',
        'Closed': 'complete',
        'In Review': 'in-qa',
        'In QA': 'in-qa',
        'Blocked': 'blocked',
        'Removed': 'cancelled',
      },
      jira: {
        'To Do': 'draft',
        'In Progress': 'in-progress',
        'Code Review': 'implemented',
        'QA': 'in-qa',
        'Done': 'complete',
        'Closed': 'complete',
        'Blocked': 'blocked',
        'Cancelled': 'cancelled',
      },
      github: {
        'open': 'in-progress',
        'closed': 'complete',
      },
    };

    const map = statusMaps[platform] || {};
    return map[externalStatus] || externalStatus.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Update a single frontmatter field
   *
   * @param filePath - Path to the living doc file
   * @param field - Field name to update
   * @param value - New value for the field
   */
  async updateFrontmatter(
    filePath: string,
    field: string,
    value: unknown
  ): Promise<boolean> {
    try {
      const content = await readFile(filePath, 'utf-8');

      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        this.logger.warn(`No frontmatter found in ${filePath}`);
        return false;
      }

      const frontmatter = yaml.parse(frontmatterMatch[1]);
      frontmatter[field] = value;
      frontmatter.lastModified = new Date().toISOString();

      const newFrontmatter = yaml.stringify(frontmatter);
      const newContent = content.replace(
        /^---\n[\s\S]*?\n---/,
        `---\n${newFrontmatter.trim()}\n---`
      );

      await writeFile(filePath, newContent, 'utf-8');
      this.logger.log(`  ✅ Updated ${field} in ${path.basename(filePath)}`);

      return true;
    } catch (error: any) {
      this.logger.error(`Failed to update ${field} in ${filePath}: ${error.message}`);
      return false;
    }
  }
}
