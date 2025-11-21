import fs from 'fs-extra';
import * as path from 'path';
import os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { execFileNoThrowSync, isCommandAvailableSync } from '../../utils/execFileNoThrow.js';
import { detectClaudeCli, getClaudeCliDiagnostic, getClaudeCliSuggestions } from '../../utils/claude-cli-detector.js';
import { AdapterLoader } from '../../adapters/adapter-loader.js';
import { IAdapter } from '../../adapters/adapter-interface.js';
import { ClaudeMdGenerator } from '../../adapters/claude-md-generator.js';
import { AgentsMdGenerator } from '../../adapters/agents-md-generator.js';
import { getDirname } from '../../utils/esm-helpers.js';
import { generateSkillsIndex } from '../../utils/generate-skills-index.js';
import { LanguageManager, isLanguageSupported, getSupportedLanguages, getSystemPromptForLanguage } from '../../core/i18n/language-manager.js';
import { getLocaleManager } from '../../core/i18n/locale-manager.js';
import { SupportedLanguage } from '../../core/i18n/types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { generateInitialIncrement } from '../helpers/init/initial-increment-generator.js';
import { ImportCoordinator, CoordinatorConfig, CoordinatorResult } from '../../importers/import-coordinator.js';
import type { ImportConfig } from '../../importers/external-importer.js';
import { ItemConverter } from '../../importers/item-converter.js';
import { loadImportConfig } from '../../config/import-config.js';

const __dirname = getDirname(import.meta.url);

// Import folder mapper for multi-project support
import { getSpecsFoldersForProfile } from '../../core/sync/folder-mapper.js';
import { readEnvFile, parseEnvFile } from '../../utils/env-file.js';
import type { SyncProfile, JiraConfig } from '../../core/types/sync-profile.js';
import { selectRepositories, type RepoSelectionConfig } from '../helpers/github-repo-selector.js';
import { Octokit } from '@octokit/rest';

interface InitOptions {
  template?: string;
  adapter?: string;  // 'claude', 'cursor', 'generic'
  techStack?: string;
  language?: string;  // Language for i18n support
  force?: boolean;    // Force fresh start (non-interactive)
  forceRefresh?: boolean;  // Force marketplace refresh (skip cache)
  logger?: Logger;    // Logger for debug/error messages (default: consoleLogger)
}

/**
 * Detect if we're in the SpecWeave framework repository itself
 * (development mode vs. user project mode)
 *
 * @param targetDir - Directory to check
 * @returns true if this is the SpecWeave framework repo
 */
