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
} from './types/spec-identifier.js';

// Re-export SpecContent for use by other modules
export type { SpecContent } from './types/spec-identifier.js';

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
  const {
    existingSpecs = [],
    preferTitleSlug = true,
    minSlugLength = 5
  } = options;

  const { frontmatter, title, project } = spec;
  const projectCode = getProjectCode(project);

  // Priority 1: External tool link (JIRA, ADO, GitHub)
  const externalId = detectExternalId(frontmatter);
  if (externalId) {
    return externalId;
  }

  // Priority 2: Explicit custom ID in frontmatter
  if (frontmatter.id && typeof frontmatter.id === 'string') {
    const customId = frontmatter.id;
    return {
      full: `${project}/${customId}`,
      display: customId,
      source: 'custom',
      project,
      stable: true,
      compact: `${projectCode}-${customId}`
    };
  }

  // Priority 3: Generate from title (slugified)
  if (preferTitleSlug && title) {
    const titleSlug = slugify(title);
    const slugExists = existingSpecs.some(s =>
      s.toLowerCase().includes(titleSlug.toLowerCase())
    );

    if (!slugExists && titleSlug.length >= minSlugLength) {
      return {
        full: `${project}/${titleSlug}`,
        display: titleSlug,
        source: 'title-slug',
        project,
        stable: true,
        compact: `${projectCode}-${titleSlug}`
      };
    }
  }

  // Priority 4: Sequential numbering (fallback)
  const nextNumber = findNextSequentialNumber(existingSpecs, project);
  return {
    full: `${project}/spec-${nextNumber}`,
    display: `spec-${nextNumber}`,
    source: 'sequential',
    project,
    stable: true,
    compact: `${projectCode}-${nextNumber}`
  };
}

/**
 * Detect external tool ID from frontmatter
 */
function detectExternalId(frontmatter: Record<string, any>): SpecIdentifier | null {
  // Check for JIRA
  if (frontmatter.externalLinks?.jira?.issueKey) {
    const { issueKey, url } = frontmatter.externalLinks.jira;
    const project = frontmatter.project || 'default';
    const projectCode = getProjectCode(project);

    return {
      full: `${project}/JIRA-${issueKey}`,
      display: `JIRA-${issueKey}`,
      source: 'external-jira',
      externalId: issueKey,
      externalUrl: url,
      project,
      stable: true,
      compact: `${projectCode}-JIRA-${issueKey}`
    };
  }

  // Check for Azure DevOps
  if (frontmatter.externalLinks?.ado?.workItemId) {
    const { workItemId, url } = frontmatter.externalLinks.ado;
    const project = frontmatter.project || 'default';
    const projectCode = getProjectCode(project);

    return {
      full: `${project}/ADO-${workItemId}`,
      display: `ADO-${workItemId}`,
      source: 'external-ado',
      externalId: String(workItemId),
      externalUrl: url,
      project,
      stable: true,
      compact: `${projectCode}-ADO-${workItemId}`
    };
  }

  // Check for GitHub
  if (frontmatter.externalLinks?.github?.issueNumber) {
    const { issueNumber, issueUrl } = frontmatter.externalLinks.github;
    const project = frontmatter.project || 'default';
    const projectCode = getProjectCode(project);

    return {
      full: `${project}/GH-${issueNumber}`,
      display: `GH-${issueNumber}`,
      source: 'external-github',
      externalId: `#${issueNumber}`,
      externalUrl: issueUrl,
      project,
      stable: true,
      compact: `${projectCode}-GH-${issueNumber}`
    };
  }

  return null;
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
  // Must be non-empty
  if (!id || id.length === 0) {
    return false;
  }

  // Must contain only valid characters
  const validPattern = /^[a-zA-Z0-9-_]+$/;
  if (!validPattern.test(id)) {
    return false;
  }

  // Must not start or end with hyphen/underscore
  if (/^[-_]|[-_]$/.test(id)) {
    return false;
  }

  return true;
}
