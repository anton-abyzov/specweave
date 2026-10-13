import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, fakeBinary } from './helpers.mjs';
import { normalizeCopilot, readCopilot, readProxyAccounts } from '../lib/providers.mjs';
import { mergeProviders } from '../lib/server.mjs';
import { normalizeClaudeUsage, normalizeCodexQuota } from '../lib/native.mjs';

const snap = (entitlement, remaining, extra = {}) => ({ entitlement, quota_remaining: remaining, remaining: Math.floor(remaining), unlimited: false, has_quota: entitlement > 0, ...extra });
const business = { login: 'abycrash', copilot_plan: 'business', organization_login_list: ['Crash-Champions'], quota_reset_date_utc: '2026-11-01T00:00:00.000Z',
  quota_snapshots: { chat: { unlimited: true, entitlement: 0 }, premium_interactions: snap(175000, 174000.5, { overage_permitted: true }) } };
const free = { login: 'anton-abyzov', copilot_plan: 'individual', quota_reset_date_utc: '2026-11-01T00:00:00.000Z',
  quota_snapshots: { chat: snap(200, 198.2), premium_interactions: snap(0, 0) } };

test('Copilot paid plans meter AI credits, Free meters chat, from the fractional remainder', () => {
  const at = '2026-10-12T17:00:00.000Z';
  const paid = normalizeCopilot(business, { observedAt: at, source: 'live' });
  assert.deepEqual([paid.id, paid.plan, paid.org, paid.meter.name, paid.meter.used, paid.meter.entitlement, paid.meter.overagePermitted, paid.resetsAt],
    ['copilot:abycrash', 'business', 'Crash-Champions', 'AI credits', 999.5, 175000, true, '2026-11-01T00:00:00.000Z']);
  const chat = normalizeCopilot(free, { observedAt: at, source: 'live' });
  assert.equal(chat.meter.name, 'Chat credits'); assert.ok(Math.abs(chat.meter.used - 1.8) < 1e-9);
  assert.equal(normalizeCopilot({ login: 'x y' }, { observedAt: at, source: 'live' }), null);
  assert.equal(normalizeCopilot({ login: 'unl', quota_snapshots: { chat: { unlimited: true } } }, { observedAt: at, source: 'live' }).meter, null);
});

test('Copilot reads every gh login live, falls back to the CLI cache with its age, and never keeps the token', async t => {
  const f = await fixture(t);
  const gh = await fakeBinary(f.base, 'gh', `
const a = process.argv.slice(2).join(' ');
if (a === 'auth status --json hosts') console.log(JSON.stringify({ hosts: { 'github.com': [{ login: 'anton-abyzov', state: 'success' }, { login: 'broken', state: 'timeout' }] } }));
else if (a === 'auth token -u anton-abyzov') console.log('gho_' + 'a'.repeat(36));`);
  await mkdir(join(f.home, 'Library/Caches/copilot'), { recursive: true }); await mkdir(join(f.home, '.copilot'), { recursive: true });
  await writeFile(join(f.home, 'Library/Caches/copilot/copilot-user-cache.json'), `// written by Copilot CLI\n${JSON.stringify({ copilotUserCache: {
    a: { retrievedAt: '2026-10-12T16:29:01.517Z', response: business }, b: { retrievedAt: '2026-10-11T03:40:00.173Z', response: free } } })}`);
  await writeFile(join(f.home, '.copilot/config.json'), '// comment\n{"lastLoggedInUser":{"host":"https://github.com","login":"abycrash"}}');
  const seen = [];
  const fetchImpl = async (url, init) => { seen.push([url, init.headers.authorization]); return new Response(JSON.stringify(free), { status: 200 }); };
  const rows = await readCopilot({ home: f.home, gh, fetchImpl });
  assert.deepEqual(seen, [['https://api.github.com/copilot_internal/user', `token gho_${'a'.repeat(36)}`]]);
  assert.deepEqual(rows.map(r => [r.login, r.source, r.cliActive]), [['anton-abyzov', 'live', false], ['abycrash', 'copilot-cli-cache', true]]);
  assert.equal(rows[1].observedAt, '2026-10-12T16:29:01.517Z');
  assert.ok(!JSON.stringify(rows).includes('gho_'));
  assert.deepEqual(await readCopilot({ home: join(f.base, 'empty'), gh: null }), []);
});

