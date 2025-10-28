import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { AdapterLoader } from '../../adapters/adapter-loader';
import { IAdapter } from '../../adapters/adapter-interface';

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

  const targetDir = path.resolve(process.cwd(), projectName!);

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

  const spinner = ora('Creating SpecWeave project...').start();

  try {
    // 3. Initialize adapter system
    const adapterLoader = new AdapterLoader();
    let adapter: IAdapter;

    if (options.adapter) {
      // User explicitly chose an adapter
      spinner.text = `Using ${options.adapter} adapter...`;
      adapter = await adapterLoader.getRecommendedAdapter(options.adapter);
    } else {
      // Auto-detect tool
      spinner.stop();
      const detectedAdapter = await adapterLoader.detectTool();
      spinner.start(`Detected ${detectedAdapter} - using ${detectedAdapter} adapter...`);
      adapter = await adapterLoader.getRecommendedAdapter(detectedAdapter);
    }

    // 4. Check requirements
    await adapterLoader.checkRequirements(adapter.name);

    // 5. Create directory structure
    createDirectoryStructure(targetDir);
    spinner.text = 'Directory structure created...';

    // 6. Copy base templates (config, README, CLAUDE.md)
    const templatesDir = path.join(__dirname, '../../../src/templates');
    copyTemplates(templatesDir, targetDir, projectName!);
    spinner.text = 'Base templates copied...';

    // 7. Install adapter-specific files
    spinner.text = `Installing ${adapter.name} adapter...`;
    await adapter.install({
      projectPath: targetDir,
      projectName: projectName!,
      techStack: options.techStack ? { language: options.techStack } : undefined,
      docsApproach: 'incremental'
    });

    // 8. For Claude adapter, also copy skills, agents, commands
    if (adapter.name === 'claude') {
      const commandsDir = path.join(__dirname, '../../../src/commands');
      copyCommands(commandsDir, path.join(targetDir, '.claude/commands'));
      spinner.text = 'Slash commands installed...';

      const agentsDir = path.join(__dirname, '../../../src/agents');
      copyAgents(agentsDir, path.join(targetDir, '.claude/agents'));
      spinner.text = 'Agents installed...';

      const skillsDir = path.join(__dirname, '../../../src/skills');
      copySkills(skillsDir, path.join(targetDir, '.claude/skills'));
      spinner.text = 'Skills installed...';
    }

    // 9. Initialize git
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

    spinner.succeed('SpecWeave project created successfully!');

    // 11. Show adapter-specific next steps
    await adapter.postInstall({
      projectPath: targetDir,
      projectName: projectName!,
      techStack: options.techStack ? { language: options.techStack } : undefined,
      docsApproach: 'incremental'
    });

    showNextSteps(projectName!, adapter.name);
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

function copyTemplates(templatesDir: string, targetDir: string, projectName: string): void {
  // Copy config.yaml
  const configTemplate = path.join(templatesDir, 'config.yaml');
  if (fs.existsSync(configTemplate)) {
    let config = fs.readFileSync(configTemplate, 'utf-8');
    config = config.replace('{{PROJECT_NAME}}', projectName);
    fs.writeFileSync(path.join(targetDir, '.specweave/config.yaml'), config);
  }

  // Copy README.md
  const readmeTemplate = path.join(templatesDir, 'README.md.template');
  if (fs.existsSync(readmeTemplate)) {
    let readme = fs.readFileSync(readmeTemplate, 'utf-8');
    readme = readme.replace(/{{PROJECT_NAME}}/g, projectName);
    fs.writeFileSync(path.join(targetDir, 'README.md'), readme);
  }

  // Copy CLAUDE.md
  const claudeTemplate = path.join(templatesDir, 'CLAUDE.md.template');
  if (fs.existsSync(claudeTemplate)) {
    fs.copyFileSync(claudeTemplate, path.join(targetDir, 'CLAUDE.md'));
  }

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

function showNextSteps(projectName: string, adapterName: string): void {
  console.log('');
  console.log(chalk.cyan.bold('🎯 Next steps:'));
  console.log('');
  console.log(`   1. ${chalk.white(`cd ${projectName}`)}`);
  console.log('');

  // Adapter-specific instructions
  if (adapterName === 'claude') {
    console.log(`   2. ${chalk.white('Open Claude Code and describe your project:')}`);
    console.log(`      ${chalk.gray('"Build a real estate listing platform"')}`);
    console.log('');
    console.log(`   3. ${chalk.white('SpecWeave will:')}`);
    console.log('      • Auto-activate skills and agents');
    console.log('      • Create specifications');
    console.log('      • Build implementation');
  } else if (adapterName === 'cursor') {
    console.log(`   2. ${chalk.white('Open project in Cursor')}`);
    console.log('');
    console.log(`   3. ${chalk.white('Say: "Create increment for [your feature]"')}`);
    console.log(`      Cursor will read .cursorrules and guide you`);
    console.log('');
    console.log(`   4. ${chalk.white('Use @ shortcuts:')}`);
    console.log(`      @increments, @docs, @strategy, @tests`);
  } else if (adapterName === 'copilot') {
    console.log(`   2. ${chalk.white('Open project in VS Code with Copilot')}`);
    console.log('');
    console.log(`   3. ${chalk.white('Copilot will read workspace instructions automatically')}`);
    console.log(`      Start creating increment folders and files`);
    console.log('');
    console.log(`   4. ${chalk.white('Use Copilot Chat for guidance:')}`);
    console.log(`      "How do I create a spec.md?"`);
  } else if (adapterName === 'generic') {
    console.log(`   2. ${chalk.white('Read SPECWEAVE-MANUAL.md')}`);
    console.log('');
    console.log(`   3. ${chalk.white('Follow step-by-step instructions')}`);
    console.log(`      Works with ANY AI tool (ChatGPT, Claude web, Gemini)`);
  }

  console.log('');
  console.log(chalk.green.bold('🚀 Ready to build with SpecWeave!'));
  console.log('');
  console.log(chalk.gray('Documentation: https://spec-weave.com'));
  console.log(chalk.gray('GitHub: https://github.com/anton-abyzov/specweave'));
  console.log('');
}
