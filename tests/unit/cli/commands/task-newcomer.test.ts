/**
 * The newcomer path through `specweave task`: `done` hands over the next task,
 * the printed `--run` survives a Test with quotes and a pipe, and `next` /
 * `claim` refuse create-increment's unfilled placeholder tasks.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { taskCommand, shellQuote, isTemplateTask, isPlaceholderTest, EXIT_TEMPLATE_TASK } from '../../../../src/cli/commands/task.js';
import { createIncrementTemplates } from '../../../../src/core/increment/template-creator.js';

const QUOTED_TEST = `grep -c "it's ok" out.txt | grep -q 1`;

const SPEC = `# Login form

## Problem

Users cannot log in.

## Acceptance Criteria

- [ ] AC-01: Form shows email and password fields
- [ ] AC-02: Wrong password shows an error

## Approach

Add src/login.ts.

## Tasks

### T-01 Build the form
- AC: AC-01 | Files: src/login.ts | Test: true

### T-02 Error message
- AC: AC-02 | Files: src/error.ts | Test: ${QUOTED_TEST}
`;

const tmp: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  while (tmp.length) fs.rmSync(tmp.pop()!, { recursive: true, force: true });
});

function mkProject(spec = SPEC): { root: string; inc: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'task-newcomer-'));
  tmp.push(root);
  const inc = path.join(root, '.specweave', 'increments', '0001-login');
  fs.mkdirSync(inc, { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ version: '2.0', project: { name: 'demo' } }));
  fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ id: '0001-login', status: 'active', type: 'feature', created: new Date().toISOString() }));
  fs.writeFileSync(path.join(inc, 'spec.md'), spec);
  return { root, inc };
}

function capture(): { out: () => string; err: () => string } {
  const o: string[] = [];
  const e: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((c: any) => { o.push(String(c)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation((c: any) => { e.push(String(c)); return true; });
  return { out: () => o.join(''), err: () => e.join('') };
}

describe('task done prints the next task', () => {
  it('after a non-final task, prints the next task brief with its ACs and --run line', async () => {
    const { root } = mkProject();
    const io = capture();
    const code = await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', run: 'true', commit: false });
    expect(code).toBe(0);
    const out = io.out();
    expect(out).toContain('Done T-01 (1/2)');
    expect(out).toContain('Next: T-02 Error message');
    expect(out).toContain('AC-02: Wrong password shows an error');
    expect(out).toContain(`when done: specweave task done T-02 0001-login --run ${shellQuote(QUOTED_TEST)}`);
  });

  it('after the last task, prints the close chain and no next task', async () => {
    const { root } = mkProject();
    capture();
    await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', run: 'true', commit: false });
    vi.restoreAllMocks();
    const io = capture();
    await taskCommand('done', 'T-02', undefined, { cwd: root, agent: 'a@h', evidence: 'abc123', commit: false });
    expect(io.out()).toContain('All tasks done.');
    expect(io.out()).not.toContain('Next: ');
  });

  it('--json carries the next task brief', async () => {
    const { root } = mkProject();
    const io = capture();
    await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', run: 'true', commit: false, json: true });
    const json = JSON.parse(io.out().trim().split('\n').pop()!);
    expect(json.next).toMatchObject({ id: 'T-02', test: QUOTED_TEST });
  });
});

describe('shellQuote', () => {
  it('keeps plain Tests in double quotes', () => {
    expect(shellQuote('npm test -- e2e/login')).toBe('"npm test -- e2e/login"');
  });

  it('a Test with quotes and a pipe round-trips through the shell as one argument', () => {
    if (process.platform === 'win32') return;
    const quoted = shellQuote(QUOTED_TEST);
    const r = spawnSync('/bin/sh', ['-c', `printf '%s' ${quoted}`], { encoding: 'utf8' });
    expect(r.stdout).toBe(QUOTED_TEST);
  });
});

describe('placeholder tasks are refused', () => {
  function scaffold(): { root: string } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'task-template-'));
    tmp.push(root);
    fs.mkdirSync(path.join(root, '.specweave', 'increments'), { recursive: true });
    fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ version: '2.0', project: { name: 'demo' } }));
    return { root };
  }

  it('next and claim refuse the unfilled create-increment scaffold', async () => {
    const { root } = scaffold();
    const created = await createIncrementTemplates({ projectRoot: root, incrementId: '0001-login', title: 'Login', description: '', projectId: 'demo' });
    expect(created.success).toBe(true);
    let io = capture();
    expect(await taskCommand('next', undefined, undefined, { cwd: root, agent: 'a@h' })).toBe(EXIT_TEMPLATE_TASK);
    expect(io.err()).toContain('T-01 in 0001-login is still the create-increment placeholder');
    vi.restoreAllMocks();
    io = capture();
    expect(await taskCommand('claim', 'T-01', undefined, { cwd: root, agent: 'a@h', commit: false })).toBe(EXIT_TEMPLATE_TASK);
    expect(io.err()).toContain('Fill in spec.md ## Tasks first');
  });

  it('done refuses a placeholder too, and never hands one out as Next', async () => {
    const { root } = scaffold();
    await createIncrementTemplates({ projectRoot: root, incrementId: '0001-login', title: 'Login', description: '', projectId: 'demo' });
    let io = capture();
    expect(await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', evidence: 'abc', commit: false })).toBe(EXIT_TEMPLATE_TASK);
    expect(io.err()).toContain('still the create-increment placeholder');
    vi.restoreAllMocks();

    // Fill T-01 only: done T-01 must not name the unfilled T-02 as Next.
    const spec = path.join(root, '.specweave', 'increments', '0001-login', 'spec.md');
    fs.writeFileSync(spec, fs.readFileSync(spec, 'utf8').replace('### T-01 [First task]', '### T-01 Build the form'));
    io = capture();
    expect(await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', run: 'true', commit: false })).toBe(0);
    expect(io.out()).not.toContain('Next: T-02');
  });

  it('next skips a placeholder when a real task follows it', async () => {
    const { root } = mkProject(SPEC.replace('### T-01 Build the form', '### T-01 [First task]'));
    const io = capture();
    expect(await taskCommand('next', undefined, undefined, { cwd: root, agent: 'a@h' })).toBe(0);
    expect(io.out()).toContain('T-02 Error message');
  });

  it('an imported task with a real title is claimable; its [command] Test is not run', async () => {
    const { root } = mkProject(SPEC.replace('src/login.ts | Test: true', 'src/login.ts | Test: [command]'));
    let io = capture();
    expect(await taskCommand('claim', 'T-01', undefined, { cwd: root, agent: 'a@h', commit: false })).toBe(0);
    expect(io.out()).toContain('--run "<command that checks the AC>"');
    vi.restoreAllMocks();
    io = capture();
    expect(await taskCommand('done', 'T-01', undefined, { cwd: root, agent: 'a@h', commit: false })).toBe(2);
    expect(io.err()).toContain('done needs evidence');
  });

  it('only the scaffold titles are placeholders; bracketed Tests are placeholders but `[ -f … ]` is real', () => {
    expect(isTemplateTask({ title: '[First task]' })).toBe(true);
    expect(isTemplateTask({ title: '[Second task]' })).toBe(true);
    expect(isTemplateTask({ title: '[WIP] Login form' })).toBe(false);
    expect(isTemplateTask({ title: 'Form shows email' })).toBe(false);
    expect(isPlaceholderTest('[command that checks AC-01 as a user would]')).toBe(true);
    expect(isPlaceholderTest('[command]')).toBe(true);
    expect(isPlaceholderTest('[ -f dist/cli.js ]')).toBe(false);
    expect(isPlaceholderTest('npm test')).toBe(false);
  });
});
