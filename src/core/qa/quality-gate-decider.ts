/**
 * Quality Gate Decider - PASS/CONCERNS/FAIL decision logic
 *
 * @module qa/quality-gate-decider
 * @since v0.8.0
 */

import {
  QualityAssessment,
  QualityGateResult,
  QualityGateDecision,
  QualityGateIssue,
  QualityGateThresholds,
  TestCoverageResult,
  SecurityAuditResult,
} from './types.js';

/**
 * Default quality gate thresholds (BMAD pattern)
 */
export const DEFAULT_THRESHOLDS: QualityGateThresholds = {
  fail: {
    riskScore: 9.0,               // Risk >= 9.0 → FAIL
    testCoverage: 60,             // Coverage < 60% → FAIL
    specQuality: 50,              // Spec score < 50 → FAIL
    criticalVulnerabilities: 1,   // Critical vulns >= 1 → FAIL
  },
  concerns: {
    riskScore: 6.0,               // Risk >= 6.0 → CONCERNS
    testCoverage: 80,             // Coverage < 80% → CONCERNS
    specQuality: 70,              // Spec score < 70 → CONCERNS
    highVulnerabilities: 1,       // High vulns >= 1 → CONCERNS
  },
};

export class QualityGateDecider {
  private thresholds: QualityGateThresholds;

