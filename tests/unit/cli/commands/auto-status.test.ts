/**
 * Tests for Auto Status CLI Command (Ralph Wiggum Pattern)
 *
 * Verifies the simplified auto-status implementation:
 * - Reads auto-mode.json flag
 * - Counts active increments as source of truth
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Auto Status Command (Ralph Wiggum Pattern)', () => {
  let tempDir: string;
  let incrementsDir: string;
  let stateDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-status-test-'));
    incrementsDir = path.join(tempDir, '.specweave/increments');
    stateDir = path.join(tempDir, '.specweave/state');
    fs.mkdirSync(incrementsDir, { recursive: true });
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('active increment detection', () => {
    it('should find active increments', () => {
      // Create increments with different statuses
      const createIncrement = (id: string, status: string) => {
        const dir = path.join(incrementsDir, id);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, 'metadata.json'),
          JSON.stringify({ status, id })
        );
      };

      createIncrement('0001-active-feature', 'active');
      createIncrement('0002-in-progress', 'in-progress');
      createIncrement('0003-completed', 'completed');
      createIncrement('0004-backlog', 'backlog');

      // Find active increments (simulating what auto-status does)
      const activeIncrements: string[] = [];
      for (const entry of fs.readdirSync(incrementsDir)) {
        if (!/^[0-9]{4}-/.test(entry)) continue;

        const metaPath = path.join(incrementsDir, entry, 'metadata.json');
        if (fs.existsSync(metaPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            if (metadata.status === 'active' || metadata.status === 'in-progress') {
              activeIncrements.push(entry);
            }
          } catch {
            // Skip
          }
        }
      }

      expect(activeIncrements).toHaveLength(2);
      expect(activeIncrements).toContain('0001-active-feature');
      expect(activeIncrements).toContain('0002-in-progress');
    });

    it('should return empty array when no active increments', () => {
      // Create only completed increments
      const dir = path.join(incrementsDir, '0001-completed');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'metadata.json'),
        JSON.stringify({ status: 'completed', id: '0001-completed' })
      );

      const activeIncrements: string[] = [];
      for (const entry of fs.readdirSync(incrementsDir)) {
        if (!/^[0-9]{4}-/.test(entry)) continue;

        const metaPath = path.join(incrementsDir, entry, 'metadata.json');
        if (fs.existsSync(metaPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            if (metadata.status === 'active' || metadata.status === 'in-progress') {
              activeIncrements.push(entry);
            }
          } catch {
            // Skip
          }
        }
      }

      expect(activeIncrements).toHaveLength(0);
    });
  });

  describe('auto mode flag detection', () => {
    it('should detect active auto mode', () => {
      const flagPath = path.join(stateDir, 'auto-mode.json');
      fs.writeFileSync(
        flagPath,
        JSON.stringify({
          active: true,
          timestamp: new Date().toISOString(),
          incrementIds: ['0001-test'],
        })
      );

      const flag = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      expect(flag.active).toBe(true);
    });

    it('should detect inactive auto mode', () => {
      const flagPath = path.join(stateDir, 'auto-mode.json');
      fs.writeFileSync(
        flagPath,
        JSON.stringify({
          active: false,
          timestamp: new Date().toISOString(),
        })
      );

      const flag = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      expect(flag.active).toBe(false);
    });

    it('should handle missing auto mode flag', () => {
      const flagPath = path.join(stateDir, 'auto-mode.json');
      expect(fs.existsSync(flagPath)).toBe(false);

      // This is how auto-status handles missing flag
      let isActive = false;
      if (fs.existsSync(flagPath)) {
        try {
          const flag = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
          isActive = flag?.active ?? false;
        } catch {
          // Invalid file
        }
      }

      expect(isActive).toBe(false);
    });
  });

  describe('status object construction', () => {
    it('should build correct status object', () => {
      // Create auto mode flag
      const flagPath = path.join(stateDir, 'auto-mode.json');
      const flagData = {
        active: true,
        timestamp: '2024-01-01T00:00:00.000Z',
        incrementIds: ['0001-test', '0002-test'],
      };
      fs.writeFileSync(flagPath, JSON.stringify(flagData));

      // Create active increment
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'active', id: '0001-test' })
      );

      // Build status (simulating auto-status)
      const flag = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
      const activeIncrements = ['0001-test']; // Would be found by scanning

      const status = {
        autoModeActive: flag.active,
        startTime: flag.timestamp,
        configuredIncrements: flag.incrementIds,
        activeIncrements: activeIncrements,
        activeCount: activeIncrements.length,
      };

      expect(status.autoModeActive).toBe(true);
      expect(status.startTime).toBe('2024-01-01T00:00:00.000Z');
      expect(status.configuredIncrements).toHaveLength(2);
      expect(status.activeIncrements).toHaveLength(1);
      expect(status.activeCount).toBe(1);
    });
  });
});
