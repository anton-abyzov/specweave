/**
 * TypeScript types and interfaces for SpecWeave QA system
 *
 * @module qa/types
 * @since v0.8.0
 */

// ============================================================================
// Risk Assessment Types (BMAD Pattern)
// ============================================================================

export type RiskCategory = 'security' | 'technical' | 'implementation' | 'operational';
export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Risk {
  id: string;
  category: RiskCategory;
  title: string;
  description: string;
  probability: number; // 0.0-1.0
  impact: number;      // 1-10
  score: number;       // 0.0-10.0 (P × I)
  severity: RiskSeverity;
  mitigation: string;
  location: string;
  acceptance_criteria?: string;
}

export interface RiskAssessmentResult {
  risks: Risk[];
  overall_risk_score: number;
  risk_by_category: Record<RiskCategory, number>;
}

// ============================================================================
// Quality Assessment Types (LLM-as-Judge)
// ============================================================================

export type IssueSeverity = 'critical' | 'major' | 'minor';
export type SuggestionPriority = 'high' | 'medium' | 'low';

export interface Issue {
  dimension: string;
  severity: IssueSeverity;
  description: string;
  location: string;
  impact: string;
}

export interface Suggestion {
  dimension: string;
  priority: SuggestionPriority;
  description: string;
  example: string;
}

export interface DimensionScore {
  score: number; // 0.0-1.0
  issues: Issue[];
  suggestions: Suggestion[];
  confidence: number; // 0.0-1.0
}

export interface QualityAssessment {
  overall_score: number; // 0-100
  dimension_scores: {
    clarity: number;
    testability: number;
    completeness: number;
    feasibility: number;
    maintainability: number;
    edge_cases: number;
    risk: number; // NEW in v0.8.0
  };
  issues: Issue[];
  suggestions: Suggestion[];
  confidence: number;
  risk_assessment?: RiskAssessmentResult; // NEW in v0.8.0
}

// ============================================================================
// Quality Gate Types
// ============================================================================

export type QualityGateDecision = 'PASS' | 'CONCERNS' | 'FAIL';

export interface QualityGateIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  mitigation?: string;
  location?: string;
}

export interface QualityGateResult {
  decision: QualityGateDecision;
  blockers: QualityGateIssue[];       // MUST fix
  concerns: QualityGateIssue[];       // SHOULD fix
  recommendations: QualityGateIssue[]; // NICE to fix
  reasoning: string;
}

export interface QualityGateThresholds {
  fail: {
    riskScore: number;               // >= 9.0 → FAIL
    testCoverage: number;            // < 60% → FAIL
    specQuality: number;             // < 50 → FAIL
    criticalVulnerabilities: number; // >= 1 → FAIL
  };
  concerns: {
    riskScore: number;               // >= 6.0 → CONCERNS
    testCoverage: number;            // < 80% → CONCERNS
    specQuality: number;             // < 70 → CONCERNS
    highVulnerabilities: number;     // >= 1 → CONCERNS
  };
}

// ============================================================================
// Test Coverage Types
// ============================================================================

export interface ACCoverage {
  covered: boolean;
  tests: string[];
  gap?: string;
}

export interface TestCoverageResult {
  coverage_percentage: number;
  ac_coverage: Record<string, ACCoverage>;
  test_types: {
    unit: { count: number; coverage: number };
    integration: { count: number; coverage: number };
    e2e: { count: number; coverage: number };
  };
  gaps: TestGap[];
}

export interface TestGap {
  acceptance_criteria: string;
  description: string;
  missing_test_type: 'unit' | 'integration' | 'e2e';
  recommendation: string;
}

// ============================================================================
// Rule-Based Validation Types
// ============================================================================

export interface RuleError {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  file?: string;
  line?: number;
}

