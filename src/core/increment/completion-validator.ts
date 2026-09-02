import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import { ACStatusManager } from './ac-status-manager.js';
import { parseTasksWithUSLinks } from '../../generators/spec/task-parser.js';
import type { Logger } from '../../utils/logger.js';
import { consoleLogger } from '../../utils/logger.js';
import { ExternalToolDriftDetector } from '../../utils/external-tool-drift-detector.js';
import { validateCoverage, type TestMode } from '../qa/coverage-validator.js';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';

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
   * 2. All tasks are done or skipped (ledger.jsonl fold, tasks.md checkbox fallback)
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
    options: { logger?: Logger; blockOnP0Orphans?: boolean; reason?: string } = {}
  ): Promise<ValidationResult> {
    const logger = options.logger ?? consoleLogger;
    const blockOnP0Orphans = options.blockOnP0Orphans ?? true; // Default: block for P0 orphans
    const reason = options.reason?.trim();
    const errors: string[] = [];
    const warnings: string[] = [];
    // With --reason, incomplete work is recorded, not blocked.
    const blocking = (msg: string) => (reason ? warnings.push(`${msg} (closing anyway — reason: ${reason})`) : errors.push(msg));
    const incrementPath = path.join(resolveEffectiveRoot(), '.specweave', 'increments', incrementId);

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
      blocking(`${openACs} acceptance criteria still open`);
    }

    // Count pending tasks
    const pendingTasks = await this.countPendingTasks(incrementId);
    if (pendingTasks > 0) {
      blocking(`${pendingTasks} tasks still pending`);
    }

    // NEW (v0.23.0): Validate AC coverage
    try {
      const acManager = new ACStatusManager(resolveEffectiveRoot());
      const coverageResult = await this.validateACCoverage(incrementId, specPath, tasksPath, acManager);

      // CRITICAL: Block closure if P0 ACs are orphaned
      if (blockOnP0Orphans && coverageResult.orphanedP0.length > 0) {
        blocking(
          `CRITICAL: ${coverageResult.orphanedP0.length} P0 Acceptance Criteria have no implementing tasks:\n` +
          coverageResult.orphanedP0.map(ac => `    • ${ac.acId}: ${ac.description} (${ac.priority})`).join('\n') +
          `\n\n  All P0 ACs MUST have at least one task with **Satisfies ACs** field.\n` +
          `  Run: specweave verify ${incrementId} for a detailed coverage report.`
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
      const driftDetector = new ExternalToolDriftDetector(resolveEffectiveRoot(), { logger });
      const drift = await driftDetector.detectDrift(incrementId);

      if (drift.externalToolsConfigured && drift.hasDrift) {
        const hoursSince = drift.hoursSinceSync || 0;

        // Drift > 7 days (168 hours): strong warning (non-blocking)
        // External tools will be synced by onIncrementDone() after completion.
        if (hoursSince > 168) {
          warnings.push(
            `⚠️  External tools severely out of sync (${Math.floor(hoursSince / 168)} weeks)!\n` +
            `    Last sync: ${drift.lastSyncTime ? drift.lastSyncTime.toISOString() : 'NEVER'}\n\n` +
            `  External tools (GitHub/JIRA/ADO) are stale but will be synced on completion.\n` +
            `  To sync manually first: sw:sync-progress ${incrementId}`
          );
        }
        // WARNING: Drift > 24h but < 7 days (non-blocking, but strongly recommended)
        else if (hoursSince > 24) {
          const daysAgo = Math.floor(hoursSince / 24);
          warnings.push(
            `⚠️  External tools not synced recently (${daysAgo} days ago)\n` +
            `    Last sync: ${drift.lastSyncTime ? drift.lastSyncTime.toISOString() : 'NEVER'}\n\n` +
            `  Recommendation: Run sw:sync-progress ${incrementId} before closing\n` +
            `  This ensures GitHub/JIRA/ADO reflect latest progress.`
          );
        }
      }
    } catch (error) {
      logger.warn(`Drift detection failed: ${error instanceof Error ? error.message : String(error)}`);
      warnings.push('External tool drift detection skipped due to error');
    }

    // 2.0 closure gate: reports/verify.json (written by `specweave verify`) is
    // the ONLY hard gate. Grill / judge-llm / code-review / rubric reports are
    // optional evidence and never block. `--reason` downgrades every blocking
    // finding to a warning (the reason is stored as metadata.closeReason).
    try {
      const { checkClosureGate } = await import('../tasks/closure-gate.js');
      const gate = checkClosureGate(incrementPath, incrementId, { reason: options.reason });
      errors.push(...gate.errors);
      warnings.push(...gate.notices);
    } catch (error) {
      logger.warn(`Closure gate check failed: ${error instanceof Error ? error.message : String(error)}`);
      warnings.push('Closure gate check skipped due to error');
    }

    // Optional evidence: a code-review report still feeds skill-refinement
    // signals. Read-only — findings never block closure in 2.0.
    try {
      const codeReviewPath = path.join(incrementPath, 'reports', 'code-review-report.json');
      if (await fs.pathExists(codeReviewPath)) {
        const report = JSON.parse(await fs.readFile(codeReviewPath, 'utf-8'));
        await this.emitCodeReviewRefinementSignals(report, incrementId, resolveEffectiveRoot());
      }
    } catch {
      // Best-effort: signal emission must never affect closure.
    }

    // NEW (v1.0.105): Test coverage validation for TDD increments
    // Validates that coverage meets target when testMode != 'none' and coverageTarget > 0
    // See: ADR-0163 (TDD Enforcement Implementation)
    try {
      const metadataPath = path.join(incrementPath, 'metadata.json');
      if (await fs.pathExists(metadataPath)) {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        const testMode = (metadata.testMode || 'TDD') as TestMode;

        // Resolve coverage target: config.json > metadata.json fallback
        let coverageTarget = metadata.coverageTarget ?? 0;
        try {
          const configPath = path.join(resolveEffectiveRoot(), '.specweave', 'config.json');
          if (await fs.pathExists(configPath)) {
            const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
            const configTarget = config?.testing?.coverage?.unit;
            if (typeof configTarget === 'number') {
              coverageTarget = configTarget;
            }
          }
        } catch {
          // Config read failed — fall back to metadata target
        }

        // Only validate if coverage target is set and testMode is not 'none'
        if (coverageTarget > 0 && testMode !== 'none') {
          const coverageResult = await validateCoverage({
            projectRoot: resolveEffectiveRoot(),
            coverageTarget,
            testMode,
          });

          if (coverageResult.skipped) {
            logger.info(`Coverage validation skipped: ${coverageResult.reason}`);
          } else if (!coverageResult.passed) {
            // 2.0: coverage is evidence, not a gate — reports/verify.json is the
            // only hard closure gate. Surface the shortfall as a warning.
            const details = coverageResult.details;
            let detailsStr = '';
            if (details) {
              detailsStr = `\n    Lines: ${details.lines.toFixed(1)}% | Functions: ${details.functions.toFixed(1)}% | Branches: ${details.branches.toFixed(1)}%`;
            }
            warnings.push(
              `Test coverage below target (${coverageResult.actual.toFixed(1)}% < ${coverageTarget}%)${detailsStr}\n` +
              `    ${coverageResult.reason}\n` +
              `    File: ${coverageResult.coverageFile || 'not found'}`
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
   * 0671 T-006: emit refinement signals from code-reviewer findings.
   *
   * Iterates the `findings[]` array from `code-review-report.json`, keeps
   * CRITICAL and HIGH severity entries, and delegates each to the shared
   * `emitRefinementIfAttributable` pipeline. Precision matters — a finding
   * that doesn't trace to a specific skill (direct slug or ≥6-word SKILL.md
   * phrase) produces no signal.
   *
   * Per AC-US1-03 the emitted severity is always `"high"` — the source
   * code-reviewer severity is the *finding* severity, but a refinement
   * signal with source="code-reviewer" is always treated as high-priority
   * advice for the target skill.
   *
   * Best-effort: all I/O errors are swallowed so closure validation is
   * never blocked by signal persistence issues.
   */
  static async emitCodeReviewRefinementSignals(
    report: any,
    incrementId: string,
    projectRoot: string
  ): Promise<void> {
    const findings = Array.isArray(report?.findings) ? report.findings : [];
    if (findings.length === 0) return;

    const skillsRoot = path.join(projectRoot, 'plugins', 'specweave', 'skills');

    const { attributeSkill } = await import('../skill-attribution.js');
    const { emitRefinementIfAttributable } = await import(
      '../skill-signal-emit.js'
    );

    // Dedupe: one signal per distinct skill, earliest (highest-severity)
    // finding wins since we iterate critical before high.
    const perSkillEvidence = new Map<string, string>();

    const orderedFindings = [...findings].sort((a, b) => {
      const rank = (s: string) =>
        s === 'critical' ? 2 : s === 'high' ? 1 : 0;
      return (
        rank(String(b?.severity ?? '').toLowerCase()) -
        rank(String(a?.severity ?? '').toLowerCase())
      );
    });

    for (const finding of orderedFindings) {
      const severity = String(finding?.severity ?? '').toLowerCase();
      if (severity !== 'critical' && severity !== 'high') continue;

      const evidenceText = [
        finding?.title,
        finding?.description,
        finding?.message,
        finding?.recommendation,
        finding?.category,
        finding?.file,
      ]
        .filter((s: unknown) => typeof s === 'string' && s.length > 0)
        .join(' | ');
      if (!evidenceText) continue;

      const attrib = attributeSkill({ evidenceText, skillsRoot });
      if (!attrib.skill) continue;
      if (perSkillEvidence.has(attrib.skill)) continue;
      perSkillEvidence.set(attrib.skill, evidenceText);
    }

    for (const [skill, evidence] of perSkillEvidence) {
      try {
        await emitRefinementIfAttributable({
          projectRoot,
          source: 'code-reviewer',
          severity: 'high',
          incrementId,
          evidence,
          attribution: { toolCallOrigin: skill },
        });
      } catch {
        // Best-effort: signal I/O must not break closure validation.
      }
    }
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

    // Parse all ACs from spec.md
    const allACs = this.parseAllACsWithPriority(specContent);

    // Parse tasks to find AC references (pass file path, not content)
    const tasksByUS = parseTasksWithUSLinks(tasksPath);

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
    const specPath = path.join(resolveEffectiveRoot(), '.specweave', 'increments', incrementId, 'spec.md');

    const content = await fs.readFile(specPath, 'utf-8');

    // Match unchecked ACs: - [ ] **AC-
    // Must be at start of line (^), followed by - [ ], then **AC-
    const openACPattern = /^- \[ \] \*\*AC-/gm;
    const matches = content.match(openACPattern) || [];

    return matches.length;
  }

  /**
   * Count tasks that are neither done nor skipped.
   *
   * Uses the task board (ledger.jsonl fold, falling back to the tasks.md
   * checkbox / `**Status**` line for tasks without ledger events), so the
   * closure gate and `specweave task list` never disagree.
   *
   * @param incrementId - The increment ID
   * @returns Number of pending tasks
   */
  static async countPendingTasks(incrementId: string): Promise<number> {
    const incrementPath = path.join(resolveEffectiveRoot(), '.specweave', 'increments', incrementId);
    const { loadTaskBoard } = await import('../tasks/task-board.js');
    const board = loadTaskBoard(incrementPath);
    return board.counts.total - board.counts.done - board.counts.skipped;
  }

}
