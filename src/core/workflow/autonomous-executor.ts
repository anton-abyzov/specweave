/**
 * Autonomous Executor - Fully autonomous workflow execution
 *
 * Executes complete workflows without human intervention, with safety guardrails:
 * - Max iteration limits
 * - Infinite loop detection
 * - Cost threshold enforcement
 * - Checkpoint/recovery system
 *
 * Part of increment 0039: Ultra-Smart Next Command
 *
 * @module core/workflow/autonomous-executor
 * @since v0.22.0
 */

import { WorkflowOrchestrator, WorkflowExecutionResult } from './workflow-orchestrator.js';
import { StateManager } from './state-manager.js';
import { CostEstimator, CostEstimate } from './cost-estimator.js';
import { CommandInvoker } from './command-invoker.js';
import { WorkflowPhase } from './types.js';
import * as path from 'path';

/**
 * Autonomous execution configuration
 */
export interface AutonomousConfig {
  /** Maximum iterations before stopping (default: 50) */
  maxIterations?: number;
  /** Cost threshold in USD (default: $20) */
  costThreshold?: number;
  /** Enable checkpoint saving (default: true) */
  enableCheckpoints?: boolean;
  /** Maximum retries per command (default: 3) */
  maxRetries?: number;
  /** Stop on first error (default: false) */
  stopOnError?: boolean;
  /** Verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Autonomous execution result
 */
export interface AutonomousResult {
  /** Execution succeeded */
  success: boolean;
  /** Increment ID */
  incrementId: string;
  /** Total iterations */
  iterations: number;
  /** Commands executed */
  commandsExecuted: string[];
  /** Total cost (USD) */
  totalCost: number;
  /** Final phase */
  finalPhase: WorkflowPhase;
  /** Completion reason */
  reason: string;
  /** Error message if failed */
  error?: string;
  /** Checkpoint ID (for resume) */
  checkpointId?: string;
}

/**
 * Execution state
 */
interface ExecutionState {
  incrementId: string;
  iteration: number;
  phase: WorkflowPhase;
  commandsExecuted: string[];
  totalCost: number;
  phaseHistory: WorkflowPhase[];
}

/**
 * Autonomous Executor - Fully autonomous workflow execution with safety guardrails
 */
export class AutonomousExecutor {
  private orchestrator: WorkflowOrchestrator;
  private stateManager: StateManager;
  private costEstimator: CostEstimator;
  private commandInvoker: CommandInvoker;

  constructor(
    private config: AutonomousConfig = {}
  ) {
    this.orchestrator = new WorkflowOrchestrator();
    this.stateManager = new StateManager();
    this.costEstimator = new CostEstimator();
    this.commandInvoker = new CommandInvoker();

    // Apply defaults
    this.config.maxIterations = config.maxIterations || 50;
    this.config.costThreshold = config.costThreshold || 20.0;
    this.config.enableCheckpoints = config.enableCheckpoints !== false;
    this.config.maxRetries = config.maxRetries || 3;
    this.config.stopOnError = config.stopOnError || false;
    this.config.verbose = config.verbose || false;
  }

  /**
   * Execute workflow autonomously
   *
   * @param incrementId - Increment ID to execute
   * @param resumeCheckpointId - Optional checkpoint to resume from
   * @returns Autonomous execution result
   */
  async execute(
    incrementId: string,
    resumeCheckpointId?: string
  ): Promise<AutonomousResult> {
    this.log(`🚀 Starting autonomous execution for increment ${incrementId}`);

    // Initialize state
    let state: ExecutionState;
    if (resumeCheckpointId) {
      state = await this.resumeFromCheckpoint(incrementId, resumeCheckpointId);
      this.log(`📂 Resumed from checkpoint ${resumeCheckpointId} (iteration ${state.iteration})`);
    } else {
      state = this.initializeState(incrementId);
      this.log(`🆕 Starting fresh execution`);
    }

    // Pre-flight checks
    const preflightResult = await this.preflightCheck(incrementId);
    if (!preflightResult.passed) {
      return {
        success: false,
        incrementId,
        iterations: 0,
        commandsExecuted: [],
        totalCost: 0,
        finalPhase: WorkflowPhase.UNKNOWN,
        reason: `Preflight check failed: ${preflightResult.reason}`,
        error: preflightResult.reason
      };
    }

    // Main execution loop
    try {
      while (state.iteration < this.config.maxIterations!) {
        this.log(`\n📍 Iteration ${state.iteration + 1}/${this.config.maxIterations}`);

        // Safety checks
        const safetyCheck = this.checkSafety(state);
        if (!safetyCheck.safe) {
          return this.terminateExecution(state, safetyCheck.reason, false);
        }

        // Execute next step
        const result = await this.executeStep(state);

        // Handle execution result
        if (!result.success) {
          if (this.config.stopOnError) {
            return this.terminateExecution(state, `Step failed: ${result.error}`, false);
          } else {
            this.log(`⚠️  Step failed (continuing): ${result.error}`);
          }
        }

        // Update state
        state.iteration++;
        state.phase = result.phase;
        state.phaseHistory.push(result.phase);
        if (result.command) {
          state.commandsExecuted.push(result.command);
        }

        // Save checkpoint
        if (this.config.enableCheckpoints) {
          await this.saveCheckpoint(state);
        }

        // Check completion
        if (this.isComplete(state)) {
          return this.terminateExecution(state, 'Workflow completed successfully', true);
        }
      }

      // Max iterations reached
      return this.terminateExecution(
        state,
        `Max iterations (${this.config.maxIterations}) reached`,
        false
      );
    } catch (error) {
      return this.terminateExecution(
        state,
        `Fatal error: ${error instanceof Error ? error.message : String(error)}`,
        false
      );
    }
  }

