import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runVerify, detectVerifyCommands, parseSpecAcs, readVerifyReport } from './verify-runner.js';
import { checkClosureGate } from './closure-gate.js';
import { appendEvent, ledgerPath } from './ledger.js';

const tmp: string[] = [];
function mkProject(opts: { config?: object; pkgScripts?: Record<string, string> } = {}): { root: string; incDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-'));
  tmp.push(root);
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify(opts.config ?? {}));
  if (opts.pkgScripts) fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'x', scripts: opts.pkgScripts }));
  const incDir = path.join(root, '.specweave', 'increments', '0001-demo');
  fs.mkdirSync(incDir, { recursive: true });
  fs.writeFileSync(path.join(incDir, 'spec.md'), '# Demo\n- [x] AC-01 first\n- [ ] AC-02 second\n- [x] **AC-US1-01**: legacy\n');
  fs.writeFileSync(path.join(incDir, 'tasks.md'), '# Tasks\n### T-01 A\n- AC: AC-01 | Files: a.ts | Test: -\n### T-02 B\n- AC: AC-02 | Files: b.ts | Test: -\n');
  return { root, incDir };
}
afterEach(() => { while (tmp.length) fs.rmSync(tmp.pop()!, { recursive: true, force: true }); });

describe('parseSpecAcs / detectVerifyCommands', () => {
  it('parses both AC formats', () => {
    expect(parseSpecAcs('- [x] AC-01 a\n- [ ] **AC-US1-02**: b\n- [ ] Given x')).toEqual([
      { id: 'AC-01', done: true, text: 'a' },
      { id: 'AC-US1-02', done: false, text: 'b' },
    ]);
  });

  it('prefers testing.commands, else package.json scripts in test→lint→build order', () => {
    const a = mkProject({ config: { testing: { commands: ['echo hi'] } }, pkgScripts: { test: 'x' } });
    expect(detectVerifyCommands(a.root)).toEqual({ commands: ['echo hi'], source: 'config testing.commands' });
    const b = mkProject({ pkgScripts: { build: 'b', test: 't', lint: 'l' } });
    expect(detectVerifyCommands(b.root).commands).toEqual(['npm run test', 'npm run lint', 'npm run build']);
    const c = mkProject();
    expect(detectVerifyCommands(c.root).commands).toEqual([]);
  });
});

describe('runVerify', () => {
  it('runs commands, writes verify.md + verify.json, ok only when all exit 0', async () => {
    const { root, incDir } = mkProject();
    appendEvent(ledgerPath(incDir), { t: 'T-01', e: 'done', by: 'a', at: new Date().toISOString(), evidence: 'sha' });
    const good = await runVerify(root, '0001-demo', incDir, { commands: ['node -e "console.log(1)"'] });
    expect(good.report.ok).toBe(true);
    expect(good.report.acs).toEqual({ total: 3, done: 2 });
    expect(good.report.tasks).toEqual({ total: 2, done: 1, skipped: 0, open: 1 });
    expect(readVerifyReport(incDir)?.ok).toBe(true);
    const md = fs.readFileSync(good.mdPath, 'utf-8');
    expect(md).toContain('PASS');
    expect(md).toContain('| AC-02 |   |');
    expect(md).toContain('| T-01 | done | a |');

    const bad = await runVerify(root, '0001-demo', incDir, { commands: ['node -e "process.exit(3)"'] });
    expect(bad.report.ok).toBe(false);
    expect(bad.report.commands).toEqual([{ cmd: 'node -e "process.exit(3)"', exit: 3 }]);
  });
});

describe('checkClosureGate', () => {
  it('blocks without verify.json, passes with --reason, passes with ok verify', async () => {
    const { root, incDir } = mkProject();
    const missing = checkClosureGate(incDir, '0001-demo');
    expect(missing.ok).toBe(false);
    expect(missing.errors[0]).toMatch(/verify\.json missing/);

    const reasoned = checkClosureGate(incDir, '0001-demo', { reason: 'docs-only' });
    expect(reasoned.ok).toBe(true);
    expect(reasoned.notices.join('\n')).toMatch(/reason: docs-only/);

    await runVerify(root, '0001-demo', incDir, { commands: ['node -e "process.exit(1)"'] });
    expect(checkClosureGate(incDir, '0001-demo').ok).toBe(false);

    await runVerify(root, '0001-demo', incDir, { commands: [] });
    const ok = checkClosureGate(incDir, '0001-demo');
    expect(ok.ok).toBe(true);
    expect(ok.notices.join('\n')).toMatch(/no reports\/review\.md/);
    expect(ok.notices.join('\n')).toMatch(/2 task\(s\) not done/);
  });
});
