/**
 * Spec Identifier Types
 *
 * Flexible identifier system that supports:
 * - External tool IDs (JIRA-AUTH-123, ADO-12345, GH-456)
 * - Custom user-defined IDs
 * - Title-based slugs (user-authentication-system)
 * - Sequential numbers (spec-001)
 */

export type SpecIdentifierSource =
  | 'external-jira'
  | 'external-ado'
  | 'external-github'
  | 'custom'
  | 'title-slug'
  | 'sequential'
  | 'hybrid-prefix';

export interface SpecIdentifier {
  /** Full identifier including project: "backend/JIRA-AUTH-123" */
  full: string;

  /** Display-friendly identifier: "JIRA-AUTH-123" or "user-authentication" */
  display: string;

  /** Where this ID came from */
  source: SpecIdentifierSource;

  /** External tool ID if applicable: "AUTH-123" (JIRA), "12345" (ADO), "#456" (GitHub) */
  externalId?: string;

  /** Direct link to external issue/epic */
  externalUrl?: string;

  /** Project this spec belongs to: "backend", "frontend", "mobile" */
  project: string;

  /** Whether ID is stable (doesn't change with content) */
  stable: boolean;

  /** Compact display format: "BE-JIRA-AUTH-123", "FE-user-auth" */
  compact: string;
}

export interface SpecContent {
  /** Raw markdown content */
  content: string;

  /** Parsed frontmatter */
  frontmatter: Record<string, any>;

  /** Spec title (from frontmatter or first heading) */
  title: string;

  /** Project identifier */
  project: string;

  /** File path */
  path: string;
}

export interface ProjectConfig {
  /** Unique project ID */
  id: string;

  /** Display name */
  displayName: string;

  /** Project description */
  description?: string;

  /** GitHub repository configuration */
  github?: {
    owner: string;
    repo: string;
  } | null;

  /** Default labels for GitHub issues */
  defaultLabels?: string[];

  /** Team name */
  team?: string;

  /** Whether to sync this project to GitHub */
  syncEnabled?: boolean;
}

export interface ProjectsConfig {
  [projectId: string]: ProjectConfig;
}

/** Project code mapping for compact display */
export const PROJECT_CODES: Record<string, string> = {
  backend: 'BE',
  frontend: 'FE',
  mobile: 'MB',
  infra: 'IN',
  _parent: 'PA',
  default: 'DF'
};

/** Get project code from project ID */
export function getProjectCode(projectId: string): string {
  return PROJECT_CODES[projectId] || projectId.toUpperCase().substring(0, 2);
}
