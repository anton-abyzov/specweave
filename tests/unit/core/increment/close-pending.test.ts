/**
 * Finishing the last task through the CLI says how to close the increment and
 * leaves the close-pending marker the Stop hook reminds the session with.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { taskCommand } from '../../../../src/cli/commands/task.js';
import { readClosePending, closePendingFile } from '../../../../src/core/increment/close-pending.js';

const SPEC = `# Close it

## Acceptance Criteria

- [ ] AC-01: One
- [ ] AC-02: Two

## Tasks

### T-01 First
- AC: AC-01 | Files: a.ts | Test: -

### T-02 Second
- AC: AC-02 | Files: b.ts | Test: -
`;

const tmp: string[] = [];
beforeEach(() => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'close-pending-home-'));
  tmp.push(home);
  vi.stubEnv('HOME', home);
  vi.stubEnv('USERPROFILE', home);
  vi.stubEnv('CLAUDE_CODE_SESSION_ID', 'thread-a');
  vi.stubEnv('CLAUDE_SESSION_ID', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  while (tmp.length) fs.rmSync(tmp.pop()!, { recursive: true, force: true });
});

function mkProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'close-pending-'));
  tmp.push(root);
  const inc = path.join(root, '.specweave', 'increments', '0001-close');
  fs.mkdirSync(inc, { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ version: '2.0', project: { name: 'demo' } }));
  fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ id: '0001-close', status: 'active', type: 'feature', created: new Date().toISOString() }));
  fs.writeFileSync(path.join(inc, 'spec.md'), SPEC);
  return root;
}

function captureStdout(): () => string {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((c: any) => { chunks.push(String(c)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  return () => chunks.join('');
}

const opts = (root: string) => ({ cwd: root, agent: 'a@h' });

describe('closing after the last task', () => {
  it('task done on the last task prints the full close chain and marks the increment', async () => {
    const root = mkProject();
    const read = captureStdout();
    expect(await taskCommand('done', 'T-01', undefined, { ...opts(root), evidence: 'checked a' })).toBe(0);
    expect(read()).not.toContain('All tasks done');
    expect(fs.existsSync(closePendingFile('thread-a')!)).toBe(false);

    expect(await taskCommand('done', 'T-02', undefined, { ...opts(root), evidence: 'checked b' })).toBe(0);
    const text = read();
    expect(text).toContain('All tasks done. Next, in this session and without asking: specweave verify 0001-close');
    expect(text).toContain('then specweave complete 0001-close');
    expect(Object.values(readClosePending('thread-a'))).toEqual([{ root, id: '0001-close', at: expect.any(String) }]);
  });

  it('writes no marker outside a Claude Code session, but still prints the close chain', async () => {
    vi.stubEnv('CLAUDE_CODE_SESSION_ID', '');
    const root = mkProject();
    const read = captureStdout();
    await taskCommand('done', 'T-01', undefined, { ...opts(root), evidence: 'a' });
    await taskCommand('done', 'T-02', undefined, { ...opts(root), evidence: 'b' });
    expect(read()).toContain('then specweave complete 0001-close');
    expect(fs.existsSync(closePendingFile('thread-a')!)).toBe(false);
  });

  it('task done --json carries the close chain on the last task', async () => {
    const root = mkProject();
    const read = captureStdout();
    await taskCommand('done', 'T-01', undefined, { ...opts(root), evidence: 'a', json: true });
    expect(JSON.parse(read().trim().split('\n').pop()!).close).toBeUndefined();
    await taskCommand('done', 'T-02', undefined, { ...opts(root), evidence: 'b', json: true });
    expect(JSON.parse(read().trim().split('\n').pop()!).close).toContain('specweave complete 0001-close');
  });

  it('re-skipping an already skipped task does not re-arm the reminder', async () => {
    const root = mkProject();
    captureStdout();
    await taskCommand('done', 'T-01', undefined, { ...opts(root), evidence: 'a' });
    await taskCommand('skip', 'T-02', undefined, { ...opts(root), reason: 'not needed' });
    fs.rmSync(closePendingFile('thread-a')!);
    await taskCommand('skip', 'T-02', undefined, { ...opts(root), reason: 'again' });
    expect(fs.existsSync(closePendingFile('thread-a')!)).toBe(false);
  });

  it('task skip on the last open task closes the same way', async () => {
    const root = mkProject();
    const read = captureStdout();
    expect(await taskCommand('done', 'T-01', undefined, { ...opts(root), evidence: 'checked a' })).toBe(0);
    expect(await taskCommand('skip', 'T-02', undefined, { ...opts(root), reason: 'not needed' })).toBe(0);
    expect(read()).toContain('specweave complete 0001-close');
    expect(Object.values(readClosePending('thread-a')).map((e) => e.id)).toEqual(['0001-close']);
  });

  it('task next with nothing left prints the close chain', async () => {
    const root = mkProject();
    const read = captureStdout();
    await taskCommand('done', 'T-01', undefined, { ...opts(root), evidence: 'a' });
    await taskCommand('done', 'T-02', undefined, { ...opts(root), evidence: 'b' });
    read();
    expect(await taskCommand('next', undefined, undefined, opts(root))).toBe(0);
    expect(read()).toContain('All tasks in 0001-close are done. Next, in this session and without asking: specweave verify 0001-close');
  });
});
