import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep, join } from 'node:path';
import { hostname } from 'node:os';
import { fileURLToPath } from 'node:url';
import { ensureState, mutateState, readState } from './state.mjs';
import { publicState, setPolicy, selectAccount, MODES } from './policy.mjs';
import { refresh } from './native.mjs';
import { redact } from './util.mjs';
const defaultPublic = fileURLToPath(new URL('../public/', import.meta.url));
function fail(status, message) { return Object.assign(new Error(message), { status }); }
function guarded(req, port, mutation = false) {
  const host = req.headers.host;
  // Dedicated pinned SSH dashboard tunnels use these two M4 loopback ports.
  // Keep an explicit host list; mutations still require this exact Host origin.
  const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`, '127.0.0.1:18318', '127.0.0.1:28318'];
  if (!allowedHosts.includes(host)) throw fail(403, 'Invalid loopback Host');
  if (mutation && (req.headers.origin !== `http://${host}` || !/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || ''))) throw fail(403, 'Mutation requires same-origin JSON');
}
async function body(req) {
  let bytes = 0, data = '';
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 8192) throw fail(413, 'JSON request exceeds 8 KiB'); data += chunk.toString(); }
  try { const value = JSON.parse(data || '{}'); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; }
  catch { throw fail(400, 'Invalid JSON object'); }
}
export const AUTO_REFRESH_MS = 10 * 60 * 1000;
// Peers are other Macs' Switch dashboards reached through loopback SSH tunnels
// this Mac already owns. Only plain http://127.0.0.1:PORT origins are accepted.
export async function readPeers(root) {
  let raw;
  try { raw = JSON.parse(await readFile(join(root, 'peers.json'), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return { self: null, peers: [] }; throw fail(500, 'peers.json is unreadable; fix or remove it'); }
  const self = typeof raw?.self === 'string' && raw.self.length <= 40 ? raw.self : null;
  const peers = (Array.isArray(raw?.peers) ? raw.peers : []).slice(0, 16).flatMap(peer => {
    const match = typeof peer?.url === 'string' && /^http:\/\/127\.0\.0\.1:(\d{2,5})$/.exec(peer.url);
    if (!match || !/^[a-z0-9-]{1,32}$/.test(peer.id || '') || peer.id === 'local' || Number(match[1]) > 65535) return [];
    return [{ id: peer.id, label: typeof peer.label === 'string' ? peer.label.slice(0, 40) : peer.id, url: peer.url }];
  });
  return { self, peers };
}
async function peerCall(peer, path, payload, timeoutMs = 4000) {
  const init = payload === undefined ? {} : { method: 'POST', headers: { origin: peer.url, 'content-type': 'application/json' }, body: JSON.stringify(payload) };
  const response = await fetch(peer.url + path, { ...init, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
  const text = await response.text();
  if (text.length > 512 * 1024) throw new Error('Peer response too large');
  const value = JSON.parse(text);
  if (!response.ok) throw new Error(typeof value?.error === 'string' ? value.error : `HTTP ${response.status}`);
  if (!Array.isArray(value?.accounts) || !value.policy) throw new Error('Peer did not return Switch state');
  return value;
}
const peerError = error => error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'No answer (tunnel or Mac offline)'
  : /ECONNREFUSED|fetch failed/.test(`${error?.message} ${error?.cause?.code}`) ? 'Tunnel not connected' : redact(String(error?.message || error)).slice(0, 160);
export function lastObservedAt(state) {
  const times = (state.accounts || []).map(a => Date.parse(a.quota?.observedAt || a.authObservedAt || '')).filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

export async function serve(root, { port = 8318, publicDir = defaultPublic, refreshState = refresh, autoRefreshMs = 0 } = {}) {
  await ensureState(root);
  let refreshing = null, lastRefreshAt = null, lastRefreshError = null;
  // One refresh at a time; callers share the running one instead of failing.
  const runRefresh = () => refreshing || (refreshing = (async () => {
    try { const state = await refreshState(root); lastRefreshError = null; return state; }
    catch (error) { lastRefreshError = redact(error.message); throw error; }
    finally { lastRefreshAt = new Date().toISOString(); refreshing = null; }
  })());
  let timer = null;
  if (autoRefreshMs > 0) {
    const tick = () => { runRefresh().catch(() => {}); };
    const state = await readState(root).catch(() => null), observed = Date.parse(state ? lastObservedAt(state) : '');
    if (!Number.isFinite(observed) || Date.now() - observed > autoRefreshMs) setTimeout(tick, 1000).unref();
    timer = setInterval(tick, autoRefreshMs); timer.unref();
  }
  const local = async () => {
    const [{ self }, state] = await Promise.all([readPeers(root), ensureState(root)]);
    return { id: 'local', label: self || state.hosts?.find(h => h.role === 'main' || h.role === 'local')?.label || hostname(), local: true, ok: true,
      refreshing: !!refreshing, lastRefreshAt, lastRefreshError, state: publicState(state) };
  };
  const fleet = async () => {
    const { peers } = await readPeers(root);
    const remote = await Promise.all(peers.map(async peer => {
      try { return { id: peer.id, label: peer.label, local: false, ok: true, state: await peerCall(peer, '/api/state') }; }
      catch (error) { return { id: peer.id, label: peer.label, local: false, ok: false, error: peerError(error) }; }
    }));
    return { checkedAt: new Date().toISOString(), autoRefreshMinutes: autoRefreshMs > 0 ? Math.round(autoRefreshMs / 60000) : null, hosts: [await local(), ...remote] };
  };
  const forPeers = async (fn) => {
    const { peers } = await readPeers(root);
    return Promise.all(peers.map(peer => fn(peer).then(() => null, error => ({ id: peer.id, error: peerError(error) }))));
  };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    const json = (status, value) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
    try {
      guarded(req, server.address().port, req.method !== 'GET');
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/api/state' && req.method === 'GET') { json(200, publicState(await ensureState(root))); return; }
      if (url.pathname === '/api/fleet' && req.method === 'GET') { json(200, await fleet()); return; }
      if (req.method === 'POST' && ['/api/refresh', '/api/policy', '/api/select'].includes(url.pathname)) {
        const value = await body(req); let state;
        if (url.pathname === '/api/refresh') {
          if (Object.keys(value).length) throw fail(400, 'Refresh accepts an empty object');
          state = await runRefresh();
        } else state = await mutateState(root, s => url.pathname === '/api/policy' ? setPolicy(s, value) : selectAccount(s, value));
        json(200, publicState(state)); return;
      }
      if (req.method === 'POST' && ['/api/fleet/refresh', '/api/fleet/policy', '/api/fleet/select'].includes(url.pathname)) {
        const value = await body(req); let failures = [];
        if (url.pathname === '/api/fleet/refresh') {
          if (Object.keys(value).length) throw fail(400, 'Refresh accepts an empty object');
          [failures] = await Promise.all([forPeers(peer => peerCall(peer, '/api/refresh', {}, 60000)), runRefresh()]);
        } else if (url.pathname === '/api/fleet/policy') {
          // The same policy applies on every Mac; each Mac still picks among its own accounts.
          if (!value || Object.keys(value).some(k => k !== 'mode') || !MODES.includes(value.mode)) throw fail(400, 'Invalid policy; use balanced, reset-first or spend-first');
          await mutateState(root, s => setPolicy(s, { mode: value.mode }));
          failures = await forPeers(peer => peerCall(peer, '/api/policy', { mode: value.mode }));
        } else {
          if (!value || Object.keys(value).some(k => !['host', 'id'].includes(k)) || typeof value.host !== 'string') throw fail(400, 'Select needs host and id');
          if (value.host === 'local') await mutateState(root, s => selectAccount(s, { id: value.id ?? null }));
          else {
            const peer = (await readPeers(root)).peers.find(p => p.id === value.host); if (!peer) throw fail(400, 'Unknown Mac');
            await peerCall(peer, '/api/select', { id: value.id ?? null });
          }
        }
        json(200, { ...(await fleet()), failures: failures.filter(Boolean) }); return;
      }
      if (url.pathname.startsWith('/api/')) throw fail(404, 'Unknown endpoint');
      if (req.method !== 'GET') throw fail(405, 'Method not allowed');
      const pathname = decodeURIComponent(url.pathname);
      const base = await realpath(publicDir), target = resolve(base, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!target.startsWith(base + sep)) throw fail(403, 'Unsafe asset path');
      const actual = await realpath(target);
      if (actual !== target) throw fail(403, 'Symlink assets denied');
      const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
      if (!types[extname(target)]) throw fail(404, 'Asset type unavailable');
      const data = await readFile(target); if (data.length > 2 * 1024 * 1024) throw fail(413, 'Asset too large');
      res.writeHead(200, { 'content-type': types[extname(target)] }); res.end(data);
    } catch (error) { json(error.status || (error.code === 'ENOENT' ? 404 : 400), { error: redact(error.message) }); }
  });
  server.requestTimeout = 35000; server.headersTimeout = 10000;
  server.on('close', () => clearInterval(timer));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}
