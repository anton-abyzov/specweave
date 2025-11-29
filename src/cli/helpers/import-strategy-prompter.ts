/**
 * Import Strategy Prompter
 *
 * Provides CLI-first UI for selecting import strategy with "Import all" as default.
 * Supports five strategies (unified with GitHub/ADO):
 * - import-all (default, recommended)
 * - pattern-glob (glob pattern matching)
 * - pattern-regex (regex pattern matching)
 * - select-specific (checkbox mode with all pre-checked)
 * - manual-entry (comma-separated project keys)
 *
 * @module cli/helpers/import-strategy-prompter
 */

import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { parsePatternShortcut, validateRegex } from './selection-strategy.js';

/**
 * Import strategy options
 */
export type ImportStrategy = 'import-all' | 'pattern-glob' | 'pattern-regex' | 'select-specific' | 'manual-entry';

/**
 * Strategy prompt result
 */
export interface StrategyPromptResult {
  strategy: ImportStrategy;
  projectKeys?: string[]; // For manual-entry strategy
  pattern?: string; // For pattern strategies
  isRegex?: boolean; // True if pattern is regex
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
 * Unified options (same as GitHub/ADO):
 * - All (import-all)
 * - Pattern (glob)
 * - Pattern (regex)
 * - Select specific
 * - Manual entry
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

  // Show strategy prompt - unified with GitHub/ADO
  const strategy = await select<ImportStrategy>({
    message: 'How would you like to select projects?',
    default: 'import-all', // CLI-first default
    choices: [
      {
        name: `${chalk.green('✓')} All ${chalk.gray('- Import all projects (Recommended)')}`,
        value: 'import-all' as ImportStrategy,
      },
      {
        name: `Pattern (glob) ${chalk.gray('- Match by pattern (e.g., "PROJ-*", "*-BACKEND")')}`,
        value: 'pattern-glob' as ImportStrategy,
      },
      {
        name: `Pattern (regex) ${chalk.gray('- Regular expression (e.g., "^PROJ-.*$")')}`,
        value: 'pattern-regex' as ImportStrategy,
      },
      {
        name: `Select specific ${chalk.gray('- Choose from checkbox list')}`,
        value: 'select-specific' as ImportStrategy,
      },
      {
        name: `Manual entry ${chalk.gray('- Enter project keys directly')}`,
        value: 'manual-entry' as ImportStrategy,
      },
    ],
  });

  // Handle pattern-glob
  if (strategy === 'pattern-glob') {
    return await handlePatternGlob(logger);
  }

  // Handle pattern-regex
  if (strategy === 'pattern-regex') {
    return await handlePatternRegex(logger);
  }

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
 * Handle pattern (glob) workflow
 *
 * @param logger - Logger instance
 * @returns Strategy result with pattern
 */
async function handlePatternGlob(logger: Logger): Promise<StrategyPromptResult> {
  logger.log(chalk.gray('\n💡 Examples: "PROJ-*", "*-BACKEND", "TEAM-*-SERVICE"'));
  logger.log(chalk.gray('💡 Shortcuts: "starts: PROJ-", "ends: -API", "contains: CORE"\n'));

  const patternInput = await input({
    message: 'Enter pattern:',
    validate: (val: string) => {
      if (!val.trim()) {
        return chalk.red('Pattern is required');
      }
      return true;
    },
  });

  // Parse shortcuts and return
  const parsedPattern = parsePatternShortcut(patternInput.trim());

  logger.log(chalk.green(`\n✓ Projects matching pattern "${parsedPattern}" will be imported`));

  return { strategy: 'pattern-glob', pattern: parsedPattern };
}

/**
 * Handle pattern (regex) workflow
 *
 * @param logger - Logger instance
 * @returns Strategy result with pattern
 */
async function handlePatternRegex(logger: Logger): Promise<StrategyPromptResult> {
  logger.log(chalk.gray('\n💡 Examples: "^PROJ-", ".*-BACKEND$", "^TEAM-\\d+-SERVICE$"\n'));

  const patternInput = await input({
    message: 'Enter regex pattern:',
    validate: (val: string) => {
      if (!val.trim()) {
        return chalk.red('Pattern is required');
      }
      const validation = validateRegex(val.trim());
      if (validation !== true) {
        return chalk.red(`Invalid regular expression: ${validation}`);
      }
      return true;
    },
  });

  logger.log(chalk.green(`\n✓ Projects matching regex "${patternInput.trim()}" will be imported`));

  return { strategy: 'pattern-regex', pattern: patternInput.trim(), isRegex: true };
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

  const projectKeysInput = await input({
    message: 'Enter project keys (comma-separated):',
    validate: (val: string) => {
      // Validate format: alphanumeric, underscores, hyphens, and commas only
      const trimmed = val.trim();
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
  });

  // Parse and clean project keys
  const projectKeys = projectKeysInput
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

  const confirmed = await confirm({
    message: `Import all ${totalCount} projects?`,
    default: false // Safe default (prevent accidents)
  });

  return confirmed;
}
