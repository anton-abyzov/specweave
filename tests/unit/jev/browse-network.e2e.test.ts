import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { describe, expect, it } from 'vitest';
import { runBrowse } from '../../../src/core/jev/browse.js';
import type { JevClient } from '../../../src/core/jev/client.js';

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  return (server.address() as { port: number }).port;
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

// Excluded by vitest.unit.config.ts: this check requires installed headless Chromium.
describe('headless document navigation boundary', () => {
  it('blocks cross-host redirects before excluded host receives a request', async () => {
    let excludedHits = 0;
    const excluded = createServer((_req, res) => { excludedHits++; res.end('Excluded'); });
    const excludedPort = await listen(excluded);
    const allowed = createServer((_req, res) => { res.writeHead(302, { Location: `http://localhost:${excludedPort}/target` }); res.end(); });
    const allowedPort = await listen(allowed);
    const shots = mkdtempSync(join(tmpdir(), 'jev-network-'));
    try {
      const result = await runBrowse({
        goal: 'Read landing page', url: `http://127.0.0.1:${allowedPort}/`, allowDomains: ['127.0.0.1'],
        client: { ask: async () => { throw new Error('No model request should happen'); } } as unknown as JevClient,
        playwright: { chromium }, screenshotDir: shots,
      });
      expect(result.status).toBe('blocked');
      expect(excludedHits).toBe(0);
    } finally {
      await close(allowed); await close(excluded); rmSync(shots, { recursive: true });
    }
  }, 15000);

  it('permits same-host redirects and leaves subresources available', async () => {
    let assetHits = 0;
    const assets = createServer((_req, res) => { assetHits++; res.setHeader('Content-Type', 'text/css'); res.end('body { color: green }'); });
    const assetPort = await listen(assets);
    const allowed = createServer((req, res) => {
      if (req.url === '/') { res.writeHead(302, { Location: '/landing' }); res.end(); return; }
      res.setHeader('Content-Type', 'text/html'); res.end(`<link rel="stylesheet" href="http://localhost:${assetPort}/style.css"><h1>Reached landing page</h1>`);
    });
    const port = await listen(allowed);
    const shots = mkdtempSync(join(tmpdir(), 'jev-network-'));
    try {
      const result = await runBrowse({
        goal: 'Read landing page', url: `http://127.0.0.1:${port}/`, allowDomains: ['127.0.0.1'],
        client: { ask: async () => ({ answers: { next: { type: 'choice', choice: 'DONE', confidence: 1 }, goal_reached: { type: 'noul', noul: 1 } }, usage: {}, latencyMs: 0 }) } as unknown as JevClient,
        playwright: { chromium }, screenshotDir: shots,
      });
      expect(result.status).toBe('done');
      expect(result.url).toContain('/landing');
      expect(assetHits).toBeGreaterThan(0);
    } finally {
      await close(allowed); await close(assets); rmSync(shots, { recursive: true });
    }
  }, 15000);
});
