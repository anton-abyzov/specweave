/**
 * E2E: the 2.0 closure loop, driven through the real CLI.
 *
 * Every assertion here corresponds to a defect the unit suite was green for,
 * because the units tested internals rather than the path a user walks:
 *
 * 1. `handoff` right after `create-increment` wrote `.handoff/HANDOFF.md`
 *    (gitignored, invisible to the next agent) instead of the increment's own
 *    `handoff.md` — a freshly created increment is not `active`, and increment
 *    resolution only accepted `active`-ish statuses. `task next` / `verify`
 *    failed for the same reason, breaking step 1 → step 2 of the loop.
 * 2. `verify` reported PASS and `complete` closed the increment with 0 of 2
 *    acceptance criteria ticked.
 * 3. `complete` printed "ready for review — run sw:done to close" and
 *    "completed!" in the same run, and printed its sync line twice.
 * 4. `livingDocs: false` (the 2.0 default) still generated FEATURE.md at
 *    closure; `livingDocs: 'onDone'` generated nothing, because the closure
 *    hook bailed on a 1.x config key that 2.0 `init` no longer writes.
 * 5. ledger events (claim/done/skip) never touched the increment's `updated`
 *    timestamp.
 *
 * Uses the real bin (requires a build) + real temp git repos: the whole point
 * is that these are process-level, user-visible contracts.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, '../../../bin/specweave.js');

const tmpDirs: string[] = [];

afterAll(() => {
  for (const d of tmpDirs) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

/**
 * Run the CLI in `cwd`. The child must NOT inherit VITEST/NODE_ENV=test —
 * several code paths (the status-change sync trigger above all) no-op under
 * them, which is exactly how these bugs stayed invisible to the suite.
 */
