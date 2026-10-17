import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFileSync, spawn } from 'child_process';
import { pathToFileURL } from 'url';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { authorFamilies, buildBrief, familyOfTool, resolveBase } from '../../../src/core/review/brief.js';
import { parseVerdict, pickReviewer, reviewersFrom, runReviewer, commandBinary, expandOut } from '../../../src/core/review/reviewer.js';
import { reviewCommand } from '../../../src/cli/commands/review.js';
import { checkClosureGate } from '../../../src/core/tasks/closure-gate.js';

const ID = '0001-demo';
let root: string;
let scripts: string;
let incDir: string;
let out: string[];
let err: string[];

const write = (rel: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
};
const git = (...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd: root, stdio: 'pipe' });
const ledgerLines = () => fs.readFileSync(path.join(incDir, 'ledger.jsonl'), 'utf-8').trim().split('\n').map((l) => JSON.parse(l));

/** A reviewer CLI: echoes whether the brief arrived, answers with the given verdict. */
function fakeReviewer(answer: string, opts: { exit?: number; sleepMs?: number; toFile?: boolean } = {}): string {
  const file = path.join(scripts, `reviewer-${Math.random().toString(36).slice(2)}.cjs`);
  fs.writeFileSync(file, `
let brief = '';
process.stdin.on('data', (d) => { brief += d; });
process.stdin.on('end', () => {
  setTimeout(() => {
    const text = ${JSON.stringify(answer)} + (brief.includes('AC-01: The total is right') ? '\\nsaw-brief' : '');
    if (process.argv[2]) require('fs').writeFileSync(process.argv[2], text); else process.stdout.write(text);
    process.exit(${opts.exit ?? 0});
  }, ${opts.sleepMs ?? 0});
});
`);
  return `"${process.execPath}" "${file}"${opts.toFile ? ' {out}' : ''}`;
}

