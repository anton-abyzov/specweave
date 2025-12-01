/**
 * SpecWeave Init Command
 *
 * Initializes a new SpecWeave project with:
 * - Directory structure (.specweave/)
 * - Configuration files
 * - Plugin installation (Claude Code)
 * - Issue tracker setup
 * - Initial increment
 *
 * Refactored: Logic extracted to src/cli/helpers/init/
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { select, input, confirm } from '@inquirer/prompts';
import { execFileNoThrowSync } from '../../utils/execFileNoThrow.js';
import { AdapterLoader } from '../../adapters/adapter-loader.js';
import { getDirname } from '../../utils/esm-helpers.js';
import { isLanguageSupported, getSupportedLanguages } from '../../core/i18n/language-manager.js';
import { getLocaleManager } from '../../core/i18n/locale-manager.js';
import type { SupportedLanguage } from '../../core/i18n/types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { StatusLineUpdater } from '../../core/status-line/status-line-updater.js';
import { readEnvFile, parseEnvFile } from '../../utils/env-file.js';
import type { SyncProfile, JiraConfig } from '../../core/types/sync-profile.js';

// Import helpers
import {
  type InitOptions,
  type RepositoryHosting,
  type LanguageSelectionResult,
  findSourceDir,
  findPackageRoot,
  detectNestedSpecweave,
  detectGitHubRemote,
  promptSmartReinit,
  installAllPlugins,
  setupRepositoryHosting,
  promptTestingConfig,
  updateConfigWithTesting,
  promptLanguageSelection,
  getDefaultLanguageSelection,
  promptTranslationConfig,
  updateConfigWithTranslation,
  getDefaultTranslationConfig,
  promptAndRunExternalImport,
  createDirectoryStructure,
  copyTemplates,
  createConfigFile,
  showNextSteps,
  generateInitialIncrement,
} from '../helpers/init/index.js';
import { triggerAdoRepoCloning } from '../helpers/init/ado-repo-cloning.js';

const __dirname = getDirname(import.meta.url);

// Re-export InitOptions for external use
export type { InitOptions };

/**
 * Detect if we're in the SpecWeave framework repository itself
 */
async function isSpecWeaveFrameworkRepo(targetDir: string): Promise<boolean> {
  try {
    const packageJsonPath = path.join(targetDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }
    const packageJson = await fs.readJson(packageJsonPath);
    return packageJson.name === 'specweave';
  } catch {
    return false;
  }
}

/**
 * Create Multi-Project Folders based on Issue Tracker Configuration
 */