function sw(cwd: string, args: string[], extraEnv: Record<string, string> = {}) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SPECWEAVE_AGENT: 'e2e@host',
    HOME: path.join(cwd, '.home'),
    ...extraEnv,
  };
  delete env.VITEST;
  delete env.VITEST_WORKER_ID;
  delete env.VITEST_POOL_ID;
  delete env.NODE_ENV;
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf-8', env });
  return { code: r.status ?? -1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function git(cwd: string, ...args: string[]): void {
  spawnSync('git', args, { cwd, encoding: 'utf-8' });
}

const SPEC = [
  '# 0001-greet — Greeting CLI',
  '',
  '**Project**: greetco',
  '',
  '## Problem',
  'Nobody is greeted.',
  '',
  '## Acceptance Criteria',
  '',
  '- [ ] AC-01: The CLI prints a greeting',
  '- [ ] AC-02: The greeting is configurable',
  '',
  '## User Stories',
  '',
  '### US-001: Greeting',
  'As a user, I want a greeting, so that I feel welcome.',
  '',
].join('\n');

const TASKS = [
  '# Tasks',
  '',
  '### T-01 Print greeting',
  '- AC: AC-01 | Files: src/greet.js | Test: node -e "process.exit(0)"',
  '',
  '### T-02 Configurable greeting',
  '- AC: AC-02 | Files: src/config.js | Test: node -e "process.exit(0)"',
  '',
].join('\n');

/**
 * A SpecWeave project with one increment in its as-created state (`planning`),
 * written by hand so the fixture is explicit and fast. `livingDocs` matches the
 * 2.0 default unless overridden.
 */
function makeProject(name: string, opts: { livingDocs?: false | 'onDone' } = {}): { root: string; incDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sw-closure-${name}-`));
  tmpDirs.push(root);
  const incDir = path.join(root, '.specweave', 'increments', '0001-greet');
  fs.mkdirSync(path.join(incDir, 'reports'), { recursive: true });
  fs.mkdirSync(path.join(root, '.home'), { recursive: true });

  fs.writeFileSync(
    path.join(root, '.specweave', 'config.json'),
    JSON.stringify(
      {
        version: '2.0',
        project: { name: 'greetco' },
        testing: { commands: [] },
        livingDocs: opts.livingDocs ?? false,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(incDir, 'metadata.json'),
    JSON.stringify(
      {
        id: '0001-greet',
        status: 'planning',
        type: 'feature',
        created: '2026-09-01T00:00:00.000Z',
        lastActivity: '2026-09-01T00:00:00.000Z',
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(incDir, 'spec.md'), SPEC);
  fs.writeFileSync(path.join(incDir, 'tasks.md'), TASKS);
  fs.writeFileSync(path.join(root, 'README.md'), '# greetco\n');

  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'e2e@example.com');
  git(root, 'config', 'user.name', 'E2E');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', '0001: fixture');
  return { root, incDir };
}

function readMeta(incDir: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf-8'));
}

function tickAcs(incDir: string): void {
  const p = path.join(incDir, 'spec.md');
  fs.writeFileSync(p, fs.readFileSync(p, 'utf-8').replace(/- \[ \] AC-/g, '- [x] AC-'));
}

describe('2.0 loop — a just-created increment is resolvable', () => {
  it('resolves for task/verify/handoff and writes handoff.md INSIDE the increment', () => {
    const { root, incDir } = makeProject('handoff');

    const next = sw(root, ['task', 'next']);
    expect(next.code).toBe(0);
    expect(next.out).toContain('T-01');

    const handoff = sw(root, ['handoff']);
    expect(handoff.code).toBe(0);

    // The single documented write location (CLAUDE.md/AGENTS.md + design).
    expect(fs.existsSync(path.join(incDir, 'handoff.md'))).toBe(true);
    expect(fs.existsSync(path.join(incDir, 'handoff.diff'))).toBe(true);
    // NOT the gitignored root fallback.
    expect(fs.existsSync(path.join(root, '.handoff', 'HANDOFF.md'))).toBe(false);
    // …and the pointer the design specifies.
    const pointer = path.join(root, '.specweave', 'state', 'handoff-latest.txt');
    expect(fs.existsSync(pointer)).toBe(true);
    // fs.realpathSync: macOS temp dirs are symlinked (/var → /private/var).
    expect(fs.realpathSync(fs.readFileSync(pointer, 'utf-8').trim())).toBe(
      fs.realpathSync(path.join(incDir, 'handoff.md')),
    );

    // The doc names the increment it belongs to.
    expect(fs.readFileSync(path.join(incDir, 'handoff.md'), 'utf-8')).toContain('0001-greet');
  });
});

describe('2.0 closure gate — acceptance criteria are the definition of done', () => {
  it('fails verify and refuses complete while ACs are unchecked, passes once ticked', () => {
    const { root, incDir } = makeProject('acs');

    sw(root, ['task', 'done', 'T-01', '--evidence', 'manual check']);
    sw(root, ['task', 'skip', 'T-02', '--reason', 'not needed']);

    const verify = sw(root, ['verify']);
    expect(verify.code).toBe(1);
    expect(verify.out).toContain('acceptance criteria unchecked');
    const report = JSON.parse(fs.readFileSync(path.join(incDir, 'reports', 'verify.json'), 'utf-8'));
    expect(report.acs).toEqual({ total: 2, done: 0 });
    expect(report.ok).toBe(false);

    const blocked = sw(root, ['complete', '0001-greet']);
    expect(blocked.code).not.toBe(0);
    expect(blocked.out).toContain('acceptance criteria unchecked');
    expect(readMeta(incDir).status).toBe('planning');

    // --reason is the documented escape hatch and must still work.
    tickAcs(incDir);
    const verify2 = sw(root, ['verify']);
    expect(verify2.code).toBe(0);
    expect(verify2.out).toContain('PASS');
    expect(JSON.parse(fs.readFileSync(path.join(incDir, 'reports', 'verify.json'), 'utf-8')).ok).toBe(true);

    const done = sw(root, ['complete', '0001-greet']);
    expect(done.code).toBe(0);
    expect(readMeta(incDir).status).toBe('completed');
  });

  it('can still be closed without ticked ACs when --reason is given', () => {
    const { root, incDir } = makeProject('reason');
    sw(root, ['task', 'done', 'T-01', '--evidence', 'manual check']);
    sw(root, ['task', 'skip', 'T-02', '--reason', 'not needed']);
    sw(root, ['verify']);

    const closed = sw(root, ['complete', '0001-greet', '--reason', 'dropped, superseded by 0002']);
    expect(closed.code).toBe(0);
    expect(readMeta(incDir).status).toBe('completed');
  });
});

describe('2.0 closure output', () => {
  it('does not contradict itself and does not double-print the sync line', () => {
    const { root, incDir } = makeProject('output');
    tickAcs(incDir);
    sw(root, ['task', 'done', 'T-01', '--evidence', 'manual check']);
    sw(root, ['task', 'skip', 'T-02', '--reason', 'not needed']);
    sw(root, ['verify']);

    const out = sw(root, ['complete', '0001-greet']).out;

    expect(out).toContain('completed!');
    // The intermediate auto-walk must not announce a state the same run leaves.
    expect(out).not.toContain('ready for review - run sw:done to close');
    // One closure = at most one external-sync announcement.
    expect((out.match(/Auto-synced increment/g) ?? []).length).toBeLessThanOrEqual(1);
    // Nothing may claim living docs were forced when they are switched off.
    expect(out).not.toContain('forcing living docs sync');
  });
});

describe('livingDocs config gate', () => {
  it('writes no generated docs when livingDocs is false (the 2.0 default)', () => {
    const { root, incDir } = makeProject('ld-off', { livingDocs: false });
    tickAcs(incDir);
    sw(root, ['task', 'done', 'T-01', '--evidence', 'manual check']);
    sw(root, ['task', 'skip', 'T-02', '--reason', 'not needed']);
    sw(root, ['verify']);
    sw(root, ['complete', '0001-greet']);

    // The closure must actually have happened — otherwise "no docs" is vacuous.
    expect(readMeta(incDir).status).toBe('completed');

    const featureDir = path.join(root, '.specweave', 'docs', 'internal', 'specs');
    const featureFiles = fs.existsSync(featureDir)
      ? fs.readdirSync(featureDir, { recursive: true }).filter((f) => String(f).endsWith('FEATURE.md'))
      : [];
    expect(featureFiles).toEqual([]);
  });

  it("writes them when livingDocs is 'onDone'", () => {
    const { root, incDir } = makeProject('ld-on', { livingDocs: 'onDone' });
    tickAcs(incDir);
    sw(root, ['task', 'done', 'T-01', '--evidence', 'manual check']);
    sw(root, ['task', 'skip', 'T-02', '--reason', 'not needed']);
    sw(root, ['verify']);
    sw(root, ['complete', '0001-greet']);

    const feature = path.join(
      root,
      '.specweave',
      'docs',
      'internal',
      'specs',
      'greetco',
      'FS-001',
      'FEATURE.md',
    );
    expect(fs.existsSync(feature)).toBe(true);
  });
});

describe('metadata.updated', () => {
  it('is written by create-increment', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-closure-created-'));
    tmpDirs.push(root);
    fs.mkdirSync(path.join(root, '.home'), { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), '{"name":"greetco"}\n');
    git(root, 'init', '-q');
    git(root, 'config', 'user.email', 'e2e@example.com');
    git(root, 'config', 'user.name', 'E2E');
    expect(sw(root, ['init']).code).toBe(0);
    expect(sw(root, ['create-increment', 'greeting cli']).code).toBe(0);

    const dir = path.join(root, '.specweave', 'increments');
    const created = fs.readdirSync(dir).find((d) => /^0001/.test(d))!;
    const meta = JSON.parse(fs.readFileSync(path.join(dir, created, 'metadata.json'), 'utf-8'));
    expect(typeof meta.updated).toBe('string');
  });

  it('is stamped by ledger activity, not only by status transitions', () => {
    const { root, incDir } = makeProject('updated');
    const before = readMeta(incDir);
    expect(before.updated).toBeUndefined(); // legacy fixture, as found on disk

    sw(root, ['task', 'claim', 'T-01']);
    const afterClaim = readMeta(incDir);
    expect(typeof afterClaim.updated).toBe('string');
    expect(afterClaim.updated).not.toBe(before.created);

    sw(root, ['task', 'done', 'T-01', '--evidence', 'manual check']);
    const afterDone = readMeta(incDir);
    expect(String(afterDone.updated) >= String(afterClaim.updated)).toBe(true);
  });
});