async function isSpecWeaveFrameworkRepo(targetDir: string): Promise<boolean> {
  try {
    const packageJsonPath = path.join(targetDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = await fs.readJson(packageJsonPath);

    // Check if this is the specweave package itself
    return packageJson.name === 'specweave';
  } catch (error) {
    return false;
  }
}

/**
 * Create Multi-Project Folders based on Issue Tracker Configuration
 *
 * After issue tracker setup, this function:
 * 1. Reads .env file to detect multi-project configuration (JIRA_PROJECTS, ADO_PROJECTS, etc.)
 * 2. Reads config.json to get sync profiles
 * 3. For each sync profile, creates project-specific folders
 *
 * Examples:
 * - JIRA with JIRA_PROJECTS=FE,BE → Creates .specweave/docs/internal/projects/fe/ and /be/
 * - ADO with ADO_PROJECTS=Frontend,Backend → Creates /frontend/ and /backend/
 * - GitHub (single repo) → Creates /default/ folder
 *
 * @param targetDir - Project root directory
 */
async function createMultiProjectFolders(targetDir: string): Promise<void> {
  const envPath = path.join(targetDir, '.env');
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  // Skip if no .env or config.json
  if (!fs.existsSync(envPath)) {
    return; // No issue tracker configured
  }

  // Read and parse .env file
  const envContent = readEnvFile(envPath);
  const envVars = parseEnvFile(envContent);

  // Detect multi-project configuration
  const jiraProjects = envVars.JIRA_PROJECTS?.split(',').map((p: string) => p.trim()).filter(Boolean);
  const adoProjects = envVars.ADO_PROJECTS?.split(',').map((p: string) => p.trim()).filter(Boolean);
  const jiraStrategy = envVars.JIRA_STRATEGY;
  const adoStrategy = envVars.ADO_STRATEGY;

  // If no multi-project config, skip
  if (!jiraProjects?.length && !adoProjects?.length) {
    return;
  }

  // Create sync profile if not exists
  let config: any = {};
  if (fs.existsSync(configPath)) {
    config = await fs.readJson(configPath);
  }

  // Initialize sync config if missing
  if (!config.sync) {
    config.sync = {
      enabled: true,
      profiles: {},
      activeProfile: null,
      settings: {
        autoCreateIssue: true,
        syncDirection: 'bidirectional'
      }
    };
  }

  // Create JIRA sync profile from .env
  if (jiraProjects?.length && jiraStrategy === 'project-per-team') {
    const profileId = 'jira-default';

    if (!config.sync.profiles[profileId]) {
      const jiraProfile: SyncProfile = {
        provider: 'jira',
        displayName: 'Jira Default',
        config: {
          domain: envVars.JIRA_DOMAIN || '',
          projects: jiraProjects // Multi-project support
        } as JiraConfig,
        timeRange: {
          default: '1M',
          max: '6M'
        },
        rateLimits: {
          maxItemsPerSync: 500,
          warnThreshold: 100
        }
      };

      config.sync.profiles[profileId] = jiraProfile;
      config.sync.activeProfile = profileId;

      // Save config
      await fs.writeJson(configPath, config, { spaces: 2 });

      console.log(chalk.blue('\n📁 Creating Multi-Project Folders'));
      console.log(chalk.gray(`   Detected: ${jiraProjects.length} Jira projects (${jiraProjects.join(', ')})`));

      // Create project-specific folders following SIMPLIFIED architecture (increment 0026)
      // Structure: .specweave/docs/internal/specs/{project-id}/
      // NOTE: Only specs folder is created. All docs live at root internal/ level.
      for (const projectKey of jiraProjects) {
        const projectId = projectKey.toLowerCase(); // FE → fe, BE → be
        const internalDocsPath = path.join(targetDir, '.specweave', 'docs', 'internal');

        // Create ONLY specs folder (simplified structure)
        const specsPath = path.join(internalDocsPath, 'specs', projectId);

        if (!fs.existsSync(specsPath)) {
          fs.mkdirSync(specsPath, { recursive: true });
        }

        console.log(chalk.green(`   ✓ Created project: ${projectKey} (simplified structure)`));
      }

      console.log('');
    }
  }

  // ADO multi-project support (future)
  if (adoProjects?.length && adoStrategy === 'project-per-team') {
    // TODO: Implement ADO multi-project folder creation
    // Similar logic to JIRA above
  }
}

export async function initCommand(
  projectName?: string,
  options: InitOptions = {}
): Promise<void> {
  // Initialize logger (injectable for testing)
  const logger = options.logger ?? consoleLogger;

  // NOTE: This CLI command is 99% user-facing output (console.log/console.error).
  // All console.* calls in this function are legitimate user-facing exceptions
  // as defined in CONTRIBUTING.md (colored messages, confirmations, formatted output).
  // Logger is available for any internal debug logs if needed in future.

  // Detect CI/non-interactive environment (use throughout function)
  const isCI = process.env.CI === 'true' ||
               process.env.GITHUB_ACTIONS === 'true' ||
               process.env.GITLAB_CI === 'true' ||
               process.env.CIRCLECI === 'true' ||
               !process.stdin.isTTY;

  // Validate and normalize language option
  const language = options.language?.toLowerCase() || 'en';

  // Validate language if provided
  if (options.language && !isLanguageSupported(language)) {
    const locale = getLocaleManager('en'); // Use English for error messages about invalid language
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.invalidLanguage', { language: options.language })}`));
    console.error(chalk.yellow(`${locale.t('cli', 'init.errors.supportedLanguages', { languages: getSupportedLanguages().join(', ') })}\n`));
    process.exit(1);
  }

  // Initialize LanguageManager and LocaleManager
  const i18n = new LanguageManager({ defaultLanguage: language as SupportedLanguage });
  const locale = getLocaleManager(language as SupportedLanguage);

  // Display welcome message in user's language
  console.log(chalk.blue.bold(`\n${locale.t('cli', 'init.welcome')}\n`));

  let targetDir: string;
  let finalProjectName: string;
  let usedDotNotation = false;
  let continueExisting = false; // Track if user chose to continue with existing project

  // Handle "." for current directory initialization
  if (projectName === '.') {
    usedDotNotation = true;
    targetDir = process.cwd();

    // CRITICAL SAFETY CHECK: Prevent initialization in home directory
    const homeDir = os.homedir();
    if (path.resolve(targetDir) === path.resolve(homeDir)) {
      console.log('');
      console.log(chalk.red.bold('❌ DANGEROUS: Cannot initialize SpecWeave in home directory!'));
      console.log('');
      console.log(chalk.yellow('   Your home directory contains ALL your projects.'));
      console.log(chalk.yellow('   Initializing here would treat everything as one project.'));
      console.log('');
      console.log(chalk.cyan('💡 What to do instead:'));
      console.log(chalk.white('   1. Create a project directory:'));
      console.log(chalk.gray('      mkdir ~/Projects/my-project'));
      console.log(chalk.white('   2. Navigate to it:'));
      console.log(chalk.gray('      cd ~/Projects/my-project'));
      console.log(chalk.white('   3. Initialize:'));
      console.log(chalk.gray('      specweave init .'));
      console.log('');
      console.log(chalk.white('   Or use a project name:'));
      console.log(chalk.gray('      specweave init my-project'));
      console.log('');
      process.exit(1);
    }

    const dirName = path.basename(targetDir);

    // Validate directory name is suitable for project name
    if (!/^[a-z0-9-]+$/.test(dirName)) {
      const suggestedName = dirName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

      if (isCI) {
        // CI mode: auto-sanitize directory name without prompting
        console.log(chalk.yellow(`\n${locale.t('cli', 'init.warnings.invalidDirName', { dirName })}`));
        console.log(chalk.gray(`   → CI mode: Auto-sanitizing to "${suggestedName}"`));
        finalProjectName = suggestedName;
      } else {
        // Interactive mode: prompt user
        console.log(chalk.yellow(`\n${locale.t('cli', 'init.warnings.invalidDirName', { dirName })}`));
        const { name } = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Project name (for templates):',
            default: suggestedName,
            validate: (input: string) => {
              if (/^[a-z0-9-]+$/.test(input)) return true;
              return 'Project name must be lowercase letters, numbers, and hyphens only';
            },
          },
        ]);
        finalProjectName = name;
      }
    } else {
      finalProjectName = dirName;
    }

    // Safety: Warn if directory is not empty
    const allFiles = fs.readdirSync(targetDir);
    const existingFiles = allFiles.filter(f => !f.startsWith('.')); // Ignore hidden files

    if (existingFiles.length > 0 && !options.force) {
      if (isCI) {
        // CI mode: allow initialization in non-empty directory without prompting
        console.log(chalk.yellow(`\n${locale.t('cli', 'init.warnings.directoryNotEmpty', { count: existingFiles.length, plural: existingFiles.length === 1 ? '' : 's' })}`));
        console.log(chalk.gray(`   → CI mode: Proceeding with initialization`));
      } else {
        console.log(chalk.yellow(`\n${locale.t('cli', 'init.warnings.directoryNotEmpty', { count: existingFiles.length, plural: existingFiles.length === 1 ? '' : 's' })}`));
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Initialize SpecWeave in current directory?',
            default: false,
          },
        ]);

        if (!confirm) {
          console.log(chalk.yellow(locale.t('cli', 'init.errors.cancelled')));
          process.exit(0);
        }
      }
    }

    // Check if .specweave already exists - SMART RE-INITIALIZATION
    if (fs.existsSync(path.join(targetDir, '.specweave'))) {
      console.log(chalk.blue('\n📦 Existing SpecWeave project detected!'));
      console.log(chalk.gray('   Found .specweave/ folder with your increments, docs, and configuration.\n'));

      let action: string;

      if (options.force) {
        // ⚠️ CRITICAL WARNING: --force attempts fresh start
        console.log(chalk.red.bold('\n⛔ DANGER: --force DELETES ALL DATA!'));
        console.log(chalk.red('   This will permanently delete:'));
        console.log(chalk.red('   • All increments (.specweave/increments/)'));
        console.log(chalk.red('   • All documentation (.specweave/docs/)'));
        console.log(chalk.red('   • All configuration and history'));
        console.log(chalk.yellow('\n   💡 TIP: Use "specweave init ." (no --force) for safe updates\n'));

        if (isCI) {
          // CI mode: proceed with force deletion without prompting (test environment)
          console.log(chalk.gray('   → CI mode: Proceeding with force deletion'));
          action = 'fresh';
        } else {
          // Interactive mode: ALWAYS require confirmation, even in force mode (safety critical!)
          const { confirmDeletion } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmDeletion',
              message: chalk.red('⚠️  Type "y" to PERMANENTLY DELETE all .specweave/ data:'),
              default: false,
            },
          ]);

          if (!confirmDeletion) {
            console.log(chalk.green('\n✅ Deletion cancelled. No data lost.'));
            console.log(chalk.gray('   → Run "specweave init ." (without --force) for safe updates'));
            process.exit(0);
          }

          action = 'fresh';
        }
        console.log(chalk.yellow('\n   🔄 Force mode: Proceeding with fresh start...'));
      } else if (isCI) {
        // CI mode: auto-continue with existing project
        console.log(chalk.gray('   → CI mode: Continuing with existing project'));
        action = 'continue';
      } else {
        // Interactive mode: Ask user what to do
        const result = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              {
                name: '✨ Continue working (keep all existing increments, docs, and history)',
                value: 'continue',
                short: 'Continue'
              },
              {
                name: '🔄 Fresh start (delete .specweave/ and start from scratch)',
                value: 'fresh',
                short: 'Fresh start'
              },
              {
                name: '❌ Cancel (exit without changes)',
                value: 'cancel',
                short: 'Cancel'
              }
            ],
            default: 'continue'
          },
        ]);
        action = result.action;
      }

      if (action === 'cancel') {
        console.log(chalk.yellow('\n⏸️  Initialization cancelled. No changes made.'));
        process.exit(0);
      }

      if (action === 'fresh') {
        if (!options.force) {
          if (isCI) {
            // CI mode: NEVER allow fresh start without explicit --force flag (safety critical!)
            console.log(chalk.red('\n⛔ ERROR: Cannot start fresh in CI mode without --force flag'));
            console.log(chalk.gray('   → Use "specweave init . --force" if you really want to delete all data'));
            process.exit(1);
          }

          // Interactive mode: Ask for confirmation (force mode already confirmed above)
          console.log(chalk.yellow('\n⚠️  WARNING: This will DELETE all increments, docs, and configuration!'));
          const { confirmFresh } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmFresh',
              message: 'Are you sure you want to start fresh? (all .specweave/ content will be lost)',
              default: false,
            },
          ]);

          if (!confirmFresh) {
            console.log(chalk.yellow('\n⏸️  Fresh start cancelled. No changes made.'));
            process.exit(0);
          }
        }

        // Create backup before deletion (safety net!)
        const specweavePath = path.join(targetDir, '.specweave');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const backupPath = path.join(targetDir, `.specweave.backup-${timestamp}`);

        try {
          console.log(chalk.cyan('\n   📦 Creating backup before deletion...'));
          fs.copySync(specweavePath, backupPath);
          console.log(chalk.green(`   ✅ Backup saved: ${path.relative(targetDir, backupPath)}`));
          console.log(chalk.gray(`      To restore: mv ${path.basename(backupPath)} .specweave`));
        } catch (backupError) {
          console.log(chalk.yellow('   ⚠️  Could not create backup (proceeding anyway)'));
        }

        // Count files before deletion (for logging)
        let fileCount = 0;
        try {
          const countFiles = (dir: string): number => {
            let count = 0;
            const items = fs.readdirSync(dir);
            for (const item of items) {
              const fullPath = path.join(dir, item);
              if (fs.statSync(fullPath).isDirectory()) {
                count += countFiles(fullPath);
              } else {
                count++;
              }
            }
            return count;
          };
          fileCount = countFiles(specweavePath);
        } catch (e) {
          // Ignore errors
        }

        // Delete .specweave/ for fresh start
        fs.removeSync(specweavePath);
        console.log(chalk.blue(`\n   ♻️  Removed .specweave/ (${fileCount} files deleted)`));
        // NOTE: No need to delete .claude/ - marketplace is GLOBAL, not per-project
        console.log(chalk.green('   ✅ Starting fresh - will create new .specweave/ structure\n'));
      } else {
        // Continue working - keep everything
        continueExisting = true;
        console.log(chalk.green('\n✅ Continuing with existing project'));
        console.log(chalk.gray('   → Keeping all increments, docs, and history'));
        console.log(chalk.gray('   → Config will be updated if needed\n'));
        // NOTE: No need to refresh .claude/settings.json - marketplace is GLOBAL via CLI
      }
    }
  } else {
    // Original behavior: create subdirectory
    // 1. Get project name if not provided
    if (!projectName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Project name:',
          default: 'my-saas',
          validate: (input: string) => {
            if (/^[a-z0-9-]+$/.test(input)) return true;
            return 'Project name must be lowercase letters, numbers, and hyphens only';
          },
        },
      ]);
      projectName = answers.projectName;
    }

    targetDir = path.resolve(process.cwd(), projectName!);
    finalProjectName = projectName!;

    // 2. Check if directory exists
    if (fs.existsSync(targetDir)) {
      // Brownfield-safe: Check what's in the directory
      const allFiles = fs.readdirSync(targetDir);
      const existingFiles = allFiles.filter(f => !f.startsWith('.')); // Ignore hidden files
      const hasSpecweave = fs.existsSync(path.join(targetDir, '.specweave'));

      if (existingFiles.length > 0 || hasSpecweave) {
        console.log(chalk.yellow(`\nDirectory ${projectName} exists with ${existingFiles.length} file(s).`));

        if (hasSpecweave) {
          // SMART RE-INITIALIZATION (same as current directory case)
          console.log(chalk.blue('\n📦 Existing SpecWeave project detected!'));
          console.log(chalk.gray('   Found .specweave/ folder with your increments, docs, and configuration.\n'));

          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: 'What would you like to do?',
              choices: [
                {
                  name: '✨ Continue working (keep all existing increments, docs, and history)',
                  value: 'continue',
                  short: 'Continue'
                },
                {
                  name: '🔄 Fresh start (delete .specweave/ and start from scratch)',
                  value: 'fresh',
                  short: 'Fresh start'
                },
                {
                  name: '❌ Cancel (exit without changes)',
                  value: 'cancel',
                  short: 'Cancel'
                }
              ],
              default: 'continue'
            },
          ]);

          if (action === 'cancel') {
            console.log(chalk.yellow('\n⏸️  Initialization cancelled. No changes made.'));
            process.exit(0);
          }

          if (action === 'fresh') {
            console.log(chalk.yellow('\n⚠️  WARNING: This will DELETE all increments, docs, and configuration!'));
            const { confirmFresh } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirmFresh',
                message: 'Are you sure you want to start fresh? (all .specweave/ content will be lost)',
                default: false,
              },
            ]);

            if (!confirmFresh) {
              console.log(chalk.yellow('\n⏸️  Fresh start cancelled. No changes made.'));
              process.exit(0);
            }

            // Delete .specweave/ for fresh start
            fs.removeSync(path.join(targetDir, '.specweave'));
            console.log(chalk.blue('   ♻️  Removed .specweave/ (fresh start)'));
            // NOTE: No need to delete .claude/ - marketplace is GLOBAL, not per-project
            console.log(chalk.green('   ✅ Starting fresh - will create new .specweave/ structure\n'));
          } else {
            // Continue working - keep everything
            continueExisting = true;
            console.log(chalk.green('\n✅ Continuing with existing project'));
            console.log(chalk.gray('   → Keeping all increments, docs, and history'));
            console.log(chalk.gray('   → Config will be updated if needed\n'));
            // NOTE: No need to refresh .claude/settings.json - marketplace is GLOBAL via CLI
          }
        } else {
          // No .specweave/ folder, just brownfield directory with files
          const { initExisting } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'initExisting',
              message: 'Initialize SpecWeave in existing directory (non-destructive)?',
              default: false,
            },
          ]);

          if (!initExisting) {
            console.log(chalk.yellow(locale.t('cli', 'init.errors.cancelled')));
            process.exit(0);
          }

          console.log(chalk.green('   ✅ Initializing in existing directory (brownfield-safe)\n'));
        }
      }
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  // 3. Check for nested .specweave/ (CRITICAL: prevent nested folders)
  const parentSpecweaveFolders = detectNestedSpecweave(targetDir);
  if (parentSpecweaveFolders && parentSpecweaveFolders.length > 0) {
    console.log('');
    console.log(chalk.red.bold(locale.t('cli', 'init.errors.nestedNotSupported')));
    console.log('');

    // Check if home directory has .specweave/ (special warning)
    const homeDirFolder = parentSpecweaveFolders.find(f => f.isHomeDir);
    if (homeDirFolder) {
      console.log(chalk.red.bold('   ⚠️  CRITICAL: Found .specweave/ in HOME DIRECTORY!'));
      console.log(chalk.yellow(`   ${homeDirFolder.path}`));
      console.log('');
      console.log(chalk.yellow('   This is ALMOST ALWAYS a mistake!'));
      console.log(chalk.gray('   • Your home directory should NOT be a SpecWeave project'));
      console.log(chalk.gray('   • This treats ALL your files as one giant project'));
      console.log(chalk.gray('   • You likely ran "specweave init ." from home by accident'));
      console.log('');
      console.log(chalk.cyan.bold('   💡 Quick fix:'));
      console.log(chalk.white(`   rm -rf "${homeDirFolder.path}/.specweave"`));
      console.log(chalk.gray('   Then try your command again'));
      console.log('');
    }

    // Show all found .specweave/ folders
    if (parentSpecweaveFolders.length === 1 && !homeDirFolder) {
      console.log(chalk.yellow(`   ${locale.t('cli', 'init.errors.parentFound')}`));
      console.log(chalk.white(`   ${parentSpecweaveFolders[0].path}`));
    } else if (!homeDirFolder) {
      console.log(chalk.yellow(`   Found ${parentSpecweaveFolders.length} parent .specweave/ folders:`));
      console.log('');

      // Sort by depth (closest first)
      const sortedFolders = [...parentSpecweaveFolders].sort((a, b) => a.depth - b.depth);

      sortedFolders.forEach((folder, index) => {
        const marker = index === 0 ? chalk.green('✓ CLOSEST') : chalk.gray(`  ${folder.depth} level${folder.depth > 1 ? 's' : ''} up`);
        console.log(`   ${marker}: ${chalk.white(folder.path)}`);
      });
    }

    console.log('');
    console.log(chalk.cyan(`   ${locale.t('cli', 'init.info.nestedEnforcement')}`));
    console.log(chalk.gray(`   ${locale.t('cli', 'init.info.nestedBullet1')}`));
    console.log(chalk.gray(`   ${locale.t('cli', 'init.info.nestedBullet2')}`));
    console.log(chalk.gray(`   ${locale.t('cli', 'init.info.nestedBullet3')}`));
    console.log('');

    // Suggest using the CLOSEST folder (most relevant)
    const closestFolder = parentSpecweaveFolders.reduce((closest, current) =>
      current.depth < closest.depth ? current : closest
    );

    console.log(chalk.cyan(`   ${locale.t('cli', 'init.info.nestedToFix')}`));
    console.log(chalk.green.bold(`   Recommended: Use the CLOSEST .specweave/ folder`));
    console.log(chalk.white(`   ${locale.t('cli', 'init.nestedCdCommand', { path: closestFolder.path })}`));
    console.log(chalk.white(`   ${locale.t('cli', 'init.nestedIncCommand')}`));
    console.log('');

    // Provide cleanup option if user has multiple unnecessary folders
    if (parentSpecweaveFolders.length > 1) {
      console.log(chalk.yellow.bold(`   💡 Tip: Multiple .specweave/ folders detected`));
      console.log(chalk.gray(`   If some are unnecessary, consider removing them:`));
      console.log('');
      parentSpecweaveFolders.forEach(folder => {
        console.log(chalk.gray(`   rm -rf "${folder.path}/.specweave"  # Remove if not needed`));
      });
      console.log('');
    }

    process.exit(1);
  }

  const spinner = ora('Creating SpecWeave project...').start();

  try {
    // 4. Detect or select tool
    const adapterLoader = new AdapterLoader();
    let toolName: string;

    if (options.adapter) {
      // User explicitly chose a tool via --adapter flag
      toolName = options.adapter;
      spinner.text = `Using ${toolName}...`;
    } else {
      // SMART CHECK: If continuing existing project, read existing adapter from config
      let existingAdapter: string | null = null;
      if (continueExisting) {
        const existingConfigPath = path.join(targetDir, '.specweave', 'config.json');
        if (fs.existsSync(existingConfigPath)) {
          try {
            const existingConfig = fs.readJsonSync(existingConfigPath);
            existingAdapter = existingConfig?.adapters?.default || null;
          } catch (error) {
            // Invalid config, will proceed with detection
          }
        }
      }

      // Detect tool and always ask user (even if matches existing config)
      const detectedTool = await adapterLoader.detectTool();

      spinner.stop();
      console.log('');
      console.log(chalk.cyan(`🔍 ${locale.t('cli', 'init.toolDetection.header')}`));

      // Show existing adapter if present
      if (existingAdapter) {
        console.log(chalk.blue(`   📋 Current adapter: ${existingAdapter}`));
        if (existingAdapter === detectedTool) {
          console.log(chalk.gray(`   Detected tool matches current config`));
        } else {
          console.log(chalk.yellow(`   ⚠️  Detected tool (${detectedTool}) differs from config`));
        }
      } else {
        // No existing adapter (new project)
        if (detectedTool === 'claude') {
          console.log(chalk.gray(`   Recommended: ${detectedTool} (no other tool detected)`));
        } else {
          console.log(chalk.gray(`   ${locale.t('cli', 'init.toolDetection.detected', { tool: detectedTool })}`));
        }
      }
      console.log('');

      // Use function-level isCI (already defined at function start)
      let confirmTool = true; // Default to yes

      if (isCI) {
        // In CI, automatically use detected tool without prompting
        console.log(chalk.gray(`   ${locale.t('cli', 'init.toolDetection.ciAutoConfirm', { tool: detectedTool })}`));
        toolName = detectedTool;
      } else {
        // Interactive mode - ask for confirmation
        const response = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmTool',
            message: locale.t('cli', 'init.toolDetection.confirmPrompt', { tool: detectedTool }),
            default: true
          }
        ]);
        confirmTool = response.confirmTool;
      }

      if (!confirmTool) {
        // Let user choose from available tools
        const { selectedTool } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedTool',
            message: locale.t('cli', 'init.toolDetection.selectPrompt'),
            choices: [
              { name: `Claude Code (Recommended - Full automation)`, value: 'claude' },
              { name: 'Cursor (Partial - AGENTS.md compilation, team commands, less reliable)', value: 'cursor' },
              { name: 'Other (Copilot, ChatGPT, Gemini - Limited: no hooks, manual workflow, high context usage)', value: 'generic' }
            ]
          }
        ]);
        toolName = selectedTool;
      } else {
        // User confirmed detected tool
        toolName = detectedTool;
      }

      spinner.start(`Using ${toolName}...`);
    }

    // 4. Create directory structure (adapter-specific)
    // Skip if continuing with existing project (directories already exist)
    if (!continueExisting) {
      createDirectoryStructure(targetDir, toolName);
      spinner.text = 'Directory structure created...';
    } else {
      spinner.text = 'Using existing directory structure...';
    }

    // 5. Configure GitHub marketplace for Claude Code
    // ✅ NEW APPROACH: Claude Code fetches plugins from GitHub (no local copying!)
    if (toolName === 'claude') {
      try {
        spinner.text = 'Configuring GitHub marketplace...';

        // Settings.json will be created by setupClaudePluginAutoRegistration()
        // No need to copy marketplace or plugins - everything is fetched from GitHub

        spinner.succeed('GitHub marketplace configured');
        console.log(chalk.gray(`   ✓ Marketplace: github.com/anton-abyzov/specweave/.claude-plugin`));
        console.log(chalk.gray(`   ✓ Plugins fetch on-demand (no local copies = faster init)`));
      } catch (error) {
        // Log errors in debug mode for troubleshooting
        if (process.env.DEBUG) {
          spinner.stop();
          console.error(chalk.red(`\n❌ Marketplace setup error: ${error instanceof Error ? error.message : String(error)}`));
          if (error instanceof Error && error.stack) {
            console.error(chalk.gray(error.stack));
          }
          spinner.start();
        }
        console.warn(chalk.yellow(`\n${locale.t('cli', 'init.warnings.marketplaceCopyFailed')}`));
      }
    }

    // 6. Copy base templates (config, README, CLAUDE.md - same for all)
    // Skip if continuing with existing project (files already exist)
    if (!continueExisting) {
      const templatesDir = findSourceDir('templates');
      await copyTemplates(templatesDir, targetDir, finalProjectName, language as SupportedLanguage);
      spinner.text = 'Base templates copied...';
    } else {
      spinner.text = 'Skipping template copying (using existing files)...';
    }

    // 6. Install based on tool
    if (toolName === 'claude') {
      // DEFAULT: Native Claude Code plugins (installed globally via /plugin install)
      // No per-project copying needed - plugins work across all projects!
      spinner.text = 'Configuring for Claude Code...';

      console.log(`\n${locale.t('cli', 'init.claudeNativeComplete')}`);
      console.log(`   ${locale.t('cli', 'init.claudeNativeBenefits')}`);
    } else {
      // Use adapter for non-Claude tools
      spinner.text = `Installing ${toolName} adapter...`;

      const adapter = adapterLoader.getAdapter(toolName);
      if (!adapter) {
        throw new Error(`Adapter not found: ${toolName}`);
      }

      await adapterLoader.checkRequirements(toolName);

      await adapter.install({
        projectPath: targetDir,
        projectName: finalProjectName,
        techStack: options.techStack ? { language: options.techStack } : undefined,
        docsApproach: 'incremental'
      });

      // 6. Copy plugins/ folder for non-Claude adapters
      // CRITICAL: Copilot/Cursor/Generic need local plugins/ folder!
      // AGENTS.md instructs AI to read plugins/specweave/commands/*.md
      // Without this folder, those commands don't exist in the project!
      if (toolName !== 'claude') {
        spinner.start('Copying plugins folder for command execution...');

        try {
          const specweavePackageRoot = findPackageRoot(__dirname);
          if (specweavePackageRoot) {
            const sourcePluginsDir = path.join(specweavePackageRoot, 'plugins');
            const targetPluginsDir = path.join(targetDir, 'plugins');

            if (fs.existsSync(sourcePluginsDir)) {
              // Copy entire plugins/ folder from SpecWeave package to user project
              fs.copySync(sourcePluginsDir, targetPluginsDir, {
                overwrite: true,
                filter: (src) => {
                  // Exclude .DS_Store and other hidden files
                  const basename = path.basename(src);
                  return !basename.startsWith('.');
                }
              });

              spinner.succeed('Plugins folder copied successfully');
              console.log(chalk.green('   ✔ AI can now execute SpecWeave commands'));
              console.log(chalk.gray('   → Copilot/Cursor will read plugins/specweave/commands/*.md'));
            } else {
              spinner.warn('Could not find plugins/ in SpecWeave package');
              console.log(chalk.yellow('   → Command execution may not work without plugins/ folder'));
            }
          } else {
            spinner.warn('Could not locate SpecWeave package');
            console.log(chalk.yellow('   → Skipping plugins/ folder copy'));
          }
        } catch (error) {
          spinner.warn('Could not copy plugins folder');
          console.log(chalk.yellow(`   ${error instanceof Error ? error.message : error}`));
        }
      }

      // 7. Install core plugin for non-Claude adapters
      // CRITICAL: Cursor/Copilot/Generic need plugin files in project!
      // Claude uses plugin system (global), but others need local files for AGENTS.md/instructions.md
      try {
        spinner.start('Installing SpecWeave core plugin...');

        // Load core plugin from plugins/specweave/
        const corePluginPath = findSourceDir('plugins/specweave');
        const { PluginLoader } = await import('../../core/plugin-loader.js');
        const loader = new PluginLoader();
        const corePlugin = await loader.loadFromDirectory(corePluginPath);

        // Compile for adapter (Cursor → AGENTS.md, Copilot → instructions.md, etc.)
        if (adapter.supportsPlugins()) {
          await adapter.compilePlugin(corePlugin);
          spinner.succeed('SpecWeave core plugin installed');
          console.log(chalk.green('   ✔ Skills, agents, commands added to project'));
          console.log(chalk.gray(`   → ${corePlugin.skills.length} skills, ${corePlugin.agents.length} agents, ${corePlugin.commands.length} commands`));
        } else {
          spinner.warn('Adapter does not support plugins');
          console.log(chalk.yellow('   → Core functionality may be limited'));
        }
      } catch (error) {
        spinner.warn('Could not install core plugin');
        console.log(chalk.yellow(`   ${error instanceof Error ? error.message : error}`));
        console.log(chalk.gray('   → You can manually reference plugin files if needed'));
      }
    }

    // 9. Initialize git (skip if .git already exists)
    const gitDir = path.join(targetDir, '.git');
    if (!fs.existsSync(gitDir)) {
      // Use secure command execution for git commands
      const gitInitResult = execFileNoThrowSync('git', ['init'], { cwd: targetDir, shell: false });
      if (gitInitResult.success) {
        spinner.text = 'Git repository initialized...';
      } else {
        spinner.warn('Git initialization skipped (git not found)');
      }

      // 10. Create initial commit (if git init succeeded)
      if (gitInitResult.success) {
        const gitAddResult = execFileNoThrowSync('git', ['add', '.'], { cwd: targetDir, shell: false });
        if (gitAddResult.success) {
          const gitCommitResult = execFileNoThrowSync('git', [
            'commit',
            '-m',
            'Initial commit with SpecWeave'
          ], { cwd: targetDir, shell: false });

          if (gitCommitResult.success) {
            spinner.text = 'Initial commit created...';
          }
          // Git commit might fail if no user configured - that's ok, no need to warn
        }
      }
    } else {
      spinner.text = 'Using existing Git repository...';
    }

    spinner.succeed('SpecWeave project created successfully!');

    // 11. Show tool-specific next steps
    if (toolName !== 'claude') {
      const adapter = adapterLoader.getAdapter(toolName);
      if (adapter) {
        await adapter.postInstall({
          projectPath: targetDir,
          projectName: finalProjectName,
          techStack: options.techStack ? { language: options.techStack } : undefined,
          docsApproach: 'incremental'
        });
      }
    }

    // 12. Create config.json with basic settings (testing params added later)
    createConfigFile(targetDir, finalProjectName, toolName, language as SupportedLanguage, false);

    // 14. AUTO-INSTALL ALL PLUGINS via Claude CLI (Breaking Change: No selective loading)
    // NOTE: We do NOT create .claude/settings.json - marketplace registration via CLI is GLOBAL
    // and persists across all projects. settings.json would be redundant.
    let autoInstallSucceeded = false;
    if (toolName === 'claude') {
      // Pre-flight check: Is Claude CLI available? (ROBUST CHECK)
      const claudeStatus = detectClaudeCli();

      if (!claudeStatus.available) {
        // Claude CLI NOT working → explain clearly with actionable diagnostics
        const diagnostic = getClaudeCliDiagnostic(claudeStatus);
        const suggestions = getClaudeCliSuggestions(claudeStatus);

        spinner.warn(diagnostic);
        console.log('');
        console.log(chalk.yellow.bold('⚠️  Claude Code CLI Issue Detected'));
        console.log('');

        // Show detailed diagnostic info with MORE context
        if (claudeStatus.commandExists) {
          console.log(chalk.white('Found command in PATH, but verification failed:'));
          console.log('');
          if (claudeStatus.commandPath) {
            console.log(chalk.gray(`   Path: ${claudeStatus.commandPath}`));
          }
          if (claudeStatus.exitCode !== undefined) {
            console.log(chalk.gray(`   Exit code: ${claudeStatus.exitCode}`));
          }
          console.log(chalk.gray(`   Issue: ${claudeStatus.error}`));
          console.log('');

          // Explain what this likely means
          if (claudeStatus.error === 'version_check_failed') {
            console.log(chalk.yellow('⚠️  This likely means:'));
            console.log(chalk.gray('   • You have a DIFFERENT tool named "claude" in PATH'));
            console.log(chalk.gray('   • It\'s not the Claude Code CLI from Anthropic'));
            console.log(chalk.gray('   • The command exists but doesn\'t respond to --version'));
          }
        } else {
          console.log(chalk.white('Claude CLI not found in PATH'));
        }
        console.log('');

        // Show actionable suggestions
        console.log(chalk.cyan('💡 How to fix:'));
        console.log('');
        suggestions.forEach(suggestion => {
          console.log(chalk.gray(`   ${suggestion}`));
        });
        console.log('');

        // Only show alternatives if user is NOT using Claude already
        if (claudeStatus.error === 'command_not_found') {
          console.log(chalk.cyan('Alternative Options:'));
          console.log('');
          console.log(chalk.white('1️⃣  Use Claude Code IDE (no CLI needed):'));
          console.log(chalk.gray('   → Open this project in Claude Code'));
          console.log(chalk.gray('   → Run: /plugin install specweave'));
          console.log(chalk.gray('   → Works immediately, no npm installation!'));
          console.log('');
          console.log(chalk.white('2️⃣  Use Different AI Tool:'));
          console.log(chalk.gray('   → Run: specweave init --adapter cursor'));
          console.log(chalk.gray('   → Works without Claude CLI'));
          console.log(chalk.gray('   → Less automation but no CLI dependency'));
          console.log('');
        }

        autoInstallSucceeded = false;
      } else {
        // Claude CLI available → install ALL plugins from marketplace
        try {
          const marketplaceCachePath = path.join(
            os.homedir(),
            '.claude/plugins/marketplaces/specweave/.claude-plugin/marketplace.json'
          );

          // ULTRAFAST: Check if cache is fresh (< 5 min old) and valid
          let needsRefresh = true;
          let cacheAlreadyValid = false;

          // Skip cache if forceRefresh flag is set
          if (!options.forceRefresh && fs.existsSync(marketplaceCachePath)) {
            const cacheStats = fs.statSync(marketplaceCachePath);
            const cacheAge = Date.now() - cacheStats.mtimeMs;
            const fiveMinutes = 5 * 60 * 1000;

            if (cacheAge < fiveMinutes) {
              try {
                const cacheData = JSON.parse(fs.readFileSync(marketplaceCachePath, 'utf-8'));
                const hasValidPlugins = cacheData.plugins &&
                  cacheData.plugins.length >= 25 &&
                  cacheData.plugins.every((p: any) => p.name && p.version && p.description);

                if (hasValidPlugins) {
                  needsRefresh = false;
                  cacheAlreadyValid = true;
                  console.log(chalk.green('   ⚡ Using cached marketplace (fresh)'));
                }
              } catch {
                // Cache exists but invalid, needs refresh
              }
            }
          }

          if (needsRefresh) {
            // Step 1: Remove existing marketplace to force update
            spinner.start('Refreshing SpecWeave marketplace...');

            const listResult = execFileNoThrowSync('claude', [
              'plugin',
              'marketplace',
              'list'
            ]);

            const marketplaceExists = listResult.success &&
              (listResult.stdout || '').toLowerCase().includes('specweave');

            if (marketplaceExists) {
              execFileNoThrowSync('claude', [
                'plugin',
                'marketplace',
                'remove',
                'specweave'
              ]);
              console.log(chalk.blue('   🔄 Removed existing marketplace for update'));
            }

            // Step 2: Add marketplace from GitHub (always fresh)
            const addResult = execFileNoThrowSync('claude', [
              'plugin',
              'marketplace',
              'add',
              'anton-abyzov/specweave'
            ]);

            if (!addResult.success) {
              throw new Error('Failed to add marketplace from GitHub');
            }

            console.log(chalk.green('   ✔ Marketplace registered from GitHub'));

            // NO WAIT NEEDED: We load from source (npm package), not cache
            // The cache is populated asynchronously by Claude Code and isn't used during init
            spinner.succeed('SpecWeave marketplace ready');
          }

          // Step 2: Load marketplace.json to get ALL available plugins
          spinner.start('Loading available plugins...');
          const marketplaceJsonPath = findSourceDir('.claude-plugin/marketplace.json');

          if (!fs.existsSync(marketplaceJsonPath)) {
            throw new Error('marketplace.json not found - cannot determine plugins to install');
          }

          const marketplace = JSON.parse(fs.readFileSync(marketplaceJsonPath, 'utf-8'));
          const allPlugins = marketplace.plugins || [];

          if (allPlugins.length === 0) {
            throw new Error('No plugins found in marketplace.json');
          }

          console.log(chalk.blue(`   📦 Found ${allPlugins.length} plugins to install`));
          spinner.succeed(`Found ${allPlugins.length} plugins`);

          // Step 3: Install ALL plugins with retry logic (handles remaining race conditions)
          let successCount = 0;
          let failCount = 0;
          const failedPlugins: string[] = [];

          for (const plugin of allPlugins) {
            const pluginName = plugin.name;
            spinner.start(`Installing ${pluginName}...`);

            // Retry up to 3 times with exponential backoff
            let installed = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
              const installResult = execFileNoThrowSync('claude', [
                'plugin',
                'install',
                pluginName
              ]);

              if (installResult.success) {
                installed = true;
                break;
              }

              // If "not found" error and not last attempt, wait and retry
              if (installResult.stderr?.includes('not found') && attempt < 3) {
                spinner.text = `Installing ${pluginName}... (retry ${attempt}/3)`;
                await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // 500ms, 1s, 1.5s
                continue;
              }

              // Other errors or final attempt - stop retrying
              break;
            }

            if (installed) {
              successCount++;
              spinner.succeed(`${pluginName} installed`);
            } else {
              failCount++;
              failedPlugins.push(pluginName);
              spinner.warn(`${pluginName} failed (will continue)`);
            }
          }

          // Step 4: Report results
          console.log('');
          console.log(chalk.green.bold(`✅ Plugin Installation Complete`));
          console.log(chalk.white(`   Installed: ${successCount}/${allPlugins.length} plugins`));

          if (failCount > 0) {
            console.log(chalk.yellow(`   Failed: ${failCount} plugins`));
            console.log(chalk.gray(`   Failed plugins: ${failedPlugins.join(', ')}`));
            console.log(chalk.gray(`   → You can install these manually later`));
          }

          console.log('');
          console.log(chalk.cyan('📋 Available capabilities:'));
          console.log(chalk.gray('   • /specweave:increment - Plan new features'));
          console.log(chalk.gray('   • /specweave:do - Execute tasks'));
          console.log(chalk.gray('   • /specweave-github:sync - GitHub integration'));
          console.log(chalk.gray('   • /specweave-jira:sync - JIRA integration'));
          console.log(chalk.gray('   • /specweave:docs preview - Documentation preview'));
          console.log(chalk.gray('   • ...and more!'));

          autoInstallSucceeded = successCount > 0;

        } catch (error: any) {
          // Installation failed - provide helpful diagnostics
          spinner.warn('Could not auto-install plugins');
          console.log('');

          // Diagnose error and provide actionable hints
          if (error.message.includes('not found') || error.message.includes('ENOENT')) {
            console.log(chalk.yellow('   Reason: Claude CLI found but command failed'));
            console.log(chalk.gray('   → Try manually: /plugin install specweave'));
          } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
            console.log(chalk.yellow('   Reason: Permission denied'));
            console.log(chalk.gray('   → Check file permissions or run with appropriate access'));
          } else if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
            console.log(chalk.yellow('   Reason: Network error'));
            console.log(chalk.gray('   → Check internet connection and try again'));
          } else if (process.env.DEBUG) {
            console.log(chalk.gray(`   Error: ${error.message}`));
          }

          console.log('');
          console.log(chalk.cyan('📦 Manual installation:'));
          console.log(chalk.white('   /plugin install specweave'));
          console.log(chalk.white('   /plugin install specweave-github'));
          console.log(chalk.white('   ...etc.'));
          console.log('');
          autoInstallSucceeded = false;
        }
      }

      // 10.4 Repository Hosting Setup (FUNDAMENTAL!)
      // Ask about repository hosting BEFORE issue tracker
      // This determines what issue tracker options are available
      console.log('');
      console.log(chalk.cyan.bold('📦 Repository Hosting'));
      console.log('');

      // Detect existing git remote
      const gitRemoteDetection = detectGitHubRemote(targetDir);
      let repositoryHosting: 'github' | 'local' | 'other' = 'local';

      if (!isCI) {
        const { hosting } = await inquirer.prompt([{
          type: 'list',
          name: 'hosting',
          message: 'How do you host your repository?',
          choices: [
            {
              name: `🐙 GitHub ${gitRemoteDetection ? '(detected)' : '(recommended)'}`,
              value: 'github'
            },
            {
              name: '💻 Local git only (no remote sync)',
              value: 'local'
            },
            {
              name: '🔧 Other (GitLab, Bitbucket, etc.)',
              value: 'other'
            }
          ],
          default: gitRemoteDetection ? 'github' : 'local'
        }]);

        repositoryHosting = hosting;

        // Show info for non-GitHub choices
        if (hosting === 'other') {
          console.log('');
          console.log(chalk.yellow('⚠️  Note: SpecWeave currently has best integration with GitHub'));
          console.log(chalk.gray('   • GitHub: Full sync support (issues, milestones, labels)'));
          console.log(chalk.gray('   • GitLab/Bitbucket: Limited support (manual sync)'));
          console.log(chalk.gray('   • You can still use SpecWeave locally and sync manually'));
          console.log('');
        } else if (hosting === 'local') {
          console.log('');
          console.log(chalk.gray('✓ Local-only mode'));
          console.log(chalk.gray('   • All work tracked locally in .specweave/'));
          console.log(chalk.gray('   • No remote sync (you can add GitHub later)'));
          console.log('');
        }
      } else {
        // CI mode: auto-detect
        repositoryHosting = gitRemoteDetection ? 'github' : 'local';
        console.log(chalk.gray(`   → CI mode: Auto-detected ${repositoryHosting} hosting\n`));
      }

      // 10.5 Issue Tracker Integration (CRITICAL!)
      // MUST happen AFTER plugin installation is complete
      // Asks user: Which tracker? (GitHub/Jira/ADO/None)
      // Collects credentials and runs smart validation
      //
      // NEW: Always run for ALL projects (including framework repo)
      // Detects existing config and asks user if they want to change it
      const isFrameworkRepo = await isSpecWeaveFrameworkRepo(targetDir);

      try {
        const { setupIssueTracker } = await import('../helpers/issue-tracker/index.js');

        // Check if sync config already exists
        const configPath = path.join(targetDir, '.specweave', 'config.json');
        let existingTracker: string | null = null;

        if (fs.existsSync(configPath)) {
          const config = await fs.readJson(configPath);
          if (config.sync?.activeProfile && config.sync?.profiles) {
            const activeProfile = config.sync.profiles[config.sync.activeProfile];
            if (activeProfile?.provider) {
              existingTracker = activeProfile.provider;
            }
          }
        }

        if (existingTracker) {
          // Existing config detected - ask if user wants to reconfigure
          console.log(chalk.blue('\n🔍 Existing Issue Tracker Configuration Detected'));
          console.log(chalk.gray(`   Current: ${existingTracker.charAt(0).toUpperCase() + existingTracker.slice(1)}`));
          console.log('');

          if (isCI) {
            // CI mode: keep existing configuration without prompting
            console.log(chalk.gray('   → CI mode: Keeping existing configuration\n'));
          } else {
            const { reconfigure } = await inquirer.prompt([{
              type: 'confirm',
              name: 'reconfigure',
              message: 'Do you want to reconfigure your issue tracker?',
              default: false
            }]);

            if (!reconfigure) {
              console.log(chalk.gray('   ✓ Keeping existing configuration\n'));
            } else {
              // User wants to reconfigure - run setup
              await setupIssueTracker({
                projectPath: targetDir,
                language: language as SupportedLanguage,
                maxRetries: 3,
                isFrameworkRepo,
                repositoryHosting
              });
            }
          }
        } else {
          // No existing config - run setup
          if (isFrameworkRepo) {
            console.log(chalk.blue('\n🔍 Detected SpecWeave framework repository'));
            console.log(chalk.gray('   Recommended: Configure GitHub sync with full permissions (upsert, update, status)'));
            console.log('');
          }

          await setupIssueTracker({
            projectPath: targetDir,
            language: language as SupportedLanguage,
            maxRetries: 3,
            isFrameworkRepo,
            repositoryHosting
          });
        }
      } catch (error: any) {
        // Non-critical error - log but continue
        if (process.env.DEBUG) {
          console.error(chalk.red(`\n❌ Issue tracker setup error: ${error.message}`));
        }
        console.log(chalk.yellow('\n⚠️  Issue tracker setup skipped (can configure later)'));
      }

      // 10.6 Create Multi-Project Folders (JIRA/ADO/GitHub)
      // After issue tracker setup, read .env and create project-specific folders
      try {
        await createMultiProjectFolders(targetDir);
      } catch (error: any) {
        // Non-critical - folders can be created manually later
        if (process.env.DEBUG) {
          console.error(chalk.yellow(`\n⚠️  Multi-project folder creation skipped: ${error.message}`));
        }
      }

      // 10.6.5 External Tool Import (T-025)
      // Import existing work items from GitHub, JIRA, or Azure DevOps
      // ONLY run if NOT continuing existing project (fresh start or new project)
      if (!continueExisting) {
        try {
          const importResult = await promptAndRunExternalImport(targetDir, isCI);
          if (importResult.totalCount > 0) {
            console.log(chalk.green(`\n✅ Imported ${importResult.totalCount} items from ${importResult.platforms.join(', ')}`));
            console.log(chalk.gray('   → Items saved to .specweave/docs/internal/specs/'));
            console.log('');
          }
        } catch (error: any) {
          // Non-critical - can import later manually
          if (process.env.DEBUG) {
            console.error(chalk.red(`\n❌ Import error: ${error.message}`));
          }
          console.log(chalk.yellow('\n⚠️  External tool import skipped (can run later)'));
          console.log(chalk.gray('   → Use: specweave import --from github'));
        }
      }
    }

    // 10.7 Testing Configuration (MOVED TO END - Better UX)
    // Prompt for testing approach and coverage targets after all setup is complete
    // This keeps the main flow fast and asks for preferences at the end
    let testMode: 'TDD' | 'test-after' | 'manual' = 'TDD';
    let coverageTarget = 80;

    // Only prompt if interactive (use function-level isCI)
    if (!isCI && !continueExisting) {
      console.log('');
      console.log(chalk.cyan.bold('🧪 Testing Configuration'));
      console.log(chalk.gray('   Configure your default testing approach and coverage targets'));
      console.log('');

      // Add guidance on which testing approach to choose
      console.log(chalk.white('💡 Which testing approach should you choose?'));
      console.log('');
      console.log(chalk.green('   ✓ TDD (Test-Driven Development)'));
      console.log(chalk.gray('     Best for: Complex business logic, critical features, refactoring'));
      console.log(chalk.gray('     Benefits: Better design, fewer bugs, confidence in changes'));
      console.log(chalk.gray('     Tradeoff: Slower initial development, requires discipline'));
      console.log('');
      console.log(chalk.blue('   ✓ Test-After'));
      console.log(chalk.gray('     Best for: Most projects, rapid prototyping, exploratory work'));
      console.log(chalk.gray('     Benefits: Fast iteration, flexible design, good coverage'));
      console.log(chalk.gray('     Tradeoff: May miss edge cases, harder to test after design'));
      console.log('');
      console.log(chalk.yellow('   ✓ Manual Testing'));
      console.log(chalk.gray('     Best for: Quick prototypes, proof-of-concepts, learning'));
      console.log(chalk.gray('     Benefits: Fastest development, no test maintenance'));
      console.log(chalk.gray('     Tradeoff: No safety net, regressions, hard to refactor'));
      console.log('');

      const { selectedTestMode } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedTestMode',
          message: 'Select your testing approach:',
          choices: [
            {
              name: '🔴 TDD - Write tests first (recommended for production apps)',
              value: 'TDD',
              short: 'TDD'
            },
            {
              name: '🔵 Test-After - Implement first, test later (balanced approach)',
              value: 'test-after',
              short: 'Test-After'
            },
            {
              name: '🟡 Manual - No automated tests (prototypes only)',
              value: 'manual',
              short: 'Manual'
            }
          ],
          default: 'TDD'
        }
      ]);
      testMode = selectedTestMode;

      // Only ask for coverage if not manual testing
      if (testMode !== 'manual') {
        const { selectedCoverageLevel } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedCoverageLevel',
            message: 'Select your coverage target level:',
            choices: [
              {
                name: '70% - Acceptable (core paths covered)',
                value: 70,
                short: '70%'
              },
              {
                name: '80% - Good (recommended - most paths covered)',
                value: 80,
                short: '80%'
              },
              {
                name: '90% - Excellent (comprehensive coverage)',
                value: 90,
                short: '90%'
              },
              {
                name: 'Custom (enter your own value)',
                value: 'custom',
                short: 'Custom'
              }
            ],
            default: 80
          }
        ]);

        if (selectedCoverageLevel === 'custom') {
          const { customCoverage } = await inquirer.prompt([
            {
              type: 'number',
              name: 'customCoverage',
              message: 'Enter custom coverage target (70-95):',
              default: 80,
              validate: (input: number) => {
                if (input >= 70 && input <= 95) return true;
                return 'Coverage target must be between 70% and 95%';
              }
            }
          ]);
          coverageTarget = customCoverage;
        } else {
          coverageTarget = selectedCoverageLevel;
        }
      }

      console.log('');
      console.log(chalk.green(`   ✔ Testing: ${testMode}`));
      if (testMode !== 'manual') {
        console.log(chalk.green(`   ✔ Coverage Target: ${coverageTarget}%`));
      }
      console.log('');

      // Update config.json with testing configuration
      updateConfigWithTesting(targetDir, testMode, coverageTarget);
    }

    // 10.8 Create Initial Increment (CRITICAL: Users need somewhere to start!)
    // ONLY create if:
    // 1. New project (not continuing existing)
    // 2. Increments directory is empty
    const incrementsDir = path.join(targetDir, '.specweave', 'increments');
    const existingIncrements = fs.existsSync(incrementsDir)
      ? fs.readdirSync(incrementsDir).filter(dir => {
          const fullPath = path.join(incrementsDir, dir);
          return fs.statSync(fullPath).isDirectory() && /^\d{4}-/.test(dir);
        })
      : [];

    if (!continueExisting && existingIncrements.length === 0) {
      console.log('');
      console.log(chalk.cyan.bold('📦 Creating Initial Increment'));
      console.log(chalk.gray('   Setting up 0001-project-setup so you can start working immediately'));
      console.log('');

      try {
        const incrementId = await generateInitialIncrement({
          projectPath: targetDir,
          projectName: finalProjectName,
          techStack: options.techStack,
          language: language as SupportedLanguage
        });

        console.log(chalk.green(`   ✔ Created initial increment: ${incrementId}`));
        console.log(chalk.gray('   ✔ Status: ACTIVE (ready to work)'));
        console.log(chalk.gray('   ✔ Files: spec.md, plan.md, tasks.md, metadata.json'));
        console.log('');
        console.log(chalk.yellow('   💡 TIP: Delete this increment and create your first real feature:'));
        console.log(chalk.gray('      rm -rf .specweave/increments/0001-project-setup'));
        console.log(chalk.gray('      /specweave:increment "my-feature"'));
        console.log('');
      } catch (error) {
        console.log(chalk.yellow('   ⚠️  Could not create initial increment (non-critical)'));
        if (process.env.DEBUG) {
          console.log(chalk.gray(`   Error: ${error instanceof Error ? error.message : String(error)}`));
        }
        console.log(chalk.gray('   → You can create your first increment manually with /specweave:increment'));
        console.log('');
      }
    }

    showNextSteps(finalProjectName, toolName, language as SupportedLanguage, usedDotNotation, toolName === 'claude' ? autoInstallSucceeded : undefined);
  } catch (error) {
    spinner.fail('Failed to create project');
    console.error(chalk.red(`\n${locale.t('cli', 'init.genericError')}`), error);
    process.exit(1);
  }
}

