import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheInvalidator } from '../../../src/core/plugin-cache/cache-invalidator.js';
import { InvalidationOptions } from '../../../src/core/plugin-cache/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('CacheInvalidator', () => {
  let invalidator: CacheInvalidator;
  let mockCacheDir: string;

  beforeEach(() => {
    invalidator = new CacheInvalidator();
    mockCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-'));

    // Create mock cache structure
    fs.writeFileSync(path.join(mockCacheDir, 'test-file.js'), 'content');
    fs.writeFileSync(
      path.join(mockCacheDir, '.cache-metadata.json'),
      JSON.stringify({ pluginName: 'sw', version: '1.0.0', stale: false })
    );
  });

  afterEach(() => {
    // Cleanup cache dir
    if (fs.existsSync(mockCacheDir)) {
      fs.rmSync(mockCacheDir, { recursive: true, force: true });
    }
  });

  describe('invalidatePlugin', () => {
    it('should perform soft invalidation by default', async () => {
      const options: InvalidationOptions = { strategy: 'soft' };

      await invalidator.invalidatePlugin('sw', '1.0.0', options, mockCacheDir);

      // Cache should still exist
      expect(fs.existsSync(mockCacheDir)).toBe(true);

      // Metadata should be marked as stale
      const metadataPath = path.join(mockCacheDir, '.cache-metadata.json');
      expect(fs.existsSync(metadataPath)).toBe(true);

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      expect(metadata.stale).toBe(true);
      expect(metadata.staleSince).toBeDefined();
    });

    it('should perform hard invalidation and delete cache', async () => {
      const options: InvalidationOptions = { strategy: 'hard' };

      await invalidator.invalidatePlugin('sw', '1.0.0', options, mockCacheDir);

      // Cache should be deleted
      expect(fs.existsSync(mockCacheDir)).toBe(false);
    });

    it('should handle non-existent cache path gracefully', async () => {
      const options: InvalidationOptions = { strategy: 'hard' };
      const nonExistentPath = path.join(os.tmpdir(), 'non-existent-cache-' + Date.now());

      // Should not throw
      await expect(
        invalidator.invalidatePlugin('sw', '1.0.0', options, nonExistentPath)
      ).resolves.toBeUndefined();
    });

    it('should not modify metadata if file does not exist during soft invalidation', async () => {
      // Remove metadata file
      fs.rmSync(path.join(mockCacheDir, '.cache-metadata.json'));

      const options: InvalidationOptions = { strategy: 'soft' };

      // Should not throw
      await invalidator.invalidatePlugin('sw', '1.0.0', options, mockCacheDir);

      // Cache should still exist but no metadata created
      expect(fs.existsSync(mockCacheDir)).toBe(true);
      expect(fs.existsSync(path.join(mockCacheDir, '.cache-metadata.json'))).toBe(false);
    });
  });
});
