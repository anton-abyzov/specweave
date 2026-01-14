/**
 * Duplicate Scanner
 *
 * Scans for existing feature folders and checks for duplicates.
 *
 * @module importers/item-converter/duplicate-scanner
 * @since v1.0.115
 */

import * as fs from '../../utils/fs-native.js';
import path from 'path';
import matter from 'gray-matter';
import type { ExternalItem } from './types.js';
import type { DuplicateDetector } from '../duplicate-detector.js';
import type { Logger } from '../../utils/logger.js';

/**
 * Find existing feature folders for item groups by scanning FEATURE.md files
 *
 * CRITICAL FIX (2025-12-05): Prevents duplicate FS-XXXE folder creation on re-import
 *
 * For GitHub items grouped by sourceRepo, this finds any existing FS-XXXE folder
 * that has the same source_repo in its FEATURE.md frontmatter.
 *
 * @param itemGroups - Groups of items from groupItemsByFeature()
 * @param baseDir - Base directory to scan
 * @param logger - Optional logger
 * @returns Map from groupKey to existing feature ID (e.g., "anton-abyzov/specweave" -> "FS-111E")
 */
export async function findExistingFeatureFolders(
  itemGroups: Map<string, ExternalItem[]>,
  baseDir: string,
  logger?: Logger
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  if (!fs.existsSync(baseDir)) {
    return result;
  }

  // Build a map of source_repo -> feature ID from existing FEATURE.md files
  const sourceRepoToFeature = new Map<string, string>();

  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Match FS-XXXE folders only
      if (!/^FS-\d{3,}E$/.test(entry.name)) continue;

      const featureMdPath = path.join(baseDir, entry.name, 'FEATURE.md');
      if (!fs.existsSync(featureMdPath)) continue;

      try {
        const content = fs.readFileSync(featureMdPath, 'utf-8');
        const parsed = matter(content);

        // Check for source_repo in frontmatter
        if (parsed.data.source_repo) {
          sourceRepoToFeature.set(parsed.data.source_repo, entry.name);
        }
      } catch {
        // Skip files that can't be parsed
      }
    }
  } catch {
    // Directory read failed - return empty map
    return result;
  }

  // Now match item groups to existing feature folders
  for (const [groupKey, groupItems] of itemGroups) {
    if (groupItems.length === 0) continue;

    const firstItem = groupItems[0];

    // For GitHub items grouped by sourceRepo
    if (firstItem.sourceRepo && sourceRepoToFeature.has(firstItem.sourceRepo)) {
      result.set(groupKey, sourceRepoToFeature.get(firstItem.sourceRepo)!);
      if (logger) {
        logger.debug(`   🔍 Found existing folder ${sourceRepoToFeature.get(firstItem.sourceRepo)} for source_repo: ${firstItem.sourceRepo}`);
      }
    }
  }

  return result;
}

/**
 * Check if a group has at least one non-duplicate item
 *
 * CRITICAL FIX (2025-12-05): Prevents empty folder creation when all items are duplicates
 *
 * @param groupItems - Items in a group
 * @param duplicateDetector - Duplicate detector instance (or null if disabled)
 * @returns True if at least one item is NOT a duplicate
 */
export async function groupHasNonDuplicates(
  groupItems: ExternalItem[],
  duplicateDetector: DuplicateDetector | null
): Promise<boolean> {
  if (!duplicateDetector) {
    // No duplicate detection - all items are "new"
    return groupItems.length > 0;
  }

  for (const item of groupItems) {
    // Skip ADO Tasks - they become checkboxes, not separate files
    if (item.adoWorkItemType?.toLowerCase() === 'task') {
      continue;
    }

    const existingRef = await duplicateDetector.findExternalIdReference(item.id);
    if (!existingRef) {
      // Found a non-duplicate item
      return true;
    }
  }

  // All items are duplicates (or Tasks)
  return false;
}
