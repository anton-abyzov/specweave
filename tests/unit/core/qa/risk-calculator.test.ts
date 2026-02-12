/**
 * Tests for core/qa/risk-calculator.ts — Risk scoring with P×I method
 */
import { describe, it, expect } from 'vitest';
import { RiskCalculator } from '../../../../src/core/qa/risk-calculator.js';
import type { Risk, RiskCategory } from '../../../../src/core/qa/types.js';

describe('RiskCalculator', () => {
  describe('calculateRiskScore', () => {
    it('calculates P×I correctly', () => {
      expect(RiskCalculator.calculateRiskScore(0.5, 6)).toBe(3);
    });

    it('returns 0 when probability is 0', () => {
      expect(RiskCalculator.calculateRiskScore(0, 10)).toBe(0);
    });

    it('returns max when both are max', () => {
      expect(RiskCalculator.calculateRiskScore(1.0, 10)).toBe(10);
    });

    it('returns impact when probability is 1', () => {
      expect(RiskCalculator.calculateRiskScore(1.0, 7)).toBe(7);
    });

    it('handles small values', () => {
      expect(RiskCalculator.calculateRiskScore(0.1, 1)).toBeCloseTo(0.1);
    });

    it('throws for negative probability', () => {
      expect(() => RiskCalculator.calculateRiskScore(-0.1, 5)).toThrow();
    });

    it('throws for probability > 1', () => {
      expect(() => RiskCalculator.calculateRiskScore(1.1, 5)).toThrow();
    });

    it('throws for impact < 1', () => {
      expect(() => RiskCalculator.calculateRiskScore(0.5, 0)).toThrow();
    });

    it('throws for impact > 10', () => {
      expect(() => RiskCalculator.calculateRiskScore(0.5, 11)).toThrow();
    });
  });

  describe('determineSeverity', () => {
    it('returns CRITICAL for score >= 9.0', () => {
      expect(RiskCalculator.determineSeverity(9.0)).toBe('CRITICAL');
      expect(RiskCalculator.determineSeverity(10.0)).toBe('CRITICAL');
    });

    it('returns HIGH for score 6.0-8.9', () => {
      expect(RiskCalculator.determineSeverity(6.0)).toBe('HIGH');
      expect(RiskCalculator.determineSeverity(8.9)).toBe('HIGH');
    });

    it('returns MEDIUM for score 3.0-5.9', () => {
      expect(RiskCalculator.determineSeverity(3.0)).toBe('MEDIUM');
      expect(RiskCalculator.determineSeverity(5.9)).toBe('MEDIUM');
    });

    it('returns LOW for score < 3.0', () => {
      expect(RiskCalculator.determineSeverity(2.9)).toBe('LOW');
      expect(RiskCalculator.determineSeverity(0)).toBe('LOW');
    });

    it('boundary: 8.99 is HIGH, 9.0 is CRITICAL', () => {
      expect(RiskCalculator.determineSeverity(8.99)).toBe('HIGH');
      expect(RiskCalculator.determineSeverity(9.0)).toBe('CRITICAL');
    });

    it('boundary: 5.99 is MEDIUM, 6.0 is HIGH', () => {
      expect(RiskCalculator.determineSeverity(5.99)).toBe('MEDIUM');
      expect(RiskCalculator.determineSeverity(6.0)).toBe('HIGH');
    });

    it('boundary: 2.99 is LOW, 3.0 is MEDIUM', () => {
      expect(RiskCalculator.determineSeverity(2.99)).toBe('LOW');
      expect(RiskCalculator.determineSeverity(3.0)).toBe('MEDIUM');
    });
  });

  describe('calculateOverallRisk', () => {
    it('returns 0 for empty array', () => {
      expect(RiskCalculator.calculateOverallRisk([])).toBe(0);
    });

    it('returns weighted average for mixed risks', () => {
      const risks: Risk[] = [
        makeRisk({ score: 9.0, severity: 'CRITICAL' }),
        makeRisk({ score: 2.0, severity: 'LOW' }),
      ];
      const overall = RiskCalculator.calculateOverallRisk(risks);
      // Weights: CRITICAL=1.0, LOW=0.1
      // (9.0*1.0 + 2.0*0.1) / (1.0+0.1) = 9.2/1.1 ≈ 8.36
      expect(overall).toBeCloseTo(8.36, 1);
    });

    it('weights CRITICAL risks highest', () => {
      const risks: Risk[] = [
        makeRisk({ score: 9.5, severity: 'CRITICAL' }),
        makeRisk({ score: 1.0, severity: 'LOW' }),
      ];
      const overall = RiskCalculator.calculateOverallRisk(risks);
      expect(overall).toBeGreaterThan(8);
    });

    it('single risk returns its own score', () => {
      const risks: Risk[] = [makeRisk({ score: 5.0, severity: 'MEDIUM' })];
      const overall = RiskCalculator.calculateOverallRisk(risks);
      expect(overall).toBeCloseTo(5.0);
    });
  });

  describe('groupRisksByCategory', () => {
    it('returns scores for all 4 categories', () => {
      const result = RiskCalculator.groupRisksByCategory([]);
      expect(result).toHaveProperty('security');
      expect(result).toHaveProperty('technical');
      expect(result).toHaveProperty('implementation');
      expect(result).toHaveProperty('operational');
    });

    it('returns 0 for categories with no risks', () => {
      const result = RiskCalculator.groupRisksByCategory([]);
      expect(result.security).toBe(0);
      expect(result.technical).toBe(0);
    });

    it('groups risks by category', () => {
      const risks: Risk[] = [
        makeRisk({ score: 8.0, severity: 'HIGH', category: 'security' }),
        makeRisk({ score: 3.0, severity: 'MEDIUM', category: 'technical' }),
      ];
      const result = RiskCalculator.groupRisksByCategory(risks);
      expect(result.security).toBeGreaterThan(0);
      expect(result.technical).toBeGreaterThan(0);
      expect(result.implementation).toBe(0);
    });
  });

  describe('normalizeProbability', () => {
    it('handles percentage strings', () => {
      expect(RiskCalculator.normalizeProbability('50%')).toBe(0.5);
      expect(RiskCalculator.normalizeProbability('100%')).toBe(1.0);
      expect(RiskCalculator.normalizeProbability('0%')).toBe(0);
    });

    it('handles decimal strings', () => {
      expect(RiskCalculator.normalizeProbability('0.9')).toBe(0.9);
      expect(RiskCalculator.normalizeProbability('0.0')).toBe(0);
    });

    it('handles descriptive text: low', () => {
      expect(RiskCalculator.normalizeProbability('low')).toBe(0.2);
      expect(RiskCalculator.normalizeProbability('unlikely')).toBe(0.2);
    });

    it('handles descriptive text: medium', () => {
      expect(RiskCalculator.normalizeProbability('medium')).toBe(0.5);
      expect(RiskCalculator.normalizeProbability('possible')).toBe(0.5);
      expect(RiskCalculator.normalizeProbability('moderate')).toBe(0.5);
    });

    it('handles descriptive text: high', () => {
      expect(RiskCalculator.normalizeProbability('high')).toBe(0.8);
      expect(RiskCalculator.normalizeProbability('likely')).toBe(0.8);
      expect(RiskCalculator.normalizeProbability('probable')).toBe(0.8);
    });

    it('handles descriptive text: very high', () => {
      expect(RiskCalculator.normalizeProbability('very high')).toBe(0.95);
      expect(RiskCalculator.normalizeProbability('certain')).toBe(0.95);
      expect(RiskCalculator.normalizeProbability('definite')).toBe(0.95);
    });

    it('defaults to 0.5 for unknown text', () => {
      expect(RiskCalculator.normalizeProbability('unknown')).toBe(0.5);
    });

    it('clamps percentage > 100', () => {
      expect(RiskCalculator.normalizeProbability('150%')).toBe(1.0);
    });

    it('clamps negative percentage', () => {
      expect(RiskCalculator.normalizeProbability('-10%')).toBe(0);
    });

    it('is case insensitive', () => {
      expect(RiskCalculator.normalizeProbability('HIGH')).toBe(0.8);
      expect(RiskCalculator.normalizeProbability('Low')).toBe(0.2);
    });
  });

  describe('normalizeImpact', () => {
    it('handles numeric strings', () => {
      expect(RiskCalculator.normalizeImpact('5')).toBe(5);
      expect(RiskCalculator.normalizeImpact('10')).toBe(10);
    });

    it('clamps numeric values to 1-10', () => {
      expect(RiskCalculator.normalizeImpact('0')).toBe(1);
      expect(RiskCalculator.normalizeImpact('15')).toBe(10);
    });

    it('handles minor/trivial/cosmetic → 2', () => {
      expect(RiskCalculator.normalizeImpact('minor')).toBe(2);
      expect(RiskCalculator.normalizeImpact('trivial')).toBe(2);
      expect(RiskCalculator.normalizeImpact('cosmetic')).toBe(2);
    });

    it('handles moderate/medium → 5', () => {
      expect(RiskCalculator.normalizeImpact('moderate')).toBe(5);
      expect(RiskCalculator.normalizeImpact('medium')).toBe(5);
      expect(RiskCalculator.normalizeImpact('some impact')).toBe(5);
    });

    it('handles major/significant/high → 8', () => {
      expect(RiskCalculator.normalizeImpact('major')).toBe(8);
      expect(RiskCalculator.normalizeImpact('significant')).toBe(8);
      expect(RiskCalculator.normalizeImpact('high')).toBe(8);
    });

    it('handles critical/severe/catastrophic → 10', () => {
      expect(RiskCalculator.normalizeImpact('critical')).toBe(10);
      expect(RiskCalculator.normalizeImpact('severe')).toBe(10);
      expect(RiskCalculator.normalizeImpact('catastrophic')).toBe(10);
      expect(RiskCalculator.normalizeImpact('system failure')).toBe(10);
      expect(RiskCalculator.normalizeImpact('data loss')).toBe(10);
      expect(RiskCalculator.normalizeImpact('security breach')).toBe(10);
    });

    it('defaults to 5 for unknown text', () => {
      expect(RiskCalculator.normalizeImpact('unknown')).toBe(5);
    });

    it('is case insensitive', () => {
      expect(RiskCalculator.normalizeImpact('CRITICAL')).toBe(10);
      expect(RiskCalculator.normalizeImpact('Minor')).toBe(2);
    });
  });

  describe('createRisk', () => {
    it('creates risk with numeric probability and impact', () => {
      const risk = RiskCalculator.createRisk({
        id: 'R-1',
        category: 'security',
        title: 'SQL Injection',
        description: 'Possible SQL injection',
        probability: 0.9,
        impact: 10,
        mitigation: 'Use parameterized queries',
        location: 'api/auth.ts',
      });

      expect(risk.id).toBe('R-1');
      expect(risk.probability).toBe(0.9);
      expect(risk.impact).toBe(10);
      expect(risk.score).toBe(9.0);
      expect(risk.severity).toBe('CRITICAL');
    });

    it('creates risk with string probability and impact', () => {
      const risk = RiskCalculator.createRisk({
        id: 'R-2',
        category: 'technical',
        title: 'API Timeout',
        description: 'Possible timeouts',
        probability: 'medium',
        impact: 'moderate',
        mitigation: 'Add retry logic',
        location: 'api/fetch.ts',
      });

      expect(risk.probability).toBe(0.5);
      expect(risk.impact).toBe(5);
      expect(risk.score).toBe(2.5);
      expect(risk.severity).toBe('LOW');
    });

    it('preserves acceptance_criteria', () => {
      const risk = RiskCalculator.createRisk({
        id: 'R-3',
        category: 'operational',
        title: 'Test',
        description: 'Test',
        probability: 0.5,
        impact: 5,
        mitigation: 'Fix',
        location: 'file.ts',
        acceptance_criteria: 'AC-US1-01',
      });
      expect(risk.acceptance_criteria).toBe('AC-US1-01');
    });
  });

  describe('calculateAssessment', () => {
    it('returns complete assessment structure', () => {
      const risks: Risk[] = [
        makeRisk({ score: 7.0, severity: 'HIGH', category: 'security' }),
      ];
      const result = RiskCalculator.calculateAssessment(risks);

      expect(result.risks).toEqual(risks);
      expect(result.overall_risk_score).toBeGreaterThan(0);
      expect(result.risk_by_category).toHaveProperty('security');
      expect(result.risk_by_category).toHaveProperty('technical');
    });

    it('handles empty risks', () => {
      const result = RiskCalculator.calculateAssessment([]);
      expect(result.risks).toEqual([]);
      expect(result.overall_risk_score).toBe(0);
    });
  });
});

// Helper to create a minimal Risk object for testing
function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: 'TEST-001',
    category: 'technical' as RiskCategory,
    title: 'Test Risk',
    description: 'Test risk description',
    probability: 0.5,
    impact: 5,
    score: 2.5,
    severity: 'LOW',
    mitigation: 'Fix it',
    location: 'test.ts',
    ...overrides,
  };
}
