import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  parseArgs,
  detectSessionLock,
  resolveSkillPath,
  renderSignalReport,
  runSkillRefine,
} from './skill-refine';
import type { HaikuClientLike } from '../core/skill-refine/haiku-diff';

function makeStdout() {
  const buf: string[] = [];
  return {
    write: (s: string) => {
      buf.push(s);
      return true;
    },
    get text() {
      return buf.join('');
    },
  };
}

describe('parseArgs', () => {
  it('parses skill slug + defaults', () => {
    const a = parseArgs(['sw:architect']);
    expect(a).toEqual({
      skillSlug: 'sw:architect',
      dryRun: false,
      showSignals: false,
      scope: 'project',
      lastN: undefined,
    });
  });

  it('parses --dry-run --show-signals --scope user --last-n 3', () => {
    const a = parseArgs([
      'sw:pm',
      '--dry-run',
      '--show-signals',
      '--scope',
      'user',
      '--last-n',
      '3',
    ]);
    expect(a.dryRun).toBe(true);
    expect(a.showSignals).toBe(true);
    expect(a.scope).toBe('user');
    expect(a.lastN).toBe(3);
  });

  it('rejects missing slug', () => {
    expect(() => parseArgs([])).toThrow(/missing required argument/);
  });

  it('rejects multiple slugs (one skill per invocation)', () => {
    expect(() => parseArgs(['sw:a', 'sw:b'])).toThrow(/one skill per invocation/);
  });

  it('rejects invalid scope', () => {
    expect(() => parseArgs(['sw:a', '--scope', 'global'])).toThrow(/must be 'project' or 'user'/);
  });

  it('rejects non-positive --last-n', () => {
    expect(() => parseArgs(['sw:a', '--last-n', '0'])).toThrow(/positive integer/);
    expect(() => parseArgs(['sw:a', '--last-n', 'abc'])).toThrow(/positive integer/);
  });

  it('rejects unknown flag', () => {
    expect(() => parseArgs(['sw:a', '--force'])).toThrow(/unknown flag/);
  });
});

describe('detectSessionLock', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sess-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns null when no lock present', () => {
    expect(detectSessionLock(dir, {})).toBeNull();
  });

  it('returns reason when SPECWEAVE_SESSION_ACTIVE=1', () => {
    const r = detectSessionLock(dir, { SPECWEAVE_SESSION_ACTIVE: '1' });
    expect(r).toMatch(/SPECWEAVE_SESSION_ACTIVE=1/);
    expect(r).toMatch(/ADR-0671-01/);
  });

  it('treats SPECWEAVE_SESSION_ACTIVE=0 as inactive', () => {
    expect(detectSessionLock(dir, { SPECWEAVE_SESSION_ACTIVE: '0' })).toBeNull();
  });

  it('returns reason when .specweave/state/active-session.lock exists', () => {
    mkdirSync(join(dir, '.specweave/state'), { recursive: true });
    writeFileSync(join(dir, '.specweave/state/active-session.lock'), '');
    const r = detectSessionLock(dir, {});
    expect(r).toMatch(/active-session\.lock/);
  });
});

describe('resolveSkillPath', () => {
  it('project scope maps sw:architect → .claude/skills/sw-architect/SKILL.md', () => {
    const p = resolveSkillPath('sw:architect', 'project', '/root');
    expect(p).toBe('/root/.claude/skills/sw-architect/SKILL.md');
  });

  it('user scope targets ~/.claude/skills/<slug-dir>/SKILL.md', () => {
    const p = resolveSkillPath('my-skill', 'user', '/root');
    expect(p).toContain('/.claude/skills/my-skill/SKILL.md');
  });
});

describe('renderSignalReport', () => {
  it('produces deterministic output with evidence listing', () => {
    const text = renderSignalReport({
      targetSkill: 'sw:architect',
      window: { lastNIncrements: 5 },
      totalSignals: 1,
      bySource: { 'judge-llm': 1, rubric: 0, 'code-reviewer': 0 },
      bySeverity: { high: 1, medium: 0, low: 0 },
      incrementIds: ['0671'],
      evidence: ['e'],
      signals: [
        {
          type: 'refinement',
          id: 'sig_1',
          source: 'judge-llm',
          targetSkill: 'sw:architect',
          severity: 'high',
          incrementId: '0671',
          evidence: 'e',
          detectedAt: '2026-04-20T00:00:00.000Z',
          consumedBy: null,
        },
      ],
    });
    expect(text).toContain('Window: last 5 increments');
    expect(text).toContain('Total: 1');
    expect(text).toContain('judge-llm=1');
    expect(text).toContain('high=1');
    expect(text).toContain('[high/judge-llm/0671] e');
  });

  it('falls back to "(none)" with no signals', () => {
    const text = renderSignalReport({
      targetSkill: 'sw:x',
      window: { lastNIncrements: 5 },
      totalSignals: 0,
      bySource: { 'judge-llm': 0, rubric: 0, 'code-reviewer': 0 },
      bySeverity: { high: 0, medium: 0, low: 0 },
      incrementIds: [],
      evidence: [],
      signals: [],
    });
    expect(text).toContain('(none)');
  });
});

