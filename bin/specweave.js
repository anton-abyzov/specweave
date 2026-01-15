#!/usr/bin/env node

/**
 * SpecWeave CLI
 *
 * Entry point for the SpecWeave command-line interface.
 * Provides commands for initializing projects, creating increments, and managing skills.
 */

// ============================================================================
// CRITICAL: Node.js Version Check (MUST run before ANY ESM imports)
// ============================================================================
// This check runs synchronously before any imports that use modern syntax
// (like `import ... with { type: 'json' }`) which would crash on older Node.js
// ============================================================================

const MIN_NODE_VERSION = '20.12.0';
const CURRENT_NODE_VERSION = process.versions.node;

/**
 * Compare semver versions
 * @param {string} current - Current version (e.g., "18.17.0")
 * @param {string} required - Required version (e.g., "20.12.0")
 * @returns {boolean} true if current >= required
 */
function isVersionSatisfied(current, required) {
  const currentParts = current.split('.').map(Number);
  const requiredParts = required.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const curr = currentParts[i] || 0;
    const req = requiredParts[i] || 0;
    if (curr > req) return true;
    if (curr < req) return false;
  }
  return true; // Equal versions
}

/**
 * Get platform-specific Node.js upgrade instructions
 */
function getUpgradeInstructions() {
  const platform = process.platform;
  const isNvm = process.env.NVM_DIR || process.env.NVM_BIN;
  const isFnm = process.env.FNM_DIR || process.env.FNM_MULTISHELL_PATH;
  const isVolta = process.env.VOLTA_HOME;
  const isAsdf = process.env.ASDF_DIR;

  let instructions = [];

  // Version manager detection (cross-platform)
  if (isNvm) {
    instructions.push('  Using nvm (detected):');
    instructions.push('    nvm install 22');
    instructions.push('    nvm use 22');
    instructions.push('    nvm alias default 22');
  } else if (isFnm) {
    instructions.push('  Using fnm (detected):');
    instructions.push('    fnm install 22');
    instructions.push('    fnm use 22');
    instructions.push('    fnm default 22');
  } else if (isVolta) {
    instructions.push('  Using Volta (detected):');
    instructions.push('    volta install node@22');
  } else if (isAsdf) {
    instructions.push('  Using asdf (detected):');
    instructions.push('    asdf install nodejs 22.0.0');
    instructions.push('    asdf global nodejs 22.0.0');
  } else {
    // Platform-specific fallback
    switch (platform) {
      case 'darwin':
        instructions.push('  macOS options:');
        instructions.push('    # Using Homebrew:');
        instructions.push('    brew install node@22');
        instructions.push('');
        instructions.push('    # Using nvm (recommended):');
        instructions.push('    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash');
        instructions.push('    nvm install 22 && nvm use 22');
        break;
      case 'linux':
        instructions.push('  Linux options:');
        instructions.push('    # Using nvm (recommended):');
        instructions.push('    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash');
        instructions.push('    nvm install 22 && nvm use 22');
        instructions.push('');
        instructions.push('    # Using NodeSource (Debian/Ubuntu):');
        instructions.push('    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -');
        instructions.push('    sudo apt-get install -y nodejs');
        break;
      case 'win32':
        instructions.push('  Windows options:');
        instructions.push('    # Using nvm-windows:');
        instructions.push('    nvm install 22');
        instructions.push('    nvm use 22');
        instructions.push('');
        instructions.push('    # Direct download:');
        instructions.push('    https://nodejs.org/en/download/');
        break;
      default:
        instructions.push('  Download Node.js 22+ from:');
        instructions.push('    https://nodejs.org/en/download/');
    }
  }

  return instructions.join('\n');
}

