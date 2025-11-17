/**
 * Plan Validator
 *
 * Validates pre-conditions before generating plan.md and tasks.md:
 * - spec.md exists and is not empty
 * - Increment is in suitable state
 * - plan.md/tasks.md don't exist (unless force=true)
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */

import {
  PlanValidationResult,
  PlanValidationError,
  PlanValidationWarning,
  PlanErrorCode,
  PlanWarningCode,
  PlanCommandConfig
} from './types.js';
import { MetadataManager } from '../../../core/increment/metadata-manager.js';
import { IncrementStatus } from '../../../core/types/increment-metadata.js';
import * as fs from 'fs';
import * as path from 'path';

export class PlanValidator {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Validate increment is ready for planning
   */
  async validate(
    incrementId: string,
    config: PlanCommandConfig
  ): Promise<PlanValidationResult> {
    const errors: PlanValidationError[] = [];
    const warnings: PlanValidationWarning[] = [];

    const incrementPath = path.join(this.projectRoot, '.specweave/increments', incrementId);
    const specPath = path.join(incrementPath, 'spec.md');
    const planPath = path.join(incrementPath, 'plan.md');
    const tasksPath = path.join(incrementPath, 'tasks.md');

    // 1. Check spec.md exists
    if (!fs.existsSync(specPath)) {
      errors.push({
        code: PlanErrorCode.SPEC_NOT_FOUND,
        message: `spec.md not found in increment '${incrementId}'`,
        suggestion: 'Create spec.md first using `/specweave:increment` or manually'
      });
      // Early return - can't proceed without spec
      return { valid: false, errors, warnings };
    }

    // 2. Check spec.md is not empty
    const specContent = fs.readFileSync(specPath, 'utf-8').trim();
    if (specContent.length === 0) {
      errors.push({
        code: PlanErrorCode.SPEC_EMPTY,
        message: `spec.md is empty in increment '${incrementId}'`,
        suggestion: 'Add specification content to spec.md before generating plan'
      });
      return { valid: false, errors, warnings };
    }

    // 3. Validate spec.md content quality (warnings only)
    if (specContent.length < 500) {
      warnings.push({
        code: PlanWarningCode.SPEC_TOO_SHORT,
        message: `spec.md is very short (${specContent.length} chars). Plan quality may be limited.`
      });
    }

    if (specContent.length > 50000) {
      warnings.push({
        code: PlanWarningCode.SPEC_TOO_LONG,
        message: `spec.md is very long (${specContent.length} chars). Consider breaking into multiple increments.`
      });
    }

    // Check for Acceptance Criteria
    if (!this.hasAcceptanceCriteria(specContent)) {
      warnings.push({
        code: PlanWarningCode.NO_ACCEPTANCE_CRITERIA,
        message: 'spec.md does not contain Acceptance Criteria section. Tasks may be less testable.'
      });
    }

    // 4. Check increment status
    try {
      const metadata = MetadataManager.read(incrementId);

      // Block if increment is closed
      if (metadata.status === IncrementStatus.COMPLETED ||
          metadata.status === IncrementStatus.ABANDONED) {
        errors.push({
          code: PlanErrorCode.INVALID_INCREMENT_STATUS,
          message: `Cannot generate plan for ${metadata.status} increment`,
          suggestion: 'Reopen increment with `/specweave:reopen` first'
        });
      }
    } catch (error) {
      errors.push({
        code: PlanErrorCode.METADATA_UPDATE_FAILED,
        message: `Failed to read metadata: ${error instanceof Error ? error.message : String(error)}`,
        suggestion: 'Check metadata.json exists and is valid JSON'
      });
    }

    // 5. Check if plan.md already exists
    if (fs.existsSync(planPath)) {
      if (!config.force) {
        errors.push({
          code: PlanErrorCode.PLAN_ALREADY_EXISTS,
          message: `plan.md already exists in increment '${incrementId}'`,
          suggestion: 'Use --force to overwrite existing plan.md'
        });
      } else {
        warnings.push({
          code: PlanWarningCode.OVERWRITING_EXISTING_PLAN,
          message: 'Overwriting existing plan.md (--force enabled)'
        });
      }
    }

    // 6. Check if tasks.md already exists
    if (fs.existsSync(tasksPath)) {
      if (!config.force) {
        errors.push({
          code: PlanErrorCode.TASKS_ALREADY_EXIST,
          message: `tasks.md already exists in increment '${incrementId}'`,
          suggestion: 'Use --force to overwrite existing tasks.md'
        });
      } else {
        warnings.push({
          code: PlanWarningCode.OVERWRITING_EXISTING_TASKS,
          message: 'Overwriting existing tasks.md (--force enabled)'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if spec.md has Acceptance Criteria section
   */
  private hasAcceptanceCriteria(specContent: string): boolean {
    const acPatterns = [
      /##\s+Acceptance\s+Criteria/i,
      /##\s+ACs/i,
      /##\s+Success\s+Criteria/i,
      /##\s+Definition\s+of\s+Done/i
    ];

    return acPatterns.some(pattern => pattern.test(specContent));
  }

  /**
   * Read spec.md content
   */
  async readSpec(incrementId: string): Promise<string> {
    const incrementPath = path.join(this.projectRoot, '.specweave/increments', incrementId);
    const specPath = path.join(incrementPath, 'spec.md');

    if (!fs.existsSync(specPath)) {
      throw new Error(`spec.md not found in increment '${incrementId}'`);
    }

    return fs.readFileSync(specPath, 'utf-8');
  }

  /**
   * Read existing plan.md content (if exists)
   */
  async readExistingPlan(incrementId: string): Promise<string | undefined> {
    const incrementPath = path.join(this.projectRoot, '.specweave/increments', incrementId);
    const planPath = path.join(incrementPath, 'plan.md');

    if (!fs.existsSync(planPath)) {
      return undefined;
    }

    return fs.readFileSync(planPath, 'utf-8');
  }

  /**
   * Read existing tasks.md content (if exists)
   */
  async readExistingTasks(incrementId: string): Promise<string | undefined> {
    const incrementPath = path.join(this.projectRoot, '.specweave/increments', incrementId);
    const tasksPath = path.join(incrementPath, 'tasks.md');

    if (!fs.existsSync(tasksPath)) {
      return undefined;
    }

    return fs.readFileSync(tasksPath, 'utf-8');
  }
}
