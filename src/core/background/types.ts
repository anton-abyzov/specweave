/**
 * Background Jobs - Type Definitions
 *
 * Supports long-running operations (repo cloning, issue import)
 * that can run in background while user continues working.
 */

export type JobType = 'clone-repos' | 'import-issues' | 'sync-external' | 'brownfield-analysis' | 'living-docs-builder';

export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

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
 * - deep-interactive: Uses Claude Code agents in current session
 * - deep-api: Uses configured LLM API (Anthropic, OpenAI, etc.)
 */
export type AnalysisDepth =
  | 'quick'           // ~5-10 min - structure scan only
  | 'standard'        // ~15-30 min - module analysis
  | 'deep-native'     // Claude Code CLI (MAX subscription - FREE!)
  | 'deep-interactive' // In-session Claude Code agents
  | 'deep-api';       // Background with LLM API (costs apply)

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

export type JobConfig = CloneJobConfig | ImportJobConfig | SyncJobConfig | BrownfieldJobConfig | LivingDocsJobConfig;

export interface JobState {
  jobs: BackgroundJob[];
  activeJobId?: string;
}
