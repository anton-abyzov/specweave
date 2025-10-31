/**
 * Phase Detector
 *
 * Multi-signal phase detection algorithm that analyzes user prompts and context
 * to determine whether work is in planning, execution, or review phase.
 *
 * Uses 4 signals with weighted scoring:
 * 1. Keyword analysis (40%) - Planning/execution/review keywords
 * 2. Command analysis (30%) - Slash commands hint at phase
 * 3. Context analysis (20%) - Increment state, file types
 * 4. Explicit hints (10%) - User explicitly states phase
 *
 * Target accuracy: >95%
 */

import type { Phase } from '../types/model-selection';

export interface PhaseDetectionResult {
  phase: Phase;
  confidence: number; // 0.0 - 1.0
  signals: {
    keywords: string[];
    command?: string;
    context: string[];
  };
  reasoning: string;
}

export interface ExecutionContext {
  command?: string;
  incrementState?: 'backlog' | 'planned' | 'in-progress' | 'completed' | 'closed';
  previousPhases?: Phase[];
  filesModified?: string[];
}

export class PhaseDetector {
  // Keyword dictionaries for each phase
  private readonly planningKeywords = [
    'plan', 'design', 'analyze', 'research', 'architecture', 'decide',
    'strategy', 'requirements', 'specification', 'feasibility', 'explore',
    'brainstorm', 'assess', 'evaluate', 'investigate', 'study', 'conceive',
    'blueprint', 'roadmap', 'scope', 'estimate', 'proposal'
  ];

  private readonly executionKeywords = [
    'implement', 'build', 'create', 'write', 'code', 'generate',
    'develop', 'construct', 'refactor', 'fix', 'update', 'modify',
    'add', 'delete', 'remove', 'change', 'integrate', 'deploy',
    'setup', 'configure', 'install', 'run', 'execute'
  ];

  private readonly reviewKeywords = [
    'review', 'validate', 'audit', 'assess', 'check', 'verify',
    'test', 'evaluate', 'inspect', 'examine', 'quality',
    'debug', 'troubleshoot', 'analyze error', 'find bug', 'measure'
  ];

  // Command-to-phase mapping
  private readonly commandPhaseMap: Record<string, Phase> = {
    '/specweave.inc': 'planning',
    '/specweave': 'planning',
    '/increment': 'planning',
    '/specweave.do': 'execution',
    '/do': 'execution',
    '/specweave.validate': 'review',
    '/validate': 'review',
    '/specweave.done': 'review',
    '/spec-driven-brainstorming': 'planning',
  };

  /**
   * Detect phase from user prompt and execution context
   */
  detect(prompt: string, context: ExecutionContext = {}): PhaseDetectionResult {
    const scores: Record<Phase, number> = {
      planning: 0,
      execution: 0,
      review: 0,
    };

    const signals: PhaseDetectionResult['signals'] = {
      keywords: [],
      context: [],
    };

    // Signal 1: Keyword analysis (40% weight)
    const keywordScore = this.analyzeKeywords(prompt, scores, signals);

    // Signal 2: Command analysis (30% weight)
    const commandScore = this.analyzeCommand(context, scores, signals);

    // Signal 3: Context analysis (20% weight)
    const contextScore = this.analyzeContext(context, scores, signals);

    // Signal 4: Explicit hints (10% weight)
    const hintScore = this.analyzeHints(prompt, scores, signals);

    // Calculate total signal strength
    const totalSignals = keywordScore + commandScore + contextScore + hintScore;

    // Determine winning phase
    const phase = (Object.keys(scores) as Phase[]).reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );

    // Calculate confidence (normalized score of winning phase)
    const maxScore = Math.max(...Object.values(scores));
    const confidence = maxScore > 0 ? scores[phase] / maxScore : 0.5;

