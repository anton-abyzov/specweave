import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, quota } from './helpers.mjs';
import { readState, initState, profiles } from '../lib/state.mjs';
import { accountStatus, recommend, setPolicy, validateQuota, selectAccount } from '../lib/policy.mjs';
test('init creates seven distinct nonsecret slots and preserves native auth/config', async t => {
  const f = await fixture(t); const native = join(f.home, '.codex'); await mkdir(native); await writeFile(join(native, 'config.toml'), 'keep-current-config');
  const state = await initState(f.root, f.home);
  assert.equal(state.accounts.length, 7); assert.equal(new Set(state.accounts.map(a => a.configDir)).size, 7);
  assert.equal(state.accounts[0].configDir, native); assert.equal(state.accounts.find(a => a.id === 'claude-1').configDir, join(f.home, '.claude'));
  assert.equal(await readFile(join(native, 'config.toml'), 'utf8'), 'keep-current-config');
  assert.ok(state.accounts.every(a => a.quota === null && a.authenticated === null));
  assert.equal(profiles(f.home).length, 7);
});
test('selection excludes auth-required, exhausted, stale, active and unknown', () => {
  const now = Date.now(), make = (id, authenticated, q) => ({ id, provider: 'codex', authenticated, quota: q });
  const stale = quota({ now: now - 20 * 60000 });
  const state = { policy: { mode: 'balanced' }, runs: [{ accountId: 'busy', status: 'running' }], accounts: [make('auth', false, quota()), make('full', true, quota({ used: 100 })), make('old', true, stale), make('busy', true, quota()), make('unknown', true, null), make('good', true, quota())] };
  assert.equal(recommend(state).id, 'good'); assert.equal(recommend(state, { accountId: 'unknown' }).id, null);
  assert.equal(recommend(state, { allowUnknown: true }).id, 'good');
  assert.equal(recommend(state, { accountId: 'unknown', allowUnknown: true }).id, 'unknown');
  assert.equal(accountStatus(state.accounts[0], state.runs), 'auth-required'); assert.equal(accountStatus(state.accounts[1]), 'exhausted'); assert.equal(accountStatus(state.accounts[2]), 'stale');
  assert.equal(accountStatus({ ...make('reset-passed', true, quota()), quota: quota({ reset: -1 }) }), 'stale');
  assert.equal(accountStatus({ ...make('failed', true, null), lastQuotaErrorAt: new Date(now).toISOString() }), 'exhausted');
});
test('three deterministic policies and provider preference choose different eligible slots', () => {
  const state = { policy: { mode: 'balanced' }, runs: [], accounts: [
    { id: 'low', provider: 'codex', authenticated: true, quota: quota({ used: 10, weekly: 10, reset: 7200 }) },
    { id: 'soon', provider: 'codex', authenticated: true, quota: quota({ used: 30, reset: 1000 }) },
    { id: 'spent', provider: 'claude', authenticated: true, quota: quota({ used: 90, reset: 3000 }) },
  ] };
  assert.equal(recommend(state).id, 'low'); setPolicy(state, { mode: 'reset-first' }); assert.equal(recommend(state).id, 'soon');
  setPolicy(state, { mode: 'spend-first' }); assert.equal(recommend(state).id, 'spent');
  setPolicy(state, { mode: 'spend-first', preferredProvider: 'codex' }); assert.equal(recommend(state).id, 'soon');
  assert.throws(() => setPolicy(state, { mode: 'arbitrary' }), /Invalid policy/);
  assert.throws(() => validateQuota({ ...quota(), window: { usedPercent: -1, resetsAt: 123 } }), /percentage/);
});
test('explicit selection can return to automatic; corrupt/error/stale quota never becomes eligible', () => {
  const now = Date.now(), a = { id: 'a', provider: 'codex', authenticated: true, quota: quota({ used: 90, weekly: 90 }) }, b = { id: 'b', provider: 'codex', authenticated: true, quota: quota({ used: 10, weekly: 10 }) };
  const state = { policy: { mode: 'balanced' }, runs: [], accounts: [a, b] };
  selectAccount(state, { id: 'a' }); assert.equal(recommend(state).id, 'a'); selectAccount(state, { id: null }); assert.equal(recommend(state).id, 'b');
  a.lastQuotaErrorAt = new Date(now + 1).toISOString(); assert.equal(accountStatus(a), 'exhausted');
  a.quota = quota({ now: now + 2, used: -1 }); assert.equal(accountStatus(a), 'stale');
  a.quota = quota({ now: now - 20 * 60000 }); assert.equal(accountStatus(a), 'exhausted');
  a.lastQuotaErrorAt = 'invalid'; a.quota = quota(); assert.equal(accountStatus(a), 'stale');
  b.authKind = 'api_key'; assert.equal(accountStatus(b), 'auth-required'); assert.equal(recommend(state).id, null);
});
test('stale positive legacy Claude slot state cannot regain eligibility from manual quota or allow-unknown', () => {
  const state = { policy: { mode: 'balanced' }, runs: [], accounts: ['claude-1', 'claude-2', 'claude-3'].map(id => ({ id, provider: 'claude', nativeDefault: id === 'claude-1', authenticated: true, authKind: 'oauth_token', quota: quota({ used: 0, weekly: 0 }) })) };
  assert.equal(recommend(state).id, null);
  for (const account of state.accounts) {
    assert.equal(accountStatus(account), 'unknown');
    assert.equal(recommend(state, { accountId: account.id, allowUnknown: true }).id, null);
    account.quota = null;
    assert.equal(recommend(state, { accountId: account.id, allowUnknown: true }).id, null);
  }
  const flagged = { id: 'claude-4', provider: 'claude', authenticated: true, authKind: 'claude.ai', authError: 'profile-isolation-unverified', quota: quota() };
  state.accounts.push(flagged); assert.equal(accountStatus(flagged), 'unknown'); assert.equal(recommend(state, { accountId: flagged.id, allowUnknown: true }).id, null);
});

