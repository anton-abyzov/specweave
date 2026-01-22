/**
 * CLI command for reflect stop hook
 *
 * Called by the stop-auto.sh hook to extract learnings at session end.
 *
 * Usage:
 *   specweave reflect-stop <transcript-path> [--silent] [--model haiku|sonnet]
 *
 * @module cli/commands/reflect-stop
 */

import {
  handleReflectStop,
  formatReflectResult,
  migrateOldMemoryFiles,
  readReflectConfig,
} from '../../core/reflection/reflect-handler.js';
import { consoleLogger as logger } from '../../utils/logger.js';

interface ReflectStopOptions {
  /** Silent mode - only output JSON */
  silent?: boolean;
  /** Model to use (overrides config) */
  model?: 'haiku' | 'sonnet' | 'opus';
  /** Project root (defaults to cwd) */
  projectRoot?: string;
  /** Run migration before reflect */
  migrate?: boolean;
}

/**
 * Execute reflect stop hook
 */
export async function reflectStopCommand(
  transcriptPath: string,
  options: ReflectStopOptions = {}
): Promise<void> {
  const projectRoot = options.projectRoot || process.cwd();

  // Check if reflect is enabled
  const config = readReflectConfig(projectRoot);
  if (!config.enabled) {
    if (!options.silent) {
      console.log('Reflect is disabled in config. Skipping.');
    }
    return;
  }

  // Optionally run migration first
  if (options.migrate) {
    const migrationResult = migrateOldMemoryFiles(projectRoot);
    if (migrationResult.migrated > 0 && !options.silent) {
      console.log(`Migrated ${migrationResult.migrated} learnings from old memory files.`);
    }
  }

  // Run reflect
  const result = await handleReflectStop(transcriptPath, projectRoot);

  // Output based on mode
  if (options.silent) {
    // JSON output for programmatic use
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Human-readable output
    console.log(formatReflectResult(result));
  }

  // Log result
  if (result.written.learningsAdded > 0) {
    logger.info(`[reflect-stop] Added ${result.written.learningsAdded} learning(s) to CLAUDE.md`);
  }
}

/**
 * Register the reflect-stop command with commander
 */
export function registerReflectStopCommand(program: import('commander').Command): void {
  program
    .command('reflect-stop <transcript-path>')
    .description('Extract learnings from session transcript (called by stop hook)')
    .option('-s, --silent', 'Silent mode - output JSON only')
    .option('-m, --model <model>', 'Model to use (haiku, sonnet, opus)')
    .option('--migrate', 'Run migration of old memory files first')
    .action(async (transcriptPath: string, options: ReflectStopOptions) => {
      await reflectStopCommand(transcriptPath, options);
    });
}
