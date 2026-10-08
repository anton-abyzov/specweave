/**
 * Black-box automatic checkpoint regressions. Run after `npm run build`:
 *   node scripts/e2e/session-checkpoints.mjs
 *   SW_TEST_REPO=/path/to/built/package node scripts/e2e/session-checkpoints.mjs
 *
 * All repositories, profiles, failures and hostile transports are fixtures.
 * The child-only preload redirects os.homedir without changing HOME/CODEX_HOME.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = process.env.SW_TEST_REPO || fileURLToPath(new URL('../../', import.meta.url));
const bin = path.join(repo, 'bin/specweave.js');
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-checkpoint-e2e-')));
const fixtureHome = path.join(tmp, 'profile');
const shimDir = path.join(tmp, 'shim');
const gitLog = path.join(tmp, 'git-calls.jsonl');
const faultFile = path.join(tmp, 'git-fault');
const networkFile = path.join(tmp, 'network-attempt');
const nodePidFile = path.join(tmp, 'fixture-node-pids');
const workerPids = new Set();
const mkdir = p => fs.mkdirSync(p, { recursive: true });
const write = (p, text) => { mkdir(path.dirname(p)); fs.writeFileSync(p, text); };
const json = (p, data) => write(p, JSON.stringify(data) + '\n');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const digest = p => fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null;
const realGit = spawnSync('which', ['git'], { encoding: 'utf8' }).stdout.trim();
assert.ok(realGit, 'git must be installed');

const homedirShim = path.join(shimDir, 'home.mjs');
write(homedirShim, `import os from 'node:os';\nimport fs from 'node:fs';\nimport { syncBuiltinESMExports } from 'node:module';\nos.homedir = () => process.env.SW_CHECKPOINT_E2E_HOME;\nsyncBuiltinESMExports();\nfs.appendFileSync(process.env.SW_CHECKPOINT_E2E_PIDS, process.pid + '\\n');\n`);
write(path.join(shimDir, 'git'), `#!${process.execPath}
const fs = require('node:fs');
const cp = require('node:child_process');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.SW_CHECKPOINT_E2E_GIT_LOG, JSON.stringify({ args, cwd: process.cwd(), pid: process.pid }) + '\\n');
if (args.some(a => ['push', 'fetch', 'ls-remote', 'clone', 'pull'].includes(a))) {
  fs.writeFileSync(process.env.SW_CHECKPOINT_E2E_NETWORK, String(process.pid));
  setTimeout(() => process.exit(95), 30000);
} else if (fs.existsSync(process.env.SW_CHECKPOINT_E2E_FAULT)) {
  if (fs.readFileSync(process.env.SW_CHECKPOINT_E2E_FAULT, 'utf8').includes('stall')) {
    setTimeout(() => process.exit(94), 30000);
  } else {
    process.stderr.write('Injected local git failure\\n');
    process.exit(91);
  }
} else {
  const result = cp.spawnSync(process.env.SW_CHECKPOINT_E2E_REAL_GIT, args, { stdio: 'inherit' });
  process.exit(result.status ?? 92);
}
`);
fs.chmodSync(path.join(shimDir, 'git'), 0o755);

const childEnv = {
  ...process.env,
  SW_CHECKPOINT_E2E_HOME: fixtureHome,
  SW_CHECKPOINT_E2E_PIDS: nodePidFile,
  SW_CHECKPOINT_E2E_GIT_LOG: gitLog,
  SW_CHECKPOINT_E2E_FAULT: faultFile,
  SW_CHECKPOINT_E2E_NETWORK: networkFile,
  SW_CHECKPOINT_E2E_REAL_GIT: realGit,
  NODE_OPTIONS: `--import=${pathToFileURL(homedirShim).href}`,
  PATH: `${shimDir}${path.delimiter}${process.env.PATH}`,
  HTTP_PROXY: 'http://127.0.0.1:1', HTTPS_PROXY: 'http://127.0.0.1:1', ALL_PROXY: 'http://127.0.0.1:1',
  http_proxy: 'http://127.0.0.1:1', https_proxy: 'http://127.0.0.1:1', all_proxy: 'http://127.0.0.1:1',
  NO_PROXY: '', no_proxy: '', GIT_TERMINAL_PROMPT: '0',
  PWDEBUG: '0', PLAYWRIGHT_HTML_OPEN: 'never', NO_COLOR: '1', FORCE_COLOR: '0',
  SPECWEAVE_AGENT: 'checkpoint-fixture@local', SPECWEAVE_TOOL: 'codex',
};
const git = (cwd, args) => {
  const r = spawnSync(realGit, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args], {
    cwd, encoding: 'utf8', timeout: 10000, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  assert.ifError(r.error);
  assert.equal(r.status, 0, `fixture git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const hooks = [];
async function hook(cwd, sessionId, { limitHit = false, extra = {}, label = sessionId } = {}) {
  const started = performance.now();
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bin, 'usage-guard', ...(limitHit ? ['--limit-hit'] : [])], {
      cwd, env: childEnv, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`${label}: hook exceeded 2 seconds`)); }, 2000);
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.once('error', e => { clearTimeout(timer); reject(e); });
    child.once('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal, stdout, stderr }); });
    child.stdin.end(JSON.stringify({ session_id: sessionId, cwd, last_assistant_message: `Checkpoint evidence for ${sessionId}`, ...extra }));
  });
  const elapsed = Math.round(performance.now() - started);
  assert.equal(result.code, 0, `${label}: ${result.stderr}`);
  assert.equal(result.stdout.trim(), '{}', `${label}: stdout must contain only hook JSON`);
  assert.deepEqual(JSON.parse(result.stdout), {}, `${label}: must never block the model`);
  assert.ok(elapsed < 2000, `${label}: ${elapsed} ms`);
  hooks.push({ label, elapsedMs: elapsed });
  return result;
}

function receipts() {
  const root = path.join(fixtureHome, '.specweave/checkpoints');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory()).flatMap(e => {
    const file = path.join(root, e.name, 'current.json');
    try { return [{ file, data: JSON.parse(fs.readFileSync(file, 'utf8')) }]; } catch { return []; }
  });
}
function pendingWorkers() {
  const root = path.join(fixtureHome, '.specweave/checkpoints');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory()).flatMap(e =>
    fs.readdirSync(path.join(root, e.name)).filter(name => name.endsWith('.lock')).map(name => path.join(root, e.name, name)).filter(file => !fs.statSync(file).isDirectory() || fs.readdirSync(file).length > 0));
}
function receiptFor(cwd, sessionId) {
  return receipts().find(r => r.data.sessionId === sessionId && r.data.cwd === cwd);
}
function verifyReceipt(receipt) {
  assert.equal(receipt.data.version, 1);
  assert.ok(Number.isFinite(Date.parse(receipt.data.savedAt)), 'receipt has a save timestamp');
  for (const field of ['docPath', 'diffPath']) {
    assert.ok(receipt.data[field].startsWith(path.dirname(receipt.file) + path.sep), `${field} must stay session-local`);
    assert.ok(fs.existsSync(receipt.data[field]), `${field} exists before publishing current.json`);
  }
  assert.match(fs.readFileSync(receipt.data.docPath, 'utf8'), new RegExp(`Checkpoint evidence for ${receipt.data.sessionId}`));
  const patch = fs.readFileSync(receipt.data.diffPath, 'utf8');
  assert.match(patch, /app\.txt/, 'tracked edits captured');
  assert.match(patch, /untracked\.txt/, 'untracked edits captured');
}
async function until(check, label, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = check();
    if (value) return value;
    await sleep(50);
  }
  throw new Error(`${label}: timed out after ${timeout} ms; receipts=${JSON.stringify(receipts())}`);
}
function fixtureProject(cwd) {
  mkdir(cwd);
  json(path.join(cwd, '.specweave/config.json'), { version: '3.0' });
  write(path.join(cwd, '.specweave/state/handoff-latest.txt'), 'manual-handoff-must-stay\n');
  for (const id of ['0001-first', '0002-second']) {
    const inc = path.join(cwd, '.specweave/increments', id);
    json(path.join(inc, 'metadata.json'), { id, status: 'active', type: 'feature', created: new Date().toISOString() });
    write(path.join(inc, 'spec.md'), `# ${id}\n\n## Problem\nFixture.\n\n## Acceptance Criteria\n- AC-01 Preserve state.\n\n## Tasks\n### T-01 Preserve ownership\n- AC: AC-01 | Files: app.txt | Test: true\n`);
    write(path.join(inc, 'ledger.jsonl'), JSON.stringify({ t: 'T-01', e: 'claim', by: 'checkpoint-fixture@local', at: new Date().toISOString() }) + '\n');
  }
  write(path.join(cwd, 'app.txt'), 'committed\n');
  git(cwd, ['init', '-q']);
  git(cwd, ['add', '.']);
  git(cwd, ['commit', '-qm', 'fixture']);
  git(cwd, ['remote', 'add', 'origin', 'https://unreachable.invalid/checkpoint-fixture.git']);
  write(path.join(cwd, 'app.txt'), 'unstaged edit must remain\n');
  write(path.join(cwd, 'untracked.txt'), 'untracked edit must remain\n');
}
function state(cwd) {
  return {
    head: git(cwd, ['rev-parse', 'HEAD']),
    refs: git(cwd, ['show-ref']),
    index: digest(git(cwd, ['rev-parse', '--path-format=absolute', '--git-path', 'index'])),
    status: git(cwd, ['status', '--porcelain']),
    pointer: digest(path.join(cwd, '.specweave/state/handoff-latest.txt')),
    ledgers: ['0001-first', '0002-second'].map(id => digest(path.join(cwd, '.specweave/increments', id, 'ledger.jsonl'))),
    files: ['app.txt', 'untracked.txt'].map(p => digest(path.join(cwd, p))),
  };
}
function assertNoNetwork() {
  assert.equal(fs.existsSync(networkFile), false, 'automatic checkpoint attempted a Git network command');
  const calls = fs.existsSync(gitLog) ? fs.readFileSync(gitLog, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
  assert.ok(calls.every(c => !c.args.some(a => ['push', 'fetch', 'ls-remote', 'clone', 'pull'].includes(a))), 'Git network tripwire');
}

try {
  assert.ok(fs.existsSync(path.join(repo, 'dist/src/cli/commands/auto-handoff.js')), 'Build the target package first');
  json(path.join(fixtureHome, '.specweave/auto-handoff.json'), { at: 90 });
  const project = path.join(tmp, 'project');
  const worktree = path.join(tmp, 'other-worktree');
  fixtureProject(project);
  git(project, ['worktree', 'add', '-qb', 'fixture-other', worktree]);
  write(path.join(worktree, 'app.txt'), 'other worktree edit\n');
  write(path.join(worktree, 'untracked.txt'), 'other untracked\n');
  const before = [state(project), state(worktree)];

  // An old guard reads this FIFO and stalls. The new hook must never read it.
  const transcript = path.join(tmp, 'rollout-unreadable-usage.jsonl');
  const fifo = spawnSync('mkfifo', [transcript], { encoding: 'utf8' });
  assert.equal(fifo.status, 0, fifo.stderr);
  await hook(project, 'same-session', { extra: { transcript_path: transcript }, label: 'legacy 90% settings; unreadable quota; duplicate active increments' });
  await until(() => receipts().length === 1, 'initial background checkpoint');
  await until(() => !pendingWorkers().length, 'initial worker cleanup');
  const initialReceipt = receiptFor(project, 'same-session');
  verifyReceipt(initialReceipt);
  console.log('PASS strict fast hook and successful local checkpoint without quota read');

  await Promise.all([
    hook(project, 'same-session', { label: 'repeated stop' }),
    hook(project, 'second-session', { label: 'parallel session' }),
    hook(worktree, 'same-session', { label: 'same session in another worktree' }),
    hook(project, 'limited-session', { limitHit: true, extra: { error: 'rate_limit' }, label: 'StopFailure' }),
  ]);
  await until(() => receipts().length === 4, 'parallel session/worktree isolation');
  await until(() => !pendingWorkers().length, 'parallel worker cleanup');
  assert.equal(new Set(receipts().map(r => r.file)).size, 4);
  assert.deepEqual(receipts().map(r => `${r.data.cwd}\0${r.data.sessionId}`).sort(), [
    `${project}\0same-session`, `${project}\0second-session`, `${project}\0limited-session`, `${worktree}\0same-session`,
  ].sort(), 'receipts must belong to the exact originating session and worktree');
  for (const receipt of receipts()) verifyReceipt(receipt);
  assert.equal(receiptFor(project, 'same-session').data.docPath, initialReceipt.data.docPath, 'repeated stop must be throttled');
  console.log('PASS concurrent sessions and worktrees plus StopFailure');

  // Expire this fixture receipt, then make local Git fail. Failure must neither
  // replace the recovery point nor permanently suppress the next attempt.
  const stale = receiptFor(project, 'same-session');
  stale.data.savedAt = new Date(Date.now() - 10 * 60_000).toISOString();
  json(stale.file, stale.data);
  const previousBytes = fs.readFileSync(stale.file, 'utf8');
  const callsBeforeFault = fs.existsSync(gitLog) ? fs.statSync(gitLog).size : 0;
  write(faultFile, 'fail local git only\n');
  await hook(project, 'same-session', { label: 'failed background refresh' });
  await until(() => fs.existsSync(gitLog) && fs.statSync(gitLog).size > callsBeforeFault, 'failure exercised real worker');
  await until(() => !pendingWorkers().length, 'failed worker releases locks');
  assert.equal(fs.readFileSync(stale.file, 'utf8'), previousBytes, 'failed refresh replaced the previous receipt');
  assert.ok(fs.existsSync(stale.data.docPath), 'failed refresh deleted recovery document');
  fs.unlinkSync(faultFile);
  await hook(project, 'same-session', { label: 'retry after failure' });
  const refreshed = await until(() => {
    const r = receiptFor(project, 'same-session');
    return r?.data.docPath !== stale.data.docPath && r;
  }, 'failure retry publishes new checkpoint');
  await until(() => !pendingWorkers().length, 'retry worker cleanup');
  verifyReceipt(refreshed);
  assert.ok(fs.existsSync(stale.data.docPath), 'previous generation retained for recovery');
  console.log('PASS failed refresh preserves snapshot and retries without consuming a once-only marker');

  // A synchronous local Git stall must stay out of the hook's critical path.
  const beforeStall = receiptFor(project, 'same-session');
  beforeStall.data.savedAt = new Date(Date.now() - 10 * 60_000).toISOString();
  json(beforeStall.file, beforeStall.data);
  const stallBytes = fs.readFileSync(beforeStall.file, 'utf8');
  const callsBeforeStall = fs.statSync(gitLog).size;
  write(faultFile, 'stall local git only\n');
  const stalledAt = performance.now();
  await hook(project, 'same-session', { label: 'stalled local Git' });
  await until(() => fs.statSync(gitLog).size > callsBeforeStall, 'stalled Git entered worker');
  await until(() => !pendingWorkers().length, 'stalled worker deadline cleanup', 11000);
  assert.ok(performance.now() - stalledAt < 11000, 'stalled worker exceeded its bounded cleanup time');
  assert.equal(fs.readFileSync(beforeStall.file, 'utf8'), stallBytes, 'stalled capture replaced prior receipt');
  fs.unlinkSync(faultFile);
  await hook(project, 'same-session', { label: 'retry after local Git stall' });
  await until(() => receiptFor(project, 'same-session')?.data.docPath !== beforeStall.data.docPath, 'retry after stalled Git');
  await until(() => !pendingWorkers().length, 'post-stall worker cleanup');
  console.log('PASS stalled local Git bounded outside hook with preserved recovery and retry');

  assertNoNetwork();
  assert.equal(fs.existsSync(path.join(fixtureHome, '.specweave/usage')), false, 'automatic saves must not create old quota markers');
  assert.deepEqual([state(project), state(worktree)], before, 'automatic saves changed user Git, ownership, files, or handoff pointer');
  console.log('PASS no Git network, refs, index, claims, edits or handoff pointer changes');
  console.log(JSON.stringify({ result: 'PASS', hooks }, null, 2));
} finally {
  // Kill only fixture PIDs recorded by this harness, never app/process patterns.
  if (fs.existsSync(nodePidFile)) {
    for (const line of fs.readFileSync(nodePidFile, 'utf8').split('\n')) {
      const pid = Number(line);
      if (Number.isSafeInteger(pid) && pid > 1) workerPids.add(pid);
    }
  }
  if (fs.existsSync(networkFile)) {
    const pid = Number(fs.readFileSync(networkFile, 'utf8'));
    if (Number.isSafeInteger(pid) && pid > 1) workerPids.add(pid);
  }
  for (const pid of workerPids) { try { process.kill(pid, 'SIGKILL'); } catch {} }
  fs.rmSync(tmp, { recursive: true, force: true });
}
