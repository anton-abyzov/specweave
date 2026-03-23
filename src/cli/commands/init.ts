/**
 * SpecWeave Init Command
 *
 * Simplified (v1.0.415): Creates .specweave/ structure + config.json + instruction files.
 * External tool setup moved to `specweave sync-setup`.
 * Every workspace uses repositories/ structure from day one.
 */

import * as fs from '../../utils/fs-native.js';
import * as nativeFs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { input, confirm, select } from '@inquirer/prompts';
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
  detectNestedSpecweave,
  detectUmbrellaParent,
  detectSuspiciousPath,
  detectProvider,
  scanWorkspaceRepos,
  scanMisplacedRepos,
  buildWorkspaceConfig,
  promptSmartReinit,
  installAllPlugins,
  promptLanguageSelection,
  getDefaultLanguageSelection,
  createMinimalConfig,
  createDirectoryStructure,
  copyTemplates,
  createConfigFile,
  showNextSteps,
  installGitHooks,
  ensureSkillCreator,
  promptProjectSetup,
  promptRepoUrlsLoop,
} from '../helpers/init/index.js';
import {
  scanWorkspaceContent,
  promptMigrationChoice,
  promptStartEmptySubChoice,
  showRestructureWarnings,
  restructureIntoRepositories,
  copyLocalPathIntoRepositories,
  promptOrgRepo,
} from '../helpers/init/workspace-setup.js';
import { promptRootRepoConnection, type RootRepoInfo } from '../helpers/init/root-repo-detection.js';
import { setupLspEnvVar } from '../helpers/init/shell-config.js';
import { applySmartDefaults } from '../helpers/init/smart-defaults.js';
import { displaySummaryBanner } from '../helpers/init/summary-banner.js';
import type { LivingDocsUserInputs } from '../../core/background/types.js';

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
  // No args = init in CWD, same as explicit '.'
  if (!projectName) projectName = '.';

  let targetDir: string = '';
  let finalProjectName: string = '';
  let usedDotNotation = false;
  let continueExisting = false;

  // STEP 2a: Path resolution (set targetDir + finalProjectName — NO destructive actions)
  if (projectName === '.') {
    // Init in current directory
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
  } else {
    // Explicit project name → create subdirectory
    targetDir = path.resolve(process.cwd(), projectName);
    finalProjectName = path.basename(projectName);
  }

  // STEP 2b: Guard clauses (BEFORE any destructive action like promptSmartReinit)
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

  // STEP 2c: Reinit / existence checks (safe now — guards already validated the path)
  if (usedDotNotation) {
    if (fs.existsSync(path.join(targetDir, '.specweave'))) {
      const result = await promptSmartReinit({ targetDir, isCI, hasForce: !!options.force, language });
      if (result.action === 'cancel') process.exit(0);
      continueExisting = result.continueExisting;
    } else {
      // STEP 2d: Non-empty folder detection (T-009 — 0640)
      const scan = scanWorkspaceContent(targetDir);
      if (scan.hasSourceFiles || scan.hasPackageManager || scan.fileCount > 0) {
        const choice = await promptMigrationChoice(scan, language, isCI);

        try {
          if (choice === 'start-empty') {
            const subChoice = await promptStartEmptySubChoice(language);
            if (subChoice === 'copy-local') {
              const sourcePath = await input({
                message: 'Path to existing repository (absolute or relative):',
                validate: (v: string) => v.trim().length > 0 || 'Path is required',
              });
              const orgRepo = await promptOrgRepo(path.resolve(targetDir, sourcePath));
              const result = copyLocalPathIntoRepositories(targetDir, sourcePath, orgRepo.org, orgRepo.repoName);
              if (result.copied.length > 0) {
                console.log(chalk.green(`   ✓ Copied ${result.copied.length} item(s) to ${result.targetDir}`));
              }
              if (result.errors.length > 0) {
                console.log(chalk.yellow(`   ⚠ Copy errors: ${result.errors.join(', ')}`));
              }
            }
            // 'clone-github' and 'add-later' fall through to existing promptProjectSetup flow
          } else if (choice === 'restructure') {
            showRestructureWarnings(scan);
            const confirmed = await confirm({ message: 'Proceed with restructure?', default: false });
            if (confirmed) {
              const orgRepo = await promptOrgRepo(targetDir);
              const result = restructureIntoRepositories(targetDir, orgRepo.org, orgRepo.repoName);
              if (result.moved.length > 0) {
                console.log(chalk.green(`   ✓ Moved ${result.moved.length} item(s) to ${result.targetDir}`));
              }
              if (result.errors.length > 0) {
                console.log(chalk.yellow(`   ⚠ Restructure errors: ${result.errors.join(', ')}`));
              }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'ExitPromptError') throw err;
          console.log(chalk.red(`   ✗ Workspace setup failed: ${err instanceof Error ? err.message : String(err)}`));
          console.log(chalk.gray('   Continuing with standard init...'));
        }
        // choice === 'continue-in-place' → proceed as current behavior
      }
    }
  } else {
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

  // STEP 2e: Root repo GitHub connection — early position (T-013 — 0640)
  let rootRepoInfo: RootRepoInfo | null = null;
  if (!isCI && !continueExisting) {
    try {
      rootRepoInfo = await promptRootRepoConnection(targetDir, language, isCI);
    } catch {
      // Prompt cancellation — skip silently
    }
  }

  // STEP 3: Create project
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
        if (confirmTool) {
          toolName = detectedTool;
        } else {
          toolName = await select({
            message: 'Select your AI coding tool:',
            choices: [
              { name: 'Antigravity (Google)', value: 'antigravity' },
              { name: 'Codex (OpenAI)', value: 'codex' },
              { name: 'OpenCode', value: 'opencode' },
              { name: 'GitHub Copilot', value: 'copilot' },
              { name: 'Cursor', value: 'cursor' },
              { name: 'Windsurf', value: 'windsurf' },
              { name: 'Cline', value: 'cline' },
              { name: 'Gemini CLI', value: 'gemini' },
              { name: 'Amazon Q', value: 'amazonq' },
              { name: 'JetBrains AI', value: 'jetbrains' },
              { name: 'Continue', value: 'continue' },
              { name: 'Aider', value: 'aider' },
              { name: 'Trae (ByteDance)', value: 'trae' },
              { name: 'Zed', value: 'zed' },
              { name: 'Tabnine', value: 'tabnine' },
              { name: 'Kimi CLI', value: 'kimi' },
              { name: 'Other / Generic (AGENTS.md for any tool)', value: 'generic' },
            ],
          });
          console.log(chalk.gray(`   → Using ${toolName} adapter`));
        }
      }

      spinner.start('Using ' + toolName + '...');
    }

    // Provider auto-detection from .git/config (silent, no prompts)
    const providerInfo = detectProvider(targetDir);

    // Umbrella auto-detection: scan repositories/ subdirectory
    // Mutable — may be updated after repo cloning in post-scaffold step
    let umbrellaDiscovery = scanWorkspaceRepos(targetDir);

    // Detect repos in non-standard layout (repositories/{repo}/.git instead of {org}/{repo}/.git)
    // Only called when standard detection failed — the two cases are mutually exclusive
    const misplacedRepos = !umbrellaDiscovery ? scanMisplacedRepos(targetDir) : [];

    // Write minimal config.json BEFORE creating directory structure so that
    // findProjectRoot() can resolve this project during the init window (AD-3).
    if (!continueExisting) {
      createMinimalConfig(targetDir, finalProjectName);
    }

    // Create directory structure
    if (!continueExisting) {
      await createDirectoryStructure(targetDir, toolName);
      spinner.text = 'Directory structure created...';
    }

    // Copy templates
    const templatesDir = findSourceDir('templates', __dirname);
    if (!continueExisting) {
      await copyTemplates(templatesDir, targetDir, finalProjectName, language, toolName);
      spinner.text = 'Templates copied...';
    }

    // Non-Claude adapter install
    if (toolName === 'claude') {
      spinner.text = 'Configuring for Claude Code...';
      console.log('\n' + locale.t('cli', 'init.claudeNativeComplete'));
    } else {
      await installNonClaudeAdapter(adapterLoader, toolName, targetDir, finalProjectName, options, spinner);
    }

    // Post-scaffold: Always create repositories/ directory (unified workspace model)
    fs.mkdirSync(path.join(targetDir, 'repositories'), { recursive: true });

    // Post-scaffold: Project setup question (BEFORE git init so !hasGit is true for greenfield)
    // Ask which repos to connect — skip if already has .git, repositories with content, or CI mode
    if (!isCI && !continueExisting) {
      const hasGit = fs.existsSync(path.join(targetDir, '.git'));

      if (!hasGit) {
        spinner.stop();
        try {
          const setupChoice = await promptProjectSetup(language);

          if (setupChoice === 'clone-repos') {
            const { foregroundResults, jobIds } = await promptRepoUrlsLoop(targetDir, language);
            const totalCloned = foregroundResults.reduce((sum, r) => sum + r.totalCloned, 0);
            if (totalCloned > 0) {
              console.log(chalk.green(`\n   ✓ Cloned ${totalCloned} repo(s)`));
              umbrellaDiscovery = scanWorkspaceRepos(targetDir);
            }
            if (jobIds.length > 0) {
              console.log(chalk.green(`\n   ✓ ${jobIds.length} background clone job(s) started`));
              console.log(chalk.gray(`     Monitor: specweave jobs`));
            }
          }
          // 'add-later' — repositories/ already created above, nothing more needed
        } catch (err) {
          // Prompt cancellation (Ctrl+C) is expected — swallow silently
          // Unexpected errors (job launcher crash, disk full) — warn so user knows cloning was skipped
          if (err && typeof err === 'object' && 'name' in err && (err as Error).name !== 'ExitPromptError') {
            console.log(chalk.yellow(`   ⚠ Repo setup skipped: ${(err as Error).message || 'Unknown error'}`));
          }
        }
        spinner.start('Configuring project...');
      }
    }

    // Git init (after post-scaffold so initial commit captures cloned repos)
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

        // Always write workspace section — every workspace uses repositories/ structure
        if (umbrellaDiscovery) {
          const wsFragment = buildWorkspaceConfig(umbrellaDiscovery, finalProjectName);
          config.workspace = wsFragment.workspace;
          config.repository = { ...config.repository, ...wsFragment.repository };
        } else if (!config.workspace) {
          config.workspace = { name: finalProjectName, repos: [] };
        }
        // Clean up legacy keys — workspace replaces umbrella/multiProject/projectMappings
        delete config.umbrella;
        delete config.multiProject;
        delete config.projectMappings;

        // Apply root repo info from early prompt (T-013 — 0640)
        if (rootRepoInfo && config.workspace) {
          config.workspace.rootRepo = {
            github: { owner: rootRepoInfo.owner, repo: rootRepoInfo.repo },
          };
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

    // Stop the init spinner before plugin installation — installAllPlugins()
    // creates its own ora spinner and concurrent spinners cause visual corruption.
    spinner.stop();

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
          projectRoot: targetDir,
        });
        autoInstallSucceeded = result.success;
        marketplaceOnly = result.marketplaceOnly || false;
      }

      // Auto-install Anthropic's skill-creator (non-blocking)
      if (!continueExisting) {
        // Fire-and-forget — non-blocking, never throws
        ensureSkillCreator(targetDir).catch(() => {});
      }

      // Enable agent teams env var (project-level + global)
      try {
        const os = await import('os');
        const { enableAgentTeamsEnvVar } = await import('../helpers/init/claude-settings-env.js');
        enableAgentTeamsEnvVar(targetDir);
        enableAgentTeamsEnvVar(os.homedir());
      } catch {
        console.log(chalk.yellow('   ⚠ Could not enable agent teams env var (non-critical)'));
      }

      setupLspEnvVar();
    }


    // Git hooks
    if (isGitRepo && !continueExisting) {
      installGitHooks(targetDir, templatesDir);
    }

    // Launch living docs builder (background job — never blocks init)
    if (!continueExisting && !isCI) {
      try {
        const { launchLivingDocsJob } = await import('../../core/background/index.js');
        const { displayJobScheduled, estimateDuration } = await import('../helpers/init/living-docs-preflight.js');

        const userInputs: LivingDocsUserInputs = {
          analysisDepth: 'quick',
          priorityAreas: [],
          additionalSources: [],
          knownPainPoints: [],
        };

        // Save config so standalone `specweave living-docs` can reuse it
        const stateDir = path.join(targetDir, '.specweave', 'state');
        fs.ensureDirSync(stateDir);
        nativeFs.writeFileSync(
          path.join(stateDir, 'living-docs-config.json'),
          JSON.stringify({ userInputs, savedAt: new Date().toISOString(), source: 'init' }, null, 2),
        );

        const ldResult = await launchLivingDocsJob({ projectPath: targetDir, userInputs });

        if (ldResult.isBackground) {
          const duration = estimateDuration(targetDir, 'quick');
          displayJobScheduled(ldResult.job.id.slice(0, 8), duration, language);
        }
      } catch {
        // Non-critical — living docs can always be launched later with `specweave living-docs`
      }
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
      { misplacedRepos }
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

  // Copy marketplace plugin skills from local Claude cache (skill-creator, frontend-design, etc.)
  if (adapter.supportsPlugins()) {
    try {
      spinner.start('Checking for marketplace skills...');
      const marketplaceSkillsCopied = await copyMarketplaceSkills(targetDir, toolName);
      if (marketplaceSkillsCopied > 0) {
        spinner.succeed(`${marketplaceSkillsCopied} marketplace skill(s) copied`);
      } else {
        spinner.info('No marketplace skills found in local cache');
      }
    } catch {
      // Non-critical — marketplace skills are optional
    }
  }
}

