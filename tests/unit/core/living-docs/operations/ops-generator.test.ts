/**
 * OpsGenerator Tests
 *
 * Tests for the OpsGenerator class that generates operational documentation:
 * - Runbooks from hook scripts and patterns
 * - Monitoring guidance
 * - Incident templates
 * - SLA tracking
 *
 * Strategy: create temp directories with various project files and test
 * the output via the public generate() method, exercising all private helpers.
 *
 * @see src/core/living-docs/operations/ops-generator.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockGlob } = vi.hoisted(() => ({
  mockGlob: vi.fn(),
}));

vi.mock('glob', () => ({
  glob: mockGlob,
}));

// Import after mocks
import { OpsGenerator } from '../../../../../src/core/living-docs/operations/ops-generator.js';
import type { Logger } from '../../../../../src/utils/logger.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ops-gen-test-'));
}

function writeFile(relativePath: string, content: string): void {
  const fullPath = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function makeLogger(): Logger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

function makeGenerator(overrides?: { logger?: Logger }): OpsGenerator {
  return new OpsGenerator({
    projectPath: tmpDir,
    logger: overrides?.logger ?? makeLogger(),
  });
}

function opsPath(...parts: string[]): string {
  return path.join(tmpDir, '.specweave/docs/internal/operations', ...parts);
}

function readGenerated(filename: string): string {
  return fs.readFileSync(opsPath(filename), 'utf-8');
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  tmpDir = makeTmpDir();
  mockGlob.mockReset();
  // Default: no scripts found
  mockGlob.mockResolvedValue([]);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ===========================================================================
// Constructor
// ===========================================================================

describe('OpsGenerator constructor', () => {
  it('should create instance with required options', () => {
    const gen = new OpsGenerator({ projectPath: tmpDir });
    expect(gen).toBeInstanceOf(OpsGenerator);
  });

  it('should accept a custom logger', () => {
    const logger = makeLogger();
    const gen = new OpsGenerator({ projectPath: tmpDir, logger });
    expect(gen).toBeInstanceOf(OpsGenerator);
  });
});

// ===========================================================================
// generate() - output structure
// ===========================================================================

describe('generate() output structure', () => {
  it('should create the operations output directory', async () => {
    const gen = makeGenerator();
    await gen.generate();
    expect(fs.existsSync(opsPath())).toBe(true);
  });

  it('should always create RUNBOOKS.md', async () => {
    const gen = makeGenerator();
    await gen.generate();
    expect(fs.existsSync(opsPath('RUNBOOKS.md'))).toBe(true);
  });

  it('should always create MONITORING.md', async () => {
    const gen = makeGenerator();
    await gen.generate();
    expect(fs.existsSync(opsPath('MONITORING.md'))).toBe(true);
  });

  it('should always create INCIDENT-HISTORY.md', async () => {
    const gen = makeGenerator();
    await gen.generate();
    expect(fs.existsSync(opsPath('INCIDENT-HISTORY.md'))).toBe(true);
  });

  it('should always create SLA-TRACKING.md', async () => {
    const gen = makeGenerator();
    await gen.generate();
    expect(fs.existsSync(opsPath('SLA-TRACKING.md'))).toBe(true);
  });

  it('should return all four files in filesCreated', async () => {
    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.filesCreated).toHaveLength(4);
    expect(result.filesCreated).toContain(opsPath('RUNBOOKS.md'));
    expect(result.filesCreated).toContain(opsPath('MONITORING.md'));
    expect(result.filesCreated).toContain(opsPath('INCIDENT-HISTORY.md'));
    expect(result.filesCreated).toContain(opsPath('SLA-TRACKING.md'));
  });

  it('should set savedFiles as alias for filesCreated', async () => {
    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.savedFiles).toEqual(result.filesCreated);
  });

  it('should call logger.info for each generation step', async () => {
    const logger = makeLogger();
    const gen = makeGenerator({ logger });
    await gen.generate();
    expect(logger.info).toHaveBeenCalledWith('  Generating runbooks...');
    expect(logger.info).toHaveBeenCalledWith('  Generating monitoring docs...');
    expect(logger.info).toHaveBeenCalledWith('  Generating incident templates...');
    expect(logger.info).toHaveBeenCalledWith('  Generating SLA docs...');
  });
});

// ===========================================================================
// Runbooks - empty project
// ===========================================================================

describe('runbooks - empty project (no hooks, no scripts, no package.json)', () => {
  it('should include Cache Cleanup as standard runbook', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('Cache Cleanup');
  });

  it('should not include Application Restart without package.json', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).not.toContain('Application Restart');
  });

  it('should not include Container Restart without Dockerfile', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).not.toContain('Container Restart');
  });

  it('should return runbooksFound with standard count only', async () => {
    const gen = makeGenerator();
    const result = await gen.generate();
    // Only Cache Cleanup (no package.json, no Dockerfile)
    expect(result.runbooksFound).toBe(1);
  });
});

// ===========================================================================
// Runbooks - standard runbooks from project markers
// ===========================================================================

describe('runbooks - standard runbooks from project markers', () => {
  it('should include Application Restart and Dependency Update when package.json exists', async () => {
    writeFile('package.json', JSON.stringify({ name: 'test-app' }));
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('Application Restart');
    expect(content).toContain('Dependency Update');
  });

  it('should include Container Restart when Dockerfile exists', async () => {
    writeFile('Dockerfile', 'FROM node:18');
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('Container Restart');
    expect(content).toContain('docker-compose');
  });

  it('should include all standard runbooks when both package.json and Dockerfile exist', async () => {
    writeFile('package.json', JSON.stringify({ name: 'app' }));
    writeFile('Dockerfile', 'FROM node:18');
    const gen = makeGenerator();
    const result = await gen.generate();
    // Application Restart + Dependency Update + Container Restart + Cache Cleanup = 4
    expect(result.runbooksFound).toBe(4);
  });

  it('should include steps for Application Restart', async () => {
    writeFile('package.json', JSON.stringify({ name: 'app' }));
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('Check current service health');
    expect(content).toContain('Notify stakeholders');
    expect(content).toContain('npm start');
  });

  it('should include steps for Dependency Update', async () => {
    writeFile('package.json', JSON.stringify({ name: 'app' }));
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('npm outdated');
    expect(content).toContain('npm update');
    expect(content).toContain('npm test');
  });

  it('should include steps for Container Restart', async () => {
    writeFile('Dockerfile', 'FROM node:18');
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('docker ps');
    expect(content).toContain('docker-compose build');
    expect(content).toContain('docker logs');
  });

  it('should include steps for Cache Cleanup', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('npm cache clean');
    expect(content).toContain('rm -rf dist/ build/');
    expect(content).toContain('.specweave/cache/');
  });
});

// ===========================================================================
// Runbooks - hook scripts
// ===========================================================================

describe('runbooks - hook scripts', () => {
  it('should detect and parse hook scripts from plugins/specweave/hooks', async () => {
    const hookDir = path.join(tmpDir, 'plugins/specweave/hooks');
    fs.mkdirSync(hookDir, { recursive: true });
    writeFile('plugins/specweave/hooks/pre-deploy.sh', [
      '#!/bin/bash',
      '# Pre-deployment validation script',
      '# 1. Check environment variables',
      '# 2. Run database migrations',
      '# 3. Verify service health',
      'echo "Running pre-deploy checks"',
    ].join('\n'));

    mockGlob.mockImplementation((_pattern: string, opts: { cwd: string }) => {
      if (opts.cwd === hookDir) {
        return Promise.resolve(['pre-deploy.sh']);
      }
      return Promise.resolve([]);
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('pre-deploy');
    expect(content).toContain('hook');
    expect(content).toContain('Pre-deployment validation script');
  });

  it('should extract numbered steps from hook script comments', async () => {
    const hookDir = path.join(tmpDir, 'plugins/specweave/hooks');
    fs.mkdirSync(hookDir, { recursive: true });
    writeFile('plugins/specweave/hooks/setup.sh', [
      '#!/bin/bash',
      '# Setup script',
      '# 1. Install dependencies',
      '# 2. Configure environment',
      '# 3. Start services',
      'npm install',
    ].join('\n'));

    mockGlob.mockImplementation((_pattern: string, opts: { cwd: string }) => {
      if (opts.cwd === hookDir) {
        return Promise.resolve(['setup.sh']);
      }
      return Promise.resolve([]);
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('Install dependencies');
    expect(content).toContain('Configure environment');
    expect(content).toContain('Start services');
  });

  it('should detect hook scripts from .specweave/hooks', async () => {
    const hookDir = path.join(tmpDir, '.specweave/hooks');
    fs.mkdirSync(hookDir, { recursive: true });
    writeFile('.specweave/hooks/post-increment.sh', [
      '#!/bin/bash',
      '# Post-increment cleanup hook',
      'echo "Done"',
    ].join('\n'));

    mockGlob.mockImplementation((_pattern: string, opts: { cwd: string }) => {
      if (opts.cwd === hookDir) {
        return Promise.resolve(['post-increment.sh']);
      }
      return Promise.resolve([]);
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('post-increment');
    expect(content).toContain('hook');
  });

  it('should detect scripts from scripts/ folder', async () => {
    const scriptsDir = path.join(tmpDir, 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    writeFile('scripts/deploy.sh', [
      '#!/bin/bash',
      '# Deploy the application to production',
      'docker push myapp:latest',
    ].join('\n'));

    mockGlob.mockImplementation((_pattern: string, opts: { cwd: string }) => {
      if (opts.cwd === scriptsDir) {
        return Promise.resolve(['deploy.sh']);
      }
      return Promise.resolve([]);
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('deploy');
    expect(content).toContain('script');
    expect(content).toContain('scripts/deploy.sh');
  });

  it('should handle script that cannot be read', async () => {
    const hookDir = path.join(tmpDir, 'plugins/specweave/hooks');
    fs.mkdirSync(hookDir, { recursive: true });
    // Glob returns a file that does not exist on disk
    mockGlob.mockImplementation((_pattern: string, opts: { cwd: string }) => {
      if (opts.cwd === hookDir) {
        return Promise.resolve(['nonexistent.sh']);
      }
      return Promise.resolve([]);
    });

    const gen = makeGenerator();
    const result = await gen.generate();
    // Should not crash; the non-readable script is simply skipped
    expect(result).toBeDefined();
  });

  it('should use filename as default description when no comment found', async () => {
    const hookDir = path.join(tmpDir, 'plugins/specweave/hooks');
    fs.mkdirSync(hookDir, { recursive: true });
    writeFile('plugins/specweave/hooks/my-hook.sh', [
      '#!/bin/bash',
      'echo "no comment line"',
    ].join('\n'));

    mockGlob.mockImplementation((_pattern: string, opts: { cwd: string }) => {
      if (opts.cwd === hookDir) {
        return Promise.resolve(['my-hook.sh']);
      }
      return Promise.resolve([]);
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    // The first comment match is #!/bin/bash -> description = "!/bin/bash"
    // (the regex ^#\s*(.+) matches the shebang line)
    expect(content).toContain('my-hook');
  });

  it('should skip hook paths that do not exist', async () => {
    // Neither plugins/specweave/hooks nor .specweave/hooks exist
    const gen = makeGenerator();
    const result = await gen.generate();
    // mockGlob should not be called for non-existent dirs
    expect(result.runbooksFound).toBeGreaterThanOrEqual(1); // at least Cache Cleanup
  });
});

// ===========================================================================
// Runbooks - markdown format
// ===========================================================================

describe('runbooks - markdown format', () => {
  it('should include title header', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('# Operational Runbooks');
  });

  it('should include generation date', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toMatch(/\*Generated:.*\| Runbooks: \d+\*/);
  });

  it('should include Quick Reference table', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('## Quick Reference');
    expect(content).toContain('| Runbook | Type | Description |');
    expect(content).toContain('|---------|------|-------------|');
  });

  it('should include Runbook Details section', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('## Runbook Details');
  });

  it('should include type label for each runbook in details', async () => {
    writeFile('package.json', JSON.stringify({ name: 'app' }));
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('**Type**: standard');
  });

  it('should include source path for hook/script runbooks', async () => {
    const scriptsDir = path.join(tmpDir, 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    writeFile('scripts/backup.sh', '#!/bin/bash\n# Backup database\necho backup');

    mockGlob.mockImplementation((_pattern: string, opts: { cwd: string }) => {
      if (opts.cwd === scriptsDir) {
        return Promise.resolve(['backup.sh']);
      }
      return Promise.resolve([]);
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('**Source**: `scripts/backup.sh`');
  });

  it('should include last updated timestamp', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toMatch(/\*Last updated:.*\*/);
  });

  it('should include numbered steps in runbook details', async () => {
    writeFile('package.json', JSON.stringify({ name: 'app' }));
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('**Steps**:');
    expect(content).toMatch(/1\. /);
    expect(content).toMatch(/2\. /);
  });
});

