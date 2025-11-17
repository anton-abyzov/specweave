/**
 * Phase Detector - Auto-detect current workflow phase
 *
 * Analyzes user prompts, commands, file states, and context to determine
 * the current phase of the SpecWeave development workflow.
 *
 * Detection Algorithm:
 * - Keyword Analysis (40% weight): Match keywords in user prompt
 * - Command Analysis (30% weight): Analyze recent command history
 * - Context Analysis (20% weight): Check file states and increment status
 * - Hint Analysis (10% weight): Detect explicit user hints
 *
 * Part of increment 0039: Ultra-Smart Next Command (US-001)
 */

import {
  WorkflowPhase,
  PhaseDetectionResult,
  PhaseEvidence,
  EvidenceType,
  AlternativePhase,
  DetectionContext,
  PhaseDetectorConfig,
  KeywordMapping,
  CommandMapping,
  FileState
} from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import { MetadataManager } from '../increment/metadata-manager.js';

/**
 * Default configuration for PhaseDetector
 */
const DEFAULT_CONFIG: Required<PhaseDetectorConfig> = {
  keywordWeight: 0.4,
  commandWeight: 0.3,
  contextWeight: 0.2,
  hintWeight: 0.1,
  confidenceThreshold: 0.6,
  includeAlternatives: true
};

/**
 * Keyword mappings for each workflow phase
 */
const KEYWORD_MAPPINGS: KeywordMapping[] = [
  // SPEC_WRITING phase
  {
    phase: WorkflowPhase.SPEC_WRITING,
    keywords: [
      'spec', 'specification', 'requirements', 'user story', 'user stories',
      'acceptance criteria', 'AC', 'functional requirement', 'non-functional',
      'define', 'document', 'describe', 'outline', 'detail',
      'what should', 'how should', 'requirements gathering', 'product requirements',
      'write spec', 'update spec', 'edit spec', 'create spec'
    ],
    weight: 1.0
  },

  // PLAN_GENERATION phase
  {
    phase: WorkflowPhase.PLAN_GENERATION,
    keywords: [
      'plan', 'architecture', 'design', 'approach', 'strategy',
      'technical design', 'system design', 'component design',
      'how to implement', 'implementation plan', 'technical approach',
      'architect', 'module', 'component', 'service',
      'generate plan', 'create plan', 'plan.md'
    ],
    weight: 1.0
  },

  // TASK_BREAKDOWN phase
  {
    phase: WorkflowPhase.TASK_BREAKDOWN,
    keywords: [
      'task', 'tasks', 'todo', 'checklist', 'breakdown', 'split',
      'divide', 'organize', 'prioritize', 'order',
      'task list', 'work items', 'backlog items',
      'create tasks', 'generate tasks', 'tasks.md', 'task breakdown'
    ],
    weight: 1.0
  },

  // IMPLEMENTATION phase
  {
    phase: WorkflowPhase.IMPLEMENTATION,
    keywords: [
      'implement', 'code', 'develop', 'build', 'create', 'add',
      'write code', 'programming', 'coding', 'development',
      'feature', 'functionality', 'component implementation',
      'let\'s build', 'let\'s implement', 'let\'s code', 'let\'s develop',
      'start working', 'begin implementation', 'write', 'fix bug', 'bug fix'
    ],
    weight: 1.2 // Slightly higher weight as implementation is common
  },

  // TESTING phase
  {
    phase: WorkflowPhase.TESTING,
    keywords: [
      'test', 'testing', 'unit test', 'integration test', 'e2e test',
      'test case', 'test suite', 'coverage', 'tdd', 'test-driven',
      'write tests', 'run tests', 'test coverage', 'jest', 'mocha',
      'assertions', 'expect', 'verify', 'validate tests',
      'test plan', 'test strategy'
    ],
    weight: 1.1
  },

  // DOCUMENTATION phase
  {
    phase: WorkflowPhase.DOCUMENTATION,
    keywords: [
      'document', 'documentation', 'docs', 'readme', 'guide',
      'api documentation', 'user guide', 'developer guide',
      'write docs', 'update docs', 'sync docs', 'living docs',
      'markdown', 'comments', 'jsdoc', 'docstring'
    ],
    weight: 0.9
  },

  // REVIEW phase
  {
    phase: WorkflowPhase.REVIEW,
    keywords: [
      'review', 'code review', 'qa', 'quality', 'validate', 'check',
      'quality assurance', 'quality check', 'peer review',
      'inspect', 'audit', 'verify quality', 'quality gate',
      'pull request', 'pr', 'merge request', 'mr'
    ],
    weight: 0.9
  },

  // COMPLETION phase
  {
    phase: WorkflowPhase.COMPLETION,
    keywords: [
      'done', 'complete', 'finish', 'close', 'wrap up', 'finalize',
      'completed', 'finished', 'all done', 'ready to close',
      'increment done', 'increment complete', 'archive',
      'mark as done', 'mark complete', 'close increment'
    ],
    weight: 1.0
  }
];

