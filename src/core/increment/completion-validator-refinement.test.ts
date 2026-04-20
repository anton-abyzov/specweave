/**
 * Tests for 0671 T-006 — completion-validator emits refinement signals
 * from code-reviewer findings.
 *
 * BDD for T-006:
 *   Given a code-reviewer critical finding attributable to a skill's
 *     instruction (via direct trace or evidence pattern match),
 *   When the review completes,
 *   Then a refinement signal is emitted with source="code-reviewer"
 *     and correct targetSkill.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { IncrementCompletionValidator } from './completion-validator.js';
import type { SignalFile } from '../../types/skill-signals.js';

describe('IncrementCompletionValidator — code-reviewer refinement emission (0671 T-006)', () => {
  let tempRoot: string;
  let skillsRoot: string;
  let signalsPath: string;
  const incrementId = '0671';

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'sw-cr-refine-'));
    skillsRoot = join(tempRoot, 'plugins', 'specweave', 'skills');
    await mkdir(join(skillsRoot, 'architect'), { recursive: true });
    await writeFile(
      join(skillsRoot, 'architect', 'SKILL.md'),
      '# Architect\n\nPrefer microservices for any platform boundary.\n',
      'utf-8',
    );
    await mkdir(join(skillsRoot, 'tdd-cycle'), { recursive: true });
    await writeFile(
      join(skillsRoot, 'tdd-cycle', 'SKILL.md'),
      '# TDD Cycle\n\nWrite the red test before any implementation.\n',
      'utf-8',
    );
    signalsPath = join(tempRoot, '.specweave', 'state', 'skill-signals.json');
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  async function readSignalsFile(): Promise<SignalFile> {
    const raw = await readFile(signalsPath, 'utf-8');
    return JSON.parse(raw) as SignalFile;
  }

  it('emits source="code-reviewer" with severity=high for a critical finding naming a skill slug', async () => {
    const report = {
      findings: [
        {
          severity: 'critical',
          title: 'Overengineered architecture',
          description: "Evidence cites sw:architect for mandating microservices on CRUD scope",
        },
      ],
    };

    await IncrementCompletionValidator.emitCodeReviewRefinementSignals(
      report,
      incrementId,
      tempRoot,
    );

    const signals = await readSignalsFile();
    expect(signals.signals).toHaveLength(1);
    const signal = signals.signals[0];
    expect(signal.type).toBe('refinement');
    if (signal.type !== 'refinement') throw new Error('type guard');
    expect(signal.source).toBe('code-reviewer');
    expect(signal.severity).toBe('high');
    expect(signal.targetSkill).toBe('sw:architect');
    expect(signal.incrementId).toBe(incrementId);
  });

  it('emits source="code-reviewer" for a HIGH finding (severity still high)', async () => {
    const report = {
      findings: [
        {
          severity: 'high',
          title: 'tdd cycle violation',
          description: 'code-reviewer: sw:tdd-cycle instruction to write the red test first was ignored',
        },
      ],
    };

    await IncrementCompletionValidator.emitCodeReviewRefinementSignals(
      report,
      incrementId,
      tempRoot,
    );

    const signals = await readSignalsFile();
    expect(signals.signals).toHaveLength(1);
    const signal = signals.signals[0];
    if (signal.type !== 'refinement') throw new Error('type guard');
    expect(signal.severity).toBe('high');
    expect(signal.targetSkill).toBe('sw:tdd-cycle');
  });

  it('emits NO signal for medium/low findings', async () => {
    const report = {
      findings: [
        {
          severity: 'medium',
          title: 'cite sw:architect',
          description: 'sw:architect is mentioned but severity is only medium',
        },
        {
          severity: 'low',
          title: 'minor',
          description: 'sw:tdd-cycle minor quibble',
        },
      ],
    };

    await IncrementCompletionValidator.emitCodeReviewRefinementSignals(
      report,
      incrementId,
      tempRoot,
    );

    try {
      const signals = await readSignalsFile();
      expect(signals.signals).toHaveLength(0);
    } catch (err: any) {
      expect(err.code).toBe('ENOENT');
    }
  });

  it('emits NO signal when no finding references a skill (precision > recall)', async () => {
    const report = {
      findings: [
        {
          severity: 'critical',
          title: 'Null pointer',
          description: 'Unhandled null in auth handler',
        },
        {
          severity: 'high',
          title: 'Missing index',
          description: 'Query scans full table',
        },
      ],
    };

    await IncrementCompletionValidator.emitCodeReviewRefinementSignals(
      report,
      incrementId,
      tempRoot,
    );

    try {
      const signals = await readSignalsFile();
      expect(signals.signals).toHaveLength(0);
    } catch (err: any) {
      expect(err.code).toBe('ENOENT');
    }
  });

  it('deduplicates multiple findings that blame the same skill into one signal', async () => {
    const report = {
      findings: [
        {
          severity: 'critical',
          description: 'sw:architect recommended microservices',
        },
        {
          severity: 'critical',
          description: 'sw:architect again steered design wrong',
        },
        {
          severity: 'high',
          description: 'sw:architect mentioned in logs',
        },
      ],
    };

    await IncrementCompletionValidator.emitCodeReviewRefinementSignals(
      report,
      incrementId,
      tempRoot,
    );

    const signals = await readSignalsFile();
    expect(signals.signals).toHaveLength(1);
    const signal = signals.signals[0];
    if (signal.type !== 'refinement') throw new Error('type guard');
    expect(signal.targetSkill).toBe('sw:architect');
  });

  it('emits one signal per distinct skill across multiple findings', async () => {
    const report = {
      findings: [
        {
          severity: 'critical',
          description: 'sw:architect overengineered design',
        },
        {
          severity: 'high',
          description: 'sw:tdd-cycle red-before-green was not followed',
        },
      ],
    };

    await IncrementCompletionValidator.emitCodeReviewRefinementSignals(
      report,
      incrementId,
      tempRoot,
    );

    const signals = await readSignalsFile();
    expect(signals.signals).toHaveLength(2);
    const skills = signals.signals
      .filter((s) => s.type === 'refinement')
      .map((s) => (s.type === 'refinement' ? s.targetSkill : ''))
      .sort();
    expect(skills).toEqual(['sw:architect', 'sw:tdd-cycle']);
  });

  it('handles missing/malformed findings array without throwing', async () => {
    // No findings field at all.
    await expect(
      IncrementCompletionValidator.emitCodeReviewRefinementSignals(
        {},
        incrementId,
        tempRoot,
      ),
    ).resolves.not.toThrow();

    // Non-array findings.
    await expect(
      IncrementCompletionValidator.emitCodeReviewRefinementSignals(
        { findings: 'not an array' } as any,
        incrementId,
        tempRoot,
      ),
    ).resolves.not.toThrow();

    // Should have produced no signals file.
    try {
      await readFile(signalsPath, 'utf-8');
      throw new Error('expected file to not exist');
    } catch (err: any) {
      expect(err.code).toBe('ENOENT');
    }
  });
});
