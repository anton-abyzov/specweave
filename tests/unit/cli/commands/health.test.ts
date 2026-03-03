import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runHealthCheck } from '../../../../src/cli/commands/health.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock console.log to capture output
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('health command', () => {
  const tmpDir = path.join(os.tmpdir(), 'specweave-health-test-' + Date.now());

  beforeEach(() => {
    consoleSpy.mockClear();
    fs.mkdirSync(path.join(tmpDir, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reports healthy when config is valid and sync is disabled', async () => {
    fs.writeFileSync(
      path.join(tmpDir, '.specweave', 'config.json'),
      JSON.stringify({ version: '2.0', project: { name: 'test' }, sync: { enabled: false } })
    );

    const report = await runHealthCheck(tmpDir, { json: false });

    expect(report.status).toMatch(/healthy|degraded/);
    expect(report.categories).toHaveLength(3);

    const configCat = report.categories.find(c => c.category === 'Configuration');
    expect(configCat?.status).toBe('pass');
  });

  it('reports unhealthy when config.json is missing', async () => {
    fs.rmSync(path.join(tmpDir, '.specweave', 'config.json'), { force: true });

    const report = await runHealthCheck(tmpDir, { json: false });

    expect(report.status).toBe('unhealthy');
    const configCat = report.categories.find(c => c.category === 'Configuration');
    expect(configCat?.status).toBe('fail');
  });

  it('reports unhealthy when config.json has invalid JSON', async () => {
    fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), '{broken}');

    const report = await runHealthCheck(tmpDir, { json: false });

    expect(report.status).toBe('unhealthy');
  });

  it('outputs JSON when --json flag is set', async () => {
    fs.writeFileSync(
      path.join(tmpDir, '.specweave', 'config.json'),
      JSON.stringify({ version: '2.0', project: { name: 'test' }, sync: { enabled: false } })
    );

    await runHealthCheck(tmpDir, { json: true });

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('status');
    expect(parsed).toHaveProperty('categories');
    expect(parsed).toHaveProperty('summary');
  });

  it('returns correct summary counts', async () => {
    fs.writeFileSync(
      path.join(tmpDir, '.specweave', 'config.json'),
      JSON.stringify({ version: '2.0', project: { name: 'test' }, sync: { enabled: false } })
    );

    const report = await runHealthCheck(tmpDir);

    expect(report.summary.total).toBeGreaterThan(0);
    // total counts all checks; passed/warnings/failures excludes skipped
    expect(report.summary.passed + report.summary.warnings + report.summary.failures).toBeLessThanOrEqual(report.summary.total);
  });

  it('shows diagnostic details when failures exist', async () => {
    // Missing config.json → failure with diagnostics
    fs.rmSync(path.join(tmpDir, '.specweave', 'config.json'), { force: true });

    await runHealthCheck(tmpDir, { json: false });

    const output = consoleSpy.mock.calls[0][0];
    expect(output).toContain('Diagnostics:');
    expect(output).toContain('config.json');
  });

  it('does not show diagnostics when all checks pass or warn', async () => {
    fs.writeFileSync(
      path.join(tmpDir, '.specweave', 'config.json'),
      JSON.stringify({ version: '2.0', project: { name: 'test' }, sync: { enabled: false } })
    );

    await runHealthCheck(tmpDir, { json: false });

    const output = consoleSpy.mock.calls[0][0];
    expect(output).not.toContain('Diagnostics:');
  });

  it('skips sync checks when sync is not enabled', async () => {
    fs.writeFileSync(
      path.join(tmpDir, '.specweave', 'config.json'),
      JSON.stringify({ version: '2.0', project: { name: 'test' } })
    );

    const report = await runHealthCheck(tmpDir);

    const syncCat = report.categories.find(c => c.category === 'Sync Connectivity');
    expect(syncCat).toBeDefined();
    expect(syncCat!.checks.some(c => c.status === 'skip')).toBe(true);
  });
});