/**
 * Detect GitHub repository owner and name from git remote
 * Parses .git/config to extract GitHub remote URL
 */
function detectGitHubRemote(targetDir: string): { owner: string; repo: string } | null {
  try {
    const gitConfigPath = path.join(targetDir, '.git', 'config');
    if (!fs.existsSync(gitConfigPath)) {
      return null;
    }

    const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');

    // Match GitHub remote URLs (both HTTPS and SSH)
    // HTTPS: https://github.com/owner/repo.git
    // SSH: git@github.com:owner/repo.git
    const httpsMatch = gitConfig.match(/https:\/\/github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?(?:\s|$)/);
    const sshMatch = gitConfig.match(/git@github\.com:([^/]+)\/([^/\s]+?)(?:\.git)?(?:\s|$)/);

    const match = httpsMatch || sshMatch;
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '')
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Detect JIRA configuration from environment or .env file
 */
function detectJiraConfig(targetDir: string): { host: string; email?: string; apiToken?: string } | null {
  try {
    // Check environment variables first
    const envHost = process.env.JIRA_HOST;
    const envEmail = process.env.JIRA_EMAIL;
    const envToken = process.env.JIRA_API_TOKEN;

    if (envHost && envEmail && envToken) {
      return { host: envHost, email: envEmail, apiToken: envToken };
    }

    // Check .env file
    const envPath = path.join(targetDir, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envVars = parseEnvFile(envContent);

      const fileHost = envVars.JIRA_HOST;
      const fileEmail = envVars.JIRA_EMAIL;
      const fileToken = envVars.JIRA_API_TOKEN;

      if (fileHost && fileEmail && fileToken) {
        return { host: fileHost, email: fileEmail, apiToken: fileToken };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Detect Azure DevOps configuration from environment or .env file
 */
function detectADOConfig(targetDir: string): { orgUrl: string; project: string; pat?: string } | null {
  try {
    // Check environment variables first
    const envOrgUrl = process.env.ADO_ORG_URL;
    const envProject = process.env.ADO_PROJECT;
    const envPat = process.env.ADO_PAT || process.env.AZURE_DEVOPS_PAT;

    if (envOrgUrl && envProject && envPat) {
      return { orgUrl: envOrgUrl, project: envProject, pat: envPat };
    }

    // Check .env file
    const envPath = path.join(targetDir, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envVars = parseEnvFile(envContent);

      const fileOrgUrl = envVars.ADO_ORG_URL;
      const fileProject = envVars.ADO_PROJECT;
      const filePat = envVars.ADO_PAT || envVars.AZURE_DEVOPS_PAT;

      if (fileOrgUrl && fileProject && filePat) {
        return { orgUrl: fileOrgUrl, project: fileProject, pat: filePat };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Prompt user and run external tool import
 * Detects GitHub/JIRA/ADO configuration and imports work items
 */
async function promptAndRunExternalImport(targetDir: string, isCI: boolean): Promise<CoordinatorResult> {
  // Load import configuration (T-027)
  const importConfig = loadImportConfig(targetDir);

  // Check if import is disabled via config
  if (!importConfig.enabled) {
    return {
      results: [],
      totalCount: 0,
      allItems: [],
      errors: {},
      platforms: []
    };
  }

  // Detect available external tools
  const githubRemote = detectGitHubRemote(targetDir);
  const jiraConfig = detectJiraConfig(targetDir);
  const adoConfig = detectADOConfig(targetDir);

  const availableTools: string[] = [];
  if (githubRemote) availableTools.push('GitHub');
  if (jiraConfig) availableTools.push('JIRA');
  if (adoConfig) availableTools.push('Azure DevOps');

  // If no tools detected, skip import
  if (availableTools.length === 0) {
    return {
      results: [],
      totalCount: 0,
      allItems: [],
      errors: {},
      platforms: []
    };
  }

  console.log(chalk.blue('\n🔍 External Tool Detection'));
  console.log(chalk.gray(`   Found: ${availableTools.join(', ')}`));
  console.log('');

  // In CI mode, skip import without prompting
  if (isCI) {
    console.log(chalk.gray('   → CI mode: Skipping import (can run manually later)\n'));
    return {
      results: [],
      totalCount: 0,
      allItems: [],
      errors: {},
      platforms: []
    };
  }

  // Prompt user to import
  const { shouldImport } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldImport',
      message: `Import existing work items from ${availableTools.join(', ')}?`,
      default: false
    }
  ]);

  if (!shouldImport) {
    console.log(chalk.gray('   ✓ Skipping import\n'));
    return {
      results: [],
      totalCount: 0,
      allItems: [],
      errors: {},
      platforms: []
    };
  }

  // US-011: Multi-Repo Selection for GitHub (if GitHub detected and token available)
  let repoSelectionConfig: RepoSelectionConfig | null = null;
  if (githubRemote && process.env.GITHUB_TOKEN) {
    const { useMultiRepo } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useMultiRepo',
        message: 'Do you want to import from multiple repositories?',
        default: false
      }
    ]);

    if (useMultiRepo) {
      try {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        repoSelectionConfig = await selectRepositories(octokit, process.env.GITHUB_TOKEN);

        if (repoSelectionConfig) {
          // Save to config.json for future imports
          const configPath = path.join(targetDir, '.specweave', 'config.json');
          let config: any = {};
          if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          }

          if (!config.github) {
            config.github = {};
          }

          config.github.repositories = repoSelectionConfig.repositories;
          config.github.selectionStrategy = repoSelectionConfig.selectionStrategy;
          if (repoSelectionConfig.pattern) {
            config.github.pattern = repoSelectionConfig.pattern;
          }
          if (repoSelectionConfig.organizationName) {
            config.github.organizationName = repoSelectionConfig.organizationName;
          }

          fs.ensureDirSync(path.dirname(configPath));
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

          console.log(chalk.green(`✅ Repository selection saved to config.json\n`));
        }
      } catch (error) {
        console.error(chalk.yellow(`⚠️  Failed to select repositories: ${error instanceof Error ? error.message : String(error)}`));
        console.log(chalk.gray('Continuing with single repository import...\n'));
      }
    }
  }

  // Map config timeRangeMonths to closest prompt option
  let defaultTimeRange = 3; // Default to 3 months
  if (importConfig.timeRangeMonths === 1) defaultTimeRange = 1;
  else if (importConfig.timeRangeMonths <= 3) defaultTimeRange = 3;
  else if (importConfig.timeRangeMonths <= 6) defaultTimeRange = 6;
  else defaultTimeRange = 999;

  // Prompt for time range (with config default)
  const { timeRange } = await inquirer.prompt([
    {
      type: 'list',
      name: 'timeRange',
      message: 'How far back should we import?',
      choices: [
        { name: '1 month (recent items only)', value: 1 },
        { name: '3 months (recommended)', value: 3 },
        { name: '6 months (comprehensive)', value: 6 },
        { name: 'All time (warning: may be slow)', value: 999 }
      ],
      default: defaultTimeRange
    }
  ]);

  // Build coordinator configuration
  const coordinatorConfig: CoordinatorConfig = {
    importConfig: {
      timeRangeMonths: timeRange,
      includeClosed: false, // Only open/in-progress items
      pageSize: importConfig.pageSize // Use config page size (T-027)
    },
    parallel: true
  };

  // Add GitHub config if available
  if (githubRemote) {
    coordinatorConfig.github = {
      owner: githubRemote.owner,
      repo: githubRemote.repo,
      token: process.env.GITHUB_TOKEN
    };
  }

  // Add JIRA config if available
  if (jiraConfig) {
    coordinatorConfig.jira = {
      host: jiraConfig.host,
      email: jiraConfig.email,
      apiToken: jiraConfig.apiToken
    };
  }

  // Add ADO config if available
  if (adoConfig) {
    coordinatorConfig.ado = {
      orgUrl: adoConfig.orgUrl,
      project: adoConfig.project,
      pat: adoConfig.pat
    };
  }

  // Run import with progress tracking
  const spinner = ora('Importing items...').start();

  let totalImported = 0;
  coordinatorConfig.onProgress = (platform: string, count: number) => {
    spinner.text = `Importing from ${platform}... (${count} items)`;
    totalImported = count;
  };

  try {
    const coordinator = new ImportCoordinator(coordinatorConfig);
    const result = await coordinator.importAll();

    spinner.succeed(`Imported ${result.totalCount} items`);

    // Show breakdown by platform
    if (result.results.length > 0) {
      console.log('');
      result.results.forEach(platformResult => {
        console.log(chalk.gray(`   ✓ ${platformResult.platform}: ${platformResult.count} items`));
      });
    }

    // Show errors if any
    if (Object.keys(result.errors).length > 0) {
      console.log('');
      console.log(chalk.yellow('   ⚠️  Some imports failed:'));
      Object.entries(result.errors).forEach(([platform, errors]) => {
        console.log(chalk.gray(`   → ${platform}: ${errors.join(', ')}`));
      });
    }

    // Warn if many items detected
    if (result.totalCount > 100) {
      console.log('');
      console.log(chalk.yellow(`   ⚠️  Imported ${result.totalCount} items (large dataset)`));
      console.log(chalk.gray('   → Consider using time range filters for faster imports'));
    }

    // Convert imported items to living docs User Stories
    // CRITICAL: This ONLY creates living docs, NOT increments
    if (result.totalCount > 0) {
      spinner.start('Converting to living docs...');

      try {
        const specsDir = path.join(targetDir, '.specweave', 'docs', 'internal', 'specs');
        const converter = new ItemConverter({ specsDir });

        const convertedStories = await converter.convertItems(result.allItems);

        spinner.succeed(`Converted ${convertedStories.length} User Stories to living docs`);
        console.log(chalk.gray(`   → Living docs created with E suffix (US-001E, US-002E, ...)`));
        console.log(chalk.gray(`   → Location: .specweave/docs/internal/specs/`));
        console.log('');

        // Validate that no increments were auto-created
        try {
          ItemConverter.validateNoIncrementsCreated(targetDir);
        } catch (validationError: any) {
          spinner.fail('Import validation failed');
          throw new Error(
            `CRITICAL ERROR: ${validationError.message}\n` +
            `This is a bug in the import system. Please report it.`
          );
        }

        console.log(chalk.blue('   💡 Next steps:'));
        console.log(chalk.gray('   → Review imported User Stories in living docs'));
        console.log(chalk.gray('   → Create increments manually when ready: /specweave:increment "feature"'));
        console.log('');
      } catch (conversionError: any) {
        spinner.fail('Conversion to living docs failed');
        throw conversionError;
      }
    }

    return result;
  } catch (error: any) {
    spinner.fail('Import failed');
    throw error;
  }
}

function createDirectoryStructure(targetDir: string, adapterName: string): void {
  const directories = [
    // Core increment structure
    '.specweave/increments',

    // 6-pillar documentation structure
    '.specweave/docs/internal/strategy',      // Business specs (WHAT, WHY)
    '.specweave/docs/internal/specs',         // Feature specifications (detailed requirements)
    '.specweave/docs/internal/architecture',  // Technical design (HOW)
    '.specweave/docs/internal/architecture/adr',      // Architecture Decision Records
    '.specweave/docs/internal/architecture/diagrams', // Architecture diagrams
    '.specweave/docs/internal/delivery',      // Roadmap, CI/CD, guides
    '.specweave/docs/internal/operations',    // Runbooks, SLOs
    '.specweave/docs/internal/governance',    // Security, compliance
    '.specweave/docs/public',                 // Published documentation
  ];

  // NOTE: We do NOT create .claude/ folder anymore!
  // Marketplace registration is GLOBAL via CLI, not per-project.
  // Non-Claude adapters still use plugins/ folder (copied separately)

  directories.forEach((dir) => {
    fs.mkdirSync(path.join(targetDir, dir), { recursive: true });
  });
}

async function copyTemplates(templatesDir: string, targetDir: string, projectName: string, language: SupportedLanguage = 'en'): Promise<void> {
  const locale = getLocaleManager(language);
  // Verify templates directory exists
  if (!fs.existsSync(templatesDir)) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.templatesNotFound', { path: templatesDir })}`));
    const packageRoot = findPackageRoot(__dirname);
    if (packageRoot) {
      console.error(chalk.red(`   ${locale.t('cli', 'init.errors.packageRoot', { root: packageRoot })}`));
      console.error(chalk.red(`   ${locale.t('cli', 'init.errors.tryingAlternate')}`));

      // Try src/templates as fallback
      const altPath = path.join(packageRoot, 'src', 'templates');
      if (fs.existsSync(altPath)) {
        console.error(chalk.yellow(`   ${locale.t('cli', 'init.errors.foundTemplatesAt', { path: altPath })}`));
        templatesDir = altPath;
      } else {
        throw new Error('Failed to locate templates directory');
      }
    } else {
      throw new Error('Failed to locate templates directory and package root');
    }
  }

  // Copy README.md
  const readmeTemplate = path.join(templatesDir, 'README.md.template');
  if (fs.existsSync(readmeTemplate)) {
    let readme = fs.readFileSync(readmeTemplate, 'utf-8');
    readme = readme.replace(/{{PROJECT_NAME}}/g, projectName);
    fs.writeFileSync(path.join(targetDir, 'README.md'), readme);
  }

  // Generate CLAUDE.md - PRIMARY instruction file for Claude Code
  // CRITICAL: Claude Code ONLY reads CLAUDE.md (NOT AGENTS.md!)
  // This is the native/baseline experience - skills, agents, hooks, slash commands
  const skillsDir = findSourceDir('skills');
  const agentsDir = findSourceDir('agents');
  const commandsDir = findSourceDir('commands');

  const claudeMdTemplatePath = path.normalize(path.join(templatesDir, 'CLAUDE.md.template'));
  const claudeGen = new ClaudeMdGenerator(skillsDir, agentsDir, commandsDir);
  const claudeMd = await claudeGen.generate({
    projectName,
    projectPath: targetDir,
    templatePath: fs.existsSync(claudeMdTemplatePath) ? claudeMdTemplatePath : undefined
  });

  fs.writeFileSync(path.join(targetDir, 'CLAUDE.md'), claudeMd);

  // Generate AGENTS.md - Universal file for ALL OTHER AI tools
  // Following agents.md standard: https://agents.md/
  // Used by: Cursor, Gemini CLI, Codex, GitHub Copilot, and ANY non-Claude tool
  // NOTE: Claude Code does NOT read this file - it only reads CLAUDE.md above
  // Replaces: .cursorrules, instructions.md, and other tool-specific files
  const agentsMdTemplatePath = path.normalize(path.join(templatesDir, 'AGENTS.md.template'));
  const agentsGen = new AgentsMdGenerator(skillsDir, agentsDir, commandsDir);
  const agentsMd = await agentsGen.generate({
    projectName,
    projectPath: targetDir,
    templatePath: fs.existsSync(agentsMdTemplatePath) ? agentsMdTemplatePath : undefined
  });

  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), agentsMd);

  // Copy .gitignore
  const gitignoreTemplate = path.join(templatesDir, '.gitignore.template');
  if (fs.existsSync(gitignoreTemplate)) {
    fs.copyFileSync(gitignoreTemplate, path.join(targetDir, '.gitignore'));
  }

  // Copy .gitattributes (forces LF line endings on all platforms, prevents Windows CRLF warnings)
  const gitattributesTemplate = path.join(templatesDir, '.gitattributes.template');
  if (fs.existsSync(gitattributesTemplate)) {
    fs.copyFileSync(gitattributesTemplate, path.join(targetDir, '.gitattributes'));
  }
}

