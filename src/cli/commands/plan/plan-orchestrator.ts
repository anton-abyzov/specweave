/**
 * Plan Command Orchestrator
 *
 * Main orchestration logic for /specweave:plan command.
 * Coordinates: detection → validation → architect agent → task generator → file write
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */

import {
  PlanCommandConfig,
  PlanCommandResult,
  PlanPipelineContext,
  PlanErrorCode,
  PlanValidationError
} from './types.js';
import { IncrementDetector } from './increment-detector.js';
import { PlanValidator } from './plan-validator.js';
import { AgentInvoker } from './agent-invoker.js';
import { IncrementStatus } from '../../../core/types/increment-metadata.js';
import { MetadataManager } from '../../../core/increment/metadata-manager.js';
import * as path from 'path';

export class PlanCommandOrchestrator {
  private projectRoot: string;
  private detector: IncrementDetector;
  private validator: PlanValidator;
  private agentInvoker: AgentInvoker;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.detector = new IncrementDetector(projectRoot);
    this.validator = new PlanValidator(projectRoot);
    this.agentInvoker = new AgentInvoker();
  }

  /**
   * Execute /specweave:plan command
   */
  async execute(config: PlanCommandConfig): Promise<PlanCommandResult> {
    const startTime = Date.now();

    try {
      // Step 1: Detect or validate increment
      const incrementId = await this.detectIncrement(config);

      // Create pipeline context
      const context: PlanPipelineContext = {
        config,
        incrementId,
        incrementPath: path.join(this.projectRoot, '.specweave/increments', incrementId),
        specContent: '',
        startTime,
        errors: [],
        warnings: []
      };

      // Step 2: Validate pre-conditions
      const validationResult = await this.validator.validate(incrementId, config);
      context.validationResult = validationResult;
      context.warnings.push(...validationResult.warnings);

      if (!validationResult.valid) {
        return this.createFailureResult(
          incrementId,
          validationResult.errors[0],
          validationResult.warnings,
          startTime
        );
      }

      // Step 3: Read spec.md
      context.specContent = await this.validator.readSpec(incrementId);
      context.existingPlanContent = await this.validator.readExistingPlan(incrementId);
      context.existingTasksContent = await this.validator.readExistingTasks(incrementId);

      // Step 4: Invoke Architect Agent
      const architectResult = await this.agentInvoker.invokeArchitectAgent(context);
      if (architectResult.success) {
        // Use AgentInvoker's temporary plan generation
        // In production Claude Code context, this would be replaced by actual agent output
        context.generatedPlanContent = this.agentInvoker.generateTemporaryPlan(context);
      } else {
        throw new Error(`Architect agent invocation failed: ${architectResult.error}`);
      }

      // Step 5: Invoke Task Generator
      const plannerResult = await this.agentInvoker.invokeTestAwarePlanner(context);
      if (plannerResult.success) {
        // Use AgentInvoker's temporary task generation
        // In production Claude Code context, this would be replaced by actual agent output
        context.generatedTasksContent = this.agentInvoker.generateTemporaryTasks(context);
      } else {
        throw new Error(`Test-aware-planner invocation failed: ${plannerResult.error}`);
      }

      // Step 6: Write files
      await this.writeFiles(context);

      // Step 7: Update metadata
      const statusTransition = await this.updateMetadata(incrementId);

      // Success!
      return {
        success: true,
        incrementId,
        filesCreated: ['plan.md', 'tasks.md'],
        statusTransition,
        warnings: context.warnings,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return this.createFailureResult(
        config.incrementId || 'unknown',
        {
          code: PlanErrorCode.UNKNOWN_ERROR,
          message: error instanceof Error ? error.message : String(error)
        },
        [],
        startTime
      );
    }
  }

  /**
   * Detect or validate increment ID
   */
  private async detectIncrement(config: PlanCommandConfig): Promise<string> {
    if (config.incrementId) {
      // Explicit increment ID provided - validate it
      const validationResult = await this.detector.validate(config.incrementId);

      if (!validationResult.success) {
        throw new Error(validationResult.reason);
      }

      return config.incrementId;
    }

    // Auto-detect increment
    const detectionResult = await this.detector.detect();

    if (!detectionResult.success) {
      throw new Error(detectionResult.reason);
    }

    return detectionResult.incrementId!;
  }

  /**
   * Write plan.md and tasks.md files
   */
  private async writeFiles(context: PlanPipelineContext): Promise<void> {
    const fs = require('fs');
    const planPath = path.join(context.incrementPath, 'plan.md');
    const tasksPath = path.join(context.incrementPath, 'tasks.md');

    if (!context.generatedPlanContent) {
      throw new Error('No plan content generated');
    }

    if (!context.generatedTasksContent) {
      throw new Error('No tasks content generated');
    }

    try {
      fs.writeFileSync(planPath, context.generatedPlanContent, 'utf-8');
      fs.writeFileSync(tasksPath, context.generatedTasksContent, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to write files: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update increment metadata after planning
   */
  private async updateMetadata(
    incrementId: string
  ): Promise<{ from: IncrementStatus; to: IncrementStatus } | undefined> {
    try {
      const metadata = MetadataManager.read(incrementId);

      // Transition PLANNING → ACTIVE (tasks.md now exists)
      if (metadata.status === IncrementStatus.PLANNING) {
        MetadataManager.updateStatus(incrementId, IncrementStatus.ACTIVE);

        return {
          from: IncrementStatus.PLANNING,
          to: IncrementStatus.ACTIVE
        };
      }

      // For other statuses, no transition needed
      // Timestamp will be updated by file write hooks
      return undefined;
    } catch (error) {
      // Non-fatal - just log warning
      console.warn(`Warning: Failed to update metadata: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  /**
   * Create failure result
   */
  private createFailureResult(
    incrementId: string,
    error: PlanValidationError,
    warnings: any[],
    startTime: number
  ): PlanCommandResult {
    return {
      success: false,
      incrementId,
      filesCreated: [],
      error,
      warnings,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Generate placeholder plan.md (temporary - will be replaced with Architect Agent)
   */
  private generatePlaceholderPlan(context: PlanPipelineContext): string {
    return `# Implementation Plan

**Increment**: ${context.incrementId}
**Generated**: ${new Date().toISOString()}

## Overview

This plan will be generated by the Architect Agent based on spec.md.

## Approach

TBD - Architect Agent will provide detailed implementation approach.

## Technical Design

TBD - Architect Agent will provide technical design.

## Dependencies

TBD - Architect Agent will identify dependencies.

## Risks

TBD - Architect Agent will assess risks.

---

*Note: This is a placeholder. Full plan generation coming soon.*
`;
  }

  /**
   * Generate placeholder tasks.md (temporary - will be replaced with TaskGenerator)
   */
  private generatePlaceholderTasks(context: PlanPipelineContext): string {
    return `# Tasks

**Increment**: ${context.incrementId}
**Generated**: ${new Date().toISOString()}

## Tasks

- [ ] **T-001**: Placeholder task 1
- [ ] **T-002**: Placeholder task 2
- [ ] **T-003**: Placeholder task 3

## Notes

Tasks will be generated by test-aware-planner based on plan.md.

---

*Note: This is a placeholder. Full task generation coming soon.*
`;
  }
}
