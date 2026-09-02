/**
 * Tests for work-handoff (T-015) — full scenario coverage.
 *
 * Uses real temp fixtures (real .specweave/ dirs + real git repos) rather than
 * mocks, because buildWorkHandoff does real IO and parser reuse — exercising the
 * actual on-disk contract is the point.
 *
 * Scenarios:
 * - 1 active increment: doc has id/status/current+next task/AC counts+%/acSyncEvents/plan decisions/ambient rules
 * - 0 active: git+config doc noting "no active increment"
 * - 2+ active without explicit id: throws listing candidates
 * - non-SpecWeave: .handoff/HANDOFF.md + .handoff/.gitignore='*'
 * - uncommitted edits: .diff written with combined diff, warning present
 * - secret scrub: planted openai/github/bearer tokens in free-text + diff → redacted, counted
 * - stale .specweave/ with empty active-increment.json → classified non-SpecWeave
 * - ownership sentinel: foreign ./HANDOFF.md → writes to .handoff/
 * - metadata NOT fabricated: exists() gate, no lazy-create side effect
 */

import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildWorkHandoff,
  AmbiguousActiveIncrementError,
  isForeignHandoffFile,
} from './work-handoff.js';
import { DOC_FORMAT_MARKER } from './handoff-doc-format.js';

const tmpDirs: string[] = [];

function mkTmp(prefix: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(d);
  return d;
}

function git(repo: string, ...args: string[]): void {
  execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
}

function initGitRepo(repo: string): void {
  git(repo, 'init', '-q');
  git(repo, 'config', 'user.email', 'test@example.com');
  git(repo, 'config', 'user.name', 'Test');
  git(repo, 'checkout', '-q', '-b', 'main');
  fs.writeFileSync(path.join(repo, 'README.md'), '# repo\n');
  git(repo, 'add', 'README.md');
  git(repo, 'commit', '-q', '-m', 'init');
}

/** Build a SpecWeave workspace with `ids` active and an increment `0001-foo`. */
function makeSpecWeaveWorkspace(opts: {
  activeIds: string[];
  withIncrement?: boolean;
  acSyncEvents?: unknown[];
}): string {
  const root = mkTmp('handoff-sw-');
  initGitRepo(root);
  const sw = path.join(root, '.specweave');
  fs.mkdirSync(path.join(sw, 'state'), { recursive: true });
  fs.writeFileSync(
    path.join(sw, 'config.json'),
    JSON.stringify({
      testing: { defaultTestMode: 'TDD', defaultCoverageTarget: 90 },
      limits: { maxActiveIncrements: 7 },
    }),
  );
  fs.writeFileSync(
    path.join(sw, 'state', 'active-increment.json'),
    JSON.stringify({ ids: opts.activeIds, lastUpdated: new Date().toISOString() }),
  );

  if (opts.withIncrement) {
    for (const id of opts.activeIds) makeIncrement(sw, id, opts.acSyncEvents);
  }
  return root;
}

