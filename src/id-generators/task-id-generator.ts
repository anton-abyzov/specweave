/**
 * Task ID Generator
 *
 * Generates unique Task IDs with support for both internal and external origins.
 * - Internal IDs: T-001, T-002, T-003 (no suffix)
 * - External IDs: T-001E, T-002E, T-003E (E suffix)
 *
 * ID generation strategy:
 * 1. Extract numeric part from all existing IDs (ignoring suffix)
 * 2. Find maximum number across both internal and external IDs
 * 3. Increment to get next sequential number
 * 4. Add E suffix for external origin, no suffix for internal
 */

export type Origin = 'internal' | 'external';

export interface ParsedTaskId {
  /** Full ID string (e.g., "T-003E") */
  id: string;

  /** Numeric part (e.g., 3) */
  number: number;

  /** Origin type */
  origin: Origin;
}

/**
 * Parse Task ID to extract components
 *
 * @param id - Task ID (e.g., "T-001", "T-002E")
 * @returns Parsed ID components
 * @throws Error if ID format is invalid
 */
export function parseTaskId(id: string): ParsedTaskId {
  // Match: T-001 or T-001E
  const match = id.match(/^T-(\d+)(E)?$/);

  if (!match) {
    throw new Error(`Invalid Task ID format: ${id}. Expected format: T-XXX or T-XXXE`);
  }

  const number = parseInt(match[1], 10);
  const origin: Origin = match[2] === 'E' ? 'external' : 'internal';

  return {
    id,
    number,
    origin
  };
}

/**
 * Format Task ID with optional E suffix
 */
function formatTaskId(number: number, origin: Origin): string {
  const formattedNumber = String(number).padStart(3, '0');
  return origin === 'external' ? `T-${formattedNumber}E` : `T-${formattedNumber}`;
}

/**
 * Get next sequential Task ID
 *
 * Finds maximum numeric ID across all existing IDs (internal + external)
 * and generates next sequential ID with appropriate suffix.
 */
export function getNextTaskId(existingIds: string[], origin: Origin): string {
  if (existingIds.length === 0) {
    return formatTaskId(1, origin);
  }

  const numbers = existingIds
    .map(id => {
      try {
        return parseTaskId(id).number;
      } catch {
        return 0;
      }
    })
    .filter(n => n > 0);

  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  return formatTaskId(maxNumber + 1, origin);
}

/**
 * Validate ID uniqueness
 *
 * @param id - Task ID to check
 * @param existingIds - Array of existing Task IDs
 * @throws Error if ID already exists
 */
export function validateTaskIdUniqueness(id: string, existingIds: string[]): void {
  if (existingIds.includes(id)) {
    throw new Error(`ID collision detected: ${id} already exists`);
  }
}

/**
 * Detect origin from Task ID
 *
 * @param id - Task ID
 * @returns Origin type ('internal' or 'external')
 */
export function getTaskIdOrigin(id: string): Origin {
  const parsed = parseTaskId(id);
  return parsed.origin;
}

/**
 * Extract numeric part from Task ID
 *
 * @param id - Task ID
 * @returns Numeric part
 */
export function getTaskIdNumber(id: string): number {
  const parsed = parseTaskId(id);
  return parsed.number;
}

/**
 * Check if ID is external (has E suffix)
 *
 * @param id - Task ID
 * @returns true if external, false if internal
 */
export function isExternalTaskId(id: string): boolean {
  return getTaskIdOrigin(id) === 'external';
}

/**
 * Generate range of Task IDs
 */
export function generateTaskIdRange(start: number, count: number, origin: Origin): string[] {
  return Array.from({ length: count }, (_, i) => formatTaskId(start + i, origin));
}
