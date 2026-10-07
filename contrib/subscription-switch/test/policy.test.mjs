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
