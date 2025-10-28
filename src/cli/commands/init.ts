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

    // NOTE: Skills and agents are NOT pre-installed
    // They will be auto-installed on-demand based on user requests

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

function showNextSteps(projectName: string): void {
  console.log('');
  console.log(chalk.green.bold('✅ Project created successfully!'));
  console.log('');
  console.log(chalk.cyan('📁 Project structure:'));
  console.log(`   ${projectName}/`);
  console.log('   ├── .specweave/         # SpecWeave configuration');
  console.log('   ├── .claude/commands/   # Slash commands for Claude Code');
  console.log('   ├── README.md           # Project documentation');
  console.log('   └── CLAUDE.md           # Instructions for Claude');
  console.log('');
  console.log(chalk.yellow.bold('📦 Smart Component Installation'));
  console.log('   Components (agents & skills) auto-install based on what you build!');
  console.log('   No manual installation needed - just describe your project.');
  console.log('');
  console.log(chalk.cyan.bold('🎯 Next steps:'));
  console.log('');
  console.log(`   1. ${chalk.white(`cd ${projectName}`)}`);
  console.log('');
  console.log(`   2. ${chalk.white('Install SpecWeave as dependency:')}`);
  console.log(`      ${chalk.gray('npm install specweave --save-dev')}`);
  console.log('');
  console.log(`   3. ${chalk.white('Open Claude Code and describe your project:')}`);
  console.log(`      ${chalk.gray('"Create Next.js authentication with OAuth"')}`);
  console.log(`      ${chalk.gray('"Build FastAPI backend with PostgreSQL"')}`);
  console.log(`      ${chalk.gray('"Create real estate SaaS with payment processing"')}`);
  console.log('');
  console.log(`   4. ${chalk.white('SpecWeave automatically:')}`);
  console.log('      • Detects tech stack from your request');
  console.log('      • Installs needed components (nextjs, security, pm, etc.)');
  console.log('      • Creates strategic analysis');
  console.log('      • Generates specifications and tasks');
  console.log('      • Builds implementation');
  console.log('');
  console.log(chalk.cyan.bold('💡 Example workflow:'));
  console.log('');
  console.log(`   User: ${chalk.gray('"Create Next.js authentication"')}`);
  console.log('');
  console.log(`   SpecWeave: ${chalk.green('🔷 SpecWeave Active')}`);
  console.log(`              ${chalk.green('📦 Installing required components...')}`);
  console.log(`              ${chalk.green('   ✅ Installed nextjs skill')}`);
  console.log(`              ${chalk.green('   ✅ Installed security agent')}`);
  console.log(`              ${chalk.green('   ✅ Installed pm agent')}`);
  console.log(`              ${chalk.green('🚀 Creating increment 0001-authentication...')}`);
  console.log('');
  console.log(chalk.green.bold('🚀 Ready to build - no configuration needed!'));
  console.log('');
  console.log(chalk.gray('Documentation: https://spec-weave.com'));
  console.log(chalk.gray('GitHub: https://github.com/anton-abyzov/specweave'));
  console.log('');
}
