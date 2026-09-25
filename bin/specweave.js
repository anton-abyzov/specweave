#!/usr/bin/env node

/**
 * SpecWeave CLI
 *
 * Entry point for the SpecWeave command-line interface.
 * Provides commands for initializing projects, creating increments, and managing skills.
 */

import './check-node.js';

import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';

// For importing package.json (need createRequire in ESM)
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

import './check-build.js';

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
  .command('start <increment-id>')
  .description('Start a planned/backlog/paused increment (status -> active)')
  .action(async (incrementId) => {
    const { startCommand } = await import('../dist/src/cli/commands/start.js');
    await startCommand(incrementId);
  });

program
  .command('resume <increment-id>')
  .description('Resume a paused, abandoned or not-yet-started increment')
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
  .command('complete [increment-id] [more-ids...]')
  .alias('done')
  .description('Complete one or more increments (triggers GitHub/JIRA/ADO sync)')
  .option('-s, --silent', 'Silent mode (for auto mode stop hook)')
  .option('-y, --yes', 'Assume yes (silent confirmation)')
  .option('--skip-validation', 'Skip quality gate validation (DANGEROUS)')
  .option('-r, --reason <text>', 'Close without a passing reports/verify.json (stored as metadata.closeReason)')
  .option('--all', 'Close every active increment whose tasks are all done or skipped (requires --reason)')
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
  .option('-n, --note <text>', 'Note (alias of --reason)')
  .option('--reason <text>', 'Reason (required for skip / block)')
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
  .option('--with-plan', 'Also scaffold plan.md (optional overflow; spec.md carries the Approach)')
  .option('--planned', 'Create as "planned" instead of "active" (backlog work; start it with specweave start <id>)')
  .option('--supersedes <increment-id>', 'Increment this one replaces (the old one is abandoned with a closeReason)')
  .option('--parent <increment-id>', 'Parent increment (recorded as metadata.parent)')
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

// Jev command - TypeSafe System One: fast, cheap, calibrated closed-set decisions
program
  .command('jev <action> [args...]')
  .description('Jev (System One): doctor | setup | ask | route | task | guard | screen | failure | browse | usage')
  .option('--json', 'Machine-readable JSON output')
  .option('--provider <name>', 'setup: openrouter | typesafe')
  .option('--model <model>', 'setup: model id (defaults to the provider default)')
  .option('--guard-bash', 'setup: enable the opt-in PreToolUse Bash guard')
  .option('--no-guard-bash', 'setup: disable the Bash guard')
  .option('--disable', 'setup: turn Jev off for this project')
  .option('--state <value>', 'ask: state as JSON, plain text, @file or - for stdin')
  .option('--questions <value>', 'ask: questions as JSON or @file')
  .option('--choice <instructions>', 'ask: shorthand for one choice question')
  .option('--option <key=description>', 'ask: one --choice option (repeatable)', (val, acc) => { (acc || []).push(val); return acc || [val]; }, [])
  .option('--noul <instructions>', 'ask: shorthand for one noul (true/false probability) question')
  .option('--increment <id>', 'task: increment id (defaults to the active one)')
  .option('--goal <goal>', 'browse: what to accomplish')
  .option('--url <url>', 'browse: starting URL')
  .option('--allow-domain <domain>', 'browse: allowed origin (repeatable)', (val, acc) => { (acc || []).push(val); return acc || [val]; }, [])
  .option('--input <Label=value>', 'browse: text the loop may type (repeatable)', (val, acc) => { (acc || []).push(val); return acc || [val]; }, [])
  .option('--max-steps <n>', 'browse: step limit')
  .option('--screenshot-dir <path>', 'browse: where to write screenshots')
  .option('--allow-sensitive', 'browse: allow clicking sensitive controls')
  .action(async (action, args, options) => {
    const { jevCommand } = await import('../dist/src/cli/commands/jev.js');
    process.exitCode = await jevCommand(action, args, options);
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
    });
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

// Route lazy CLI actions through the guarded command factory. Keep registrations
// here so static shell-completion generation still sees every command and option.
async function runLspCommand(args) {
  const { createLspCommand } = await import('../dist/src/cli/commands/lsp.js');
  await createLspCommand().parseAsync(args, { from: 'user' });
}

// LSP command - Code intelligence operations
const lspCmd = program
  .command('lsp')
  .description('LSP code intelligence (refs, def, hover, symbols, search)');

lspCmd
  .command('refs <file> <symbol>')
  .description('Find all references to a symbol')
  .action(async (file, symbol) => {
    await runLspCommand(['refs', '--', file, symbol]);
  });

lspCmd
  .command('def <file> <symbol>')
  .description('Go to definition of a symbol')
  .action(async (file, symbol) => {
    await runLspCommand(['def', '--', file, symbol]);
  });

lspCmd
  .command('hover <file> <symbol>')
  .description('Get type information for a symbol')
  .action(async (file, symbol) => {
    await runLspCommand(['hover', '--', file, symbol]);
  });

lspCmd
  .command('symbols <file>')
  .description('List all symbols in a file')
  .action(async (file) => {
    await runLspCommand(['symbols', '--', file]);
  });

lspCmd
  .command('search <query>')
  .description('Search for symbols in workspace')
  .action(async (query) => {
    await runLspCommand(['search', '--', query]);
  });

lspCmd
  .command('warmup [files...]')
  .description('Warm up LSP by pre-indexing workspace (run on session start)')
  .option('--quiet', 'Suppress output')
  .action(async (files, options) => {
    await runLspCommand(['warmup', ...(options.quiet ? ['--quiet'] : []), '--', ...files]);
  });

lspCmd
  .command('status')
  .description('Show LSP status and warm-up state')
  .action(async () => {
    await runLspCommand(['status']);
  });

lspCmd
  .command('setup')
  .description('Scan project for languages and interactively install LSP plugins (22 languages)')
  .option('-n, --max <number>', 'Maximum number of languages to suggest', '5')
  .option('--min-files <number>', 'Minimum file count to consider a language', '5')
  .option('--dry-run', 'Show what would be installed without installing')
  .option('--scope <scope>', 'Installation scope: user, project, local', 'project')
  .action(async (options) => {
    await runLspCommand([
      'setup', '--max', options.max, '--min-files', options.minFiles,
      '--scope', options.scope, ...(options.dryRun ? ['--dry-run'] : []),
    ]);
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

// Supplementary CLI help and project coordination.
import { registerHelp } from './help.js';
import { registerProjectCommand } from './project.js';
registerHelp(program);
registerProjectCommand(program);

import { checkForDuplicates } from './startup-check.js';

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
