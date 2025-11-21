/**
 * Spec Parser - Extract User Stories and Acceptance Criteria from spec.md
 *
 * Parses increment spec.md files to extract:
 * - User Story IDs (US-001, US-002, etc.)
 * - Acceptance Criteria IDs (AC-US1-01, AC-US1-02, etc.)
 * - User Story titles and metadata
 *
 * Used by AC coverage validator to cross-reference tasks with requirements.
 */

import { readFileSync } from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';

/**
 * User Story metadata
 */
export interface UserStory {
  /** User Story ID (e.g., "US-001") */
  id: string;

  /** User Story title */
  title: string;

  /** Priority (P0, P1, P2, P3) */
  priority?: string;

  /** Acceptance Criteria IDs for this US */
  acceptanceCriteria: string[];

  /** Full text of the user story */
  description?: string;

  /** Line number in spec.md */
  lineNumber?: number;
}

/**
 * Spec metadata
 */
export interface SpecMetadata {
  /** Increment ID */
  incrementId: string;

  /** Increment title */
  title: string;

  /** All User Stories */
  userStories: UserStory[];

  /** All AC-IDs (flattened from all user stories) */
  allACIds: string[];
}

/**
 * Parse spec.md to extract User Stories and Acceptance Criteria
 *
 * @param specPath - Path to spec.md file
 * @returns Spec metadata with User Stories and AC-IDs
 * @throws Error if spec.md cannot be read or is malformed
 */
export function parseSpecMd(specPath: string): SpecMetadata {
  try {
    const content = readFileSync(specPath, 'utf-8');
    const lines = content.split('\n');

    // Extract increment ID and title from frontmatter
    const { incrementId, title } = parseFrontmatter(lines);

    // Extract User Stories
    const userStories = extractUserStories(lines);

    // Flatten all AC-IDs
    const allACIds = userStories.flatMap(us => us.acceptanceCriteria);

    return {
      incrementId,
      title,
      userStories,
      allACIds
    };
  } catch (error) {
    throw new Error(`Failed to parse spec.md at ${specPath}: ${error}`);
  }
}

/**
 * Parse YAML frontmatter to extract increment ID and title
 *
 * Uses js-yaml library for robust, standard-compliant parsing.
 * Provides descriptive error messages for malformed YAML.
 *
 * @param lines - Lines of the spec.md file
 * @returns Increment ID and title from frontmatter
 * @throws Error if YAML is malformed or missing required fields
 */
function parseFrontmatter(lines: string[]): { incrementId: string; title: string } {
  let inFrontmatter = false;
  const frontmatterLines: string[] = [];
  let frontmatterStart = -1;
  let frontmatterEnd = -1;

  // Extract frontmatter lines between --- markers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        frontmatterStart = i + 1;
        continue;
      } else {
        frontmatterEnd = i + 1;
        break; // End of frontmatter
      }
    }
    if (inFrontmatter) {
      frontmatterLines.push(line);
    }
  }

  // Validate frontmatter exists
  if (frontmatterLines.length === 0) {
    throw new Error(
      'No YAML frontmatter found in spec.md.\n\n' +
      'Spec.md must start with:\n' +
      '---\n' +
      'increment: 0001-feature-name\n' +
      'title: Feature Title  # Optional\n' +
      '---\n\n' +
      'See CLAUDE.md Rule #16 for details.'
    );
  }

  // Parse YAML using js-yaml library (robust, standard-compliant)
  let frontmatter: any;
  try {
    frontmatter = yaml.load(frontmatterLines.join('\n'));
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    throw new Error(
      `Malformed YAML frontmatter (lines ${frontmatterStart}-${frontmatterEnd}):\n\n` +
      `${errorMsg}\n\n` +
      'Common mistakes:\n' +
      '  - Unclosed brackets: [unclosed\n' +
      '  - Unclosed quotes: "unclosed\n' +
      '  - Invalid syntax: key: {broken\n' +
      '  - Mixing tabs and spaces in indentation\n\n' +
      'Valid example:\n' +
      '---\n' +
      'increment: 0001-feature-name\n' +
      'title: Feature Title\n' +
      'feature_id: FS-001\n' +
      '---\n\n' +
      'See CLAUDE.md Rule #16 for details.'
    );
  }

  // Validate frontmatter is an object
  if (!frontmatter || typeof frontmatter !== 'object') {
    throw new Error(
      'YAML frontmatter must be an object with key-value pairs.\n\n' +
      'Invalid: ---\n' +
      'Just a string\n' +
      '---\n\n' +
      'Valid: ---\n' +
      'increment: 0001-feature-name\n' +
      '---'
    );
  }

  // Validate required field: increment
  if (!frontmatter.increment) {
    throw new Error(
      'Missing required field: increment\n\n' +
      'Add to frontmatter:\n' +
      'increment: 0001-feature-name\n\n' +
      'See CLAUDE.md Rule #16 for details.'
    );
  }

  // Validate increment ID format (0001-feature-name)
  const incrementIdRegex = /^[0-9]{4}-[a-z0-9-]+$/;
  if (!incrementIdRegex.test(frontmatter.increment)) {
    throw new Error(
      `Invalid increment ID format: "${frontmatter.increment}"\n\n` +
      'Expected format: 4-digit number + hyphen + kebab-case name\n\n' +
      'Valid examples:\n' +
      '  - 0001-feature-name\n' +
      '  - 0042-bug-fix\n' +
      '  - 0099-refactor\n\n' +
      'Invalid examples:\n' +
      '  - 1-test (missing leading zeros)\n' +
      '  - 0001_test (underscore instead of hyphen)\n' +
      '  - 0001-Test (uppercase letters)\n' +
      '  - 0001 (missing name)\n\n' +
      'See CLAUDE.md Rule #16 for details.'
    );
  }

  return {
    incrementId: frontmatter.increment,
    title: frontmatter.title || frontmatter.increment
  };
}

