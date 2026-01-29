/**
 * Doctor - main diagnostic orchestrator for SpecWeave projects
 */

import type {
  DoctorReport,
  DoctorOptions,
  HealthChecker,
  CategoryResult,
} from './types.js';
import { EnvironmentChecker } from './checkers/environment-checker.js';
import { ProjectStructureChecker } from './checkers/project-structure-checker.js';
import { ConfigurationChecker } from './checkers/configuration-checker.js';
import { HooksChecker } from './checkers/hooks-checker.js';
import { PluginsChecker } from './checkers/plugins-checker.js';
import { IncrementsChecker } from './checkers/increments-checker.js';
import { GitChecker } from './checkers/git-checker.js';

/**
 * Run all diagnostic checks and return a comprehensive report
 */
export async function runDoctor(
  projectRoot: string,
  options: DoctorOptions = {}
): Promise<DoctorReport> {
  const checkers: HealthChecker[] = [
    new EnvironmentChecker(),
    new ProjectStructureChecker(),
    new ConfigurationChecker(),
    new HooksChecker(),
    new PluginsChecker(),
    new IncrementsChecker(),
    new GitChecker(),
  ];

  const categories: CategoryResult[] = [];

  for (const checker of checkers) {
    try {
      const result = await checker.check(projectRoot, options);
      categories.push(result);
    } catch (error) {
      // If a checker fails, record it as a failed category
      categories.push({
        category: checker.category,
        status: 'fail',
        checks: [
          {
            name: `${checker.category} check`,
            status: 'fail',
            message: `Error: ${error instanceof Error ? error.message : 'unknown error'}`,
          },
        ],
      });
    }
  }

  // Calculate summary
  const summary = calculateSummary(categories);

  // Determine fix command if issues found
  let fixCommand: string | undefined;
  if (summary.warnings > 0 || summary.failures > 0) {
    fixCommand = determineFix(categories);
  }

  return {
    timestamp: new Date().toISOString(),
    projectRoot,
    categories,
    summary,
    fixCommand,
  };
}

function calculateSummary(categories: CategoryResult[]): DoctorReport['summary'] {
  let total = 0;
  let passed = 0;
  let warnings = 0;
  let failures = 0;
  let skipped = 0;

  for (const cat of categories) {
    for (const check of cat.checks) {
      total++;
      switch (check.status) {
        case 'pass':
          passed++;
          break;
        case 'warn':
          warnings++;
          break;
        case 'fail':
          failures++;
          break;
        case 'skip':
          skipped++;
          break;
      }
    }
  }

  return { total, passed, warnings, failures, skipped };
}

function determineFix(categories: CategoryResult[]): string {
  // Check what kind of issues we have
  const hasConfigIssues = categories.some(
    (c) =>
      c.category === 'Configuration' &&
      c.checks.some((ch) => ch.status === 'fail' || ch.status === 'warn')
  );

  const hasPluginIssues = categories.some(
    (c) =>
      c.category === 'Plugins' &&
      c.checks.some((ch) => ch.status === 'fail' || ch.status === 'warn')
  );

  const hasHookIssues = categories.some(
    (c) =>
      c.category === 'Hooks' &&
      c.checks.some((ch) => ch.status === 'fail')
  );

  const hasStructureIssues = categories.some(
    (c) =>
      c.category === 'Project Structure' &&
      c.checks.some((ch) => ch.status === 'fail')
  );

  // Prioritize fixes
  if (hasStructureIssues) {
    return 'specweave init';
  }

  if (hasConfigIssues || hasPluginIssues) {
    return 'specweave update';
  }

  if (hasHookIssues) {
    return 'specweave check-hooks --fix';
  }

  return 'specweave update';
}

/**
 * Format doctor report for console output
 */
export function formatDoctorReport(report: DoctorReport, verbose = false): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('SpecWeave Doctor');
  lines.push('================');
  lines.push('');

  for (const category of report.categories) {
    const icon = getStatusIcon(category.status);
    lines.push(`${icon} ${category.category}`);

    for (const check of category.checks) {
      const checkIcon = getStatusIcon(check.status);
      const duration = check.durationMs ? ` (${check.durationMs}ms)` : '';
      lines.push(`  ${checkIcon} ${check.name}: ${check.message}${duration}`);

      if (verbose && check.details && check.details.length > 0) {
        for (const detail of check.details) {
          lines.push(`      ${detail}`);
        }
      }

      if (verbose && check.fixSuggestion) {
        lines.push(`      Fix: ${check.fixSuggestion}`);
      }
    }

    lines.push('');
  }

  // Summary
  const { passed, warnings, failures, skipped } = report.summary;
  lines.push('Summary');
  lines.push('-------');
  lines.push(
    `${passed} passed, ${warnings} warning(s), ${failures} failure(s), ${skipped} skipped`
  );

  if (report.fixCommand) {
    lines.push('');
    lines.push(`Fix: ${report.fixCommand}`);
  }

  lines.push('');

  return lines.join('\n');
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pass':
      return '\u2713'; // ✓
    case 'warn':
      return '\u26A0'; // ⚠
    case 'fail':
      return '\u2717'; // ✗
    case 'skip':
      return '\u2022'; // •
    default:
      return '?';
  }
}
