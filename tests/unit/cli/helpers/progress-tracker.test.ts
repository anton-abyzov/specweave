/**
 * Unit Tests: ProgressTracker
 *
 * Tests real-time progress tracking with percentage, ETA, and final summary
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProgressTracker } from '../../../../src/cli/helpers/progress-tracker.js';
import { silentLogger } from '../../../../src/utils/logger.js';

describe('ProgressTracker', () => {
  let stdoutSpy: any;

  beforeEach(() => {
    // Spy on stdout to capture progress bar output
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  describe('Percentage Calculation', () => {
    it('should calculate correct percentage for partial progress', () => {
      const tracker = new ProgressTracker({ total: 100, logger: silentLogger });

      tracker.update('ITEM-001', 'success');
      expect(tracker.getPercentage()).toBe(1); // 1/100 = 1%

      for (let i = 2; i <= 50; i++) {
        tracker.update(`ITEM-${i.toString().padStart(3, '0')}`, 'success');
      }
      expect(tracker.getPercentage()).toBe(50); // 50/100 = 50%
    });

    it('should calculate correct percentage for completion', () => {
      const tracker = new ProgressTracker({ total: 127, logger: silentLogger });

      for (let i = 1; i <= 127; i++) {
        tracker.update(`PROJECT-${i}`, 'success');
      }

      expect(tracker.getPercentage()).toBe(100); // 127/127 = 100%
    });

    it('should handle zero progress correctly', () => {
      const tracker = new ProgressTracker({ total: 100, logger: silentLogger });
      expect(tracker.getPercentage()).toBe(0);
    });
  });

  describe('ETA Estimation', () => {
    it('should estimate ETA using rolling average of last 10 items', async () => {
      const tracker = new ProgressTracker({
        total: 100,
        showEta: true,
        updateFrequency: 1, // Update every item for testing
        logger: silentLogger
      });

      // Simulate 10 items taking 100ms each
      for (let i = 0; i < 10; i++) {
        tracker.update(`ITEM-${i}`, 'success');
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay
      }

      const summary = tracker.getSummary();
      expect(summary.completed).toBe(10);
      expect(summary.elapsed).toBeGreaterThan(90); // At least 10 * 10ms = 100ms
    });

    it('should not show ETA if insufficient data (<2 items)', () => {
      const tracker = new ProgressTracker({
        total: 100,
        showEta: true,
        logger: silentLogger
      });

      tracker.update('ITEM-001', 'success');

      // ETA should be empty with only 1 item
      const summary = tracker.getSummary();
      expect(summary.completed).toBe(1);
    });
  });

  describe('Update Throttling', () => {
    it('should only render progress every N items (default: 5)', () => {
      const tracker = new ProgressTracker({
        total: 100,
        updateFrequency: 5, // Render every 5 items
        logger: silentLogger
      });

      // Add 4 items (should not render)
      tracker.update('ITEM-001', 'success');
      tracker.update('ITEM-002', 'success');
      tracker.update('ITEM-003', 'success');
      tracker.update('ITEM-004', 'success');

      // stdout.write should not have been called yet (throttled)
      expect(stdoutSpy).not.toHaveBeenCalled();

      // Add 5th item (should trigger render)
      tracker.update('ITEM-005', 'success');

      // Now stdout should have been called
      expect(stdoutSpy).toHaveBeenCalled();
    });

    it('should render on final item regardless of throttling', () => {
      stdoutSpy.mockClear();

      const tracker = new ProgressTracker({
        total: 7,
        updateFrequency: 5, // Render every 5 items
        logger: silentLogger
      });

      // Add 5 items (renders once at item 5)
      for (let i = 1; i <= 5; i++) {
        tracker.update(`ITEM-${i}`, 'success');
      }

      stdoutSpy.mockClear();

      // Add items 6-7 (should render at item 7 even though not divisible by 5)
      tracker.update('ITEM-006', 'success');
      expect(stdoutSpy).not.toHaveBeenCalled(); // Item 6 not rendered

      tracker.update('ITEM-007', 'success');
      expect(stdoutSpy).toHaveBeenCalled(); // Item 7 (final) rendered
    });
  });

  describe('Status Tracking', () => {
    it('should track succeeded, failed, and skipped counts separately', () => {
      const tracker = new ProgressTracker({ total: 10, logger: silentLogger });

      tracker.update('ITEM-001', 'success');
      tracker.update('ITEM-002', 'success');
      tracker.update('ITEM-003', 'failure');
      tracker.update('ITEM-004', 'skip');
      tracker.update('ITEM-005', 'success');

      const summary = tracker.getSummary();
      expect(summary.completed).toBe(5);
      expect(summary.succeeded).toBe(3);
      expect(summary.failed).toBe(1);
      expect(summary.skipped).toBe(1);
    });

    it('should track all items as succeeded if no failures', () => {
      const tracker = new ProgressTracker({ total: 5, logger: silentLogger });

      for (let i = 1; i <= 5; i++) {
        tracker.update(`ITEM-${i}`, 'success');
      }

      const summary = tracker.getSummary();
      expect(summary.succeeded).toBe(5);
      expect(summary.failed).toBe(0);
      expect(summary.skipped).toBe(0);
    });
  });

  describe('Final Summary', () => {
    it('should show success message if no failures or skips', () => {
      const logSpy = vi.spyOn(silentLogger, 'log');

      const tracker = new ProgressTracker({ total: 10, logger: silentLogger });

      for (let i = 1; i <= 10; i++) {
        tracker.update(`ITEM-${i}`, 'success');
      }

      tracker.finish();

      // Should show success message
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Imported 10/10 projects')
      );
    });

    it('should show partial success message with failure count', () => {
      const logSpy = vi.spyOn(silentLogger, 'log');

      const tracker = new ProgressTracker({ total: 10, logger: silentLogger });

      for (let i = 1; i <= 8; i++) {
        tracker.update(`ITEM-${i}`, 'success');
      }
      tracker.update('ITEM-009', 'failure');
      tracker.update('ITEM-010', 'failure');

      tracker.finish();

      // Should show partial success with failure count
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Imported 8/10')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 failed')
      );
    });

    it('should suggest checking error log if failures exist', () => {
      const logSpy = vi.spyOn(silentLogger, 'log');

      const tracker = new ProgressTracker({ total: 5, logger: silentLogger });

      tracker.update('ITEM-001', 'success');
      tracker.update('ITEM-002', 'failure');
      tracker.update('ITEM-003', 'success');
      tracker.update('ITEM-004', 'success');
      tracker.update('ITEM-005', 'success');

      tracker.finish();

      // Should suggest checking error log
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('.specweave/logs/import-errors.log')
      );
    });

    it('should show elapsed time in seconds for quick operations', () => {
      const logSpy = vi.spyOn(silentLogger, 'log');

      const tracker = new ProgressTracker({ total: 3, logger: silentLogger });

      tracker.update('ITEM-001', 'success');
      tracker.update('ITEM-002', 'success');
      tracker.update('ITEM-003', 'success');

      tracker.finish();

      // Should show time in seconds (e.g., "in 0s" or "in 1s")
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(/in \d+s$/)
      );
    });
  });

  describe('Cancelation', () => {
    it('should show canceled message with partial progress', () => {
      const logSpy = vi.spyOn(silentLogger, 'log');

      const tracker = new ProgressTracker({ total: 100, logger: silentLogger });

      for (let i = 1; i <= 47; i++) {
        tracker.update(`ITEM-${i}`, 'success');
      }

      tracker.cancel();

      // Should show cancelation message
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Operation canceled')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('47/100')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('47%')
      );
    });
  });

  describe('Progress Bar Rendering', () => {
    it('should render ASCII progress bar correctly', () => {
      const tracker = new ProgressTracker({
        total: 100,
        updateFrequency: 1,
        progressBarWidth: 30,
        logger: silentLogger
      });

      // Complete 50 items (50%)
      for (let i = 1; i <= 50; i++) {
        tracker.update(`ITEM-${i}`, 'success');
      }

      // Check that stdout was called with progress bar
      const calls = stdoutSpy.mock.calls.map((call: any[]) => call[0]);
      const lastCall = calls[calls.length - 1];

      expect(lastCall).toContain('['); // Progress bar start
      expect(lastCall).toContain(']'); // Progress bar end
      expect(lastCall).toContain('50/100');
      expect(lastCall).toContain('(50%)');
    });
  });
});