/**
 * Detect ALL parent directories that contain .specweave/ folders
 * SpecWeave ONLY supports root-level .specweave/ folders
 * Nested .specweave/ folders are NOT supported
 *
 * @param targetDir - Directory where user wants to initialize
 * @returns Array of paths to parent .specweave/ folders with depth info, or null if none found
 */
function detectNestedSpecweave(targetDir: string): Array<{ path: string; depth: number; isHomeDir?: boolean }> | null {
  const foundFolders: Array<{ path: string; depth: number; isHomeDir?: boolean }> = [];
  const homeDir = os.homedir();

  // Start from parent of target directory
  let currentDir = path.dirname(path.resolve(targetDir));
  const root = path.parse(currentDir).root;
  let depth = 1;

  // Walk up the directory tree and find ALL .specweave/ folders
  while (currentDir !== root) {
    const specweavePath = path.join(currentDir, '.specweave');

    // Check if .specweave/ exists at this level
    if (fs.existsSync(specweavePath)) {
      const isHomeDir = path.resolve(currentDir) === path.resolve(homeDir);
      foundFolders.push({ path: currentDir, depth, isHomeDir });
    }

    // Move up one level
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
    depth++;
  }

  return foundFolders.length > 0 ? foundFolders : null;
}

/**
 * Find the package root by walking up the directory tree looking for package.json
 * This works reliably on all platforms including Windows with UNC paths
 */