async function createMultiProjectFolders(targetDir: string): Promise<void> {
  const envPath = path.join(targetDir, '.env');
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContent = readEnvFile(envPath);
  const envVars = parseEnvFile(envContent);

  const jiraProjects = envVars.JIRA_PROJECTS?.split(',').map((p: string) => p.trim()).filter(Boolean);
  const jiraStrategy = envVars.JIRA_STRATEGY;

  if (!jiraProjects?.length) {
    return;
  }

  let config: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    config = await fs.readJson(configPath);
  }

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

  if (jiraProjects?.length && jiraStrategy === 'project-per-team') {
    const profileId = 'jira-default';
    const syncConfig = config.sync as Record<string, unknown>;
    const profiles = syncConfig.profiles as Record<string, unknown>;

    if (!profiles[profileId]) {
      const jiraProfile: SyncProfile = {
        provider: 'jira',
        displayName: 'Jira Default',
        config: {
          domain: envVars.JIRA_DOMAIN || '',
          projects: jiraProjects
        } as JiraConfig,
        timeRange: { default: '1M', max: '6M' },
        rateLimits: { maxItemsPerSync: 500, warnThreshold: 100 }
      };

      profiles[profileId] = jiraProfile;
      syncConfig.activeProfile = profileId;

      await fs.writeJson(configPath, config, { spaces: 2 });

      console.log(chalk.blue('\n📁 Creating Multi-Project Folders'));
      console.log(chalk.gray('   Detected: ' + jiraProjects.length + ' Jira projects (' + jiraProjects.join(', ') + ')'));

      for (const projectKey of jiraProjects) {
        const projectId = projectKey.toLowerCase();
        const specsPath = path.join(targetDir, '.specweave', 'docs', 'internal', 'specs', projectId);

        if (!fs.existsSync(specsPath)) {
          fs.mkdirSync(specsPath, { recursive: true });
        }

        console.log(chalk.green('   ✓ Created project: ' + projectKey + ' (simplified structure)'));
      }
      console.log('');
    }
  }

  // ADO Multi-Area Folder Creation (reads from config.json, not .env)
  // CRITICAL FIX (2025-12-01): Iterate ALL ADO profiles, not just the first one
  // Bug: .find() only returned first profile, causing multi-project folders to be skipped
  const syncConfig = config.sync as Record<string, unknown> | undefined;
  const profiles = (syncConfig?.profiles || {}) as Record<string, { provider?: string; config?: { organization?: string; project?: string; areaPaths?: string[] } }>;

  // Filter ALL ADO profiles (not .find() which only returns first!)
  const adoProfiles = Object.values(profiles).filter(p => p.provider === 'ado');

  if (adoProfiles.length > 0) {
    console.log(chalk.blue('\n📁 Creating Azure DevOps Folders'));

    for (const adoProfile of adoProfiles) {
      if (!adoProfile?.config) continue;

      const { organization, project, areaPaths } = adoProfile.config;

      if (organization && project) {
        console.log(chalk.gray(`   Project: ${project}`));

        const projectFolder = project.replace(/\s+/g, '-').toLowerCase();

        if (areaPaths?.length) {
          // Create folder per area path
          for (const areaPath of areaPaths) {
            const areaName = areaPath.split('\\').pop() || areaPath;
            const areaFolder = areaName.replace(/\s+/g, '-').toLowerCase();
            const specsPath = path.join(targetDir, '.specweave', 'docs', 'internal', 'specs', projectFolder, areaFolder);

            if (!fs.existsSync(specsPath)) {
              fs.mkdirSync(specsPath, { recursive: true });
            }
            console.log(chalk.green(`   ✓ Created: specs/${projectFolder}/${areaFolder}/`));
          }
        } else {
          // Single project folder (no area paths)
          const specsPath = path.join(targetDir, '.specweave', 'docs', 'internal', 'specs', projectFolder);

          if (!fs.existsSync(specsPath)) {
            fs.mkdirSync(specsPath, { recursive: true });
          }
          console.log(chalk.green(`   ✓ Created: specs/${projectFolder}/`));
        }
      }
    }
    console.log('');
  }
}

/**
 * Main init command
 */
