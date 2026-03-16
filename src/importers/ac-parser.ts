/**
 * AC Parser for External Item Descriptions
 *
 * Extracts acceptance criteria from external item descriptions
 * (GitHub issue body, JIRA description, ADO work item description).
 *
 * Recognizes checkbox-style items:
 *   - [ ] unchecked criterion
 *   - [x] completed criterion
 *   * [ ] asterisk-style checkbox
 *
 * Non-checkbox list items are ignored.
 *
 * @module importers/ac-parser
 */

export interface ACEntry {
  text: string;
  completed: boolean;
}

/**
 * Regex for markdown checkbox items:
 * - Matches "- [ ]", "- [x]", "- [X]", "* [ ]", "* [x]", "* [X]"
 * - Captures the check state and the text after
 */
const CHECKBOX_REGEX = /^[\s]*[-*]\s+\[([ xX])\]\s+(.+)$/gm;

/**
 * Parse acceptance criteria from an external item description.
 *
 * @param description - Raw markdown/HTML description from GitHub/JIRA/ADO
 * @returns Array of AC entries with text and completion status
 */
export function parseExternalACs(description: string): ACEntry[] {
  if (!description) return [];

  const results: ACEntry[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state (global flag requires manual reset)
  CHECKBOX_REGEX.lastIndex = 0;

  while ((match = CHECKBOX_REGEX.exec(description)) !== null) {
    const checkState = match[1];
    const text = match[2].trim();

    if (text) {
      results.push({
        text,
        completed: checkState === 'x' || checkState === 'X',
      });
    }
  }

  return results;
}
