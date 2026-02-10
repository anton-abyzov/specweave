/**
 * Tests for CI environment detection and defaults.
 * Ensures headless mode in CI, configurable output dirs, proper exit codes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExecSync = vi.hoisted(() => vi.fn());
vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

import {
  getCiDefaults,
  type CiConfig,
} from '../../../../plugins/specweave-testing/lib/playwright-ci-defaults.js';

describe('Playwright CI Defaults', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getCiDefaults', () => {
    it('should force headless when CI=true', () => {
      process.env.CI = 'true';
      const config = getCiDefaults();

      expect(config.headed).toBe(false);
      expect(config.isCI).toBe(true);
    });

    it('should allow headed mode when not in CI', () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      delete process.env.JENKINS_URL;
      const config = getCiDefaults({ headed: true });

      expect(config.headed).toBe(true);
      expect(config.isCI).toBe(false);
    });

    it('should override headed=true to false in CI', () => {
      process.env.CI = 'true';
      const config = getCiDefaults({ headed: true });

      // CI always forces headless
      expect(config.headed).toBe(false);
    });

    it('should use custom output directory when provided', () => {
      const config = getCiDefaults({ outputDir: '/tmp/pw-output' });
      expect(config.outputDir).toBe('/tmp/pw-output');
    });

    it('should use default output directory when none provided', () => {
      const config = getCiDefaults();
      expect(config.outputDir).toBe('.playwright-cli');
    });

    it('should detect CI from common env vars', () => {
      // GitHub Actions
      delete process.env.CI;
      process.env.GITHUB_ACTIONS = 'true';
      expect(getCiDefaults().isCI).toBe(true);

      // GitLab CI
      delete process.env.GITHUB_ACTIONS;
      process.env.GITLAB_CI = 'true';
      expect(getCiDefaults().isCI).toBe(true);

      // Jenkins
      delete process.env.GITLAB_CI;
      process.env.JENKINS_URL = 'http://jenkins.local';
      expect(getCiDefaults().isCI).toBe(true);
    });
  });
});
