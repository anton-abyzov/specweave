import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureState, mutateState } from './state.mjs';
import { publicState, setPolicy, selectAccount } from './policy.mjs';
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
export async function serve(root, { port = 8318, publicDir = defaultPublic, refreshState = refresh } = {}) {
  await ensureState(root);
  let refreshing = false;
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    const json = (status, value) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
    try {
      guarded(req, server.address().port, req.method !== 'GET');
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/api/state' && req.method === 'GET') { json(200, publicState(await ensureState(root))); return; }
      if (req.method === 'POST' && ['/api/refresh', '/api/policy', '/api/select'].includes(url.pathname)) {
        const value = await body(req); let state;
        if (url.pathname === '/api/refresh') {
          if (Object.keys(value).length) throw fail(400, 'Refresh accepts an empty object');
          if (refreshing) throw fail(409, 'Refresh already running');
          refreshing = true; try { state = await refreshState(root); } finally { refreshing = false; }
        } else state = await mutateState(root, s => url.pathname === '/api/policy' ? setPolicy(s, value) : selectAccount(s, value));
        json(200, publicState(state)); return;
      }
      if (url.pathname.startsWith('/api/')) throw fail(404, 'Unknown endpoint');
      if (req.method !== 'GET') throw fail(405, 'Method not allowed');
      const pathname = decodeURIComponent(url.pathname);
      const base = await realpath(publicDir), target = resolve(base, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!target.startsWith(base + sep)) throw fail(403, 'Unsafe asset path');
      const actual = await realpath(target);
      if (actual !== target) throw fail(403, 'Symlink assets denied');
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
      if (!types[extname(target)]) throw fail(404, 'Asset type unavailable');
      const data = await readFile(target); if (data.length > 2 * 1024 * 1024) throw fail(413, 'Asset too large');
      res.writeHead(200, { 'content-type': types[extname(target)] }); res.end(data);
    } catch (error) { json(error.status || (error.code === 'ENOENT' ? 404 : 400), { error: redact(error.message) }); }
  });
  server.requestTimeout = 35000; server.headersTimeout = 10000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}
