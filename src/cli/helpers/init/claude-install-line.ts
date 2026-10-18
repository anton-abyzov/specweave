import chalk from 'chalk';

/**
 * The line init prints after writing Claude Code files. A `claude` command that
 * failed its check gets a warning instead of the clean-install message.
 */
export function claudeInstallLine(issue: string | undefined, cleanMessage: string): string {
  return issue
    ? chalk.yellow(`⚠️  Claude Code files written, but the claude command failed its check (${issue}); plugins may need a manual install`)
    : cleanMessage;
}
