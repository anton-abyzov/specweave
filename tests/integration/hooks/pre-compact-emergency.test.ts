/**
 * Integration Test: PreCompact Hook - Emergency Level & Alert File
 *
 * Tests that pre-compact.sh escalates to "emergency" on 3+ compactions
 * and writes prompt-health-alert.json with remediation advice.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

const HOOK_PATH = path.resolve(
  __dirname,
  '../../../plugins/specweave/hooks/pre-compact.sh',
);

function executePreCompactHook(cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync('bash', [HOOK_PATH], {
    input: '{}',
    encoding: 'utf8',
    cwd,
    env: { ...process.env },
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status || 0,
  };
}

describe('PreCompact Hook - Emergency Level', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(tmpdir(), `specweave-emergency-test-${Date.now()}`);
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should escalate to "emergency" on 3rd compaction', () => {
    executePreCompactHook(tempDir); // 1st → elevated
    executePreCompactHook(tempDir); // 2nd → critical
    executePreCompactHook(tempDir); // 3rd → emergency

    const pressureFile = path.join(tempDir, '.specweave', 'state', 'context-pressure.json');
    const data = JSON.parse(fs.readFileSync(pressureFile, 'utf-8'));
    expect(data.level).toBe('emergency');
    expect(data.compactionCount).toBe(3);
  });

  it('should remain "emergency" on 4+ compactions', () => {
    for (let i = 0; i < 4; i++) {
      executePreCompactHook(tempDir);
    }

    const pressureFile = path.join(tempDir, '.specweave', 'state', 'context-pressure.json');
    const data = JSON.parse(fs.readFileSync(pressureFile, 'utf-8'));
    expect(data.level).toBe('emergency');
    expect(data.compactionCount).toBe(4);
  });

  it('should write prompt-health-alert.json on every compaction', () => {
    executePreCompactHook(tempDir);

    const alertFile = path.join(tempDir, '.specweave', 'state', 'prompt-health-alert.json');
    expect(fs.existsSync(alertFile)).toBe(true);
  });

  it('should include advice string in prompt-health-alert.json', () => {
    executePreCompactHook(tempDir);

    const alertFile = path.join(tempDir, '.specweave', 'state', 'prompt-health-alert.json');
    const data = JSON.parse(fs.readFileSync(alertFile, 'utf-8'));
    expect(data.advice).toBeDefined();
    expect(typeof data.advice).toBe('string');
    expect(data.advice.length).toBeGreaterThan(0);
  });

  it('should include level and compaction count in alert', () => {
    executePreCompactHook(tempDir);
    executePreCompactHook(tempDir);

    const alertFile = path.join(tempDir, '.specweave', 'state', 'prompt-health-alert.json');
    const data = JSON.parse(fs.readFileSync(alertFile, 'utf-8'));
    expect(data.level).toBe('critical');
    expect(data.compactionCount).toBe(2);
  });

  it('should include timestamp in alert', () => {
    executePreCompactHook(tempDir);

    const alertFile = path.join(tempDir, '.specweave', 'state', 'prompt-health-alert.json');
    const data = JSON.parse(fs.readFileSync(alertFile, 'utf-8'));
    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe('string');
  });

  it('should include emergency advice mentioning new session on 3+ compactions', () => {
    for (let i = 0; i < 3; i++) {
      executePreCompactHook(tempDir);
    }

    const alertFile = path.join(tempDir, '.specweave', 'state', 'prompt-health-alert.json');
    const data = JSON.parse(fs.readFileSync(alertFile, 'utf-8'));
    expect(data.advice).toContain('new session');
  });

  it('should log compaction events to prompt-health.log', () => {
    fs.mkdirSync(path.join(tempDir, '.specweave', 'logs'), { recursive: true });
    executePreCompactHook(tempDir);

    const logFile = path.join(tempDir, '.specweave', 'logs', 'prompt-health.log');
    expect(fs.existsSync(logFile)).toBe(true);
    const logContent = fs.readFileSync(logFile, 'utf-8');
    expect(logContent).toContain('COMPACTION');
  });
});
