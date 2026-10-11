import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture } from './helpers.mjs';
import { serve } from '../lib/server.mjs';
import { request } from 'node:http';
test('loopback API rejects cross-origin/Host/schema/oversize and never exposes an exec route', async t => {
  const f = await fixture(t), publicDir = join(f.base, 'public'); await mkdir(publicDir); await writeFile(join(publicDir, 'index.html'), '<html>private companion</html>');
  await symlink(join(f.repo, 'main.txt'), join(publicDir, 'leak.js'));
  const server = await serve(f.root, { port: 0, publicDir }); t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const send = (path, payload, headers = {}) => fetch(origin + path, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) });
  const state = await (await fetch(origin + '/api/state')).json(); assert.equal(state.accounts.length, 7); assert.ok(!('binary' in state.accounts[0])); assert.ok(!('configDir' in state.accounts[0]));
  assert.equal((await send('/api/policy', { mode: 'reset-first' }, { origin: 'https://evil.example' })).status, 403);
  const invalidHost = await new Promise((resolve, reject) => {
    const req = request(origin + '/api/select', { method: 'POST', headers: { host: 'evil.example', origin, 'content-type': 'application/json' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject); req.end(JSON.stringify({ id: 'codex-1' }));
  });
  assert.equal(invalidHost, 403);
  assert.equal((await send('/api/policy', { mode: 'invalid' })).status, 400);
  assert.equal((await send('/api/policy', { mode: 'balanced', command: 'arbitrary' })).status, 400);
  assert.equal((await send('/api/select', { id: 'unknown' })).status, 400);
  assert.equal((await send('/api/run', { prompt: 'do things' })).status, 404);
  assert.equal((await send('/api/policy', { mode: 'balanced', large: 'x'.repeat(9000) })).status, 413);
  const policy = await (await send('/api/policy', { mode: 'spend-first' })).json(); assert.equal(policy.policy.mode, 'spend-first');
  const selected = await (await send('/api/select', { id: 'codex-2' })).json(); assert.equal(selected.policy.selectedAccount, 'codex-2'); assert.equal(selected.runs.length, 0);
  const automatic = await (await send('/api/select', { id: null })).json(); assert.equal(automatic.policy.selectedAccount, null);
  assert.equal((await fetch(origin + '/leak.js')).status, 403); assert.equal((await fetch(origin + '/')).status, 200);
});

test('dedicated SSH dashboard aliases require exact same-origin JSON and exclude other hosts/ports', async t => {
  const f = await fixture(t), publicDir = join(f.base, 'public'); await mkdir(publicDir); await writeFile(join(publicDir, 'index.html'), '<html>tunneled dashboard</html>');
  const server = await serve(f.root, { port: 0, publicDir }); t.after(() => new Promise(resolve => server.close(resolve)));
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  // node:http preserves the submitted Host so the guard is tested through the
  // actual HTTP parser, even though this fixture connects to an ephemeral port.
  const send = (host, origin, path = '/api/policy', payload = { mode: 'balanced' }, method = 'POST') => new Promise((resolve, reject) => {
    const headers = { host, 'content-type': 'application/json' }; if (origin !== undefined) headers.origin = origin;
    const req = request(endpoint + path, { method, headers }, res => {
      let data = ''; res.setEncoding('utf8'); res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject); req.end(method === 'POST' ? JSON.stringify(payload) : undefined);
  });
  for (const port of [18318, 28318]) {
    const host = `127.0.0.1:${port}`, origin = `http://${host}`;
    const page = await send(host, undefined, '/', undefined, 'GET'); assert.equal(page.status, 200); assert.match(page.data, /tunneled dashboard/);
    const state = await send(host, undefined, '/api/state', undefined, 'GET'); assert.equal(state.status, 200); assert.equal(JSON.parse(state.data).accounts.length, 7);
    const changed = await send(host, origin, '/api/policy', { mode: 'reset-first' }); assert.equal(changed.status, 200); assert.equal(JSON.parse(changed.data).policy.mode, 'reset-first');
    for (const invalidOrigin of ['https://evil.example', endpoint, `http://127.0.0.1:${port === 18318 ? 28318 : 18318}`, `http://localhost:${port}`, undefined]) {
      assert.equal((await send(host, invalidOrigin)).status, 403);
    }
    assert.equal((await send(host, origin, '/api/run', { prompt: 'execute' })).status, 404);
  }
  for (const host of ['127.0.0.1:18319', '127.0.0.1:28319', '127.0.0.1:8319', 'localhost:18318', 'worker.local:18318', 'evil.example:28318', '[::1]:28318']) {
    assert.equal((await send(host, `http://${host}`)).status, 403);
    assert.equal((await send(host, undefined, '/api/state', undefined, 'GET')).status, 403);
  }
});
