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
  .option('-l, --language <lang>', 'Language for generated content (en, ru, es, zh, de, fr, ja, ko, pt)', 'en')
  .option('-f, --force', 'Force fresh start (non-interactive, removes existing .specweave)', false)
  .option('--force-refresh', 'Force marketplace refresh (skip cache, always pull latest)', false)
  .action(async (projectName, options) => {
    const { initCommand } = await import('../dist/src/cli/commands/init.js');
    await initCommand(projectName, options);
  });

// Increment commands (TODO: Implement in future versions)
// program
//   .command('increment <action> [name]')
//   .description('Manage increments (create, list, status)')
//   .option('-p, --priority <level>', 'Priority level (P1, P2, P3)', 'P1')
//   .action(async (action, name, options) => {
//     const { incrementCommand } = require('../dist/src/cli/commands/increment');
//     await incrementCommand(action, name, options);
//   });

// Install command - Install agents/skills
program
  .command('install [component-name]')
  .description('Install agents/skills to .claude/ or ~/.claude/')
  .option('-g, --global', 'Install globally to ~/.claude/')
  .option('-l, --local', 'Install locally to .claude/ (default)')
  .action(async (componentName, options) => {
    const { installCommand } = await import('../dist/src/cli/commands/install.js');
    await installCommand(componentName, options);
  });

// List command - List available/installed components
program
  .command('list')
  .description('List available and installed components')
  .option('--installed', 'Show only installed components')
  .action(async (options) => {
    const { listCommand } = await import('../dist/src/cli/commands/list.js');
    await listCommand(options);
  });

// Increment status commands
program
  .command('pause <increment-id>')
  .description('Pause an active increment')
  .option('-r, --reason <text>', 'Reason for pausing')
  .option('-f, --force', 'Force pause (update reason if already paused)')
  .action(async (incrementId, options) => {
    const { pauseCommand } = await import('../dist/src/cli/commands/pause.js');
    await pauseCommand(incrementId, options);
  });

program
  .command('resume <increment-id>')
  .description('Resume a paused or abandoned increment')
  .option('-f, --force', 'Force resume (bypass WIP limit checks)')
  .action(async (incrementId, options) => {
    const { resumeCommand } = await import('../dist/src/cli/commands/resume.js');
    await resumeCommand(incrementId, options);
  });

program
  .command('abandon <increment-id>')
  .description('Abandon an increment')
  .option('-r, --reason <text>', 'Reason for abandoning')
  .option('-f, --force', 'Force abandon (skip confirmation)')
  .action(async (incrementId, options) => {
    const { abandonCommand } = await import('../dist/src/cli/commands/abandon.js');
    await abandonCommand(incrementId, options);
  });

program
  .command('status')
  .alias('progress')
  .description('Show increment status overview (alias: progress)')
  .option('-v, --verbose', 'Show detailed information')
  .option('-t, --type <type>', 'Filter by increment type (feature, hotfix, bug, etc.)')
  .action(async (options) => {
    const { statusCommand } = await import('../dist/src/cli/commands/status.js');
    // Auto-enable verbose when called as 'progress'
    if (process.argv.includes('progress') && !options.verbose) {
      options.verbose = true;
    }
    await statusCommand(options);
  });

