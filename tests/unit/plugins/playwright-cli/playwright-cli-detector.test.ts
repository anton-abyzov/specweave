/**
 * Tests for Playwright CLI detection utility.
 * Detects whether @playwright/cli is installed, its version, and binary path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process before importing the module
const mockExecSync = vi.hoisted(() => vi.fn());
vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

// Import after mocking
import {
  detectPlaywrightCli,
  type CliDetectionResult,
} from '../../../../plugins/specweave-testing/lib/playwright-cli-detector.js';

describe('Playwright CLI Detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectPlaywrightCli', () => {
    it('should return installed=true with version and path when CLI is available', () => {
      mockExecSync
        .mockReturnValueOnce('/usr/local/bin/playwright-cli\n') // which
        .mockReturnValueOnce('0.1.0\n'); // --version

      const result: CliDetectionResult = detectPlaywrightCli();

      expect(result.installed).toBe(true);
      expect(result.version).toBe('0.1.0');
      expect(result.path).toBe('/usr/local/bin/playwright-cli');
    });

    it('should return installed=false when CLI is not found', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const result: CliDetectionResult = detectPlaywrightCli();

      expect(result.installed).toBe(false);
      expect(result.version).toBeUndefined();
      expect(result.path).toBeUndefined();
    });

    it('should handle version check failure gracefully', () => {
      mockExecSync
        .mockReturnValueOnce('/usr/local/bin/playwright-cli\n') // which succeeds
        .mockImplementationOnce(() => { throw new Error('version fail'); }); // version fails

      const result: CliDetectionResult = detectPlaywrightCli();

      expect(result.installed).toBe(true);
      expect(result.path).toBe('/usr/local/bin/playwright-cli');
      expect(result.version).toBeUndefined();
    });

    it('should trim whitespace from path and version', () => {
      mockExecSync
        .mockReturnValueOnce('  /opt/bin/playwright-cli  \n')
        .mockReturnValueOnce('  0.1.0  \n');

      const result = detectPlaywrightCli();

      expect(result.path).toBe('/opt/bin/playwright-cli');
      expect(result.version).toBe('0.1.0');
    });
  });

  describe('caching behavior', () => {
    it('should use cache on subsequent calls when useCache=true', () => {
      mockExecSync
        .mockReturnValueOnce('/usr/local/bin/playwright-cli\n')
        .mockReturnValueOnce('0.1.0\n');

      // First call populates cache
      const result1 = detectPlaywrightCli({ useCache: true });
      // Second call should use cache (no new execSync calls)
      const result2 = detectPlaywrightCli({ useCache: true });

      expect(result1).toEqual(result2);
      // execSync should only be called twice (which + version) for the first call
      expect(mockExecSync).toHaveBeenCalledTimes(2);
    });

    it('should bypass cache when useCache=false', () => {
      mockExecSync
        .mockReturnValueOnce('/usr/local/bin/playwright-cli\n')
        .mockReturnValueOnce('0.1.0\n')
        .mockReturnValueOnce('/usr/local/bin/playwright-cli\n')
        .mockReturnValueOnce('0.2.0\n');

      const result1 = detectPlaywrightCli({ useCache: false });
      const result2 = detectPlaywrightCli({ useCache: false });

      expect(result1.version).toBe('0.1.0');
      expect(result2.version).toBe('0.2.0');
      expect(mockExecSync).toHaveBeenCalledTimes(4);
    });
  });
});
