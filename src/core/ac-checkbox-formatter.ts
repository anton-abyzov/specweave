/**
 * AC Checkbox Formatter — Provider-specific AC state formatting
 *
 * Formats acceptance criteria states into checkbox markup for:
 * - GitHub: `- [x] **AC-ID**: description`
 * - JIRA:   `(/) AC-ID: description`
 * - ADO:    `<li>☑ AC-ID: description</li>`
 *
 * @module ac-checkbox-formatter
 */

export interface ACState {
  id: string;
  description: string;
  completed: boolean;
}

export type ACCheckboxFormat = 'github' | 'jira' | 'ado';

/**
 * Format AC states into provider-specific checkbox markup.
 *
 * Returns empty string for empty acStates array.
 * Includes a progress header with completed/total count and percentage.
 */
export function formatACCheckboxes(
  acStates: ACState[],
  format: ACCheckboxFormat,
): string {
  if (acStates.length === 0) return '';

  const total = acStates.length;
  const completed = acStates.filter(ac => ac.completed).length;
  const percentage = Math.round((completed / total) * 100);

  const header = `**Status**: ${completed}/${total} ACs complete (${percentage}%)`;

  const formatters: Record<ACCheckboxFormat, (ac: ACState) => string> = {
    github: (ac) =>
      `- [${ac.completed ? 'x' : ' '}] **${ac.id}**: ${ac.description}`,
    jira: (ac) =>
      `${ac.completed ? '(/)' : '(x)'} ${ac.id}: ${ac.description}`,
    ado: (ac) =>
      `<li>${ac.completed ? '☑' : '☐'} ${ac.id}: ${ac.description}</li>`,
  };

  const lines = acStates.map(formatters[format]);

  if (format === 'ado') {
    return `${header}\n\n<ul>\n${lines.join('\n')}\n</ul>`;
  }

  return `${header}\n\n${lines.join('\n')}`;
}
