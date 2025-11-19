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
 */
function parseFrontmatter(lines: string[]): { incrementId: string; title: string } {
  let incrementId = '';
  let title = '';
  let inFrontmatter = false;

  for (const line of lines) {
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        break; // End of frontmatter
      }
    }

    if (inFrontmatter) {
      const incrementMatch = line.match(/^increment:\s*(.+)$/);
      if (incrementMatch) {
        incrementId = incrementMatch[1].trim();
      }

      const titleMatch = line.match(/^title:\s*["']?(.+?)["']?$/);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
    }
  }

  return { incrementId, title };
}

/**
 * Extract User Stories and their Acceptance Criteria
 */
function extractUserStories(lines: string[]): UserStory[] {
  const userStories: UserStory[] = [];
  let currentUS: UserStory | null = null;
  let inACSection = false;

  // Regex patterns
  const usHeaderRegex = /^###?\s+(US-\d{3}):\s*(.+)$/;  // ### US-001: Title or ## US-001: Title
  const acRegex = /^-\s*\[[x ]\]\s*\*\*(AC-US\d+-\d{2})\*\*/;  // - [ ] **AC-US1-01**
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
