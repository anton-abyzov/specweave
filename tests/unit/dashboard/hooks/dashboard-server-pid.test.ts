import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DashboardServer } from '../../../../src/dashboard/server/dashboard-server.js';
import type { DashboardServerInstance } from '../../../../src/dashboard/server/dashboard-server.js';

describe('DashboardServer PID file', () => {
  let tmpDir: string;
  let instance: DashboardServerInstance | null = null;

  afterEach(async () => {
    if (instance) {
      await instance.stop();
      instance = null;
    }
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes PID file on start with hooksEnabled', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pid-test-'));
    fs.mkdirSync(path.join(tmpDir, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), '{}');

    const testPort = 18200 + Math.floor(Math.random() * 2000);
    const server = new DashboardServer({ port: testPort, projectRoots: [tmpDir], openBrowser: false, hooksEnabled: true });
    instance = await server.start();

    const pidPath = path.join(tmpDir, '.specweave', 'state', 'hooks', 'server.pid');
    expect(fs.existsSync(pidPath)).toBe(true);
    const pidData = JSON.parse(fs.readFileSync(pidPath, 'utf-8'));
    expect(pidData.port).toBe(testPort);
    expect(pidData.pid).toBe(process.pid);
    expect(pidData.startedAt).toBeDefined();
  });

  it('deletes PID file on stop', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pid-test-'));
    fs.mkdirSync(path.join(tmpDir, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), '{}');

    const testPort = 18200 + Math.floor(Math.random() * 2000);
    const server = new DashboardServer({ port: testPort, projectRoots: [tmpDir], openBrowser: false, hooksEnabled: true });
    instance = await server.start();

    const pidPath = path.join(tmpDir, '.specweave', 'state', 'hooks', 'server.pid');
    expect(fs.existsSync(pidPath)).toBe(true);

    await instance.stop();
    instance = null;
    expect(fs.existsSync(pidPath)).toBe(false);
  });

  it('does not write PID file without hooksEnabled', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pid-test-'));
    fs.mkdirSync(path.join(tmpDir, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), '{}');

    const testPort = 18200 + Math.floor(Math.random() * 2000);
    const server = new DashboardServer({ port: testPort, projectRoots: [tmpDir], openBrowser: false });
    instance = await server.start();

    const pidPath = path.join(tmpDir, '.specweave', 'state', 'hooks', 'server.pid');
    expect(fs.existsSync(pidPath)).toBe(false);
  });
});
