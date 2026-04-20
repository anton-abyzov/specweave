/**
 * Tests for 0671 T-005 — rubric evaluator emits refinement signals.
 *
 * BDD for T-005:
 *   Given a rubric criterion has failed and the rubric rationale references
 *     a skill's instruction,
 *   When the evaluator finalizes the report,
 *   Then a refinement signal is emitted with source="rubric" and
 *     targetSkill populated via the attribution heuristics.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { evaluateRubric } from './rubric-evaluator.js';
import type { RubricDocument } from './types.js';
import type { SignalFile } from '../../types/skill-signals.js';

describe('evaluateRubric — refinement signal emission (0671 T-005)', () => {
  let tempRoot: string;
  let reportsDir: string;
  let skillsRoot: string;
  let signalsPath: string;
  const incrementId = '0671';

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'sw-rubric-refine-'));
    reportsDir = join(tempRoot, '.specweave', 'increments', incrementId, 'reports');
    await mkdir(reportsDir, { recursive: true });

    skillsRoot = join(tempRoot, 'plugins', 'specweave', 'skills');
    await mkdir(join(skillsRoot, 'architect'), { recursive: true });
    await writeFile(
      join(skillsRoot, 'architect', 'SKILL.md'),
      '# Architect\n\nAlways prefer microservices for platform boundaries.\n',
      'utf-8',
    );
    await mkdir(join(skillsRoot, 'tdd-cycle'), { recursive: true });
    await writeFile(
      join(skillsRoot, 'tdd-cycle', 'SKILL.md'),
      '# TDD Cycle\n\nWrite the red test before any implementation.\n',
      'utf-8',
    );

    signalsPath = join(tempRoot, '.specweave', 'state', 'skill-signals.json');

    // Minimal grill / code-review reports so evaluation can run.
    await writeFile(
      join(reportsDir, 'grill-report.json'),
      JSON.stringify({ shipReadiness: 'NOT READY', acCompliance: { results: [] } }),
      'utf-8',
    );
    await writeFile(
      join(reportsDir, 'code-review-report.json'),
      JSON.stringify({ summary: { critical: 1, high: 0, medium: 0, low: 0, info: 0 } }),
      'utf-8',
    );
    await writeFile(
      join(reportsDir, 'judge-llm-report.json'),
      JSON.stringify({ verdict: 'REJECTED' }),
      'utf-8',
    );
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  function makeRubric(
    overrides: Partial<RubricDocument['criteria'][number]> = {},
  ): RubricDocument {
    return {
      incrementId,
      title: 'Test rubric',
      generated: '2026-04-20',
      source: 'test',
      version: '1.0',
      status: 'draft',
      criteria: [
        {
          id: 'C-1',
          title: 'Skip validation check',
          severity: 'blocking',
          sourceACs: ['AC-US1-01'],
          evaluator: 'sw:grill',
          category: 'functional-correctness',
          verify: 'sw:architect told agent to skip validation on CRUD',
          threshold: 'no skipped validations',
          result: null,
          ...overrides,
        },
      ],
    };
  }

  async function readSignalsFile(): Promise<SignalFile> {
    const raw = await readFile(signalsPath, 'utf-8');
    return JSON.parse(raw) as SignalFile;
  }

  it('emits source="rubric" with severity=high for a failed blocking criterion', async () => {
    const rubric = makeRubric();
    await evaluateRubric(rubric, reportsDir, {
      projectRoot: tempRoot,
      incrementId,
    });

    const signals = await readSignalsFile();
    expect(signals.signals).toHaveLength(1);
    const signal = signals.signals[0];
    expect(signal.type).toBe('refinement');
    if (signal.type !== 'refinement') throw new Error('type guard');
    expect(signal.source).toBe('rubric');
    expect(signal.severity).toBe('high');
    expect(signal.targetSkill).toBe('sw:architect');
    expect(signal.incrementId).toBe(incrementId);
  });

  it('maps advisory severity to medium', async () => {
    const rubric = makeRubric({ severity: 'advisory' });
    await evaluateRubric(rubric, reportsDir, {
      projectRoot: tempRoot,
      incrementId,
    });

    const signals = await readSignalsFile();
    expect(signals.signals).toHaveLength(1);
    const signal = signals.signals[0];
    if (signal.type !== 'refinement') throw new Error('type guard');
    expect(signal.severity).toBe('medium');
  });

  it('emits NO signal when the failed criterion has no skill-attributable rationale', async () => {
    const rubric = makeRubric({
      verify: 'Unit-test coverage must exceed 90%',
      threshold: '90',
    });
    await evaluateRubric(rubric, reportsDir, {
      projectRoot: tempRoot,
      incrementId,
    });

    try {
      const signals = await readSignalsFile();
      expect(signals.signals).toHaveLength(0);
    } catch (err: any) {
      expect(err.code).toBe('ENOENT');
    }
  });

  it('emits NO signal for passing criteria', async () => {
    // Rewrite grill report so the criterion passes.
    await writeFile(
      join(reportsDir, 'grill-report.json'),
      JSON.stringify({
        shipReadiness: 'READY',
        acCompliance: {
          results: [{ acId: 'AC-US1-01', status: 'pass' }],
        },
      }),
      'utf-8',
    );

    const rubric = makeRubric();
    await evaluateRubric(rubric, reportsDir, {
      projectRoot: tempRoot,
      incrementId,
    });

    try {
      const signals = await readSignalsFile();
      expect(signals.signals).toHaveLength(0);
    } catch (err: any) {
      expect(err.code).toBe('ENOENT');
    }
  });

  it('is backward-compatible — no emission when projectRoot/incrementId not provided', async () => {
    const rubric = makeRubric();
    await evaluateRubric(rubric, reportsDir);

    // No signals file written.
    try {
      await readFile(signalsPath, 'utf-8');
      throw new Error('expected file to not exist');
    } catch (err: any) {
      expect(err.code).toBe('ENOENT');
    }
  });

  it('deduplicates multiple failing criteria that blame the same skill, keeping the highest severity', async () => {
    const rubric: RubricDocument = {
      incrementId,
      title: 'Test rubric',
      generated: '2026-04-20',
      source: 'test',
      version: '1.0',
      status: 'draft',
      criteria: [
        {
          id: 'C-1',
          title: 'adv',
          severity: 'advisory',
          sourceACs: ['AC-US1-01'],
          evaluator: 'sw:grill',
          category: 'functional-correctness',
          verify: 'sw:architect misled on CRUD',
          threshold: '',
          result: null,
        },
        {
          id: 'C-2',
          title: 'block',
          severity: 'blocking',
          sourceACs: ['AC-US1-01'],
          evaluator: 'sw:grill',
          category: 'functional-correctness',
          verify: 'sw:architect again misled',
          threshold: '',
          result: null,
        },
      ],
    };

    await evaluateRubric(rubric, reportsDir, {
      projectRoot: tempRoot,
      incrementId,
    });

    const signals = await readSignalsFile();
    expect(signals.signals).toHaveLength(1);
    const signal = signals.signals[0];
    if (signal.type !== 'refinement') throw new Error('type guard');
    expect(signal.targetSkill).toBe('sw:architect');
    expect(signal.severity).toBe('high'); // blocking upgrade wins
  });

  it('emits one signal per distinct skill when multiple criteria fail for different skills', async () => {
    const rubric: RubricDocument = {
      incrementId,
      title: 'Test rubric',
      generated: '2026-04-20',
      source: 'test',
      version: '1.0',
      status: 'draft',
      criteria: [
        {
          id: 'C-1',
          title: 'a',
          severity: 'blocking',
          sourceACs: ['AC-US1-01'],
          evaluator: 'sw:grill',
          category: 'functional-correctness',
          verify: 'sw:architect guidance incorrect here',
          threshold: '',
          result: null,
        },
        {
          id: 'C-2',
          title: 'b',
          severity: 'advisory',
          sourceACs: ['AC-US1-01'],
          evaluator: 'sw:grill',
          category: 'functional-correctness',
          verify: 'sw:tdd-cycle instruction skipped',
          threshold: '',
          result: null,
        },
      ],
    };

    await evaluateRubric(rubric, reportsDir, {
      projectRoot: tempRoot,
      incrementId,
    });

    const signals = await readSignalsFile();
    expect(signals.signals).toHaveLength(2);
    const skills = signals.signals
      .filter((s) => s.type === 'refinement')
      .map((s) => (s.type === 'refinement' ? s.targetSkill : ''))
      .sort();
    expect(skills).toEqual(['sw:architect', 'sw:tdd-cycle']);
  });
});
