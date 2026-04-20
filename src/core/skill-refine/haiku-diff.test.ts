import { describe, it, expect, vi } from 'vitest';
import {
  proposeDiff,
  parseHaikuJson,
  buildUserPrompt,
  HAIKU_MODEL,
  type HaikuClientLike,
} from './haiku-diff';
import type { AggregateResult } from './aggregator';

function makeAggregate(): AggregateResult {
  return {
    targetSkill: 'sw:architect',
    window: { lastNIncrements: 5 },
    totalSignals: 2,
    bySource: { 'judge-llm': 1, rubric: 1, 'code-reviewer': 0 },
    bySeverity: { high: 1, medium: 1, low: 0 },
    incrementIds: ['0671', '0670'],
    evidence: ['e1', 'e2'],
    signals: [
      {
        type: 'refinement',
        id: 'sig_1',
        source: 'judge-llm',
        targetSkill: 'sw:architect',
        severity: 'high',
        incrementId: '0671',
        evidence: 'e1',
        detectedAt: '2026-04-20T00:00:00.000Z',
        consumedBy: null,
      },
      {
        type: 'refinement',
        id: 'sig_2',
        source: 'rubric',
        targetSkill: 'sw:architect',
        severity: 'medium',
        incrementId: '0670',
        evidence: 'e2',
        detectedAt: '2026-04-19T00:00:00.000Z',
        consumedBy: null,
      },
    ],
  };
}

function mockClient(responseText: string): { client: HaikuClientLike; calls: any[] } {
  const calls: any[] = [];
  const client: HaikuClientLike = {
    messages: {
      create: vi.fn(async (args) => {
        calls.push(args);
        return { content: [{ type: 'text', text: responseText }] };
      }),
    },
  };
  return { client, calls };
}

describe('haiku-diff parseHaikuJson', () => {
  it('parses plain JSON', () => {
    const r = parseHaikuJson(
      JSON.stringify({ diff: '--- a\n+++ b\n', rationale: 'fix X' }),
    );
    expect(r.diff).toBe('--- a\n+++ b\n');
    expect(r.rationale).toBe('fix X');
  });

  it('strips ```json fences', () => {
    const r = parseHaikuJson('```json\n{"diff":"d","rationale":"r"}\n```');
    expect(r).toEqual({ diff: 'd', rationale: 'r' });
  });

  it('throws on non-JSON', () => {
    expect(() => parseHaikuJson('I propose: change X')).toThrow(/non-JSON/);
  });

  it('throws when keys are missing', () => {
    expect(() => parseHaikuJson(JSON.stringify({ diff: 'x' }))).toThrow(/missing required keys/);
  });
});

describe('haiku-diff buildUserPrompt', () => {
  it('includes skill, window, source/severity counts, evidence, and SKILL.md body', () => {
    const prompt = buildUserPrompt('# Skill\nInstructions.', makeAggregate());
    expect(prompt).toContain('Target skill: sw:architect');
    expect(prompt).toContain('Window: last 5 increments');
    expect(prompt).toContain('judge-llm=1 rubric=1 code-reviewer=0');
    expect(prompt).toContain('high=1 medium=1 low=0');
    expect(prompt).toContain('1. [high/judge-llm/0671] e1');
    expect(prompt).toContain('2. [medium/rubric/0670] e2');
    expect(prompt).toContain('--- BEGIN CURRENT SKILL.md ---');
    expect(prompt).toContain('# Skill\nInstructions.');
    expect(prompt).toContain('--- END CURRENT SKILL.md ---');
  });

  it('is stable for same inputs (determinism prereq)', () => {
    const a = makeAggregate();
    const p1 = buildUserPrompt('body', a);
    const p2 = buildUserPrompt('body', a);
    expect(p1).toBe(p2);
  });

  it('handles empty signal list gracefully', () => {
    const empty: AggregateResult = {
      targetSkill: 'sw:x',
      window: { lastNIncrements: 5 },
      totalSignals: 0,
      bySource: { 'judge-llm': 0, rubric: 0, 'code-reviewer': 0 },
      bySeverity: { high: 0, medium: 0, low: 0 },
      incrementIds: [],
      evidence: [],
      signals: [],
    };
    const prompt = buildUserPrompt('body', empty);
    expect(prompt).toContain('(none)');
    expect(prompt).toContain('(no signals)');
  });
});

describe('haiku-diff proposeDiff', () => {
  it('calls the Anthropic client with temperature=0 and default Haiku model', async () => {
    const { client, calls } = mockClient(
      JSON.stringify({ diff: '--- a\n+++ b\n', rationale: 'tighten scope default' }),
    );
    const result = await proposeDiff({
      client,
      skillMd: '# Skill',
      aggregate: makeAggregate(),
    });
    expect(result.rationale).toBe('tighten scope default');
    expect(calls).toHaveLength(1);
    expect(calls[0].temperature).toBe(0);
    expect(calls[0].model).toBe(HAIKU_MODEL);
    expect(calls[0].system).toContain('SKILL.md');
    expect(calls[0].messages[0].role).toBe('user');
  });

  it('produces identical output for identical inputs (determinism)', async () => {
    const response = JSON.stringify({ diff: 'D', rationale: 'R' });
    const first = mockClient(response);
    const second = mockClient(response);
    const input = { skillMd: '# S', aggregate: makeAggregate() };

    const r1 = await proposeDiff({ client: first.client, ...input });
    const r2 = await proposeDiff({ client: second.client, ...input });
    expect(r1).toEqual(r2);
    // Same prompt sent both times
    expect(first.calls[0].messages[0].content).toBe(
      second.calls[0].messages[0].content,
    );
  });

  it('accepts a custom model override', async () => {
    const { client, calls } = mockClient(
      JSON.stringify({ diff: 'd', rationale: 'r' }),
    );
    await proposeDiff({
      client,
      skillMd: '#',
      aggregate: makeAggregate(),
      model: 'claude-sonnet-4-6',
    });
    expect(calls[0].model).toBe('claude-sonnet-4-6');
  });

  it('surfaces a helpful error when the model returns prose', async () => {
    const { client } = mockClient('I suggest adding a note.');
    await expect(
      proposeDiff({ client, skillMd: '#', aggregate: makeAggregate() }),
    ).rejects.toThrow(/non-JSON/);
  });
});
