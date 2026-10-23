import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runVerify, parseSpecAcs, NO_COMMANDS_MESSAGE } from '../../../../src/core/tasks/verify-runner.js';
import { checkClosureGate } from '../../../../src/core/tasks/closure-gate.js';
import { verifyCommand } from '../../../../src/cli/commands/verify.js';

let root: string;
let incDir: string;
let stderr: string[];

function mk(spec = '# Demo\n\n## Acceptance Criteria\n\n- [x] AC-01: It works\n') {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-verify-'));
  incDir = path.join(root, '.specweave', 'increments', '0001-demo');
  fs.mkdirSync(incDir, { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ testing: { commands: [] } }));
  fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({ id: '0001-demo', status: 'active' }));
  fs.writeFileSync(path.join(incDir, 'spec.md'), spec);
}

beforeEach(() => {
  stderr = [];
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation((s: any) => { stderr.push(String(s)); return true; });
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('verify with no test commands (0933)', () => {
  it('runVerify is not ok with an empty command list', async () => {
    mk();
    const r = await runVerify(root, '0001-demo', incDir, { commands: [] });
    expect(r.report.ok).toBe(false);
    expect(r.report.reason).toBeUndefined();
    expect(fs.readFileSync(r.mdPath, 'utf-8')).toContain(NO_COMMANDS_MESSAGE);
  });

  it('--reason passes and is recorded in verify.json', async () => {
    mk();
    const r = await runVerify(root, '0001-demo', incDir, { commands: [], reason: 'docs-only change' });
    expect(r.report.ok).toBe(true);
    const json = JSON.parse(fs.readFileSync(r.jsonPath, 'utf-8'));
    expect(json.reason).toBe('docs-only change');
  });

  it('the CLI exits 1 with "no test commands configured", 0 with --reason', async () => {
    mk();
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'x' }));
    expect(await verifyCommand('0001', { cwd: root })).toBe(1);
    expect(stderr.join('')).toContain('no test commands configured');
    expect(await verifyCommand('0001', { cwd: root, reason: 'nothing to run' })).toBe(0);
  });

  it('commands still decide when there are some', async () => {
    mk();
    const r = await runVerify(root, '0001-demo', incDir, { commands: ['node -e "process.exit(0)"'] });
    expect(r.report.ok).toBe(true);
  });
});

describe('complete refuses a spec without acceptance criteria (0933)', () => {
  it('blocks without --reason, passes with it', async () => {
    mk('# Demo\n\nNo criteria.\n');
    await runVerify(root, '0001-demo', incDir, { commands: [], reason: 'nothing to run' });
    const blocked = checkClosureGate(incDir, '0001-demo');
    expect(blocked.ok).toBe(false);
    expect(blocked.errors.join('\n')).toMatch(/no acceptance criteria/);
    const reasoned = checkClosureGate(incDir, '0001-demo', { reason: 'spike' });
    expect(reasoned.ok).toBe(true);
    expect(reasoned.notices.join('\n')).toMatch(/no acceptance criteria — closing anyway, reason: spike/);
  });

  it('accepts ACs written as plain bullets without checkboxes', async () => {
    mk('# Demo\n\n- AC-US1-01 \u2014 rows show the resolved dir.\n- **AC-US1-02**: copy stays.\n');
    await runVerify(root, '0001-demo', incDir, { commands: ['node -e "process.exit(0)"'] });
    const gate = checkClosureGate(incDir, '0001-demo');
    expect(gate.errors.join('\n')).not.toMatch(/no acceptance criteria/);
    expect(gate.notices.join('\n')).not.toMatch(/no acceptance criteria/);
  });

  it('does not silently pass uncovered legacy bullet criteria as zero ACs', async () => {
    mk('# Demo\n\n- AC-US1-01 — rows show the resolved dir.\n- **AC-US1-02**: copy stays.\n');
    const { report } = await runVerify(root, '0001-demo', incDir, { commands: ['node -e "process.exit(0)"'] });
    expect(report.ok).toBe(false);
    expect(report.acs.total).toBe(2);
    expect(report.acs.done).toBe(0);
    expect(checkClosureGate(incDir, '0001-demo').ok).toBe(false);
  });

  it('keeps CRLF checkbox and plain criteria in the verification gate', async () => {
    mk('# Demo\r\n\r\n- [ ] AC-01: checkbox\r\n- **AC-02**: plain bullet\r\n');
    const { report } = await runVerify(root, '0001-demo', incDir, { commands: ['node -e "process.exit(0)"'] });
    expect(report.ok).toBe(false);
    expect(report.acs).toMatchObject({ total: 2, done: 0 });
    const gate = checkClosureGate(incDir, '0001-demo');
    expect(gate.ok).toBe(false);
    expect(gate.errors.join('\n')).not.toMatch(/no acceptance criteria/);
  });

  it('derives legacy bullet acceptance from all covering ledger tasks', async () => {
    mk('# Demo\n\n- AC-US1-01 — rows show the resolved dir.\n\n### T-01 Show paths\n- AC: AC-US1-01 | Files: src/a.ts | Test: node -e "process.exit(0)"\n');
    fs.writeFileSync(path.join(incDir, 'ledger.jsonl'), JSON.stringify({ t: 'T-01', e: 'done', by: 'fixture', at: new Date().toISOString(), evidence: 'verified paths' }) + '\n');
    const { report } = await runVerify(root, '0001-demo', incDir, { commands: ['node -e "process.exit(0)"'] });
    expect(report.ok).toBe(true);
    expect(report.acs.total).toBe(1);
    expect(report.acs.done).toBe(1);
  });

  it('parses legacy bullets without treating task mappings as criteria', () => {
    mk();
    expect(parseSpecAcs('  * **AC-US1-01**: first\n- AC-US1-02 — second\n- [X] AC-03: third\n- AC: AC-US1-01 | Files: src/a.ts\n')).toEqual([
      { id: 'AC-US1-01', done: false, text: 'first' },
      { id: 'AC-US1-02', done: false, text: 'second' },
      { id: 'AC-03', done: true, text: 'third' },
    ]);
  });
});