  constructor(thresholds: QualityGateThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  /**
   * Main decision logic - determine PASS/CONCERNS/FAIL
   *
   * @param assessment - Quality assessment result from AI judge
   * @param testCoverage - Optional test coverage result
   * @param securityAudit - Optional security audit result
   * @returns Quality gate result with decision and issues
   */
  decide(
    assessment: QualityAssessment,
    testCoverage?: TestCoverageResult,
    securityAudit?: SecurityAuditResult
  ): QualityGateResult {
    const blockers: QualityGateIssue[] = [];
    const concerns: QualityGateIssue[] = [];
    const recommendations: QualityGateIssue[] = [];

    // Check 1: Risk Assessment (BMAD pattern)
    if (assessment.risk_assessment) {
      this.assessRisks(assessment.risk_assessment, blockers, concerns);
    }

    // Check 2: Test Coverage
    if (testCoverage) {
      this.assessTestCoverage(testCoverage, blockers, concerns);
    }

    // Check 3: Spec Quality
    this.assessSpecQuality(assessment, blockers, concerns, recommendations);

    // Check 4: Security Vulnerabilities
    if (securityAudit) {
      this.assessSecurity(securityAudit, blockers, concerns);
    }

    // Make final decision
    const { decision, reasoning } = this.makeDecision(blockers, concerns);

    return {
      decision,
      blockers,
      concerns,
      recommendations,
      reasoning,
    };
  }

  /**
   * Assess risks and categorize into blockers/concerns
   */
  private assessRisks(
    riskAssessment: NonNullable<QualityAssessment['risk_assessment']>,
    blockers: QualityGateIssue[],
    concerns: QualityGateIssue[]
  ): void {
    const overallRisk = riskAssessment.overall_risk_score;

    // Check overall risk score first
    if (overallRisk >= this.thresholds.fail.riskScore) {
      // Find all critical risks (score >= 9.0)
      const criticalRisks = riskAssessment.risks.filter(
        (r) => r.score >= this.thresholds.fail.riskScore
      );

      for (const risk of criticalRisks) {
        blockers.push({
          type: 'risk',
          severity: 'critical',
          title: `CRITICAL RISK: ${risk.title}`,
          description: `${risk.description} (Score: ${risk.score.toFixed(1)}/10)`,
          mitigation: risk.mitigation,
          location: risk.location,
        });
      }
    } else if (overallRisk >= this.thresholds.concerns.riskScore) {
      // Find all high risks (score 6.0-8.9)
      const highRisks = riskAssessment.risks.filter(
        (r) =>
          r.score >= this.thresholds.concerns.riskScore &&
          r.score < this.thresholds.fail.riskScore
      );

      for (const risk of highRisks) {
        concerns.push({
          type: 'risk',
          severity: 'high',
          title: `HIGH RISK: ${risk.title}`,
          description: `${risk.description} (Score: ${risk.score.toFixed(1)}/10)`,
          mitigation: risk.mitigation,
          location: risk.location,
        });
      }
    }
  }

  /**
   * Assess test coverage and identify gaps
   */
  private assessTestCoverage(
    testCoverage: TestCoverageResult,
    blockers: QualityGateIssue[],
    concerns: QualityGateIssue[]
  ): void {
    const coverage = testCoverage.coverage_percentage;

    if (coverage < this.thresholds.fail.testCoverage) {
      blockers.push({
        type: 'test_coverage',
        severity: 'critical',
        title: 'Insufficient test coverage',
        description: `Coverage is ${coverage}% (minimum: ${this.thresholds.fail.testCoverage}%)`,
        mitigation: `Add tests to reach ${this.thresholds.fail.testCoverage}% coverage`,
      });
    } else if (coverage < this.thresholds.concerns.testCoverage) {
      concerns.push({
        type: 'test_coverage',
        severity: 'high',
        title: 'Test coverage below target',
        description: `Coverage is ${coverage}% (target: ${this.thresholds.concerns.testCoverage}%)`,
        mitigation: `Add tests to reach ${this.thresholds.concerns.testCoverage}% coverage`,
      });
    }

    // Check for AC-ID coverage gaps
    for (const gap of testCoverage.gaps) {
      concerns.push({
        type: 'test_gap',
        severity: 'high',
        title: `Missing test: ${gap.acceptance_criteria}`,
        description: gap.description,
        mitigation: gap.recommendation,
      });
    }
  }

  /**
   * Assess specification quality
   */
  private assessSpecQuality(
    assessment: QualityAssessment,
    blockers: QualityGateIssue[],
    concerns: QualityGateIssue[],
    recommendations: QualityGateIssue[]
  ): void {
    const score = assessment.overall_score;

    if (score < this.thresholds.fail.specQuality) {
      blockers.push({
        type: 'spec_quality',
        severity: 'critical',
        title: 'Specification quality unacceptable',
        description: `Score is ${score}/100 (minimum: ${this.thresholds.fail.specQuality})`,
        mitigation: 'Revise spec to address critical issues',
      });
    } else if (score < this.thresholds.concerns.specQuality) {
      concerns.push({
        type: 'spec_quality',
        severity: 'high',
        title: 'Specification quality needs improvement',
        description: `Score is ${score}/100 (target: ${this.thresholds.concerns.specQuality})`,
        mitigation: 'Address HIGH priority suggestions',
      });
    }

    // Add dimension-specific issues
    for (const issue of assessment.issues) {
      const gateIssue: QualityGateIssue = {
        type: `spec_${issue.dimension}`,
        severity: issue.severity === 'critical' ? 'critical' : issue.severity === 'major' ? 'high' : 'medium',
        title: `${issue.dimension.toUpperCase()}: ${issue.description}`,
        description: issue.impact,
        location: issue.location,
      };

      if (issue.severity === 'critical') {
        blockers.push(gateIssue);
      } else if (issue.severity === 'major') {
        concerns.push(gateIssue);
      } else {
        recommendations.push(gateIssue);
      }
    }
  }

  /**
   * Assess security vulnerabilities
   */
  private assessSecurity(
    securityAudit: SecurityAuditResult,
    blockers: QualityGateIssue[],
    concerns: QualityGateIssue[]
  ): void {
    const deps = securityAudit.dependency_vulnerabilities;

    // Check critical vulnerabilities
    if (deps.critical >= this.thresholds.fail.criticalVulnerabilities) {
      const criticalVulns = deps.issues.filter((v) => v.severity === 'critical');

      for (const vuln of criticalVulns) {
        blockers.push({
          type: 'security',
          severity: 'critical',
          title: `Critical vulnerability: ${vuln.vulnerability}`,
          description: `Package: ${vuln.package}@${vuln.version}`,
          mitigation: vuln.fix,
        });
      }
    }

    // Check high vulnerabilities
    if (deps.high >= this.thresholds.concerns.highVulnerabilities) {
      const highVulns = deps.issues.filter((v) => v.severity === 'high');

      for (const vuln of highVulns) {
        concerns.push({
          type: 'security',
          severity: 'high',
          title: `High vulnerability: ${vuln.vulnerability}`,
          description: `Package: ${vuln.package}@${vuln.version}`,
          mitigation: vuln.fix,
        });
      }
    }

    // Check OWASP failures
    const owaspFailures = securityAudit.owasp_checks.filter((c) => c.status === 'FAIL');
    for (const check of owaspFailures) {
      concerns.push({
        type: 'security',
        severity: 'high',
        title: `OWASP ${check.category}`,
        description: check.details,
        mitigation: check.recommendation,
      });
    }
  }

  /**
   * Make final decision based on blockers and concerns
   */
  private makeDecision(
    blockers: QualityGateIssue[],
    concerns: QualityGateIssue[]
  ): { decision: QualityGateDecision; reasoning: string } {
    if (blockers.length > 0) {
      return {
        decision: 'FAIL',
        reasoning: `Found ${blockers.length} blocker(s) that MUST be fixed before proceeding.`,
      };
    }

    if (concerns.length > 0) {
      return {
        decision: 'CONCERNS',
        reasoning: `Found ${concerns.length} concern(s) that SHOULD be addressed before release.`,
      };
    }

    return {
      decision: 'PASS',
      reasoning: 'All quality checks passed. Ready for production.',
    };
  }

  /**
   * Get decision icon/emoji
   */
  static getDecisionIcon(decision: QualityGateDecision): string {
    switch (decision) {
      case 'PASS':
        return '🟢';
      case 'CONCERNS':
        return '🟡';
      case 'FAIL':
        return '🔴';
    }
  }

  /**
   * Get decision color (for terminal output)
   */
  static getDecisionColor(decision: QualityGateDecision): 'green' | 'yellow' | 'red' {
    switch (decision) {
      case 'PASS':
        return 'green';
      case 'CONCERNS':
        return 'yellow';
      case 'FAIL':
        return 'red';
    }
  }
}
