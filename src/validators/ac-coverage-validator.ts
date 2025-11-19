/**
 * AC Coverage Validator
 *
 * Validates Acceptance Criteria coverage by tasks:
 * - Detects uncovered ACs (ACs with no implementing tasks)
 * - Detects orphan tasks (tasks with no AC linkage)
 * - Builds traceability matrix (AC ↔ Task mapping)
 * - Calculates coverage metrics
 *
 * Used by `/specweave:validate` and `/specweave:done` commands to ensure
 * all acceptance criteria are covered before increment closure.
 */

import path from 'path';
import { existsSync } from 'fs';
import { parseSpecMd, SpecMetadata } from '../generators/spec/spec-parser.js';
import {
  parseTasksWithUSLinks,
  getAllTasks,
  Task,
  TasksByUserStory
} from '../generators/spec/task-parser.js';

/**
 * AC Coverage Report
 */
export interface ACCoverageReport {
  /** Total number of Acceptance Criteria in spec.md */
  totalACs: number;

  /** Number of ACs covered by at least one task */
  coveredACs: number;

  /** AC-IDs with no implementing tasks */
  uncoveredACs: string[];

  /** Task IDs with no satisfiesACs field or invalid AC-IDs */
  orphanTasks: string[];

  /** Coverage percentage (0-100) */
  coveragePercentage: number;

  /** Traceability matrix: AC-ID → Task IDs */
  acToTasksMap: Map<string, string[]>;

  /** Reverse mapping: Task ID → AC-IDs */
  taskToACsMap: Map<string, string[]>;

  /** Per-User Story coverage breakdown */
  coverageByUS: Map<string, USCoverageStats>;

  /** Validation timestamp */
  timestamp: string;
}

/**
 * Coverage statistics per User Story
 */
export interface USCoverageStats {
  /** User Story ID */
  usId: string;

  /** User Story title */
  title: string;

  /** Total ACs for this US */
  totalACs: number;

  /** Covered ACs for this US */
  coveredACs: number;

  /** Coverage percentage for this US */
  coveragePercentage: number;

  /** Uncovered AC-IDs for this US */
  uncoveredACs: string[];
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Allow orphan tasks (default: false) */
  allowOrphans?: boolean;

  /** Minimum coverage percentage required (default: 100) */
  minCoveragePercentage?: number;

  /** Logger for output messages */
  logger?: {
    log: (msg: string) => void;
    error: (msg: string, err?: Error) => void;
    warn: (msg: string) => void;
  };
}

/**
 * Validate AC coverage for an increment
 *
 * @param incrementPath - Path to increment directory (e.g., .specweave/increments/0047-us-task-linkage)
 * @param options - Validation options
 * @returns AC Coverage Report
 * @throws Error if spec.md or tasks.md cannot be read
 */
