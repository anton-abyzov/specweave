/**
 * Docs Folder Numbering Collision Prevention
 *
 * Prevents duplicate numbered folder prefixes in user documentation folders.
 * Supports both 2-digit (NN) and 3-digit (NNN) patterns:
 * - 2-digit: 01-platform, 02-architecture (default range 1-98, 99 reserved)
 * - 3-digit: 001-platform, 100-advanced (extended range)
 *
 * @module utils/docs-folder-numbering
 */

import * as fs from './fs-native.js';

/**
 * Options for docs folder number utilities
 */
export interface DocsFolderNumberOptions {
  /** Starting number to search from (default: 1) */
  startFrom?: number;
  /** Maximum number to search up to (default: 98, reserves 99 for archive) */
  maxNumber?: number;
  /** Whether to find gaps in sequence (default: true) */
  findGaps?: boolean;
}

/**
 * Error thrown when all available folder number slots are exhausted
 */
export class DocsNumberingOverflowError extends Error {
  constructor(startFrom: number, maxNumber: number) {
    super(
      `Docs folder numbering overflow: All slots from ${startFrom} to ${maxNumber} are used. ` +
      `Consider increasing maxNumber or reorganizing existing folders.`
    );
    this.name = 'DocsNumberingOverflowError';
  }
}

/**
 * Pattern to match numbered docs folders: NN-name or NNN-name
 * Supports both 2-digit (01-99) and 3-digit (001-999) prefixes
 * Captures the numeric prefix
 */
const NUMBERED_FOLDER_PATTERN = /^(\d{2,3})-/;

/**
 * Reserved folder number for archive (99-archive convention)
 */
const ARCHIVE_NUMBER = 99;

/**
 * Get all used folder number prefixes in a docs directory
 *
 * Scans the directory for folders matching the NN-name pattern
 * and returns a Set of the numeric prefixes in use.
 *
 * @param docsPath - Path to the docs directory
 * @returns Set of used numeric prefixes
 *
 * @example
 * ```typescript
 * // If docs/ contains: 01-platform, 02-architecture, 04-deployment
 * const used = getUsedDocsFolderNumbers('/path/to/docs');
 * // Returns: Set([1, 2, 4])
 * ```
 */
export function getUsedDocsFolderNumbers(docsPath: string): Set<number> {
  const used = new Set<number>();

  if (!fs.existsSync(docsPath)) {
    return used;
  }

  try {
    const entries = fs.readdirSync(docsPath, { withFileTypes: true });

    for (const entry of entries) {
      // Only process directories
      if (!entry.isDirectory()) continue;

      const match = entry.name.match(NUMBERED_FOLDER_PATTERN);
      if (match) {
        const num = parseInt(match[1], 10);
        used.add(num);
      }
    }
  } catch {
    // Error reading directory - return empty set
  }

  return used;
}

/**
 * Get the next available folder number prefix
 *
 * Finds the next available number for a new docs folder,
 * either by finding a gap in the sequence or returning max + 1.
 *
 * @param docsPath - Path to the docs directory
 * @param options - Configuration options
 * @returns Next available number
 * @throws {DocsNumberingOverflowError} When all slots from startFrom to maxNumber are used
 *
 * @example
 * ```typescript
 * // If docs/ contains: 01-platform, 02-architecture, 04-deployment
 * const next = getNextAvailableDocsFolderNumber('/path/to/docs');
 * // Returns: 3 (finds the gap)
 *
 * // If docs/ contains: 01-platform, 02-architecture, 03-development
 * const next = getNextAvailableDocsFolderNumber('/path/to/docs');
 * // Returns: 4 (next sequential)
 * ```
 */
