/**
 * Tests for Shell Auto-Detection
 *
 * @module tests/unit/core/lazy-loading/shell-detector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import {
  detectShell,
  detectAvailableShells,
  getScriptExtension,
  getInstallScriptPath,
  buildInstallCommand,
  getShellDisplayName,
  validateShell,
  getShellSummary,
  SHELL_OVERRIDE_ENV,
  ShellType,
} from '../../../../src/core/lazy-loading/shell-detector.js';

describe('Shell Auto-Detection', () => {
  const originalEnv = process.env[SHELL_OVERRIDE_ENV];

  beforeEach(() => {
    // Clear override
    delete process.env[SHELL_OVERRIDE_ENV];
  });

  afterEach(() => {
    // Restore
    if (originalEnv) {
      process.env[SHELL_OVERRIDE_ENV] = originalEnv;
    } else {
      delete process.env[SHELL_OVERRIDE_ENV];
    }
  });

  describe('detectAvailableShells', () => {
    it('should return an array of available shells', () => {
      const shells = detectAvailableShells();
      expect(Array.isArray(shells)).toBe(true);
      // At least one shell should be available
      expect(shells.length).toBeGreaterThan(0);
    });

    it('should include bash on Unix systems', () => {
      if (os.platform() !== 'win32') {
        const shells = detectAvailableShells();
        expect(shells).toContain('bash');
      }
    });
  });

  describe('detectShell', () => {
    it('should return shell info with type and path', () => {
      const shell = detectShell();
      expect(shell).toHaveProperty('type');
      expect(shell).toHaveProperty('path');
      expect(shell).toHaveProperty('isOverride');
      expect(['bash', 'powershell', 'cmd']).toContain(shell.type);
    });

    it('should prefer bash when available', () => {
      const shells = detectAvailableShells();
      if (shells.includes('bash')) {
        const shell = detectShell();
        expect(shell.type).toBe('bash');
        expect(shell.isOverride).toBe(false);
      }
    });

    it('should respect environment variable override', () => {
      const available = detectAvailableShells();
      if (available.includes('powershell')) {
        process.env[SHELL_OVERRIDE_ENV] = 'powershell';
        const shell = detectShell();
        expect(shell.type).toBe('powershell');
        expect(shell.isOverride).toBe(true);
      }
    });

    it('should respect forceShell option', () => {
      const available = detectAvailableShells();
      if (available.includes('powershell')) {
        const shell = detectShell({ forceShell: 'powershell' });
        expect(shell.type).toBe('powershell');
        expect(shell.isOverride).toBe(true);
      }
    });

    it('should skip version when skipVersion is true', () => {
      const shell = detectShell({ skipVersion: true });
      // Version may or may not be present, but shouldn't throw
      expect(shell).toHaveProperty('type');
    });

    it('should include version when detected', () => {
      const shell = detectShell();
      // On most systems, bash version should be detectable
      if (shell.type === 'bash' && os.platform() !== 'win32') {
        expect(shell.version).toBeDefined();
      }
    });
  });

  describe('getScriptExtension', () => {
    it('should return .sh for bash', () => {
      expect(getScriptExtension('bash')).toBe('.sh');
    });

    it('should return .ps1 for powershell', () => {
      expect(getScriptExtension('powershell')).toBe('.ps1');
    });

    it('should return .bat for cmd', () => {
      expect(getScriptExtension('cmd')).toBe('.bat');
    });
  });

  describe('getInstallScriptPath', () => {
    it('should return correct path for bash', () => {
      const path = getInstallScriptPath('bash');
      expect(path).toBe('scripts/lazy-loading/install-plugins.sh');
    });

    it('should return correct path for powershell', () => {
      const path = getInstallScriptPath('powershell');
      expect(path).toBe('scripts/lazy-loading/install-plugins.ps1');
    });

    it('should return correct path for cmd', () => {
      const path = getInstallScriptPath('cmd');
      expect(path).toBe('scripts/lazy-loading/install-plugins.bat');
    });
  });

  describe('buildInstallCommand', () => {
    it('should build bash command correctly', () => {
      const cmd = buildInstallCommand('bash', '/path/to/script.sh', ['--core']);
      expect(cmd).toBe('bash "/path/to/script.sh" --core');
    });

    it('should build powershell command correctly', () => {
      const cmd = buildInstallCommand('powershell', '/path/to/script.ps1', ['-Group', 'core']);
      expect(cmd).toBe('pwsh -ExecutionPolicy Bypass -File "/path/to/script.ps1" -Group core');
    });

    it('should build cmd command correctly', () => {
      const cmd = buildInstallCommand('cmd', 'C:\\path\\script.bat', ['/core']);
      expect(cmd).toBe('"C:\\path\\script.bat" /core');
    });

    it('should handle empty args', () => {
      const cmd = buildInstallCommand('bash', '/path/to/script.sh');
      expect(cmd).toBe('bash "/path/to/script.sh"');
    });
  });

  describe('getShellDisplayName', () => {
    it('should return human-readable names', () => {
      expect(getShellDisplayName('bash')).toBe('Bash');
      expect(getShellDisplayName('powershell')).toBe('PowerShell');
      expect(getShellDisplayName('cmd')).toBe('Command Prompt');
    });
  });

  describe('validateShell', () => {
    it('should validate available shells', () => {
      const available = detectAvailableShells();
      for (const shell of available) {
        expect(validateShell(shell)).toBe(true);
      }
    });

    it('should return false for unavailable shells on non-Windows', () => {
      if (os.platform() !== 'win32') {
        expect(validateShell('cmd')).toBe(false);
      }
    });
  });

  describe('getShellSummary', () => {
    it('should return formatted summary string', () => {
      const summary = getShellSummary();
      expect(typeof summary).toBe('string');
      expect(summary).toContain('Selected:');
      expect(summary).toContain('Path:');
      expect(summary).toContain('Available:');
    });

    it('should show override when set', () => {
      const available = detectAvailableShells();
      if (available.length > 0) {
        process.env[SHELL_OVERRIDE_ENV] = available[0];
        const summary = getShellSummary();
        expect(summary).toContain('(override)');
        expect(summary).toContain('Override:');
      }
    });
  });
});

describe('Edge Cases', () => {
  it('should handle unknown shell gracefully in env override', () => {
    const originalEnv = process.env[SHELL_OVERRIDE_ENV];
    process.env[SHELL_OVERRIDE_ENV] = 'unknown-shell';

    const shell = detectShell();
    // Should fall back to auto-detection
    expect(['bash', 'powershell', 'cmd']).toContain(shell.type);

    if (originalEnv) {
      process.env[SHELL_OVERRIDE_ENV] = originalEnv;
    } else {
      delete process.env[SHELL_OVERRIDE_ENV];
    }
  });

  it('should handle case-insensitive env override', () => {
    const available = detectAvailableShells();
    if (available.includes('bash')) {
      const originalEnv = process.env[SHELL_OVERRIDE_ENV];
      process.env[SHELL_OVERRIDE_ENV] = 'BASH';

      const shell = detectShell();
      expect(shell.type).toBe('bash');
      expect(shell.isOverride).toBe(true);

      if (originalEnv) {
        process.env[SHELL_OVERRIDE_ENV] = originalEnv;
      } else {
        delete process.env[SHELL_OVERRIDE_ENV];
      }
    }
  });
});

describe('Cross-Platform Behavior', () => {
  const platform = os.platform();

  if (platform === 'darwin' || platform === 'linux') {
    it('should find bash on Unix', () => {
      const shell = detectShell();
      expect(shell.type).toBe('bash');
      expect(shell.path).toBe('/bin/bash');
    });
  }

  if (platform === 'win32') {
    it('should find at least one shell on Windows', () => {
      const shells = detectAvailableShells();
      expect(shells.length).toBeGreaterThan(0);
      // cmd should always be available on Windows
      expect(shells).toContain('cmd');
    });
  }
});
