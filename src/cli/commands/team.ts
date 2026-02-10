/**
 * Team CLI Command
 *
 * Launches Claude Code with native agent teams enabled.
 * Sets CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1, --teammate-mode,
 * and --dangerously-skip-permissions for autonomous team work.
 *
 * Usage:
 *   specweave team                          # Launch with tmux split panes
 *   specweave team "Build auth system"      # Launch with initial prompt
 *   specweave team --mode in-process        # Use in-process mode
 */

import { spawn } from 'child_process';
import chalk from 'chalk';
import { isSpecWeaveInitialized } from '../../utils/fs-native.js';
import { execFileNoThrowSync } from '../../utils/execFileNoThrow.js';
import { enableAgentTeamsEnvVar } from '../helpers/init/claude-settings-env.js';

export interface TeamCommandOptions {
  mode?: 'tmux' | 'in-process';
}

/**
 * Check if a CLI tool is available on PATH
 */
function isToolAvailable(tool: string): boolean {
  const which = process.platform === 'win32' ? 'where' : 'which';
  const result = execFileNoThrowSync(which, [tool]);
  return result.success;
}

/**
 * Determine the best teammate mode based on available tools
 */
function resolveTeammateMode(requestedMode?: string): string {
  if (requestedMode) {
    return requestedMode;
  }

  // Check for tmux or iTerm2 (it2 CLI)
  const hasTmux = isToolAvailable('tmux');
  const hasIt2 = isToolAvailable('it2');

  if (hasTmux || hasIt2) {
    return 'tmux'; // Claude auto-detects iTerm2 vs tmux
  }

  // Fallback
  console.log(
    chalk.yellow(
      'Neither tmux nor iTerm2 (it2) found. Using in-process mode (less convenient).'
    )
  );
  console.log(chalk.gray('Install tmux: brew install tmux'));
  return 'in-process';
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

  // Auto-fix settings.json env var
  enableAgentTeamsEnvVar(projectPath);

  // Determine mode
  const mode = resolveTeammateMode(options.mode);

  // Build args
  const args = ['--teammate-mode', mode, '--dangerously-skip-permissions'];

  // Add description as initial prompt if provided
  if (description) {
    args.push(`Use /sw:team-orchestrate to: ${description}`);
  }

  // Spawn claude with team flags
  console.log(chalk.cyan(`Launching Claude Code with agent teams (${mode} mode)...`));

  const child = spawn('claude', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
    },
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}
