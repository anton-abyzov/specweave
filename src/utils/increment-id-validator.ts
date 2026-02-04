/**
 * Increment ID Validator
 *
 * SECURITY: Centralized validation for increment IDs to prevent path traversal attacks.
 * Increment IDs are used in file paths - malicious IDs like "../../etc/passwd" could
 * escape the .specweave/increments directory.
 *
 * Valid formats:
 * - Standard: NNNN-name (e.g., "0001-feature-name")
 * - External: NNNNE-name (e.g., "0111E-external-import")
 * - Archived: Same as above, stored in _archive/
 *
 * @module utils/increment-id-validator
 */

/**
 * Validates increment ID format to prevent path traversal attacks.
 *
 * @param id - Increment ID to validate
 * @returns true if ID format is valid, false otherwise
 *
 * @example
 * isValidIncrementId('0001-feature-name') // true
 * isValidIncrementId('0111E-external')    // true
 * isValidIncrementId('0001A-hotfix')      // true (alpha suffix)
 * isValidIncrementId('../../etc')         // false (path traversal)
 * isValidIncrementId('')                  // false (empty)
 * isValidIncrementId('001-short')         // false (only 3 digits)
 */
export function isValidIncrementId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Expected format:
  // - 4 digits (0000-9999)
  // - Optional single letter suffix (A-Z, a-z, or E for external)
  // - Hyphen
  // - Kebab-case name (alphanumeric and hyphens, no leading/trailing hyphens)
  //
  // Regex breakdown:
  // ^\d{4}     - Must start with exactly 4 digits
  // [A-Za-z]?  - Optional single letter suffix
  // -          - Required hyphen separator
  // [a-zA-Z0-9] - Name must start with alphanumeric
  // [a-zA-Z0-9-]* - Rest of name can include hyphens
  // [a-zA-Z0-9]$ - Name must end with alphanumeric (prevents trailing hyphen)
  // OR
  // [a-zA-Z0-9]$ - Single character name is also valid
  //
  // Note: We don't allow dots, slashes, or other path-sensitive characters
  return /^\d{4}[A-Za-z]?-[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(id);
}

/**
 * Validates increment ID and throws an error if invalid.
 *
 * Use this in entry points (CLI commands, API handlers) where you want to
 * fail fast with a clear error message.
 *
 * @param id - Increment ID to validate
 * @throws Error if ID format is invalid
 *
 * @example
 * validateIncrementId('0001-feature'); // passes
 * validateIncrementId('../../etc');    // throws Error
 */
export function validateIncrementId(id: string): void {
  if (!isValidIncrementId(id)) {
    throw new Error(
      `Invalid increment ID format: "${id}". ` +
      `Expected format: NNNN-name (e.g., "0001-feature-name") or NNNNE-name for external imports.`
    );
  }
}

/**
 * Sanitizes an increment ID by extracting just the number prefix.
 * Useful for sorting or comparison operations.
 *
 * @param id - Increment ID to extract number from
 * @returns Numeric prefix (e.g., 1 for "0001-feature") or null if invalid
 *
 * @example
 * extractIncrementNumber('0053-feature')  // 53
 * extractIncrementNumber('0111E-external') // 111
 * extractIncrementNumber('invalid')       // null
 */
export function extractIncrementNumber(id: string): number | null {
  if (!id || typeof id !== 'string') {
    return null;
  }

  const match = id.match(/^(\d{4})/);
  if (!match) {
    return null;
  }

  return parseInt(match[1], 10);
}

/**
 * Checks if an increment ID has the external suffix (E).
 *
 * External increments are imported from external tools (GitHub, JIRA, ADO)
 * and have read-only sync behavior.
 *
 * @param id - Increment ID to check
 * @returns true if this is an external increment
 *
 * @example
 * isExternalIncrement('0111E-jira-import') // true
 * isExternalIncrement('0001-feature')      // false
 */
export function isExternalIncrement(id: string): boolean {
  if (!isValidIncrementId(id)) {
    return false;
  }
  return /^\d{4}E-/.test(id);
}