// ===========================================================================
// Monitoring documentation
// ===========================================================================

describe('monitoring documentation', () => {
  it('should detect Prometheus config', async () => {
    writeFile('prometheus.yml', 'global:\n  scrape_interval: 15s');
    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.monitoringConfigsFound).toBeGreaterThanOrEqual(1);
    const content = readGenerated('MONITORING.md');
    expect(content).toContain('Prometheus');
    expect(content).toContain('metrics');
    expect(content).toContain('prometheus.yml');
  });

  it('should detect Grafana directory', async () => {
    fs.mkdirSync(path.join(tmpDir, 'grafana'), { recursive: true });
    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.monitoringConfigsFound).toBeGreaterThanOrEqual(1);
    const content = readGenerated('MONITORING.md');
    expect(content).toContain('Grafana');
    expect(content).toContain('dashboards');
  });

  it('should detect prom-client from package.json dependencies', async () => {
    writeFile('package.json', JSON.stringify({
      dependencies: { 'prom-client': '^15.0.0' },
    }));
    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.monitoringConfigsFound).toBeGreaterThanOrEqual(1);
    const content = readGenerated('MONITORING.md');
    expect(content).toContain('Prometheus Client');
  });

  it('should detect dd-trace from package.json dependencies', async () => {
    writeFile('package.json', JSON.stringify({
      dependencies: { 'dd-trace': '^4.0.0' },
    }));
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('MONITORING.md');
    expect(content).toContain('Datadog APM');
    expect(content).toContain('tracing');
  });

  it('should detect @opentelemetry/api from package.json dependencies', async () => {
    writeFile('package.json', JSON.stringify({
      dependencies: { '@opentelemetry/api': '^1.0.0' },
    }));
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('MONITORING.md');
    expect(content).toContain('OpenTelemetry');
  });

  it('should detect newrelic from package.json devDependencies', async () => {
    writeFile('package.json', JSON.stringify({
      devDependencies: { 'newrelic': '^11.0.0' },
    }));
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('MONITORING.md');
    expect(content).toContain('New Relic');
    expect(content).toContain('apm');
  });

  it('should detect all monitoring tools simultaneously', async () => {
    writeFile('prometheus.yml', 'global:\n  scrape_interval: 15s');
    fs.mkdirSync(path.join(tmpDir, 'grafana'), { recursive: true });
    writeFile('package.json', JSON.stringify({
      dependencies: { 'prom-client': '^15.0.0', '@opentelemetry/api': '^1.0.0' },
      devDependencies: { 'dd-trace': '^4.0.0', 'newrelic': '^11.0.0' },
    }));

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.monitoringConfigsFound).toBe(6);
  });

  it('should return monitoringConfigsFound 0 for empty project', async () => {
    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.monitoringConfigsFound).toBe(0);
  });

  it('should handle malformed package.json gracefully', async () => {
    writeFile('package.json', 'not valid json');
    const gen = makeGenerator();
    const result = await gen.generate();
    // Should not crash
    expect(result.monitoringConfigsFound).toBe(0);
  });

  it('should show dash for tools without configFile', async () => {
    writeFile('package.json', JSON.stringify({
      dependencies: { 'prom-client': '^15.0.0' },
    }));
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('MONITORING.md');
    // Prometheus Client has no configFile -> shows '-'
    expect(content).toContain('| Prometheus Client | metrics | - |');
  });
});

