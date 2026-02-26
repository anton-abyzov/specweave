/**
 * Unit tests for DORA Metrics Report Generator
 *
 * Tests all exported functions: generateMarkdownReport, writeReport
 * Tests all internal logic paths for insight generators and formatting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import type { DORAMetrics, Release, Issue } from '../../../src/metrics/types.js';

// --- ESM mocking with vi.hoisted ---

const { mockExistsSync, mockMkdirSync, mockWriteFileSync, mockConsoleLog } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockConsoleLog: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
    writeFileSync: mockWriteFileSync,
  },
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
}));

// --- Helpers ---

function makeMetrics(overrides: Partial<{
  dfValue: number; dfUnit: string; dfTier: string;
  ltValue: number; ltUnit: string; ltTier: string; ltP50: number; ltP90: number;
  cfrValue: number; cfrTier: string; cfrFailed: number; cfrTotal: number;
  mttrValue: number; mttrUnit: string; mttrTier: string; mttrP50: number; mttrP90: number;
  timestamp: string;
}> = {}): DORAMetrics {
  return {
    timestamp: overrides.timestamp ?? '2025-01-15T10:30:00Z',
    metrics: {
      deploymentFrequency: {
        value: overrides.dfValue ?? 5,
        unit: (overrides.dfUnit as any) ?? 'deploys/week',
        tier: (overrides.dfTier as any) ?? 'High',
        description: 'Test deployment frequency',
      },
      leadTime: {
        value: overrides.ltValue ?? 24,
        unit: (overrides.ltUnit as any) ?? 'hours',
        tier: (overrides.ltTier as any) ?? 'High',
        p50: overrides.ltP50 ?? 12,
        p90: overrides.ltP90 ?? 48,
      },
      changeFailureRate: {
        value: overrides.cfrValue ?? 10,
        unit: 'percentage',
        tier: (overrides.cfrTier as any) ?? 'Elite',
        failedReleases: overrides.cfrFailed ?? 1,
        totalReleases: overrides.cfrTotal ?? 10,
      },
      mttr: {
        value: overrides.mttrValue ?? 30,
        unit: (overrides.mttrUnit as any) ?? 'minutes',
        tier: (overrides.mttrTier as any) ?? 'Elite',
        p50: overrides.mttrP50 ?? 15,
        p90: overrides.mttrP90 ?? 45,
      },
    },
  };
}

function makeRelease(overrides: Partial<Release & { html_url?: string }> = {}): Release & { html_url: string } {
  return {
    id: overrides.id ?? 1,
    tag_name: overrides.tag_name ?? 'v1.0.0',
    name: overrides.name ?? 'Release v1.0.0',
    created_at: overrides.created_at ?? '2025-01-10T10:00:00Z',
    published_at: overrides.published_at ?? '2025-01-10T12:00:00Z',
    target_commitish: overrides.target_commitish ?? 'abc123',
    html_url: (overrides as any).html_url ?? 'https://github.com/test/repo/releases/tag/v1.0.0',
  };
}

function makeIssue(overrides: Partial<Issue & { html_url?: string }> = {}): Issue & { html_url: string } {
  return {
    id: overrides.id ?? 1,
    number: overrides.number ?? 42,
    title: overrides.title ?? 'Production outage',
    state: overrides.state ?? 'closed',
    labels: overrides.labels ?? [{ name: 'incident' }],
    created_at: overrides.created_at ?? '2025-01-12T08:00:00Z',
    closed_at: 'closed_at' in overrides ? overrides.closed_at! : '2025-01-12T09:30:00Z',
    html_url: (overrides as any).html_url ?? 'https://github.com/test/repo/issues/42',
  };
}

// --- Import SUT after mocks ---

let generateMarkdownReport: typeof import('../../../src/metrics/report-generator.js').generateMarkdownReport;
let writeReport: typeof import('../../../src/metrics/report-generator.js').writeReport;

beforeEach(async () => {
  vi.resetAllMocks();
  vi.spyOn(console, 'log').mockImplementation(mockConsoleLog);
  const mod = await import('../../../src/metrics/report-generator.js');
  generateMarkdownReport = mod.generateMarkdownReport;
  writeReport = mod.writeReport;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================
// generateMarkdownReport
// ============================================================

describe('generateMarkdownReport', () => {
  // --- Header and Executive Summary ---

  describe('report header and executive summary', () => {
    it('should include the report title', () => {
      const report = generateMarkdownReport(makeMetrics());
      expect(report).toContain('# DORA Metrics Report');
    });

    it('should include the formatted generation timestamp', () => {
      const report = generateMarkdownReport(makeMetrics({ timestamp: '2025-06-15T14:30:00Z' }));
      expect(report).toContain('**Generated**:');
      expect(report).toContain('Jun');
      expect(report).toContain('2025');
    });

    it('should include the period label', () => {
      const report = generateMarkdownReport(makeMetrics());
      expect(report).toContain('**Period**: Last 30 days');
    });

    it('should include the executive summary table', () => {
      const report = generateMarkdownReport(makeMetrics());
      expect(report).toContain('Executive Summary');
      expect(report).toContain('| **Deployment Frequency**');
      expect(report).toContain('| **Lead Time for Changes**');
      expect(report).toContain('| **Change Failure Rate**');
      expect(report).toContain('| **Mean Time to Recovery**');
    });

    it('should display metric values in the summary table', () => {
      const report = generateMarkdownReport(makeMetrics({ dfValue: 7, cfrValue: 5 }));
      expect(report).toContain('7 deploys/week');
      expect(report).toContain('5%');
    });
  });

  // --- Overall Assessment ---

  describe('overall assessment', () => {
    it('should show Elite Team when 3+ metrics are Elite', () => {
      const report = generateMarkdownReport(makeMetrics({
        dfTier: 'Elite',
        ltTier: 'Elite',
        cfrTier: 'Elite',
        mttrTier: 'High',
      }));
      expect(report).toContain('Elite Team');
      expect(report).toContain('3/4 metrics at elite level');
    });

    it('should show Elite Team when all 4 metrics are Elite', () => {
      const report = generateMarkdownReport(makeMetrics({
        dfTier: 'Elite',
        ltTier: 'Elite',
        cfrTier: 'Elite',
        mttrTier: 'Elite',
      }));
      expect(report).toContain('Elite Team');
      expect(report).toContain('4/4 metrics at elite level');
    });

    it('should show High-Performing Team when 3+ are high or elite combined', () => {
      const report = generateMarkdownReport(makeMetrics({
        dfTier: 'Elite',
        ltTier: 'High',
        cfrTier: 'High',
        mttrTier: 'Low',
      }));
      expect(report).toContain('High-Performing Team');
      expect(report).toContain('3/4 metrics at high or elite');
    });

    it('should show Growing Team when fewer than 3 high+elite', () => {
      const report = generateMarkdownReport(makeMetrics({
        dfTier: 'Low',
        ltTier: 'Low',
        cfrTier: 'Medium',
        mttrTier: 'Medium',
      }));
      expect(report).toContain('Growing Team');
      expect(report).toContain('Focus on continuous improvement');
    });
  });

  // --- Deployment Frequency Section ---

  describe('deployment frequency section', () => {
    it('should include the deployment frequency header and current value', () => {
      const report = generateMarkdownReport(makeMetrics({ dfValue: 10, dfTier: 'Elite' }));
      expect(report).toContain('Deployment Frequency');
      expect(report).toContain('**Current**: 10 deploys/week');
    });

    it('should include industry benchmarks', () => {
      const report = generateMarkdownReport(makeMetrics());
      expect(report).toContain('Industry Benchmarks');
      expect(report).toContain('Elite: Multiple deploys per day');
    });
  });

  // --- Deployment Frequency Insights ---

  describe('deployment frequency insights', () => {
    it('should show Elite insights when tier is Elite', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Elite' }));
      expect(report).toContain('**Elite Performance**: Deploying multiple times per day');
      expect(report).toContain('Continue current cadence');
    });

    it('should show High insights when tier is High', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'High' }));
      expect(report).toContain('**Strong Performance**: Weekly to monthly');
      expect(report).toContain('**Next Level**: Consider increasing to daily');
      expect(report).toContain('feature flags');
    });

    it('should show Medium insights when tier is Medium', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Medium' }));
      expect(report).toContain('**Room for Improvement**: Monthly to quarterly');
      expect(report).toContain('Break down changes');
      expect(report).toContain('CI/CD pipeline automation');
    });

    it('should show Low insights when tier is Low', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Low' }));
      expect(report).toContain('**Critical**: Infrequent deployments');
      expect(report).toContain('Implement automated deployment pipeline');
      expect(report).toContain('incremental deployments');
    });
  });

  // --- Lead Time Section ---

  describe('lead time section', () => {
    it('should include lead time header and current value', () => {
      const report = generateMarkdownReport(makeMetrics({ ltValue: 48, ltUnit: 'hours', ltTier: 'High' }));
      expect(report).toContain('Lead Time for Changes');
      expect(report).toContain('**Current**: 48 hours');
    });

    it('should show percentiles when p50 and p90 are present', () => {
      const report = generateMarkdownReport(makeMetrics({ ltP50: 6, ltP90: 24 }));
      expect(report).toContain('**Percentiles**: P50 = 6h, P90 = 24h');
    });

    it('should not show percentiles when p50 is zero', () => {
      const report = generateMarkdownReport(makeMetrics({ ltP50: 0, ltP90: 24, mttrP50: 0, mttrP90: 0 }));
      expect(report).not.toContain('**Percentiles**');
    });

    it('should not show percentiles when p90 is zero', () => {
      const report = generateMarkdownReport(makeMetrics({ ltP50: 6, ltP90: 0, mttrP50: 0, mttrP90: 0 }));
      expect(report).not.toContain('**Percentiles**');
    });
  });

  // --- Lead Time Insights ---

  describe('lead time insights', () => {
    it('should show Elite insights', () => {
      const report = generateMarkdownReport(makeMetrics({ ltTier: 'Elite' }));
      expect(report).toContain('**Elite Performance**: Sub-hour lead time');
      expect(report).toContain('Best-in-class delivery speed');
    });

    it('should show High insights with percentile distribution', () => {
      const report = generateMarkdownReport(makeMetrics({ ltTier: 'High', ltP50: 12, ltP90: 48 }));
      expect(report).toContain('**Strong Performance**: Lead time under 1 week');
      expect(report).toContain('**Distribution**: 50% of changes deploy in 12h, 90% in 48h');
      expect(report).toContain('Focus on reducing p90');
    });

    it('should show High insights without distribution when p50 is falsy', () => {
      const report = generateMarkdownReport(makeMetrics({ ltTier: 'High', ltP50: 0, ltP90: 48 }));
      expect(report).toContain('**Strong Performance**');
      expect(report).not.toContain('**Distribution**');
    });

    it('should show Medium insights', () => {
      const report = generateMarkdownReport(makeMetrics({ ltTier: 'Medium' }));
      expect(report).toContain('**Moderate Performance**: 1 week to 1 month');
      expect(report).toContain('Reduce code review time');
      expect(report).toContain('Eliminate manual approval');
    });

    it('should show Low insights', () => {
      const report = generateMarkdownReport(makeMetrics({ ltTier: 'Low' }));
      expect(report).toContain('**Critical**: Long lead times');
      expect(report).toContain('Implement automated testing and deployment');
      expect(report).toContain('Reduce batch size');
    });
  });

  // --- Change Failure Rate Section ---

  describe('change failure rate section', () => {
    it('should include CFR header and current value', () => {
      const report = generateMarkdownReport(makeMetrics({ cfrValue: 25, cfrTier: 'High' }));
      expect(report).toContain('Change Failure Rate');
      expect(report).toContain('**Current**: 25%');
    });

    it('should show failed releases count', () => {
      const report = generateMarkdownReport(makeMetrics({ cfrFailed: 3, cfrTotal: 20 }));
      expect(report).toContain('**Failed Releases**: 3 / 20');
    });
  });

  // --- Change Failure Rate Insights ---

  describe('change failure rate insights', () => {
    it('should show Elite insights with zero failures', () => {
      const report = generateMarkdownReport(makeMetrics({ cfrTier: 'Elite', cfrFailed: 0, cfrTotal: 10 }));
      expect(report).toContain('**Elite Performance**: < 15% failure rate');
      expect(report).toContain('**Perfect Record**: Zero failures');
      expect(report).toContain('Maintain current quality');
    });

    it('should show Elite insights without perfect record when failures > 0', () => {
      const report = generateMarkdownReport(makeMetrics({ cfrTier: 'Elite', cfrFailed: 1, cfrTotal: 10 }));
      expect(report).toContain('**Elite Performance**');
      expect(report).not.toContain('**Perfect Record**');
    });

    it('should show High insights with stats', () => {
      const report = generateMarkdownReport(makeMetrics({ cfrTier: 'High', cfrFailed: 5, cfrTotal: 20 }));
      expect(report).toContain('**Good Performance**: 15-30%');
      expect(report).toContain('5 failures out of 20 deployments');
      expect(report).toContain('test coverage and pre-deployment');
      expect(report).toContain('smoke tests and canary');
    });

    it('should show Medium insights with stats', () => {
      const report = generateMarkdownReport(makeMetrics({ cfrTier: 'Medium', cfrFailed: 8, cfrTotal: 20 }));
      expect(report).toContain('**Concerning**: 30-45%');
      expect(report).toContain('8 failures out of 20 deployments');
      expect(report).toContain('Increase automated test coverage');
      expect(report).toContain('pre-commit hooks');
    });

    it('should show Low insights with stats', () => {
      const report = generateMarkdownReport(makeMetrics({ cfrTier: 'Low', cfrFailed: 15, cfrTotal: 20 }));
      expect(report).toContain('**Critical**: > 45%');
      expect(report).toContain('15 failures out of 20 deployments');
      expect(report).toContain('comprehensive test suite');
      expect(report).toContain('smoke tests and staging');
    });
  });

  // --- MTTR Section ---

  describe('MTTR section', () => {
    it('should include MTTR header and current value', () => {
      const report = generateMarkdownReport(makeMetrics({ mttrValue: 30, mttrUnit: 'minutes', mttrTier: 'Elite' }));
      expect(report).toContain('Mean Time to Recovery');
      expect(report).toContain('**Current**: 30 minutes');
    });

    it('should show percentiles when p50 and p90 are present', () => {
      const report = generateMarkdownReport(makeMetrics({ mttrP50: 10, mttrP90: 45 }));
      expect(report).toContain('**Percentiles**: P50 = 10 min, P90 = 45 min');
    });

    it('should not show percentiles when p50 is zero', () => {
      const report = generateMarkdownReport(makeMetrics({ mttrP50: 0, mttrP90: 45 }));
      expect(report).not.toContain('P50 = 0 min');
    });

    it('should not show percentiles when p90 is zero', () => {
      const report = generateMarkdownReport(makeMetrics({ mttrP50: 10, mttrP90: 0 }));
      expect(report).not.toContain('P90 = 0 min');
    });
  });

  // --- MTTR Insights ---

  describe('MTTR insights', () => {
    it('should show N/A insights when value is 0', () => {
      const report = generateMarkdownReport(makeMetrics({ mttrValue: 0, mttrTier: 'N/A' }));
      expect(report).toContain('**No Incidents**: No production incidents');
      expect(report).toContain('incident tracking needs improvement');
      expect(report).toContain('label');
    });

    it('should show N/A insights when tier is N/A regardless of value', () => {
      const report = generateMarkdownReport(makeMetrics({ mttrValue: 5, mttrTier: 'N/A' }));
      expect(report).toContain('**No Incidents**');
    });

    it('should show Elite insights', () => {
      const report = generateMarkdownReport(makeMetrics({ mttrValue: 30, mttrTier: 'Elite' }));
      expect(report).toContain('**Elite Performance**: Sub-hour recovery');
      expect(report).toContain('Excellent incident response');
    });

    it('should show High insights with distribution', () => {
      const report = generateMarkdownReport(makeMetrics({ mttrValue: 120, mttrTier: 'High', mttrP50: 60, mttrP90: 180 }));
      expect(report).toContain('**Strong Performance**: Recovery within 24 hours');
      expect(report).toContain('**Distribution**: 50% resolve in 60 min, 90% in 180 min');
      expect(report).toContain('auto-remediation');
    });

    it('should show High insights without distribution when p50 is zero', () => {
      const report = generateMarkdownReport(makeMetrics({
        mttrValue: 120, mttrTier: 'High', mttrP50: 0, mttrP90: 180,
        ltP50: 0, ltP90: 0,
      }));
      expect(report).toContain('**Strong Performance**: Recovery within 24 hours');
      expect(report).not.toContain('**Distribution**');
    });

    it('should show Medium insights', () => {
      const report = generateMarkdownReport(makeMetrics({ mttrValue: 1440, mttrTier: 'Medium' }));
      expect(report).toContain('**Room for Improvement**: Multi-day recovery');
      expect(report).toContain('Create runbooks');
      expect(report).toContain('monitoring and alerting');
    });

    it('should show Low insights', () => {
      const report = generateMarkdownReport(makeMetrics({ mttrValue: 10080, mttrTier: 'Low' }));
      expect(report).toContain('**Critical**: Week-plus recovery');
      expect(report).toContain('on-call rotation');
      expect(report).toContain('disaster recovery plan');
    });
  });

  // --- Tier Emojis ---

  describe('tier emojis', () => {
    it('should use trophy emoji for Elite tier', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Elite' }));
      // The executive summary table uses getTierEmoji
      expect(report).toMatch(/Deployment Frequency.*\u{1F3C6}/u);
    });

    it('should use star emoji for High tier', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'High' }));
      expect(report).toMatch(/Deployment Frequency.*\u{2B50}/u);
    });

    it('should use chart emoji for Medium tier', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Medium' }));
      expect(report).toMatch(/Deployment Frequency.*\u{1F4CA}/u);
    });

    it('should use warning emoji for Low tier', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Low' }));
      expect(report).toMatch(/Deployment Frequency.*\u{26A0}/u);
    });

    it('should use fallback emoji for unknown tier', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Unknown' as any }));
      // Fallback is white circle
      expect(report).toContain('\u26AA');
    });
  });

  // --- Status Emojis ---

  describe('status emojis', () => {
    it('should use checkmark for Elite status', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Elite' }));
      expect(report).toContain('\u2705');
    });

    it('should use checkmark for High status', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'High' }));
      expect(report).toContain('\u2705');
    });

    it('should use warning for Medium status', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Medium' }));
      expect(report).toContain('\u26A0');
    });

    it('should use X for Low status', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Low' }));
      expect(report).toContain('\u274C');
    });
  });

  // --- Recent Activity: Releases ---

  describe('releases section', () => {
    it('should show releases when provided', () => {
      const releases = [
        makeRelease({ tag_name: 'v1.0.0', name: 'First Release', published_at: '2025-01-10T12:00:00Z' }),
      ];
      const report = generateMarkdownReport(makeMetrics(), releases as any);
      expect(report).toContain('Recent Releases (1 in last 30 days)');
      expect(report).toContain('[v1.0.0]');
      expect(report).toContain('_First Release_');
    });

    it('should not show release name when it equals tag_name', () => {
      const releases = [
        makeRelease({ tag_name: 'v2.0.0', name: 'v2.0.0', published_at: '2025-01-10T12:00:00Z' }),
      ];
      const report = generateMarkdownReport(makeMetrics(), releases as any);
      expect(report).toContain('[v2.0.0]');
      expect(report).not.toContain('_v2.0.0_');
    });

    it('should limit to 5 releases and show overflow', () => {
      const releases = Array.from({ length: 8 }, (_, i) =>
        makeRelease({ id: i, tag_name: `v${i}.0.0`, name: `v${i}.0.0`, published_at: '2025-01-10T12:00:00Z' })
      );
      const report = generateMarkdownReport(makeMetrics(), releases as any);
      expect(report).toContain('Recent Releases (8 in last 30 days)');
      expect(report).toContain('...and 3 more releases');
    });

    it('should not show overflow message when exactly 5 releases', () => {
      const releases = Array.from({ length: 5 }, (_, i) =>
        makeRelease({ id: i, tag_name: `v${i}.0.0`, name: `v${i}.0.0`, published_at: '2025-01-10T12:00:00Z' })
      );
      const report = generateMarkdownReport(makeMetrics(), releases as any);
      expect(report).not.toContain('more releases');
    });

    it('should not show releases section when releases array is empty', () => {
      const report = generateMarkdownReport(makeMetrics(), []);
      expect(report).not.toContain('Recent Releases');
    });

    it('should not show releases section when releases is undefined', () => {
      const report = generateMarkdownReport(makeMetrics());
      expect(report).not.toContain('Recent Releases');
    });
  });

  // --- Recent Activity: Issues/Incidents ---

  describe('incidents section', () => {
    it('should show incidents when provided', () => {
      const issues = [
        makeIssue({
          number: 42,
          title: 'Database outage',
          created_at: '2025-01-12T08:00:00Z',
          closed_at: '2025-01-12T09:30:00Z',
          html_url: 'https://github.com/test/repo/issues/42',
        } as any),
      ];
      const report = generateMarkdownReport(makeMetrics(), undefined, issues as any);
      expect(report).toContain('Production Incidents (1 tracked)');
      expect(report).toContain('#42');
      expect(report).toContain('Database outage');
      expect(report).toContain('Resolved in: 90 minutes');
    });

    it('should show ongoing for open issues without closed_at', () => {
      const issues = [
        makeIssue({
          number: 99,
          title: 'Memory leak',
          created_at: '2025-01-14T10:00:00Z',
          closed_at: null,
        } as any),
      ];
      const report = generateMarkdownReport(makeMetrics(), undefined, issues as any);
      expect(report).toContain('Status: ongoing');
    });

    it('should limit to 5 incidents and show overflow', () => {
      const issues = Array.from({ length: 7 }, (_, i) =>
        makeIssue({
          id: i,
          number: i + 1,
          title: `Incident ${i + 1}`,
          created_at: '2025-01-12T08:00:00Z',
          closed_at: '2025-01-12T09:00:00Z',
        } as any)
      );
      const report = generateMarkdownReport(makeMetrics(), undefined, issues as any);
      expect(report).toContain('Production Incidents (7 tracked)');
      expect(report).toContain('...and 2 more incidents');
    });

    it('should not show overflow message when exactly 5 incidents', () => {
      const issues = Array.from({ length: 5 }, (_, i) =>
        makeIssue({
          id: i,
          number: i + 1,
          title: `Incident ${i + 1}`,
          created_at: '2025-01-12T08:00:00Z',
          closed_at: '2025-01-12T09:00:00Z',
        } as any)
      );
      const report = generateMarkdownReport(makeMetrics(), undefined, issues as any);
      expect(report).not.toContain('more incidents');
    });

    it('should show no-incidents message when issues is empty', () => {
      const report = generateMarkdownReport(makeMetrics(), undefined, []);
      expect(report).toContain('No production incidents tracked');
      expect(report).toContain('Label issues with');
    });

    it('should show no-incidents message when issues is undefined', () => {
      const report = generateMarkdownReport(makeMetrics());
      expect(report).toContain('No production incidents tracked');
    });
  });

  // --- Recommended Actions ---

  describe('recommended actions', () => {
    it('should show DF action when tier is Medium', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Medium' }));
      expect(report).toContain('**Increase Deployment Frequency**');
      expect(report).toContain('automated CI/CD pipeline');
      expect(report).toContain('feature flags');
    });

    it('should show DF action when tier is Low', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Low' }));
      expect(report).toContain('**Increase Deployment Frequency**');
    });

    it('should not show DF action when tier is Elite or High', () => {
      const report = generateMarkdownReport(makeMetrics({ dfTier: 'Elite' }));
      expect(report).not.toContain('**Increase Deployment Frequency**');
    });

    it('should show LT action when tier is Medium', () => {
      const report = generateMarkdownReport(makeMetrics({ ltTier: 'Medium' }));
      expect(report).toContain('**Reduce Lead Time**');
      expect(report).toContain('Automate code review');
    });

    it('should show LT action when tier is Low', () => {
      const report = generateMarkdownReport(makeMetrics({ ltTier: 'Low' }));
      expect(report).toContain('**Reduce Lead Time**');
    });

    it('should show CFR action when tier is Medium', () => {
      const report = generateMarkdownReport(makeMetrics({ cfrTier: 'Medium' }));
      expect(report).toContain('**Improve Change Failure Rate**');
      expect(report).toContain('target: 80%+');
    });

    it('should show CFR action when tier is Low', () => {
      const report = generateMarkdownReport(makeMetrics({ cfrTier: 'Low' }));
      expect(report).toContain('**Improve Change Failure Rate**');
    });

    it('should show MTTR action when tier is Medium', () => {
      const report = generateMarkdownReport(makeMetrics({ mttrTier: 'Medium' }));
      expect(report).toContain('**Reduce Mean Time to Recovery**');
      expect(report).toContain('incident runbooks');
    });

    it('should show MTTR action when tier is Low', () => {
      const report = generateMarkdownReport(makeMetrics({ mttrTier: 'Low' }));
      expect(report).toContain('**Reduce Mean Time to Recovery**');
    });

    it('should show all-good message when all tiers are Elite or High', () => {
      const report = generateMarkdownReport(makeMetrics({
        dfTier: 'Elite',
        ltTier: 'Elite',
        cfrTier: 'High',
        mttrTier: 'Elite',
      }));
      expect(report).toContain('**Great work!** All metrics are performing well');
      expect(report).toContain('Monitor metrics regularly');
      expect(report).toContain('Share DORA metrics');
      expect(report).toContain('Celebrate successes');
    });

    it('should show multiple actions when multiple tiers are low/medium', () => {
      const report = generateMarkdownReport(makeMetrics({
        dfTier: 'Low',
        ltTier: 'Low',
        cfrTier: 'Low',
        mttrTier: 'Low',
      }));
      expect(report).toContain('**Increase Deployment Frequency**');
      expect(report).toContain('**Reduce Lead Time**');
      expect(report).toContain('**Improve Change Failure Rate**');
      expect(report).toContain('**Reduce Mean Time to Recovery**');
    });
  });

  // --- Resources and Footer ---

  describe('resources and footer', () => {
    it('should include the resources section with links', () => {
      const report = generateMarkdownReport(makeMetrics());
      expect(report).toContain('Resources');
      expect(report).toContain('State of DevOps Report');
      expect(report).toContain('cloud.google.com/devops');
    });

    it('should include the footer with timestamp', () => {
      const report = generateMarkdownReport(makeMetrics({ timestamp: '2025-03-20T08:00:00Z' }));
      expect(report).toContain('generated automatically by SpecWeave');
      expect(report).toContain('Last updated:');
      expect(report).toContain('Mar');
    });
  });

  // --- Date Formatting ---

  describe('date formatting', () => {
    it('should format ISO string dates correctly', () => {
      const report = generateMarkdownReport(makeMetrics({ timestamp: '2025-12-25T00:00:00Z' }));
      expect(report).toContain('Dec');
      expect(report).toContain('2025');
    });

    it('should handle string dates in releases', () => {
      const releases = [
        makeRelease({ published_at: '2025-07-04T12:00:00Z', tag_name: 'v3.0.0', name: 'v3.0.0' }),
      ];
      const report = generateMarkdownReport(makeMetrics(), releases as any);
      expect(report).toContain('Jul');
    });
  });

  // --- Edge Cases ---

  describe('edge cases', () => {
    it('should handle metrics with all zero values', () => {
      const report = generateMarkdownReport(makeMetrics({
        dfValue: 0,
        ltValue: 0,
        cfrValue: 0,
        cfrFailed: 0,
        cfrTotal: 0,
        mttrValue: 0,
      }));
      expect(report).toContain('DORA Metrics Report');
      expect(report).toContain('0 deploys/week');
      expect(report).toContain('0%');
    });

    it('should handle both releases and issues together', () => {
      const releases = [makeRelease()];
      const issues = [makeIssue()];
      const report = generateMarkdownReport(makeMetrics(), releases as any, issues as any);
      expect(report).toContain('Recent Releases');
      expect(report).toContain('Production Incidents');
    });

    it('should return a string', () => {
      const report = generateMarkdownReport(makeMetrics());
      expect(typeof report).toBe('string');
    });

    it('should produce a non-empty report', () => {
      const report = generateMarkdownReport(makeMetrics());
      expect(report.length).toBeGreaterThan(100);
    });
  });
});

// ============================================================
// writeReport
// ============================================================

describe('writeReport', () => {
  it('should create directory if it does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    const filePath = path.join(os.tmpdir(), 'specweave-test', 'reports', 'dora-report.md');

    writeReport('# Report', filePath);

    expect(mockExistsSync).toHaveBeenCalledWith(path.dirname(filePath));
    expect(mockMkdirSync).toHaveBeenCalledWith(path.dirname(filePath), { recursive: true });
  });

  it('should not create directory if it already exists', () => {
    mockExistsSync.mockReturnValue(true);
    const filePath = path.join(os.tmpdir(), 'specweave-test', 'reports', 'dora-report.md');

    writeReport('# Report', filePath);

    expect(mockExistsSync).toHaveBeenCalledWith(path.dirname(filePath));
    expect(mockMkdirSync).not.toHaveBeenCalled();
  });

  it('should write the report content to file with utf-8 encoding', () => {
    mockExistsSync.mockReturnValue(true);
    const filePath = path.join(os.tmpdir(), 'specweave-test', 'report.md');
    const content = '# DORA Report\nSome content';

    writeReport(content, filePath);

    expect(mockWriteFileSync).toHaveBeenCalledWith(filePath, content, 'utf-8');
  });

  it('should log success message with file path', () => {
    mockExistsSync.mockReturnValue(true);
    const filePath = path.join(os.tmpdir(), 'specweave-test', 'report.md');

    writeReport('# Report', filePath);

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining(filePath));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Report written to'));
  });

  it('should handle empty report content', () => {
    mockExistsSync.mockReturnValue(true);
    const filePath = path.join(os.tmpdir(), 'specweave-test', 'empty-report.md');

    writeReport('', filePath);

    expect(mockWriteFileSync).toHaveBeenCalledWith(filePath, '', 'utf-8');
  });

  it('should handle deeply nested directory paths', () => {
    mockExistsSync.mockReturnValue(false);
    const filePath = path.join(os.tmpdir(), 'a', 'b', 'c', 'd', 'report.md');

    writeReport('# Report', filePath);

    expect(mockMkdirSync).toHaveBeenCalledWith(
      path.join(os.tmpdir(), 'a', 'b', 'c', 'd'),
      { recursive: true }
    );
  });
});
