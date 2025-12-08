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
 * Extract user stories from spec content
 * @param content - The spec.md content
 * @param defaultProject - Default project to use if US doesn't specify one
 */
export function extractUserStories(content: string, defaultProject?: string): UserStoryData[] {
  const stories: UserStoryData[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^###+\s+(US-\d+):\s+(.+)/);
    if (!headingMatch) continue;

    const id = headingMatch[1];
    const title = headingMatch[2];

    // Collect all lines until next US heading or end
    const storyLines: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].match(/^###+\s+US-\d+:/)) {
        break;
      }
      storyLines.push(lines[j]);
    }

    const storyContent = storyLines.join('\n');

    // Extract description
    let description = '';
    const descMatch = storyContent.match(/\*\*As a\*\*\s*([^\n]+)\s*\n\*\*I want\*\*\s*([^\n]+)\s*\n\*\*So that\*\*\s*([^\n]+)/i);
    if (descMatch) {
      description = `**As a** ${descMatch[1].trim()}\n**I want** ${descMatch[2].trim()}\n**So that** ${descMatch[3].trim()}`;
    }

    // Extract acceptance criteria IDs
    const acIds: string[] = [];
    const acPattern = /AC-US\d+-\d+/g;
    let acMatch;
    while ((acMatch = acPattern.exec(storyContent)) !== null) {
      if (!acIds.includes(acMatch[0])) {
        acIds.push(acMatch[0]);
      }
    }

    // Extract per-US project/board targeting (v0.33.0+)
    const { project, board, externalProvider } = extractUserStoryProjectInfo(storyContent);

    stories.push({
      id,
      title,
      description,
      acceptanceCriteria: acIds,
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
 */
export function extractAcceptanceCriteria(content: string): AcceptanceCriterionData[] {
  const criteria: AcceptanceCriterionData[] = [];

  // Pattern: - [x] AC-US1-01: Description
  const acPattern = /^[-*]\s+\[([ x])\]\s+\*{0,2}(AC-US\d+-\d+)\*{0,2}:\s+(.+?)$/gm;

  let match;
  while ((match = acPattern.exec(content)) !== null) {
    const completed = match[1] === 'x';
    const id = match[2];
    const description = match[3];

    // Extract user story ID (AC-US1-01 → US-001)
    const usMatch = id.match(/AC-US(\d+)-\d+/);
    const userStoryId = usMatch ? `US-${usMatch[1].padStart(3, '0')}` : '';

    criteria.push({
      id,
      userStoryId,
      description,
      completed
    });
  }

  return criteria;
}