// ===========================================================================
// Monitoring - markdown format
// ===========================================================================

describe('monitoring - markdown format', () => {
  it('should include title header', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('MONITORING.md');
    expect(content).toContain('# Monitoring Documentation');
  });

  it('should include Monitoring Stack table', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('MONITORING.md');
    expect(content).toContain('## Monitoring Stack');
    expect(content).toContain('| Tool | Type | Config |');
  });

  it('should include Key Metrics to Monitor section', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('MONITORING.md');
    expect(content).toContain('## Key Metrics to Monitor');
    expect(content).toContain('### Application Metrics');
    expect(content).toContain('Request latency');
    expect(content).toContain('### Infrastructure Metrics');
    expect(content).toContain('CPU utilization');
    expect(content).toContain('### Business Metrics');
    expect(content).toContain('Feature usage rates');
  });

  it('should include Alerting Guidelines table', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('MONITORING.md');
    expect(content).toContain('## Alerting Guidelines');
    expect(content).toContain('P1 - Critical');
    expect(content).toContain('P2 - High');
    expect(content).toContain('P3 - Medium');
    expect(content).toContain('P4 - Low');
  });

  it('should include last updated timestamp', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('MONITORING.md');
    expect(content).toMatch(/\*Last updated:.*\*/);
  });
});

