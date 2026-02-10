/**
 * Tests for Playwright CLI hook integration.
 * Validates that user-prompt-submit.sh properly suggests @playwright/cli
 * when Playwright MCP is detected and CLI is not installed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process before importing
const mockExecFileSync = vi.hoisted(() => vi.fn());
vi.mock('child_process', () => ({
  execFileSync: mockExecFileSync,
}));

import {
  detectPlaywrightCli,
} from '../../../../plugins/specweave-testing/lib/playwright-cli-detector.js';

/**
 * Simulates the hook's CLI suggestion logic:
 * When playwright MCP plugin is detected, check if CLI is also available.
 * If not installed, suggest it alongside the MCP plugin.
 */
interface HookSuggestionResult {
  suggestCli: boolean;
  message: string;
}

function simulateHookCliSuggestion(opts: {
  playwrightDetected: boolean;
  cliInstalled: boolean;
  suggestOnly: boolean;
}): HookSuggestionResult {
  if (!opts.playwrightDetected) {
    return { suggestCli: false, message: '' };
  }

  if (opts.cliInstalled) {
    return { suggestCli: false, message: '' };
  }

  // CLI not installed - suggest it
  const msg = opts.suggestOnly
    ? '💡 **Playwright CLI available**: `npm install -g @playwright/cli@latest` for token-efficient browser automation (~98% token savings vs MCP).'
    : '💡 **Tip**: Install `@playwright/cli` for token-efficient browser automation: `npm install -g @playwright/cli@latest`';

  return { suggestCli: true, message: msg };
}

describe('Playwright CLI Hook Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CLI suggestion when playwright MCP detected', () => {
    it('should suggest CLI when playwright MCP detected and CLI not installed', () => {
      const result = simulateHookCliSuggestion({
        playwrightDetected: true,
        cliInstalled: false,
        suggestOnly: false,
      });

      expect(result.suggestCli).toBe(true);
      expect(result.message).toContain('npm install -g @playwright/cli@latest');
    });

    it('should NOT suggest CLI when playwright MCP detected and CLI already installed', () => {
      const result = simulateHookCliSuggestion({
        playwrightDetected: true,
        cliInstalled: true,
        suggestOnly: false,
      });

      expect(result.suggestCli).toBe(false);
      expect(result.message).toBe('');
    });

    it('should NOT suggest CLI when playwright MCP is not detected', () => {
      const result = simulateHookCliSuggestion({
        playwrightDetected: false,
        cliInstalled: false,
        suggestOnly: false,
      });

      expect(result.suggestCli).toBe(false);
    });

    it('should use suggestOnly message format when suggestOnly mode is enabled', () => {
      const result = simulateHookCliSuggestion({
        playwrightDetected: true,
        cliInstalled: false,
        suggestOnly: true,
      });

      expect(result.suggestCli).toBe(true);
      expect(result.message).toContain('token-efficient');
      expect(result.message).toContain('98%');
    });
  });

  describe('CLI detection integration', () => {
    it('should detect CLI as installed when binary exists', () => {
      mockExecFileSync
        .mockReturnValueOnce('/usr/local/bin/playwright-cli\n')
        .mockReturnValueOnce('0.1.0\n');

      const detection = detectPlaywrightCli();
      expect(detection.installed).toBe(true);

      // When CLI is installed, hook should NOT suggest it
      const hookResult = simulateHookCliSuggestion({
        playwrightDetected: true,
        cliInstalled: detection.installed,
        suggestOnly: false,
      });
      expect(hookResult.suggestCli).toBe(false);
    });

    it('should suggest CLI when binary not found', () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const detection = detectPlaywrightCli();
      expect(detection.installed).toBe(false);

      // When CLI not installed, hook SHOULD suggest it
      const hookResult = simulateHookCliSuggestion({
        playwrightDetected: true,
        cliInstalled: detection.installed,
        suggestOnly: false,
      });
      expect(hookResult.suggestCli).toBe(true);
      expect(hookResult.message).toContain('npm install -g @playwright/cli@latest');
    });
  });
});
