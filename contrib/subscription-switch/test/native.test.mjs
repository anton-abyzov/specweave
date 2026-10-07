import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, fakeBinary } from './helpers.mjs';
import { nativeEnv, readCodexRateLimits, normalizeCodexQuota, nativeRunArgs, inspectAuth } from '../lib/native.mjs';
import { recommend, accountStatus } from '../lib/policy.mjs';
import { quota } from './helpers.mjs';
test('supported app-server initialized handshake precedes account/rateLimits/read', async t => {
  const f = await fixture(t);
  const binary = await fakeBinary(f.base, 'rpc', `import readline from 'node:readline';let initialized=false;readline.createInterface({input:process.stdin}).on('line',line=>{const q=JSON.parse(line);if(q.method==='initialize') console.log(JSON.stringify({id:q.id,result:{userAgent:'fixture'}}));if(q.method==='initialized') initialized=true;if(q.method==='account/rateLimits/read')console.log(JSON.stringify(initialized?{id:q.id,result:{rateLimits:{primary:{usedPercent:25,resetsAt:Math.floor(Date.now()/1000)+3600},secondary:{usedPercent:60,resetsAt:Math.floor(Date.now()/1000)+86400}}}}:{id:q.id,error:{message:'missing initialized'}}));});`);
  const result = await readCodexRateLimits({ binary, provider: 'codex', configDir: f.home }, 3000);
  assert.equal(result.error, null); const q = normalizeCodexQuota(result.data); assert.equal(q.window.usedPercent, 25); assert.equal(q.weekly.usedPercent, 60); assert.equal(q.source, 'native-app-server');
  assert.equal(normalizeCodexQuota({ rateLimits: { primary: null, secondary: null } }), null);
  const byId = normalizeCodexQuota({ rateLimitsByLimitId: { codex: { primary: { usedPercent: 99, resetsAt: 9999999999 } } }, rateLimits: { primary: { usedPercent: 1, resetsAt: 9999999999 } } });
  assert.equal(byId.window.usedPercent, 99);
});
test('Claude consumer OAuth is eligible; API keys and unknown identity cannot spend subscriptions', async t => {
  const f = await fixture(t);
  for (const authMethod of ['claude.ai', 'api_key', 'unknown-upstream']) {
    const binary = await fakeBinary(f.base, authMethod.replaceAll('.', '-'), `console.log(JSON.stringify({loggedIn:true,authMethod:${JSON.stringify(authMethod)}}));`);
    const observed = await inspectAuth({ binary, provider: 'claude', configDir: f.home });
    assert.equal(observed.authenticated, authMethod === 'claude.ai');
    const state = { policy: { mode: 'balanced' }, runs: [], accounts: [{ id: 'claude-test', provider: 'claude', ...observed, quota: quota() }] };
    assert.equal(recommend(state).id, authMethod === 'claude.ai' ? 'claude-test' : null);
  }
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
test('Claude default leaves native keychain config scope unset while isolated profiles set it', () => {
  const previous = process.env.CLAUDE_CONFIG_DIR; process.env.CLAUDE_CONFIG_DIR = '/inherited/wrong-profile';
  try {
    assert.equal(nativeEnv({ id: 'claude-1', provider: 'claude', configDir: '/home/.claude', nativeDefault: true }).CLAUDE_CONFIG_DIR, undefined);
    assert.equal(nativeEnv({ id: 'claude-1', provider: 'claude', configDir: '/home/.claude' }).CLAUDE_CONFIG_DIR, undefined);
    assert.equal(nativeEnv({ id: 'claude-2', provider: 'claude', configDir: '/profiles/claude-2', nativeDefault: false }).CLAUDE_CONFIG_DIR, '/profiles/claude-2');
  } finally { if (previous === undefined) delete process.env.CLAUDE_CONFIG_DIR; else process.env.CLAUDE_CONFIG_DIR = previous; }
});
test('native window duration maps a weekly-only primary and honors ordinary/spend-control denial', () => {
  const weeklyOnly = normalizeCodexQuota({ rateLimits: { primary: { usedPercent: 37, resetsAt: 9999999999, windowDurationMins: 10080 }, secondary: null, ordinaryUsageAllowed: true } });
  assert.equal(weeklyOnly.window, null); assert.equal(weeklyOnly.weekly.usedPercent, 37); assert.equal(weeklyOnly.ordinaryUsageAllowed, true);
  const swapped = normalizeCodexQuota({ rateLimits: { primary: { usedPercent: 40, resetsAt: 9999999999, windowDurationMins: 10080 }, secondary: { usedPercent: 30, resetsAt: 9999999999, windowDurationMins: 300 } } });
  assert.equal(swapped.weekly.usedPercent, 40); assert.equal(swapped.window.usedPercent, 30);
  for (const flag of [{ ordinaryUsageAllowed: false }, { spendControlReached: true }]) {
    const observed = normalizeCodexQuota({ rateLimits: { primary: null, secondary: null, ...flag } });
    assert.equal(observed.denied, true); assert.equal(accountStatus({ authenticated: true, quota: observed }), 'exhausted');
  }
  const exhausted = normalizeCodexQuota({ rateLimits: { primary: { usedPercent: 100, resetsAt: 9999999999, windowDurationMins: 300 }, credits: { hasCredits: true, unlimited: true }, ordinaryUsageAllowed: true } });
  assert.equal(accountStatus({ authenticated: true, quota: exhausted }), 'exhausted');
});
