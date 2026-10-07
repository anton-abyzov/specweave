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
  assert.equal((await fetch(origin + '/leak.js')).status, 403); assert.equal((await fetch(origin + '/')).status, 200);
});