function findPackageRoot(startDir: string): string | null {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        // Verify this is the specweave package
        if (packageJson.name === 'specweave') {
          return currentDir;
        }
      } catch (error) {
        // Not a valid package.json, continue searching
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  return null;
}

/**
 * Find the source directory, trying multiple possible locations
 * Handles both development and installed package scenarios
 * Windows-compatible with proper path normalization
 */
function findSourceDir(relativePath: string): string {
  // First, try to find package root by walking up from __dirname
  const packageRoot = findPackageRoot(__dirname);

  if (packageRoot) {
    // Try directly in package root FIRST (for plugins/, .claude-plugin/)
    // This is critical because package.json includes these folders for npm publish
    const rootPath = path.normalize(path.join(packageRoot, relativePath));
    if (fs.existsSync(rootPath)) {
      return rootPath;
    }

    // Try src/ directory (for templates/, utils/, etc.)
    const srcPath = path.normalize(path.join(packageRoot, 'src', relativePath));
    if (fs.existsSync(srcPath)) {
      return srcPath;
    }

    // Try dist/ directory (fallback for compiled outputs)
    const distPath = path.normalize(path.join(packageRoot, 'dist', relativePath));
    if (fs.existsSync(distPath)) {
      return distPath;
    }
  }

  // Fallback: Try multiple possible locations relative to __dirname
  const possiblePaths = [
    // Development: dist/cli/commands -> src/
    path.normalize(path.join(__dirname, '../../..', relativePath)),
    // Installed: node_modules/specweave/dist/cli/commands -> node_modules/specweave/src/
    path.normalize(path.join(__dirname, '../../../src', relativePath)),
    // Alternative: go up from dist/ to package root, then to src/
    path.normalize(path.join(__dirname, '../../..', 'src', relativePath)),
    // Absolute from package root (for global installs)
    path.resolve(__dirname, '../../../src', relativePath),
  ];

  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }

  // If nothing found, return the first path and let the caller handle the error
  return possiblePaths[0];
}


