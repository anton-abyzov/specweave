import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { Router } from '../../../src/dashboard/server/router.js';
import { registerProjectHubRoutes } from '../../../src/dashboard/server/routes/project-hub-routes.js';

let root: string, server: http.Server, base: string;
const broadcast = vi.fn();
beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-hub-api-'));
  fs.mkdirSync(path.join(root, '.specweave'));
  fs.writeFileSync(path.join(root, '.specweave/config.json'), '{}');
  const router = new Router();
  registerProjectHubRoutes(router, req => req.url?.includes('project=missing') ? undefined : root, { broadcast } as any);
  server = http.createServer((req, res) => { void router.handle(req, res); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}/api/project-hub`;
});
afterEach(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
  fs.rmSync(root, { recursive: true, force: true });
  broadcast.mockClear();
});
async function request(endpoint = '', method = 'GET', body?: unknown) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, ...await response.json() as any };
}

describe('project hub API', () => {
  it('reads and edits project brief, rejecting stale and malformed requests', async () => {
    expect((await request()).data.hub.revision).toBe(0);
    const profile = { revision: 0, name: 'Studio', goal: 'Useful content', context: 'Primary sources' };
    expect((await request('', 'PATCH', profile)).data.revision).toBe(1);
    expect((await request('', 'PATCH', profile)).status).toBe(409);
    expect((await request('', 'PATCH', [])).status).toBe(400);
    expect((await request('?project=missing')).status).toBe(404);
    expect(broadcast).toHaveBeenCalledTimes(1);
  });
  it('creates work in the existing board and prepares a portable brief', async () => {
    const work = await request('/work', 'POST', { title: 'Research sources', summary: 'Deliver a report' });
    const brief = await request(`/brief?intent=${work.data.id}&harness=codex`);
    expect(brief.data.text).toContain('Research sources');
    expect(brief.data.text).toContain('does not start an agent');
    expect((await request()).data.work.items[0].id).toBe(work.data.id);
    expect((await request('/brief?intent=missing')).status).toBe(404);
    expect((await request('/brief?harness=unsupported')).status).toBe(400);
  });
  it('downloads registered files as attachments and rechecks paths', async () => {
    fs.writeFileSync(path.join(root, 'report.html'), '<script>alert(1)</script>');
    const saved = await request('/artifacts', 'POST', { revision: 0, title: 'Report', location: 'report.html' });
    const id = saved.data.artifacts[0].id;
    let response = await fetch(base + `/artifacts/${id}/download`);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('content-disposition')).toContain('attachment');
    expect(await response.text()).toContain('<script>');
    fs.unlinkSync(path.join(root, 'report.html'));
    fs.symlinkSync('/etc/hosts', path.join(root, 'report.html'));
    response = await fetch(base + `/artifacts/${id}/download`);
    expect(response.status).toBe(400);
    expect((await request(`/artifacts/${id}`, 'DELETE', { revision: 1 })).data.artifacts).toEqual([]);
    expect((await request(`/artifacts/${id}/download`)).status).toBe(404);
  });
  it('creates routine definitions and rejects missing work references', async () => {
    const saved = await request('/routines', 'POST', { revision: 0, title: 'Review', cadence: 'Weekly', instructions: 'Review primary sources' });
    const id = saved.data.routines[0].id;
    expect((await request(`/brief?routine=${id}`)).data.text).toContain('not an active schedule');
    expect((await request('/artifacts', 'POST', { revision: 1, title: 'X', location: 'https://example.com', intentId: 'missing' })).status).toBe(400);
    expect((await request(`/routines/${id}`, 'DELETE', { revision: 1 })).data.routines).toEqual([]);
  });
  it('reports corrupt hub state without silently resetting it', async () => {
    fs.mkdirSync(path.join(root, '.specweave/project'));
    fs.writeFileSync(path.join(root, '.specweave/project/hub.json'), 'broken');
    const response = await request();
    expect(response.status).toBe(409);
    expect(response.error).toContain('corrupt');
  });
});
