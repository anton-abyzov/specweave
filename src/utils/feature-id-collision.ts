/**
 * Feature ID Collision Detection Utility
 *
 * CRITICAL (2025-11-26): Prevents FS-XXX vs FS-XXXE collisions
 *
 * Problem: Internal feature IDs (FS-001) were generated without checking
 * if external features (FS-001E) existed with the same numeric index.
 *
 * Solution: Before generating any internal feature ID, check if either
 * FS-XXX or FS-XXXE exists. If collision detected, increment to next available.
 *
 * Usage:
 * ```typescript
 * // Instead of: const featureId = `FS-${num.toString().padStart(3, '0')}`;
 * // Use:
 * const num = await findNextAvailableInternalId(incrementNum, specsPath, projectId);
 * const featureId = `FS-${num.toString().padStart(3, '0')}`;
 * ```
 */

import * as fs from './fs-native.js';
import path from 'path';
import { Logger, consoleLogger } from './logger.js';

/**
 * Options for collision detection
 */
export interface CollisionCheckOptions {
  /** Logger instance for warnings */
  logger?: Logger;

  /** Maximum iterations to prevent infinite loops (default: 1000) */
  maxIterations?: number;
}

/**
 * Find the next available internal feature ID number that doesn't collide
 * with existing internal OR external features.
 *
 * CRITICAL: This function prevents FS-001 vs FS-001E collision by checking
 * if either variant exists before returning a number.
 *
 * CRITICAL FIX (2025-12-04): Now supports hierarchical project paths!
 * - Handles paths like "acme/backend-services" (2-level ADO structure)
 * - Scans _orphans folder for US-XXX files that may reference FS-IDs
 *
 * @param baseNumber - Starting number (typically from increment ID)
 * @param specsPath - Path to specs directory (e.g., .specweave/docs/internal/specs)
 * @param projectPath - Project path for multi-project mode (e.g., "my-project" or "acme/backend")
 * @param options - Optional configuration
 * @returns Next available number that doesn't conflict with existing features
 *
 * @example
 * ```typescript
 * // Increment 0001 would normally generate FS-001
 * // But if FS-001E exists, this returns 2 (for FS-002)
 * const num = await findNextAvailableInternalId(1, specsPath, 'my-project');
 *
 * // Works with hierarchical paths (ADO 2-level structure)
 * const num = await findNextAvailableInternalId(1, specsPath, 'acme-corp/backend-services');
 * ```
 */
export async function findNextAvailableInternalId(
  baseNumber: number,
  specsPath: string,
  projectPath: string,
  options: CollisionCheckOptions = {}
): Promise<number> {
  const logger = options.logger ?? consoleLogger;
  const maxIterations = options.maxIterations ?? 1000;

  // Build path to project's specs folder (supports hierarchical paths like "acme/backend")
  const projectSpecsPath = path.join(specsPath, projectPath);

  // If project folder doesn't exist, no collision possible
  if (!fs.existsSync(projectSpecsPath)) {
    return baseNumber;
  }

  let currentNumber = baseNumber;
  let iterations = 0;

  while (iterations < maxIterations) {
    const internalId = `FS-${currentNumber.toString().padStart(3, '0')}`;
    const externalId = `FS-${currentNumber.toString().padStart(3, '0')}E`;

    const internalPath = path.join(projectSpecsPath, internalId);
    const externalPath = path.join(projectSpecsPath, externalId);

    const internalExists = fs.existsSync(internalPath);
    const externalExists = fs.existsSync(externalPath);

    // CRITICAL FIX (2025-12-04): Also check _archive folder
    // Archived features still reserve their IDs to prevent reuse after restore
    const archivePath = path.join(projectSpecsPath, '_archive');
    const archiveInternalExists = fs.existsSync(path.join(archivePath, internalId));
    const archiveExternalExists = fs.existsSync(path.join(archivePath, externalId));

    // CRITICAL FIX (2025-12-04): Also check _orphans folder
    // Orphan items may have FS-IDs referenced in their metadata
    const orphanHasId = checkOrphansForFSId(projectSpecsPath, currentNumber);

    if (!internalExists && !externalExists && !archiveInternalExists && !archiveExternalExists && !orphanHasId) {
      // Found available slot
      if (currentNumber !== baseNumber) {
        // Determine which variant caused the collision for accurate messaging
        const baseInternalId = `FS-${baseNumber.toString().padStart(3, '0')}`;
        const baseExternalId = `${baseInternalId}E`;
        const baseInternalExists = fs.existsSync(path.join(projectSpecsPath, baseInternalId));
        const baseExternalExists = fs.existsSync(path.join(projectSpecsPath, baseExternalId));
        const existingId = baseExternalExists ? baseExternalId : baseInternalId;

        logger.warn(
          `⚠️ Feature ID collision avoided: ${projectPath}/${existingId} exists, ` +
          `using FS-${currentNumber.toString().padStart(3, '0')} instead`
        );
      }
      return currentNumber;
    }

    // Log what we found for debugging
    const hasCollision = internalExists || externalExists || archiveInternalExists || archiveExternalExists || orphanHasId;
    if (iterations === 0 && hasCollision) {
      if (externalExists) {
        logger.log(`   📋 Collision detected: ${projectPath}/${externalId} exists`);
      } else if (internalExists) {
        logger.log(`   📋 Collision detected: ${projectPath}/${internalId} exists`);
      } else if (archiveExternalExists) {
        logger.log(`   📋 Collision detected: ${projectPath}/_archive/${externalId} exists`);
      } else if (archiveInternalExists) {
        logger.log(`   📋 Collision detected: ${projectPath}/_archive/${internalId} exists`);
      } else if (orphanHasId) {
        logger.log(`   📋 Collision detected: FS-${currentNumber.toString().padStart(3, '0')} referenced in _orphans`);
      }
    }

    currentNumber++;
    iterations++;
  }

  // Safety: Should never reach here
  throw new Error(
    `Unable to find available feature ID after ${maxIterations} iterations. ` +
    `Started at ${baseNumber}, checked up to ${currentNumber - 1}. ` +
    `This indicates a serious problem with the specs folder.`
  );
}

