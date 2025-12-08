/**
 * Feature ID Derivation Utility
 *
 * Derives feature ID from increment ID using the 1:1 mapping principle:
 * - Each increment maps to exactly one feature folder
 * - Feature ID = FS-{increment_number} or FS-{increment_number}E for external
 *
 * @example
 * deriveFeatureId('0081-ado-repo-cloning') → 'FS-081'
 * deriveFeatureId('0100-some-feature') → 'FS-100'
 * deriveFeatureId('1000-future-feature') → 'FS-1000'
 * deriveFeatureId('0111E-external-issue') → 'FS-111E'
 *
 * @see ADR-0140 for the decision rationale
 */

/**
 * Derive feature ID from increment ID
 *
 * The feature ID is derived directly from the increment number:
 * - Extract leading digits from increment ID
 * - Format as FS-XXX (minimum 3 digits, more if needed)
 * - Add 'E' suffix for external increments (e.g., 0111E-...)
 *
 * This eliminates the need to store feature_id in metadata.json,
 * as it's 100% derivable from the increment ID.
 *
 * CRITICAL (v0.33.0): External increments (with E suffix like 0111E-...)
 * MUST map to external features (FS-111E), not internal ones (FS-111).
 *
 * @param incrementId - Increment ID (e.g., "0081-ado-repo-cloning" or "0111E-external-issue")
 * @returns Feature ID (e.g., "FS-081" or "FS-111E")
 * @throws Error if increment ID format is invalid
 */
export function deriveFeatureId(incrementId: string): string {
  // Match number prefix and optional E suffix
  const match = incrementId.match(/^(\d+)(E)?/);
  if (!match) {
    throw new Error(`Invalid increment ID format: ${incrementId}. Expected format: NNNN-name or NNNNE-name`);
  }

  const num = parseInt(match[1], 10);
  const isExternal = match[2] === 'E';

  // padStart(3, '0') ensures minimum 3 digits (FS-001 to FS-999)
  // Numbers 1000+ naturally have 4+ digits (FS-1000, FS-1001, etc.)
  const featureId = `FS-${String(num).padStart(3, '0')}`;
  return isExternal ? `${featureId}E` : featureId;
}

/**
 * Extract increment number from increment ID
 *
 * @param incrementId - Increment ID (e.g., "0081-ado-repo-cloning")
 * @returns Increment number (e.g., 81)
 * @throws Error if increment ID format is invalid
 */
export function extractIncrementNumber(incrementId: string): number {
  const match = incrementId.match(/^(\d+)/);
  if (!match) {
    throw new Error(`Invalid increment ID format: ${incrementId}. Expected format: NNNN-name`);
  }
  return parseInt(match[1], 10);
}

/**
 * Validate feature ID format
 *
 * Valid formats:
 * - FS-XXX (internal, 3+ digits)
 * - FS-XXXE (external, 3+ digits with E suffix)
 *
 * @param featureId - Feature ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidFeatureId(featureId: string): boolean {
  return /^FS-\d{3,}E?$/.test(featureId);
}

/**
 * Check if feature ID is external (imported)
 *
 * External features have an 'E' suffix: FS-042E
 *
 * @param featureId - Feature ID to check
 * @returns true if external, false if internal
 */
export function isExternalFeatureId(featureId: string): boolean {
  return featureId.endsWith('E');
}
