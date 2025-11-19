import fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { getDirname } from '../../utils/esm-helpers.js';
import { getLocaleManager } from '../../core/i18n/locale-manager.js';
import { SupportedLanguage } from '../../core/i18n/types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

// NOTE: This CLI install command is primarily user-facing output (console.log/console.error).
// All console.* calls in this file are legitimate user-facing exceptions
// as defined in CONTRIBUTING.md (installation progress, component status, confirmations).
// Logger infrastructure available for future internal debug logs if needed.

const __dirname = getDirname(import.meta.url);

interface InstallOptions {
  global?: boolean;
  local?: boolean;
  language?: SupportedLanguage;
}

export async function installCommand(
  componentName?: string,
  options: InstallOptions = {}
): Promise<void> {
  const locale = getLocaleManager(options.language || 'en');

  console.log(chalk.blue.bold(`\n${locale.t('cli', 'install.header')}\n`));

  const isGlobal = options.global || false;
  const targetBase = isGlobal ? path.join(os.homedir(), '.claude') : '.claude';

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
      await installComponent(name, type, targetBase, locale);
    } else if (action === 'all') {
      await installAll(targetBase, locale);
    } else if (action === 'agents') {
      await installAllAgents(targetBase, locale);
    } else if (action === 'skills') {
      await installAllSkills(targetBase, locale);
    }
  } else {
    // Check if it's an agent or skill
    const isAgent = fs.existsSync(path.join(agentsDir, componentName));
    const isSkill = fs.existsSync(path.join(skillsDir, componentName));

    if (!isAgent && !isSkill) {
      console.error(chalk.red(`\n${locale.t('cli', 'install.notFound', { name: componentName })}`));
      console.log(chalk.gray(`\n${locale.t('cli', 'install.listHint')}`));
      process.exit(1);
    }

    const type = isAgent ? 'agent' : 'skill';
    await installComponent(componentName, type, targetBase, locale);
  }

  console.log(chalk.green.bold(`\n${locale.t('cli', 'install.complete')}`));
  console.log(chalk.gray(`\n${locale.t('cli', 'install.installedTo', { location: isGlobal ? '~/.claude' : '.claude' })}`));
  console.log('');
}

async function installComponent(name: string, type: 'agent' | 'skill', targetBase: string, locale: any): Promise<void> {
  const typeStr = locale.t('cli', `install.${type}`);
  const spinner = ora(locale.t('cli', 'install.installingFormat', { type: typeStr, name })).start();

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

    spinner.succeed(locale.t('cli', 'install.installedFormat', { type: typeStr, name }));
  } catch (error) {
    spinner.fail(locale.t('cli', 'install.failedFormat', { type: typeStr, name }));
    throw error;
  }
}

async function installAll(targetBase: string, locale: any): Promise<void> {
  await installAllAgents(targetBase, locale);
  await installAllSkills(targetBase, locale);
}

async function installAllAgents(targetBase: string, locale: any): Promise<void> {
  const agentsDir = path.join(__dirname, '../../../src/agents');
  if (!fs.existsSync(agentsDir)) {
    console.warn(chalk.yellow(locale.t('cli', 'install.noAgentsWarning')));
    return;
  }

  const agents = fs.readdirSync(agentsDir).filter(f => fs.statSync(path.join(agentsDir, f)).isDirectory());

  console.log(chalk.cyan(`\n${locale.t('cli', 'install.installingCount', { count: agents.length, type: locale.t('cli', 'install.agents') })}\n`));

  for (const agent of agents) {
    await installComponent(agent, 'agent', targetBase, locale);
  }
}

async function installAllSkills(targetBase: string, locale: any): Promise<void> {
  const skillsDir = path.join(__dirname, '../../../src/skills');
  if (!fs.existsSync(skillsDir)) {
    console.warn(chalk.yellow(locale.t('cli', 'install.noSkillsWarning')));
    return;
  }

  const skills = fs.readdirSync(skillsDir).filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());

  console.log(chalk.cyan(`\n${locale.t('cli', 'install.installingCount', { count: skills.length, type: locale.t('cli', 'install.skills') })}\n`));

  for (const skill of skills) {
    await installComponent(skill, 'skill', targetBase, locale);
  }
}
