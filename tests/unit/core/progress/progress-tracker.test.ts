/**
 * Unit Tests: ProgressTracker
 *
 * Coverage Target: 90%
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressTracker } from '../../../../src/core/progress/progress-tracker.js';
import { silentLogger } from '../../../../src/utils/logger.js';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Progress Bar Rendering', () => {
    it('should render empty progress bar at 0%', () => {
      tracker = new ProgressTracker(100);
      const bar = tracker.renderProgressBar(0);

      expect(bar).toBe('[                              ]');
      expect(bar.length).toBe(32); // 30 chars + 2 brackets
    });

    it('should render partial progress bar at 37%', () => {
      tracker = new ProgressTracker(127);
      const bar = tracker.renderProgressBar(37);

      // 37% of 30 = 11.1 → 11 filled chars
      expect(bar).toMatch(/^\[=+>\s+\]$/);
      expect(bar.length).toBe(32);
    });

    it('should render full progress bar at 100%', () => {
      tracker = new ProgressTracker(100);
      const bar = tracker.renderProgressBar(100);

      expect(bar).toBe('[=============================>]');
      expect(bar.length).toBe(32);
    });

    it('should handle custom bar width', () => {
      tracker = new ProgressTracker(100, { barWidth: 20 });
      const bar = tracker.renderProgressBar(50);

      expect(bar.length).toBe(22); // 20 chars + 2 brackets
    });
  });

  describe('ETA Calculation', () => {
    it('should calculate ETA with linear extrapolation', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(now)
        .mockReturnValue(now + 30000); // 30 seconds elapsed

      tracker = new ProgressTracker(100);

      // Simulate 10 items in 30 seconds
      for (let i = 0; i < 10; i++) {
        tracker.update(`ITEM-${i}`, 'success');
      }

      const eta = tracker.getEta();
      expect(eta).toContain('remaining');
    });

    it('should return empty string when no items completed', () => {
      tracker = new ProgressTracker(100);
      const eta = tracker.getEta();
      expect(eta).toBe('');
    });
  });

  describe('Elapsed Time Formatting', () => {
    it('should format seconds only', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(now)
        .mockReturnValue(now + 45000); // 45 seconds

      tracker = new ProgressTracker(100);
      const elapsed = tracker.getElapsedTime();
      expect(elapsed).toBe('45s');
    });

    it('should format minutes and seconds', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(now)
        .mockReturnValue(now + 154000); // 2m 34s

      tracker = new ProgressTracker(100);
      const elapsed = tracker.getElapsedTime();
      expect(elapsed).toBe('2m 34s');
    });

    it('should format hours and minutes', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(now)
        .mockReturnValue(now + 4500000); // 1h 15m

      tracker = new ProgressTracker(100);
      const elapsed = tracker.getElapsedTime();
      expect(elapsed).toBe('1h 15m');
    });
  });

  describe('Progress Updates', () => {
    it('should track successful items', () => {
      tracker = new ProgressTracker(10, { logger: silentLogger });

      tracker.update('BACKEND', 'success');
      tracker.update('FRONTEND', 'success');

      // No direct getStats method, but we can test via finish()
      const summary = tracker.getSummary();
      expect(summary).toContain('Imported: 2');
    });

    it('should track failed items', () => {
      tracker = new ProgressTracker(10, { logger: silentLogger });

      tracker.update('BACKEND', 'success');
      tracker.update('FRONTEND', 'error', 'Connection timeout');
      tracker.update('MOBILE', 'error', 'Auth failed');

      const summary = tracker.getSummary();
      expect(summary).toContain('Failed: 2');
      expect(summary).toContain('Connection timeout');
    });
  });

  describe('Final Summary', () => {
    it('should display final summary with correct counts', () => {
      tracker = new ProgressTracker(100, { logger: silentLogger });

      // Simulate via finish()
      tracker.finish(80, 10, 10);

      const summary = tracker.getSummary();
      expect(summary).toContain('Import Complete');
      expect(summary).toContain('Imported: 80');
      expect(summary).toContain('Failed: 10');
      expect(summary).toContain('Skipped: 10');
    });

    it('should show success message when no failures', () => {
      tracker = new ProgressTracker(50, { logger: silentLogger });

      tracker.finish(50, 0, 0);

      const summary = tracker.getSummary();
      expect(summary).toContain('✅ Import Complete!');
      expect(summary).not.toContain('error');
    });

    it('should show errors in summary', () => {
      tracker = new ProgressTracker(10, { logger: silentLogger });

      tracker.update('PROJ-1', 'error', 'Network error');
      tracker.update('PROJ-2', 'error', 'Auth error');

      const summary = tracker.getSummary();
      expect(summary).toContain('Network error');
      expect(summary).toContain('Auth error');
    });
  });

  describe('Options', () => {
    it('should support custom update interval', () => {
      tracker = new ProgressTracker(100, {
        updateInterval: 10,
        logger: silentLogger
      });

      // Verify tracker was created
      expect(tracker).toBeDefined();
    });

    it('should support disabling ETA', () => {
      tracker = new ProgressTracker(100, {
        showEta: false,
        logger: silentLogger
      });

      tracker.update('ITEM-1', 'success');
      const eta = tracker.getEta();
      expect(eta).toBe('');
    });
  });
});