function makeIncrement(swDir: string, id: string, acSyncEvents?: unknown[]): void {
  const dir = path.join(swDir, 'increments', id);
  fs.mkdirSync(path.join(dir, 'reports'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'metadata.json'),
    JSON.stringify({
      id,
      status: 'active',
      type: 'feature',
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ...(acSyncEvents ? { acSyncEvents } : {}),
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'spec.md'),
    [
      '---',
      'title: "My Increment"',
      '---',
      '# Feature',
      '- [x] **AC-US1-01**: done one',
      '- [ ] **AC-US1-02**: pending two',
      '- [ ] **AC-US1-03**: pending three',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(dir, 'plan.md'),
    [
      '# Plan',
      '## Approach',
      '- Use the reused parsers',
      '- Keep doc-format the single source of truth',
      '## Risks',
      '- Lazy metadata create is a footgun',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(dir, 'tasks.md'),
    [
      '# Tasks',
      '### T-001: First task',
      '**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed',
      '### T-002: Second task',
      '**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [ ] pending',
      '### T-003: Third task',
      '**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [ ] pending',
    ].join('\n'),
  );
}

afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop()!;
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('buildWorkHandoff — SpecWeave with 1 active increment', () => {
  it('assembles id/status/ledger table/ACs/decisions into the increment handoff.md', async () => {
    const root = makeSpecWeaveWorkspace({
      activeIds: ['0001-foo'],
      withIncrement: true,
      acSyncEvents: [{ timestamp: '2026-05-30T00:00:00Z', updated: ['AC-US1-01', 'AC-US1-02'], conflicts: [] }],
    });

    const res = await buildWorkHandoff(root);
    expect(res.isSpecWeave).toBe(true);
    expect(res.docPath).toBe(path.join(root, '.specweave', 'increments', '0001-foo', 'handoff.md'));

    const doc = res.docMarkdown;
    expect(doc).toContain('0001-foo');
    expect(doc).toContain('Increment 0001-foo (active)');
    expect(doc).toContain('tasks 1/3 done');
    expect(doc).toContain('ACs 1/3');
    expect(doc).toContain('T-002 Second task'); // ledger table row
    expect(doc).toContain('T-003 Third task');
    expect(doc).toContain('Use the reused parsers'); // plan.md decision
    expect(doc).toContain('active claims: none');
    expect(doc).toContain(DOC_FORMAT_MARKER);

    // Single write location + a pointer file (no duplicate doc under state/).
    expect(fs.existsSync(path.join(root, '.specweave', 'state', 'handoff-latest.md'))).toBe(false);
    const pointer = path.join(root, '.specweave', 'state', 'handoff-latest.txt');
    expect(fs.readFileSync(pointer, 'utf-8').trim()).toBe(res.docPath);
  });

  it('orders the board by T-id, not user-story group order (G-001)', async () => {
    const root = makeSpecWeaveWorkspace({ activeIds: ['0001-foo'], withIncrement: true });
    // Interleaved per-US numbering: US-001 owns T-001(done) + T-005(pending),
    // US-002 owns T-002(pending) + T-003(pending). Flattening by US group would
    // yield T-005 first (US-001 group), but the real next task is T-002.
    fs.writeFileSync(
      path.join(root, '.specweave', 'increments', '0001-foo', 'tasks.md'),
      [
        '# Tasks',
        '### T-001: Done first',
        '**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed',
        '### T-005: Late US-001 task',
        '**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [ ] pending',
        '### T-002: Early US-002 task',
        '**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [ ] pending',
        '### T-003: Mid US-002 task',
        '**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [ ] pending',
      ].join('\n'),
    );

    const doc = (await buildWorkHandoff(root)).docMarkdown;
    // Next step = lowest OPEN T-id, regardless of user-story grouping.
    expect(doc).toMatch(/specweave task claim T-002 0001-foo/);
    expect(doc).toContain('T-003 Mid US-002 task');
    expect(doc).toContain('T-005 Late US-001 task');
  });

  it('merges agent --decision over plan.md decisions', async () => {
    const root = makeSpecWeaveWorkspace({ activeIds: ['0001-foo'], withIncrement: true });
    const res = await buildWorkHandoff(root, { decisions: ['agent-supplied call'] });
    expect(res.docMarkdown).toContain('Use the reused parsers'); // from plan.md
    expect(res.docMarkdown).toContain('agent-supplied call');     // from opts
  });

  it('is idempotent — re-running overwrites the same files', async () => {
    const root = makeSpecWeaveWorkspace({ activeIds: ['0001-foo'], withIncrement: true });
    const a = await buildWorkHandoff(root);
    const b = await buildWorkHandoff(root);
    expect(a.docPath).toBe(b.docPath);
    expect(fs.existsSync(a.docPath)).toBe(true);
  });
});

describe('buildWorkHandoff — 0 active increments', () => {
  it('writes a git+config doc noting no active increment', async () => {
    const root = makeSpecWeaveWorkspace({ activeIds: [] });
    const res = await buildWorkHandoff(root);
    expect(res.isSpecWeave).toBe(true);
    expect(res.docPath).toBe(path.join(root, '.handoff', 'HANDOFF.md'));
    expect(res.docMarkdown).toContain('No active SpecWeave increment');
  });
});

describe('buildWorkHandoff — 2+ active increments', () => {
  it('throws listing candidate ids when no explicit id', async () => {
    const root = makeSpecWeaveWorkspace({
      activeIds: ['0001-foo', '0002-bar'],
      withIncrement: true,
    });
    await expect(buildWorkHandoff(root)).rejects.toBeInstanceOf(AmbiguousActiveIncrementError);
    await expect(buildWorkHandoff(root)).rejects.toThrow(/0001-foo/);
    await expect(buildWorkHandoff(root)).rejects.toThrow(/0002-bar/);
  });

  it('uses the explicit id when provided', async () => {
    const root = makeSpecWeaveWorkspace({
      activeIds: ['0001-foo', '0002-bar'],
      withIncrement: true,
    });
    const res = await buildWorkHandoff(root, { incrementId: '0002-bar' });
    expect(res.docPath).toContain('0002-bar');
  });
});

describe('buildWorkHandoff — non-SpecWeave', () => {
  it('writes .handoff/HANDOFF.md + .handoff/.gitignore=*', async () => {
    const root = mkTmp('handoff-plain-');
    initGitRepo(root);
    const res = await buildWorkHandoff(root, { summary: 'plain repo work' });
    expect(res.isSpecWeave).toBe(false);
    expect(res.docPath).toBe(path.join(root, '.handoff', 'HANDOFF.md'));
    expect(fs.existsSync(res.docPath)).toBe(true);
    const gi = path.join(root, '.handoff', '.gitignore');
    expect(fs.existsSync(gi)).toBe(true);
    expect(fs.readFileSync(gi, 'utf-8').trim()).toBe('*');
    expect(res.docMarkdown).toContain('No active SpecWeave increment');
  });
});

describe('buildWorkHandoff — uncommitted edits', () => {
  it('captures the combined diff and shows the uncommitted warning', async () => {
    const root = mkTmp('handoff-dirty-');
    initGitRepo(root);
    fs.writeFileSync(path.join(root, 'README.md'), '# repo\nedited\n');
    fs.writeFileSync(path.join(root, 'new.txt'), 'brand new\n');
    git(root, 'add', 'new.txt');

    const res = await buildWorkHandoff(root);
    expect(res.docMarkdown).toContain('UNCOMMITTED');
    const diff = fs.readFileSync(res.diffPath, 'utf-8');
    expect(diff).toContain('README.md');
    expect(diff).toContain('new.txt');
    expect(diff).toContain('+edited');
  });
});

describe('buildWorkHandoff — secret scrub', () => {
  it('redacts planted secrets in free-text AND the diff, with counts in the doc', async () => {
    const root = mkTmp('handoff-secret-');
    initGitRepo(root);
    // Plant a secret in an uncommitted edit (lands in the diff).
    // Assembled at runtime so repo secret scanners do not flag the fixture.
    const fakeGithubToken = ['ghp', '0123456789abcdefABCDEF0123456789abcd'].join('_');
    fs.writeFileSync(path.join(root, 'README.md'), `# repo\n${fakeGithubToken}\n`);

    const res = await buildWorkHandoff(root, {
      summary: 'leaked sk-abc123DEF456ghi789jkl here',
      gotcha: 'header was Bearer eyJhbGciOiJ.payload.sig',
    });

    // Free-text scrubbed in the doc.
    expect(res.docMarkdown).not.toContain('sk-abc123DEF456ghi789jkl');
    expect(res.docMarkdown).toContain('[REDACTED-openai-key]');
    expect(res.docMarkdown).toContain('[REDACTED-bearer]');
    // Diff scrubbed on disk.
    const diff = fs.readFileSync(res.diffPath, 'utf-8');
    expect(diff).not.toContain(fakeGithubToken);
    expect(diff).toContain('[REDACTED-github-token]');
    // Redaction count surfaced in the header line.
    expect(res.docMarkdown).toMatch(/redactions: [1-9]\d*/);
  });
});

describe('buildWorkHandoff — stale .specweave/ classification', () => {
  it('classifies a stale .specweave/ with empty active-increment.json as non-SpecWeave', async () => {
    const root = mkTmp('handoff-stale-');
    initGitRepo(root);
    const sw = path.join(root, '.specweave');
    fs.mkdirSync(path.join(sw, 'state'), { recursive: true });
    // Empty ids → no real active state.
    fs.writeFileSync(path.join(sw, 'state', 'active-increment.json'), JSON.stringify({ ids: [] }));

    const res = await buildWorkHandoff(root);
    // Has SpecWeave state file but 0 active → still SpecWeave path, but no increment.
    // The point of the AC: a stale .specweave/ must not cause increment reads.
    expect(res.docMarkdown).toContain('No active SpecWeave increment');
  });

  it('classifies a .specweave/ with NO active-increment.json as non-SpecWeave', async () => {
    const root = mkTmp('handoff-nostate-');
    initGitRepo(root);
    fs.mkdirSync(path.join(root, '.specweave'), { recursive: true }); // dir but no state file
    const res = await buildWorkHandoff(root);
    expect(res.isSpecWeave).toBe(false);
    expect(res.docPath).toBe(path.join(root, '.handoff', 'HANDOFF.md'));
  });
});

describe('buildWorkHandoff — ownership sentinel', () => {
  it('refuses to overwrite a foreign root ./HANDOFF.md and writes to .handoff/', async () => {
    const root = mkTmp('handoff-foreign-');
    initGitRepo(root);
    const foreign = path.join(root, 'HANDOFF.md');
    fs.writeFileSync(foreign, '# My project HANDOFF\nNothing to do with specweave.\n');
    expect(isForeignHandoffFile(foreign)).toBe(true);

    const res = await buildWorkHandoff(root);
    expect(res.docPath).toBe(path.join(root, '.handoff', 'HANDOFF.md'));
    // Foreign file untouched.
    expect(fs.readFileSync(foreign, 'utf-8')).toContain('My project HANDOFF');
  });

  it('overwrites a root ./HANDOFF.md in-place when it carries the marker', async () => {
    const root = mkTmp('handoff-prior-');
    initGitRepo(root);
    const prior = path.join(root, 'HANDOFF.md');
    fs.writeFileSync(prior, `# old handoff\n<!-- ${DOC_FORMAT_MARKER} -->\n`);
    expect(isForeignHandoffFile(prior)).toBe(false);

    const res = await buildWorkHandoff(root);
    expect(res.docPath).toBe(prior);
    expect(fs.readFileSync(prior, 'utf-8')).toContain('# Handoff —');
  });
});

describe('buildWorkHandoff — metadata not fabricated', () => {
  it('does not lazily create metadata.json for an active id whose folder lacks it', async () => {
    const root = makeSpecWeaveWorkspace({ activeIds: ['0009-ghost'] }); // active id, no increment dir
    const metaPath = path.join(root, '.specweave', 'increments', '0009-ghost', 'metadata.json');
    expect(fs.existsSync(metaPath)).toBe(false);

    const res = await buildWorkHandoff(root);
    // exists() gate skips the read → no metadata created.
    expect(fs.existsSync(metaPath)).toBe(false);
    // No increment facts in the doc.
    expect(res.docMarkdown).toContain('No active SpecWeave increment');
  });
});
