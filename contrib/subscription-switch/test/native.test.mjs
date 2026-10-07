import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixture, fakeBinary } from './helpers.mjs';
import { nativeEnv, readCodexRateLimits, normalizeCodexQuota, nativeRunArgs, inspectAuth } from '../lib/native.mjs';
import { recommend, accountStatus } from '../lib/policy.mjs';
import { quota } from './helpers.mjs';
import { readState, mutateState } from '../lib/state.mjs';
import { execute } from '../lib/util.mjs';
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
test('ambient legacy Claude OAuth in empty isolated roots does not prove multiple subscriptions', async t => {
  const f = await fixture(t), state = await readState(f.root);
  for (const authMethod of ['oauth_token', 'oauth-token']) {
    const binary = await fakeBinary(f.base, authMethod, `console.log(JSON.stringify({loggedIn:true,authMethod:${JSON.stringify(authMethod)}}));`);
    const observations = [];
    for (const id of ['claude-1', 'claude-2', 'claude-3']) {
      const account = state.accounts.find(a => a.id === id);
      if (id !== 'claude-1') assert.deepEqual(await readdir(account.configDir), []);
      const auth = await inspectAuth({ ...account, binary });
      observations.push({ ...account, ...auth, quota: quota() });
      assert.equal(auth.authKind, authMethod);
      assert.equal(auth.authenticated, null);
      assert.equal(auth.authError, id === 'claude-1' ? 'subscription-auth-unverified' : 'profile-isolation-unverified');
    }
    const routing = { policy: { mode: 'balanced' }, runs: [], accounts: observations };
    assert.equal(recommend(routing).id, null);
    for (const id of ['claude-1', 'claude-2', 'claude-3']) {
      assert.equal(accountStatus(observations.find(a => a.id === id)), 'unknown');
      assert.equal(recommend(routing, { accountId: id, allowUnknown: true }).id, null);
    }
    observations[0].quota = null;
    assert.equal(recommend(routing).id, null);
    assert.equal(recommend(routing, { accountId: 'claude-1', allowUnknown: true }).id, null);
  }
  const consumer = await fakeBinary(f.base, 'verified-consumer', `console.log(JSON.stringify({loggedIn:true,authMethod:'claude.ai',subscriptionType:'max'}));`);
  const account = state.accounts.find(a => a.id === 'claude-1'), auth = await inspectAuth({ ...account, binary: consumer });
  assert.equal(auth.authenticated, true); assert.equal(auth.authError, null);
  const verified = { policy: { mode: 'balanced' }, runs: [], accounts: [{ ...account, ...auth, quota: null }] };
  assert.equal(recommend(verified).id, null); assert.equal(recommend(verified, { accountId: 'claude-1', allowUnknown: true }).id, 'claude-1');
});
test('CLI reinspects isolated Claude login and blocks ambient fallback before spawning sign-in', async t => {
  const f = await fixture(t), prefix = join(f.home, '.local/share/t3/providers/node_modules/.bin'); await mkdir(prefix, { recursive: true });
  const marker = join(f.base, 'native-login-was-started'), binary = join(prefix, 'claude');
  await writeFile(binary, `#!/usr/bin/env node\nimport fs from 'node:fs';const args=process.argv.slice(2);if(args.join(' ')==='auth status --json'){if(process.env.ANTHROPIC_API_KEY||process.env.CLAUDE_CODE_OAUTH_TOKEN)process.exitCode=1;else console.log(JSON.stringify({loggedIn:true,authMethod:'oauth_token'}));}else{fs.writeFileSync(${JSON.stringify(marker)},'should never start');}\n`, { mode: 0o755 });
  // Stale state looks eligible, proving login uses current native readback.
  await mutateState(f.root, s => Object.assign(s.accounts.find(a => a.id === 'claude-2'), { binary, authenticated: true, authKind: 'claude.ai', quota: quota() }));
  const cli = fileURLToPath(new URL('../bin/specweave-switch.mjs', import.meta.url));
  const result = await execute(process.execPath, [cli, 'account', 'login', 'claude-2'], { env: { ...process.env, HOME: f.home, SPECWEAVE_SWITCH_STATE: f.root, ANTHROPIC_API_KEY: 'synthetic-inherited-api', CLAUDE_CODE_OAUTH_TOKEN: 'synthetic-inherited-oauth' }, timeoutMs: 5000 });
  assert.equal(result.exitCode, 1); assert.match(result.stderr, /profile isolation is unverified/); assert.match(result.stderr, /claude-1/);
  await assert.rejects(access(marker), { code: 'ENOENT' });
  const state = await readState(f.root), target = state.accounts.find(a => a.id === 'claude-2');
  assert.equal(target.authenticated, null); assert.equal(target.authKind, 'oauth_token'); assert.equal(target.authError, 'profile-isolation-unverified');
  assert.equal(accountStatus(target), 'unknown'); assert.equal(recommend(state, { accountId: target.id, allowUnknown: true }).id, null);
  const manual = await execute(process.execPath, [cli, 'account', 'observe', target.id, '--quota', JSON.stringify({ window: { usedPercent: 0, resetsAt: Math.floor(Date.now() / 1000) + 3600 } })], { env: { ...process.env, HOME: f.home, SPECWEAVE_SWITCH_STATE: f.root }, timeoutMs: 5000 });
  assert.equal(manual.exitCode, 0); const observed = JSON.parse(manual.stdout).accounts.find(a => a.id === target.id);
  assert.equal(observed.status, 'unknown'); assert.equal(observed.authError, 'profile-isolation-unverified');
  assert.equal(recommend(await readState(f.root), { accountId: target.id, allowUnknown: true }).id, null);
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