/**
 * Create .specweave/config.json with project settings
 * Testing configuration is optional and can be added later via updateConfigWithTesting()
 */
function createConfigFile(
  targetDir: string,
  projectName: string,
  adapter: string,
  language: SupportedLanguage,
  enableDocsPreview: boolean = true,
  testMode?: 'TDD' | 'test-after' | 'manual',
  coverageTarget?: number
): void {
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  const config = {
    project: {
      name: projectName,
      version: '0.1.0',
    },
    adapters: {
      default: adapter,
    },
    // Testing configuration (NEW - v0.18.0+) - only include if provided
    ...(testMode && coverageTarget && {
      testing: {
        defaultTestMode: testMode,
        defaultCoverageTarget: coverageTarget,
        coverageTargets: {
          unit: Math.min(coverageTarget + 5, 95),        // Unit tests slightly higher
          integration: coverageTarget,                    // Integration at default
          e2e: Math.min(coverageTarget + 10, 100)        // E2E tests highest (critical paths)
        }
      }
    }),
    // Documentation preview settings (for Claude Code only)
    ...(adapter === 'claude' && {
      documentation: {
        preview: {
          enabled: enableDocsPreview,
          autoInstall: false,      // Lazy install on first use
          port: 3015,              // Internal docs (avoid port 3000 - used by React/Next.js/Vite)
          openBrowser: true,
          theme: 'default',
          excludeFolders: ['legacy', 'node_modules']
        }
      }
    }),
    // Only include language if non-English
    ...(language !== 'en' && {
      language,
      translation: {
        method: 'in-session',
        autoTranslateLivingDocs: false,
        keepFrameworkTerms: true,
        keepTechnicalTerms: true,
        translateCodeComments: true,
        translateVariableNames: false,
      },
    }),
  };

  fs.writeJsonSync(configPath, config, { spaces: 2 });
}

