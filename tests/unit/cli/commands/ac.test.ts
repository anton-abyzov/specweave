import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { acCommand } from '../../../../src/cli/commands/ac.js';
import { taskCommand } from '../../../../src/cli/commands/task.js';

let root: string;
let inc: string;
let out: string[];
let errs: string[];

const REQUIRED = {
  check: 'wonder-full-shown-when-entitled',
  reason: 'No Muse Wonder Full license; cannot install or test',
  acceptedBy: 'anton',
  authorization: "I don't have a license for it, so I'm okay to skip.",
  // AC-03 in the fixture has no covering task (1098 AC-01).
  uncovered: true,
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-ac-cmd-'));
  inc = path.join(root, '.specweave', 'increments', '0001-demo');
  fs.mkdirSync(inc, { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ project: { name: 'demo' } }));
  fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ id: '0001-demo', status: 'active' }));
  fs.writeFileSync(path.join(inc, 'spec.md'), '# Demo\n\n## Acceptance Criteria\n- [ ] AC-01: Works\n- [ ] AC-03: Needs a license\n\n## Tasks\n### T-01 Do it\n- AC: AC-01 | Files: a.txt | Test: true\n');
  out = [];
  errs = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((s) => { out.push(String(s)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation((s) => { errs.push(String(s)); return true; });
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

const ledgerLines = (): string[] => {
  const file = path.join(inc, 'ledger.jsonl');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean) : [];
};

describe('specweave ac accept-skip (1096 AC-01)', () => {
  it('appends exactly one accept-skip line with every identity field', async () => {
    const code = await acCommand('accept-skip', 'ac-03', '0001', { ...REQUIRED, acceptedAt: '2026-10-27', cwd: root, agent: 'claude@m4', json: true });
    expect(code).toBe(0);
    const lines = ledgerLines();
    expect(lines).toHaveLength(1);
    const ev = JSON.parse(lines[0]);
    expect(Object.keys(ev)).toEqual(['t', 'e', 'by', 'at', ...(ev.model ? ['model'] : []), 'check', 'reason', 'acceptedBy', 'acceptedAt', 'authorization']);
    const { uncovered: _u, ...fields } = REQUIRED;
    expect(ev).toMatchObject({ t: 'AC-03', e: 'accept-skip', by: 'claude@m4', ...fields, acceptedAt: '2026-10-27' });
    expect(ev).not.toHaveProperty('uncovered');
    expect(errs.join('')).toContain('warning: AC-03 has no task citing it; this accepted skip closes the whole AC.');
    const json = JSON.parse(out.join(''));
    expect(json).toMatchObject({ increment: '0001-demo', accepted: 'AC-03', acceptance: 'skipped-accepted' });
    expect(json.criterion.waivers[0]).toMatchObject({ ...fields, acceptedAt: '2026-10-27' });
    expect(json.criterion.uncovered).toBe(true);
  });

  it('refuses an AC no task cites unless --uncovered confirms it (1098 AC-01)', async () => {
    expect(await acCommand('accept-skip', 'AC-03', '0001', { ...REQUIRED, uncovered: false, cwd: root })).toBe(1);
    expect(errs.join('')).toContain('AC-03 has no task citing it, so this accepted skip would close the whole AC, not just check wonder-full-shown-when-entitled');
    expect(ledgerLines()).toHaveLength(0);

    // A covered AC needs no confirmation and gets no warning.
    errs.length = 0;
    expect(await acCommand('accept-skip', 'AC-01', '0001', { ...REQUIRED, uncovered: false, check: 'needs-device', cwd: root })).toBe(0);
    expect(errs.join('')).not.toContain('no task citing it');
    expect(ledgerLines()).toHaveLength(1);
  });

  it.each([
    ['check', 101],
    ['reason', 1001],
    ['authorization', 2001],
    ['acceptedBy', 101],
  ] as const)('refuses an over-long --%s and writes nothing (1098 AC-05)', async (field, length) => {
    expect(await acCommand('accept-skip', 'AC-03', '0001', { ...REQUIRED, [field]: 'x'.repeat(length), cwd: root })).toBe(1);
    expect(errs.join('')).toContain(`is ${length} characters; the limit is ${length - 1}`);
    expect(ledgerLines()).toHaveLength(0);
  });

  it.each([
    ['check', { ...REQUIRED, check: '' }, '--check'],
    ['reason', { ...REQUIRED, reason: ' ' }, '--reason'],
    ['accepted-by', { ...REQUIRED, acceptedBy: undefined }, '--accepted-by'],
    ['authorization', { ...REQUIRED, authorization: '' }, '--authorization'],
  ])('refuses without --%s and writes nothing', async (_name, opts, flag) => {
    expect(await acCommand('accept-skip', 'AC-03', '0001', { ...opts, cwd: root })).toBe(1);
    expect(errs.join('')).toContain(`Missing ${flag}`);
    expect(ledgerLines()).toHaveLength(0);
  });

  it('refuses an AC that spec.md does not declare, a bad date and a duplicate', async () => {
    expect(await acCommand('accept-skip', 'AC-09', '0001', { ...REQUIRED, cwd: root })).toBe(1);
    expect(errs.join('')).toContain('AC-09 is not an acceptance criterion in 0001-demo/spec.md (declared: AC-01, AC-03)');
    expect(await acCommand('accept-skip', 'AC-03', '0001', { ...REQUIRED, acceptedAt: 'Oct 27', cwd: root })).toBe(1);
    expect(ledgerLines()).toHaveLength(0);

    expect(await acCommand('accept-skip', 'AC-03', '0001', { ...REQUIRED, cwd: root })).toBe(0);
    expect(await acCommand('accept-skip', 'AC-03', '0001', { ...REQUIRED, reason: 'again', cwd: root })).toBe(1);
    expect(errs.join('')).toContain('AC-03 check wonder-full-shown-when-entitled is already accepted');
    expect(ledgerLines()).toHaveLength(1);
  });
});

describe('JSON outputs the app reads (1096 AC-04)', () => {
  it('task list --json and ac list --json carry acceptance and waivers per AC', async () => {
    await acCommand('accept-skip', 'AC-03', '0001', { ...REQUIRED, acceptedAt: '2026-10-27T13:05:00Z', cwd: root });
    out.length = 0;
    expect(await taskCommand('list', '0001', undefined, { cwd: root, json: true })).toBe(0);
    const list = JSON.parse(out.join(''));
    const byId = Object.fromEntries(list.criteria.map((c: { id: string }) => [c.id, c]));
    expect(byId['AC-01']).toMatchObject({ done: false, acceptance: 'open', waivers: [] });
    expect(byId['AC-03']).toMatchObject({ done: false, acceptance: 'skipped-accepted' });
    const { uncovered: _u, ...fields } = REQUIRED;
    expect(byId['AC-03'].waivers[0]).toMatchObject({ ...fields, acceptedAt: '2026-10-27T13:05:00Z' });

    out.length = 0;
    expect(await acCommand('list', '0001', undefined, { cwd: root, json: true })).toBe(0);
    expect(JSON.parse(out.join('')).criteria).toEqual(list.criteria);
  });
});
