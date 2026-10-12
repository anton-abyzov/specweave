import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, fakeBinary } from './helpers.mjs';
import { serve, readPeers } from '../lib/server.mjs';
import { normalizeClaudeUsage, claudeSubscriptionType, readClaudeUsage } from '../lib/native.mjs';
import { accountStatus, claudeSubscriptionAuthUnverified } from '../lib/policy.mjs';
import { mutateState } from '../lib/state.mjs';

const usage = (now, over = {}) => ({
  subscription_type: 'max', rate_limits_available: true,
  rate_limits: {
    five_hour: { utilization: 41, resets_at: new Date(now + 3600e3).toISOString(), locked_reason: null },
    seven_day: { utilization: 32, resets_at: new Date(now + 5 * 864e5).toISOString(), locked_reason: null },
    seven_day_opus: { utilization: 90, resets_at: new Date(now + 5 * 864e5).toISOString() },
    iguana_necktie: { utilization: 0, resets_at: new Date(now + 20 * 864e5).toISOString(), limit_dollars: 250 },
    seven_day_sonnet: null, extra_usage: { is_enabled: false }, limits: [],
    ...over,
  },
});

test('Claude get_usage maps to session and weekly windows; model weeklies never gate selection', () => {
  const now = Date.now(), quota = normalizeClaudeUsage(usage(now), now);
  assert.equal(quota.source, 'native-app-server');
  assert.deepEqual([quota.window.usedPercent, quota.window.windowDurationMins, quota.weekly.usedPercent], [41, 300, 32]);
  assert.equal(quota.window.resetsAt, Math.floor((now + 3600e3) / 1000));
  assert.deepEqual(quota.windows.map(w => [w.bucketId, w.appliesToSelection]), [['five_hour', true], ['seven_day', true], ['seven_day_opus', false]]);
  assert.equal(quota.denied, undefined);
  const locked = normalizeClaudeUsage(usage(now, { five_hour: { utilization: 100, resets_at: new Date(now + 60e3).toISOString(), locked_reason: 'rate_limited' } }), now);
  assert.equal(locked.denied, true);
  assert.equal(normalizeClaudeUsage({ rate_limits_available: false, rate_limits: {} }), null);
  const idle = normalizeClaudeUsage(usage(now, { five_hour: { utilization: 0, resets_at: null }, seven_day: { utilization: 0, resets_at: null } }), now);
  assert.deepEqual([idle.window.resetsAt, idle.weekly.resetsAt, idle.ordinaryUsageAllowed], [null, null, true]);
  assert.equal(accountStatus({ id: 'claude-1', provider: 'claude', nativeDefault: true, authenticated: true, authKind: 'claude.ai', quota: idle }, [], now), 'ready');
  assert.equal(normalizeClaudeUsage(usage(now, { five_hour: { utilization: null, resets_at: null } }), now), null, 'unreadable gating window');
  const seeded = usage(now); delete seeded.rate_limits.limits;
  assert.equal(normalizeClaudeUsage(seeded, now), null, 'cached snapshot is not a fresh observation');
  const over = normalizeClaudeUsage(usage(now, { seven_day: { utilization: 104, resets_at: new Date(now + 864e5).toISOString() } }), now);
  assert.deepEqual([over.weekly.usedPercent, over.denied, over.ordinaryUsageAllowed], [100, true, false]);
  const weeklyOnly = normalizeClaudeUsage(usage(now, { five_hour: null, seven_day: { utilization: 100, resets_at: new Date(now + 864e5).toISOString() } }), now);
  assert.equal(weeklyOnly.window, null); assert.equal(accountStatus({ id: 'claude-1', provider: 'claude', nativeDefault: true, authenticated: true, authKind: 'claude.ai', quota: weeklyOnly }, [], now), 'exhausted');
  // An idle session window (no reset yet) beside a spent week is a limit, not a stale read.
  const spentWeek = normalizeClaudeUsage(usage(now, { five_hour: { utilization: 0, resets_at: null }, seven_day: { utilization: 100, resets_at: new Date(now + 864e5).toISOString() } }), now);
  assert.equal(accountStatus({ id: 'claude-1', provider: 'claude', nativeDefault: true, authenticated: true, authKind: 'claude.ai', quota: spentWeek }, [], now), 'exhausted');
  assert.equal(claudeSubscriptionType(usage(now)), 'max');
  assert.equal(claudeSubscriptionType({ subscription_type: 'api' }), null);
});

test('a verified consumer plan on the default Claude profile becomes selectable; isolated slots stay locked', () => {
  const now = Date.now(), quota = normalizeClaudeUsage(usage(now), now);
  const token = { id: 'claude-1', provider: 'claude', nativeDefault: true, authenticated: true, authKind: 'oauth_token', authError: null, quota };
  assert.equal(claudeSubscriptionAuthUnverified(token), true);
  assert.equal(claudeSubscriptionAuthUnverified({ ...token, subscriptionType: 'max' }), false);
  assert.equal(accountStatus({ ...token, subscriptionType: 'max' }, [], now), 'ready');
  assert.equal(accountStatus({ ...token, id: 'claude-2', nativeDefault: false, subscriptionType: 'max' }, [], now), 'unknown');
});

