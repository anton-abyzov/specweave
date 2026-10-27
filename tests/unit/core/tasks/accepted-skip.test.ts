import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { foldLedger, formatLedgerLine, parseLedger, type LedgerEvent } from '../../../../src/core/tasks/ledger.js';
import { runVerify } from '../../../../src/core/tasks/verify-runner.js';
import { checkClosureGate } from '../../../../src/core/tasks/closure-gate.js';
import { buildPickup } from '../../../../src/core/session/pickup.js';

const WAIVER = {
  check: 'wonder-full-shown-when-entitled',
  reason: 'No Muse Wonder Full license; cannot install or test',
  acceptedBy: 'anton',
  acceptedAt: '2026-10-27',
  authorization: "I don't have a license for it, so I'm okay to skip.",
};

const skip = (t: string, at: string, extra: Partial<LedgerEvent> = {}): LedgerEvent =>
  ({ t, e: 'accept-skip', by: 'claude@m4', at, ...WAIVER, ...extra });

describe('accept-skip ledger event (1096 AC-02)', () => {
  it('round-trips with fixed key order and keeps identity fields', () => {
    const line = formatLedgerLine(skip('AC-03', '2026-10-27T14:00:00Z'));
    expect(line).toBe(JSON.stringify({ t: 'AC-03', e: 'accept-skip', by: 'claude@m4', at: '2026-10-27T14:00:00Z', ...WAIVER }) + '\n');
    const { events, malformed } = parseLedger(line);
    expect(malformed).toBe(0);
    expect(events[0]).toMatchObject({ e: 'accept-skip', ...WAIVER });
  });

  it('never changes task state and keeps only the first complete record per AC and check', () => {
    const events: LedgerEvent[] = [
      { t: 'T-01', e: 'done', by: 'a', at: '2026-10-27T10:00:00Z', evidence: 'tests pass' },
      skip('AC-03', '2026-10-27T11:00:00Z'),
      skip('AC-03', '2026-10-27T12:00:00Z', { reason: 'second try' }),
      skip('AC-03', '2026-10-27T12:30:00Z', { check: 'other-check', authorization: '' }),
      skip('AC-03', '2026-10-27T12:40:00Z', { acceptedAt: 'yesterday' }),
      skip('T-01', '2026-10-27T12:50:00Z', { check: 'x' }),
    ];
    const fold = foldLedger(events);
    expect(fold.tasks.get('T-01')?.status).toBe('done');
    expect(fold.tasks.has('AC-03')).toBe(false);
    expect(fold.acceptedSkips).toEqual([{ ac: 'AC-03', ...WAIVER, by: 'claude@m4', at: '2026-10-27T11:00:00Z' }]);
    expect(fold.ignored.map((i) => i.reason)).toEqual([
      'AC-03 check wonder-full-shown-when-entitled already accepted',
      'accept-skip without authorization',
      'accept-skip with an unreadable acceptedAt',
      'accept-skip needs an AC id',
    ]);
  });

  it('folds a ledger without accept-skip exactly as before', () => {
    const fold = foldLedger([{ t: 'T-01', e: 'skip', by: 'a', at: '2026-10-27T10:00:00Z', note: 'not needed' }]);
    expect(fold.acceptedSkips).toEqual([]);
    expect(fold.ignored).toEqual([]);
    expect(fold.tasks.get('T-01')?.status).toBe('skipped');
  });
});

let root: string;
afterEach(() => { if (root) fs.rmSync(root, { recursive: true, force: true }); });

const SPEC = `# Demo

## Acceptance Criteria

- [ ] AC-01: met by its task
- [ ] AC-02: met by its task, one check waived
- [ ] AC-03: only an accepted skip
- [ ] AC-04: accepted skip but its task is still open
- [ ] AC-05: nothing yet

## Tasks

### T-01 First
- AC: AC-01, AC-02
### T-02 Open
- AC: AC-04
### T-03 Later
- AC: AC-05
`;

function mk(ledger: LedgerEvent[], spec = SPEC): string {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-accept-skip-'));
  const incDir = path.join(root, '.specweave', 'increments', '0001-demo');
  fs.mkdirSync(incDir, { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ testing: { commands: [] } }));
  fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({ id: '0001-demo', status: 'active' }));
  fs.writeFileSync(path.join(incDir, 'spec.md'), spec);
  fs.writeFileSync(path.join(incDir, 'ledger.jsonl'), ledger.map(formatLedgerLine).join(''));
  return incDir;
}

const LEDGER: LedgerEvent[] = [
  { t: 'T-01', e: 'done', by: 'a', at: '2026-10-27T10:00:00Z', evidence: 'tests pass' },
  skip('AC-02', '2026-10-27T11:00:00Z', { check: 'decline-shown' }),
  skip('AC-03', '2026-10-27T11:01:00Z'),
  skip('AC-04', '2026-10-27T11:02:00Z', { check: 'needs-device' }),
];

