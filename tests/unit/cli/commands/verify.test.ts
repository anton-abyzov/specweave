import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyCommand } from '../../../../src/cli/commands/verify.js';

let root: string;
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('specweave verify', () => {
  it('prints the report path relative to the project root', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-verify-cmd-'));
    const inc = path.join(root, '.specweave', 'increments', '0001-demo');
    fs.mkdirSync(inc, { recursive: true });
    fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ project: { name: 'demo' } }));
    fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ id: '0001-demo', status: 'active' }));
    fs.writeFileSync(path.join(inc, 'spec.md'), '# Demo\n\n## Acceptance Criteria\n- [x] AC-01: Works\n\n## Tasks\n### T-01 Do it\n- AC: AC-01 | Files: a.txt | Test: true\n');
    const out: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((s) => { out.push(String(s)); return true; });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await verifyCommand('0001', { cwd: root, cmd: ['true'] });
    const line = out.join('').split('\n').find((l) => /^(PASS|FAIL) → /.test(l));
    expect(line).toMatch(/^(PASS|FAIL) → \.specweave\/increments\/0001-demo\/reports\/verify\.md$/);
  });
});
