import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DashboardServer } from '../../../../src/dashboard/server/dashboard-server.js';
import type { DashboardServerInstance } from '../../../../src/dashboard/server/dashboard-server.js';

function postJson(url: string, body: unknown): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try {
          resolve({ status: res.statusCode ?? 500, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode ?? 500, body: raw });
        }
      });
    });
    req.on('error', reject);
    req.end(data);
  });
}

function getJson(url: string): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    http.get({ hostname: parsed.hostname, port: parsed.port, path: parsed.pathname }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try {
          resolve({ status: res.statusCode ?? 500, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode ?? 500, body: raw });
        }
      });
    }).on('error', reject);
  });
}

describe('Hook Routes on DashboardServer', () => {
  let tmpDir: string;
  let server: DashboardServer;
  let instance: DashboardServerInstance;
  let baseUrl: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-routes-test-'));
    // Create .specweave structure
    fs.mkdirSync(path.join(tmpDir, '.specweave', 'state', 'hooks'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.specweave', 'logs'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), '{}');

    // Use a random high port to avoid conflicts
    const testPort = 18000 + Math.floor(Math.random() * 2000);
    server = new DashboardServer({ port: testPort, projectRoots: [tmpDir], openBrowser: false, hooksEnabled: true });
    instance = await server.start();
    baseUrl = `http://localhost:${testPort}`;
  });

  afterAll(async () => {
    await instance.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('POST /api/hooks/PostToolUse returns 200', async () => {
    const result = await postJson(`${baseUrl}/api/hooks/PostToolUse`, { sessionId: 's1', tool_name: 'Write' });
    expect(result.status).toBe(200);
  });

  it('POST /api/hooks/UnknownEvent returns 400', async () => {
    const result = await postJson(`${baseUrl}/api/hooks/UnknownEvent`, { sessionId: 's1' });
    expect(result.status).toBe(400);
    expect((result.body as { error: string }).error).toContain('Unknown event type');
  });

  it('GET /api/hooks/events returns stored events', async () => {
    await postJson(`${baseUrl}/api/hooks/PostToolUse`, { sessionId: 'query-test', tool_name: 'Read' });
    const result = await getJson(`${baseUrl}/api/hooks/events`);
    expect(result.status).toBe(200);
    const events = (result.body as { data: unknown[] }).data;
    expect(events.length).toBeGreaterThan(0);
  });

  it('GET /api/hooks/agents returns agents array', async () => {
    const result = await getJson(`${baseUrl}/api/hooks/agents`);
    expect(result.status).toBe(200);
    expect((result.body as { data: unknown[] }).data).toBeInstanceOf(Array);
  });

  it('GET /api/hooks/status returns stats', async () => {
    const result = await getJson(`${baseUrl}/api/hooks/status`);
    expect(result.status).toBe(200);
    const stats = (result.body as { data: { totalEvents: number } }).data;
    expect(stats).toHaveProperty('totalEvents');
    expect(stats).toHaveProperty('activeSessions');
    expect(stats).toHaveProperty('activeAgents');
  });

  it('responds within 500ms', async () => {
    const start = Date.now();
    await postJson(`${baseUrl}/api/hooks/PostToolUse`, { sessionId: 's2', tool_name: 'Bash' });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
