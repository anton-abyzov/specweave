/**
 * CLI handler for /specweave:plan command
 *
 * Entry point that parses args and invokes PlanCommandOrchestrator.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */

import { PlanCommandOrchestrator } from './plan/plan-orchestrator.js';
import { PlanCommandConfig } from './plan/types.js';
import chalk from 'chalk';
import { Logger, consoleLogger } from '../../utils/logger.js';

// NOTE: This CLI plan command is primarily user-facing output (console.log/console.error).
// All console.* calls in this file are legitimate user-facing exceptions
// as defined in CONTRIBUTING.md (plan generation progress, results, warnings).
// Logger infrastructure available for future internal debug logs if needed.

/**
 * Execute /specweave:plan command
 */
export async function executePlanCommand(args: string[]): Promise<void> {
  // Parse arguments
  const config = parseArgs(args);

  // Create orchestrator
  const orchestrator = new PlanCommandOrchestrator();

  // Execute
  console.log(chalk.cyan('\n🎯 Generating implementation plan...\n'));

  const result = await orchestrator.execute(config);

  // Display result
  if (result.success) {
    console.log(chalk.green('✅ Plan generation successful!\n'));
    console.log(chalk.bold('Increment:'), result.incrementId);
    console.log(chalk.bold('Files created:'));
    result.filesCreated.forEach(file => {
      console.log(chalk.gray(`  - ${file}`));
    });

    if (result.statusTransition) {
      console.log(chalk.bold('\nStatus transition:'));
      console.log(chalk.gray(`  ${result.statusTransition.from} → ${result.statusTransition.to}`));
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      result.warnings.forEach(warning => {
        console.log(chalk.yellow(`  - ${warning.message}`));
      });
    }

    console.log(chalk.gray(`\n⏱️  Execution time: ${result.executionTime}ms`));
    console.log(chalk.cyan('\n💡 Next step: /specweave:do\n'));
  } else {
    console.log(chalk.red('❌ Plan generation failed\n'));

    if (result.error) {
      console.log(chalk.red(`Error: ${result.error.message}`));

      if (result.error.suggestion) {
        console.log(chalk.yellow(`💡 ${result.error.suggestion}`));
      }
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      result.warnings.forEach(warning => {
        console.log(chalk.yellow(`  - ${warning.message}`));
      });
    }

    console.log(chalk.gray(`\n⏱️  Execution time: ${result.executionTime}ms\n`));
    process.exit(1);
  }
}

/**
 * Parse command-line arguments
 */
function parseArgs(args: string[]): PlanCommandConfig {
  const config: PlanCommandConfig = {
    force: false,
    preserveTaskStatus: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--force' || arg === '-f') {
      config.force = true;
    } else if (arg === '--preserve-task-status') {
      config.preserveTaskStatus = true;
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (!arg.startsWith('-')) {
      // Positional argument = increment ID
      config.incrementId = arg;
    } else {
      console.warn(chalk.yellow(`Warning: Unknown option '${arg}'`));
    }
  }

  // Validate: preserveTaskStatus requires force
  if (config.preserveTaskStatus && !config.force) {
    console.warn(chalk.yellow('Warning: --preserve-task-status requires --force, enabling --force automatically'));
    config.force = true;
  }

  return config;
}

/**
 * Show help for /specweave:plan command
 */
export function showPlanHelp(): void {
  console.log(`
${chalk.bold('Usage:')}
  /specweave:plan [increment-id] [options]

${chalk.bold('Description:')}
  Generate plan.md and tasks.md for an increment using Architect Agent

${chalk.bold('Options:')}
  --force, -f              Overwrite existing plan.md/tasks.md
  --preserve-task-status   Keep existing task completion status (requires --force)
  --verbose, -v            Show detailed execution information

${chalk.bold('Examples:')}
  /specweave:plan                     # Auto-detect PLANNING increment
  /specweave:plan 0039                # Explicit increment ID
  /specweave:plan --force             # Overwrite existing files
  /specweave:plan 0039 --verbose      # Verbose output

${chalk.bold('Workflow:')}
  1. Create increment: /specweave:increment "feature name"
  2. Edit spec.md (add requirements, ACs)
  3. Generate plan: /specweave:plan
  4. Execute tasks: /specweave:do

${chalk.bold('For more info:')}
  See plugins/specweave/commands/specweave-plan.md
`);
}
