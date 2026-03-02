/**
 * Import-to-Increment Converter
 *
 * Bridges the gap between ExternalItem (imported from GitHub/JIRA/ADO)
 * and SpecWeave increment creation with platform-specific suffixes.
 *
 * @module import-to-increment
 * @since 1.0.272
 */

import { IncrementNumberManager } from '../core/increment/increment-utils.js';
import { createIncrementTemplates, type ExternalSourceInfo } from '../core/increment/template-creator.js';
import { IncrementExternalRefDetector, formatExternalRef } from './increment-external-ref-detector.js';
import { SUFFIX_MAP, type Platform } from '../sync/types.js';
import type { ExternalItem } from './external-importer.js';
import { readConfig } from '../core/config/config-manager.js';

/**
 * Result of a single increment import.
 */
export interface ImportedIncrement {
  /** Full increment ID (e.g., "0271G-fix-login-bug") */
  incrementId: string;
  /** Absolute path to created increment directory */
  incrementPath: string;
  /** Canonical external reference */
  externalRef: string;
  /** Source platform */
  platform: Platform;
  /** Files created in the increment */
  createdFiles: string[];
}

/**
 * Result of a skipped (duplicate) import.
 */
export interface SkippedImport {
  /** The external item that was skipped */
  item: ExternalItem;
  /** Canonical external reference */
  externalRef: string;
  /** Existing increment ID that already has this ref */
  existingIncrementId: string;
  /** Reason for skipping */
  reason: string;
}

/**
 * Result of a batch import operation.
 */
export interface BatchImportResult {
  /** Successfully created increments */
  created: ImportedIncrement[];
  /** Skipped duplicate imports */
  skipped: SkippedImport[];
  /** Errors encountered */
  errors: Array<{ item: ExternalItem; error: string }>;
}

/**
 * Options for the import-to-increment converter.
 */
export interface ImportToIncrementOptions {
  /** Project root directory */
  projectRoot: string;
  /** Target project ID (for per-project collision prevention) */
  projectId?: string;
}

/**
 * Converts external items (from GitHub/JIRA/ADO) into SpecWeave increments
 * with platform-specific suffixes (G/J/A) and duplicate prevention.
 *
 * @example
 * ```typescript
 * const converter = new ImportToIncrementConverter({
 *   projectRoot: '/path/to/project',
 *   projectId: 'my-app',
 * });
 *
 * const result = await converter.createIncrement(externalItem);
 * console.log(result.incrementId); // "0271G-fix-login-bug"
 * ```
 */
export class ImportToIncrementConverter {
  private projectRoot: string;
  private projectId?: string;
  private refDetector: IncrementExternalRefDetector;

  constructor(options: ImportToIncrementOptions) {
    this.projectRoot = options.projectRoot;
    this.projectId = options.projectId;
    this.refDetector = new IncrementExternalRefDetector(options.projectRoot);
  }

  /**
   * Check if an external item has already been imported as an increment.
   *
   * @param item - External item to check
   * @returns Existing increment ID if found, null otherwise
   */
  checkDuplicate(item: ExternalItem): string | null {
    const externalRef = this.buildExternalRef(item);
    const match = this.refDetector.hasRef(externalRef);
    return match ? match.incrementId : null;
  }

  /**
   * Create a single increment from an external item.
   *
   * @param item - External item to import
   * @returns Created increment details
   * @throws Error if item is a duplicate (use checkDuplicate first) or creation fails
   */
  async createIncrement(item: ExternalItem): Promise<ImportedIncrement> {
    const externalRef = this.buildExternalRef(item);

    // Check for duplicates
    const existing = this.refDetector.hasRef(externalRef);
    if (existing) {
      throw new Error(
        `Duplicate import: ${externalRef} already imported as ${existing.incrementId} (${existing.location})`
      );
    }

    // Generate increment ID with platform suffix
    const slug = slugify(item.title);
    const platformSuffix = SUFFIX_MAP[item.platform];
    const incrementId = IncrementNumberManager.generateIncrementId(slug, {
      platformSuffix,
      projectRoot: this.projectRoot,
      projectId: this.projectId,
    });

    // Build external source info for template creator
    const externalSource: ExternalSourceInfo = {
      platform: item.platform,
      externalId: externalRef,
      externalUrl: item.url,
      title: item.title,
      description: item.description,
      acceptanceCriteria: item.acceptanceCriteria,
      labels: item.labels,
      priority: item.priority,
      status: item.status,
    };

    // Map external priority to SpecWeave priority
    const priority = item.priority ?? 'P2';

    // Map external type to SpecWeave type
    const type = mapExternalType(item.type);

    // Read testing config for testMode and coverageTarget
    let testMode: string | undefined;
    let coverageTarget: number | undefined;
    try {
      const config = await readConfig(this.projectRoot);
      testMode = config?.testing?.defaultTestMode;
      coverageTarget = config?.testing?.defaultCoverageTarget;
    } catch {
      // Fallback to template-creator defaults if config reading fails
    }

    // Create increment via template creator
    const result = await createIncrementTemplates({
      incrementId,
      title: item.title,
      description: item.description,
      projectId: this.projectId || 'default',
      type,
      priority,
      testMode,
      coverageTarget,
      projectRoot: this.projectRoot,
      externalSource,
    });

    if (!result.success) {
      throw new Error(`Failed to create increment ${incrementId}: ${result.error}`);
    }

    return {
      incrementId,
      incrementPath: result.incrementPath,
      externalRef,
      platform: item.platform,
      createdFiles: result.createdFiles,
    };
  }

