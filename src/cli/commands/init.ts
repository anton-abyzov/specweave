import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { AdapterLoader } from '../../adapters/adapter-loader';
import { IAdapter } from '../../adapters/adapter-interface';
import { ClaudeMdGenerator } from '../../adapters/claude-md-generator';
import { AgentsMdGenerator } from '../../adapters/agents-md-generator';

interface InitOptions {
  template?: string;
  adapter?: string;  // 'claude', 'cursor', 'copilot', 'generic'
  techStack?: string;
}

export async function initCommand(
  projectName?: string,
  options: InitOptions = {}
): Promise<void> {
  console.log(chalk.blue.bold('\n🚀 SpecWeave Initialization\n'));

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
      console.log(chalk.yellow(`\n⚠️  Current directory name '${dirName}' contains invalid characters.`));
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
      console.log(chalk.yellow(`\n⚠️  Current directory contains ${existingFiles.length} file${existingFiles.length === 1 ? '' : 's'}.`));
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Initialize SpecWeave in current directory?',
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('❌ Initialization cancelled'));
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
        console.log(chalk.yellow('❌ Initialization cancelled'));
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
        console.log(chalk.yellow('❌ Initialization cancelled'));
        process.exit(0);
      }

      fs.emptyDirSync(targetDir);
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  const spinner = ora('Creating SpecWeave project...').start();

  try {
    // 3. Detect or select tool
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

    // 5. Copy base templates (config, README, CLAUDE.md - same for all)
    const templatesDir = path.join(__dirname, '../../../src/templates');
    await copyTemplates(templatesDir, targetDir, finalProjectName);
    spinner.text = 'Base templates copied...';

    // 6. Install based on tool
    if (toolName === 'claude') {
      // DEFAULT: Native Claude Code installation (no adapter needed!)
      spinner.text = 'Installing Claude Code components...';

      const commandsDir = path.join(__dirname, '../../../src/commands');
      copyCommands(commandsDir, path.join(targetDir, '.claude/commands'));
      spinner.text = 'Slash commands installed...';

      const agentsDir = path.join(__dirname, '../../../src/agents');
      copyAgents(agentsDir, path.join(targetDir, '.claude/agents'));
      spinner.text = 'Agents installed...';

      const skillsDir = path.join(__dirname, '../../../src/skills');
      copySkills(skillsDir, path.join(targetDir, '.claude/skills'));
      spinner.text = 'Skills installed...';

      console.log('\n✨ Claude Code native installation complete!');
      console.log('   ✅ Native skills, agents, hooks work out of the box');
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

    showNextSteps(finalProjectName, toolName, usedDotNotation);
  } catch (error) {
    spinner.fail('Failed to create project');
    console.error(chalk.red('\nError:'), error);
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
  ];

  directories.forEach((dir) => {
    fs.mkdirSync(path.join(targetDir, dir), { recursive: true });
  });
}

async function copyTemplates(templatesDir: string, targetDir: string, projectName: string): Promise<void> {
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
  const skillsDir = path.join(__dirname, '../../../src/skills');
  const agentsDir = path.join(__dirname, '../../../src/agents');
  const commandsDir = path.join(__dirname, '../../../src/commands');

  const claudeGen = new ClaudeMdGenerator(skillsDir, agentsDir, commandsDir);
  const claudeMd = await claudeGen.generate({
    projectName,
    projectPath: targetDir,
    templatePath: path.join(templatesDir, 'CLAUDE.md.template')
  });

  fs.writeFileSync(path.join(targetDir, 'CLAUDE.md'), claudeMd);

  // Generate AGENTS.md - Universal file for ALL OTHER AI tools
  // Following agents.md standard: https://agents.md/
  // Used by: Cursor, Gemini CLI, Codex, GitHub Copilot, and ANY non-Claude tool
  // NOTE: Claude Code does NOT read this file - it only reads CLAUDE.md above
  // Replaces: .cursorrules, instructions.md, and other tool-specific files
  const agentsGen = new AgentsMdGenerator(skillsDir, agentsDir, commandsDir);
  const agentsMd = await agentsGen.generate({
    projectName,
    projectPath: targetDir,
    templatePath: path.join(templatesDir, 'AGENTS.md.template')
  });

  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), agentsMd);

  // Copy .gitignore
  const gitignoreTemplate = path.join(templatesDir, '.gitignore.template');
  if (fs.existsSync(gitignoreTemplate)) {
    fs.copyFileSync(gitignoreTemplate, path.join(targetDir, '.gitignore'));
  }
}

