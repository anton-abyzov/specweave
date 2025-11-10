/**
 * CLI command: check-discipline
 *
 * Validates increment discipline compliance:
 * - Hard cap: Never > 2 active increments
 * - WIP limit: Recommended max 1 active
 * - Emergency rules: hotfix/bug can interrupt
 *
 * Exit codes:
 * - 0: Compliant (all rules passed)
 * - 1: Non-compliant (violations found)
 * - 2: Error (command execution failed)
 */

import { DisciplineChecker } from '../../core/increment/discipline-checker.js';
import { DisciplineCheckOptions } from '../../core/increment/types.js';
import chalk from 'chalk';

export async function checkDisciplineCommand(options: DisciplineCheckOptions): Promise<void> {
    try {
      const checker = new DisciplineChecker(options.projectRoot || process.cwd());
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
      console.log(`  Max Active Increments: ${result.config.maxActiveIncrements} (recommended)`);
      console.log(`  Hard Cap: ${result.config.hardCap} (absolute maximum)`);
      console.log(`  Emergency Interrupt: ${result.config.allowEmergencyInterrupt ? 'Enabled' : 'Disabled'}`);
      console.log('');

      // Status summary
      console.log(chalk.dim('Increment Summary:'));
      console.log(`  Total: ${result.increments.total}`);
      console.log(`  Active: ${result.increments.active}`);
      console.log(`  Paused: ${result.increments.paused}`);
      console.log(`  Completed: ${result.increments.completed}`);
      console.log(`  Abandoned: ${result.increments.abandoned}`);
      console.log('');

      // Compliance status
      if (result.compliant) {
        console.log(chalk.green('✅ COMPLIANT'));
        console.log(chalk.dim('All discipline rules are satisfied.'));
        console.log('');
        process.exit(0);
      } else {
        console.log(chalk.red('❌ NON-COMPLIANT'));
        console.log(chalk.dim(`Found ${result.violations.length} violation(s):\n`));

        // Display violations
        result.violations.forEach((violation, index) => {
          const icon = violation.severity === 'error' ? '🚫' : '⚠️';
          const color = violation.severity === 'error' ? chalk.red : chalk.yellow;

          console.log(color(`${icon} Violation ${index + 1}: ${violation.type}`));
          console.log(color(`   ${violation.message}`));
          console.log(chalk.dim(`   💡 Suggestion: ${violation.suggestion}`));

          if (violation.incrementId) {
            console.log(chalk.dim(`   📋 Increment: ${violation.incrementId}`));
          }

          if (options.verbose && violation.context) {
            console.log(chalk.dim(`   📊 Context: ${JSON.stringify(violation.context, null, 2)}`));
          }

          console.log('');
        });

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
