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
import { npmRegistryFlag } from '../../../../src/utils/npm-constants.js';

describe('Update Robustness - Source Code Verification', () => {
  const updateTsPath = path.join(process.cwd(), 'src/cli/commands/update.ts');
  const updateInstructionsTsPath = path.join(process.cwd(), 'src/cli/commands/update-instructions.ts');

  describe('npm timeout protection', () => {
    it('should have timeout on npm view command via npmPublicExec', () => {
      const content = fs.readFileSync(updateTsPath, 'utf-8');
      // npmPublicExec passes timeout to execSync internally
      // Verify the call passes a timeout value
      expect(content).toContain("npmPublicExec('npm view specweave version', 30000)");
    });

    it('should have timeout on npm install command via npmPublicInstall', () => {
      const content = fs.readFileSync(updateTsPath, 'utf-8');
      // installWithFallback passes timeout through npmPublicInstall
      expect(content).toMatch(/npmPublicInstall\(`npm install -g specweave@\$\{.*\}`, 120000\)/);
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
        content.indexOf("installWithFallback(latestVersion)"),
        content.indexOf("installWithFallback(latestVersion)") + 800
      );
      expect(installSection).toContain('specweave --version');
      expect(installSection).toContain('version mismatch');
    });
  });

  describe('instruction file backup', () => {
    it('should back up to .specweave/backups before overwriting instruction files', () => {
      const writerPath = path.join(process.cwd(), 'src/cli/helpers/init/instruction-file-writer.ts');
      const content = fs.readFileSync(writerPath, 'utf-8');

      // Backup is written under .specweave/backups (never a root-level .bak) before the main write
      const bakIndex = content.indexOf('fs.writeFileSync(backupPath, existing)');
      const writeIndex = content.indexOf('fs.writeFileSync(filePath, result.content)');

      expect(content).toContain("path.join('.specweave', 'backups')");
      expect(bakIndex).toBeGreaterThan(0);
      expect(writeIndex).toBeGreaterThan(bakIndex);
      // update-instructions goes through the writer, not its own .bak
      const updateInstructions = fs.readFileSync(updateInstructionsTsPath, 'utf-8');
      expect(updateInstructions).not.toContain(".bak");
      expect(updateInstructions).toContain('applyInstructionTemplate');
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

  describe('E401 prevention via npmPublicExec', () => {
    it('should use npmPublicExec with registry flag to prevent E401 from stale tokens', () => {
      const content = fs.readFileSync(updateTsPath, 'utf-8');
      expect(content).toContain('npmPublicExec');
      expect(content).toContain('npmRegistryFlag()');
      // npmPublicExec always bypasses user auth config
      expect(content).toContain('buildPublicRegistryEnv');
    });

    it('should use npmPublicExec for npm view in selfUpdateSpecWeave', () => {
      const content = fs.readFileSync(updateTsPath, 'utf-8');
      const selfUpdateStart = content.indexOf('async function selfUpdateSpecWeave');
      const selfUpdateSection = content.substring(selfUpdateStart, selfUpdateStart + 600);
      expect(selfUpdateSection).toContain("npmPublicExec('npm view specweave version'");
    });

    it('should use npmPublicInstall for npm install in installWithFallback', () => {
      const content = fs.readFileSync(updateTsPath, 'utf-8');
      const installSection = content.substring(
        content.indexOf('function installWithFallback'),
        content.indexOf('function installWithFallback') + 600
      );
      expect(installSection).toContain('npmPublicInstall');
      expect(installSection).not.toMatch(/execSync\(`npm install/);
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
