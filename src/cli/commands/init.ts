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
import { input, confirm } from '@inquirer/prompts';
import { execFileNoThrowSync } from '../../utils/execFileNoThrow.js';
import { AdapterLoader } from '../../adapters/adapter-loader.js';
import { getDirname } from '../../utils/esm-helpers.js';
import { isLanguageSupported, getSupportedLanguages } from '../../core/i18n/language-manager.js';
import { getLocaleManager } from '../../core/i18n/locale-manager.js';
import type { SupportedLanguage } from '../../core/i18n/types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
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
  installGitHooks,
  promptDeepInterviewConfig,
  updateConfigWithDeepInterview,
  promptQualityGatesConfig,
  updateConfigWithQualityGates,
  WIZARD_BACK,
  logGoingBack,
} from '../helpers/init/index.js';
import { triggerAdoRepoCloning } from '../helpers/init/ado-repo-cloning.js';
import { triggerGitHubRepoCloning } from '../helpers/init/github-repo-cloning.js';
import { triggerBitbucketRepoCloning } from '../helpers/init/bitbucket-repo-cloning.js';
import {
  collectLivingDocsInputs,
} from '../helpers/init/living-docs-preflight.js';
import { setupLspEnvVar } from '../helpers/init/shell-config.js';

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
      defaultProfile: undefined,
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
      syncConfig.defaultProfile = profileId;

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

  // JIRA Multi-Board Folder Creation (reads from config.json, similar to ADO)
  // CRITICAL FIX (2025-12-09): Creates folders from JIRA sync profiles
  // Bug: JIRA folders were only created from legacy .env JIRA_PROJECTS, not from config.json profiles
  const jiraProfiles = Object.values(profiles).filter(p => p.provider === 'jira') as Array<{
    provider?: string;
    config?: {
      domain?: string;
      projectKey?: string;
      boards?: Array<{ id: string; name?: string }>;
    }
  }>;

  if (jiraProfiles.length > 0) {
    console.log(chalk.blue('\n📁 Creating JIRA Folders'));

    for (const jiraProfile of jiraProfiles) {
      if (!jiraProfile?.config?.projectKey) continue;

      const { projectKey, boards } = jiraProfile.config;
      console.log(chalk.gray(`   Project: ${projectKey}`));

      const projectFolder = projectKey.toLowerCase().replace(/[^a-z0-9]/g, '-');

      if (boards?.length) {
        // Create folder per board (2-level structure)
        for (const board of boards) {
          const boardName = board.name || `board-${board.id}`;
          const boardFolder = boardName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const specsPath = path.join(targetDir, '.specweave', 'docs', 'internal', 'specs', projectFolder, boardFolder);

          if (!fs.existsSync(specsPath)) {
            fs.mkdirSync(specsPath, { recursive: true });
          }
          console.log(chalk.green(`   ✓ Created: specs/${projectFolder}/${boardFolder}/`));
        }
      } else {
        // Single project folder (no boards)
        const specsPath = path.join(targetDir, '.specweave', 'docs', 'internal', 'specs', projectFolder);

        if (!fs.existsSync(specsPath)) {
          fs.mkdirSync(specsPath, { recursive: true });
        }
        console.log(chalk.green(`   ✓ Created: specs/${projectFolder}/`));
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
  // Detect CI/non-interactive environment or quick mode
  const isCI = options.quick ||  // Quick mode acts like CI for skipping prompts
               process.env.CI === 'true' ||
               process.env.GITHUB_ACTIONS === 'true' ||
               process.env.GITLAB_CI === 'true' ||
               process.env.CIRCLECI === 'true' ||
               !process.stdin.isTTY;

  // In quick mode, show a brief message
  if (options.quick) {
    console.log(chalk.cyan('\n⚡ Quick mode: Using sensible defaults (local git, no external tools)'));
  }

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

  let targetDir: string = '';
  let finalProjectName: string = '';
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
    // Create subdirectory OR use current directory in quick mode
    if (!projectName) {
      if (isCI) {
        // CI/quick mode without project name: use current directory (like "." notation)
        // This enables: specweave init --quick (without any args)
        usedDotNotation = true;
        targetDir = process.cwd();
        const dirName = path.basename(targetDir);

        // Sanitize directory name for project name
        if (!/^[a-z0-9-]+$/.test(dirName)) {
          finalProjectName = dirName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
          console.log(chalk.gray(`   → Quick mode: Using current directory "${dirName}" as "${finalProjectName}"`));
        } else {
          finalProjectName = dirName;
          console.log(chalk.gray(`   → Quick mode: Using current directory "${finalProjectName}"`));
        }

        // Smart re-initialization for quick mode
        if (fs.existsSync(path.join(targetDir, '.specweave'))) {
          const result = await promptSmartReinit({ targetDir, isCI, hasForce: !!options.force, language });
          if (result.action === 'cancel') {
            process.exit(0);
          }
          continueExisting = result.continueExisting;
        }

        // Quick mode handled: targetDir and finalProjectName already set
        // Skip to nested .specweave check below
      } else {
        projectName = await input({
          message: 'Project name:',
          default: 'my-saas',
          validate: (val: string) => /^[a-z0-9-]+$/.test(val) || 'Project name must be lowercase letters, numbers, and hyphens only',
        });
      }
    }

    // Only process subdirectory creation if projectName was provided/set
    // (Quick mode without args already set targetDir and finalProjectName above)
    if (projectName) {
      targetDir = path.resolve(process.cwd(), projectName);
      // CRITICAL FIX (v1.0.23): Normalize projectName to strip path prefixes like ./
      // Bug: "specweave init ./my-project" stored "./my-project" in config.json
      // which later caused split('/')[0] to return "." and fail validation
      finalProjectName = path.basename(projectName);

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
            if (isCI) {
              // CI/quick mode: proceed without asking
              console.log(chalk.gray('   → CI/quick mode: Proceeding with initialization'));
            } else {
              const initExisting = await confirm({ message: 'Initialize SpecWeave in existing directory (non-destructive)?', default: false });
              if (!initExisting) {
                console.log(chalk.yellow(locale.t('cli', 'init.errors.cancelled')));
                process.exit(0);
              }
            }
            console.log(chalk.green('   ✅ Initializing in existing directory (brownfield-safe)\n'));
          }
        }
      } else {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }
  }

  // Check for nested .specweave/
  // EXCEPTION: User-level folders are VALID (e.g., ~/.specweave for global memory/state)
  const parentSpecweaveFolders = detectNestedSpecweave(targetDir);
  if (parentSpecweaveFolders && parentSpecweaveFolders.length > 0) {
    // Filter out user-level folders - these are VALID global settings locations
    const problematicFolders = parentSpecweaveFolders.filter(f => !f.isUserLevel);

    if (problematicFolders.length > 0) {
      console.log(chalk.red.bold('\n' + locale.t('cli', 'init.errors.nestedNotSupported') + '\n'));
      for (const folder of problematicFolders) {
        console.log(chalk.yellow('   Found .specweave/ at: ' + folder.path));
      }
      console.log(chalk.cyan.bold('\n   💡 SpecWeave doesn\'t support nested projects.'));
      console.log(chalk.white('   Initialize in a different directory or remove the parent .specweave/ folder.\n'));
      process.exit(1);
    }
    // User-level folders found but no problematic ones - allow init to proceed
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
        // CRITICAL (v1.0.25): Ask user if they want to use Claude.
        // If YES → use Claude (CLAUDE.md)
        // If NO → use generic (AGENTS.md for all non-Claude tools)
        // No need to ask which specific non-Claude tool - AGENTS.md works for all!
        const confirmTool = await confirm({
          message: locale.t('cli', 'init.toolDetection.confirmPrompt', { tool: detectedTool }),
          default: true
        });

        if (!confirmTool) {
          // User declined Claude → use generic adapter (AGENTS.md)
          // AGENTS.md is the universal standard for all non-Claude AI tools
          toolName = 'generic';
          console.log(chalk.gray('   → Using AGENTS.md (universal format for non-Claude tools)'));
        } else {
          toolName = detectedTool;
        }
      }

      spinner.start('Using ' + toolName + '...');
    }

    // Create directory structure
    if (!continueExisting) {
      await createDirectoryStructure(targetDir, toolName);
      spinner.text = 'Directory structure created...';
    } else {
      spinner.text = 'Using existing directory structure...';
    }

    // Note: Marketplace registration happens in installAllPlugins or via fallback
    // No fake success message here - actual registration is done below

    // Copy templates
    const templatesDir = findSourceDir('templates', __dirname);
    if (!continueExisting) {
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

    // Auto-install plugins for Claude ONLY
    let autoInstallSucceeded = false;
    let marketplaceOnly = false;
    if (toolName === 'claude') {
      // CRITICAL FIX (v0.34.6): Skip plugin installation in "continue existing" mode
      if (continueExisting) {
        console.log(chalk.green('   ✓ Keeping existing plugin configuration'));
        autoInstallSucceeded = true;
      } else {
        const result = await installAllPlugins({
          dirname: __dirname,
          forceRefresh: options.forceRefresh,
          lazyMode: !options.fullInstall,  // Lazy mode by default, --full disables it
        });
        autoInstallSucceeded = result.success;
        marketplaceOnly = result.marketplaceOnly || false;
      }
    }

    // ========================================================================
    // COMMON SETUP: Repository, Issue Tracker, Wizard (ALL TOOLS - Claude & Non-Claude)
    // v1.0.26: Moved outside Claude-only block to ensure consistent init flow
    // ========================================================================

    // Repository hosting setup (MANDATORY for all tools)
    const gitHubRemote = detectGitHubRemote(targetDir);
    const repoResult = await setupRepositoryHosting({ targetDir, isCI, gitHubRemote, language });

    // Track background job IDs for living docs dependencies
    const pendingJobIds: string[] = [];

    // ADO Repository cloning (for multi-repo setups)
    if (repoResult.adoProjectSelection && repoResult.adoClonePatternResult) {
      const cloneJobId = await triggerAdoRepoCloning(
        targetDir,
        repoResult.adoProjectSelection,
        repoResult.adoClonePatternResult
      );
      if (cloneJobId) {
        pendingJobIds.push(cloneJobId);
      }
    }

    // GitHub Repository cloning (for multi-repo setups)
    let githubClonedRepos: string[] = [];
    if (repoResult.githubRepoSelection && repoResult.adoClonePatternResult) {
      const cloningResult = await triggerGitHubRepoCloning(
        targetDir,
        repoResult.githubRepoSelection,
        repoResult.adoClonePatternResult,
        repoResult.gitUrlFormat || 'https'
      );
      if (cloningResult.jobId) {
        pendingJobIds.push(cloningResult.jobId);
      }
      githubClonedRepos = cloningResult.clonedRepos;
    }

    // Bitbucket Repository cloning (for multi-repo setups)
    if (repoResult.bitbucketRepoSelection && repoResult.adoClonePatternResult) {
      const cloneJobId = await triggerBitbucketRepoCloning(
        targetDir,
        repoResult.bitbucketRepoSelection,
        repoResult.adoClonePatternResult
      );
      if (cloneJobId) {
        pendingJobIds.push(cloneJobId);
      }
    }

    // Issue tracker setup (MANDATORY for all tools)
    const isFrameworkRepo = await isSpecWeaveFrameworkRepo(targetDir);
    const githubRepoSelection = repoResult.githubRepoSelection
      ? {
          org: repoResult.githubRepoSelection.org,
          pat: repoResult.githubRepoSelection.pat,
          clonedRepos: githubClonedRepos
        }
      : undefined;

    await setupIssueTrackerWrapper(
      targetDir,
      language,
      isFrameworkRepo,
      repoResult.hosting,
      isCI,
      repoResult.adoProjectSelection,
      githubRepoSelection,
      repoResult.gitUrlFormat
    );

    // SMART PLUGIN INSTALL (v1.0.122): Auto-install selected external tool plugin
    // Based on issue tracker selection, pre-load the appropriate plugin
    // This saves tokens by NOT loading all 24 plugins - just router + selected tool
    if (toolName === 'claude' && autoInstallSucceeded) {
      await autoInstallSelectedExternalPlugin(targetDir);
    }

    // Multi-project folders
    await createMultiProjectFolders(targetDir);

    // Wizard loop: External import → Living Docs → Testing → Deep Interview → Translation
    type WizardStep = 'external-import' | 'living-docs' | 'testing' | 'deep-interview' | 'translation' | 'done';
    let wizardStep: WizardStep = continueExisting ? 'living-docs' : 'external-import';

    while (wizardStep !== 'done') {
      // STEP: External Import
      if (wizardStep === 'external-import') {
        try {
          const importResult = await promptAndRunExternalImport(targetDir, isCI, language);

          if ('goBack' in importResult && importResult.goBack === WIZARD_BACK) {
            logGoingBack(language);
            continue;
          }

          if ('isBackground' in importResult && importResult.isBackground) {
            console.log(chalk.cyan('\n🚀 Import running in background'));
            console.log(chalk.gray(`   Check progress: /sw:jobs`));
            if ('jobId' in importResult && importResult.jobId) {
              pendingJobIds.push(importResult.jobId);
            }
          } else if ('totalCount' in importResult && importResult.totalCount > 0) {
            console.log(chalk.green('\n✅ Imported ' + importResult.totalCount + ' items from ' + importResult.platforms.join(', ')));
          }
        } catch (importError) {
          const errorMsg = importError instanceof Error ? importError.message : String(importError);
          console.log(chalk.yellow(`\n⚠️  External tool import failed: ${errorMsg}`));
          console.log(chalk.gray('   → You can run /specweave-github:sync later to retry'));
        }
        wizardStep = 'living-docs';
        continue;
      }

      // STEP: Living Docs
      if (wizardStep === 'living-docs') {
        if (!options.noLivingDocs) {
          try {
            const preflightResult = await collectLivingDocsInputs({
              projectPath: targetDir,
              language,
              isCi: isCI,
              skipLivingDocs: options.noLivingDocs,
              pendingJobIds,
            });

            if (preflightResult?.goBack === WIZARD_BACK) {
              logGoingBack(language);
              wizardStep = continueExisting ? 'living-docs' : 'external-import';
              continue;
            }

            // NEW FLOW (v1.0.103+): Save config but DON'T spawn background job
            // User will run /sw:living-docs in separate Claude Code window
            if (preflightResult?.shouldLaunch && preflightResult.isBrownfield) {
              // Save living docs config to state for later use
              saveLivingDocsConfig(targetDir, preflightResult.userInputs);

              // Display instructions to run /sw:living-docs interactively
              displayLivingDocsInstructions(preflightResult.estimatedDuration, language);
            }
          } catch (livingDocsError) {
            const errorMsg = livingDocsError instanceof Error ? livingDocsError.message : String(livingDocsError);
            console.log(chalk.yellow(`\n⚠️  Living Docs setup failed: ${errorMsg}`));
            console.log(chalk.gray('   → You can run /sw:living-docs to configure later'));
          }
        }
        wizardStep = 'testing';
        continue;
      }

      // STEP: Testing Configuration
      if (wizardStep === 'testing') {
        if (!isCI && !continueExisting) {
          const testingResult = await promptTestingConfig(language);

          if (testingResult.goBack === WIZARD_BACK) {
            logGoingBack(language);
            wizardStep = 'living-docs';
            continue;
          }

          updateConfigWithTesting(targetDir, testingResult.testMode, testingResult.coverageTarget, language);
        }
        wizardStep = 'deep-interview';
        continue;
      }

      // STEP: Deep Interview Mode Configuration (v1.0.195+)
      if (wizardStep === 'deep-interview') {
        if (!isCI && !continueExisting) {
          const deepInterviewResult = await promptDeepInterviewConfig(language);

          if (deepInterviewResult.goBack === WIZARD_BACK) {
            logGoingBack(language);
            wizardStep = 'testing';
            continue;
          }

          updateConfigWithDeepInterview(targetDir, deepInterviewResult.enabled, language);
        }
        wizardStep = 'translation';
        continue;
      }

      // STEP: Translation Configuration
      if (wizardStep === 'translation') {
        if (!isCI && !continueExisting && language !== 'en') {
          const translationResult = await promptTranslationConfig(languageResult);

          if ('goBack' in translationResult && translationResult.goBack === WIZARD_BACK) {
            logGoingBack(language);
            wizardStep = 'deep-interview';
            continue;
          }

          updateConfigWithTranslation(targetDir, translationResult);
        } else {
          const defaultTranslation = getDefaultTranslationConfig(language);
          defaultTranslation.keepEnglishOriginals = languageResult.keepEnglishOriginals;
          updateConfigWithTranslation(targetDir, defaultTranslation);
        }
        wizardStep = 'done';
      }
    }

    // v1.0.27: Removed automatic 0001-project-setup increment creation
    // Reason: Multi-project scenarios REQUIRE **Project**: field per User Story,
    // which cannot be determined automatically at init time.
    // Users should create increments explicitly via /sw:increment command.

    // FINAL STEP: Git Hooks Installation (optional)
    // Only prompt if this is a git repository
    const isGitRepo = fs.existsSync(path.join(targetDir, '.git'));
    if (isGitRepo && !isCI) {
      console.log('');
      console.log(chalk.bold('🪝 Git Hooks'));
      console.log('');
      console.log(chalk.gray('  SpecWeave can install pre-commit hooks to enforce best practices:'));
      console.log(chalk.gray('   • Blocks .md files in project root (keeps it clean)'));
      console.log(chalk.gray('   • Enforces increment folder organization'));
      console.log(chalk.gray('   • Prevents duplicate increment IDs'));
      console.log(chalk.gray('   • Validates YAML in spec.md files'));
      console.log(chalk.gray('   • Protects against mass deletions'));
      console.log('');

      const shouldInstallHooks = await confirm({
        message: locale.t('cli', 'init.gitHooks.prompt', { default: 'Install git hooks for quality enforcement?' }),
        default: true
      });

      if (shouldInstallHooks) {
        console.log('');
        installGitHooks(targetDir, templatesDir);
        console.log('');
        console.log(chalk.gray('  To bypass hooks: git commit --no-verify'));
        console.log(chalk.gray('  To remove hooks: rm .git/hooks/pre-commit'));
      } else {
        console.log('');
        console.log(chalk.gray('  Skipped. Install later with: specweave install-hooks'));
      }
    } else if (!isGitRepo && !usedDotNotation) {
      // Only show this message if we created a new directory (not using ".")
      console.log('');
      console.log(chalk.yellow('  ℹ Not a git repository - git hooks not installed'));
      console.log(chalk.gray('    Run: git init && specweave install-hooks'));
    }

    // LSP Environment Variable Setup (v1.0.191)
    // For Claude tool - LSP enhances code intelligence
    const isQuickMode = options.quick || process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

    // QUICK MODE: Auto-enable LSP without prompts (v1.0.210)
    if (toolName === 'claude' && isQuickMode) {
      // Silently enable LSP in config.json
      const configPath = path.join(targetDir, '.specweave', 'config.json');
      if (fs.existsSync(configPath)) {
        try {
          const config = await fs.readJson(configPath);
          config.lsp = {
            enabled: true,
            autoInstallPlugins: true,
            marketplace: 'boostvolt/claude-code-lsps'
          };
          await fs.writeJson(configPath, config, { spaces: 2 });
          console.log(chalk.green('   ✓ LSP enabled in config'));
        } catch {
          // Non-critical, continue
        }
      }

      // Try to set up shell env var silently
      const result = setupLspEnvVar();
      if (result.success && !result.alreadyConfigured) {
        console.log(chalk.green('   ✓ LSP shell config added'));
        console.log(chalk.gray('     Restart terminal for LSP to take effect'));
      }
    }

    // INTERACTIVE MODE: Prompt for LSP setup
    if (toolName === 'claude' && !isQuickMode) {
      console.log('');
      console.log(chalk.cyan('━━━ LSP Support ━━━'));
      console.log('');
      console.log(chalk.gray('  LSP (Language Server Protocol) enables advanced code intelligence:'));
      console.log(chalk.gray('   • Find references across your codebase'));
      console.log(chalk.gray('   • Go to definition'));
      console.log(chalk.gray('   • Type information and diagnostics'));
      console.log('');

      const shouldEnableLsp = await confirm({
        message: 'Enable LSP support? (Adds ENABLE_LSP_TOOL=1 to your shell config)',
        default: true
      });

      if (shouldEnableLsp) {
        const result = setupLspEnvVar();

        if (result.success) {
          if (result.alreadyConfigured) {
            console.log(chalk.green('  ✓ LSP already configured in ' + result.configPath));
          } else {
            console.log(chalk.green('  ✓ Added to ' + result.configPath + ':'));
            console.log(chalk.gray('    ' + result.exportSyntax));
            console.log('');
            console.log(chalk.yellow('  ⚠ Restart your terminal for LSP to take effect'));
          }

          // Also add LSP config to project config.json
          const configPath = path.join(targetDir, '.specweave', 'config.json');
          if (fs.existsSync(configPath)) {
            try {
              const config = await fs.readJson(configPath);
              config.lsp = {
                enabled: true,
                autoInstallPlugins: true,
                marketplace: 'boostvolt/claude-code-lsps'
              };
              await fs.writeJson(configPath, config, { spaces: 2 });
              console.log(chalk.gray('  ✓ LSP config added to .specweave/config.json'));
            } catch {
              // Non-critical, continue
            }
          }

          // Offer to scan for languages and install LSP plugins (v1.0.203)
          console.log('');
          const runLspSetup = await confirm({
            message: 'Scan project for languages and install LSP plugins now?',
            default: true
          });

          if (runLspSetup) {
            console.log('');
            console.log(chalk.cyan('  Running language scan...'));
            try {
              const { scanLanguagesAcrossRepos } = await import('./lsp.js');
              const scanResult = await scanLanguagesAcrossRepos(targetDir, { maxLanguages: 5, minFileCount: 5 });

              if (scanResult.success && scanResult.languages.length > 0) {
                console.log(chalk.gray(`  Found ${scanResult.languages.length} languages across ${scanResult.reposScanned.length} locations`));
                console.log('');
                console.log(chalk.cyan('  Run after restart to install LSP plugins:'));
                console.log(chalk.white('    specweave lsp setup'));
                console.log('');
                console.log(chalk.gray('  Or run directly now (will need restart after):'));
                const installNow = await confirm({
                  message: 'Install LSP plugins now?',
                  default: false
                });

                if (installNow) {
                  const { handleLspSetup } = await import('./lsp.js');
                  await handleLspSetup(targetDir, {
                    maxLanguages: 5,
                    minFileCount: 5,
                    dryRun: false,
                    scope: 'project'
                  });
                }
              } else {
                console.log(chalk.gray('  No supported languages detected (or not enough files)'));
              }
            } catch (scanError) {
              console.log(chalk.yellow(`  ⚠ Language scan failed: ${scanError instanceof Error ? scanError.message : 'Unknown error'}`));
              console.log(chalk.gray('    Run manually later: specweave lsp setup'));
            }
          } else {
            console.log(chalk.gray('  Run later: specweave lsp setup'));
          }
        } else {
          console.log(chalk.yellow('  ⚠ Could not auto-configure LSP: ' + result.error));
          console.log(chalk.gray('    Manual setup: Add this to your shell config (~/.zshrc or ~/.bashrc):'));
          console.log(chalk.white('    ' + result.exportSyntax));
        }
      } else {
        console.log(chalk.gray('  Skipped. Enable later by adding to your shell config:'));
        console.log(chalk.white('    export ENABLE_LSP_TOOL=1'));
      }
    }

    showNextSteps(finalProjectName, toolName, language, usedDotNotation, toolName === 'claude' ? { pluginAutoInstalled: autoInstallSucceeded, marketplaceOnly } : undefined);
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
    const { PluginLoader } = await import('../../core/plugins/plugin-loader.js');
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
  adoProjectSelection?: { org: string; pat: string; projects: string[] },
  githubCredentialsFromRepoSetup?: { org: string; pat: string; clonedRepos?: string[] },
  gitUrlFormat?: 'ssh' | 'https'
): Promise<void> {
  try {
    const { setupIssueTracker } = await import('../helpers/issue-tracker/index.js');

    const configPath = path.join(targetDir, '.specweave', 'config.json');
    let existingTracker: string | null = null;

    if (fs.existsSync(configPath)) {
      const config = await fs.readJson(configPath);
      if (config.sync?.defaultProfile && config.sync?.profiles) {
        const defaultProfile = config.sync.profiles[config.sync.defaultProfile];
        existingTracker = defaultProfile?.provider || null;
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
      adoCredentialsFromRepoSetup: adoProjectSelection,
      githubCredentialsFromRepoSetup,
      gitUrlFormat
    });
  } catch {
    console.log(chalk.yellow('\n⚠️  Issue tracker setup skipped (can configure later)'));
  }
}