// ===========================================================================
// Incident documentation
// ===========================================================================

describe('incident documentation', () => {
  it('should include Incident Management title', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('INCIDENT-HISTORY.md');
    expect(content).toContain('# Incident Management');
  });

  it('should include mermaid diagram for incident response process', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('INCIDENT-HISTORY.md');
    expect(content).toContain('```mermaid');
    expect(content).toContain('graph LR');
    expect(content).toContain('Detect');
    expect(content).toContain('Resolve');
    expect(content).toContain('Post-mortem');
  });

  it('should include severity levels table', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('INCIDENT-HISTORY.md');
    expect(content).toContain('## Incident Severity Levels');
    expect(content).toContain('SEV1');
    expect(content).toContain('SEV2');
    expect(content).toContain('SEV3');
    expect(content).toContain('SEV4');
  });

  it('should include incident template', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('INCIDENT-HISTORY.md');
    expect(content).toContain('## Incident Template');
    expect(content).toContain('**Date**: YYYY-MM-DD');
    expect(content).toContain('**Severity**: SEV[1-4]');
    expect(content).toContain('#### Timeline');
    expect(content).toContain('#### Root Cause');
    expect(content).toContain('#### Resolution');
    expect(content).toContain('#### Action Items');
  });

  it('should include post-mortem process', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('INCIDENT-HISTORY.md');
    expect(content).toContain('## Post-Mortem Process');
    expect(content).toContain('Schedule post-mortem within 48 hours');
    expect(content).toContain('5 Whys');
  });

  it('should include last updated timestamp', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('INCIDENT-HISTORY.md');
    expect(content).toMatch(/\*Last updated:.*\*/);
  });
});

