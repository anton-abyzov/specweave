/**
 * Tests for Auto Mode CLI Command (v3.1 Session-Scoped Auto)
 *
 * Verifies the simplified auto mode implementation:
 * - Uses auto-mode.json to track EXPLICIT auto mode activation
 * - Session-scoped: file is cleared on session end/startup
 * - Stop hook only fires when auto mode was EXPLICITLY activated
 * - Prevents false-positive stop hook triggers on normal prompts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { handleAutoCommand, AutoCommandOptions } from '../../../../src/cli/commands/auto.js';

describe('Auto Command (Ralph Wiggum Pattern)', () => {
  let tempDir: string;
  let incrementsDir: string;
  let stateDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-test-'));
    incrementsDir = path.join(tempDir, '.specweave/increments');
    stateDir = path.join(tempDir, '.specweave/state');

    // Create basic SpecWeave structure
    fs.mkdirSync(incrementsDir, { recursive: true });
    fs.mkdirSync(stateDir, { recursive: true });

    // Create config.json (required for isSpecWeaveInitialized)
    fs.writeFileSync(
      path.join(tempDir, '.specweave/config.json'),
      JSON.stringify({ project: { name: 'test-project' } })
    );

    // Spy on console.log to capture output
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Mock process.exit to prevent test from exiting
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    exitSpy.mockRestore();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Session-Scoped Auto Mode', () => {
    it('should create auto-mode.json when auto mode is started (session marker)', async () => {
      // Create an active increment
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      // Session-scoped auto: auto-mode.json MUST exist to indicate explicit auto activation
      // This prevents stop hook from firing on normal prompts (fixes bug where hook
      // triggered on every response when there were active increments)
      const flagPath = path.join(stateDir, 'auto-mode.json');
      expect(fs.existsSync(flagPath)).toBe(true);

      // Validate the session marker contents
      const session = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      expect(session.active).toBe(true);
      expect(session.incrementIds).toContain('0001-test-feature');

      // Legacy session files should NOT be created
      const sessionPath = path.join(stateDir, 'auto-session.json');
      expect(fs.existsSync(sessionPath)).toBe(false);

      const lockPath = path.join(stateDir, 'active-session.lock');
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it('should show start message with active increment', async () => {
      // Create an active increment
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      // Should have printed start message
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('AUTO MODE READY'));
    });
  });

  describe('increment finding', () => {
    it('should find active increments when no IDs specified', async () => {
      // Create an active increment
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, [], options);

      // Should show the active increment
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0001-test-feature'));
    });

    it('should activate backlog increments with --all-backlog', async () => {
      // Create backlog increments
      const inc1 = path.join(incrementsDir, '0001-feature-one');
      const inc2 = path.join(incrementsDir, '0002-feature-two');
      fs.mkdirSync(inc1, { recursive: true });
      fs.mkdirSync(inc2, { recursive: true });
      fs.writeFileSync(
        path.join(inc1, 'metadata.json'),
        JSON.stringify({ status: 'backlog', id: '0001-feature-one' })
      );
      fs.writeFileSync(
        path.join(inc2, 'metadata.json'),
        JSON.stringify({ status: 'planned', id: '0002-feature-two' })
      );

      const options: AutoCommandOptions = { allBacklog: true };
      await handleAutoCommand(tempDir, [], options);

      // Both increments should be activated (metadata changed)
      const meta1 = JSON.parse(fs.readFileSync(path.join(inc1, 'metadata.json'), 'utf-8'));
      const meta2 = JSON.parse(fs.readFileSync(path.join(inc2, 'metadata.json'), 'utf-8'));

      expect(meta1.status).toBe('active');
      expect(meta2.status).toBe('active');
    });

    it('should find increment by prefix', async () => {
      // Create an increment
      const incDir = path.join(incrementsDir, '0001-long-feature-name');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-long-feature-name' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001'], options);

      // Should have found the increment
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0001-long-feature-name'));
    });

    it('should warn when increment not found', async () => {
      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['9999-nonexistent'], options);

      // Should warn about not found and exit
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('dry run', () => {
    it('should NOT activate increment in dry run mode', async () => {
      // Create a backlog increment
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'backlog', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = { dryRun: true };
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      // Should show dry run message
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry Run'));

      // Increment should NOT be activated
      const meta = JSON.parse(fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf-8'));
      expect(meta.status).toBe('backlog');
    });
  });

  describe('prompt analysis mode', () => {
    it('should analyze prompt without exit when no parallel flags', async () => {
      const options: AutoCommandOptions = { prompt: 'Build a React dashboard with API' };

      // Should NOT exit, just analyze and return
      await handleAutoCommand(tempDir, [], options);

      // Should show analysis
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Prompt Analysis'));
    });
  });

  describe('error handling', () => {
    it('should warn when no increments found', async () => {
      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, [], options);

      // Should warn about no increments
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No increments'));
    });

    it('should warn about backlog when only backlog exists', async () => {
      // Create a backlog increment
      const incDir = path.join(incrementsDir, '0001-backlog-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'backlog', id: '0001-backlog-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, [], options);

      // Should mention backlog exists
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('backlog'));
    });
  });

  describe('reset mode', () => {
    it('should clean up state files with --reset', async () => {
      // Create some state files
      fs.writeFileSync(path.join(stateDir, 'auto-mode.json'), '{}');
      fs.writeFileSync(path.join(stateDir, 'auto-session.json'), '{}');

      const options: AutoCommandOptions = { reset: true };
      await handleAutoCommand(tempDir, [], options);

      // State files should be cleaned up
      expect(fs.existsSync(path.join(stateDir, 'auto-mode.json'))).toBe(false);
      expect(fs.existsSync(path.join(stateDir, 'auto-session.json'))).toBe(false);
    });
  });

  describe('increment activation', () => {
    it('should activate specified increment by changing metadata', async () => {
      // Create a backlog increment
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'backlog', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      // Increment should be activated
      const meta = JSON.parse(fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf-8'));
      expect(meta.status).toBe('active');
    });

    it('should not modify already active increments', async () => {
      // Create an already active increment
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      const originalMeta = { status: 'active', id: '0001-test-feature', updated: '2020-01-01T00:00:00Z' };
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify(originalMeta)
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      // Metadata timestamp should not have changed (no re-activation)
      const meta = JSON.parse(fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf-8'));
      expect(meta.updated).toBe('2020-01-01T00:00:00Z');
    });
  });
});