export function validateACCoverage(
  incrementPath: string,
  options: ValidationOptions = {}
): ACCoverageReport {
  const logger = options.logger ?? console;

  // Validate paths
  const specPath = path.join(incrementPath, 'spec.md');
  const tasksPath = path.join(incrementPath, 'tasks.md');

  if (!existsSync(specPath)) {
    throw new Error(`spec.md not found at ${specPath}`);
  }
  if (!existsSync(tasksPath)) {
    throw new Error(`tasks.md not found at ${tasksPath}`);
  }

  // Parse spec.md to get all ACs
  logger.log('📋 Parsing spec.md to extract Acceptance Criteria...');
  const specMetadata: SpecMetadata = parseSpecMd(specPath);
  logger.log(`   Found ${specMetadata.allACIds.length} Acceptance Criteria across ${specMetadata.userStories.length} User Stories`);

  // Parse tasks.md to get all tasks
  logger.log('📝 Parsing tasks.md to extract tasks...');
  const tasksByUS: TasksByUserStory = parseTasksWithUSLinks(tasksPath);
  const allTasks: Task[] = getAllTasks(tasksByUS);
  logger.log(`   Found ${allTasks.length} tasks`);

  // Build traceability matrices
  logger.log('🔗 Building traceability matrix...');
  const acToTasksMap = new Map<string, string[]>();
  const taskToACsMap = new Map<string, string[]>();
  const orphanTasks: string[] = [];

  // Initialize AC map with empty arrays
  specMetadata.allACIds.forEach(acId => {
    acToTasksMap.set(acId, []);
  });

  // Populate mappings from tasks
  allTasks.forEach(task => {
    if (!task.satisfiesACs || task.satisfiesACs.length === 0) {
      // Task has no AC linkage - mark as orphan
      orphanTasks.push(task.id);
      return;
    }

    // Store task → ACs mapping
    taskToACsMap.set(task.id, task.satisfiesACs);

    // Store AC → tasks mapping
    task.satisfiesACs.forEach(acId => {
      // Only count if AC exists in spec.md (valid AC-ID)
      if (acToTasksMap.has(acId)) {
        const tasks = acToTasksMap.get(acId)!;
        tasks.push(task.id);
      }
    });
  });

  // Calculate coverage
  const uncoveredACs: string[] = [];
  acToTasksMap.forEach((tasks, acId) => {
    if (tasks.length === 0) {
      uncoveredACs.push(acId);
    }
  });

  const coveredACs = specMetadata.allACIds.length - uncoveredACs.length;
  const coveragePercentage = specMetadata.allACIds.length > 0
    ? Math.round((coveredACs / specMetadata.allACIds.length) * 100)
    : 100;

  // Calculate per-US coverage
  const coverageByUS = new Map<string, USCoverageStats>();
  specMetadata.userStories.forEach(us => {
    const usACs = us.acceptanceCriteria;
    const usUncoveredACs = usACs.filter(acId => uncoveredACs.includes(acId));
    const usCoveredACs = usACs.length - usUncoveredACs.length;
    const usCoveragePercentage = usACs.length > 0
      ? Math.round((usCoveredACs / usACs.length) * 100)
      : 100;

    coverageByUS.set(us.id, {
      usId: us.id,
      title: us.title,
      totalACs: usACs.length,
      coveredACs: usCoveredACs,
      coveragePercentage: usCoveragePercentage,
      uncoveredACs: usUncoveredACs
    });
  });

  logger.log(`   Coverage: ${coveredACs}/${specMetadata.allACIds.length} ACs (${coveragePercentage}%)`);
  logger.log(`   Orphan tasks: ${orphanTasks.length}`);

  return {
    totalACs: specMetadata.allACIds.length,
    coveredACs,
    uncoveredACs,
    orphanTasks,
    coveragePercentage,
    acToTasksMap,
    taskToACsMap,
    coverageByUS,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if coverage report passes validation
 *
 * @param report - Coverage report
 * @param options - Validation options
 * @returns True if validation passes, false otherwise
 */
export function isCoveragePassing(
  report: ACCoverageReport,
  options: ValidationOptions = {}
): boolean {
  const minCoverage = options.minCoveragePercentage ?? 100;
  const allowOrphans = options.allowOrphans ?? false;

  // Check coverage percentage
  if (report.coveragePercentage < minCoverage) {
    return false;
  }

  // Check orphan tasks
  if (!allowOrphans && report.orphanTasks.length > 0) {
    return false;
  }

  return true;
}

/**
 * Print detailed coverage report to console
 *
 * @param report - Coverage report
 * @param options - Validation options
 */
export function printCoverageReport(
  report: ACCoverageReport,
  options: ValidationOptions = {}
): void {
  const logger = options.logger ?? console;

  logger.log('\n' + '='.repeat(80));
  logger.log('📊 Acceptance Criteria Coverage Report');
  logger.log('='.repeat(80));

  // Summary
  logger.log('\n📈 Summary:');
  logger.log(`   Total ACs: ${report.totalACs}`);
  logger.log(`   Covered ACs: ${report.coveredACs}`);
  logger.log(`   Uncovered ACs: ${report.uncoveredACs.length}`);
  logger.log(`   Coverage: ${report.coveragePercentage}%`);
  logger.log(`   Orphan Tasks: ${report.orphanTasks.length}`);

  // Overall status
  const passing = isCoveragePassing(report, options);
  if (passing) {
    logger.log('\n✅ VALIDATION PASSED');
  } else {
    logger.log('\n❌ VALIDATION FAILED');
  }

  // Per-User Story breakdown
  if (report.coverageByUS.size > 0) {
    logger.log('\n📋 Coverage by User Story:');
    report.coverageByUS.forEach(stats => {
      const icon = stats.coveragePercentage === 100 ? '✅' : '⚠️';
      logger.log(`   ${icon} ${stats.usId}: ${stats.coveredACs}/${stats.totalACs} ACs (${stats.coveragePercentage}%)`);
    });
  }

  // Uncovered ACs
  if (report.uncoveredACs.length > 0) {
    logger.log('\n⚠️  Uncovered Acceptance Criteria:');
    report.coverageByUS.forEach(stats => {
      if (stats.uncoveredACs.length > 0) {
        logger.log(`   ${stats.usId} - ${stats.title}:`);
        stats.uncoveredACs.forEach(acId => {
          logger.log(`      - ${acId}`);
        });
      }
    });

    logger.log('\n💡 Suggestion: Create tasks that satisfy these ACs or mark them as not applicable');
  }

  // Orphan tasks
  if (report.orphanTasks.length > 0) {
    logger.log('\n⚠️  Orphan Tasks (no AC linkage):');
    report.orphanTasks.forEach(taskId => {
      logger.log(`   - ${taskId}`);
    });

    logger.log('\n💡 Suggestion: Add **Satisfies ACs** field to these tasks');
  }

  // Traceability matrix (only show if requested via debug mode)
  if (process.env.DEBUG) {
    logger.log('\n🔗 Traceability Matrix:');
    report.acToTasksMap.forEach((tasks, acId) => {
      if (tasks.length > 0) {
        logger.log(`   ${acId} ← ${tasks.join(', ')}`);
      }
    });
  }

  logger.log('\n' + '='.repeat(80));
  logger.log(`Generated: ${report.timestamp}\n`);
}

/**
 * Export coverage report to JSON file
 *
 * @param report - Coverage report
 * @param outputPath - Path to output JSON file
 */
export async function exportCoverageReportJSON(
  report: ACCoverageReport,
  outputPath: string
): Promise<void> {
  const fs = await import('fs-extra');

  // Convert Maps to plain objects for JSON serialization
  const serializable = {
    totalACs: report.totalACs,
    coveredACs: report.coveredACs,
    uncoveredACs: report.uncoveredACs,
    orphanTasks: report.orphanTasks,
    coveragePercentage: report.coveragePercentage,
    acToTasksMap: Object.fromEntries(report.acToTasksMap),
    taskToACsMap: Object.fromEntries(report.taskToACsMap),
    coverageByUS: Object.fromEntries(report.coverageByUS),
    timestamp: report.timestamp
  };

  await fs.writeJSON(outputPath, serializable, { spaces: 2 });
}

/**
 * Get recommended actions based on coverage report
 *
 * @param report - Coverage report
 * @returns Array of recommended actions
 */
export function getRecommendedActions(report: ACCoverageReport): string[] {
  const actions: string[] = [];

  if (report.uncoveredACs.length > 0) {
    actions.push(
      `Create tasks to satisfy ${report.uncoveredACs.length} uncovered AC(s): ${report.uncoveredACs.slice(0, 3).join(', ')}${report.uncoveredACs.length > 3 ? '...' : ''}`
    );
  }

  if (report.orphanTasks.length > 0) {
    actions.push(
      `Add **Satisfies ACs** field to ${report.orphanTasks.length} orphan task(s): ${report.orphanTasks.slice(0, 3).join(', ')}${report.orphanTasks.length > 3 ? '...' : ''}`
    );
  }

  if (report.coveragePercentage < 100) {
    const gap = 100 - report.coveragePercentage;
    actions.push(`Increase coverage by ${gap}% to reach 100% target`);
  }

  // Check for User Stories with low coverage
  report.coverageByUS.forEach(stats => {
    if (stats.coveragePercentage < 80) {
      actions.push(`User Story ${stats.usId} has low coverage (${stats.coveragePercentage}%) - prioritize tasks for this US`);
    }
  });

  return actions;
}
