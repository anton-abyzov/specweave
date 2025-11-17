import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for RiskCalculator
 *
 * Tests BMAD P×I scoring algorithm and risk utilities
 * @module tests/unit/qa/risk-calculator.test
 */

import { describe, it, expect } from 'vitest';
import { RiskCalculator } from '../../../src/core/qa/risk-calculator.js.js';
import { Risk, RiskCategory, RiskSeverity } from '../../../src/core/qa/types.js.js';

describe('RiskCalculator', () => {
  describe('calculateRiskScore', () => {
    it('should calculate correct risk score using P×I formula', () => {
      expect(RiskCalculator.calculateRiskScore(0.9, 10)).toBeCloseTo(9.0, 10);
      expect(RiskCalculator.calculateRiskScore(0.5, 8)).toBeCloseTo(4.0, 10);
      expect(RiskCalculator.calculateRiskScore(0.2, 3)).toBeCloseTo(0.6, 10);
      expect(RiskCalculator.calculateRiskScore(1.0, 10)).toBeCloseTo(10.0, 10);
      expect(RiskCalculator.calculateRiskScore(0.0, 10)).toBeCloseTo(0.0, 10);
    });

    it('should handle edge cases correctly', () => {
      expect(RiskCalculator.calculateRiskScore(0.0, 1)).toBe(0.0);
      expect(RiskCalculator.calculateRiskScore(1.0, 10)).toBe(10.0);
      expect(RiskCalculator.calculateRiskScore(0.5, 5)).toBe(2.5);
    });

    it('should throw error for probability out of range', () => {
      expect(() => RiskCalculator.calculateRiskScore(-0.1, 5)).toThrow(
        'Probability must be 0.0-1.0, got -0.1'
      );
      expect(() => RiskCalculator.calculateRiskScore(1.5, 5)).toThrow(
        'Probability must be 0.0-1.0, got 1.5'
      );
    });

    it('should throw error for impact out of range', () => {
      expect(() => RiskCalculator.calculateRiskScore(0.5, 0)).toThrow(
        'Impact must be 1-10, got 0'
      );
      expect(() => RiskCalculator.calculateRiskScore(0.5, 11)).toThrow(
        'Impact must be 1-10, got 11'
      );
    });
  });

  describe('determineSeverity', () => {
    it('should classify CRITICAL risks correctly (≥9.0)', () => {
      expect(RiskCalculator.determineSeverity(9.0)).toBe('CRITICAL');
      expect(RiskCalculator.determineSeverity(9.5)).toBe('CRITICAL');
      expect(RiskCalculator.determineSeverity(10.0)).toBe('CRITICAL');
    });

    it('should classify HIGH risks correctly (6.0-8.9)', () => {
      expect(RiskCalculator.determineSeverity(6.0)).toBe('HIGH');
      expect(RiskCalculator.determineSeverity(7.5)).toBe('HIGH');
      expect(RiskCalculator.determineSeverity(8.9)).toBe('HIGH');
    });

    it('should classify MEDIUM risks correctly (3.0-5.9)', () => {
      expect(RiskCalculator.determineSeverity(3.0)).toBe('MEDIUM');
      expect(RiskCalculator.determineSeverity(4.5)).toBe('MEDIUM');
      expect(RiskCalculator.determineSeverity(5.9)).toBe('MEDIUM');
    });

    it('should classify LOW risks correctly (<3.0)', () => {
      expect(RiskCalculator.determineSeverity(0.0)).toBe('LOW');
      expect(RiskCalculator.determineSeverity(1.5)).toBe('LOW');
      expect(RiskCalculator.determineSeverity(2.9)).toBe('LOW');
    });

    it('should handle boundary cases correctly', () => {
      expect(RiskCalculator.determineSeverity(8.99)).toBe('HIGH');
      expect(RiskCalculator.determineSeverity(9.0)).toBe('CRITICAL');
      expect(RiskCalculator.determineSeverity(5.99)).toBe('MEDIUM');
      expect(RiskCalculator.determineSeverity(6.0)).toBe('HIGH');
      expect(RiskCalculator.determineSeverity(2.99)).toBe('LOW');
      expect(RiskCalculator.determineSeverity(3.0)).toBe('MEDIUM');
    });
  });

  describe('calculateOverallRisk', () => {
    it('should return 0 for empty risk array', () => {
      expect(RiskCalculator.calculateOverallRisk([])).toBe(0);
    });

    it('should calculate weighted average correctly', () => {
      const risks: Risk[] = [
        createTestRisk(9.0, 'CRITICAL'), // weight: 1.0
        createTestRisk(6.0, 'HIGH'),      // weight: 0.7
        createTestRisk(3.0, 'MEDIUM'),    // weight: 0.4
        createTestRisk(1.0, 'LOW'),       // weight: 0.1
      ];

      // Weighted sum = (9.0*1.0 + 6.0*0.7 + 3.0*0.4 + 1.0*0.1) / (1.0 + 0.7 + 0.4 + 0.1)
      // = (9.0 + 4.2 + 1.2 + 0.1) / 2.2 = 14.5 / 2.2 ≈ 6.59
      const result = RiskCalculator.calculateOverallRisk(risks);
      expect(result).toBeCloseTo(6.59, 2);
    });

    it('should heavily weight CRITICAL risks', () => {
      const risks: Risk[] = [
        createTestRisk(9.0, 'CRITICAL'),
        createTestRisk(1.0, 'LOW'),
        createTestRisk(1.0, 'LOW'),
      ];

      // Should be much closer to 9.0 than 3.67 (simple average)
      const result = RiskCalculator.calculateOverallRisk(risks);
      expect(result).toBeGreaterThan(7.0);
    });

    it('should return exact score for single risk', () => {
      const risks: Risk[] = [createTestRisk(7.5, 'HIGH')];
      expect(RiskCalculator.calculateOverallRisk(risks)).toBeCloseTo(7.5, 10);
    });
  });

  describe('groupRisksByCategory', () => {
    it('should group risks by all 4 categories', () => {
      const risks: Risk[] = [
        createTestRiskByCategory(9.0, 'CRITICAL', 'security'),
        createTestRiskByCategory(6.0, 'HIGH', 'security'),
        createTestRiskByCategory(4.0, 'MEDIUM', 'technical'),
        createTestRiskByCategory(2.0, 'LOW', 'implementation'),
        createTestRiskByCategory(1.0, 'LOW', 'operational'),
      ];

      const grouped = RiskCalculator.groupRisksByCategory(risks);

      expect(grouped).toHaveProperty('security');
      expect(grouped).toHaveProperty('technical');
      expect(grouped).toHaveProperty('implementation');
      expect(grouped).toHaveProperty('operational');
    });

    it('should calculate correct scores per category', () => {
      const risks: Risk[] = [
        createTestRiskByCategory(9.0, 'CRITICAL', 'security'),
        createTestRiskByCategory(8.0, 'HIGH', 'security'),
        createTestRiskByCategory(3.0, 'MEDIUM', 'technical'),
      ];

      const grouped = RiskCalculator.groupRisksByCategory(risks);

      // Security should be weighted average of 9.0 (CRITICAL) and 8.0 (HIGH)
      expect(grouped.security).toBeGreaterThan(8.0);

      // Technical should be 3.0
      expect(grouped.technical).toBeCloseTo(3.0, 10);

      // Others should be 0 (no risks)
      expect(grouped.implementation).toBeCloseTo(0, 10);
      expect(grouped.operational).toBeCloseTo(0, 10);
    });

    it('should return 0 for categories with no risks', () => {
      const risks: Risk[] = [
        createTestRiskByCategory(5.0, 'MEDIUM', 'security'),
      ];

      const grouped = RiskCalculator.groupRisksByCategory(risks);

      expect(grouped.security).toBe(5.0);
      expect(grouped.technical).toBe(0);
      expect(grouped.implementation).toBe(0);
      expect(grouped.operational).toBe(0);
    });
  });

  describe('normalizeProbability', () => {
    it('should normalize percentage strings', () => {
      expect(RiskCalculator.normalizeProbability('50%')).toBe(0.5);
      expect(RiskCalculator.normalizeProbability('90%')).toBe(0.9);
      expect(RiskCalculator.normalizeProbability('10%')).toBe(0.1);
      expect(RiskCalculator.normalizeProbability('100%')).toBe(1.0);
      expect(RiskCalculator.normalizeProbability('0%')).toBe(0.0);
    });

    it('should normalize decimal strings', () => {
      expect(RiskCalculator.normalizeProbability('0.5')).toBe(0.5);
      expect(RiskCalculator.normalizeProbability('0.9')).toBe(0.9);
      expect(RiskCalculator.normalizeProbability('0.1')).toBe(0.1);
      expect(RiskCalculator.normalizeProbability('1.0')).toBe(1.0);
      expect(RiskCalculator.normalizeProbability('0.0')).toBe(0.0);
    });

    it('should normalize descriptive text (low)', () => {
      expect(RiskCalculator.normalizeProbability('low')).toBe(0.2);
      expect(RiskCalculator.normalizeProbability('Low')).toBe(0.2);
      expect(RiskCalculator.normalizeProbability('unlikely')).toBe(0.2);
    });

    it('should normalize descriptive text (medium)', () => {
      expect(RiskCalculator.normalizeProbability('medium')).toBe(0.5);
      expect(RiskCalculator.normalizeProbability('possible')).toBe(0.5);
      expect(RiskCalculator.normalizeProbability('moderate')).toBe(0.5);
    });

    it('should normalize descriptive text (high)', () => {
      expect(RiskCalculator.normalizeProbability('high')).toBe(0.8);
      expect(RiskCalculator.normalizeProbability('likely')).toBe(0.8);
      expect(RiskCalculator.normalizeProbability('probable')).toBe(0.8);
    });

    it('should normalize descriptive text (very high)', () => {
      expect(RiskCalculator.normalizeProbability('very high')).toBe(0.95);
      expect(RiskCalculator.normalizeProbability('certain')).toBe(0.95);
      expect(RiskCalculator.normalizeProbability('definite')).toBe(0.95);
    });

    it('should default to 0.5 for unknown text', () => {
      expect(RiskCalculator.normalizeProbability('unknown')).toBe(0.5);
      expect(RiskCalculator.normalizeProbability('???')).toBe(0.5);
    });

    it('should clamp percentages to 0.0-1.0 range', () => {
      expect(RiskCalculator.normalizeProbability('150%')).toBe(1.0);
      expect(RiskCalculator.normalizeProbability('-10%')).toBe(0.0);
    });
  });

  describe('normalizeImpact', () => {
    it('should normalize numeric strings', () => {
      expect(RiskCalculator.normalizeImpact('1')).toBe(1);
      expect(RiskCalculator.normalizeImpact('5')).toBe(5);
      expect(RiskCalculator.normalizeImpact('10')).toBe(10);
    });

    it('should normalize descriptive text (minor)', () => {
      expect(RiskCalculator.normalizeImpact('minor')).toBe(2);
      expect(RiskCalculator.normalizeImpact('trivial')).toBe(2);
      expect(RiskCalculator.normalizeImpact('cosmetic')).toBe(2);
    });

    it('should normalize descriptive text (moderate)', () => {
      expect(RiskCalculator.normalizeImpact('moderate')).toBe(5);
      expect(RiskCalculator.normalizeImpact('medium')).toBe(5);
      expect(RiskCalculator.normalizeImpact('some impact')).toBe(5);
    });

    it('should normalize descriptive text (major)', () => {
      expect(RiskCalculator.normalizeImpact('major')).toBe(8);
      expect(RiskCalculator.normalizeImpact('significant')).toBe(8);
      expect(RiskCalculator.normalizeImpact('high')).toBe(8);
    });

    it('should normalize descriptive text (critical)', () => {
      expect(RiskCalculator.normalizeImpact('critical')).toBe(10);
      expect(RiskCalculator.normalizeImpact('severe')).toBe(10);
      expect(RiskCalculator.normalizeImpact('catastrophic')).toBe(10);
      expect(RiskCalculator.normalizeImpact('system failure')).toBe(10);
      expect(RiskCalculator.normalizeImpact('data loss')).toBe(10);
      expect(RiskCalculator.normalizeImpact('security breach')).toBe(10);
    });

    it('should default to 5 for unknown text', () => {
      expect(RiskCalculator.normalizeImpact('unknown')).toBe(5);
    });

    it('should clamp numbers to 1-10 range', () => {
      expect(RiskCalculator.normalizeImpact('0')).toBe(1);
      expect(RiskCalculator.normalizeImpact('15')).toBe(10);
    });
  });

  describe('createRisk', () => {
    it('should create risk with numeric probability and impact', () => {
      const risk = RiskCalculator.createRisk({
        id: 'RISK-001',
        category: 'security',
        title: 'Test risk',
        description: 'Test description',
        probability: 0.9,
        impact: 10,
        mitigation: 'Test mitigation',
        location: 'spec.md',
      });

      expect(risk.id).toBe('RISK-001');
      expect(risk.category).toBe('security');
      expect(risk.probability).toBe(0.9);
      expect(risk.impact).toBe(10);
      expect(risk.score).toBe(9.0);
      expect(risk.severity).toBe('CRITICAL');
    });

    it('should create risk with string probability and impact', () => {
      const risk = RiskCalculator.createRisk({
        id: 'RISK-002',
        category: 'technical',
        title: 'Test risk',
        description: 'Test description',
        probability: 'high',
        impact: 'moderate',
        mitigation: 'Test mitigation',
        location: 'plan.md',
      });

      expect(risk.probability).toBe(0.8); // 'high' = 0.8
      expect(risk.impact).toBe(5);         // 'moderate' = 5
      expect(risk.score).toBe(4.0);        // 0.8 * 5 = 4.0
      expect(risk.severity).toBe('MEDIUM');
    });

    it('should include optional acceptance_criteria', () => {
      const risk = RiskCalculator.createRisk({
        id: 'RISK-003',
        category: 'implementation',
        title: 'Test risk',
        description: 'Test description',
        probability: 0.5,
        impact: 6,
        mitigation: 'Test mitigation',
        location: 'tasks.md',
        acceptance_criteria: 'AC-US1-01',
      });

      expect(risk.acceptance_criteria).toBe('AC-US1-01');
    });
  });

  describe('calculateAssessment', () => {
    it('should create complete assessment result', () => {
      const risks: Risk[] = [
        createTestRiskByCategory(9.0, 'CRITICAL', 'security'),
        createTestRiskByCategory(6.0, 'HIGH', 'technical'),
        createTestRiskByCategory(3.0, 'MEDIUM', 'implementation'),
      ];

      const assessment = RiskCalculator.calculateAssessment(risks);

      expect(assessment.risks).toHaveLength(3);
      expect(assessment.risks).toEqual(risks);
      expect(assessment.overall_risk_score).toBeGreaterThan(0);
      expect(assessment.risk_by_category).toHaveProperty('security');
      expect(assessment.risk_by_category).toHaveProperty('technical');
      expect(assessment.risk_by_category).toHaveProperty('implementation');
      expect(assessment.risk_by_category).toHaveProperty('operational');
    });
  });
});

// Helper functions

function createTestRisk(score: number, severity: RiskSeverity): Risk {
  return {
    id: `RISK-${Math.random().toString(36).substring(7)}`,
    category: 'security',
    title: 'Test risk',
    description: 'Test description',
    probability: 0.5,
    impact: 5,
    score,
    severity,
    mitigation: 'Test mitigation',
    location: 'spec.md',
  };
}

function createTestRiskByCategory(
  score: number,
  severity: RiskSeverity,
  category: RiskCategory
): Risk {
  return {
    id: `RISK-${Math.random().toString(36).substring(7)}`,
    category,
    title: 'Test risk',
    description: 'Test description',
    probability: 0.5,
    impact: 5,
    score,
    severity,
    mitigation: 'Test mitigation',
    location: 'spec.md',
  };
}
