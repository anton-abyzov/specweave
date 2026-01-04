/**
 * Auto Mode CLI Command
 *
 * Start autonomous execution session with stop hook integration.
 * Works until all tasks complete or max iterations reached.
 * Uses Ralph Wiggum pattern with SpecWeave workflow integration.
 *
 * Usage:
 *   specweave auto [INCREMENT_IDS...] [OPTIONS]
 *   specweave auto 0001 --max-iterations 100
 *   specweave auto --all-backlog --tdd
 *   specweave auto --prompt "Build auth system" --yes
 */

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { Command } from 'commander';
import { SessionStateManager } from '../../core/auto/session-state.js';
import { CompletionCondition } from '../../core/auto/types.js';
import { consoleLogger as logger } from '../../utils/logger.js';

export interface AutoCommandOptions {
  maxIterations?: string | number;
  maxHours?: string | number;
  simple?: boolean;
  dryRun?: boolean;
  increments?: string;
  allBacklog?: boolean;
  skipGates?: string;
  noIncrement?: boolean;
  noInc?: boolean;
  prompt?: string;
  yes?: boolean;
  y?: boolean;
  tdd?: boolean;
  strict?: boolean;
  // Completion condition flags
  build?: boolean;
  tests?: boolean;
  e2e?: boolean;
  lint?: boolean;
  types?: boolean;
  cov?: string;
  e2eCov?: string;
  cmd?: string;
}

