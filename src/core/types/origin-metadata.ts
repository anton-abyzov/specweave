/**
 * Origin Metadata Types
 *
 * Defines types for tracking the origin of User Stories and Tasks:
 * - Internal: Created within SpecWeave increments
 * - External: Imported from external tools (GitHub, JIRA, ADO)
 */

export type Origin = 'internal' | 'external';

export type ExternalSource = 'github' | 'jira' | 'ado' | 'unknown';

/**
 * External item metadata (stored in spec.md/tasks.md frontmatter)
 */
export interface ExternalItemMetadata {
  /** User Story or Task ID (e.g., "US-004E", "T-010E") */
  id: string;

  /** Origin type */
  origin: 'external';

  /** External tool source */
  source: ExternalSource;

  /** External ID in source system (e.g., "GH-#638", "JIRA-SPEC-789") */
  external_id: string;

  /** External URL (link to original item) */
  external_url: string;

  /** Timestamp when imported */
  imported_at: string; // ISO 8601 format

  /** External title (original, may differ from SpecWeave format) */
  external_title?: string;

  /** Format preservation flag (if true, preserve original title/description) */
  format_preservation?: boolean;
}

/**
 * Extended spec frontmatter with external items
 */
export interface SpecFrontmatter {
  increment: string;
  title: string;
  type: string;
  priority?: string;
  status?: string;
  created?: string;
  epic?: string;
  test_mode?: string;
  coverage_target?: number;

  /** External items imported into this increment */
  external_items?: ExternalItemMetadata[];
}

/**
 * Extended task frontmatter with external items
 */
export interface TasksFrontmatter {
  total_tasks: number;
  completed: number;
  by_user_story?: Record<string, number>;
  test_mode?: string;
  coverage_target?: number;

  /** External items imported into tasks */
  external_items?: ExternalItemMetadata[];
}

/**
 * Origin badge emojis for living docs
 */
export const ORIGIN_BADGES: Record<ExternalSource | 'internal', string> = {
  internal: '🏠',  // Internal
  github: '🔗',   // GitHub
  jira: '🎫',     // JIRA
  ado: '📋',      // Azure DevOps
  unknown: '❓'   // Unknown external source
};

/**
 * Get origin badge for display
 *
 * @param source - External source or 'internal'
 * @returns Emoji badge
 *
 * @example
 * getOriginBadge('github') // Returns: '🔗'
 * getOriginBadge('internal') // Returns: '🏠'
 */
export function getOriginBadge(source: ExternalSource | 'internal'): string {
  return ORIGIN_BADGES[source] || ORIGIN_BADGES.unknown;
}

/**
 * Format origin for display in living docs
 *
 * @param metadata - External item metadata
 * @returns Formatted origin string (e.g., "🔗 GitHub #638")
 *
 * @example
 * formatOrigin({
 *   id: 'US-004E',
 *   origin: 'external',
 *   source: 'github',
 *   external_id: 'GH-#638',
 *   external_url: 'https://github.com/...',
 *   imported_at: '2025-11-19T10:30:00Z'
 * })
 * // Returns: "🔗 [GitHub #638](https://github.com/...)"
 */
export function formatOrigin(metadata: ExternalItemMetadata): string {
  const badge = getOriginBadge(metadata.source);
  const displayId = metadata.external_id.replace(/^(GH|JIRA|ADO)-/, '');

  return `${badge} [${metadata.source.toUpperCase()} ${displayId}](${metadata.external_url})`;
}

/**
 * Check if ID is from external source (has E suffix)
 *
 * @param id - User Story or Task ID
 * @returns True if external, false if internal
 *
 * @example
 * isExternalId('US-004E') // Returns: true
 * isExternalId('US-003') // Returns: false
 * isExternalId('T-010E') // Returns: true
 */
export function isExternalId(id: string): boolean {
  return id.endsWith('E');
}

/**
 * Extract origin from ID suffix
 *
 * @param id - User Story or Task ID
 * @returns Origin type
 *
 * @example
 * getOriginFromId('US-004E') // Returns: 'external'
 * getOriginFromId('US-003') // Returns: 'internal'
 */
export function getOriginFromId(id: string): Origin {
  return isExternalId(id) ? 'external' : 'internal';
}

/**
 * Parse external ID to extract source and number
 *
 * @param externalId - External ID (e.g., "GH-#638", "JIRA-SPEC-789")
 * @returns Parsed components
 *
 * @example
 * parseExternalId('GH-#638')
 * // Returns: { source: 'github', number: '638' }
 *
 * parseExternalId('JIRA-SPEC-789')
 * // Returns: { source: 'jira', number: 'SPEC-789' }
 */
export function parseExternalId(externalId: string): {
  source: ExternalSource;
  number: string;
} | null {
  const ghMatch = externalId.match(/^GH-#?(\d+)$/);
  if (ghMatch) {
    return { source: 'github', number: ghMatch[1] };
  }

  const jiraMatch = externalId.match(/^JIRA-(.+)$/);
  if (jiraMatch) {
    return { source: 'jira', number: jiraMatch[1] };
  }

  const adoMatch = externalId.match(/^ADO-(\d+)$/);
  if (adoMatch) {
    return { source: 'ado', number: adoMatch[1] };
  }

  return null;
}

/**
 * Create external item metadata
 *
 * @param params - Creation parameters
 * @returns External item metadata
 */
export function createExternalMetadata(params: {
  id: string;
  source: ExternalSource;
  externalId: string;
  externalUrl: string;
  externalTitle?: string;
  formatPreservation?: boolean;
}): ExternalItemMetadata {
  const metadata: ExternalItemMetadata = {
    id: params.id,
    origin: 'external',
    source: params.source,
    external_id: params.externalId,
    external_url: params.externalUrl,
    imported_at: new Date().toISOString()
  };

  // Only include optional fields if explicitly provided
  if (params.externalTitle !== undefined) {
    metadata.external_title = params.externalTitle;
  }

  if (params.formatPreservation !== undefined) {
    metadata.format_preservation = params.formatPreservation;
  }

  return metadata;
}

/**
 * Validate external item metadata
 *
 * @param metadata - External item metadata
 * @throws Error if metadata is invalid
 */
export function validateExternalMetadata(metadata: ExternalItemMetadata): void {
  if (!metadata.id) {
    throw new Error('External item metadata must have id');
  }

  if (!metadata.id.endsWith('E')) {
    throw new Error(`External item ID must end with E suffix: ${metadata.id}`);
  }

  if (metadata.origin !== 'external') {
    throw new Error(`External item must have origin='external': ${metadata.id}`);
  }

  if (!['github', 'jira', 'ado', 'unknown'].includes(metadata.source)) {
    throw new Error(`Invalid external source: ${metadata.source}`);
  }

  if (!metadata.external_id) {
    throw new Error(`External item must have external_id: ${metadata.id}`);
  }

  if (!metadata.external_url) {
    throw new Error(`External item must have external_url: ${metadata.id}`);
  }

  if (!metadata.imported_at) {
    throw new Error(`External item must have imported_at: ${metadata.id}`);
  }

  // Validate ISO 8601 format
  const timestamp = new Date(metadata.imported_at);
  if (isNaN(timestamp.getTime())) {
    throw new Error(`Invalid imported_at timestamp: ${metadata.imported_at}`);
  }
}
