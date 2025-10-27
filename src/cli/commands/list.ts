import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

interface ListOptions {
  installed?: boolean;
}

export async function listCommand(options: ListOptions = {}): Promise<void> {
  const showOnlyInstalled = options.installed || false;

  console.log(chalk.blue.bold('\n📋 SpecWeave Components\n'));

  if (showOnlyInstalled) {
    await listInstalledComponents();
  } else {
    await listAllComponents();
  }

  console.log('');
}

async function listAllComponents(): Promise<void> {
  const agentsDir = path.join(__dirname, '../../../src/agents');
  const skillsDir = path.join(__dirname, '../../../src/skills');

  // List agents
  if (fs.existsSync(agentsDir)) {
    const agents = fs.readdirSync(agentsDir).filter(f => fs.statSync(path.join(agentsDir, f)).isDirectory());

    console.log(chalk.cyan.bold('🤖 Agents:'));
    console.log(chalk.gray(`   Available in SpecWeave: ${agents.length} agents\n`));

    agents.forEach(agent => {
      const agentMd = path.join(agentsDir, agent, 'AGENT.md');
      let description = 'No description';

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
    console.log(chalk.yellow('⚠️  No agents found in src/agents/'));
  }

  console.log('');

  // List skills
  if (fs.existsSync(skillsDir)) {
    const skills = fs.readdirSync(skillsDir).filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());

    console.log(chalk.cyan.bold('✨ Skills:'));
    console.log(chalk.gray(`   Available in SpecWeave: ${skills.length} skills\n`));

    skills.forEach(skill => {
      const skillMd = path.join(skillsDir, skill, 'SKILL.md');
      let description = 'No description';

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
    console.log(chalk.yellow('⚠️  No skills found in src/skills/'));
  }

  console.log('');
  console.log(chalk.gray('Run `specweave list --installed` to see installed components'));
  console.log(chalk.gray('Run `specweave install <name>` to install a specific component'));
}

async function listInstalledComponents(): Promise<void> {
  const localBase = '.claude';
  const globalBase = path.join(require('os').homedir(), '.claude');

  let foundAny = false;

  // Check local installation
  if (fs.existsSync(localBase)) {
    foundAny = true;
    console.log(chalk.cyan.bold('📁 Local Installation (.claude/):\n'));
    await listComponentsInDir(localBase);
    console.log('');
  }

  // Check global installation
  if (fs.existsSync(globalBase)) {
    foundAny = true;
    console.log(chalk.cyan.bold('🌍 Global Installation (~/.claude/):\n'));
    await listComponentsInDir(globalBase);
    console.log('');
  }

  if (!foundAny) {
    console.log(chalk.yellow('⚠️  No components installed'));
    console.log(chalk.gray('\nRun `specweave install` to install components'));
  }
}

async function listComponentsInDir(baseDir: string): Promise<void> {
  const agentsDir = path.join(baseDir, 'agents');
  const skillsDir = path.join(baseDir, 'skills');

  // List installed agents
  if (fs.existsSync(agentsDir)) {
    const agents = fs.readdirSync(agentsDir).filter(f => fs.statSync(path.join(agentsDir, f)).isDirectory());

    if (agents.length > 0) {
      console.log(chalk.cyan('🤖 Agents:'));
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
      console.log(chalk.cyan('✨ Skills:'));
      skills.forEach(skill => {
        console.log(`   ${chalk.green('✓')} ${chalk.white(skill)}`);
      });
    }
  }
}