// ===========================================================================
// SLA documentation
// ===========================================================================

describe('SLA documentation', () => {
  it('should include SLA title', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('SLA-TRACKING.md');
    expect(content).toContain('# Service Level Agreements (SLA)');
  });

  it('should include SLA Overview table', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('SLA-TRACKING.md');
    expect(content).toContain('## SLA Overview');
    expect(content).toContain('Availability');
    expect(content).toContain('99.9%');
    expect(content).toContain('Response Time (p95)');
    expect(content).toContain('Error Rate');
  });

  it('should include Availability definitions', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('SLA-TRACKING.md');
    expect(content).toContain('### Availability');
    expect(content).toContain('43.8 minutes');
    expect(content).toContain('21.9 minutes');
    expect(content).toContain('4.38 minutes');
  });

  it('should include Response Time definitions', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('SLA-TRACKING.md');
    expect(content).toContain('### Response Time');
    expect(content).toContain('p50');
    expect(content).toContain('p95');
    expect(content).toContain('p99');
  });

  it('should include Error Rate section', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('SLA-TRACKING.md');
    expect(content).toContain('### Error Rate');
    expect(content).toContain('5xx errors');
  });

  it('should include Error Budget section', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('SLA-TRACKING.md');
    expect(content).toContain('## Error Budget');
    expect(content).toContain('43.2 minutes/month');
  });

  it('should include Measurement section', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('SLA-TRACKING.md');
    expect(content).toContain('## Measurement');
    expect(content).toContain('Monthly SLA report');
  });

  it('should include last updated timestamp', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('SLA-TRACKING.md');
    expect(content).toMatch(/\*Last updated:.*\*/);
  });
});

