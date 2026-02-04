import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import { ACStatusManager } from './ac-status-manager.js';
import { parseTasksWithUSLinks } from '../../generators/spec/task-parser.js';
import type { Logger } from '../../utils/logger.js';
import { consoleLogger } from '../../utils/logger.js';
import { ExternalToolDriftDetector } from '../../utils/external-tool-drift-detector.js';
import { validateCoverage, type TestMode } from '../qa/coverage-validator.js';

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
   * 5. NEW (v0.26.2): External tool drift detection
   *    - Warns if external tools (GitHub/JIRA/ADO) not synced in >24h
   *    - Blocks closure if drift >7 days (critical staleness)
   *    - Prevents "completed locally but external tools never updated" scenarios
   * 6. NEW (v1.0.105): Test coverage validation
   *    - Validates coverage meets target when coverageTarget > 0
   *    - Warns (non-blocking) if coverage is below target
   *    - Supports Istanbul, c8, Jest, lcov, Cobertura formats
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
          `  Run: /sw:validate ${incrementId} for detailed coverage report.`
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

    // NEW (v0.26.2): Detect external tool drift
    // Warns if external tools (GitHub/JIRA/ADO) haven't been synced in >24h
    // This prevents "completed locally but external tools never updated" scenarios
    // See: ADR-0131 (External Tool Sync Context Detection)
    try {
      const driftDetector = new ExternalToolDriftDetector(process.cwd(), { logger });
      const drift = await driftDetector.detectDrift(incrementId);

      if (drift.externalToolsConfigured && drift.hasDrift) {
        const hoursSince = drift.hoursSinceSync || 0;

        // CRITICAL: Block closure if drift > 7 days (168 hours)
        if (hoursSince > 168) {
          errors.push(
            `CRITICAL: External tools severely out of sync (${Math.floor(hoursSince / 168)} weeks)!\n` +
            `    Last sync: ${drift.lastSyncTime ? drift.lastSyncTime.toISOString() : 'NEVER'}\n\n` +
            `  External tools (GitHub/JIRA/ADO) are critically stale.\n` +
            `  Run: /sw:sync-progress ${incrementId} before closing.\n\n` +
            `  Closing without sync will leave external tools outdated.`
          );
        }
        // WARNING: Drift > 24h but < 7 days (non-blocking, but strongly recommended)
        else if (hoursSince > 24) {
          const daysAgo = Math.floor(hoursSince / 24);
          warnings.push(
            `⚠️  External tools not synced recently (${daysAgo} days ago)\n` +
            `    Last sync: ${drift.lastSyncTime ? drift.lastSyncTime.toISOString() : 'NEVER'}\n\n` +
            `  Recommendation: Run /sw:sync-progress ${incrementId} before closing\n` +
            `  This ensures GitHub/JIRA/ADO reflect latest progress.`
          );
        }
      }
    } catch (error) {
      logger.warn(`Drift detection failed: ${error instanceof Error ? error.message : String(error)}`);
      warnings.push('External tool drift detection skipped due to error');
    }

    // NEW (v1.0.228): Grill validation - code review before closure
    // Requires /sw:grill to be run before /sw:done
    // Creates marker file at .specweave/state/.sw-grill-passed-{incrementId}
    // See: CLAUDE.md "Grill" section
    try {
      const grillValidation = await IncrementCompletionValidator.validateGrillPassed(incrementId);
      if (!grillValidation.passed) {
        errors.push(grillValidation.error!);
      }
    } catch (error) {
      logger.warn(`Grill validation check failed: ${error instanceof Error ? error.message : String(error)}`);
      // Don't add to warnings - missing marker is an error, not a warning
    }

    // NEW (v1.0.105): Test coverage validation for TDD increments
    // Validates that coverage meets target when testMode != 'none' and coverageTarget > 0
    // See: ADR-0163 (TDD Enforcement Implementation)
    try {
      const metadataPath = path.join(incrementPath, 'metadata.json');
      if (await fs.pathExists(metadataPath)) {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        const testMode = (metadata.testMode || 'test-after') as TestMode;
        const coverageTarget = metadata.coverageTarget ?? 0;

        // Only validate if coverage target is set and testMode is not 'none'
        if (coverageTarget > 0 && testMode !== 'none') {
          const coverageResult = await validateCoverage({
            projectRoot: process.cwd(),
            coverageTarget,
            testMode,
          });

          if (coverageResult.skipped) {
            logger.info(`Coverage validation skipped: ${coverageResult.reason}`);
          } else if (!coverageResult.passed) {
            // Coverage below target - WARNING only, not blocking
            const details = coverageResult.details;
            let detailsStr = '';
            if (details) {
              detailsStr = `\n    Lines: ${details.lines.toFixed(1)}% | Functions: ${details.functions.toFixed(1)}% | Branches: ${details.branches.toFixed(1)}%`;
            }
            warnings.push(
              `⚠️  Test coverage below target (${coverageResult.actual.toFixed(1)}% < ${coverageTarget}%)${detailsStr}\n` +
              `    ${coverageResult.reason}\n` +
              `    File: ${coverageResult.coverageFile || 'not found'}\n\n` +
              `  Consider running tests with --coverage and improving coverage before closing.`
            );
          } else {
            // Coverage passed - log success
            logger.info(`✓ Coverage validation passed: ${coverageResult.actual.toFixed(1)}% >= ${coverageTarget}%`);
          }
        }
      }
    } catch (error) {
      logger.warn(`Coverage validation failed: ${error instanceof Error ? error.message : String(error)}`);
      warnings.push('Coverage validation skipped due to error');
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

  /**
   * Validate that the grill has passed for this increment (NEW - v1.0.228)
   *
   * Checks for marker file at .specweave/state/.sw-grill-passed-{incrementId}
   * This marker is created by /sw:grill when the code review passes.
   *
   * Can be disabled via config: { "grill": { "required": false } }
   *
   * @param incrementId - The increment ID
   * @returns Validation result with passed status and optional error message
   *
   * @example
   * ```typescript
   * const result = await IncrementCompletionValidator.validateGrillPassed('0042-feature');
   * if (!result.passed) {
   *   console.error(result.error);
   * }
   * ```
   */
  static async validateGrillPassed(
    incrementId: string
  ): Promise<{ passed: boolean; error?: string }> {
    const stateDir = path.join(process.cwd(), '.specweave', 'state');
    const configPath = path.join(process.cwd(), '.specweave', 'config.json');

    // Check if grill is required (default: true)
    let grillRequired = true;
    try {
      if (await fs.pathExists(configPath)) {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        // Allow disabling via config: { "grill": { "required": false } }
        if (config.grill?.required === false) {
          grillRequired = false;
        }
      }
    } catch {
      // Config parsing failed, assume grill is required
    }

    if (!grillRequired) {
      return { passed: true };
    }

    // Check for grill marker file
    const grillMarkerPath = path.join(stateDir, `.sw-grill-passed-${incrementId}`);

    if (await fs.pathExists(grillMarkerPath)) {
      return { passed: true };
    }

    // Grill marker not found - return error
    return {
      passed: false,
      error:
        `🔥 GRILL REQUIRED: Code review not completed for ${incrementId}\n\n` +
        `  The /sw:grill command must be run before closing an increment.\n` +
        `  This ensures code quality is validated by a critical review.\n\n` +
        `  Run: /sw:grill ${incrementId}\n\n` +
        `  After grill passes, you can run: /sw:done ${incrementId}\n\n` +
        `  To disable grill requirement (not recommended):\n` +
        `  Add to .specweave/config.json: { "grill": { "required": false } }`
    };
  }
}
