/**
 * CLI Command: validate-jira
 *
 * Validates Jira configuration and creates missing resources
 *
 * Usage:
 *   specweave validate-jira [options]
 *
 * Options:
 *   --env <path>    Path to .env file (default: .env)
 *   -h, --help      Display help for command
 *
 * @module cli/commands/validate-jira
 * @since 0.9.5
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { validateJiraResources } from '../../utils/external-resource-validator.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

// NOTE: This CLI validation command is primarily user-facing output (console.log/console.error).
// All console.* calls in this file are legitimate user-facing exceptions
// as defined in CONTRIBUTING.md (validation progress, resource status, errors).
// Logger infrastructure available for future internal debug logs if needed.

/**
 * Setup validate-jira command
 *
 * @param program - Commander program instance
 */
export function setupValidateJiraCommand(program: Command): void {
  program
    .command('validate-jira')
    .description('Validate Jira configuration and create missing resources')
    .option('--env <path>', 'Path to .env file', '.env')
    .action(async (options) => {
      await runJiraValidation(options);
    });
}

/**
 * Run Jira validation
 *
 * @param options - Command options
 */
async function runJiraValidation(options: { env: string }): Promise<void> {
  const spinner = ora('Validating Jira configuration...').start();

  try {
    spinner.stop();

    const result = await validateJiraResources(options.env);

    // Display results
    if (result.valid) {
      displaySuccess(result);
      process.exit(0);
    } else {
      displayFailure(result);
      process.exit(1);
    }
  } catch (error: any) {
    spinner.stop();
    console.error(chalk.red(`\n❌ Validation error: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Display success message
 */
function displaySuccess(result: any): void {
  console.log(chalk.green('\n✅ Jira configuration validated!\n'));

  // Show project info
  if (result.project.exists) {
    console.log(chalk.gray('Project:'));
    console.log(chalk.white(`   • ${result.project.key} - ${result.project.name}`));
    console.log(chalk.dim(`     ID: ${result.project.id}\n`));
  }

  // Show boards info
  if (result.boards.existing.length > 0) {
    console.log(chalk.gray('Boards:'));
    result.boards.existing.forEach((id: number) => {
      console.log(chalk.white(`   • Board ID: ${id}`));
    });
    console.log();
  }

  // Show created boards
  if (result.boards.created.length > 0) {
    console.log(chalk.green('Created boards:'));
    result.boards.created.forEach((board: any) => {
      console.log(chalk.green(`   ✅ ${board.name} (ID: ${board.id})`));
    });
    console.log();
  }

  // Show env update
  if (result.envUpdated) {
    console.log(chalk.cyan('📝 .env file updated with actual IDs\n'));
  }
}

/**
 * Display failure message
 */
function displayFailure(result: any): void {
  console.log(chalk.red('\n❌ Jira validation failed\n'));

  // Show project issues
  if (!result.project.exists) {
    console.log(chalk.yellow('Project:'));
    console.log(chalk.yellow('   • Project not found or not created\n'));
  }

  // Show board issues
  if (!result.boards.valid && result.boards.missing.length > 0) {
    console.log(chalk.yellow('Boards:'));
    console.log(
      chalk.yellow(`   • Missing boards: ${result.boards.missing.join(', ')}\n`)
    );
  }

  console.log(
    chalk.cyan('💡 Run again to retry validation and fix configuration\n')
  );
}

/**
 * Export for programmatic use
 */
export { runJiraValidation };
