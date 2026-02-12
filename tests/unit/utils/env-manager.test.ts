import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * Unit Tests for env-manager.ts
 *
 * Tests: parseEnvContent, serializeEnvContent, updateEnvFile,
 * mergeEnvList, mergeProjectList, getEnvValue, envFileExists, restoreEnvBackup
 */

// Mock fs module (env-manager imports from 'fs')
const { mockExistsSync, mockReadFile, mockWriteFile, mockCopyFile, mockRename, mockUnlink } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockCopyFile: vi.fn(),
  mockRename: vi.fn(),
  mockUnlink: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  promises: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    copyFile: mockCopyFile,
    rename: mockRename,
    unlink: mockUnlink,
  },
}));

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  parseEnvContent,
  serializeEnvContent,
  updateEnvFile,
  mergeEnvList,
  mergeProjectList,
  getEnvValue,
  envFileExists,
  restoreEnvBackup,
} from '../../../src/utils/env-manager.js';

describe('env-manager', () => {
  const mockLogger = {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ========== parseEnvContent ==========

  describe('parseEnvContent', () => {
    it('should parse simple KEY=VALUE pairs', () => {
      const content = 'FOO=bar\nBAZ=qux';
      const result = parseEnvContent(content);

      expect(result.get('FOO')).toBe('bar');
      expect(result.get('BAZ')).toBe('qux');
      expect(result.size).toBe(2);
    });

    it('should skip empty lines', () => {
      const content = 'FOO=bar\n\nBAZ=qux\n\n';
      const result = parseEnvContent(content);

      expect(result.size).toBe(2);
      expect(result.get('FOO')).toBe('bar');
      expect(result.get('BAZ')).toBe('qux');
    });

    it('should skip comment lines', () => {
      const content = '# This is a comment\nFOO=bar\n# Another comment\nBAZ=qux';
      const result = parseEnvContent(content);

      expect(result.size).toBe(2);
      expect(result.get('FOO')).toBe('bar');
    });

    it('should handle values with equals signs', () => {
      const content = 'DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require';
      const result = parseEnvContent(content);

      expect(result.get('DATABASE_URL')).toBe('postgres://user:pass@host:5432/db?sslmode=require');
    });

    it('should handle empty values', () => {
      const content = 'EMPTY_VAR=';
      const result = parseEnvContent(content);

      expect(result.get('EMPTY_VAR')).toBe('');
    });

    it('should return empty map for empty content', () => {
      const result = parseEnvContent('');
      expect(result.size).toBe(0);
    });

    it('should return empty map for content with only comments', () => {
      const content = '# comment 1\n# comment 2\n';
      const result = parseEnvContent(content);
      expect(result.size).toBe(0);
    });

    it('should trim whitespace from keys and values', () => {
      const content = '  FOO  =  bar  ';
      const result = parseEnvContent(content);

      expect(result.get('FOO')).toBe('bar');
    });

    it('should handle lines without equals sign (skip them)', () => {
      const content = 'VALID=value\nINVALIDLINE\nALSO_VALID=ok';
      const result = parseEnvContent(content);

      expect(result.size).toBe(2);
      expect(result.get('VALID')).toBe('value');
      expect(result.get('ALSO_VALID')).toBe('ok');
    });

    it('should overwrite duplicate keys with last value', () => {
      const content = 'FOO=first\nFOO=second';
      const result = parseEnvContent(content);

      expect(result.get('FOO')).toBe('second');
      expect(result.size).toBe(1);
    });
  });

  // ========== serializeEnvContent ==========

  describe('serializeEnvContent', () => {
    it('should serialize key-value pairs to .env format', () => {
      const envMap = new Map<string, string>();
      envMap.set('FOO', 'bar');
      envMap.set('BAZ', 'qux');

      const result = serializeEnvContent(envMap);
      expect(result).toBe('FOO=bar\nBAZ=qux\n');
    });

    it('should handle single entry', () => {
      const envMap = new Map<string, string>();
      envMap.set('KEY', 'value');

      const result = serializeEnvContent(envMap);
      expect(result).toBe('KEY=value\n');
    });

    it('should handle empty map', () => {
      const envMap = new Map<string, string>();
      const result = serializeEnvContent(envMap);
      expect(result).toBe('\n');
    });

    it('should preserve values with special characters', () => {
      const envMap = new Map<string, string>();
      envMap.set('URL', 'https://example.com?a=1&b=2');

      const result = serializeEnvContent(envMap);
      expect(result).toBe('URL=https://example.com?a=1&b=2\n');
    });
  });

  // ========== updateEnvFile ==========

  describe('updateEnvFile', () => {
    it('should create new .env file when none exists', async () => {
      mockExistsSync.mockReturnValue(false);
      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);

      await updateEnvFile({
        key: 'MY_KEY',
        value: 'my_value',
        projectRoot: '/test/project',
        logger: mockLogger,
        createBackup: false,
      });

      // Should write temp file
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/project/.env.tmp',
        expect.stringContaining('MY_KEY=my_value'),
        'utf-8'
      );
      // Should rename temp to final
      expect(mockRename).toHaveBeenCalledWith(
        '/test/project/.env.tmp',
        '/test/project/.env'
      );
    });

    it('should update existing .env file preserving other keys', async () => {
      // First call: existsSync for envPath (reading)
      // Second call: existsSync for envPath (backup check) - but backup disabled
      // No third call needed since no temp cleanup
      mockExistsSync
        .mockReturnValueOnce(true)   // envPath exists for reading
        .mockReturnValueOnce(false); // no backup needed check (createBackup=false skips)

      mockReadFile.mockResolvedValue('EXISTING=value\n');
      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);

      await updateEnvFile({
        key: 'NEW_KEY',
        value: 'new_value',
        projectRoot: '/test/project',
        logger: mockLogger,
        createBackup: false,
      });

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('EXISTING=value');
      expect(writtenContent).toContain('NEW_KEY=new_value');
    });

    it('should create backup when createBackup is true and .env exists', async () => {
      mockExistsSync
        .mockReturnValueOnce(true)   // envPath exists for reading
        .mockReturnValueOnce(true);  // envPath exists for backup check

      mockReadFile.mockResolvedValue('KEY=value\n');
      mockWriteFile.mockResolvedValue(undefined);
      mockCopyFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);

      await updateEnvFile({
        key: 'KEY',
        value: 'updated',
        projectRoot: '/test/project',
        logger: mockLogger,
        createBackup: true,
      });

      expect(mockCopyFile).toHaveBeenCalledWith(
        '/test/project/.env',
        '/test/project/.env.backup'
      );
    });

    it('should not create backup when createBackup is false', async () => {
      mockExistsSync.mockReturnValue(false);
      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);

      await updateEnvFile({
        key: 'KEY',
        value: 'val',
        projectRoot: '/test/project',
        logger: mockLogger,
        createBackup: false,
      });

      expect(mockCopyFile).not.toHaveBeenCalled();
    });

    it('should cleanup temp file on error', async () => {
      mockExistsSync
        .mockReturnValueOnce(false)  // envPath doesn't exist for reading
        .mockReturnValueOnce(true);  // tempPath exists for cleanup

      mockWriteFile.mockRejectedValue(new Error('disk full'));

      await expect(
        updateEnvFile({
          key: 'KEY',
          value: 'val',
          projectRoot: '/test/project',
          logger: mockLogger,
        })
      ).rejects.toThrow('Failed to update .env file: disk full');

      expect(mockUnlink).toHaveBeenCalledWith('/test/project/.env.tmp');
    });

    it('should use default logger when none provided', async () => {
      mockExistsSync.mockReturnValue(false);
      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);

      // Should not throw when logger is omitted
      await updateEnvFile({
        key: 'KEY',
        value: 'val',
        projectRoot: '/test/project',
      });

      expect(mockRename).toHaveBeenCalled();
    });

    it('should overwrite existing key in .env', async () => {
      mockExistsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      mockReadFile.mockResolvedValue('KEY=old_value\n');
      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);

      await updateEnvFile({
        key: 'KEY',
        value: 'new_value',
        projectRoot: '/test/project',
        logger: mockLogger,
        createBackup: false,
      });

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('KEY=new_value');
      expect(writtenContent).not.toContain('old_value');
    });
  });

  // ========== mergeProjectList ==========

  describe('mergeProjectList', () => {
    it('should merge without duplicates', () => {
      const existing = ['BACKEND', 'FRONTEND'];
      const newProjects = ['MOBILE', 'INFRA', 'BACKEND'];

      const result = mergeProjectList(existing, newProjects);
      expect(result).toEqual(['BACKEND', 'FRONTEND', 'MOBILE', 'INFRA']);
    });

    it('should be case-insensitive for duplicate check', () => {
      const existing = ['Backend'];
      const newProjects = ['backend', 'BACKEND', 'NewProject'];

      const result = mergeProjectList(existing, newProjects);
      expect(result).toEqual(['Backend', 'NewProject']);
    });

    it('should handle empty existing list', () => {
      const result = mergeProjectList([], ['A', 'B', 'C']);
      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('should handle empty new projects', () => {
      const result = mergeProjectList(['A', 'B'], []);
      expect(result).toEqual(['A', 'B']);
    });

    it('should handle both empty lists', () => {
      const result = mergeProjectList([], []);
      expect(result).toEqual([]);
    });

    it('should preserve existing order', () => {
      const existing = ['C', 'A', 'B'];
      const newProjects = ['D'];

      const result = mergeProjectList(existing, newProjects);
      expect(result).toEqual(['C', 'A', 'B', 'D']);
    });

    it('should handle duplicates within newProjects (case-insensitive)', () => {
      const existing: string[] = [];
      const newProjects = ['Alpha', 'alpha', 'ALPHA'];

      const result = mergeProjectList(existing, newProjects);
      expect(result).toEqual(['Alpha']);
    });
  });

  // ========== mergeEnvList ==========

  describe('mergeEnvList', () => {
    it('should merge new values into existing comma-separated list', async () => {
      mockExistsSync
        .mockReturnValueOnce(true)   // envPath exists for reading
        .mockReturnValueOnce(true)   // envPath exists for updateEnvFile reading
        .mockReturnValueOnce(false); // no backup check

      mockReadFile
        .mockResolvedValueOnce('JIRA_PROJECTS=BACKEND,FRONTEND\n')
        .mockResolvedValueOnce('JIRA_PROJECTS=BACKEND,FRONTEND\n');
      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);

      await mergeEnvList({
        key: 'JIRA_PROJECTS',
        newValues: ['MOBILE', 'INFRA', 'BACKEND'],
        projectRoot: '/test/project',
        logger: mockLogger,
        createBackup: false,
      });

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('JIRA_PROJECTS=BACKEND,FRONTEND,MOBILE,INFRA');
    });

    it('should create key when .env does not exist', async () => {
      mockExistsSync
        .mockReturnValueOnce(false)  // envPath doesn't exist for reading
        .mockReturnValueOnce(false)  // envPath doesn't exist for updateEnvFile
        .mockReturnValueOnce(false); // no backup

      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);

      await mergeEnvList({
        key: 'PROJECTS',
        newValues: ['A', 'B'],
        projectRoot: '/test/project',
        logger: mockLogger,
        createBackup: false,
      });

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('PROJECTS=A,B');
    });

    it('should handle empty existing value', async () => {
      mockExistsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      mockReadFile
        .mockResolvedValueOnce('OTHER_KEY=something\n')
        .mockResolvedValueOnce('OTHER_KEY=something\n');
      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);

      await mergeEnvList({
        key: 'NEW_LIST',
        newValues: ['X', 'Y'],
        projectRoot: '/test/project',
        logger: mockLogger,
        createBackup: false,
      });

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('NEW_LIST=X,Y');
    });
  });

  // ========== getEnvValue ==========

  describe('getEnvValue', () => {
    it('should return value for existing key', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('MY_KEY=my_value\nOTHER=stuff\n');

      const result = await getEnvValue('/test/project', 'MY_KEY');
      expect(result).toBe('my_value');
    });

    it('should return null for missing key', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('OTHER_KEY=value\n');

      const result = await getEnvValue('/test/project', 'MISSING_KEY');
      expect(result).toBeNull();
    });

    it('should return null when .env does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await getEnvValue('/test/project', 'KEY');
      expect(result).toBeNull();
    });

    it('should read from correct path', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('KEY=val\n');

      await getEnvValue('/my/project', 'KEY');
      expect(mockReadFile).toHaveBeenCalledWith('/my/project/.env', 'utf-8');
    });
  });

  // ========== envFileExists ==========

  describe('envFileExists', () => {
    it('should return true when .env exists', () => {
      mockExistsSync.mockReturnValue(true);

      const result = envFileExists('/test/project');
      expect(result).toBe(true);
    });

    it('should return false when .env does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = envFileExists('/test/project');
      expect(result).toBe(false);
    });

    it('should check correct path', () => {
      mockExistsSync.mockReturnValue(false);

      envFileExists('/my/project');
      expect(mockExistsSync).toHaveBeenCalledWith('/my/project/.env');
    });
  });

  // ========== restoreEnvBackup ==========

  describe('restoreEnvBackup', () => {
    it('should restore .env from backup', async () => {
      mockExistsSync.mockReturnValue(true);
      mockCopyFile.mockResolvedValue(undefined);

      await restoreEnvBackup('/test/project', mockLogger);

      expect(mockCopyFile).toHaveBeenCalledWith(
        '/test/project/.env.backup',
        '/test/project/.env'
      );
      expect(mockLogger.log).toHaveBeenCalledWith('Restored .env from backup');
    });

    it('should throw when no backup exists', async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(
        restoreEnvBackup('/test/project', mockLogger)
      ).rejects.toThrow('No .env.backup file found');
    });

    it('should use default logger when none provided', async () => {
      mockExistsSync.mockReturnValue(true);
      mockCopyFile.mockResolvedValue(undefined);

      // Should not throw
      await restoreEnvBackup('/test/project');
      expect(mockCopyFile).toHaveBeenCalled();
    });
  });
});
