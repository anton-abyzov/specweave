/**
 * Workflow Phase Detection Types
 *
 * Types for detecting the current workflow phase and suggesting next actions.
 * Part of increment 0039: Ultra-Smart Next Command (US-001)
 */

/**
 * Workflow phases in the SpecWeave development lifecycle
 */
export enum WorkflowPhase {
  /** Planning phase: Creating/editing spec.md */
  SPEC_WRITING = 'spec-writing',

  /** Architecture phase: Generating/reviewing plan.md */
  PLAN_GENERATION = 'plan-generation',

  /** Task breakdown phase: Creating/editing tasks.md */
  TASK_BREAKDOWN = 'task-breakdown',

  /** Development phase: Implementing features, writing code */
  IMPLEMENTATION = 'implementation',

  /** Testing phase: Writing/running tests */
  TESTING = 'testing',

  /** Documentation phase: Updating living docs */
  DOCUMENTATION = 'documentation',

  /** Review phase: Code review, QA validation */
  REVIEW = 'review',

  /** Completion phase: Closing increment, archiving */
  COMPLETION = 'completion',

  /** Unknown/ambiguous phase */
  UNKNOWN = 'unknown'
}

/**
 * Phase detection result with confidence scoring
 */
export interface PhaseDetectionResult {
  /** Detected workflow phase */
  phase: WorkflowPhase;

  /** Confidence score (0.0 = no confidence, 1.0 = absolute certainty) */
  confidence: number;

  /** Evidence supporting this phase detection */
  evidence: PhaseEvidence[];

  /** Alternative phases considered (sorted by confidence descending) */
  alternatives: AlternativePhase[];

  /** Suggested next command based on detected phase */
  suggestedCommand?: string;

  /** Reason for the suggestion */
  suggestionReason?: string;
}

/**
 * Evidence supporting phase detection
 */
export interface PhaseEvidence {
  /** Type of evidence */
  type: EvidenceType;

  /** Description of the evidence */
  description: string;

  /** Weight of this evidence (0.0-1.0) */
  weight: number;

  /** Source of evidence (e.g., "keyword: implement", "command: /specweave:do") */
  source: string;
}

/**
 * Types of evidence for phase detection
 */
export enum EvidenceType {
  /** Keyword found in user prompt */
  KEYWORD = 'keyword',

  /** Recently executed command */
  COMMAND = 'command',

  /** File state (exists, empty, modified) */
  FILE_STATE = 'file-state',

  /** Increment status */
  INCREMENT_STATUS = 'increment-status',

  /** Explicit user hint */
  USER_HINT = 'user-hint'
}

/**
 * Alternative phase with its confidence score
 */
export interface AlternativePhase {
  /** Alternative workflow phase */
  phase: WorkflowPhase;

  /** Confidence score for this alternative */
  confidence: number;

  /** Why this was considered but not chosen */
  reason: string;
}

/**
 * Configuration for PhaseDetector
 */
export interface PhaseDetectorConfig {
  /** Weight for keyword analysis (0.0-1.0, default: 0.4) */
  keywordWeight?: number;

  /** Weight for command analysis (0.0-1.0, default: 0.3) */
  commandWeight?: number;

  /** Weight for context analysis (0.0-1.0, default: 0.2) */
  contextWeight?: number;

  /** Weight for hint analysis (0.0-1.0, default: 0.1) */
  hintWeight?: number;

  /** Minimum confidence threshold for making suggestions (0.0-1.0, default: 0.6) */
  confidenceThreshold?: number;

  /** Whether to include alternative phases in results (default: true) */
  includeAlternatives?: boolean;
}

/**
 * Context information for phase detection
 */
export interface DetectionContext {
  /** User's prompt/question */
  userPrompt: string;

  /** Current increment ID (if any) */
  incrementId?: string;

  /** Recently executed commands (last 5-10) */
  recentCommands?: string[];

  /** Explicit phase hint from user (e.g., "I'm implementing now") */
  explicitHint?: string;

  /** Current working directory */
  workingDirectory?: string;
}

/**
 * Keyword mapping for phase detection
 */
export interface KeywordMapping {
  /** Workflow phase */
  phase: WorkflowPhase;

  /** Keywords that indicate this phase */
  keywords: string[];

  /** Weight multiplier for these keywords (default: 1.0) */
  weight?: number;
}

/**
 * Command mapping for phase detection
 */
export interface CommandMapping {
  /** Workflow phase */
  phase: WorkflowPhase;

  /** Command pattern (regex or exact match) */
  commandPattern: string;

  /** Weight multiplier for this command (default: 1.0) */
  weight?: number;
}

/**
 * File state for context analysis
 */
export interface FileState {
  /** File path */
  path: string;

  /** Whether file exists */
  exists: boolean;

  /** Whether file is empty (if exists) */
  empty?: boolean;

  /** Last modified timestamp (if exists) */
  lastModified?: Date;
}
