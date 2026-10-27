import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildHandoffIndex, renderHandoffIndex } from '../../../../src/core/session/handoff-all.js';
import { buildHandoffReport } from '../../../../src/core/session/handoff-report.js';
import { renderHandoffDoc, type HandoffDocInput } from '../../../../src/core/session/handoff-doc-format.js';
import { buildPickup } from '../../../../src/core/session/pickup.js';
import { acCommand } from '../../../../src/cli/commands/ac.js';

// 1098 AC-03 and AC-04: accepted skips show up, labelled, on every surface
// that lists an increment's ACs, including increments without tasks.

const SKIP = JSON.stringify({
  t: 'AC-02', e: 'accept-skip', by: 'claude@m4', at: '2026-10-27T11:00:00Z', check: 'needs-license',
  reason: 'No license', acceptedBy: 'anton', acceptedAt: '2026-10-27', authorization: 'ok to skip',
});

let root: string;
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

function mk(spec: string, ledger: string[]): string {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-accept-labels-'));
  const dir = path.join(root, '.specweave', 'increments', '0001-demo');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ project: { name: 'demo' } }));
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ id: '0001-demo', status: 'active' }));
  fs.writeFileSync(path.join(dir, 'spec.md'), spec);
  fs.writeFileSync(path.join(dir, 'ledger.jsonl'), ledger.map((l) => l + '\n').join(''));
  return dir;
}

const WITH_TASKS = '# Demo\n\n## Acceptance Criteria\n- [ ] AC-01: works\n- [ ] AC-02: needs a license\n\n## Tasks\n### T-01 Do it\n- AC: AC-01 | Files: a.txt | Test: true\n';
const NO_TASKS = '# Demo\n\n## Acceptance Criteria\n- [ ] AC-01: works\n- [ ] AC-02: needs a license\n';

describe('pickup without tasks (1098 AC-03)', () => {
  it('reports the same acceptance and waivers as ac list', async () => {
    mk(NO_TASKS, [SKIP]);
    const pickup = buildPickup(root, { incrementId: '0001-demo', agent: 'tester', checkpointHome: root });
    const out: string[] = [];
    const write = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((s: string) => { out.push(String(s)); return true; }) as typeof process.stdout.write;
    try {
      expect(await acCommand('list', '0001', undefined, { cwd: root, json: true })).toBe(0);
    } finally {
      process.stdout.write = write;
    }
    const list = JSON.parse(out.join('')).criteria;
    expect(pickup.criteria).toEqual(list);
    expect(list.find((c: { id: string }) => c.id === 'AC-02')).toMatchObject({ acceptance: 'skipped-accepted', uncovered: true });
    expect(pickup.text).toContain('Open ACs: AC-01');
    expect(pickup.text).not.toMatch(/Open ACs: .*AC-02/);
  });
});

describe('handoff surfaces label accepted skips (1098 AC-04)', () => {
  it('handoff --all lists them apart from open ACs', async () => {
    mk(WITH_TASKS, ['{"t":"T-01","e":"done","by":"a","at":"2026-10-27T10:00:00Z","evidence":"tests pass"}', SKIP]);
    const index = await buildHandoffIndex(root, { scanRepos: false, prLookup: false, agent: 'tester' });
    const row = index.rows.find((r) => r.id === '0001-demo')!;
    expect(row.openAcs).toEqual([]);
    expect(row.acceptedSkipAcs).toEqual(['AC-02']);
    expect(renderHandoffIndex(index)).toContain('none; Accepted skip (not verified): AC-02');
  });

  it('the HTML report marks the AC instead of showing it as plain unmet', () => {
    const dir = mk(WITH_TASKS, [SKIP]);
    const { html } = buildHandoffReport(dir, '0001-demo');
    expect(html).toContain('<li class="accepted"><b>AC-02</b> needs a license <small>(Accepted skip (not verified): needs-license)</small></li>');
    expect(html).toContain('<li class=""><b>AC-01</b>');
  });

  it('the handoff doc names them next to the AC count', () => {
    const input = {
      docPath: 'h.md', diffPath: 'h.diff', repoRoot: '/r', generatedAt: '2026-10-27T12:00:00Z', isSpecWeave: true, agent: 'tester', decisions: [],
      increment: {
        id: '0001-demo', status: 'active', tasks: [], counts: { total: 1, done: 1, skipped: 0, claimed: 0, blocked: 0, stale: 0, open: 0 },
        doneAcs: 1, totalAcs: 2, acceptedSkipAcs: ['AC-02'],
      },
      git: { isGitRepo: false, branch: '', shortSha: '', statusPorcelain: '', diffStat: '', hasUncommittedChanges: false },
      redactionCounts: {},
    } satisfies HandoffDocInput;
    expect(renderHandoffDoc(input)).toContain('ACs 1/2 · Accepted skip (not verified): AC-02');
  });
});
