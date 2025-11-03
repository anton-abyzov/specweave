import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
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
  adapter?: string;  // 'claude', 'cursor', 'copilot', 'generic'
  techStack?: string;
  language?: string;  // Language for i18n support
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

    if (existingFiles.length > 0) {
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

    // Check if .specweave already exists
    if (fs.existsSync(path.join(targetDir, '.specweave'))) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: '.specweave directory already exists. Overwrite?',
          default: false,
        },
      ]);

      if (!overwrite) {
        console.log(chalk.yellow(locale.t('cli', 'init.errors.cancelled')));
        process.exit(0);
      }

      fs.removeSync(path.join(targetDir, '.specweave'));
      if (fs.existsSync(path.join(targetDir, '.claude'))) {
        fs.removeSync(path.join(targetDir, '.claude'));
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
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Directory ${projectName} already exists. Overwrite?`,
          default: false,
        },
      ]);

      if (!overwrite) {
        console.log(chalk.yellow(locale.t('cli', 'init.errors.cancelled')));
        process.exit(0);
      }

      fs.emptyDirSync(targetDir);
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  // 3. Check for nested .specweave/ (CRITICAL: prevent nested folders)
  const parentSpecweave = detectNestedSpecweave(targetDir);
  if (parentSpecweave) {
    console.log('');
    console.log(chalk.red.bold(locale.t('cli', 'init.errors.nestedNotSupported')));
    console.log('');
    console.log(chalk.yellow(`   ${locale.t('cli', 'init.errors.parentFound')}`));
    console.log(chalk.white(`   ${parentSpecweave}`));
    console.log('');
    console.log(chalk.cyan(`   ${locale.t('cli', 'init.info.nestedEnforcement')}`));
    console.log(chalk.gray(`   ${locale.t('cli', 'init.info.nestedBullet1')}`));
    console.log(chalk.gray(`   ${locale.t('cli', 'init.info.nestedBullet2')}`));
    console.log(chalk.gray(`   ${locale.t('cli', 'init.info.nestedBullet3')}`));
    console.log('');
    console.log(chalk.cyan(`   ${locale.t('cli', 'init.info.nestedToFix')}`));
    console.log(chalk.white(`   ${locale.t('cli', 'init.nestedCdCommand', { path: parentSpecweave })}`));
    console.log(chalk.white(`   ${locale.t('cli', 'init.nestedIncCommand')}`));
    console.log('');
    process.exit(1);
  }

  const spinner = ora('Creating SpecWeave project...').start();

  try {
    // 4. Detect or select tool
    const adapterLoader = new AdapterLoader();
    let toolName: string;

    if (options.adapter) {
      // User explicitly chose a tool
      toolName = options.adapter;
      spinner.text = `Using ${toolName}...`;
    } else {
      // Auto-detect tool
      spinner.stop();
      toolName = await adapterLoader.detectTool();
      spinner.start(`Detected ${toolName}...`);
    }

    // 4. Create directory structure (same for all)
    createDirectoryStructure(targetDir);
    spinner.text = 'Directory structure created...';

    // 5. Copy plugin marketplace (for Claude Code auto-registration)
    if (toolName === 'claude') {
      try {
        const sourceMarketplace = findSourceDir('.claude-plugin');
        const targetMarketplace = path.join(targetDir, '.claude-plugin');

        if (fs.existsSync(sourceMarketplace)) {
          fs.copySync(sourceMarketplace, targetMarketplace, {
            overwrite: true,
            errorOnExist: false
          });
          spinner.text = 'Plugin marketplace copied...';
        }
      } catch (error) {
        // Non-critical - plugins can still be installed manually
        console.warn(chalk.yellow(`\n${locale.t('cli', 'init.warnings.marketplaceCopyFailed')}`));
      }
    }

    // 6. Copy base templates (config, README, CLAUDE.md - same for all)
    const templatesDir = findSourceDir('templates');
    await copyTemplates(templatesDir, targetDir, finalProjectName, language as SupportedLanguage);
    spinner.text = 'Base templates copied...';

    // 6. Install based on tool
    if (toolName === 'claude') {
      // DEFAULT: Native Claude Code installation (no adapter needed!)
      spinner.text = 'Installing Claude Code components...';

      try {
        copyCommands('', path.join(targetDir, '.claude/commands'), language as SupportedLanguage);
        spinner.text = 'Slash commands installed...';
      } catch (error: any) {
        spinner.fail('Failed to copy commands');
        console.error(chalk.red(`\n${locale.t('cli', 'init.errors.commandsCopyFailed', { error: error.message })}`));
        throw error;
      }

      try {
        copyAgents('', path.join(targetDir, '.claude/agents'), language as SupportedLanguage);
        spinner.text = 'Agents installed...';
      } catch (error: any) {
        spinner.fail('Failed to copy agents');
        console.error(chalk.red(`\n${locale.t('cli', 'init.errors.agentsCopyFailed', { error: error.message })}`));
        throw error;
      }

      try {
        copySkills('', path.join(targetDir, '.claude/skills'), language as SupportedLanguage);
        spinner.text = 'Skills installed...';
      } catch (error: any) {
        spinner.fail('Failed to copy skills');
        console.error(chalk.red(`\n${locale.t('cli', 'init.errors.skillsCopyFailed', { error: error.message })}`));
        throw error;
      }

      try {
        copyHooks('', path.join(targetDir, '.claude/hooks'), language as SupportedLanguage);
        spinner.text = 'Hooks installed...';
      } catch (error: any) {
        spinner.fail('Failed to copy hooks');
        console.error(chalk.red(`\n${locale.t('cli', 'init.errors.hooksCopyFailed', { error: error.message })}`));
        throw error;
      }

      try {
        spinner.text = 'Generating skills index...';
        // Generate skills index and copy to target (root-level after v0.5.0)
        const sourceIndexPath = path.join(__dirname, '../../../skills/SKILLS-INDEX.md');
        await generateSkillsIndex(sourceIndexPath);

        // Copy index to target .claude/skills/
        const targetIndexPath = path.join(targetDir, '.claude/skills/SKILLS-INDEX.md');
        fs.copySync(sourceIndexPath, targetIndexPath);

        spinner.text = 'Skills index generated...';
      } catch (error: any) {
        // Non-critical error - don't fail installation
        console.warn(chalk.yellow(`\n${locale.t('cli', 'init.warnings.skillsIndexWarning', { error: error.message })}`));
        console.warn(chalk.yellow(`   ${locale.t('cli', 'init.warnings.skillsIndexNote')}`));
      }

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
    }

    // 9. Initialize git (skip if .git already exists)
    const gitDir = path.join(targetDir, '.git');
    if (!fs.existsSync(gitDir)) {
      try {
        execSync('git init', { cwd: targetDir, stdio: 'ignore' });
        spinner.text = 'Git repository initialized...';
      } catch (error) {
        spinner.warn('Git initialization skipped (git not found)');
      }

      // 10. Create initial commit
      try {
        execSync('git add .', { cwd: targetDir, stdio: 'ignore' });
        execSync('git commit -m "Initial commit with SpecWeave"', { cwd: targetDir, stdio: 'ignore' });
        spinner.text = 'Initial commit created...';
      } catch (error) {
        // Git commit might fail if no user configured, that's ok
      }
    } else {
      spinner.text = 'Using existing Git repository...';
    }

    spinner.succeed('SpecWeave project created successfully!');

    // 11. Auto-detect and suggest plugins (T-018)
    console.log('');
    const pluginSpinner = ora('Detecting plugins...').start();
    try {
      const { PluginDetector } = await import('../../core/plugin-detector.js');
      const { PluginManager } = await import('../../core/plugin-manager.js');

      const detector = new PluginDetector();
      const detectionResults = await detector.detectFromProject(targetDir);
      const suggestedPlugins = detectionResults.map(r => r.pluginName);

      pluginSpinner.succeed(`Detected ${suggestedPlugins.length} suggested plugins`);

      if (suggestedPlugins.length > 0) {
        console.log(chalk.cyan(`\n${locale.t('cli', 'init.info.suggestedPlugins')}`));
        for (const pluginName of suggestedPlugins) {
          console.log(`   • ${chalk.white(pluginName)}`);
        }

        const { enablePlugins } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'enablePlugins',
            message: 'Enable suggested plugins now?',
            default: true
          }
        ]);

        if (enablePlugins) {
          const adapter = adapterLoader.getAdapter(toolName);
          if (!adapter) {
            throw new Error(`Adapter not found for tool: ${toolName}`);
          }

          const manager = new PluginManager(targetDir);

          const enableSpinner = ora('Enabling plugins...').start();
          for (const pluginName of suggestedPlugins) {
            try {
              await manager.loadPlugin(pluginName, adapter, { skipDependencies: false });
              enableSpinner.text = `Enabled ${pluginName}`;
            } catch (error) {
              enableSpinner.warn(`Failed to enable ${pluginName}: ${error instanceof Error ? error.message : error}`);
            }
          }
          enableSpinner.succeed('Plugins enabled');
        }
      }
    } catch (error) {
      pluginSpinner.warn('Plugin detection skipped');
      console.log(chalk.gray(`   ${locale.t('cli', 'init.pluginEnableLater')}`));
    }

    // 12. Show tool-specific next steps
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
    createConfigFile(targetDir, finalProjectName, toolName, language as SupportedLanguage);

    // 14. Setup Claude Code plugin auto-registration (if Claude detected)
    if (toolName === 'claude') {
      try {
        setupClaudePluginAutoRegistration(targetDir, language as SupportedLanguage);
      } catch (error) {
        // Non-critical - show manual instructions in next steps
        console.warn(chalk.yellow(`\n${locale.t('cli', 'init.warnings.pluginAutoSetupFailed')}`));
      }
    }

    showNextSteps(finalProjectName, toolName, language as SupportedLanguage, usedDotNotation);
  } catch (error) {
    spinner.fail('Failed to create project');
    console.error(chalk.red(`\n${locale.t('cli', 'init.genericError')}`), error);
    process.exit(1);
  }
}

function createDirectoryStructure(targetDir: string): void {
  const directories = [
    // Core increment structure
    '.specweave/increments',

    // 5-pillar documentation structure
    '.specweave/docs/internal/strategy',      // Business specs (WHAT, WHY)
    '.specweave/docs/internal/architecture',  // Technical design (HOW)
    '.specweave/docs/internal/delivery',      // Roadmap, CI/CD, guides
    '.specweave/docs/internal/operations',    // Runbooks, SLOs
    '.specweave/docs/internal/governance',    // Security, compliance
    '.specweave/docs/public',                 // Published documentation

    // Claude Code integration (components auto-install here)
    '.claude/commands',
    '.claude/agents',
    '.claude/skills',
    '.claude/hooks',
  ];

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
}

/**
 * Detect if a parent directory contains a .specweave/ folder
 * SpecWeave ONLY supports root-level .specweave/ folders
 * Nested .specweave/ folders are NOT supported
 *
 * @param targetDir - Directory where user wants to initialize
 * @returns Path to parent .specweave/ folder, or null if none found
 */
function detectNestedSpecweave(targetDir: string): string | null {
  // Start from parent of target directory
  let currentDir = path.dirname(path.resolve(targetDir));
  const root = path.parse(currentDir).root;

  // Walk up the directory tree
  while (currentDir !== root) {
    const specweavePath = path.join(currentDir, '.specweave');

    // Check if .specweave/ exists at this level
    if (fs.existsSync(specweavePath)) {
      return currentDir; // Found parent .specweave/
    }

    // Move up one level
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  return null; // No parent .specweave/ found
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
    // Try src/ directory first (for npm installs that include src/)
    const srcPath = path.normalize(path.join(packageRoot, 'src', relativePath));
    if (fs.existsSync(srcPath)) {
      return srcPath;
    }

    // Try dist/ directory (for development where src might not be in dist)
    const distPath = path.normalize(path.join(packageRoot, 'dist', relativePath));
    if (fs.existsSync(distPath)) {
      return distPath;
    }

    // Try directly in package root (legacy)
    const rootPath = path.normalize(path.join(packageRoot, relativePath));
    if (fs.existsSync(rootPath)) {
      return rootPath;
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

function copyCommands(commandsDir: string, targetCommandsDir: string, language: SupportedLanguage): void {
  const locale = getLocaleManager(language);
  const sourceDir = findSourceDir('commands');

  if (!fs.existsSync(sourceDir)) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.sourceNotFound', { type: 'commands' })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.expectedAt', { path: sourceDir })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.dirname', { path: __dirname })}`));
    const packageRoot = findPackageRoot(__dirname);
    if (packageRoot) {
      console.error(chalk.red(`   ${locale.t('cli', 'init.errors.packageRoot', { root: packageRoot })}`));
    } else {
      console.error(chalk.red(`   ${locale.t('cli', 'init.errors.couldNotFindRoot')}`));
    }
    throw new Error('Failed to locate source commands directory. This may be a Windows path resolution issue.');
  }

  // Validate source directory contains files
  const sourceFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'));
  if (sourceFiles.length === 0) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.sourceEmpty', { type: 'commands' })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.directory', { path: sourceDir })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.installationIssue')}`));
    throw new Error('Source commands directory exists but contains no .md files');
  }

  try {
    // Ensure target directory exists
    fs.ensureDirSync(targetCommandsDir);

    // Copy each command file and inject system prompts if needed
    for (const file of sourceFiles) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetCommandsDir, file);

      // Read, potentially inject, and write
      const content = fs.readFileSync(sourcePath, 'utf-8');
      const modifiedContent = language !== 'en'
        ? injectSystemPromptForInit(content, language)
        : content;
      fs.writeFileSync(targetPath, modifiedContent, 'utf-8');
    }

    // Validate files were copied
    const copiedFiles = fs.readdirSync(targetCommandsDir).filter(f => f.endsWith('.md'));
    if (copiedFiles.length === 0) {
      throw new Error(`Copy completed but no files found in target directory: ${targetCommandsDir}`);
    }

    console.log(chalk.gray(`   ${locale.t('cli', 'init.info.copiedFiles', { count: copiedFiles.length })}`));
  } catch (error: any) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.errorCopying', { type: 'commands', error: error.message })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.source', { path: sourceDir })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.target', { path: targetCommandsDir })}`));
    throw error;
  }
}

