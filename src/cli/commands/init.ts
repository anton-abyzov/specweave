/**
 * SpecWeave Init Command
 *
 * Simplified (v1.0.415): Creates .specweave/ structure + config.json + instruction files.
 * External tool setup moved to `specweave sync-setup`.
 * Multi-repo setup moved to `specweave migrate-to-umbrella`.
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

import {
  type InitOptions,
  type LanguageSelectionResult,
  findSourceDir,
  findPackageRoot,
  detectNestedSpecweave,
  detectUmbrellaParent,
  detectSuspiciousPath,
  detectProvider,
  scanUmbrellaRepos,
  promptSmartReinit,
  installAllPlugins,
  promptLanguageSelection,
  getDefaultLanguageSelection,
  createDirectoryStructure,
  copyTemplates,
  createConfigFile,
  showNextSteps,
  installGitHooks,
} from '../helpers/init/index.js';
import { setupLspEnvVar } from '../helpers/init/shell-config.js';
import { applySmartDefaults } from '../helpers/init/smart-defaults.js';
import { displaySummaryBanner } from '../helpers/init/summary-banner.js';

const __dirname = getDirname(import.meta.url);
const PROJECT_NAME_PATTERN = /^[a-z0-9-]+$/;
const PROJECT_NAME_VALIDATION_MSG = 'Must be lowercase letters, numbers, and hyphens only';

export type { InitOptions };

/**
 * Unified CI/non-interactive detection.
 */
export function isNonInteractive(options: Pick<InitOptions, 'quick'>): boolean {
  return !!(
    options.quick ||
    process.env.CI === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.GITLAB_CI === 'true' ||
    process.env.CIRCLECI === 'true' ||
    process.env.JENKINS_URL ||
    !process.stdin.isTTY
  );
}

/**
 * Main init command — simplified to core scaffolding only.
 */