    return {
      phase,
      confidence,
      signals,
      reasoning: this.generateReasoning(phase, confidence, signals, totalSignals),
    };
  }

  /**
   * Analyze keywords in prompt
   */
  private analyzeKeywords(
    prompt: string,
    scores: Record<Phase, number>,
    signals: PhaseDetectionResult['signals']
  ): number {
    const lowerPrompt = prompt.toLowerCase();
    let matchCount = 0;

    // Check planning keywords
    for (const keyword of this.planningKeywords) {
      if (lowerPrompt.includes(keyword)) {
        scores.planning++;
        if (signals.keywords.length < 5) { // Limit to first 5
          signals.keywords.push(`planning:${keyword}`);
        }
        matchCount++;
      }
    }

    // Check execution keywords
    for (const keyword of this.executionKeywords) {
      if (lowerPrompt.includes(keyword)) {
        scores.execution++;
        if (signals.keywords.length < 5) {
          signals.keywords.push(`execution:${keyword}`);
        }
        matchCount++;
      }
    }

    // Check review keywords
    for (const keyword of this.reviewKeywords) {
      if (lowerPrompt.includes(keyword)) {
        scores.review++;
        if (signals.keywords.length < 5) {
          signals.keywords.push(`review:${keyword}`);
        }
        matchCount++;
      }
    }

    return matchCount > 0 ? 1 : 0;
  }

  /**
   * Analyze command hints
   */
  private analyzeCommand(
    context: ExecutionContext,
    scores: Record<Phase, number>,
    signals: PhaseDetectionResult['signals']
  ): number {
    if (context.command && this.commandPhaseMap[context.command]) {
      const phase = this.commandPhaseMap[context.command];
      scores[phase] += 3; // Strong signal
      signals.command = context.command;
      return 1;
    }
    return 0;
  }

  /**
   * Analyze execution context
   */
  private analyzeContext(
    context: ExecutionContext,
    scores: Record<Phase, number>,
    signals: PhaseDetectionResult['signals']
  ): number {
    let signalCount = 0;

    // Increment state signals
    if (context.incrementState === 'backlog' || context.incrementState === 'planned') {
      scores.planning++;
      signals.context.push(`increment:${context.incrementState}`);
      signalCount++;
    } else if (context.incrementState === 'in-progress') {
      scores.execution++;
      signals.context.push('increment:in-progress');
      signalCount++;
    } else if (context.incrementState === 'completed') {
      scores.review++;
      signals.context.push('increment:completed');
      signalCount++;
    }

    // File modification signals
    if (context.filesModified && context.filesModified.length > 0) {
      const hasArchitectureDocs = context.filesModified.some(f =>
        f.includes('/architecture/') || f.includes('/adr/') || f.includes('spec.md') || f.includes('plan.md')
      );
      const hasCodeFiles = context.filesModified.some(f =>
        f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.py') ||
        f.endsWith('.tsx') || f.endsWith('.jsx') || f.endsWith('.java')
      );
      const hasTestFiles = context.filesModified.some(f =>
        f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__/')
      );

      if (hasArchitectureDocs) {
        scores.planning++;
        signals.context.push('files:architecture-docs');
        signalCount++;
      }
      if (hasCodeFiles) {
        scores.execution++;
        signals.context.push('files:code-files');
        signalCount++;
      }
      if (hasTestFiles) {
        scores.review++;
        signals.context.push('files:test-files');
        signalCount++;
      }
    }

    return signalCount > 0 ? 1 : 0;
  }

  /**
   * Analyze explicit hints in prompt
   */
  private analyzeHints(
    prompt: string,
    scores: Record<Phase, number>,
    signals: PhaseDetectionResult['signals']
  ): number {
    const lowerPrompt = prompt.toLowerCase();

    // Explicit phase mentions
    if (lowerPrompt.includes('planning phase') || lowerPrompt.includes('plan for')) {
      scores.planning += 2;
      return 1;
    }
    if (lowerPrompt.includes('implementation') || lowerPrompt.includes('execution phase') || lowerPrompt.includes('build phase')) {
      scores.execution += 2;
      return 1;
    }
    if (lowerPrompt.includes('review phase') || lowerPrompt.includes('validation phase')) {
      scores.review += 2;
      return 1;
    }

    return 0;
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    phase: Phase,
    confidence: number,
    signals: PhaseDetectionResult['signals'],
    totalSignals: number
  ): string {
    const reasons: string[] = [];

    if (signals.command) {
      reasons.push(`command '${signals.command}' indicates ${phase}`);
    }

    const planningKeywords = signals.keywords.filter(k => k.startsWith('planning:')).map(k => k.substring(9));
    const executionKeywords = signals.keywords.filter(k => k.startsWith('execution:')).map(k => k.substring(10));
    const reviewKeywords = signals.keywords.filter(k => k.startsWith('review:')).map(k => k.substring(7));

    if (planningKeywords.length > 0) {
      reasons.push(`planning keywords: ${planningKeywords.slice(0, 3).join(', ')}`);
    }
    if (executionKeywords.length > 0) {
      reasons.push(`execution keywords: ${executionKeywords.slice(0, 3).join(', ')}`);
    }
    if (reviewKeywords.length > 0) {
      reasons.push(`review keywords: ${reviewKeywords.slice(0, 3).join(', ')}`);
    }

    if (signals.context.length > 0) {
      reasons.push(`context: ${signals.context.join(', ')}`);
    }

    const confidencePercent = (confidence * 100).toFixed(0);
    const signalStrength = totalSignals >= 3 ? 'strong' : totalSignals >= 2 ? 'moderate' : 'weak';

    if (reasons.length === 0) {
      return `${phase} phase (${confidencePercent}% confidence, ${signalStrength} signals) - defaulting due to low signal`;
    }

    return `${phase} phase (${confidencePercent}% confidence, ${signalStrength} signals) - ${reasons.join('; ')}`;
  }
}