function copyAgents(agentsDir: string, targetAgentsDir: string, language: SupportedLanguage): void {
  const locale = getLocaleManager(language);
  const sourceDir = findSourceDir('agents');

  if (!fs.existsSync(sourceDir)) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.sourceNotFound', { type: 'agents' })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.expectedAt', { path: sourceDir })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.dirname', { path: __dirname })}`));
    const packageRoot = findPackageRoot(__dirname);
    if (packageRoot) {
      console.error(chalk.red(`   ${locale.t('cli', 'init.errors.packageRoot', { root: packageRoot })}`));
    } else {
      console.error(chalk.red(`   ${locale.t('cli', 'init.errors.couldNotFindRoot')}`));
    }
    throw new Error('Failed to locate source agents directory. This may be a Windows path resolution issue.');
  }

  // Validate source directory contains subdirectories with AGENT.md files
  const agentDirs = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory());

  if (agentDirs.length === 0) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.sourceEmpty', { type: 'agents' })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.directory', { path: sourceDir })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.installationIssue')}`));
    throw new Error('Source agents directory exists but contains no agent subdirectories');
  }

  try {
    // Ensure target directory exists
    fs.ensureDirSync(targetAgentsDir);

    // Copy each agent directory and inject system prompts if needed
    for (const agentDir of agentDirs) {
      const sourcePath = path.join(sourceDir, agentDir.name);
      const targetPath = path.join(targetAgentsDir, agentDir.name);

      // Copy entire agent directory first
      fs.copySync(sourcePath, targetPath, {
        overwrite: true,
        errorOnExist: false
      });

      // Then inject system prompt into AGENT.md if language !== 'en'
      if (language !== 'en') {
        const agentMdPath = path.join(targetPath, 'AGENT.md');
        if (fs.existsSync(agentMdPath)) {
          const content = fs.readFileSync(agentMdPath, 'utf-8');
          const modifiedContent = injectSystemPromptForInit(content, language);
          fs.writeFileSync(agentMdPath, modifiedContent, 'utf-8');
        }
      }
    }

    // Validate subdirectories were copied
    const copiedDirs = fs.readdirSync(targetAgentsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());

    if (copiedDirs.length === 0) {
      throw new Error(`Copy completed but no agent directories found in target: ${targetAgentsDir}`);
    }

    console.log(chalk.gray(`   ${locale.t('cli', 'init.info.copiedAgents', { count: copiedDirs.length })}`));
  } catch (error: any) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.errorCopying', { type: 'agents', error: error.message })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.source', { path: sourceDir })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.target', { path: targetAgentsDir })}`));
    throw error;
  }
}

