/**
 * Tests for runSessionEndNudge — the orchestrator consumed by
 * completeIncrement. Exercises the full T-013/T-014 flow.
 *
 * BDD (T-013 AC-US3-01, AC-US3-03, AC-US3-04):
 *   Given a session with ≥1 refinement signal
 *   When /sw:done closes the increment
 *   Then a single-line prompt is printed; no command is auto-executed
 *
 * BDD (T-014 AC-US3-02):
 *   Given autoNudge: false is passed by the caller
 *   When /sw:done closes
 *   Then no nudge is printed
 */

import { PassThrough } from 'stream';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runSessionEndNudge } from './session-end-nudge.js';
import type { RefinementSignal, SignalFile } from '../../types/skill-signals.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'session-end-nudge-'));
  await mkdir(path.join(root, '.specweave', 'state'), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeConfig(cfg: unknown): Promise<void> {
  await writeFile(path.join(root, '.specweave', 'config.json'), JSON.stringify(cfg));
}

async function writeSignals(signals: RefinementSignal[]): Promise<void> {
  const file: SignalFile = { schemaVersion: 2, signals };
  await writeFile(path.join(root, '.specweave', 'state', 'skill-signals.json'), JSON.stringify(file));
}

function refinement(slug: string, severity: 'low' | 'medium' | 'high' = 'high'): RefinementSignal {
  return {
    type: 'refinement',
    id: `sig_${Math.random().toString(16).slice(2, 10)}`,
    source: 'judge-llm',
    targetSkill: slug,
    severity,
    incrementId: '0671',
    evidence: 'e',
    detectedAt: '2026-04-20T10:00:00Z',
    consumedBy: null,
  };
}

function makeStreams() {
  const stdin = new PassThrough() as PassThrough & { isTTY?: boolean };
  stdin.isTTY = false;
  const stdout = new PassThrough();
  const chunks: string[] = [];
  stdout.on('data', (c: Buffer) => chunks.push(c.toString('utf-8')));
  return { stdin, stdout, chunks };
}

describe('runSessionEndNudge', () => {
  it('prints a single-line nudge when a refinement signal exists (T-013, AC-US3-01)', async () => {
    await writeSignals([refinement('sw:architect')]);
    const { stdin, stdout, chunks } = makeStreams();

    const result = await runSessionEndNudge({
      projectRoot: root,
      incrementId: '0671',
      prompt: { stdin, stdout, timeoutMs: 50 },
    });

    expect(result.printed).toBe(true);
    expect(result.reason).toBe('has-refinement');
    const output = chunks.join('');
    expect(output.split('\n').filter((l) => l.length > 0)).toHaveLength(1);
    expect(output).toMatch(/Detected: sw:architect/);
    expect(output).toMatch(/\(y\/N\)$/m);
  });

  it('skips when the caller passes autoNudge: false (T-014, AC-US3-02)', async () => {
    await writeSignals([refinement('sw:architect'), refinement('sw:pm'), refinement('sw:tdd')]);
    const { stdin, stdout, chunks } = makeStreams();

    const result = await runSessionEndNudge({
      projectRoot: root,
      incrementId: '0671',
      autoNudge: false,
      prompt: { stdin, stdout, timeoutMs: 50 },
    });

    expect(result.printed).toBe(false);
    expect(result.reason).toBe('disabled');
    expect(chunks.join('')).toBe('');
  });

  it('skips silently when no signals are present (AC-US3-03 "no penalty")', async () => {
    const { stdin, stdout, chunks } = makeStreams();
    const result = await runSessionEndNudge({
      projectRoot: root,
      incrementId: '0671',
      prompt: { stdin, stdout, timeoutMs: 50 },
    });
    expect(result.printed).toBe(false);
    expect(result.reason).toBe('no-signal');
    expect(chunks.join('')).toBe('');
  });

  it('never executes any suggested command (AC-US3-04)', async () => {
    await writeSignals([refinement('sw:architect')]);
    const { stdin, stdout, chunks } = makeStreams();

    const result = await runSessionEndNudge({
      projectRoot: root,
      incrementId: '0671',
      prompt: { stdin, stdout, timeoutMs: 50 },
    });

    // Even in timeout/non-tty mode the output is just the rendered line.
    // No command strings are run — only printed.
    expect(chunks.join('')).toContain('sw:skill-refine sw:architect');
    expect(result.response).toBe('non-tty');
  });

  it('honors silent mode — no side effects, no read of state', async () => {
    await writeSignals([refinement('sw:architect')]);
    const { stdin, stdout, chunks } = makeStreams();

    const result = await runSessionEndNudge({
      projectRoot: root,
      incrementId: '0671',
      silent: true,
      prompt: { stdin, stdout, timeoutMs: 50 },
    });

    expect(result.printed).toBe(false);
    expect(chunks.join('')).toBe('');
  });

  it('is resilient to corrupted state — never throws', async () => {
    await writeFile(path.join(root, '.specweave', 'state', 'skill-signals.json'), '{not valid');
    const { stdin, stdout } = makeStreams();

    await expect(
      runSessionEndNudge({
        projectRoot: root,
        incrementId: '0671',
        prompt: { stdin, stdout, timeoutMs: 50 },
      }),
    ).resolves.toBeDefined();
  });
});
