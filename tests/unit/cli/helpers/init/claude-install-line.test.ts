import { describe, it, expect } from 'vitest';
import { claudeInstallLine } from '../../../../../src/cli/helpers/init/claude-install-line.js';

describe('claudeInstallLine', () => {
  it('prints the clean message when the claude command passed its check', () => {
    expect(claudeInstallLine(undefined, 'Claude Code native complete')).toBe('Claude Code native complete');
  });

  it('warns instead of claiming a clean install when the check failed', () => {
    const line = claudeInstallLine('version_check_failed', 'Claude Code native complete');
    expect(line).toContain('failed its check (version_check_failed)');
    expect(line).not.toContain('native complete');
  });
});
