/**
 * Unit tests for cross-platform shell configuration helper
 *
 * Tests shell detection, config file paths, and environment variable setup
 * across macOS, Linux, and Windows (PowerShell).
 *
 * @increment 0162-lsp-skill-integration
 * @task T-033 [RED]
 * @satisfies AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import the module we're testing (will fail until implemented)
import {
  detectShell,
  getShellConfigPath,
  getExportSyntax,
  isEnvVarConfigured,
  appendEnvVarToConfig,
  setupLspEnvVar,
  ShellType,
  ShellConfigResult,
} from '../../../../../src/cli/helpers/init/shell-config.js';

// Hoisted mock control - allows tests to inject errors into fs operations
const { mockFsError } = vi.hoisted(() => ({
  mockFsError: { pathPattern: null as string | null, errorMessage: null as string | null }
}));

// Mock native 'fs' module to allow controlled error injection
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();

  const createErrorIfMatches = (pathArg: unknown): void => {
    if (mockFsError.pathPattern && String(pathArg).includes(mockFsError.pathPattern)) {
      const err = new Error(mockFsError.errorMessage || 'EACCES: permission denied') as NodeJS.ErrnoException;
      err.code = 'EACCES';
      throw err;
    }
  };

  const wrappedMethods = {
    writeFileSync: (filePath: unknown, ...rest: unknown[]) => {
      createErrorIfMatches(filePath);
      return (actual.writeFileSync as Function)(filePath, ...rest);
    },
    appendFileSync: (filePath: unknown, ...rest: unknown[]) => {
      createErrorIfMatches(filePath);
      return (actual.appendFileSync as Function)(filePath, ...rest);
    }
  };

  return {
    ...actual,
    default: { ...actual, ...wrappedMethods },
    ...wrappedMethods
  };
});

describe('Shell Configuration Helper', () => {
  describe('detectShell() - AC-US6-01', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should detect zsh from SHELL env var', () => {
      process.env.SHELL = '/bin/zsh';
      expect(detectShell()).toBe('zsh');
    });

    it('should detect bash from SHELL env var', () => {
      process.env.SHELL = '/bin/bash';
      expect(detectShell()).toBe('bash');
    });

    it('should detect fish from SHELL env var', () => {
      process.env.SHELL = '/usr/bin/fish';
      expect(detectShell()).toBe('fish');
    });

    it('should detect zsh from /usr/local/bin/zsh path', () => {
      process.env.SHELL = '/usr/local/bin/zsh';
      expect(detectShell()).toBe('zsh');
    });

    it('should return "unknown" when SHELL is not set', () => {
      delete process.env.SHELL;
      expect(detectShell()).toBe('unknown');
    });

    it('should return "unknown" for unrecognized shell', () => {
      process.env.SHELL = '/bin/tcsh';
      expect(detectShell()).toBe('unknown');
    });
  });

  describe('getShellConfigPath() - AC-US6-02', () => {
    const homeDir = os.homedir();

    describe('macOS (darwin)', () => {
      it('should return ~/.zshrc for zsh on macOS', () => {
        const result = getShellConfigPath('zsh', 'darwin');
        expect(result).toBe(path.join(homeDir, '.zshrc'));
      });

      it('should return ~/.bash_profile for bash on macOS', () => {
        const result = getShellConfigPath('bash', 'darwin');
        expect(result).toBe(path.join(homeDir, '.bash_profile'));
      });

      it('should return fish config path for fish on macOS', () => {
        const result = getShellConfigPath('fish', 'darwin');
        expect(result).toBe(path.join(homeDir, '.config', 'fish', 'config.fish'));
      });

      it('should return ~/.profile for unknown shell on macOS', () => {
        const result = getShellConfigPath('unknown', 'darwin');
        expect(result).toBe(path.join(homeDir, '.profile'));
      });
    });

    describe('Linux', () => {
      it('should return ~/.zshrc for zsh on Linux', () => {
        const result = getShellConfigPath('zsh', 'linux');
        expect(result).toBe(path.join(homeDir, '.zshrc'));
      });

      it('should return ~/.bashrc for bash on Linux', () => {
        const result = getShellConfigPath('bash', 'linux');
        expect(result).toBe(path.join(homeDir, '.bashrc'));
      });

      it('should return fish config path for fish on Linux', () => {
        const result = getShellConfigPath('fish', 'linux');
        expect(result).toBe(path.join(homeDir, '.config', 'fish', 'config.fish'));
      });

      it('should return ~/.profile for unknown shell on Linux', () => {
        const result = getShellConfigPath('unknown', 'linux');
        expect(result).toBe(path.join(homeDir, '.profile'));
      });
    });

    describe('Windows', () => {
      it('should return PowerShell profile path for powershell on Windows', () => {
        const result = getShellConfigPath('powershell', 'win32');
        expect(result).toContain('PowerShell');
        expect(result).toContain('Microsoft.PowerShell_profile.ps1');
      });

      it('should return PowerShell profile for unknown shell on Windows', () => {
        const result = getShellConfigPath('unknown', 'win32');
        expect(result).toContain('PowerShell');
      });
    });
  });

  describe('getExportSyntax() - AC-US6-03', () => {
    it('should return POSIX export syntax for zsh', () => {
      const result = getExportSyntax('zsh', 'ENABLE_LSP_TOOL', '1');
      expect(result).toBe('export ENABLE_LSP_TOOL=1');
    });

    it('should return POSIX export syntax for bash', () => {
      const result = getExportSyntax('bash', 'ENABLE_LSP_TOOL', '1');
      expect(result).toBe('export ENABLE_LSP_TOOL=1');
    });

    it('should return fish set syntax for fish', () => {
      const result = getExportSyntax('fish', 'ENABLE_LSP_TOOL', '1');
      expect(result).toBe('set -gx ENABLE_LSP_TOOL 1');
    });

    it('should return PowerShell syntax for powershell', () => {
      const result = getExportSyntax('powershell', 'ENABLE_LSP_TOOL', '1');
      expect(result).toBe('$env:ENABLE_LSP_TOOL = "1"');
    });

    it('should return POSIX syntax for unknown shell', () => {
      const result = getExportSyntax('unknown', 'ENABLE_LSP_TOOL', '1');
      expect(result).toBe('export ENABLE_LSP_TOOL=1');
    });

    it('should handle variable names with underscores', () => {
      const result = getExportSyntax('zsh', 'MY_CUSTOM_VAR', 'value');
      expect(result).toBe('export MY_CUSTOM_VAR=value');
    });
  });

  describe('isEnvVarConfigured() - AC-US6-04', () => {
    let tempDir: string;
    let configFile: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shell-config-test-'));
      configFile = path.join(tempDir, '.zshrc');
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should return true when export already exists', () => {
      fs.writeFileSync(configFile, 'export ENABLE_LSP_TOOL=1\n');
      expect(isEnvVarConfigured(configFile, 'ENABLE_LSP_TOOL')).toBe(true);
    });

    it('should return true when export exists with spaces', () => {
      fs.writeFileSync(configFile, 'export ENABLE_LSP_TOOL = 1\n');
      expect(isEnvVarConfigured(configFile, 'ENABLE_LSP_TOOL')).toBe(true);
    });

    it('should return true for fish syntax', () => {
      fs.writeFileSync(configFile, 'set -gx ENABLE_LSP_TOOL 1\n');
      expect(isEnvVarConfigured(configFile, 'ENABLE_LSP_TOOL')).toBe(true);
    });

    it('should return true for PowerShell syntax', () => {
      fs.writeFileSync(configFile, '$env:ENABLE_LSP_TOOL = "1"\n');
      expect(isEnvVarConfigured(configFile, 'ENABLE_LSP_TOOL')).toBe(true);
    });

    it('should return false when variable not present', () => {
      fs.writeFileSync(configFile, 'export OTHER_VAR=1\n');
      expect(isEnvVarConfigured(configFile, 'ENABLE_LSP_TOOL')).toBe(false);
    });

    it('should return false for empty file', () => {
      fs.writeFileSync(configFile, '');
      expect(isEnvVarConfigured(configFile, 'ENABLE_LSP_TOOL')).toBe(false);
    });

    it('should return false when file does not exist', () => {
      expect(isEnvVarConfigured('/nonexistent/file', 'ENABLE_LSP_TOOL')).toBe(false);
    });

    it('should handle commented out exports', () => {
      fs.writeFileSync(configFile, '# export ENABLE_LSP_TOOL=1\n');
      expect(isEnvVarConfigured(configFile, 'ENABLE_LSP_TOOL')).toBe(false);
    });

    it('should detect variable among other content', () => {
      fs.writeFileSync(
        configFile,
        `# My shell config
export PATH="/usr/local/bin:$PATH"
export ENABLE_LSP_TOOL=1
alias ll="ls -la"
`
      );
      expect(isEnvVarConfigured(configFile, 'ENABLE_LSP_TOOL')).toBe(true);
    });
  });

  describe('appendEnvVarToConfig() - AC-US6-05', () => {
    let tempDir: string;
    let configFile: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shell-config-test-'));
      configFile = path.join(tempDir, '.zshrc');
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should append export to existing file', () => {
      fs.writeFileSync(configFile, 'export PATH="/usr/local/bin:$PATH"\n');
      appendEnvVarToConfig(configFile, 'zsh', 'ENABLE_LSP_TOOL', '1');

      const content = fs.readFileSync(configFile, 'utf-8');
      expect(content).toContain('export ENABLE_LSP_TOOL=1');
      expect(content).toContain('export PATH='); // Original content preserved
    });

    it('should create file if it does not exist', () => {
      const newFile = path.join(tempDir, '.new_config');
      appendEnvVarToConfig(newFile, 'zsh', 'ENABLE_LSP_TOOL', '1');

      expect(fs.existsSync(newFile)).toBe(true);
      const content = fs.readFileSync(newFile, 'utf-8');
      expect(content).toContain('export ENABLE_LSP_TOOL=1');
    });

    it('should add newline before export if file does not end with newline', () => {
      fs.writeFileSync(configFile, 'export PATH="/usr/local/bin:$PATH"');
      appendEnvVarToConfig(configFile, 'zsh', 'ENABLE_LSP_TOOL', '1');

      const content = fs.readFileSync(configFile, 'utf-8');
      expect(content).toMatch(/\nexport ENABLE_LSP_TOOL=1/);
    });

    it('should use fish syntax for fish shell', () => {
      appendEnvVarToConfig(configFile, 'fish', 'ENABLE_LSP_TOOL', '1');

      const content = fs.readFileSync(configFile, 'utf-8');
      expect(content).toContain('set -gx ENABLE_LSP_TOOL 1');
    });

    it('should use PowerShell syntax for powershell', () => {
      appendEnvVarToConfig(configFile, 'powershell', 'ENABLE_LSP_TOOL', '1');

      const content = fs.readFileSync(configFile, 'utf-8');
      expect(content).toContain('$env:ENABLE_LSP_TOOL = "1"');
    });

    it('should add comment header for SpecWeave', () => {
      appendEnvVarToConfig(configFile, 'zsh', 'ENABLE_LSP_TOOL', '1');

      const content = fs.readFileSync(configFile, 'utf-8');
      expect(content).toMatch(/# SpecWeave|# Added by SpecWeave/i);
    });

    it('should create parent directories if needed', () => {
      const nestedFile = path.join(tempDir, 'subdir', 'config', '.zshrc');
      appendEnvVarToConfig(nestedFile, 'zsh', 'ENABLE_LSP_TOOL', '1');

      expect(fs.existsSync(nestedFile)).toBe(true);
    });
  });

  describe('setupLspEnvVar() - Integration', () => {
    let tempDir: string;
    let originalEnv: NodeJS.ProcessEnv;
    let originalPlatform: NodeJS.Platform;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shell-config-test-'));
      originalEnv = process.env;
      originalPlatform = process.platform;
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      // Reset mock error injection
      mockFsError.pathPattern = null;
      mockFsError.errorMessage = null;

      fs.rmSync(tempDir, { recursive: true, force: true });
      process.env = originalEnv;
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return success result with config path', () => {
      process.env.SHELL = '/bin/zsh';
      process.env.HOME = tempDir;

      const result = setupLspEnvVar();

      expect(result.success).toBe(true);
      expect(result.configPath).toContain('.zshrc');
      expect(result.shell).toBe('zsh');
    });

    it('should not append if already configured', () => {
      process.env.SHELL = '/bin/zsh';
      process.env.HOME = tempDir;

      const configFile = path.join(tempDir, '.zshrc');
      fs.writeFileSync(configFile, 'export ENABLE_LSP_TOOL=1\n');

      const result = setupLspEnvVar();

      expect(result.success).toBe(true);
      expect(result.alreadyConfigured).toBe(true);

      // Should not duplicate
      const content = fs.readFileSync(configFile, 'utf-8');
      const matches = content.match(/ENABLE_LSP_TOOL/g);
      expect(matches?.length).toBe(1);
    });

    it('should return shell type and syntax in result', () => {
      process.env.SHELL = '/usr/bin/fish';
      process.env.HOME = tempDir;

      // Create fish config directory
      fs.mkdirSync(path.join(tempDir, '.config', 'fish'), { recursive: true });

      const result = setupLspEnvVar();

      expect(result.shell).toBe('fish');
      expect(result.exportSyntax).toBe('set -gx ENABLE_LSP_TOOL 1');
    });

    it('should handle errors gracefully', () => {
      process.env.SHELL = '/bin/zsh';
      process.env.HOME = tempDir;

      // Use mock to inject write error (cross-platform compatible)
      // Note: This will fail any write to .zshrc regardless of the actual homedir
      mockFsError.pathPattern = '.zshrc';
      mockFsError.errorMessage = 'EACCES: permission denied, write';

      // Try to set up LSP env var - mock will fail the write operation
      const result = setupLspEnvVar();

      // The test verifies the result structure is always valid
      expect(result.shell).toBe('zsh');
      expect(result.configPath).toBeDefined();
      expect(result.exportSyntax).toBeDefined();

      // With mock active, should fail with error
      // (unless the config file already has ENABLE_LSP_TOOL, in which case success=true)
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        // If succeeded, it's because ENABLE_LSP_TOOL was already configured
        expect(result.alreadyConfigured).toBe(true);
      }
    });
  });

  describe('ShellType enum', () => {
    it('should export ShellType with expected values', () => {
      expect(ShellType).toBeDefined();
      expect(Object.values(ShellType)).toContain('zsh');
      expect(Object.values(ShellType)).toContain('bash');
      expect(Object.values(ShellType)).toContain('fish');
      expect(Object.values(ShellType)).toContain('powershell');
      expect(Object.values(ShellType)).toContain('unknown');
    });
  });

  describe('Edge cases', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shell-config-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should handle file with only whitespace', () => {
      const configFile = path.join(tempDir, '.zshrc');
      fs.writeFileSync(configFile, '   \n\n   \n');

      expect(isEnvVarConfigured(configFile, 'ENABLE_LSP_TOOL')).toBe(false);
    });

    it('should handle very long config files', () => {
      const configFile = path.join(tempDir, '.zshrc');
      const longContent = 'export SOME_VAR=1\n'.repeat(10000);
      fs.writeFileSync(configFile, longContent);

      expect(isEnvVarConfigured(configFile, 'ENABLE_LSP_TOOL')).toBe(false);

      appendEnvVarToConfig(configFile, 'zsh', 'ENABLE_LSP_TOOL', '1');
      expect(isEnvVarConfigured(configFile, 'ENABLE_LSP_TOOL')).toBe(true);
    });

    it('should handle special characters in file path', () => {
      const configFile = path.join(tempDir, 'path with spaces', '.zshrc');
      fs.mkdirSync(path.dirname(configFile), { recursive: true });

      appendEnvVarToConfig(configFile, 'zsh', 'ENABLE_LSP_TOOL', '1');
      expect(fs.existsSync(configFile)).toBe(true);
      expect(isEnvVarConfigured(configFile, 'ENABLE_LSP_TOOL')).toBe(true);
    });
  });
});