/**
 * Copy marketplace plugin skills from ~/.claude/plugins/cache/ to the project's skills directory.
 * This enables non-Claude tools to access skills like skill-creator, frontend-design, etc.
 */
async function copyMarketplaceSkills(targetDir: string, toolName: string): Promise<number> {
  const homedir = os.homedir();
  const marketplaceCacheDir = path.join(homedir, '.claude', 'plugins', 'cache', 'claude-plugins-official');

  if (!fs.existsSync(marketplaceCacheDir)) {
    return 0;
  }

  // Determine target skills directory based on tool
  // MUST match each adapter's compilePlugin() target directory
  const skillsDirMap: Record<string, string> = {
    antigravity: '.agent/skills',
    codex: '.codex/skills',
    opencode: '.opencode/skills',
    copilot: '.github/skills',
    cursor: '.cursor/skills',
    windsurf: '.windsurf/skills',
    cline: '.cline/skills',
    gemini: '.gemini',
    amazonq: '.amazonq/skills',
    jetbrains: '.junie/skills',
    continue: '.continue/skills',
    aider: '.aider/skills',
    trae: '.trae/skills',
    zed: '.zed/skills',
    tabnine: '.tabnine/skills',
    kimi: '.kimi/skills',
    generic: '.agents/skills',
  };

  const skillsDir = path.join(targetDir, skillsDirMap[toolName] || '.agents/skills');
  await fs.ensureDir(skillsDir);

  let copied = 0;
  let pluginDirs: string[];
  try {
    pluginDirs = fs.readdirSync(marketplaceCacheDir).filter(
      (name: string) => !name.startsWith('.')
    );
  } catch {
    return 0;
  }

  for (const pluginName of pluginDirs) {
    // Security: skip directory names with path traversal or separators
    if (pluginName.includes('..') || pluginName.includes(path.sep) || pluginName.includes('/')) continue;

    try {
      const pluginDir = path.join(marketplaceCacheDir, pluginName);
      // Verify it's a real directory (not a symlink to somewhere else)
      if (!fs.statSync(pluginDir).isDirectory()) continue;
      // Ensure resolved path stays within the cache directory (symlink safety)
      const resolvedPluginDir = nativeFs.realpathSync(pluginDir);
      if (!resolvedPluginDir.startsWith(marketplaceCacheDir)) continue;

      const versions = fs.readdirSync(pluginDir).filter((v: string) => {
        if (v.startsWith('.') || v.includes('..') || v.includes(path.sep)) return false;
        const vPath = path.join(pluginDir, v);
        return fs.statSync(vPath).isDirectory();
      });
      if (versions.length === 0) continue;

      // Sort versions to pick deterministically (last alphabetically)
      versions.sort();
      const latestVersion = versions[versions.length - 1];
      const versionDir = path.join(pluginDir, latestVersion);

      const skillsPath = path.join(versionDir, 'skills');
      if (!fs.existsSync(skillsPath)) continue;

      const skillNames = fs.readdirSync(skillsPath).filter((s: string) => {
        if (s.includes('..') || s.includes(path.sep) || s.includes('/')) return false;
        return fs.existsSync(path.join(skillsPath, s, 'SKILL.md'));
      });

      for (const skillName of skillNames) {
        const skillMdPath = path.join(skillsPath, skillName, 'SKILL.md');
        // Flat structure: skills go directly under skillsDir, no plugin namespace
        const skillSubdir = path.join(skillsDir, skillName);
        fs.mkdirSync(skillSubdir, { recursive: true });
        const targetFile = path.join(skillSubdir, 'SKILL.md');

        // Read content and ensure frontmatter has name: field
        let content = nativeFs.readFileSync(skillMdPath, 'utf-8');
        content = sanitizeFrontmatter(content, skillName);
        nativeFs.writeFileSync(targetFile, content, 'utf-8');
        copied++;
      }
    } catch {
      // Skip individual plugin failures — continue with others
      continue;
    }
  }

  return copied;
}