function copyCommands(commandsDir: string, targetCommandsDir: string): void {
  if (fs.existsSync(commandsDir)) {
    fs.copySync(commandsDir, targetCommandsDir);
  }
}

function copyAgents(agentsDir: string, targetAgentsDir: string): void {
  if (fs.existsSync(agentsDir)) {
    fs.copySync(agentsDir, targetAgentsDir);
  }
}

function copySkills(skillsDir: string, targetSkillsDir: string): void {
  if (fs.existsSync(skillsDir)) {
    fs.copySync(skillsDir, targetSkillsDir);
  }
}

function showNextSteps(projectName: string, adapterName: string, usedDotNotation: boolean = false): void {
  console.log('');
  console.log(chalk.cyan.bold('🎯 Next steps:'));
  console.log('');

  let stepNumber = 1;

  // Only show "cd" step if we created a subdirectory
  if (!usedDotNotation) {
    console.log(`   ${stepNumber}. ${chalk.white(`cd ${projectName}`)}`);
    console.log('');
    stepNumber++;
  }

  // Adapter-specific instructions
  if (adapterName === 'claude') {
    console.log(`   ${stepNumber}. ${chalk.white('Open Claude Code and describe your project:')}`);
    console.log(`      ${chalk.gray('"Build a real estate listing platform"')}`);
    console.log('');
    console.log(`   ${stepNumber + 1}. ${chalk.white('SpecWeave will:')}`);
    console.log('      • Auto-activate skills and agents');
    console.log('      • Create specifications');
    console.log('      • Build implementation');
  } else if (adapterName === 'cursor') {
    console.log(`   ${stepNumber}. ${chalk.white('Open project in Cursor')}`);
    console.log('');
    console.log(`   ${stepNumber + 1}. ${chalk.white('Say: "Create increment for [your feature]"')}`);
    console.log(`      Cursor will read .cursorrules and guide you`);
    console.log('');
    console.log(`   ${stepNumber + 2}. ${chalk.white('Use @ shortcuts:')}`);
    console.log(`      @increments, @docs, @strategy, @tests`);
  } else if (adapterName === 'copilot') {
    console.log(`   ${stepNumber}. ${chalk.white('Open project in VS Code with Copilot')}`);
    console.log('');
    console.log(`   ${stepNumber + 1}. ${chalk.white('Copilot will read workspace instructions automatically')}`);
    console.log(`      Start creating increment folders and files`);
    console.log('');
    console.log(`   ${stepNumber + 2}. ${chalk.white('Use Copilot Chat for guidance:')}`);
    console.log(`      "How do I create a spec.md?"`);
  } else if (adapterName === 'generic') {
    console.log(`   ${stepNumber}. ${chalk.white('Read SPECWEAVE-MANUAL.md')}`);
    console.log('');
    console.log(`   ${stepNumber + 1}. ${chalk.white('Follow step-by-step instructions')}`);
    console.log(`      Works with ANY AI tool (ChatGPT, Claude web, Gemini)`);
  }

  console.log('');
  console.log(chalk.green.bold('🚀 Ready to build with SpecWeave!'));
  console.log('');
  console.log(chalk.gray('Documentation: https://spec-weave.com'));
  console.log(chalk.gray('GitHub: https://github.com/anton-abyzov/specweave'));
  console.log('');
}
