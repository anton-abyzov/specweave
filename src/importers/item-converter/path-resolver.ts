/**
 * Path Resolver
 *
 * Handles path resolution for living docs directory structure.
 *
 * @module importers/item-converter/path-resolver
 * @since v1.0.115
 */

import * as fs from '../../utils/fs-native.js';
import path from 'path';
import type { ItemConverterOptions, ExternalItem } from './types.js';

/**
 * Get base directory for specs, handling both 1-level and 2-level structures
 *
 * Structure patterns:
 * - 2-level (JIRA): specs/{projectKey}/{boardName}/ (e.g., AAC/aac/)
 * - 2-level (ADO): specs/{projectName}/{areaPath}/
 * - 1-level (GitHub): specs/{projectId}/
 * - Legacy: specs/ (no projectId)
 *
 * @param options - Item converter options
 * @returns Base directory path
 */
export function getBaseDirectory(options: ItemConverterOptions): string {
  const container = options.externalContainer;

  if (container) {
    // 2-level structure for JIRA/ADO
    const containerDirName = container.containerId;
    const projectId = options.projectId || 'default';

    return path.join(
      options.specsDir,
      containerDirName,
      projectId
    );
  }

  // 1-level structure for GitHub or single-project mode
  if (options.projectId) {
    return path.join(options.specsDir, options.projectId);
  }

  // Legacy: direct to specs/
  return options.specsDir;
}

/**
 * Check if an item should be auto-archived based on creation date
 */
export function shouldAutoArchive(createdAt: Date, autoArchiveAfterDays?: number): boolean {
  const threshold = autoArchiveAfterDays;
  if (!threshold || threshold <= 0) return false;

  const ageDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  return ageDays >= threshold;
}

/**
 * Check if ALL items in a group should be archived
 */
export function shouldArchiveEntireGroup(items: ExternalItem[], autoArchiveAfterDays?: number): boolean {
  if (items.length === 0) return false;
  const threshold = autoArchiveAfterDays;
  if (!threshold || threshold <= 0) return false;

  return items.every(item => shouldAutoArchive(item.createdAt, autoArchiveAfterDays));
}

/**
 * Clean up empty feature folder after file move
 *
 * Checks if folder is empty (except FEATURE.md) and removes it if orphan folder
 */
export async function cleanupEmptyFeatureFolder(
  folderPath: string,
  featureId: string,
  logger?: { debug: (msg: string) => void }
): Promise<void> {
  try {
    const files = fs.readdirSync(folderPath);

    // Check if only FEATURE.md remains (or empty)
    const nonTemplateFiles = files.filter(f => f.toLowerCase() !== 'feature.md');

    if (nonTemplateFiles.length === 0) {
      // Remove FEATURE.md if exists
      const featureMdPath = path.join(folderPath, 'FEATURE.md');
      if (fs.existsSync(featureMdPath)) {
        fs.unlinkSync(featureMdPath);
      }

      // Remove empty folder
      fs.removeSync(folderPath);

      if (logger) {
        logger.debug(`   🗑️ Cleaned up empty orphan folder: ${featureId}`);
      }
    }
  } catch {
    // Folder cleanup is best-effort, don't fail on errors
  }
}