/**
 * Extract User Stories and their Acceptance Criteria
 */
function extractUserStories(lines: string[]): UserStory[] {
  const userStories: UserStory[] = [];
  let currentUS: UserStory | null = null;
  let inACSection = false;

  // Regex patterns (T-029: Support E suffix for external IDs)
  const usHeaderRegex = /^###?\s+(US-\d{3}E?):\s*(.+)$/;  // ### US-001E: Title or ## US-001: Title
  const acRegex = /^-\s*\[[x ]\]\s*\*\*(AC-US\d+E?-\d{2})\*\*/;  // - [ ] **AC-US1E-01**
  const priorityRegex = /\*\*Priority\*\*:\s*(P[0-3])/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check for User Story header
    const usMatch = line.match(usHeaderRegex);
    if (usMatch) {
      // Save previous US if exists
      if (currentUS) {
        userStories.push(currentUS);
      }

      // Start new US
      currentUS = {
        id: usMatch[1],
        title: usMatch[2],
        acceptanceCriteria: [],
        lineNumber
      };
      inACSection = false;
      continue;
    }

    // Skip if no current US
    if (!currentUS) continue;

    // Check for Acceptance Criteria section
    if (line.includes('**Acceptance Criteria**:') || line.includes('Acceptance Criteria')) {
      inACSection = true;
      continue;
    }

    // Check for end of AC section (next major section)
    if (line.startsWith('##') && !line.match(usHeaderRegex)) {
      inACSection = false;
    }

    // Extract AC-IDs if in AC section
    if (inACSection) {
      const acMatch = line.match(acRegex);
      if (acMatch) {
        const acId = acMatch[1];
        currentUS.acceptanceCriteria.push(acId);
      }
    }

    // Extract priority if present
    const priorityMatch = line.match(priorityRegex);
    if (priorityMatch && !currentUS.priority) {
      currentUS.priority = priorityMatch[1];
    }
  }

  // Save last US
  if (currentUS) {
    userStories.push(currentUS);
  }

  return userStories;
}

/**
 * Get all User Story IDs from spec
 *
 * @param specPath - Path to spec.md
 * @returns Array of US-IDs (e.g., ["US-001", "US-002"])
 */
export function getAllUSIds(specPath: string): string[] {
  const spec = parseSpecMd(specPath);
  return spec.userStories.map(us => us.id);
}

/**
 * Get all AC-IDs from spec
 *
 * @param specPath - Path to spec.md
 * @returns Array of AC-IDs (e.g., ["AC-US1-01", "AC-US1-02"])
 */
export function getAllACIds(specPath: string): string[] {
  const spec = parseSpecMd(specPath);
  return spec.allACIds;
}

/**
 * Get AC-IDs for a specific User Story
 *
 * @param specPath - Path to spec.md
 * @param usId - User Story ID (e.g., "US-001")
 * @returns Array of AC-IDs for that US
 */
export function getACsForUS(specPath: string, usId: string): string[] {
  const spec = parseSpecMd(specPath);
  const us = spec.userStories.find(story => story.id === usId);
  return us ? us.acceptanceCriteria : [];
}

/**
 * Validate that an AC-ID belongs to the correct User Story
 *
 * @param acId - AC-ID to validate (e.g., "AC-US1-01")
 * @param usId - Expected User Story ID (e.g., "US-001")
 * @returns True if AC belongs to US, false otherwise
 */
export function validateACBelongsToUS(acId: string, usId: string): boolean {
  // Extract US number from AC-ID: AC-US1-01 → 1
  const acMatch = acId.match(/^AC-US(\d+)-\d{2}$/);
  if (!acMatch) return false;

  const acUSNumber = parseInt(acMatch[1], 10);

  // Extract US number from US-ID: US-001 → 1
  const usMatch = usId.match(/^US-(\d{3})$/);
  if (!usMatch) return false;

  const usNumber = parseInt(usMatch[1], 10);

  return acUSNumber === usNumber;
}
