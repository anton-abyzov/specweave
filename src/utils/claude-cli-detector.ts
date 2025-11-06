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
  error?: 'command_not_found' | 'plugin_commands_not_supported' | 'permission_denied' | 'unknown';

  /** Error message for debugging */
  errorMessage?: string;
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
  };

  // Step 1: Check if 'claude' command exists using which/where
  const whichCommand = process.platform === 'win32' ? 'where' : 'which';
  const whichResult = execFileNoThrowSync(whichCommand, ['claude']);

  if (!whichResult.success) {
    status.error = 'command_not_found';
    status.errorMessage = 'claude command not found in PATH';
    return status;
  }

  status.commandExists = true;

  // Step 2: Verify we can run the command (--version check)
  const versionResult = execFileNoThrowSync('claude', ['--version'], {
    timeout: 5000, // 5 second timeout
  });

  if (!versionResult.success) {
    if (versionResult.stderr?.includes('EACCES') || versionResult.stderr?.includes('permission')) {
      status.error = 'permission_denied';
      status.errorMessage = 'Permission denied when running claude command';
    } else {
      status.error = 'unknown';
      status.errorMessage = `Failed to run claude --version: ${versionResult.stderr || versionResult.stdout}`;
    }
    return status;
  }

  status.version = versionResult.stdout.trim();

  // Step 3: Verify plugin commands are supported
  const pluginHelpResult = execFileNoThrowSync('claude', ['plugin', '--help'], {
    timeout: 5000,
  });

  if (!pluginHelpResult.success) {
    status.error = 'plugin_commands_not_supported';
    status.errorMessage = 'claude plugin commands not supported or not working';
    return status;
  }

  status.pluginCommandsWork = true;

  // All checks passed!
  status.available = true;
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

  switch (status.error) {
    case 'command_not_found':
      return 'Claude CLI not found in PATH. Install via: npm install -g @anthropic-ai/claude-code';

    case 'permission_denied':
      return 'Permission denied when running Claude CLI. Check file permissions or try running with appropriate access.';

    case 'plugin_commands_not_supported':
      return 'Claude CLI found but plugin commands not working. This may be an outdated version or broken installation.';

    case 'unknown':
      return `Claude CLI found but not working properly: ${status.errorMessage}`;

    default:
      return 'Unknown issue with Claude CLI';
  }
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
      suggestions.push('Alternative: Use Claude Code IDE and run commands there');
      suggestions.push('  → Open project in Claude Code');
      suggestions.push('  → Run: /plugin install specweave@specweave');
      break;

    case 'permission_denied':
      suggestions.push('Fix permissions:');
      if (process.platform === 'win32') {
        suggestions.push('  → Run terminal as Administrator');
        suggestions.push('  → Or reinstall Claude CLI with: npm install -g @anthropic-ai/claude-code');
      } else {
        suggestions.push('  → Check file permissions: ls -la $(which claude)');
        suggestions.push('  → Or reinstall: npm install -g @anthropic-ai/claude-code');
      }
      break;

    case 'plugin_commands_not_supported':
      suggestions.push('Update Claude CLI:');
      suggestions.push('  → npm update -g @anthropic-ai/claude-code');
      suggestions.push('');
      suggestions.push('If that doesn\'t work, reinstall:');
      suggestions.push('  → npm uninstall -g @anthropic-ai/claude-code');
      suggestions.push('  → npm install -g @anthropic-ai/claude-code');
      break;

    case 'unknown':
      suggestions.push('Try these troubleshooting steps:');
      suggestions.push('  1. Check Claude CLI version: claude --version');
      suggestions.push('  2. Try running manually: claude plugin list');
      suggestions.push('  3. Reinstall if needed: npm install -g @anthropic-ai/claude-code');
      break;
  }

  return suggestions;
}
