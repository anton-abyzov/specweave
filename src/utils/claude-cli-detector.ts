/**
 * Claude CLI Detection Utility
 *
 * Provides robust detection of Claude Code CLI with comprehensive validation.
 * Goes beyond checking if 'claude' exists - verifies it can actually run plugin commands.
 *
 * IMPORTANT: This detector handles multiple scenarios:
 * 1. Claude installed globally via npm (binary in PATH)
 * 2. Claude defined as shell function in .zshrc/.bashrc
 * 3. Claude defined as shell alias
 *
 * Shell functions/aliases are only visible in interactive shells, so we use
 * multiple detection strategies to find Claude regardless of how it's installed.
 */

import { execFileNoThrowSync, execFileNoThrow } from './execFileNoThrow.js';
import { spawnSync } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from './fs-native.js';
// Import getCleanEnv for local use AND re-export for backwards compatibility
// (many files import it from here; moving to clean-env.ts broke circular dependency)
import { getCleanEnv } from './clean-env.js';
export { getCleanEnv };

export interface ClaudeCliStatus {
  /** Whether Claude CLI is available and working */
  available: boolean;

  /** Whether the claude command exists (binary, function, or alias) */
  commandExists: boolean;

  /** Whether plugin commands work */
  pluginCommandsWork: boolean;

  /** Claude CLI version if available */
  version?: string;

  /** Specific error if detection failed */
  error?: 'command_not_found' | 'plugin_commands_not_supported' | 'permission_denied' | 'version_check_failed' | 'unknown';

  /** Error message for debugging */
  errorMessage?: string;

  /** Full path to claude command (if binary) */
  commandPath?: string;

  /** How claude was found: 'binary', 'function', 'alias', or 'npm-global' */
  detectionMethod?: 'binary' | 'function' | 'alias' | 'npm-global';

  /** Exit code from failed command */
  exitCode?: number;

  /** Stdout from failed command (for debugging) */
  debugStdout?: string;

  /** Stderr from failed command (for debugging) */
  debugStderr?: string;

  /** Platform information */
  platform: NodeJS.Platform;

  /** Whether CLI is installed but detection was via shell workaround */
  shellWorkaround?: boolean;
}

/**
 * Robustly detect if Claude CLI is available and working
 *
 * This function uses multiple detection strategies:
 * 1. Check if 'claude' binary exists in PATH (which/where)
 * 2. Check common npm global install locations directly
 * 3. Try running 'claude --version' via shell (catches shell functions/aliases)
 * 4. Verify plugin commands are supported
 *
 * @returns Detailed status about Claude CLI availability
 *
 * @example
 * ```typescript
 * const status = detectClaudeCli();
 * if (status.available) {
 *   console.log('Claude CLI is ready!');
 * } else if (status.commandExists && !status.pluginCommandsWork) {
 *   console.log('Claude CLI found but plugin commands not working');
 * } else {
 *   console.log('Claude CLI not installed');
 * }
 * ```
 */
// getCleanEnv is now imported from clean-env.ts and re-exported above
// This avoids circular dependency: execFileNoThrow.ts <-> claude-cli-detector.ts

/**
 * Try multiple methods to verify plugin commands work
 * ROBUST FALLBACK CHAIN for different environments and shell configs
 */
