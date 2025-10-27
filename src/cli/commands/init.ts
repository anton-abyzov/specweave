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
    const templatesDir = path.join(__dirname, '../../../templates');
    copyTemplates(templatesDir, targetDir, projectName!);
    spinner.text = 'Templates copied...';

    // 5. Copy skills
    const skillsDir = path.join(__dirname, '../../../templates/skills');
    copySkills(skillsDir, path.join(targetDir, 'src/skills'));
    spinner.text = 'Skills installed...';

    // 6. Copy hooks
    const hooksDir = path.join(__dirname, '../../../templates/hooks');
    copyHooks(hooksDir, targetDir);
    spinner.text = 'Hooks installed...';

    // 7. Copy commands
    const commandsDir = path.join(__dirname, '../../../templates/commands');
    copyCommands(commandsDir, path.join(targetDir, '.claude/commands'));
    spinner.text = 'Commands installed...';

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
    '.specweave/increments',
    '.specweave/docs/api',
    '.specweave/docs/architecture',
    '.specweave/docs/decisions',
    '.specweave/docs/guides',
    '.specweave/docs/features',
    '.specweave/tests/baseline',
    '.specweave/tests/regression',
    '.specweave/tests/features',
    '.specweave/work',
    '.specweave/cache',
    '.specweave/logs',
    'src/skills',
    'src/hooks',
    '.claude/hooks',
    '.claude/commands',
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

function copySkills(skillsDir: string, targetSkillsDir: string): void {
  if (fs.existsSync(skillsDir)) {
    fs.copySync(skillsDir, targetSkillsDir);
  }
}

function copyHooks(hooksDir: string, targetDir: string): void {
  if (fs.existsSync(hooksDir)) {
    // Copy to src/hooks/
    fs.copySync(hooksDir, path.join(targetDir, 'src/hooks'));

    // Copy to .claude/hooks/
    fs.copySync(hooksDir, path.join(targetDir, '.claude/hooks'));

    // Make hooks executable
    const hookFiles = fs.readdirSync(path.join(targetDir, '.claude/hooks'));
    hookFiles.forEach((file) => {
      if (file.endsWith('.sh')) {
        const hookPath = path.join(targetDir, '.claude/hooks', file);
        fs.chmodSync(hookPath, '755');
      }
    });
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
  console.log('   ├── .specweave/         # SpecWeave configuration and content');
  console.log('   ├── src/skills/         # AI agent skills (17+ skills installed)');
  console.log('   ├── src/hooks/          # Automation hooks');
  console.log('   ├── .claude/            # Claude Code integration');
  console.log('   ├── README.md           # Project documentation');
  console.log('   └── CLAUDE.md           # Instructions for Claude');
  console.log('');
  console.log(chalk.cyan.bold('🎯 Next steps:'));
  console.log('');
  console.log(`   1. ${chalk.white(`cd ${projectName}`)}`);
  console.log('');
  console.log(`   2. ${chalk.white('Describe what you want to build, for example:')}`);
  console.log(`      ${chalk.gray('"Create an event booking SaaS with NextJS on Hetzner"')}`);
  console.log('');
  console.log(`   3. ${chalk.white('SpecWeave will:')}`);
  console.log('      • Ask clarifying questions');
  console.log('      • Create strategic analysis (PM, Architect, DevOps, QA)');
  console.log('      • Generate comprehensive documentation');
  console.log('      • Create implementation tasks');
  console.log('      • Build autonomously');
  console.log('');
  console.log(`   4. ${chalk.white('Review strategic docs before implementation:')}`);
  console.log(`      ${chalk.gray('/review-docs')}`);
  console.log('');
  console.log(`   5. ${chalk.white('Sync to GitHub (optional):')}`);
  console.log(`      ${chalk.gray('/sync-github')}`);
  console.log('');
  console.log(chalk.green.bold('🚀 Ready to build!'));
  console.log('');
  console.log(chalk.gray('For more information: https://github.com/specweave/specweave'));
  console.log('');
}
