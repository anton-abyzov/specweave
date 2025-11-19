import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { getDirname } from '../../utils/esm-helpers.js';
import { getLocaleManager } from '../../core/i18n/locale-manager.js';
import { SupportedLanguage } from '../../core/i18n/types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

const __dirname = getDirname(import.meta.url);

interface ListOptions {
  installed?: boolean;
  language?: SupportedLanguage;
}

// NOTE: This CLI list command is primarily user-facing output (console.log/console.error).
// All console.* calls in this file are legitimate user-facing exceptions
// as defined in CONTRIBUTING.md (formatted lists, plugin information, status display).
// Logger infrastructure available for future internal debug logs if needed.

export async function listCommand(options: ListOptions = {}): Promise<void> {
  const locale = getLocaleManager(options.language || 'en');
  const showOnlyInstalled = options.installed || false;

  console.log(chalk.blue.bold(`\n${locale.t('cli', 'list.header')}\n`));

  if (showOnlyInstalled) {
    await listInstalledComponents(locale);
  } else {
    await listAllComponents(locale);
  }

  console.log('');
}

async function listAllComponents(locale: any): Promise<void> {
  const agentsDir = path.join(__dirname, '../../../src/agents');
  const skillsDir = path.join(__dirname, '../../../src/skills');

  // List agents
  if (fs.existsSync(agentsDir)) {
    const agents = fs.readdirSync(agentsDir).filter(f => fs.statSync(path.join(agentsDir, f)).isDirectory());

    console.log(chalk.cyan.bold(locale.t('cli', 'list.agentsHeader')));
    console.log(chalk.gray(`   ${locale.t('cli', 'list.availableFormat', { count: agents.length, type: locale.t('cli', 'list.agents') })}\n`));

    agents.forEach(agent => {
      const agentMd = path.join(agentsDir, agent, 'AGENT.md');
      let description = locale.t('cli', 'list.noDescription');

      if (fs.existsSync(agentMd)) {
        const content = fs.readFileSync(agentMd, 'utf-8');
        const match = content.match(/description:\s*["']?(.+?)["']?\n/);
        if (match) {
          description = match[1].substring(0, 80);
        }
      }

      console.log(`   ${chalk.green('•')} ${chalk.white(agent)}`);
      console.log(`     ${chalk.gray(description)}`);
    });
  } else {
    console.log(chalk.yellow(locale.t('cli', 'list.noAgents')));
  }

  console.log('');

  // List skills
  if (fs.existsSync(skillsDir)) {
    const skills = fs.readdirSync(skillsDir).filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());

    console.log(chalk.cyan.bold(locale.t('cli', 'list.skillsHeader')));
    console.log(chalk.gray(`   ${locale.t('cli', 'list.availableFormat', { count: skills.length, type: locale.t('cli', 'list.skills') })}\n`));

    skills.forEach(skill => {
      const skillMd = path.join(skillsDir, skill, 'SKILL.md');
      let description = locale.t('cli', 'list.noDescription');

      if (fs.existsSync(skillMd)) {
        const content = fs.readFileSync(skillMd, 'utf-8');
        const match = content.match(/description:\s*["']?(.+?)["']?\n/);
        if (match) {
          description = match[1].substring(0, 80);
        }
      }

      console.log(`   ${chalk.green('•')} ${chalk.white(skill)}`);
      console.log(`     ${chalk.gray(description)}`);
    });
  } else {
    console.log(chalk.yellow(locale.t('cli', 'list.noSkills')));
  }

  console.log('');
  console.log(chalk.gray(locale.t('cli', 'list.hintInstalled')));
  console.log(chalk.gray(locale.t('cli', 'list.hintInstall')));
}

async function listInstalledComponents(locale: any): Promise<void> {
  const localBase = '.claude';
  const globalBase = path.join(require('os').homedir(), '.claude');

  let foundAny = false;

  // Check local installation
  if (fs.existsSync(localBase)) {
    foundAny = true;
    console.log(chalk.cyan.bold(`${locale.t('cli', 'list.localInstallation')}\n`));
    await listComponentsInDir(localBase, locale);
    console.log('');
  }

  // Check global installation
  if (fs.existsSync(globalBase)) {
    foundAny = true;
    console.log(chalk.cyan.bold(`${locale.t('cli', 'list.globalInstallation')}\n`));
    await listComponentsInDir(globalBase, locale);
    console.log('');
  }

  if (!foundAny) {
    console.log(chalk.yellow(locale.t('cli', 'list.noComponentsInstalled')));
    console.log(chalk.gray(`\n${locale.t('cli', 'list.installPrompt')}`));
  }
}

async function listComponentsInDir(baseDir: string, locale: any): Promise<void> {
  const agentsDir = path.join(baseDir, 'agents');
  const skillsDir = path.join(baseDir, 'skills');

  // List installed agents
  if (fs.existsSync(agentsDir)) {
    const agents = fs.readdirSync(agentsDir).filter(f => fs.statSync(path.join(agentsDir, f)).isDirectory());

    if (agents.length > 0) {
      console.log(chalk.cyan(locale.t('cli', 'list.agentsHeader')));
      agents.forEach(agent => {
        console.log(`   ${chalk.green('✓')} ${chalk.white(agent)}`);
      });
      console.log('');
    }
  }

  // List installed skills
  if (fs.existsSync(skillsDir)) {
    const skills = fs.readdirSync(skillsDir).filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());

    if (skills.length > 0) {
      console.log(chalk.cyan(locale.t('cli', 'list.skillsHeader')));
      skills.forEach(skill => {
        console.log(`   ${chalk.green('✓')} ${chalk.white(skill)}`);
      });
    }
  }
}
