import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, fakeBinary, authed, quota } from './helpers.mjs';
import { acquireLease, run, classifyOutcome, managedPrompt } from '../lib/runner.mjs';
import { readState, mutateState } from '../lib/state.mjs';
test('exclusive lease rejects duplicate canonical or symlinked workspace', async t => {
  const f = await fixture(t); await symlink(f.repo, join(f.base, 'alias'));
  const lease = await acquireLease(f.root, f.repo);
  await assert.rejects(acquireLease(f.root, f.repo), /exclusive lease/); await assert.rejects(acquireLease(f.root, join(f.base, 'alias')), /exclusive lease/);
  await lease.release(); const second = await acquireLease(f.root, f.repo); await second.release();
});
test('failed native run persists failure and redacts JSON credentials; no synthetic success', async t => {
  const f = await fixture(t);
  const binary = await fakeBinary(f.base, 'failed', `console.log(JSON.stringify({type:'turn.failed',error:{message:'ordinary failure'},api_key:'SyntheticReceiptSecret123456'}));process.exitCode=1;`);
  await authed(f.root, 'codex-1', binary);
  const result = await run(f.root, { cwd: f.repo, prompt: 'read', accountId: 'codex-1' });
  assert.equal(result.status, 'failed'); const state = await readState(f.root); assert.equal(state.runs[0].status, 'failed'); assert.equal(state.runs[0].exitCode, 1);
  const receipt = await readFile(join(f.root, 'runs', state.runs[0].id + '.json'), 'utf8'); assert.ok(!receipt.includes('SyntheticReceiptSecret')); assert.ok(receipt.includes('[REDACTED]'));
  assert.equal(classifyOutcome({ exitCode: 0, stdout: '{"type":"turn.failed","error":{"message":"failure"}}', stderr: '' }, 'codex').status, 'failed');
  assert.equal(classifyOutcome({ exitCode: 0, stdout: 'nothing completed', stderr: '' }, 'codex').status, 'failed');
});
test('quota failover occurs only after exit; retains failed attempt, checkpoints dirty tracked files', async t => {
  const f = await fixture(t);
  const exhausted = await fakeBinary(f.base, 'quota', `console.log(JSON.stringify({type:'turn.failed',error:{message:'usage_limit_reached'}}));process.exitCode=1;`);
  const success = await fakeBinary(f.base, 'success', `console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:1}}));`);
  await authed(f.root, 'codex-1', exhausted); await authed(f.root, 'codex-2', success, quota({ used: 40 }));
  await writeFile(join(f.repo, 'main.txt'), 'dirty but preserved\n');
  const result = await run(f.root, { cwd: f.repo, prompt: 'read', accountId: 'codex-1', failover: true, maxAttempts: 2, files: ['main.txt'] });
  assert.equal(result.status, 'success'); assert.deepEqual(result.attempts.map(a => a.status), ['quota-exhausted', 'success']); assert.ok(result.checkpointId);
  const state = await readState(f.root); assert.ok(Date.parse(state.runs[0].endedAt) <= Date.parse(state.runs[1].startedAt)); assert.ok(state.accounts[0].lastQuotaErrorAt);
  assert.equal(await readFile(join(f.repo, 'main.txt'), 'utf8'), 'dirty but preserved\n');
});
test('dirty workspace without allowlist stops failover and timeout cannot become success', async t => {
  const f = await fixture(t);
  const exhausted = await fakeBinary(f.base, 'quota', `console.log(JSON.stringify({type:'turn.failed',error:{message:'usage_limit_reached'}}));process.exitCode=1;`);
  await authed(f.root, 'codex-1', exhausted); await writeFile(join(f.repo, 'main.txt'), 'dirty\n');
  const result = await run(f.root, { cwd: f.repo, prompt: 'read', accountId: 'codex-1', failover: true });
  assert.equal(result.status, 'quota-exhausted'); assert.equal(result.attempts.length, 1); assert.match(result.stoppedReason, /allowlist/);
  const stuck = await fakeBinary(f.base, 'stuck', 'setTimeout(()=>{},10000);'); await authed(f.root, 'codex-2', stuck);
  const timed = await run(f.root, { cwd: f.repo, prompt: 'read', accountId: 'codex-2', timeoutMs: 1000 }); assert.equal(timed.status, 'timed-out');
});
test('explicit Claude file-write run uses ordinary permissions and passes mandatory headless rules', async t => {
  const f = await fixture(t);
  const binary = await fakeBinary(f.base, 'claude-write', `import fs from 'node:fs';let prompt='';process.stdin.on('data',x=>prompt+=x);process.stdin.on('end',()=>{const args=process.argv.slice(2);if(!args.includes('acceptEdits')||!args.includes('Read,Glob,Grep,Write,Edit')||!prompt.includes('headless: true'))process.exitCode=1;else{fs.writeFileSync('main.txt','native file edit fixture\\n');console.log(JSON.stringify({type:'result',subtype:'success',is_error:false,model:'fixture-claude'}));}});`);
  await authed(f.root, 'claude-1', binary);
  const result = await run(f.root, { cwd: f.repo, prompt: 'edit file', accountId: 'claude-1', sandbox: 'workspace-write' });
  assert.equal(result.status, 'success'); assert.equal(result.attempts[0].model, 'fixture-claude'); assert.equal(await readFile(join(f.repo, 'main.txt'), 'utf8'), 'native file edit fixture\n');
  await assert.rejects(run(f.root, { cwd: f.repo, prompt: 'edit file', accountId: 'claude-1', sandbox: 'workspace-write', failover: true }), /read-only/);
  assert.match(managedPrompt('task', 'read-only'), /headless=True/); assert.match(managedPrompt('task', 'read-only'), /PWDEBUG=0/);
});