/**
 * Sanitize frontmatter for non-Claude tools:
 * 1. Ensure `name:` field is present (required for non-Claude)
 * 2. Strip Claude-specific fields: user-invocable, allowed-tools, model
 */
function sanitizeFrontmatter(content: string, skillName: string): string {
  if (!content.startsWith('---')) {
    return `---\nname: ${skillName}\ndescription: ${skillName}\n---\n${content}`;
  }

  const endOfFrontmatter = content.indexOf('---', 3);
  if (endOfFrontmatter === -1) return content;

  let frontmatterBlock = content.substring(3, endOfFrontmatter);
  const body = content.substring(endOfFrontmatter + 3);

  // Strip Claude-specific fields (both spellings of user-invocable/invokable)
  frontmatterBlock = frontmatterBlock.replace(/^user-invoc?k?able\s*:.*\n?/gm, '');
  frontmatterBlock = frontmatterBlock.replace(/^allowed-tools\s*:.*\n?/gm, '');
  frontmatterBlock = frontmatterBlock.replace(/^model\s*:.*\n?/gm, '');

  // Ensure name: is present
  if (!/^name\s*:/m.test(frontmatterBlock)) {
    frontmatterBlock = `\nname: ${skillName}${frontmatterBlock}`;
  }

  return `---${frontmatterBlock}---${body}`;
}
