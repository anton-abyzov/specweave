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
import { DesyncDetector } from '../../core/increment/desync-detector.js';

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
  if (options.fixStatus) {
    await fixStatusDesyncs(projectRoot, options);
  }

  const report = await runDoctor(projectRoot, options);

  // 0796 / T-001 — `--quiet` suppresses all stdout but preserves exit code.
  // Useful for hook-based callers that consume the returned `report` and
  // don't want to pollute the user's terminal.
  if (!options.quiet) {
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatDoctorReport(report, options.verbose));
    }
  }

  return report;
}

export interface FixStatusResult {
  scanned: number;
  desyncs: string[];
  fixed: string[];
}

/**
 * `doctor --fix-status`: metadata.json is the source of truth; spec.md
 * frontmatter is rewritten to match for every increment where they differ.
 */
export async function fixStatusDesyncs(
  projectRoot: string,
  options: Pick<DoctorOptions, 'quiet' | 'json'> = {},
  detector: DesyncDetector = new DesyncDetector({ projectRoot, logger: { ...logger, log: () => undefined } })
): Promise<FixStatusResult> {
  const report = await detector.scanAll();
  const desyncs = report.desyncs.map((d) => d.incrementId);
  const fixed: string[] = [];
  for (const incrementId of desyncs) {
    if (await detector.fixDesync(incrementId)) fixed.push(incrementId);
  }
  if (!options.quiet && !options.json) {
    if (desyncs.length === 0) {
      console.log(`Status sync: ${report.totalScanned} increment(s) scanned, no metadata/spec desyncs.`);
    } else {
      console.log(`Status sync: fixed ${fixed.length}/${desyncs.length} desync(s): ${fixed.join(', ') || 'none'}`);
    }
  }
  return { scanned: report.totalScanned, desyncs, fixed };
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
    .option('--quiet', 'Suppress all stdout (exit code still reflects failures)')
    .option('--skip-external', 'Skip external tool connectivity checks')
    .option('--fix', 'Apply inline fixes (remove ghost files, stale cache, update lockfile hashes)')
    .option('--fix-status', 'Fix metadata.json <-> spec.md status desyncs (formerly sw:sync-status)')
    .action(async (options: Record<string, unknown>) => {
      try {
        const report = await doctor(process.cwd(), {
          verbose: options.verbose as boolean,
          json: options.json as boolean,
          quick: options.quick as boolean,
          quiet: options.quiet as boolean,
          skipExternal: options.skipExternal as boolean,
          fix: options.fix as boolean,
          fixStatus: options.fixStatus as boolean,
        });

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