  /**
   * Batch create increments from multiple external items.
   * Automatically deduplicates and reports skipped items.
   *
   * @param items - External items to import
   * @returns Batch result with created, skipped, and error arrays
   */
  async createIncrements(items: ExternalItem[]): Promise<BatchImportResult> {
    const result: BatchImportResult = {
      created: [],
      skipped: [],
      errors: [],
    };

    // Pre-check all refs at once for efficiency
    const refs = items.map(item => this.buildExternalRef(item));
    const existingRefs = this.refDetector.checkRefs(refs);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const ref = refs[i];

      // Check duplicate
      const existing = existingRefs.get(ref);
      if (existing) {
        result.skipped.push({
          item,
          externalRef: ref,
          existingIncrementId: existing.incrementId,
          reason: `Already imported as ${existing.incrementId} (${existing.location})`,
        });
        continue;
      }

      // Try to create
      try {
        const imported = await this.createIncrement(item);
        result.created.push(imported);
      } catch (error) {
        result.errors.push({
          item,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Build a canonical external_ref string from an ExternalItem.
   */
  private buildExternalRef(item: ExternalItem): string {
    switch (item.platform) {
      case 'github': {
        // GitHub IDs are formatted as "github#{owner/repo}#{number}"
        const repo = item.sourceRepo || extractGitHubRepo(item.id);
        const issueNumber = extractGitHubNumber(item.id);
        return formatExternalRef('github', repo, issueNumber);
      }
      case 'jira': {
        // JIRA IDs are the issue key (e.g., "PROJ-123")
        const project = item.jiraProjectKey || extractJiraProject(item.id);
        return formatExternalRef('jira', project, item.id);
      }
      case 'ado': {
        // ADO IDs are work item numbers
        const project = item.adoProjectName || 'default';
        return formatExternalRef('ado', project, item.id);
      }
    }
  }
}

/**
 * Convert a title to a kebab-case slug suitable for increment folder names.
 * Limits to 50 chars to keep folder names reasonable.
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // Remove special chars
    .replace(/\s+/g, '-')            // Spaces to hyphens
    .replace(/-+/g, '-')             // Collapse multiple hyphens
    .replace(/^-|-$/g, '')           // Trim leading/trailing hyphens
    .slice(0, 50)                    // Limit length
    .replace(/-$/, '');              // Clean trailing hyphen after slice
}

/**
 * Map external item type to SpecWeave increment type.
 */
function mapExternalType(externalType: ExternalItem['type']): string {
  switch (externalType) {
    case 'bug': return 'bug';
    case 'feature': return 'feature';
    case 'epic': return 'feature';
    case 'user-story': return 'feature';
    case 'task': return 'feature';
    default: return 'feature';
  }
}

/**
 * Extract owner/repo from a GitHub external ID.
 * Input format: "github#owner/repo#123" or just a number.
 */
function extractGitHubRepo(id: string): string {
  const match = id.match(/github#([^#]+)#/);
  return match ? match[1] : 'unknown/unknown';
}

/**
 * Extract issue number from a GitHub external ID.
 */
function extractGitHubNumber(id: string): string {
  const match = id.match(/#(\d+)$/);
  return match ? match[1] : id.replace(/\D/g, '') || '0';
}

/**
 * Extract project key from a JIRA issue ID (e.g., "PROJ-123" → "PROJ").
 */
function extractJiraProject(id: string): string {
  const match = id.match(/^([A-Z]+)-/);
  return match ? match[1] : 'UNKNOWN';
}
