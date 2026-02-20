/**
 * Unit Test: Dashboard API Authentication
 *
 * Verifies token-based protection for dashboard API and SSE endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import { DashboardServer } from '../../../src/dashboard/server/dashboard-server.js';

describe('Dashboard API Auth', () => {
  const authToken = 'test-dashboard-token';
  let tempDir: string;
  let server: { url: string; port: number; stop: () => Promise<void> };

  async function requestJson(
    route: string,
    options: { method?: string; headers?: Record<string, string> } = {}
  ): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const url = new URL(route, server.url);
      const req = http.request(
        url,
        {
          method: options.method || 'GET',
          headers: options.headers || {},
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString();
            try {
              resolve({ status: res.statusCode || 0, body: JSON.parse(raw) });
            } catch {
              resolve({ status: res.statusCode || 0, body: raw });
            }
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  async function requestSseStatus(route: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const url = new URL(route, server.url);
      const req = http.request(url, { method: 'GET' }, (res) => {
        const status = res.statusCode || 0;
        // SSE keeps the connection open; close after status is known.
        res.destroy();
        resolve(status);
      });
      req.on('error', reject);
      req.end();
    });
  }

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-auth-test-'));
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.specweave', 'config.json'),
      JSON.stringify({ project: { name: 'dashboard-auth-test' } }, null, 2),
    );

    const dashServer = new DashboardServer({
      port: 30000 + Math.floor(Math.random() * 30000),
      projectRoots: [tempDir],
      openBrowser: false,
      authToken,
    });
    server = await dashServer.start();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns 401 when token is missing', async () => {
    const { status, body } = await requestJson('/api/health');
    expect(status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when token is invalid', async () => {
    const { status, body } = await requestJson('/api/health', {
      headers: { 'X-Specweave-Dashboard-Token': 'wrong-token' },
    });
    expect(status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 when token is valid', async () => {
    const { status, body } = await requestJson('/api/health', {
      headers: { 'X-Specweave-Dashboard-Token': authToken },
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it('accepts token via SSE query parameter', async () => {
    const status = await requestSseStatus(`/api/events?token=${encodeURIComponent(authToken)}`);
    expect(status).toBe(200);
  });

  it('rejects SSE endpoint without token', async () => {
    const status = await requestSseStatus('/api/events');
    expect(status).toBe(401);
  });
});
