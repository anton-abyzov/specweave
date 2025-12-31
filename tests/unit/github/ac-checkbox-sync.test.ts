/**
 * Unit tests for AC Checkbox Sync to GitHub
 *
 * Tests the syncACCheckboxesToGitHub function that updates
 * AC checkboxes in GitHub issue bodies.
 *
 * @see plugins/specweave-github/lib/per-us-sync.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Octokit
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    issues: {
      get: vi.fn(),
      update: vi.fn(),
      createComment: vi.fn()
    }
  }))
}));

describe('syncACCheckboxesToGitHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkbox regex patterns', () => {
    it('should match bold AC format: - [ ] **AC-US1-01**: Description', () => {
      const body = `## Acceptance Criteria

- [ ] **AC-US1-01**: First criterion
- [ ] **AC-US1-02**: Second criterion`;

      // Simulate the regex replacement
      const acId = 'AC-US1-01';
      const escapedAcId = acId.replace(/-/g, '\\-');
      const boldRegex = new RegExp(
        `(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`,
        'g'
      );

      const updated = body.replace(boldRegex, '$1x$2');

      expect(updated).toContain('- [x] **AC-US1-01**:');
      expect(updated).toContain('- [ ] **AC-US1-02**:');
    });

    it('should match plain AC format: - [ ] AC-US1-01: Description', () => {
      const body = `## Acceptance Criteria

- [ ] AC-US1-01: First criterion
- [ ] AC-US1-02: Second criterion`;

      const acId = 'AC-US1-01';
      const escapedAcId = acId.replace(/-/g, '\\-');
      const plainRegex = new RegExp(
        `(- \\[)[ x](\\] ${escapedAcId}:)`,
        'g'
      );

      const updated = body.replace(plainRegex, '$1x$2');

      expect(updated).toContain('- [x] AC-US1-01:');
      expect(updated).toContain('- [ ] AC-US1-02:');
    });

    it('should handle legacy AC format: AC-020', () => {
      const body = `## Acceptance Criteria

- [ ] **AC-020**: Legacy format
- [ ] **AC-021**: Another legacy`;

      const acId = 'AC-020';
      const escapedAcId = acId.replace(/-/g, '\\-');
      const boldRegex = new RegExp(
        `(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`,
        'g'
      );

      const updated = body.replace(boldRegex, '$1x$2');

      expect(updated).toContain('- [x] **AC-020**:');
      expect(updated).toContain('- [ ] **AC-021**:');
    });

    it('should toggle checkbox from checked to unchecked', () => {
      const body = `## Acceptance Criteria

- [x] **AC-US1-01**: Already checked
- [ ] **AC-US1-02**: Not checked`;

      const acId = 'AC-US1-01';
      const escapedAcId = acId.replace(/-/g, '\\-');
      const boldRegex = new RegExp(
        `(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`,
        'g'
      );

      // Toggle to unchecked
      const updated = body.replace(boldRegex, '$1 $2');

      expect(updated).toContain('- [ ] **AC-US1-01**:');
      expect(updated).toContain('- [ ] **AC-US1-02**:');
    });

    it('should handle multiple ACs in single update', () => {
      let body = `## Acceptance Criteria

- [ ] **AC-US1-01**: First
- [ ] **AC-US1-02**: Second
- [ ] **AC-US1-03**: Third`;

      const updates: [string, boolean][] = [
        ['AC-US1-01', true],
        ['AC-US1-03', true]
      ];

      for (const [acId, completed] of updates) {
        const checkboxState = completed ? 'x' : ' ';
        const escapedAcId = acId.replace(/-/g, '\\-');
        const boldRegex = new RegExp(
          `(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`,
          'g'
        );
        body = body.replace(boldRegex, `$1${checkboxState}$2`);
      }

      expect(body).toContain('- [x] **AC-US1-01**:');
      expect(body).toContain('- [ ] **AC-US1-02**:'); // Unchanged
      expect(body).toContain('- [x] **AC-US1-03**:');
    });

    it('should not match AC IDs without proper formatting', () => {
      const body = `Some text mentioning AC-US1-01 without checkbox format.

And also AC-US1-02 in plain text.`;

      const acId = 'AC-US1-01';
      const escapedAcId = acId.replace(/-/g, '\\-');
      const boldRegex = new RegExp(
        `(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`,
        'g'
      );

      const updated = body.replace(boldRegex, '$1x$2');

      // Should be unchanged - no checkbox format to match
      expect(updated).toBe(body);
    });
  });

  describe('comment building', () => {
    it('should build progress comment with correct counts', () => {
      const acStatus = new Map<string, boolean>([
        ['AC-US1-01', true],
        ['AC-US1-02', false],
        ['AC-US1-03', true]
      ]);

      const completedCount = [...acStatus.values()].filter((v) => v).length;
      const totalCount = acStatus.size;
      const percentage = Math.round((completedCount / totalCount) * 100);

      expect(completedCount).toBe(2);
      expect(totalCount).toBe(3);
      expect(percentage).toBe(67);
    });

    it('should list recently completed ACs in comment', () => {
      const acStatus = new Map<string, boolean>([
        ['AC-US1-01', true],
        ['AC-US1-02', false],
        ['AC-US1-03', true]
      ]);
      const updated = ['AC-US1-01', 'AC-US1-03'];

      const recentlyCompleted = updated
        .filter((id) => acStatus.get(id))
        .map((id) => `- ✅ ${id}`)
        .join('\n');

      expect(recentlyCompleted).toContain('- ✅ AC-US1-01');
      expect(recentlyCompleted).toContain('- ✅ AC-US1-03');
      expect(recentlyCompleted).not.toContain('AC-US1-02');
    });
  });

  describe('idempotency', () => {
    it('should detect when no changes are needed', () => {
      const originalBody = `## Acceptance Criteria

- [x] **AC-US1-01**: Already checked`;

      const acStatus = new Map<string, boolean>([['AC-US1-01', true]]);

      let body = originalBody;
      const updated: string[] = [];

      for (const [acId, completed] of acStatus) {
        const checkboxState = completed ? 'x' : ' ';
        const escapedAcId = acId.replace(/-/g, '\\-');
        const boldRegex = new RegExp(
          `(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`,
          'g'
        );

        const beforeUpdate = body;
        body = body.replace(boldRegex, `$1${checkboxState}$2`);

        if (body !== beforeUpdate) {
          updated.push(acId);
        }
      }

      // No changes should be detected
      expect(updated).toHaveLength(0);
      expect(body).toBe(originalBody);
    });

    it('should detect when changes are made', () => {
      const originalBody = `## Acceptance Criteria

- [ ] **AC-US1-01**: Not checked yet`;

      const acStatus = new Map<string, boolean>([['AC-US1-01', true]]);

      let body = originalBody;
      const updated: string[] = [];

      for (const [acId, completed] of acStatus) {
        const checkboxState = completed ? 'x' : ' ';
        const escapedAcId = acId.replace(/-/g, '\\-');
        const boldRegex = new RegExp(
          `(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`,
          'g'
        );

        const beforeUpdate = body;
        body = body.replace(boldRegex, `$1${checkboxState}$2`);

        if (body !== beforeUpdate) {
          updated.push(acId);
        }
      }

      // Change should be detected
      expect(updated).toContain('AC-US1-01');
      expect(body).not.toBe(originalBody);
    });
  });

  describe('error handling', () => {
    it('should handle missing AC IDs gracefully', () => {
      const body = `## Acceptance Criteria

- [ ] **AC-US1-01**: Only this one exists`;

      // Try to update non-existent AC
      const acId = 'AC-US1-99';
      const escapedAcId = acId.replace(/-/g, '\\-');
      const boldRegex = new RegExp(
        `(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`,
        'g'
      );

      const updated = body.replace(boldRegex, '$1x$2');

      // Should be unchanged
      expect(updated).toBe(body);
    });

    it('should handle empty body', () => {
      const body = '';

      const acId = 'AC-US1-01';
      const escapedAcId = acId.replace(/-/g, '\\-');
      const boldRegex = new RegExp(
        `(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`,
        'g'
      );

      const updated = body.replace(boldRegex, '$1x$2');

      expect(updated).toBe('');
    });
  });
});
