/**
 * User Story ID Generator
 *
 * Generates unique User Story IDs with support for both internal and external origins.
 * - Internal IDs: US-001, US-002, US-003 (no suffix)
 * - External IDs: US-001E, US-002E, US-003E (E suffix)
 *
 * ID generation strategy:
 * 1. Extract numeric part from all existing IDs (ignoring suffix)
 * 2. Find maximum number across both internal and external IDs
 * 3. Increment to get next sequential number
 * 4. Add E suffix for external origin, no suffix for internal
 */

export type Origin = 'internal' | 'external';

export interface ParsedUsId {
  /** Full ID string (e.g., "US-003E") */
  id: string;

  /** Numeric part (e.g., 3) */
  number: number;

  /** Origin type */
  origin: Origin;
}

/**
 * Parse User Story ID to extract components
 *
 * @param id - User Story ID (e.g., "US-001", "US-002E")
 * @returns Parsed ID components
 * @throws Error if ID format is invalid
 */
export function parseUsId(id: string): ParsedUsId {
  // Match: US-001 or US-001E
  const match = id.match(/^US-(\d+)(E)?$/);

  if (!match) {
    throw new Error(`Invalid User Story ID format: ${id}. Expected format: US-XXX or US-XXXE`);
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
 * Get next sequential User Story ID
 *
 * Finds maximum numeric ID across all existing IDs (internal + external)
 * and generates next sequential ID with appropriate suffix.
 *
 * @param existingIds - Array of existing User Story IDs
 * @param origin - Origin type for new ID
 * @returns Next sequential User Story ID
 *
 * @example
 * getNextUsId(['US-001', 'US-002E', 'US-003'], 'internal')
 * // Returns: 'US-004'
 *
 * @example
 * getNextUsId(['US-001', 'US-002E', 'US-003'], 'external')
 * // Returns: 'US-004E'
 */
export function getNextUsId(existingIds: string[], origin: Origin): string {
  if (existingIds.length === 0) {
    return origin === 'external' ? 'US-001E' : 'US-001';
  }

  // Extract numeric parts from all IDs
  const numbers: number[] = [];

  for (const id of existingIds) {
    try {
      const parsed = parseUsId(id);
      numbers.push(parsed.number);
    } catch (error) {
      // Skip invalid IDs (they'll be caught by validation elsewhere)
      continue;
    }
  }

  // Find maximum number
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;

  // Generate next ID
  const nextNumber = maxNumber + 1;
  const formattedNumber = String(nextNumber).padStart(3, '0');

  return origin === 'external' ? `US-${formattedNumber}E` : `US-${formattedNumber}`;
}

/**
 * Validate ID uniqueness
 *
 * @param id - User Story ID to check
 * @param existingIds - Array of existing User Story IDs
 * @throws Error if ID already exists
 */
export function validateUsIdUniqueness(id: string, existingIds: string[]): void {
  if (existingIds.includes(id)) {
    throw new Error(`ID collision detected: ${id} already exists`);
  }
}

/**
 * Detect origin from User Story ID
 *
 * @param id - User Story ID
 * @returns Origin type ('internal' or 'external')
 */
export function getUsIdOrigin(id: string): Origin {
  const parsed = parseUsId(id);
  return parsed.origin;
}

/**
 * Extract numeric part from User Story ID
 *
 * @param id - User Story ID
 * @returns Numeric part
 */
export function getUsIdNumber(id: string): number {
  const parsed = parseUsId(id);
  return parsed.number;
}

/**
 * Check if ID is external (has E suffix)
 *
 * @param id - User Story ID
 * @returns true if external, false if internal
 */
export function isExternalUsId(id: string): boolean {
  return getUsIdOrigin(id) === 'external';
}

/**
 * Generate range of User Story IDs
 *
 * @param start - Starting number
 * @param count - Number of IDs to generate
 * @param origin - Origin type
 * @returns Array of User Story IDs
 *
 * @example
 * generateUsIdRange(1, 3, 'internal')
 * // Returns: ['US-001', 'US-002', 'US-003']
 *
 * @example
 * generateUsIdRange(5, 2, 'external')
 * // Returns: ['US-005E', 'US-006E']
 */
export function generateUsIdRange(start: number, count: number, origin: Origin): string[] {
  const ids: string[] = [];

  for (let i = 0; i < count; i++) {
    const number = start + i;
    const formattedNumber = String(number).padStart(3, '0');
    const id = origin === 'external' ? `US-${formattedNumber}E` : `US-${formattedNumber}`;
    ids.push(id);
  }

  return ids;
}