describe('AC acceptance in verify (1096 AC-03, AC-04)', () => {
  it('derives met, mixed, skipped-accepted and open without counting waivers as met', async () => {
    const incDir = mk(LEDGER);
    const { report } = await runVerify(root, '0001-demo', incDir, { commands: [], reason: 'fixture' });
    const json = JSON.parse(fs.readFileSync(path.join(incDir, 'reports', 'verify.json'), 'utf-8'));
    const byId = Object.fromEntries(json.acs.items.map((i: { id: string }) => [i.id, i]));
    expect(byId['AC-01']).toMatchObject({ done: true, acceptance: 'met', waivers: [] });
    expect(byId['AC-02']).toMatchObject({ done: true, acceptance: 'mixed' });
    expect(byId['AC-02'].waivers).toEqual([{ ...WAIVER, check: 'decline-shown', by: 'claude@m4', at: '2026-10-27T11:00:00Z' }]);
    expect(byId['AC-03']).toMatchObject({ done: false, via: 'none', acceptance: 'skipped-accepted' });
    expect(byId['AC-04']).toMatchObject({ done: false, acceptance: 'open', tasks: [{ id: 'T-02', status: 'open' }] });
    expect(byId['AC-04'].waivers).toHaveLength(1);
    expect(byId['AC-05']).toMatchObject({ done: false, acceptance: 'open', waivers: [] });
    expect(json.acs).toMatchObject({ total: 5, done: 2, skippedAccepted: 1, mixed: 1 });
    expect(json.acceptedSkips.map((s: { ac: string; check: string }) => `${s.ac}/${s.check}`))
      .toEqual(['AC-02/decline-shown', 'AC-03/wonder-full-shown-when-entitled', 'AC-04/needs-device']);
    expect(report.ok).toBe(false);

    const md = fs.readFileSync(path.join(incDir, 'reports', 'verify.md'), 'utf-8');
    expect(md).toContain('2/5 met · 1 skipped (accepted), not verified');
    expect(md).toContain('| AC-03 |   | skipped-accepted |');
    expect(md).toContain('### Accepted skips (not verified)');
    expect(md).toContain(`- AC-03 check \`wonder-full-shown-when-entitled\` — ${WAIVER.reason}. Accepted by anton at 2026-10-27; authorization: ${WAIVER.authorization}`);
  });

  it('pickup --json carries the same acceptance per AC', () => {
    mk(LEDGER);
    const result = buildPickup(root, { incrementId: '0001-demo', agent: 'tester', checkpointHome: root });
    const byId = Object.fromEntries((result.criteria ?? []).map((c) => [c.id, c]));
    expect(byId['AC-03']).toMatchObject({ acceptance: 'skipped-accepted', waivers: [expect.objectContaining({ acceptedBy: 'anton' })] });
    expect(byId['AC-02'].acceptance).toBe('mixed');
    expect(result.text).toContain('ACs 2/5 met, 1 skipped (accepted)');
    expect(result.text).toContain('Accepted skip AC-03 wonder-full-shown-when-entitled');
  });
});

describe('closure with skipped-accepted ACs (1096 AC-05)', () => {
  const CLOSABLE = `# Demo

## Acceptance Criteria

- [ ] AC-01: met by its task
- [ ] AC-02: only an accepted skip

## Tasks

### T-01 First
- AC: AC-01
`;

  it('lets verify pass and complete proceed, naming the skipped-accepted ACs', async () => {
    const incDir = mk([
      { t: 'T-01', e: 'done', by: 'a', at: '2026-10-27T10:00:00Z', evidence: 'tests pass' },
      skip('AC-02', '2026-10-27T11:00:00Z'),
    ], CLOSABLE);
    const { report } = await runVerify(root, '0001-demo', incDir, { commands: ['true'] });
    expect(report.ok).toBe(true);
    expect(report.acs).toMatchObject({ total: 2, done: 1, skippedAccepted: 1 });
    const gate = checkClosureGate(incDir, '0001-demo');
    expect(gate.ok).toBe(true);
    expect(gate.info).toContain('skipped (accepted), not verified: AC-02 — see reports/verify.md');
    expect(gate.notices.join('\n')).not.toMatch(/acceptance criteria not met/);
  });

  it('still blocks when an AC has neither a met state nor an accepted skip', async () => {
    const incDir = mk([{ t: 'T-01', e: 'done', by: 'a', at: '2026-10-27T10:00:00Z', evidence: 'tests pass' }], CLOSABLE);
    const { report } = await runVerify(root, '0001-demo', incDir, { commands: ['true'] });
    expect(report.ok).toBe(false);
    expect(checkClosureGate(incDir, '0001-demo').errors[0]).toMatch(/1 of 2 acceptance criteria not met/);
  });
});
