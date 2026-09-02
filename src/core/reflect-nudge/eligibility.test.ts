/**
 * Tests for checkNudgeEligibility — the gate that decides whether
 * the session-end nudge fires (AC-US3-01, AC-US3-02).
 */

import { mkdtemp, mkdir, writeFile, rm, utimes } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkNudgeEligibility } from './eligibility.js';
import type { RefinementSignal, SignalFile } from '../../types/skill-signals.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'reflect-nudge-elig-'));
  await mkdir(path.join(root, '.specweave', 'state'), { recursive: true });
  await mkdir(path.join(root, '.specweave', 'increments'), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeConfig(partial: unknown): Promise<void> {
  await writeFile(path.join(root, '.specweave', 'config.json'), JSON.stringify(partial));
}

async function writeIncrementMeta(id: string, fullSlug: string, mtimeMs: number): Promise<void> {
  const dir = path.join(root, '.specweave', 'increments', fullSlug);
  await mkdir(dir, { recursive: true });
  const metadata = path.join(dir, 'metadata.json');
  await writeFile(metadata, JSON.stringify({ id }));
  const d = new Date(mtimeMs);
  await utimes(metadata, d, d);
}

async function writeSignals(signals: RefinementSignal[]): Promise<void> {
  const file: SignalFile = { schemaVersion: 2, signals };
  await writeFile(
    path.join(root, '.specweave', 'state', 'skill-signals.json'),
    JSON.stringify(file),
  );
}

function refinement(targetSkill: string, severity: 'low' | 'medium' | 'high' = 'high'): RefinementSignal {
  return {
    type: 'refinement',
    id: `sig_${Math.random().toString(16).slice(2, 10)}`,
    source: 'judge-llm',
    targetSkill,
    severity,
    incrementId: '0671',
    evidence: 'e',
    detectedAt: '2026-04-20T10:00:00Z',
    consumedBy: null,
  };
}

describe('checkNudgeEligibility', () => {
  it('2.0 has no reflect config key — a stale reflect block no longer disables the nudge', async () => {
    await writeConfig({ reflect: { autoNudge: false } });
    await writeSignals([refinement('sw:architect'), refinement('sw:architect'), refinement('sw:architect')]);

    const result = await checkNudgeEligibility({ projectRoot: root, incrementId: '0671' });
    expect(result.shouldNudge).toBe(true);
  });

  it('nudges when config is missing (AC-US3-02 default)', async () => {
    await writeSignals([refinement('sw:architect')]);

    const result = await checkNudgeEligibility({ projectRoot: root, incrementId: '0671' });
    expect(result.shouldNudge).toBe(true);
    expect(result.reason).toBe('has-refinement');
  });

  it('nudges when the config carries no nudge settings', async () => {
    await writeConfig({ project: { name: 'test' } });
    await writeSignals([refinement('sw:architect')]);

    const result = await checkNudgeEligibility({ projectRoot: root, incrementId: '0671' });
    expect(result.shouldNudge).toBe(true);
  });

  it('returns shouldNudge=false when no signals and no learning (AC-US3-03 "no penalty")', async () => {
    const result = await checkNudgeEligibility({ projectRoot: root, incrementId: '0671' });
    expect(result.shouldNudge).toBe(false);
    expect(result.reason).toBe('no-signal');
    expect(result.topRefinement).toBeNull();
  });

  it('nudges on a single refinement signal (threshold=1 for nudge path, AC-US3-01)', async () => {
    await writeSignals([refinement('sw:architect', 'medium')]);

    const result = await checkNudgeEligibility({ projectRoot: root, incrementId: '0671' });
    expect(result.shouldNudge).toBe(true);
    expect(result.reason).toBe('has-refinement');
    expect(result.topRefinement?.slug).toBe('sw:architect');
  });

  it('picks the highest-severity refinement as the top suggestion', async () => {
    await writeSignals([
      refinement('sw:pm', 'low'),
      refinement('sw:architect', 'high'),
      refinement('sw:tdd', 'medium'),
    ]);

    const result = await checkNudgeEligibility({ projectRoot: root, incrementId: '0671' });
    expect(result.topRefinement?.slug).toBe('sw:architect');
  });

  it('detects fresh learnings written during the session', async () => {
    // Increment metadata old; skill-memories file newer.
    const metaTime = Date.now() - 60_000;
    await writeIncrementMeta('0671', '0671-skill-refinement-loop', metaTime);

    const memoriesDir = path.join(root, '.specweave', 'skill-memories');
    await mkdir(memoriesDir, { recursive: true });
    const memoryFile = path.join(memoriesDir, 'architect.md');
    await writeFile(memoryFile, '# architect\n- fresh learning\n');
    const newerTime = new Date(metaTime + 30_000);
    await utimes(memoryFile, newerTime, newerTime);

    const result = await checkNudgeEligibility({ projectRoot: root, incrementId: '0671' });
    expect(result.hasHighConfidenceLearning).toBe(true);
    expect(result.shouldNudge).toBe(true);
    expect(result.reason).toBe('has-learning');
  });

  it('does not treat stale skill-memory files as fresh learnings', async () => {
    const metaTime = Date.now();
    await writeIncrementMeta('0671', '0671-skill-refinement-loop', metaTime);

    const memoriesDir = path.join(root, '.specweave', 'skill-memories');
    await mkdir(memoriesDir, { recursive: true });
    const memoryFile = path.join(memoriesDir, 'architect.md');
    await writeFile(memoryFile, '# architect\n- stale\n');
    const olderTime = new Date(metaTime - 60_000);
    await utimes(memoryFile, olderTime, olderTime);

    const result = await checkNudgeEligibility({ projectRoot: root, incrementId: '0671' });
    expect(result.hasHighConfidenceLearning).toBe(false);
    expect(result.shouldNudge).toBe(false);
  });

  it('honors the autoNudge override parameter (for tests/integrations)', async () => {
    await writeSignals([refinement('sw:architect')]);

    const disabled = await checkNudgeEligibility({ projectRoot: root, incrementId: '0671', autoNudge: false });
    expect(disabled.shouldNudge).toBe(false);
    expect(disabled.reason).toBe('disabled');

    const enabled = await checkNudgeEligibility({ projectRoot: root, incrementId: '0671', autoNudge: true });
    expect(enabled.shouldNudge).toBe(true);
  });

  it('never throws on malformed config', async () => {
    await writeFile(path.join(root, '.specweave', 'config.json'), 'not json{{{');
    await writeSignals([refinement('sw:architect')]);

    const result = await checkNudgeEligibility({ projectRoot: root, incrementId: '0671' });
    expect(result.shouldNudge).toBe(true);
  });
});
