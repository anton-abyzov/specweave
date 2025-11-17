/**
 * Workflow Orchestrator - Core orchestration logic for /specweave:next
 *
 * Coordinates workflow execution by detecting current phase and
 * invoking appropriate commands.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 *
 * @module core/workflow/workflow-orchestrator
 * @since v0.22.0
 */

import { PhaseDetector } from './phase-detector.js';
import { WorkflowPhase, PhaseDetectionResult, DetectionContext } from './types.js';
import { ActiveIncrementManager } from '../increment/active-increment-manager.js';

/**
 * Workflow execution options
 */
export interface WorkflowExecuteOptions {
  /** Auto-approve actions without prompting (dangerous!) */
  autonomous?: boolean;
  /** Show detailed execution information */
  verbose?: boolean;
  /** Dry-run mode (preview actions without executing) */
  dryRun?: boolean;
  /** Force execution even with low confidence */
  force?: boolean;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  /** Execution succeeded */
  success: boolean;
  /** Phase that was detected */
  phase: WorkflowPhase;
  /** Confidence score for phase detection */
  confidence: number;
  /** Action that was taken */
  action?: string;
  /** Command that was invoked */
  command?: string;
  /** Error message if failed */
  error?: string;
  /** Human-readable explanation */
  reasoning?: string;
  /** Phase detection evidence */
  evidence?: string[];
}

/**
 * Workflow Orchestrator - Coordinates intelligent workflow execution
 *
 * This is a simplified initial implementation focusing on core phase detection.
 * Full autonomous execution will be added in future tasks.
 */
export class WorkflowOrchestrator {
  private phaseDetector: PhaseDetector;
  private activeIncrementManager: ActiveIncrementManager;

  constructor() {
    this.phaseDetector = new PhaseDetector();
    this.activeIncrementManager = new ActiveIncrementManager();
  }

  /**
   * Execute next step in workflow (interactive mode)
   *
   * Detects current phase and suggests/executes appropriate action.
   *
   * @param incrementId - Optional increment ID (auto-detects if not provided)
   * @param options - Execution options
   * @returns Workflow execution result
   */
  async executeNext(
    incrementId?: string,
    options: WorkflowExecuteOptions = {}
  ): Promise<WorkflowExecutionResult> {
    try {
      // Phase 1: Detect current workflow phase
      const detection = await this.detectCurrentPhase(incrementId);

      // Phase 2: Determine action based on phase and confidence
      const action = this.determineAction(detection, options);

      // Format reasoning from detection evidence
      const reasoning = this.formatReasoning(detection);

      // Phase 3: Execute action (or return suggestion)
      if (options.dryRun) {
        return {
          success: true,
          phase: detection.phase,
          confidence: detection.confidence,
          action: action.description,
          reasoning: `[DRY RUN] Would execute: ${action.description}\n\n${reasoning}`
        };
      }

      // For now, return suggestion (actual execution will be added in later tasks)
      return {
        success: true,
        phase: detection.phase,
        confidence: detection.confidence,
        action: action.description,
        command: action.command,
        reasoning
      };
    } catch (error) {
      return {
        success: false,
        phase: WorkflowPhase.UNKNOWN,
        confidence: 0,
        error: error instanceof Error ? error.message : String(error),
        reasoning: 'Failed to detect workflow phase or execute action'
      };
    }
  }

  /**
   * Format reasoning from phase detection result
   */
  private formatReasoning(detection: PhaseDetectionResult): string {
    const parts: string[] = [];

    // Add suggestion reason if present
    if (detection.suggestionReason) {
      parts.push(detection.suggestionReason);
    }

    // Add evidence summary
    if (detection.evidence && detection.evidence.length > 0) {
      parts.push('\nEvidence:');
      detection.evidence.forEach(ev => {
        parts.push(`- ${ev.description} (${(ev.weight * 100).toFixed(0)}% weight)`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Detect current workflow phase for increment
   *
   * @param incrementId - Increment ID (auto-detects if not provided)
   * @returns Phase detection result
   */
  private async detectCurrentPhase(incrementId?: string): Promise<PhaseDetectionResult> {
    // If no increment ID provided, try to auto-detect active increment
    if (!incrementId) {
      incrementId = await this.detectActiveIncrement();
    }

    // Build detection context
    const context: DetectionContext = {
      userPrompt: 'Detect current workflow phase',
      incrementId,
      workingDirectory: process.cwd()
    };

    // Detect phase using PhaseDetector
    return this.phaseDetector.detect(context);
  }

  /**
   * Auto-detect active increment
   *
   * @returns Increment ID or throws if none found
   */
  private async detectActiveIncrement(): Promise<string> {
    const activeIds = this.activeIncrementManager.getActive();

    if (activeIds.length === 0) {
      throw new Error('No active increments found. Use /specweave:increment to create one.');
    }

    if (activeIds.length === 1) {
      return activeIds[0];
    }

    // Multiple active increments - return primary (first)
    console.log(`Multiple active increments detected: ${activeIds.join(', ')}`);
    console.log(`Using primary increment: ${activeIds[0]}`);
    return activeIds[0];
  }

  /**
   * Determine action based on phase and confidence
   *
   * @param detection - Phase detection result
   * @param options - Execution options
   * @returns Suggested action
   */
  private determineAction(
    detection: PhaseDetectionResult,
    options: WorkflowExecuteOptions
  ): { description: string; command?: string } {
    const { phase, confidence } = detection;

    // Low confidence - prompt user
    if (confidence < 0.7 && !options.force) {
      return {
        description: `Phase detection confidence is low (${(confidence * 100).toFixed(0)}%). Please specify action manually.`,
        command: undefined
      };
    }

    // Map phase to action
    switch (phase) {
      case WorkflowPhase.PLAN_GENERATION:
        return {
          description: 'Generate implementation plan',
          command: '/specweave:plan'
        };

      case WorkflowPhase.IMPLEMENTATION:
        return {
          description: 'Execute tasks',
          command: '/specweave:do'
        };

      case WorkflowPhase.TESTING:
        return {
          description: 'Run tests',
          command: 'npm test'
        };

      case WorkflowPhase.REVIEW:
        return {
          description: 'Run quality assessment',
          command: '/specweave:qa'
        };

      case WorkflowPhase.COMPLETION:
        return {
          description: 'Close increment',
          command: '/specweave:done'
        };

      case WorkflowPhase.SPEC_WRITING:
        return {
          description: 'Complete spec.md and generate plan',
          command: '/specweave:plan'
        };

      case WorkflowPhase.TASK_BREAKDOWN:
        return {
          description: 'Create tasks and start implementation',
          command: '/specweave:do'
        };

      case WorkflowPhase.DOCUMENTATION:
        return {
          description: 'Update living documentation',
          command: '/specweave:sync-docs update'
        };

      default:
        return {
          description: 'Phase detection unclear - please specify action manually',
          command: undefined
        };
    }
  }
}
