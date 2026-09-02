/**
 * E2E: the 2.0 increment lifecycle, driven ONLY through the shipped CLI.
 *
 * Regression guard for the 2.0 release proofs:
 *
 *  1. `create-increment` must produce an increment the rest of the loop can
 *     work on. Before this, it wrote `status: "planning"` — a value no resolver
 *     recognised — so `task list|next|claim`, `verify` and `handoff` all died
 *     with "No active increment" on a project built purely with the CLI, and
 *     the only fix (hand-editing metadata.json) is explicitly forbidden by the
 *     shipped skills.
 *  2. metadata.json statuses stay inside the 2.0 vocabulary
 *     (planned|active|paused|completed|abandoned) and legacy values on disk
 *     (`planning`, `planned`, `closed`, `complete`, `superseded`, unknown) are
 *     migrated instead of dropping the increment out of `specweave status`.
 *  3. Legacy task ids with a letter suffix (`T-001a`) are parsed, and a task
 *     heading the grammar cannot read warns instead of vanishing.
 *  4. A bare 4-digit increment id works for every increment-scoped command.
 *
 * These drive `bin/specweave.js` (which loads `dist/`), i.e. exactly what a
 * user installs — a unit test of the internals is what let all four ship.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..', '..');
const CLI = path.join(repoRoot, 'bin', 'specweave.js');
const distBuilt = fs.existsSync(path.join(repoRoot, 'dist', 'src', 'cli', 'commands', 'task.js'));

interface RunResult {
  code: number;
  out: string;
}

async function sw(cwd: string, args: string[]): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [CLI, ...args], {
      cwd,
      env: { ...process.env, SPECWEAVE_AGENT: 'e2e@ci', CI: 'true' },
      maxBuffer: 20 * 1024 * 1024,
    });
    return { code: 0, out: `${stdout}${stderr}` };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { code: typeof e.code === 'number' ? e.code : 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function readStatus(dir: string): string {
  return JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf-8')).status;
}

function writeIncrement(root: string, id: string, status: string, extra: Record<string, unknown> = {}): string {
  const dir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'metadata.json'),
    JSON.stringify(
      {
        id,
        status,
        type: 'feature',
        created: '2026-01-01T00:00:00Z',
        lastActivity: '2026-01-01T00:00:00Z',
        ...extra,
      },
      null,
      2,
    ),
  );
  return dir;
}

async function makeProject(name: string): Promise<string> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sw-lifecycle-${name}-`));
  fs.mkdirSync(path.join(root, '.specweave', 'increments'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.specweave', 'config.json'),
    JSON.stringify({ version: '2.0', project: { name }, testing: { commands: ['node -e "process.exit(0)"'] } }, null, 2),
  );
  fs.writeFileSync(path.join(root, 'README.md'), `# ${name}\n`);
  await execFileAsync('git', ['init', '-q'], { cwd: root });
  await execFileAsync('git', ['config', 'user.email', 'e2e@example.com'], { cwd: root });
  await execFileAsync('git', ['config', 'user.name', 'E2E'], { cwd: root });
  await execFileAsync('git', ['add', '-A'], { cwd: root });
  await execFileAsync('git', ['commit', '-qm', 'init', '--no-verify'], { cwd: root });
  return root;
}

describe.skipIf(!distBuilt)('2.0 increment lifecycle through the CLI', () => {
  describe('create-increment → task → verify → complete (no hand-edits)', () => {
    let root: string;
    let incDir: string;
    let incId: string;

    beforeAll(async () => {
      root = await makeProject('loop');
      const created = await sw(root, ['create-increment', 'Add login form']);
      expect(created.code, created.out).toBe(0);
      incId = fs.readdirSync(path.join(root, '.specweave', 'increments')).find((d) => d.startsWith('0001'))!;
      incDir = path.join(root, '.specweave', 'increments', incId);

      // spec.md + tasks.md exactly as the 2.0 design writes them.
      fs.writeFileSync(
        path.join(incDir, 'spec.md'),
        [`---`, `increment: ${incId}`, `title: "Add login form"`, `---`, ``, `# Add login form`, ``,
          `- [x] AC-01: the form renders`, `- [x] AC-02: the form submits`, ``].join('\n'),
      );
      fs.writeFileSync(
        path.join(incDir, 'tasks.md'),
        ['# Tasks', '', '### T-01 Build it',
          '- AC: AC-01, AC-02 | Files: src/a.ts, src/a.test.ts | Test: node -e "process.exit(0)"', ''].join('\n'),
      );
    }, 60000);

    afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

    it('creates the increment in a status the loop can resolve', () => {
      expect(readStatus(incDir)).toBe('active');
    });

    it('never writes a status outside the 2.0 vocabulary', () => {
      expect(['planned', 'active', 'paused', 'completed', 'abandoned']).toContain(readStatus(incDir));
    });

    it('resolves the bare-form `task list` / `task next`', async () => {
      const list = await sw(root, ['task', 'list']);
      expect(list.code, list.out).toBe(0);
      expect(list.out).toContain('T-01');

      const next = await sw(root, ['task', 'next']);
      expect(next.code, next.out).toBe(0);
      expect(next.out).toContain('T-01');
    }, 30000);

    it('runs claim → done → verify → complete without touching metadata.json', async () => {
      const claim = await sw(root, ['task', 'claim', 'T-01']);
      expect(claim.code, claim.out).toBe(0);

      const done = await sw(root, ['task', 'done', 'T-01', '--run', 'node -e "process.exit(0)"']);
      expect(done.code, done.out).toBe(0);

      const verify = await sw(root, ['verify']);
      expect(verify.code, verify.out).toBe(0);
      expect(verify.out).toContain('PASS');

      // Bare 4-digit id, as the design spells out for `complete`.
      const complete = await sw(root, ['complete', '0001', '--yes']);
      expect(complete.code, complete.out).toBe(0);
      expect(readStatus(incDir)).toBe('completed');
    }, 90000);

    it('does not tell the user their tasks are missing **Satisfies ACs**', async () => {
      // Same increment shape, fresh project so closure runs its AC gate again.
      const root2 = await makeProject('ac-trace');
      try {
        await sw(root2, ['create-increment', 'Trace me']);
        const id = fs.readdirSync(path.join(root2, '.specweave', 'increments')).find((d) => d.startsWith('0001'))!;
        const dir = path.join(root2, '.specweave', 'increments', id);
        fs.writeFileSync(
          path.join(dir, 'spec.md'),
          [`---`, `increment: ${id}`, `title: "Trace me"`, `---`, ``, `# Trace me`, ``,
            `- [x] AC-01: it works`, `- [x] AC-02: it is traced`, ''].join('\n'),
        );
        fs.writeFileSync(
          path.join(dir, 'tasks.md'),
          ['# Tasks', '', '### T-01 Build it',
            '- AC: AC-01, AC-02 | Files: src/a.ts | Test: node -e "process.exit(0)"', '- [x] done', ''].join('\n'),
        );
        const complete = await sw(root2, ['complete', id, '--yes', '--reason', 'traceability probe']);
        expect(complete.out).not.toMatch(/no \*\*Satisfies ACs\*\* field/);
      } finally {
        fs.rmSync(root2, { recursive: true, force: true });
      }
    }, 90000);
  });

  describe('planned increments have a CLI path to active', () => {
    let root: string;

    beforeAll(async () => {
      root = await makeProject('planned');
    }, 60000);
    afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

    it('`create-increment --planned` + `start <bare id>` activates it', async () => {
      const created = await sw(root, ['create-increment', 'Backlog item', '--planned']);
      expect(created.code, created.out).toBe(0);
      const id = fs.readdirSync(path.join(root, '.specweave', 'increments')).find((d) => d.startsWith('0001'))!;
      const dir = path.join(root, '.specweave', 'increments', id);
      expect(readStatus(dir)).toBe('planned');

      const started = await sw(root, ['start', '0001']);
      expect(started.code, started.out).toBe(0);
      expect(readStatus(dir)).toBe('active');
    }, 60000);

    it('`resume <bare id>` accepts the short form', async () => {
      const id = fs.readdirSync(path.join(root, '.specweave', 'increments')).find((d) => d.startsWith('0001'))!;
      await sw(root, ['pause', '0001', '--reason', 'waiting']);
      expect(readStatus(path.join(root, '.specweave', 'increments', id))).toBe('paused');

      const resumed = await sw(root, ['resume', '0001']);
      expect(resumed.code, resumed.out).toBe(0);
      expect(resumed.out).not.toMatch(/Invalid increment ID format/);
      expect(readStatus(path.join(root, '.specweave', 'increments', id))).toBe('active');
    }, 60000);
  });

  describe('legacy metadata and legacy task ids', () => {
    let root: string;

    beforeAll(async () => {
      root = await makeProject('legacy');
      writeIncrement(root, '0100-legacy-planning', 'planning');
      writeIncrement(root, '0101-legacy-planned', 'planned');
      writeIncrement(root, '0102-legacy-closed', 'closed');
      writeIncrement(root, '0103-legacy-complete', 'complete');
      writeIncrement(root, '0104-superseded', 'superseded');
      writeIncrement(root, '0105-nonsense', 'totally-made-up');

      const suffixed = writeIncrement(root, '0748-crawl-worker-watchdog', 'active');
      fs.writeFileSync(
        path.join(suffixed, 'tasks.md'),
        [
          '# Tasks',
          '',
          '### T-001a: [RED] Bash test fixture for watchdog.sh',
          '**Status**: [x] completed',
          '',
          '### T-001b: [GREEN] Implement crawl-worker/watchdog files',
          '**Status**: [x] completed',
          '',
          '### T-002: Plain legacy task',
          '**Status**: [ ] pending',
          '',
          '### T-01E: External import',
          '**Status**: [ ] pending',
          '',
          '### T-nope: heading the grammar cannot read',
          '**Status**: [ ] pending',
          '',
        ].join('\n'),
      );
    }, 60000);

    afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

    it('counts every increment in `specweave status`, whatever its legacy status', async () => {
      const status = await sw(root, ['status']);
      expect(status.code, status.out).toBe(0);
      expect(status.out).toMatch(/Total: 7/);
      // 2 legacy "done" spellings migrate to completed; nothing disappears.
      expect(status.out).toMatch(/Completed: 2/);
      expect(status.out).toMatch(/Abandoned: 1/);
      expect(status.out).toMatch(/Planned: 3/);
    }, 60000);

    it('migrates legacy statuses on disk into the 2.0 vocabulary', () => {
      const dir = path.join(root, '.specweave', 'increments');
      const vocabulary = ['planned', 'active', 'paused', 'completed', 'abandoned'];
      for (const id of fs.readdirSync(dir)) {
        expect(vocabulary, `${id} status`).toContain(readStatus(path.join(dir, id)));
      }
      expect(readStatus(path.join(dir, '0100-legacy-planning'))).toBe('planned');
      expect(readStatus(path.join(dir, '0102-legacy-closed'))).toBe('completed');
      expect(readStatus(path.join(dir, '0103-legacy-complete'))).toBe('completed');
      expect(readStatus(path.join(dir, '0104-superseded'))).toBe('abandoned');
    });

    it('parses letter-suffixed task ids and warns about unreadable headings', async () => {
      const list = await sw(root, ['task', 'list', '0748']);
      expect(list.code, list.out).toBe(0);
      for (const id of ['T-001a', 'T-001b', 'T-002', 'T-01E']) {
        expect(list.out, `expected ${id} in task list`).toContain(id);
      }
      expect(list.out).toMatch(/2\/4 done/);
      expect(list.out).toMatch(/skipped unparseable task heading "### T-nope/);
    }, 60000);
  });

  it('keeps `specweave status` output free of internal diagnostics and dead commands', async () => {
    const root = await makeProject('status-noise');
    try {
      // metadata.id is the short form — the schema repair rewrites it to the
      // folder name and used to announce that mid-report.
      writeIncrement(root, '0007-legacy-auth-rework', 'planned', { id: '0007' });
      const status = await sw(root, ['status']);
      expect(status.code, status.out).toBe(0);
      expect(status.out).not.toMatch(/expanded to full slug/);
      // `/inc` is not a command in a 2.0 install (no such skill, no such CLI verb).
      expect(status.out).not.toMatch(/\/inc\b/);
      expect(status.out).toMatch(/specweave start <id>/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 60000);

  it('names a plausible increment id in the no-active-increment hint', async () => {
    const root = await makeProject('hint');
    try {
      const list = await sw(root, ['task', 'list']);
      expect(list.code).not.toBe(0);
      expect(list.out).toMatch(/No active increment/);
      // The hint used to quote 0874 — an increment from the maintainer's own repo.
      expect(list.out).not.toMatch(/08\d\d/);
      expect(list.out).toMatch(/0001/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 60000);
});