// Status line command - Display current increment progress
program
  .command('status-line')
  .description('Display current increment status line')
  .option('--json', 'Output JSON format')
  .option('--clear', 'Clear status line cache')
  .option('--config <path>', 'Path to config file')
  .action(async (options) => {
    const { registerStatusLineCommand } = await import('../dist/src/cli/commands/status-line.js');
    const tempProgram = new Command();
    registerStatusLineCommand(tempProgram);
    // Execute action manually since we need the temp program
    const manager = await import('../dist/src/core/status-line/status-line-manager.js').then(m => m.StatusLineManager);
    const StatusLineManager = manager;
    const path = await import('path');
    const fs = await import('fs');

    const rootDir = process.cwd();
    let config = {};

    if (options.config) {
      const configPath = path.resolve(options.config);
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const fullConfig = JSON.parse(configContent);
        config = fullConfig.statusLine || {};
      }
    } else {
      const defaultConfigPath = path.join(rootDir, '.specweave/config.json');
      if (fs.existsSync(defaultConfigPath)) {
        const configContent = fs.readFileSync(defaultConfigPath, 'utf8');
        const fullConfig = JSON.parse(configContent);
        config = fullConfig.statusLine || {};
      }
    }

    const statusManager = new StatusLineManager(rootDir, config);

    if (options.clear) {
      statusManager.clearCache();
      console.log('✅ Status line cache cleared');
      return;
    }

    if (options.json) {
      const cache = statusManager.getCacheData();
      if (!cache) {
        console.log(JSON.stringify({ error: 'No active increment' }, null, 2));
        process.exit(1);
      }
      console.log(JSON.stringify(cache, null, 2));
      return;
    }

    const statusLine = statusManager.render();
    if (!statusLine) {
      console.log('No active increment');
      process.exit(1);
    }

    console.log(statusLine);
  });

// Check discipline command - Validate increment discipline
program
  .command('check-discipline')
  .description('Validate increment discipline compliance (WIP limits, hard cap)')
  .option('-v, --verbose', 'Show detailed increment information')
  .option('--json', 'Output results as JSON')
  .option('--project-root <path>', 'Project root directory')
  .action(async (options) => {
    // Set default project-root at runtime, not module load time
    if (!options.projectRoot) {
      options.projectRoot = process.cwd();
    }
    const { checkDisciplineCommand } = await import('../dist/src/cli/commands/check-discipline.js');
    await checkDisciplineCommand(options);
  });

// Revert WIP limit command - Restore original WIP limit after temporary adjustment
program
  .command('revert-wip-limit')
  .description('Revert WIP limit to original value after temporary adjustment')
  .action(async () => {
    const { revertWipLimitCommand } = await import('../dist/src/cli/commands/revert-wip-limit.js');
    await revertWipLimitCommand();
  });

// QA command - Quality assessment
program
  .command('qa <increment-id>')
  .description('Run quality assessment on an increment')
  .option('--quick', 'Quick mode (default)')
  .option('--pre', 'Pre-implementation check')
  .option('--gate', 'Quality gate check (comprehensive)')
  .option('--full', 'Full multi-agent mode (Phase 3)')
  .option('--ci', 'CI mode (exit 1 on FAIL)')
  .option('--no-ai', 'Skip AI assessment (rule-based only)')
  .option('--silent', 'Minimal output')
  .option('--export', 'Export blockers/concerns to tasks.md')
  .option('-f, --force', 'Force run even if rule-based fails')
  .option('-v, --verbose', 'Show recommendations')
  .action(async (incrementId, options) => {
    const { qaCommand } = await import('../dist/src/cli/commands/qa.js');
    await qaCommand(incrementId, options);
  });

// Validate plugins command - Plugin validation
program
  .command('validate-plugins')
  .description('Validate SpecWeave plugin installation')
  .option('--auto-install', 'Auto-install missing components', false)
  .option('--context <description>', 'Increment description for context detection')
  .option('--dry-run', 'Show what would be installed without installing', false)
  .option('-v, --verbose', 'Show detailed validation steps', false)
  .action(async (options) => {
    const { setupValidatePluginsCommand } = await import('../dist/src/cli/commands/validate-plugins.js');
    // Create a temporary program for this command
    const tempProgram = new Command();
    setupValidatePluginsCommand(tempProgram);
    // Execute the action directly
    await import('../dist/src/cli/commands/validate-plugins.js').then(m => m.runValidation(options));
  });

// Validate Jira command - Jira resource validation
program
  .command('validate-jira')
  .description('Validate Jira configuration and create missing resources')
  .option('--env <path>', 'Path to .env file', '.env')
  .action(async (options) => {
    const { runJiraValidation } = await import('../dist/src/cli/commands/validate-jira.js');
    await runJiraValidation(options);
  });