// Helper function for async version to check base collision
function getExistingIdForBase(projectSpecsPath: string, baseNumber: number): string {
  const baseInternalId = `FS-${baseNumber.toString().padStart(3, '0')}`;
  const baseExternalId = `${baseInternalId}E`;
  const baseExternalExists = fs.existsSync(path.join(projectSpecsPath, baseExternalId));
  return baseExternalExists ? baseExternalId : baseInternalId;
}

/**
 * Check if _orphans folder contains files referencing a specific FS-ID
 *
 * @param projectSpecsPath - Path to project's specs folder
 * @param fsNumber - FS-ID number to check (e.g., 1 for FS-001)
 * @returns true if orphans folder has items referencing this FS-ID
 */
function checkOrphansForFSId(projectSpecsPath: string, fsNumber: number): boolean {
  const orphansPath = path.join(projectSpecsPath, '_orphans');

  if (!fs.existsSync(orphansPath)) {
    return false;
  }

  try {
    const entries = fs.readdirSync(orphansPath);
    const fsPattern = new RegExp(`FS-0*${fsNumber}E?`, 'i');

    for (const entry of entries) {
      // Check if filename matches FS-ID pattern
      if (fsPattern.test(entry)) {
        return true;
      }

      // Also check file content for frontmatter references
      const filePath = path.join(orphansPath, entry);
      if (entry.endsWith('.md') && fs.statSync(filePath).isFile()) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          // Check frontmatter for featureId reference (both with and without E suffix)
          const paddedId = fsNumber.toString().padStart(3, '0');
          if (content.includes(`featureId: FS-${paddedId}`) ||
              content.includes(`featureId: FS-${paddedId}E`) ||
              content.includes(`feature_id: FS-${paddedId}`) ||
              content.includes(`feature_id: FS-${paddedId}E`)) {
            return true;
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Error reading orphans folder - assume no collision
  }

  return false;
}

/**
 * Synchronous version of findNextAvailableInternalId
 *
 * CRITICAL FIX (2025-12-04): Updated to match async version with:
 * - Support for hierarchical project paths (e.g., "acme/backend")
 * - _orphans folder scanning
 *
 * Use this in synchronous contexts where async isn't available.
 */
export function findNextAvailableInternalIdSync(
  baseNumber: number,
  specsPath: string,
  projectPath: string,
  options: CollisionCheckOptions = {}
): number {
  const logger = options.logger ?? consoleLogger;
  const maxIterations = options.maxIterations ?? 1000;

  // Build path to project's specs folder (supports hierarchical paths like "acme/backend")
  const projectSpecsPath = path.join(specsPath, projectPath);

  // If project folder doesn't exist, no collision possible
  if (!fs.existsSync(projectSpecsPath)) {
    return baseNumber;
  }

  let currentNumber = baseNumber;
  let iterations = 0;

  while (iterations < maxIterations) {
    const internalId = `FS-${currentNumber.toString().padStart(3, '0')}`;
    const externalId = `FS-${currentNumber.toString().padStart(3, '0')}E`;

    const internalPath = path.join(projectSpecsPath, internalId);
    const externalPath = path.join(projectSpecsPath, externalId);

    const internalExists = fs.existsSync(internalPath);
    const externalExists = fs.existsSync(externalPath);

    // CRITICAL FIX (2025-12-04): Also check _archive folder
    // Archived features still reserve their IDs to prevent reuse after restore
    const archivePath = path.join(projectSpecsPath, '_archive');
    const archiveInternalExists = fs.existsSync(path.join(archivePath, internalId));
    const archiveExternalExists = fs.existsSync(path.join(archivePath, externalId));

    // CRITICAL FIX (2025-12-04): Also check _orphans folder
    const orphanHasId = checkOrphansForFSId(projectSpecsPath, currentNumber);

    if (!internalExists && !externalExists && !archiveInternalExists && !archiveExternalExists && !orphanHasId) {
      // Found available slot
      if (currentNumber !== baseNumber) {
        // Use helper to determine which variant caused the collision
        const existingId = getExistingIdForBase(projectSpecsPath, baseNumber);
        logger.warn(
          `⚠️ Feature ID collision avoided: ${projectPath}/${existingId} exists, ` +
          `using FS-${currentNumber.toString().padStart(3, '0')} instead`
        );
      }
      return currentNumber;
    }

    currentNumber++;
    iterations++;
  }

  // Safety: Should never reach here
  throw new Error(
    `Unable to find available feature ID after ${maxIterations} iterations.`
  );
}

/**
 * Check if a specific numeric index has a collision (either FS-XXX or FS-XXXE exists)
 *
 * CRITICAL FIX (2025-12-04): Now supports hierarchical paths, _orphans and _archive folders
 *
 * @param number - Numeric index to check
 * @param specsPath - Path to specs directory
 * @param projectPath - Project path (may be hierarchical like "acme/backend")
 * @returns Object indicating which variants exist
 */
export function checkFeatureIdCollision(
  number: number,
  specsPath: string,
  projectPath: string
): { internalExists: boolean; externalExists: boolean; archiveExists: boolean; orphanHasId: boolean; hasCollision: boolean } {
  const projectSpecsPath = path.join(specsPath, projectPath);

  if (!fs.existsSync(projectSpecsPath)) {
    return { internalExists: false, externalExists: false, archiveExists: false, orphanHasId: false, hasCollision: false };
  }

  const internalId = `FS-${number.toString().padStart(3, '0')}`;
  const externalId = `FS-${number.toString().padStart(3, '0')}E`;

  const internalExists = fs.existsSync(path.join(projectSpecsPath, internalId));
  const externalExists = fs.existsSync(path.join(projectSpecsPath, externalId));

  // CRITICAL FIX (2025-12-04): Also check _archive folder
  const archivePath = path.join(projectSpecsPath, '_archive');
  const archiveInternalExists = fs.existsSync(path.join(archivePath, internalId));
  const archiveExternalExists = fs.existsSync(path.join(archivePath, externalId));
  const archiveExists = archiveInternalExists || archiveExternalExists;

  const orphanHasId = checkOrphansForFSId(projectSpecsPath, number);

  return {
    internalExists,
    externalExists,
    archiveExists,
    orphanHasId,
    hasCollision: internalExists || externalExists || archiveExists || orphanHasId
  };
}

/**
 * Find the next available user story ID number that doesn't collide
 * with existing internal OR external user stories.
 *
 * CRITICAL (2025-12-04): Prevents US-001 vs US-001E collision
 * - Scans all FS-XXX folders for us-*.md files
 * - Scans _orphans folder for us-*.md files
 * - Returns the max ID + 1 to avoid collision
 *
 * @param projectSpecsPath - Path to project's specs folder
 * @param options - Optional configuration
 * @returns Next available US-ID number
 *
 * @example
 * ```typescript
 * // If US-001E, US-002E exist in the project, returns 3
 * const nextId = findNextAvailableUSId('/path/to/specs/my-project');
 * ```
 */
export function findNextAvailableUSId(
  projectSpecsPath: string,
  options: CollisionCheckOptions = {}
): number {
  const logger = options.logger ?? consoleLogger;

  if (!fs.existsSync(projectSpecsPath)) {
    return 1;
  }

  const usedIds = new Set<number>();

  try {
    const entries = fs.readdirSync(projectSpecsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Scan FS-XXX folders for us-*.md files
      if (/^FS-\d{3,}E?$/.test(entry.name)) {
        const featurePath = path.join(projectSpecsPath, entry.name);
        scanFolderForUSIds(featurePath, usedIds);
      }

      // Scan _orphans folder
      if (entry.name === '_orphans') {
        const orphansPath = path.join(projectSpecsPath, entry.name);
        scanFolderForUSIds(orphansPath, usedIds);
      }

      // Scan _archive folder (may have archived features with US-IDs)
      if (entry.name === '_archive') {
        const archivePath = path.join(projectSpecsPath, entry.name);
        try {
          const archiveEntries = fs.readdirSync(archivePath, { withFileTypes: true });
          for (const archiveEntry of archiveEntries) {
            if (archiveEntry.isDirectory() && /^FS-\d{3,}E?$/.test(archiveEntry.name)) {
              scanFolderForUSIds(path.join(archivePath, archiveEntry.name), usedIds);
            }
          }
        } catch {
          // Error reading archive folder - continue
        }
      }
    }
  } catch (error) {
    logger.warn(`   ⚠️ Error scanning for US-IDs: ${error}`);
  }

  // Find next available ID (max + 1)
  if (usedIds.size === 0) {
    return 1;
  }

  const maxId = Math.max(...usedIds);
  return maxId + 1;
}

/**
 * Scan a folder for us-*.md files and extract US-ID numbers
 */
function scanFolderForUSIds(folderPath: string, usedIds: Set<number>): void {
  try {
    const files = fs.readdirSync(folderPath);
    // Match us-001.md, us-001e-title.md, us-042e.md, etc.
    const usPattern = /^us-(\d{3,})e?/i;

    for (const file of files) {
      const match = file.match(usPattern);
      if (match) {
        usedIds.add(parseInt(match[1], 10));
      }
    }
  } catch {
    // Error reading folder - continue
  }
}

/**
 * Check if a specific US-ID number is already used
 *
 * @param number - US-ID number to check (e.g., 1 for US-001)
 * @param projectSpecsPath - Path to project's specs folder
 * @returns true if either US-XXX or US-XXXE exists
 */
export function isUSIdUsed(number: number, projectSpecsPath: string): boolean {
  if (!fs.existsSync(projectSpecsPath)) {
    return false;
  }

  const usedIds = new Set<number>();

  try {
    const entries = fs.readdirSync(projectSpecsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Scan FS-XXX folders
      if (/^FS-\d{3,}E?$/.test(entry.name)) {
        scanFolderForUSIds(path.join(projectSpecsPath, entry.name), usedIds);
        if (usedIds.has(number)) return true;
      }

      // Scan _orphans folder
      if (entry.name === '_orphans') {
        scanFolderForUSIds(path.join(projectSpecsPath, entry.name), usedIds);
        if (usedIds.has(number)) return true;
      }
    }
  } catch {
    // Error scanning - assume no collision
  }

  return usedIds.has(number);
}

/**
 * Validate increment number uniqueness
 *
 * CRITICAL (2025-12-04): Prevents duplicate increment numbers like:
 * - 0101-judge-llm-command
 * - 0101-llm-json-extraction-hardening
 *
 * This causes chain shifts in living docs sync because each sync sees
 * the other's FS folder as a "collision".
 *
 * @param incrementNumber - Numeric prefix to validate (e.g., 101 for 0101-xxx)
 * @param incrementsPath - Path to increments folder
 * @returns Object with validation result and existing increment name if duplicate found
 */
export function validateIncrementNumberUnique(
  incrementNumber: number,
  incrementsPath: string
): { isUnique: boolean; existingIncrement?: string } {
  if (!fs.existsSync(incrementsPath)) {
    return { isUnique: true };
  }

  const paddedNumber = incrementNumber.toString().padStart(4, '0');
  const pattern = new RegExp(`^${paddedNumber}-`);

  try {
    const entries = fs.readdirSync(incrementsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== '_archive' && pattern.test(entry.name)) {
        return { isUnique: false, existingIncrement: entry.name };
      }
    }

    // Also check archive
    const archivePath = path.join(incrementsPath, '_archive');
    if (fs.existsSync(archivePath)) {
      const archiveEntries = fs.readdirSync(archivePath, { withFileTypes: true });
      for (const entry of archiveEntries) {
        if (entry.isDirectory() && pattern.test(entry.name)) {
          return { isUnique: false, existingIncrement: `_archive/${entry.name}` };
        }
      }
    }
  } catch {
    // Error reading - assume unique to avoid blocking
  }

  return { isUnique: true };
}

/**
 * Scan for duplicate increment numbers in the increments folder
 *
 * Returns all increment numbers that appear more than once.
 * Useful for detecting existing duplicates that need cleanup.
 *
 * @param incrementsPath - Path to increments folder
 * @returns Map of increment number to array of full increment names
 */
export function findDuplicateIncrementNumbers(
  incrementsPath: string
): Map<number, string[]> {
  const duplicates = new Map<number, string[]>();

  if (!fs.existsSync(incrementsPath)) {
    return duplicates;
  }

  const numberToNames = new Map<number, string[]>();

  try {
    const entries = fs.readdirSync(incrementsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === '_archive') continue;

      const match = entry.name.match(/^(\d{3,4})E?-/);
      if (match) {
        const num = parseInt(match[1], 10);
        const existing = numberToNames.get(num) || [];
        existing.push(entry.name);
        numberToNames.set(num, existing);
      }
    }

    // Filter to only duplicates
    for (const [num, names] of numberToNames) {
      if (names.length > 1) {
        duplicates.set(num, names);
      }
    }
  } catch {
    // Error reading folder
  }

  return duplicates;
}