export function getNextAvailableDocsFolderNumber(
  docsPath: string,
  options: DocsFolderNumberOptions = {}
): number {
  const { startFrom = 1, maxNumber = 98, findGaps = true } = options;

  const used = getUsedDocsFolderNumbers(docsPath);

  // If no folders exist, start from the beginning
  if (used.size === 0) {
    return startFrom;
  }

  // If finding gaps, scan from startFrom to find first available
  if (findGaps) {
    for (let num = startFrom; num <= maxNumber; num++) {
      if (num === ARCHIVE_NUMBER) continue; // Skip reserved archive number
      if (!used.has(num)) {
        return num;
      }
    }
    // All slots used - throw overflow error
    throw new DocsNumberingOverflowError(startFrom, maxNumber);
  }

  // Not finding gaps - return max + 1 if within bounds
  const maxUsed = Math.max(...used);
  let next = maxUsed + 1;

  // Skip archive number
  if (next === ARCHIVE_NUMBER) {
    next = 100;
  }

  // Check if next exceeds maxNumber
  if (next > maxNumber) {
    throw new DocsNumberingOverflowError(startFrom, maxNumber);
  }

  return next;
}

/**
 * Check if a specific folder number prefix would cause a collision
 *
 * @param docsPath - Path to the docs directory
 * @param number - Number prefix to check (1-99)
 * @returns true if the number is already in use
 *
 * @example
 * ```typescript
 * // If docs/ contains: 01-platform
 * hasDocsFolderCollision('/path/to/docs', 1);  // true
 * hasDocsFolderCollision('/path/to/docs', 2);  // false
 * ```
 */
export function hasDocsFolderCollision(docsPath: string, number: number): boolean {
  const used = getUsedDocsFolderNumbers(docsPath);
  return used.has(number);
}

/**
 * Format a folder number as a two-digit prefix
 *
 * @param number - Number to format (1-99)
 * @returns Two-digit string (e.g., "01", "12")
 *
 * @example
 * ```typescript
 * formatDocsFolderNumber(1);   // "01"
 * formatDocsFolderNumber(12);  // "12"
 * ```
 */
export function formatDocsFolderNumber(number: number): string {
  return number.toString().padStart(2, '0');
}

/**
 * Generate a safe folder name with the next available number
 *
 * Combines collision detection with folder name generation.
 *
 * @param docsPath - Path to the docs directory
 * @param name - Folder name without number prefix
 * @param options - Configuration options
 * @returns Full folder name with unique number prefix
 *
 * @example
 * ```typescript
 * // If docs/ contains: 01-platform, 02-architecture
 * generateSafeDocsFolderName('/path/to/docs', 'development');
 * // Returns: "03-development"
 * ```
 */
export function generateSafeDocsFolderName(
  docsPath: string,
  name: string,
  options: DocsFolderNumberOptions = {}
): string {
  const nextNumber = getNextAvailableDocsFolderNumber(docsPath, options);
  const prefix = formatDocsFolderNumber(nextNumber);
  return `${prefix}-${name}`;
}

/**
 * Detect all folder number collisions in a docs directory
 *
 * Scans for multiple folders sharing the same numeric prefix.
 *
 * @param docsPath - Path to the docs directory
 * @returns Map of colliding number to array of folder names
 *
 * @example
 * ```typescript
 * // If docs/ contains: 04-deployment, 04-workflows (collision!)
 * const collisions = detectDocsFolderCollisions('/path/to/docs');
 * // Returns: Map { 4 => ['04-deployment', '04-workflows'] }
 * ```
 */
export function detectDocsFolderCollisions(
  docsPath: string
): Map<number, string[]> {
  const collisions = new Map<number, string[]>();

  if (!fs.existsSync(docsPath)) {
    return collisions;
  }

  const numberToFolders = new Map<number, string[]>();

  try {
    const entries = fs.readdirSync(docsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const match = entry.name.match(NUMBERED_FOLDER_PATTERN);
      if (match) {
        const num = parseInt(match[1], 10);
        const existing = numberToFolders.get(num) || [];
        existing.push(entry.name);
        numberToFolders.set(num, existing);
      }
    }

    // Filter to only collisions (more than one folder per number)
    for (const [num, folders] of numberToFolders) {
      if (folders.length > 1) {
        collisions.set(num, folders);
      }
    }
  } catch {
    // Error reading directory
  }

  return collisions;
}