test('Claude usage readback speaks the control protocol and sends no user message', async t => {
  const f = await fixture(t), log = join(f.base, 'stdin.log');
  const binary = await fakeBinary(f.base, 'claude', `
import fs from 'node:fs';
let buf = '';
process.stdin.on('data', d => {
  buf += d; fs.appendFileSync(${JSON.stringify(log)}, String(d));
  const lines = buf.split('\\n'); buf = lines.pop();
  for (const line of lines.filter(Boolean)) {
    const m = JSON.parse(line); if (m.type !== 'control_request') continue;
    const response = m.request.subtype === 'get_usage' ? ${JSON.stringify(usage(Date.now()))} : {};
    process.stdout.write(JSON.stringify({ type: 'control_response', response: { subtype: 'success', request_id: m.request_id, response } }) + '\\n');
  }
});`);
  const result = await readClaudeUsage({ provider: 'claude', id: 'claude-1', nativeDefault: true, binary }, 5000);
  assert.equal(result.error, null);
  assert.equal(result.data.subscription_type, 'max');
  const sent = (await readFile(log, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(sent.map(m => [m.type, m.request.subtype]), [['control_request', 'initialize'], ['control_request', 'get_usage']]);
  assert.equal(sent[1].request.skip_behaviors, true);
});

test('peers.json accepts only loopback tunnel origins', async t => {
  const f = await fixture(t);
  await writeFile(join(f.root, 'peers.json'), JSON.stringify({ self: 'M4 Max', peers: [
    { id: 'm1', label: 'M1 Max', url: 'http://127.0.0.1:18318' },
    { id: 'evil', url: 'http://evil.example:80' }, { id: 'tls', url: 'https://127.0.0.1:1' },
    { id: 'path', url: 'http://127.0.0.1:2/x' }, { id: 'local', url: 'http://127.0.0.1:3' }, { id: 'Bad Id', url: 'http://127.0.0.1:4' },
  ] }));
  assert.deepEqual(await readPeers(f.root), { self: 'M4 Max', peers: [{ id: 'm1', label: 'M1 Max', url: 'http://127.0.0.1:18318' }] });
});

test('fleet view merges peers, reports offline ones and fans out policy and select', async t => {
  const peer = await fixture(t), main = await fixture(t);
  const peerServer = await serve(peer.root, { port: 0, refreshState: async root => mutateState(root, () => {}) });
  t.after(() => new Promise(resolve => peerServer.close(resolve)));
  // The guard only admits the tunnel Host aliases, so expose the peer through one.
  const peerPort = peerServer.address().port;
  const { createServer, request } = await import('node:http');
  const tunnel = createServer((req, res) => {
    const forward = request({ host: '127.0.0.1', port: peerPort, path: req.url, method: req.method, headers: { ...req.headers, host: '127.0.0.1:18318', ...(req.headers.origin ? { origin: 'http://127.0.0.1:18318' } : {}) } }, up => { res.writeHead(up.statusCode, up.headers); up.pipe(res); });
    req.pipe(forward);
  });
  await new Promise(resolve => tunnel.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => tunnel.close(resolve)));
  await writeFile(join(main.root, 'peers.json'), JSON.stringify({ self: 'Main', peers: [
    { id: 'm1', label: 'M1 Max', url: `http://127.0.0.1:${tunnel.address().port}` }, { id: 'm3', label: 'M3', url: 'http://127.0.0.1:19' },
  ] }));
  let refreshed = 0;
  const server = await serve(main.root, { port: 0, refreshState: async root => { refreshed++; return mutateState(root, () => {}); } });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const view = await (await fetch(origin + '/api/fleet')).json();
  assert.deepEqual(view.hosts.map(h => [h.id, h.label, h.ok]), [['local', 'Main', true], ['m1', 'M1 Max', true], ['m3', 'M3', false]]);
  assert.equal(view.hosts[1].state.accounts.length, 7);
  assert.match(view.hosts[2].error, /Tunnel not connected|No answer/);
  const post = (path, payload) => fetch(origin + path, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const policy = await (await post('/api/fleet/policy', { mode: 'spend-first' })).json();
  assert.deepEqual(policy.hosts.filter(h => h.ok).map(h => h.state.policy.mode), ['spend-first', 'spend-first']);
  assert.deepEqual(policy.failures.map(f => f.id), ['m3']);
  const pinned = await (await post('/api/fleet/select', { host: 'm1', id: 'codex-2' })).json();
  assert.equal(pinned.hosts[1].state.policy.selectedAccount, 'codex-2');
  assert.equal(pinned.hosts[0].state.policy.selectedAccount, null);
  assert.equal((await post('/api/fleet/select', { host: 'nowhere', id: null })).status, 400);
  assert.equal((await post('/api/fleet/policy', { mode: 'spend-first', extra: 1 })).status, 400);
  await post('/api/fleet/refresh', {});
  assert.equal(refreshed, 1);
});

test('the dashboard refreshes itself on a timer and shares a running refresh', async t => {
  const f = await fixture(t);
  let calls = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  const server = await serve(f.root, { port: 0, autoRefreshMs: 60_000, refreshState: async root => { calls++; await gate; return mutateState(root, () => {}); } });
  t.after(() => new Promise(resolve => server.close(resolve)));
  await new Promise(resolve => setTimeout(resolve, 1200));
  assert.equal(calls, 1, 'stale state triggers a refresh shortly after start');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const view = await (await fetch(origin + '/api/fleet')).json();
  assert.equal(view.hosts[0].refreshing, true);
  const manual = fetch(origin + '/api/refresh', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{}' });
  release(); assert.equal((await manual).status, 200);
  assert.equal(calls, 1, 'a manual refresh joins the running one');
});
