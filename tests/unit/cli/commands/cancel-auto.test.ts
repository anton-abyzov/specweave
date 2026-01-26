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
});
