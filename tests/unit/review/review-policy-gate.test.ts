import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { reviewCommand } from '../../../src/cli/commands/review.js';
import { checkClosureGate, reviewPolicyErrors } from '../../../src/core/tasks/closure-gate.js';
import { formatRecordHeader, incrementRepoPaths, parseRecordHeader, readReviewRecords } from '../../../src/core/review/record.js';

const ID = '0001-demo';
const APP = 'repositories/acme/app';
let root: string;
let app: string;
let inc: string;
let out: string[];
let err: string[];

const write = (abs: string, content: string) => {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
};
const gitIn = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd, stdio: 'pipe' }).toString().trim();
const spec = (review: string) => write(path.join(inc, 'spec.md'), [
  '# 0001 Demo total',
  '',
  '## Acceptance Criteria',
  '',
  '- [ ] AC-01: The total is right',
  '',
  ...(review ? ['## Review', review, ''] : []),
  '## Tasks',
  '',
  '### T-01 Sum the list',
  `- AC: AC-01 | Files: ${APP}/src/total.ts, .specweave/increments/${ID}/reports/x.md | Test: npm test`,
  '',
].join('\n'));
const answer = (verdict: string) => {
  const file = path.join(root, 'answer.md');
  write(file, `# Review: 0001\nVerdict: ${verdict} · risk: low\n`);
  return file;
};
const record = (opts: Record<string, string>) => reviewCommand(ID, { cwd: app, ...opts });

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-policy-gate-'));
  app = path.join(root, APP);
  inc = path.join(root, '.specweave', 'increments', ID);
  write(path.join(root, '.specweave', 'config.json'), JSON.stringify({ project: { name: 'demo' } }));
  fs.mkdirSync(app, { recursive: true });
  gitIn(app, 'init', '-q', '-b', 'main');
  write(path.join(app, 'src/total.ts'), 'export const total = 0;\n');
  write(path.join(app, 'README.md'), 'app\n');
  gitIn(app, 'add', '-A');
  gitIn(app, 'commit', '-qm', 'base');
  gitIn(app, 'checkout', '-qb', 'feat');
  write(path.join(app, 'src/total.ts'), 'export const total = 1;\n');
  gitIn(app, 'commit', '-qam', 'sum');
  write(path.join(inc, 'metadata.json'), JSON.stringify({ id: ID, status: 'active' }));
  write(path.join(inc, 'ledger.jsonl'), '{"t":"T-01","e":"done","by":"claude@mbp","at":"2026-10-17T10:30:00Z","evidence":"abc123"}\n');
  spec('- Reviewer: openai (gpt-6.1-sol)\n- Depth: deep\n- Required: yes');
  out = [];
  err = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((s) => { out.push(String(s)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation((s) => { err.push(String(s)); return true; });
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('review records', () => {
  it('round-trips the header and groups task Files by repository, leaving bookkeeping out', () => {
    const header = formatRecordHeader({ reviewer: 'sol', model: 'gpt-6.1-sol', family: 'openai', author: 'claude', depth: 'deep', repo: APP, head: 'abc1234', at: '2026-11-13T00:00:00Z' });
    expect(parseRecordHeader(`${header}\n# Review`)).toMatchObject({ reviewer: 'sol', model: 'gpt-6.1-sol', family: 'openai', repo: APP, head: 'abc1234' });
    expect([...incrementRepoPaths(root, inc)]).toEqual([[APP, ['src/total.ts']]]);
  });

  it('--record stamps a review written elsewhere with model, family, author, repository and commit', async () => {
    const head = gitIn(app, 'rev-parse', 'HEAD');
    expect(await record({ record: answer('ship'), model: 'gpt-6.1-sol' })).toBe(0);
    const [rec] = readReviewRecords(inc);
    expect(rec).toMatchObject({ reviewer: 'gpt-6.1-sol', model: 'gpt-6.1-sol', family: 'openai', author: 'claude', depth: 'deep', repo: APP, head, verdict: 'ship' });
    expect(out.join('')).toContain('It satisfies the review policy');
    const note = fs.readFileSync(path.join(inc, 'ledger.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).at(-1);
    expect(note.note).toBe(`review by gpt-6.1-sol (openai) at ${head.slice(0, 12)}: ship · reports/reviews/review-gpt-6.1-sol-1.md`);
  });

  it('--record refuses without --model, without a verdict line, or with a --head that is not a commit id', async () => {
    expect(await record({ record: answer('ship') })).toBe(1);
    write(path.join(root, 'none.md'), '# Review\nLooks fine.\n');
    expect(await record({ record: path.join(root, 'none.md'), model: 'gpt-6.1-sol' })).toBe(1);
    expect(await record({ record: answer('ship'), model: 'gpt-6.1-sol', head: 'main; echo' })).toBe(1);
    expect(err.join('')).toContain('no verdict line');
    expect(readReviewRecords(inc)).toEqual([]);
  });
});

describe('closure with a required review policy', () => {
  it('refuses with no review, naming the policy and the next command', () => {
    const errors = reviewPolicyErrors(root, inc, undefined);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Review policy (spec.md ## Review) requires a OpenAI review with gpt-6.1-sol, deep depth for repositories/acme/app');
    expect(errors[0]).toContain('no review is on file');
    expect(checkClosureGate(inc, ID, { reason: 'x' }).notices.join('\n')).toContain('closing anyway');
    expect(checkClosureGate(inc, ID).errors.join('\n')).toContain('requires a OpenAI review');
  });

  it('refuses a same-family review and names it', async () => {
    expect(await record({ record: answer('ship'), model: 'claude-sonnet-5-5' })).toBe(0);
    expect(out.join('')).toContain('does NOT satisfy the review policy');
    const [error] = reviewPolicyErrors(root, inc, undefined);
    expect(error).toMatch(/the newest review is claude-sonnet-5-5 \(Claude\) at [0-9a-f]{12}, ship/);
  });

  it('refuses a fix first verdict and a review older than verification', async () => {
    expect(await record({ record: answer('fix first'), model: 'gpt-6.1-sol' })).toBe(3);
    expect(reviewPolicyErrors(root, inc, undefined)[0]).toContain('says fix first');
    expect(await record({ record: answer('ship'), model: 'gpt-6.1-sol' })).toBe(0);
    expect(reviewPolicyErrors(root, inc, undefined)).toEqual([]);
    expect(reviewPolicyErrors(root, inc, new Date(Date.now() + 60_000).toISOString())[0]).toContain('predates verification');
  });

  it('passes a squash-merged review and refuses when the reviewed files changed after it', async () => {
    expect(await record({ record: answer('ship'), model: 'gpt-6.1-sol' })).toBe(0);
    // Squash-merge the branch into main: another commit id, the same content.
    gitIn(app, 'checkout', '-q', 'main');
    gitIn(app, 'merge', '-q', '--squash', 'feat');
    gitIn(app, 'commit', '-qm', 'Sum (#1)');
    write(path.join(app, 'README.md'), 'unrelated\n');
    gitIn(app, 'commit', '-qam', 'docs');
    expect(reviewPolicyErrors(root, inc, undefined)).toEqual([]);

    write(path.join(app, 'src/total.ts'), 'export const total = 2;\n');
    gitIn(app, 'commit', '-qam', 'change after review');
    const [error] = reviewPolicyErrors(root, inc, undefined);
    expect(error).toContain('changed since the review');
    expect(error).toContain('src/total.ts');
  });

  it('refuses a reviewed commit the repository does not have', async () => {
    expect(await record({ record: answer('ship'), model: 'gpt-6.1-sol', head: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' })).toBe(0);
    expect(reviewPolicyErrors(root, inc, undefined)[0]).toContain('is not in repositories/acme/app');
  });

  it('a cross-family policy takes any other family; without Required nothing changes', async () => {
    spec('- Required: yes');
    expect(await record({ record: answer('ship'), model: 'gemini-4-carbon' })).toBe(0);
    expect(reviewPolicyErrors(root, inc, undefined)).toEqual([]);
    spec('');
    fs.rmSync(path.join(inc, 'reports'), { recursive: true, force: true });
    expect(reviewPolicyErrors(root, inc, undefined)).toEqual([]);
  });
});
