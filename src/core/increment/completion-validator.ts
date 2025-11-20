import * as fs from 'fs-extra';
import * as path from 'path';
import { ACStatusManager } from './ac-status-manager.js';
import { parseTasksWithUSLinks } from '../../generators/spec/task-parser.js';
import type { Logger } from '../../utils/logger.js';
import { consoleLogger } from '../../utils/logger.js';

/**
 * Validation result for increment completion
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validates that an increment is ready for completion
 * by checking that all ACs are completed and all tasks are done.
 *
 * This prevents false completion where status is marked "completed"
 * but work is still open.
 */
export class IncrementCompletionValidator {
  /**
   * Validate that an increment is ready for completion
   *
   * Checks:
   * 1. All acceptance criteria are checked (- [x] **AC-...)
   * 2. All tasks are completed (**Status**: [x] completed)
   * 3. Required files exist (spec.md, tasks.md)
   * 4. NEW (v0.23.0): AC coverage validation
   *    - All P0 ACs have at least one implementing task
   *    - No orphan tasks (all tasks reference valid ACs)
   *
   * @param incrementId - The increment ID to validate
   * @param options - Validation options
   * @returns ValidationResult with isValid and errors array
   *
   * @example
   * ```typescript
   * const result = await IncrementCompletionValidator.validateCompletion('0043-spec-md-desync-fix');
   * if (!result.isValid) {
   *   console.error('Cannot complete increment:');
   *   result.errors.forEach(err => console.error(`  - ${err}`));
   * }
   * ```
   */
  static async validateCompletion(
    incrementId: string,
    options: { logger?: Logger; blockOnP0Orphans?: boolean } = {}
  ): Promise<ValidationResult> {
    const logger = options.logger ?? consoleLogger;
    const blockOnP0Orphans = options.blockOnP0Orphans ?? true; // Default: block for P0 orphans
    const errors: string[] = [];
    const warnings: string[] = [];
    const incrementPath = path.join(process.cwd(), '.specweave', 'increments', incrementId);

    // Check that required files exist
    const specPath = path.join(incrementPath, 'spec.md');
    const tasksPath = path.join(incrementPath, 'tasks.md');

    const specExists = await fs.pathExists(specPath);
    const tasksExists = await fs.pathExists(tasksPath);

    if (!specExists) {
      errors.push('spec.md not found');
    }

    if (!tasksExists) {
      errors.push('tasks.md not found');
    }

    // If files don't exist, return early
    if (!specExists || !tasksExists) {
      return {
        isValid: false,
        errors,
        warnings
      };
    }

    // Count open acceptance criteria
    const openACs = await this.countOpenACs(incrementId);
    if (openACs > 0) {
      errors.push(`${openACs} acceptance criteria still open`);
    }

    // Count pending tasks
    const pendingTasks = await this.countPendingTasks(incrementId);
    if (pendingTasks > 0) {
      errors.push(`${pendingTasks} tasks still pending`);
    }

    // NEW (v0.23.0): Validate AC coverage
    try {
      const acManager = new ACStatusManager(process.cwd());
      const coverageResult = await this.validateACCoverage(incrementId, specPath, tasksPath, acManager);

      // CRITICAL: Block closure if P0 ACs are orphaned
      if (blockOnP0Orphans && coverageResult.orphanedP0.length > 0) {
        errors.push(
          `CRITICAL: ${coverageResult.orphanedP0.length} P0 Acceptance Criteria have no implementing tasks:\n` +
          coverageResult.orphanedP0.map(ac => `    • ${ac.acId}: ${ac.description} (${ac.priority})`).join('\n') +
          `\n\n  All P0 ACs MUST have at least one task with **Satisfies ACs** field.\n` +
          `  Run: /specweave:validate ${incrementId} for detailed coverage report.`
        );
      }

      // Warn about orphan P1/P2 ACs (non-blocking)
      if (coverageResult.orphanedP1P2.length > 0) {
        warnings.push(
          `${coverageResult.orphanedP1P2.length} P1/P2 ACs have no tasks (OK if deferred):\n` +
          coverageResult.orphanedP1P2.map(ac => `    • ${ac.acId}: ${ac.description} (${ac.priority})`).join('\n')
        );
      }

      // Warn about orphan tasks (no AC references)
      if (coverageResult.orphanTasks.length > 0) {
        warnings.push(
          `${coverageResult.orphanTasks.length} tasks have no **Satisfies ACs** field:\n` +
          coverageResult.orphanTasks.map(taskId => `    • ${taskId}`).join('\n') +
          `\n  Add AC references to improve traceability.`
        );
      }
    } catch (error) {
      logger.warn(`AC coverage validation failed: ${error instanceof Error ? error.message : String(error)}`);
      warnings.push('AC coverage validation skipped due to error');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate AC coverage (NEW - v0.23.0)
   *
   * Checks that all Acceptance Criteria have implementing tasks
   * and detects orphan tasks (tasks with no AC references).
   *
   * @param incrementId - The increment ID
   * @param specPath - Path to spec.md
   * @param tasksPath - Path to tasks.md
   * @param acManager - ACStatusManager instance
   * @returns Coverage validation result
   */
  private static async validateACCoverage(
    incrementId: string,
    specPath: string,
    tasksPath: string,
    acManager: ACStatusManager
  ): Promise<{
    orphanedP0: Array<{ acId: string; description: string; priority: string }>;
    orphanedP1P2: Array<{ acId: string; description: string; priority: string }>;
    orphanTasks: string[];
  }> {
    const specContent = await fs.readFile(specPath, 'utf-8');
    const tasksContent = await fs.readFile(tasksPath, 'utf-8');

    // Parse all ACs from spec.md
    const allACs = this.parseAllACsWithPriority(specContent);

    // Parse tasks to find AC references
    const tasksByUS = parseTasksWithUSLinks(tasksContent);

    // Flatten tasks from TasksByUserStory to simple array
    const allTasks = Object.values(tasksByUS).flat();

    // Build AC coverage map
    const acToTasksMap = new Map<string, string[]>();
    const tasksWithACs = new Set<string>();

    for (const task of allTasks) {
      if (task.satisfiesACs && task.satisfiesACs.length > 0) {
        tasksWithACs.add(task.id);
        for (const acId of task.satisfiesACs) {
          if (!acToTasksMap.has(acId)) {
            acToTasksMap.set(acId, []);
          }
          acToTasksMap.get(acId)!.push(task.id);
        }
      }
    }

    // Detect orphaned ACs (by priority)
    const orphanedP0: Array<{ acId: string; description: string; priority: string }> = [];
    const orphanedP1P2: Array<{ acId: string; description: string; priority: string }> = [];

    for (const ac of allACs) {
      const tasksCovering = acToTasksMap.get(ac.acId) || [];
      if (tasksCovering.length === 0) {
        // AC has no implementing tasks
        if (ac.priority === 'P0') {
          orphanedP0.push(ac);
        } else {
          orphanedP1P2.push(ac);
        }
      }
    }

    // Detect orphan tasks (no AC references)
    const orphanTasks: string[] = [];
    for (const task of allTasks) {
      if (!task.satisfiesACs || task.satisfiesACs.length === 0) {
        orphanTasks.push(task.id);
      }
    }

    return {
      orphanedP0,
      orphanedP1P2,
      orphanTasks
    };
  }

  /**
   * Parse all ACs from spec.md with priority detection
   *
   * @param specContent - Content of spec.md
   * @returns Array of ACs with their priorities
   */
  private static parseAllACsWithPriority(
    specContent: string
  ): Array<{ acId: string; description: string; priority: string }> {
    const acs: Array<{ acId: string; description: string; priority: string }> = [];
    const lines = specContent.split('\n');

    let currentACId: string | null = null;
    let currentDescription: string | null = null;
    let currentPriority = 'P1'; // Default priority

    for (const line of lines) {
      // Match AC lines: - [x] **AC-US1-01**: Description
      const acMatch = line.match(/^-\s*\[[ x]\]\s*\*\*([A-Z]{2}-[A-Z0-9]+-\d+)\*\*:\s*(.+)/);
      if (acMatch) {
        // Save previous AC if exists
        if (currentACId && currentDescription) {
          acs.push({
            acId: currentACId,
            description: currentDescription,
            priority: currentPriority
          });
        }

        // Start new AC
        currentACId = acMatch[1];
        currentDescription = acMatch[2].trim();
        currentPriority = 'P1'; // Reset to default
        continue;
      }

      // Match priority lines: - **Priority**: P0 (Critical)
      const priorityMatch = line.match(/^\s*-\s*\*\*Priority\*\*:\s*(P[0-3])/);
      if (priorityMatch && currentACId) {
        currentPriority = priorityMatch[1];
      }
    }

    // Save last AC
    if (currentACId && currentDescription) {
      acs.push({
        acId: currentACId,
        description: currentDescription,
        priority: currentPriority
      });
    }

    return acs;
  }

  /**
   * Count open (unchecked) acceptance criteria in spec.md
   *
   * Searches for pattern: - [ ] **AC-
   *
   * @param incrementId - The increment ID
   * @returns Number of open ACs
   */
  static async countOpenACs(incrementId: string): Promise<number> {
    const specPath = path.join(process.cwd(), '.specweave', 'increments', incrementId, 'spec.md');

    const content = await fs.readFile(specPath, 'utf-8');

    // Match unchecked ACs: - [ ] **AC-
    // Must be at start of line (^), followed by - [ ], then **AC-
    const openACPattern = /^- \[ \] \*\*AC-/gm;
    const matches = content.match(openACPattern) || [];

    return matches.length;
  }

  /**
   * Count pending tasks in tasks.md
   *
   * Searches for pattern: **Status**: [ ] pending
   *
   * @param incrementId - The increment ID
   * @returns Number of pending tasks
   */
  static async countPendingTasks(incrementId: string): Promise<number> {
    const tasksPath = path.join(process.cwd(), '.specweave', 'increments', incrementId, 'tasks.md');

    const content = await fs.readFile(tasksPath, 'utf-8');

    // Match pending tasks: **Status**: [ ] pending
    // Case-insensitive, handles variations in whitespace
    const pendingPattern = /\*\*Status\*\*:\s*\[\s*\]\s*pending/gi;
    const matches = content.match(pendingPattern) || [];

    return matches.length;
  }
}
