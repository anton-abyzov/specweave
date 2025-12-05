/**
 * External Items Display Unit Tests
 *
 * Tests the compact display formatters for scale:
 * - formatCount: 1234 -> "1.2k", 1234567 -> "1.2M"
 * - formatBriefSummary: "GH:450 JI:380 ADO:417"
 * - displayStatusSection: Full section output
 */

import { describe, it, expect } from 'vitest';
import {
  formatCompactCount,
  formatBriefSummary,
  formatPlanningNotification,
  formatProgressFooter,
} from '../../../../src/core/external-tools/external-items-display.js';
import { ExternalItemsCounts, ExternalItemsSummary } from '../../../../src/core/external-tools/types.js';

describe('formatCompactCount', () => {
  it('should return empty string for zero items', () => {
    const counts: ExternalItemsCounts = {
      github: { configured: true, total: 0 },
      jira: { configured: false, total: 0 },
      ado: { configured: false, total: 0 },
      grandTotal: 0,
      lastUpdated: new Date().toISOString(),
    };

    expect(formatCompactCount(counts)).toBe('');
  });

  it('should format small numbers without suffix', () => {
    const counts: ExternalItemsCounts = {
      github: { configured: true, total: 42 },
      jira: { configured: false, total: 0 },
      ado: { configured: false, total: 0 },
      grandTotal: 42,
      lastUpdated: new Date().toISOString(),
    };

    expect(formatCompactCount(counts)).toContain('42');
  });

  it('should format thousands with k suffix', () => {
    const counts: ExternalItemsCounts = {
      github: { configured: true, total: 1234 },
      jira: { configured: false, total: 0 },
      ado: { configured: false, total: 0 },
      grandTotal: 1234,
      lastUpdated: new Date().toISOString(),
    };

    expect(formatCompactCount(counts)).toContain('1.2k');
  });

  it('should format millions with M suffix', () => {
    const counts: ExternalItemsCounts = {
      github: { configured: true, total: 1234567 },
      jira: { configured: false, total: 0 },
      ado: { configured: false, total: 0 },
      grandTotal: 1234567,
      lastUpdated: new Date().toISOString(),
    };

    expect(formatCompactCount(counts)).toContain('1.2M');
  });
});

describe('formatBriefSummary', () => {
  it('should format all configured providers', () => {
    const counts: ExternalItemsCounts = {
      github: { configured: true, total: 450 },
      jira: { configured: true, total: 380 },
      ado: { configured: true, total: 417 },
      grandTotal: 1247,
      lastUpdated: new Date().toISOString(),
    };

    const result = formatBriefSummary(counts);
    expect(result).toContain('GH:450');
    expect(result).toContain('JI:380');
    expect(result).toContain('ADO:417');
  });

  it('should skip unconfigured providers', () => {
    const counts: ExternalItemsCounts = {
      github: { configured: true, total: 42 },
      jira: { configured: false, total: 0 },
      ado: { configured: false, total: 0 },
      grandTotal: 42,
      lastUpdated: new Date().toISOString(),
    };

    const result = formatBriefSummary(counts);
    expect(result).toContain('GH:42');
    expect(result).not.toContain('JI:');
    expect(result).not.toContain('ADO:');
  });

  it('should skip configured providers with zero items', () => {
    const counts: ExternalItemsCounts = {
      github: { configured: true, total: 0 },
      jira: { configured: true, total: 100 },
      ado: { configured: false, total: 0 },
      grandTotal: 100,
      lastUpdated: new Date().toISOString(),
    };

    const result = formatBriefSummary(counts);
    expect(result).not.toContain('GH:');
    expect(result).toContain('JI:100');
  });

  it('should format large numbers compactly', () => {
    const counts: ExternalItemsCounts = {
      github: { configured: true, total: 1500 },
      jira: { configured: true, total: 2300 },
      ado: { configured: false, total: 0 },
      grandTotal: 3800,
      lastUpdated: new Date().toISOString(),
    };

    const result = formatBriefSummary(counts);
    expect(result).toContain('GH:1.5k');
    expect(result).toContain('JI:2.3k');
  });
});

describe('formatPlanningNotification', () => {
  it('should return null for zero items', () => {
    const counts: ExternalItemsCounts = {
      github: { configured: true, total: 0 },
      jira: { configured: false, total: 0 },
      ado: { configured: false, total: 0 },
      grandTotal: 0,
      lastUpdated: new Date().toISOString(),
    };

    expect(formatPlanningNotification(counts)).toBeNull();
  });

  it('should return notification with count', () => {
    const counts: ExternalItemsCounts = {
      github: { configured: true, total: 5 },
      jira: { configured: false, total: 0 },
      ado: { configured: false, total: 0 },
      grandTotal: 5,
      lastUpdated: new Date().toISOString(),
    };

    const result = formatPlanningNotification(counts);
    expect(result).toContain('5');
    expect(result).toContain('external');
  });
});

describe('formatProgressFooter', () => {
  it('should return null for zero items', () => {
    const counts: ExternalItemsCounts = {
      github: { configured: true, total: 0 },
      jira: { configured: false, total: 0 },
      ado: { configured: false, total: 0 },
      grandTotal: 0,
      lastUpdated: new Date().toISOString(),
    };

    expect(formatProgressFooter(counts)).toBeNull();
  });

  it('should return footer with count', () => {
    const counts: ExternalItemsCounts = {
      github: { configured: true, total: 10 },
      jira: { configured: false, total: 0 },
      ado: { configured: false, total: 0 },
      grandTotal: 10,
      lastUpdated: new Date().toISOString(),
    };

    const result = formatProgressFooter(counts);
    expect(result).toContain('10');
    expect(result).toContain('external');
  });
});
