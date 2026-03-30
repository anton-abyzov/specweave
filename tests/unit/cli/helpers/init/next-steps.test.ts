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

  it('shows AutoVerify tip for Claude adapter', async () => {
    const { showNextSteps } = await import(
      '../../../../../src/cli/helpers/init/next-steps.js'
    );
    showNextSteps('test-project', 'claude', 'en', true, { pluginAutoInstalled: true });
    const output = getOutput();
    expect(output).toContain('AutoVerify');
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
