/**
 * Tests for Auto Mode CLI Command (Ralph Wiggum Pattern)
 *
 * Verifies the simplified auto mode implementation:
 * - Only auto-mode.json flag file is created
 * - No session files, no lock files
 * - Increment status is the source of truth
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
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('auto-mode.json flag', () => {
    it('should create auto-mode.json when starting auto mode', async () => {
      // Create an active increment
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      const flagPath = path.join(stateDir, 'auto-mode.json');
      expect(fs.existsSync(flagPath)).toBe(true);

      const flag = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      expect(flag.active).toBe(true);
      expect(flag.timestamp).toBeTruthy();
      expect(flag.incrementIds).toContain('0001-test-feature');
    });

    it('should NOT create session file (only auto-mode.json)', async () => {
      // Create an active increment
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      // Should NOT have session file
      const sessionPath = path.join(stateDir, 'auto-session.json');
      expect(fs.existsSync(sessionPath)).toBe(false);

      // Should NOT have lock file
      const lockPath = path.join(stateDir, 'active-session.lock');
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it('should warn if auto mode is already active', async () => {
      // Create existing auto-mode flag
      fs.writeFileSync(
        path.join(stateDir, 'auto-mode.json'),
        JSON.stringify({ active: true, timestamp: new Date().toISOString() })
      );

      // Create an increment
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      // Capture console output
      const consoleSpy = vi.spyOn(console, 'log');

      const options: AutoCommandOptions = {};
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      // Should have warned about active auto mode
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already active'));

      consoleSpy.mockRestore();
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

      const flagPath = path.join(stateDir, 'auto-mode.json');
      expect(fs.existsSync(flagPath)).toBe(true);

      const flag = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      expect(flag.incrementIds).toContain('0001-test-feature');
    });

    it('should find backlog increments with --all-backlog', async () => {
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

      const flagPath = path.join(stateDir, 'auto-mode.json');
      expect(fs.existsSync(flagPath)).toBe(true);

      const flag = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      expect(flag.incrementIds).toHaveLength(2);
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

      const flagPath = path.join(stateDir, 'auto-mode.json');
      expect(fs.existsSync(flagPath)).toBe(true);

      const flag = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      expect(flag.incrementIds).toContain('0001-long-feature-name');
    });
  });

  describe('dry run', () => {
    it('should NOT create flag file in dry run mode', async () => {
      // Create an active increment
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test-feature' })
      );

      const options: AutoCommandOptions = { dryRun: true };
      await handleAutoCommand(tempDir, ['0001-test-feature'], options);

      const flagPath = path.join(stateDir, 'auto-mode.json');
      expect(fs.existsSync(flagPath)).toBe(false);
    });
  });

  describe('prompt mode', () => {
    it('should create marker file for prompt mode', async () => {
      const options: AutoCommandOptions = { prompt: 'Build a feature' };

      // This will exit with code 2, so we need to catch it
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      try {
        await handleAutoCommand(tempDir, [], options);
      } catch (e) {
        // Expected - process.exit was called
      }

      const markerPath = path.join(stateDir, 'auto-needs-increment.json');
      expect(fs.existsSync(markerPath)).toBe(true);

      const marker = JSON.parse(fs.readFileSync(markerPath, 'utf-8'));
      expect(marker.needsIncrementCreation).toBe(true);
      expect(marker.fromChunking).toBe(true);
      expect(marker.prompt).toBe('Build a feature');

      exitSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should exit with code 1 when increment not found and --no-increment set', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(code => {
        throw new Error(`process.exit(${code})`);
      });

      const options: AutoCommandOptions = { noIncrement: true };

      try {
        await handleAutoCommand(tempDir, [], options);
      } catch (e) {
        expect((e as Error).message).toBe('process.exit(1)');
      }

      exitSpy.mockRestore();
    });

    it('should exit with code 2 when no increments and auto-creation needed', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(code => {
        throw new Error(`process.exit(${code})`);
      });

      const options: AutoCommandOptions = {};

      try {
        await handleAutoCommand(tempDir, [], options);
      } catch (e) {
        expect((e as Error).message).toBe('process.exit(2)');
      }

      // Should have created marker file
      const markerPath = path.join(stateDir, 'auto-needs-increment.json');
      expect(fs.existsSync(markerPath)).toBe(true);

      exitSpy.mockRestore();
    });
  });
});
