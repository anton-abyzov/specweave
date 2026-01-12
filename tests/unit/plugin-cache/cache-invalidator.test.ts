import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheInvalidator } from '../../../src/core/plugin-cache/cache-invalidator.js';
import { InvalidationOptions } from '../../../src/core/plugin-cache/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('CacheInvalidator', () => {
  let invalidator: CacheInvalidator;
  let mockCacheDir: string;
  let mockBackupDir: string;

  beforeEach(() => {
    mockCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-'));
    mockBackupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-'));

    // Use temp directory for backups during tests
    invalidator = new CacheInvalidator(mockBackupDir);

    // Create mock cache structure
    fs.mkdirSync(path.join(mockCacheDir, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(mockCacheDir, 'test-file.js'), 'content');
    fs.writeFileSync(path.join(mockCacheDir, 'skills', 'memory.md'), 'skill memories');
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(mockCacheDir)) {
      fs.rmSync(mockCacheDir, { recursive: true, force: true });
    }
    if (fs.existsSync(mockBackupDir)) {
      fs.rmSync(mockBackupDir, { recursive: true, force: true });
    }
  });

  describe('invalidatePlugin', () => {
    it('should perform soft invalidation by default', async () => {
      const options: InvalidationOptions = {
        strategy: 'soft',
        preserveMemories: false,
        backupFirst: false
      };

      await invalidator.invalidatePlugin('sw', '1.0.0', options);

      // Cache should still exist
      expect(fs.existsSync(mockCacheDir)).toBe(true);

      // Metadata should be marked as stale
      const metadataPath = path.join(mockCacheDir, '.cache-metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        expect(metadata.stale).toBe(true);
      }
    });

    it('should perform hard invalidation with backup', async () => {
      const options: InvalidationOptions = {
        strategy: 'hard',
        preserveMemories: true,
        backupFirst: true
      };

      await invalidator.invalidatePlugin('sw', '1.0.0', options, mockCacheDir);

      // Verify backup was created
      const backupExists = fs.existsSync(mockBackupDir) &&
        fs.readdirSync(mockBackupDir).some(f => f.includes('sw-1.0.0'));

      expect(backupExists).toBe(true);
    });

    it('should preserve skill memories during hard invalidation', async () => {
      const options: InvalidationOptions = {
        strategy: 'hard',
        preserveMemories: true,
        backupFirst: true
      };

      const memoriesPath = path.join(mockCacheDir, 'skills', 'memory.md');
      const originalContent = fs.readFileSync(memoriesPath, 'utf8');

      await invalidator.invalidatePlugin('sw', '1.0.0', options, mockCacheDir);

      // Verify memories were backed up
      const backupFiles = fs.readdirSync(mockBackupDir, { recursive: true });
      const memoryBackup = backupFiles.find(f =>
        typeof f === 'string' && f.includes('memory.md')
      );

      expect(memoryBackup).toBeDefined();

      if (memoryBackup) {
        const backupContent = fs.readFileSync(
          path.join(mockBackupDir, memoryBackup),
          'utf8'
        );
        expect(backupContent).toBe(originalContent);
      }
    });

    it('should throw error if backup fails during hard invalidation', async () => {
      const options: InvalidationOptions = {
        strategy: 'hard',
        preserveMemories: true,
        backupFirst: true
      };

      // Mock backup failure by making backup directory readonly
      fs.mkdirSync(mockBackupDir, { recursive: true });
      fs.chmodSync(mockBackupDir, 0o444);

      await expect(
        invalidator.invalidatePlugin('sw', '1.0.0', options)
      ).rejects.toThrow();

      // Restore permissions for cleanup
      fs.chmodSync(mockBackupDir, 0o755);
    });
  });

  describe('backupSkillMemories', () => {
    it('should create backup with timestamp', async () => {
      const backupPath = await invalidator.backupSkillMemories('sw', '1.0.0', mockCacheDir);

      expect(backupPath).toContain('sw-1.0.0');
      expect(backupPath).toMatch(/\d{4}-\d{2}-\d{2}-\d{6}/); // Timestamp format
      expect(fs.existsSync(backupPath)).toBe(true);
    });

    it('should backup all skill memory files', async () => {
      // Create multiple memory files
      const skillsDir = path.join(mockCacheDir, 'skills');
      fs.writeFileSync(path.join(skillsDir, 'component-usage.md'), 'component memories');
      fs.writeFileSync(path.join(skillsDir, 'api-patterns.md'), 'api memories');

      const backupPath = await invalidator.backupSkillMemories('sw', '1.0.0', mockCacheDir);

      const backupFiles = fs.readdirSync(backupPath);
      expect(backupFiles).toContain('component-usage.md');
      expect(backupFiles).toContain('api-patterns.md');
    });

    it('should return empty path if no memories exist', async () => {
      // Remove skills directory
      fs.rmSync(path.join(mockCacheDir, 'skills'), { recursive: true });

      const backupPath = await invalidator.backupSkillMemories('sw', '1.0.0', mockCacheDir);

      expect(backupPath).toBe('');
    });
  });

  describe('restoreSkillMemories', () => {
    it('should restore memories from backup', async () => {
      // Create backup
      const backupPath = await invalidator.backupSkillMemories('sw', '1.0.0', mockCacheDir);

      // Delete original
      fs.rmSync(path.join(mockCacheDir, 'skills'), { recursive: true, force: true });

      // Restore
      await invalidator.restoreSkillMemories(backupPath, mockCacheDir);

      // Verify restoration
      const memoryPath = path.join(mockCacheDir, 'skills', 'memory.md');
      expect(fs.existsSync(memoryPath)).toBe(true);
      expect(fs.readFileSync(memoryPath, 'utf8')).toBe('skill memories');
    });

    it('should merge with existing memories if present', async () => {
      const backupPath = await invalidator.backupSkillMemories('sw', '1.0.0', mockCacheDir);

      // Add new memory to cache
      const newMemoryPath = path.join(mockCacheDir, 'skills', 'new-memory.md');
      fs.writeFileSync(newMemoryPath, 'new content');

      await invalidator.restoreSkillMemories(backupPath, mockCacheDir);

      // Both old and new should exist
      expect(fs.existsSync(path.join(mockCacheDir, 'skills', 'memory.md'))).toBe(true);
      expect(fs.existsSync(newMemoryPath)).toBe(true);
    });

    it('should throw error if backup path invalid', async () => {
      await expect(
        invalidator.restoreSkillMemories('/invalid/path', mockCacheDir)
      ).rejects.toThrow();
    });
  });

  describe('validateBackup', () => {
    it('should validate backup completeness', async () => {
      const backupPath = await invalidator.backupSkillMemories('sw', '1.0.0', mockCacheDir);

      const isValid = await invalidator.validateBackup(backupPath, mockCacheDir);

      expect(isValid).toBe(true);
    });

    it('should detect missing files in backup', async () => {
      const backupPath = await invalidator.backupSkillMemories('sw', '1.0.0', mockCacheDir);

      // Add new file to cache after backup
      fs.writeFileSync(path.join(mockCacheDir, 'skills', 'new-file.md'), 'new');

      const isValid = await invalidator.validateBackup(backupPath, mockCacheDir);

      expect(isValid).toBe(false);
    });

    it('should detect corrupted backup files', async () => {
      const backupPath = await invalidator.backupSkillMemories('sw', '1.0.0', mockCacheDir);

      // Corrupt a backup file
      const backupFile = path.join(backupPath, 'memory.md');
      fs.writeFileSync(backupFile, 'corrupted');

      const isValid = await invalidator.validateBackup(backupPath, mockCacheDir);

      expect(isValid).toBe(false);
    });
  });

  describe('getBackupMetadata', () => {
    it('should return backup metadata', async () => {
      const backupPath = await invalidator.backupSkillMemories('sw', '1.0.0', mockCacheDir);

      const metadata = await invalidator.getBackupMetadata(backupPath);

      expect(metadata.pluginName).toBe('sw');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.timestamp).toBeDefined();
      expect(metadata.fileCount).toBeGreaterThan(0);
    });
  });
});
