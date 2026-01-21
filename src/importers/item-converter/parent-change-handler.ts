/**
 * Parent Change Handler
 *
 * Detects and handles parent changes during re-import.
 *
 * @module importers/item-converter/parent-change-handler
 * @since v1.0.115
 */

import * as fs from '../../utils/fs-native.js';
import path from 'path';
import type { ExternalIdReference } from '../duplicate-detector.js';
import type { ExternalItem } from './types.js';

/**
 * Check if parent has changed between existing reference and new item
 *
 * CRITICAL (2025-12-01): Detects orphan → has parent, or parent ID change
 *
 * @param existingRef - Existing reference from living docs
 * @param newItem - New item being imported
 * @returns True if parent has changed and file should be moved
 */
export function hasParentChanged(
  existingRef: ExternalIdReference,
  newItem: ExternalItem
): boolean {
  // Only check for ADO items with hierarchy support
  if (newItem.platform !== 'ado') {
    return false;
  }

  // Case 1: Was orphan, now has parent
  if (existingRef.isOrphan && newItem.parentId) {
    return true;
  }

  // Case 2: Parent ID changed (including has parent → different parent)
  if (existingRef.parentId && newItem.parentId && existingRef.parentId !== newItem.parentId) {
    return true;
  }

  return false;
}

/**
 * Update parent metadata in file content
 */
export function updateParentMetadataInContent(
  content: string,
  newParentId: string | undefined,
  newFeatureId: string,
  isOrphan: boolean
): string {
  let updated = content;

  // Update Feature ID
  updated = updated.replace(
    /^- \*\*Feature ID\*\*: .+$/m,
    `- **Feature ID**: ${newFeatureId}`
  );

  // Update or add Parent ID
  if (newParentId) {
    if (updated.match(/^- \*\*Parent ID\*\*: .+$/m)) {
      updated = updated.replace(
        /^- \*\*Parent ID\*\*: .+$/m,
        `- **Parent ID**: ${newParentId}`
      );
    } else {
      // Add Parent ID after Feature ID
      updated = updated.replace(
        /^(- \*\*Feature ID\*\*: .+)$/m,
        `$1\n- **Parent ID**: ${newParentId}`
      );
    }
  }

  // Remove Orphan line if no longer orphan
  if (!isOrphan) {
    updated = updated.replace(/^- \*\*Orphan\*\*: .+\n?/m, '');
  }

  return updated;
}

export interface MoveFileResult {
  moved: boolean;
  newFilePath?: string;
  reason?: string;
}

/**
 * Move user story file to new feature folder
 */
export async function moveUserStoryFile(
  oldFilePath: string,
  newFeatureId: string,
  baseDir: string,
  newParentId: string | undefined
): Promise<MoveFileResult> {
  // Calculate new file path
  const fileName = path.basename(oldFilePath);
  const newFilePath = path.join(baseDir, newFeatureId, fileName);

  // Read existing file content
  const existingContent = fs.readFileSync(oldFilePath, 'utf-8');

  // Update metadata in content
  const updatedContent = updateParentMetadataInContent(
    existingContent,
    newParentId,
    newFeatureId,
    false // No longer orphan
  );

  // Ensure target directory exists
  const targetDir = path.dirname(newFilePath);
  fs.mkdirSync(targetDir, { recursive: true });

  // Write to new location
  fs.writeFileSync(newFilePath, updatedContent, 'utf-8');

  // Remove old file
  fs.unlinkSync(oldFilePath);

  return {
    moved: true,
    newFilePath,
    reason: newParentId ? `Parent changed to ${newParentId}` : 'Orphan status changed'
  };
}
