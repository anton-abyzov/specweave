/**
 * Integration Test: PreCompact Hook - Context Pressure Signal
 *
 * Tests that the pre-compact.sh hook correctly creates and escalates
 * context pressure state for the UserPromptSubmit hook to read.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

const HOOK_PATH = path.resolve(__dirname, '../../../plugins/specweave/hooks/pre-compact.sh');

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

describe('PreCompact Hook - Context Pressure Signal', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(tmpdir(), `specweave-precompact-test-${Date.now()}`);
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should output {"continue":true}', () => {
    const result = executePreCompactHook(tempDir);
    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout.trim());
    expect(output.continue).toBe(true);
  });

  it('should create context-pressure.json in .specweave/state/', () => {
    executePreCompactHook(tempDir);
    const pressureFile = path.join(tempDir, '.specweave', 'state', 'context-pressure.json');
    expect(fs.existsSync(pressureFile)).toBe(true);
  });

  it('should set level to "elevated" on first call', () => {
    executePreCompactHook(tempDir);
    const pressureFile = path.join(tempDir, '.specweave', 'state', 'context-pressure.json');
    const data = JSON.parse(fs.readFileSync(pressureFile, 'utf-8'));
    expect(data.level).toBe('elevated');
    expect(data.compactionCount).toBe(1);
  });

  it('should escalate to "critical" on second call', () => {
    executePreCompactHook(tempDir);
    executePreCompactHook(tempDir);
    const pressureFile = path.join(tempDir, '.specweave', 'state', 'context-pressure.json');
    const data = JSON.parse(fs.readFileSync(pressureFile, 'utf-8'));
    expect(data.level).toBe('critical');
    expect(data.compactionCount).toBe(2);
  });

  it('should increment compaction count on repeated calls', () => {
    executePreCompactHook(tempDir);
    executePreCompactHook(tempDir);
    executePreCompactHook(tempDir);
    const pressureFile = path.join(tempDir, '.specweave', 'state', 'context-pressure.json');
    const data = JSON.parse(fs.readFileSync(pressureFile, 'utf-8'));
    expect(data.compactionCount).toBe(3);
    expect(data.level).toBe('emergency');
  });

  it('should include lastCompaction timestamp', () => {
    executePreCompactHook(tempDir);
    const pressureFile = path.join(tempDir, '.specweave', 'state', 'context-pressure.json');
    const data = JSON.parse(fs.readFileSync(pressureFile, 'utf-8'));
    expect(data.lastCompaction).toBeDefined();
    expect(typeof data.lastCompaction).toBe('string');
  });

  it('should handle missing .specweave/state/ directory gracefully', () => {
    const bareDir = path.join(tmpdir(), `specweave-bare-test-${Date.now()}`);
    fs.mkdirSync(bareDir, { recursive: true });
    // No .specweave directory - hook should exit cleanly
    const result = executePreCompactHook(bareDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('continue');
    fs.rmSync(bareDir, { recursive: true, force: true });
  });

  it('should be fast (< 200ms)', () => {
    const start = Date.now();
    executePreCompactHook(tempDir);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('should skip when SPECWEAVE_DISABLE_HOOKS=1', () => {
    const result = spawnSync('bash', [HOOK_PATH], {
      input: '{}',
      encoding: 'utf8',
      cwd: tempDir,
      env: { ...process.env, SPECWEAVE_DISABLE_HOOKS: '1' },
    });
    expect(result.stdout?.trim()).toBe('{"continue":true}');
    // Should NOT create pressure file
    const pressureFile = path.join(tempDir, '.specweave', 'state', 'context-pressure.json');
    expect(fs.existsSync(pressureFile)).toBe(false);
  });
});
