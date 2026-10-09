import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import fsDefault from 'fs';
import { syncBuiltinESMExports } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import ts from 'typescript';
import {
  CHECKPOINT_INTERVAL_MS, CHECKPOINT_LOCK_STALE_MS, CHECKPOINT_MAX_WORKERS,
  checkpointDirectory, cleanupCheckpointRequest, prepareSessionCheckpoint, readSessionCheckpoint, runSessionCheckpoint, studioCheckpointFile,
} from '../../../../src/core/session/session-checkpoint.js';

let root: string;
let home: string;
let repo: string;
const input = () => ({ session_id: 'session-a', cwd: repo, last_assistant_message: 'Next: verify the local change.' });
function git(...args: string[]) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function initRepo(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  for (const args of [['init', '-q'], ['config', 'user.email', 'checkpoint@example.test'], ['config', 'user.name', 'Checkpoint'], ['config', 'core.hooksPath', path.join(dir, '.git', 'test-hooks')]]) {
    execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  }
  fs.writeFileSync(path.join(dir, 'app.txt'), 'before\n');
  execFileSync('git', ['add', 'app.txt'], { cwd: dir });
  execFileSync('git', ['commit', '-qm', 'base'], { cwd: dir });
}
function active(project: string, id: string) {
  const inc = path.join(project, '.specweave', 'increments', id);
  fs.mkdirSync(inc, { recursive: true });
  fs.writeFileSync(path.join(project, '.specweave', 'config.json'), '{}');
  fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ id, status: 'active' }));
  fs.writeFileSync(path.join(inc, 'spec.md'), '# Session checkpoint\n\n## Acceptance Criteria\n- [ ] AC-01 save\n\n## Tasks\n### T-01 Save\n- AC: AC-01 | Files: app.txt | Test: true\n');
  fs.writeFileSync(path.join(inc, 'ledger.jsonl'), JSON.stringify({ t: 'T-01', e: 'claim', by: 'codex@owner', at: new Date().toISOString() }) + '\n');
  return inc;
}
async function capture(overrides: Partial<ReturnType<typeof input>> = {}, now?: number) {
  const request = prepareSessionCheckpoint({ ...input(), ...overrides }, { home, now });
  expect(request).toBeDefined();
  await runSessionCheckpoint(request!);
  cleanupCheckpointRequest(request!);
  return readSessionCheckpoint({ ...input(), ...overrides }, { home });
}
function expireReceipt() {
  const file = path.join(checkpointDirectory(input(), { home })!, 'current.json');
  const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
  receipt.savedAt = new Date(Date.now() - CHECKPOINT_INTERVAL_MS - 1000).toISOString();
  fs.writeFileSync(file, JSON.stringify(receipt));
  return { file, bytes: fs.readFileSync(file, 'utf8') };
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-checkpoint-'));
  home = path.join(root, 'home');
  repo = path.join(root, 'repo');
  fs.mkdirSync(home);
  initRepo(repo);
});
afterEach(() => { vi.restoreAllMocks(); syncBuiltinESMExports(); vi.unstubAllEnvs(); fs.rmSync(root, { recursive: true, force: true }); });

