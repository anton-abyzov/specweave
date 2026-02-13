/**
 * T-001 [RED]: AC Checkbox Formatter Tests
 *
 * Tests for formatACCheckboxes() which formats AC states
 * into provider-specific checkbox markup:
 * - GitHub: `- [x] **AC-ID**: description`
 * - JIRA:   `(/) AC-ID: description`
 * - ADO:    `<li>☑ AC-ID: description</li>`
 */
import { describe, it, expect } from 'vitest';
import {
  formatACCheckboxes,
  type ACState,
  type ACCheckboxFormat,
} from '../../../src/core/ac-checkbox-formatter.js';

const mixedACs: ACState[] = [
  { id: 'AC-US1-01', description: 'First criterion is done', completed: true },
  { id: 'AC-US1-02', description: 'Second criterion pending', completed: false },
  { id: 'AC-US1-03', description: 'Third criterion is done', completed: true },
];

const allComplete: ACState[] = [
  { id: 'AC-US2-01', description: 'All done first', completed: true },
  { id: 'AC-US2-02', description: 'All done second', completed: true },
];

const noneComplete: ACState[] = [
  { id: 'AC-US3-01', description: 'Not started first', completed: false },
  { id: 'AC-US3-02', description: 'Not started second', completed: false },
];

describe('formatACCheckboxes', () => {
  describe('GitHub format', () => {
    it('formats mixed AC states with markdown checkboxes', () => {
      const result = formatACCheckboxes(mixedACs, 'github');
      expect(result).toContain('- [x] **AC-US1-01**: First criterion is done');
      expect(result).toContain('- [ ] **AC-US1-02**: Second criterion pending');
      expect(result).toContain('- [x] **AC-US1-03**: Third criterion is done');
    });

    it('includes progress header with percentage', () => {
      const result = formatACCheckboxes(mixedACs, 'github');
      expect(result).toContain('2/3');
      expect(result).toMatch(/67%|66%/);
    });

    it('formats all-complete ACs', () => {
      const result = formatACCheckboxes(allComplete, 'github');
      expect(result).toContain('- [x] **AC-US2-01**');
      expect(result).toContain('- [x] **AC-US2-02**');
      expect(result).toContain('2/2');
      expect(result).toContain('100%');
    });

    it('formats none-complete ACs', () => {
      const result = formatACCheckboxes(noneComplete, 'github');
      expect(result).toContain('- [ ] **AC-US3-01**');
      expect(result).toContain('- [ ] **AC-US3-02**');
      expect(result).toContain('0/2');
      expect(result).toContain('0%');
    });
  });

  describe('JIRA format', () => {
    it('formats completed ACs with (/) symbol', () => {
      const result = formatACCheckboxes(mixedACs, 'jira');
      expect(result).toContain('(/) AC-US1-01: First criterion is done');
      expect(result).toContain('(/) AC-US1-03: Third criterion is done');
    });

    it('formats pending ACs with (x) symbol', () => {
      const result = formatACCheckboxes(mixedACs, 'jira');
      expect(result).toContain('(x) AC-US1-02: Second criterion pending');
    });

    it('includes progress header with percentage', () => {
      const result = formatACCheckboxes(mixedACs, 'jira');
      expect(result).toContain('2/3');
      expect(result).toMatch(/67%|66%/);
    });

    it('formats all-complete ACs', () => {
      const result = formatACCheckboxes(allComplete, 'jira');
      expect(result).toContain('(/) AC-US2-01');
      expect(result).toContain('(/) AC-US2-02');
      expect(result).not.toContain('(x)');
    });
  });

  describe('ADO format', () => {
    it('formats completed ACs with ☑ in HTML list items', () => {
      const result = formatACCheckboxes(mixedACs, 'ado');
      expect(result).toContain('<li>☑ AC-US1-01: First criterion is done</li>');
      expect(result).toContain('<li>☑ AC-US1-03: Third criterion is done</li>');
    });

    it('formats pending ACs with ☐ in HTML list items', () => {
      const result = formatACCheckboxes(mixedACs, 'ado');
      expect(result).toContain('<li>☐ AC-US1-02: Second criterion pending</li>');
    });

    it('includes progress header with percentage', () => {
      const result = formatACCheckboxes(mixedACs, 'ado');
      expect(result).toContain('2/3');
      expect(result).toMatch(/67%|66%/);
    });

    it('wraps items in <ul> tags', () => {
      const result = formatACCheckboxes(mixedACs, 'ado');
      expect(result).toContain('<ul>');
      expect(result).toContain('</ul>');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for empty acStates array', () => {
      const result = formatACCheckboxes([], 'github');
      expect(result).toBe('');
    });

    it('returns empty string for empty array with jira format', () => {
      const result = formatACCheckboxes([], 'jira');
      expect(result).toBe('');
    });

    it('returns empty string for empty array with ado format', () => {
      const result = formatACCheckboxes([], 'ado');
      expect(result).toBe('');
    });

    it('handles single AC correctly', () => {
      const single: ACState[] = [
        { id: 'AC-US4-01', description: 'Only criterion', completed: true },
      ];
      const result = formatACCheckboxes(single, 'github');
      expect(result).toContain('1/1');
      expect(result).toContain('100%');
      expect(result).toContain('- [x] **AC-US4-01**: Only criterion');
    });

    it('handles ACs with special characters in description', () => {
      const special: ACState[] = [
        { id: 'AC-US5-01', description: 'Uses `code` and **bold** & <html>', completed: false },
      ];
      const result = formatACCheckboxes(special, 'github');
      expect(result).toContain('Uses `code` and **bold** & <html>');
    });
  });
});
