import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit Tests for env-file.ts
 *
 * Tests: parseEnvFile, updateEnvVar, updateEnvVars, readEnvFile,
 * writeEnvFile, createEnvFromTemplate, isEnvGitignored,
 * ensureEnvGitignored, validateEnvVars, envFileExists
 */

// Mock fs module
const { mockExistsSync, mockReadFileSync, mockWriteFileSync, mockChmodSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockChmodSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  chmodSync: mockChmodSync,
}));

import {
  parseEnvFile,
  updateEnvVar,
  updateEnvVars,
  readEnvFile,
  writeEnvFile,
  createEnvFromTemplate,
  isEnvGitignored,
  ensureEnvGitignored,
  validateEnvVars,
  envFileExists,
} from '../../../src/utils/env-file.js';

describe('env-file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========== parseEnvFile ==========

  describe('parseEnvFile', () => {
    it('should parse simple KEY=VALUE pairs', () => {
      const content = 'FOO=bar\nBAZ=qux';
      const result = parseEnvFile(content);

      expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' });
    });

    it('should skip empty lines', () => {
      const content = 'FOO=bar\n\n\nBAZ=qux';
      const result = parseEnvFile(content);

      expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' });
    });

    it('should skip comment lines', () => {
      const content = '# comment\nFOO=bar\n# another\nBAZ=qux';
      const result = parseEnvFile(content);

      expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' });
    });

    it('should remove surrounding quotes from values', () => {
      const content = 'SINGLE=\'quoted\'\nDOUBLE="quoted"';
      const result = parseEnvFile(content);

      expect(result.SINGLE).toBe('quoted');
      expect(result.DOUBLE).toBe('quoted');
    });

    it('should handle values containing equals signs', () => {
      const content = 'URL=postgres://host:5432/db?ssl=true';
      const result = parseEnvFile(content);

      expect(result.URL).toBe('postgres://host:5432/db?ssl=true');
    });

    it('should handle empty values', () => {
      const content = 'EMPTY=';
      const result = parseEnvFile(content);

      expect(result.EMPTY).toBe('');
    });

    it('should return empty object for empty content', () => {
      expect(parseEnvFile('')).toEqual({});
    });

    it('should return empty object for only comments', () => {
      expect(parseEnvFile('# comment\n# another')).toEqual({});
    });

    it('should trim whitespace from keys and values', () => {
      const content = '  KEY  =  value  ';
      const result = parseEnvFile(content);

      expect(result.KEY).toBe('value');
    });

    it('should skip lines without equals sign', () => {
      const content = 'VALID=yes\nINVALID\nALSO_VALID=ok';
      const result = parseEnvFile(content);

      expect(Object.keys(result)).toEqual(['VALID', 'ALSO_VALID']);
    });

    it('should overwrite duplicate keys with last value', () => {
      const content = 'KEY=first\nKEY=second';
      const result = parseEnvFile(content);

      expect(result.KEY).toBe('second');
    });

    it('should handle mixed quote styles in value (partial quotes)', () => {
      const content = 'KEY="some value\'';
      const result = parseEnvFile(content);

      // Removes leading " and trailing '
      expect(result.KEY).toBe('some value');
    });
  });

  // ========== updateEnvVar ==========

  describe('updateEnvVar', () => {
    it('should update existing variable', () => {
      const content = 'FOO=old\nBAR=baz';
      const result = updateEnvVar(content, 'FOO', 'new');

      expect(result).toContain('FOO=new');
      expect(result).toContain('BAR=baz');
      expect(result).not.toContain('FOO=old');
    });

    it('should add new variable when key does not exist', () => {
      const content = 'EXISTING=value';
      const result = updateEnvVar(content, 'NEW_KEY', 'new_value');

      expect(result).toContain('EXISTING=value');
      expect(result).toContain('NEW_KEY=new_value');
    });

    it('should handle empty content (new file)', () => {
      const result = updateEnvVar('', 'KEY', 'value');

      expect(result).toBe('KEY=value\n');
    });

    it('should handle content with only whitespace', () => {
      const result = updateEnvVar('   \n  \n  ', 'KEY', 'value');

      // trimmed is empty, so treated as empty
      expect(result).toBe('KEY=value\n');
    });

    it('should append with newline when content already has entries', () => {
      const content = 'A=1';
      const result = updateEnvVar(content, 'B', '2');

      expect(result).toBe('A=1\nB=2\n');
    });

    it('should preserve other variables when updating', () => {
      const content = 'A=1\nB=2\nC=3';
      const result = updateEnvVar(content, 'B', 'updated');

      expect(result).toContain('A=1');
      expect(result).toContain('B=updated');
      expect(result).toContain('C=3');
    });
  });

  // ========== updateEnvVars ==========

  describe('updateEnvVars', () => {
    it('should update multiple variables', () => {
      const content = 'A=1\nB=2\nC=3';
      const vars = [
        { key: 'A', value: 'updated_a' },
        { key: 'B', value: 'updated_b' },
      ];

      const result = updateEnvVars(content, vars);

      expect(result).toContain('A=updated_a');
      expect(result).toContain('B=updated_b');
      expect(result).toContain('C=3');
    });

    it('should add new variables and update existing', () => {
      const content = 'EXISTING=val';
      const vars = [
        { key: 'EXISTING', value: 'new_val' },
        { key: 'BRAND_NEW', value: 'fresh' },
      ];

      const result = updateEnvVars(content, vars);

      expect(result).toContain('EXISTING=new_val');
      expect(result).toContain('BRAND_NEW=fresh');
    });

    it('should handle empty vars array', () => {
      const content = 'A=1';
      const result = updateEnvVars(content, []);

      expect(result).toBe('A=1');
    });

    it('should handle empty content with multiple vars', () => {
      const vars = [
        { key: 'A', value: '1' },
        { key: 'B', value: '2' },
      ];

      const result = updateEnvVars('', vars);

      expect(result).toContain('A=1');
      expect(result).toContain('B=2');
    });
  });

  // ========== readEnvFile ==========

  describe('readEnvFile', () => {
    it('should read .env file content when it exists', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('KEY=value\n');

      const result = readEnvFile('/test/project');

      expect(result).toBe('KEY=value\n');
      expect(mockReadFileSync).toHaveBeenCalledWith('/test/project/.env', 'utf-8');
    });

    it('should return empty string when .env does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = readEnvFile('/test/project');

      expect(result).toBe('');
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('should check correct path', () => {
      mockExistsSync.mockReturnValue(false);

      readEnvFile('/my/project');

      expect(mockExistsSync).toHaveBeenCalledWith('/my/project/.env');
    });
  });

  // ========== writeEnvFile ==========

  describe('writeEnvFile', () => {
    it('should write content to .env file', () => {
      mockChmodSync.mockImplementation(() => {});

      writeEnvFile('/test/project', 'KEY=value\n');

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/test/project/.env',
        'KEY=value\n',
        'utf-8'
      );
    });

    it('should set secure permissions (0o600)', () => {
      mockChmodSync.mockImplementation(() => {});

      writeEnvFile('/test/project', 'KEY=value\n');

      expect(mockChmodSync).toHaveBeenCalledWith('/test/project/.env', 0o600);
    });

    it('should not throw when chmod fails (Windows compatibility)', () => {
      mockChmodSync.mockImplementation(() => {
        throw new Error('chmod not supported');
      });

      // Should not throw
      expect(() => writeEnvFile('/test/project', 'KEY=value\n')).not.toThrow();
    });

    it('should log chmod error in DEBUG mode', () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockChmodSync.mockImplementation(() => {
        throw new Error('chmod not supported');
      });

      writeEnvFile('/test/project', 'content');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not set .env permissions')
      );

      consoleErrorSpy.mockRestore();
      process.env.DEBUG = originalDebug;
    });
  });

  // ========== createEnvFromTemplate ==========

  describe('createEnvFromTemplate', () => {
    it('should return .env.example content when template exists', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('# Template\nKEY=default_value\n');

      const result = createEnvFromTemplate('/test/project');

      expect(result).toBe('# Template\nKEY=default_value\n');
      expect(mockReadFileSync).toHaveBeenCalledWith('/test/project/.env.example', 'utf-8');
    });

    it('should return empty string when no template exists', () => {
      mockExistsSync.mockReturnValue(false);

      const result = createEnvFromTemplate('/test/project');

      expect(result).toBe('');
    });

    it('should check .env.example path', () => {
      mockExistsSync.mockReturnValue(false);

      createEnvFromTemplate('/my/project');

      expect(mockExistsSync).toHaveBeenCalledWith('/my/project/.env.example');
    });
  });

  // ========== isEnvGitignored ==========

  describe('isEnvGitignored', () => {
    it('should return true when .env is in .gitignore', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('node_modules/\n.env\ndist/\n');

      const result = isEnvGitignored('/test/project');
      expect(result).toBe(true);
    });

    it('should return false when .env is not in .gitignore', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('node_modules/\ndist/\n');

      const result = isEnvGitignored('/test/project');
      expect(result).toBe(false);
    });

    it('should return false when .gitignore does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = isEnvGitignored('/test/project');
      expect(result).toBe(false);
    });

    it('should match .env.local and similar patterns', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('.env.local\n');

      // .env.local includes '.env' substring
      const result = isEnvGitignored('/test/project');
      expect(result).toBe(true);
    });
  });

  // ========== ensureEnvGitignored ==========

  describe('ensureEnvGitignored', () => {
    it('should add .env to .gitignore when not present', () => {
      // First call from isEnvGitignored: .gitignore exists
      // Second call from ensureEnvGitignored: .gitignore exists (for reading)
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('node_modules/\ndist/\n');

      ensureEnvGitignored('/test/project');

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/test/project/.gitignore',
        expect.stringContaining('.env'),
        'utf-8'
      );
    });

    it('should not modify .gitignore when .env is already present', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('node_modules/\n.env\ndist/\n');

      ensureEnvGitignored('/test/project');

      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('should create .gitignore if it does not exist', () => {
      // isEnvGitignored checks: .gitignore doesn't exist -> returns false
      // ensureEnvGitignored checks: .gitignore doesn't exist for read
      mockExistsSync.mockReturnValue(false);

      ensureEnvGitignored('/test/project');

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/test/project/.gitignore',
        '.env\n',
        'utf-8'
      );
    });

    it('should append to existing .gitignore with newline separator', () => {
      // isEnvGitignored: exists=true, content doesn't include .env
      // ensureEnvGitignored body: exists=true, reads content
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('node_modules/');

      ensureEnvGitignored('/test/project');

      const written = mockWriteFileSync.mock.calls[0][1] as string;
      expect(written).toBe('node_modules/\n.env\n');
    });
  });

  // ========== validateEnvVars ==========

  describe('validateEnvVars', () => {
    it('should return valid when all required keys present', () => {
      const content = 'API_KEY=abc123\nDB_URL=postgres://localhost\n';
      const result = validateEnvVars(content, ['API_KEY', 'DB_URL']);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return invalid with missing keys', () => {
      const content = 'API_KEY=abc123\n';
      const result = validateEnvVars(content, ['API_KEY', 'DB_URL', 'SECRET']);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['DB_URL', 'SECRET']);
    });

    it('should treat empty values as missing', () => {
      const content = 'API_KEY=\nDB_URL=  ';
      const result = validateEnvVars(content, ['API_KEY', 'DB_URL']);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('API_KEY');
    });

    it('should handle empty required keys array', () => {
      const result = validateEnvVars('KEY=val', []);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should handle empty content with required keys', () => {
      const result = validateEnvVars('', ['KEY1', 'KEY2']);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['KEY1', 'KEY2']);
    });
  });

  // ========== envFileExists ==========

  describe('envFileExists', () => {
    it('should return true when .env exists', () => {
      mockExistsSync.mockReturnValue(true);

      expect(envFileExists('/test/project')).toBe(true);
    });

    it('should return false when .env does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      expect(envFileExists('/test/project')).toBe(false);
    });

    it('should check correct path', () => {
      mockExistsSync.mockReturnValue(false);

      envFileExists('/my/project');

      expect(mockExistsSync).toHaveBeenCalledWith('/my/project/.env');
    });
  });
});
