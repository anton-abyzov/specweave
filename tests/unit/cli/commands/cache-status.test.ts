import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { cacheStatus } from '../../../../src/cli/commands/cache-status.js';

describe('cache-status command', () => {
  let mockCacheDir: string;
  let mockPluginDir: string;

  beforeEach(() => {
    // Create mock plugin cache structure
    mockCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-'));
    mockPluginDir = path.join(mockCacheDir, 'sw', '1.0.0');
    fs.mkdirSync(mockPluginDir, { recursive: true });
    fs.mkdirSync(path.join(mockPluginDir, 'scripts'), { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(mockCacheDir)) {
      fs.rmSync(mockCacheDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('basic health check', () => {
    it('should detect healthy plugin cache', async () => {
      // Create clean plugin cache
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

      await cacheStatus({ pluginName: 'sw', cachePath: mockCacheDir });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('sw (1.0.0) - Healthy')
      );

      consoleSpy.mockRestore();
    });

    it('should detect merge conflicts in cached files', async () => {
      // Create metadata first
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

      // Create script with merge conflict
      const scriptPath = path.join(mockPluginDir, 'scripts', 'test.sh');
      fs.writeFileSync(
        scriptPath,
        '#!/bin/bash\n<<<<<<< HEAD\nconflict\n=======\nother\n>>>>>>> branch'
      );
      fs.chmodSync(scriptPath, '755'); // Make executable

      const consoleSpy = vi.spyOn(console, 'log');

      await cacheStatus({ pluginName: 'sw', cachePath: mockCacheDir });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unresolved merge conflict')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('scripts/test.sh')
      );

      consoleSpy.mockRestore();
    });

    it('should detect bash syntax errors', async () => {
      // Create metadata first
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

      // Create script with syntax error
      const scriptPath = path.join(mockPluginDir, 'scripts', 'broken.sh');
      fs.writeFileSync(
        scriptPath,
        '#!/bin/bash\nif [ $1 == "test" ]; then\necho "missing fi"'
      );
      fs.chmodSync(scriptPath, '755'); // Make executable

      const consoleSpy = vi.spyOn(console, 'log');

      await cacheStatus({ pluginName: 'sw', cachePath: mockCacheDir });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bash syntax error')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('--verbose flag', () => {
    it('should show detailed information with --verbose', async () => {
      fs.writeFileSync(
        path.join(mockPluginDir, '.cache-metadata.json'),
        JSON.stringify({
          pluginName: 'sw',
          version: '1.0.0',
          commitSha: 'abc123',
          lastUpdated: new Date().toISOString(),
          checksums: { 'test.js': 'hash123' }
        })
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await cacheStatus({
        pluginName: 'sw',
        cachePath: mockCacheDir,
        verbose: true
      });

      // Should show issues in verbose mode (file in metadata but missing)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('File listed in metadata but missing')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test.js')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('--check-github flag', () => {
    it('should perform GitHub API check when requested', async () => {
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

      // Mock fetch for GitHub API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sha: 'def456' })
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await cacheStatus({
        pluginName: 'sw',
        cachePath: mockCacheDir,
        checkGithub: true
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('all plugins check', () => {
    it('should check all plugins when no plugin specified', async () => {
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

      await cacheStatus({ cachePath: mockCacheDir });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('sw (1.0.0)')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('sw-github (1.0.0)')
      );

      consoleSpy.mockRestore();
    });

    it('should show summary for multiple plugins', async () => {
      // Create multiple plugins with different statuses
      const sw2Dir = path.join(mockCacheDir, 'sw-jira', '1.0.0');
      fs.mkdirSync(sw2Dir, { recursive: true });
      fs.mkdirSync(path.join(sw2Dir, 'scripts'), { recursive: true });

      // Healthy plugin
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

      // Plugin with issue
      fs.writeFileSync(
        path.join(sw2Dir, '.cache-metadata.json'),
        JSON.stringify({
          pluginName: 'sw-jira',
          version: '1.0.0',
          commitSha: 'def456',
          lastUpdated: new Date().toISOString(),
          checksums: {}
        })
      );
      fs.writeFileSync(
        path.join(sw2Dir, 'scripts', 'broken.sh'),
        '#!/bin/bash\nif [ true; then'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await cacheStatus({ cachePath: mockCacheDir });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Summary:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 healthy')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 critical')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle missing plugin gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      await cacheStatus({
        pluginName: 'nonexistent',
        cachePath: mockCacheDir
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );

      consoleSpy.mockRestore();
    });

    it('should handle corrupted metadata file', async () => {
      fs.writeFileSync(
        path.join(mockPluginDir, '.cache-metadata.json'),
        'invalid json{'
      );

      const consoleSpy = vi.spyOn(console, 'warn');

      await cacheStatus({ pluginName: 'sw', cachePath: mockCacheDir });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('metadata')
      );

      consoleSpy.mockRestore();
    });
  });
});
