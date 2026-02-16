/**
 * Integration Test: Session-Start Prompt Health Check
 *
 * Tests that session-start.sh calculates baseline prompt size,
 * writes prompt-health.json, and emits warnings for dangerous baselines.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

const HOOK_PATH = path.resolve(
  __dirname,
  '../../../plugins/specweave/hooks/v2/dispatchers/session-start.sh',
);

function executeSessionStartHook(
  cwd: string,
  env?: Record<string, string>,
): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync('bash', [HOOK_PATH], {
    input: '{}',
    encoding: 'utf8',
    cwd,
    env: { ...process.env, ...env },
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status || 0,
  };
}

describe('Session-Start Prompt Health Check', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(tmpdir(), `specweave-health-test-${Date.now()}`);
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'logs'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should write prompt-health.json to .specweave/state/', () => {
    // Create a small CLAUDE.md
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(5000));
    executeSessionStartHook(tempDir);

    const healthFile = path.join(tempDir, '.specweave', 'state', 'prompt-health.json');
    expect(fs.existsSync(healthFile)).toBe(true);
  });

  it('should calculate baseline from CLAUDE.md + skill budget + system estimate', () => {
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(9000));
    executeSessionStartHook(tempDir, { SLASH_COMMAND_TOOL_CHAR_BUDGET: '30000' });

    const healthFile = path.join(tempDir, '.specweave', 'state', 'prompt-health.json');
    const data = JSON.parse(fs.readFileSync(healthFile, 'utf-8'));

    expect(data.claudeMdSize).toBe(9000);
    expect(data.skillBudget).toBe(30000);
    expect(data.systemEstimate).toBe(12000);
    expect(data.hookPerTurn).toBe(3000);
    // baseline = 9000 + memoryMd (varies: global ~/.claude/CLAUDE.md exists on some machines) + 30000 + 12000 + 3000
    const expectedBaseline = 9000 + data.memoryMdSize + 30000 + 12000 + 3000;
    expect(data.baseline).toBe(expectedBaseline);
  });

  it('should set warningLevel to "normal" when baseline < 80K', () => {
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(9000));
    executeSessionStartHook(tempDir, { SLASH_COMMAND_TOOL_CHAR_BUDGET: '30000' });

    const healthFile = path.join(tempDir, '.specweave', 'state', 'prompt-health.json');
    const data = JSON.parse(fs.readFileSync(healthFile, 'utf-8'));
    expect(data.warningLevel).toBe('normal');
  });

  it('should set warningLevel to "warning" when baseline > 80K', () => {
    // Create large CLAUDE.md to push baseline over 80K
    // 80001 - 12000 (system) - 15000 (default skill) - 3000 (hook) = 50001
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(51000));
    executeSessionStartHook(tempDir);

    const healthFile = path.join(tempDir, '.specweave', 'state', 'prompt-health.json');
    const data = JSON.parse(fs.readFileSync(healthFile, 'utf-8'));
    expect(data.warningLevel).toBe('warning');
  });

  it('should set warningLevel to "critical" when baseline > 120K', () => {
    // 120001 - 12000 - 15000 - 3000 = 90001
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(91000));
    executeSessionStartHook(tempDir);

    const healthFile = path.join(tempDir, '.specweave', 'state', 'prompt-health.json');
    const data = JSON.parse(fs.readFileSync(healthFile, 'utf-8'));
    expect(data.warningLevel).toBe('critical');
  });

  it('should emit systemMessage warning when baseline > 80K', () => {
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(51000));
    const result = executeSessionStartHook(tempDir);

    // Should contain a systemMessage JSON line with PROMPT HEALTH warning
    expect(result.stdout).toContain('PROMPT HEALTH');
    expect(result.stdout).toContain('systemMessage');
  });

  it('should emit systemMessage with CRITICAL when baseline > 120K', () => {
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(91000));
    const result = executeSessionStartHook(tempDir);

    expect(result.stdout).toContain('CRITICAL');
    expect(result.stdout).toContain('systemMessage');
  });

  it('should NOT emit warning when baseline is normal', () => {
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(5000));
    const result = executeSessionStartHook(tempDir);

    expect(result.stdout).not.toContain('PROMPT HEALTH');
  });

  it('should use default skill budget of 15000 when env var not set', () => {
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(5000));
    // Ensure SLASH_COMMAND_TOOL_CHAR_BUDGET is not set
    const env = { ...process.env };
    delete env.SLASH_COMMAND_TOOL_CHAR_BUDGET;
    const result = spawnSync('bash', [HOOK_PATH], {
      input: '{}',
      encoding: 'utf8',
      cwd: tempDir,
      env,
    });

    const healthFile = path.join(tempDir, '.specweave', 'state', 'prompt-health.json');
    if (fs.existsSync(healthFile)) {
      const data = JSON.parse(fs.readFileSync(healthFile, 'utf-8'));
      expect(data.skillBudget).toBe(15000);
    }
  });

  it('should include checkedAt timestamp', () => {
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(1000));
    executeSessionStartHook(tempDir);

    const healthFile = path.join(tempDir, '.specweave', 'state', 'prompt-health.json');
    const data = JSON.parse(fs.readFileSync(healthFile, 'utf-8'));
    expect(data.checkedAt).toBeDefined();
    expect(typeof data.checkedAt).toBe('string');
  });

  it('should handle missing CLAUDE.md gracefully (claudeMdSize=0)', () => {
    // No CLAUDE.md file
    executeSessionStartHook(tempDir);

    const healthFile = path.join(tempDir, '.specweave', 'state', 'prompt-health.json');
    const data = JSON.parse(fs.readFileSync(healthFile, 'utf-8'));
    expect(data.claudeMdSize).toBe(0);
  });
});
