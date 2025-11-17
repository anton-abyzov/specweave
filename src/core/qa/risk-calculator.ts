/**
 * Risk Calculator using BMAD pattern (Probability × Impact)
 *
 * @module qa/risk-calculator
 * @since v0.8.0
 */

import { Risk, RiskAssessmentResult, RiskCategory, RiskSeverity } from './types.js';

export class RiskCalculator {
  /**
   * Calculate risk score using BMAD formula: P × I
   *
   * @param probability - Probability of risk occurring (0.0-1.0)
   * @param impact - Impact severity if risk occurs (1-10)
   * @returns Risk score (0.0-10.0)
   * @throws Error if probability or impact out of range
   *
   * @example
   * ```typescript
   * const score = RiskCalculator.calculateRiskScore(0.9, 10);
   * // Returns: 9.0 (CRITICAL)
   * ```
   */
  static calculateRiskScore(probability: number, impact: number): number {
    if (probability < 0 || probability > 1) {
      throw new Error(`Probability must be 0.0-1.0, got ${probability}`);
    }
    if (impact < 1 || impact > 10) {
      throw new Error(`Impact must be 1-10, got ${impact}`);
    }
    return probability * impact;
  }

  /**
   * Determine severity level based on risk score
   *
   * @param score - Risk score (0.0-10.0)
   * @returns Severity level
   *
   * Thresholds:
   * - 9.0-10.0: CRITICAL (must fix immediately)
   * - 6.0-8.9: HIGH (should fix before release)
   * - 3.0-5.9: MEDIUM (monitor, fix if time permits)
   * - 0.0-2.9: LOW (acceptable risk)
   */
  static determineSeverity(score: number): RiskSeverity {
    if (score >= 9.0) return 'CRITICAL';
    if (score >= 6.0) return 'HIGH';
    if (score >= 3.0) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate overall risk score using weighted average
   *
   * Higher severity risks are weighted more heavily:
   * - CRITICAL: 1.0
   * - HIGH: 0.7
   * - MEDIUM: 0.4
   * - LOW: 0.1
   *
   * @param risks - Array of risk objects
   * @returns Overall weighted risk score (0.0-10.0)
   *
   * @example
   * ```typescript
   * const risks = [
   *   { score: 9.0, severity: 'CRITICAL', ... },
   *   { score: 6.0, severity: 'HIGH', ... },
   *   { score: 2.0, severity: 'LOW', ... }
   * ];
   * const overall = RiskCalculator.calculateOverallRisk(risks);
   * // Returns: ~7.5 (weighted towards critical risks)
   * ```
   */
  static calculateOverallRisk(risks: Risk[]): number {
    if (risks.length === 0) return 0;

    const weights: Record<RiskSeverity, number> = {
      CRITICAL: 1.0,
      HIGH: 0.7,
      MEDIUM: 0.4,
      LOW: 0.1,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const risk of risks) {
      const weight = weights[risk.severity];
      weightedSum += risk.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Group risks by category and calculate category scores
   *
   * @param risks - Array of risk objects
   * @returns Object with risk scores per category
   *
   * @example
   * ```typescript
   * const grouped = RiskCalculator.groupRisksByCategory(risks);
   * // Returns: { security: 7.5, technical: 4.2, implementation: 3.0, operational: 2.1 }
   * ```
   */
  static groupRisksByCategory(risks: Risk[]): Record<RiskCategory, number> {
    const categories: RiskCategory[] = ['security', 'technical', 'implementation', 'operational'];
    const result: Record<RiskCategory, number> = {} as Record<RiskCategory, number>;

    for (const category of categories) {
      const categoryRisks = risks.filter((r) => r.category === category);
      result[category] = this.calculateOverallRisk(categoryRisks);
    }

    return result;
  }

  /**
   * Normalize probability from descriptive text to numeric value
   *
   * @param description - Text description (low/medium/high or percentage)
   * @returns Numeric probability (0.0-1.0)
   *
   * @example
   * ```typescript
   * RiskCalculator.normalizeProbability('high'); // 0.8
   * RiskCalculator.normalizeProbability('50%'); // 0.5
   * RiskCalculator.normalizeProbability('0.9'); // 0.9
   * ```
   */
  static normalizeProbability(description: string): number {
    const normalized = description.toLowerCase().trim();

    // Handle percentage
    if (normalized.includes('%')) {
      const percent = parseFloat(normalized.replace('%', ''));
      return Math.min(Math.max(percent / 100, 0), 1);
    }

    // Handle decimal
    if (/^[0-9.]+$/.test(normalized)) {
      const value = parseFloat(normalized);
      return Math.min(Math.max(value, 0), 1);
    }

    // Handle descriptive text
    switch (normalized) {
      case 'low':
      case 'unlikely':
        return 0.2;
      case 'medium':
      case 'possible':
      case 'moderate':
        return 0.5;
      case 'high':
      case 'likely':
      case 'probable':
        return 0.8;
      case 'very high':
      case 'certain':
      case 'definite':
        return 0.95;
      default:
        return 0.5; // Default to medium if unknown
    }
  }

  /**
   * Normalize impact from descriptive text to numeric value
   *
   * @param description - Text description (minor/moderate/major/critical)
   * @returns Numeric impact (1-10)
   *
   * @example
   * ```typescript
   * RiskCalculator.normalizeImpact('critical'); // 10
   * RiskCalculator.normalizeImpact('moderate'); // 5
   * ```
   */
  static normalizeImpact(description: string): number {
    const normalized = description.toLowerCase().trim();

    // Handle numeric
    if (/^[0-9]+$/.test(normalized)) {
      const value = parseInt(normalized, 10);
      return Math.min(Math.max(value, 1), 10);
    }

    // Handle descriptive text
    switch (normalized) {
      case 'minor':
      case 'trivial':
      case 'cosmetic':
        return 2;
      case 'moderate':
      case 'medium':
      case 'some impact':
        return 5;
      case 'major':
      case 'significant':
      case 'high':
        return 8;
      case 'critical':
      case 'severe':
      case 'catastrophic':
      case 'system failure':
      case 'data loss':
      case 'security breach':
        return 10;
      default:
        return 5; // Default to moderate if unknown
    }
  }

  /**
   * Create a risk object from raw data
   *
   * @param data - Partial risk data
   * @returns Complete risk object with calculated fields
   */
  static createRisk(data: {
    id: string;
    category: RiskCategory;
    title: string;
    description: string;
    probability: number | string;
    impact: number | string;
    mitigation: string;
    location: string;
    acceptance_criteria?: string;
  }): Risk {
    // Normalize probability and impact
    const probability =
      typeof data.probability === 'string'
        ? this.normalizeProbability(data.probability)
        : data.probability;
    const impact =
      typeof data.impact === 'string' ? this.normalizeImpact(data.impact) : data.impact;

    // Calculate score and severity
    const score = this.calculateRiskScore(probability, impact);
    const severity = this.determineSeverity(score);

    return {
      id: data.id,
      category: data.category,
      title: data.title,
      description: data.description,
      probability,
      impact,
      score,
      severity,
      mitigation: data.mitigation,
      location: data.location,
      acceptance_criteria: data.acceptance_criteria,
    };
  }

  /**
   * Calculate full risk assessment result
   *
   * @param risks - Array of risk objects
   * @returns Complete risk assessment result
   */
  static calculateAssessment(risks: Risk[]): RiskAssessmentResult {
    return {
      risks,
      overall_risk_score: this.calculateOverallRisk(risks),
      risk_by_category: this.groupRisksByCategory(risks),
    };
  }
}