/**
 * Inject system prompt for non-English languages
 */
function injectSystemPromptForInit(content: string, language: SupportedLanguage): string {
  if (language === 'en') {
    return content; // No changes for English
  }

  const systemPrompt = getSystemPromptForLanguage(language);

  // Inject after YAML frontmatter if present
  if (content.startsWith('---')) {
    const endOfFrontmatter = content.indexOf('---', 3);
    if (endOfFrontmatter !== -1) {
      const frontmatter = content.substring(0, endOfFrontmatter + 3);
      const body = content.substring(endOfFrontmatter + 3);
      return `${frontmatter}\n\n${systemPrompt}\n${body}`;
    }
  }

  // No frontmatter - inject at the top
  return `${systemPrompt}\n\n${content}`;
}

function copySkills(skillsDir: string, targetSkillsDir: string, language: SupportedLanguage): void {
  const locale = getLocaleManager(language);
  const sourceDir = findSourceDir('skills');

  if (!fs.existsSync(sourceDir)) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.sourceNotFound', { type: 'skills' })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.expectedAt', { path: sourceDir })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.dirname', { path: __dirname })}`));
    const packageRoot = findPackageRoot(__dirname);
    if (packageRoot) {
      console.error(chalk.red(`   ${locale.t('cli', 'init.errors.packageRoot', { root: packageRoot })}`));
    } else {
      console.error(chalk.red(`   ${locale.t('cli', 'init.errors.couldNotFindRoot')}`));
    }
    throw new Error('Failed to locate source skills directory. This may be a Windows path resolution issue.');
  }

  // Validate source directory contains subdirectories with SKILL.md files
  const skillDirs = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory());

  if (skillDirs.length === 0) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.sourceEmpty', { type: 'skills' })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.directory', { path: sourceDir })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.installationIssue')}`));
    throw new Error('Source skills directory exists but contains no skill subdirectories');
  }

  try {
    // Ensure target directory exists
    fs.ensureDirSync(targetSkillsDir);

    // Copy each skill directory and inject system prompts if needed
    for (const skillDir of skillDirs) {
      const sourcePath = path.join(sourceDir, skillDir.name);
      const targetPath = path.join(targetSkillsDir, skillDir.name);

      // Copy entire skill directory first
      fs.copySync(sourcePath, targetPath, {
        overwrite: true,
        errorOnExist: false
      });

      // Then inject system prompt into SKILL.md if language !== 'en'
      if (language !== 'en') {
        const skillMdPath = path.join(targetPath, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
          const content = fs.readFileSync(skillMdPath, 'utf-8');
          const modifiedContent = injectSystemPromptForInit(content, language);
          fs.writeFileSync(skillMdPath, modifiedContent, 'utf-8');
        }
      }
    }

    // Validate subdirectories were copied
    const copiedDirs = fs.readdirSync(targetSkillsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());

    if (copiedDirs.length === 0) {
      throw new Error(`Copy completed but no skill directories found in target: ${targetSkillsDir}`);
    }

    console.log(chalk.gray(`   ${locale.t('cli', 'init.info.copiedSkills', { count: copiedDirs.length })}`));
  } catch (error: any) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.errorCopying', { type: 'skills', error: error.message })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.source', { path: sourceDir })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.target', { path: targetSkillsDir })}`));
    throw error;
  }
}

