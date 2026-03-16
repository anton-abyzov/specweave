/**
 * ADO Description Updater — HTML section manipulation
 *
 * Manages the Acceptance Criteria section within ADO work item
 * HTML descriptions using sentinel comments (not regex on content).
 *
 * @module core/ado-description-updater
 */

const AC_START = '<!-- AC_SECTION_START -->';
const AC_END = '<!-- AC_SECTION_END -->';

export class AdoDescriptionUpdater {
  /**
   * Replace or append the AC section in an HTML description.
   *
   * Uses sentinel comments to identify the section boundaries.
   * Preserves all content outside the section byte-for-byte.
   */
  updateAcSection(html: string, newAcHtml: string): string {
    const startIdx = html.indexOf(AC_START);
    const endIdx = html.indexOf(AC_END);

    const wrapped = `${AC_START}\n${newAcHtml}\n${AC_END}`;

    if (startIdx !== -1 && endIdx !== -1) {
      // Replace existing section
      const before = html.substring(0, startIdx);
      const after = html.substring(endIdx + AC_END.length);
      return `${before}${wrapped}${after}`;
    }

    // Append new section
    if (html.length > 0) {
      return `${html}\n${wrapped}`;
    }
    return wrapped;
  }

  /**
   * Format AC statuses as an HTML checkbox list.
   */
  formatACCheckboxes(acStatus: Map<string, boolean>): string {
    if (acStatus.size === 0) return '';

    const items = [...acStatus.entries()]
      .map(([acId, completed]) => `<li>${completed ? '☑' : '☐'} ${acId}</li>`)
      .join('\n');

    return `<h3>Acceptance Criteria</h3>\n<ul>\n${items}\n</ul>`;
  }
}
