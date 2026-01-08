/**
 * Git Hooks Installer for User Projects
 *
 * Installs pre-commit hooks to enforce SpecWeave best practices:
 * - Root folder pollution check (CRITICAL)
 * - Increment folder cleanliness
 * - Duplicate increment detection
 * - YAML frontmatter validation
 * - Mass deletion protection
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { getDirname } from '../../../utils/esm-helpers.js';

const __dirname = getDirname(import.meta.url);

/**
 * Install git pre-commit hook in user project
 *
 * @param projectPath - Project directory path
 * @param templatesDir - Templates directory path
 * @returns Success boolean
 */
export function installGitHooks(projectPath: string, templatesDir: string): boolean {
  try {
    // Check if this is a git repository
    const gitDir = path.join(projectPath, '.git');
    if (!fs.existsSync(gitDir)) {
      console.log(chalk.yellow('   ⚠ Not a git repository - hooks not installed'));
      console.log(chalk.gray('     Run: git init'));
      return false;
    }

    // Check if hooks directory exists
    const hooksDir = path.join(gitDir, 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    // Copy pre-commit hook template
    const templatePath = path.join(templatesDir, 'git-hooks', 'pre-commit.template');
    const targetPath = path.join(hooksDir, 'pre-commit');

    if (!fs.existsSync(templatePath)) {
      console.log(chalk.yellow('   ⚠ Hook template not found - skipping'));
      return false;
    }

    // Check if hook already exists
    if (fs.existsSync(targetPath)) {
      // Check if it's a SpecWeave hook
      const existingContent = fs.readFileSync(targetPath, 'utf-8');
      if (existingContent.includes('SpecWeave Pre-Commit Hook')) {
        console.log(chalk.blue('   ℹ SpecWeave hooks already installed'));
        return true;
      } else {
        console.log(chalk.yellow('   ⚠ Custom pre-commit hook exists - not overwriting'));
        console.log(chalk.gray('     Manual install: cp .specweave/templates/git-hooks/pre-commit .git/hooks/'));
        return false;
      }
    }

    // Copy template to hooks directory
    fs.copyFileSync(templatePath, targetPath);

    // Make executable
    const nodeFs = require('fs');
    nodeFs.chmodSync(targetPath, '755');

    console.log(chalk.green('   ✓ Git hooks installed'));
    console.log(chalk.gray('     Pre-commit checks:'));
    console.log(chalk.gray('       1. Root pollution check (blocks .md in project root)'));
    console.log(chalk.gray('       2. Increment cleanliness (reports/ scripts/ logs/)'));
    console.log(chalk.gray('       3. Duplicate increment detection'));
    console.log(chalk.gray('       4. YAML frontmatter validation'));
    console.log(chalk.gray('       5. Mass .specweave/ deletion protection'));

    return true;
  } catch (error) {
    console.log(chalk.red('   ✗ Failed to install git hooks'));
    if (error instanceof Error) {
      console.log(chalk.gray('     ' + error.message));
    }
    return false;
  }
}

/**
 * Uninstall SpecWeave git hooks
 *
 * @param projectPath - Project directory path
 * @returns Success boolean
 */
export function uninstallGitHooks(projectPath: string): boolean {
  try {
    const hookPath = path.join(projectPath, '.git', 'hooks', 'pre-commit');

    if (!fs.existsSync(hookPath)) {
      console.log(chalk.yellow('   ⚠ No pre-commit hook found'));
      return false;
    }

    // Check if it's a SpecWeave hook
    const content = fs.readFileSync(hookPath, 'utf-8');
    if (!content.includes('SpecWeave Pre-Commit Hook')) {
      console.log(chalk.yellow('   ⚠ Not a SpecWeave hook - not removing'));
      return false;
    }

    // Remove hook
    fs.unlinkSync(hookPath);
    console.log(chalk.green('   ✓ Git hooks uninstalled'));

    return true;
  } catch (error) {
    console.log(chalk.red('   ✗ Failed to uninstall git hooks'));
    if (error instanceof Error) {
      console.log(chalk.gray('     ' + error.message));
    }
    return false;
  }
}

/**
 * Check if SpecWeave git hooks are installed
 *
 * @param projectPath - Project directory path
 * @returns True if installed
 */
export function areGitHooksInstalled(projectPath: string): boolean {
  try {
    const hookPath = path.join(projectPath, '.git', 'hooks', 'pre-commit');

    if (!fs.existsSync(hookPath)) {
      return false;
    }

    const content = fs.readFileSync(hookPath, 'utf-8');
    return content.includes('SpecWeave Pre-Commit Hook');
  } catch {
    return false;
  }
}
