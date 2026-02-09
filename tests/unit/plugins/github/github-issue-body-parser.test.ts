/**
 * Unit tests for GitHub Issue Body Parser (RED phase)
 *
 * Tests the parseIssueBody function that extracts AC checkbox state
 * and sync metadata from a GitHub issue body.
 *
 * The module under test does not exist yet — this is the RED phase of TDD.
 *
 * @module github-issue-body-parser
 */

import { describe, it, expect } from 'vitest';
import { parseIssueBody } from '../../../../plugins/specweave-github/lib/github-issue-body-parser.js';

describe('parseIssueBody', () => {
  describe('single AC parsing', () => {
    it('should parse a checked AC checkbox', () => {
      const body = [
        '## Acceptance Criteria',
        '',
        '- [x] **AC-US1-01**: Login works',
      ].join('\n');

      const result = parseIssueBody(body);

      expect(result.acceptanceCriteria).toEqual({
        'AC-US1-01': { checked: true, description: 'Login works' },
      });
    });

    it('should parse an unchecked AC checkbox', () => {
      const body = [
        '## Acceptance Criteria',
        '',
        '- [ ] **AC-US1-02**: Error shown',
      ].join('\n');

      const result = parseIssueBody(body);

      expect(result.acceptanceCriteria).toEqual({
        'AC-US1-02': { checked: false, description: 'Error shown' },
      });
    });
  });

  describe('multiple ACs between markers', () => {
    it('should parse multiple ACs within the Acceptance Criteria section', () => {
      const body = [
        '## Progress',
        '',
        '**Acceptance Criteria**: 1/3 (33%)',
        '',
        '## Acceptance Criteria',
        '',
        '- [x] **AC-US1-01**: Login works',
        '- [ ] **AC-US1-02**: Error message shown on invalid credentials',
        '- [ ] **AC-US1-03**: Session persists after page reload',
        '',
        '## Tasks',
        '',
        '- [x] **T-001**: Implement login endpoint',
      ].join('\n');

      const result = parseIssueBody(body);

      expect(Object.keys(result.acceptanceCriteria)).toHaveLength(3);
      expect(result.acceptanceCriteria['AC-US1-01']).toEqual({
        checked: true,
        description: 'Login works',
      });
      expect(result.acceptanceCriteria['AC-US1-02']).toEqual({
        checked: false,
        description: 'Error message shown on invalid credentials',
      });
      expect(result.acceptanceCriteria['AC-US1-03']).toEqual({
        checked: false,
        description: 'Session persists after page reload',
      });
    });

    it('should stop parsing ACs at the next section heading', () => {
      const body = [
        '## Acceptance Criteria',
        '',
        '- [x] **AC-US2-01**: Dashboard loads',
        '- [ ] **AC-US2-02**: Widgets render',
        '',
        '## Implementation Tasks',
        '',
        '- [x] **T-001**: Build dashboard component',
      ].join('\n');

      const result = parseIssueBody(body);

      expect(Object.keys(result.acceptanceCriteria)).toHaveLength(2);
      expect(result.acceptanceCriteria['AC-US2-01']?.checked).toBe(true);
      expect(result.acceptanceCriteria['AC-US2-02']?.checked).toBe(false);
    });
  });

  describe('fallback regex when markers are missing', () => {
    it('should find ACs when user edited the issue and removed section headers', () => {
      const body = [
        'Some freeform text the user wrote.',
        '',
        '- [x] **AC-US3-01**: API returns 200',
        '- [ ] **AC-US3-02**: Response has correct schema',
        '',
        'More user notes here.',
      ].join('\n');

      const result = parseIssueBody(body);

      expect(Object.keys(result.acceptanceCriteria)).toHaveLength(2);
      expect(result.acceptanceCriteria['AC-US3-01']).toEqual({
        checked: true,
        description: 'API returns 200',
      });
      expect(result.acceptanceCriteria['AC-US3-02']).toEqual({
        checked: false,
        description: 'Response has correct schema',
      });
    });

    it('should find ACs scattered throughout the body without a dedicated section', () => {
      const body = [
        '# My Custom Issue Title',
        '',
        'Here is context about the feature.',
        '',
        '- [ ] **AC-US5-01**: First criterion',
        '',
        'Some explanation between criteria.',
        '',
        '- [x] **AC-US5-02**: Second criterion',
      ].join('\n');

      const result = parseIssueBody(body);

      expect(Object.keys(result.acceptanceCriteria)).toHaveLength(2);
      expect(result.acceptanceCriteria['AC-US5-01']?.checked).toBe(false);
      expect(result.acceptanceCriteria['AC-US5-02']?.checked).toBe(true);
    });
  });

  describe('sync footer marker', () => {
    it('should parse sync marker from HTML comment', () => {
      const body = [
        '## Acceptance Criteria',
        '',
        '- [x] **AC-US1-01**: Login works',
        '',
        '---',
        '',
        '<!-- specweave:sync spec=spec-001 us=US-001 -->',
      ].join('\n');

      const result = parseIssueBody(body);

      expect(result.syncMarker).toEqual({
        specId: 'spec-001',
        userStoryId: 'US-001',
      });
    });

    it('should return undefined syncMarker when no marker is present', () => {
      const body = [
        '## Acceptance Criteria',
        '',
        '- [x] **AC-US1-01**: Login works',
      ].join('\n');

      const result = parseIssueBody(body);

      expect(result.syncMarker).toBeUndefined();
    });

    it('should parse sync marker with different spec and US IDs', () => {
      const body = [
        'Issue content here.',
        '',
        '<!-- specweave:sync spec=spec-042 us=US-007 -->',
      ].join('\n');

      const result = parseIssueBody(body);

      expect(result.syncMarker).toEqual({
        specId: 'spec-042',
        userStoryId: 'US-007',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty body', () => {
      const result = parseIssueBody('');

      expect(result.acceptanceCriteria).toEqual({});
      expect(result.syncMarker).toBeUndefined();
    });

    it('should handle body with no ACs', () => {
      const body = [
        '## Description',
        '',
        'This issue is about refactoring the database layer.',
        '',
        '## Tasks',
        '',
        '- [x] **T-001**: Migrate schema',
        '- [ ] **T-002**: Update queries',
      ].join('\n');

      const result = parseIssueBody(body);

      expect(result.acceptanceCriteria).toEqual({});
      expect(result.syncMarker).toBeUndefined();
    });

    it('should handle body with only whitespace', () => {
      const result = parseIssueBody('   \n\n  \n  ');

      expect(result.acceptanceCriteria).toEqual({});
      expect(result.syncMarker).toBeUndefined();
    });
  });

  describe('mixed checked/unchecked ACs', () => {
    it('should correctly distinguish checked and unchecked ACs', () => {
      const body = [
        '## Acceptance Criteria',
        '',
        '- [x] **AC-US4-01**: User can register with email',
        '- [ ] **AC-US4-02**: Validation errors displayed inline',
        '- [x] **AC-US4-03**: Confirmation email sent',
        '- [ ] **AC-US4-04**: Duplicate email rejected',
        '- [x] **AC-US4-05**: Password strength indicator shown',
      ].join('\n');

      const result = parseIssueBody(body);

      expect(Object.keys(result.acceptanceCriteria)).toHaveLength(5);

      // Checked
      expect(result.acceptanceCriteria['AC-US4-01']?.checked).toBe(true);
      expect(result.acceptanceCriteria['AC-US4-03']?.checked).toBe(true);
      expect(result.acceptanceCriteria['AC-US4-05']?.checked).toBe(true);

      // Unchecked
      expect(result.acceptanceCriteria['AC-US4-02']?.checked).toBe(false);
      expect(result.acceptanceCriteria['AC-US4-04']?.checked).toBe(false);
    });

    it('should preserve descriptions accurately for all ACs', () => {
      const body = [
        '## Acceptance Criteria',
        '',
        '- [x] **AC-US6-01**: Data exported as CSV',
        '- [ ] **AC-US6-02**: Export includes all filtered results',
      ].join('\n');

      const result = parseIssueBody(body);

      expect(result.acceptanceCriteria['AC-US6-01']?.description).toBe(
        'Data exported as CSV'
      );
      expect(result.acceptanceCriteria['AC-US6-02']?.description).toBe(
        'Export includes all filtered results'
      );
    });
  });

  describe('combined parsing', () => {
    it('should parse ACs and sync marker from a full issue body', () => {
      const body = [
        '## Progress',
        '',
        '**Acceptance Criteria**: 2/4 (50%)',
        '**Tasks**: 3/5 (60%)',
        '**Overall**: 55%',
        '',
        '## User Story',
        '',
        '**As a** user',
        '**I want** to reset my password',
        '**So that** I can regain access to my account',
        '',
        '## Acceptance Criteria',
        '',
        '- [x] **AC-US7-01**: Reset link sent via email',
        '- [x] **AC-US7-02**: Link expires after 24 hours',
        '- [ ] **AC-US7-03**: New password must meet complexity rules',
        '- [ ] **AC-US7-04**: Old sessions invalidated after reset',
        '',
        '## Tasks',
        '',
        '- [x] **T-001**: Build reset endpoint',
        '- [x] **T-002**: Create email template',
        '- [x] **T-003**: Add token generation',
        '- [ ] **T-004**: Implement password validation',
        '- [ ] **T-005**: Add session invalidation',
        '',
        '---',
        '',
        '<!-- specweave:sync spec=spec-007 us=US-007 -->',
      ].join('\n');

      const result = parseIssueBody(body);

      // ACs
      expect(Object.keys(result.acceptanceCriteria)).toHaveLength(4);
      expect(result.acceptanceCriteria['AC-US7-01']?.checked).toBe(true);
      expect(result.acceptanceCriteria['AC-US7-02']?.checked).toBe(true);
      expect(result.acceptanceCriteria['AC-US7-03']?.checked).toBe(false);
      expect(result.acceptanceCriteria['AC-US7-04']?.checked).toBe(false);

      // Sync marker
      expect(result.syncMarker).toEqual({
        specId: 'spec-007',
        userStoryId: 'US-007',
      });
    });
  });
});
