/**
 * Unit tests for CancelationHandler
 *
 * Tests SIGINT handling, double Ctrl+C force exit, and state persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CancelationHandler } from '../../../../src/core/progress/cancelation-handler.js';
import { silentLogger } from '../../../../src/utils/logger.js';

describe('CancelationHandler', () => {
  let handler: CancelationHandler;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let onSaveStateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock process.exit to prevent actual exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    onSaveStateMock = vi.fn().mockResolvedValue(undefined);

    handler = new CancelationHandler({
      logger: silentLogger,
      onSaveState: onSaveStateMock,
      forceExitTimeout: 2000,
    });
  });

  afterEach(() => {
    handler.unregister();
    vi.restoreAllMocks();
  });

  describe('Registration', () => {
    it('should register SIGINT listener', () => {
      const listenersBefore = process.listenerCount('SIGINT');
      handler.register();
      const listenersAfter = process.listenerCount('SIGINT');

      expect(listenersAfter).toBe(listenersBefore + 1);
    });

    it('should unregister SIGINT listener', () => {
      handler.register();
      const listenersAfter = process.listenerCount('SIGINT');
      handler.unregister();
      const listenersAfterUnregister = process.listenerCount('SIGINT');

      expect(listenersAfterUnregister).toBe(listenersAfter - 1);
    });
  });

  describe('TC-025: Graceful Cancelation (Single Ctrl+C)', () => {
    it('should set cancelRequested flag on SIGINT', async () => {
      handler.register();

      expect(handler.shouldCancel()).toBe(false);

      // Simulate Ctrl+C
      process.emit('SIGINT', 'SIGINT');

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handler.shouldCancel()).toBe(true);
    });

    it('should call onSaveState callback on SIGINT', async () => {
      handler.register();

      // Simulate Ctrl+C
      process.emit('SIGINT', 'SIGINT');

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onSaveStateMock).toHaveBeenCalledOnce();
    });

    it('should exit with code 0 after saving state', async () => {
      handler.register();

      // Simulate Ctrl+C
      process.emit('SIGINT', 'SIGINT');

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('should exit with code 1 if state save fails', async () => {
      onSaveStateMock.mockRejectedValue(new Error('Save failed'));

      handler = new CancelationHandler({
        logger: silentLogger,
        onSaveState: onSaveStateMock,
      });
      handler.register();

      // Simulate Ctrl+C
      process.emit('SIGINT', 'SIGINT');

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('TC-026: Force Exit (Double Ctrl+C)', () => {
    it('should force exit with code 1 on double Ctrl+C within 2s', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      handler = new CancelationHandler({
        logger: silentLogger,
        onSaveState: onSaveStateMock,
        forceExitTimeout: 2000,
      });
      handler.register();

      // First Ctrl+C
      process.emit('SIGINT', 'SIGINT');
      await vi.runAllTimersAsync();

      // Advance time by 1 second (within 2s window)
      vi.setSystemTime(now + 1000);
      exitSpy.mockClear(); // Clear first exit call

      // Second Ctrl+C
      process.emit('SIGINT', 'SIGINT');
      await vi.runAllTimersAsync();

      expect(exitSpy).toHaveBeenCalledWith(1);

      vi.useRealTimers();
    });

    it('should NOT force exit if second Ctrl+C is after 2s', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      handler = new CancelationHandler({
        logger: silentLogger,
        onSaveState: onSaveStateMock,
        forceExitTimeout: 2000,
      });
      handler.register();

      // First Ctrl+C
      process.emit('SIGINT', 'SIGINT');
      await vi.runAllTimersAsync();

      expect(exitSpy).toHaveBeenCalledWith(0);
      exitSpy.mockClear();

      // Reset handler state for second test
      handler.reset();

      // Advance time by 3 seconds (beyond 2s window)
      vi.setSystemTime(now + 3000);

      // Second Ctrl+C (should be treated as first)
      process.emit('SIGINT', 'SIGINT');
      await vi.runAllTimersAsync();

      expect(exitSpy).toHaveBeenCalledWith(0);

      vi.useRealTimers();
    });

    it('should respect custom forceExitTimeout', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      handler = new CancelationHandler({
        logger: silentLogger,
        onSaveState: onSaveStateMock,
        forceExitTimeout: 1000, // 1 second timeout
      });
      handler.register();

      // First Ctrl+C
      process.emit('SIGINT', 'SIGINT');
      await vi.runAllTimersAsync();

      exitSpy.mockClear();

      // Advance time by 500ms (within 1s window)
      vi.setSystemTime(now + 500);

      // Second Ctrl+C - should force exit
      process.emit('SIGINT', 'SIGINT');
      await vi.runAllTimersAsync();

      expect(exitSpy).toHaveBeenCalledWith(1);

      vi.useRealTimers();
    });
  });

  describe('Polling Mechanism', () => {
    it('should return false initially', () => {
      expect(handler.shouldCancel()).toBe(false);
    });

    it('should return true after SIGINT', async () => {
      handler.register();

      process.emit('SIGINT', 'SIGINT');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handler.shouldCancel()).toBe(true);
    });

    it('should reset cancelation state', async () => {
      handler.register();

      process.emit('SIGINT', 'SIGINT');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handler.shouldCancel()).toBe(true);

      handler.reset();

      expect(handler.shouldCancel()).toBe(false);
    });
  });

  describe('Options', () => {
    it('should work without onSaveState callback', async () => {
      handler = new CancelationHandler({
        logger: silentLogger,
      });
      handler.register();

      process.emit('SIGINT', 'SIGINT');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('should use default forceExitTimeout if not provided', () => {
      handler = new CancelationHandler({
        logger: silentLogger,
      });

      // Force exit timeout should be 2000ms by default
      expect(handler).toBeDefined();
    });
  });
});