/**
 * Save living docs configuration to state for later use
 * (NEW v1.0.103+: No background job spawning during init)
 */
function saveLivingDocsConfig(
  targetDir: string,
  userInputs: import('../../core/background/types.js').LivingDocsUserInputs
): void {
  const stateDir = path.join(targetDir, '.specweave', 'state');
  fs.ensureDirSync(stateDir);

  const configPath = path.join(stateDir, 'living-docs-config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        userInputs,
        savedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

/**
 * Display instructions to run /sw:living-docs interactively
 * (NEW v1.0.103+: Interactive mode instead of background job)
 */
function displayLivingDocsInstructions(
  estimatedDuration: string,
  language: SupportedLanguage = 'en'
): void {
  console.log('');
  console.log(chalk.green('  ✓ Living Docs configuration saved'));
  console.log('');
  console.log(chalk.cyan('  📚 Next: Build Living Documentation'));
  console.log(chalk.gray(`     Estimated: ${estimatedDuration}`));
  console.log('');
  console.log(chalk.white('  To start the Living Docs builder:'));
  console.log(chalk.cyan('  1. Open a NEW Claude Code window (separate conversation)'));
  console.log(chalk.cyan('  2. Run: /sw:living-docs'));
  console.log('');
  console.log(chalk.gray('  💡 Why a separate window?'));
  console.log(chalk.gray('     - You can monitor real-time progress'));
  console.log(chalk.gray('     - Pause/resume by closing/reopening the window'));
  console.log(chalk.gray('     - No background processes or orphaned jobs'));
  console.log('');
}

/**
 * Auto-install external tool plugin based on issue tracker selection
 *
 * NEW (v1.0.122): Smart plugin installation
 * Instead of loading all 24 plugins (~60K tokens), we:
 * 1. Load router skill by default (~500 tokens)
 * 2. Auto-load ONLY the selected external tool plugin (~5K tokens)
 * 3. Other plugins load on-demand via keywords
 *
 * Result: ~30K max instead of ~60K (50% token savings)
 */
async function autoInstallSelectedExternalPlugin(targetDir: string): Promise<void> {
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    return;
  }

  try {
    const config = await fs.readJson(configPath);
    const syncConfig = config.sync as { defaultProfile?: string; profiles?: Record<string, { provider?: string }> } | undefined;

    if (!syncConfig?.defaultProfile || !syncConfig?.profiles) {
      return;
    }

    const defaultProfile = syncConfig.profiles[syncConfig.defaultProfile];
    if (!defaultProfile?.provider) {
      return;
    }

    // Map provider to plugin name
    const providerToPlugin: Record<string, string> = {
      github: 'specweave-github',
      jira: 'specweave-jira',
      ado: 'specweave-ado',
    };

    const pluginToInstall = providerToPlugin[defaultProfile.provider];
    if (!pluginToInstall) {
      return;
    }

    // Install plugin via Claude CLI directly (v1.0.210 - removed PluginCacheManager)
    console.log(chalk.cyan(`\n📦 Auto-installing ${defaultProfile.provider.toUpperCase()} plugin...`));

    const cliResult = execFileNoThrowSync('claude', ['plugin', 'install', `${pluginToInstall}@specweave`]);
    if (cliResult.success) {
      console.log(chalk.green(`   ✓ ${pluginToInstall} installed (ready for sync commands)`));
    } else {
      console.log(chalk.yellow(`   ⚠ Could not auto-install ${pluginToInstall}`));
      console.log(chalk.gray(`   → Install manually: claude plugin install ${pluginToInstall}@specweave`));
    }
  } catch (error) {
    // Non-blocking - just log and continue
    if (process.env.DEBUG) {
      console.log(chalk.gray(`   → Auto-install skipped: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
}
