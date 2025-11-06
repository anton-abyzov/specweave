/**
 * Claude CLI Detection Utility
 *
 * Provides robust detection of Claude Code CLI with comprehensive validation.
 * Goes beyond checking if 'claude' exists - verifies it can actually run plugin commands.
 */

import { execFileNoThrowSync } from './execFileNoThrow.js';

export interface ClaudeCliStatus {
  /** Whether Claude CLI is available and working */
  available: boolean;

  /** Whether the claude command exists in PATH */
  commandExists: boolean;

  /** Whether plugin commands work */
  pluginCommandsWork: boolean;

  /** Claude CLI version if available */
  version?: string;

  /** Specific error if detection failed */
  error?: 'command_not_found' | 'plugin_commands_not_supported' | 'permission_denied' | 'version_check_failed' | 'unknown';

  /** Error message for debugging */
  errorMessage?: string;

  /** Full path to claude command */
  commandPath?: string;

  /** Exit code from failed command */
  exitCode?: number;

  /** Stdout from failed command (for debugging) */
  debugStdout?: string;

  /** Stderr from failed command (for debugging) */
  debugStderr?: string;

  /** Platform information */
  platform: NodeJS.Platform;
}

/**
 * Robustly detect if Claude CLI is available and working
 *
 * Unlike simple `which claude` checks, this function:
 * 1. Checks if 'claude' command exists in PATH
 * 2. Verifies it can run --version (basic sanity check)
 * 3. Verifies plugin commands are supported (claude plugin --help)
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
export function detectClaudeCli(): ClaudeCliStatus {
  const status: ClaudeCliStatus = {
    available: false,
    commandExists: false,
    pluginCommandsWork: false,
    platform: process.platform,
  };

  const isDebug = process.env.DEBUG === 'true' || process.env.SPECWEAVE_DEBUG === 'true';

  // Step 1: Check if 'claude' command exists using which/where
  const whichCommand = process.platform === 'win32' ? 'where' : 'which';
  const whichResult = execFileNoThrowSync(whichCommand, ['claude']);

  if (isDebug) {
    console.error('\n[DEBUG] Claude CLI Detection:');
    console.error(`  Platform: ${process.platform}`);
    console.error(`  Which command: ${whichCommand}`);
    console.error(`  Which result: ${whichResult.success ? 'found' : 'not found'}`);
    if (whichResult.success) {
      console.error(`  Path: ${whichResult.stdout.trim()}`);
    }
  }

  if (!whichResult.success) {
    status.error = 'command_not_found';
    status.errorMessage = 'claude command not found in PATH';
    status.debugStdout = whichResult.stdout;
    status.debugStderr = whichResult.stderr;
    status.exitCode = whichResult.exitCode;
    return status;
  }

  status.commandExists = true;
  status.commandPath = whichResult.stdout.trim().split('\n')[0]; // First line if multiple paths

  // Step 2: Verify we can run the command (--version check)
  const versionResult = execFileNoThrowSync('claude', ['--version'], {
    timeout: 10000, // Increased to 10 seconds for slow systems
  });

  if (isDebug) {
    console.error(`\n  Version check (claude --version):`);
    console.error(`    Success: ${versionResult.success}`);
    console.error(`    Exit code: ${versionResult.exitCode}`);
    console.error(`    Stdout: "${versionResult.stdout}"`);
    console.error(`    Stderr: "${versionResult.stderr}"`);
    if (versionResult.error) {
      console.error(`    Error code: ${(versionResult.error as any).code}`);
      console.error(`    Error message: ${versionResult.error.message}`);
    }
  }

  if (!versionResult.success) {
    // Capture full diagnostic info
    status.debugStdout = versionResult.stdout;
    status.debugStderr = versionResult.stderr;
    status.exitCode = versionResult.exitCode;

    // Classify the error
    const errorStr = `${versionResult.stderr} ${versionResult.stdout}`.toLowerCase();

    if (errorStr.includes('eacces') || errorStr.includes('permission')) {
      status.error = 'permission_denied';
      status.errorMessage = 'Permission denied when running claude command';
    } else if (errorStr.includes('enoent') || errorStr.includes('not found')) {
      status.error = 'command_not_found';
      status.errorMessage = 'claude command exists in PATH but cannot be executed';
    } else if (versionResult.exitCode === 127) {
      status.error = 'command_not_found';
      status.errorMessage = 'Command not found (exit code 127)';
    } else if (!versionResult.stdout && !versionResult.stderr) {
      status.error = 'version_check_failed';
      status.errorMessage = `claude --version produced no output (exit code: ${versionResult.exitCode})`;
    } else {
      status.error = 'version_check_failed';
      status.errorMessage = `claude --version failed with exit code ${versionResult.exitCode}`;
    }

    return status;
  }

  status.version = versionResult.stdout.trim();

  // Step 3: Verify plugin commands are supported
  const pluginHelpResult = execFileNoThrowSync('claude', ['plugin', '--help'], {
    timeout: 10000,
  });

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
    console.error(`\n  ✅ All checks passed! Claude CLI is ready.\n`);
  }

  return status;
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
      suggestions.push('Install Claude Code CLI via npm:');
      suggestions.push('  → npm install -g @anthropic-ai/claude-code');
      suggestions.push('');
      suggestions.push('Or download from:');
      suggestions.push('  → https://claude.com/code');
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
