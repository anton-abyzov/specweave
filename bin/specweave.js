#!/usr/bin/env node

/**
 * SpecWeave CLI
 *
 * Entry point for the SpecWeave command-line interface.
 * Provides commands for initializing projects, creating increments, and managing skills.
 */

const { Command } = require('commander');
const chalk = require('chalk');
const package = require('../package.json');

const program = new Command();

program
  .name('specweave')
  .description('Spec-Driven Development framework with AI-powered autonomous agents')
  .version(package.version);

// Init command - Create new SpecWeave project
program
  .command('init [project-name]')
  .description('Initialize a new SpecWeave project')
  .option('-t, --template <type>', 'Project template (saas, api, fullstack)', 'saas')
  .action(async (projectName, options) => {
    const { initCommand } = require('../dist/cli/commands/init');
    await initCommand(projectName, options);
  });

// Increment commands (TODO: Implement in future versions)
// program
//   .command('increment <action> [name]')
//   .description('Manage increments (create, list, status)')
//   .option('-p, --priority <level>', 'Priority level (P1, P2, P3)', 'P1')
//   .action(async (action, name, options) => {
//     const { incrementCommand } = require('../dist/cli/commands/increment');
//     await incrementCommand(action, name, options);
//   });

// Install skills (TODO: Implement in future versions)
// program
//   .command('install <skill-name>')
//   .description('Install a skill from src/skills/ to .claude/skills/')
//   .option('-g, --global', 'Install globally to ~/.claude/skills/')
//   .action(async (skillName, options) => {
//     const { installCommand } = require('../dist/cli/commands/install');
//     await installCommand(skillName, options);
//   });

// Install hooks (TODO: Implement in future versions)
// program
//   .command('install-hooks')
//   .description('Install hooks from src/hooks/ to .claude/hooks/')
//   .action(async () => {
//     const { installHooksCommand } = require('../dist/cli/commands/install-hooks');
//     await installHooksCommand();
//   });

// Help text
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ specweave init my-saas');
  console.log('  $ specweave init  # Prompts for project name');
  console.log('');
  console.log('For more information, visit: https://github.com/specweave/specweave');
});

// Parse arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
