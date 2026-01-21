/**
 * Spec Identifier Detector
 *
 * Auto-detects the correct identifier strategy based on:
 * Priority 1: External tool links (JIRA, ADO, GitHub)
 * Priority 2: Custom ID in frontmatter
 * Priority 3: Title-based slug
 * Priority 4: Sequential numbering
 */

import {
  SpecIdentifier,
  SpecContent,
  getProjectCode,
  type SpecIdentifierSource
} from '../types/spec-identifier.js';

// Re-export SpecContent for use by other modules
export type { SpecContent } from '../types/spec-identifier.js';

export interface DetectorOptions {
  /** Existing spec IDs in this project (for conflict detection) */
  existingSpecs?: string[];

  /** Whether to prefer title-slug over sequential */
  preferTitleSlug?: boolean;

  /** Minimum slug length to consider valid */
  minSlugLength?: number;
}

/**
 * Detect the appropriate identifier for a spec
 */
export function detectSpecIdentifier(
  spec: SpecContent,
  options: DetectorOptions = {}
): SpecIdentifier {
  const { existingSpecs = [], preferTitleSlug = true, minSlugLength = 5 } = options;
  const { frontmatter, title, project } = spec;
  const projectCode = getProjectCode(project);

  // Priority 1: External tool link (JIRA, ADO, GitHub)
  const externalId = detectExternalId(frontmatter, project);
  if (externalId) return externalId;

  // Priority 2: Explicit custom ID in frontmatter
  if (frontmatter.id && typeof frontmatter.id === 'string') {
    return buildIdentifier(project, frontmatter.id, 'custom', projectCode);
  }

  // Priority 3: Generate from title (slugified)
  if (preferTitleSlug && title) {
    const titleSlug = slugify(title);
    const slugExists = existingSpecs.some(s => s.toLowerCase().includes(titleSlug.toLowerCase()));

    if (!slugExists && titleSlug.length >= minSlugLength) {
      return buildIdentifier(project, titleSlug, 'title-slug', projectCode);
    }
  }

  // Priority 4: Sequential numbering (fallback)
  const nextNumber = findNextSequentialNumber(existingSpecs, project);
  return buildIdentifier(project, `spec-${nextNumber}`, 'sequential', projectCode, nextNumber);
}

/**
 * Build a spec identifier object
 */
function buildIdentifier(
  project: string,
  id: string,
  source: SpecIdentifierSource,
  projectCode: string,
  compactId?: string
): SpecIdentifier {
  return {
    full: `${project}/${id}`,
    display: id,
    source,
    project,
    stable: true,
    compact: `${projectCode}-${compactId || id}`
  };
}

/**
 * Detect external tool ID from frontmatter
 */
function detectExternalId(
  frontmatter: Record<string, any>,
  resolvedProject: string
): SpecIdentifier | null {
  const project = resolvedProject || 'default';
  const projectCode = getProjectCode(project);
  const externalLinks = frontmatter.externalLinks;

  if (externalLinks?.jira?.issueKey) {
    const { issueKey, url } = externalLinks.jira;
    return buildExternalIdentifier(project, projectCode, 'JIRA', issueKey, issueKey, url, 'external-jira');
  }

  if (externalLinks?.ado?.workItemId) {
    const { workItemId, url } = externalLinks.ado;
    return buildExternalIdentifier(project, projectCode, 'ADO', workItemId, String(workItemId), url, 'external-ado');
  }

  if (externalLinks?.github?.issueNumber) {
    const { issueNumber, issueUrl } = externalLinks.github;
    return buildExternalIdentifier(project, projectCode, 'GH', issueNumber, `#${issueNumber}`, issueUrl, 'external-github');
  }

  return null;
}

/**
 * Build an external identifier object
 */
function buildExternalIdentifier(
  project: string,
  projectCode: string,
  prefix: string,
  id: string | number,
  externalId: string,
  externalUrl: string,
  source: SpecIdentifierSource
): SpecIdentifier {
  return {
    full: `${project}/${prefix}-${id}`,
    display: `${prefix}-${id}`,
    source,
    externalId,
    externalUrl,
    project,
    stable: true,
    compact: `${projectCode}-${prefix}-${id}`
  };
}

/**
 * Convert title to kebab-case slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove all non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '')
    // Limit to 50 characters
    .substring(0, 50);
}

/**
 * Find next available sequential number for this project
 */
function findNextSequentialNumber(
  existingSpecs: string[],
  project: string
): string {
  // Extract numbers from existing specs in this project
  const pattern = new RegExp(`^${project}/spec-(\\d+)`, 'i');
  const numbers = existingSpecs
    .map(spec => {
      const match = spec.match(pattern);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n): n is number => n !== null);

  // Find max number and increment
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = maxNumber + 1;

  // Zero-pad to 3 digits
  return String(nextNumber).padStart(3, '0');
}

/**
 * Extract spec identifier from file path
 *
 * Examples:
 * - specs/backend/JIRA-AUTH-123.md → "backend/JIRA-AUTH-123"
 * - specs/frontend/user-login-ui.md → "frontend/user-login-ui"
 * - specs/backend/spec-001-user-auth.md → "backend/spec-001"
 */
export function extractIdentifierFromPath(filePath: string): {
  project: string;
  specId: string;
  full: string;
} | null {
  const match = filePath.match(/specs\/([^/]+)\/([^/]+)\.md$/);
  if (!match) {
    return null;
  }

  const [, project, fileName] = match;

  // Handle legacy format: spec-001-user-auth.md → spec-001
  const specId = fileName.replace(/-[a-z-]+$/, '');

  return {
    project,
    specId,
    full: `${project}/${specId}`
  };
}

/**
 * Format GitHub issue title from spec identifier
 */
export function formatGitHubIssueTitle(
  specId: SpecIdentifier,
  title: string
): string {
  return `[${specId.compact}] ${title}`;
}

/**
 * Validate spec identifier format
 */
export function isValidSpecIdentifier(id: string): boolean {
  if (!id || id.length === 0) return false;
  if (!/^[a-zA-Z0-9-_]+$/.test(id)) return false;
  if (/^[-_]|[-_]$/.test(id)) return false;
  return true;
}
