/**
 * Duplicate Detector
 *
 * Detects duplicate external items by scanning living docs for existing external IDs.
 * Prevents re-importing items that have already been imported.
 */

import * as fs from '../utils/fs-native.js';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

/**
 * External ID reference found in living docs
 * CRITICAL (2025-12-01): Includes parent tracking for re-import hierarchy updates
 */
export interface ExternalIdReference {
  /** User Story ID (e.g., US-001E) */
  usId: string;

  /** File path where external ID was found */
  filePath: string;

  /** External ID value */
  externalId: string;

  /** External platform (github, jira, ado) */
  platform?: string;

  // Parent tracking (for re-import hierarchy updates)
  /** Feature ID this item belongs to (e.g., FS-001E) */
  featureId?: string;

  /** Parent work item ID in external tool (e.g., ADO-123) */
  parentId?: string;

  /** Whether this item was imported as orphan (no parent) */
  isOrphan?: boolean;

  /** ADO work item type (e.g., User Story, Bug) */
  adoWorkItemType?: string;
}

/**
 * Options for duplicate detection
 */
export interface DuplicateDetectorOptions {
  /** Living docs specs directory to scan */
  specsDir: string;

  /** Cache scan results (default: true) */
  enableCache?: boolean;
}

/**
 * Duplicate Detector
 *
 * Scans living docs US files for external_id metadata and provides
 * duplicate detection functionality.
 */
export class DuplicateDetector {
  private options: DuplicateDetectorOptions;
  private cache: Map<string, ExternalIdReference> | null = null;

  constructor(options: DuplicateDetectorOptions) {
    this.options = {
      enableCache: true,
      ...options,
    };
  }

  /**
   * Check if an external ID already exists in living docs
   *
   * @param externalId - External ID to check (e.g., "GH-#638", "JIRA-PROJ-123")
   * @returns True if external ID exists (duplicate), false otherwise
   */
  async checkExistingExternalId(externalId: string): Promise<boolean> {
    const reference = await this.findExternalIdReference(externalId);
    return reference !== null;
  }

  /**
   * Find the User Story that contains a specific external ID
   *
   * @param externalId - External ID to search for
   * @returns External ID reference if found, null otherwise
   */
  async findExternalIdReference(externalId: string): Promise<ExternalIdReference | null> {
    // Build or use cache
    const externalIdMap = await this.buildExternalIdMap();

    // Normalize external ID for lookup
    const normalizedId = this.normalizeExternalId(externalId);

    return externalIdMap.get(normalizedId) || null;
  }

  /**
   * Get all external IDs currently in living docs
   *
   * @returns Map of external ID to reference
   */
  async getAllExternalIds(): Promise<Map<string, ExternalIdReference>> {
    return this.buildExternalIdMap();
  }

  /**
   * Build map of external IDs to User Story references
   */
  private async buildExternalIdMap(): Promise<Map<string, ExternalIdReference>> {
    // Return cached map if available
    if (this.options.enableCache && this.cache) {
      return this.cache;
    }

    const externalIdMap = new Map<string, ExternalIdReference>();

    // Find all US markdown files in specs directory
    const usFiles = await this.findUserStoryFiles();

    // Scan each file for external_id metadata
    for (const filePath of usFiles) {
      const reference = await this.extractExternalIdFromFile(filePath);
      if (reference) {
        const normalizedId = this.normalizeExternalId(reference.externalId);
        externalIdMap.set(normalizedId, reference);
      }
    }

    // Cache the map if enabled
    if (this.options.enableCache) {
      this.cache = externalIdMap;
    }

    return externalIdMap;
  }

  /**
   * Find all User Story markdown files in specs directory
   *
   * Searches recursively in all subdirectories including:
   * - Root level (legacy)
   * - Feature folders (FS-XXX)
   * - Project folders
   * - Archive folders
   */
  private async findUserStoryFiles(): Promise<string[]> {
    if (!fs.existsSync(this.options.specsDir)) {
      return [];
    }

    // Match us-*.md files recursively in all subdirectories
    const pattern = path.join(this.options.specsDir, '**/us-*.md');
    const files = await glob(pattern, { nodir: true });

    return files;
  }

