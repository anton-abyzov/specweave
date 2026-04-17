/**
 * Tests for pretooluse-guard.ts TaskGet-based state (0669 Wave 3)
 *
 * Behavior under test:
 * - Primary: guard calls TaskGet (or equivalent task-state API) to read planner state
 * - Fallback: if TaskGet returns nothing, read filesystem markers (transition period)
 * - Tolerance: if neither TaskGet nor filesystem markers have state, return safe
 *   permissive default (do not block tool use on missing state — NFR-1.2).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  checkSkillChainState,
  type GuardContext,
  type TaskStateProvider,
} from '../../../../src/core/hooks/pretooluse-guard.js';

let tmpDir: string;

function makeContext(override: Partial<GuardContext> = {}): GuardContext {
  return {
    stateDir: tmpDir,
    incrementId: '0001-test',
    ...override,
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pretooluse-guard-test-'));
});

afterEach(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
  vi.restoreAllMocks();
});

describe('pretooluse-guard TaskGet-based state', () => {
  it('allows tool use when TaskGet returns planner state and no filesystem markers exist', async () => {
    const taskStateProvider: TaskStateProvider = vi.fn(async () => ({
      phase: 'planner-complete',
      incrementId: '0001-test',
      source: 'TaskGet',
    }));

    const result = await checkSkillChainState(makeContext(), taskStateProvider);

    expect(taskStateProvider).toHaveBeenCalled();
    expect(result.decision).toBe('allow');
    expect(result.source).toBe('task-state');
  });

  it('falls back to filesystem markers when TaskGet returns nothing (dual-read)', async () => {
    const markerPath = path.join(tmpDir, 'skill-chain-0001-test.json');
    fs.writeFileSync(
      markerPath,
      JSON.stringify({ phase: 'planner-complete', incrementId: '0001-test' }),
      'utf-8',
    );

    const taskStateProvider: TaskStateProvider = vi.fn(async () => null);

    const result = await checkSkillChainState(makeContext(), taskStateProvider);

    expect(taskStateProvider).toHaveBeenCalled();
    expect(result.decision).toBe('allow');
    expect(result.source).toBe('filesystem');
  });

  it('tolerates absence of both TaskGet state and filesystem markers gracefully (NFR-1.2)', async () => {
    const taskStateProvider: TaskStateProvider = vi.fn(async () => null);

    const result = await checkSkillChainState(makeContext(), taskStateProvider);

    expect(result.decision).toBe('allow');
    expect(result.source).toBe('default');
  });

  it('does not throw when filesystem marker file is malformed JSON', async () => {
    const markerPath = path.join(tmpDir, 'skill-chain-0001-test.json');
    fs.writeFileSync(markerPath, 'not valid json {', 'utf-8');

    const taskStateProvider: TaskStateProvider = vi.fn(async () => null);

    await expect(checkSkillChainState(makeContext(), taskStateProvider)).resolves.toBeDefined();
  });

  it('prefers TaskGet over filesystem when both are present', async () => {
    const markerPath = path.join(tmpDir, 'skill-chain-0001-test.json');
    fs.writeFileSync(
      markerPath,
      JSON.stringify({ phase: 'filesystem-phase' }),
      'utf-8',
    );

    const taskStateProvider: TaskStateProvider = vi.fn(async () => ({
      phase: 'taskget-phase',
      incrementId: '0001-test',
      source: 'TaskGet',
    }));

    const result = await checkSkillChainState(makeContext(), taskStateProvider);

    expect(result.source).toBe('task-state');
    expect(result.state?.phase).toBe('taskget-phase');
  });

  it('tolerates TaskGet provider throwing — falls back to filesystem then default', async () => {
    const taskStateProvider: TaskStateProvider = vi.fn(async () => {
      throw new Error('TaskGet unavailable');
    });

    const result = await checkSkillChainState(makeContext(), taskStateProvider);

    expect(result.decision).toBe('allow');
    // should not throw
  });
});
