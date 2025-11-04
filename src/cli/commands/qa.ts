/**
 * QA Command - Quality assessment CLI wrapper
 *
 * @module cli/commands/qa
 * @since v0.8.0
 */

import { runQA } from '../../core/qa/qa-runner.js';
import { QAOptions } from '../../core/qa/types.js';

interface QACommandOptions {
  quick?: boolean;
  full?: boolean;
  pre?: boolean;
  gate?: boolean;
  ci?: boolean;
  noAi?: boolean;
  silent?: boolean;
  export?: boolean;
  force?: boolean;
  verbose?: boolean;
}

/**
 * CLI command to run QA assessment on an increment
 *
 * @param incrementId - Increment ID (e.g., "0008")
 * @param options - Command options
 *
 * @example
 * ```bash
 * # Quick mode (default)
 * specweave qa 0008
 *
 * # Pre-implementation check
 * specweave qa 0008 --pre
 *
 * # Quality gate check (comprehensive)
 * specweave qa 0008 --gate
 *
 * # Full multi-agent mode (Phase 3)
 * specweave qa 0008 --full
 *
 * # CI mode (exit 1 on FAIL)
 * specweave qa 0008 --ci
 *
 * # Skip AI assessment (rule-based only)
 * specweave qa 0008 --no-ai
 *
 * # Export blockers to tasks.md
 * specweave qa 0008 --export
 *
 * # Force run even if rule-based fails
 * specweave qa 0008 --force
 * ```
 */
export async function qaCommand(
  incrementId: string | undefined,
  options: QACommandOptions = {}
): Promise<void> {
  // Validate increment ID provided
  if (!incrementId) {
    console.error('❌ Error: Increment ID required');
    console.error('\nUsage: specweave qa <increment-id> [options]');
    console.error('\nExamples:');
    console.error('  specweave qa 0008              # Quick mode');
    console.error('  specweave qa 0008 --pre        # Pre-implementation check');
    console.error('  specweave qa 0008 --gate       # Quality gate check');
    console.error('  specweave qa 0008 --export     # Export blockers to tasks.md');
    console.error('\nOptions:');
    console.error('  --quick       Quick mode (default)');
    console.error('  --pre         Pre-implementation check');
    console.error('  --gate        Quality gate check (comprehensive)');
    console.error('  --full        Full multi-agent mode (Phase 3)');
    console.error('  --ci          CI mode (exit 1 on FAIL)');
    console.error('  --no-ai       Skip AI assessment (rule-based only)');
    console.error('  --silent      Minimal output');
    console.error('  --export      Export blockers/concerns to tasks.md');
    console.error('  --force       Force run even if rule-based fails');
    console.error('  --verbose     Show recommendations\n');
    process.exit(1);
  }

  // Validate increment ID format
  if (!/^\d{4}$/.test(incrementId)) {
    console.error(`❌ Error: Invalid increment ID format: ${incrementId}`);
    console.error('   Expected format: 0001, 0002, 0008, etc. (4 digits)\n');
    process.exit(1);
  }

  // Validate mutually exclusive mode flags
  const modeFlags = [options.quick, options.full, options.pre, options.gate].filter(Boolean);
  if (modeFlags.length > 1) {
    console.error('❌ Error: Cannot use multiple mode flags together');
    console.error('   Choose one: --quick, --pre, --gate, or --full\n');
    process.exit(1);
  }

  // Convert CLI options to QAOptions
  const qaOptions: QAOptions = {
    quick: options.quick,
    full: options.full,
    pre: options.pre,
    gate: options.gate,
    ci: options.ci,
    noAi: options.noAi,
    silent: options.silent,
    export: options.export,
    force: options.force,
  };

  // Run QA assessment
  try {
    await runQA(incrementId, qaOptions);
  } catch (error) {
    console.error(`\n❌ QA assessment failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
