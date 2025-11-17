import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Hook Health Checker Tests
 *
 * Tests orchestration of hook health checking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HookHealthChecker } from '../../../src/core/hooks/HookHealthChecker.js';
import { HealthCheckConfig } from '../../../src/core/hooks/types.js';

describe('HookHealthChecker', () => {
  let checker: HookHealthChecker;
  let config: HealthCheckConfig;

  beforeEach(() => {
    config = HookHealthChecker.createDefaultConfig(process.cwd());
    checker = new HookHealthChecker(config);
  });

  describe('checkAllHooks', () => {
    it('should run health check on all hooks', async () => {
      const result = await checker.checkAllHooks();

      expect(result).toBeDefined();
      expect(result.totalHooks).toBeGreaterThan(0);
      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(result.totalHooks);
    });

    it('should return overall health status', async () => {
      const result = await checker.checkAllHooks();

      expect(result.overallHealth).toMatch(/healthy|degraded|unhealthy/);
    });

    it('should generate summary with recommendations', async () => {
      const result = await checker.checkAllHooks();

      expect(result.summary).toBeDefined();
      expect(result.summary.status).toMatch(/pass|warn|fail/);
      expect(result.summary.message).toBeDefined();
      expect(Array.isArray(result.summary.recommendations)).toBe(true);
    });

    it('should track execution time', async () => {
      const result = await checker.checkAllHooks();

      expect(result.totalExecutionTime).toBeGreaterThan(0);
      expect(result.totalExecutionTime).toBeLessThan(30000); // Should complete in <30s
    });
  });

  describe('scanHooks', () => {
    it('should discover all hooks', async () => {
      const hooks = await checker.scanHooks();

      expect(hooks).toBeDefined();
      expect(hooks.length).toBeGreaterThan(0);
    });
  });

  describe('createDefaultConfig', () => {
    it('should create valid default config', () => {
      const defaultConfig = HookHealthChecker.createDefaultConfig(process.cwd());

      expect(defaultConfig.projectRoot).toBe(process.cwd());
      expect(defaultConfig.timeout).toBe(5000);
      expect(defaultConfig.autoFix).toBe(false);
      expect(defaultConfig.verbose).toBe(false);
      expect(defaultConfig.criticalOnly).toBe(false);
    });
  });
});
