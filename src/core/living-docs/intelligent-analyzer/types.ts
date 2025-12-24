/**
 * Intelligent Analyzer Types
 * 
 * Types for the deep codebase analysis and organization synthesis.
 */

/**
 * Analysis checkpoint for resume support
 */
export interface IntelligentAnalysisCheckpoint {
  phase: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

  // Phase B: Per-repo progress
  reposTotal: number;
  reposCompleted: string[];
  repoInProgress: string | null;

  // Phase completion flags
  discoveryComplete: boolean;
  deepAnalysisComplete: boolean;
  clusteringComplete: boolean;
  architectureComplete: boolean;
  inconsistenciesComplete: boolean;
  strategyComplete: boolean;
  enterpriseComplete: boolean;    // Phase G: Enterprise KB, Delivery, Ops
  diagramsComplete: boolean;      // Phase H: Mermaid diagrams

  // Timestamps
  startedAt: string;
  lastActivityAt: string;
  estimatedCompletion: string | null;
}

/**
 * Deep analysis result for a single repo
 */
export interface RepoAnalysis {
  name: string;
  path: string;

  // LLM-generated understanding
  purpose: string;
  keyConcepts: string[];
  mainApis: ApiSurface[];
  patternsUsed: PatternUsage[];

  // Dependencies
  internalDependencies: string[];
  externalDependencies: string[];

  // Metadata
  filesAnalyzed: number;
  confidence: 'high' | 'medium' | 'low';
  analyzedAt: string;

  // Raw observations for clustering
  observations: string[];

  // Enterprise-level enhancements (v1.0.48)
  /** JSDoc-extracted documentation entries */
  jsdocEntries?: JSDocEntry[];
  /** Code health indicators */
  codeHealth?: CodeHealthIndicators;
  /** Dependency audit results */
  dependencyAudit?: DependencyAuditResult;
}

/**
 * JSDoc/TSDoc extracted documentation entry
 * Provides enterprise-grade API documentation from code comments
 */
export interface JSDocEntry {
  /** Function/class/method name */
  name: string;
  /** Type: function, class, method, interface, type */
  kind: 'function' | 'class' | 'method' | 'interface' | 'type' | 'constant';
  /** Description from JSDoc @description or first line */
  description: string;
  /** Parameters with types and descriptions */
  params?: Array<{ name: string; type: string; description: string; optional?: boolean }>;
  /** Return type and description */
  returns?: { type: string; description: string };
  /** @example code blocks */
  examples?: string[];
  /** @deprecated notice */
  deprecated?: string;
  /** @since version */
  since?: string;
  /** File location */
  location: string;
  /** Export visibility */
  exported: boolean;
}

/**
 * Code health indicators for enterprise documentation
 * Provides at-a-glance quality metrics per module
 */
export interface CodeHealthIndicators {
  /** Test coverage percentage (if available from coverage reports) */
  testCoverage?: number;
  /** Cyclomatic complexity average */
  avgComplexity?: number;
  /** Files with high complexity (>10) count */
  highComplexityFiles?: number;
  /** Lines of code (excluding comments/blanks) */
  linesOfCode?: number;
  /** Last modified date from git */
  lastModified?: string;
  /** Number of contributors from git */
  contributorCount?: number;
  /** Open issues/bugs count (if linked) */
  openIssues?: number;
  /** Technical debt score (0-100, higher = more debt) */
  techDebtScore?: number;
}

/**
 * Dependency audit result for security and compliance
 */
export interface DependencyAuditResult {
  /** Total dependencies count */
  totalDependencies: number;
  /** Direct vs transitive breakdown */
  directDependencies: number;
  /** Security vulnerabilities */
  vulnerabilities: DependencyVulnerability[];
  /** Outdated packages */
  outdatedPackages: OutdatedPackage[];
  /** License compliance issues */
  licenseIssues: LicenseIssue[];
  /** Last audit timestamp */
  auditedAt: string;
}

/**
 * Security vulnerability in a dependency
 */
export interface DependencyVulnerability {
  /** Package name */
  package: string;
  /** Installed version */
  version: string;
  /** Severity: critical, high, medium, low */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** CVE ID if available */
  cveId?: string;
  /** Vulnerability title */
  title: string;
  /** Fix available in version */
  fixedIn?: string;
}