function configure(review: unknown): void {
  write('.specweave/config.json', JSON.stringify({ project: { name: 'demo' }, review }));
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-review-'));
  scripts = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-review-bin-'));
  incDir = path.join(root, '.specweave', 'increments', ID);
  git('init', '-q', '-b', 'main');
  configure({});
  write('src/total.ts', 'export const total = (a: number[]) => a.reduce((s, x) => s + x, 0);\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  git('checkout', '-qb', 'feat');
  write('src/total.ts', 'export const total = (a: number[]) => a.reduce((s, x) => s + x, 1);\n');
  write(`.specweave/increments/${ID}/metadata.json`, JSON.stringify({ id: ID, status: 'active' }));
  write(`.specweave/increments/${ID}/spec.md`, [
    '# 0001 Demo total',
    '',
    '## Acceptance Criteria',
    '',
    '- [ ] AC-01: The total is right',
    '',
    '## Approach',
    '',
    'Sum with reduce.',
    '',
    '## Tasks',
    '',
    '### T-01 Sum the list',
    '- AC: AC-01 | Files: src/total.ts | Test: npm test',
    '',
  ].join('\n'));
  write(`.specweave/increments/${ID}/ledger.jsonl`, [
    '{"t":"T-01","e":"claim","by":"claude@mbp","at":"2026-10-17T10:00:00Z"}',
    '{"t":"T-01","e":"done","by":"claude@mbp","at":"2026-10-17T10:30:00Z","evidence":"abc123"}',
  ].join('\n') + '\n');
  git('add', '-A');
  git('commit', '-qm', '0001: sum');
  out = [];
  err = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((s) => { out.push(String(s)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation((s) => { err.push(String(s)); return true; });
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(scripts, { recursive: true, force: true });
});

describe('brief', () => {
  it('names the author family from the ledger, with claims as the fallback', () => {
    expect(authorFamilies(incDir)).toEqual({ primary: 'claude', counts: { claude: 1 } });
    fs.writeFileSync(path.join(incDir, 'ledger.jsonl'), '{"t":"T-01","e":"claim","by":"codex@mbp","at":"2026-10-17T10:00:00Z"}\n{"t":"*","e":"note","by":"api","at":"2026-10-17T10:00:00Z","note":"x"}\n');
    expect(authorFamilies(incDir).primary).toBe('openai');
    fs.writeFileSync(path.join(incDir, 'ledger.jsonl'), '');
    expect(authorFamilies(incDir).primary).toBeUndefined();
    expect(familyOfTool('grok')).toBe('xai');
  });

  it('carries the ACs, Approach, tasks with Files, and the diff since the base', () => {
    const base = resolveBase(root)!;
    expect(base).toBe(git('rev-parse', 'main').toString().trim());
    const brief = buildBrief({ projectRoot: root, repoRoot: root, incrementId: ID, incrementDir: incDir, base });
    expect(brief.paths).toEqual(['src/total.ts']);
    expect(brief.diffIncluded).toBe(true);
    for (const text of ['AC-01: The total is right', 'Sum with reduce.', 'T-01 Sum the list [done] · Files: src/total.ts', 'Written by: claude', '+export const total', 'Verdict:']) {
      expect(brief.text).toContain(text);
    }
    expect(resolveBase(root, 'no-such-ref')).toBeNull();
  });

  it('--brief prints the brief and runs nothing', async () => {
    expect(await reviewCommand(ID, { cwd: root, brief: true })).toBe(0);
    expect(out.join('')).toContain('# Adversarial review: 0001-demo 0001 Demo total');
    expect(ledgerLines()).toHaveLength(2);
  });
});

describe('reviewer choice', () => {
  const reviewers = reviewersFrom({ reviewers: { grok: { command: 'grok -p', family: 'xai' } } });
  const all = () => true;

  it('picks Codex for Claude-written code and Claude for OpenAI-written code', () => {
    expect(pickReviewer(reviewers, 'claude', { available: all }).reviewer?.name).toBe('codex');
    expect(pickReviewer(reviewers, 'openai', { available: all }).reviewer?.name).toBe('claude');
    expect(pickReviewer(reviewers, undefined, { available: all }).reviewer?.name).toBe('codex');
    expect(pickReviewer(reviewers, 'claude', { available: (r) => r.name === 'grok' }).reviewer?.name).toBe('grok');
  });

  it('honours --reviewer and review.reviewer, and explains when none fits', () => {
    expect(pickReviewer(reviewers, 'claude', { explicit: 'claude', available: all }).reviewer?.name).toBe('claude');
    expect(pickReviewer(reviewers, 'claude', { configured: 'grok', available: all }).reviewer?.name).toBe('grok');
    expect(pickReviewer(reviewers, 'claude', { configured: 'auto', available: all }).reviewer?.name).toBe('codex');
    expect(pickReviewer(reviewers, 'claude', { explicit: 'gemini' }).why).toContain('no reviewer "gemini"');
    expect(pickReviewer(reviewers, 'claude', { available: () => false }).why).toContain('no reviewer from another family than claude');
  });

  it('defaults to GPT-6.1-Sol in a read-only Codex sandbox', () => {
    const codex = reviewersFrom(undefined).find((r) => r.name === 'codex')!;
    expect(codex.command).toContain('-m gpt-6.1-sol');
    expect(codex.command).toContain('-s read-only');
    expect(commandBinary(codex.command)).toBe('codex');
    expect(reviewersFrom({ reviewers: { mine: { command: 'x', family: 'anthropic' } } }).find((r) => r.name === 'mine')?.family).toBe('claude');
  });

  it('parses the verdict line', () => {
    expect(parseVerdict('# Review\nVerdict: ship · risk: low')).toBe('ship');
    expect(parseVerdict('# Review\n**Verdict:** fix first · risk: high')).toBe('fix first');
    expect(parseVerdict('Verdict: fix-first')).toBe('fix first');
    expect(parseVerdict('I think we should ship it')).toBeUndefined();
  });
});

describe('specweave review', () => {
  it('runs the reviewer with the brief, writes the report and a ledger note, exit 0 on ship', async () => {
    configure({ reviewer: 'fake', reviewers: { fake: { command: fakeReviewer('# Review\nVerdict: ship · risk: low', { toFile: true }), family: 'openai' } } });
    expect(await reviewCommand(ID, { cwd: root })).toBe(0);
    const report = fs.readFileSync(path.join(incDir, 'reports', 'review-fake.md'), 'utf-8');
    expect(report).toMatch(/^<!-- specweave review: reviewer=fake family=openai author=claude /);
    expect(report).toContain('saw-brief');
    expect(fs.readdirSync(path.join(incDir, 'reports'))).toEqual(['review-fake.md']);
    const note = ledgerLines().at(-1);
    expect(note).toMatchObject({ t: '*', e: 'note', note: 'review by fake (openai): ship · reports/review-fake.md' });
  });

  it('exit 3 on fix first and when the answer has no verdict; the close gate notes fix first', async () => {
    configure({ reviewer: 'fake', reviewers: { fake: { command: fakeReviewer('# Review\nVerdict: fix first\n## [high] src/total.ts:1 starts at 1'), family: 'openai' } } });
    expect(await reviewCommand(ID, { cwd: root })).toBe(3);
    expect(checkClosureGate(incDir, ID).notices.join('\n')).toContain('reports/review-fake.md says fix first');

    configure({ reviewer: 'fake', reviewers: { fake: { command: fakeReviewer('Looks fine to me.'), family: 'openai' } } });
    expect(await reviewCommand(ID, { cwd: root })).toBe(3);
    expect(ledgerLines().at(-1).note).toContain('no verdict');
  });

  it('warns when the reviewer is the author\'s own family', async () => {
    configure({ reviewers: { fake: { command: fakeReviewer('Verdict: ship'), family: 'claude' } } });
    expect(await reviewCommand(ID, { cwd: root, reviewer: 'fake' })).toBe(0);
    expect(out.join('')).toContain('not a cross-model review');
  });

  it('exit 1 when the reviewer fails, times out or none is installed', async () => {
    configure({ reviewer: 'fake', reviewers: { fake: { command: fakeReviewer('', { exit: 2 }), family: 'openai' } } });
    expect(await reviewCommand(ID, { cwd: root })).toBe(1);
    expect(err.join('')).toContain('fake exited 2');

    configure({ reviewer: 'fake', timeoutMinutes: 0.005, reviewers: { fake: { command: fakeReviewer('Verdict: ship', { sleepMs: 5000 }), family: 'openai' } } });
    expect(await reviewCommand(ID, { cwd: root })).toBe(1);
    expect(err.join('')).toContain('timed out');

    configure({});
    expect(await reviewCommand(ID, { cwd: root, available: () => false })).toBe(1);
    expect(err.join('')).toContain('specweave review --brief');
    expect(await reviewCommand(ID, { cwd: root, timeout: 'soon', available: () => true, reviewer: 'codex' })).toBe(1);
  });

  it('a reviewer that exits non-zero is an error even when it prints a verdict', async () => {
    configure({ reviewer: 'fake', reviewers: { fake: { command: fakeReviewer('Verdict: ship', { exit: 42 }), family: 'openai' } } });
    expect(await reviewCommand(ID, { cwd: root })).toBe(1);
    expect(err.join('')).toContain('fake exited 42');
    expect(ledgerLines()).toHaveLength(2);
    expect(fs.existsSync(path.join(incDir, 'reports', 'review-fake.md'))).toBe(false);
  });

  it('{out} reaches the command as an environment variable, never as shell text', async () => {
    expect(expandOut('x -o {out} -', 'darwin')).toBe('x -o "$SPECWEAVE_REVIEW_OUT" -');
    expect(expandOut('x -o "{out}"', 'linux')).toBe('x -o "$SPECWEAVE_REVIEW_OUT"');
    expect(expandOut("x -o '{out}'", 'win32')).toBe('x -o "%SPECWEAVE_REVIEW_OUT%"');
    const hostile = path.join(scripts, "a'b $(touch INJECTED) `touch INJECTED2`", 'answer.md');
    for (const form of ['{out}', '"{out}"', "'{out}'"]) {
      const res = await runReviewer(fakeReviewer('Verdict: ship', { toFile: false }).replace(/$/, ` ${form}`), 'brief', { cwd: scripts, outFile: hostile, timeoutMs: 10_000 });
      expect(res.output).toBe('Verdict: ship');
    }
    expect(fs.existsSync(path.join(scripts, 'INJECTED'))).toBe(false);
    expect(fs.existsSync(path.join(scripts, 'INJECTED2'))).toBe(false);
  });

  it.skipIf(process.platform === 'win32')('a timeout stops the whole process tree and returns promptly', async () => {
    const marker = path.join(scripts, 'survived');
    const started = Date.now();
    const res = await runReviewer(`sleep 3; touch "${marker}"`, 'brief', { cwd: scripts, outFile: path.join(scripts, 'x.md'), timeoutMs: 200, graceMs: 200 });
    expect(res.timedOut).toBe(true);
    expect(Date.now() - started).toBeLessThan(2500);
    await new Promise((r) => setTimeout(r, 3500));
    expect(fs.existsSync(marker)).toBe(false);
  }, 15_000);

  it.skipIf(process.platform === 'win32')('kills a descendant that ignores SIGTERM and detached from the pipes', async () => {
    const marker = path.join(scripts, 'stubborn');
    const res = await runReviewer(`(trap '' TERM; sleep 2; touch "${marker}") </dev/null >/dev/null 2>&1 & sleep 5`, 'brief', {
      cwd: scripts, outFile: path.join(scripts, 'y.md'), timeoutMs: 200, graceMs: 200,
    });
    expect(res.timedOut).toBe(true);
    await new Promise((r) => setTimeout(r, 2800));
    expect(fs.existsSync(marker)).toBe(false);
  }, 15_000);

  it.skipIf(process.platform === 'win32')('Ctrl-C on specweave review kills the reviewer, even one that ignores SIGTERM', async () => {
    // Runs the built module in a separate node process, then interrupts that process.
    const built = path.resolve('dist/src/core/review/reviewer.js');
    if (!fs.existsSync(built)) throw new Error('dist/ is missing: run `npm run build` before this test');
    const marker = path.join(scripts, 'after-ctrl-c');
    const driver = path.join(scripts, 'driver.mjs');
    fs.writeFileSync(driver, `
import { runReviewer } from ${JSON.stringify(pathToFileURL(built).href)};
process.stdout.write('started\\n');
await runReviewer(${JSON.stringify(`trap '' TERM; sleep 2; touch "${marker}"`)}, 'brief', { cwd: ${JSON.stringify(scripts)}, outFile: ${JSON.stringify(path.join(scripts, 'z.md'))}, timeoutMs: 60000 });
`);
    const child = spawn(process.execPath, [driver], { stdio: ['ignore', 'pipe', 'inherit'] });
    await new Promise<void>((resolve) => child.stdout!.once('data', () => resolve()));
    await new Promise((r) => setTimeout(r, 300));
    child.kill('SIGINT');
    await new Promise((r) => child.once('exit', r));
    await new Promise((r) => setTimeout(r, 2800));
    expect(fs.existsSync(marker)).toBe(false);
  }, 20_000);

  it('runReviewer reads {out} when the command writes it, stdout otherwise', async () => {
    const outFile = path.join(scripts, 'answer.md');
    const viaFile = await runReviewer(fakeReviewer('Verdict: ship', { toFile: true }), 'brief', { cwd: root, outFile, timeoutMs: 10_000 });
    expect(viaFile).toMatchObject({ code: 0, output: 'Verdict: ship', timedOut: false });
    const viaStdout = await runReviewer(fakeReviewer('Verdict: fix first'), 'brief', { cwd: root, outFile, timeoutMs: 10_000 });
    expect(viaStdout.output).toBe('Verdict: fix first');
  });
});
