#!/usr/bin/env node

/**
 * SpecWeave CLI
 *
 * Entry point for the SpecWeave command-line interface.
 * Provides commands for initializing projects, creating increments, and managing skills.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalents for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// For importing package.json (need createRequire in ESM)
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

const program = new Command();

program
  .name('specweave')
  .description('Spec-Driven Development framework with AI-powered autonomous agents')
  .version(packageJson.version);

// Init command - Create new SpecWeave project
program
  .command('init [project-name]')
  .description('Initialize a new SpecWeave project')
  .option('-t, --template <type>', 'Project template (saas, api, fullstack)', 'saas')
  .option('-a, --adapter <tool>', 'AI tool adapter (claude, cursor, copilot, generic)', undefined)
  .option('--tech-stack <language>', 'Technology stack (nodejs, python, etc.)', undefined)
  .action(async (projectName, options) => {
    const { initCommand } = await import('../dist/cli/commands/init.js');
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
    const { installCommand } = await import('../dist/cli/commands/install.js');
    await installCommand(componentName, options);
  });

// List command - List available/installed components
program
  .command('list')
  .description('List available and installed components')
  .option('--installed', 'Show only installed components')
  .action(async (options) => {
    const { listCommand } = await import('../dist/cli/commands/list.js');
    await listCommand(options);
  });

// Adapters command - List available adapters
program
  .command('adapters')
  .description('List available AI tool adapters')
  .action(async () => {
    const { AdapterLoader } = await import('../dist/adapters/adapter-loader.js');
    const loader = new AdapterLoader();
    await loader.listAdapters();
  });

// Plugin commands - Manage plugins
program
  .command('plugin <action> [plugin-name]')
  .description('Manage plugins (list, enable, disable, info)')
  .option('--enabled', 'Show only enabled plugins (for list)')
  .option('--available', 'Show only available plugins (for list)')
  .option('--force', 'Force operation (for enable/disable)')
  .action(async (action, pluginName, options) => {
    const { pluginCommand } = await import('../dist/cli/commands/plugin.js');
    await pluginCommand(action, pluginName, options);
  });

// Help text
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ specweave init my-saas                    # Create new project (auto-detect tool)');
  console.log('  $ specweave init my-saas --adapter cursor   # Create project for Cursor');
  console.log('  $ specweave adapters                        # List available AI tool adapters');
  console.log('  $ specweave plugin list                     # List all plugins');
  console.log('  $ specweave plugin enable specweave-github  # Enable GitHub plugin');
  console.log('  $ specweave plugin disable specweave-github # Disable GitHub plugin');
  console.log('  $ specweave plugin info specweave-github    # Show plugin details');
  console.log('  $ specweave install pm --local              # Install PM agent locally');
  console.log('  $ specweave install --global                # Install all (interactive)');
  console.log('  $ specweave list                            # List all available components');
  console.log('  $ specweave list --installed                # Show installed components');
  console.log('');
  console.log('Supported AI Tools:');
  console.log('  - Claude Code (full automation) - Native skills, agents, hooks');
  console.log('  - Cursor (semi-automation) - .cursorrules, @ shortcuts');
  console.log('  - GitHub Copilot (basic) - Workspace instructions');
  console.log('  - Generic (manual) - Works with ANY AI (ChatGPT, Gemini, etc.)');
  console.log('');
  console.log('For more information, visit: https://spec-weave.com');
});

// Parse arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
