/**
 * Parser utilities for Living Docs Sync
 * Extracts user stories and acceptance criteria from spec content
 * @module core/living-docs/sync-helpers/parsers
 */

import type { UserStoryData, AcceptanceCriterionData } from '../types.js';

/**
 * Calculate user story status based on AC completion
 */
export function calculateUSStatus(totalACs: number, completedACs: number): string {
  if (totalACs === 0) {
    return 'not_started';
  }

  const percentage = (completedACs / totalACs) * 100;

  if (percentage === 0) {
    return 'not_started';
  } else if (percentage === 100) {
    return 'completed';
  } else {
    return 'in_progress';
  }
}

/**
 * Extract per-US project and board fields from a US section
 * Parses: **Project**: frontend-app and **Board**: web-team
 */
function extractUserStoryProjectInfo(storyContent: string): {
  project?: string;
  board?: string;
  externalProvider?: 'github' | 'jira' | 'ado';
} {
  const projectMatch = storyContent.match(/\*\*Project\*\*:\s*([^\n]+)/i);
  const boardMatch = storyContent.match(/\*\*Board\*\*:\s*([^\n]+)/i);
  const externalMatch = storyContent.match(/\*\*External\*\*:\s*(github|jira|ado)/i);

  return {
    project: projectMatch?.[1]?.trim() || undefined,
    board: boardMatch?.[1]?.trim() || undefined,
    externalProvider: externalMatch?.[1]?.toLowerCase() as 'github' | 'jira' | 'ado' | undefined
  };
}

/**
 * Flexible User Story ID pattern
 * Supports: US-001, US-API-001, US-FE-001, US-BACKEND-001, etc.
 * Pattern: US- followed by optional prefix (letters/hyphen) then digits
 */
const US_ID_PATTERN = /US-(?:[A-Z]+-)?(\d+)/;
const US_ID_PATTERN_GLOBAL = /US-(?:[A-Z]+-)?(\d+)/g;

/**
 * Flexible Acceptance Criteria ID pattern
 * Supports:
 * - AC-US1-01 (legacy numeric)
 * - AC-API-US2-01 (with project prefix before US)
 * - AC-US-API-001-01 (with project prefix after US)
 * Pattern: AC- followed by optional prefix, US indicator, and sequence numbers
 */
const AC_ID_PATTERN = /AC-(?:[A-Z]+-)?US(?:[A-Z]*)?-?\d+-\d+/g;

/**
 * Extract user story ID from AC ID for grouping
 * AC-API-US2-01 → US-API-002
 * AC-US1-01 → US-001
 * AC-US-FE-001-01 → US-FE-001
 */
function extractUSIdFromACId(acId: string): string {
  // Pattern 1: AC-XXX-USn-## (e.g., AC-API-US2-01)
  const prefixMatch = acId.match(/AC-([A-Z]+)-US(\d+)-\d+/);
  if (prefixMatch) {
    const prefix = prefixMatch[1];
    const num = prefixMatch[2].padStart(3, '0');
    return `US-${prefix}-${num}`;
  }

  // Pattern 2: AC-US-XXX-###-## (e.g., AC-US-FE-001-01)
  const suffixMatch = acId.match(/AC-US-([A-Z]+)-(\d+)-\d+/);
  if (suffixMatch) {
    const prefix = suffixMatch[1];
    const num = suffixMatch[2].padStart(3, '0');
    return `US-${prefix}-${num}`;
  }

  // Pattern 3: AC-USn-## (legacy, e.g., AC-US1-01)
  const legacyMatch = acId.match(/AC-US(\d+)-\d+/);
  if (legacyMatch) {
    return `US-${legacyMatch[1].padStart(3, '0')}`;
  }

  return '';
}

/**
 * Extract user stories from spec content
 * @param content - The spec.md content
 * @param defaultProject - Default project to use if US doesn't specify one
 *
 * Supports flexible ID formats:
 * - US-001 (standard numeric)
 * - US-API-001 (with project prefix)
 * - US-FE-001, US-BE-001, etc.
 */
