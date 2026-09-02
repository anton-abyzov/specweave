/**
 * `sync.mode` was removed in 2.0 together with the queued event queue: every
 * trigger now pushes directly through one throttle. Old configs must keep
 * loading — the key is silently dropped, nothing else changes.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../../../src/core/config/config-manager.js';

describe('sync.mode migration', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `sync-mode-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(path.join(testDir, '.specweave'), { recursive: true });
    configPath = path.join(testDir, '.specweave', 'config.json');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => undefined);
  });

  async function load(config: unknown) {
    await fs.writeFile(configPath, JSON.stringify(config), 'utf-8');
    return new ConfigManager(testDir).loadAsync();
  }

  it('drops sync.mode: "queued" and keeps the rest of the sync block', async () => {
    const loaded = await load({
      version: '1.0',
      sync: { enabled: true, mode: 'queued', github: { owner: 'acme', repo: 'app' } },
    });
    expect(loaded.sync).toBeDefined();
    expect('mode' in (loaded.sync as Record<string, unknown>)).toBe(false);
    expect(loaded.sync?.enabled).toBe(true);
    expect((loaded.sync as Record<string, any>).github).toEqual({ owner: 'acme', repo: 'app' });
  });

  it('drops sync.mode: "immediate" too', async () => {
    const loaded = await load({ version: '1.0', sync: { enabled: true, mode: 'immediate' } });
    expect('mode' in (loaded.sync as Record<string, unknown>)).toBe(false);
  });

  it('is a no-op for configs that never had sync.mode', async () => {
    const loaded = await load({ version: '1.0', sync: { enabled: false } });
    expect('mode' in (loaded.sync as Record<string, unknown>)).toBe(false);
    expect(loaded.sync?.enabled).toBe(false);
  });
});
