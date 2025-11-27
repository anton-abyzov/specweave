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
 * Extract user stories from spec content
 */
export function extractUserStories(content: string): UserStoryData[] {
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

    stories.push({
      id,
      title,
      description,
      acceptanceCriteria: acIds,
      status: undefined
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
