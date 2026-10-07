import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, fakeBinary } from './helpers.mjs';
import { nativeEnv, readCodexRateLimits, normalizeCodexQuota, nativeRunArgs } from '../lib/native.mjs';
test('supported app-server initialized handshake precedes account/rateLimits/read', async t => {
  const f = await fixture(t);
  const binary = await fakeBinary(f.base, 'rpc', `import readline from 'node:readline';let initialized=false;readline.createInterface({input:process.stdin}).on('line',line=>{const q=JSON.parse(line);if(q.method==='initialize') console.log(JSON.stringify({id:q.id,result:{userAgent:'fixture'}}));if(q.method==='initialized') initialized=true;if(q.method==='account/rateLimits/read')console.log(JSON.stringify(initialized?{id:q.id,result:{rateLimits:{primary:{usedPercent:25,resetsAt:Math.floor(Date.now()/1000)+3600},secondary:{usedPercent:60,resetsAt:Math.floor(Date.now()/1000)+86400}}}}:{id:q.id,error:{message:'missing initialized'}}));});`);
  const result = await readCodexRateLimits({ binary, provider: 'codex', configDir: f.home }, 3000);
  assert.equal(result.error, null); const q = normalizeCodexQuota(result.data); assert.equal(q.window.usedPercent, 25); assert.equal(q.weekly.usedPercent, 60); assert.equal(q.source, 'native-app-server');
  assert.equal(normalizeCodexQuota({ rateLimits: { primary: null, secondary: null } }), null);
  const byId = normalizeCodexQuota({ rateLimitsByLimitId: { codex: { primary: { usedPercent: 99, resetsAt: 9999999999 } } }, rateLimits: { primary: { usedPercent: 1, resetsAt: 9999999999 } } });
  assert.equal(byId.window.usedPercent, 99);
});
test('native environment keeps HOME while selecting config home and suppressing inherited API auth', () => {
  const prior = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'synthetic';
  try { const env = nativeEnv({ provider: 'codex', configDir: '/profiles/codex-2' }); assert.equal(env.HOME, process.env.HOME); assert.equal(env.CODEX_HOME, '/profiles/codex-2'); assert.equal(env.OPENAI_API_KEY, undefined); assert.equal(env.PWDEBUG, '0'); }
  finally { if (prior === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = prior; }
  assert.deepEqual(nativeRunArgs({ provider: 'codex' }, 'read'), ['exec', '--json', '--sandbox', 'read-only', '-']);
  assert.ok(nativeRunArgs({ provider: 'claude' }, 'read').includes('--restricted'));
  assert.ok(!nativeRunArgs({ provider: 'claude' }, 'read').some(v => v.includes('bypass') || v.includes('dangerously')));
  const writeArgs = nativeRunArgs({ provider: 'claude' }, 'edit', { sandbox: 'workspace-write' });
  assert.ok(writeArgs.includes('acceptEdits')); assert.ok(writeArgs.includes('Read,Glob,Grep,Write,Edit')); assert.ok(writeArgs.includes('--permission-prompts'));
  assert.ok(!writeArgs.some(v => v.includes('bypass') || v.includes('dangerously')));
});