test('only fresh native permission overrides a full included window; denials, old failures and resets stay fenced', () => {
  const now = Date.now(), make = extras => ({ id: 'a', provider: 'codex', authenticated: true, quota: { ...quota({ now, used: 100, weekly: 100 }), ...extras } });
  const allowed = make({ source: 'native-app-server', ordinaryUsageAllowed: true });
  assert.equal(accountStatus(allowed, [], now), 'ready');
  assert.equal(accountStatus(make({ source: 'manual', ordinaryUsageAllowed: true }), [], now), 'exhausted');
  for (const refusal of [{ denied: true }, { ordinaryUsageAllowed: false }, { spendControlReached: true }]) {
    assert.equal(accountStatus(make({ source: 'native-app-server', ordinaryUsageAllowed: true, credits: { hasCredits: true, unlimited: true }, ...refusal }), [], now), 'exhausted');
  }
  assert.equal(accountStatus({ ...allowed, lastQuotaErrorAt: new Date(now+1).toISOString() }, [], now), 'exhausted');
  assert.equal(accountStatus(make({ source: 'native-app-server', ordinaryUsageAllowed: true, expiresAt: new Date(now-1).toISOString() }), [], now), 'stale');
  assert.equal(accountStatus(make({ source: 'native-app-server', ordinaryUsageAllowed: true, window: { usedPercent: 100, resetsAt: now/1000-1 } }), [], now), 'stale');
  assert.equal(accountStatus(make({ source: 'native-app-server', credits: { hasCredits: true, unlimited: true }, resetCredits: { availableCount: 2 } }), [], now), 'exhausted');
  assert.equal(accountStatus(make({ source: 'native-app-server', window: null, weekly: null, ordinaryUsageAllowed: true }), [], now), 'ready');
  assert.equal(accountStatus(make({ source: 'native-app-server', window: null, weekly: null, credits: { hasCredits: true, unlimited: true } }), [], now), 'unknown');
  // OpenAI's app-server usage fixture permits ordinary work while carrying this limit explanation.
  assert.equal(accountStatus(make({ source: 'native-app-server', ordinaryUsageAllowed: true, spendControlReached: false, rateLimitReachedType: 'workspace_member_usage_limit_reached' }), [], now), 'ready');
  assert.equal(accountStatus(make({ source: 'native-app-server', ordinaryUsageAllowed: null, rateLimitReachedType: 'workspace_member_usage_limit_reached' }), [], now), 'exhausted');
});
