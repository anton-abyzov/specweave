import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for QualityGateDecider
 *
 * Tests PASS/CONCERNS/FAIL decision logic and threshold system
 * @module tests/unit/qa/quality-gate-decider.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QualityGateDecider, DEFAULT_THRESHOLDS } from '../../../src/core/qa/quality-gate-decider.js.js';
import {
  QualityAssessment,
  QualityGateDecision,
  TestCoverageResult,
  SecurityAuditResult,
  Risk,
  QualityGateThresholds,
} from '../../../src/core/qa/types.js.js';

describe('QualityGateDecider', () => {
  let decider: QualityGateDecider;

  beforeEach(() => {
    decider = new QualityGateDecider(DEFAULT_THRESHOLDS);
  });

  describe('DEFAULT_THRESHOLDS', () => {
    it('should have correct FAIL thresholds', () => {
      expect(DEFAULT_THRESHOLDS.fail.riskScore).toBe(9.0);
      expect(DEFAULT_THRESHOLDS.fail.testCoverage).toBe(60);
      expect(DEFAULT_THRESHOLDS.fail.specQuality).toBe(50);
      expect(DEFAULT_THRESHOLDS.fail.criticalVulnerabilities).toBe(1);
    });

    it('should have correct CONCERNS thresholds', () => {
      expect(DEFAULT_THRESHOLDS.concerns.riskScore).toBe(6.0);
      expect(DEFAULT_THRESHOLDS.concerns.testCoverage).toBe(80);
      expect(DEFAULT_THRESHOLDS.concerns.specQuality).toBe(70);
      expect(DEFAULT_THRESHOLDS.concerns.highVulnerabilities).toBe(1);
    });
  });

  describe('decide() - Risk Assessment', () => {
    it('should FAIL when overall risk score ≥ 9.0 (CRITICAL)', () => {
      const assessment = createMockAssessment({
        overall_score: 80,
        risk_assessment: {
          overall_risk_score: 9.5,
          risks: [createMockRisk({ score: 9.5, severity: 'CRITICAL' })],
          risk_by_category: { security: 9.5, technical: 0, implementation: 0, operational: 0 },
        },
      });

      const result = decider.decide(assessment);

      expect(result.decision).toBe('FAIL');
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.blockers[0].type).toBe('risk');
      expect(result.blockers[0].severity).toBe('critical');
    });

    it('should have CONCERNS when risk score 6.0-8.9 (HIGH)', () => {
      const assessment = createMockAssessment({
        overall_score: 80,
        risk_assessment: {
          overall_risk_score: 7.0,
          risks: [createMockRisk({ score: 7.0, severity: 'HIGH' })],
          risk_by_category: { security: 7.0, technical: 0, implementation: 0, operational: 0 },
        },
      });

      const result = decider.decide(assessment);

      expect(result.decision).toBe('CONCERNS');
      expect(result.concerns.length).toBeGreaterThan(0);
      expect(result.concerns[0].type).toBe('risk');
      expect(result.concerns[0].severity).toBe('high');
    });

    it('should PASS when risk score < 6.0', () => {
      const assessment = createMockAssessment({
        overall_score: 80,
        risk_assessment: {
          overall_risk_score: 4.0,
          risks: [createMockRisk({ score: 4.0, severity: 'MEDIUM' })],
          risk_by_category: { security: 4.0, technical: 0, implementation: 0, operational: 0 },
        },
      });

      const result = decider.decide(assessment);

      expect(result.decision).toBe('PASS');
      expect(result.blockers).toHaveLength(0);
      expect(result.concerns).toHaveLength(0);
    });

    it('should identify multiple CRITICAL risks', () => {
      const assessment = createMockAssessment({
        overall_score: 80,
        risk_assessment: {
          overall_risk_score: 9.5,
          risks: [
            createMockRisk({ id: 'RISK-001', score: 9.0, severity: 'CRITICAL', title: 'Password storage' }),
            createMockRisk({ id: 'RISK-002', score: 9.5, severity: 'CRITICAL', title: 'SQL injection' }),
          ],
          risk_by_category: { security: 9.25, technical: 0, implementation: 0, operational: 0 },
        },
      });

      const result = decider.decide(assessment);

      expect(result.decision).toBe('FAIL');
      expect(result.blockers.length).toBeGreaterThanOrEqual(2);
      expect(result.blockers.some(b => b.title.includes('Password storage'))).toBe(true);
      expect(result.blockers.some(b => b.title.includes('SQL injection'))).toBe(true);
    });
  });

  describe('decide() - Test Coverage', () => {
    it('should FAIL when coverage < 60%', () => {
      const assessment = createMockAssessment({ overall_score: 80 });
      const testCoverage: TestCoverageResult = {
        coverage_percentage: 50,
        ac_coverage: {},
        test_types: {
          unit: { count: 5, coverage: 50 },
          integration: { count: 2, coverage: 40 },
          e2e: { count: 1, coverage: 30 },
        },
        gaps: [],
      };

      const result = decider.decide(assessment, testCoverage);

      expect(result.decision).toBe('FAIL');
      expect(result.blockers.some(b => b.type === 'test_coverage')).toBe(true);
      expect(result.blockers.some(b => b.title.includes('Insufficient test coverage'))).toBe(true);
    });

    it('should have CONCERNS when coverage 60-79%', () => {
      const assessment = createMockAssessment({ overall_score: 80 });
      const testCoverage: TestCoverageResult = {
        coverage_percentage: 70,
        ac_coverage: {},
        test_types: {
          unit: { count: 10, coverage: 70 },
          integration: { count: 5, coverage: 65 },
          e2e: { count: 3, coverage: 60 },
        },
        gaps: [],
      };

      const result = decider.decide(assessment, testCoverage);

      expect(result.decision).toBe('CONCERNS');
      expect(result.concerns.some(c => c.type === 'test_coverage')).toBe(true);
      expect(result.concerns.some(c => c.title.includes('below target'))).toBe(true);
    });

    it('should PASS when coverage ≥ 80%', () => {
      const assessment = createMockAssessment({ overall_score: 80 });
      const testCoverage: TestCoverageResult = {
        coverage_percentage: 85,
        ac_coverage: {},
        test_types: {
          unit: { count: 20, coverage: 90 },
          integration: { count: 10, coverage: 80 },
          e2e: { count: 5, coverage: 75 },
        },
        gaps: [],
      };

      const result = decider.decide(assessment, testCoverage);

      expect(result.decision).toBe('PASS');
      expect(result.blockers).toHaveLength(0);
      expect(result.concerns).toHaveLength(0);
    });

    it('should add CONCERNS for test gaps', () => {
      const assessment = createMockAssessment({ overall_score: 80 });
      const testCoverage: TestCoverageResult = {
        coverage_percentage: 85,
        ac_coverage: {},
        test_types: {
          unit: { count: 20, coverage: 85 },
          integration: { count: 10, coverage: 80 },
          e2e: { count: 5, coverage: 75 },
        },
        gaps: [
          {
            acceptance_criteria: 'AC-US1-01',
            description: 'Missing test for login flow',
            missing_test_type: 'e2e',
            recommendation: 'Add E2E test for login flow',
          },
        ],
      };

      const result = decider.decide(assessment, testCoverage);

      expect(result.concerns.some(c => c.type === 'test_gap')).toBe(true);
      expect(result.concerns.some(c => c.title.includes('AC-US1-01'))).toBe(true);
    });
  });

  describe('decide() - Spec Quality', () => {
    it('should FAIL when spec quality < 50', () => {
      const assessment = createMockAssessment({ overall_score: 45 });

      const result = decider.decide(assessment);

      expect(result.decision).toBe('FAIL');
      expect(result.blockers.some(b => b.type === 'spec_quality')).toBe(true);
      expect(result.blockers.some(b => b.title.includes('unacceptable'))).toBe(true);
    });

    it('should have CONCERNS when spec quality 50-69', () => {
      const assessment = createMockAssessment({ overall_score: 60 });

      const result = decider.decide(assessment);

      expect(result.decision).toBe('CONCERNS');
      expect(result.concerns.some(c => c.type === 'spec_quality')).toBe(true);
      expect(result.concerns.some(c => c.title.includes('needs improvement'))).toBe(true);
    });

    it('should PASS when spec quality ≥ 70', () => {
      const assessment = createMockAssessment({ overall_score: 75 });

      const result = decider.decide(assessment);

      expect(result.decision).toBe('PASS');
      expect(result.blockers).toHaveLength(0);
      expect(result.concerns).toHaveLength(0);
    });

    it('should categorize dimension issues correctly', () => {
      const assessment = createMockAssessment({
        overall_score: 75,
        issues: [
          {
            dimension: 'clarity',
            severity: 'critical',
            description: 'Vague requirements',
            location: 'spec.md:10',
            impact: 'Cannot implement feature',
          },
          {
            dimension: 'testability',
            severity: 'major',
            description: 'Acceptance criteria not measurable',
            location: 'spec.md:25',
            impact: 'Cannot verify completion',
          },
          {
            dimension: 'completeness',
            severity: 'minor',
            description: 'Missing error handling section',
            location: 'spec.md:40',
            impact: 'May miss edge cases',
          },
        ],
      });

      const result = decider.decide(assessment);

      expect(result.blockers.some(b => b.type === 'spec_clarity')).toBe(true);
      expect(result.concerns.some(c => c.type === 'spec_testability')).toBe(true);
      expect(result.recommendations.some(r => r.type === 'spec_completeness')).toBe(true);
    });
  });

  describe('decide() - Security Vulnerabilities', () => {
    it('should FAIL when critical vulnerabilities ≥ 1', () => {
      const assessment = createMockAssessment({ overall_score: 80 });
      const securityAudit: SecurityAuditResult = {
        owasp_checks: [],
        dependency_vulnerabilities: {
          critical: 1,
          high: 0,
          medium: 0,
          low: 0,
          issues: [
            {
              package: 'lodash',
              version: '4.17.19',
              vulnerability: 'CVE-2020-8203',
              severity: 'critical',
              fix: 'Update to 4.17.21',
            },
          ],
        },
      };

      const result = decider.decide(assessment, undefined, securityAudit);

      expect(result.decision).toBe('FAIL');
      expect(result.blockers.some(b => b.type === 'security')).toBe(true);
      expect(result.blockers.some(b => b.title.includes('CVE-2020-8203'))).toBe(true);
    });

    it('should have CONCERNS when high vulnerabilities ≥ 1', () => {
      const assessment = createMockAssessment({ overall_score: 80 });
      const securityAudit: SecurityAuditResult = {
        owasp_checks: [],
        dependency_vulnerabilities: {
          critical: 0,
          high: 2,
          medium: 5,
          low: 10,
          issues: [
            {
              package: 'express',
              version: '4.17.0',
              vulnerability: 'CVE-2022-24999',
              severity: 'high',
              fix: 'Update to 4.17.3',
            },
          ],
        },
      };

      const result = decider.decide(assessment, undefined, securityAudit);

      expect(result.decision).toBe('CONCERNS');
      expect(result.concerns.some(c => c.type === 'security')).toBe(true);
      expect(result.concerns.some(c => c.title.includes('CVE-2022-24999'))).toBe(true);
    });

    it('should add CONCERNS for OWASP failures', () => {
      const assessment = createMockAssessment({ overall_score: 80 });
      const securityAudit: SecurityAuditResult = {
        owasp_checks: [
          {
            category: 'A01:2021-Broken Access Control',
            status: 'FAIL',
            details: 'No authorization checks found',
            recommendation: 'Implement role-based access control',
          },
        ],
        dependency_vulnerabilities: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          issues: [],
        },
      };

      const result = decider.decide(assessment, undefined, securityAudit);

      expect(result.concerns.some(c => c.type === 'security')).toBe(true);
      expect(result.concerns.some(c => c.title.includes('A01:2021'))).toBe(true);
    });
  });

  describe('decide() - Combined Scenarios', () => {
    it('should prioritize CRITICAL risk over other CONCERNS', () => {
      const assessment = createMockAssessment({
        overall_score: 65, // Would be CONCERNS alone
        risk_assessment: {
          overall_risk_score: 9.0, // CRITICAL
          risks: [createMockRisk({ score: 9.0, severity: 'CRITICAL' })],
          risk_by_category: { security: 9.0, technical: 0, implementation: 0, operational: 0 },
        },
      });

      const result = decider.decide(assessment);

      expect(result.decision).toBe('FAIL');
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it('should accumulate multiple CONCERNS', () => {
      const assessment = createMockAssessment({
        overall_score: 65, // CONCERNS
        risk_assessment: {
          overall_risk_score: 7.0, // HIGH (CONCERNS)
          risks: [createMockRisk({ score: 7.0, severity: 'HIGH' })],
          risk_by_category: { security: 7.0, technical: 0, implementation: 0, operational: 0 },
        },
      });
      const testCoverage: TestCoverageResult = {
        coverage_percentage: 70, // CONCERNS
        ac_coverage: {},
        test_types: {
          unit: { count: 10, coverage: 70 },
          integration: { count: 5, coverage: 65 },
          e2e: { count: 3, coverage: 60 },
        },
        gaps: [],
      };

      const result = decider.decide(assessment, testCoverage);

      expect(result.decision).toBe('CONCERNS');
      expect(result.concerns.length).toBeGreaterThanOrEqual(2);
      expect(result.concerns.some(c => c.type === 'risk')).toBe(true);
      expect(result.concerns.some(c => c.type === 'test_coverage')).toBe(true);
    });

    it('should PASS when all criteria are met', () => {
      const assessment = createMockAssessment({
        overall_score: 85,
        risk_assessment: {
          overall_risk_score: 3.0,
          risks: [createMockRisk({ score: 3.0, severity: 'MEDIUM' })],
          risk_by_category: { security: 3.0, technical: 0, implementation: 0, operational: 0 },
        },
      });
      const testCoverage: TestCoverageResult = {
        coverage_percentage: 90,
        ac_coverage: {},
        test_types: {
          unit: { count: 20, coverage: 95 },
          integration: { count: 10, coverage: 85 },
          e2e: { count: 5, coverage: 80 },
        },
        gaps: [],
      };
      const securityAudit: SecurityAuditResult = {
        owasp_checks: [
          {
            category: 'A01:2021-Broken Access Control',
            status: 'PASS',
            details: 'Authorization checks implemented',
          },
        ],
        dependency_vulnerabilities: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          issues: [],
        },
      };

      const result = decider.decide(assessment, testCoverage, securityAudit);

      expect(result.decision).toBe('PASS');
      expect(result.blockers).toHaveLength(0);
      expect(result.concerns).toHaveLength(0);
      expect(result.reasoning).toContain('passed');
    });
  });

  describe('decide() - Custom Thresholds', () => {
    it('should use custom thresholds when provided', () => {
      const customThresholds: QualityGateThresholds = {
        fail: {
          riskScore: 8.0, // More strict (was 9.0)
          testCoverage: 70, // More strict (was 60)
          specQuality: 60,  // More strict (was 50)
          criticalVulnerabilities: 1,
        },
        concerns: {
          riskScore: 5.0,  // More strict (was 6.0)
          testCoverage: 90, // More strict (was 80)
          specQuality: 80,  // More strict (was 70)
          highVulnerabilities: 1,
        },
      };

      const customDecider = new QualityGateDecider(customThresholds);
      const assessment = createMockAssessment({
        overall_score: 65,
        risk_assessment: {
          overall_risk_score: 8.0,
          risks: [createMockRisk({ score: 8.0, severity: 'HIGH' })],
          risk_by_category: { security: 8.0, technical: 0, implementation: 0, operational: 0 },
        },
      });

      const result = customDecider.decide(assessment);

      // With default thresholds, 8.0 risk would be CONCERNS
      // With custom thresholds (≥8.0 = FAIL), should be FAIL
      expect(result.decision).toBe('FAIL');
    });
  });

  describe('getDecisionIcon', () => {
    it('should return correct icons', () => {
      expect(QualityGateDecider.getDecisionIcon('PASS')).toBe('🟢');
      expect(QualityGateDecider.getDecisionIcon('CONCERNS')).toBe('🟡');
      expect(QualityGateDecider.getDecisionIcon('FAIL')).toBe('🔴');
    });
  });

  describe('getDecisionColor', () => {
    it('should return correct colors', () => {
      expect(QualityGateDecider.getDecisionColor('PASS')).toBe('green');
      expect(QualityGateDecider.getDecisionColor('CONCERNS')).toBe('yellow');
      expect(QualityGateDecider.getDecisionColor('FAIL')).toBe('red');
    });
  });
});

// Helper functions

function createMockAssessment(
  overrides: Partial<QualityAssessment> = {}
): QualityAssessment {
  return {
    overall_score: 75,
    dimension_scores: {
      clarity: 80,
      testability: 75,
      completeness: 70,
      feasibility: 80,
      maintainability: 75,
      edge_cases: 70,
      risk: 70,
    },
    issues: [],
    suggestions: [],
    confidence: 0.8,
    ...overrides,
  };
}

function createMockRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: 'RISK-001',
    category: 'security',
    title: 'Test risk',
    description: 'Test description',
    probability: 0.9,
    impact: 10,
    score: 9.0,
    severity: 'CRITICAL',
    mitigation: 'Test mitigation',
    location: 'spec.md',
    ...overrides,
  };
}