// Perform the version check
if (!isVersionSatisfied(CURRENT_NODE_VERSION, MIN_NODE_VERSION)) {
  // Use basic console methods (no chalk yet - it may fail to import)
  const RED = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const CYAN = '\x1b[36m';
  const BOLD = '\x1b[1m';
  const RESET = '\x1b[0m';
  const DIM = '\x1b[2m';
  const UNDERLINE = '\x1b[4m';

  console.error('');
  console.error(`${RED}${BOLD}╔══════════════════════════════════════════════════════════════════╗${RESET}`);
  console.error(`${RED}${BOLD}║  SpecWeave requires Node.js ${MIN_NODE_VERSION} or higher                     ║${RESET}`);
  console.error(`${RED}${BOLD}╚══════════════════════════════════════════════════════════════════╝${RESET}`);
  console.error('');
  console.error(`${YELLOW}  Your version:${RESET}  ${RED}${CURRENT_NODE_VERSION}${RESET}`);
  console.error(`${YELLOW}  Required:${RESET}      ${CYAN}≥${MIN_NODE_VERSION}${RESET} (Node.js 22 LTS recommended)`);
  console.error('');
  console.error(`${DIM}  Why? SpecWeave uses modern JavaScript features (ES2022+) including${RESET}`);
  console.error(`${DIM}  import assertions which require Node.js 20.12.0+${RESET}`);
  console.error('');
  console.error(`${BOLD}Quick upgrade:${RESET}`);
  console.error(getUpgradeInstructions());
  console.error('');
  console.error(`${BOLD}Full guide:${RESET}`);
  console.error(`  ${CYAN}${UNDERLINE}https://spec-weave.com/docs/guides/troubleshooting/common-errors#node-version-error${RESET}`);
  console.error('');
  console.error(`${DIM}After upgrading, verify with: node --version${RESET}`);
  console.error('');
  process.exit(1);
}

// ============================================================================
// Node.js version is OK - proceed with normal imports
// ============================================================================

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

// ============================================================================
// DEVELOPMENT GUARD: Check if dist/ is built (prevents silent hangs)
// ============================================================================
// This only matters for developers running from source. NPM users always get
// a pre-built package via prepublishOnly hook.
// ============================================================================
import { existsSync } from 'fs';
import { join } from 'path';

const distCliPath = join(__dirname, '..', 'dist', 'src', 'cli', 'commands', 'init.js');
const isDevEnvironment = existsSync(join(__dirname, '..', 'tsconfig.json'));

if (isDevEnvironment && !existsSync(distCliPath)) {
  const RED = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const CYAN = '\x1b[36m';
  const BOLD = '\x1b[1m';
  const RESET = '\x1b[0m';
  const DIM = '\x1b[2m';

  console.error('');
  console.error(`${RED}${BOLD}╔══════════════════════════════════════════════════════════════════╗${RESET}`);
  console.error(`${RED}${BOLD}║  SpecWeave is not built! Run: npm run rebuild                    ║${RESET}`);
  console.error(`${RED}${BOLD}╚══════════════════════════════════════════════════════════════════╝${RESET}`);
  console.error('');
  console.error(`${YELLOW}  Missing:${RESET}  ${DIM}dist/src/cli/commands/init.js${RESET}`);
  console.error('');
  console.error(`${BOLD}Quick fix:${RESET}`);
  console.error(`  ${CYAN}npm run rebuild${RESET}`);
  console.error('');
  console.error(`${DIM}  This happens when 'npm run clean' runs without 'npm run build'.${RESET}`);
  console.error(`${DIM}  NPM users never see this - packages are pre-built before publish.${RESET}`);
  console.error('');
  process.exit(1);
}

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
  .option('-l, --language <lang>', 'Language for generated content (en, ru, es, zh, de, fr, ja, ko, pt)')
  .option('-f, --force', 'Force fresh start (non-interactive, removes existing .specweave)', false)
  .option('--force-refresh', 'Force marketplace refresh (skip cache, always pull latest)', false)
  .option('--no-living-docs', 'Skip living docs builder setup')
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

// Archive command - Archive completed increments and sync living docs
program
  .command('archive [increments...]')
  .description('Archive completed increments and sync living docs (project-specific folders)')
  .option('--keep-last <n>', 'Keep last N increments, archive the rest', '5')
  .option('--last <n>', 'STRICT: Keep exactly last N increments by number, ignoring all protections')
  .option('--older-than <days>', 'Archive increments older than N days')
  .option('--pattern <pattern>', 'Archive increments matching pattern (regex)')
  .option('--archive-completed', 'Archive all completed increments')
  .option('--no-preserve-active', 'Allow archiving active/paused increments (dangerous!)')
  .option('--external', 'Archive external living docs (FS-XXXE features imported from ADO/JIRA/GitHub)')
  .option('--dry-run', 'Preview what would be archived without moving files')
  .action(async (incrementIds, options) => {
    const { archiveCommand } = await import('../dist/src/cli/commands/archive.js');
    await archiveCommand(incrementIds, options);
  });

