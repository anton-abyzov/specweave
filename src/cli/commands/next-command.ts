/**
 * Next Command - Intelligent workflow orchestration
 *
 * CLI wrapper for WorkflowOrchestrator and AutonomousExecutor.
 * Provides /specweave:next command functionality.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 *
 * @module cli/commands/next-command
 * @since v0.22.0
 */

import { WorkflowOrchestrator, WorkflowExecuteOptions } from '../../core/workflow/workflow-orchestrator.js';
import { AutonomousExecutor, AutonomousConfig } from '../../core/workflow/autonomous-executor.js';
import chalk from 'chalk';

/**
 * Next command configuration
 */
export interface NextCommandConfig {
  /** Increment ID (auto-detect if not provided) */
  incrementId?: string;
  /** Enable autonomous mode */
  autonomous?: boolean;
  /** Dry-run mode (preview only) */
  dryRun?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Force execution with low confidence */
  force?: boolean;
  /** Maximum iterations (autonomous mode) */
  maxIterations?: number;
  /** Maximum cost threshold in USD (autonomous mode) */
  maxCost?: number;
  /** Resume from checkpoint ID (autonomous mode) */
  resumeFrom?: string;
  /** Stop on first error (autonomous mode) */
  stopOnError?: boolean;
}

/**
 * Execute next command
 *
 * @param config - Command configuration
 */
export async function executeNextCommand(config: NextCommandConfig = {}): Promise<void> {
  try {
    if (config.autonomous) {
      await executeAutonomousMode(config);
    } else {
      await executeInteractiveMode(config);
    }
  } catch (error) {
    console.error(chalk.red('❌ Error executing next command:'));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Execute interactive mode
 *
 * Suggests next action, waits for user confirmation.
 */
async function executeInteractiveMode(config: NextCommandConfig): Promise<void> {
  console.log(chalk.blue('🔍 Detecting current workflow phase...\n'));

  const orchestrator = new WorkflowOrchestrator();

  const options: WorkflowExecuteOptions = {
    verbose: config.verbose,
    dryRun: config.dryRun,
    force: config.force
  };

  const result = await orchestrator.executeNext(config.incrementId, options);

  // Display result
  displayPhaseDetection(result);

  if (result.success && result.command) {
    displaySuggestedAction(result);

    if (!config.dryRun) {
      // In real implementation, would prompt user for confirmation
      console.log(chalk.yellow('\n💡 Run the suggested command above to proceed.'));
    }
  } else if (result.error) {
    console.error(chalk.red(`\n❌ ${result.error}`));
    process.exit(1);
  }
}

/**
 * Execute autonomous mode
 *
 * Runs complete workflow automatically with safety guardrails.
 */
async function executeAutonomousMode(config: NextCommandConfig): Promise<void> {
  console.log(chalk.blue('🚀 Starting autonomous execution...\n'));

  const autonomousConfig: AutonomousConfig = {
    maxIterations: config.maxIterations,
    costThreshold: config.maxCost,
    maxRetries: 3,
    stopOnError: config.stopOnError,
    verbose: config.verbose,
    enableCheckpoints: true
  };

  const executor = new AutonomousExecutor(autonomousConfig);

  // Ensure increment ID is provided
  if (!config.incrementId) {
    console.error(chalk.red('❌ Increment ID required for autonomous mode'));
    console.error(chalk.yellow('Usage: /specweave:next --autonomous <increment-id>'));
    process.exit(1);
  }

  const result = await executor.execute(config.incrementId, config.resumeFrom);

  // Display result
  displayAutonomousResult(result);

  if (!result.success) {
    process.exit(1);
  }
}

/**
 * Display phase detection result
 */
function displayPhaseDetection(result: any): void {
  console.log(chalk.cyan(`📊 Phase: ${result.phase}`) + chalk.gray(` (confidence: ${(result.confidence * 100).toFixed(0)}%)`));

  if (result.reasoning) {
    console.log(chalk.gray(`\n${result.reasoning}`));
  }
}

/**
 * Display suggested action
 */
function displaySuggestedAction(result: any): void {
  console.log(chalk.green(`\n🎯 Suggested action: ${result.action}`));

  if (result.command) {
    console.log(chalk.white(`💡 Command: ${chalk.bold(result.command)}`));
  }
}

/**
 * Display autonomous execution result
 */
function displayAutonomousResult(result: any): void {
  if (result.success) {
    console.log(chalk.green('\n✅ Autonomous execution completed successfully!\n'));
  } else {
    console.log(chalk.red('\n❌ Autonomous execution failed\n'));
  }

  console.log(chalk.cyan('📊 Execution Summary:'));
  console.log(`   • Iterations: ${result.iterations}`);
  console.log(`   • Commands executed: ${result.commandsExecuted.length}`);
  console.log(`   • Total cost: $${result.totalCost.toFixed(2)}`);
  console.log(`   • Final phase: ${result.finalPhase}`);
  console.log(`   • Reason: ${result.reason}`);

  if (result.commandsExecuted.length > 0) {
    console.log(chalk.cyan('\n📝 Commands executed:'));
    result.commandsExecuted.forEach((cmd: string, i: number) => {
      console.log(`   ${i + 1}. ${cmd}`);
    });
  }
}

/**
 * Parse command line arguments
 *
 * @param args - Process argv array
 * @returns Parsed configuration
 */
export function parseArgs(args: string[]): NextCommandConfig {
  const config: NextCommandConfig = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--autonomous':
        config.autonomous = true;
        break;

      case '--dry-run':
        config.dryRun = true;
        break;

      case '--verbose':
      case '-v':
        config.verbose = true;
        break;

      case '--force':
        config.force = true;
        break;

      case '--stop-on-error':
        config.stopOnError = true;
        break;

      case '--max-iterations':
        config.maxIterations = parseInt(args[++i], 10);
        break;

      case '--max-cost':
        config.maxCost = parseFloat(args[++i]);
        break;

      case '--resume-from':
        config.resumeFrom = args[++i];
        break;

      default:
        // Assume it's the increment ID
        if (!arg.startsWith('-')) {
          config.incrementId = arg;
        }
        break;
    }
  }

  return config;
}

/**
 * Display help text
 */
export function displayHelp(): void {
  console.log(chalk.bold('\n/specweave:next - Intelligent Workflow Orchestrator\n'));

  console.log(chalk.cyan('Usage:'));
  console.log('  /specweave:next [options] [increment-id]\n');

  console.log(chalk.cyan('Modes:'));
  console.log('  Interactive (default)  Suggests next action, waits for confirmation');
  console.log('  --autonomous           Executes full workflow automatically\n');

  console.log(chalk.cyan('Options:'));
  console.log('  --dry-run              Preview actions without executing');
  console.log('  --verbose, -v          Show detailed execution information');
  console.log('  --force                Execute even with low confidence');
  console.log('  --stop-on-error        Stop on first error (autonomous mode)');
  console.log('  --max-iterations <n>   Maximum iterations (default: 50)');
  console.log('  --max-cost <amount>    Maximum cost in USD (default: $20)');
  console.log('  --resume-from <id>     Resume from checkpoint\n');

  console.log(chalk.cyan('Examples:'));
  console.log('  /specweave:next                          # Interactive mode, auto-detect increment');
  console.log('  /specweave:next 0039                     # Interactive mode, specific increment');
  console.log('  /specweave:next --autonomous 0039        # Autonomous mode');
  console.log('  /specweave:next --dry-run --verbose      # Preview with details');
  console.log('  /specweave:next --autonomous --max-cost 10  # Autonomous with cost limit\n');
}