describe('runSkillRefine — end-to-end with stubs', () => {
  let projectRoot: string;
  let skillPath: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'sr-'));
    skillPath = join(projectRoot, '.claude/skills/sw-architect/SKILL.md');
    mkdirSync(join(projectRoot, '.claude/skills/sw-architect'), { recursive: true });
    writeFileSync(skillPath, '# sw:architect\nInstructions.\n', 'utf-8');
  });
  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  function writeSignals(signals: any[]) {
    mkdirSync(join(projectRoot, '.specweave/state'), { recursive: true });
    writeFileSync(
      join(projectRoot, '.specweave/state/skill-signals.json'),
      JSON.stringify({ schemaVersion: 2, signals }, null, 2),
    );
  }

  const sampleSignal = {
    type: 'refinement',
    id: 'sig_A',
    source: 'judge-llm',
    targetSkill: 'sw:architect',
    severity: 'high',
    incrementId: '0671',
    evidence: 'skill ACtivity issue',
    detectedAt: '2026-04-20T12:00:00.000Z',
    consumedBy: null,
  };

  it('session-lock: refuses to run under SPECWEAVE_SESSION_ACTIVE and returns rejected', async () => {
    writeSignals([sampleSignal]);
    const stdout = makeStdout();
    const res = await runSkillRefine({
      projectRoot,
      argv: ['sw:architect'],
      stdout,
      env: { SPECWEAVE_SESSION_ACTIVE: '1' },
    });
    expect(res.status).toBe('rejected');
    expect(stdout.text).toMatch(/refusing to run/);
  });

  it('missing SKILL.md → no-diff result with helpful message', async () => {
    const stdout = makeStdout();
    const res = await runSkillRefine({
      projectRoot,
      argv: ['sw:unknown-skill'],
      stdout,
      env: {},
    });
    expect(res.status).toBe('no-diff');
    expect(stdout.text).toMatch(/Nothing to refine/);
  });

  it('--show-signals: prints report, does not call LLM', async () => {
    writeSignals([sampleSignal]);
    const stdout = makeStdout();
    const client: HaikuClientLike = {
      messages: { create: vi.fn() as any },
    };
    const res = await runSkillRefine({
      projectRoot,
      argv: ['sw:architect', '--show-signals'],
      stdout,
      env: {},
      client,
    });
    expect(res.status).toBe('shown-signals');
    expect(stdout.text).toMatch(/Total: 1/);
    expect(client.messages.create).not.toHaveBeenCalled();
  });

  it('no signals: returns no-signals without calling LLM', async () => {
    writeSignals([]);
    const stdout = makeStdout();
    const client: HaikuClientLike = {
      messages: { create: vi.fn() as any },
    };
    const res = await runSkillRefine({
      projectRoot,
      argv: ['sw:architect'],
      stdout,
      env: {},
      client,
    });
    expect(res.status).toBe('no-signals');
    expect(client.messages.create).not.toHaveBeenCalled();
  });

  it('--dry-run: calls LLM, prints diff, writes NOTHING', async () => {
    writeSignals([sampleSignal]);
    const stdout = makeStdout();
    const client: HaikuClientLike = {
      messages: {
        create: vi.fn(async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                diff: '--- a/SKILL.md\n+++ b/SKILL.md\n@@\n-x\n+y\n',
                rationale: 'fix guidance',
              }),
            },
          ],
        })) as any,
      },
    };
    const res = await runSkillRefine({
      projectRoot,
      argv: ['sw:architect', '--dry-run'],
      stdout,
      env: {},
      client,
    });
    expect(res.status).toBe('dry-run');
    expect(stdout.text).toMatch(/Rationale: fix guidance/);
    expect(stdout.text).toMatch(/--- a\/SKILL\.md/);
    // No ledger entry was written
    expect(existsSync(join(projectRoot, '.specweave/state/skill-refinements.json'))).toBe(false);
    // SKILL.md unchanged
    const fs = await import('fs');
    expect(fs.readFileSync(skillPath, 'utf-8')).toBe('# sw:architect\nInstructions.\n');
  });

  it('reject flow: records rejection in ledger, no write, no commit', async () => {
    writeSignals([sampleSignal]);
    const stdout = makeStdout();
    const client: HaikuClientLike = {
      messages: {
        create: vi.fn(async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({ diff: 'd\n', rationale: 'r' }),
            },
          ],
        })) as any,
      },
    };
    const res = await runSkillRefine({
      projectRoot,
      argv: ['sw:architect'],
      stdout,
      env: {},
      client,
      prompts: {
        chooseAction: vi.fn(async () => 'reject' as const),
        askRejectionReason: vi.fn(async () => 'I disagree'),
        editDiff: vi.fn(),
      },
    });
    expect(res.status).toBe('rejected');
    const ledger = JSON.parse(
      await (await import('fs')).promises.readFile(
        join(projectRoot, '.specweave/state/skill-refinements.json'),
        'utf-8',
      ),
    );
    expect(ledger.refinements).toHaveLength(1);
    expect(ledger.refinements[0].status).toBe('rejected');
    expect(ledger.refinements[0].rejectionReason).toBe('I disagree');
  });

  it('empty Haiku diff: no-diff, no approval prompt, no writes', async () => {
    writeSignals([sampleSignal]);
    const promptChoose = vi.fn();
    const stdout = makeStdout();
    const client: HaikuClientLike = {
      messages: {
        create: vi.fn(async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({ diff: '', rationale: 'nothing to do' }),
            },
          ],
        })) as any,
      },
    };
    const res = await runSkillRefine({
      projectRoot,
      argv: ['sw:architect'],
      stdout,
      env: {},
      client,
      prompts: {
        chooseAction: promptChoose as any,
        askRejectionReason: vi.fn(),
        editDiff: vi.fn(),
      },
    });
    expect(res.status).toBe('no-diff');
    expect(promptChoose).not.toHaveBeenCalled();
  });

  it('requires an Anthropic client when past --show-signals + non-empty signals', async () => {
    writeSignals([sampleSignal]);
    await expect(
      runSkillRefine({
        projectRoot,
        argv: ['sw:architect'],
        env: {},
      }),
    ).rejects.toThrow(/Anthropic client/);
  });
});