export async function initCommand(
  projectName?: string,
  options: InitOptions = {}
): Promise<void> {
  const isCI = isNonInteractive(options);

  if (options.quick) {
    console.log(chalk.cyan('\n⚡ Quick mode: Using sensible defaults'));
  }

  // STEP 1: Language selection (FIRST!)
  let languageResult: LanguageSelectionResult;
  const cliLanguage = options.language?.toLowerCase() as SupportedLanguage | undefined;
  if (cliLanguage && !isLanguageSupported(cliLanguage)) {
    console.error(chalk.red('\n❌ Invalid language: ' + options.language));
    console.error(chalk.yellow('Supported languages: ' + getSupportedLanguages().join(', ') + '\n'));
    process.exit(1);
  }

  if (isCI) {
    languageResult = getDefaultLanguageSelection(cliLanguage || 'en');
  } else if (cliLanguage) {
    languageResult = getDefaultLanguageSelection(cliLanguage);
  } else {
    languageResult = await promptLanguageSelection(isCI);
  }

  const language = languageResult.language;
  const locale = getLocaleManager(language);
  console.log(chalk.blue.bold('\n' + locale.t('cli', 'init.welcome') + '\n'));

  // STEP 2: Path resolution
  let targetDir: string = '';
  let finalProjectName: string = '';
  let usedDotNotation = false;
  let continueExisting = false;

  if (!projectName || projectName === '.') {
    // No args or '.' → init in current directory
    usedDotNotation = true;
    targetDir = process.cwd();

    if (path.resolve(targetDir) === path.resolve(os.homedir())) {
      console.log(chalk.red.bold('\n❌ DANGEROUS: Cannot initialize SpecWeave in home directory!\n'));
      console.log(chalk.yellow('   Your home directory contains ALL your projects.'));
      console.log(chalk.cyan('\n💡 What to do instead:'));
      console.log(chalk.gray('   mkdir ~/Projects/my-project && cd ~/Projects/my-project && specweave init .\n'));
      process.exit(1);
    }

    const dirName = path.basename(targetDir);
    if (!PROJECT_NAME_PATTERN.test(dirName)) {
      const suggestedName = dirName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      if (isCI) {
        finalProjectName = suggestedName;
      } else {
        finalProjectName = await input({
          message: 'Project name (for config):',
          default: suggestedName,
          validate: (val: string) => PROJECT_NAME_PATTERN.test(val) || PROJECT_NAME_VALIDATION_MSG,
        });
      }
    } else {
      finalProjectName = dirName;
    }

    // Smart re-init
    if (fs.existsSync(path.join(targetDir, '.specweave'))) {
      const result = await promptSmartReinit({ targetDir, isCI, hasForce: !!options.force, language });
      if (result.action === 'cancel') process.exit(0);
      continueExisting = result.continueExisting;
    } else {
      // Info: initializing in a non-empty directory
      try {
        const existingFiles = fs.readdirSync(targetDir).filter((f: string) => !f.startsWith('.'));
        if (existingFiles.length > 0) {
          console.log(chalk.gray(`\n   ℹ Directory contains ${existingFiles.length} file(s). Init is non-destructive — only adds .specweave/.\n`));
        }
      } catch { /* ignore read errors */ }
    }
  } else {
    // Explicit project name → create subdirectory
    if (projectName) {
      targetDir = path.resolve(process.cwd(), projectName);
      finalProjectName = path.basename(projectName);

      if (fs.existsSync(targetDir)) {
        const hasSpecweave = fs.existsSync(path.join(targetDir, '.specweave'));
        if (hasSpecweave) {
          const result = await promptSmartReinit({ targetDir, isCI, hasForce: !!options.force, language });
          if (result.action === 'cancel') process.exit(0);
          continueExisting = result.continueExisting;
        } else {
          const existingFiles = fs.readdirSync(targetDir).filter(f => !f.startsWith('.'));
          if (existingFiles.length > 0) {
            if (!isCI) {
              const initExisting = await confirm({ message: 'Initialize SpecWeave in existing directory (non-destructive)?', default: false });
              if (!initExisting) {
                console.log(chalk.yellow(locale.t('cli', 'init.errors.cancelled')));
                process.exit(0);
              }
            }
          }
        }
      } else {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }
  }

  // STEP 3: Guard clauses
  const umbrellaResult = detectUmbrellaParent(targetDir);
  if (umbrellaResult) {
    if (options.force) {
      console.log(chalk.yellow(`\n⚠️  Warning: Inside umbrella project at ${umbrellaResult.umbrellaRoot}. Proceeding with --force.\n`));
    } else {
      console.log(chalk.red.bold('\n❌ Cannot initialize here: inside an umbrella project.\n'));
      console.log(chalk.yellow(`   Umbrella root: ${umbrellaResult.umbrellaRoot}`));
      console.log(chalk.cyan('\n💡 Run specweave init in the umbrella root instead, or use --force to override.\n'));
      process.exit(1);
    }
  }

  const suspiciousResult = detectSuspiciousPath(targetDir);
  if (suspiciousResult) {
    if (options.force) {
      console.log(chalk.yellow(`\n⚠️  Warning: Path contains suspicious segment "${suspiciousResult.segment}". Proceeding with --force.\n`));
    } else {
      console.log(chalk.red.bold(`\n❌ Cannot initialize here: path contains "${suspiciousResult.segment}".\n`));
      console.log(chalk.yellow(`   Suggested project root: ${suspiciousResult.suggestedRoot}`));
      process.exit(1);
    }
  }

  const parentSpecweaveFolders = detectNestedSpecweave(targetDir);
  if (parentSpecweaveFolders && parentSpecweaveFolders.length > 0) {
    const problematicFolders = parentSpecweaveFolders.filter(f => !f.isUserLevel && !f.isStale);
    const staleFolders = parentSpecweaveFolders.filter(f => f.isStale);

    if (staleFolders.length > 0 && !isCI) {
      console.log(chalk.yellow('\n⚠️  Found stale .specweave/ folder(s) without config.json:\n'));
      for (const folder of staleFolders) {
        console.log(chalk.gray('   ' + path.join(folder.path, '.specweave') + '/'));
      }
      const cleanup = await confirm({ message: 'Remove stale .specweave/ folder(s)?', default: true });
      if (cleanup) {
        for (const folder of staleFolders) {
          try { fs.rmSync(path.join(folder.path, '.specweave'), { recursive: true, force: true }); } catch { /* skip */ }
        }
      }
    }

    if (problematicFolders.length > 0) {
      console.log(chalk.red.bold('\n' + locale.t('cli', 'init.errors.nestedNotSupported') + '\n'));
      for (const folder of problematicFolders) {
        console.log(chalk.yellow('   Found .specweave/ at: ' + folder.path));
      }
      process.exit(1);
    }
  }

  // STEP 4: Create project
  const spinner = ora('Creating SpecWeave project...').start();

  try {
    // Adapter detection
    const adapterLoader = new AdapterLoader();
    let toolName: string;

    if (options.adapter) {
      toolName = options.adapter;
    } else {
      let existingAdapter: string | null = null;
      if (continueExisting) {
        const existingConfigPath = path.join(targetDir, '.specweave', 'config.json');
        if (fs.existsSync(existingConfigPath)) {
          try {
            existingAdapter = fs.readJsonSync(existingConfigPath)?.adapters?.default || null;
          } catch { /* ignore */ }
        }
      }

      const detectedTool = await adapterLoader.detectTool();
      spinner.stop();

      if (isCI) {
        toolName = detectedTool;
      } else {
        console.log(chalk.cyan('\n🔍 ' + locale.t('cli', 'init.toolDetection.header')));
        if (existingAdapter) {
          console.log(chalk.blue('   📋 Current adapter: ' + existingAdapter));
        } else {
          console.log(chalk.gray('   ' + locale.t('cli', 'init.toolDetection.detected', { tool: detectedTool })));
        }
        console.log('');

        const confirmTool = await confirm({
          message: locale.t('cli', 'init.toolDetection.confirmPrompt', { tool: detectedTool }),
          default: true
        });
        toolName = confirmTool ? detectedTool : 'generic';
        if (!confirmTool) {
          console.log(chalk.gray('   → Using AGENTS.md (universal format for non-Claude tools)'));
        }
      }

      spinner.start('Using ' + toolName + '...');
    }

    // Provider auto-detection from .git/config (silent, no prompts)
    const providerInfo = detectProvider(targetDir);

    // Umbrella auto-detection: scan repositories/ subdirectory
    // Mutable — may be updated after repo cloning in post-scaffold step
    let umbrellaDiscovery = scanUmbrellaRepos(targetDir);

    // Create directory structure
    if (!continueExisting) {
      await createDirectoryStructure(targetDir, toolName);
      spinner.text = 'Directory structure created...';
    }

    // Copy templates
    const templatesDir = findSourceDir('templates', __dirname);
    if (!continueExisting) {
      await copyTemplates(templatesDir, targetDir, finalProjectName, language);
      spinner.text = 'Templates copied...';
    }

    // Non-Claude adapter install
    if (toolName === 'claude') {
      spinner.text = 'Configuring for Claude Code...';
      console.log('\n' + locale.t('cli', 'init.claudeNativeComplete'));
    } else {
      await installNonClaudeAdapter(adapterLoader, toolName, targetDir, finalProjectName, options, spinner);
    }

    // Git init
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

    // Create config.json (simplified — no maturity, no structureDeferred)
    createConfigFile(targetDir, finalProjectName, toolName, language, false);
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    const isGitRepo = fs.existsSync(path.join(targetDir, '.git'));

    // Batch config updates: provider + smart defaults + LSP (single read-modify-write)
    if (fs.existsSync(configPath)) {
      try {
        const config = fs.readJsonSync(configPath);

        // Provider info from .git/config
        if (providerInfo) {
          const org = providerInfo.owner || providerInfo.organization;
          config.repository = {
            provider: providerInfo.provider,
            ...(org && { organization: org }),
            ...(providerInfo.repo && { repo: providerInfo.repo }),
          };
        }

        // Smart defaults
        applySmartDefaults(config, { adapter: toolName, language, isGitRepo });
        if (languageResult.keepEnglishOriginals && config.translation) {
          config.translation.keepEnglishOriginals = true;
        }

        // Auto-enable umbrella if repositories/ directory was discovered
        if (umbrellaDiscovery && !config.umbrella?.enabled) {
          // Generate prefixes with deduplication
          const usedPrefixes = new Set<string>();
          const childRepos = umbrellaDiscovery.repos.map(r => {
            let prefix = r.name.substring(0, 3).toUpperCase();
            if (usedPrefixes.has(prefix)) {
              // Disambiguate by appending incrementing suffix
              let suffix = 2;
              while (usedPrefixes.has(prefix.substring(0, 2) + suffix)) suffix++;
              prefix = prefix.substring(0, 2) + suffix;
            }
            usedPrefixes.add(prefix);
            return { id: r.name, path: r.path, name: r.name, prefix };
          });

          config.umbrella = {
            enabled: true,
            projectName: finalProjectName,
            childRepos,
          };
          config.repository = { ...config.repository, umbrellaRepo: true };
        }

        // LSP auto-enable (Claude only)
        if (toolName === 'claude') {
          config.lsp = {
            enabled: true,
            autoInstallPlugins: true,
            marketplace: 'boostvolt/claude-code-lsps',
          };
        }

        fs.writeJsonSync(configPath, config, { spaces: 2 });
      } catch (err) {
        console.log(chalk.yellow('   ⚠ Could not update config defaults (non-critical)'));
      }
    }

    // Post-scaffold: Project setup question
    // Ask how the user wants to set up code — skip if already has .git, repositories/, or CI mode
    if (!isCI && !continueExisting) {
      const hasGit = fs.existsSync(path.join(targetDir, '.git'));
      const hasRepos = fs.existsSync(path.join(targetDir, 'repositories'));

      if (!hasGit && !hasRepos) {
        spinner.stop();
        try {
          const { promptProjectSetup, promptRepoUrls, cloneReposIntoWorkspace } = await import('../helpers/init/repo-connect.js');
          const setupChoice = await promptProjectSetup(language);

          if (setupChoice === 'clone-repos') {
            const repos = await promptRepoUrls(language);
            if (repos.length > 0) {
              const result = cloneReposIntoWorkspace(targetDir, repos);
              console.log(chalk.green(`\n   ✓ Cloned ${result.totalCloned} repo(s)`));
              if (result.totalFailed > 0) {
                console.log(chalk.yellow(`   ⚠ ${result.totalFailed} repo(s) failed to clone`));
              }

              // Re-scan for umbrella and update config
              umbrellaDiscovery = scanUmbrellaRepos(targetDir);
              if (umbrellaDiscovery && fs.existsSync(configPath)) {
                try {
                  const config = fs.readJsonSync(configPath);
                  const usedPrefixes = new Set<string>();
                  const childRepos = umbrellaDiscovery.repos.map(r => {
                    let prefix = r.name.substring(0, 3).toUpperCase();
                    if (usedPrefixes.has(prefix)) {
                      let suffix = 2;
                      while (usedPrefixes.has(prefix.substring(0, 2) + suffix)) suffix++;
                      prefix = prefix.substring(0, 2) + suffix;
                    }
                    usedPrefixes.add(prefix);
                    return { id: r.name, path: r.path, name: r.name, prefix };
                  });
                  config.umbrella = { enabled: true, projectName: finalProjectName, childRepos };
                  config.repository = { ...config.repository, umbrellaRepo: true };
                  fs.writeJsonSync(configPath, config, { spaces: 2 });
                } catch { /* non-fatal */ }
              }
            }
          }
        } catch { /* non-fatal — user can set up repos later */ }
        spinner.start('Finalizing...');
      }
    }

    // Plugin install (Claude only)
    // CRITICAL FIX (v0.34.6): Skip plugin installation when continuing existing config.
    // Previously, re-running `specweave init .` would deregister all marketplace plugins.
    let autoInstallSucceeded = false;
    let marketplaceOnly = false;
    if (toolName === 'claude') {
      if (continueExisting) {
        console.log(chalk.green('   ✓ Keeping existing plugin configuration'));
        autoInstallSucceeded = true;
      } else {
        const result = await installAllPlugins({
          dirname: __dirname,
          forceRefresh: options.forceRefresh,
          lazyMode: !options.fullInstall,
        });
        autoInstallSucceeded = result.success;
        marketplaceOnly = result.marketplaceOnly || false;
      }

      // Enable agent teams env var
      try {
        const { enableAgentTeamsEnvVar } = await import('../helpers/init/claude-settings-env.js');
        enableAgentTeamsEnvVar(targetDir);
      } catch {
        console.log(chalk.yellow('   ⚠ Could not enable agent teams env var (non-critical)'));
      }

      setupLspEnvVar();
    }

    // Git hooks
    if (isGitRepo && !continueExisting) {
      installGitHooks(targetDir, templatesDir);
    }

    // Summary banner
    {
      let bannerConfig: Record<string, any> | undefined;
      if (fs.existsSync(configPath)) {
        try { bannerConfig = fs.readJsonSync(configPath); } catch { /* ignore */ }
      }

      let bannerProvider: { name: string; owner?: string; repo?: string; organization?: string } | undefined;
      if (providerInfo) {
        const providerNames: Record<string, string> = { github: 'GitHub', ado: 'Azure DevOps', bitbucket: 'Bitbucket' };
        bannerProvider = {
            name: providerNames[providerInfo.provider] || providerInfo.provider,
            owner: providerInfo.owner,
            repo: providerInfo.repo,
            organization: providerInfo.organization,
          };
      } else {
        bannerProvider = { name: 'Local' };
      }

      const finalDefaults = {
        testing: bannerConfig?.testing?.defaultTestMode || 'TDD',
        qualityGates: bannerConfig?.qualityGates?.preset || 'standard',
        lspEnabled: !!bannerConfig?.lsp?.enabled,
        gitHooksInstalled: isGitRepo,
        translationEnabled: !!bannerConfig?.translation?.enabled,
        coverageTargets: bannerConfig?.testing?.coverageTargets,
      };

      displaySummaryBanner({
        projectName: finalProjectName,
        provider: bannerProvider,
        adapter: toolName,
        language,
        defaults: finalDefaults,
        umbrellaDiscovery: umbrellaDiscovery || undefined,
      });
    }

    showNextSteps(
      finalProjectName,
      toolName,
      language,
      usedDotNotation,
      toolName === 'claude' ? { pluginAutoInstalled: autoInstallSucceeded, marketplaceOnly } : undefined,
      { isUmbrella: !!umbrellaDiscovery }
    );
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
