/**
 * Unit tests for GitHub Issue Body Generator (RED phase - TDD)
 *
 * Tests the generateIssueBody() function which creates GitHub issue
 * body markdown from a UserStoryInput object.
 *
 * Expected output format:
 * - Description section
 * - AC checkboxes between specweave:ac-start/ac-end markers
 * - Priority badge
 * - Sync footer marker with spec and US IDs
 */

import { describe, it, expect } from 'vitest';

// RED phase: module does not exist yet
import {
  generateIssueBody,
} from '../../../../plugins/specweave-github/lib/github-issue-body-generator.js';
import type { UserStoryInput } from '../../../../plugins/specweave-github/lib/github-issue-body-generator.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<UserStoryInput> = {}): UserStoryInput {
  return {
    id: 'US-001',
    title: 'User authentication',
    description: 'Users should be able to log in with email and password.',
    priority: 'P1',
    acceptanceCriteria: [
      {
        id: 'AC-US1-01',
        description: 'User can log in with valid credentials',
        completed: false,
      },
      {
        id: 'AC-US1-02',
        description: 'User sees error on invalid credentials',
        completed: false,
      },
    ],
    specId: 'spec-001',
    specPath: '.specweave/docs/internal/specs/default/FS-001/us-001-auth.md',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateIssueBody', () => {
  // 1. Basic body generation with description and ACs
  it('should generate a body containing the description and acceptance criteria', () => {
    const input = makeInput();
    const body = generateIssueBody(input);

    expect(body).toContain('Users should be able to log in with email and password.');
    expect(body).toContain('AC-US1-01');
    expect(body).toContain('AC-US1-02');
    expect(body).toContain('User can log in with valid credentials');
    expect(body).toContain('User sees error on invalid credentials');
  });

  // 2. Unchecked ACs render as `- [ ]`
  it('should render unchecked ACs with - [ ] checkbox', () => {
    const input = makeInput({
      acceptanceCriteria: [
        { id: 'AC-US1-01', description: 'Not done yet', completed: false },
      ],
    });
    const body = generateIssueBody(input);

    expect(body).toContain('- [ ] **AC-US1-01**: Not done yet');
  });

  // 3. Checked ACs render as `- [x]`
  it('should render checked ACs with - [x] checkbox', () => {
    const input = makeInput({
      acceptanceCriteria: [
        { id: 'AC-US1-01', description: 'Already done', completed: true },
      ],
    });
    const body = generateIssueBody(input);

    expect(body).toContain('- [x] **AC-US1-01**: Already done');
  });

  // 4. AC markers are present
  it('should wrap ACs between specweave ac-start and ac-end markers', () => {
    const input = makeInput();
    const body = generateIssueBody(input);

    expect(body).toContain('<!-- specweave:ac-start -->');
    expect(body).toContain('<!-- specweave:ac-end -->');

    // Verify ordering: ac-start comes before ac-end
    const startIdx = body.indexOf('<!-- specweave:ac-start -->');
    const endIdx = body.indexOf('<!-- specweave:ac-end -->');
    expect(startIdx).toBeLessThan(endIdx);

    // AC checkboxes should be between the markers
    const acSection = body.slice(startIdx, endIdx);
    expect(acSection).toContain('AC-US1-01');
    expect(acSection).toContain('AC-US1-02');
  });

  // 5. Priority badge is included
  it('should include a priority badge', () => {
    const input = makeInput({ priority: 'P1' });
    const body = generateIssueBody(input);

    expect(body).toContain('**Priority**: P1');
  });

  it('should reflect the actual priority value in the badge', () => {
    const input = makeInput({ priority: 'P3' });
    const body = generateIssueBody(input);

    expect(body).toContain('**Priority**: P3');
    expect(body).not.toContain('**Priority**: P1');
  });

  // 6. Sync footer marker is present with spec and US IDs
  it('should include a sync footer marker with spec and US IDs', () => {
    const input = makeInput({ specId: 'spec-042', id: 'US-007' });
    const body = generateIssueBody(input);

    expect(body).toContain('<!-- specweave:sync spec=spec-042 us=US-007 -->');
  });

  it('should omit spec attribute from sync marker when specId is not provided', () => {
    const input = makeInput({ specId: undefined });
    const body = generateIssueBody(input);

    // Sync marker should still be present with at least the US ID
    expect(body).toMatch(/<!-- specweave:sync\b/);
    expect(body).toContain('us=US-001');
    // Should NOT contain spec= when specId is absent
    expect(body).not.toContain('spec=');
  });

  // 7. Empty AC list
  it('should handle an empty acceptance criteria list gracefully', () => {
    const input = makeInput({ acceptanceCriteria: [] });
    const body = generateIssueBody(input);

    // Body should still be valid markdown
    expect(body).toBeTruthy();
    // Description should still be present
    expect(body).toContain('Users should be able to log in with email and password.');
    // No AC checkboxes
    expect(body).not.toMatch(/- \[[ x]\] \*\*AC-/);
    // AC markers should either be absent or form an empty section
    const startIdx = body.indexOf('<!-- specweave:ac-start -->');
    const endIdx = body.indexOf('<!-- specweave:ac-end -->');
    if (startIdx !== -1 && endIdx !== -1) {
      const acSection = body.slice(startIdx, endIdx);
      expect(acSection).not.toMatch(/- \[[ x]\]/);
    }
  });

  // 8. Special characters in description are preserved
  it('should preserve special characters in description', () => {
    const description = 'Users & admins should see <alerts> with "quotes" and `backticks`';
    const input = makeInput({ description });
    const body = generateIssueBody(input);

    expect(body).toContain(description);
  });

  it('should preserve special characters in AC descriptions', () => {
    const input = makeInput({
      acceptanceCriteria: [
        {
          id: 'AC-US1-01',
          description: 'Response time < 200ms for 95th percentile',
          completed: false,
        },
      ],
    });
    const body = generateIssueBody(input);

    expect(body).toContain('Response time < 200ms for 95th percentile');
  });

  // Mixed completed/uncompleted ACs
  it('should render a mix of completed and uncompleted ACs correctly', () => {
    const input = makeInput({
      acceptanceCriteria: [
        { id: 'AC-US1-01', description: 'First criterion', completed: true },
        { id: 'AC-US1-02', description: 'Second criterion', completed: false },
        { id: 'AC-US1-03', description: 'Third criterion', completed: true },
      ],
    });
    const body = generateIssueBody(input);

    expect(body).toContain('- [x] **AC-US1-01**: First criterion');
    expect(body).toContain('- [ ] **AC-US1-02**: Second criterion');
    expect(body).toContain('- [x] **AC-US1-03**: Third criterion');
  });

  // Sync marker appears after body content (footer position)
  it('should place the sync marker at the end of the body', () => {
    const input = makeInput();
    const body = generateIssueBody(input);

    const syncIdx = body.indexOf('<!-- specweave:sync');
    // Sync marker should be in the last portion of the body
    expect(syncIdx).toBeGreaterThan(body.length / 2);

    // Nothing meaningful should follow the sync marker
    // (allow trailing whitespace/newlines)
    const afterSync = body.slice(body.indexOf('-->', syncIdx) + 3).trim();
    expect(afterSync).toBe('');
  });
});
