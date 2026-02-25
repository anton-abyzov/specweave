/**
 * Unit tests for cleanup-stale-plugins.ts
 *
 * Tests the stale plugin detection and cleanup system.
 * Uses real filesystem temp dirs to simulate settings.json and marketplace.json.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import path from 'path';
import os from 'os';
import {
  cleanupStalePlugins,
  detectStalePlugins,
} from '../../../src/utils/cleanup-stale-plugins.js';

let tmpDir: string;
let originalHome: string | undefined;

beforeEach(async () => {
  tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'sw-stale-plugins-'));
  originalHome = process.env.HOME;
  // Point HOME to tmpDir so the module reads our fake settings
  process.env.HOME = tmpDir;
  // Create ~/.claude/ structure
  await fsPromises.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
});

afterEach(async () => {
  if (originalHome !== undefined) {
    process.env.HOME = originalHome;
  } else {
    delete process.env.HOME;
  }
  await fsPromises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

function writeSettings(settings: Record<string, unknown>): void {
  fs.writeFileSync(
    path.join(tmpDir, '.claude', 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
}

function readSettings(): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8')
  );
}

function writeMarketplace(marketplacePath: string, plugins: { name: string }[]): void {
  fs.mkdirSync(path.dirname(marketplacePath), { recursive: true });
  fs.writeFileSync(marketplacePath, JSON.stringify({ plugins }));
}

describe('cleanupStalePlugins', () => {
  it('should succeed when no settings.json exists', async () => {
    const marketplacePath = path.join(tmpDir, 'marketplace.json');
    writeMarketplace(marketplacePath, [{ name: 'frontend' }]);

    const result = await cleanupStalePlugins(marketplacePath);
    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(0);
  });

  it('should succeed when no stale plugins found', async () => {
    const marketplacePath = path.join(tmpDir, 'marketplace.json');
    writeMarketplace(marketplacePath, [{ name: 'frontend' }, { name: 'backend' }]);
    writeSettings({
      enabledPlugins: {
        'frontend@vskill': true,
        'backend@vskill': true,
      },
    });

    const result = await cleanupStalePlugins(marketplacePath);
    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(0);
    expect(result.removedPlugins).toEqual([]);
  });

  it('should remove plugin not in marketplace', async () => {
    const marketplacePath = path.join(tmpDir, 'marketplace.json');
    writeMarketplace(marketplacePath, [{ name: 'frontend' }]);
    writeSettings({
      enabledPlugins: {
        'frontend@vskill': true,
        'sw-removed-plugin@specweave': true,
      },
    });

    // State before: both plugins enabled
    const before = readSettings() as { enabledPlugins: Record<string, boolean> };
    expect(before.enabledPlugins['sw-removed-plugin@specweave']).toBe(true);

    const result = await cleanupStalePlugins(marketplacePath);

    // State after: stale plugin removed
    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(1);
    expect(result.removedPlugins).toContain('sw-removed-plugin@specweave');

    const after = readSettings() as { enabledPlugins: Record<string, boolean> };
    expect(after.enabledPlugins['frontend@vskill']).toBe(true);
    expect(after.enabledPlugins['sw-removed-plugin@specweave']).toBeUndefined();
  });

  it('should remove known removed plugins even if in marketplace', async () => {
    const marketplacePath = path.join(tmpDir, 'marketplace.json');
    // sw-tooling is in REMOVED_PLUGINS set
    writeMarketplace(marketplacePath, [{ name: 'frontend' }, { name: 'sw-tooling' }]);
    writeSettings({
      enabledPlugins: {
        'frontend@vskill': true,
        'sw-tooling@specweave': true,
      },
    });

    const result = await cleanupStalePlugins(marketplacePath);
    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(1);
    expect(result.removedPlugins).toContain('sw-tooling@specweave');
  });

  it('should skip disabled plugins', async () => {
    const marketplacePath = path.join(tmpDir, 'marketplace.json');
    writeMarketplace(marketplacePath, [{ name: 'frontend' }]);
    writeSettings({
      enabledPlugins: {
        'frontend@vskill': true,
        'sw-removed@specweave': false, // disabled — should not be removed
      },
    });

    const result = await cleanupStalePlugins(marketplacePath);
    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(0);
  });

  it('should only remove specweave marketplace plugins', async () => {
    const marketplacePath = path.join(tmpDir, 'marketplace.json');
    writeMarketplace(marketplacePath, []);
    writeSettings({
      enabledPlugins: {
        'some-plugin@other-marketplace': true, // different marketplace, should be kept
        'sw-gone@specweave': true,             // specweave plugin, not in marketplace
      },
    });

    const result = await cleanupStalePlugins(marketplacePath);
    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(1);
    expect(result.removedPlugins).toContain('sw-gone@specweave');

    const after = readSettings() as { enabledPlugins: Record<string, boolean> };
    expect(after.enabledPlugins['some-plugin@other-marketplace']).toBe(true);
  });

  it('should fail when marketplace file does not exist', async () => {
    writeSettings({ enabledPlugins: { 'sw-test@specweave': true } });

    const result = await cleanupStalePlugins('/nonexistent/marketplace.json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Marketplace not found/);
  });
});

describe('detectStalePlugins', () => {
  it('should return empty array when no settings exist', async () => {
    const marketplacePath = path.join(tmpDir, 'marketplace.json');
    writeMarketplace(marketplacePath, []);

    const stale = await detectStalePlugins(marketplacePath);
    expect(stale).toEqual([]);
  });

  it('should detect stale plugins without removing them', async () => {
    const marketplacePath = path.join(tmpDir, 'marketplace.json');
    writeMarketplace(marketplacePath, [{ name: 'frontend' }]);
    writeSettings({
      enabledPlugins: {
        'frontend@vskill': true,
        'sw-stale@specweave': true,
      },
    });

    const stale = await detectStalePlugins(marketplacePath);
    expect(stale).toContain('sw-stale@specweave');
    expect(stale).not.toContain('frontend@vskill');

    // Verify settings were NOT modified (detect-only)
    const settings = readSettings() as { enabledPlugins: Record<string, boolean> };
    expect(settings.enabledPlugins['sw-stale@specweave']).toBe(true);
  });

  it('should return empty when marketplace missing', async () => {
    writeSettings({ enabledPlugins: { 'sw-test@specweave': true } });
    const stale = await detectStalePlugins('/nonexistent/marketplace.json');
    expect(stale).toEqual([]);
  });
});
