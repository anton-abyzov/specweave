import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, access, symlink, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixture, quota } from './helpers.mjs';
import { readState, mutateState, rebindAccountBinary } from '../lib/state.mjs';
import { execute } from '../lib/util.mjs';

async function executable(f, provider = 'codex') {
  const binary = join(f.home, '.local/share/specweave/providers/bin', provider);
  await mkdir(join(binary, '..'), { recursive: true });
  await writeFile(binary, `#!/bin/sh\nprintf 'unexpected execution' > '${join(f.base,'provider-was-started')}'\nexit 9\n`, { mode: 0o755 });
  return binary;
}
const bytes = f => readFile(join(f.root, 'state.json'), 'utf8');
async function noProviderStarted(f) { await assert.rejects(access(join(f.base,'provider-was-started')), { code:'ENOENT' }); }

test('explicit rebind changes only the intended binary across all seven existing profiles', async t => {
  const f = await fixture(t), codex = await executable(f), claude = await executable(f,'claude');
  await mutateState(f.root, s => {
    s.policy = { mode:'reset-first', preferredProvider:'codex', selectedAccount:'codex-2' };
    s.runs = [{ id:'settled', accountId:'codex-2', status:'success', nativeThreadId:'retained-thread', startedAt:'2026-10-01T00:00:00Z' }];
    s.custom = { nested:['preserved',7] };
    for(const a of s.accounts)Object.assign(a,{ binary:join(f.home,'.local/share/t3/providers/node_modules/.bin',a.provider),authenticated:true,authKind:a.provider==='codex'?'chatgpt':'claude.ai',quota:quota(),customAccount:{ untouched:true } });
  });
  const before = await readState(f.root), nativeFiles = new Map();
  for(const a of before.accounts) {
    await mkdir(a.configDir,{recursive:true});
    for(const [name,content] of [['auth.json','{"fixture":"native-owner"}\n'],['config.toml','fixture-config\n']]) {
      const file=join(a.configDir,name);await writeFile(file,content);nativeFiles.set(file,content);
    }
  }
  const expected=structuredClone(before);
  for(const a of before.accounts) {
    const binary=a.provider==='codex'?codex:claude;
    const result=await rebindAccountBinary(f.root,a.id,binary);
    assert.deepEqual(result,{id:a.id,provider:a.provider,binary,changed:true});
    expected.accounts.find(item=>item.id===a.id).binary=binary;
    assert.deepEqual(await readState(f.root),expected);
  }
  const unchanged=await bytes(f);
  assert.equal((await rebindAccountBinary(f.root,'codex-2',codex)).changed,false);
  assert.equal(await bytes(f),unchanged);
  for(const [file,content] of nativeFiles)assert.equal(await readFile(file,'utf8'),content);
  await noProviderStarted(f);
});

test('rebind rejects invalid executables and legacy aliases before any state change', async t => {
  const f=await fixture(t), good=await executable(f), legacy=join(f.home,'.local/share/t3/providers/bin/codex'), alias=join(f.base,'neutral-codex');
  await mkdir(join(legacy,'..'),{recursive:true});await writeFile(legacy,'#!/bin/sh\nexit 0\n',{mode:0o755});await symlink(legacy,alias);
  const nonExecutable=join(f.base,'non-executable');await writeFile(nonExecutable,'fixture',{mode:0o644});
  const before=await bytes(f);
  for(const binary of ['codex',join(f.base,'missing'),nonExecutable,f.base,legacy,alias,null]) {
    await assert.rejects(rebindAccountBinary(f.root,'codex-1',binary),/independent executable|executable file outside/);
    assert.equal(await bytes(f),before);
  }
  await assert.rejects(rebindAccountBinary(f.root,'unknown-profile',good),/Unknown profile/);assert.equal(await bytes(f),before);
  await mutateState(f.root,s=>{s.accounts[0].provider='unsupported';});
  const invalid=await bytes(f);await assert.rejects(rebindAccountBinary(f.root,'codex-1',good),/Unsupported profile provider/);assert.equal(await bytes(f),invalid);
  await noProviderStarted(f);
});

test('active account and native-run reservations fence rebind without touching history', async t => {
  const f=await fixture(t), binary=await executable(f);
  for(const status of ['running','active']) {
    await mutateState(f.root,s=>{s.runs=[{id:'native',accountId:'codex-1',status,nativeThreadId:'keep-thread'}];});
    const before=await bytes(f);await assert.rejects(rebindAccountBinary(f.root,'codex-1',binary),/active native run/);assert.equal(await bytes(f),before);
  }
  for(const status of ['running','active']) {
    await mutateState(f.root,s=>{s.runs=[];s.accounts[0].status=status;});
    const before=await bytes(f);await assert.rejects(rebindAccountBinary(f.root,'codex-1',binary),/active native run/);assert.equal(await bytes(f),before);
  }
  await mutateState(f.root,s=>{delete s.accounts[0].status;s.runs=[{id:'other-live',accountId:'codex-2',status:'running',nativeThreadId:'keep-other-thread'}];});
  const before=await readState(f.root);await rebindAccountBinary(f.root,'codex-1',binary);before.accounts[0].binary=binary;assert.deepEqual(await readState(f.root),before);
  await noProviderStarted(f);
});

test('rebind respects the state lock and CLI repairs existing state without initializing or authenticating', async t => {
  const f=await fixture(t), binary=await executable(f), before=await bytes(f), lock=join(f.root,'.state.lock');
  await writeFile(lock,'fixture-owned-lock');await assert.rejects(rebindAccountBinary(f.root,'codex-1',binary),/State is busy/);assert.equal(await bytes(f),before);
  await unlink(lock);
  const cli=fileURLToPath(new URL('../bin/specweave-switch.mjs',import.meta.url)), env={...process.env,HOME:f.home,SPECWEAVE_SWITCH_STATE:f.root};
  const result=await execute(process.execPath,[cli,'account','binary','codex-1','--binary',binary],{env,timeoutMs:5000});
  assert.equal(result.exitCode,0);assert.deepEqual(JSON.parse(result.stdout),{id:'codex-1',provider:'codex',binary,changed:true});
  const after=await bytes(f);
  for(const args of [['account','binary','codex-1'],['account','binary','codex-1','--binary',binary,'--provider','claude'],['account','binary','codex-1','extra','--binary',binary]]) {
    const rejected=await execute(process.execPath,[cli,...args],{env,timeoutMs:5000});assert.equal(rejected.exitCode,1);assert.match(rejected.stderr,/account binary ID/);assert.equal(await bytes(f),after);
  }
  const missingRoot=join(f.base,'missing-state'), missing=await execute(process.execPath,[cli,'account','binary','codex-1','--binary',binary],{env:{...env,SPECWEAVE_SWITCH_STATE:missingRoot},timeoutMs:5000});
  assert.equal(missing.exitCode,1);await assert.rejects(access(join(missingRoot,'state.json')),{code:'ENOENT'});
  await noProviderStarted(f);
});
