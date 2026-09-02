/**
 * E2E: what `pause` / `resume` / `abandon` / `start` / `complete` actually print.
 *
 * Three separate defects lived in these lines and every one of them survived a
 * green suite because nothing ever read the CLI's own output:
 *
 *  1. the hints named slash commands that do not exist in a 2.0 install —
 *     `/resume` (there is no resume skill; the shipped set is auto, brainstorm,
 *     do, done, handoff, increment, qa, review, sync, team). Same defect class
 *     as the `/inc` hint fixed earlier.
 *  2. `start` / `resume` printed "✅ Auto-synced increment … to external tools"
 *     in a project with NO tracker configured — one whose own `doctor` says
 *     ".env file: not required (no external sync enabled)".
 *  3. `complete` printed the PASSING verify result inside its
 *     "⚠️  Warnings (non-blocking)" block, so a clean close read as a problem.
 *
 * These drive the real binary: the bug is in the printed text, so the test has
 * to read the printed text.
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
const SKILLS_DIR = path.join(__dirname, '../../../plugins/specweave/skills');

let workDir: string;
let homeDir: string;
let env: Record<string, string>;

function sw(...args: string[]): { code: number; out: string } {
  const r = spawnSync(process.execPath, [specweaveBin, ...args], {
    cwd: workDir,
    encoding: 'utf-8',
    env,
    timeout: 120_000,
  });
  return { code: r.status ?? -1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** Every `/name` or `/ns:name` the CLI just offered the user. */
function slashCommandsIn(output: string): string[] {
  return [...output.matchAll(/(?:^|[\s(])\/((?:[a-z-]+:)?[a-z][a-z0-9.-]*)/gm)].map((m) => m[1]);
}

function installedSkills(): Set<string> {
  return new Set(
    fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  );
}

function readConfig(): Record<string, any> {
  return JSON.parse(fs.readFileSync(path.join(workDir, '.specweave', 'config.json'), 'utf-8'));
}

function writeConfig(config: Record<string, any>): void {
  fs.writeFileSync(path.join(workDir, '.specweave', 'config.json'), JSON.stringify(config, null, 2));
}

beforeEach(() => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), `sw-output-work-${suffix}-`));
  homeDir = fs.mkdtempSync(path.join(os.tmpdir(), `sw-output-home-${suffix}-`));
  fs.mkdirSync(path.join(homeDir, '.claude'), { recursive: true });
  fs.mkdirSync(path.join(homeDir, '.specweave'), { recursive: true });
  env = getIsolatedEnv(homeDir, { CI: 'true', SPECWEAVE_AGENT: 'e2e@host' });
  // StatusChangeSyncTrigger short-circuits when VITEST / NODE_ENV=test is set.
  // Inheriting them would make every assertion below vacuous — the CLI would
  // print nothing about sync no matter what the code did.
  for (const key of ['VITEST', 'VITEST_WORKER_ID', 'VITEST_POOL_ID', 'NODE_ENV']) delete env[key];
  execFileSync('git', ['init', '-q', '.'], { cwd: workDir, env });
  expect(sw('init', '--quick').code).toBe(0);
  expect(sw('create-increment', 'output honesty').code).toBe(0);
});

afterEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});

const INC = '0001-output-honesty';

describe('e2e: lifecycle commands only advertise commands that exist', () => {
  it('pause / resume / abandon never name a slash command with no skill', () => {
    const skills = installedSkills();
    // Precondition: the command the CLI used to advertise really is absent.
    expect(skills.has('resume')).toBe(false);

    const outputs = [sw('pause', INC).out, sw('resume', INC).out, sw('abandon', INC, '--reason', 'x', '--force').out];

    for (const out of outputs) {
      for (const cmd of slashCommandsIn(out)) {
        const name = cmd.includes(':') ? cmd.split(':')[1] : cmd;
        expect(skills.has(name), `CLI offered /${cmd}, which has no plugins/specweave/skills/${name}/`).toBe(true);
      }
    }
  });

  it('pause points at the CLI command that really resumes an increment', () => {
    const out = sw('pause', INC).out;
    expect(out).not.toContain('/resume');
    expect(out).toContain(`specweave resume ${INC}`);
  });

  it('abandon points at a real way back', () => {
    const out = sw('abandon', INC, '--reason', 'x', '--force').out;
    expect(out).not.toContain('/resume');
    expect(out).toContain(`specweave resume ${INC}`);
  });

  it('resume points at the real next step', () => {
    sw('pause', INC);
    const out = sw('resume', INC).out;
    expect(out).toMatch(/specweave task next/);
    expect(out).toMatch(/\/sw:do/);
  });
});

describe('e2e: no sync is claimed when no sync is configured', () => {
  it('resume says nothing about external tools in an unconfigured project', () => {
    // The 2.0 default: no sync block at all.
    expect(readConfig().sync).toBeUndefined();

    sw('pause', INC);
    const out = sw('resume', INC).out;

    expect(out).not.toMatch(/Auto-synced/);
    expect(out).not.toMatch(/external tools/);
  });

  it('start says nothing about external tools in an unconfigured project', () => {
    sw('pause', INC);
    const out = sw('start', INC).out;
    expect(out).not.toMatch(/Auto-synced/);
  });

  it('still reports the sync when a tracker IS configured', () => {
    const config = readConfig();
    config.sync = { enabled: true, provider: 'github', github: { owner: 'o', repo: 'r' } };
    writeConfig(config);

    sw('pause', INC);
    const out = sw('resume', INC).out;

    expect(out).toMatch(/Auto-synced increment .* to external tools/);
  });
});

describe('e2e: complete separates a passing check from real warnings', () => {
  function makeCloseable(): void {
    expect(sw('task', 'done', 'T-01', '--run', 'echo ok').code).toBe(0);
    expect(sw('task', 'skip', 'T-02', '--reason', 'not needed').code).toBe(0);
    const specPath = path.join(workDir, '.specweave', 'increments', INC, 'spec.md');
    fs.writeFileSync(specPath, fs.readFileSync(specPath, 'utf-8').replace(/^- \[ \] AC-/gm, '- [x] AC-'));
    expect(sw('verify', INC).code).toBe(0);
  }

  it('does not print the verify PASS under the warnings header', () => {
    makeCloseable();
    const out = sw('complete', INC).out;

    expect(out).toMatch(/verify ok \(/);

    const warningsAt = out.indexOf('Warnings (non-blocking)');
    const verifyAt = out.indexOf('verify ok (');
    expect(verifyAt).toBeGreaterThan(-1);
    if (warningsAt !== -1) {
      expect(verifyAt, 'a PASSING verify must not be listed under "⚠️  Warnings"').toBeLessThan(warningsAt);
    }
    // …and it is introduced as a check result, not as a problem.
    expect(out).toMatch(/ℹ️\s+Checks:/);
    expect(out).toMatch(/Increment .* completed!/);
  });
});
