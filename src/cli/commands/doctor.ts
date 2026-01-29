/**
 * Doctor Command
 *
 * Comprehensive health check for SpecWeave projects.
 * Runs diagnostic checks without modifying anything.
 */

import { Command } from 'commander';
import { runDoctor, formatDoctorReport } from '../../core/doctor/doctor.js';
import type { DoctorOptions, DoctorReport } from '../../core/doctor/types.js';
import { consoleLogger as logger } from '../../utils/logger.js';

/**
 * Execute doctor command
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @param options - Command options
 * @returns Doctor report
 */
export async function doctor(
  projectRoot: string = process.cwd(),
  options: DoctorOptions = {}
): Promise<DoctorReport> {
  const report = await runDoctor(projectRoot, options);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatDoctorReport(report, options.verbose));
  }

  return report;
}

/**
 * Register doctor command
 *
 * @param program - Commander program
 */
export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Run comprehensive health check on SpecWeave project')
    .option('--verbose', 'Show detailed output for each check')
    .option('--json', 'Output as JSON')
    .option('--quick', 'Skip slow checks (network, hook execution)')
    .option('--skip-external', 'Skip external tool connectivity checks')
    .option('--fix', 'Run suggested fix command if issues found')
    .action(async (options: Record<string, unknown>) => {
      try {
        const report = await doctor(process.cwd(), {
          verbose: options.verbose as boolean,
          json: options.json as boolean,
          quick: options.quick as boolean,
          skipExternal: options.skipExternal as boolean,
          fix: options.fix as boolean,
        });

        // If --fix and issues found, suggest running the fix command
        if (options.fix && report.fixCommand) {
          console.log(`\nRunning fix: ${report.fixCommand}\n`);
          const { execSync } = await import('child_process');
          try {
            execSync(report.fixCommand, {
              cwd: process.cwd(),
              stdio: 'inherit',
            });
          } catch (fixError) {
            logger.error(`Fix command failed: ${fixError}`);
            process.exit(1);
          }
        }

        // Exit with appropriate code
        if (report.summary.failures > 0) {
          process.exit(1);
        }
      } catch (error) {
        logger.error(`Doctor command failed: ${error}`);
        process.exit(1);
      }
    });
}
