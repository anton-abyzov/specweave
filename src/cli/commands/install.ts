import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

interface InstallOptions {
  global?: boolean;
  local?: boolean;
}

export async function installCommand(
  componentName?: string,
  options: InstallOptions = {}
): Promise<void> {
  console.log(chalk.blue.bold('\n📦 SpecWeave Component Installation\n'));

  const isGlobal = options.global || false;
  const targetBase = isGlobal ? path.join(require('os').homedir(), '.claude') : '.claude';

  // Detect component type
  const agentsDir = path.join(__dirname, '../../../src/agents');
  const skillsDir = path.join(__dirname, '../../../src/skills');

  if (!componentName) {
    // Interactive mode
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to install?',
        choices: [
          { name: 'All components (agents + skills)', value: 'all' },
          { name: 'All agents only', value: 'agents' },
          { name: 'All skills only', value: 'skills' },
          { name: 'Specific component', value: 'specific' },
        ],
      },
    ]);

    if (action === 'specific') {
      const availableAgents = fs.existsSync(agentsDir) ? fs.readdirSync(agentsDir).filter(f => fs.statSync(path.join(agentsDir, f)).isDirectory()) : [];
      const availableSkills = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory()) : [];

      const choices = [
        ...availableAgents.map(name => ({ name: `Agent: ${name}`, value: `agent:${name}` })),
        ...availableSkills.map(name => ({ name: `Skill: ${name}`, value: `skill:${name}` })),
      ];

      const { component } = await inquirer.prompt([
        {
          type: 'list',
          name: 'component',
          message: 'Select component to install:',
          choices,
        },
      ]);

      const [type, name] = component.split(':');
      await installComponent(name, type, targetBase);
    } else if (action === 'all') {
      await installAll(targetBase);
    } else if (action === 'agents') {
      await installAllAgents(targetBase);
    } else if (action === 'skills') {
      await installAllSkills(targetBase);
    }
  } else {
    // Check if it's an agent or skill
    const isAgent = fs.existsSync(path.join(agentsDir, componentName));
    const isSkill = fs.existsSync(path.join(skillsDir, componentName));

    if (!isAgent && !isSkill) {
      console.error(chalk.red(`\n❌ Component "${componentName}" not found`));
      console.log(chalk.gray('\nRun `specweave list` to see available components'));
      process.exit(1);
    }

    const type = isAgent ? 'agent' : 'skill';
    await installComponent(componentName, type, targetBase);
  }

  console.log(chalk.green.bold('\n✅ Installation complete!'));
  console.log(chalk.gray(`\nInstalled to: ${isGlobal ? '~/.claude' : '.claude'}`));
  console.log('');
}

async function installComponent(name: string, type: 'agent' | 'skill', targetBase: string): Promise<void> {
  const spinner = ora(`Installing ${type}: ${name}...`).start();

  try {
    const sourceDir = path.join(__dirname, '../../../src', type === 'agent' ? 'agents' : 'skills', name);
    const targetDir = path.join(targetBase, type === 'agent' ? 'agents' : 'skills', name);

    // Create target directory
    fs.ensureDirSync(path.dirname(targetDir));

    // Copy component
    fs.copySync(sourceDir, targetDir, { overwrite: true });

    // Verify AGENT.md or SKILL.md exists
    const markerFile = type === 'agent' ? 'AGENT.md' : 'SKILL.md';
    if (!fs.existsSync(path.join(targetDir, markerFile))) {
      throw new Error(`${markerFile} not found in ${name}`);
    }

    spinner.succeed(`Installed ${type}: ${name}`);
  } catch (error) {
    spinner.fail(`Failed to install ${type}: ${name}`);
    throw error;
  }
}

async function installAll(targetBase: string): Promise<void> {
  await installAllAgents(targetBase);
  await installAllSkills(targetBase);
}

async function installAllAgents(targetBase: string): Promise<void> {
  const agentsDir = path.join(__dirname, '../../../src/agents');
  if (!fs.existsSync(agentsDir)) {
    console.warn(chalk.yellow('⚠️  No agents found in src/agents/'));
    return;
  }

  const agents = fs.readdirSync(agentsDir).filter(f => fs.statSync(path.join(agentsDir, f)).isDirectory());

  console.log(chalk.cyan(`\n📦 Installing ${agents.length} agents...\n`));

  for (const agent of agents) {
    await installComponent(agent, 'agent', targetBase);
  }
}

async function installAllSkills(targetBase: string): Promise<void> {
  const skillsDir = path.join(__dirname, '../../../src/skills');
  if (!fs.existsSync(skillsDir)) {
    console.warn(chalk.yellow('⚠️  No skills found in src/skills/'));
    return;
  }

  const skills = fs.readdirSync(skillsDir).filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());

  console.log(chalk.cyan(`\n📦 Installing ${skills.length} skills...\n`));

  for (const skill of skills) {
    await installComponent(skill, 'skill', targetBase);
  }
}