export async function initCommand(
  projectName?: string,
  options: InitOptions = {}
): Promise<void> {
  // Detect CI/non-interactive environment
  const isCI = process.env.CI === 'true' ||
               process.env.GITHUB_ACTIONS === 'true' ||
               process.env.GITLAB_CI === 'true' ||
               process.env.CIRCLECI === 'true' ||
               !process.stdin.isTTY;

  // STEP 1: LANGUAGE SELECTION (FIRST QUESTION!)
  // This must be asked before anything else so all prompts are in user's language
  let languageResult: LanguageSelectionResult;

  // Validate CLI language option if provided
  const cliLanguage = options.language?.toLowerCase() as SupportedLanguage | undefined;
  if (cliLanguage && !isLanguageSupported(cliLanguage)) {
    console.error(chalk.red('\n❌ Invalid language: ' + options.language));
    console.error(chalk.yellow('Supported languages: ' + getSupportedLanguages().join(', ') + '\n'));
    process.exit(1);
  }

  // Ask for language (or use CLI option / CI default)
  if (isCI) {
    languageResult = getDefaultLanguageSelection(cliLanguage || 'en');
  } else if (cliLanguage) {
    languageResult = getDefaultLanguageSelection(cliLanguage);
  } else {
    languageResult = await promptLanguageSelection(isCI);
  }

  const language = languageResult.language;
  const locale = getLocaleManager(language);

  // Now show welcome message in selected language
  console.log(chalk.blue.bold('\n' + locale.t('cli', 'init.welcome') + '\n'));

  let targetDir: string;
  let finalProjectName: string;
  let usedDotNotation = false;
  let continueExisting = false;

  // Handle "." for current directory
  if (projectName === '.') {
    usedDotNotation = true;
    targetDir = process.cwd();

    // Safety: Prevent init in home directory
    if (path.resolve(targetDir) === path.resolve(os.homedir())) {
      console.log(chalk.red.bold('\n❌ DANGEROUS: Cannot initialize SpecWeave in home directory!\n'));
      console.log(chalk.yellow('   Your home directory contains ALL your projects.'));
      console.log(chalk.cyan('\n💡 What to do instead:'));
      console.log(chalk.gray('   mkdir ~/Projects/my-project && cd ~/Projects/my-project && specweave init .\n'));
      process.exit(1);
    }

    const dirName = path.basename(targetDir);

    // Validate directory name
    if (!/^[a-z0-9-]+$/.test(dirName)) {
      const suggestedName = dirName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      if (isCI) {
        console.log(chalk.yellow('\n' + locale.t('cli', 'init.warnings.invalidDirName', { dirName })));
        console.log(chalk.gray('   → CI mode: Auto-sanitizing to "' + suggestedName + '"'));
        finalProjectName = suggestedName;
      } else {
        console.log(chalk.yellow('\n' + locale.t('cli', 'init.warnings.invalidDirName', { dirName })));
        finalProjectName = await input({
          message: 'Project name (for templates):',
          default: suggestedName,
          validate: (val: string) => /^[a-z0-9-]+$/.test(val) || 'Project name must be lowercase letters, numbers, and hyphens only',
        });
      }
    } else {
      finalProjectName = dirName;
    }

    // Warn if directory not empty
    const existingFiles = fs.readdirSync(targetDir).filter(f => !f.startsWith('.'));
    if (existingFiles.length > 0 && !options.force) {
      if (isCI) {
        console.log(chalk.yellow('\n' + locale.t('cli', 'init.warnings.directoryNotEmpty', { count: existingFiles.length, plural: existingFiles.length === 1 ? '' : 's' })));
        console.log(chalk.gray('   → CI mode: Proceeding with initialization'));
      } else {
        console.log(chalk.yellow('\n' + locale.t('cli', 'init.warnings.directoryNotEmpty', { count: existingFiles.length, plural: existingFiles.length === 1 ? '' : 's' })));
        const proceed = await confirm({ message: 'Initialize SpecWeave in current directory?', default: false });
        if (!proceed) {
          console.log(chalk.yellow(locale.t('cli', 'init.errors.cancelled')));
          process.exit(0);
        }
      }
    }

    // Smart re-initialization
    if (fs.existsSync(path.join(targetDir, '.specweave'))) {
      const result = await promptSmartReinit({ targetDir, isCI, hasForce: !!options.force, language });
      if (result.action === 'cancel') {
        process.exit(0);
      }
      continueExisting = result.continueExisting;
    }
  } else {
    // Create subdirectory
    if (!projectName) {
      projectName = await input({
        message: 'Project name:',
        default: 'my-saas',
        validate: (val: string) => /^[a-z0-9-]+$/.test(val) || 'Project name must be lowercase letters, numbers, and hyphens only',
      });
    }

    targetDir = path.resolve(process.cwd(), projectName);
    finalProjectName = projectName;

    if (fs.existsSync(targetDir)) {
      const hasSpecweave = fs.existsSync(path.join(targetDir, '.specweave'));

      if (hasSpecweave) {
        const result = await promptSmartReinit({ targetDir, isCI, hasForce: !!options.force, language });
        if (result.action === 'cancel') {
          process.exit(0);
        }
        continueExisting = result.continueExisting;
      } else {
        const existingFiles = fs.readdirSync(targetDir).filter(f => !f.startsWith('.'));
        if (existingFiles.length > 0) {
          console.log(chalk.yellow('\nDirectory ' + projectName + ' exists with ' + existingFiles.length + ' file(s).'));
          const initExisting = await confirm({ message: 'Initialize SpecWeave in existing directory (non-destructive)?', default: false });
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

  // Check for nested .specweave/
  const parentSpecweaveFolders = detectNestedSpecweave(targetDir);
  if (parentSpecweaveFolders && parentSpecweaveFolders.length > 0) {
    console.log(chalk.red.bold('\n' + locale.t('cli', 'init.errors.nestedNotSupported') + '\n'));
    const homeDirFolder = parentSpecweaveFolders.find(f => f.isHomeDir);
    if (homeDirFolder) {
      console.log(chalk.red.bold('   ⚠️  CRITICAL: Found .specweave/ in HOME DIRECTORY!'));
      console.log(chalk.yellow('   ' + homeDirFolder.path));
      console.log(chalk.cyan.bold('\n   💡 Quick fix:'));
      console.log(chalk.white('   rm -rf "' + homeDirFolder.path + '/.specweave"\n'));
    }
    process.exit(1);
  }

  const spinner = ora('Creating SpecWeave project...').start();

  try {
    // Detect or select tool
    const adapterLoader = new AdapterLoader();
    let toolName: string;

    if (options.adapter) {
      toolName = options.adapter;
      spinner.text = 'Using ' + toolName + '...';
    } else {
      let existingAdapter: string | null = null;
      if (continueExisting) {
        const existingConfigPath = path.join(targetDir, '.specweave', 'config.json');
        if (fs.existsSync(existingConfigPath)) {
          try {
            const existingConfig = fs.readJsonSync(existingConfigPath);
            existingAdapter = existingConfig?.adapters?.default || null;
          } catch { /* ignore */ }
        }
      }

      const detectedTool = await adapterLoader.detectTool();
      spinner.stop();

      console.log(chalk.cyan('\n🔍 ' + locale.t('cli', 'init.toolDetection.header')));
      if (existingAdapter) {
        console.log(chalk.blue('   📋 Current adapter: ' + existingAdapter));
      } else {
        console.log(chalk.gray('   ' + locale.t('cli', 'init.toolDetection.detected', { tool: detectedTool })));
      }
      console.log('');

      if (isCI) {
        console.log(chalk.gray('   ' + locale.t('cli', 'init.toolDetection.ciAutoConfirm', { tool: detectedTool })));
        toolName = detectedTool;
      } else {
        const confirmTool = await confirm({
          message: locale.t('cli', 'init.toolDetection.confirmPrompt', { tool: detectedTool }),
          default: true
        });

        if (!confirmTool) {
          toolName = await select({
            message: locale.t('cli', 'init.toolDetection.selectPrompt'),
            choices: [
              { name: 'Claude Code (Recommended - Full automation)', value: 'claude' },
              { name: 'Cursor (Partial - AGENTS.md compilation)', value: 'cursor' },
              { name: 'Other (Copilot, ChatGPT - Limited)', value: 'generic' }
            ],
            default: 'claude'
          });
        } else {
          toolName = detectedTool;
        }
      }

      spinner.start('Using ' + toolName + '...');
    }

    // Create directory structure
    if (!continueExisting) {
      createDirectoryStructure(targetDir, toolName);
      spinner.text = 'Directory structure created...';
    } else {
      spinner.text = 'Using existing directory structure...';
    }

    // Configure GitHub marketplace for Claude Code
    if (toolName === 'claude') {
      spinner.text = 'Configuring GitHub marketplace...';
      spinner.succeed('GitHub marketplace configured');
      console.log(chalk.gray('   ✓ Marketplace: github.com/anton-abyzov/specweave/.claude-plugin'));
    }

    // Copy templates
    if (!continueExisting) {
      const templatesDir = findSourceDir('templates', __dirname);
      await copyTemplates(templatesDir, targetDir, finalProjectName, language);
      spinner.text = 'Base templates copied...';
    }

    // Install based on tool
    if (toolName === 'claude') {
      spinner.text = 'Configuring for Claude Code...';
      console.log('\n' + locale.t('cli', 'init.claudeNativeComplete'));
    } else {
      await installNonClaudeAdapter(adapterLoader, toolName, targetDir, finalProjectName, options, spinner);
    }

    // Initialize git
    const gitDir = path.join(targetDir, '.git');
    if (!fs.existsSync(gitDir)) {
      const gitInitResult = execFileNoThrowSync('git', ['init'], { cwd: targetDir, shell: false });
      if (gitInitResult.success) {
        spinner.text = 'Git repository initialized...';
        execFileNoThrowSync('git', ['add', '.'], { cwd: targetDir, shell: false });
        execFileNoThrowSync('git', ['commit', '-m', 'Initial commit with SpecWeave'], { cwd: targetDir, shell: false });
      }
    }

    spinner.succeed('SpecWeave project created successfully!');

    // Post-install for non-Claude adapters
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

    // Create config.json
    createConfigFile(targetDir, finalProjectName, toolName, language, false);

    // Auto-install plugins for Claude
    let autoInstallSucceeded = false;
    if (toolName === 'claude') {
      const result = await installAllPlugins({ dirname: __dirname, forceRefresh: options.forceRefresh });
      autoInstallSucceeded = result.success;

      // Repository hosting setup
      const gitHubRemote = detectGitHubRemote(targetDir);
      const repoResult = await setupRepositoryHosting({ targetDir, isCI, gitHubRemote, language });

      // ADO Repository cloning (for multi-repo setups)
      if (repoResult.adoProjectSelection && repoResult.adoClonePatternResult) {
        await triggerAdoRepoCloning(
          targetDir,
          repoResult.adoProjectSelection,
          repoResult.adoClonePatternResult
        );
      }

      // Issue tracker setup
      const isFrameworkRepo = await isSpecWeaveFrameworkRepo(targetDir);
      await setupIssueTrackerWrapper(targetDir, language, isFrameworkRepo, repoResult.hosting, isCI, repoResult.adoProjectSelection);

      // Multi-project folders
      await createMultiProjectFolders(targetDir);

      // External import
      if (!continueExisting) {
        try {
          const importResult = await promptAndRunExternalImport(targetDir, isCI, language);

          // Handle both sync and async import results
          if ('isBackground' in importResult && importResult.isBackground) {
            // Background import started - job will complete asynchronously
            console.log(chalk.cyan('\n🚀 Import running in background'));
            console.log(chalk.gray(`   Check progress: /specweave:jobs`));
          } else if ('totalCount' in importResult && importResult.totalCount > 0) {
            // Sync import completed
            console.log(chalk.green('\n✅ Imported ' + importResult.totalCount + ' items from ' + importResult.platforms.join(', ')));
          }
        } catch (importError) {
          // Show actual error (was swallowed before) - helps debugging
          const errorMsg = importError instanceof Error ? importError.message : String(importError);
          console.log(chalk.yellow(`\n⚠️  External tool import failed: ${errorMsg}`));
          console.log(chalk.gray('   → You can run /specweave-github:sync later to retry'));
        }
      }
    }

    // Testing configuration
    if (!isCI && !continueExisting) {
      const testingResult = await promptTestingConfig(language);
      updateConfigWithTesting(targetDir, testingResult.testMode, testingResult.coverageTarget, language);
    }

    // Translation configuration (CRITICAL: Must ask user - cost implications!)
    // Language already selected in step 1, now ask about auto-translation scope
    if (!isCI && !continueExisting && language !== 'en') {
      // Only ask about translation if non-English language selected
      const translationResult = await promptTranslationConfig(languageResult);
      updateConfigWithTranslation(targetDir, translationResult);
    } else {
      // English or CI mode: Use defaults (no auto-translation needed)
      const defaultTranslation = getDefaultTranslationConfig(language);
      defaultTranslation.keepEnglishOriginals = languageResult.keepEnglishOriginals;
      updateConfigWithTranslation(targetDir, defaultTranslation);
    }

    // Initial increment
    const incrementsDir = path.join(targetDir, '.specweave', 'increments');
    const existingIncrements = fs.existsSync(incrementsDir)
      ? fs.readdirSync(incrementsDir).filter(dir => {
          const fullPath = path.join(incrementsDir, dir);
          return fs.statSync(fullPath).isDirectory() && /^\d{4}-/.test(dir);
        })
      : [];

    if (!continueExisting && existingIncrements.length === 0) {
      console.log(chalk.cyan.bold('\n📦 Creating Initial Increment'));
      try {
        const incrementId = await generateInitialIncrement({
          projectPath: targetDir,
          projectName: finalProjectName,
          techStack: options.techStack,
          language
        });
        console.log(chalk.green('   ✔ Created initial increment: ' + incrementId));

        const statusLineUpdater = new StatusLineUpdater(targetDir);
        await statusLineUpdater.update();
      } catch {
        console.log(chalk.yellow('   ⚠️  Could not create initial increment (non-critical)'));
      }
    }

    showNextSteps(finalProjectName, toolName, language, usedDotNotation, toolName === 'claude' ? autoInstallSucceeded : undefined);
  } catch (error) {
    spinner.fail('Failed to create project');
    console.error(chalk.red('\n' + locale.t('cli', 'init.genericError')), error);
    process.exit(1);
  }
}

/**
 * Install non-Claude adapter (Cursor, Generic)
 */
async function installNonClaudeAdapter(
  adapterLoader: AdapterLoader,
  toolName: string,
  targetDir: string,
  projectName: string,
  options: InitOptions,
  spinner: ReturnType<typeof ora>
): Promise<void> {
  spinner.text = 'Installing ' + toolName + ' adapter...';

  const adapter = adapterLoader.getAdapter(toolName);
  if (!adapter) {
    throw new Error('Adapter not found: ' + toolName);
  }

  await adapterLoader.checkRequirements(toolName);

  await adapter.install({
    projectPath: targetDir,
    projectName,
    techStack: options.techStack ? { language: options.techStack } : undefined,
    docsApproach: 'incremental'
  });

  // Copy plugins folder for non-Claude adapters
  if (toolName !== 'claude') {
    spinner.start('Copying plugins folder for command execution...');
    const specweavePackageRoot = findPackageRoot(__dirname);
    if (specweavePackageRoot) {
      const sourcePluginsDir = path.join(specweavePackageRoot, 'plugins');
      const targetPluginsDir = path.join(targetDir, 'plugins');

      if (fs.existsSync(sourcePluginsDir)) {
        fs.copySync(sourcePluginsDir, targetPluginsDir, {
          overwrite: true,
          filter: (src) => !path.basename(src).startsWith('.')
        });
        spinner.succeed('Plugins folder copied successfully');
      }
    }
  }

  // Install core plugin
  try {
    spinner.start('Installing SpecWeave core plugin...');
    const corePluginPath = findSourceDir('plugins/specweave', __dirname);
    const { PluginLoader } = await import('../../core/plugin-loader.js');
    const loader = new PluginLoader();
    const corePlugin = await loader.loadFromDirectory(corePluginPath);

    if (adapter.supportsPlugins()) {
      await adapter.compilePlugin(corePlugin);
      spinner.succeed('SpecWeave core plugin installed');
    }
  } catch {
    spinner.warn('Could not install core plugin');
  }
}

/**
 * Wrapper for issue tracker setup
 */
async function setupIssueTrackerWrapper(
  targetDir: string,
  language: SupportedLanguage,
  isFrameworkRepo: boolean,
  repositoryHosting: RepositoryHosting,
  isCI: boolean,
  adoProjectSelection?: { org: string; pat: string; projects: string[] }
): Promise<void> {
  try {
    const { setupIssueTracker } = await import('../helpers/issue-tracker/index.js');

    const configPath = path.join(targetDir, '.specweave', 'config.json');
    let existingTracker: string | null = null;

    if (fs.existsSync(configPath)) {
      const config = await fs.readJson(configPath);
      if (config.sync?.activeProfile && config.sync?.profiles) {
        const activeProfile = config.sync.profiles[config.sync.activeProfile];
        existingTracker = activeProfile?.provider || null;
      }
    }

    if (existingTracker) {
      console.log(chalk.blue('\n🔍 Existing Issue Tracker Configuration Detected'));
      console.log(chalk.gray('   Current: ' + existingTracker.charAt(0).toUpperCase() + existingTracker.slice(1)));

      if (isCI) {
        console.log(chalk.gray('   → CI mode: Keeping existing configuration\n'));
        return;
      }

      const reconfigure = await confirm({ message: 'Do you want to reconfigure your issue tracker?', default: false });
      if (!reconfigure) {
        console.log(chalk.gray('   ✓ Keeping existing configuration\n'));
        return;
      }
    }

    await setupIssueTracker({
      projectPath: targetDir,
      language,
      maxRetries: 3,
      isFrameworkRepo,
      repositoryHosting,
      adoCredentialsFromRepoSetup: adoProjectSelection
    });
  } catch {
    console.log(chalk.yellow('\n⚠️  Issue tracker setup skipped (can configure later)'));
  }
}
