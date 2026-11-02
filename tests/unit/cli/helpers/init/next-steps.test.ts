/**
 * Unit tests for next-steps.ts — AutoVerify tip display
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockLocaleT, mockGetLocaleManager } = vi.hoisted(() => {
  const mockLocaleT = vi.fn().mockImplementation((_ns: string, key: string) => `[${key}]`);
  return {
    mockLocaleT,
    mockGetLocaleManager: vi.fn().mockReturnValue({ t: mockLocaleT }),
  };
});

vi.mock('../../../../../src/core/i18n/locale-manager.js', () => ({
  getLocaleManager: mockGetLocaleManager,
}));

// ============================================================================
// Tests
// ============================================================================

describe('showNextSteps', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  function getOutput(): string {
    return consoleSpy.mock.calls.map(c => String(c[0] ?? '')).join('\n');
  }

  it('shows AutoVerify tip for Claude adapter inside Claude Code Desktop', async () => {
    vi.stubEnv('CLAUDE_CODE_ENTRYPOINT', 'claude-desktop');
    const { showNextSteps } = await import(
      '../../../../../src/cli/helpers/init/next-steps.js'
    );
    showNextSteps('test-project', 'claude', 'en', true, { pluginAutoInstalled: true });
    const output = getOutput();
    expect(output).toContain('AutoVerify');
    vi.unstubAllEnvs();
  });

  it('does not show the Desktop AutoVerify tip in a plain CLI run', async () => {
    vi.stubEnv('CLAUDE_CODE_ENTRYPOINT', '');
    const { showNextSteps } = await import(
      '../../../../../src/cli/helpers/init/next-steps.js'
    );
    showNextSteps('test-project', 'claude', 'en', true, { pluginAutoInstalled: true });
    expect(getOutput()).not.toContain('AutoVerify');
    vi.unstubAllEnvs();
  });

  it('does not number a status line as a step', async () => {
    const { showNextSteps } = await import(
      '../../../../../src/cli/helpers/init/next-steps.js'
    );
    showNextSteps('test-project', 'claude', 'en', true, { pluginAutoInstalled: true });
    const lines = getOutput().split('\n');
    expect(lines.find((l) => l.includes('All plugins ready'))).not.toMatch(/\d\./);
    expect(lines.find((l) => l.includes('specweave create-increment'))).toMatch(/^ {3}1\. /);
  });

  it.each(['claude', 'generic', 'cursor', 'codex'])('%s: step 1 is create-increment, at most 3 steps, no made-up commands', async (adapter) => {
    const { showNextSteps } = await import(
      '../../../../../src/cli/helpers/init/next-steps.js'
    );
    showNextSteps('test-project', adapter, 'en', true, { pluginAutoInstalled: false });
    const out = getOutput();
    const steps = out.split('\n').filter((l) => /^ {3}\d+\. /.test(l));
    expect(steps[0]).toMatch(/^ {3}1\. specweave create-increment "/);
    expect(steps.length).toBeLessThanOrEqual(3);
    expect(steps.map((l) => l.match(/^ {3}(\d+)\./)![1])).toEqual(steps.map((_, i) => String(i + 1)));
    expect(steps[1]).toContain('specweave task done T-01 --run');
    expect(out).not.toContain('specweave validate');
    expect(out).not.toContain('specweave config');
    // Tracker setup and `get` come after the loop, unnumbered.
    expect(out.indexOf('specweave sync setup')).toBeGreaterThan(out.indexOf('specweave create-increment'));
  });

  it('a new subdirectory adds the cd step before the loop', async () => {
    const { showNextSteps } = await import(
      '../../../../../src/cli/helpers/init/next-steps.js'
    );
    showNextSteps('test-project', 'generic', 'en', false);
    const steps = getOutput().split('\n').filter((l) => /^ {3}\d+\. /.test(l));
    expect(steps[1]).toMatch(/^ {3}2\. specweave create-increment "/);
  });

  it('does not show AutoVerify tip for non-Claude adapters', async () => {
    const { showNextSteps } = await import(
      '../../../../../src/cli/helpers/init/next-steps.js'
    );
    showNextSteps('test-project', 'cursor', 'en', true);
    const output = getOutput();
    expect(output).not.toContain('AutoVerify');
  });

  it('does not show AutoVerify tip for generic adapter', async () => {
    const { showNextSteps } = await import(
      '../../../../../src/cli/helpers/init/next-steps.js'
    );
    showNextSteps('test-project', 'generic', 'en', true);
    const output = getOutput();
    expect(output).not.toContain('AutoVerify');
  });
});
