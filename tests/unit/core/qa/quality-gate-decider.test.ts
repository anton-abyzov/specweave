/**
 * Tests for core/qa/quality-gate-decider.ts — PASS/CONCERNS/FAIL decision logic
 */
import { describe, it, expect } from 'vitest';
import {
  QualityGateDecider,
  DEFAULT_THRESHOLDS,
} from '../../../../src/core/qa/quality-gate-decider.js';
import type {
  QualityAssessment,
  TestCoverageResult,
  SecurityAuditResult,
  QualityGateThresholds,
  Issue,
  Risk,
  RiskAssessmentResult,
  OWASPCheck,
  Vulnerability,
  TestGap,
} from '../../../../src/core/qa/types.js';

// ---------------------------------------------------------------------------
// Test fixture helpers
// ---------------------------------------------------------------------------

function makeAssessment(overrides: Partial<QualityAssessment> = {}): QualityAssessment {
  return {
    overall_score: 85,
    dimension_scores: {
      clarity: 0.9,
      testability: 0.85,
      completeness: 0.8,
      feasibility: 0.9,
      maintainability: 0.85,
      edge_cases: 0.75,
      risk: 0.8,
    },
    issues: [],
    suggestions: [],
    confidence: 0.9,
    ...overrides,
  };
}

function makeCoverage(overrides: Partial<TestCoverageResult> = {}): TestCoverageResult {
  return {
    coverage_percentage: 90,
    ac_coverage: {},
    test_types: {
      unit: { count: 20, coverage: 85 },
      integration: { count: 5, coverage: 70 },
      e2e: { count: 2, coverage: 50 },
    },
    gaps: [],
    ...overrides,
  };
}

function makeSecurity(overrides: Partial<SecurityAuditResult> = {}): SecurityAuditResult {
  return {
    owasp_checks: [],
    dependency_vulnerabilities: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      issues: [],
    },
    ...overrides,
  };
}

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: 'R-001',
    category: 'technical',
    title: 'Test risk',
    description: 'A test risk description',
    probability: 0.5,
    impact: 5,
    score: 2.5,
    severity: 'MEDIUM',
    mitigation: 'Mitigate this',
    location: 'src/index.ts',
    ...overrides,
  };
}

function makeRiskAssessment(
  overrides: Partial<RiskAssessmentResult> = {}
): RiskAssessmentResult {
  return {
    risks: [],
    overall_risk_score: 3.0,
    risk_by_category: {
      security: 0,
      technical: 3.0,
      implementation: 0,
      operational: 0,
    },
    ...overrides,
  };
}

function makeVulnerability(overrides: Partial<Vulnerability> = {}): Vulnerability {
  return {
    package: 'lodash',
    version: '4.17.20',
    vulnerability: 'CVE-2021-23337',
    severity: 'high',
    fix: 'Upgrade to 4.17.21',
    ...overrides,
  };
}

function makeOWASPCheck(overrides: Partial<OWASPCheck> = {}): OWASPCheck {
  return {
    category: 'A01:2021-Broken Access Control',
    status: 'PASS',
    details: 'Access control verified',
    ...overrides,
  };
}

