/**
 * Sync Types — Platform Suffix ID System
 *
 * Replaces the legacy E suffix with platform-specific suffixes:
 *   G = GitHub, J = JIRA, A = Azure DevOps, E = Legacy
 *
 * ADR-0233: Platform suffix IDs use independent namespaces.
 * FS-042 (internal) and FS-042G (GitHub) coexist without collision.
 */

// ---------------------------------------------------------------------------
// Platform & Suffix types
// ---------------------------------------------------------------------------

export type Platform = 'github' | 'jira' | 'ado';
export type PlatformSuffix = 'G' | 'J' | 'A' | 'E';
export type IdPrefix = 'FS' | 'US' | 'T';

export const SUFFIX_MAP: Record<Platform, PlatformSuffix> = {
  github: 'G',
  jira: 'J',
  ado: 'A',
} as const;

export const PLATFORM_MAP: Record<string, Platform> = {
  G: 'github',
  J: 'jira',
  A: 'ado',
} as const;

// ---------------------------------------------------------------------------
// Parsed ID
// ---------------------------------------------------------------------------

export interface ParsedId {
  prefix: IdPrefix;
  number: number;
  suffix?: PlatformSuffix;
  platform?: Platform;
  isExternal: boolean;
}

const ID_REGEX = /^(FS|US|T)-(\d+)([GJAE])?$/;

/**
 * Parse a SpecWeave ID into its components.
 *
 * @example
 * parseId('FS-042G') → { prefix: 'FS', number: 42, suffix: 'G', platform: 'github', isExternal: true }
 * parseId('US-004')  → { prefix: 'US', number: 4,  suffix: undefined, platform: undefined, isExternal: false }
 */
export function parseId(id: string): ParsedId | null {
  const match = id.match(ID_REGEX);
  if (!match) return null;

  const prefix = match[1] as IdPrefix;
  const number = parseInt(match[2], 10);
  const suffix = match[3] as PlatformSuffix | undefined;
  const platform = suffix ? PLATFORM_MAP[suffix] : undefined;
  const isExternal = suffix !== undefined;

  return { prefix, number, suffix, platform, isExternal };
}

/**
 * Check whether an ID is from an external platform (has G/J/A/E suffix).
 * Backward compatible: recognizes both new (G/J/A) and legacy (E) suffixes.
 */
export function isExternalId(id: string): boolean {
  const parsed = parseId(id);
  return parsed !== null && parsed.isExternal;
}

/**
 * Map a platform suffix letter to its Platform name.
 */
export function getPlatformFromSuffix(suffix: PlatformSuffix): Platform | undefined {
  return PLATFORM_MAP[suffix];
}

/**
 * Map a Platform name to its suffix letter.
 */
export function getSuffixFromPlatform(platform: Platform): PlatformSuffix {
  return SUFFIX_MAP[platform];
}

/**
 * Format an ID from its components.
 *
 * @example
 * formatId('FS', 42)       → 'FS-042'
 * formatId('FS', 42, 'G')  → 'FS-042G'
 */
export function formatId(prefix: IdPrefix, number: number, suffix?: PlatformSuffix): string {
  const padded = String(number).padStart(3, '0');
  return `${prefix}-${padded}${suffix ?? ''}`;
}

// ---------------------------------------------------------------------------
// Increment Folder Parsing
// ---------------------------------------------------------------------------

export interface ParsedIncrementFolder {
  number: number;
  suffix?: PlatformSuffix;
  platform?: Platform;
  name: string;
  isExternal: boolean;
}

const FOLDER_REGEX = /^(\d+)([GJAE])?-(.+)$/;

/**
 * Parse an increment folder name into its components.
 *
 * @example
 * parseIncrementFolder('0042G-auth-flow') → { number: 42, suffix: 'G', platform: 'github', name: 'auth-flow', isExternal: true }
 */
export function parseIncrementFolder(folderName: string): ParsedIncrementFolder | null {
  const match = folderName.match(FOLDER_REGEX);
  if (!match) return null;

  const number = parseInt(match[1], 10);
  const suffix = match[2] as PlatformSuffix | undefined;
  const platform = suffix ? PLATFORM_MAP[suffix] : undefined;
  const name = match[3];
  const isExternal = suffix !== undefined;

  return { number, suffix, platform, name, isExternal };
}

/**
 * Derive a Feature ID (FS-XXXS) from an increment folder name.
 *
 * @example
 * deriveFeatureId('0042G-auth-flow') → 'FS-042G'
 * deriveFeatureId('0042-auth-flow')  → 'FS-042'
 */
export function deriveFeatureId(folderName: string): string | null {
  const parsed = parseIncrementFolder(folderName);
  if (!parsed) return null;
  return formatId('FS', parsed.number, parsed.suffix);
}

/**
 * Create an increment folder name from components.
 *
 * @example
 * createIncrementFolderName(42, 'auth-flow', 'G') → '0042G-auth-flow'
 * createIncrementFolderName(42, 'auth-flow')       → '0042-auth-flow'
 */
export function createIncrementFolderName(number: number, name: string, suffix?: PlatformSuffix): string {
  const padded = String(number).padStart(4, '0');
  return `${padded}${suffix ?? ''}-${name}`;
}

// ---------------------------------------------------------------------------
// Issue Title Formatting
// ---------------------------------------------------------------------------

/**
 * Format an issue title in the new clean format.
 * New: "US-010: Documentation Update"
 * Old: "[FS-172][US-010] Documentation Update" (deprecated)
 */
export function formatIssueTitle(usId: string, title: string): string {
  return `${usId}: ${title}`;
}

/**
 * Format a milestone title.
 * "FS-172: True Autonomous Mode"
 */
export function formatMilestoneTitle(fsId: string, title: string): string {
  return `${fsId}: ${title}`;
}

/**
 * Parse an issue title in the new "US-XXX: Title" format.
 */
export function parseIssueTitle(title: string): { usId: string; title: string } | null {
  const match = title.match(/^(US-\d+[GJAE]?): (.+)$/);
  if (!match) return null;
  return { usId: match[1], title: match[2] };
}

/**
 * Parse an issue title in the legacy "[FS-XXX][US-YYY] Title" format.
 */
export function parseIssueTitleLegacy(title: string): { fsId: string; usId: string; title: string } | null {
  const match = title.match(/^\[(FS-\d+[GJAE]?)\]\[(US-\d+[GJAE]?)\] (.+)$/);
  if (!match) return null;
  return { fsId: match[1], usId: match[2], title: match[3] };
}
