import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import {
  CHECKPOINT_PRUNE_INTERVAL_MS, CHECKPOINT_PRUNE_MARKER, CHECKPOINT_RETENTION_MS, maybePruneCheckpoints, pruneCheckpoints,
} from '../../../../src/core/session/checkpoint-retention.js';

const DAY = 24 * 60 * 60_000;
let root: string;

/** A session folder like the worker writes, every entry stamped `ageDays` ago. */
function session(name: string, ageDays: number, extra: Record<string, unknown> = {}): string {
  const key = createHash('sha256').update(name).digest('hex');
  const dir = path.join(root, key);
  const gen = path.join(dir, 'snapshot-1-token');
  fs.mkdirSync(gen, { recursive: true });
  fs.writeFileSync(path.join(gen, 'handoff.md'), '# handoff\n'.repeat(100));
  fs.writeFileSync(path.join(gen, 'handoff.diff'), '');
  fs.writeFileSync(path.join(dir, 'current.json'), JSON.stringify({ version: 1, docPath: path.join(gen, 'handoff.md') }));
  for (const [file, body] of Object.entries(extra)) fs.writeFileSync(path.join(dir, file), JSON.stringify(body));
  age(dir, ageDays);
  return dir;
}

function age(p: string, days: number): void {
  const t = (Date.now() - days * DAY) / 1000;
  if (fs.statSync(p).isDirectory()) for (const name of fs.readdirSync(p)) age(path.join(p, name), days);
  fs.utimesSync(p, t, t);
}

function pointer(thread: string, dir: string, ageDays: number): string {
  const file = path.join(root, 'studio', `${thread}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ version: 1, docPath: path.join(dir, 'snapshot-1-token', 'handoff.md') }));
  age(file, ageDays);
  return file;
}

beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-ckpt-retention-')); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

describe('pruneCheckpoints', () => {
  it('removes folders older than 7 days and keeps recent ones and pending handoffs', () => {
    const old = session('old', 20);
    const recent = session('recent', 5);
    const handedOff = session('handed-off', 40, { 'handoff.json': { version: 1, at: new Date(Date.now() - 40 * DAY).toISOString() } });
    const picked = session('picked', 40, {
      'handoff.json': { version: 1, at: new Date(Date.now() - 41 * DAY).toISOString() },
      'picked.json': { at: new Date(Date.now() - 40 * DAY).toISOString() },
    });

    const result = pruneCheckpoints(root, { apply: true });

    expect(fs.existsSync(old)).toBe(false);
    expect(fs.existsSync(picked)).toBe(false);
    expect(fs.existsSync(recent)).toBe(true);
    expect(fs.existsSync(handedOff)).toBe(true);
    expect(result).toMatchObject({ applied: true, sessions: 2, kept: 2, pendingHandoffs: 1, partial: false });
    expect(result.bytes).toBeGreaterThan(0);
  });

  it('keeps a folder whose newest file is recent even when the rest is old', () => {
    const dir = session('mixed', 30);
    fs.writeFileSync(path.join(dir, 'current.json'), '{}');

    expect(pruneCheckpoints(root, { apply: true }).sessions).toBe(0);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('keeps a handoff whose picked mark predates it, or whose mark is unreadable', () => {
    const repeat = session('again', 30, {
      'handoff.json': { version: 1, at: new Date(Date.now() - 30 * DAY).toISOString() },
      'picked.json': { at: new Date(Date.now() - 31 * DAY).toISOString() },
    });
    const broken = session('broken', 30);
    fs.writeFileSync(path.join(broken, 'handoff.json'), 'not json');
    age(broken, 30);

    expect(pruneCheckpoints(root, { apply: true }).pendingHandoffs).toBe(2);
    expect(fs.existsSync(repeat)).toBe(true);
    expect(fs.existsSync(broken)).toBe(true);
  });

  it('reports without deleting on a dry run', () => {
    const old = session('old', 20);
    const file = pointer('thread-a', old, 20);

    const result = pruneCheckpoints(root);

    expect(result).toMatchObject({ applied: false, sessions: 1, pointers: 1 });
    expect(fs.existsSync(old)).toBe(true);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('never touches names that are not session folders', () => {
    for (const name of ['.workers', 'studio', 'notes', CHECKPOINT_PRUNE_MARKER]) {
      fs.mkdirSync(path.join(root, name), { recursive: true });
      age(path.join(root, name), 60);
    }

    expect(pruneCheckpoints(root, { apply: true }).sessions).toBe(0);
    for (const name of ['.workers', 'studio', 'notes', CHECKPOINT_PRUNE_MARKER]) expect(fs.existsSync(path.join(root, name))).toBe(true);
  });

  it('drops Studio pointers to removed sessions and keeps live ones', () => {
    const old = session('old', 20);
    const live = session('live', 20, { 'handoff.json': { version: 1, at: new Date().toISOString() } });
    age(live, 20);
    const stale = pointer('stale', old, 20);
    const kept = pointer('kept', live, 20);
    const fresh = pointer('fresh', path.join(root, 'gone'), 1);
    const temp = path.join(root, 'studio', 'thread.json.1234');
    fs.writeFileSync(temp, '{');
    age(temp, 20);

    const result = pruneCheckpoints(root, { apply: true });

    expect(result.pointers).toBe(2);
    expect(fs.existsSync(stale)).toBe(false);
    expect(fs.existsSync(temp)).toBe(false);
    expect(fs.existsSync(kept)).toBe(true);
    expect(fs.existsSync(fresh)).toBe(true);
  });

  it('stops at the time budget and says so', () => {
    session('old', 20);
    const result = pruneCheckpoints(root, { apply: true, budgetMs: -1 });
    expect(result).toMatchObject({ sessions: 0, partial: true });
  });

  it('returns an empty result when the root does not exist', () => {
    expect(pruneCheckpoints(path.join(root, 'missing'), { apply: true })).toMatchObject({ sessions: 0, pointers: 0, kept: 0 });
  });

  it('honours maxAgeMs', () => {
    const dir = session('days', 3);
    expect(pruneCheckpoints(root, { apply: true }).sessions).toBe(0);
    expect(pruneCheckpoints(root, { apply: true, maxAgeMs: 2 * DAY }).sessions).toBe(1);
    expect(fs.existsSync(dir)).toBe(false);
    expect(CHECKPOINT_RETENTION_MS).toBe(7 * DAY);
  });
});

describe('maybePruneCheckpoints', () => {
  it('runs at most once a day, recorded in a marker file', () => {
    const first = session('first', 20);
    const now = Date.now();

    expect(maybePruneCheckpoints(root, { now })?.sessions).toBe(1);
    expect(fs.existsSync(first)).toBe(false);
    expect(fs.existsSync(path.join(root, CHECKPOINT_PRUNE_MARKER))).toBe(true);

    const second = session('second', 20);
    expect(maybePruneCheckpoints(root, { now: now + 60_000 })).toBeUndefined();
    expect(fs.existsSync(second)).toBe(true);

    expect(maybePruneCheckpoints(root, { now: now + CHECKPOINT_PRUNE_INTERVAL_MS + 1 })?.sessions).toBe(1);
    expect(fs.existsSync(second)).toBe(false);
  });

  it('swallows every error', () => {
    const file = path.join(root, 'not-a-directory');
    fs.writeFileSync(file, '');
    expect(maybePruneCheckpoints(file)).toBeUndefined();
  });
});
