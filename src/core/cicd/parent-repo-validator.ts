/**
 * Parent Repository Validation Utility
 *
 * Validates consistency of parent repo naming across:
 * - .specweave/config.json (source of truth)
 * - Git remote (origin)
 * - .env file (if exists)
 *
 * Prevents the common mistake of creating duplicate parent repos
 * when using multi-project mode with -shared flag.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  configName?: string;
  gitRemoteName?: string;
  envName?: string;
}

export interface ParentRepoCheck {
  configParentName: string | null;
  gitRemoteName: string | null;
  envParentName: string | null;
}

/**
 * Extract parent repo name from config.json
 */
function getConfigParentRepoName(projectRoot: string): string | null {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const config = fs.readJsonSync(configPath);
    return config.multiProject?.parentRepoName || null;
  } catch (error) {
    console.error(chalk.yellow('⚠️  Failed to parse config.json:'), error);
    return null;
  }
}

/**
 * Extract parent repo name from git remote origin
 */
function getGitRemoteRepoName(projectRoot: string): string | null {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
    }).trim();

    // Extract repo name from URL
    // Examples:
    // - https://github.com/owner/repo.git → repo
    // - git@github.com:owner/repo.git → repo
    const match = remoteUrl.match(/\/([^\/]+?)(\.git)?$/);
    return match ? match[1].replace('.git', '') : null;
  } catch (error) {
    // Git remote doesn't exist or not a git repo
    return null;
  }
}

/**
 * Extract parent repo name from .env file
 */
function getEnvParentRepoName(projectRoot: string): string | null {
  const envPath = path.join(projectRoot, '.env');

  if (!fs.existsSync(envPath)) {
    return null;
  }

  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^PARENT_REPO_NAME=(.*)$/m);

    if (!match) {
      return null;
    }

    // Format: shared:repo-name or repo-name
    const value = match[1].trim();
    const parts = value.split(':');
    return parts.length === 2 ? parts[1] : value;
  } catch (error) {
    console.error(chalk.yellow('⚠️  Failed to read .env:'), error);
    return null;
  }
}

/**
 * Get all parent repo names from different sources
 */
export function checkParentRepoSetup(projectRoot: string): ParentRepoCheck {
  return {
    configParentName: getConfigParentRepoName(projectRoot),
    gitRemoteName: getGitRemoteRepoName(projectRoot),
    envParentName: getEnvParentRepoName(projectRoot)
  };
}

/**
 * Validate parent repo setup consistency
 */
export function validateParentRepoSetup(projectRoot: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Get all names
  const check = checkParentRepoSetup(projectRoot);
  result.configName = check.configParentName || undefined;
  result.gitRemoteName = check.gitRemoteName || undefined;
  result.envName = check.envParentName || undefined;

  // Check 1: Config has parent repo name (if multi-project enabled)
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  if (fs.existsSync(configPath)) {
    const config = fs.readJsonSync(configPath);
    const multiProjectEnabled = config.multiProject?.enabled === true;

    if (multiProjectEnabled && !check.configParentName) {
      result.valid = false;
      result.errors.push(
        '❌ Multi-project enabled but parentRepoName not set in config.json'
      );
    }
  }

  // Check 2: Git remote matches config (if both exist)
  if (check.configParentName && check.gitRemoteName) {
    if (check.configParentName !== check.gitRemoteName) {
      result.valid = false;
      result.errors.push(
        '❌ Git remote mismatch!',
        `   Config expects: ${check.configParentName}`,
        `   Git remote has: ${check.gitRemoteName}`,
        '',
        '   Fix with:',
        `   git remote set-url origin https://github.com/OWNER/${check.configParentName}.git`
      );
    }
  }

  // Check 3: .env matches config (if both exist)
  if (check.configParentName && check.envParentName) {
    if (check.configParentName !== check.envParentName) {
      result.warnings.push(
        '⚠️  .env mismatch (will be ignored):',
        `   Config: ${check.configParentName}`,
        `   .env:   ${check.envParentName}`,
        '',
        '   Update .env to match config.json'
      );
    }
  }

  // Check 4: -shared suffix consistency
  if (check.configParentName && check.configParentName.endsWith('-shared')) {
    // Config has -shared, check git and env also have it
    if (check.gitRemoteName && !check.gitRemoteName.endsWith('-shared')) {
      result.valid = false;
      result.errors.push(
        '❌ Config has -shared suffix, but git remote doesn\'t',
        '',
        `   Config: ${check.configParentName} (has -shared)`,
        `   Git:    ${check.gitRemoteName} (missing -shared)`,
        ''
      );
    }

    if (check.envParentName && !check.envParentName.endsWith('-shared')) {
      result.warnings.push(
        '⚠️  Config has -shared suffix, but .env doesn\'t',
        '',
        `   Config: ${check.configParentName} (has -shared)`,
        `   .env:   ${check.envParentName} (missing -shared)`,
        ''
      );
    }
  }

  return result;
}

/**
 * Print validation result to console
 */
export function printValidationResult(result: ValidationResult): void {
  console.log('\n🔍 Validating Parent Repo Setup...\n');

  // Show current setup
  console.log('📋 Current Setup:\n');
  console.log(`   Config (parentRepoName):  ${result.configName || chalk.gray('<not set>')}`);
  console.log(`   Git Remote (origin):      ${result.gitRemoteName || chalk.gray('<not set>')}`);
  console.log(`   .env (PARENT_REPO_NAME):  ${result.envName || chalk.gray('<not set>')}`);
  console.log('');

  // Show errors
  if (result.errors.length > 0) {
    result.errors.forEach(error => {
      console.log(chalk.red(error));
    });
    console.log('');
  }

  // Show warnings
  if (result.warnings.length > 0) {
    result.warnings.forEach(warning => {
      console.log(chalk.yellow(warning));
    });
    console.log('');
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (result.valid && result.warnings.length === 0) {
    console.log(chalk.green('✅ All checks passed!'));
    console.log('\nYour parent repo setup is consistent across:');
    console.log('  ✓ .specweave/config.json');
    console.log('  ✓ git remote (origin)');
    if (result.envName) {
      console.log('  ✓ .env');
    }
  } else {
    if (!result.valid) {
      console.log(chalk.red(`❌ Validation failed with ${result.errors.length} error(s)`));
    }
    if (result.warnings.length > 0) {
      console.log(chalk.yellow(`⚠️  Found ${result.warnings.length} warning(s)`));
    }
    console.log('\nPlease fix the issues above before syncing to GitHub.');
  }
  console.log('');
}

/**
 * Validate and exit with error code if validation fails
 * Use this in CLI commands that require valid parent repo setup
 */
export function validateOrExit(projectRoot: string): void {
  const result = validateParentRepoSetup(projectRoot);
  printValidationResult(result);

  if (!result.valid) {
    process.exit(1);
  }

  // Show warnings but don't exit
  if (result.warnings.length > 0) {
    console.log(chalk.yellow('⚠️  Warnings detected but continuing...\n'));
  }
}