export function createAutoCommand(): Command {
  const cmd = new Command('auto')
    .description('Start autonomous execution session (Ralph Wiggum pattern + stop hooks)')
    .argument('[incrementIds...]', 'Increment IDs to process (e.g., 0001, 0001-feature)')
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
    .action(async (incrementIds: string[], options: AutoCommandOptions) => {
      const projectPath = process.cwd();

      // Check if SpecWeave is initialized
      const specweavePath = path.join(projectPath, '.specweave');
      if (!fs.existsSync(specweavePath)) {
        console.log(chalk.yellow('No SpecWeave project found in current directory.'));
        console.log(chalk.gray('Run `specweave init` to initialize a project.'));
        return;
      }

      try {
        await handleAutoCommand(projectPath, incrementIds, options);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Error: ${errorMessage}`));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Main auto command handler
 */
async function handleAutoCommand(
  projectPath: string,
  incrementIds: string[],
  options: AutoCommandOptions
): Promise<void> {
  const sessionManager = new SessionStateManager(projectPath);
  const stateDir = path.join(projectPath, '.specweave/state');
  const incrementsDir = path.join(projectPath, '.specweave/increments');
  const logsDir = path.join(projectPath, '.specweave/logs');

  // Ensure directories exist
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Parse options
  const maxIterations = parseInt(options.maxIterations?.toString() || '2500', 10);
  const maxHours = options.maxHours ? parseInt(options.maxHours.toString(), 10) : 600;
  const simpleMode = options.simple || false;
  const dryRun = options.dryRun || false;
  const allBacklog = options.allBacklog || false;
  const skipGates = options.skipGates ? options.skipGates.split(',').map(g => g.trim()) : [];
  const noIncrement = options.noIncrement || options.noInc || false;
  const prompt = options.prompt;
  const autoApprove = options.yes || options.y || false;
  const tddMode = options.tdd || options.strict || false;

  // Parse completion conditions (v0.4.0+)
  const completionConditions: CompletionCondition[] = [];

  if (options.build) {
    completionConditions.push({
      type: 'build',
      autoHeal: true,
      maxRetries: 3,
    });
  }

  if (options.tests || tddMode) {
    completionConditions.push({
      type: 'tests',
      autoHeal: false, // Tests must be fixed manually
    });
  }

  if (options.e2e) {
    completionConditions.push({
      type: 'e2e',
      autoHeal: false, // E2E tests must be fixed manually
    });
  }

  if (options.lint) {
    completionConditions.push({
      type: 'lint',
      autoHeal: true,
      maxRetries: 3,
    });
  }

  if (options.types) {
    completionConditions.push({
      type: 'types',
      autoHeal: true,
      maxRetries: 3,
    });
  }

  if (options.cov) {
    const threshold = parseInt(options.cov, 10);
    if (threshold > 0 && threshold <= 100) {
      completionConditions.push({
        type: 'coverage',
        threshold,
        autoHeal: false,
      });
    }
  }

  if (options.e2eCov) {
    const threshold = parseInt(options.e2eCov, 10);
    if (threshold > 0 && threshold <= 100) {
      completionConditions.push({
        type: 'e2e-coverage',
        threshold,
        autoHeal: false,
      });
    }
  }

  if (options.cmd) {
    completionConditions.push({
      type: 'command',
      cmd: options.cmd,
      autoHeal: false, // Custom commands must pass as-is
    });
  }

  // Parse increment IDs from args or --increments option
  let finalIncrementIds = [...incrementIds];
  if (options.increments) {
    finalIncrementIds = [...finalIncrementIds, ...options.increments.split(',').map(id => id.trim())];
  }

  // Check for existing active session
  if (sessionManager.hasActiveSession()) {
    const activeSession = sessionManager.getActiveSession();
    console.log(chalk.red(`❌ Auto session already active: ${activeSession?.sessionId}`));
    console.log('');
    console.log('Options:');
    console.log('  1. Cancel it: ' + chalk.cyan('specweave cancel-auto'));
    console.log('  2. Check status: ' + chalk.cyan('specweave auto-status'));
    console.log('  3. Let it continue (close this tab)');
    process.exit(1);
  }

  // Handle --prompt (intelligent chunking)
  if (prompt) {
    await handlePromptChunking(projectPath, prompt, autoApprove, stateDir);
    return;
  }

  // Build increment queue
  if (allBacklog) {
    finalIncrementIds = await findBacklogIncrements(incrementsDir);
    if (finalIncrementIds.length === 0) {
      console.log(chalk.yellow('⚠️  No backlog or planned increments found'));
      return;
    }
  }

  // If no increments specified, find current in-progress increment
  if (finalIncrementIds.length === 0) {
    finalIncrementIds = await findActiveIncrements(incrementsDir);
  }

  // If still no increments found
  if (finalIncrementIds.length === 0) {
    if (noIncrement) {
      console.log(chalk.red('❌ No increments specified and no active increment found'));
      console.log('');
      console.log('Usage: specweave auto [INCREMENT_IDS...]');
      console.log('       specweave auto --all-backlog');
      process.exit(1);
    } else {
      // Signal to Claude that increment creation is needed
      console.log(chalk.blue('🤔 No increments found. Auto mode will analyze context and create increments as needed.'));
      console.log('');
      console.log('💡 The LLM will:');
      console.log('   1. Analyze user prompt and project context');
      console.log('   2. Match existing increments OR create new ones');
      console.log('   3. Start autonomous execution');
      console.log('');
      console.log('To skip auto-creation and require existing increments: use --no-increment');
      console.log('');

      // Create a marker file to signal increment creation needed
      const markerPath = path.join(stateDir, 'auto-needs-increment.json');
      const marker = {
        needsIncrementCreation: true,
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2), 'utf-8');

      // Exit with special code to signal LLM should create increment
      process.exit(2);
    }
  }

  // Validate increments exist
  for (const incId of finalIncrementIds) {
    const incDir = path.join(incrementsDir, incId);
    if (!fs.existsSync(incDir)) {
      // Try to find by prefix
      const found = findIncrementByPrefix(incrementsDir, incId);
      if (!found) {
        console.log(chalk.red(`❌ Increment not found: ${incId}`));
        process.exit(1);
      }
    }
  }

  // Dry run output
  if (dryRun) {
    printDryRunPreview(finalIncrementIds, maxIterations, maxHours, simpleMode);
    return;
  }

  // Create session
  const session = sessionManager.createSession({
    incrementQueue: finalIncrementIds,
    maxIterations,
    maxHours,
    simple: simpleMode,
  });

  // Add TDD mode to session if enabled
  if (tddMode) {
    session.tddMode = true;
  }

  // Add completion conditions if provided (v0.4.0+)
  if (completionConditions.length > 0) {
    session.completionConditions = completionConditions;
  }

  // Add skip gates if provided
  if (skipGates.length > 0) {
    session.humanGates.approved = skipGates;
  }

  // Save session
  if (!sessionManager.save(session)) {
    console.log(chalk.red('❌ Failed to create session'));
    process.exit(1);
  }

  // Acquire lock
  if (!sessionManager.acquireLock()) {
    console.log(chalk.red('❌ Failed to acquire session lock'));
    process.exit(1);
  }

  // Log session start
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: 'session_start',
    sessionId: session.sessionId,
    increments: finalIncrementIds.length,
  };
  const logPath = path.join(logsDir, 'auto-sessions.log');
  fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n', 'utf-8');

  // Output success
  console.log(chalk.green('🚀 Auto Session Started'));
  console.log('');
  console.log('Session ID: ' + chalk.cyan(session.sessionId));
  console.log('Max Iterations: ' + chalk.yellow(maxIterations.toString()));
  if (maxHours) {
    console.log('Max Hours: ' + chalk.yellow(maxHours.toString()));
  }
  console.log('Simple Mode: ' + chalk.yellow(simpleMode.toString()));

  if (tddMode) {
    console.log('');
    console.log(chalk.red('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.red('🔴 TDD STRICT MODE: ENABLED'));
    console.log(chalk.red('   ALL tests MUST pass before auto mode can complete'));
    console.log(chalk.red('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  }

  // Display completion conditions (v0.4.0+)
  if (completionConditions.length > 0) {
    console.log('');
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.yellow('⚙️  COMPLETION CONDITIONS'));
    console.log(chalk.yellow('   Auto mode will NOT stop until ALL conditions pass:'));
    console.log('');
    for (const condition of completionConditions) {
      let description = '';
      switch (condition.type) {
        case 'build':
          description = '🔨 Build must pass (auto-heal enabled, max 3 retries)';
          break;
        case 'tests':
          description = '✅ Tests must pass (unit + integration)';
          break;
        case 'e2e':
          description = '🎭 E2E tests must pass';
          break;
        case 'lint':
          description = '🧹 Linting must pass (auto-heal enabled, max 3 retries)';
          break;
        case 'types':
          description = '📘 Type-checking must pass (auto-heal enabled, max 3 retries)';
          break;
        case 'coverage':
          description = `📊 Code coverage must be ≥${condition.threshold}%`;
          break;
        case 'e2e-coverage':
          description = `🎯 E2E coverage must be ≥${condition.threshold}%`;
          break;
        case 'command':
          description = `⚡ Command must pass: ${condition.cmd}`;
          break;
      }
      console.log('   • ' + description);
    }
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  }

  console.log('');
  console.log(`Increment Queue (${finalIncrementIds.length}):`);
  for (const incId of finalIncrementIds) {
    console.log('  • ' + chalk.cyan(incId));
  }
  console.log('');
  console.log('Current: ' + chalk.green(finalIncrementIds[0]));
  console.log('');
  console.log('The session will continue until:');
  console.log('  • All tasks complete AND tests pass');
  if (tddMode) {
    console.log(chalk.red('  • (TDD MODE: 100% tests GREEN required)'));
  }
  if (completionConditions.length > 0) {
    console.log(chalk.yellow(`  • ALL ${completionConditions.length} completion conditions pass`));
  }
  console.log(`  • Max iterations (${maxIterations}) reached`);
  if (maxHours) {
    console.log(`  • Max hours (${maxHours}) exceeded`);
  }
  console.log('  • You run ' + chalk.cyan('specweave cancel-auto'));
  console.log('  • A human gate requires approval');
  console.log('');
  console.log(chalk.gray('💡 Tip: Close this tab anytime to pause. Resume with /sw:do'));
  console.log('');
}

/**
 * Handle --prompt option (intelligent chunking)
 */
async function handlePromptChunking(
  projectPath: string,
  prompt: string,
  autoApprove: boolean,
  stateDir: string
): Promise<void> {
  console.log(chalk.blue('🧠 Analyzing prompt for intelligent chunking...'));
  console.log('');

  // TODO: Implement chunking logic (call chunk-prompt.js or port to TypeScript)
  // For now, create marker and exit with code 2
  const marker = {
    needsIncrementCreation: true,
    fromChunking: true,
    autoApproved: autoApprove,
    prompt,
    timestamp: new Date().toISOString(),
  };

  const markerPath = path.join(stateDir, 'auto-needs-increment.json');
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2), 'utf-8');

  console.log(chalk.yellow('📋 Prompt analysis required - LLM will handle chunking'));
  console.log('');
  if (autoApprove) {
    console.log(chalk.green('✅ Plan will be auto-approved'));
  } else {
    console.log('💡 Review the plan and approve before execution');
  }

  process.exit(2);
}

/**
 * Find backlog or planned increments
 */
async function findBacklogIncrements(incrementsDir: string): Promise<string[]> {
  if (!fs.existsSync(incrementsDir)) {
    return [];
  }

  const increments: string[] = [];
  const entries = fs.readdirSync(incrementsDir);

  for (const entry of entries) {
    if (!/^[0-9]{4}-/.test(entry)) continue;

    const incDir = path.join(incrementsDir, entry);
    const metaPath = path.join(incDir, 'metadata.json');

    if (fs.existsSync(metaPath)) {
      const metaContent = fs.readFileSync(metaPath, 'utf-8');
      const metadata = JSON.parse(metaContent);

      if (metadata.status === 'backlog' || metadata.status === 'planned') {
        increments.push(entry);
      }
    }
  }

  return increments;
}

/**
 * Find active or in-progress increments
 */
async function findActiveIncrements(incrementsDir: string): Promise<string[]> {
  if (!fs.existsSync(incrementsDir)) {
    return [];
  }

  const increments: string[] = [];
  const entries = fs.readdirSync(incrementsDir);

  for (const entry of entries) {
    if (!/^[0-9]{4}-/.test(entry)) continue;

    const incDir = path.join(incrementsDir, entry);
    const metaPath = path.join(incDir, 'metadata.json');

    if (fs.existsSync(metaPath)) {
      const metaContent = fs.readFileSync(metaPath, 'utf-8');
      const metadata = JSON.parse(metaContent);

      if (metadata.status === 'active' || metadata.status === 'in-progress') {
        increments.push(entry);
        break; // Only return first active increment
      }
    }
  }

  return increments;
}

/**
 * Find increment by prefix
 */
function findIncrementByPrefix(incrementsDir: string, prefix: string): string | null {
  if (!fs.existsSync(incrementsDir)) {
    return null;
  }

  const entries = fs.readdirSync(incrementsDir);
  for (const entry of entries) {
    if (entry.startsWith(prefix)) {
      return entry;
    }
  }

  return null;
}

/**
 * Print dry run preview
 */
function printDryRunPreview(
  incrementIds: string[],
  maxIterations: number,
  maxHours: number | undefined,
  simpleMode: boolean
): void {
  const sessionId = SessionStateManager.generateSessionId();

  console.log(chalk.blue('🔍 Dry Run - Session Preview'));
  console.log('');
  console.log('Session ID: ' + chalk.cyan(sessionId));
  console.log('Max Iterations: ' + chalk.yellow(maxIterations.toString()));
  if (maxHours) {
    console.log('Max Hours: ' + chalk.yellow(maxHours.toString()));
  }
  console.log('Simple Mode: ' + chalk.yellow(simpleMode.toString()));
  console.log('');
  console.log('Increment Queue:');
  for (const incId of incrementIds) {
    console.log('  • ' + chalk.cyan(incId));
  }
  console.log('');
  console.log(chalk.gray('Run without --dry-run to create session.'));
}
