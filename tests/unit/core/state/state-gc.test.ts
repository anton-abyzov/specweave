import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, utimesSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  planStatePurge,
  purgeState,
  isGcDue,
  findNestedSpecweaveDirs,
  worktreesSize,
  GC_MARKER,
  STATE_KEEP,
} from '../../../../src/core/state/state-gc.js';

let root: string;
let stateDir: string;

const DAY = 24 * 60 * 60 * 1000;

function touch(rel: string, content = 'x', ageMs = 0): string {
  const full = join(stateDir, ...rel.split('/'));
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
  if (ageMs > 0) {
    const t = (Date.now() - ageMs) / 1000;
    utimesSync(full, t, t);
  }
  return full;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'state-gc-'));
  stateDir = join(root, '.specweave', 'state');
  mkdirSync(stateDir, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function seedJunkAndKeep(): { junk: string[]; keep: string[] } {
  const junk = [
    '.us-completion-0001',
    '.prev-status-0001',
    '.status-mtime-0001',
    '.github-sync-0001',
    '.living-specs-0001',
    '.project-bridge-0001',
    '.hook-circuit-breaker-github-auto-create',
    '.context-hash',
    'skill-chain-abc.json',
    'event-queue/.event-types-123',
    'prompt-cache/entry.json',
  ];
  const keep = [
    'event-queue/pending.jsonl',
    'sync-throttle.json',
    'sessions/s1/state.json',
    '.locks/a.lock',
    'active-increment.json',
    'auto-mode.json',
    'handoff-latest.md',
    'handoff-latest.diff',
    'projects.json',
    'analytics/events.jsonl',
    'interview-0002.json', // fresh → kept
    'closure-metrics.json', // unknown → untouched
  ];
  junk.forEach((f) => touch(f));
  keep.forEach((f) => touch(f));
  touch('interview-0001.json', '{}', 31 * DAY); // old → junk
  return { junk: [...junk, 'interview-0001.json'], keep };
}

describe('planStatePurge', () => {
  it('lists only known junk, never keep-listed or unknown entries', () => {
    const { junk, keep } = seedJunkAndKeep();
    const plan = planStatePurge(stateDir).map((e) => e.path);

    for (const j of junk) {
      const expected = j.startsWith('prompt-cache/') ? 'prompt-cache' : j;
      expect(plan, `expected ${expected} in plan`).toContain(expected);
    }
    for (const k of keep) {
      expect(plan).not.toContain(k);
      expect(plan).not.toContain(k.split('/')[0]);
    }
    expect(plan).not.toContain('closure-metrics.json');
  });

  it('respects the interview age threshold', () => {
    touch('interview-a.json', '{}', 10 * DAY);
    touch('interview-b.json', '{}', 40 * DAY);
    const plan = planStatePurge(stateDir).map((e) => e.path);
    expect(plan).toEqual(['interview-b.json']);
  });

  it('returns empty for a missing state dir', () => {
    expect(planStatePurge(join(root, 'nope'))).toEqual([]);
  });
});

describe('purgeState', () => {
  it('dry-run deletes nothing and writes no marker', () => {
    seedJunkAndKeep();
    const result = purgeState(stateDir);
    expect(result.applied).toBe(false);
    expect(result.deleted).toEqual([]);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.bytes).toBeGreaterThan(0);
    expect(existsSync(join(stateDir, '.us-completion-0001'))).toBe(true);
    expect(existsSync(join(stateDir, 'prompt-cache'))).toBe(true);
    expect(existsSync(join(stateDir, GC_MARKER))).toBe(false);
  });

  it('apply deletes junk, keeps everything else, writes the marker', () => {
    const { junk, keep } = seedJunkAndKeep();
    const result = purgeState(stateDir, { apply: true });
    expect(result.applied).toBe(true);
    expect(result.deleted.length).toBe(result.candidates.length);

    for (const j of junk) expect(existsSync(join(stateDir, ...j.split('/'))), j).toBe(false);
    for (const k of keep) expect(existsSync(join(stateDir, ...k.split('/'))), k).toBe(true);
    expect(existsSync(join(stateDir, 'closure-metrics.json'))).toBe(true);
    expect(existsSync(join(stateDir, 'event-queue', 'pending.jsonl'))).toBe(true);
    expect(readFileSync(join(stateDir, GC_MARKER), 'utf-8')).toMatch(/^\d{4}-/);

    // Second run: nothing left
    expect(purgeState(stateDir, { apply: true }).deleted).toEqual([]);
  });

  it('every STATE_KEEP entry is immune even if it looked like junk', () => {
    for (const k of STATE_KEEP) expect(planStatePurge(stateDir).map((e) => e.path)).not.toContain(k);
  });
});

describe('isGcDue', () => {
  it('is due when no marker exists', () => {
    expect(isGcDue(stateDir)).toBe(true);
  });

  it('is not due right after an applied purge, due again after 24h', () => {
    purgeState(stateDir, { apply: true });
    expect(isGcDue(stateDir)).toBe(false);
    expect(isGcDue(stateDir, Date.now() + DAY + 1000)).toBe(true);
  });
});

describe('reports', () => {
  it('finds nested .specweave dirs and flags ones without config.json as stale', () => {
    mkdirSync(join(root, 'repositories', 'org', 'a', '.specweave', 'state'), { recursive: true });
    writeFileSync(join(root, 'repositories', 'org', 'a', '.specweave', 'state', 'x'), 'x');
    mkdirSync(join(root, 'repositories', 'org', 'b', '.specweave'), { recursive: true });
    writeFileSync(join(root, 'repositories', 'org', 'b', '.specweave', 'config.json'), '{}');
    mkdirSync(join(root, 'node_modules', 'pkg', '.specweave'), { recursive: true });

    const nested = findNestedSpecweaveDirs(root);
    expect(nested.map((n) => [n.path, n.stale])).toEqual([
      ['repositories/org/a/.specweave', true],
      ['repositories/org/b/.specweave', false],
    ]);
    expect(nested[0].bytes).toBe(1);
  });

  it('reports .worktrees size (0 when absent)', () => {
    expect(worktreesSize(root)).toBe(0);
    mkdirSync(join(root, '.worktrees', 'wt1'), { recursive: true });
    writeFileSync(join(root, '.worktrees', 'wt1', 'f'), 'abcd');
    expect(worktreesSize(root)).toBe(4);
  });
});
