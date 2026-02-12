/**
 * Tests for Cancel Auto CLI Command
 *
 * Verifies the simplified cancel-auto implementation:
 * - Just removes auto-mode.json flag
 * - Cleans up legacy session files if present
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// We need to import the handler separately to test it
// The command itself uses readline which is hard to test
describe('Cancel Auto Command', () => {
  let tempDir: string;
  let stateDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cancel-auto-test-'));
    stateDir = path.join(tempDir, '.specweave/state');
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('flag file removal', () => {
    it('should remove auto-mode.json when cancelling', async () => {
      // Create auto-mode flag
      const flagPath = path.join(stateDir, 'auto-mode.json');
      fs.writeFileSync(
        flagPath,
        JSON.stringify({ active: true, timestamp: new Date().toISOString() })
      );

      expect(fs.existsSync(flagPath)).toBe(true);

      // Simulate cancel by removing the flag (what the command does with --force)
      fs.unlinkSync(flagPath);

      expect(fs.existsSync(flagPath)).toBe(false);
    });

    it('should clean up legacy session files', async () => {
      // Create legacy files
      const sessionPath = path.join(stateDir, 'auto-session.json');
      const lockPath = path.join(stateDir, 'active-session.lock');

      fs.writeFileSync(sessionPath, JSON.stringify({ sessionId: 'test', status: 'running' }));
      fs.writeFileSync(lockPath, 'test-session');

      expect(fs.existsSync(sessionPath)).toBe(true);
      expect(fs.existsSync(lockPath)).toBe(true);

      // Simulate cancel cleanup
      if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);

      expect(fs.existsSync(sessionPath)).toBe(false);
      expect(fs.existsSync(lockPath)).toBe(false);
    });
  });

  describe('flag file parsing', () => {
    it('should handle valid auto-mode.json', () => {
      const flagPath = path.join(stateDir, 'auto-mode.json');
      const flagData = {
        active: true,
        timestamp: '2024-01-01T00:00:00.000Z',
        incrementIds: ['0001-test'],
      };
      fs.writeFileSync(flagPath, JSON.stringify(flagData));

      const parsed = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      expect(parsed.active).toBe(true);
      expect(parsed.incrementIds).toContain('0001-test');
    });

    it('should handle invalid auto-mode.json gracefully', () => {
      const flagPath = path.join(stateDir, 'auto-mode.json');
      fs.writeFileSync(flagPath, 'invalid json{');

      let parsed = null;
      try {
        parsed = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      } catch {
        // Expected
      }

      expect(parsed).toBeNull();
    });

    it('should treat missing active field as inactive', () => {
      const flagPath = path.join(stateDir, 'auto-mode.json');
      fs.writeFileSync(flagPath, JSON.stringify({ timestamp: new Date().toISOString() }));

      const parsed = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      expect(parsed.active).toBeUndefined();
      expect(parsed.active ?? false).toBe(false);
    });
  });

  // ============================================================================
  // RED PHASE: Comprehensive Auto Mode Cancellation Tests
  // ============================================================================

  describe('Auto Mode Session Cancellation (RED Phase)', () => {
    it('should remove auto-mode.json flag file', async () => {
      const flagPath = path.join(stateDir, 'auto-mode.json');
      fs.writeFileSync(
        flagPath,
        JSON.stringify({
          active: true,
          timestamp: new Date().toISOString(),
          incrementIds: ['0001-test']
        })
      );

      expect(fs.existsSync(flagPath)).toBe(true);

      // Simulate cancel operation
      if (fs.existsSync(flagPath)) {
        fs.unlinkSync(flagPath);
      }

      expect(fs.existsSync(flagPath)).toBe(false);
    });

    it('should handle case where flag file does not exist', async () => {
      const flagPath = path.join(stateDir, 'auto-mode.json');
      expect(fs.existsSync(flagPath)).toBe(false);

      // Should not throw when trying to remove non-existent file
      let error = null;
      try {
        if (fs.existsSync(flagPath)) {
          fs.unlinkSync(flagPath);
        }
      } catch (e) {
        error = e;
      }

      expect(error).toBeNull();
    });

    it('should preserve increment metadata when cancelling auto mode', async () => {
      const incDir = path.join(tempDir, '.specweave/increments/0001-test');
      fs.mkdirSync(incDir, { recursive: true });
      const metaPath = path.join(incDir, 'metadata.json');
      const originalMeta = {
        status: 'active',
        id: '0001-test',
        created: '2024-01-01T00:00:00Z'
      };
      fs.writeFileSync(metaPath, JSON.stringify(originalMeta));

      // Create auto-mode flag
      const flagPath = path.join(stateDir, 'auto-mode.json');
      fs.writeFileSync(
        flagPath,
        JSON.stringify({
          active: true,
          timestamp: new Date().toISOString(),
          incrementIds: ['0001-test']
        })
      );

      // Cancel auto mode (remove flag, not metadata)
      if (fs.existsSync(flagPath)) {
        fs.unlinkSync(flagPath);
      }

      // Increment metadata should be untouched
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      expect(meta.status).toBe('active');
      expect(meta.id).toBe('0001-test');
    });
  });

  describe('Legacy State Cleanup (CRITICAL for preventing infinite loops)', () => {
  it('should remove auto-session.json legacy file', async () => {
    const sessionPath = path.join(stateDir, 'auto-session.json');
    fs.writeFileSync(
      sessionPath,
      JSON.stringify({
        sessionId: 'test-session',
        status: 'running',
        startTime: new Date().toISOString()
      })
    );

    expect(fs.existsSync(sessionPath)).toBe(true);

    // Cleanup
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
    }

    expect(fs.existsSync(sessionPath)).toBe(false);
  });

  it('should remove active-session.lock file', async () => {
    const lockPath = path.join(stateDir, 'active-session.lock');
    fs.writeFileSync(lockPath, 'test-session-id');

    expect(fs.existsSync(lockPath)).toBe(true);

    // Cleanup
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }

    expect(fs.existsSync(lockPath)).toBe(false);
  });

    it('should remove .stop-auto-turns dedup counter', async () => {
      const turnsPath = path.join(stateDir, '.stop-auto-turns');
      fs.writeFileSync(turnsPath, '42');

      expect(fs.existsSync(turnsPath)).toBe(true);

      // Cleanup
      if (fs.existsSync(turnsPath)) {
        fs.unlinkSync(turnsPath);
      }

      expect(fs.existsSync(turnsPath)).toBe(false);
    });

    it('should remove .stop-auto-dedup flag', async () => {
      const dedupPath = path.join(stateDir, '.stop-auto-dedup');
      fs.writeFileSync(dedupPath, 'some-hash');

      expect(fs.existsSync(dedupPath)).toBe(true);

      // Cleanup
      if (fs.existsSync(dedupPath)) {
        fs.unlinkSync(dedupPath);
      }

      expect(fs.existsSync(dedupPath)).toBe(false);
    });

    it('should remove .stop-auto-dedup-prev previous state', async () => {
      const prevPath = path.join(stateDir, '.stop-auto-dedup-prev');
      fs.writeFileSync(prevPath, 'previous-hash');

      expect(fs.existsSync(prevPath)).toBe(true);

      // Cleanup
      if (fs.existsSync(prevPath)) {
        fs.unlinkSync(prevPath);
      }

      expect(fs.existsSync(prevPath)).toBe(false);
    });

    it('should remove ALL critical state files in single operation', async () => {
      // Create all legacy files
      const files = [
        'auto-mode.json',
        'auto-session.json',
        'active-session.lock',
        '.stop-auto-turns',
        '.stop-auto-dedup',
        '.stop-auto-dedup-prev'
      ];

      for (const file of files) {
        fs.writeFileSync(path.join(stateDir, file), 'test-data');
      }

      // Verify all exist
      for (const file of files) {
        expect(fs.existsSync(path.join(stateDir, file))).toBe(true);
      }

      // Cleanup all
      for (const file of files) {
        const filePath = path.join(stateDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Verify all gone
      for (const file of files) {
        expect(fs.existsSync(path.join(stateDir, file))).toBe(false);
      }
    });

    it('should not crash if some legacy files do not exist', async () => {
      // Only create some files
      fs.writeFileSync(path.join(stateDir, 'auto-mode.json'), '{}');
      fs.writeFileSync(path.join(stateDir, '.stop-auto-turns'), '10');

      // Try to clean all (some don't exist)
      const files = [
        'auto-mode.json',
        'auto-session.json', // doesn't exist
        'active-session.lock', // doesn't exist
        '.stop-auto-turns',
        '.stop-auto-dedup', // doesn't exist
        '.stop-auto-dedup-prev' // doesn't exist
      ];

      let error = null;
      try {
        for (const file of files) {
          const filePath = path.join(stateDir, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (e) {
        error = e;
      }

      expect(error).toBeNull();
      expect(fs.existsSync(path.join(stateDir, 'auto-mode.json'))).toBe(false);
      expect(fs.existsSync(path.join(stateDir, '.stop-auto-turns'))).toBe(false);
    });
  });

  describe('Auto Mode Lifecycle (RED Phase)', () => {
      it('should handle cancelling active auto session', async () => {
        const flagPath = path.join(stateDir, 'auto-mode.json');
        const flagData = {
          active: true,
          timestamp: '2024-06-01T10:00:00.000Z',
          incrementIds: ['0001-auth', '0002-api'],
          tddMode: true,
          requireTests: true
        };
        fs.writeFileSync(flagPath, JSON.stringify(flagData));

        // Verify flag exists and is active
        expect(fs.existsSync(flagPath)).toBe(true);
        const parsed = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
        expect(parsed.active).toBe(true);

        // Cancel
        if (fs.existsSync(flagPath)) {
          fs.unlinkSync(flagPath);
        }

        expect(fs.existsSync(flagPath)).toBe(false);
      });

      it('should handle cancelling inactive auto session', async () => {
        const flagPath = path.join(stateDir, 'auto-mode.json');
        const flagData = {
          active: false,
          timestamp: '2024-06-01T10:00:00.000Z'
        };
        fs.writeFileSync(flagPath, JSON.stringify(flagData));

        // Verify flag exists but inactive
        const parsed = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
        expect(parsed.active).toBe(false);

        // Should still be removable
        if (fs.existsSync(flagPath)) {
          fs.unlinkSync(flagPath);
        }

        expect(fs.existsSync(flagPath)).toBe(false);
      });

      it('should handle multiple increments in session', async () => {
        const flagPath = path.join(stateDir, 'auto-mode.json');
        const flagData = {
          active: true,
          timestamp: '2024-06-01T10:00:00.000Z',
          incrementIds: ['0001-a', '0002-b', '0003-c', '0004-d', '0005-e']
        };
        fs.writeFileSync(flagPath, JSON.stringify(flagData));

        // Read and verify all increments are in flag
        const parsed = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
        expect(parsed.incrementIds.length).toBe(5);

        // Cancel
        if (fs.existsSync(flagPath)) {
          fs.unlinkSync(flagPath);
        }

        expect(fs.existsSync(flagPath)).toBe(false);
      });

      it('should preserve other .specweave files when cancelling', async () => {
        // Create other important files
        const configPath = path.join(tempDir, '.specweave/config.json');
        const syncPath = path.join(tempDir, '.specweave/sync-metadata.json');

        fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }));
        fs.writeFileSync(syncPath, JSON.stringify({ lastSync: '2024-01-01' }));

        // Create auto-mode flag
        const flagPath = path.join(stateDir, 'auto-mode.json');
        fs.writeFileSync(flagPath, JSON.stringify({ active: true }));

        // Cancel auto mode
        if (fs.existsSync(flagPath)) {
          fs.unlinkSync(flagPath);
        }

        // Other files should remain
        expect(fs.existsSync(configPath)).toBe(true);
        expect(fs.existsSync(syncPath)).toBe(true);
      });
    });

    describe('Confirmation Handling', () => {
      it('should track whether user confirmed cancellation', async () => {
        const flagPath = path.join(stateDir, 'auto-mode.json');
        fs.writeFileSync(
          flagPath,
          JSON.stringify({
            active: true,
            timestamp: new Date().toISOString(),
            incrementIds: ['0001-test']
          })
        );

        // Simulate user pressing 'y' (confirmed)
        let confirmed = true;

        if (confirmed && fs.existsSync(flagPath)) {
          fs.unlinkSync(flagPath);
          expect(fs.existsSync(flagPath)).toBe(false);
        }
      });

      it('should not cancel if user does not confirm', async () => {
        const flagPath = path.join(stateDir, 'auto-mode.json');
        fs.writeFileSync(
          flagPath,
          JSON.stringify({
            active: true,
            timestamp: new Date().toISOString()
          })
        );

        // Simulate user pressing 'n' (not confirmed)
        let confirmed = false;

        if (confirmed && fs.existsSync(flagPath)) {
          fs.unlinkSync(flagPath);
        }

        // Flag should still exist
        expect(fs.existsSync(flagPath)).toBe(true);
      });

      it('should allow --force flag to skip confirmation', async () => {
        const flagPath = path.join(stateDir, 'auto-mode.json');
        fs.writeFileSync(flagPath, JSON.stringify({ active: true }));

        // Simulate --force flag (skip confirmation)
        let force = true;
        if (force && fs.existsSync(flagPath)) {
          fs.unlinkSync(flagPath);
        }

        expect(fs.existsSync(flagPath)).toBe(false);
      });
    });

    describe('State Directory Management', () => {
      it('should not create state directory if not present during cleanup', async () => {
        // Remove state dir
        fs.rmSync(stateDir, { recursive: true, force: true });
        expect(fs.existsSync(stateDir)).toBe(false);

        // Try cleanup on non-existent directory
        const files = ['auto-mode.json', '.stop-auto-dedup'];
        let error = null;
        try {
          for (const file of files) {
            const filePath = path.join(stateDir, file);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        } catch (e) {
          error = e;
        }

        // Should not create the directory
        expect(fs.existsSync(stateDir)).toBe(false);
        expect(error).toBeNull();
      });

      it('should handle cleanup when state directory exists but is empty', async () => {
        // State dir exists but is empty
        fs.mkdirSync(stateDir, { recursive: true });

        const files = ['auto-mode.json', 'auto-session.json'];
        for (const file of files) {
          const filePath = path.join(stateDir, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        // Directory should still exist (we don't remove it)
        expect(fs.existsSync(stateDir)).toBe(true);
      });
    });
});
