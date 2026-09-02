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
  .option('-n, --name <name>', 'Project name (alternative to positional argument)')
  .option('-t, --template <type>', 'Project template (saas, api, fullstack)', 'saas')
  .option('-a, --adapter <tool>', 'AI tool adapter (claude, cursor, copilot, generic)', undefined)
  .option('--tech-stack <language>', 'Technology stack (nodejs, python, etc.)', undefined)
  .option('-l, --language <lang>', 'Language for generated content (en, ru, es, zh, de, fr, ja, ko, pt)')
  .option('-f, --force', 'Force fresh start (non-interactive, removes existing .specweave)', false)
  .option('--force-refresh', 'Force marketplace refresh (skip cache, always pull latest)', false)
  .option('--no-living-docs', 'Skip living docs builder setup')
  .option('--full', 'Install all plugins (skip lazy loading, longer init but all skills available immediately)')
  .option('-q, --quick', 'Quick mode: skip all prompts, use sensible defaults (local git, no external tools, minimal setup)')
  .option('--non-interactive', 'Alias for --quick (skip all prompts)')
  .action(async (projectName, options) => {
    const { initCommand } = await import('../dist/src/cli/commands/init.js');
    // Support --name as alternative to positional argument
    const resolvedName = projectName || options.name;
    // Support --non-interactive as alias for --quick
    if (options.nonInteractive) {
      options.quick = true;
    }
    await initCommand(resolvedName, options);
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

// Uninstall command - Remove SpecWeave from a project
program
  .command('uninstall')
  .description('Remove SpecWeave from the current project')
  .option('--global', 'Also clean global agent directories and plugin cache')
  .option('--keep-data', 'Archive .specweave/ instead of deleting')
  .option('--dry-run', 'Show what would be removed without deleting')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (options) => {
    const { uninstallCommand } = await import('../dist/src/cli/commands/uninstall.js');
    await uninstallCommand(process.cwd(), options);
  });

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

// Scan skill command - Security scan a skill file
program
  .command('scan-skill <file>')
  .description('Scan a skill file for security issues (Tier 1 pattern scanning)')
  .option('--json', 'Output results as JSON', false)
  .action(async (file, options) => {
    const { scanSkillCommand } = await import('../dist/src/cli/commands/scan-skill.js');
    await scanSkillCommand(file, options);
  });

// Scan plugins command - Batch security scan of all plugins/*/skills/*/SKILL.md files
program
  .command('scan-plugins')
  .description('Batch-scan all plugin SKILL.md files for security issues (Gen Agent Trust Hub categories)')
  .option('--json', 'Output results as JSON for CI integration', false)
  .option('--verbose', 'Show per-skill reports in addition to batch summary', false)
  .option('--dir <path>', 'Path to plugins directory (default: ./plugins)')
  .action(async (options) => {
    const { scanPluginsCommand } = await import('../dist/src/cli/commands/scan-plugins.js');
    await scanPluginsCommand(options);
  });

// Judge skill command - Combined Tier 1 + Tier 2 LLM security analysis
program
  .command('judge-skill <file>')
  .description('Judge a skill file for security threats (Tier 1 patterns + Tier 2 LLM)')
  .option('--json', 'Output results as JSON', false)
  .option('--model <model>', 'LLM model to use (e.g., sonnet, opus)')
  .option('--scan-only', 'Run Tier 1 only, skip LLM analysis', false)
  .action(async (file, options) => {
    const { judgeSkillCommand } = await import('../dist/src/cli/commands/judge-skill.js');
    await judgeSkillCommand(file, options);
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
  .action(async (incrementId) => {
    const { resumeCommand } = await import('../dist/src/cli/commands/resume.js');
    await resumeCommand(incrementId);
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

// Complete command - Mark increment(s) as complete (triggers external sync)
program
  .command('complete <increment-id> [more-ids...]')
  .alias('done')
  .description('Complete one or more increments (triggers GitHub/JIRA/ADO sync)')
  .option('-s, --silent', 'Silent mode (for auto mode stop hook)')
  .option('-y, --yes', 'Assume yes (silent confirmation)')
  .option('--skip-validation', 'Skip quality gate validation (DANGEROUS)')
  .option('-r, --reason <text>', 'Close without a passing reports/verify.json (stored as metadata.closeReason)')
  .action(async (incrementId, moreIds, options) => {
    const { completeCommand } = await import('../dist/src/cli/commands/complete.js');
    await completeCommand(incrementId, moreIds, options);
  });

// Task command - multi-vendor task ledger (claim / done / release / block / skip)
program
  .command('task <action> [taskOrIncrement] [increment]')
  .description('Task ledger: list | next | claim | done | release | block | skip | render | whoami')
  .option('-f, --force', 'Override a live claim, unmet deps or a Files overlap')
  .option('-e, --evidence <text>', 'Evidence for `done` (commit sha, test output)')
  .option('--run <cmd>', 'Run <cmd> through the OS shell; exit 0 required, output stored as evidence')
  .option('-n, --note <text>', 'Note (required for block / skip)')
  .option('--all-mine', 'With `release`: release every task claimed by this agent')
  .option('--json', 'Machine-readable output')
  .action(async (action, taskOrIncrement, increment, options) => {
    const { taskCommand } = await import('../dist/src/cli/commands/task.js');
    process.exitCode = await taskCommand(action, taskOrIncrement, increment, options);
  });

// Verify command - run the project's verification commands, write reports/verify.{md,json}
program
  .command('verify [incrementId]')
  .description("Run the project's test/lint/build commands and write reports/verify.{md,json}")
  .option('--cmd <command>', 'Command to run (repeatable; overrides config/auto-detection)', (val, acc) => { (acc || []).push(val); return acc || [val]; }, [])
  .option('--json', 'Print the verify report as JSON')
  .action(async (incrementId, options) => {
    const { verifyCommand } = await import('../dist/src/cli/commands/verify.js');
    process.exitCode = await verifyCommand(incrementId, options);
  });

// Create Increment command - Create template files for a new increment
program
  .command('create-increment [title]')
  .description('Create increment template files (metadata.json, spec.md, tasks.md). Short form: specweave create-increment "Add login form"')
  .option('--id <increment-id>', 'Increment ID (e.g., "0042-my-feature")')
  .option('--auto-id', 'Auto-generate next available increment ID (default when --id is absent)')
  .option('--name <name>', 'Increment name suffix (defaults to a slug of the title)')
  .option('--title <title>', 'Feature title (defaults to the positional argument)')
  .option('--description <description>', 'Feature description (defaults to the title)')
  .option('--project <project-id>', 'Project ID (defaults to config project.name, else the folder name)')
  .option('--board <board-id>', 'Board ID for 2-level structures')
  .option('--type <type>', 'Increment type (feature, hotfix, bug, refactor, experiment)', 'feature')
  .option('--priority <priority>', 'Priority (P1, P2, P3)', 'P1')
  .option('--project-root <path>', 'Override project root directory')
  .option('--parallel', 'Opt into 3-agent fan-out planning (default: single-agent)')
  .option('--json', 'Output result as JSON (for programmatic use)')
  .action(async (title, options) => {
    if (title && !options.title) options.title = title;
    if (options.projectRoot) {
      const configPath = (await import('path')).join(options.projectRoot, '.specweave', 'config.json');
      const fs = await import('fs');
      if (!fs.existsSync(configPath)) {
        console.error(`Error: ${options.projectRoot} is not a valid SpecWeave project (missing .specweave/config.json)`);
        process.exit(1);
      }
      options.projectRoot = options.projectRoot;
    }
    const { createIncrementCommand } = await import('../dist/src/cli/commands/create-increment.js');
    await createIncrementCommand(options);
  });

// Handoff command - Assemble a portable cross-tool work-handoff doc + diff
program
  .command('handoff [incrementId]')
  .description('Write a portable, secret-scrubbed work-handoff doc + diff so you can resume in another AI tool')
  .option('--reason <reason>', 'Why you are handing off (e.g. "out of tokens")')
  .option('--summary <summary>', 'Short summary of where things stand')
  .option('--next <next>', 'The exact next step for the resuming agent')
  .option('--gotcha <gotcha>', 'A gotcha / warning for the next agent')
  .option('--decision <decision>', 'A key decision (repeatable)', (val, acc) => { (acc || []).push(val); return acc || [val]; }, [])
  .option('--inline', 'Embed the full scrubbed doc body in the paste-prompt (cross-machine resume)')
  .option('--clipboard', 'Alias for --inline')
  .option('--non-specweave', 'Force the .handoff/ fallback even inside a SpecWeave workspace')
  .option('--out <path>', 'Override the doc output path')
  .option('--json', 'Output the full result as JSON (for programmatic use)')
  .action(async (incrementId, options) => {
    const { handoffCommand } = await import('../dist/src/cli/commands/handoff.js');
    await handoffCommand({
      incrementId,
      reason: options.reason,
      summary: options.summary,
      next: options.next,
      gotcha: options.gotcha,
      decision: options.decision,
      inline: options.inline || options.clipboard,
      nonSpecweave: options.nonSpecweave,
      out: options.out,
      json: options.json,
    });
  });

// Next ID command - Return the next available increment number
program
  .command('next-id')
  .description('Return the next available increment number. Prefer: create-increment --auto-id')
  .option('--project <project-id>', 'Project ID for per-project collision prevention')
  .option('--project-root <path>', 'Override project root directory')
  .option('--name <name>', 'Increment name to generate full ID (e.g., "my-feature" → "0042-my-feature")')
  .action(async (options) => {
    const { IncrementNumberManager } = await import('../dist/src/core/increment/increment-utils.js');
    const { resolveEffectiveRoot } = await import('../dist/src/utils/find-project-root.js');

    let projectRoot;
    if (options.projectRoot) {
      const configPath = (await import('path')).join(options.projectRoot, '.specweave', 'config.json');
      const fs = await import('fs');
      if (!fs.existsSync(configPath)) {
        console.error(`Error: ${options.projectRoot} is not a valid SpecWeave project (missing .specweave/config.json)`);
        process.exit(1);
      }
      projectRoot = options.projectRoot;
    } else {
      projectRoot = resolveEffectiveRoot(process.cwd());
    }

    let number;
    if (options.project) {
      number = IncrementNumberManager.getNextIncrementNumberForProject(projectRoot, options.project);
    } else {
      number = IncrementNumberManager.getNextIncrementNumber(projectRoot);
    }

    if (options.name) {
      console.log(`${number}-${options.name}`);
    } else {
      console.log(number);
    }
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

// Interview command - Manage Deep Interview Mode state
const interviewCmd = program
  .command('interview <action> [increment-id] [category] [summary]')
  .description('Manage Deep Interview Mode for increment planning')
  .action(async (action, incrementId, category, summary) => {
    const { interviewCommand } = await import('../dist/src/cli/commands/interview.js');
    await interviewCommand(action, incrementId, category, summary);
  });

interviewCmd.addHelpText('after', `
Actions:
  start <increment-id>                    Start interview tracking
  mark-covered <id> <category> [summary]  Mark category as covered
  status [increment-id]                   Show interview status
  clear <increment-id>                    Clear interview state

Categories: architecture, integrations, ui-ux, performance, security, edge-cases

Examples:
  specweave interview start 0021-auth-feature
  specweave interview mark-covered 0021-auth-feature architecture "Microservices with Redis"
  specweave interview status 0021-auth-feature
`);

// Decision log command - Query structured decision logs
program
  .command('decision-log')
  .description('Query structured decision logs from hooks')
  .option('--hook <name>', 'Filter by hook name (stop-auto, stop-reflect)')
  .option('--decision <type>', 'Filter by decision type (approve, block)')
  .option('--since <window>', 'Filter by time window (1h, 24h, 7d)')
  .option('--limit <number>', 'Number of entries to show (default: 20)', '20')
  .option('--json', 'Output raw JSON format')
  .option('--tail', 'Follow log in real-time (like tail -f)')
  .action(async (options) => {
    const { decisionLogCommand, decisionLogTail } = await import('../dist/src/cli/commands/decision-log.js');
    if (options.tail) {
      await decisionLogTail({
        hook: options.hook,
        decision: options.decision
      });
    } else {
      await decisionLogCommand({
        hook: options.hook,
        decision: options.decision,
        since: options.since,
        limit: parseInt(options.limit, 10),
        json: options.json
      });
    }
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

// Auto mode commands - Autonomous execution with stop hook feedback loop (v3.0)
// No session files. No complex state. Just: "Are there active increments?"
program
  .command('auto [incrementIds...]')
  .description('Start autonomous execution (stop hook feedback loop)')
  .option('--dry-run', 'Preview without activating')
  .option('--all-backlog', 'Activate all backlog items')
  .option('--reset', 'Clean up any stale state files')
  .action(async (incrementIds, options) => {
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

// Team command - Launch Claude Code with native agent teams
program
  .command('team [description]')
  .description('Launch Claude Code with agent teams (tmux/iTerm2 split panes)')
  .option('--mode <mode>', 'Display mode: tmux (default) or in-process', 'tmux')
  .option('--no-increment', 'Launch without requiring a SpecWeave increment (free-form agent swarm)')
  .action(async (description, options) => {
    try {
      const { handleTeamCommand } = await import('../dist/src/cli/commands/team.js');
      await handleTeamCommand(description, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${errorMessage}`));
      process.exit(1);
    }
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

// Unified update command - One-stop update for everything (self-updates CLI AND plugins by default)
program
  .command('update')
  .description('Update SpecWeave: CLI, instructions, config, AND plugins (default)')
  .option('--no-self', 'Skip CLI self-update via npm')
  .option('--no-plugins', 'Skip marketplace plugins refresh')
  .option('--all', 'Install ALL plugins (not just router)')
  .option('--minimal', 'Clean /plugin output (removes marketplace, no lazy loading)')
  .option('--check', 'Dry run - show what would change without making changes')
  .option('-v, --verbose', 'Show detailed output')
  .option('-f, --force', 'Force refresh even if up to date')
  .action(async (options) => {
    const { updateCommand } = await import('../dist/src/cli/commands/update.js');
    await updateCommand(options);
  });

// Check discipline command - Validate increment discipline
program
  .command('check-discipline')
  .description('Report increment status counts, advisory WIP note and metadata consistency')
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

// GC command - purge junk from .specweave/state (dry-run by default)
program
  .command('gc')
  .description('Purge stale .specweave/state files (dry-run; --yes to delete), report .worktrees size and nested .specweave dirs')
  .option('-y, --yes', 'Actually delete (default is dry-run)')
  .option('--json', 'Output as JSON')
  .option('--project-root <path>', 'Project root directory')
  .action(async (options) => {
    const { gcCommand } = await import('../dist/src/cli/commands/gc.js');
    await gcCommand(options);
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

// Link PR - Link pull requests to external tickets (JIRA remote links, ADO hyperlinks)
program
  .command('link-pr')
  .description('Link a pull request to external tickets (JIRA, ADO)')
  .requiredOption('--increment <id>', 'Increment ID')
  .requiredOption('--pr-url <url>', 'Pull request URL')
  .requiredOption('--pr-number <num>', 'Pull request number')
  .option('--branch <name>', 'Branch name')
  .action(async (options) => {
    const { runLinkPr } = await import('../dist/src/cli/commands/link-pr.js');
    await runLinkPr(options);
  });

// Branch-name command - Compute branch name with optional external ticket key
program
  .command('branch-name <increment-id>')
  .description('Output the computed branch name for an increment (with optional JIRA/ADO ticket key)')
  .action(async (incrementId) => {
    const { branchNameCommand } = await import('../dist/src/cli/commands/branch-name.js');
    await branchNameCommand(incrementId);
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

// Analytics command - Usage analytics dashboard
program
  .command('analytics')
  .description('Show usage analytics dashboard (commands, skills, agents)')
  .option('--export <format>', 'Export data (json, csv)')
  .option('--since <time>', 'Filter by time range (24h, 7d, 30d)')
  .option('--type <type>', 'Filter by event type (command, skill, agent)')
  .option('--json', 'Output raw JSON for scripting')
  .option('--limit <n>', 'Number of top items to show', '10')
  .action(async (options) => {
    const { analyticsCommand } = await import('../dist/src/cli/commands/analytics.js');
    await analyticsCommand({
      export: options.export,
      since: options.since,
      type: options.type,
      json: options.json,
      limit: options.limit ? parseInt(options.limit, 10) : undefined,
    });
  });

// Analytics push command - Record analytics events (replaces PostToolUse analytics hook)
program
  .command('analytics-push')
  .description('Record a skill or agent analytics event (replaces PostToolUse analytics hook)')
  .requiredOption('--type <type>', 'Event type: skill or agent')
  .requiredOption('--name <name>', 'Skill or agent name')
  .option('--plugin <plugin>', 'Source plugin name')
  .option('--json', 'Output as JSON')
  .option('--silent', 'Suppress output')
  .action(async (options) => {
    const { analyticsPushCommand } = await import('../dist/src/cli/commands/analytics-push.js');
    const result = await analyticsPushCommand({
      projectRoot: process.cwd(),
      type: options.type,
      name: options.name,
      plugin: options.plugin,
      json: options.json,
      silent: options.silent,
    });
    if (!result.success) process.exit(1);
  });

// LSP command - Code intelligence operations
const lspCmd = program
  .command('lsp')
  .description('LSP code intelligence (refs, def, hover, symbols, search)');

lspCmd
  .command('refs <file> <symbol>')
  .description('Find all references to a symbol')
  .action(async (file, symbol) => {
    const { handleLspRefs } = await import('../dist/src/cli/commands/lsp.js');
    await handleLspRefs(process.cwd(), file, symbol);
  });

lspCmd
  .command('def <file> <symbol>')
  .description('Go to definition of a symbol')
  .action(async (file, symbol) => {
    const { handleLspDef } = await import('../dist/src/cli/commands/lsp.js');
    await handleLspDef(process.cwd(), file, symbol);
  });

lspCmd
  .command('hover <file> <symbol>')
  .description('Get type information for a symbol')
  .action(async (file, symbol) => {
    const { handleLspHover } = await import('../dist/src/cli/commands/lsp.js');
    await handleLspHover(process.cwd(), file, symbol);
  });

lspCmd
  .command('symbols <file>')
  .description('List all symbols in a file')
  .action(async (file) => {
    const { handleLspSymbols } = await import('../dist/src/cli/commands/lsp.js');
    await handleLspSymbols(process.cwd(), file);
  });

lspCmd
  .command('search <query>')
  .description('Search for symbols in workspace')
  .action(async (query) => {
    const { handleLspSearch } = await import('../dist/src/cli/commands/lsp.js');
    await handleLspSearch(process.cwd(), query);
  });

lspCmd
  .command('warmup [files...]')
  .description('Warm up LSP by pre-indexing workspace (run on session start)')
  .option('--quiet', 'Suppress output')
  .action(async (files, options) => {
    const { handleLspWarmup } = await import('../dist/src/cli/commands/lsp.js');
    await handleLspWarmup(process.cwd(), files, options.quiet ?? false);
  });

lspCmd
  .command('status')
  .description('Show LSP status and warm-up state')
  .action(async () => {
    const { handleLspStatus } = await import('../dist/src/cli/commands/lsp.js');
    await handleLspStatus(process.cwd());
  });

lspCmd
  .command('setup')
  .description('Scan project for languages and interactively install LSP plugins (22 languages)')
  .option('-n, --max <number>', 'Maximum number of languages to suggest', '5')
  .option('--min-files <number>', 'Minimum file count to consider a language', '5')
  .option('--dry-run', 'Show what would be installed without installing')
  .option('--scope <scope>', 'Installation scope: user, project, local', 'project')
  .action(async (options) => {
    const { handleLspSetup } = await import('../dist/src/cli/commands/lsp.js');
    await handleLspSetup(process.cwd(), {
      maxLanguages: parseInt(options.max, 10),
      minFileCount: parseInt(options.minFiles, 10),
      dryRun: options.dryRun ?? false,
      scope: options.scope,
    });
  });

// Commits command - Display last 2 git commits
program
  .command('commits')
  .description('Display the last 2 git commits')
  .action(async () => {
    const { commitsCommand } = await import('../dist/src/cli/commands/commits.js');
    await commitsCommand();
  });

// Sync command group - the ONE external tracker sync surface (GitHub / Jira / ADO)
const syncCmd = program
  .command('sync')
  .description('Sync increments with GitHub, Jira or Azure DevOps: push | pull | status | setup');

syncCmd
  .command('push [increment-id]')
  .description('Push local progress (tasks -> ACs -> living docs -> issues) to the configured tracker(s)')
  .option('--reconcile', 'Reconcile stale/duplicate GitHub milestones before pushing')
  .option('--dry-run', 'Preview without making changes')
  .option('--no-create', 'Skip auto-creating missing external issues')
  .option('--provider <name>', 'Only push to one provider (github|jira|ado)')
  .option('--force', 'Force sync even if no changes detected')
  .action(async (incrementId, opts) => {
    const { syncPush, parseProvider } = await import('../dist/src/cli/commands/sync.js');
    await syncPush({
      incrementId,
      reconcile: opts.reconcile,
      dryRun: opts.dryRun,
      create: opts.create,
      provider: parseProvider(opts.provider),
      force: opts.force,
    });
  });

syncCmd
  .command('pull')
  .description('Report external changes since --since (default 7 days); --create-increments imports issues as increments')
  .option('--create-increments', 'Create SpecWeave increments from external issues (interactive)')
  .option('--provider <name>', 'Only pull from one provider (github|jira|ado)')
  .option('--since <date|days>', 'ISO date or number of days to look back', '7')
  .action(async (opts) => {
    const { syncPull, parseProvider } = await import('../dist/src/cli/commands/sync.js');
    await syncPull({ createIncrements: opts.createIncrements, provider: parseProvider(opts.provider), since: opts.since });
  });

syncCmd
  .command('status')
  .description('Token source + account + can-push, provider health, retry queue, circuit breakers, sync gaps')
  .option('--json', 'Output as JSON')
  .option('--provider <name>', 'Only report one provider (github|jira|ado)')
  .option('--quick', 'Skip network probes')
  .action(async (opts) => {
    const { syncStatus, parseProvider } = await import('../dist/src/cli/commands/sync.js');
    const report = await syncStatus({ json: opts.json, provider: parseProvider(opts.provider), quick: opts.quick });
    process.exitCode = report.exitCode;
  });

syncCmd
  .command('setup')
  .description('Interactive wizard to connect GitHub Issues, Jira or Azure DevOps (--validate checks the existing config)')
  .option('--provider <name>', 'Provider to configure (github|jira|ado) - skips selection prompt')
  .option('--validate', 'Validate existing configuration and credentials instead of running the wizard')
  .option('--quick', 'Non-interactive mode: print hint and exit (for CI environments)')
  .action(async (opts) => {
    const { syncSetup, parseProvider } = await import('../dist/src/cli/commands/sync.js');
    process.exitCode = await syncSetup({ provider: parseProvider(opts.provider), validate: opts.validate, quick: opts.quick });
  });

// Deprecated top-level sync verbs: hidden aliases that print a one-line notice and delegate
async function deprecatedSync(oldVerb) {
  const { deprecationNotice } = await import('../dist/src/cli/commands/sync.js');
  console.error(deprecationNotice(oldVerb));
}

program
  .command('sync-progress [increment-id]', { hidden: true })
  .option('--dry-run')
  .option('--no-create')
  .option('--no-github')
  .option('--no-jira')
  .option('--no-ado')
  .option('--force')
  .action(async (incrementId, opts) => {
    await deprecatedSync('sync-progress');
    const { syncProgress } = await import('../dist/src/cli/commands/sync-progress.js');
    const args = [];
    if (incrementId) args.push(incrementId);
    if (opts.dryRun) args.push('--dry-run');
    if (!opts.create) args.push('--no-create');
    if (!opts.github) args.push('--no-github');
    if (!opts.jira) args.push('--no-jira');
    if (!opts.ado) args.push('--no-ado');
    if (opts.force) args.push('--force');
    await syncProgress(args);
  });

program
  .command('sync-living-docs [increment-id]', { hidden: true })
  .option('--dry-run')
  .option('--force')
  .action(async (incrementId, opts) => {
    await deprecatedSync('sync-living-docs');
    const { syncLivingDocs } = await import('../dist/src/cli/commands/sync-living-docs.js');
    const args = [];
    if (incrementId) args.push(incrementId);
    if (opts.dryRun) args.push('--dry-run');
    if (opts.force) args.push('--force');
    await syncLivingDocs(args);
  });

program
  .command('sync-retry', { hidden: true })
  .option('--dry-run')
  .option('--force')
  .option('--clear')
  .action(async (opts) => {
    await deprecatedSync('sync-retry');
    const { syncRetryCommand } = await import('../dist/src/cli/commands/sync-retry.js');
    const result = await syncRetryCommand(process.cwd(), opts);
    if (result.failed > 0) process.exitCode = 1;
  });

for (const oldVerb of ['sync-status', 'sync-health', 'sync-gaps']) {
  program
    .command(oldVerb, { hidden: true })
    .option('--json')
    .option('--provider <name>')
    .action(async (opts) => {
      await deprecatedSync(oldVerb);
      const { syncStatus, parseProvider } = await import('../dist/src/cli/commands/sync.js');
      const report = await syncStatus({ json: opts.json, provider: parseProvider(opts.provider) });
      process.exitCode = report.exitCode;
    });
}

program
  .command('sync-setup', { hidden: true })
  .option('--provider <name>')
  .option('--quick')
  .action(async (opts) => {
    await deprecatedSync('sync-setup');
    const { syncSetup, parseProvider } = await import('../dist/src/cli/commands/sync.js');
    process.exitCode = await syncSetup({ provider: parseProvider(opts.provider), quick: opts.quick });
  });

program
  .command('validate-jira', { hidden: true })
  .action(async () => {
    await deprecatedSync('validate-jira');
    const { syncSetup } = await import('../dist/src/cli/commands/sync.js');
    process.exitCode = await syncSetup({ provider: 'jira', validate: true });
  });

// Docs command - Documentation preview, build, validation
const docsCmd = program
  .command('docs')
  .description('Documentation preview, build, and validation (works in any SpecWeave project)');

docsCmd
  .command('preview')
  .description('Start documentation preview server with hot reload')
  .option('-p, --port <number>', 'Port number (default: 3015 internal, 3016 public)')
  .option('-s, --scope <scope>', 'Documentation scope: internal or public (default: internal)')
  .option('--project <id>', 'Target child repo docs in umbrella project')
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
      scope: options.scope || 'internal',
      project: options.project,
    });
  });

docsCmd
  .command('build')
  .description('Build static documentation site for deployment')
  .option('-s, --scope <scope>', 'Documentation scope: internal or public (default: internal)')
  .option('--project <id>', 'Target child repo docs in umbrella project')
  .option('--no-validate', 'Skip pre-build validation')
  .option('--no-auto-fix', 'Do not auto-fix validation issues')
  .option('-o, --output <path>', 'Output directory')
  .action(async (options) => {
    const { docsBuildCommand } = await import('../dist/src/cli/commands/docs.js');
    await docsBuildCommand({
      validate: options.validate,
      autoFix: options.autoFix,
      output: options.output,
      scope: options.scope || 'internal',
      project: options.project,
    });
  });

docsCmd
  .command('validate')
  .description('Validate documentation without starting server')
  .option('-s, --scope <scope>', 'Documentation scope: internal or public (default: internal)')
  .option('--project <id>', 'Target child repo docs in umbrella project')
  .option('--auto-fix', 'Auto-fix common issues')
  .option('-v, --verbose', 'Show all issues (not just errors)')
  .action(async (options) => {
    const { docsValidateCommand } = await import('../dist/src/cli/commands/docs.js');
    await docsValidateCommand({
      autoFix: options.autoFix,
      verbose: options.verbose,
      scope: options.scope || 'internal',
      project: options.project,
    });
  });

docsCmd
  .command('public')
  .description('Preview public documentation (shorthand for preview --scope public)')
  .option('-p, --port <number>', 'Port number (default: 3016)')
  .option('--project <id>', 'Target child repo docs in umbrella project')
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
      scope: 'public',
      project: options.project,
    });
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
  .option('--project <id>', 'Target child repo docs in umbrella project')
  .action(async (options) => {
    const { docsStatusCommand } = await import('../dist/src/cli/commands/docs.js');
    await docsStatusCommand({ project: options.project });
  });

// Default action for 'specweave docs' without subcommand — launches internal preview
docsCmd
  .command('sync [increment-id]')
  .description('Sync living documentation for an increment (feature spec + user story files)')
  .option('--dry-run', 'Preview without making changes')
  .option('--force', 'Force sync even if no changes detected')
  .action(async (incrementId, options) => {
    const { syncLivingDocs } = await import('../dist/src/cli/commands/sync-living-docs.js');
    const args = [];
    if (incrementId) args.push(incrementId);
    if (options.dryRun) args.push('--dry-run');
    if (options.force) args.push('--force');
    await syncLivingDocs(args);
  });


docsCmd.action(async () => {
  const { docsPreviewCommand } = await import('../dist/src/cli/commands/docs.js');
  await docsPreviewCommand({ scope: 'internal' });
});


// Refresh marketplace command - Update marketplace with lazy loading support
program
  .command('refresh-marketplace')
  .description('Refresh SpecWeave marketplace (lazy mode by default - router only)')
  .option('--all', 'Install ALL plugins (legacy mode, ~60K tokens)')
  .option('--minimal', 'Remove marketplace, install only core plugins (clean /plugin output, no lazy loading)')
  .option('-f, --force', 'Force reinstall all plugins (clears cache, ensures fresh copy)')
  .option('-v, --verbose', 'Show detailed error messages')
  .action(async (options) => {
    const { refreshMarketplaceCommand } = await import('../dist/src/cli/commands/refresh-marketplace.js');
    await refreshMarketplaceCommand(options);
  });

// Refresh plugins command - Copy first-party plugins to ~/.claude/commands/
program
  .command('refresh-plugins')
  .description('Refresh SpecWeave plugins (core only by default, use --all for everything)')
  .option('--all', 'Install ALL plugins (not just core sw)')
  .option('--plugin <name>', 'Install a specific plugin by name')
  .option('-q, --quiet', 'Suppress output (for use by hooks)')
  .option('-f, --force', 'Force reinstall (skip hash check)')
  .option('-v, --verbose', 'Show skipped plugins')
  .action(async (options) => {
    const { refreshPluginsCommand } = await import('../dist/src/cli/commands/refresh-plugins.js');
    await refreshPluginsCommand(options);
  });

// Doctor command - Comprehensive health check
program
  .command('doctor')
  .description('Run comprehensive health check on SpecWeave project')
  .option('--verbose', 'Show detailed output for each check')
  .option('--json', 'Output as JSON')
  .option('--quick', 'Skip slow checks (network, hook execution)')
  .option('--skip-external', 'Skip external tool connectivity checks')
  .option('--fix', 'Apply inline fixes (remove ghost files, stale cache, update lockfile hashes)')
  .option('--fix-status', 'Fix metadata.json <-> spec.md status desyncs (formerly sw:sync-status)')
  .action(async (options) => {
    const { doctor } = await import('../dist/src/cli/commands/doctor.js');
    const report = await doctor(process.cwd(), {
      verbose: options.verbose,
      json: options.json,
      quick: options.quick,
      skipExternal: options.skipExternal,
      fix: options.fix,
      fixStatus: options.fixStatus,
    });

    // Exit with appropriate code (failures = 1)
    if (report.summary.failures > 0) {
      process.exit(1);
    }
  });

// Health command - Quick deployment verification
program
  .command('health')
  .description('Quick deployment health check (config, plugins, sync connectivity)')
  .option('--json', 'Output as JSON for CI/CD pipelines')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    const { runHealthCheck } = await import('../dist/src/cli/commands/health.js');
    const report = await runHealthCheck(process.cwd(), {
      json: options.json,
      verbose: options.verbose,
    });

    if (report.status === 'unhealthy') {
      process.exit(1);
    }
  });

// Session command - Session lifecycle management (replaces SessionStart/Stop hooks)
const sessionCmd = program
  .command('session')
  .description('Session lifecycle management (start, end)');

sessionCmd
  .command('start')
  .description('Initialize session (replaces SessionStart hook)')
  .option('--session-id <id>', 'Session identifier for isolated state')
  .option('--json', 'Output as JSON')
  .option('--silent', 'Suppress output')
  .action(async (options) => {
    const { sessionStartCommand } = await import('../dist/src/cli/commands/session.js');
    const result = await sessionStartCommand({
      projectRoot: process.cwd(),
      sessionId: options.sessionId,
      json: options.json,
      silent: options.silent,
    });
    if (!result.success) process.exit(1);
  });

sessionCmd
  .command('end')
  .description('End session: reflect check, auto scan, sync flush (replaces Stop hooks)')
  .option('--json', 'Output as JSON')
  .option('--silent', 'Suppress output')
  .action(async (options) => {
    const { sessionEndCommand } = await import('../dist/src/cli/commands/session.js');
    const result = await sessionEndCommand({
      projectRoot: process.cwd(),
      json: options.json,
      silent: options.silent,
    });
    if (!result.success) process.exit(1);
  });

// Hook command - CLI delegation entry point for Claude Code hooks (internal)
program
  .command('hook <event-type>')
  .description('Handle Claude Code hook events (internal)')
  .action(async (eventType) => {
    try {
      const { handleHook } = await import('../dist/src/cli/commands/hook.js');
      await handleHook(eventType);
    } catch {
      // Never crash — `{}` is the schema-valid pass-through for every event
      process.stdout.write('{}');
    }
    process.exit(0);
  });

// Detect intent command - Hook helper for automatic plugin loading (internal)
program
  .command('detect-intent [prompt]')
  .description('Detect SpecWeave intent from a prompt and optionally install plugins')

  .option('--install', 'Also install detected plugins after detection')
  .option('--silent', 'Silent mode - no stdout output (for hooks)')
  .option('--file <path>', 'Read prompt from file instead of argument (avoids shell escaping issues)')
  .action(async (promptArg, options) => {
    const { detectIntentCommand } = await import('../dist/src/cli/commands/detect-intent.js');
    const fs = await import('fs');

    // Read prompt from file if specified, otherwise use argument
    let prompt = promptArg || '';
    if (options.file) {
      try {
        prompt = fs.readFileSync(options.file, 'utf8').trim();
      } catch (fileError) {
        if (!options.silent) {
          console.error(`Error reading file: ${fileError.message}`);
        }
        process.exit(1);
      }
    }

    if (!prompt) {
      if (!options.silent) {
        console.error('Error: No prompt provided. Use positional argument or --file option.');
      }
      process.exit(1);
    }

    const result = await detectIntentCommand(prompt, options);
    // Exit code: 0 if plugins detected, 1 if none
    process.exit(result.detected ? 0 : 1);
  });

// Evaluate completion command - LLM-based completion evaluation for auto mode (internal)
program
  .command('evaluate-completion <increment-id>')
  .description('Evaluate whether an auto mode session should be considered complete')

  .option('--model <model>', 'Model for LLM evaluation: haiku or sonnet (default: sonnet)')
  .option('--timeout <ms>', 'Timeout in milliseconds (default: 45000)', parseInt)
  .option('--silent', 'Minimal output')
  .action(async (incrementId, options) => {
    const { evaluateCompletionCommand } = await import('../dist/src/cli/commands/evaluate-completion.js');
    const result = await evaluateCompletionCommand(incrementId, options);
    if (!options.silent) {
      console.log(JSON.stringify(result, null, 2));
    }
    // Exit code: 0 if complete, 1 if not
    process.exit(result.complete ? 0 : 1);
  });

// Generate rubric command - emit the AC-tied quality contract rubric.md (0865)
program
  .command('generate-rubric <increment-id>')
  .description('Generate or refresh the AC-tied rubric.md quality contract at the increment root')

  .option('--refresh', 'Regenerate from current ACs, overwriting an existing non-template rubric')
  .option('--silent', 'Minimal output')
  .action(async (incrementId, options) => {
    const { generateRubricCommand } = await import('../dist/src/cli/commands/generate-rubric.js');
    const result = await generateRubricCommand(incrementId, options);
    process.exit(result.success ? 0 : 1);
  });

// Reflect stop command - Extract learnings at session end (internal, called by stop hook)
program
  .command('reflect-stop <transcript-path>')
  .description('Extract learnings from session transcript (called by stop hook)')

  .option('-s, --silent', 'Silent mode - output JSON only')
  .option('-m, --model <model>', 'Model to use (haiku, sonnet, opus)')
  .option('--migrate', 'Run migration of old memory files first')
  .action(async (transcriptPath, options) => {
    const { reflectStopCommand } = await import('../dist/src/cli/commands/reflect-stop.js');
    await reflectStopCommand(transcriptPath, options);
  });

// Detect project command - Analyze project files and suggest plugins (internal)
program
  .command('detect-project [path]')
  .description('Detect project type from files and suggest plugins to install')

  .option('--name <name>', 'Increment name for legacy name-based detection')
  .option('--description <text>', 'Description for legacy name-based detection')
  .option('--install', 'Also install detected plugins after detection')
  .option('--silent', 'Silent mode - no stdout output (for hooks)')
  .action(async (path, options) => {
    const { detectProjectCommand } = await import('../dist/src/cli/commands/detect-project.js');
    const result = await detectProjectCommand(path, options);
    // Exit code: 0 if types detected, 1 if none
    process.exit(result.types.length > 0 ? 0 : 1);
  });

// Resolve structure command - REMOVED (all workspaces use repositories/ structure)
program
  .command('resolve-structure')
  .description('[REMOVED] All workspaces now use the repositories/ structure')
  .action(() => {
    console.log('This command has been removed. All workspaces now use the repositories/ structure.');
    process.exit(0);
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
  console.log('  $ specweave sync status                     # Token/account, provider health, sync gaps');
  console.log('  $ specweave jobs                            # Show active background jobs');
  console.log('  $ specweave jobs --follow <jobId>           # Follow job progress live');
  console.log('  $ specweave jobs --logs <jobId>             # View worker logs');
  console.log('  $ specweave jobs --resume <jobId>           # Resume paused job');
  console.log('  $ specweave living-docs                     # Launch Living Docs (interactive)');
  console.log('  $ specweave living-docs --depth deep-native # AI-powered analysis (FREE w/ MAX)');
  console.log('  $ specweave living-docs --full-scan         # Full deep scan (all phases)');
  console.log('  $ specweave living-docs --resume <jobId>    # Resume orphaned job');
  console.log('  $ specweave sync push 0008                  # Push increment progress to GitHub/Jira/ADO');
  console.log('  $ specweave sync pull --since 3             # Show external changes from the last 3 days');
  console.log('  $ specweave cache                           # Show cache status');
  console.log('  $ specweave cache --rebuild                 # Rebuild dashboard cache');
  console.log('  $ specweave cache --debug                   # Show cache debug info');
  console.log('  $ specweave sync setup --validate           # Validate tracker configuration + credentials');
  console.log('  $ specweave docs                            # Preview internal docs (port 3015)');
  console.log('  $ specweave docs public                     # Preview public docs (port 3016)');
  console.log('  $ specweave docs build                      # Build internal site');
  console.log('  $ specweave docs build --scope public       # Build public site');
  console.log('  $ specweave docs validate                   # Check for docs errors');
  console.log('  $ specweave docs status                     # Show docs status');
  console.log('  $ specweave docs kill                       # Stop all docs servers');
  console.log('  $ specweave doctor --fix-status             # Fix metadata/spec status desyncs');
  console.log('  $ specweave refresh-marketplace             # Lazy mode: router only (~500 chars)');
  console.log('  $ specweave refresh-marketplace --all       # Legacy mode: all plugins (~60K chars)');
  console.log('  $ specweave refresh-marketplace --force     # Force reinstall (clears cache)');
  console.log('  $ specweave update                          # Update CLI + instructions + config');
  console.log('  $ specweave update --plugins                # Also refresh marketplace plugins');
  console.log('  $ specweave update --no-self                # Skip CLI update, only project files');
  console.log('  $ specweave update --check                  # Dry run - preview changes');
  console.log('');
  console.log('Plugin Management (use Claude CLI commands):');
  console.log('  $ claude plugin install sw@specweave        # Install core SpecWeave');
  console.log('  $ claude plugin list                        # Show installed plugins');
  console.log('  $ vskill install anton-abyzov/vskill --plugin mobile  # Install domain plugin');
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

      console.log(chalk.dim('\n  Run sw:fix-duplicates to resolve\n'));
    }
  } catch (error) {
    // Silently ignore errors (don't block CLI startup)
    if (process.env.DEBUG) {
      console.error(chalk.dim(`[DEBUG] Duplicate check failed: ${error}`));
    }
  }
}

// Dashboard command - Real-time observability dashboard
program
  .command('dashboard')
  .description('Launch real-time observability dashboard in browser')
  .option('-p, --port <number>', 'Port number (default: 3456)')
  .option('--no-browser', 'Do not open browser automatically')
  .action(async (options) => {
    const { dashboardCommand } = await import('../dist/src/cli/commands/dashboard.js');
    await dashboardCommand(options);
  });

// Hooks command - hook log viewer (hooks.json lives in the plugin; see `specweave doctor` for a dry-run)
const hooksCmd = program.command('hooks').description('Hook observability');

hooksCmd
  .command('log')
  .description('View recent hook warnings, errors and blocks (.specweave/logs/hooks.jsonl)')
  .option('--last <number>', 'Number of entries to show (default: 20)', '20')
  .option('--blocks-only', 'Show only block decisions')
  .option('--errors-only', 'Show only error entries')
  .option('--hook <name>', 'Filter by hook name')
  .action(async (options) => {
    const { hooksLogCommand } = await import('../dist/src/cli/commands/hooks-cmd.js');
    await hooksLogCommand({
      last: parseInt(options.last, 10),
      blocksOnly: options.blocksOnly,
      errorsOnly: options.errorsOnly,
      hook: options.hook,
    });
  });

// Context command - Show workspace project context for spec fields
const contextCmd = program
  .command('context')
  .description('Show SpecWeave workspace context');

contextCmd
  .command('projects')
  .description('List project and board values for spec.md')
  .action(async () => {
    const { getRequiredSpecFields } = await import('../dist/src/utils/structure-level-detector.js');
    console.log(JSON.stringify(getRequiredSpecFields(process.cwd()), null, 2));
  });

// Get command - Clone and register an existing repository into the workspace
program
  .command('get <source>')
  .description('Clone and register an existing repository into the workspace')
  .option('--branch <branch>', 'Clone a specific branch')
  .option('--prefix <prefix>', 'User story prefix (default: first 3 chars uppercase)')
  .option('--role <role>', 'Repository role (frontend, backend, mobile, infra, shared)')
  .option('--no-init', 'Skip specweave init on cloned repo')
  .option('--yes', 'Skip confirmation prompts')
  .option('--all', 'Clone all repositories in an org (source is org name)')
  .option('--pattern <pattern>', 'Filter repos by glob pattern, e.g. "service-*" (use with --all or org/* source)')
  .option('--limit <n>', 'Max repos to fetch in bulk mode (default: 1000)', parseInt)
  .option('--no-archived', 'Skip archived repositories in bulk mode')
  .option('--no-forks', 'Skip forked repositories in bulk mode')
  .action(async (source, opts) => {
    const { getCommand } = await import('../dist/src/cli/commands/get.js');
    await getCommand(source, opts);
  });

// Migrate-to-umbrella command - REMOVED (all workspaces use repositories/ structure)
program
  .command('migrate-to-umbrella')
  .description('[REMOVED] Use specweave get to add repositories')
  .action(() => {
    console.log('This command has been removed. Use `specweave get` to add repositories.');
    process.exit(0);
  });

// Run startup check, then parse arguments
(async () => {
  await checkForDuplicates();

  // Hide internal-only commands from --help (still callable by hooks)
  for (const name of ['hook', 'detect-intent', 'evaluate-completion', 'reflect-stop', 'detect-project']) {
    const cmd = program.commands.find(c => c.name() === name);
    if (cmd) cmd._hidden = true;
  }

  // Parse arguments
  program.parse(process.argv);

  // Show help if no command specified
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
})();