export function extractUserStories(content: string, defaultProject?: string): UserStoryData[] {
  const stories: UserStoryData[] = [];
  const lines = content.split('\n');

  // Flexible pattern: ### US-XXX: or ### US-PREFIX-XXX:
  // Supports: US-001, US-API-001, US-FE-001, etc.
  const headingPattern = /^###+\s+(US-(?:[A-Z]+-)?(?:\d+)):\s+(.+)/;
  const nextUSPattern = /^###+\s+US-(?:[A-Z]+-)?(?:\d+):/;

  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(headingPattern);
    if (!headingMatch) continue;

    const id = headingMatch[1];
    const title = headingMatch[2];

    // Collect all lines until next US heading or end
    const storyLines: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (nextUSPattern.test(lines[j])) {
        break;
      }
      storyLines.push(lines[j]);
    }

    const storyContent = storyLines.join('\n');

    // Extract description — cascading format detection
    let description = '';

    // Format 1: Bold structured (**As a** X / **I want** Y / **So that** Z)
    const boldDescMatch = storyContent.match(/\*\*As a\*\*\s*([^\n]+)\s*\n\*\*I want\*\*\s*([^\n]+)\s*\n\*\*So that\*\*\s*([^\n]+)/i);
    if (boldDescMatch) {
      description = `**As a** ${boldDescMatch[1].trim()}\n**I want** ${boldDescMatch[2].trim()}\n**So that** ${boldDescMatch[3].trim()}`;
    }

    // Format 2: Plain 3-line (As a X / I want Y / So that Z)
    if (!description) {
      const plainThreeLineMatch = storyContent.match(/^As an?\s+([^\n]+)\s*\nI want\s+([^\n]+)\s*\nSo that\s+([^\n]+)/im);
      if (plainThreeLineMatch) {
        description = `As a ${plainThreeLineMatch[1].trim()}\nI want ${plainThreeLineMatch[2].trim()}\nSo that ${plainThreeLineMatch[3].trim()}`;
      }
    }

    // Format 3: Single-line narrative (As a/an/the ...)
    if (!description) {
      const narrativeMatch = storyContent.match(/^(As (?:a|an|the)\s+[^\n]+)/im);
      if (narrativeMatch) {
        description = narrativeMatch[1].trim();
      }
    }

    // Format 4: Free-form text before first AC section or AC checkbox
    if (!description) {
      const freeformMatch = storyContent.match(/^([\s\S]*?)(?=\n\*\*(?:Acceptance Criteria|ACs?|Priority)\*\*:|\n[-*]\s+\[[ xX]\]\s+\*\*AC-|$)/i);
      if (freeformMatch) {
        const cleaned = freeformMatch[1]
          .split('\n')
          .filter(line => !/^\*\*(?:Project|Board|External|Acceptance Criteria|ACs?|Priority)\*\*:/i.test(line))
          .join('\n')
          .trim();
        if (cleaned) {
          description = cleaned;
        }
      }
    }

    // Extract acceptance criteria with full descriptions (flexible pattern)
    // Stores both the AC ID and its description for external sync
    const acIds: string[] = [];
    const acWithDescriptions: Array<{ id: string; description: string; completed: boolean }> = [];

    // Pattern: - [x] **AC-XXX**: Description (metadata)
    // Supports: AC-US1-01, AC-API-US2-01, AC-US-FE-001-01, etc.
    const acFullPattern = /^[-*]\s+\[([ x])\]\s+\*{0,2}(AC-(?:[A-Z]+-)?US(?:[A-Z]*)?-?\d+-\d+)\*{0,2}:\s+([^(\n]+)(?:\([^)]*\))?/gm;

    let acFullMatch;
    while ((acFullMatch = acFullPattern.exec(storyContent)) !== null) {
      const completed = acFullMatch[1] === 'x';
      const acId = acFullMatch[2];
      const acDescription = acFullMatch[3].trim();

      if (!acIds.includes(acId)) {
        acIds.push(acId);
        acWithDescriptions.push({ id: acId, description: acDescription, completed });
      }
    }
    acFullPattern.lastIndex = 0;

    // Fallback: If no ACs found with descriptions, try ID-only pattern
    if (acIds.length === 0) {
      let acMatch;
      while ((acMatch = AC_ID_PATTERN.exec(storyContent)) !== null) {
        if (!acIds.includes(acMatch[0])) {
          acIds.push(acMatch[0]);
        }
      }
      AC_ID_PATTERN.lastIndex = 0;
    }

    // Extract per-US project/board targeting (v0.33.0+)
    const { project, board, externalProvider } = extractUserStoryProjectInfo(storyContent);

    stories.push({
      id,
      title,
      description,
      acceptanceCriteria: acIds,
      // Full AC data with descriptions for external sync
      acceptanceCriteriaFull: acWithDescriptions.length > 0 ? acWithDescriptions : undefined,
      status: undefined,
      // Use explicit project or fall back to default
      project: project || defaultProject,
      board,
      externalProvider
    });
  }

  return stories;
}

/**
 * Extract acceptance criteria from spec content
 *
 * Supports flexible AC ID formats:
 * - AC-US1-01 (legacy numeric)
 * - AC-API-US2-01 (with project prefix before US)
 * - AC-US-FE-001-01 (with project prefix after US)
 */
export function extractAcceptanceCriteria(content: string): AcceptanceCriterionData[] {
  const criteria: AcceptanceCriterionData[] = [];

  // Flexible pattern: - [x] **AC-XXX**: Description
  // Supports: AC-US1-01, AC-API-US2-01, AC-US-FE-001-01, etc.
  const acPattern = /^[-*]\s+\[([ x])\]\s+\*{0,2}(AC-(?:[A-Z]+-)?US(?:[A-Z]*)?-?\d+-\d+)\*{0,2}:\s+(.+?)$/gm;

  let match;
  while ((match = acPattern.exec(content)) !== null) {
    const completed = match[1] === 'x';
    const id = match[2];
    const description = match[3];

    // Extract user story ID using flexible extraction
    const userStoryId = extractUSIdFromACId(id);

    criteria.push({
      id,
      userStoryId,
      description,
      completed
    });
  }

  return criteria;
}