  /**
   * Extract external_id and parent tracking info from a User Story file
   *
   * @param filePath - Path to User Story markdown file
   * @returns External ID reference with parent info if found, null otherwise
   */
  private async extractExternalIdFromFile(filePath: string): Promise<ExternalIdReference | null> {
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      return null; // Skip files that can't be read
    }

    const parsed = matter(content);
    const usId = this.extractUsIdFromFile(filePath, content);

    // Check for external_id in frontmatter
    if (parsed.data.external_id) {
      return {
        usId,
        filePath,
        externalId: String(parsed.data.external_id),
        platform: parsed.data.external_platform,
        featureId: parsed.data.feature_id,
        parentId: parsed.data.parent_id,
        isOrphan: parsed.data.is_orphan,
        adoWorkItemType: parsed.data.ado_work_item_type,
      };
    }

    // Fallback: Parse external metadata section in content
    const externalIdMatch = content.match(/^-\s+\*\*External ID\*\*:\s+(.+)$/m);
    if (!externalIdMatch) {
      return null;
    }

    return {
      usId,
      filePath,
      externalId: externalIdMatch[1].trim(),
      platform: content.match(/^-\s+\*\*Platform\*\*:\s+(.+)$/m)?.[1]?.trim()?.toLowerCase(),
      featureId: content.match(/^-\s+\*\*Feature ID\*\*:\s+(.+)$/m)?.[1]?.trim(),
      parentId: content.match(/^-\s+\*\*Parent ID\*\*:\s+(.+)$/m)?.[1]?.trim(),
      isOrphan: !!content.match(/^-\s+\*\*Orphan\*\*:\s+true/m),
      adoWorkItemType: content.match(/^-\s+\*\*ADO Work Item Type\*\*:\s+(.+)$/m)?.[1]?.trim(),
    };
  }

  /**
   * Extract US-ID from file name or content
   */
  private extractUsIdFromFile(filePath: string, content: string): string {
    // Try filename: us-001e-title.md → US-001E
    const fileNameMatch = path.basename(filePath).match(/^us-(\d{3}e)/i);
    if (fileNameMatch) {
      return `US-${fileNameMatch[1].toUpperCase()}`;
    }

    // Try content: # US-001E: Title
    const contentMatch = content.match(/^#\s+(US-\d{3}E):/m);
    if (contentMatch) {
      return contentMatch[1];
    }

    // Fallback: use filename
    return path.basename(filePath, '.md');
  }

  /**
   * Normalize external ID for consistent comparison
   *
   * Examples:
   * - "github#owner/repo#638" → "gh:owner/repo#638" (v0.29+ format with repo)
   * - "GH-#638" → "gh-638" (legacy)
   * - "GITHUB-638" → "gh-638" (legacy)
   * - "JIRA-PROJ-123" → "jira-proj-123"
   *
   * CRITICAL: v0.29+ format includes repo name to prevent cross-repo collisions
   */
  private normalizeExternalId(externalId: string): string {
    return externalId
      .toLowerCase()
      // v0.29+ format: github#owner/repo#123 → gh:owner/repo#123
      .replace(/^github#([^#]+)#(\d+)$/i, 'gh:$1#$2')
      // Legacy formats
      .replace(/^github-/i, 'gh-')
      .replace(/^gh-#/, 'gh-')
      .replace(/^jira-/i, 'jira-')
      .replace(/^ado-/i, 'ado-');
  }

  /**
   * Clear the cache (useful for testing or after imports)
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { enabled: boolean; size: number } {
    return {
      enabled: this.options.enableCache ?? true,
      size: this.cache?.size ?? 0,
    };
  }
}

/**
 * Check if an external ID exists (convenience function)
 *
 * @param externalId - External ID to check
 * @param specsDir - Living docs specs directory
 * @returns True if duplicate exists
 */
export async function checkExistingExternalId(
  externalId: string,
  specsDir: string
): Promise<boolean> {
  const detector = new DuplicateDetector({ specsDir });
  return detector.checkExistingExternalId(externalId);
}
