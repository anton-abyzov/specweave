import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DashboardServer } from '../../../../src/dashboard/server/dashboard-server.js';
import type { DashboardServerInstance } from '../../../../src/dashboard/server/dashboard-server.js';
import { generateHooksSettings } from '../../../../src/hooks/generate-settings.js';
import { HookEventStore } from '../../../../src/dashboard/server/hooks/hook-event-store.js';

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

describe('E2E Hook Flow', () => {
  let tmpDir: string;
  let server: DashboardServer;
  let instance: DashboardServerInstance;
  let testPort: number;
  let baseUrl: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-hook-flow-'));
    fs.mkdirSync(path.join(tmpDir, '.specweave', 'state', 'hooks'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.specweave', 'logs'), { recursive: true });
    // Write config with httpMode true
    fs.writeFileSync(
      path.join(tmpDir, '.specweave', 'config.json'),
      JSON.stringify({ hooks: { httpMode: true } }),
    );

    testPort = 18100 + Math.floor(Math.random() * 1900);
    server = new DashboardServer({
      port: testPort,
      projectRoots: [tmpDir],
      openBrowser: false,
      hooksEnabled: true,
    });
    instance = await server.start();
    baseUrl = `http://localhost:${testPort}`;
  });

  afterAll(async () => {
    await instance.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('full flow: POST events → GET events returns them', async () => {
    // POST a PreToolUse event
    const r1 = await postJson(`${baseUrl}/api/hooks/PreToolUse`, {
      sessionId: 'e2e-session',
      tool_name: 'Read',
      tool_input: { file_path: '/test.ts' },
    });
    expect(r1.status).toBe(200);
    const output = (r1.body as Record<string, unknown>).hookSpecificOutput as Record<string, string>;
    expect(output.permissionDecision).toBe('allow');

    // POST a PostToolUse event
    const r2 = await postJson(`${baseUrl}/api/hooks/PostToolUse`, {
      sessionId: 'e2e-session',
      tool_name: 'Read',
    });
    expect(r2.status).toBe(200);

    // GET events and verify both are present
    const eventsResult = await getJson(`${baseUrl}/api/hooks/events`);
    expect(eventsResult.status).toBe(200);
    const events = (eventsResult.body as { data: { eventName: string }[] }).data;
    const sessionEvents = events.filter(e =>
      e.eventName === 'PreToolUse' || e.eventName === 'PostToolUse',
    );
    expect(sessionEvents.length).toBeGreaterThanOrEqual(2);
  });

  it('bash system untouched when httpMode false', () => {
    // Config with httpMode false should produce empty settings
    const result = generateHooksSettings({ projectRoot: tmpDir, port: testPort });
    // We already wrote httpMode: true to config, so generate a fresh one with false
    const fakeTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bash-test-'));
    fs.mkdirSync(path.join(fakeTmp, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(fakeTmp, '.specweave', 'config.json'), JSON.stringify({ hooks: { httpMode: false } }));
    const falseResult = generateHooksSettings({ projectRoot: fakeTmp });
    expect(Object.keys(falseResult)).toHaveLength(0);
    fs.rmSync(fakeTmp, { recursive: true, force: true });
  });

  it('generated settings file has correct structure', () => {
    const settings = generateHooksSettings({ projectRoot: tmpDir, port: testPort });
    expect(settings).toHaveProperty('hooks');
    const hooks = settings.hooks as Record<string, unknown[]>;
    // 8 HTTP + 7 command = 15 entries
    expect(Object.keys(hooks)).toHaveLength(15);
  });

  it('event count in status matches POSTed events', async () => {
    // POST 3 more events
    for (let i = 0; i < 3; i++) {
      await postJson(`${baseUrl}/api/hooks/PostToolUse`, {
        sessionId: 'count-session',
        tool_name: 'Edit',
      });
    }

    const statusResult = await getJson(`${baseUrl}/api/hooks/status`);
    expect(statusResult.status).toBe(200);
    const stats = (statusResult.body as { data: { totalEvents: number } }).data;
    // We had at least 2 events from first test + 3 more = at least 5
    expect(stats.totalEvents).toBeGreaterThanOrEqual(5);
  });

  it('graceful shutdown preserves events via JSONL', async () => {
    // POST an event
    await postJson(`${baseUrl}/api/hooks/PostToolUse`, {
      sessionId: 'persist-session',
      tool_name: 'Write',
    });

    // Stop the server (flushes events)
    await instance.stop();

    // Verify JSONL file exists
    const eventsFile = path.join(tmpDir, '.specweave', 'state', 'hooks', 'events.jsonl');
    expect(fs.existsSync(eventsFile)).toBe(true);
    const lines = fs.readFileSync(eventsFile, 'utf-8').trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);

    // Create a new HookEventStore and hydrate (constructor takes projectRoot)
    const store = new HookEventStore(tmpDir);
    await store.hydrate();
    const hydratedEvents = store.getEvents({});
    expect(hydratedEvents.length).toBeGreaterThan(0);

    // Restart server for remaining tests
    const newPort = 18100 + Math.floor(Math.random() * 1900);
    server = new DashboardServer({
      port: newPort,
      projectRoots: [tmpDir],
      openBrowser: false,
      hooksEnabled: true,
    });
    instance = await server.start();
    baseUrl = `http://localhost:${newPort}`;
  });
});
