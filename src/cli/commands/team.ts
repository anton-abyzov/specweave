/**
 * Team CLI Command
 *
 * Launches Claude Code with native agent teams enabled.
 * Automatically creates a tmux session if not already in one,
 * so agents get their own split panes.
 *
 * Cross-platform:
 *   macOS/Linux: auto-launches tmux for split-pane agent views
 *   Windows:     uses in-process mode (tmux unavailable natively)
 *
 * Usage:
 *   specweave team                          # Auto-launches in tmux (macOS/Linux)
 *   specweave team "Build auth system"      # Launch with initial prompt
 *   specweave team --mode in-process        # Force in-process mode (no tmux)
 */

import { spawn } from 'child_process';
import * as os from 'os';
import chalk from 'chalk';
import { isSpecWeaveInitialized } from '../../utils/fs-native.js';
import { execFileNoThrowSync } from '../../utils/execFileNoThrow.js';
import { enableAgentTeamsEnvVar } from '../helpers/init/claude-settings-env.js';

export interface TeamCommandOptions {
  mode?: 'tmux' | 'in-process';
  noIncrement?: boolean;
}

const VALID_MODES = ['tmux', 'in-process'] as const;

/**
 * Check if a CLI tool is available on PATH
 */
function isToolAvailable(tool: string): boolean {
  const which = process.platform === 'win32' ? 'where' : 'which';
  const result = execFileNoThrowSync(which, [tool]);
  return result.success;
}

/**
 * Platform-appropriate install hint for tmux.
 */
function tmuxInstallHint(): string {
  switch (process.platform) {
    case 'darwin':
      return 'brew install tmux';
    case 'win32':
      return 'Use WSL: wsl --install, then: sudo apt install tmux';
    default:
      return 'sudo apt install tmux  # or your package manager';
  }
}

/**
 * Reconstruct CLI args for re-launching inside tmux.
 */
function buildRelaunchArgs(
  description: string | undefined,
  options: TeamCommandOptions
): string[] {
  const args: string[] = ['team', '--mode', 'tmux'];
  if (options.noIncrement) args.push('--no-increment');
  if (description) args.push(description);
  return args;
}

/**
 * Main team command handler
 */
export async function handleTeamCommand(
  description: string | undefined,
  options: TeamCommandOptions
): Promise<void> {
  const projectPath = process.cwd();

  // Pre-flight: project must be initialized
  if (!isSpecWeaveInitialized(projectPath)) {
    console.log(chalk.yellow('No SpecWeave project found in current directory.'));
    console.log(chalk.gray('Run `specweave init` to initialize a project.'));
    return;
  }

  // Pre-flight: claude CLI must be available
  if (!isToolAvailable('claude')) {
    console.error(chalk.red('Claude CLI not found. Install it: npm install -g @anthropic-ai/claude-code'));
    return;
  }

  // Auto-fix settings.json env var (project-level + global)
  enableAgentTeamsEnvVar(projectPath);
  enableAgentTeamsEnvVar(os.homedir());

  // Determine mode — may re-launch inside tmux (returns only if continuing)
  const mode = resolveMode(description, options);
  if (mode === null) return; // re-launched inside tmux, parent exits via spawn handler

  // Build args — interactive mode with optional initial prompt as positional arg
  const args: string[] = ['--dangerously-skip-permissions', '--teammate-mode', mode];

  // Build env
  const spawnEnv: Record<string, string> = {
    ...process.env as Record<string, string>,
    CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
  };

  if (options.noIncrement) {
    spawnEnv.SPECWEAVE_NO_INCREMENT = '1';
  }

  // Spawn claude with team env
  console.log(chalk.cyan(`Launching Claude Code with agent teams (${mode} mode)...`));
  if (options.noIncrement) {
    console.log(chalk.yellow('Free-form mode: no increment required. Agents can be spawned without a spec.'));
  }
  console.log(chalk.gray('Agent Teams is an experimental feature. Set CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 in your env.'));

  // Pass description as positional arg (interactive session with initial prompt)
  if (description) {
    args.push(description);
  }

  const child = spawn('claude', args, {
    stdio: 'inherit',
    env: spawnEnv,
  });

  child.on('error', (err) => {
    console.error(chalk.red(`Failed to launch Claude Code: ${err.message}`));
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(chalk.gray('Make sure `claude` is on your PATH.'));
    }
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

/**
 * Resolve teammate mode, auto-launching tmux if needed.
 *
 * Returns the mode string to use, or null if the process was
 * re-launched inside tmux (caller should exit).
 */
function resolveMode(
  description: string | undefined,
  options: TeamCommandOptions
): string | null {
  // Explicit in-process — skip tmux entirely
  if (options.mode === 'in-process') {
    return 'in-process';
  }

  // Explicit tmux or invalid mode — validate
  if (options.mode && options.mode !== 'tmux') {
    console.log(chalk.yellow(`Unknown mode "${options.mode}". Valid modes: ${VALID_MODES.join(', ')}`));
    console.log(chalk.gray('Falling back to auto-detection.'));
  }

  // Already inside tmux — use it directly
  if (process.env.TMUX) {
    return 'tmux';
  }

  // iTerm2 available (macOS) — Claude auto-detects iTerm2 split panes
  if (isToolAvailable('it2')) {
    return 'tmux';
  }

  // tmux available but not in a session — auto-launch inside tmux
  if (isToolAvailable('tmux')) {
    console.log(chalk.cyan('Starting tmux session for agent split panes...'));

    const sessionName = `sw-team-${Date.now()}`;
    const relaunchArgs = buildRelaunchArgs(description, options);
    const tmuxArgs = [
      'new-session', '-s', sessionName, '--',
      'specweave', ...relaunchArgs,
    ];

    const child = spawn('tmux', tmuxArgs, {
      stdio: 'inherit',
      env: {
        ...process.env as Record<string, string>,
        CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
      },
    });

    child.on('error', (err) => {
      console.error(chalk.red(`Failed to start tmux: ${err.message}`));
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });

    return null; // Signal: re-launched, don't continue
  }

  // No tmux available — in-process fallback with platform-specific hint
  console.log(
    chalk.yellow('tmux not found. Agents will run in-process (same pane).')
  );
  console.log(chalk.gray(`Install tmux for split-pane agent views: ${tmuxInstallHint()}`));
  return 'in-process';
}
