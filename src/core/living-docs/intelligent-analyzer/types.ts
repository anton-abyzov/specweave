/**
 * Intelligent Analyzer Types
 * 
 * Types for the deep codebase analysis and organization synthesis.
 */

/**
 * Analysis checkpoint for resume support
 */
export interface IntelligentAnalysisCheckpoint {
  phase: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  
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
  category: 'auth' | 'api' | 'data' | 'messaging' | 'architecture' | 'other';
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