function tryPluginCheck(
  commandPath: string | undefined,
  shellWorkaround: boolean | undefined,
  isDebug: boolean
): { success: boolean; stdout: string; stderr: string; exitCode: number } {
  const cleanEnv = getCleanEnv();
  const methods = [
    // Method 1: Direct binary via execFileSync (fastest, works in most cases)
    () => {
      if (!commandPath || shellWorkaround) return null;
      if (isDebug) console.error(`\n  [Plugin Check] Method 1: execFileNoThrowSync direct binary`);
      return execFileNoThrowSync(commandPath, ['plugin', '--help'], { timeout: 10000, env: cleanEnv });
    },

    // Method 2: spawnSync with explicit env (handles some edge cases)
    () => {
      if (!commandPath || shellWorkaround) return null;
      if (isDebug) console.error(`  [Plugin Check] Method 2: spawnSync with explicit env`);
      const result = spawnSync(commandPath, ['plugin', '--help'], {
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...cleanEnv, TERM: 'dumb', NO_COLOR: '1' },
      });
      return {
        success: result.status === 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.status ?? 1,
      };
    },

    // Method 3: spawnSync with shell: true (handles PATH issues)
    () => {
      if (isDebug) console.error(`  [Plugin Check] Method 3: spawnSync with shell: true`);
      const cmd = commandPath || 'claude';
      const result = spawnSync(cmd, ['plugin', '--help'], {
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 1024 * 1024,
        shell: true,
        env: { ...cleanEnv, TERM: 'dumb', NO_COLOR: '1' },
      });
      return {
        success: result.status === 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.status ?? 1,
      };
    },

    // Method 4: Interactive shell (handles shell functions/aliases)
    () => {
      if (process.platform === 'win32') return null;
      if (isDebug) console.error(`  [Plugin Check] Method 4: Interactive shell`);
      return runViaInteractiveShell('claude plugin --help', isDebug);
    },
  ];

  for (const method of methods) {
    const result = method();
    if (result === null) continue; // Method not applicable

    if (result.success) {
      if (isDebug) console.error(`  [Plugin Check] ✓ Success!`);
      return result;
    }

    if (isDebug) {
      console.error(`  [Plugin Check] ✗ Failed (exit: ${result.exitCode})`);
    }
  }

  // All methods failed, return the last result
  if (isDebug) console.error(`  [Plugin Check] All methods failed!`);
  return {
    success: false,
    stdout: '',
    stderr: 'All plugin check methods failed',
    exitCode: 1,
  };
}

