/**
 * Tests for the skill-signals writer — AC-US1-01.
 *
 * BDD for T-002:
 *   Given an empty signals file
 *   When `appendRefinement({source, targetSkill, severity, incrementId, evidence})` is called
 *   Then the file contains exactly one entry with type: "refinement", a generated id, and consumedBy: null
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { appendRefinementSignal, appendGenerationSignal } from './writer.js';
import { readSignals } from './reader.js';
import type { SignalFile } from '../../types/skill-signals.js';

describe('appendRefinementSignal', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sw-signal-writer-'));
    filePath = join(tempDir, '.specweave', 'state', 'skill-signals.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates the file and appends one refinement when file is missing', async () => {
    const signal = await appendRefinementSignal(filePath, {
      source: 'judge-llm',
      targetSkill: 'sw:architect',
      severity: 'high',
      incrementId: '0671',
      evidence: 'finding #3 cites skill instruction',
    });

    expect(signal.type).toBe('refinement');
    expect(signal.id).toMatch(/^sig_/);
    expect(signal.consumedBy).toBeNull();
    expect(signal.source).toBe('judge-llm');
    expect(signal.targetSkill).toBe('sw:architect');
    expect(signal.severity).toBe('high');
    expect(signal.incrementId).toBe('0671');
    expect(signal.evidence).toBe('finding #3 cites skill instruction');
    expect(signal.detectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const persisted = JSON.parse(await readFile(filePath, 'utf-8')) as SignalFile;
    expect(persisted.schemaVersion).toBe(2);
    expect(persisted.signals).toHaveLength(1);
    expect(persisted.signals[0]).toEqual(signal);
  });

  it('appends a refinement to an existing v2 file without touching earlier entries', async () => {
    await mkdir(join(tempDir, '.specweave', 'state'), { recursive: true });
    const initial: SignalFile = {
      schemaVersion: 2,
      signals: [
        {
          type: 'refinement',
          id: 'sig_EXISTING',
          source: 'rubric',
          targetSkill: 'sw:tdd-cycle',
          severity: 'medium',
          incrementId: '0660',
          evidence: 'pre-existing',
          detectedAt: '2026-04-15T00:00:00.000Z',
          consumedBy: null,
        },
      ],
    };
    await writeFile(filePath, JSON.stringify(initial, null, 2), 'utf-8');

    const signal = await appendRefinementSignal(filePath, {
      source: 'code-reviewer',
      targetSkill: 'sw:architect',
      severity: 'low',
      incrementId: '0671',
      evidence: 'critical finding attributable to skill',
    });

    const persisted = JSON.parse(await readFile(filePath, 'utf-8')) as SignalFile;
    expect(persisted.signals).toHaveLength(2);
    expect(persisted.signals[0].id).toBe('sig_EXISTING');
    expect(persisted.signals[1]).toEqual(signal);
  });

  it('upgrades a v1 file to v2 on first write', async () => {
    await mkdir(join(tempDir, '.specweave', 'state'), { recursive: true });
    const v1 = {
      version: '1.0',
      signals: [
        {
          id: 'sig-legacy',
          pattern: 'legacy-pattern',
          category: 'legacy-cat',
          description: 'legacy-desc',
          incrementIds: ['0650'],
          firstSeen: '2026-04-10T00:00:00Z',
          lastSeen: '2026-04-10T00:00:00Z',
          confidence: 1,
          evidence: ['legacy-ev'],
          suggested: false,
          declined: false,
          generated: false,
        },
      ],
    };
    await writeFile(filePath, JSON.stringify(v1, null, 2), 'utf-8');

    await appendRefinementSignal(filePath, {
      source: 'judge-llm',
      targetSkill: 'sw:architect',
      severity: 'high',
      incrementId: '0671',
      evidence: 'ev',
    });

    const persisted = JSON.parse(await readFile(filePath, 'utf-8')) as SignalFile;
    expect(persisted).not.toHaveProperty('version');
    expect(persisted.schemaVersion).toBe(2);
    expect(persisted.signals).toHaveLength(2);
    expect(persisted.signals[0].type).toBe('generation');
    expect(persisted.signals[0].id).toBe('sig-legacy');
    expect(persisted.signals[1].type).toBe('refinement');
  });

  it('generates a unique id per call', async () => {
    const a = await appendRefinementSignal(filePath, {
      source: 'rubric',
      targetSkill: 'sw:pm',
      severity: 'low',
      incrementId: '0671',
      evidence: 'a',
    });
    const b = await appendRefinementSignal(filePath, {
      source: 'rubric',
      targetSkill: 'sw:pm',
      severity: 'low',
      incrementId: '0671',
      evidence: 'b',
    });
    expect(a.id).not.toEqual(b.id);
  });

  it('honors id and detectedAt overrides for deterministic tests', async () => {
    const signal = await appendRefinementSignal(filePath, {
      source: 'judge-llm',
      targetSkill: 'sw:architect',
      severity: 'medium',
      incrementId: '0671',
      evidence: 'ev',
      id: 'sig_FIXED',
      detectedAt: '2026-04-20T00:00:00.000Z',
    });
    expect(signal.id).toBe('sig_FIXED');
    expect(signal.detectedAt).toBe('2026-04-20T00:00:00.000Z');
  });

  it('produces a reader-round-trip-safe file', async () => {
    const first = await appendRefinementSignal(filePath, {
      source: 'judge-llm',
      targetSkill: 'sw:architect',
      severity: 'high',
      incrementId: '0671',
      evidence: 'ev1',
    });
    const round = await readSignals(filePath);
    expect(round.schemaVersion).toBe(2);
    expect(round.signals).toEqual([first]);
  });
});

describe('appendGenerationSignal', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sw-signal-writer-gen-'));
    filePath = join(tempDir, '.specweave', 'state', 'skill-signals.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes a generation signal with type discriminator injected', async () => {
    const gen = await appendGenerationSignal(filePath, {
      id: 'sig-gen',
      pattern: 'p',
      category: 'c',
      description: 'd',
      incrementIds: ['0671'],
      firstSeen: '2026-04-20T00:00:00Z',
      lastSeen: '2026-04-20T00:00:00Z',
      confidence: 0.5,
      evidence: [],
      suggested: false,
      declined: false,
      generated: false,
    });
    expect(gen.type).toBe('generation');
    const round = await readSignals(filePath);
    expect(round.signals).toEqual([gen]);
  });
});
