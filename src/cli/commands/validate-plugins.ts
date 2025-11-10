/**
 * CLI Command: validate-plugins
 *
 * Validates SpecWeave plugin installation and optionally installs missing components.
 *
 * Usage:
 *   specweave validate-plugins [options]
 *
 * Options:
 *   --auto-install              Auto-install missing components
 *   --context <description>     Increment description for context detection
 *   --dry-run                   Show what would be installed without installing
 *   --verbose                   Show detailed validation steps
 *   -h, --help                  Display help for command
 *
 * @module cli/commands/validate-plugins
 * @since 0.9.4
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  PluginValidator,
  ValidationOptions,
  ValidationResult,
} from '../../utils/plugin-validator.js';

/**
 * Setup validate-plugins command
 *
 * @param program - Commander program instance
 */
export function setupValidatePluginsCommand(program: Command): void {
  program
    .command('validate-plugins')
    .description('Validate SpecWeave plugin installation')
    .option('--auto-install', 'Auto-install missing components', false)
    .option(
      '--context <description>',
      'Increment description for context detection'
    )
    .option(
      '--dry-run',
      'Show what would be installed without installing',
      false
    )
    .option('--verbose', 'Show detailed validation steps', false)
    .action(async (options) => {
      await runValidation(options);
    });
}

/**
 * Run validation
 *
 * @param options - Command options
 */
async function runValidation(options: {
  autoInstall: boolean;
  context?: string;
  dryRun: boolean;
  verbose: boolean;
}): Promise<void> {
  const spinner = ora('Validating SpecWeave environment...').start();

  try {
    const validator = new PluginValidator();
    const validationOptions: ValidationOptions = {
      autoInstall: options.autoInstall,
      context: options.context,
      dryRun: options.dryRun,
      verbose: options.verbose,
    };

    const result: ValidationResult = await validator.validate(
      validationOptions
    );

    spinner.stop();

    // Display results
    if (result.valid) {
      displaySuccess(result);
      process.exit(0);
    } else {
      displayFailure(result, options);
      process.exit(1);
    }
  } catch (error: any) {
    spinner.stop();
    console.error(chalk.red(`\n❌ Validation error: ${error.message}`));

    // Show manual instructions
    showManualInstructions();
    process.exit(1);
  }
}

/**
 * Display success message
 *
 * @param result - Validation result
 */
function displaySuccess(result: ValidationResult): void {
  console.log(chalk.green('\n✅ All plugins validated!'));

  // Show installed components
  if (result.installed.corePlugin) {
    const version = result.installed.corePluginVersion
      ? ` (v${result.installed.corePluginVersion})`
      : '';
    console.log(chalk.gray(`   • Core plugin: installed${version}`));
  }

  if (result.installed.contextPlugins.length > 0) {
    console.log(
      chalk.gray(
        `   • Context plugins: ${result.installed.contextPlugins.join(', ')}`
      )
    );
  }

  // Show cache info
  if (result.cache?.hit) {
    console.log(
      chalk.gray(`   • Cache: hit (age: ${Math.round(result.cache.age)}s)`)
    );
  }

  console.log(); // Empty line
}

/**
 * Display failure message
 *
 * @param result - Validation result
 * @param options - Command options
 */
function displayFailure(
  result: ValidationResult,
  options: { autoInstall: boolean; dryRun: boolean }
): void {
  console.log(chalk.red('\n❌ Missing components detected:'));

  // Show missing components
  if (result.missing.marketplace) {
    console.log(
      chalk.yellow('   • SpecWeave marketplace not registered')
    );
  }

  if (result.missing.corePlugin) {
    console.log(chalk.yellow('   • Core plugin (specweave) not installed'));
  }

  if (result.missing.contextPlugins.length > 0) {
    console.log(
      chalk.yellow(
        `   • Context plugins: ${result.missing.contextPlugins.join(', ')}`
      )
    );
  }

  // Show errors if any
  if (result.errors.length > 0) {
    console.log(chalk.red('\n🚨 Errors encountered:'));
    result.errors.forEach((error) => {
      console.log(chalk.red(`   • ${error}`));
    });
  }

  // Show recommendations
  if (result.recommendations.length > 0) {
    console.log(chalk.cyan('\n📦 Recommendations:'));
    result.recommendations.forEach((rec) => {
      console.log(chalk.gray(`   ${rec}`));
    });
  }

  // Show dry-run note
  if (options.dryRun) {
    console.log(
      chalk.cyan(
        '\n💡 Dry-run mode: No changes made. Remove --dry-run to install.'
      )
    );
  }

  // Show auto-install suggestion
  if (!options.autoInstall && !options.dryRun) {
    console.log(
      chalk.cyan(
        '\n💡 Tip: Use --auto-install flag to automatically install missing components'
      )
    );
  }

  console.log(); // Empty line
}

/**
 * Show manual installation instructions
 */
function showManualInstructions(): void {
  console.log(chalk.cyan('\n📖 Manual Installation Instructions:'));
  console.log();
  console.log(
    chalk.gray('1. Register SpecWeave marketplace:')
  );
  console.log(
    chalk.gray(
      '   Edit ~/.claude/settings.json and add:'
    )
  );
  console.log(
    chalk.gray(`   {
     "extraKnownMarketplaces": {
       "specweave": {
         "source": {
           "source": "github",
           "repo": "anton-abyzov/specweave",
           "path": ".claude-plugin"
         }
       }
     }
   }`)
  );
  console.log();
  console.log(
    chalk.gray('2. Install core plugin:')
  );
  console.log(chalk.gray('   Run: /plugin install specweave'));
  console.log();
  console.log(chalk.gray('3. Restart Claude Code'));
  console.log();
  console.log(
    chalk.gray('4. Re-run: specweave validate-plugins')
  );
  console.log();
}

/**
 * Export for programmatic use
 */
export { runValidation };