/**
 * Command mappings for each workflow phase
 */
const COMMAND_MAPPINGS: CommandMapping[] = [
  // SPEC_WRITING
  {
    phase: WorkflowPhase.SPEC_WRITING,
    commandPattern: '/specweave:increment',
    weight: 1.2
  },
  {
    phase: WorkflowPhase.SPEC_WRITING,
    commandPattern: '/specweave:validate',
    weight: 0.8
  },

  // PLAN_GENERATION
  {
    phase: WorkflowPhase.PLAN_GENERATION,
    commandPattern: '/specweave:plan',
    weight: 1.5
  },

  // IMPLEMENTATION
  {
    phase: WorkflowPhase.IMPLEMENTATION,
    commandPattern: '/specweave:do',
    weight: 1.5
  },
  {
    phase: WorkflowPhase.IMPLEMENTATION,
    commandPattern: '/specweave:progress',
    weight: 1.0
  },

  // TESTING
  {
    phase: WorkflowPhase.TESTING,
    commandPattern: '/specweave:test',
    weight: 1.3
  },
  {
    phase: WorkflowPhase.TESTING,
    commandPattern: 'npm test',
    weight: 1.2
  },
  {
    phase: WorkflowPhase.TESTING,
    commandPattern: 'jest',
    weight: 1.2
  },

  // DOCUMENTATION
  {
    phase: WorkflowPhase.DOCUMENTATION,
    commandPattern: '/specweave:sync-docs',
    weight: 1.4
  },

  // REVIEW
  {
    phase: WorkflowPhase.REVIEW,
    commandPattern: '/specweave:qa',
    weight: 1.3
  },

  // COMPLETION
  {
    phase: WorkflowPhase.COMPLETION,
    commandPattern: '/specweave:done',
    weight: 1.5
  }
];

/**
 * Cache entry for file states
 */
