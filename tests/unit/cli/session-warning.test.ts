import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Unit Tests: Session Warning CLI Command
 *
 * Tests the session-warning CLI command that displays
 * restart warnings when plugins were installed.
 *
 * TDD Phase: RED - Tests written BEFORE implementation
 */

import {
  runSessionWarningCommand,
  formatSessionWarningOutput,
  type SessionWarningArgs,
  type SessionWarningResult,
} from '../../../src/cli/commands/session-warning.js';

describe('Session Warning CLI Command', () => {
  let tempDir: string;
  let stateDir: string;

  beforeEach(() => {
    // Create temporary project directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-cli-test-'));
    stateDir = path.join(tempDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('runSessionWarningCommand()', () => {
    describe('Argument Parsing', () => {
      it('should accept plugins list as argument', () => {
        // Given: Plugins list provided
        const args: SessionWarningArgs = {
          plugins: ['sw', 'sw-frontend'],
          projectPath: tempDir,
        };

        // When: runSessionWarningCommand() is called
        const result = runSessionWarningCommand(args);

        // Then: should process successfully
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      });

      it('should accept project path as argument', () => {
        // Given: Project path provided
        const args: SessionWarningArgs = {
          plugins: ['sw'],
          projectPath: '/some/project/path',
        };

        // When: runSessionWarningCommand() is called
        const result = runSessionWarningCommand(args);

        // Then: path should be in output
        expect(result.output).toContain('/some/project/path');
      });

      it('should handle missing plugins gracefully', () => {
        // Given: Empty plugins array
        const args: SessionWarningArgs = {
          plugins: [],
          projectPath: tempDir,
        };

        // When: runSessionWarningCommand() is called
        const result = runSessionWarningCommand(args);

        // Then: should indicate no warning needed
        expect(result.shouldHalt).toBe(false);
      });
    });

    describe('Warning Output', () => {
      it('should display warning to stdout', () => {
        // Given: Plugins and project path
        const args: SessionWarningArgs = {
          plugins: ['sw', 'sw-frontend'],
          projectPath: tempDir,
        };

        // When: runSessionWarningCommand() is called
        const result = runSessionWarningCommand(args);

        // Then: output should contain warning
        expect(result.output).toContain('SESSION RESTART REQUIRED');
      });

      it('should list all installed plugins', () => {
        // Given: Multiple plugins
        const args: SessionWarningArgs = {
          plugins: ['sw', 'sw-frontend', 'sw-backend'],
          projectPath: tempDir,
        };

        // When: runSessionWarningCommand() is called
        const result = runSessionWarningCommand(args);

        // Then: all plugins should be listed
        expect(result.output).toContain('sw');
        expect(result.output).toContain('sw-frontend');
        expect(result.output).toContain('sw-backend');
      });

      it('should include restart instructions', () => {
        // Given: Warning scenario
        const args: SessionWarningArgs = {
          plugins: ['sw'],
          projectPath: tempDir,
        };

        // When: runSessionWarningCommand() is called
        const result = runSessionWarningCommand(args);

        // Then: should have restart instructions
        expect(result.output).toMatch(/restart|exit|new session/i);
      });
    });

    describe('Exit Behavior', () => {
      it('should indicate halt needed when plugins installed', () => {
        // Given: Plugins installed
        const args: SessionWarningArgs = {
          plugins: ['sw'],
          projectPath: tempDir,
        };

        // When: runSessionWarningCommand() is called
        const result = runSessionWarningCommand(args);

        // Then: should indicate halt
        expect(result.shouldHalt).toBe(true);
      });

      it('should return special exit marker for hook detection', () => {
        // Given: Warning scenario
        const args: SessionWarningArgs = {
          plugins: ['sw'],
          projectPath: tempDir,
        };

        // When: runSessionWarningCommand() is called
        const result = runSessionWarningCommand(args);

        // Then: should have halt marker
        expect(result.haltMarker).toBeDefined();
        expect(result.haltMarker).toMatch(/HALT|STOP|RESTART/i);
      });

      it('should not halt when acknowledge flag is set', () => {
        // Given: Acknowledge flag passed
        const args: SessionWarningArgs = {
          plugins: ['sw'],
          projectPath: tempDir,
          acknowledge: true,
        };

        // When: runSessionWarningCommand() is called
        const result = runSessionWarningCommand(args);

        // Then: should display warning but not halt
        expect(result.output).toContain('SESSION RESTART REQUIRED');
        expect(result.shouldHalt).toBe(false);
      });
    });

    describe('Handoff Context', () => {
      it('should include handoff context when original intent provided', () => {
        // Given: Original intent
        const args: SessionWarningArgs = {
          plugins: ['sw', 'sw-frontend'],
          projectPath: tempDir,
          originalIntent: 'Create a React dashboard',
        };

        // When: runSessionWarningCommand() is called
        const result = runSessionWarningCommand(args);

        // Then: should include intent in context
        expect(result.output).toContain('React dashboard');
      });

      it('should generate continuation prompt', () => {
        // Given: Complete args
        const args: SessionWarningArgs = {
          plugins: ['sw'],
          projectPath: tempDir,
          originalIntent: 'Build auth system',
        };

        // When: runSessionWarningCommand() is called
        const result = runSessionWarningCommand(args);

        // Then: should have continuation section
        expect(result.output).toMatch(/continue|resume|proceed/i);
      });
    });
  });

  describe('formatSessionWarningOutput()', () => {
    it('should format warning with visual separators', () => {
      // Given: Warning data
      const output = formatSessionWarningOutput({
        plugins: ['sw'],
        projectPath: tempDir,
      });

      // Then: should have visual separators
      expect(output).toMatch(/[═─]/);
    });

    it('should format plugins as bullet list', () => {
      // Given: Multiple plugins
      const output = formatSessionWarningOutput({
        plugins: ['sw', 'sw-frontend', 'sw-backend'],
        projectPath: tempDir,
      });

      // Then: should have bullet format
      expect(output).toMatch(/[•\-*]\s+sw/);
    });

    it('should escape special characters in path', () => {
      // Given: Path with special chars
      const output = formatSessionWarningOutput({
        plugins: ['sw'],
        projectPath: '/path/with spaces/and [brackets]',
      });

      // Then: should preserve path correctly
      expect(output).toContain('/path/with spaces/and [brackets]');
    });
  });

  describe('Integration', () => {
    it('should work with session state module', async () => {
      // Given: Session state with plugins
      const { recordPluginInstallation } = await import(
        '../../../src/core/session/session-state.js'
      );
      recordPluginInstallation(tempDir, ['sw', 'sw-frontend'], {
        trigger: 'specweave-init',
        projectPath: tempDir,
      });

      // When: session-warning command runs
      const args: SessionWarningArgs = {
        plugins: ['sw', 'sw-frontend'],
        projectPath: tempDir,
      };
      const result = runSessionWarningCommand(args);

      // Then: should show warning
      expect(result.success).toBe(true);
      expect(result.shouldHalt).toBe(true);
    });

    it('should work with plugin install flags', async () => {
      // Given: Install flags created
      const { createPluginInstallFlag } = await import(
        '../../../src/cli/helpers/init/plugin-install-flags.js'
      );
      createPluginInstallFlag(tempDir, {
        plugins: ['sw'],
        trigger: 'specweave-init',
      });

      // When: session-warning command runs
      const args: SessionWarningArgs = {
        plugins: ['sw'],
        projectPath: tempDir,
      };
      const result = runSessionWarningCommand(args);

      // Then: should show warning
      expect(result.success).toBe(true);
    });
  });
});