// Help text
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ specweave init my-saas                    # Create new project (auto-detect tool)');
  console.log('  $ specweave init my-saas --adapter cursor   # Create project for Cursor');
  console.log('  $ specweave init my-saas --language ru      # Create project with Russian language');
  console.log('  $ specweave install pm --local              # Install PM agent locally');
  console.log('  $ specweave install --global                # Install all (interactive)');
  console.log('  $ specweave list                            # List all available components');
  console.log('  $ specweave list --installed                # Show installed components');
  console.log('  $ specweave status                          # Show all increments status');
  console.log('  $ specweave status --verbose                # Show detailed increment info');
  console.log('  $ specweave status-line                     # Display current increment progress');
  console.log('  $ specweave status-line --json              # Output progress as JSON');
  console.log('  $ specweave pause 0007 --reason "blocked"   # Pause increment 0007');
  console.log('  $ specweave resume 0007                     # Resume increment 0007');
  console.log('  $ specweave abandon 0007 --reason "obsolete" # Abandon increment 0007');
  console.log('  $ specweave qa 0008                         # Quick quality check');
  console.log('  $ specweave qa 0008 --pre                   # Pre-implementation check');
  console.log('  $ specweave qa 0008 --gate --export         # Quality gate + export to tasks');
  console.log('  $ specweave validate-plugins                # Validate plugin installation');
  console.log('  $ specweave validate-plugins --auto-install # Auto-install missing plugins');
  console.log('  $ specweave validate-plugins --dry-run      # Preview what would be installed');
  console.log('  $ specweave validate-jira                   # Validate Jira configuration');
  console.log('  $ specweave validate-jira --env .env.prod   # Validate with custom .env file');
  console.log('');
  console.log('Supported AI Tools:');
  console.log('  - Claude Code (full automation) - Native skills, agents, hooks');
  console.log('  - Cursor (semi-automation) - .cursorrules, @ shortcuts');
  console.log('  - GitHub Copilot (basic) - Workspace instructions');
  console.log('  - Generic (manual) - Works with ANY AI (ChatGPT, Gemini, etc.)');
  console.log('');
  console.log('For more information, visit: https://spec-weave.com');
});

// Startup duplicate check (runs before any command)
async function checkForDuplicates() {
  try {
    // Skip check for init command (no .specweave yet)
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0] === 'init' || args[0] === '--help' || args[0] === '-h' || args[0] === '--version' || args[0] === '-V') {
      return;
    }

    // Check if .specweave exists
    const { default: fs } = await import('fs-extra');
    const { default: path } = await import('path');
    const specweavePath = path.join(process.cwd(), '.specweave');

    if (!fs.existsSync(specweavePath)) {
      return; // No .specweave directory, skip check
    }

    // Detect duplicates
    const { detectAllDuplicates } = await import('../dist/src/core/increment/duplicate-detector.js');
    const report = await detectAllDuplicates(process.cwd());

    if (report.duplicateCount > 0) {
      console.log(chalk.yellow('\n⚠️  Duplicate increment(s) detected:\n'));

      for (const duplicate of report.duplicates) {
        console.log(chalk.dim(`  ${duplicate.incrementNumber}:`));
        for (const location of duplicate.locations) {
          const indicator = location === duplicate.recommendedWinner ? chalk.green('→') : chalk.red('✗');
          console.log(`    ${indicator} ${location.name} [${location.status}]`);
        }
      }

      console.log(chalk.dim('\n  Run /specweave:fix-duplicates to resolve\n'));
    }
  } catch (error) {
    // Silently ignore errors (don't block CLI startup)
    if (process.env.DEBUG) {
      console.error(chalk.dim(`[DEBUG] Duplicate check failed: ${error}`));
    }
  }
}

// Run startup check, then parse arguments
(async () => {
  await checkForDuplicates();

  // Parse arguments
  program.parse(process.argv);

  // Show help if no command specified
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
})();