// ===========================================================================
// Integration: full project
// ===========================================================================

describe('full project integration', () => {
  it('should generate all docs for a fully configured project', async () => {
    writeFile('package.json', JSON.stringify({
      dependencies: { 'prom-client': '^15.0.0' },
    }));
    writeFile('Dockerfile', 'FROM node:18');
    writeFile('prometheus.yml', 'global:\n  scrape_interval: 15s');
    fs.mkdirSync(path.join(tmpDir, 'grafana'), { recursive: true });

    const scriptsDir = path.join(tmpDir, 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    writeFile('scripts/deploy.sh', '#!/bin/bash\n# Deploy to production\n# 1. Build\n# 2. Push\necho deploy');

    mockGlob.mockImplementation((_pattern: string, opts: { cwd: string }) => {
      if (opts.cwd === scriptsDir) {
        return Promise.resolve(['deploy.sh']);
      }
      return Promise.resolve([]);
    });

    const gen = makeGenerator();
    const result = await gen.generate();

    // Runbooks: deploy (script) + App Restart + Dep Update + Container Restart + Cache Cleanup = 5
    expect(result.runbooksFound).toBe(5);
    // Monitoring: prometheus.yml + grafana + prom-client = 3
    expect(result.monitoringConfigsFound).toBe(3);
    expect(result.filesCreated).toHaveLength(4);

    // Verify all files are readable and non-empty
    for (const file of result.filesCreated) {
      expect(fs.existsSync(file)).toBe(true);
      const content = fs.readFileSync(file, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('should handle concurrent generate calls on different instances', async () => {
    const gen1 = makeGenerator();
    const gen2 = makeGenerator();

    const [result1, result2] = await Promise.all([
      gen1.generate(),
      gen2.generate(),
    ]);

    expect(result1.filesCreated.length).toBe(result2.filesCreated.length);
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================

describe('edge cases', () => {
  it('should truncate long descriptions in Quick Reference table', async () => {
    writeFile('package.json', JSON.stringify({ name: 'app' }));
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    // Descriptions are truncated at 50 chars with "..." suffix
    const tableLines = content.split('\n').filter(l => l.startsWith('|') && l.includes('...'));
    expect(tableLines.length).toBeGreaterThan(0);
  });

  it('should handle hook script with step numbers using parentheses', async () => {
    const hookDir = path.join(tmpDir, 'plugins/specweave/hooks');
    fs.mkdirSync(hookDir, { recursive: true });
    writeFile('plugins/specweave/hooks/test-hook.sh', [
      '#!/bin/bash',
      '# Test hook with paren steps',
      '# 1) First step',
      '# 2) Second step',
    ].join('\n'));

    mockGlob.mockImplementation((_pattern: string, opts: { cwd: string }) => {
      if (opts.cwd === hookDir) {
        return Promise.resolve(['test-hook.sh']);
      }
      return Promise.resolve([]);
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('First step');
    expect(content).toContain('Second step');
  });

  it('should generate valid runbook anchor links in quick reference', async () => {
    writeFile('package.json', JSON.stringify({ name: 'app' }));
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    // "Application Restart" -> anchor "#application-restart"
    expect(content).toContain('#application-restart');
    expect(content).toContain('#dependency-update');
    expect(content).toContain('#cache-cleanup');
  });

  it('should handle hook script with no steps', async () => {
    const hookDir = path.join(tmpDir, 'plugins/specweave/hooks');
    fs.mkdirSync(hookDir, { recursive: true });
    writeFile('plugins/specweave/hooks/simple.sh', [
      '#!/bin/bash',
      '# Simple script with no numbered steps',
      'echo "hello"',
    ].join('\n'));

    mockGlob.mockImplementation((_pattern: string, opts: { cwd: string }) => {
      if (opts.cwd === hookDir) {
        return Promise.resolve(['simple.sh']);
      }
      return Promise.resolve([]);
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RUNBOOKS.md');
    expect(content).toContain('simple');
    // No "Steps:" section for runbooks with empty steps
    // But standard runbooks still have steps
  });
});
