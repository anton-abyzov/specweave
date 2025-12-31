/**
 * Background Jobs - Type Definitions
 *
 * Supports long-running operations (repo cloning, issue import)
 * that can run in background while user continues working.
 */

export type JobType = 'clone-repos' | 'import-issues' | 'sync-external' | 'brownfield-analysis' | 'living-docs-builder' | 'codebase-rescan';

export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'completed_with_warnings' | 'failed';

/**
 * Success threshold for batch operations (percentage).
 * Jobs with success rate >= this threshold are considered successful,
 * even if some items failed.
 *
 * Example: 95% threshold means 252/253 repos cloned = completed_with_warnings (not failed)
 */
export const JOB_SUCCESS_THRESHOLD = 95;

export interface JobProgress {
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;        // e.g., "sw-meeting-cost-be" or "PROJ-123"
  itemsCompleted: string[];    // List of completed items
  itemsFailed: string[];       // List of failed items
  rate?: number;               // items per second
  eta?: number;                // seconds remaining
}

export interface BackgroundJob {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: JobProgress;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  config: JobConfig;
  /** Job-specific result data (available after completion) */
  result?: Record<string, unknown>;
  /** Job IDs this job depends on (must complete before this job starts) */
  dependsOn?: string[];
  /** Current dependency status */
  dependencyStatus?: 'waiting' | 'ready' | 'partial';
}

export interface CloneJobConfig {
  type: 'clone-repos';
  repositories: Array<{
    owner: string;
    name: string;
    path: string;
  }>;
  projectPath: string;
}

export interface ImportJobConfig {
  type: 'import-issues';
  provider: 'github' | 'jira' | 'ado';
  repositories?: string[];     // For GitHub multi-repo
  projectKey?: string;         // For JIRA
  timeRangeMonths: number;
  projectPath: string;
}

export interface SyncJobConfig {
  type: 'sync-external';
  provider: 'github' | 'jira' | 'ado';
  direction: 'import' | 'export' | 'bidirectional';
  profileId: string;
  projectPath: string;
}

/**
 * Brownfield analysis phases
 */
export type BrownfieldPhase =
  | 'discovery'           // Find all code/doc files
  | 'code-analysis'       // Extract signatures, APIs
  | 'doc-matching'        // Match code to docs
  | 'discrepancy-detect'  // Find gaps
  | 'reporting';          // Generate summary

/**
 * Brownfield analysis job configuration
 */
/**
 * Analysis depth options
 * - quick/standard: Basic Node.js file scanning (no AI)
 * - deep-native: Uses Claude Code CLI with MAX subscription (FREE!)
 *
 * NOTE: Duration varies by project size. For enterprise projects (50+ repos),
 * deep mode may run across multiple sessions spanning days or weeks.
 */
export type AnalysisDepth =
  | 'quick'           // Core analysis: structure + imports + inconsistencies + basic diagrams
  | 'standard'        // Full module analysis + dependencies + team detection + relationships + diagrams
  | 'deep-native';    // Claude Code CLI (MAX subscription) - AI-powered org synthesis, enterprise KB

export interface BrownfieldJobConfig {
  type: 'brownfield-analysis';
  projectPath: string;
  sourceDocsPath?: string;
  analysisDepth: AnalysisDepth;

  /** Checkpoint for pause/resume */
  checkpoint?: {
    phase: BrownfieldPhase;
    lastProcessedPath: string;
    processedCount: number;
  };
}

/**
 * Living docs builder phases
 */
export type LivingDocsPhase =
  | 'waiting'           // Waiting for dependencies
  | 'discovery'         // File tree scan (no LLM)
  | 'foundation'        // Generate overview docs
  | 'integration'       // Match work items to modules
  | 'deep-dive'         // Per-module analysis
  | 'suggestions';      // Gap analysis and reporting

/**
 * User inputs collected before job launch
 */
export interface LivingDocsUserInputs {
  /** Paths to additional doc sources (Notion export, Confluence, MD folders) */
  additionalSources: string[];
  /** Priority areas to focus on (e.g., "auth", "payments", "api") */
  priorityAreas: string[];
  /** Known documentation pain points */
  knownPainPoints: string[];
  /** Analysis depth affects time and thoroughness */
  analysisDepth: AnalysisDepth;
}

/**
 * Checkpoint for pause/resume support in living docs builder
 */
export interface LivingDocsCheckpoint {
  phase: LivingDocsPhase;
  phaseProgress: {
    discovery?: {
      dirsScanned: number;
      totalDirs: number;
      lastDir: string;
    };
    foundation?: {
      docsGenerated: string[];
      pendingDocs: string[];
    };
    integration?: {
      itemsProcessed: number;
      totalItems: number;
    };
    deepDive?: {
      modulesCompleted: string[];
      currentModule: string;
      modulesRemaining: string[];
      currentModuleProgress?: {
        filesAnalyzed: number;
        totalFiles: number;
      };
    };
  };
  intermediateOutputs: {
    discoveryReport?: string;
    codebaseMap?: string;
    moduleWorkitemMap?: string;
    priorityQueue?: string;
  };
  lastUpdated: string;
}

/**
 * Living docs builder job configuration
 */
export interface LivingDocsJobConfig {
  type: 'living-docs-builder';
  projectPath: string;
  /** Job IDs to wait for before starting */
  dependsOn?: string[];
  /** User inputs collected before job launch */
  userInputs: LivingDocsUserInputs;
  /** Checkpoint for pause/resume */
  checkpoint?: LivingDocsCheckpoint;
}

/**
 * Codebase rescan phases - triggered when increment closes
 * Rescans actual source code to update living docs with implementation reality
 */
export type CodebaseRescanPhase =
  | 'discovery'           // Scan codebase structure
  | 'code-analysis'       // Analyze source files affected by increment
  | 'doc-reconciliation'  // Compare code reality with living docs
  | 'update'              // Update living docs based on actual code
  | 'reporting';          // Generate sync report

/**
 * Codebase rescan job configuration
 *
 * Triggered automatically when an increment closes to ensure living docs
 * reflect the ACTUAL code implementation (code as source of truth).
 */
export interface CodebaseRescanJobConfig {
  type: 'codebase-rescan';
  projectPath: string;
  /** The closed increment that triggered this rescan */
  closedIncrementId: string;
  /** Feature ID associated with the increment */
  featureId?: string;
  /** Specific paths/modules to focus on (derived from increment scope) */
  scopePaths?: string[];
  /** Whether to do deep analysis or quick sync */
  depth: 'quick' | 'full';
  /** Checkpoint for resume support */
  checkpoint?: {
    phase: CodebaseRescanPhase;
    filesProcessed: number;
    totalFiles: number;
    lastProcessedPath: string;
  };
}

export type JobConfig = CloneJobConfig | ImportJobConfig | SyncJobConfig | BrownfieldJobConfig | LivingDocsJobConfig | CodebaseRescanJobConfig;

export interface JobState {
  jobs: BackgroundJob[];
  activeJobId?: string;
}