// Save command - Smart save with auto-sync
program
  .command('save [message]')
  .description('Smart save - auto-generate commit message, sync with remote, commit and push')
  .option('-i, --interactive', 'Interactive mode - ask before each step')
  .option('--dry-run', 'Preview without executing')
  .option('--sync <strategy>', 'Sync strategy (rebase, merge, none)', 'rebase')
  .option('--no-stash', 'Skip auto-stash')
  .option('--repos <list>', 'Only save specific repos (comma-separated)')
  .option('--skip-no-remote', 'Skip repos without remotes')
  .option('--all', 'Include all repos (even outside umbrella config)')
  .option('--no-push', 'Commit but don\'t push')
  .option('--force', 'Force push (requires confirmation)')
  .option('--branch <name>', 'Create new branch instead of force pushing')
  .action(async (message, options) => {
    const { executeSave } = await import('../dist/src/cli/commands/save.js');
    await executeSave({
      message,
      interactive: options.interactive,
      dryRun: options.dryRun,
      sync: options.sync,
      noStash: options.noStash,
      repos: options.repos,
      skipNoRemote: options.skipNoRemote,
      all: options.all,
      noPush: options.push === false, // Handle --no-push
      force: options.force,
      branch: options.branch,
      projectRoot: process.cwd()
    });
  });

// Delete feature command - Registered dynamically in startup
// (See registerDeleteFeatureCommand call below)

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

