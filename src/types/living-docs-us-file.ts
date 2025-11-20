/**
 * Living Docs User Story File Type Definitions
 * Includes format preservation metadata (T-034A)
 */

export interface LivingDocsUSFile {
  /** User Story ID (e.g., "US-001", "US-002E") */
  id: string;

  /** User Story title */
  title: string;

  /** User Story description/overview */
  description?: string;

  /** Acceptance Criteria IDs */
  acceptanceCriteria?: string[];

  /** Implementation status */
  status?: 'draft' | 'in-progress' | 'completed' | 'archived';

  /** Priority level */
  priority?: 'P0' | 'P1' | 'P2' | 'P3';

  // ========================================================================
  // FORMAT PRESERVATION METADATA (NEW - T-034A, v0.23.0)
  // ========================================================================

  /**
   * Format preservation flag
   * - true: External item, preserve original format (comment-only sync)
   * - false: Internal item, allow full sync (title, description, ACs)
   */
  format_preservation?: boolean;

  /**
   * Original external title (for validation)
   * Stored to detect if external tool accidentally modified title
   */
  external_title?: string;

  /**
   * External source platform
   */
  external_source?: 'github' | 'jira' | 'ado';

  /**
   * External item ID (e.g., "GH-#638", "JIRA-SPEC-789")
   */
  external_id?: string;

  /**
   * External item URL
   */
  external_url?: string;

  /**
   * Import timestamp
   */
  imported_at?: string;

  /**
   * Origin (internal | external)
   * Derived from ID suffix (E = external)
   */
  origin?: 'internal' | 'external';
}

/**
 * Check if US file has format preservation enabled
 */
export function hasFormatPreservation(usFile: LivingDocsUSFile): boolean {
  return usFile.format_preservation === true;
}

/**
 * Check if US is external (based on ID suffix)
 */
export function isExternalUS(usId: string): boolean {
  return usId.toUpperCase().endsWith('E');
}

/**
 * Extract origin from US metadata
 */
export function getOrigin(usFile: LivingDocsUSFile): 'internal' | 'external' {
  if (usFile.origin) {
    return usFile.origin;
  }

  // Infer from ID
  return isExternalUS(usFile.id) ? 'external' : 'internal';
}
