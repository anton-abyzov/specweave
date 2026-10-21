import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { IncrementCompletionValidator } from '../../../../src/core/increment/completion-validator.js';

// A legacy increment (tasks.md present) whose spec.md AC boxes are never
// ticked: state lives only in ledger.jsonl, so the closure gate must read the
// same ledger-derived AC status `specweave verify` reports.

const SPEC = `# Spec

- [ ] **AC-US1-01**: First
- [ ] **AC-US1-02**: Second
- [ ] **AC-US2-01**: Third
`;

const TASKS = `# Tasks

### T-001: One
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [ ] pending

### T-002: Two
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [ ] pending
`;

const done = (t: string) =>
  JSON.stringify({ t, e: 'done', by: 'tester', at: '2026-10-21T00:00:00.000Z', evidence: 'npm test → exit 0' });

describe('IncrementCompletionValidator.countOpenACs (ledger-derived)', () => {
  let root: string;
  let dir: string;
  const id = '0001-ledger-acs';

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-ledger-acs-'));
    dir = path.join(root, '.specweave', 'increments', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
    fs.writeFileSync(path.join(dir, 'spec.md'), SPEC);
    fs.writeFileSync(path.join(dir, 'tasks.md'), TASKS);
    vi.spyOn(process, 'cwd').mockReturnValue(root);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('reports 0 open ACs when the ledger proves every AC, despite unticked boxes', async () => {
    fs.writeFileSync(path.join(dir, 'ledger.jsonl'), [done('T-001'), done('T-002')].join('\n') + '\n');
    expect(await IncrementCompletionValidator.countOpenACs(id)).toBe(0);
  });

  it('still counts the AC whose covering task the ledger leaves open', async () => {
    fs.writeFileSync(path.join(dir, 'ledger.jsonl'), done('T-001') + '\n');
    expect(await IncrementCompletionValidator.countOpenACs(id)).toBe(1);
  });

  it('also counts unfinished legacy criteria written without checkboxes', async () => {
    fs.writeFileSync(path.join(dir, 'spec.md'), SPEC.replaceAll('- [ ] **', '- **'));
    fs.writeFileSync(path.join(dir, 'ledger.jsonl'), done('T-001') + '\n');
    expect(await IncrementCompletionValidator.countOpenACs(id)).toBe(1);
  });

  it('falls back to spec.md checkboxes when no task references an AC', async () => {
    fs.writeFileSync(path.join(dir, 'tasks.md'), '# Tasks\n\n### T-001: One\n**Status**: [ ] pending\n');
    fs.writeFileSync(path.join(dir, 'ledger.jsonl'), done('T-001') + '\n');
    expect(await IncrementCompletionValidator.countOpenACs(id)).toBe(3);
  });
});
