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

// Install command - Install agents/skills
program
  .command('install [component-name]')
  .description('Install agents/skills to .claude/ or ~/.claude/')
  .option('-g, --global', 'Install globally to ~/.claude/')
  .option('-l, --local', 'Install locally to .claude/ (default)')
  .action(async (componentName, options) => {
    const { installCommand } = require('../dist/cli/commands/install');
    await installCommand(componentName, options);
  });

// List command - List available/installed components
program
  .command('list')
  .description('List available and installed components')
  .option('--installed', 'Show only installed components')
  .action(async (options) => {
    const { listCommand } = require('../dist/cli/commands/list');
    await listCommand(options);
  });

// Help text
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ specweave init my-saas                    # Create new project');
  console.log('  $ specweave install pm --local              # Install PM agent locally');
  console.log('  $ specweave install --global                # Install all (interactive)');
  console.log('  $ specweave list                            # List all available components');
  console.log('  $ specweave list --installed                # Show installed components');
  console.log('');
  console.log('For more information, visit: https://github.com/specweave/specweave');
});

// Parse arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
