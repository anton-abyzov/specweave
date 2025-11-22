/**
 * Import Strategy Prompter
 *
 * Provides CLI-first UI for selecting import strategy with "Import all" as default.
 * Supports three strategies:
 * - import-all (default, recommended)
 * - select-specific (checkbox mode with all pre-checked)
 * - manual-entry (comma-separated project keys)
 *
 * @module cli/helpers/import-strategy-prompter
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Import strategy options
 */
export type ImportStrategy = 'import-all' | 'select-specific' | 'manual-entry';

/**
 * Strategy prompt result
 */
export interface StrategyPromptResult {
  strategy: ImportStrategy;
  projectKeys?: string[]; // For manual-entry strategy
  confirmed?: boolean; // For safety confirmation (large imports)
}

/**
 * Strategy prompter options
 */
export interface StrategyPrompterOptions {
  totalCount: number; // Total number of accessible projects
  provider: 'jira' | 'ado'; // Issue tracker provider
  logger?: Logger;
}

/**
 * Prompt user for import strategy selection
 *
 * Default: "Import all" (CLI-first approach)
 * Instructions: "All projects selected by default. Deselect unwanted projects if needed."
 *
 * @param options - Prompter options
 * @returns Strategy prompt result
 */
export async function promptImportStrategy(
  options: StrategyPrompterOptions
): Promise<StrategyPromptResult> {
  const { totalCount, provider, logger = consoleLogger } = options;

  // Display project count
  logger.log(chalk.cyan(`\nFound ${totalCount} accessible ${provider.toUpperCase()} projects.`));

  // Show strategy prompt
  const strategyAnswer = await inquirer.prompt<{ strategy: ImportStrategy }>([
    {
      type: 'list',
      name: 'strategy',
      message: 'How would you like to import projects?',
      default: 'import-all', // CLI-first default
      choices: [
        {
          name: chalk.green('✓ Import all projects (Recommended)') + chalk.gray(' - All selected by default'),
          value: 'import-all'
        },
        {
          name: 'Select specific projects' + chalk.gray(' - Choose from checkbox list'),
          value: 'select-specific'
        },
        {
          name: 'Manual entry' + chalk.gray(' - Enter project keys manually'),
          value: 'manual-entry'
        }
      ]
    }
  ]);

  const strategy = strategyAnswer.strategy;

  // Handle manual entry
  if (strategy === 'manual-entry') {
    return await handleManualEntry(logger);
  }

  // Handle safety confirmation for large imports (> 100 projects)
  if (strategy === 'import-all' && totalCount > 100) {
    const confirmed = await showSafetyConfirmation(totalCount, logger);
    if (!confirmed) {
      // User declined large import - restart strategy selection
      logger.log(chalk.yellow('\n⚠️  Import canceled. Returning to strategy selection...\n'));
      return await promptImportStrategy(options); // Recursive call
    }
    return { strategy, confirmed: true };
  }

  return { strategy };
}

/**
 * Handle manual entry workflow
 *
 * Prompts user to enter comma-separated project keys (e.g., "BACKEND,FRONTEND,MOBILE")
 * Validates format and returns parsed keys.
 *
 * @param logger - Logger instance
 * @returns Strategy result with project keys
 */
async function handleManualEntry(logger: Logger): Promise<StrategyPromptResult> {
  logger.log(chalk.gray('\n💡 Tip: Enter project keys separated by commas (e.g., BACKEND,FRONTEND,MOBILE)'));

  const manualAnswer = await inquirer.prompt<{ projectKeys: string }>([
    {
      type: 'input',
      name: 'projectKeys',
      message: 'Enter project keys (comma-separated):',
      validate: (input: string) => {
        // Validate format: alphanumeric, underscores, hyphens, and commas only
        const trimmed = input.trim();
        if (!trimmed) {
          return chalk.red('Project keys cannot be empty. Please enter at least one project key.');
        }

        // Check format (allow A-Z, 0-9, _, -, and commas)
        const validFormat = /^[A-Z0-9_,-]+$/i.test(trimmed);
        if (!validFormat) {
          return chalk.red('Invalid format. Use only letters, numbers, underscores, hyphens, and commas.');
        }

        return true;
      }
    }
  ]);

  // Parse and clean project keys
  const projectKeys = manualAnswer.projectKeys
    .split(',')
    .map(key => key.trim().toUpperCase())
    .filter(key => key.length > 0);

  logger.log(chalk.green(`\n✓ ${projectKeys.length} project(s) will be imported: ${projectKeys.join(', ')}`));

  return { strategy: 'manual-entry', projectKeys };
}

/**
 * Show safety confirmation for large imports (> 100 projects)
 *
 * Default: "No" (safe default to prevent accidental large imports)
 * Displays estimated import time based on batch size.
 *
 * @param totalCount - Total number of projects to import
 * @param logger - Logger instance
 * @returns True if user confirms, false otherwise
 */
async function showSafetyConfirmation(totalCount: number, logger: Logger): Promise<boolean> {
  // Calculate estimated time (50 projects/batch, ~5 seconds/batch)
  const estimatedBatches = Math.ceil(totalCount / 50);
  const estimatedSeconds = estimatedBatches * 5;
  const estimatedTime = estimatedSeconds < 60
    ? `~${estimatedSeconds}s`
    : `~${Math.ceil(estimatedSeconds / 60)}m`;

  logger.log(chalk.yellow(`\n⚠️  Large import detected: ${totalCount} projects`));
  logger.log(chalk.gray(`   Estimated time: ${estimatedTime} (${estimatedBatches} batches)`));

  const confirmation = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `Import all ${totalCount} projects?`,
      default: false // Safe default (prevent accidents)
    }
  ]);

  return confirmation.confirmed;
}