// Logs command - View hook execution logs
program
  .command('logs')
  .description('View hook execution logs')
  .option('--tail <number>', 'Number of log entries to show (default: 50)', '50')
  .option('--hook <name>', 'Filter by hook name')
  .option('--format <type>', 'Output format: json or table (default: table)', 'table')
  .option('--follow', 'Follow new log entries (not yet implemented)')
  .action(async (options) => {
    const { logsCommand } = await import('../dist/src/cli/commands/logs.js');
    await logsCommand({
      tail: parseInt(options.tail, 10),
      hook: options.hook,
      format: options.format,
      follow: options.follow
    });
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

// Auto mode commands - Autonomous execution with Ralph Wiggum pattern
program
  .command('auto [incrementIds...]')
  .description('Start autonomous execution session (Ralph Wiggum pattern + stop hooks)')
  .option('--max-iterations <n>', 'Maximum iterations (safety net)', '2500')
  .option('--max-hours <n>', 'Maximum hours to run', '600')
  .option('--simple', 'Pure Ralph mode (minimal context)')
  .option('--dry-run', 'Preview without starting')
  .option('--increments <ids>', 'Comma-separated increment IDs')
  .option('--all-backlog', 'Process all backlog items')
  .option('--skip-gates <gates>', 'Pre-approve specific gates (comma-separated)')
  .option('--no-increment', 'Skip auto-creation (require existing increments)')
  .option('--no-inc', 'Alias for --no-increment')
  .option('--prompt <text>', 'Analyze prompt and create increments (intelligent chunking)')
  .option('--yes', 'Auto-approve increment plan (skip user approval)')
  .option('-y', 'Alias for --yes')
  .option('--tdd', 'Enable TDD strict mode - ALL tests must pass')
  .option('--strict', 'Alias for --tdd')
  // Completion condition flags (v0.4.0+)
  .option('--build', 'Build must pass before completion')
  .option('--tests', 'Tests must pass before completion (unit + integration)')
  .option('--e2e', 'E2E tests must pass before completion')
  .option('--lint', 'Linting must pass before completion')
  .option('--types', 'Type-checking must pass before completion')
  .option('--cov <n>', 'Code coverage must meet threshold (%)', '80')
  .option('--e2e-cov <n>', 'E2E coverage must meet threshold (%)', '70')
  .option('--cmd <command>', 'Custom command must pass before completion')
  .action(async (incrementIds, options) => {
    // Import and execute the auto command handler directly
    const path = await import('path');
    const fs = await import('fs');
    const projectPath = process.cwd();

    // Check if SpecWeave is initialized
    const specweavePath = path.join(projectPath, '.specweave');
    if (!fs.existsSync(specweavePath)) {
      console.log(chalk.yellow('No SpecWeave project found in current directory.'));
      console.log(chalk.gray('Run `specweave init` to initialize a project.'));
      return;
    }

    try {
      const { handleAutoCommand } = await import('../dist/src/cli/commands/auto.js');
      // Call handleAutoCommand directly with all options
      await handleAutoCommand(projectPath, incrementIds, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${errorMessage}`));
      process.exit(1);
    }
  });

program
  .command('auto-status')
  .description('Check auto session status and progress')
  .option('--verbose', 'Show detailed information')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const { createAutoStatusCommand } = await import('../dist/src/cli/commands/auto-status.js');
    const statusCmd = createAutoStatusCommand();
    const args = ['node', 'auto-status'];
    if (options.verbose) args.push('--verbose');
    if (options.json) args.push('--json');
    await statusCmd.parseAsync(args, { from: 'user' });
  });

program
  .command('cancel-auto')
  .description('Cancel running auto session')
  .option('--force', 'Force cancel without confirmation')
  .action(async (options) => {
    const { createCancelAutoCommand } = await import('../dist/src/cli/commands/cancel-auto.js');
    const cancelCmd = createCancelAutoCommand();
    const args = ['node', 'cancel-auto'];
    if (options.force) args.push('--force');
    await cancelCmd.parseAsync(args, { from: 'user' });
  });

// Update instructions command - Smart merge CLAUDE.md/AGENTS.md
program
  .command('update-instructions')
  .description('Update CLAUDE.md and AGENTS.md with smart merge (preserves user content)')
  .option('--dry-run', 'Preview changes without writing')
  .option('-v, --verbose', 'Show detailed merge information')
  .action(async (options) => {
    const { updateInstructionsCommand } = await import('../dist/src/cli/commands/update-instructions.js');
    await updateInstructionsCommand(options);
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

// Jobs command - Monitor and manage background jobs (imports, cloning, sync)
program
  .command('jobs')
  .description('Monitor and manage background jobs (imports, cloning, sync)')
  .option('--all', 'Show all jobs (including completed)')
  .option('--id <jobId>', 'Show details for specific job')
  .option('--logs <jobId>', 'Show worker log output')
  .option('--follow <jobId>', 'Follow job progress in real-time')
  .option('--kill <jobId>', 'Kill running background job')
  .option('--resume <jobId>', 'Resume paused job')
  .action(async (options) => {
    const { jobsCommand } = await import('../dist/src/cli/commands/jobs.js');
    await jobsCommand(options);
  });

// Living-docs command - Launch or resume Living Docs Builder independently
program
  .command('living-docs')
  .description('Launch or resume Living Docs Builder independently')
  .option('--resume <jobId>', 'Resume orphaned/paused job')
  .option('--depth <level>', 'Analysis depth: quick, standard, deep-native, deep-api')
  .option('--priority <modules>', 'Priority modules (comma-separated)')
  .option('--sources <folders>', 'Additional doc folders (comma-separated)')
  .option('--depends-on <jobIds>', 'Wait for jobs before starting (comma-separated)')
  .option('--foreground', 'Run in current session instead of background')
  .option('--force', 'Force run even for greenfield projects')
  .option('--full-scan', 'Force full deep scan (all phases: repos, org, arch, inconsistencies, strategy)')
  .action(async (options) => {
    const { livingDocsCommand } = await import('../dist/src/cli/commands/living-docs.js');
    await livingDocsCommand(options);
  });

// Cache command - Dashboard cache management
program
  .command('cache')
  .description('Manage dashboard cache for instant status commands')
  .option('--rebuild', 'Rebuild cache from increments')
  .option('--status', 'Show cache status (default)')
  .option('--clear', 'Clear cache')
  .option('--quiet', 'Minimal output')
  .option('--debug', 'Show debug information')
  .action(async (options) => {
    const { cacheCommand } = await import('../dist/src/cli/commands/cache.js');
    await cacheCommand(options);
  });

// Commits command - Display last 2 git commits
program
  .command('commits')
  .description('Display the last 2 git commits')
  .action(async () => {
    const { commitsCommand } = await import('../dist/src/cli/commands/commits.js');
    await commitsCommand();
  });

// Sync-scheduled command - Execute due scheduled sync jobs (for cron/CI)
program
  .command('sync-scheduled')
  .description('Execute due scheduled sync jobs (for cron/CI use)')
  .option('--dry-run', 'Show what would run without executing')
  .option('--force', 'Run all sync jobs regardless of schedule')
  .option('--json', 'Output as JSON')
  .option('--silent', 'Suppress output (for cron)')
  .action(async (options) => {
    const { createSyncScheduledCommand } = await import('../dist/src/cli/commands/sync-scheduled.js');
    const syncCmd = createSyncScheduledCommand();
    await syncCmd.parseAsync(['node', 'sync-scheduled', ...process.argv.slice(3)], { from: 'user' });
  });

// Sync-progress command - Comprehensive progress sync with auto-create
program
  .command('sync-progress [increment-id]')
  .description('Comprehensive progress sync: tasks → ACs → living docs → AUTO-CREATE external issues → sync')
  .option('--dry-run', 'Preview without making changes')
  .option('--no-create', 'Skip auto-creating external issues')
  .option('--no-github', 'Skip GitHub sync')
  .option('--no-jira', 'Skip JIRA sync')
  .option('--no-ado', 'Skip Azure DevOps sync')
  .option('--force', 'Force sync even if no changes detected')
  .action(async (incrementId, options) => {
    const { syncProgress } = await import('../dist/src/cli/commands/sync-progress.js');
    const args = [];
    if (incrementId) args.push(incrementId);
    if (options.dryRun) args.push('--dry-run');
    if (!options.create) args.push('--no-create');
    if (!options.github) args.push('--no-github');
    if (!options.jira) args.push('--no-jira');
    if (!options.ado) args.push('--no-ado');
    if (options.force) args.push('--force');
    await syncProgress(args);
  });

// Docs command - Documentation preview, build, validation
const docsCmd = program
  .command('docs')
  .description('Documentation preview, build, and validation (works in any SpecWeave project)');

docsCmd
  .command('preview')
  .description('Start documentation preview server with hot reload')
  .option('-p, --port <number>', 'Port number (default: auto-find 3000-3010)')
  .option('-f, --force', 'Force reinstall Docusaurus')
  .option('--no-browser', 'Do not open browser automatically')
  .option('--no-validate', 'Skip pre-flight validation')
  .option('--no-auto-fix', 'Do not auto-fix validation issues')
  .action(async (options) => {
    const { docsPreviewCommand } = await import('../dist/src/cli/commands/docs.js');
    await docsPreviewCommand({
      port: options.port ? parseInt(options.port, 10) : undefined,
      force: options.force,
      noBrowser: !options.browser,
      validate: options.validate,
      autoFix: options.autoFix,
    });
  });

docsCmd
  .command('build')
  .description('Build static documentation site for deployment')
  .option('--no-validate', 'Skip pre-build validation')
  .option('--no-auto-fix', 'Do not auto-fix validation issues')
  .option('-o, --output <path>', 'Output directory')
  .action(async (options) => {
    const { docsBuildCommand } = await import('../dist/src/cli/commands/docs.js');
    await docsBuildCommand({
      validate: options.validate,
      autoFix: options.autoFix,
      output: options.output,
    });
  });

docsCmd
  .command('validate')
  .description('Validate documentation without starting server')
  .option('--auto-fix', 'Auto-fix common issues')
  .option('-v, --verbose', 'Show all issues (not just errors)')
  .action(async (options) => {
    const { docsValidateCommand } = await import('../dist/src/cli/commands/docs.js');
    await docsValidateCommand(options);
  });

docsCmd
  .command('kill')
  .description('Stop all running documentation servers')
  .action(async () => {
    const { docsKillCommand } = await import('../dist/src/cli/commands/docs.js');
    await docsKillCommand();
  });

docsCmd
  .command('status')
  .description('Show documentation status and help')
  .action(async () => {
    const { docsStatusCommand } = await import('../dist/src/cli/commands/docs.js');
    await docsStatusCommand();
  });

// Default action for 'specweave docs' without subcommand
docsCmd.action(async () => {
  const { docsStatusCommand } = await import('../dist/src/cli/commands/docs.js');
  await docsStatusCommand();
});

// Context command - Get project/board context for increment planning
const contextCmd = program
  .command('context')
  .description('Get project/board context for increment planning');

contextCmd
  .command('projects')
  .description('List available projects and structure level')
  .action(async () => {
    const { contextProjectsCommand } = await import('../dist/src/cli/commands/context.js');
    await contextProjectsCommand();
  });

contextCmd
  .command('boards')
  .description('List available boards for a project (2-level structures)')
  .option('-p, --project <id>', 'Project ID to filter boards')
  .action(async (options) => {
    const { contextBoardsCommand } = await import('../dist/src/cli/commands/context.js');
    await contextBoardsCommand(options);
  });

contextCmd
  .command('select')
  .description('Interactive project/board selection (auto-selects if single option)')
  .action(async () => {
    const { contextSelectCommand } = await import('../dist/src/cli/commands/context.js');
    await contextSelectCommand();
  });

// Enable multi-project command - Migrate from single-project to multi-project mode
program
  .command('enable-multiproject')
  .description('Enable multi-project mode (explicit opt-in from single-project)')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    const { enableMultiProject } = await import('../dist/src/cli/commands/enable-multiproject.js');
    await enableMultiProject({
      skipConfirmation: options.yes
    });
  });

// Switch project command - Change active project (multi-project mode)
program
  .command('switch-project [project-id]')
  .description('Switch active project (multi-project mode only)')
  .action(async (projectId) => {
    const { switchProject } = await import('../dist/src/cli/commands/switch-project.js');
    await switchProject({
      projectId
    });
  });

// Refresh marketplace command - Update marketplace and install all plugins
program
  .command('refresh-marketplace')
  .description('Refresh SpecWeave marketplace and install all plugins')
  .option('--local', 'Use local development version (ONLY for active dev)')
  .option('--github', 'Pull latest from GitHub (default, recommended)')
  .option('-f, --force', 'Force reinstall all plugins (clears cache, ensures fresh copy)')
  .option('-v, --verbose', 'Show detailed error messages')
  .action(async (options) => {
    const { refreshMarketplaceCommand } = await import('../dist/src/cli/commands/refresh-marketplace.js');
    await refreshMarketplaceCommand(options);
  });

// Cache status command - Display plugin cache health status
program
  .command('cache-status')
  .description('Display plugin cache health status and detect issues')
  .argument('[plugin]', 'Check specific plugin (optional)')
  .option('--verbose', 'Show detailed information')
  .option('--check-github', 'Check GitHub for updates (uses API)')
  .action(async (pluginName, options) => {
    const { cacheStatus } = await import('../dist/src/cli/commands/cache-status.js');
    await cacheStatus({
      pluginName,
      verbose: options.verbose,
      checkGithub: options.checkGithub,
    });
  });

// Export skills command - Export to Agent Skills open standard
program
  .command('export-skills')
  .description('Export SpecWeave skills to Agent Skills open standard format (agentskills.io)')
  .option('-o, --output <dir>', 'Output directory (default: .agent-skills)')
  .option('-p, --plugin <name>', 'Export specific plugin only')
  .option('-s, --skill <name>', 'Export specific skill only')
  .option('--dry-run', 'Preview without writing files')
  .option('--validate', 'Validate output against Agent Skills spec')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const { exportSkillsCommand } = await import('../dist/src/cli/commands/export-skills.js');
    await exportSkillsCommand({
      output: options.output,
      plugin: options.plugin,
      skill: options.skill,
      dryRun: options.dryRun,
      validate: options.validate,
      verbose: options.verbose,
    });
  });

// Set sync target command - Set external tool sync target for increment (ADR-0211)
program
  .command('set-sync-target <increment-id>')
  .description('Set external tool sync target for an increment (v1.0.31+)')
  .option('-p, --project <project-id>', 'Project ID for project-based resolution')
  .option('-v, --verbose', 'Show resolution path and details')
  .option('--dry-run', 'Show what would be set without making changes')
  .option('--validate-only', 'Only validate configuration, do not set')
  .action(async (incrementId, options) => {
    const { createSetSyncTargetCommand } = await import('../dist/src/cli/commands/set-sync-target.js');
    const cmd = createSetSyncTargetCommand();
    // Execute the action by parsing with the increment ID and options
    const args = ['node', 'set-sync-target', incrementId];
    if (options.project) args.push('-p', options.project);
    if (options.verbose) args.push('-v');
    if (options.dryRun) args.push('--dry-run');
    if (options.validateOnly) args.push('--validate-only');
    await cmd.parseAsync(args, { from: 'user' });
  });

// Migrate memory command - Migrate global memory from legacy location
program
  .command('migrate-memory')
  .description('Migrate global memory files from legacy ~/.claude/specweave/memory/ to correct location')
  .option('--dry-run', 'Preview what would be migrated without making changes')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    const { migrateMemory } = await import('../dist/src/cli/commands/migrate-memory.js');
    await migrateMemory({
      dryRun: options.dryRun,
      yes: options.yes,
    });
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
  console.log('  $ specweave jobs                            # Show active background jobs');
  console.log('  $ specweave jobs --follow <jobId>           # Follow job progress live');
  console.log('  $ specweave jobs --logs <jobId>             # View worker logs');
  console.log('  $ specweave jobs --resume <jobId>           # Resume paused job');
  console.log('  $ specweave living-docs                     # Launch Living Docs (interactive)');
  console.log('  $ specweave living-docs --depth deep-native # AI-powered analysis (FREE w/ MAX)');
  console.log('  $ specweave living-docs --full-scan         # Full deep scan (all phases)');
  console.log('  $ specweave living-docs --resume <jobId>    # Resume orphaned job');
  console.log('  $ specweave sync-scheduled                  # Execute due sync jobs');
  console.log('  $ specweave sync-scheduled --force          # Force sync all jobs');
  console.log('  $ specweave cache                           # Show cache status');
  console.log('  $ specweave cache --rebuild                 # Rebuild dashboard cache');
  console.log('  $ specweave cache --debug                   # Show cache debug info');
  console.log('  $ specweave validate-jira --env .env.prod   # Validate with custom .env file');
  console.log('  $ specweave context projects                # Get available projects as JSON');
  console.log('  $ specweave context boards --project myapp  # Get boards for a project');
  console.log('  $ specweave context select                  # Interactive project/board selection');
  console.log('  $ specweave docs                            # Show docs status and help');
  console.log('  $ specweave docs preview                    # Start docs server with hot reload');
  console.log('  $ specweave docs preview --port 3015        # Start on specific port');
  console.log('  $ specweave docs build                      # Build static site for deployment');
  console.log('  $ specweave docs validate                   # Check for docs errors');
  console.log('  $ specweave docs validate --auto-fix        # Fix common issues automatically');
  console.log('  $ specweave docs kill                       # Stop all docs servers');
  console.log('  $ specweave set-sync-target 0008            # Set sync target for increment');
  console.log('  $ specweave set-sync-target 0008 -v         # Show resolution path');
  console.log('  $ specweave set-sync-target 0008 --validate-only  # Validate only');
  console.log('  $ specweave refresh-marketplace             # Refresh marketplace (GitHub)');
  console.log('  $ specweave refresh-marketplace --force     # Force reinstall (clears cache)');
  console.log('  $ specweave refresh-marketplace --local     # Use local dev version');
  console.log('  $ specweave migrate-memory                  # Migrate legacy memory files');
  console.log('  $ specweave migrate-memory --dry-run        # Preview migration');
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

      console.log(chalk.dim('\n  Run /sw:fix-duplicates to resolve\n'));
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

  // Register delete-feature command
  try {
    const { registerDeleteFeatureCommand } = await import('../dist/src/cli/commands/delete-feature.js');
    registerDeleteFeatureCommand(program);
  } catch (error) {
    // Silently fail if command not available (may not be built yet)
    if (process.env.DEBUG) {
      console.error(chalk.dim(`[DEBUG] Failed to register delete-feature command: ${error}`));
    }
  }

  // Parse arguments
  program.parse(process.argv);

  // Show help if no command specified
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
})();