describe('local session checkpoints', () => {
  it('captures tracked and untracked work and summary without changing ownership, index, refs, or pointer', async () => {
    const inc = active(repo, '0001-one');
    const ledger = fs.readFileSync(path.join(inc, 'ledger.jsonl'), 'utf8');
    const state = path.join(repo, '.specweave', 'state');
    fs.mkdirSync(state);
    fs.writeFileSync(path.join(state, 'handoff-latest.txt'), 'existing-manual-handoff.md\n');
    fs.writeFileSync(path.join(repo, 'app.txt'), 'after\n');
    fs.writeFileSync(path.join(repo, 'new.txt'), 'new work\n');
    const index = fs.readFileSync(path.join(repo, '.git', 'index'));
    const refs = git('show-ref');
    const receipt = await capture();
    expect(receipt?.incrementId).toBe('0001-one');
    expect(fs.readFileSync(receipt!.docPath, 'utf8')).toContain('Next: verify the local change.');
    expect(fs.readFileSync(receipt!.diffPath, 'utf8')).toContain('+after');
    expect(fs.readFileSync(receipt!.diffPath, 'utf8')).toContain('+new work');
    expect(fs.readFileSync(path.join(inc, 'ledger.jsonl'), 'utf8')).toBe(ledger);
    expect(fs.readFileSync(path.join(repo, '.git', 'index'))).toEqual(index);
    expect(git('show-ref')).toBe(refs);
    expect(fs.readFileSync(path.join(state, 'handoff-latest.txt'), 'utf8')).toBe('existing-manual-handoff.md\n');
    expect(fs.existsSync(path.join(inc, 'handoff.md'))).toBe(false);
  });

  it('inside Studio, every provider session of one thread updates the same thread pointer', async () => {
    vi.stubEnv('SPECWEAVE_STUDIO_THREAD_ID', 'thread:01');
    const claude = await capture({ session_id: 'claude-session' });
    expect(claude?.studioThreadId).toBe('thread:01');
    const pointer = studioCheckpointFile('thread:01', home);
    expect(path.basename(pointer)).toBe('thread_01.json');
    expect(JSON.parse(fs.readFileSync(pointer, 'utf8')).sessionId).toBe('claude-session');
    fs.writeFileSync(path.join(repo, 'app.txt'), 'codex edit\n');
    await capture({ session_id: 'codex-session' });
    const shared = JSON.parse(fs.readFileSync(pointer, 'utf8'));
    expect(shared.sessionId).toBe('codex-session');
    expect(fs.readFileSync(shared.diffPath, 'utf8')).toContain('codex edit');
  });

  it('isolates sessions and Git worktrees while canonicalizing subdirectories and symlinks', () => {
    const other = path.join(root, 'worktree');
    git('worktree', 'add', '-qb', 'other', other);
    const sub = path.join(repo, 'src');
    fs.mkdirSync(sub);
    const link = path.join(root, 'alias');
    fs.symlinkSync(repo, link, 'dir');
    const original = checkpointDirectory(input(), { home });
    expect(checkpointDirectory({ ...input(), cwd: sub }, { home })).toBe(original);
    expect(checkpointDirectory({ ...input(), cwd: link }, { home })).toBe(original);
    expect(checkpointDirectory({ ...input(), cwd: other }, { home })).not.toBe(original);
    expect(checkpointDirectory({ ...input(), session_id: 'session-b' }, { home })).not.toBe(original);
  });

  it('captures a child repository while retaining unique umbrella increment context', async () => {
    const umbrella = repo;
    active(umbrella, '0001-one');
    fs.writeFileSync(path.join(umbrella, '.specweave', 'config.json'), '{"umbrella":{"enabled":true}}');
    const child = path.join(umbrella, 'repositories', 'org', 'child');
    initRepo(child);
    fs.writeFileSync(path.join(child, 'app.txt'), 'child edit\n');
    const receipt = await capture({ cwd: child });
    expect(receipt?.incrementId).toBe('0001-one');
    expect(receipt?.cwd).toBe(fs.realpathSync(child));
    expect(fs.readFileSync(receipt!.diffPath, 'utf8')).toContain('+child edit');
    expect(fs.readFileSync(receipt!.diffPath, 'utf8')).not.toContain('repositories/org/child');
  });

  it('saves useful work without guessing an increment when several are active', async () => {
    active(repo, '0001-one');
    active(repo, '0002-two');
    const receipt = await capture();
    expect(receipt).toBeDefined();
    expect(receipt?.incrementId).toBeUndefined();
    expect(fs.existsSync(path.join(repo, '.specweave', 'state', 'handoff-latest.txt'))).toBe(false);
  });

  it('throttles only successful saves and keeps the immediately preceding generation', async () => {
    const first = await capture();
    expect(prepareSessionCheckpoint(input(), { home })).toBeUndefined();
    expireReceipt();
    const second = await capture();
    expect(second?.docPath).not.toBe(first?.docPath);
    expect(fs.existsSync(first!.docPath)).toBe(true);
    expireReceipt();
    const third = await capture();
    expect(fs.existsSync(first!.docPath)).toBe(false);
    expect(fs.existsSync(second!.docPath)).toBe(true);
    expect(fs.existsSync(third!.docPath)).toBe(true);
  });

  it('rechecks the successful receipt after acquiring a lease', async () => {
    await capture();
    const expired = expireReceipt();
    let clock = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    const realWrite = fsDefault.writeFileSync;
    let publishedDuringElection = false;
    vi.spyOn(fsDefault, 'writeFileSync').mockImplementation((file, content, options) => {
      const result = realWrite(file, content, options);
      if (String(file).includes(`${path.sep}pending.lock${path.sep}`) && !publishedDuringElection) {
        publishedDuringElection = true;
        const receipt = JSON.parse(expired.bytes);
        clock += 1000; // another worker completes after our pre-election reading
        receipt.savedAt = new Date(clock).toISOString();
        realWrite(expired.file, JSON.stringify(receipt));
      }
      return result;
    });
    syncBuiltinESMExports();
    expect(prepareSessionCheckpoint(input(), { home })).toBeUndefined();
    expect(publishedDuringElection).toBe(true);
    expect(fs.existsSync(path.join(checkpointDirectory(input(), { home })!, 'pending.lock'))).toBe(false);
  });

  it('leaves the last successful receipt untouched after Git failure and retries immediately', async () => {
    const first = await capture();
    const expired = expireReceipt();
    const fakebin = path.join(root, 'fakebin');
    fs.mkdirSync(fakebin);
    fs.writeFileSync(path.join(fakebin, 'git'), '#!/bin/sh\nexit 91\n', { mode: 0o755 });
    const originalPath = process.env.PATH;
    vi.stubEnv('PATH', `${fakebin}${path.delimiter}${originalPath}`);
    await capture();
    expect(fs.readFileSync(expired.file, 'utf8')).toBe(expired.bytes);
    expect(fs.existsSync(first!.docPath)).toBe(true);
    vi.stubEnv('PATH', originalPath);
    const retry = await capture();
    expect(retry?.docPath).not.toBe(first?.docPath);
  });

  it('bounds simultaneous reservations and recovers stale locks without altering another active lease', () => {
    const requests: string[] = [];
    for (let i = 0; i < CHECKPOINT_MAX_WORKERS; i++) {
      const request = prepareSessionCheckpoint({ ...input(), session_id: `session-${i}` }, { home });
      expect(request).toBeDefined();
      requests.push(request!);
    }
    expect(prepareSessionCheckpoint({ ...input(), session_id: 'session-0' }, { home })).toBeUndefined();
    expect(prepareSessionCheckpoint({ ...input(), session_id: 'overflow' }, { home })).toBeUndefined();
    const request = JSON.parse(fs.readFileSync(requests[0], 'utf8'));
    const lock = path.join(request.directory, 'pending.lock');
    const stale = (Date.now() - CHECKPOINT_LOCK_STALE_MS - 1000) / 1000;
    fs.utimesSync(path.join(lock, `${request.token}.json`), stale, stale);
    fs.utimesSync(path.join(request.slot, `${request.token}.json`), stale, stale);
    const replacement = prepareSessionCheckpoint({ ...input(), session_id: 'session-0' }, { home });
    expect(replacement).toBeDefined();
    const currentLock = fs.readdirSync(lock);
    cleanupCheckpointRequest(requests[0]);
    expect(fs.readdirSync(lock)).toEqual(currentLock);
    for (const file of [...requests.slice(1), replacement!]) cleanupCheckpointRequest(file);
  });

  it('retains the old receipt when a scrubbed diff cannot be written completely', async () => {
    fs.writeFileSync(path.join(repo, 'app.txt'), 'checkpoint this change\n');
    const first = await capture();
    const expired = expireReceipt();
    const realWrite = fsDefault.writeFileSync;
    const write = vi.spyOn(fsDefault, 'writeFileSync').mockImplementation((file, content, options) => {
      if (String(file).endsWith('.diff.scrubbed')) {
        realWrite(file, 'truncated', options);
        throw Object.assign(new Error('test disk full'), { code: 'ENOSPC' });
      }
      return realWrite(file, content, options);
    });
    syncBuiltinESMExports();
    await capture();
    expect(write.mock.calls.some(([file]) => String(file).endsWith('.diff.scrubbed'))).toBe(true);
    expect(fs.readFileSync(expired.file, 'utf8')).toBe(expired.bytes);
    expect(fs.readFileSync(first!.diffPath, 'utf8')).toContain('+checkpoint this change');
    write.mockRestore();
    syncBuiltinESMExports();
    expect((await capture())?.docPath).not.toBe(first?.docPath);
  });

  it('fails within the Git budget and preserves recovery when a required Git command stalls', async () => {
    const first = await capture();
    const expired = expireReceipt();
    const fakebin = path.join(root, 'slowbin');
    fs.mkdirSync(fakebin);
    fs.writeFileSync(path.join(fakebin, 'git'), '#!/bin/sh\nexec /bin/sleep 10\n', { mode: 0o755 });
    vi.stubEnv('PATH', `${fakebin}${path.delimiter}${process.env.PATH}`);
    const start = Date.now();
    await capture();
    expect(Date.now() - start).toBeLessThan(5000);
    expect(fs.readFileSync(expired.file, 'utf8')).toBe(expired.bytes);
    expect(fs.existsSync(first!.docPath)).toBe(true);
  }, 10_000);

  it('scrubs secrets before persisting worker input and from the captured diff', async () => {
    const secret = 'ghp_' + 'a'.repeat(30);
    const args = { ...input(), last_assistant_message: `Never publish ${secret}` };
    fs.writeFileSync(path.join(repo, 'app.txt'), `${secret}\n`);
    const request = prepareSessionCheckpoint(args, { home })!;
    expect(fs.readFileSync(request, 'utf8')).not.toContain(secret);
    await runSessionCheckpoint(request);
    cleanupCheckpointRequest(request);
    const receipt = readSessionCheckpoint(args, { home })!;
    expect(fs.readFileSync(receipt.docPath, 'utf8')).not.toContain(secret);
    expect(fs.readFileSync(receipt.diffPath, 'utf8')).not.toContain(secret);
    expect(fs.readFileSync(receipt.diffPath, 'utf8')).toContain('[REDACTED-github-token]');
  });

  it('supports an unborn repository and a plain folder, and rejects unsafe input', async () => {
    const unborn = path.join(root, 'unborn');
    fs.mkdirSync(unborn);
    execFileSync('git', ['init', '-q'], { cwd: unborn });
    fs.writeFileSync(path.join(unborn, 'draft.txt'), 'draft\n');
    const draft = await capture({ cwd: unborn });
    expect(fs.readFileSync(draft!.diffPath, 'utf8')).toContain('+draft');
    const plain = path.join(root, 'plain');
    fs.mkdirSync(plain);
    expect(await capture({ cwd: plain })).toBeDefined();
    expect(prepareSessionCheckpoint({ ...input(), session_id: '../../escape' }, { home })).toBeUndefined();
    expect(prepareSessionCheckpoint({ ...input(), cwd: '/path-that-does-not-exist' }, { home })).toBeUndefined();
  });

  it.skipIf(process.platform === 'win32')('reaps helpers orphaned by a Git timeout when the POSIX capture worker exits', async () => {
    const fixture = path.join(root, 'supervisor');
    fs.mkdirSync(fixture);
    const pidFile = path.join(fixture, 'helper.pid');
    const fakeGit = path.join(fixture, 'git');
    fs.writeFileSync(fakeGit, '#!/bin/sh\n/bin/sleep 60 &\nprintf "%s" "$!" > "$1"\nwait\n', { mode: 0o755 });
    const source = fs.readFileSync(path.resolve('src/core/session/checkpoint-worker.ts'), 'utf8')
      .replace("'./session-checkpoint.js'", "'./fixture-engine.mjs'");
    const worker = path.join(fixture, 'worker.mjs');
    fs.writeFileSync(worker, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText);
    fs.writeFileSync(path.join(fixture, 'fixture-engine.mjs'), [
      "import { execFileSync } from 'node:child_process';",
      'export const CHECKPOINT_WORKER_TIMEOUT_MS = 1500;',
      'export function cleanupCheckpointRequest() {}',
      `export async function runSessionCheckpoint() { try { execFileSync(${JSON.stringify(fakeGit)}, [${JSON.stringify(pidFile)}], { timeout: 150, killSignal: 'SIGKILL', stdio: 'ignore' }); } catch {} }`,
    ].join('\n'));
    const result = spawnSync(process.execPath, [worker, path.join(fixture, 'request.json')], { timeout: 4000, encoding: 'utf8' });
    expect(result.status).toBe(0);
    const pid = Number(fs.readFileSync(pidFile, 'utf8'));
    expect(pid).toBeGreaterThan(0);
    const running = () => {
      const stat = spawnSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' });
      return stat.status === 0 && stat.stdout.trim() !== '' && !stat.stdout.trim().startsWith('Z');
    };
    const deadline = Date.now() + 1000;
    while (running() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
    try { expect(running()).toBe(false); }
    finally { if (running()) try { process.kill(pid, 'SIGKILL'); } catch { /* fixture already exited */ } }
  });
});
