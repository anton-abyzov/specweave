import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  CacheMetadataManager,
  CacheMetadata
} from '../../../src/core/plugin-cache/cache-metadata.js';

describe('CacheMetadataManager', () => {
  let tempDir: string;
  let manager: CacheMetadataManager;
  let testPluginPath: string;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-metadata-test-'));
    testPluginPath = path.join(tempDir, 'specweave', 'sw', '1.0.0');
    fs.mkdirSync(testPluginPath, { recursive: true });

    manager = new CacheMetadataManager();
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('readMetadata', () => {
    it('should return null when metadata file does not exist', () => {
      const result = manager.readMetadata(testPluginPath);
      expect(result).toBeNull();
    });

    it('should read and parse valid metadata file', () => {
      const metadata: CacheMetadata = {
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'abc123def456',
        lastUpdated: '2026-01-07T20:00:00Z',
        checksums: {
          'hooks/stop.sh': 'sha256-checksum-here'
        }
      };

      const metadataPath = path.join(testPluginPath, '.cache-metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      const result = manager.readMetadata(testPluginPath);
      expect(result).toEqual(metadata);
    });

    it('should return null for invalid JSON', () => {
      const metadataPath = path.join(testPluginPath, '.cache-metadata.json');
      fs.writeFileSync(metadataPath, 'invalid json {');

      const result = manager.readMetadata(testPluginPath);
      expect(result).toBeNull();
    });

    it('should validate required fields exist', () => {
      const invalidMetadata = {
        pluginName: 'sw',
        // Missing version, commitSha, lastUpdated, checksums
      };

      const metadataPath = path.join(testPluginPath, '.cache-metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(invalidMetadata));

      const result = manager.readMetadata(testPluginPath);
      expect(result).toBeNull();
    });
  });

  describe('writeMetadata', () => {
    it('should write metadata to file with correct format', () => {
      const metadata: CacheMetadata = {
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'abc123def456',
        lastUpdated: '2026-01-07T20:00:00Z',
        checksums: {
          'scripts/reflect.sh': 'sha256-abc123',
          'hooks/stop-auto.sh': 'sha256-def456'
        }
      };

      manager.writeMetadata(testPluginPath, metadata);

      const metadataPath = path.join(testPluginPath, '.cache-metadata.json');
      expect(fs.existsSync(metadataPath)).toBe(true);

      const written = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      expect(written).toEqual(metadata);
    });

    it('should create directory if it does not exist', () => {
      const newPath = path.join(tempDir, 'new-plugin', 'version');
      const metadata: CacheMetadata = {
        pluginName: 'new-plugin',
        version: '1.0.0',
        commitSha: 'test123',
        lastUpdated: new Date().toISOString(),
        checksums: {}
      };

      manager.writeMetadata(newPath, metadata);

      expect(fs.existsSync(path.join(newPath, '.cache-metadata.json'))).toBe(true);
    });

    it('should overwrite existing metadata', () => {
      const metadata1: CacheMetadata = {
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'old-commit',
        lastUpdated: '2026-01-01T00:00:00Z',
        checksums: {}
      };

      manager.writeMetadata(testPluginPath, metadata1);

      const metadata2: CacheMetadata = {
        pluginName: 'sw',
        version: '1.0.1',
        commitSha: 'new-commit',
        lastUpdated: '2026-01-07T20:00:00Z',
        checksums: { 'file.js': 'sha256-new' }
      };

      manager.writeMetadata(testPluginPath, metadata2);

      const result = manager.readMetadata(testPluginPath);
      expect(result).toEqual(metadata2);
    });
  });

  describe('getPluginCachePath', () => {
    it('should resolve plugin cache path correctly', () => {
      const expectedPath = path.join(
        os.homedir(),
        '.claude',
        'plugins',
        'cache',
        'specweave',
        'sw',
        '1.0.0'
      );

      const result = CacheMetadataManager.getPluginCachePath('sw', '1.0.0');
      expect(result).toBe(expectedPath);
    });

    it('should handle different plugin names', () => {
      const result = CacheMetadataManager.getPluginCachePath('sw-github', '2.0.0');
      expect(result).toContain('sw-github');
      expect(result).toContain('2.0.0');
    });

    it('should handle version with special characters', () => {
      const result = CacheMetadataManager.getPluginCachePath('sw', '1.0.0-beta.1');
      expect(result).toContain('1.0.0-beta.1');
    });
  });

  describe('computeChecksum', () => {
    it('should compute SHA256 checksum for file', () => {
      const testFile = path.join(testPluginPath, 'test.sh');
      fs.writeFileSync(testFile, '#!/bin/bash\necho "test"');

      const checksum = manager.computeChecksum(testFile);

      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(checksum.length).toBe(64);
    });

    it('should return different checksums for different content', () => {
      const file1 = path.join(testPluginPath, 'file1.sh');
      const file2 = path.join(testPluginPath, 'file2.sh');

      fs.writeFileSync(file1, 'content1');
      fs.writeFileSync(file2, 'content2');

      const checksum1 = manager.computeChecksum(file1);
      const checksum2 = manager.computeChecksum(file2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should return same checksum for identical content', () => {
      const file1 = path.join(testPluginPath, 'file1.sh');
      const file2 = path.join(testPluginPath, 'file2.sh');

      const content = '#!/bin/bash\necho "same content"';
      fs.writeFileSync(file1, content);
      fs.writeFileSync(file2, content);

      const checksum1 = manager.computeChecksum(file1);
      const checksum2 = manager.computeChecksum(file2);

      expect(checksum1).toBe(checksum2);
    });

    it('should throw error for non-existent file', () => {
      const nonExistent = path.join(testPluginPath, 'does-not-exist.sh');

      expect(() => {
        manager.computeChecksum(nonExistent);
      }).toThrow();
    });
  });

  describe('generateMetadata', () => {
    it('should generate metadata with all checksums', () => {
      // Create test files
      fs.writeFileSync(path.join(testPluginPath, 'script1.sh'), 'content1');
      fs.writeFileSync(path.join(testPluginPath, 'script2.js'), 'content2');

      const subdir = path.join(testPluginPath, 'hooks');
      fs.mkdirSync(subdir);
      fs.writeFileSync(path.join(subdir, 'stop.sh'), 'content3');

      const metadata = manager.generateMetadata(
        testPluginPath,
        'sw',
        '1.0.0',
        'abc123commit'
      );

      expect(metadata.pluginName).toBe('sw');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.commitSha).toBe('abc123commit');
      expect(metadata.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(Object.keys(metadata.checksums).length).toBe(3);
      expect(metadata.checksums['script1.sh']).toBeTruthy();
      expect(metadata.checksums['script2.js']).toBeTruthy();
      expect(metadata.checksums['hooks/stop.sh']).toBeTruthy();
    });

    it('should exclude .cache-metadata.json from checksums', () => {
      fs.writeFileSync(path.join(testPluginPath, 'script.sh'), 'content');
      fs.writeFileSync(path.join(testPluginPath, '.cache-metadata.json'), '{}');

      const metadata = manager.generateMetadata(
        testPluginPath,
        'sw',
        '1.0.0',
        'commit123'
      );

      expect(metadata.checksums['.cache-metadata.json']).toBeUndefined();
      expect(metadata.checksums['script.sh']).toBeTruthy();
    });

    it('should handle empty directory', () => {
      const metadata = manager.generateMetadata(
        testPluginPath,
        'sw',
        '1.0.0',
        'commit123'
      );

      expect(metadata.checksums).toEqual({});
    });
  });
});