export function detectClaudeCli(): ClaudeCliStatus {
  const status: ClaudeCliStatus = {
    available: false,
    commandExists: false,
    pluginCommandsWork: false,
    platform: process.platform,
  };

  const isDebug = process.env.DEBUG === 'true' || process.env.SPECWEAVE_DEBUG === 'true';

  if (isDebug) {
    console.error('\n[DEBUG] Claude CLI Detection:');
    console.error(`  Platform: ${process.platform}`);
  }

  // Strategy 1: Check if 'claude' command exists using which/where
  const whichCommand = process.platform === 'win32' ? 'where' : 'which';
  const whichResult = execFileNoThrowSync(whichCommand, ['claude']);

  if (isDebug) {
    console.error(`\n  Strategy 1: ${whichCommand} claude`);
    console.error(`    Result: ${whichResult.success ? 'found' : 'not found'}`);
    if (whichResult.success) {
      console.error(`    Path: ${whichResult.stdout.trim()}`);
    }
  }

  if (whichResult.success) {
    status.commandExists = true;
    status.commandPath = whichResult.stdout.trim().split('\n')[0];
    status.detectionMethod = 'binary';
  }

  // Strategy 2: Check common npm global locations directly (fallback)
  if (!status.commandExists && process.platform !== 'win32') {
    const npmGlobalPaths = getNpmGlobalPaths();

    if (isDebug) {
      console.error(`\n  Strategy 2: Check npm global paths`);
      console.error(`    Paths to check: ${npmGlobalPaths.join(', ')}`);
    }

    for (const npmPath of npmGlobalPaths) {
      const claudePath = path.join(npmPath, 'claude');
      if (fs.existsSync(claudePath)) {
        status.commandExists = true;
        status.commandPath = claudePath;
        status.detectionMethod = 'npm-global';
        if (isDebug) {
          console.error(`    Found at: ${claudePath}`);
        }
        break;
      }
    }
  }

  // Strategy 3: Try running claude via interactive shell (catches functions/aliases)
  // This is the KEY fix for shell functions defined in .zshrc/.bashrc
  if (!status.commandExists && process.platform !== 'win32') {
    if (isDebug) {
      console.error(`\n  Strategy 3: Try via interactive shell (zsh -ic / bash -ic)`);
    }

    const shellResult = tryClaudeViaInteractiveShell(isDebug);
    if (shellResult.success) {
      status.commandExists = true;
      status.detectionMethod = shellResult.method;
      status.shellWorkaround = true;
      status.version = shellResult.version;

      if (isDebug) {
        console.error(`    Found via ${shellResult.method}!`);
        console.error(`    Version: ${shellResult.version}`);
      }
    }
  }

  // If command not found after all strategies, return early
  if (!status.commandExists) {
    status.error = 'command_not_found';
    status.errorMessage = 'claude command not found (checked: PATH, npm global, shell functions)';
    status.debugStdout = whichResult.stdout;
    status.debugStderr = whichResult.stderr;
    status.exitCode = whichResult.exitCode;
    return status;
  }

  // Step 2: Verify we can run the command (--version check)
  // If we already got version via shell workaround, skip this
  //
  // CRITICAL INSIGHT: If we found the binary via `which`, call it DIRECTLY.
  // Shell functions (like user's wrapper that adds --dangerously-skip-permissions)
  // are meant for INTERACTIVE use. For programmatic access, we want the raw binary.
  // This avoids issues where the wrapper function interferes with our commands.
  //
  // Only use interactive shell if:
  // 1. We DIDN'T find a binary (status.commandPath is undefined)
  // 2. AND we found claude via shell function/alias (Strategy 3)
  if (!status.version) {
    let versionResult;

    // Use clean env to avoid debugger flags (NODE_OPTIONS) interfering with child process
    const cleanEnv = getCleanEnv();

    // If we have a direct path to the binary, use it directly (bypass shell functions)
    if (status.commandPath && !status.shellWorkaround) {
      if (isDebug) {
        console.error(`\n  Using direct binary path: ${status.commandPath}`);
      }
      versionResult = execFileNoThrowSync(status.commandPath, ['--version'], { timeout: 10000, env: cleanEnv });
    } else if (process.platform !== 'win32') {
      // No binary found, but command exists via shell function - use interactive shell
      if (isDebug) {
        console.error(`\n  Using interactive shell (no direct binary found)`);
      }
      versionResult = runViaInteractiveShell('claude --version', isDebug);
    } else {
      // Windows: use shell for PATH resolution
      versionResult = execFileNoThrowSync('claude', ['--version'], { timeout: 10000, shell: true, env: cleanEnv });
    }

    if (isDebug) {
      console.error(`\n  Version check (claude --version):`);
      console.error(`    Success: ${versionResult.success}`);
      console.error(`    Exit code: ${versionResult.exitCode}`);
      console.error(`    Stdout: "${versionResult.stdout}"`);
      console.error(`    Stderr: "${versionResult.stderr}"`);
    }

    if (!versionResult.success) {
      status.debugStdout = versionResult.stdout;
      status.debugStderr = versionResult.stderr;
      status.exitCode = versionResult.exitCode;

      const errorStr = `${versionResult.stderr} ${versionResult.stdout}`.toLowerCase();

      if (errorStr.includes('eacces') || errorStr.includes('permission')) {
        status.error = 'permission_denied';
        status.errorMessage = 'Permission denied when running claude command';
      } else if (errorStr.includes('enoent') || errorStr.includes('not found')) {
        status.error = 'command_not_found';
        status.errorMessage = 'claude command exists but cannot be executed';
      } else if (versionResult.exitCode === 127) {
        status.error = 'command_not_found';
        status.errorMessage = 'Command not found (exit code 127)';
      } else {
        status.error = 'version_check_failed';
        status.errorMessage = `claude --version failed with exit code ${versionResult.exitCode}`;
      }

      return status;
    }

    status.version = versionResult.stdout.trim();
  }

  // Step 3: Verify plugin commands are supported
  // ROBUST FALLBACK CHAIN: Try multiple methods to ensure detection works
  // across different environments, shell configurations, and Node.js versions
  let pluginHelpResult = tryPluginCheck(status.commandPath, status.shellWorkaround, isDebug);

  if (isDebug) {
    console.error(`\n  Plugin check (claude plugin --help):`);
    console.error(`    Success: ${pluginHelpResult.success}`);
    console.error(`    Exit code: ${pluginHelpResult.exitCode}`);
    console.error(`    Stdout: "${pluginHelpResult.stdout.substring(0, 100)}..."`);
  }

  if (!pluginHelpResult.success) {
    status.error = 'plugin_commands_not_supported';
    status.errorMessage = 'claude plugin commands not supported or not working';
    status.debugStdout = pluginHelpResult.stdout;
    status.debugStderr = pluginHelpResult.stderr;
    status.exitCode = pluginHelpResult.exitCode;
    return status;
  }

  status.pluginCommandsWork = true;

  // All checks passed!
  status.available = true;

  if (isDebug) {
    console.error(`\n  ✅ All checks passed! Claude CLI is ready.`);
    if (status.shellWorkaround) {
      console.error(`  ℹ️  Note: Detected via shell ${status.detectionMethod} (not direct binary)`);
    }
    console.error('');
  }

  return status;
}

