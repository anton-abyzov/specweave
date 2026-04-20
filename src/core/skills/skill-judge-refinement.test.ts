/**
 * Tests for 0671 T-004 — judge-llm emits refinement signals on
 * skill-attributable rejection.
 *
 * BDD for T-004:
 *   Given a mock judge-llm-report.json with a finding that references skill
 *     slug "sw:architect" in its evidence,
 *   When the judge-llm skill's post-processing runs,
 *   Then a refinement signal is appended to skill-signals.json with
 *     source="judge-llm" and the correct targetSkill.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { SkillJudge, type JudgeResult } from './skill-judge.js';
import type { SignalFile } from '../../types/skill-signals.js';

describe('SkillJudge — refinement signal emission (0671 T-004)', () => {
  let tempRoot: string;
  let skillsRoot: string;
  let signalsPath: string;
  const incrementId = '0671';

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'sw-judge-refine-'));
    skillsRoot = join(tempRoot, 'plugins', 'specweave', 'skills');
    await mkdir(join(skillsRoot, 'architect'), { recursive: true });
    await writeFile(
      join(skillsRoot, 'architect', 'SKILL.md'),
      '# Architect\n\nPrefer microservices for any platform boundary.\n',
      'utf-8',
    );
    await mkdir(join(skillsRoot, 'pm'), { recursive: true });
    await writeFile(
      join(skillsRoot, 'pm', 'SKILL.md'),
      '# PM\n\nFocus on user stories before writing tasks.\n',
      'utf-8',
    );
    signalsPath = join(tempRoot, '.specweave', 'state', 'skill-signals.json');
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  function makeResult(overrides: Partial<JudgeResult> = {}): JudgeResult {
    return {
      verdict: 'FAIL',
      score: 40,
      summary: 'Implementation diverges from spec',
      strengths: [],
      concerns: [],
      recommendations: [],
      domainChecks: [],
      duration_ms: 1000,
      timedOut: false,
      ...overrides,
    };
  }

  async function readSignalsFile(): Promise<SignalFile> {
    const raw = await readFile(signalsPath, 'utf-8');
    return JSON.parse(raw) as SignalFile;
  }

  it('appends a refinement signal when the finding names a skill slug (FAIL → high)', async () => {
    const judge = new SkillJudge({ projectRoot: tempRoot });
    const result = makeResult({
      verdict: 'FAIL',
      concerns: [
        "finding #3 cites skill 'sw:architect' as inappropriate for CRUD scope",
      ],
    });

    judge.writeReport(incrementId, result, 'granted');
    await judge.emitRefinementSignals(incrementId, result);

    const signals = await readSignalsFile();
    expect(signals.signals).toHaveLength(1);
    const signal = signals.signals[0];
    expect(signal.type).toBe('refinement');
    if (signal.type !== 'refinement') throw new Error('type guard');
    expect(signal.source).toBe('judge-llm');
    expect(signal.targetSkill).toBe('sw:architect');
    expect(signal.severity).toBe('high');
    expect(signal.incrementId).toBe(incrementId);
    expect(signal.evidence).toContain('sw:architect');
  });

  it('maps CONCERNS verdict to severity=medium', async () => {
    const judge = new SkillJudge({ projectRoot: tempRoot });
    const result = makeResult({
      verdict: 'CONCERNS',
      recommendations: ['Review sw:architect advice for small CRUD scopes'],
    });

    await judge.emitRefinementSignals(incrementId, result);

    const signals = await readSignalsFile();
    expect(signals.signals).toHaveLength(1);
    const signal = signals.signals[0];
    if (signal.type !== 'refinement') throw new Error('type guard');
    expect(signal.severity).toBe('medium');
  });

  it('emits NO signal when verdict is PASS', async () => {
    const judge = new SkillJudge({ projectRoot: tempRoot });
    const result = makeResult({
      verdict: 'PASS',
      concerns: ['sw:architect is relevant but acceptable here'],
    });

    await judge.emitRefinementSignals(incrementId, result);

    // No signals file should exist — or it should be empty.
    try {
      const signals = await readSignalsFile();
      expect(signals.signals).toHaveLength(0);
    } catch (err: any) {
      expect(err.code).toBe('ENOENT');
    }
  });

  it('emits NO signal when no skill slug can be attributed (precision > recall)', async () => {
    const judge = new SkillJudge({ projectRoot: tempRoot });
    const result = makeResult({
      verdict: 'FAIL',
      concerns: ['Database migration failed due to timeout'],
    });

    await judge.emitRefinementSignals(incrementId, result);

    try {
      const signals = await readSignalsFile();
      expect(signals.signals).toHaveLength(0);
    } catch (err: any) {
      expect(err.code).toBe('ENOENT');
    }
  });

  it('deduplicates multiple mentions of the same skill into a single signal', async () => {
    const judge = new SkillJudge({ projectRoot: tempRoot });
    const result = makeResult({
      verdict: 'FAIL',
      summary: "sw:architect advice caused overengineering",
      concerns: [
        "finding #1: sw:architect required too many microservices",
        "finding #2: sw:architect again",
      ],
      recommendations: ["Ignore sw:architect for CRUD"],
    });

    await judge.emitRefinementSignals(incrementId, result);

    const signals = await readSignalsFile();
    expect(signals.signals).toHaveLength(1);
    const signal = signals.signals[0];
    if (signal.type !== 'refinement') throw new Error('type guard');
    expect(signal.targetSkill).toBe('sw:architect');
  });

  it('emits one signal per distinct attributable skill', async () => {
    const judge = new SkillJudge({ projectRoot: tempRoot });
    const result = makeResult({
      verdict: 'FAIL',
      concerns: [
        "sw:architect steered design wrong",
        "sw:pm did not split user stories",
      ],
    });

    await judge.emitRefinementSignals(incrementId, result);

    const signals = await readSignalsFile();
    expect(signals.signals).toHaveLength(2);
    const skills = signals.signals
      .filter((s) => s.type === 'refinement')
      .map((s) => (s.type === 'refinement' ? s.targetSkill : ''))
      .sort();
    expect(skills).toEqual(['sw:architect', 'sw:pm']);
  });

  it('writeReport triggers emission automatically (fire-and-forget)', async () => {
    const judge = new SkillJudge({ projectRoot: tempRoot });
    const result = makeResult({
      verdict: 'FAIL',
      concerns: ["sw:architect cited in finding"],
    });

    judge.writeReport(incrementId, result, 'granted');

    // Emission is async (void-returning inside writeReport). Await a
    // microtask / small delay to let it flush.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const signals = await readSignalsFile();
    expect(signals.signals.length).toBeGreaterThanOrEqual(1);
  });
});
