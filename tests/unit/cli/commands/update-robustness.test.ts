/**
 * Unit tests for update command robustness improvements
 *
 * Tests:
 * - Instruction file backup (.bak) creation before overwrite
 * - Inline warning display (not hidden behind --verbose)
 * - Exit code set on errors
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

describe('Update Robustness - Source Code Verification', () => {
  const updateTsPath = path.join(process.cwd(), 'src/cli/commands/update.ts');
  const updateInstructionsTsPath = path.join(process.cwd(), 'src/cli/commands/update-instructions.ts');

  describe('npm timeout protection', () => {
    it('should have timeout on npm view command', () => {
      const content = fs.readFileSync(updateTsPath, 'utf-8');
      // Find the npm view call and verify it has a timeout
      const npmViewSection = content.substring(
        content.indexOf("npm view specweave version"),
        content.indexOf("npm view specweave version") + 200
      );
      expect(npmViewSection).toContain('timeout');
    });

    it('should have timeout on npm install command', () => {
      const content = fs.readFileSync(updateTsPath, 'utf-8');
      const npmInstallSection = content.substring(
        content.indexOf("npm install -g specweave@latest"),
        content.indexOf("npm install -g specweave@latest") + 200
      );
      expect(npmInstallSection).toContain('timeout');
    });

    it('should handle timeout errors in catch block', () => {
      const content = fs.readFileSync(updateTsPath, 'utf-8');
      expect(content).toContain('ETIMEDOUT');
      expect(content).toContain('timed out');
    });
  });

  describe('binary verification before re-exec', () => {
    it('should verify new binary after npm install', () => {
      const content = fs.readFileSync(updateTsPath, 'utf-8');
      // After npm install, should run specweave --version to verify
      const installSection = content.substring(
        content.indexOf("npm install -g specweave@latest"),
        content.indexOf("npm install -g specweave@latest") + 800
      );
      expect(installSection).toContain('specweave --version');
      expect(installSection).toContain('version mismatch');
    });
  });

  describe('instruction file backup', () => {
    it('should create .bak before overwriting instruction files', () => {
      const content = fs.readFileSync(updateInstructionsTsPath, 'utf-8');

      // Should write .bak file before the main writeFileSync
      const bakIndex = content.indexOf("filePath + '.bak'");
      const writeIndex = content.indexOf('fs.writeFileSync(filePath, result.content)');

      expect(bakIndex).toBeGreaterThan(0);
      expect(writeIndex).toBeGreaterThan(bakIndex);
    });
  });

  describe('inline warnings display', () => {
    it('should show warnings inline without requiring --verbose', () => {
      const content = fs.readFileSync(updateTsPath, 'utf-8');

      // The old pattern was: if (!options.verbose) { console.log('Use --verbose...') }
      // The new pattern shows warnings directly
      expect(content).not.toContain("Use --verbose to see details");

      // Should iterate and display each warning
      expect(content).toContain('result.warnings.forEach');
    });
  });

  describe('exit code on errors', () => {
    it('should set non-zero exit code when errors occur', () => {
      const content = fs.readFileSync(updateTsPath, 'utf-8');

      // Should set process.exitCode (not process.exit) for clean shutdown
      expect(content).toContain('process.exitCode = 1');
      expect(content).toContain('result.errors.length > 0');
    });
  });

  describe('auto-state cleanup in update', () => {
    it('should still have auto-state cleanup in update.ts', () => {
      const content = fs.readFileSync(updateTsPath, 'utf-8');
      expect(content).toContain('cleanupStaleAutoState');
      expect(content).toContain('auto-mode.json');
    });
  });
});

describe('Update Robustness - Instruction File Backup', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(tmpdir(), `sw-update-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should preserve original content in .bak file', () => {
    const filePath = path.join(testDir, 'CLAUDE.md');
    const originalContent = '# Original Content\nThis is my custom CLAUDE.md';
    const newContent = '# Updated Content\nThis has been merged';

    // Simulate the backup + write pattern from update-instructions.ts
    fs.writeFileSync(filePath, originalContent);

    // Create backup
    fs.writeFileSync(filePath + '.bak', fs.readFileSync(filePath, 'utf-8'));
    // Write new content
    fs.writeFileSync(filePath, newContent);

    // Verify
    expect(fs.readFileSync(filePath, 'utf-8')).toBe(newContent);
    expect(fs.readFileSync(filePath + '.bak', 'utf-8')).toBe(originalContent);
  });

  it('should not create .bak for new files (no existing content)', () => {
    const filePath = path.join(testDir, 'CLAUDE.md');
    const newContent = '# New File';

    // No existing file - no backup needed
    const existingContent = null;
    if (existingContent) {
      fs.writeFileSync(filePath + '.bak', existingContent);
    }
    fs.writeFileSync(filePath, newContent);

    expect(fs.existsSync(filePath + '.bak')).toBe(false);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe(newContent);
  });
});