/**
 * Get common npm global bin paths for the current platform
 */
function getNpmGlobalPaths(): string[] {
  const paths: string[] = [];
  const home = os.homedir();

  if (process.platform === 'darwin') {
    // macOS: Common locations for npm global installs
    paths.push('/usr/local/bin');
    paths.push('/opt/homebrew/bin');
    paths.push(path.join(home, '.npm-global', 'bin'));
    // ~/.local/bin - Claude Code official installer uses this location
    paths.push(path.join(home, '.local', 'bin'));
    paths.push(path.join(home, '.nvm', 'versions', 'node')); // Will need to search subdirs
    // Check nvm current version
    const nvmDir = path.join(home, '.nvm', 'versions', 'node');
    if (fs.existsSync(nvmDir)) {
      try {
        const versions = fs.readdirSync(nvmDir);
        for (const version of versions) {
          paths.push(path.join(nvmDir, version, 'bin'));
        }
      } catch {
        // Ignore read errors
      }
    }
  } else if (process.platform === 'linux') {
    paths.push('/usr/local/bin');
    paths.push('/usr/bin');
    paths.push(path.join(home, '.npm-global', 'bin'));
    paths.push(path.join(home, '.local', 'bin'));
    // nvm paths
    const nvmDir = path.join(home, '.nvm', 'versions', 'node');
    if (fs.existsSync(nvmDir)) {
      try {
        const versions = fs.readdirSync(nvmDir);
        for (const version of versions) {
          paths.push(path.join(nvmDir, version, 'bin'));
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  return paths;
}

/**
 * Try to run claude via interactive shell to detect shell functions/aliases
 */
function tryClaudeViaInteractiveShell(isDebug: boolean): {
  success: boolean;
  method?: 'function' | 'alias';
  version?: string;
} {
  // Determine user's shell
  const userShell = process.env.SHELL || '/bin/bash';
  const isZsh = userShell.includes('zsh');

  // Try zsh first if it's the user's shell, otherwise bash
  const shells = isZsh ? ['zsh', 'bash'] : ['bash', 'zsh'];

  for (const shell of shells) {
    // Use -i for interactive (loads .zshrc/.bashrc) and -c for command
    // Note: Some systems may not have zsh, so we fall back
    const result = execFileNoThrowSync(shell, ['-ic', 'claude --version'], {
      timeout: 15000, // Longer timeout for interactive shell startup
      env: {
        ...process.env,
        // Prevent shell from printing welcome messages
        BASH_SILENCE_DEPRECATION_WARNING: '1',
      },
    });

    if (isDebug) {
      console.error(`    ${shell} -ic 'claude --version': ${result.success ? 'OK' : 'FAIL'}`);
      if (result.success) {
        console.error(`      Version: ${result.stdout.trim()}`);
      } else {
        console.error(`      Exit code: ${result.exitCode}`);
        console.error(`      Stderr: ${result.stderr.substring(0, 100)}`);
      }
    }

    if (result.success && result.stdout.includes('claude')) {
      // It works! Now determine if it's a function or alias
      const typeResult = execFileNoThrowSync(shell, ['-ic', 'type claude'], {
        timeout: 5000,
      });

      let method: 'function' | 'alias' = 'function';
      if (typeResult.success) {
        const typeOutput = typeResult.stdout.toLowerCase();
        if (typeOutput.includes('alias')) {
          method = 'alias';
        } else if (typeOutput.includes('function')) {
          method = 'function';
        }
      }

      return {
        success: true,
        method,
        version: result.stdout.trim(),
      };
    }
  }

  return { success: false };
}

/**
 * Run a command via interactive shell (for when claude is a shell function)
 */
function runViaInteractiveShell(
  command: string,
  isDebug: boolean
): { success: boolean; stdout: string; stderr: string; exitCode: number; error?: Error } {
  const userShell = process.env.SHELL || '/bin/bash';
  const isZsh = userShell.includes('zsh');
  const shell = isZsh ? 'zsh' : 'bash';

  // Use clean env to avoid debugger flags (NODE_OPTIONS) interfering with child process
  const cleanEnv = getCleanEnv();
  const result = execFileNoThrowSync(shell, ['-ic', command], {
    timeout: 15000,
    env: {
      ...cleanEnv,
      BASH_SILENCE_DEPRECATION_WARNING: '1',
    },
  });

  if (isDebug) {
    console.error(`    Running via ${shell} -ic: ${command}`);
    console.error(`    Success: ${result.success}, Exit: ${result.exitCode}`);
  }

  return result;
}

/**
 * Simple boolean check for quick availability testing
 * Use this when you just need a yes/no answer.
 *
 * @returns true if Claude CLI is fully functional, false otherwise
 */
export function isClaudeCliAvailable(): boolean {
  return detectClaudeCli().available;
}

/**
 * Get human-readable diagnostic message based on CLI status
 *
 * @param status - Status from detectClaudeCli()
 * @returns Diagnostic message explaining the issue
 */
export function getClaudeCliDiagnostic(status: ClaudeCliStatus): string {
  if (status.available) {
    return `Claude CLI is working (version: ${status.version})`;
  }

  // Build detailed diagnostic with all available info
  const parts: string[] = [];

  switch (status.error) {
    case 'command_not_found':
      parts.push('Claude CLI not found in PATH');
      break;

    case 'permission_denied':
      parts.push('Permission denied when running Claude CLI');
      if (status.commandPath) {
        parts.push(`(at ${status.commandPath})`);
      }
      break;

    case 'version_check_failed':
      parts.push('Claude CLI found but version check failed');
      if (status.exitCode !== undefined) {
        parts.push(`(exit code: ${status.exitCode})`);
      }
      if (!status.debugStdout && !status.debugStderr) {
        parts.push('- produced no output');
      }
      break;

    case 'plugin_commands_not_supported':
      parts.push('Claude CLI found but plugin commands not working');
      if (status.version) {
        parts.push(`(version: ${status.version})`);
      }
      break;

    case 'unknown':
    default:
      parts.push('Claude CLI issue');
      if (status.errorMessage) {
        parts.push(`- ${status.errorMessage}`);
      }
  }

  // Add debugging hints if we have diagnostic data
  if (process.env.DEBUG === 'true' || process.env.SPECWEAVE_DEBUG === 'true') {
    if (status.commandPath) {
      parts.push(`\n  Path: ${status.commandPath}`);
    }
    if (status.exitCode !== undefined) {
      parts.push(`\n  Exit code: ${status.exitCode}`);
    }
    if (status.debugStdout) {
      parts.push(`\n  Stdout: "${status.debugStdout.substring(0, 200)}"`);
    }
    if (status.debugStderr) {
      parts.push(`\n  Stderr: "${status.debugStderr.substring(0, 200)}"`);
    }
  }

  return parts.join(' ');
}

/**
 * Get actionable suggestions for fixing Claude CLI issues
 *
 * @param status - Status from detectClaudeCli()
 * @returns Array of suggested actions
 */
export function getClaudeCliSuggestions(status: ClaudeCliStatus): string[] {
  if (status.available) {
    return [];
  }

  const suggestions: string[] = [];

  switch (status.error) {
    case 'command_not_found':
      suggestions.push('Claude Code CLI not found.');
      suggestions.push('');
      suggestions.push('Install globally via npm:');
      suggestions.push('  → npm install -g @anthropic-ai/claude-code');
      suggestions.push('');
      suggestions.push('Or download from:');
      suggestions.push('  → https://claude.com/code');
      suggestions.push('');
      suggestions.push('NOTE: If you have a shell function/alias for "claude" in .zshrc/.bashrc,');
      suggestions.push('the actual binary must also be installed for SpecWeave to use it.');
      suggestions.push('Shell functions wrap the binary but don\'t replace it.');
      break;

    case 'permission_denied':
      suggestions.push('Fix permissions:');
      if (process.platform === 'win32') {
        suggestions.push('  → Run terminal as Administrator');
        suggestions.push('  → Or reinstall: npm install -g @anthropic-ai/claude-code');
      } else {
        if (status.commandPath) {
          suggestions.push(`  → Check permissions: ls -la "${status.commandPath}"`);
        }
        suggestions.push('  → Or reinstall: npm install -g @anthropic-ai/claude-code');
      }
      break;

    case 'version_check_failed':
      suggestions.push('The command exists but is not responding correctly.');
      suggestions.push('');
      suggestions.push('Try these troubleshooting steps:');
      if (status.commandPath) {
        suggestions.push(`  1. Check what 'claude' actually is: file "${status.commandPath}"`);
      }
      suggestions.push('  2. Try running manually: claude --version');
      suggestions.push('  3. Check if it\'s a different tool named "claude"');
      suggestions.push('');
      suggestions.push('If it\'s NOT the Claude Code CLI:');
      suggestions.push('  → Rename or remove the conflicting command');
      suggestions.push('  → Install Claude Code CLI: npm install -g @anthropic-ai/claude-code');
      suggestions.push('');
      suggestions.push('Enable debug mode for more details:');
      suggestions.push('  → DEBUG=true specweave init .');
      break;

    case 'plugin_commands_not_supported':
      suggestions.push('Claude CLI found but plugin commands don\'t work.');
      suggestions.push('');
      suggestions.push('This could mean:');
      suggestions.push('  • Outdated version (plugin support added recently)');
      suggestions.push('  • Different CLI tool named "claude"');
      suggestions.push('  • Corrupted installation');
      suggestions.push('');
      suggestions.push('Try updating:');
      suggestions.push('  → npm update -g @anthropic-ai/claude-code');
      suggestions.push('');
      suggestions.push('If that fails, reinstall:');
      suggestions.push('  → npm uninstall -g @anthropic-ai/claude-code');
      suggestions.push('  → npm install -g @anthropic-ai/claude-code');
      break;

    case 'unknown':
    default:
      suggestions.push('Unexpected error with Claude CLI.');
      suggestions.push('');
      suggestions.push('Try these troubleshooting steps:');
      suggestions.push('  1. Run with debug mode: DEBUG=true specweave init .');
      suggestions.push('  2. Check version manually: claude --version');
      suggestions.push('  3. Verify plugin support: claude plugin --help');
      suggestions.push('  4. Reinstall if needed: npm install -g @anthropic-ai/claude-code');
      suggestions.push('');
      if (status.commandPath) {
        suggestions.push(`  Path: ${status.commandPath}`);
      }
      if (status.exitCode !== undefined) {
        suggestions.push(`  Exit code: ${status.exitCode}`);
      }
      break;
  }

  return suggestions;
}