export interface RuleBasedResult {
  passed: boolean;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  errors: RuleError[];
  breakdown: {
    consistency: { passed: number; total: number };
    completeness: { passed: number; total: number };
    quality: { passed: number; total: number };
    traceability: { passed: number; total: number };
  };
}

// ============================================================================
// Security Audit Types
// ============================================================================

export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Vulnerability {
  package: string;
  version: string;
  vulnerability: string;
  severity: VulnerabilitySeverity;
  fix: string;
}

export interface OWASPCheck {
  category: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  recommendation?: string;
}

export interface SecurityAuditResult {
  owasp_checks: OWASPCheck[];
  dependency_vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    issues: Vulnerability[];
  };
}

// ============================================================================
// Performance Review Types
// ============================================================================

export interface PerformanceAssessment {
  target?: string;
  specified: boolean;
  assessment?: string;
  status?: 'PASS' | 'FAIL' | 'WARNING';
  recommendation?: string;
}

export interface PerformanceReviewResult {
  response_time: PerformanceAssessment;
  concurrency: PerformanceAssessment;
  database_queries: {
    n_plus_1_detected: boolean;
    missing_indexes: Array<{
      table: string;
      column: string;
      reason: string;
    }>;
  };
}

// ============================================================================
// Code Review Types
// ============================================================================

export interface CodeReviewResult {
  requirements_coverage: {
    score: number;
    issues: Array<{
      type: string;
      file: string;
      description: string;
    }>;
  };
  test_coverage: {
    score: number;
    issues: Array<{
      type: string;
      file: string;
      description: string;
    }>;
  };
  code_quality: {
    score: number;
    issues: Array<{
      type: string;
      file: string;
      line?: number;
      description: string;
    }>;
  };
  security: {
    score: number;
    issues: Array<{
      type: string;
      severity: VulnerabilitySeverity;
      file: string;
      description: string;
    }>;
  };
}

// ============================================================================
// Full QA Report Types
// ============================================================================

export type QAMode = 'quick' | 'full' | 'pre' | 'gate';

export interface QAReport {
  increment_id: string;
  mode: QAMode;
  timestamp: string;

  // Rule-based (always first)
  rule_based: RuleBasedResult;

  // AI-powered assessments (conditional)
  spec_quality?: QualityAssessment;
  risk_assessment?: RiskAssessmentResult;
  test_coverage?: TestCoverageResult;
  code_review?: CodeReviewResult;
  security_audit?: SecurityAuditResult;
  performance?: PerformanceReviewResult;

  // Final decision
  quality_gate: QualityGateResult;

  // Metadata
  duration_ms?: number;
  token_usage?: number;
  cost_usd?: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface QAConfig {
  enableAutoQAGate: boolean;
  autoQAGateOnDone: boolean;
  autoQACheckOnHook: boolean;
  defaultMode: QAMode;
  qualityGateThresholds: QualityGateThresholds;
  subagents: {
    specQuality: { enabled: boolean; weight: number };
    riskAssessment: { enabled: boolean; weight: number };
    testCoverage: { enabled: boolean; weight: number };
    codeReview: { enabled: boolean; weight: number };
    securityAudit: { enabled: boolean; weight: number };
    performanceReview: { enabled: boolean; weight: number };
  };
  costOptimization: {
    cacheResults: boolean;
    cacheDuration: number;
    skipUnchangedFiles: boolean;
  };
  integrations: {
    cicd: {
      enabled: boolean;
      exitOnFail: boolean;
      jsonOutput: boolean;
    };
    hooks: {
      postTaskCompletion: boolean;
      preDone: boolean;
      postInc: boolean;
    };
  };
}

// ============================================================================
// CLI Options Types
// ============================================================================

export interface QAOptions {
  quick?: boolean;
  full?: boolean;
  pre?: boolean;
  gate?: boolean;
  ci?: boolean;
  noAi?: boolean;
  silent?: boolean;
  export?: boolean;
  skipQa?: boolean;
  force?: boolean;
  verbose?: boolean;
}