function copyHooks(hooksDir: string, targetHooksDir: string, language: SupportedLanguage = 'en'): void {
  const locale = getLocaleManager(language);
  const sourceDir = findSourceDir('hooks');

  if (!fs.existsSync(sourceDir)) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.sourceNotFound', { type: 'hooks' })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.expectedAt', { path: sourceDir })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.dirname', { path: __dirname })}`));
    const packageRoot = findPackageRoot(__dirname);
    if (packageRoot) {
      console.error(chalk.red(`   ${locale.t('cli', 'init.errors.packageRoot', { root: packageRoot })}`));
    } else {
      console.error(chalk.red(`   ${locale.t('cli', 'init.errors.couldNotFindRoot')}`));
    }
    throw new Error('Failed to locate source hooks directory. This may be a Windows path resolution issue.');
  }

  // Validate source directory contains hook files
  const hookFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.sh') || f === 'README.md');

  if (hookFiles.length === 0) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.sourceEmpty', { type: 'hooks' })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.directory', { path: sourceDir })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.installationIssue')}`));
    throw new Error('Source hooks directory exists but contains no hook files');
  }

  try {
    // Ensure target directory exists
    fs.ensureDirSync(targetHooksDir);

    // Copy all files from source to target
    fs.copySync(sourceDir, targetHooksDir, {
      overwrite: true,
      errorOnExist: false
    });

    // Validate files were copied
    const copiedFiles = fs.readdirSync(targetHooksDir).filter(f => f.endsWith('.sh') || f === 'README.md');

    if (copiedFiles.length === 0) {
      throw new Error(`Copy completed but no hook files found in target: ${targetHooksDir}`);
    }

    console.log(chalk.gray(`   ${locale.t('cli', 'init.info.copiedHooks', { count: copiedFiles.length })}`));
  } catch (error: any) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.errorCopying', { type: 'hooks', error: error.message })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.source', { path: sourceDir })}`));
    console.error(chalk.red(`   ${locale.t('cli', 'init.errors.target', { path: targetHooksDir })}`));
    throw error;
  }
}

/**
 * Create .specweave/config.json with project settings
 */
function createConfigFile(
  targetDir: string,
  projectName: string,
  adapter: string,
  language: SupportedLanguage
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
 * Setup Claude Code automatic plugin registration
 * Creates .claude/settings.json with extraKnownMarketplaces
 * This triggers Claude's native auto-install when users trust the folder
 */
function setupClaudePluginAutoRegistration(targetDir: string, language: SupportedLanguage): void {
  const locale = getLocaleManager(language);
  const settingsPath = path.join(targetDir, '.claude', 'settings.json');

  // Check if marketplace files exist
  const marketplacePath = path.join(targetDir, '.claude-plugin', 'marketplace.json');
  if (!fs.existsSync(marketplacePath)) {
    console.log(chalk.yellow(`\n${locale.t('cli', 'init.warnings.marketplaceNotFound')}`));
    return;
  }

  // Create settings.json with marketplace registration
  const settings = {
    extraKnownMarketplaces: {
      specweave: {
        source: {
          source: 'local',
          path: './.claude-plugin'
        }
      }
    }
  };

  try {
    fs.writeJsonSync(settingsPath, settings, { spaces: 2 });
    console.log(chalk.green(`\n✅ ${locale.t('cli', 'init.success.pluginAutoSetup')}`));
    console.log(chalk.gray(`   ${locale.t('cli', 'init.info.pluginAutoSetupDetails')}`));
  } catch (error: any) {
    throw new Error(`Failed to create .claude/settings.json: ${error.message}`);
  }
}

function showNextSteps(projectName: string, adapterName: string, language: SupportedLanguage, usedDotNotation: boolean = false): void {
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

    // CRITICAL STEP: Install core plugin (highlighted)
    console.log(`   ${stepNumber + 1}. ${chalk.yellow.bold('⚠️  ' + locale.t('cli', 'init.nextSteps.claude.step2'))}`);
    console.log(`      ${chalk.cyan.bold(locale.t('cli', 'init.nextSteps.claude.installCore'))}`);
    console.log(`      ${chalk.gray('↑ Required for slash commands like /specweave:inc')}`);
    console.log('');

    console.log(`   ${stepNumber + 2}. ${chalk.white(locale.t('cli', 'init.nextSteps.claude.step3'))}`);
    console.log(`      ${chalk.gray(locale.t('cli', 'init.nextSteps.claude.installGitHub'))}`);
    console.log(`      ${chalk.gray(locale.t('cli', 'init.nextSteps.claude.installFrontend'))}`);
    console.log(`      ${chalk.gray('...or let SpecWeave suggest plugins automatically')}`);
    console.log('');
    console.log(`   ${stepNumber + 3}. ${chalk.white(locale.t('cli', 'init.nextSteps.claude.step4'))}`);
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
  } else if (adapterName === 'copilot') {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.copilot.step1'))}`);
    console.log('');
    console.log(`   ${stepNumber + 1}. ${chalk.white(locale.t('cli', 'init.nextSteps.copilot.step2'))}`);
    console.log(`      ${locale.t('cli', 'init.nextSteps.copilot.action')}`);
    console.log('');
    console.log(`   ${stepNumber + 2}. ${chalk.white(locale.t('cli', 'init.nextSteps.copilot.step3'))}`);
    console.log(`      ${locale.t('cli', 'init.nextSteps.copilot.example')}`);
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
