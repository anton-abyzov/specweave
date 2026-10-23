import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runVerify } from '../../../../src/core/tasks/verify-runner.js';

let root: string;

function mk(spec: string, ledger: string[] = []) {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-ac-items-'));
  const incDir = path.join(root, '.specweave', 'increments', '0001-demo');
  fs.mkdirSync(incDir, { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ testing: { commands: [] } }));
  fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({ id: '0001-demo', status: 'active' }));
  fs.writeFileSync(path.join(incDir, 'spec.md'), spec);
  fs.writeFileSync(path.join(incDir, 'ledger.jsonl'), ledger.map((l) => l + '\n').join(''));
  return incDir;
}

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const SPEC = `# Demo

## Acceptance Criteria

- [ ] AC-01: covered by two tasks
- [x] AC-02: ticked by hand
- [ ] AC-03: no task cites it
- [ ] AC-04: only a skipped task

## Tasks

### T-01 First
- AC: AC-01, AC-04
### T-02 Second
- AC: AC-01
### T-03 Skipped
- AC: AC-04
`;

describe('verify.json per-AC items (0962 AC-01)', () => {
  it('lists every AC with how it was decided and the tasks that cite it', async () => {
    const incDir = mk(SPEC, [
      '{"t":"T-01","e":"done","by":"a","at":"2026-10-20T10:00:00Z","evidence":"tests pass"}',
      '{"t":"T-02","e":"done","by":"a","at":"2026-10-20T10:01:00Z","evidence":"tests pass"}',
      '{"t":"T-03","e":"skip","by":"a","at":"2026-10-20T10:02:00Z","reason":"not needed"}',
    ]);
    const { report } = await runVerify(root, '0001-demo', incDir, { commands: [], reason: 'fixture' });
    const json = JSON.parse(fs.readFileSync(path.join(incDir, 'reports', 'verify.json'), 'utf-8'));
    expect(json.acs.total).toBe(4);
    expect(json.acs.done).toBe(report.acs.done);
    const byId = Object.fromEntries(json.acs.items.map((i: { id: string }) => [i.id, i]));
    expect(byId['AC-01']).toEqual({
      id: 'AC-01',
      done: true,
      via: 'ledger',
      tasks: [
        { id: 'T-01', status: 'done' },
        { id: 'T-02', status: 'done' },
      ],
    });
    expect(byId['AC-02']).toMatchObject({ done: true, via: 'checkbox', tasks: [] });
    expect(byId['AC-03']).toEqual({ id: 'AC-03', done: false, via: 'none', tasks: [] });
    expect(byId['AC-04'].tasks.map((t: { id: string }) => t.id)).toEqual(['T-01', 'T-03']);
  });

  it('keeps the close-gate count unchanged when nothing is done', async () => {
    const incDir = mk(SPEC);
    const { report } = await runVerify(root, '0001-demo', incDir, { commands: [], reason: 'fixture' });
    expect(report.acs).toMatchObject({ total: 4, done: 1 });
    expect(report.ok).toBe(false);
    expect(report.acs.items?.find((i) => i.id === 'AC-01')?.tasks).toEqual([
      { id: 'T-01', status: 'open' },
      { id: 'T-02', status: 'open' },
    ]);
  });
});
