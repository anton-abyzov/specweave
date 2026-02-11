/**
 * Tests for Playwright routing.
 * v1.0.240 (0198): All tasks route to CLI. MCP only as fallback when CLI unavailable.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDetect = vi.hoisted(() => vi.fn());
vi.mock('../../../../plugins/specweave-testing/lib/playwright-cli-detector.js', () => ({
  detectPlaywrightCli: mockDetect,
}));

import {
  resolvePlaywrightMode,
  type PlaywrightMode,
  type TaskType,
} from '../../../../plugins/specweave-testing/lib/playwright-routing.js';

describe('Playwright Routing Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolvePlaywrightMode', () => {
    describe('when CLI is available', () => {
      beforeEach(() => {
        mockDetect.mockReturnValue({ installed: true, version: '0.1.0', path: '/usr/bin/playwright-cli' });
      });

      it('should route ui-automate to CLI', () => {
        const mode = resolvePlaywrightMode('ui-automate');
        expect(mode).toBe<PlaywrightMode>('cli');
      });

      it('should route e2e-test-run to CLI', () => {
        const mode = resolvePlaywrightMode('e2e-test-run');
        expect(mode).toBe<PlaywrightMode>('cli');
      });

      it('should route screenshot to CLI', () => {
        const mode = resolvePlaywrightMode('screenshot');
        expect(mode).toBe<PlaywrightMode>('cli');
      });

      it('should route form-automation to CLI', () => {
        const mode = resolvePlaywrightMode('form-automation');
        expect(mode).toBe<PlaywrightMode>('cli');
      });

      it('should route ci-testing to CLI', () => {
        const mode = resolvePlaywrightMode('ci-testing');
        expect(mode).toBe<PlaywrightMode>('cli');
      });

      // 0198: inspection tasks now route to CLI too (CLI-only mode)
      it('should route ui-inspect to CLI', () => {
        const mode = resolvePlaywrightMode('ui-inspect');
        expect(mode).toBe<PlaywrightMode>('cli');
      });

      it('should route page-exploration to CLI', () => {
        const mode = resolvePlaywrightMode('page-exploration');
        expect(mode).toBe<PlaywrightMode>('cli');
      });

      it('should route self-healing-test to CLI', () => {
        const mode = resolvePlaywrightMode('self-healing-test');
        expect(mode).toBe<PlaywrightMode>('cli');
      });

      // 0198: comprehensive check — ALL task types route to CLI
      it('should route ALL task types to CLI', () => {
        const allTasks: TaskType[] = [
          'ui-automate', 'e2e-test-run', 'screenshot',
          'form-automation', 'ci-testing',
          'ui-inspect', 'page-exploration', 'self-healing-test',
        ];

        allTasks.forEach(task => {
          expect(resolvePlaywrightMode(task)).toBe<PlaywrightMode>('cli');
        });
      });
    });

    describe('when CLI is NOT available', () => {
      beforeEach(() => {
        mockDetect.mockReturnValue({ installed: false });
      });

      it('should fallback to MCP for all task types', () => {
        const tasks: TaskType[] = [
          'ui-automate', 'e2e-test-run', 'screenshot',
          'ui-inspect', 'page-exploration',
        ];

        tasks.forEach(task => {
          expect(resolvePlaywrightMode(task)).toBe<PlaywrightMode>('mcp');
        });
      });
    });

    describe('with preferCli config override', () => {
      beforeEach(() => {
        mockDetect.mockReturnValue({ installed: true, version: '0.1.0', path: '/usr/bin/playwright-cli' });
      });

      it('should force MCP when preferCli=false', () => {
        const mode = resolvePlaywrightMode('ui-automate', { preferCli: false });
        expect(mode).toBe<PlaywrightMode>('mcp');
      });

      it('should use CLI when preferCli=true (default behavior)', () => {
        const mode = resolvePlaywrightMode('ui-automate', { preferCli: true });
        expect(mode).toBe<PlaywrightMode>('cli');
      });
    });
  });
});