function makeGap(overrides: Partial<TestGap> = {}): TestGap {
  return {
    acceptance_criteria: 'AC-US1-01',
    description: 'No test for login flow',
    missing_test_type: 'unit',
    recommendation: 'Add unit test for auth handler',
    ...overrides,
  };
}

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    dimension: 'clarity',
    severity: 'minor',
    description: 'Ambiguous requirement',
    location: 'spec.md:15',
    impact: 'May cause implementation confusion',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QualityGateDecider', () => {
  // =========================================================================
  // DEFAULT_THRESHOLDS
  // =========================================================================
  describe('DEFAULT_THRESHOLDS', () => {
    it('has correct fail thresholds', () => {
      expect(DEFAULT_THRESHOLDS.fail.riskScore).toBe(9.0);
      expect(DEFAULT_THRESHOLDS.fail.testCoverage).toBe(60);
      expect(DEFAULT_THRESHOLDS.fail.specQuality).toBe(50);
      expect(DEFAULT_THRESHOLDS.fail.criticalVulnerabilities).toBe(1);
    });

    it('has correct concerns thresholds', () => {
      expect(DEFAULT_THRESHOLDS.concerns.riskScore).toBe(6.0);
      expect(DEFAULT_THRESHOLDS.concerns.testCoverage).toBe(80);
      expect(DEFAULT_THRESHOLDS.concerns.specQuality).toBe(70);
      expect(DEFAULT_THRESHOLDS.concerns.highVulnerabilities).toBe(1);
    });

    it('fail thresholds are stricter than concerns thresholds for risk', () => {
      expect(DEFAULT_THRESHOLDS.fail.riskScore).toBeGreaterThan(
        DEFAULT_THRESHOLDS.concerns.riskScore
      );
    });

    it('fail thresholds are stricter than concerns thresholds for test coverage', () => {
      expect(DEFAULT_THRESHOLDS.fail.testCoverage).toBeLessThan(
        DEFAULT_THRESHOLDS.concerns.testCoverage
      );
    });

    it('fail thresholds are stricter than concerns thresholds for spec quality', () => {
      expect(DEFAULT_THRESHOLDS.fail.specQuality).toBeLessThan(
        DEFAULT_THRESHOLDS.concerns.specQuality
      );
    });
  });

  // =========================================================================
  // Constructor
  // =========================================================================
  describe('constructor', () => {
    it('uses DEFAULT_THRESHOLDS when no argument provided', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 85 }));
      expect(result.decision).toBe('PASS');
    });

    it('accepts custom thresholds', () => {
      const custom: QualityGateThresholds = {
        fail: {
          riskScore: 5.0,
          testCoverage: 90,
          specQuality: 80,
          criticalVulnerabilities: 1,
        },
        concerns: {
          riskScore: 3.0,
          testCoverage: 95,
          specQuality: 90,
          highVulnerabilities: 1,
        },
      };
      const decider = new QualityGateDecider(custom);
      // Score 75 is below custom fail threshold of 80 -> FAIL
      const result = decider.decide(makeAssessment({ overall_score: 75 }));
      expect(result.decision).toBe('FAIL');
      expect(result.blockers.some((b) => b.type === 'spec_quality')).toBe(true);
    });

    it('custom thresholds make previously passing scores fail', () => {
      const strict: QualityGateThresholds = {
        fail: {
          riskScore: 3.0,
          testCoverage: 95,
          specQuality: 90,
          criticalVulnerabilities: 1,
        },
        concerns: {
          riskScore: 2.0,
          testCoverage: 98,
          specQuality: 95,
          highVulnerabilities: 1,
        },
      };
      const decider = new QualityGateDecider(strict);
      // Score 85 < 90 (custom fail) -> FAIL
      const result = decider.decide(makeAssessment({ overall_score: 85 }));
      expect(result.decision).toBe('FAIL');
    });

    it('custom thresholds make previously failing scores pass', () => {
      const lenient: QualityGateThresholds = {
        fail: {
          riskScore: 9.0,
          testCoverage: 10,
          specQuality: 10,
          criticalVulnerabilities: 10,
        },
        concerns: {
          riskScore: 8.0,
          testCoverage: 20,
          specQuality: 20,
          highVulnerabilities: 10,
        },
      };
      const decider = new QualityGateDecider(lenient);
      // Score 30 would normally fail at 50, but lenient threshold is 10
      const result = decider.decide(makeAssessment({ overall_score: 30 }));
      expect(result.decision).toBe('PASS');
    });
  });

  // =========================================================================
  // decide() — PASS scenarios
  // =========================================================================
  describe('decide() - PASS', () => {
    it('returns PASS for clean assessment with good scores', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment());
      expect(result.decision).toBe('PASS');
      expect(result.blockers).toHaveLength(0);
      expect(result.concerns).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it('returns PASS reasoning', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment());
      expect(result.reasoning).toBe('All quality checks passed. Ready for production.');
    });

    it('returns PASS when all optional params are clean', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({ overall_risk_score: 2.0, risks: [] }),
        }),
        makeCoverage({ coverage_percentage: 95 }),
        makeSecurity()
      );
      expect(result.decision).toBe('PASS');
    });

    it('returns PASS when risk score is just below concerns threshold', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({ overall_risk_score: 5.9 }),
        })
      );
      expect(result.decision).toBe('PASS');
    });

    it('returns PASS when test coverage is exactly at concerns threshold', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 80 })
      );
      expect(result.decision).toBe('PASS');
    });

    it('returns PASS when spec quality is exactly at concerns threshold', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 70 }));
      expect(result.decision).toBe('PASS');
    });
  });

  // =========================================================================
  // decide() — FAIL from risk
  // =========================================================================
  describe('decide() - FAIL from risk', () => {
    it('returns FAIL when overall risk score >= 9.0', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 9.0,
            risks: [
              makeRisk({ score: 9.5, title: 'SQL Injection' }),
            ],
          }),
        })
      );
      expect(result.decision).toBe('FAIL');
      expect(result.blockers.length).toBeGreaterThanOrEqual(1);
    });

    it('creates blocker with CRITICAL RISK prefix', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 9.5,
            risks: [makeRisk({ score: 9.5, title: 'Data Loss' })],
          }),
        })
      );
      const blocker = result.blockers.find((b) => b.type === 'risk');
      expect(blocker).toBeDefined();
      expect(blocker!.title).toBe('CRITICAL RISK: Data Loss');
      expect(blocker!.severity).toBe('critical');
    });

    it('includes risk score in description', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 9.5,
            risks: [
              makeRisk({
                score: 9.5,
                description: 'Complete data loss possible',
              }),
            ],
          }),
        })
      );
      const blocker = result.blockers.find((b) => b.type === 'risk');
      expect(blocker!.description).toContain('9.5');
      expect(blocker!.description).toContain('Complete data loss possible');
    });

    it('includes mitigation and location from risk', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 9.0,
            risks: [
              makeRisk({
                score: 9.0,
                mitigation: 'Add input validation',
                location: 'src/api/handler.ts',
              }),
            ],
          }),
        })
      );
      const blocker = result.blockers.find((b) => b.type === 'risk');
      expect(blocker!.mitigation).toBe('Add input validation');
      expect(blocker!.location).toBe('src/api/handler.ts');
    });

    it('only promotes risks with score >= fail threshold to blockers', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 9.5,
            risks: [
              makeRisk({ score: 9.5, title: 'Critical one' }),
              makeRisk({ score: 7.0, title: 'High one' }),
              makeRisk({ score: 3.0, title: 'Low one' }),
            ],
          }),
        })
      );
      // Only the 9.5 risk should be a blocker (>= 9.0 threshold)
      const riskBlockers = result.blockers.filter((b) => b.type === 'risk');
      expect(riskBlockers).toHaveLength(1);
      expect(riskBlockers[0].title).toContain('Critical one');
    });

    it('creates multiple blockers for multiple critical risks', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 9.5,
            risks: [
              makeRisk({ score: 9.5, title: 'Risk A' }),
              makeRisk({ score: 9.0, title: 'Risk B' }),
            ],
          }),
        })
      );
      const riskBlockers = result.blockers.filter((b) => b.type === 'risk');
      expect(riskBlockers).toHaveLength(2);
    });

    it('returns FAIL at exact threshold of 9.0', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 9.0,
            risks: [makeRisk({ score: 9.0 })],
          }),
        })
      );
      expect(result.decision).toBe('FAIL');
    });
  });

  // =========================================================================
  // decide() — CONCERNS from risk
  // =========================================================================
  describe('decide() - CONCERNS from risk', () => {
    it('returns CONCERNS when overall risk >= 6.0 but < 9.0', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 7.0,
            risks: [makeRisk({ score: 7.0, title: 'Moderate risk' })],
          }),
        })
      );
      expect(result.decision).toBe('CONCERNS');
      expect(result.concerns.some((c) => c.type === 'risk')).toBe(true);
    });

    it('creates concern with HIGH RISK prefix', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 7.0,
            risks: [makeRisk({ score: 7.0, title: 'Memory Leak' })],
          }),
        })
      );
      const concern = result.concerns.find((c) => c.type === 'risk');
      expect(concern!.title).toBe('HIGH RISK: Memory Leak');
      expect(concern!.severity).toBe('high');
    });

    it('only includes risks in the high range (6.0-8.9) as concerns', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 7.5,
            risks: [
              makeRisk({ score: 7.5, title: 'High risk' }),
              makeRisk({ score: 3.0, title: 'Low risk' }),
            ],
          }),
        })
      );
      const riskConcerns = result.concerns.filter((c) => c.type === 'risk');
      expect(riskConcerns).toHaveLength(1);
      expect(riskConcerns[0].title).toContain('High risk');
    });

    it('returns CONCERNS at exact threshold of 6.0', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 6.0,
            risks: [makeRisk({ score: 6.0 })],
          }),
        })
      );
      expect(result.decision).toBe('CONCERNS');
    });

    it('returns CONCERNS at 8.9 (just below FAIL threshold)', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 8.9,
            risks: [makeRisk({ score: 8.9 })],
          }),
        })
      );
      expect(result.decision).toBe('CONCERNS');
    });
  });

  // =========================================================================
  // decide() — FAIL from test coverage
  // =========================================================================
  describe('decide() - FAIL from test coverage', () => {
    it('returns FAIL when coverage < 60%', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 50 })
      );
      expect(result.decision).toBe('FAIL');
    });

    it('creates blocker with correct description', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 45 })
      );
      const blocker = result.blockers.find((b) => b.type === 'test_coverage');
      expect(blocker).toBeDefined();
      expect(blocker!.severity).toBe('critical');
      expect(blocker!.title).toBe('Insufficient test coverage');
      expect(blocker!.description).toContain('45%');
      expect(blocker!.description).toContain('60%');
    });

    it('creates blocker with mitigation suggesting minimum coverage', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 30 })
      );
      const blocker = result.blockers.find((b) => b.type === 'test_coverage');
      expect(blocker!.mitigation).toContain('60%');
    });

    it('returns FAIL at 0% coverage', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 0 })
      );
      expect(result.decision).toBe('FAIL');
    });

    it('returns FAIL at 59% (just below threshold)', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 59 })
      );
      expect(result.decision).toBe('FAIL');
    });
  });

  // =========================================================================
  // decide() — CONCERNS from test coverage
  // =========================================================================
  describe('decide() - CONCERNS from test coverage', () => {
    it('returns CONCERNS when coverage is 60-79%', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 70 })
      );
      expect(result.decision).toBe('CONCERNS');
    });

    it('creates concern with correct description', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 75 })
      );
      const concern = result.concerns.find((c) => c.type === 'test_coverage');
      expect(concern).toBeDefined();
      expect(concern!.severity).toBe('high');
      expect(concern!.title).toBe('Test coverage below target');
      expect(concern!.description).toContain('75%');
      expect(concern!.description).toContain('80%');
    });

    it('creates concern with mitigation suggesting target coverage', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 65 })
      );
      const concern = result.concerns.find((c) => c.type === 'test_coverage');
      expect(concern!.mitigation).toContain('80%');
    });

    it('returns CONCERNS at exactly 60% (boundary)', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 60 })
      );
      expect(result.decision).toBe('CONCERNS');
      const concern = result.concerns.find((c) => c.type === 'test_coverage');
      expect(concern).toBeDefined();
    });

    it('returns CONCERNS at 79%', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 79 })
      );
      expect(result.decision).toBe('CONCERNS');
    });
  });

  // =========================================================================
  // decide() — PASS from test coverage
  // =========================================================================
  describe('decide() - PASS from test coverage', () => {
    it('returns PASS when coverage >= 80%', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 80 })
      );
      expect(result.decision).toBe('PASS');
    });

    it('returns PASS at 100% coverage', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 100 })
      );
      expect(result.decision).toBe('PASS');
    });
  });

  // =========================================================================
  // decide() — test coverage gaps
  // =========================================================================
  describe('decide() - test coverage gaps', () => {
    it('adds gaps as concerns', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({
          coverage_percentage: 90,
          gaps: [makeGap({ acceptance_criteria: 'AC-US1-01' })],
        })
      );
      expect(result.decision).toBe('CONCERNS');
      const gapConcern = result.concerns.find((c) => c.type === 'test_gap');
      expect(gapConcern).toBeDefined();
    });

    it('gap concern includes acceptance criteria in title', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({
          gaps: [makeGap({ acceptance_criteria: 'AC-US2-03' })],
        })
      );
      const gapConcern = result.concerns.find((c) => c.type === 'test_gap');
      expect(gapConcern!.title).toContain('AC-US2-03');
    });

    it('gap concern includes description and recommendation', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({
          gaps: [
            makeGap({
              description: 'No integration test',
              recommendation: 'Add API test',
            }),
          ],
        })
      );
      const gapConcern = result.concerns.find((c) => c.type === 'test_gap');
      expect(gapConcern!.description).toBe('No integration test');
      expect(gapConcern!.mitigation).toBe('Add API test');
    });

    it('creates multiple concerns for multiple gaps', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({
          gaps: [
            makeGap({ acceptance_criteria: 'AC-US1-01' }),
            makeGap({ acceptance_criteria: 'AC-US1-02' }),
            makeGap({ acceptance_criteria: 'AC-US2-01' }),
          ],
        })
      );
      const gapConcerns = result.concerns.filter((c) => c.type === 'test_gap');
      expect(gapConcerns).toHaveLength(3);
    });

    it('gaps are added even with high coverage percentage', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({
          coverage_percentage: 99,
          gaps: [makeGap()],
        })
      );
      expect(result.concerns.some((c) => c.type === 'test_gap')).toBe(true);
    });
  });

  // =========================================================================
  // decide() — FAIL from spec quality
  // =========================================================================
  describe('decide() - FAIL from spec quality', () => {
    it('returns FAIL when overall_score < 50', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 40 }));
      expect(result.decision).toBe('FAIL');
    });

    it('creates blocker with correct description', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 30 }));
      const blocker = result.blockers.find((b) => b.type === 'spec_quality');
      expect(blocker).toBeDefined();
      expect(blocker!.severity).toBe('critical');
      expect(blocker!.title).toBe('Specification quality unacceptable');
      expect(blocker!.description).toContain('30');
      expect(blocker!.description).toContain('50');
    });

    it('creates blocker with mitigation', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 20 }));
      const blocker = result.blockers.find((b) => b.type === 'spec_quality');
      expect(blocker!.mitigation).toBe('Revise spec to address critical issues');
    });

    it('returns FAIL at score 0', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 0 }));
      expect(result.decision).toBe('FAIL');
    });

    it('returns FAIL at score 49 (just below threshold)', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 49 }));
      expect(result.decision).toBe('FAIL');
    });
  });

  // =========================================================================
  // decide() — CONCERNS from spec quality
  // =========================================================================
  describe('decide() - CONCERNS from spec quality', () => {
    it('returns CONCERNS when overall_score is 50-69', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 60 }));
      expect(result.decision).toBe('CONCERNS');
    });

    it('creates concern with correct description', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 55 }));
      const concern = result.concerns.find((c) => c.type === 'spec_quality');
      expect(concern).toBeDefined();
      expect(concern!.severity).toBe('high');
      expect(concern!.title).toBe('Specification quality needs improvement');
      expect(concern!.description).toContain('55');
      expect(concern!.description).toContain('70');
    });

    it('creates concern with mitigation', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 65 }));
      const concern = result.concerns.find((c) => c.type === 'spec_quality');
      expect(concern!.mitigation).toBe('Address HIGH priority suggestions');
    });

    it('returns CONCERNS at exactly 50', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 50 }));
      expect(result.decision).toBe('CONCERNS');
    });

    it('returns CONCERNS at 69', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 69 }));
      expect(result.decision).toBe('CONCERNS');
    });
  });

  // =========================================================================
  // decide() — spec issues routing
  // =========================================================================
  describe('decide() - spec issues', () => {
    it('routes critical issues to blockers', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          issues: [
            makeIssue({ severity: 'critical', dimension: 'completeness', description: 'Missing auth spec' }),
          ],
        })
      );
      expect(result.blockers.some((b) => b.type === 'spec_completeness')).toBe(true);
    });

    it('routes major issues to concerns', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          issues: [
            makeIssue({ severity: 'major', dimension: 'clarity', description: 'Vague requirement' }),
          ],
        })
      );
      expect(result.concerns.some((c) => c.type === 'spec_clarity')).toBe(true);
    });

    it('routes minor issues to recommendations', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          issues: [
            makeIssue({ severity: 'minor', dimension: 'maintainability', description: 'Naming convention' }),
          ],
        })
      );
      expect(result.recommendations.some((r) => r.type === 'spec_maintainability')).toBe(true);
    });

    it('formats issue title as DIMENSION: description', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          issues: [
            makeIssue({ severity: 'minor', dimension: 'testability', description: 'No test criteria' }),
          ],
        })
      );
      const rec = result.recommendations.find((r) => r.type === 'spec_testability');
      expect(rec!.title).toBe('TESTABILITY: No test criteria');
    });

    it('uses issue impact as description', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          issues: [
            makeIssue({
              severity: 'minor',
              dimension: 'clarity',
              impact: 'Developers will misunderstand requirements',
            }),
          ],
        })
      );
      const rec = result.recommendations.find((r) => r.type === 'spec_clarity');
      expect(rec!.description).toBe('Developers will misunderstand requirements');
    });

    it('includes location from issue', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          issues: [
            makeIssue({ severity: 'minor', location: 'spec.md:42' }),
          ],
        })
      );
      expect(result.recommendations[0].location).toBe('spec.md:42');
    });

    it('maps severity correctly: critical -> critical, major -> high, minor -> medium', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          issues: [
            makeIssue({ severity: 'critical', dimension: 'a' }),
            makeIssue({ severity: 'major', dimension: 'b' }),
            makeIssue({ severity: 'minor', dimension: 'c' }),
          ],
        })
      );
      const critIssue = result.blockers.find((b) => b.type === 'spec_a');
      const majorIssue = result.concerns.find((c) => c.type === 'spec_b');
      const minorIssue = result.recommendations.find((r) => r.type === 'spec_c');
      expect(critIssue!.severity).toBe('critical');
      expect(majorIssue!.severity).toBe('high');
      expect(minorIssue!.severity).toBe('medium');
    });

    it('routes multiple issues to correct lists', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          issues: [
            makeIssue({ severity: 'critical', dimension: 'completeness' }),
            makeIssue({ severity: 'critical', dimension: 'feasibility' }),
            makeIssue({ severity: 'major', dimension: 'clarity' }),
            makeIssue({ severity: 'minor', dimension: 'edge_cases' }),
            makeIssue({ severity: 'minor', dimension: 'maintainability' }),
          ],
        })
      );
      expect(result.blockers.filter((b) => b.type.startsWith('spec_'))).toHaveLength(2);
      expect(result.concerns.filter((c) => c.type.startsWith('spec_'))).toHaveLength(1);
      expect(result.recommendations.filter((r) => r.type.startsWith('spec_'))).toHaveLength(2);
    });
  });

  // =========================================================================
  // decide() — FAIL from security
  // =========================================================================
  describe('decide() - FAIL from security', () => {
    it('returns FAIL when critical vulnerabilities >= 1', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          dependency_vulnerabilities: {
            critical: 1,
            high: 0,
            medium: 0,
            low: 0,
            issues: [
              makeVulnerability({ severity: 'critical', vulnerability: 'CVE-2024-0001' }),
            ],
          },
        })
      );
      expect(result.decision).toBe('FAIL');
    });

    it('creates blocker per critical vulnerability issue', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          dependency_vulnerabilities: {
            critical: 2,
            high: 0,
            medium: 0,
            low: 0,
            issues: [
              makeVulnerability({
                severity: 'critical',
                package: 'express',
                version: '4.17.0',
                vulnerability: 'CVE-2024-0001',
              }),
              makeVulnerability({
                severity: 'critical',
                package: 'axios',
                version: '0.21.0',
                vulnerability: 'CVE-2024-0002',
              }),
            ],
          },
        })
      );
      const secBlockers = result.blockers.filter((b) => b.type === 'security');
      expect(secBlockers).toHaveLength(2);
    });

    it('blocker includes package info in description', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          dependency_vulnerabilities: {
            critical: 1,
            high: 0,
            medium: 0,
            low: 0,
            issues: [
              makeVulnerability({
                severity: 'critical',
                package: 'express',
                version: '4.17.0',
                vulnerability: 'CVE-2024-9999',
                fix: 'Upgrade to 4.18.0',
              }),
            ],
          },
        })
      );
      const blocker = result.blockers.find((b) => b.type === 'security');
      expect(blocker!.title).toContain('CVE-2024-9999');
      expect(blocker!.description).toContain('express');
      expect(blocker!.description).toContain('4.17.0');
      expect(blocker!.mitigation).toBe('Upgrade to 4.18.0');
    });

    it('returns FAIL with multiple critical vulnerabilities', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          dependency_vulnerabilities: {
            critical: 3,
            high: 0,
            medium: 0,
            low: 0,
            issues: [
              makeVulnerability({ severity: 'critical' }),
              makeVulnerability({ severity: 'critical' }),
              makeVulnerability({ severity: 'critical' }),
            ],
          },
        })
      );
      expect(result.decision).toBe('FAIL');
      expect(result.blockers.filter((b) => b.type === 'security')).toHaveLength(3);
    });
  });

  // =========================================================================
  // decide() — CONCERNS from security
  // =========================================================================
  describe('decide() - CONCERNS from security', () => {
    it('returns CONCERNS when high vulnerabilities >= 1', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          dependency_vulnerabilities: {
            critical: 0,
            high: 1,
            medium: 0,
            low: 0,
            issues: [makeVulnerability({ severity: 'high' })],
          },
        })
      );
      expect(result.decision).toBe('CONCERNS');
    });

    it('creates concern per high vulnerability issue', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          dependency_vulnerabilities: {
            critical: 0,
            high: 2,
            medium: 0,
            low: 0,
            issues: [
              makeVulnerability({ severity: 'high', vulnerability: 'CVE-A' }),
              makeVulnerability({ severity: 'high', vulnerability: 'CVE-B' }),
            ],
          },
        })
      );
      const secConcerns = result.concerns.filter((c) => c.type === 'security');
      expect(secConcerns).toHaveLength(2);
    });

    it('concern includes package info and fix', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          dependency_vulnerabilities: {
            critical: 0,
            high: 1,
            medium: 0,
            low: 0,
            issues: [
              makeVulnerability({
                severity: 'high',
                package: 'lodash',
                version: '4.17.20',
                vulnerability: 'Prototype Pollution',
                fix: 'Upgrade to 4.17.21',
              }),
            ],
          },
        })
      );
      const concern = result.concerns.find((c) => c.type === 'security');
      expect(concern!.title).toContain('Prototype Pollution');
      expect(concern!.description).toContain('lodash');
      expect(concern!.description).toContain('4.17.20');
      expect(concern!.mitigation).toBe('Upgrade to 4.17.21');
    });

    it('does not create concerns for medium/low vulnerabilities', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          dependency_vulnerabilities: {
            critical: 0,
            high: 0,
            medium: 5,
            low: 10,
            issues: [
              makeVulnerability({ severity: 'medium' }),
              makeVulnerability({ severity: 'low' }),
            ],
          },
        })
      );
      expect(result.decision).toBe('PASS');
      expect(result.concerns.filter((c) => c.type === 'security')).toHaveLength(0);
    });
  });

  // =========================================================================
  // decide() — OWASP failures
  // =========================================================================
  describe('decide() - OWASP failures', () => {
    it('adds OWASP FAIL checks as concerns', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          owasp_checks: [
            makeOWASPCheck({
              status: 'FAIL',
              category: 'A01:2021-Broken Access Control',
              details: 'No RBAC found',
              recommendation: 'Implement role-based access',
            }),
          ],
        })
      );
      expect(result.decision).toBe('CONCERNS');
      const owaspConcern = result.concerns.find(
        (c) => c.title.includes('OWASP')
      );
      expect(owaspConcern).toBeDefined();
    });

    it('OWASP concern includes category, details, and recommendation', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          owasp_checks: [
            makeOWASPCheck({
              status: 'FAIL',
              category: 'A03:2021-Injection',
              details: 'SQL injection possible',
              recommendation: 'Use parameterized queries',
            }),
          ],
        })
      );
      const concern = result.concerns.find((c) => c.title.includes('OWASP'));
      expect(concern!.title).toBe('OWASP A03:2021-Injection');
      expect(concern!.description).toBe('SQL injection possible');
      expect(concern!.mitigation).toBe('Use parameterized queries');
      expect(concern!.severity).toBe('high');
    });

    it('does not add OWASP PASS or WARNING checks', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          owasp_checks: [
            makeOWASPCheck({ status: 'PASS' }),
            makeOWASPCheck({ status: 'WARNING' }),
          ],
        })
      );
      expect(result.decision).toBe('PASS');
      expect(result.concerns.filter((c) => c.title.includes('OWASP'))).toHaveLength(0);
    });

    it('creates multiple concerns for multiple OWASP failures', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          owasp_checks: [
            makeOWASPCheck({ status: 'FAIL', category: 'A01' }),
            makeOWASPCheck({ status: 'FAIL', category: 'A02' }),
            makeOWASPCheck({ status: 'PASS', category: 'A03' }),
            makeOWASPCheck({ status: 'FAIL', category: 'A04' }),
          ],
        })
      );
      const owaspConcerns = result.concerns.filter((c) => c.title.includes('OWASP'));
      expect(owaspConcerns).toHaveLength(3);
    });
  });

  // =========================================================================
  // decide() — combined issues
  // =========================================================================
  describe('decide() - combined issues', () => {
    it('FAIL from multiple sources combines blockers', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          overall_score: 30,
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 9.5,
            risks: [makeRisk({ score: 9.5 })],
          }),
        }),
        makeCoverage({ coverage_percentage: 40 }),
        makeSecurity({
          dependency_vulnerabilities: {
            critical: 1,
            high: 0,
            medium: 0,
            low: 0,
            issues: [makeVulnerability({ severity: 'critical' })],
          },
        })
      );
      expect(result.decision).toBe('FAIL');
      // Blockers from: risk, test_coverage, spec_quality, security
      expect(result.blockers.length).toBeGreaterThanOrEqual(4);
    });

    it('FAIL with concerns collects both', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          overall_score: 30,
          issues: [makeIssue({ severity: 'major', dimension: 'clarity' })],
        }),
        makeCoverage({
          coverage_percentage: 70,
          gaps: [makeGap()],
        })
      );
      expect(result.decision).toBe('FAIL');
      expect(result.blockers.length).toBeGreaterThanOrEqual(1);
      expect(result.concerns.length).toBeGreaterThanOrEqual(1);
    });

    it('CONCERNS from multiple sources combines concerns', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          overall_score: 65,
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 7.0,
            risks: [makeRisk({ score: 7.0 })],
          }),
        }),
        makeCoverage({ coverage_percentage: 70 }),
        makeSecurity({
          dependency_vulnerabilities: {
            critical: 0,
            high: 1,
            medium: 0,
            low: 0,
            issues: [makeVulnerability({ severity: 'high' })],
          },
          owasp_checks: [makeOWASPCheck({ status: 'FAIL', category: 'A07' })],
        })
      );
      expect(result.decision).toBe('CONCERNS');
      // Concerns from: spec_quality, risk, test_coverage, security(high), owasp
      expect(result.concerns.length).toBeGreaterThanOrEqual(5);
    });

    it('recommendations are included alongside blockers and concerns', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          overall_score: 30,
          issues: [
            makeIssue({ severity: 'critical', dimension: 'completeness' }),
            makeIssue({ severity: 'minor', dimension: 'maintainability' }),
          ],
        })
      );
      expect(result.decision).toBe('FAIL');
      expect(result.blockers.length).toBeGreaterThanOrEqual(1);
      expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // decide() — no risk assessment
  // =========================================================================
  describe('decide() - no risk assessment', () => {
    it('skips risk checks when risk_assessment is undefined', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({ risk_assessment: undefined })
      );
      expect(result.decision).toBe('PASS');
      expect(result.blockers.filter((b) => b.type === 'risk')).toHaveLength(0);
      expect(result.concerns.filter((c) => c.type === 'risk')).toHaveLength(0);
    });

    it('still checks other dimensions when risk_assessment is undefined', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({ overall_score: 30, risk_assessment: undefined })
      );
      expect(result.decision).toBe('FAIL');
      expect(result.blockers.some((b) => b.type === 'spec_quality')).toBe(true);
    });
  });

  // =========================================================================
  // decide() — no test coverage
  // =========================================================================
  describe('decide() - no test coverage', () => {
    it('skips test coverage checks when testCoverage is undefined', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment());
      expect(result.blockers.filter((b) => b.type === 'test_coverage')).toHaveLength(0);
      expect(result.concerns.filter((c) => c.type === 'test_coverage')).toHaveLength(0);
      expect(result.concerns.filter((c) => c.type === 'test_gap')).toHaveLength(0);
    });

    it('does not FAIL from coverage when testCoverage is undefined', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment(), undefined);
      expect(result.decision).toBe('PASS');
    });
  });

  // =========================================================================
  // decide() — no security audit
  // =========================================================================
  describe('decide() - no security audit', () => {
    it('skips security checks when securityAudit is undefined', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment(), undefined, undefined);
      expect(result.blockers.filter((b) => b.type === 'security')).toHaveLength(0);
      expect(result.concerns.filter((c) => c.type === 'security')).toHaveLength(0);
    });

    it('does not FAIL from security when securityAudit is undefined', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment());
      expect(result.decision).toBe('PASS');
    });
  });

  // =========================================================================
  // makeDecision logic
  // =========================================================================
  describe('makeDecision logic', () => {
    it('blockers present -> FAIL regardless of concerns or recommendations', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          overall_score: 30,
          issues: [
            makeIssue({ severity: 'major', dimension: 'clarity' }),
            makeIssue({ severity: 'minor', dimension: 'edge_cases' }),
          ],
        })
      );
      expect(result.decision).toBe('FAIL');
    });

    it('only concerns present -> CONCERNS', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          overall_score: 60,
          issues: [],
        })
      );
      expect(result.decision).toBe('CONCERNS');
      expect(result.blockers).toHaveLength(0);
      expect(result.concerns.length).toBeGreaterThan(0);
    });

    it('only recommendations present -> PASS', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          issues: [makeIssue({ severity: 'minor', dimension: 'clarity' })],
        })
      );
      expect(result.decision).toBe('PASS');
      expect(result.blockers).toHaveLength(0);
      expect(result.concerns).toHaveLength(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('empty everything -> PASS', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment());
      expect(result.decision).toBe('PASS');
      expect(result.blockers).toHaveLength(0);
      expect(result.concerns).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });
  });

  // =========================================================================
  // Reasoning strings
  // =========================================================================
  describe('reasoning strings', () => {
    it('FAIL reasoning includes blocker count', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 30 }));
      expect(result.reasoning).toMatch(/Found \d+ blocker\(s\) that MUST be fixed/);
    });

    it('FAIL reasoning with 1 blocker says "1 blocker(s)"', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({ overall_score: 30, issues: [] })
      );
      expect(result.reasoning).toContain('1 blocker(s)');
    });

    it('FAIL reasoning with multiple blockers shows correct count', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          overall_score: 30,
          issues: [
            makeIssue({ severity: 'critical', dimension: 'completeness' }),
          ],
        }),
        makeCoverage({ coverage_percentage: 40 })
      );
      // spec_quality blocker + spec_completeness blocker + test_coverage blocker = 3
      expect(result.reasoning).toContain('3 blocker(s)');
    });

    it('CONCERNS reasoning includes concern count', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 60 }));
      expect(result.reasoning).toMatch(/Found \d+ concern\(s\) that SHOULD be addressed/);
    });

    it('CONCERNS reasoning with 1 concern says "1 concern(s)"', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 60 }));
      expect(result.reasoning).toContain('1 concern(s)');
    });

    it('PASS reasoning is the standard message', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment());
      expect(result.reasoning).toBe('All quality checks passed. Ready for production.');
    });
  });

  // =========================================================================
  // getDecisionIcon
  // =========================================================================
  describe('getDecisionIcon', () => {
    it('returns green circle for PASS', () => {
      expect(QualityGateDecider.getDecisionIcon('PASS')).toBe('\u{1F7E2}');
    });

    it('returns yellow circle for CONCERNS', () => {
      expect(QualityGateDecider.getDecisionIcon('CONCERNS')).toBe('\u{1F7E1}');
    });

    it('returns red circle for FAIL', () => {
      expect(QualityGateDecider.getDecisionIcon('FAIL')).toBe('\u{1F534}');
    });
  });

  // =========================================================================
  // getDecisionColor
  // =========================================================================
  describe('getDecisionColor', () => {
    it('returns green for PASS', () => {
      expect(QualityGateDecider.getDecisionColor('PASS')).toBe('green');
    });

    it('returns yellow for CONCERNS', () => {
      expect(QualityGateDecider.getDecisionColor('CONCERNS')).toBe('yellow');
    });

    it('returns red for FAIL', () => {
      expect(QualityGateDecider.getDecisionColor('FAIL')).toBe('red');
    });
  });

  // =========================================================================
  // Edge cases & boundary conditions
  // =========================================================================
  describe('edge cases', () => {
    it('handles assessment with empty issues and suggestions', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({ issues: [], suggestions: [] })
      );
      expect(result.decision).toBe('PASS');
    });

    it('handles security audit with empty issues array but nonzero count', () => {
      const decider = new QualityGateDecider();
      // critical=1 but issues is empty: the count triggers the check,
      // but filter finds no critical items -> no blockers from individual vulns
      const result = decider.decide(
        makeAssessment(),
        undefined,
        makeSecurity({
          dependency_vulnerabilities: {
            critical: 1,
            high: 0,
            medium: 0,
            low: 0,
            issues: [], // count says 1, but no matching issue objects
          },
        })
      );
      // The count >= threshold triggers the block, but filter on severity finds nothing
      // So no individual blocker is added; decision depends on other factors
      expect(result.blockers.filter((b) => b.type === 'security')).toHaveLength(0);
    });

    it('handles risk assessment with empty risks array', () => {
      const decider = new QualityGateDecider();
      // Overall risk is 9.5 but no individual risks to enumerate
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 9.5,
            risks: [],
          }),
        })
      );
      // overall_risk >= 9.0 triggers FAIL path but no individual risks to push
      expect(result.blockers.filter((b) => b.type === 'risk')).toHaveLength(0);
    });

    it('coverage exactly at fail boundary (60) is CONCERNS not FAIL', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment(),
        makeCoverage({ coverage_percentage: 60 })
      );
      // 60 is NOT < 60, so it should not be a FAIL
      expect(result.blockers.filter((b) => b.type === 'test_coverage')).toHaveLength(0);
      // 60 IS < 80, so it should be CONCERNS
      expect(result.concerns.filter((c) => c.type === 'test_coverage')).toHaveLength(1);
    });

    it('spec quality exactly at fail boundary (50) is CONCERNS not FAIL', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment({ overall_score: 50 }));
      expect(result.blockers.filter((b) => b.type === 'spec_quality')).toHaveLength(0);
      expect(result.concerns.filter((c) => c.type === 'spec_quality')).toHaveLength(1);
    });

    it('risk score exactly at concerns boundary (6.0) is CONCERNS', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 6.0,
            risks: [makeRisk({ score: 6.0 })],
          }),
        })
      );
      expect(result.concerns.filter((c) => c.type === 'risk')).toHaveLength(1);
    });

    it('result object always has all required fields', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(makeAssessment());
      expect(result).toHaveProperty('decision');
      expect(result).toHaveProperty('blockers');
      expect(result).toHaveProperty('concerns');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('reasoning');
      expect(Array.isArray(result.blockers)).toBe(true);
      expect(Array.isArray(result.concerns)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(typeof result.decision).toBe('string');
      expect(typeof result.reasoning).toBe('string');
    });

    it('score description format is "Score: X.X/10"', () => {
      const decider = new QualityGateDecider();
      const result = decider.decide(
        makeAssessment({
          risk_assessment: makeRiskAssessment({
            overall_risk_score: 9.0,
            risks: [makeRisk({ score: 9.0 })],
          }),
        })
      );
      const blocker = result.blockers.find((b) => b.type === 'risk');
      expect(blocker!.description).toMatch(/Score: 9\.0\/10/);
    });
  });
});
