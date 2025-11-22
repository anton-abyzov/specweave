/**
 * Unit tests for ProgressTracker
 *
 * Tests ASCII progress bar rendering, ETA calculation, and progress tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressTracker } from '../../../../src/core/progress/progress-tracker.js';

describe('ProgressTracker', () => {
  describe('Progress Bar Rendering', () => {
    it('TC-022: should render progress bar at 0%', () => {
      const tracker = new ProgressTracker({
        total: 100,
        label: 'Test',
        showEta: false,
      });

      const bar = tracker.renderProgressBar(0);
      expect(bar).toBe('[>                             ]');
      expect(bar.length).toBe(32); // [30 chars]
    });

    it('should render progress bar at 37%', () => {
      const tracker = new ProgressTracker({
        total: 127,
        label: 'Importing projects',
      });

      const bar = tracker.renderProgressBar(37);
      expect(bar).toContain('=');
      expect(bar).toContain('>');
      expect(bar).toContain(' ');
      expect(bar.length).toBe(32);

      // At 37%, filled portion should be about 11 chars (37% of 30)
      const filledCount = (bar.match(/=/g) || []).length + 1; // +1 for '>'
      expect(filledCount).toBeGreaterThanOrEqual(10);
      expect(filledCount).toBeLessThanOrEqual(12);
    });

    it('should render progress bar at 100%', () => {
      const tracker = new ProgressTracker({
        total: 50,
        label: 'Complete',
      });

      const bar = tracker.renderProgressBar(100);
      expect(bar).toBe('[=============================>]');
      expect(bar.length).toBe(32);
    });

    it('should handle edge case percentages', () => {
      const tracker = new ProgressTracker({
        total: 10,
        label: 'Edge cases',
      });

      // 1% should have minimal filled portion
      const bar1 = tracker.renderProgressBar(1);
      expect(bar1).toBe('[>                             ]');

      // 99% should be almost full
      const bar99 = tracker.renderProgressBar(99);
      expect(bar99).toContain('=');
      expect(bar99.length).toBe(32);
    });
  });

  describe('ETA Calculation', () => {
    it('TC-023: should calculate ETA using linear extrapolation', async () => {
      const tracker = new ProgressTracker({
        total: 100,
        label: 'Test ETA',
        showEta: true,
      });

      // Simulate processing 10 items in 3 seconds
      const startTime = Date.now();
      for (let i = 1; i <= 10; i++) {
        tracker.update(`item-${i}`, 'success');
      }

      // Mock elapsed time (3 seconds)
      const elapsed = 3000;
      vi.spyOn(Date, 'now').mockReturnValue(startTime + elapsed);

      const eta = tracker.getEta();

      // ETA = (100 - 10) * (3000 / 10) = 90 * 300 = 27000ms = 27s
      // But it should show minutes: ~0m remaining or similar
      expect(eta).toMatch(/~\d+[sm] remaining/);
    });

    it('should return unknown ETA when no items completed', () => {
      const tracker = new ProgressTracker({
        total: 100,
        label: 'No progress',
      });

      const eta = tracker.getEta();
      expect(eta).toBe(', ~? remaining');
    });

    it('should return 0s ETA when all items completed', () => {
      const tracker = new ProgressTracker({
        total: 10,
        label: 'All done',
      });

      for (let i = 1; i <= 10; i++) {
        tracker.update(`item-${i}`, 'success');
      }

      const eta = tracker.getEta();
      expect(eta).toBe(', ~0s remaining');
    });
  });

  describe('Project-Level Status Display', () => {
    it('TC-024: should track mixed success/error/pending status', () => {
      const tracker = new ProgressTracker({
        total: 5,
        label: 'Mixed status',
      });

      tracker.update('BACKEND', 'success');
      tracker.update('FRONTEND', 'success');
      tracker.update('MOBILE', 'pending');
      tracker.update('FAILED-PROJ', 'error');
      tracker.update('API', 'success');

      const stats = tracker.getStats();
      expect(stats.succeeded).toBe(3);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.completed).toBe(4); // success + error
    });

    it('should get items by status', () => {
      const tracker = new ProgressTracker({
        total: 10,
        label: 'Status filter',
      });

      tracker.update('proj-1', 'success');
      tracker.update('proj-2', 'success');
      tracker.update('proj-3', 'error');
      tracker.update('proj-4', 'pending');

      const succeeded = tracker.getItemsByStatus('success');
      const failed = tracker.getItemsByStatus('error');
      const pending = tracker.getItemsByStatus('pending');

      expect(succeeded.length).toBe(2);
      expect(failed.length).toBe(1);
      expect(pending.length).toBe(1);

      expect(succeeded[0].name).toBe('proj-1');
      expect(failed[0].name).toBe('proj-3');
    });
  });

  describe('Elapsed Time Tracking', () => {
    it('should format elapsed time in seconds', () => {
      const tracker = new ProgressTracker({
        total: 10,
        label: 'Quick job',
      });

      // Mock 45 seconds elapsed
      const startTime = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(startTime + 45000);

      const elapsed = tracker.getElapsedTime();
      expect(elapsed).toBe('45s elapsed');
    });

    it('should format elapsed time in minutes and seconds', () => {
      const tracker = new ProgressTracker({
        total: 100,
        label: 'Long job',
      });

      // Mock 2 minutes 34 seconds elapsed
      const startTime = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(startTime + 154000);

      const elapsed = tracker.getElapsedTime();
      expect(elapsed).toBe('2m 34s elapsed');
    });
  });

  describe('Update Frequency', () => {
    it('should only update display every N items (updateFrequency)', () => {
      const mockStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const tracker = new ProgressTracker({
        total: 20,
        label: 'Batched updates',
        updateFrequency: 5,
      });

      // Process 4 items (should not trigger update)
      for (let i = 1; i <= 4; i++) {
        tracker.update(`item-${i}`, 'success');
      }

      // Should not have written to stdout yet
      expect(mockStdout).not.toHaveBeenCalled();

      // Process 5th item (should trigger update)
      tracker.update('item-5', 'success');

      // Should have written to stdout now
      expect(mockStdout).toHaveBeenCalled();

      mockStdout.mockRestore();
    });

    it('should always update on completion', () => {
      const mockStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const tracker = new ProgressTracker({
        total: 7,
        label: 'Complete all',
        updateFrequency: 10, // Higher than total
      });

      // Process all 7 items
      for (let i = 1; i <= 7; i++) {
        tracker.update(`item-${i}`, 'success');
      }

      // Should have written to stdout on completion
      expect(mockStdout).toHaveBeenCalled();

      mockStdout.mockRestore();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate progress statistics', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const tracker = new ProgressTracker({
        total: 127,
        label: 'Full stats',
      });

      // Advance time by 5 seconds
      vi.setSystemTime(now + 5000);

      // Process 47 items: 40 success, 5 error, 2 pending
      for (let i = 1; i <= 40; i++) {
        tracker.update(`success-${i}`, 'success');
      }
      for (let i = 1; i <= 5; i++) {
        tracker.update(`error-${i}`, 'error');
      }
      for (let i = 1; i <= 2; i++) {
        tracker.update(`pending-${i}`, 'pending');
      }

      const stats = tracker.getStats();

      expect(stats.total).toBe(127);
      expect(stats.completed).toBe(45); // success + error
      expect(stats.succeeded).toBe(40);
      expect(stats.failed).toBe(5);
      expect(stats.pending).toBe(2);
      expect(stats.percentage).toBe(35); // Math.round(45/127 * 100) = 35
      expect(stats.elapsedMs).toBe(5000);

      vi.useRealTimers();
    });

    it('should calculate ETA in statistics', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const tracker = new ProgressTracker({
        total: 100,
        label: 'ETA stats',
      });

      // Advance time by 10 seconds
      vi.setSystemTime(now + 10000);

      // Process 10 items
      for (let i = 1; i <= 10; i++) {
        tracker.update(`item-${i}`, 'success');
      }

      const stats = tracker.getStats();

      // ETA should be calculated: 90 items remaining at 1000ms per item = 90000ms
      expect(stats.etaMs).toBe(90000);
      expect(stats.etaMs).not.toBeNull();

      vi.useRealTimers();
    });
  });

  describe('Finish Summary', () => {
    it('should display final summary with counts', () => {
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      const tracker = new ProgressTracker({
        total: 10,
        label: 'Summary test',
      });

      tracker.finish(8, 1, 1);

      // Check console.log was called with summary
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Succeeded: 8'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Failed: 1'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Skipped: 1'));

      mockConsoleLog.mockRestore();
    });

    it('should not show failed/skipped if zero', () => {
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      const tracker = new ProgressTracker({
        total: 10,
        label: 'All succeeded',
      });

      tracker.finish(10, 0, 0);

      // Should show succeeded but not failed/skipped
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Succeeded: 10'));

      const calls = mockConsoleLog.mock.calls.map(call => call[0]);
      const hasFailed = calls.some(msg => typeof msg === 'string' && msg.includes('Failed'));
      const hasSkipped = calls.some(msg => typeof msg === 'string' && msg.includes('Skipped'));

      expect(hasFailed).toBe(false);
      expect(hasSkipped).toBe(false);

      mockConsoleLog.mockRestore();
    });
  });
});
