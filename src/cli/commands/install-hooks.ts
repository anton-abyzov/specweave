/**
 * Install Hooks Command
 *
 * Installs git pre-commit hooks for existing SpecWeave projects.
 * Can also be used to reinstall/update hooks in new SpecWeave versions.
 *
 * Usage:
 *   specweave install-hooks
 *   specweave hooks install
 */

import * as path from 'path';
import chalk from 'chalk';
import { Command } from 'commander';
import { getDirname } from '../../utils/esm-helpers.js';
import { installGitHooks, areGitHooksInstalled } from '../helpers/init/git-hooks-installer.js';
import { consoleLogger } from '../../utils/logger.js';

const __dirname = getDirname(import.meta.url);

export function registerInstallHooksCommand(program: Command): void {
  program
    .command('install-hooks')
    .alias('hooks')
    .description('Install git pre-commit hooks for quality enforcement')
    .option('--force', 'Overwrite existing hooks')
    .option('--check', 'Check if hooks are installed (no installation)')
    .action(async (options: { force?: boolean; check?: boolean }) => {
      try {
        const cwd = process.cwd();

        // Check mode
        if (options.check) {
          const installed = areGitHooksInstalled(cwd);
          if (installed) {
            console.log(chalk.green('✓ SpecWeave git hooks are installed'));
            console.log(chalk.gray('  Location: .git/hooks/pre-commit'));
          } else {
            console.log(chalk.yellow('✗ SpecWeave git hooks are NOT installed'));
            console.log(chalk.gray('  Run: specweave install-hooks'));
          }
          return;
        }

        // Install mode
        console.log(chalk.bold('\n🪝 Installing SpecWeave Git Hooks\n'));

        // Check if already installed
        if (!options.force && areGitHooksInstalled(cwd)) {
          console.log(chalk.blue('ℹ Git hooks already installed'));
          console.log(chalk.gray('  Use --force to reinstall'));
          return;
        }

        // Find templates directory
        const templatesDir = path.join(__dirname, '..', '..', '..', 'templates');

        // Install hooks
        const success = installGitHooks(cwd, templatesDir);

        if (success) {
          console.log(chalk.green('\n✓ Git hooks installed successfully!\n'));
          console.log(chalk.gray('  Hooks enforce:'));
          console.log(chalk.gray('   • Root folder cleanliness (no .md in project root)'));
          console.log(chalk.gray('   • Increment folder organization'));
          console.log(chalk.gray('   • Duplicate increment prevention'));
          console.log(chalk.gray('   • YAML validation in spec.md'));
          console.log(chalk.gray('   • Mass deletion protection'));
          console.log('');
          console.log(chalk.gray('  To bypass: git commit --no-verify'));
          console.log(chalk.gray('  To remove: rm .git/hooks/pre-commit'));
          console.log('');
        } else {
          console.log(chalk.red('\n✗ Failed to install git hooks'));
          console.log(chalk.gray('  See error messages above'));
          process.exit(1);
        }
      } catch (error) {
        consoleLogger.error('Failed to install hooks', error);
        process.exit(1);
      }
    });
}
