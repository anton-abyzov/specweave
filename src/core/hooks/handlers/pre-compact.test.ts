/**
 * PreCompact handler: writes a handoff only when an increment is active,
 * within a 5 s budget, never blocks compaction, always returns `{}`.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { handle, writeAutoHandoff } from './pre-compact.js';
import { createContext } from './utils.js';

function mkRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-precompact-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 't@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: root });
  execFileSync('git', ['checkout', '-q', '-b', 'main'], { cwd: root });
  fs.writeFileSync(path.join(root, 'a.txt'), 'one\n');
  execFileSync('git', ['add', 'a.txt'], { cwd: root });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: root });
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  return root;
}

function mkActive(root: string, ...ids: string[]): void {
  for (const id of ids) {
    const d = path.join(root, '.specweave', 'increments', id);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'metadata.json'), JSON.stringify({ id, status: 'active', type: 'feature', created: new Date().toISOString() }));
    fs.writeFileSync(path.join(d, 'spec.md'), `# ${id}\n\n- [ ] AC-01 x\n`);
    fs.writeFileSync(path.join(d, 'tasks.md'), '### T-001: a\n**Status**: [ ] pending\n');
  }
  fs.writeFileSync(path.join(root, '.specweave', 'state', 'active-increment.json'), JSON.stringify({ ids }));
}

/** Any handoff doc the builder may write. */
function handoffDocs(root: string): string[] {
  const candidates = [
    path.join(root, '.specweave', 'state', 'handoff-latest.md'),
    path.join(root, 'HANDOFF.md'),
    path.join(root, '.handoff', 'HANDOFF.md'),
  ];
  try {
    for (const id of fs.readdirSync(path.join(root, '.specweave', 'increments'))) {
      candidates.push(path.join(root, '.specweave', 'increments', id, 'handoff.md'));
    }
  } catch { /* none */ }
  return candidates.filter((c) => fs.existsSync(c)).map((c) => fs.readFileSync(c, 'utf-8'));
}

describe('pre-compact', () => {
  let repo = '';
  afterEach(() => {
    delete process.env.SPECWEAVE_HOOK_DRY_RUN;
    if (repo) fs.rmSync(repo, { recursive: true, force: true });
    repo = '';
  });

  it('returns {} and writes nothing when no increment is active', async () => {
    repo = mkRepo();
    expect(await handle({}, createContext(repo))).toEqual({});
    expect(handoffDocs(repo)).toEqual([]);
  });

  it('writes a handoff for the active increment and honors the agent reason', async () => {
    repo = mkRepo();
    mkActive(repo, '0001-one');
    expect(await handle({ reason: 'out of subscription tokens' }, createContext(repo))).toEqual({});
    const docs = handoffDocs(repo);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.join('\n')).toContain('out of subscription tokens');
  });

  it('uses the default reason when the agent supplies none', async () => {
    repo = mkRepo();
    mkActive(repo, '0001-one');
    await handle({}, createContext(repo));
    expect(handoffDocs(repo).join('\n')).toContain('auto: pre-compact');
  });

  it('picks the first active increment when several are active (no ambiguity error)', async () => {
    repo = mkRepo();
    mkActive(repo, '0001-one', '0002-two');
    expect(await writeAutoHandoff(createContext(repo), {}, 'auto: pre-compact')).toBe(true);
    expect(handoffDocs(repo).join('\n')).toContain('0001-one');
  });

  it('abandons the write when the budget is exceeded and still returns {}', async () => {
    repo = mkRepo();
    mkActive(repo, '0001-one');
    const ctx = createContext(repo);
    vi.resetModules();
    vi.doMock('../../session/work-handoff.js', () => ({
      buildWorkHandoff: () => new Promise((resolve) => setTimeout(() => resolve({ docPath: 'slow' }), 300)),
    }));
    try {
      const slow = await import('./pre-compact.js');
      expect(await slow.writeAutoHandoff(ctx, {}, 'auto: pre-compact', 20)).toBe(false);
      expect(await slow.handle({}, ctx)).toEqual({});
    } finally {
      vi.doUnmock('../../session/work-handoff.js');
      vi.resetModules();
    }
    const log = fs.readFileSync(path.join(ctx.logsDir, 'hooks.jsonl'), 'utf8');
    expect(log).toContain('abandoned after 20 ms budget');
  });

  it('SPECWEAVE_HOOK_DRY_RUN=1 skips the write (doctor dry-run)', async () => {
    repo = mkRepo();
    mkActive(repo, '0001-one');
    process.env.SPECWEAVE_HOOK_DRY_RUN = '1';
    expect(await handle({}, createContext(repo))).toEqual({});
    expect(handoffDocs(repo)).toEqual([]);
  });

  it('never breaks compaction when the builder cannot run', async () => {
    const bogus = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-precompact-bogus-'));
    try {
      fs.mkdirSync(path.join(bogus, '.specweave', 'increments', '0001-x'), { recursive: true });
      fs.writeFileSync(path.join(bogus, '.specweave', 'increments', '0001-x', 'metadata.json'), '{"status":"active"}');
      expect(await handle({}, createContext(bogus))).toEqual({});
    } finally {
      fs.rmSync(bogus, { recursive: true, force: true });
    }
  });
});
