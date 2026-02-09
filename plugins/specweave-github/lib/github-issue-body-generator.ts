/**
 * GitHub Issue Body Generator
 *
 * Generates GitHub issue body markdown from a User Story.
 * Used by the spec-to-issue push sync to create rich issue content
 * with AC checkboxes, priority badges, and sync markers.
 *
 * @module github-issue-body-generator
 */

export interface UserStoryInput {
  /** User story ID, e.g., "US-001" */
  id: string;
  /** User story title */
  title: string;
  /** User story description */
  description: string;
  /** Priority, e.g., "P1" */
  priority: string;
  /** Acceptance criteria */
  acceptanceCriteria: Array<{
    id: string;
    description: string;
    completed: boolean;
  }>;
  /** Spec ID, e.g., "spec-001" */
  specId?: string;
  /** Local file path to the spec */
  specPath?: string;
}

/**
 * Generate a GitHub issue body from a User Story input.
 *
 * Output format:
 * - Description section
 * - AC checkboxes between specweave markers
 * - Priority badge
 * - Sync footer marker
 */
export function generateIssueBody(userStory: UserStoryInput): string {
  const lines: string[] = [];

  // Description
  lines.push('## Description');
  lines.push('');
  lines.push(userStory.description);
  lines.push('');

  // Priority badge
  lines.push(`**Priority**: ${userStory.priority}`);
  lines.push('');

  // Acceptance Criteria with markers
  if (userStory.acceptanceCriteria.length > 0) {
    lines.push('## Acceptance Criteria');
    lines.push('');
    lines.push('<!-- specweave:ac-start -->');
    for (const ac of userStory.acceptanceCriteria) {
      const checkbox = ac.completed ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} **${ac.id}**: ${ac.description}`);
    }
    lines.push('<!-- specweave:ac-end -->');
    lines.push('');
  }

  // Sync footer marker
  const syncParts: string[] = [];
  if (userStory.specId) {
    syncParts.push(`spec=${userStory.specId}`);
  }
  syncParts.push(`us=${userStory.id}`);
  lines.push(`<!-- specweave:sync ${syncParts.join(' ')} -->`);

  return lines.join('\n');
}