test('the proxy reports its signed-in accounts, not just an open port', async t => {
  const f = await fixture(t);
  assert.equal(await readProxyAccounts({ home: f.home, fetchImpl: async () => { throw new Error('unused'); } }), null);
  await mkdir(join(f.home, '.local/share/specweave/proxy/secrets'), { recursive: true });
  await writeFile(join(f.home, '.local/share/specweave/proxy/secrets/management-key.txt'), 'k'.repeat(48) + '\n');
  let auth;
  const count = await readProxyAccounts({ home: f.home, fetchImpl: async (url, init) => { auth = [url, init.headers.authorization]; return new Response('{"files":[{"name":"a.json"},{"name":"b.json"}]}'); } });
  assert.equal(count, 2); assert.deepEqual(auth, ['http://127.0.0.1:8317/v0/management/auth-files', `Bearer ${'k'.repeat(48)}`]);
  assert.equal(await readProxyAccounts({ home: f.home, fetchImpl: async () => new Response('nope', { status: 401 }) }), null);
});

test('one Copilot account read on several Macs is listed once, live reading first', () => {
  const row = (source, at, cliActive = false) => ({ id: 'copilot:abycrash', provider: 'copilot', login: 'abycrash', source, observedAt: at, cliActive });
  const merged = mergeProviders([
    { label: 'M4', ok: true, state: { providers: [row('copilot-cli-cache', '2026-10-12T17:00:00Z', true)] } },
    { label: 'M1', ok: true, state: { providers: [row('live', '2026-10-12T16:00:00Z')] } },
    { label: 'M3', ok: false },
  ]);
  assert.deepEqual(merged.map(r => [r.host, r.source, r.cliActive]), [['M1', 'live', true]]);
});

test('Codex keeps a ten-place credit balance; Claude keeps extra usage and per-model weeklies only', () => {
  const codex = normalizeCodexQuota({ rateLimits: { primary: null, secondary: { usedPercent: 83, resetsAt: 2e9, windowDurationMins: 10080 },
    credits: { hasCredits: true, unlimited: false, balance: '46483.3029020000' } } });
  assert.equal(codex.credits.balance, '46483.3029020000');
  const now = Date.now(), at = new Date(now + 864e5).toISOString();
  const quota = normalizeClaudeUsage({ rate_limits_available: true, rate_limits: {
    five_hour: { utilization: 7, resets_at: at }, seven_day: { utilization: 40, resets_at: at },
    seven_day_opus: { utilization: 12, resets_at: at }, seven_day_oauth_apps: { utilization: 50, resets_at: at }, seven_day_cowork: { utilization: 1, resets_at: at },
    model_scoped: [{ display_name: 'Fable', utilization: 7, resets_at: at }, { display_name: '', utilization: 1, resets_at: at }],
    extra_usage: { is_enabled: true, used_credits: 1250, monthly_limit: 5000, currency: 'USD', decimal_places: 2, spend_limit_reached: false },
    limits: [],
  } }, now);
  assert.deepEqual(quota.windows.filter(w => !w.appliesToSelection).map(w => [w.label, w.usedPercent]), [['Opus', 12], ['Fable', 7]]);
  assert.deepEqual(quota.extraUsage, { used: 12.5, limit: 50, currency: 'USD', limitReached: false });
  const off = normalizeClaudeUsage({ rate_limits_available: true, rate_limits: { five_hour: { utilization: 1, resets_at: at }, seven_day: { utilization: 1, resets_at: at }, extra_usage: { is_enabled: false }, limits: [] } }, now);
  assert.equal(off.extraUsage, undefined);
});
