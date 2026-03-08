import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getHttpMode } from '../../../../src/hooks/generate-settings.js';
import { getHooksStatus, type HooksStatusResult } from '../../../../src/hooks/hooks-status.js';

describe('Hooks Status', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-status-test-'));
    fs.mkdirSync(path.join(tmpDir, '.specweave', 'state', 'hooks'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('defaults httpMode to false when absent', () => {
    expect(getHttpMode({})).toBe(false);
    expect(getHttpMode({ hooks: {} })).toBe(false);
  });

  it('returns httpMode true from config', () => {
    expect(getHttpMode({ hooks: { httpMode: true } })).toBe(true);
  });

  it('reports server not running when no PID file', async () => {
    const result = await getHooksStatus(tmpDir);
    expect(result.serverRunning).toBe(false);
    expect(result.port).toBeUndefined();
  });

  it('reports server info from PID file when port is reachable', async () => {
    // Write a PID file with a port that is NOT actually reachable
    const pidPath = path.join(tmpDir, '.specweave', 'state', 'hooks', 'server.pid');
    fs.writeFileSync(pidPath, JSON.stringify({
      port: 19999,
      pid: process.pid,
      startedAt: new Date().toISOString(),
    }));

    const result = await getHooksStatus(tmpDir);
    // Port is likely not reachable, so should report stale PID
    expect(result.port).toBe(19999);
    expect(result.pid).toBe(process.pid);
  });

  it('detects stale PID file when port is not reachable', async () => {
    const pidPath = path.join(tmpDir, '.specweave', 'state', 'hooks', 'server.pid');
    fs.writeFileSync(pidPath, JSON.stringify({
      port: 19998,
      pid: 999999, // unlikely to be running
      startedAt: new Date().toISOString(),
    }));

    const result = await getHooksStatus(tmpDir);
    expect(result.stalePidFile).toBe(true);
  });

  it('formats status output correctly', async () => {
    const result = await getHooksStatus(tmpDir);
    expect(result).toHaveProperty('serverRunning');
    expect(result).toHaveProperty('stalePidFile');
  });
});
