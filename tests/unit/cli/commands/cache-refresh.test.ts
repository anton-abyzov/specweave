import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { cacheRefresh } from '../../../../src/cli/commands/cache-refresh.js';

describe('cache-refresh command', () => {
  let mockCacheDir: string;
  let mockPluginDir: string;

  beforeEach(() => {
    // Create mock plugin cache structure
    mockCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-'));
    mockPluginDir = path.join(mockCacheDir, 'sw', '1.0.0');
    fs.mkdirSync(mockPluginDir, { recursive: true });
    fs.mkdirSync(path.join(mockPluginDir, 'skills'), { recursive: true });
  });

  afterEach(() => {
    // Cleanup cache dir
    if (fs.existsSync(mockCacheDir)) {
      fs.rmSync(mockCacheDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('basic refresh', () => {
    it('should perform soft refresh by default', async () => {
      // Create metadata
      fs.writeFileSync(
        path.join(mockPluginDir, '.cache-metadata.json'),
        JSON.stringify({
          pluginName: 'sw',
          version: '1.0.0',
          commitSha: 'abc123',
          lastUpdated: new Date().toISOString(),
          checksums: {}
        })
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await cacheRefresh({
        pluginName: 'sw',
        cachePath: mockCacheDir,
        skipMarketplaceRefresh: true // Don't actually refresh marketplace in tests
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('refreshed')
      );

      consoleSpy.mockRestore();
    });

    it('should perform hard refresh with --force flag', async () => {
      // Create metadata
      fs.writeFileSync(
        path.join(mockPluginDir, '.cache-metadata.json'),
        JSON.stringify({
          pluginName: 'sw',
          version: '1.0.0',
          commitSha: 'abc123',
          lastUpdated: new Date().toISOString(),
          checksums: {}
        })
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await cacheRefresh({
        pluginName: 'sw',
        cachePath: mockCacheDir,
        force: true,
        skipMarketplaceRefresh: true
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hard refresh')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('all plugins refresh', () => {
    it('should refresh all plugins when no plugin specified', async () => {
      // Create multiple plugin caches
      const sw2Dir = path.join(mockCacheDir, 'sw-github', '1.0.0');
      fs.mkdirSync(sw2Dir, { recursive: true });

      fs.writeFileSync(
        path.join(mockPluginDir, '.cache-metadata.json'),
        JSON.stringify({
          pluginName: 'sw',
          version: '1.0.0',
          commitSha: 'abc123',
          lastUpdated: new Date().toISOString(),
          checksums: {}
        })
      );

      fs.writeFileSync(
        path.join(sw2Dir, '.cache-metadata.json'),
        JSON.stringify({
          pluginName: 'sw-github',
          version: '1.0.0',
          commitSha: 'def456',
          lastUpdated: new Date().toISOString(),
          checksums: {}
        })
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await cacheRefresh({
        cachePath: mockCacheDir,
        all: true,
        skipMarketplaceRefresh: true
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('sw')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('sw-github')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle missing plugin gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      await cacheRefresh({
        pluginName: 'nonexistent',
        cachePath: mockCacheDir,
        skipMarketplaceRefresh: true
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('post-refresh verification', () => {
    it('should verify cache health after refresh', async () => {
      fs.writeFileSync(
        path.join(mockPluginDir, '.cache-metadata.json'),
        JSON.stringify({
          pluginName: 'sw',
          version: '1.0.0',
          commitSha: 'abc123',
          lastUpdated: new Date().toISOString(),
          checksums: {}
        })
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await cacheRefresh({
        pluginName: 'sw',
        cachePath: mockCacheDir,
        verify: true,
        skipMarketplaceRefresh: true
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Verification')
      );

      consoleSpy.mockRestore();
    });
  });
});
