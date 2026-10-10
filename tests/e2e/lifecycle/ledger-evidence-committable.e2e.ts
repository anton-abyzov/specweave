/**
 * E2E: the evidence a ledger `done` event cites must be committable.
 *
 * `specweave task done T-01 --run "<cmd>"` writes the command's output to
 * `reports/task-T-01.txt` and records that path in ledger.jsonl:
 *
 *   {"t":"T-01","e":"done",…,"evidence":"… \nlog: .specweave/increments/<id>/reports/task-T-01.txt\n…"}
 *
 * Most .gitignore files carry a blanket `*.log` rule, so the evidence is `.txt`.
 * Earlier versions wrote `.log` and added a `!…/reports/*.log` negation, which
 * un-ignored hundreds of old logs in long-lived projects; update removes it.
 *
 * These drive the real binary end to end (init AND update), because the bug was
 * in generated content that no unit test ever handed to git.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getIsolatedEnv } from '../../test-utils/temp-home.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specweaveBin = path.join(__dirname, '../../../bin/specweave.js');

let workDir: string;
let homeDir: string;
let env: Record<string, string>;

function git(...args: string[]): string {
  return execFileSync('git', args, {
    cwd: workDir,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' },
  });
}

function sw(...args: string[]): { code: number; out: string } {
  const r = spawnSync(process.execPath, [specweaveBin, ...args], {
    cwd: workDir,
    encoding: 'utf-8',
    env,
    timeout: 120_000,
  });
  return { code: r.status ?? -1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** Every `log: <path>` an increment's ledger `done` events cite. */
function citedEvidenceLogs(incrementId: string): string[] {
  const ledger = path.join(workDir, '.specweave', 'increments', incrementId, 'ledger.jsonl');
  const cited: string[] = [];
  for (const line of fs.readFileSync(ledger, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    const event = JSON.parse(line) as { e?: string; evidence?: string };
    if (event.e !== 'done' || typeof event.evidence !== 'string') continue;
    for (const m of event.evidence.matchAll(/^log:\s*(\S+)$/gm)) cited.push(m[1]);
  }
  return cited;
}

/** git's own verdict — exit 0 means "this path IS ignored". */
function isIgnored(relPath: string): boolean {
  return spawnSync('git', ['check-ignore', '-q', '--', relPath], { cwd: workDir, env }).status === 0;
}

function trackedUnder(dir: string): string[] {
  return git('ls-files', '--', dir).split('\n').filter(Boolean);
}

beforeEach(() => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), `sw-evidence-work-${suffix}-`));
  homeDir = fs.mkdtempSync(path.join(os.tmpdir(), `sw-evidence-home-${suffix}-`));
  fs.mkdirSync(path.join(homeDir, '.claude'), { recursive: true });
  fs.mkdirSync(path.join(homeDir, '.specweave'), { recursive: true });
  env = getIsolatedEnv(homeDir, { CI: 'true', SPECWEAVE_UPDATE_NO_SELF: '1', SPECWEAVE_AGENT: 'e2e@host' });
  git('init', '-q', '.');
});

afterEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});

describe('e2e: ledger evidence is trackable', () => {
  it('init: the log a done event cites is not ignored and lands in the commit', () => {
    // The fixture intentionally initializes a disposable system-temp project.
    expect(sw('init', '--quick', '--force').code).toBe(0);
    expect(sw('create-increment', 'evidence check').code).toBe(0);
    expect(sw('task', 'done', 'T-01', '--run', 'echo evidence-line').code).toBe(0);

    const cited = citedEvidenceLogs('0001-evidence-check');
    expect(cited.length).toBeGreaterThan(0);

    for (const rel of cited) {
      expect(fs.existsSync(path.join(workDir, rel)), `${rel} should exist on disk`).toBe(true);
      expect(isIgnored(rel), `${rel} is cited by the ledger but gitignored`).toBe(false);
    }

    git('add', '-A');
    git('commit', '-qm', '0001: evidence');

    const tracked = trackedUnder('.specweave/increments/0001-evidence-check/reports');
    for (const rel of cited) {
      expect(tracked).toContain(rel);
    }
  });

  it('init: reports/artifacts/ IS still ignored (only binaries are excluded)', () => {
    expect(sw('init', '--quick', '--force').code).toBe(0);
    const artifact = '.specweave/increments/0001-x/reports/artifacts/screen.bin';
    fs.mkdirSync(path.dirname(path.join(workDir, artifact)), { recursive: true });
    fs.writeFileSync(path.join(workDir, artifact), 'binary');

    expect(isIgnored(artifact)).toBe(true);
  });

  it('update: removes the old log negations so old logs stay ignored', () => {
    // A project a 3.0.x update already touched: blanket `*.log` plus both negations.
    fs.writeFileSync(
      path.join(workDir, '.gitignore'),
      '# Logs\n*.log\nnode_modules/\n\n# SpecWeave (added by specweave update)\n'
        + '!.specweave/increments/**/reports/*.log\n!.specweave/increments/**/reports/task-T-*.log\n'
    );
    fs.mkdirSync(path.join(workDir, '.specweave', 'increments'), { recursive: true });
    fs.writeFileSync(
      path.join(workDir, '.specweave', 'config.json'),
      JSON.stringify({ version: '2.0', project: { name: 'legacy' } }, null, 2)
    );
    const oldLogs = [
      '.specweave/increments/0001-legacy/reports/task-T-01.log',
      '.specweave/increments/0001-legacy/reports/run.log',
    ];
    fs.mkdirSync(path.join(workDir, '.specweave/increments/0001-legacy/reports'), { recursive: true });
    for (const rel of oldLogs) fs.writeFileSync(path.join(workDir, rel), 'echo hi → exit 0\n');

    expect(isIgnored(oldLogs[0]), 'precondition: the negation un-ignores it').toBe(false);

    expect(sw('update', '--no-self', '--no-plugins').code).toBe(0);

    for (const rel of oldLogs) expect(isIgnored(rel), rel).toBe(true);
    git('add', '-A');
    expect(trackedUnder('.specweave/increments/0001-legacy/reports')).toEqual([]);
  });
});
