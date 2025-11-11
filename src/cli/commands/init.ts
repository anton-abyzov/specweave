import fs from 'fs-extra';
import * as path from 'path';
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

const __dirname = getDirname(import.meta.url);

interface InitOptions {
  template?: string;
  adapter?: string;  // 'claude', 'cursor', 'generic'
  techStack?: string;
  language?: string;  // Language for i18n support
  force?: boolean;    // Force fresh start (non-interactive)
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

export async function initCommand(
  projectName?: string,
  options: InitOptions = {}
): Promise<void> {
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
    const dirName = path.basename(targetDir);

    // Validate directory name is suitable for project name
    if (!/^[a-z0-9-]+$/.test(dirName)) {
      console.log(chalk.yellow(`\n${locale.t('cli', 'init.warnings.invalidDirName', { dirName })}`));
      const suggestedName = dirName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

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
    } else {
      finalProjectName = dirName;
    }

    // Safety: Warn if directory is not empty
    const allFiles = fs.readdirSync(targetDir);
    const existingFiles = allFiles.filter(f => !f.startsWith('.')); // Ignore hidden files

    if (existingFiles.length > 0 && !options.force) {
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

    // Check if .specweave already exists - SMART RE-INITIALIZATION
    if (fs.existsSync(path.join(targetDir, '.specweave'))) {
      console.log(chalk.blue('\n📦 Existing SpecWeave project detected!'));
      console.log(chalk.gray('   Found .specweave/ folder with your increments, docs, and configuration.\n'));

      let action: string;

      if (options.force) {
        // Force mode: Skip interactive prompt and do fresh start
        action = 'fresh';
        console.log(chalk.yellow('   🔄 Force mode: Performing fresh start (removing existing .specweave/)'));
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
          // Interactive mode: Ask for confirmation
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

    // Show all found .specweave/ folders
    if (parentSpecweaveFolders.length === 1) {
      console.log(chalk.yellow(`   ${locale.t('cli', 'init.errors.parentFound')}`));
      console.log(chalk.white(`   ${parentSpecweaveFolders[0].path}`));
    } else {
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

      // Check if running in CI/non-interactive environment
      const isCI = process.env.CI === 'true' ||
                   process.env.GITHUB_ACTIONS === 'true' ||
                   process.env.GITLAB_CI === 'true' ||
                   process.env.CIRCLECI === 'true' ||
                   !process.stdin.isTTY;

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

    // 13. Create config.json with language setting
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
          // Step 1: FORCE marketplace refresh - remove and re-add from GitHub
          spinner.start('Refreshing SpecWeave marketplace...');

          const listResult = execFileNoThrowSync('claude', [
            'plugin',
            'marketplace',
            'list'
          ]);

          const marketplaceExists = listResult.success &&
            (listResult.stdout || '').toLowerCase().includes('specweave');

          if (marketplaceExists) {
            // Always remove existing marketplace to ensure fresh install
            execFileNoThrowSync('claude', [
              'plugin',
              'marketplace',
              'remove',
              'specweave'
            ]);
            console.log(chalk.blue('   🔄 Removed existing marketplace'));
          }

          // Add marketplace from GitHub (always fresh)
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
          spinner.succeed('SpecWeave marketplace refreshed');

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

          // Step 3: Install ALL plugins (no selective loading!)
          let successCount = 0;
          let failCount = 0;
          const failedPlugins: string[] = [];

          for (const plugin of allPlugins) {
            const pluginName = plugin.name;
            spinner.start(`Installing ${pluginName}...`);

            const installResult = execFileNoThrowSync('claude', [
              'plugin',
              'install',
              pluginName
            ]);

            if (installResult.success) {
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
              isFrameworkRepo
            });
          }
        } else {
          // No existing config - run setup
          if (isFrameworkRepo) {
            console.log(chalk.blue('\n🔍 Detected SpecWeave framework repository'));
            console.log(chalk.gray('   Recommended: Configure GitHub sync for automatic bidirectional sync'));
            console.log('');
          }

          await setupIssueTracker({
            projectPath: targetDir,
            language: language as SupportedLanguage,
            maxRetries: 3,
            isFrameworkRepo
          });
        }
      } catch (error: any) {
        // Non-critical error - log but continue
        if (process.env.DEBUG) {
          console.error(chalk.red(`\n❌ Issue tracker setup error: ${error.message}`));
        }
        console.log(chalk.yellow('\n⚠️  Issue tracker setup skipped (can configure later)'));
      }
    }

    showNextSteps(finalProjectName, toolName, language as SupportedLanguage, usedDotNotation, toolName === 'claude' ? autoInstallSucceeded : undefined);
  } catch (error) {
    spinner.fail('Failed to create project');
    console.error(chalk.red(`\n${locale.t('cli', 'init.genericError')}`), error);
    process.exit(1);
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
function detectNestedSpecweave(targetDir: string): Array<{ path: string; depth: number }> | null {
  const foundFolders: Array<{ path: string; depth: number }> = [];

  // Start from parent of target directory
  let currentDir = path.dirname(path.resolve(targetDir));
  const root = path.parse(currentDir).root;
  let depth = 1;

  // Walk up the directory tree and find ALL .specweave/ folders
  while (currentDir !== root) {
    const specweavePath = path.join(currentDir, '.specweave');

    // Check if .specweave/ exists at this level
    if (fs.existsSync(specweavePath)) {
      foundFolders.push({ path: currentDir, depth });
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
 */
function createConfigFile(
  targetDir: string,
  projectName: string,
  adapter: string,
  language: SupportedLanguage,
  enableDocsPreview: boolean = true
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