  /**
   * Execute single step in workflow
   */
  private async executeStep(state: ExecutionState): Promise<WorkflowExecutionResult> {
    this.log(`🔍 Detecting current phase...`);

    // Use orchestrator to detect phase and determine action
    const result = await this.orchestrator.executeNext(state.incrementId, {
      autonomous: true,
      verbose: this.config.verbose
    });

    this.log(`📊 Phase: ${result.phase} (confidence: ${(result.confidence * 100).toFixed(0)}%)`);
    this.log(`🎯 Action: ${result.action}`);

    // Execute command if suggested
    if (result.command && result.success) {
      this.log(`⚡ Executing: ${result.command}`);

      const invokeResult = await this.commandInvoker.invokeWithRetry(
        result.command,
        {
          captureOutput: true
        },
        this.config.maxRetries
      );

      if (!invokeResult.success) {
        this.log(`❌ Command failed: ${invokeResult.error}`);
        return {
          ...result,
          success: false,
          error: invokeResult.error
        };
      }

      this.log(`✅ Command completed in ${(invokeResult.executionTime / 1000).toFixed(1)}s`);
    }

    return result;
  }

  /**
   * Preflight check before execution
   */
  private async preflightCheck(incrementId: string): Promise<{ passed: boolean; reason?: string }> {
    // Check increment exists
    const incrementPath = path.join(process.cwd(), '.specweave/increments', incrementId);
    const fs = await import('fs-extra');

    if (!await fs.pathExists(incrementPath)) {
      return {
        passed: false,
        reason: `Increment ${incrementId} not found`
      };
    }

    // Estimate cost
    const estimate = await this.costEstimator.estimateIncrement(incrementPath);
    this.log(`💰 Estimated cost: $${estimate.estimatedCost.toFixed(2)} (${estimate.riskLevel.toUpperCase()})`);

    if (estimate.estimatedCost > this.config.costThreshold!) {
      return {
        passed: false,
        reason: `Estimated cost ($${estimate.estimatedCost.toFixed(2)}) exceeds threshold ($${this.config.costThreshold})`
      };
    }

    return { passed: true };
  }

  /**
   * Safety checks during execution
   */
  private checkSafety(state: ExecutionState): { safe: boolean; reason?: string } {
    // Check for infinite loop
    if (this.stateManager.detectLoop(state.phaseHistory)) {
      return {
        safe: false,
        reason: 'Infinite loop detected (same phase repeated 3+ times)'
      };
    }

    // Check cost threshold
    if (state.totalCost > this.config.costThreshold!) {
      return {
        safe: false,
        reason: `Cost threshold ($${this.config.costThreshold}) exceeded (current: $${state.totalCost.toFixed(2)})`
      };
    }

    return { safe: true };
  }

  /**
   * Check if workflow is complete
   */
  private isComplete(state: ExecutionState): boolean {
    // Completion phase reached
    if (state.phase === WorkflowPhase.COMPLETION) {
      return true;
    }

    // Unknown phase with no further actions (stuck)
    if (state.phase === WorkflowPhase.UNKNOWN && state.iteration > 5) {
      return true;
    }

    return false;
  }

  /**
   * Initialize execution state
   */
  private initializeState(incrementId: string): ExecutionState {
    return {
      incrementId,
      iteration: 0,
      phase: WorkflowPhase.UNKNOWN,
      commandsExecuted: [],
      totalCost: 0,
      phaseHistory: []
    };
  }

  /**
   * Resume from checkpoint
   */
  private async resumeFromCheckpoint(
    incrementId: string,
    checkpointId: string
  ): Promise<ExecutionState> {
    const checkpoints = await this.stateManager.loadCheckpoints(incrementId);
    const checkpoint = checkpoints.find(c => c.id === checkpointId);

    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    return {
      incrementId,
      iteration: checkpoint.iteration,
      phase: checkpoint.phase,
      commandsExecuted: checkpoint.actions,
      totalCost: 0, // Reset cost tracking
      phaseHistory: [checkpoint.phase]
    };
  }

  /**
   * Save execution checkpoint
   */
  private async saveCheckpoint(state: ExecutionState): Promise<void> {
    await this.stateManager.saveCheckpoint({
      id: `autonomous-${Date.now()}`,
      timestamp: Date.now(),
      incrementId: state.incrementId,
      phase: state.phase,
      iteration: state.iteration,
      actions: state.commandsExecuted
    });
  }

  /**
   * Terminate execution and return result
   */
  private terminateExecution(
    state: ExecutionState,
    reason: string,
    success: boolean
  ): AutonomousResult {
    this.log(`\n${success ? '✅' : '❌'} ${reason}`);
    this.log(`📊 Final stats:`);
    this.log(`   - Iterations: ${state.iteration}`);
    this.log(`   - Commands: ${state.commandsExecuted.length}`);
    this.log(`   - Cost: $${state.totalCost.toFixed(2)}`);

    return {
      success,
      incrementId: state.incrementId,
      iterations: state.iteration,
      commandsExecuted: state.commandsExecuted,
      totalCost: state.totalCost,
      finalPhase: state.phase,
      reason
    };
  }

  /**
   * Log message (if verbose enabled)
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(message);
    }
  }
}