interface FileStateCache {
  states: FileState[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * PhaseDetector - Detect current workflow phase
 */
export class PhaseDetector {
  private config: Required<PhaseDetectorConfig>;
  private fileStateCache: Map<string, FileStateCache>;
  private readonly DEFAULT_CACHE_TTL = 5000; // 5 seconds

  // Performance tracking
  private detectionCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private totalDetectionTime = 0;

  constructor(config: PhaseDetectorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fileStateCache = new Map();
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    detectionCount: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRate: number;
    averageDetectionTime: number;
  } {
    return {
      detectionCount: this.detectionCount,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate: this.cacheHits / Math.max(this.cacheHits + this.cacheMisses, 1),
      averageDetectionTime: this.totalDetectionTime / Math.max(this.detectionCount, 1)
    };
  }

  /**
   * Reset performance statistics
   */
  resetPerformanceStats(): void {
    this.detectionCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.totalDetectionTime = 0;
  }

  /**
   * Clear the file state cache
   */
  clearCache(): void {
    this.fileStateCache.clear();
  }

  /**
   * Get cached file states if available and not expired
   */
  private getCachedFileStates(incrementDir: string): FileState[] | null {
    const cached = this.fileStateCache.get(incrementDir);
    if (!cached) {
      this.cacheMisses++;
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      // Cache expired
      this.fileStateCache.delete(incrementDir);
      this.cacheMisses++;
      return null;
    }

    this.cacheHits++;
    return cached.states;
  }

  /**
   * Cache file states for future use
   */
  private cacheFileStates(incrementDir: string, states: FileState[]): void {
    this.fileStateCache.set(incrementDir, {
      states,
      timestamp: Date.now(),
      ttl: this.DEFAULT_CACHE_TTL
    });
  }

  /**
   * Detect the current workflow phase from context
   */
  async detect(context: DetectionContext): Promise<PhaseDetectionResult> {
    const startTime = Date.now();
    const evidence: PhaseEvidence[] = [];

    // 1. Keyword Analysis (40% weight)
    const keywordEvidence = this.analyzeKeywords(context.userPrompt);
    evidence.push(...keywordEvidence);

    // 2. Command Analysis (30% weight)
    if (context.recentCommands && context.recentCommands.length > 0) {
      const commandEvidence = this.analyzeCommands(context.recentCommands);
      evidence.push(...commandEvidence);
    }

    // 3. Context Analysis (20% weight)
    const contextEvidence = await this.analyzeContext(context);
    evidence.push(...contextEvidence);

    // 4. Hint Analysis (10% weight)
    if (context.explicitHint) {
      const hintEvidence = this.analyzeHint(context.explicitHint);
      evidence.push(...hintEvidence);
    }

    // Calculate phase scores
    const phaseScores = this.calculatePhaseScores(evidence);

    // Get top phase and alternatives
    const sortedPhases = Object.entries(phaseScores)
      .map(([phase, score]) => ({ phase: phase as WorkflowPhase, score }))
      .sort((a, b) => b.score - a.score);

    const topPhase = sortedPhases[0];
    const alternatives: AlternativePhase[] = sortedPhases
      .slice(1, 4) // Top 3 alternatives
      .map(p => ({
        phase: p.phase,
        confidence: p.score,
        reason: `Score: ${p.score.toFixed(2)} (lower than primary phase)`
      }));

    // Generate suggestion
    const suggestion = this.generateSuggestion(topPhase.phase, topPhase.score);

    // Track performance
    const elapsedTime = Date.now() - startTime;
    this.detectionCount++;
    this.totalDetectionTime += elapsedTime;

    return {
      phase: topPhase.phase,
      confidence: topPhase.score,
      evidence: evidence.filter(e => e.weight > 0), // Filter out zero-weight evidence
      alternatives: this.config.includeAlternatives ? alternatives : [],
      suggestedCommand: suggestion?.command,
      suggestionReason: suggestion?.reason
    };
  }

  /**
   * Analyze keywords in user prompt
   */
  private analyzeKeywords(userPrompt: string): PhaseEvidence[] {
    const evidence: PhaseEvidence[] = [];
    const promptLower = userPrompt.toLowerCase();

    for (const mapping of KEYWORD_MAPPINGS) {
      const matchedKeywords: string[] = [];

      for (const keyword of mapping.keywords) {
        const keywordLower = keyword.toLowerCase();
        if (promptLower.includes(keywordLower)) {
          matchedKeywords.push(keyword);
        }
      }

      if (matchedKeywords.length > 0) {
        // Weight = (base weight) * (mapping weight) * (number of matches)
        const baseWeight = this.config.keywordWeight;
        const weight = baseWeight * (mapping.weight || 1.0) * Math.min(matchedKeywords.length, 3) / 3;

        evidence.push({
          type: EvidenceType.KEYWORD,
          description: `Keywords found: ${matchedKeywords.join(', ')}`,
          weight,
          source: `keyword: ${matchedKeywords[0]}`
        });
      }
    }

    return evidence;
  }

  /**
   * Analyze recent command history
   */
  private analyzeCommands(recentCommands: string[]): PhaseEvidence[] {
    const evidence: PhaseEvidence[] = [];

    // Most recent command has highest weight
    const weights = [1.0, 0.7, 0.5, 0.3, 0.2]; // Decay for older commands

    for (let i = 0; i < Math.min(recentCommands.length, 5); i++) {
      const command = recentCommands[i];
      const recencyWeight = weights[i];

      for (const mapping of COMMAND_MAPPINGS) {
        if (command.includes(mapping.commandPattern)) {
          const baseWeight = this.config.commandWeight;
          const weight = baseWeight * (mapping.weight || 1.0) * recencyWeight;

          evidence.push({
            type: EvidenceType.COMMAND,
            description: `Recent command: ${command}`,
            weight,
            source: `command: ${mapping.commandPattern}`
          });
        }
      }
    }

    return evidence;
  }

  /**
   * Analyze explicit user hint
   */
  private analyzeHint(hint: string): PhaseEvidence[] {
    const evidence: PhaseEvidence[] = [];
    const hintLower = hint.toLowerCase();

    // Check for phase names directly mentioned
    for (const phase of Object.values(WorkflowPhase)) {
      if (hintLower.includes(phase) || hintLower.includes(phase.replace('-', ' '))) {
        evidence.push({
          type: EvidenceType.USER_HINT,
          description: `Explicit phase hint: ${phase}`,
          weight: this.config.hintWeight * 2.0, // Strong signal
          source: `hint: ${phase}`
        });
      }
    }

    return evidence;
  }

  /**
   * Analyze context (file states and increment status)
   */
  private async analyzeContext(context: DetectionContext): Promise<PhaseEvidence[]> {
    const evidence: PhaseEvidence[] = [];

    // Determine working directory
    const workingDir = context.workingDirectory || process.cwd();

    // Check if we're in a SpecWeave project
    const specweaveDir = path.join(workingDir, '.specweave');
    if (!fs.existsSync(specweaveDir)) {
      // Not in a SpecWeave project, no context evidence
      return evidence;
    }

    // If incrementId provided, analyze increment-specific context
    if (context.incrementId) {
      const incrementDir = path.join(specweaveDir, 'increments', context.incrementId);

      if (fs.existsSync(incrementDir)) {
        // Analyze file states
        const fileStates = this.getFileStates(incrementDir);
        const fileEvidence = this.analyzeFileStates(fileStates);
        evidence.push(...fileEvidence);

        // Analyze increment metadata
        try {
          const metadata = MetadataManager.read(context.incrementId);
          const statusEvidence = this.analyzeIncrementStatus(metadata.status);
          evidence.push(...statusEvidence);
        } catch (error) {
          // Metadata not found or invalid, skip status evidence
        }
      }
    }

    return evidence;
  }

  /**
   * Get file states for key increment files (with caching)
   */
  private getFileStates(incrementDir: string): FileState[] {
    // Check cache first
    const cached = this.getCachedFileStates(incrementDir);
    if (cached) {
      return cached;
    }

    // Cache miss, compute file states
    const files = ['spec.md', 'plan.md', 'tasks.md'];
    const states: FileState[] = [];

    for (const file of files) {
      const filePath = path.join(incrementDir, file);
      const exists = fs.existsSync(filePath);

      if (exists) {
        const stats = fs.statSync(filePath);
        const isEmpty = stats.size === 0;

        states.push({
          path: file,
          exists: true,
          empty: isEmpty,
          lastModified: stats.mtime
        });
      } else {
        states.push({
          path: file,
          exists: false
        });
      }
    }

    // Cache the result
    this.cacheFileStates(incrementDir, states);

    return states;
  }

  /**
   * Analyze file states to determine likely phase
   */
  private analyzeFileStates(fileStates: FileState[]): PhaseEvidence[] {
    const evidence: PhaseEvidence[] = [];

    const specExists = fileStates.find(f => f.path === 'spec.md')?.exists || false;
    const planExists = fileStates.find(f => f.path === 'plan.md')?.exists || false;
    const tasksExist = fileStates.find(f => f.path === 'tasks.md')?.exists || false;

    const specEmpty = fileStates.find(f => f.path === 'spec.md')?.empty || false;
    const planEmpty = fileStates.find(f => f.path === 'plan.md')?.empty || false;

    // Spec exists but empty → SPEC_WRITING
    if (specExists && specEmpty) {
      evidence.push({
        type: EvidenceType.FILE_STATE,
        description: 'spec.md exists but is empty',
        weight: this.config.contextWeight * 1.3,
        source: 'file-state: spec-empty'
      });
    }

    // Spec exists but plan doesn't → PLAN_GENERATION
    if (specExists && !specEmpty && !planExists) {
      evidence.push({
        type: EvidenceType.FILE_STATE,
        description: 'spec.md exists, plan.md missing',
        weight: this.config.contextWeight * 1.5,
        source: 'file-state: plan-missing'
      });
    }

    // Plan exists but empty → PLAN_GENERATION
    if (planExists && planEmpty) {
      evidence.push({
        type: EvidenceType.FILE_STATE,
        description: 'plan.md exists but is empty',
        weight: this.config.contextWeight * 1.2,
        source: 'file-state: plan-empty'
      });
    }

    // Plan exists but tasks don't → TASK_BREAKDOWN
    if (planExists && !planEmpty && !tasksExist) {
      evidence.push({
        type: EvidenceType.FILE_STATE,
        description: 'plan.md exists, tasks.md missing',
        weight: this.config.contextWeight * 1.4,
        source: 'file-state: tasks-missing'
      });
    }

    // All files exist → likely IMPLEMENTATION or TESTING
    if (specExists && planExists && tasksExist && !specEmpty && !planEmpty) {
      evidence.push({
        type: EvidenceType.FILE_STATE,
        description: 'All increment files present',
        weight: this.config.contextWeight * 1.0,
        source: 'file-state: all-present'
      });
    }

    return evidence;
  }

  /**
   * Analyze increment status to determine likely phase
   */
  private analyzeIncrementStatus(status: string): PhaseEvidence[] {
    const evidence: PhaseEvidence[] = [];

    switch (status.toLowerCase()) {
      case 'planning':
        evidence.push({
          type: EvidenceType.INCREMENT_STATUS,
          description: 'Increment status: PLANNING',
          weight: this.config.contextWeight * 1.3,
          source: 'status: planning'
        });
        break;

      case 'active':
        evidence.push({
          type: EvidenceType.INCREMENT_STATUS,
          description: 'Increment status: ACTIVE',
          weight: this.config.contextWeight * 1.2,
          source: 'status: active'
        });
        break;

      case 'paused':
        evidence.push({
          type: EvidenceType.INCREMENT_STATUS,
          description: 'Increment status: PAUSED',
          weight: this.config.contextWeight * 0.8,
          source: 'status: paused'
        });
        break;

      case 'completed':
        evidence.push({
          type: EvidenceType.INCREMENT_STATUS,
          description: 'Increment status: COMPLETED',
          weight: this.config.contextWeight * 1.5,
          source: 'status: completed'
        });
        break;
    }

    return evidence;
  }

  /**
   * Calculate aggregated phase scores from evidence
   */
  private calculatePhaseScores(evidence: PhaseEvidence[]): Record<WorkflowPhase, number> {
    const scores: Record<WorkflowPhase, number> = {} as Record<WorkflowPhase, number>;

    // Initialize all phases to 0
    for (const phase of Object.values(WorkflowPhase)) {
      scores[phase] = 0;
    }

    // Group evidence by phase
    const evidenceByPhase = this.groupEvidenceByPhase(evidence);

    // Calculate score for each phase
    for (const [phase, phaseEvidence] of Object.entries(evidenceByPhase)) {
      const totalWeight = phaseEvidence.reduce((sum, e) => sum + e.weight, 0);
      scores[phase as WorkflowPhase] = Math.min(totalWeight, 1.0); // Cap at 1.0
    }

    return scores;
  }

  /**
   * Group evidence by the phase it suggests
   */
  private groupEvidenceByPhase(evidence: PhaseEvidence[]): Record<string, PhaseEvidence[]> {
    const grouped: Record<string, PhaseEvidence[]> = {};

    for (const ev of evidence) {
      // Extract phase from source (e.g., "keyword: implement" -> IMPLEMENTATION)
      const phase = this.inferPhaseFromSource(ev.source);

      if (phase) {
        if (!grouped[phase]) {
          grouped[phase] = [];
        }
        grouped[phase].push(ev);
      }
    }

    return grouped;
  }

  /**
   * Infer workflow phase from evidence source
   */
  private inferPhaseFromSource(source: string): WorkflowPhase | null {
    // Source format: "keyword: <keyword>" or "command: <command>" or "file-state: <state>" or "status: <status>"
    const [type, value] = source.split(': ');

    if (type === 'keyword') {
      // Find keyword mapping
      for (const mapping of KEYWORD_MAPPINGS) {
        if (mapping.keywords.some(k => k.toLowerCase() === value.toLowerCase())) {
          return mapping.phase;
        }
      }
    } else if (type === 'command') {
      // Find command mapping
      for (const mapping of COMMAND_MAPPINGS) {
        if (value.includes(mapping.commandPattern)) {
          return mapping.phase;
        }
      }
    } else if (type === 'hint') {
      // Hint directly contains phase name
      return value as WorkflowPhase;
    } else if (type === 'file-state') {
      // Map file states to phases
      switch (value) {
        case 'spec-empty':
          return WorkflowPhase.SPEC_WRITING;
        case 'plan-missing':
        case 'plan-empty':
          return WorkflowPhase.PLAN_GENERATION;
        case 'tasks-missing':
          return WorkflowPhase.TASK_BREAKDOWN;
        case 'all-present':
          return WorkflowPhase.IMPLEMENTATION;
        default:
          return null;
      }
    } else if (type === 'status') {
      // Map increment status to phases
      switch (value) {
        case 'planning':
          return WorkflowPhase.PLAN_GENERATION;
        case 'active':
          return WorkflowPhase.IMPLEMENTATION;
        case 'completed':
          return WorkflowPhase.COMPLETION;
        case 'paused':
          // Paused doesn't indicate a specific phase
          return null;
        default:
          return null;
      }
    }

    return null;
  }

  /**
   * Generate command suggestion based on detected phase
   */
  private generateSuggestion(
    phase: WorkflowPhase,
    confidence: number
  ): { command: string; reason: string } | null {
    // Only suggest if confidence is above threshold
    if (confidence < this.config.confidenceThreshold) {
      return null;
    }

    switch (phase) {
      case WorkflowPhase.SPEC_WRITING:
        return {
          command: '/specweave:increment',
          reason: 'Create new increment with spec.md template'
        };

      case WorkflowPhase.PLAN_GENERATION:
        return {
          command: '/specweave:plan',
          reason: 'Generate implementation plan from spec.md'
        };

      case WorkflowPhase.TASK_BREAKDOWN:
        return {
          command: '/specweave:plan',
          reason: 'Generate tasks.md with embedded test plans'
        };

      case WorkflowPhase.IMPLEMENTATION:
        return {
          command: '/specweave:do',
          reason: 'Execute tasks from tasks.md'
        };

      case WorkflowPhase.TESTING:
        return {
          command: '/specweave:test',
          reason: 'Run test suite and validate coverage'
        };

      case WorkflowPhase.DOCUMENTATION:
        return {
          command: '/specweave:sync-docs',
          reason: 'Sync increment to living documentation'
        };

      case WorkflowPhase.REVIEW:
        return {
          command: '/specweave:qa',
          reason: 'Run quality assessment on increment'
        };

      case WorkflowPhase.COMPLETION:
        return {
          command: '/specweave:done',
          reason: 'Close increment and update status'
        };

      default:
        return null;
    }
  }
}
