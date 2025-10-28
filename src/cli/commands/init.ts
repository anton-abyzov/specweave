import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';

interface InitOptions {
  template: string;
}

export async function initCommand(
  projectName?: string,
  options: InitOptions = { template: 'saas' }
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
    // 3. Create directory structure
    createDirectoryStructure(targetDir);
    spinner.text = 'Directory structure created...';

    // 4. Copy templates
    const templatesDir = path.join(__dirname, '../../../src/templates');
    copyTemplates(templatesDir, targetDir, projectName!);
    spinner.text = 'Templates copied...';

    // 5. Copy commands (slash commands)
    const commandsDir = path.join(__dirname, '../../../src/commands');
    copyCommands(commandsDir, path.join(targetDir, '.claude/commands'));
    spinner.text = 'Slash commands installed...';

    // 6. Copy ALL agents (pre-installed, ready to use)
    const agentsDir = path.join(__dirname, '../../../src/agents');
    copyAgents(agentsDir, path.join(targetDir, '.claude/agents'));
    spinner.text = 'Agents installed...';

    // 7. Copy ALL skills (pre-installed, ready to use)
    const skillsDir = path.join(__dirname, '../../../src/skills');
    copySkills(skillsDir, path.join(targetDir, '.claude/skills'));
    spinner.text = 'Skills installed...';

    // 8. Initialize git
    try {
      execSync('git init', { cwd: targetDir, stdio: 'ignore' });
      spinner.text = 'Git repository initialized...';
    } catch (error) {
      spinner.warn('Git initialization skipped (git not found)');
    }

    // 9. Create initial commit
    try {
      execSync('git add .', { cwd: targetDir, stdio: 'ignore' });
      execSync('git commit -m "Initial commit with SpecWeave"', { cwd: targetDir, stdio: 'ignore' });
      spinner.text = 'Initial commit created...';
    } catch (error) {
      // Git commit might fail if no user configured, that's ok
    }

    spinner.succeed('SpecWeave project created successfully!');

    // 10. Show next steps
    showNextSteps(projectName!);
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

function showNextSteps(projectName: string): void {
  console.log('');
  console.log(chalk.green.bold('✅ Project created successfully!'));
  console.log('');
  console.log(chalk.cyan('📁 Project structure:'));
  console.log(`   ${projectName}/`);
  console.log('   ├── .specweave/         # SpecWeave configuration');
  console.log('   ├── .claude/');
  console.log('   │   ├── commands/       # Slash commands (10 installed)');
  console.log('   │   ├── agents/         # AI agents (10 installed)');
  console.log('   │   └── skills/         # AI skills (35+ installed)');
  console.log('   ├── README.md           # Project documentation');
  console.log('   └── CLAUDE.md           # Instructions for Claude');
  console.log('');
  console.log(chalk.yellow.bold('📦 All Components Pre-Installed'));
  console.log('   ✅ 10 agents ready to use (PM, Architect, Security, QA, DevOps, etc.)');
  console.log('   ✅ 35+ skills ready to use (Node.js, Python, Next.js, etc.)');
  console.log('   ✅ 10 slash commands available');
  console.log('');
  console.log(chalk.cyan.bold('🎯 Next steps:'));
  console.log('');
  console.log(`   1. ${chalk.white(`cd ${projectName}`)}`);
  console.log('');
  console.log(`   2. ${chalk.white('Open Claude Code and describe your project:')}`);
  console.log(`      ${chalk.gray('"Build a real estate listing platform"')}`);
  console.log(`      ${chalk.gray('"Create a task management API"')}`);
  console.log(`      ${chalk.gray('"Build an e-commerce platform"')}`);
  console.log('');
  console.log(`   3. ${chalk.white('SpecWeave will:')}`);
  console.log('      • Detect your tech stack');
  console.log('      • Use appropriate agents & skills (already installed!)');
  console.log('      • Create strategic analysis');
  console.log('      • Generate specifications and tasks');
  console.log('      • Build implementation');
  console.log('');
  console.log(chalk.cyan.bold('💡 Example workflow:'));
  console.log('');
  console.log(`   User: ${chalk.gray('"Build a real estate platform with Node.js"')}`);
  console.log('');
  console.log(`   SpecWeave: ${chalk.green('🔷 SpecWeave Active')}`);
  console.log(`              ${chalk.green('📋 Using nodejs-backend skill')}`);
  console.log(`              ${chalk.green('🤖 PM agent creating requirements...')}`);
  console.log(`              ${chalk.green('🏗️  Architect agent designing system...')}`);
  console.log(`              ${chalk.green('🚀 Creating increment 0001-real-estate-platform...')}`);
  console.log('');
  console.log(chalk.green.bold('🚀 Ready to build - all components pre-installed!'));
  console.log('');
  console.log(chalk.gray('Documentation: https://spec-weave.com'));
  console.log(chalk.gray('GitHub: https://github.com/anton-abyzov/specweave'));
  console.log('');
}
