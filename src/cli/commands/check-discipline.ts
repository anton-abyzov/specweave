/**
 * CLI command: check-discipline
 *
 * Reports increment status counts, the advisory WIP note (limits.activeIncrements)
 * and metadata inconsistencies.
 *
 * Exit codes:
 * - 0: Compliant (no error-severity violations; warnings/notes are informational)
 * - 1: Non-compliant (error-severity violation found)
 * - 2: Error (command execution failed)
 */

import { DisciplineChecker } from '../../core/increment/discipline-checker.js';
import { DisciplineCheckOptions } from '../../core/increment/types.js';
import chalk from 'chalk';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';

// NOTE: This CLI discipline checker is primarily user-facing output (console.log/console.error).
// All console.* calls in this file are legitimate user-facing exceptions
// as defined in CONTRIBUTING.md (discipline violations, compliance reports, warnings).
// Logger infrastructure available for future internal debug logs if needed.

export async function checkDisciplineCommand(options: DisciplineCheckOptions): Promise<void> {
    try {
      const checker = new DisciplineChecker(options.projectRoot || resolveEffectiveRoot());
      const result = await checker.validate(options);

      // JSON output mode
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.compliant ? 0 : 1);
      }

      // Human-readable output
      console.log(chalk.bold('\n🔍 Increment Discipline Check\n'));
      console.log('━'.repeat(60));

      // Configuration
      console.log(chalk.dim('Configuration:'));
      console.log(`  Active increments (advisory): ${result.config.activeIncrements === 0 ? 'off' : result.config.activeIncrements}`);
      console.log('');

      // Status summary
      console.log(chalk.dim('Increment Summary:'));
      console.log(`  Total: ${result.increments.total}`);
      console.log(`  Active: ${result.increments.active}`);
      console.log(`  Paused: ${result.increments.paused}`);
      console.log(`  Completed: ${result.increments.completed}`);
      console.log(`  Abandoned: ${result.increments.abandoned}`);
      console.log('');

      // Violations and notes
      result.violations.forEach((violation, index) => {
        const icon = violation.severity === 'error' ? '🚫' : violation.severity === 'warning' ? '⚠️' : 'ℹ️';
        const color = violation.severity === 'error' ? chalk.red : violation.severity === 'warning' ? chalk.yellow : chalk.blue;

        console.log(color(`${icon} ${index + 1}: ${violation.type}`));
        console.log(color(`   ${violation.message}`));
        console.log(chalk.dim(`   💡 ${violation.suggestion}`));

        if (violation.incrementId) {
          console.log(chalk.dim(`   📋 Increment: ${violation.incrementId}`));
        }

        if (options.verbose && violation.context) {
          console.log(chalk.dim(`   📊 Context: ${JSON.stringify(violation.context, null, 2)}`));
        }

        console.log('');
      });

      if (result.compliant) {
        console.log(chalk.green('✅ COMPLIANT'));
        console.log('');
        process.exit(0);
      } else {
        console.log(chalk.red('❌ NON-COMPLIANT'));
        console.log('');
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : 'Unknown error');

      if (options.verbose) {
        console.error(chalk.dim('\nStack trace:'));
        console.error(error);
      }

      process.exit(2);
    }
}