/**
 * Update config.json with testing configuration
 * Called after user completes testing setup prompts
 */
function updateConfigWithTesting(
  targetDir: string,
  testMode: 'TDD' | 'test-after' | 'manual',
  coverageTarget: number
): void {
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red('⚠️  config.json not found, cannot update testing configuration'));
    return;
  }

  const config = fs.readJsonSync(configPath);

  config.testing = {
    defaultTestMode: testMode,
    defaultCoverageTarget: coverageTarget,
    coverageTargets: {
      unit: Math.min(coverageTarget + 5, 95),
      integration: coverageTarget,
      e2e: Math.min(coverageTarget + 10, 100)
    }
  };

  fs.writeJsonSync(configPath, config, { spaces: 2 });
}

/**
 * REMOVED: setupClaudePluginAutoRegistration()
 *
 * Previously created .claude/settings.json with extraKnownMarketplaces,
 * but this is redundant because:
 *
 * 1. CLI marketplace registration is GLOBAL (persists across all projects)
 * 2. settings.json is per-project and unnecessary for our use case
 * 3. We use `claude plugin marketplace add` which registers globally
 *
 * Removed in favor of pure CLI approach (lines 687-883)
 */

function showNextSteps(projectName: string, adapterName: string, language: SupportedLanguage, usedDotNotation: boolean = false, pluginAutoInstalled: boolean = false): void {
  const locale = getLocaleManager(language);

  console.log('');
  console.log(chalk.cyan.bold(locale.t('cli', 'init.nextSteps.header')));
  console.log('');

  let stepNumber = 1;

  // Only show "cd" step if we created a subdirectory
  if (!usedDotNotation) {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.cd', { projectName }))}`);
    console.log('');
    stepNumber++;
  }

  // Adapter-specific instructions
  if (adapterName === 'claude') {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.claude.step1'))}`);
    console.log('');
    stepNumber++;

    // Only show manual install if auto-install failed
    if (!pluginAutoInstalled) {
      console.log(`   ${stepNumber}. ${chalk.yellow.bold('⚠️  ' + locale.t('cli', 'init.nextSteps.claude.step2'))}`);
      console.log(`      ${chalk.cyan.bold(locale.t('cli', 'init.nextSteps.claude.installCore'))}`);
      console.log(`      ${chalk.gray('↑ Required for slash commands like /specweave:increment')}`);
      console.log('');
      stepNumber++;
    }

    console.log(`   ${stepNumber}. ${chalk.white('All plugins are already installed!')}`);
    console.log(`      ${chalk.gray('✔ All 19+ SpecWeave plugins installed automatically')}`);
    console.log(`      ${chalk.gray('✔ No need to install additional plugins manually')}`);
    console.log(`      ${chalk.gray('✔ Full capabilities available immediately')}`);
    console.log('');
    stepNumber++;

    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.claude.step4'))}`);
    console.log(`      ${chalk.cyan(locale.t('cli', 'init.nextSteps.claude.example'))}`);
    console.log(`      ${chalk.gray(locale.t('cli', 'init.nextSteps.claude.autoActivate'))}`);
  } else if (adapterName === 'cursor') {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.cursor.step1'))}`);
    console.log('');
    console.log(`   ${stepNumber + 1}. ${chalk.white(locale.t('cli', 'init.nextSteps.cursor.step2'))}`);
    console.log(`      ${locale.t('cli', 'init.nextSteps.cursor.guide')}`);
    console.log('');
    console.log(`   ${stepNumber + 2}. ${chalk.white(locale.t('cli', 'init.nextSteps.cursor.step3'))}`);
    console.log(`      ${locale.t('cli', 'init.nextSteps.cursor.shortcuts')}`);
  } else if (adapterName === 'generic') {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.generic.step1'))}`);
    console.log('');
    console.log(`   ${stepNumber + 1}. ${chalk.white(locale.t('cli', 'init.nextSteps.generic.step2'))}`);
    console.log(`      ${locale.t('cli', 'init.nextSteps.generic.compatibility')}`);
  }

  console.log('');
  console.log(chalk.green.bold(locale.t('cli', 'init.nextSteps.footer')));
  console.log('');
  console.log(chalk.gray(locale.t('cli', 'init.nextSteps.docsLink')));
  console.log(chalk.gray(locale.t('cli', 'init.nextSteps.githubLink')));
  console.log('');
}
