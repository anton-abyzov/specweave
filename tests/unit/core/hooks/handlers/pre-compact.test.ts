/**
 * Pre-compact hook handler tests (TDD)
 *
 * Tests context pressure tracking when Claude Code triggers compaction.
 * Escalation: 1st=elevated, 2nd=critical, 3+=emergency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import type { HookContext, HookInput } from '../../../../../src/core/hooks/handlers/types.js';

describe('pre-compact handler', () => {
  let tempDir: string;
  let stateDir: string;
  let logsDir: string;
  let context: HookContext;
  const input: HookInput = {};

  beforeEach(() => {
    tempDir = path.join(tmpdir(), `sw-pre-compact-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    stateDir = path.join(tempDir, '.specweave', 'state');
    logsDir = path.join(tempDir, '.specweave', 'logs');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });

    context = {
      projectRoot: tempDir,
      stateDir,
      logsDir,
      configPath: path.join(tempDir, '.specweave', 'config.json'),
      timestamp: '2026-03-27T10:00:00.000Z',
    };
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    delete process.env.SPECWEAVE_DISABLE_HOOKS;
  });

  it('should return {continue:true} when SPECWEAVE_DISABLE_HOOKS=1', async () => {
    process.env.SPECWEAVE_DISABLE_HOOKS = '1';
    const { handle } = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
    const result = await handle(input, context);
    expect(result).toEqual({ continue: true });
    // Should NOT write any files
    expect(fs.existsSync(path.join(stateDir, 'context-pressure.json'))).toBe(false);
  });

  it('should create context-pressure.json with elevated level on first compaction', async () => {
    const { handle } = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
    const result = await handle(input, context);

    expect(result.continue).toBe(true);

    const pressure = JSON.parse(fs.readFileSync(path.join(stateDir, 'context-pressure.json'), 'utf-8'));
    expect(pressure.level).toBe('elevated');
    expect(pressure.compactionCount).toBe(1);
    expect(pressure.lastCompaction).toBeDefined();
  });

  it('should escalate to critical on second compaction', async () => {
    // Seed with count=1
    fs.writeFileSync(
      path.join(stateDir, 'context-pressure.json'),
      JSON.stringify({ level: 'elevated', compactionCount: 1, lastCompaction: '2026-03-27T09:00:00Z' }),
    );

    const { handle } = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
    const result = await handle(input, context);

    expect(result.continue).toBe(true);

    const pressure = JSON.parse(fs.readFileSync(path.join(stateDir, 'context-pressure.json'), 'utf-8'));
    expect(pressure.level).toBe('critical');
    expect(pressure.compactionCount).toBe(2);
  });

  it('should escalate to emergency on third+ compaction', async () => {
    fs.writeFileSync(
      path.join(stateDir, 'context-pressure.json'),
      JSON.stringify({ level: 'critical', compactionCount: 2, lastCompaction: '2026-03-27T09:00:00Z' }),
    );

    const { handle } = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
    const result = await handle(input, context);

    expect(result.continue).toBe(true);

    const pressure = JSON.parse(fs.readFileSync(path.join(stateDir, 'context-pressure.json'), 'utf-8'));
    expect(pressure.level).toBe('emergency');
    expect(pressure.compactionCount).toBe(3);
  });

  it('should stay emergency on 4th+ compaction', async () => {
    fs.writeFileSync(
      path.join(stateDir, 'context-pressure.json'),
      JSON.stringify({ level: 'emergency', compactionCount: 5, lastCompaction: '2026-03-27T09:00:00Z' }),
    );

    const { handle } = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
    const result = await handle(input, context);

    const pressure = JSON.parse(fs.readFileSync(path.join(stateDir, 'context-pressure.json'), 'utf-8'));
    expect(pressure.level).toBe('emergency');
    expect(pressure.compactionCount).toBe(6);
  });

  it('should write prompt-health-alert.json with advice', async () => {
    const { handle } = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
    await handle(input, context);

    const alert = JSON.parse(fs.readFileSync(path.join(stateDir, 'prompt-health-alert.json'), 'utf-8'));
    expect(alert.level).toBe('elevated');
    expect(alert.compactionCount).toBe(1);
    expect(alert.advice).toContain('compact');
    expect(alert.timestamp).toBeDefined();
  });

  it('should write critical advice on second compaction', async () => {
    fs.writeFileSync(
      path.join(stateDir, 'context-pressure.json'),
      JSON.stringify({ level: 'elevated', compactionCount: 1, lastCompaction: '2026-03-27T09:00:00Z' }),
    );

    const { handle } = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
    await handle(input, context);

    const alert = JSON.parse(fs.readFileSync(path.join(stateDir, 'prompt-health-alert.json'), 'utf-8'));
    expect(alert.level).toBe('critical');
    expect(alert.advice).toContain('new session');
  });

  it('should write emergency advice on third+ compaction', async () => {
    fs.writeFileSync(
      path.join(stateDir, 'context-pressure.json'),
      JSON.stringify({ level: 'critical', compactionCount: 2, lastCompaction: '2026-03-27T09:00:00Z' }),
    );

    const { handle } = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
    await handle(input, context);

    const alert = JSON.parse(fs.readFileSync(path.join(stateDir, 'prompt-health-alert.json'), 'utf-8'));
    expect(alert.level).toBe('emergency');
    expect(alert.advice).toContain('new session');
  });

  it('should log compaction event to prompt-health.log', async () => {
    const { handle } = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
    await handle(input, context);

    const logPath = path.join(logsDir, 'prompt-health.log');
    expect(fs.existsSync(logPath)).toBe(true);
    const logContent = fs.readFileSync(logPath, 'utf-8');
    expect(logContent).toContain('COMPACTION');
    expect(logContent).toContain('elevated');
  });

  it('should handle missing context-pressure.json (first run)', async () => {
    const { handle } = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
    const result = await handle(input, context);

    expect(result.continue).toBe(true);
    const pressure = JSON.parse(fs.readFileSync(path.join(stateDir, 'context-pressure.json'), 'utf-8'));
    expect(pressure.compactionCount).toBe(1);
  });

  it('should handle corrupted context-pressure.json', async () => {
    fs.writeFileSync(path.join(stateDir, 'context-pressure.json'), 'NOT JSON{{{');

    const { handle } = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
    const result = await handle(input, context);

    expect(result.continue).toBe(true);
    const pressure = JSON.parse(fs.readFileSync(path.join(stateDir, 'context-pressure.json'), 'utf-8'));
    expect(pressure.compactionCount).toBe(1);
  });

  it('should create stateDir if it does not exist', async () => {
    fs.rmSync(stateDir, { recursive: true, force: true });

    const { handle } = await import('../../../../../src/core/hooks/handlers/pre-compact.js');
    const result = await handle(input, context);

    expect(result.continue).toBe(true);
    expect(fs.existsSync(path.join(stateDir, 'context-pressure.json'))).toBe(true);
  });
});
