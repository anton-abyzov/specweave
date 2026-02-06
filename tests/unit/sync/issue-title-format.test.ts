import { describe, it, expect } from 'vitest';
import {
  formatIssueTitle,
  formatMilestoneTitle,
  parseIssueTitle,
  parseIssueTitleLegacy,
} from '../../../src/sync/types.js';

describe('Issue Title Format', () => {
  describe('formatIssueTitle', () => {
    it('should format clean title with US ID', () => {
      expect(formatIssueTitle('US-010', 'Documentation Update')).toBe('US-010: Documentation Update');
    });

    it('should handle various US IDs', () => {
      expect(formatIssueTitle('US-001', 'Auth Flow')).toBe('US-001: Auth Flow');
      expect(formatIssueTitle('US-100', 'Big Feature')).toBe('US-100: Big Feature');
    });

    it('should handle external US IDs with suffix', () => {
      expect(formatIssueTitle('US-010G', 'From GitHub')).toBe('US-010G: From GitHub');
      expect(formatIssueTitle('US-010J', 'From JIRA')).toBe('US-010J: From JIRA');
    });
  });

  describe('formatMilestoneTitle', () => {
    it('should format milestone with FS ID', () => {
      expect(formatMilestoneTitle('FS-172', 'True Autonomous Mode')).toBe('FS-172: True Autonomous Mode');
    });

    it('should handle external FS IDs', () => {
      expect(formatMilestoneTitle('FS-042G', 'Auth Flow')).toBe('FS-042G: Auth Flow');
    });
  });

  describe('parseIssueTitle', () => {
    it('should extract US ID from new format', () => {
      const result = parseIssueTitle('US-010: Documentation Update');
      expect(result).toEqual({
        usId: 'US-010',
        title: 'Documentation Update',
      });
    });

    it('should extract US ID with suffix', () => {
      const result = parseIssueTitle('US-010G: From GitHub');
      expect(result).toEqual({
        usId: 'US-010G',
        title: 'From GitHub',
      });
    });

    it('should return null for unrecognized format', () => {
      expect(parseIssueTitle('Random title')).toBeNull();
      expect(parseIssueTitle('')).toBeNull();
    });
  });

  describe('parseIssueTitleLegacy', () => {
    it('should parse old [FS-XXX][US-YYY] format', () => {
      const result = parseIssueTitleLegacy('[FS-172][US-010] Documentation Update');
      expect(result).toEqual({
        fsId: 'FS-172',
        usId: 'US-010',
        title: 'Documentation Update',
      });
    });

    it('should parse old format with E suffix', () => {
      const result = parseIssueTitleLegacy('[FS-042E][US-004E] External Item');
      expect(result).toEqual({
        fsId: 'FS-042E',
        usId: 'US-004E',
        title: 'External Item',
      });
    });

    it('should return null for new format', () => {
      expect(parseIssueTitleLegacy('US-010: Documentation Update')).toBeNull();
    });

    it('should return null for random text', () => {
      expect(parseIssueTitleLegacy('Just a title')).toBeNull();
    });
  });

  describe('AC-US4-05: Reconciler recognizes both formats', () => {
    it('should parse new format', () => {
      const newResult = parseIssueTitle('US-010: Documentation Update');
      expect(newResult).not.toBeNull();
      expect(newResult!.usId).toBe('US-010');
    });

    it('should parse old format via legacy parser', () => {
      const oldResult = parseIssueTitleLegacy('[FS-172][US-010] Documentation Update');
      expect(oldResult).not.toBeNull();
      expect(oldResult!.usId).toBe('US-010');
    });
  });
});