/**
 * Outdated package information
 */
export interface OutdatedPackage {
  /** Package name */
  package: string;
  /** Currently installed version */
  current: string;
  /** Latest available version */
  latest: string;
  /** Semver update type: major, minor, patch */
  updateType: 'major' | 'minor' | 'patch';
}

/**
 * License compliance issue
 */
export interface LicenseIssue {
  /** Package name */
  package: string;
  /** Detected license */
  license: string;
  /** Issue type: unknown, copyleft, restricted */
  issue: 'unknown' | 'copyleft' | 'restricted' | 'deprecated';
  /** Risk level */
  risk: 'high' | 'medium' | 'low';
}

/**
 * API surface detected in a repo
 */
export interface ApiSurface {
  name: string;
  type: 'class' | 'function' | 'interface' | 'endpoint' | 'event';
  description: string;
  location: string;
}

/**
 * Pattern usage detected in code
 */
export interface PatternUsage {
  pattern: string;
  category: 'auth' | 'api' | 'data' | 'messaging' | 'architecture' | 'security' | 'cloud' | 'deployment' | 'frontend' | 'testing' | 'quality' | 'integration' | 'structure' | 'other';
  evidence: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Organization cluster (team, service, or domain)
 */
export interface OrganizationCluster {
  name: string;
  type: 'team' | 'microservice' | 'domain';
  description: string;
  repos: string[];
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

/**
 * Enhanced team structure with responsibilities, expertise, and tech stack
 * Used for rich team documentation generation
 */
export interface EnhancedTeam {
  name: string;
  description: string;
  responsibilities: string[];
  domainExpertise: string[];
  techStack: string[];
  repos: string[];
  reasoning: string;
  integrationBoundaries?: string;

  // Structure level context (for 1-level or 2-level folder organization)
  project?: string;    // Project ID for folder structure (e.g., "my-project")
  board?: string;      // Board/Area path ID for 2-level structure (e.g., "digital-operations")

  // External tool integration
  externalId?: string;         // ID in external tool (ADO team ID, JIRA team ID)
  externalUrl?: string;        // Direct link to team in external tool
  externalProvider?: 'ado' | 'jira' | 'github';  // Source of team data
}

/**
 * LLM response for team clustering with enhanced fields
 */
export interface EnhancedClusteringResponse {
  teams: EnhancedTeam[];
  microservices: Array<{ name: string; description: string; repos: string[]; reasoning: string }>;
  domains: Array<{ name: string; description: string; repos: string[]; reasoning: string }>;
  crossCutting: Array<{ name: string; description: string; repos: string[]; reasoning: string }>;
  hypotheses: string[];
}

/**
 * Detected architectural decision
 */
export interface DetectedADR {
  id: string;
  title: string;
  pattern: string;
  status: 'Detected';
  context: string;
  decision: string;
  consequences: string[];
  evidence: ADREvidence[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Evidence for a detected ADR
 */
export interface ADREvidence {
  repo: string;
  files: string[];
  description: string;
}

/**
 * Inconsistency or question found
 */
export interface DetectedIssue {
  id: string;
  type: 'inconsistency' | 'duplicate' | 'ownership' | 'security' | 'question';
  severity: 'critical' | 'important' | 'minor';
  title: string;
  description: string;
  evidence: IssueEvidence[];
  suggestedAction: string;
  targetAudience: 'cto' | 'po' | 'team' | 'anyone';
}

/**
 * Evidence for a detected issue
 */
export interface IssueEvidence {
  repo: string;
  files: string[];
  details: string;
}

/**
 * Tech debt item
 */
export interface TechDebtItem {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  repos: string[];
  category: 'legacy' | 'duplication' | 'missing-tests' | 'outdated-deps' | 'documentation' | 'other';
}

/**
 * File sample for LLM analysis
 */
export interface FileSample {
  path: string;
  content: string;
  type: 'readme' | 'config' | 'entry' | 'api' | 'model' | 'other';
  truncated: boolean;
}

/**
 * LLM provider interface (simplified)
 */
export interface LLMProvider {
  analyze(prompt: string): Promise<{ content: string }>;
}

/**
 * Progress callback for long-running operations
 */
export type ProgressCallback = (
  phase: string,
  current: number,
  total: number,
  message: string
) => void;
