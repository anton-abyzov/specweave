import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Unit Tests: Multi-marketplace stale plugin cleanup
 *
 * Tests dynamic marketplace discovery, stale settings removal across
 * marketplaces, and stale cache directory cleanup.
 */

// Must mock os before importing the module under test
const homedirMock = vi.hoisted(() => ({ value: '' }));
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return {
    ...actual,
    default: {
      ...actual,
      homedir: () => homedirMock.value,
    },
    homedir: () => homedirMock.value,
  };
});

// Mock fs-native to use real fs (the module under test imports from ./fs-native.js)
vi.mock('../../../src/utils/fs-native.js', async () => {
  const realFs = await import('fs');
  return { ...realFs, default: realFs };
});

// Mock execFileNoThrow (not used in these tests, but imported by cleanup module)
vi.mock('../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: vi.fn(() => ({ exitCode: 1, stdout: '', stderr: '' })),
}));

import { cleanupStalePlugins } from '../../../src/utils/cleanup-stale-plugins.js';

describe('cleanupStalePlugins — multi-marketplace', () => {
  let tempDir: string;
  let settingsDir: string;
  let settingsPath: string;
  let cacheBase: string;
  let marketplacesBase: string;
  let specweaveMarketplacePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-cleanup-test-'));
    homedirMock.value = tempDir;

    // Create mock ~/.claude structure
    settingsDir = path.join(tempDir, '.claude');
    settingsPath = path.join(settingsDir, 'settings.json');
    cacheBase = path.join(tempDir, '.claude', 'plugins', 'cache');
    marketplacesBase = path.join(tempDir, '.claude', 'plugins', 'marketplaces');

    fs.mkdirSync(settingsDir, { recursive: true });
    fs.mkdirSync(cacheBase, { recursive: true });
    fs.mkdirSync(marketplacesBase, { recursive: true });

    // Create specweave marketplace.json
    const specweaveManifestDir = path.join(tempDir, 'specweave-root', '.claude-plugin');
    fs.mkdirSync(specweaveManifestDir, { recursive: true });
    specweaveMarketplacePath = path.join(specweaveManifestDir, 'marketplace.json');
    fs.writeFileSync(specweaveMarketplacePath, JSON.stringify({
      plugins: [
        { name: 'sw', source: './plugins/specweave', version: '1.0.0' },
        { name: 'sw-github', source: './plugins/sw-github', version: '1.0.0' },
      ],
    }));

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // TC-001 (AC-US3-01): Dynamic marketplace discovery
  it('should discover and process both specweave and vskill marketplaces', async () => {
    // Create vskill cache dir and marketplace
    const vskillCacheDir = path.join(cacheBase, 'vskill');
    fs.mkdirSync(path.join(vskillCacheDir, 'mobile', '2.2.0'), { recursive: true });
    fs.mkdirSync(path.join(vskillCacheDir, 'frontend', '2.2.0'), { recursive: true });

    // Create specweave cache dir
    const specweaveCacheDir = path.join(cacheBase, 'specweave');
    fs.mkdirSync(path.join(specweaveCacheDir, 'sw'), { recursive: true });

    // Create vskill marketplace.json listing only "mobile"
    const vskillManifestDir = path.join(marketplacesBase, 'vskill', '.claude-plugin');
    fs.mkdirSync(vskillManifestDir, { recursive: true });
    fs.writeFileSync(path.join(vskillManifestDir, 'marketplace.json'), JSON.stringify({
      plugins: [{ name: 'mobile', source: './plugins/mobile', version: '2.2.0' }],
    }));

    // Settings with stale vskill plugin
    fs.writeFileSync(settingsPath, JSON.stringify({
      enabledPlugins: {
        'sw@specweave': true,
        'frontend@vskill': true,
        'mobile@vskill': true,
      },
    }));

    const result = await cleanupStalePlugins(specweaveMarketplacePath);

    expect(result.success).toBe(true);
    expect(result.removedPlugins).toContain('frontend@vskill');
    expect(result.removedPlugins).not.toContain('mobile@vskill');
    expect(result.removedPlugins).not.toContain('sw@specweave');
  });

  // TC-002 (AC-US3-02): Stale vskill settings removal
  it('should remove stale vskill plugin from settings.json', async () => {
    // Create vskill cache dir
    fs.mkdirSync(path.join(cacheBase, 'vskill', 'mobile'), { recursive: true });

    // Create vskill marketplace listing only "mobile"
    const vskillManifestDir = path.join(marketplacesBase, 'vskill', '.claude-plugin');
    fs.mkdirSync(vskillManifestDir, { recursive: true });
    fs.writeFileSync(path.join(vskillManifestDir, 'marketplace.json'), JSON.stringify({
      plugins: [{ name: 'mobile', source: './plugins/mobile', version: '2.2.0' }],
    }));

    fs.writeFileSync(settingsPath, JSON.stringify({
      enabledPlugins: {
        'sw@specweave': true,
        'frontend@vskill': true,
      },
    }));

    const result = await cleanupStalePlugins(specweaveMarketplacePath);

    expect(result.removedCount).toBe(1);
    expect(result.removedPlugins).toEqual(['frontend@vskill']);

    // Verify settings.json was updated
    const updatedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(updatedSettings.enabledPlugins['frontend@vskill']).toBeUndefined();
    expect(updatedSettings.enabledPlugins['sw@specweave']).toBe(true);
  });

  // TC-003 (AC-US3-03): Remove stale plugins from marketplace with missing manifest
  it('should remove stale plugins when marketplace.json does not exist', async () => {
    // Create vskill cache dir but NO marketplace.json
    fs.mkdirSync(path.join(cacheBase, 'vskill', 'frontend'), { recursive: true });

    fs.writeFileSync(settingsPath, JSON.stringify({
      enabledPlugins: {
        'sw@specweave': true,
        'frontend@vskill': true,
      },
    }));

    const result = await cleanupStalePlugins(specweaveMarketplacePath);

    expect(result.success).toBe(true);
    // vskill plugins SHOULD be removed (no manifest = all plugins stale)
    expect(result.removedPlugins).toContain('frontend@vskill');
    // sw@specweave should NOT be removed (specweave marketplace has manifest)
    expect(result.removedPlugins).not.toContain('sw@specweave');
  });

  // TC-004 (AC-US3-04): Stale cache directory removal
  it('should remove stale cache directories from disk', async () => {
    // Create vskill cache with valid (mobile) and stale (frontend) plugins
    const frontendCache = path.join(cacheBase, 'vskill', 'frontend', '2.2.0');
    const mobileCache = path.join(cacheBase, 'vskill', 'mobile', '2.2.0');
    fs.mkdirSync(frontendCache, { recursive: true });
    fs.mkdirSync(mobileCache, { recursive: true });

    // Create vskill marketplace listing only "mobile"
    const vskillManifestDir = path.join(marketplacesBase, 'vskill', '.claude-plugin');
    fs.mkdirSync(vskillManifestDir, { recursive: true });
    fs.writeFileSync(path.join(vskillManifestDir, 'marketplace.json'), JSON.stringify({
      plugins: [{ name: 'mobile', source: './plugins/mobile', version: '2.2.0' }],
    }));

    fs.writeFileSync(settingsPath, JSON.stringify({ enabledPlugins: {} }));

    const result = await cleanupStalePlugins(specweaveMarketplacePath);

    expect(result.success).toBe(true);
    expect(result.removedCacheDirs).toContain(path.join(cacheBase, 'vskill', 'frontend'));
    // mobile dir should still exist
    expect(fs.existsSync(path.join(cacheBase, 'vskill', 'mobile'))).toBe(true);
    // frontend dir should be gone
    expect(fs.existsSync(path.join(cacheBase, 'vskill', 'frontend'))).toBe(false);
  });

  // TC-005: No cache dir = success
  it('should succeed when cache directory does not exist', async () => {
    // Remove cache base
    fs.rmSync(cacheBase, { recursive: true, force: true });

    fs.writeFileSync(settingsPath, JSON.stringify({ enabledPlugins: {} }));

    const result = await cleanupStalePlugins(specweaveMarketplacePath);

    expect(result.success).toBe(true);
    expect(result.removedCacheDirs).toEqual([]);
  });

  // TC-006: Malformed marketplace.json in cache = treat as stale; valid manifest in marketplaces/ = keep
  it('should handle malformed JSON in cache scan but resolve via marketplaces/', async () => {
    fs.mkdirSync(path.join(cacheBase, 'vskill', 'frontend'), { recursive: true });

    const vskillManifestDir = path.join(marketplacesBase, 'vskill', '.claude-plugin');
    fs.mkdirSync(vskillManifestDir, { recursive: true });
    fs.writeFileSync(path.join(vskillManifestDir, 'marketplace.json'), 'not valid json{{{');

    fs.writeFileSync(settingsPath, JSON.stringify({
      enabledPlugins: { 'frontend@vskill': true },
    }));

    const result = await cleanupStalePlugins(specweaveMarketplacePath);

    expect(result.success).toBe(true);
    // Malformed manifest in cache scan = empty set, but step 2c re-checks
    // marketplaces/ path which also has malformed JSON = empty set = stale
    expect(result.removedPlugins).toContain('frontend@vskill');
  });

  // TC-007: Symlink cache entry — removes symlink, not target
  it('should remove symlink itself, leaving target intact', async () => {
    // Create a target directory
    const targetDir = path.join(tempDir, 'symlink-target');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'marker.txt'), 'exists');

    // Create vskill cache dir with symlink
    const vskillCacheDir = path.join(cacheBase, 'vskill');
    fs.mkdirSync(vskillCacheDir, { recursive: true });
    fs.symlinkSync(targetDir, path.join(vskillCacheDir, 'frontend'));

    // Create valid mobile dir
    fs.mkdirSync(path.join(vskillCacheDir, 'mobile', '2.2.0'), { recursive: true });

    // Create vskill marketplace listing only "mobile"
    const vskillManifestDir = path.join(marketplacesBase, 'vskill', '.claude-plugin');
    fs.mkdirSync(vskillManifestDir, { recursive: true });
    fs.writeFileSync(path.join(vskillManifestDir, 'marketplace.json'), JSON.stringify({
      plugins: [{ name: 'mobile', source: './plugins/mobile', version: '2.2.0' }],
    }));

    fs.writeFileSync(settingsPath, JSON.stringify({ enabledPlugins: {} }));

    const result = await cleanupStalePlugins(specweaveMarketplacePath);

    expect(result.success).toBe(true);
    expect(result.removedCacheDirs).toContain(path.join(vskillCacheDir, 'frontend'));
    // Symlink should be removed
    expect(fs.existsSync(path.join(vskillCacheDir, 'frontend'))).toBe(false);
    // Target directory should still exist
    expect(fs.existsSync(targetDir)).toBe(true);
    expect(fs.readFileSync(path.join(targetDir, 'marker.txt'), 'utf-8')).toBe('exists');
  });

  // TC-008: Settings-only discovery — marketplace has no cache AND no manifest
  it('should remove stale plugins from marketplace with no cache and no manifest', async () => {
    // No vskill cache dir, no vskill manifest — only a settings entry
    fs.writeFileSync(settingsPath, JSON.stringify({
      enabledPlugins: {
        'sw@specweave': true,
        'frontend@dead-marketplace': true,
        'some-plugin@claude-plugins-official': true, // well-known, should be kept
      },
    }));

    const result = await cleanupStalePlugins(specweaveMarketplacePath);

    expect(result.success).toBe(true);
    // dead-marketplace has no cache and no manifest → stale
    expect(result.removedPlugins).toContain('frontend@dead-marketplace');
    // specweave and claude-plugins-official should be untouched
    expect(result.removedPlugins).not.toContain('sw@specweave');
    expect(result.removedPlugins).not.toContain('some-plugin@claude-plugins-official');
  });
});
