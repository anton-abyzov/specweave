/**
 * Tests for Playwright CLI runner wrapper.
 * Manages CLI daemon lifecycle and parses output.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecFileSync = vi.hoisted(() => vi.fn());
vi.mock('child_process', () => ({
  execFileSync: mockExecFileSync,
}));

import {
  PlaywrightCliRunner,
  type CliRunnerConfig,
} from '../../../../plugins/specweave-testing/lib/playwright-cli-runner.js';

describe('PlaywrightCliRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create runner with default config (headless)', () => {
      const runner = new PlaywrightCliRunner();
      expect(runner.config.headed).toBe(false);
      expect(runner.config.browser).toBe('chrome');
    });

    it('should accept custom config', () => {
      const config: CliRunnerConfig = { headed: true, browser: 'firefox', session: 'test-session' };
      const runner = new PlaywrightCliRunner(config);
      expect(runner.config.headed).toBe(true);
      expect(runner.config.browser).toBe('firefox');
      expect(runner.config.session).toBe('test-session');
    });
  });

  describe('open', () => {
    it('should launch browser with URL', () => {
      mockExecFileSync.mockReturnValue('### Browser `default` opened\n');
      const runner = new PlaywrightCliRunner();
      const result = runner.open('https://example.com');

      expect(result.ok).toBe(true);
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'playwright-cli',
        expect.arrayContaining(['open', 'https://example.com']),
        expect.any(Object),
      );
    });

    it('should pass --headed flag when configured', () => {
      mockExecFileSync.mockReturnValue('### Browser opened\n');
      const runner = new PlaywrightCliRunner({ headed: true });
      runner.open('https://example.com');

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'playwright-cli',
        expect.arrayContaining(['--headed']),
        expect.any(Object),
      );
    });

    it('should use named session when configured', () => {
      mockExecFileSync.mockReturnValue('### Browser opened\n');
      const runner = new PlaywrightCliRunner({ session: 'my-session' });
      runner.open('https://example.com');

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'playwright-cli',
        expect.arrayContaining(['-s=my-session']),
        expect.any(Object),
      );
    });
  });

  describe('navigate', () => {
    it('should navigate to URL and return page info', () => {
      mockExecFileSync.mockReturnValue(
        '### Ran Playwright code\n### Page\n- Page URL: https://example.com/\n- Page Title: Example Domain\n',
      );
      const runner = new PlaywrightCliRunner();
      const result = runner.navigate('https://example.com');

      expect(result.ok).toBe(true);
      expect(result.output).toContain('Example Domain');
    });
  });

  describe('snapshot', () => {
    it('should return snapshot file reference', () => {
      mockExecFileSync.mockReturnValue(
        '### Snapshot\n- [Snapshot](.playwright-cli/page-2026.yml)\n',
      );
      const runner = new PlaywrightCliRunner();
      const result = runner.snapshot();

      expect(result.ok).toBe(true);
      expect(result.output).toContain('.playwright-cli/');
    });
  });

  describe('screenshot', () => {
    it('should save screenshot to specified path', () => {
      mockExecFileSync.mockReturnValue('Screenshot saved to /tmp/test.png\n');
      const runner = new PlaywrightCliRunner();
      const result = runner.screenshot('/tmp/test.png');

      expect(result.ok).toBe(true);
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'playwright-cli',
        expect.arrayContaining(['screenshot', '--filename', '/tmp/test.png']),
        expect.any(Object),
      );
    });
  });

  describe('close', () => {
    it('should close browser', () => {
      mockExecFileSync.mockReturnValue("Browser 'default' closed\n");
      const runner = new PlaywrightCliRunner();
      const result = runner.close();

      expect(result.ok).toBe(true);
    });

    it('should handle already-closed browser gracefully', () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error('Browser is not open');
      });
      const runner = new PlaywrightCliRunner();
      const result = runner.close();

      expect(result.ok).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should return ok=false with error message on failure', () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error('Connection refused');
      });
      const runner = new PlaywrightCliRunner();
      const result = runner.navigate('https://example.com');

      expect(result.ok).toBe(false);
      expect(result.output).toContain('Connection refused');
    });
  });
});
