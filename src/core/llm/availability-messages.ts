/**
 * Claude Code Availability Messages
 *
 * Provides clear, actionable messaging when Claude Code is not available,
 * with platform-specific installation instructions and alternative options.
 */

import * as os from 'os';

export interface ClaudeAvailabilityInfo {
  available: boolean;
  cliInstalled: boolean;
  authExists: boolean;
  platform: string;
  error?: string;
}

export interface AvailabilityMessage {
  title: string;
  message: string;
  instructions: string[];
  alternatives: string[];
  learnMore: string;
}

/**
 * Get user-friendly availability message based on Claude status
 */
export function getAvailabilityMessage(status: ClaudeAvailabilityInfo): AvailabilityMessage {
  if (status.available) {
    return {
      title: 'Claude Code Ready',
      message: 'Claude Code CLI is installed and authenticated.',
      instructions: [],
      alternatives: [],
      learnMore: 'https://claude.ai/download',
    };
  }

  const platform = os.platform();

  if (!status.cliInstalled) {
    return getNotInstalledMessage(platform);
  }

  if (!status.authExists) {
    return getAuthMissingMessage(platform);
  }

  return getGenericErrorMessage(status.error || 'Unknown error', platform);
}

/**
 * Get message for Claude CLI not installed
 */
function getNotInstalledMessage(platform: string): AvailabilityMessage {
  const instructions: string[] = [];

  // Platform-specific installation instructions
  if (platform === 'darwin') {
    instructions.push(
      '1. Install via Homebrew (recommended):',
      '   brew install anthropic/tap/claude',
      '',
      '2. Or install via npm:',
      '   npm install -g @anthropic-ai/claude-code',
      '',
      '3. After installation, authenticate:',
      '   claude login',
    );
  } else if (platform === 'win32') {
    instructions.push(
      '1. Install via npm:',
      '   npm install -g @anthropic-ai/claude-code',
      '',
      '2. Or download from:',
      '   https://claude.ai/download',
      '',
      '3. After installation, authenticate:',
      '   claude login',
    );
  } else {
    // Linux and others
    instructions.push(
      '1. Install via npm:',
      '   npm install -g @anthropic-ai/claude-code',
      '',
      '2. After installation, authenticate:',
      '   claude login',
      '',
      '3. Ensure claude is in your PATH:',
      '   which claude',
    );
  }

  return {
    title: 'Claude Code Not Found',
    message: 'The Claude Code CLI is not installed or not in your PATH.',
    instructions,
    alternatives: [
      'Continue with "standard" analysis (no AI insights)',
      'Set up OpenAI API key for GPT-based analysis',
      'Configure a custom LLM provider in .specweave/config.json',
    ],
    learnMore: 'https://claude.ai/download',
  };
}

/**
 * Get message for authentication missing
 */
function getAuthMissingMessage(platform: string): AvailabilityMessage {
  const authDir = platform === 'win32' ? '%USERPROFILE%\\.claude\\' : '~/.claude/';

  return {
    title: 'Claude Code Not Authenticated',
    message: `Claude Code CLI is installed but not authenticated. Auth directory: ${authDir}`,
    instructions: [
      '1. Run the authentication command:',
      '   claude login',
      '',
      '2. Follow the browser prompts to sign in',
      '',
      '3. Verify authentication:',
      '   claude --version',
      '',
      'Note: You need a Claude MAX subscription for background AI analysis.',
    ],
    alternatives: [
      'Continue with "standard" analysis (no AI insights)',
      'Use API key authentication instead (set ANTHROPIC_API_KEY)',
    ],
    learnMore: 'https://claude.ai/settings',
  };
}

/**
 * Get message for generic errors
 */
function getGenericErrorMessage(error: string, platform: string): AvailabilityMessage {
  return {
    title: 'Claude Code Unavailable',
    message: `Claude Code CLI encountered an error: ${error}`,
    instructions: [
      '1. Check Claude CLI status:',
      '   claude --version',
      '',
      '2. Try re-authenticating:',
      '   claude logout && claude login',
      '',
      '3. Check for updates:',
      platform === 'darwin'
        ? '   brew upgrade anthropic/tap/claude'
        : '   npm update -g @anthropic-ai/claude-code',
      '',
      '4. Check network connectivity to claude.ai',
    ],
    alternatives: [
      'Continue with "standard" analysis (no AI insights)',
      'Retry in a few minutes (may be temporary)',
    ],
    learnMore: 'https://status.anthropic.com',
  };
}

/**
 * Format availability message for display
 */
export function formatAvailabilityMessage(msg: AvailabilityMessage): string {
  const lines: string[] = [];

  lines.push(`╔══════════════════════════════════════════════════════════════╗`);
  lines.push(`║ ${msg.title.padEnd(60)} ║`);
  lines.push(`╠══════════════════════════════════════════════════════════════╣`);
  lines.push(`║ ${msg.message.slice(0, 60).padEnd(60)} ║`);

  if (msg.instructions.length > 0) {
    lines.push(`╠══════════════════════════════════════════════════════════════╣`);
    lines.push(`║ Installation Instructions:                                   ║`);
    for (const instruction of msg.instructions) {
      if (instruction.length <= 60) {
        lines.push(`║   ${instruction.padEnd(58)} ║`);
      } else {
        // Wrap long lines
        lines.push(`║   ${instruction.slice(0, 58)} ║`);
        if (instruction.length > 58) {
          lines.push(`║   ${instruction.slice(58, 116).padEnd(58)} ║`);
        }
      }
    }
  }

  if (msg.alternatives.length > 0) {
    lines.push(`╠══════════════════════════════════════════════════════════════╣`);
    lines.push(`║ Alternatives:                                                ║`);
    for (const alt of msg.alternatives) {
      lines.push(`║   • ${alt.slice(0, 55).padEnd(55)} ║`);
    }
  }

  lines.push(`╠══════════════════════════════════════════════════════════════╣`);
  lines.push(`║ Learn more: ${msg.learnMore.padEnd(48)} ║`);
  lines.push(`╚══════════════════════════════════════════════════════════════╝`);

  return lines.join('\n');
}

/**
 * Get simple one-line error message for logs
 */
export function getSimpleErrorMessage(status: ClaudeAvailabilityInfo): string {
  if (status.available) {
    return 'Claude Code: Ready';
  }

  if (!status.cliInstalled) {
    return 'Claude Code: Not installed. Run: npm i -g @anthropic-ai/claude-code';
  }

  if (!status.authExists) {
    return 'Claude Code: Not authenticated. Run: claude login';
  }

  return `Claude Code: Error - ${status.error || 'Unknown'}`;
}
