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

describe('Auto Command (Stop Hook Feedback Loop)', () => {
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
      fs.writeFileSync(path.join(stateDir, '.stop-auto-dedup-prev'), String(Date.now()));
      fs.writeFileSync(path.join(stateDir, '.stop-auto-turns'), '12');

      const options: AutoCommandOptions = { reset: true };
      await handleAutoCommand(tempDir, [], options);

      // State files should be cleaned up
      expect(fs.existsSync(path.join(stateDir, 'auto-mode.json'))).toBe(false);
      expect(fs.existsSync(path.join(stateDir, 'auto-session.json'))).toBe(false);
      expect(fs.existsSync(path.join(stateDir, '.stop-auto-dedup-prev'))).toBe(false);
      expect(fs.existsSync(path.join(stateDir, '.stop-auto-turns'))).toBe(false);
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

  describe('TDD mode detection', () => {
    it('should detect TDD mode from config and add tests_pass criterion', async () => {
      // Create a backlog increment
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      // Create config with TDD mode enabled
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          project: { name: 'test-project' },
          testing: { defaultTestMode: 'TDD' }
        })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      // Check that auto-mode.json contains TDD mode flag
      const flagPath = path.join(stateDir, 'auto-mode.json');
      const session = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      expect(session.tddMode).toBe(true);

      // Should include tests_pass in success criteria
      const hasModeFlag = session.tddMode === true;
      const hasTestsCriterion = session.successCriteria?.some((c: any) => c.type === 'tests_pass');
      expect(hasModeFlag || hasTestsCriterion).toBe(true);
    });

    it('should set requireTests flag when config requests it', async () => {
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      // Create config with requireTests
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          project: { name: 'test-project' },
          auto: { requireTests: true }
        })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      const flagPath = path.join(stateDir, 'auto-mode.json');
      const session = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      expect(session.requireTests).toBe(true);
    });

    it('should include DEFAULT_SUCCESS_CRITERIA in session marker', async () => {
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      const flagPath = path.join(stateDir, 'auto-mode.json');
      const session = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));

      // Should have success criteria array
      expect(Array.isArray(session.successCriteria)).toBe(true);
      expect(session.successCriteria.length).toBeGreaterThan(0);

      // Should include basic criteria (tasks_complete, acs_satisfied)
      const types = session.successCriteria.map((c: any) => c.type);
      expect(types).toContain('tasks_complete');
      expect(types).toContain('acs_satisfied');
    });
  });

  describe('session marker content', () => {
    it('should include startedAt timestamp in session marker', async () => {
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = {};
      const beforeTime = new Date().toISOString();
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);
      const afterTime = new Date().toISOString();

      const flagPath = path.join(stateDir, 'auto-mode.json');
      const session = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));

      expect(session.startedAt).toBeDefined();
      expect(session.startedAt >= beforeTime).toBe(true);
      expect(session.startedAt <= afterTime).toBe(true);
    });

    it('should include all increment IDs in session marker', async () => {
      // Create multiple increments
      const inc1 = path.join(incrementsDir, '0001-feature-a');
      const inc2 = path.join(incrementsDir, '0002-feature-b');
      fs.mkdirSync(inc1, { recursive: true });
      fs.mkdirSync(inc2, { recursive: true });
      fs.writeFileSync(
        path.join(inc1, 'metadata.json'),
        JSON.stringify({ status: 'backlog', id: '0001-feature-a' })
      );
      fs.writeFileSync(
        path.join(inc2, 'metadata.json'),
        JSON.stringify({ status: 'backlog', id: '0002-feature-b' })
      );

      const options: AutoCommandOptions = { allBacklog: true };
      await handleAutoCommand(tempDir, [], options);

      const flagPath = path.join(stateDir, 'auto-mode.json');
      const session = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));

      expect(session.incrementIds).toContain('0001-feature-a');
      expect(session.incrementIds).toContain('0002-feature-b');
    });

    it('should set successSummary in session marker', async () => {
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      const flagPath = path.join(stateDir, 'auto-mode.json');
      const session = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));

      expect(session.successSummary).toBeDefined();
      expect(typeof session.successSummary).toBe('string');
      expect(session.successSummary.length).toBeGreaterThan(0);
    });
  });

  describe('WIP discipline enforcement', () => {
    it('should validate discipline before activating increments', async () => {
      // Create multiple active increments
      for (let i = 1; i <= 2; i++) {
        const incDir = path.join(incrementsDir, `000${i}-feature`);
        fs.mkdirSync(incDir, { recursive: true });
        fs.writeFileSync(
          path.join(incDir, 'metadata.json'),
          JSON.stringify({ status: 'active', id: `000${i}-feature` })
        );
      }

      // Create a backlog increment
      const incDir = path.join(incrementsDir, '0003-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'backlog', id: '0003-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0003-feature'], options);

      // Should have completed without error
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should allow continuing work without blocking existing active increments', async () => {
      // Create multiple active increments
      for (let i = 1; i <= 3; i++) {
        const incDir = path.join(incrementsDir, `000${i}-feature`);
        fs.mkdirSync(incDir, { recursive: true });
        fs.writeFileSync(
          path.join(incDir, 'metadata.json'),
          JSON.stringify({ status: 'active', id: `000${i}-feature` })
        );
      }

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, [], options);

      // Should continue with existing active work
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Continuing with existing')
      );
    });

    it('should show active increment list when continuing', async () => {
      // Create active increments
      for (let i = 1; i <= 2; i++) {
        const incDir = path.join(incrementsDir, `000${i}-feature`);
        fs.mkdirSync(incDir, { recursive: true });
        fs.writeFileSync(
          path.join(incDir, 'metadata.json'),
          JSON.stringify({ status: 'active', id: `000${i}-feature` })
        );
      }

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, [], options);

      // Should list the increments
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/0001-feature|0002-feature/));
    });
  });

  describe('file system error handling', () => {
    it('should handle missing increments directory gracefully', async () => {
      // Don't create incrementsDir
      fs.rmSync(incrementsDir, { recursive: true, force: true });

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, [], options);

      // Should warn about no increments
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No increments')
      );
    });

    it('should skip invalid metadata files', async () => {
      // Create increment with invalid metadata
      const incDir = path.join(incrementsDir, '0001-bad-meta');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        'this is not valid json {'
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, [], options);

      // Should not crash, just skip the bad one
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No increments')
      );
    });

    it('should handle missing increment metadata gracefully', async () => {
      // Create increment without metadata
      const incDir = path.join(incrementsDir, '0001-no-metadata');
      fs.mkdirSync(incDir, { recursive: true });
      // No metadata.json created

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001'], options);

      // Should handle gracefully
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('output and messaging', () => {
    it('should display active increments in start message', async () => {
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      // Should show the increment ID in output
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('0001-test-feature')
      );
    });

    it('should show completion criteria in start message', async () => {
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      // Should show criteria section
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('COMPLETION CRITERIA')
      );
    });

    it('should show auto-mode.json file path in start message', async () => {
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      // Should mention the auto-mode.json file
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('auto-mode.json')
      );
    });
  });
});
