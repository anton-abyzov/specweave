/**
 * Hook Health Check Integration Tests
 *
 * Tests full workflow of hook health checking system.
 */

import { describe, it, expect } from 'vitest';
import { HookHealthChecker } from '../../src/core/hooks/HookHealthChecker.js';
import { HealthReporter } from '../../src/core/hooks/HealthReporter.js';

describe('Hook Health Check Integration', () => {
  it('should run full health check workflow', async () => {
    // 1. Create health checker
    const config = HookHealthChecker.createDefaultConfig(process.cwd());
    const checker = new HookHealthChecker(config);

    // 2. Run health check
    const result = await checker.checkAllHooks();

    // 3. Verify results
    expect(result.totalHooks).toBeGreaterThan(0);
    expect(result.passedHooks + result.failedHooks).toBe(result.totalHooks);
    expect(result.summary).toBeDefined();
  });

  it('should generate console report', async () => {
    const config = HookHealthChecker.createDefaultConfig(process.cwd());
    const checker = new HookHealthChecker(config);
    const result = await checker.checkAllHooks();

    // Generate console report
    const reportOptions = HealthReporter.createDefaultOptions('console');
    const report = await HealthReporter.generateReport(result, reportOptions);

    expect(report).toBeDefined();
    expect(report).toContain('Hook Health Check');
    expect(report.length).toBeGreaterThan(0);
  });

  it('should generate markdown report', async () => {
    const config = HookHealthChecker.createDefaultConfig(process.cwd());
    const checker = new HookHealthChecker(config);
    const result = await checker.checkAllHooks();

    // Generate markdown report
    const reportOptions = HealthReporter.createDefaultOptions('markdown');
    const report = await HealthReporter.generateReport(result, reportOptions);

    expect(report).toContain('# 🏥 Hook Health Check Report');
    expect(report).toContain('## Summary');
    expect(report).toContain('## Hook Results');
  });

  it('should generate JSON report', async () => {
    const config = HookHealthChecker.createDefaultConfig(process.cwd());
    const checker = new HookHealthChecker(config);
    const result = await checker.checkAllHooks();

    // Generate JSON report
    const reportOptions = HealthReporter.createDefaultOptions('json');
    const report = await HealthReporter.generateReport(result, reportOptions);

    const parsed = JSON.parse(report);
    expect(parsed.totalHooks).toBeDefined();
    expect(parsed.passedHooks).toBeDefined();
    expect(parsed.failedHooks).toBeDefined();
    expect(parsed.overallHealth).toBeDefined();
  });
});
