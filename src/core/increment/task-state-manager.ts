/**
 * Task State Manager - Single Source of Truth
 *
 * Enforces that implementation checkboxes are the ONLY way to mark tasks complete.
 * Header markers (✅ COMPLETE) are DERIVED and auto-computed from checkboxes.
 *
 * This prevents inconsistencies where:
 * - Header says "✅ COMPLETE" but checkboxes are unchecked
 * - Checkboxes all checked but header missing marker
 *
 * @see .specweave/increments/0037/reports/ULTRATHINK-LONG-TERM-PREVENTION.md
 */

export interface TaskState {
  /** Task ID (e.g., "T-001", "T-123-DISCIPLINE") */
  taskId: string;

  /** Implementation checkbox statistics */
  implementationCheckboxes: {
    total: number;
    checked: number;
  };

  /** Computed completion status (derived from checkboxes) */
  isComplete: boolean;

  /** Expected header marker (computed, not manually set) */
  headerMarker: string | null;

  /** Whether header and checkboxes match */
  isConsistent: boolean;
}

export interface ValidationResult {
  /** Whether task is consistent */
  valid: boolean;

  /** Error message if validation failed */
  error?: string;

  /** Auto-fixed content (if validation failed) */
  fix?: string;
}

export class TaskStateManager {
  /**
   * Compute task state from SSOT (implementation checkboxes)
   *
   * This is the canonical way to determine task completion.
   * Header markers are DERIVED from this, never trusted directly.
   */
  computeTaskState(taskContent: string): TaskState {
    const taskId = this.extractTaskId(taskContent);
    const checkboxes = this.extractImplementationCheckboxes(taskContent);

    const total = checkboxes.length;
    const checked = checkboxes.filter(c => c.checked).length;
    const isComplete = total > 0 && checked === total;

    return {
      taskId,
      implementationCheckboxes: { total, checked },
      isComplete,
      headerMarker: isComplete ? '✅ COMPLETE' : null,
      isConsistent: true // By definition, since computed from SSOT
    };
  }

  /**
   * Validate task consistency
   *
   * Checks if header marker matches what checkboxes say.
   * Returns auto-fix suggestion if inconsistent.
   */
  validate(taskContent: string): ValidationResult {
    const expectedState = this.computeTaskState(taskContent);
    const actualMarker = this.extractHeaderMarker(taskContent);

    const expected = expectedState.headerMarker;
    const actual = actualMarker;

    if (actual !== expected) {
      return {
        valid: false,
        error: `Header marker mismatch: expected "${expected}", got "${actual}"`,
        fix: this.autoFixHeader(taskContent)
      };
    }

    return { valid: true };
  }

  /**
   * Auto-fix header to match SSOT
   *
   * Adds or removes "✅ COMPLETE" marker based on checkbox state.
   * This is the canonical way to sync headers with reality.
   */
  autoFixHeader(taskContent: string): string {
    const state = this.computeTaskState(taskContent);
    return this.setHeaderMarker(taskContent, state.headerMarker);
  }

  /**
   * Extract task ID from content
   */
  private extractTaskId(content: string): string {
    const match = content.match(/^###\s+(T-\d+[-A-Z]*)/m);
    return match ? match[1] : '';
  }

  /**
   * Extract implementation checkboxes from content
   */
  private extractImplementationCheckboxes(content: string): Array<{ text: string; checked: boolean }> {
    const checkboxes: Array<{ text: string; checked: boolean }> = [];

    // Find Implementation section
    const implMatch = content.match(/\*\*Implementation\*\*:([\s\S]*?)(?=\n\*\*|\n---|$)/);
    if (!implMatch) return checkboxes;

    const implSection = implMatch[1];

    // Extract all checkboxes
    const checkboxPattern = /-\s*\[([ x])\]\s*(.+)/g;
    let match;

    while ((match = checkboxPattern.exec(implSection)) !== null) {
      checkboxes.push({
        text: match[2].trim(),
        checked: match[1] === 'x'
      });
    }

    return checkboxes;
  }

  /**
   * Extract header marker from content
   */
  private extractHeaderMarker(content: string): string | null {
    // Match task header line
    const headerMatch = content.match(/^###\s+T-\d+[-A-Z]*:?\s+[^\n]+/m);
    if (!headerMatch) return null;

    const headerLine = headerMatch[0];

    // Check if header contains ✅ COMPLETE marker
    return headerLine.includes('✅ COMPLETE') ? '✅ COMPLETE' : null;
  }

  /**
   * Set header marker in content
   */
  private setHeaderMarker(content: string, marker: string | null): string {
    // Remove existing marker if present
    let updated = content.replace(/(###\s+T-\d+[-A-Z]*:?\s+.+?)\s*✅ COMPLETE/m, '$1');

    // Add new marker if needed
    if (marker) {
      updated = updated.replace(/(###\s+T-\d+[-A-Z]*:?\s+[^\n]+)/m, `$1 ${marker}`);
    }

    return updated;
  }
}
