import { describe, it, expect } from 'vitest';
import { HookHealthTracker, HookHealth } from '../../../src/core/hooks/hook-health-tracker.js';
import { HookLogEntry } from '../../../src/core/hooks/hook-logger.js';

describe('HookHealthTracker', () => {
  it('should calculate success rate from logs', () => {
    const tracker = new HookHealthTracker();
    const referenceTime = new Date('2026-01-08T10:10:00Z');
    const logs: HookLogEntry[] = [
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T10:00:00Z' },
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T10:01:00Z' },
      { hookName: 'test', status: 'warning', timestamp: '2026-01-08T10:02:00Z' },
      { hookName: 'test', status: 'error', timestamp: '2026-01-08T10:03:00Z' }
    ];

    const health = tracker.analyze('session-start', logs, referenceTime);

    expect(health.successRate).toBe(0.5); // 2/4
    expect(health.status).toBe('DEGRADED');
  });

  it('should mark as FAILED after 3 consecutive failures', () => {
    const tracker = new HookHealthTracker();
    const referenceTime = new Date('2026-01-08T10:10:00Z');
    const logs: HookLogEntry[] = [
      { hookName: 'test', status: 'error', timestamp: '2026-01-08T10:00:00Z' },
      { hookName: 'test', status: 'error', timestamp: '2026-01-08T10:01:00Z' },
      { hookName: 'test', status: 'error', timestamp: '2026-01-08T10:02:00Z' }
    ];

    const health = tracker.analyze('user-prompt-submit', logs, referenceTime);

    expect(health.status).toBe('FAILED');
    expect(health.consecutiveFailures).toBe(3);
  });

  it('should calculate average duration', () => {
    const tracker = new HookHealthTracker();
    const referenceTime = new Date('2026-01-08T10:10:00Z');
    const logs: HookLogEntry[] = [
      { hookName: 'test', status: 'success', duration: 100, timestamp: '2026-01-08T10:00:00Z' },
      { hookName: 'test', status: 'success', duration: 200, timestamp: '2026-01-08T10:01:00Z' },
      { hookName: 'test', status: 'success', duration: 300, timestamp: '2026-01-08T10:02:00Z' }
    ];

    const health = tracker.analyze('post-tool-use', logs, referenceTime);

    expect(health.avgDuration).toBe(200);
  });

  it('should mark as OK with high success rate', () => {
    const tracker = new HookHealthTracker();
    const referenceTime = new Date('2026-01-08T10:10:00Z');
    const logs: HookLogEntry[] = [
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T10:00:00Z' },
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T10:01:00Z' },
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T10:02:00Z' },
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T10:03:00Z' }
    ];

    const health = tracker.analyze('session-start', logs, referenceTime);

    expect(health.status).toBe('OK');
    expect(health.successRate).toBe(1.0);
  });

  it('should mark as DEGRADED with recent warnings', () => {
    const tracker = new HookHealthTracker();
    const referenceTime = new Date('2026-01-08T10:10:00Z');
    const logs: HookLogEntry[] = [
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T08:00:00Z' },
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T08:30:00Z' },
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T09:00:00Z' },
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T09:30:00Z' },
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T09:45:00Z' },
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T09:50:00Z' },
      { hookName: 'test', status: 'warning', timestamp: '2026-01-08T10:00:00Z' },
      { hookName: 'test', status: 'warning', timestamp: '2026-01-08T10:01:00Z' },
      { hookName: 'test', status: 'warning', timestamp: '2026-01-08T10:02:00Z' }
    ];

    const health = tracker.analyze('post-tool-use', logs, referenceTime);

    // 6 success + 3 warnings = 67% success rate (DEGRADED zone: 50-90%)
    // Plus 3 recent warnings in last 10 entries triggers DEGRADED
    expect(health.status).toBe('DEGRADED');
  });

  it('should track last execution time', () => {
    const tracker = new HookHealthTracker();
    const referenceTime = new Date('2026-01-08T10:10:00Z');
    const logs: HookLogEntry[] = [
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T10:00:00Z' },
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T10:05:00Z' }
    ];

    const health = tracker.analyze('session-start', logs, referenceTime);

    expect(health.lastRun).toBe('2026-01-08T10:05:00Z');
  });

  it('should handle empty logs gracefully', () => {
    const tracker = new HookHealthTracker();
    const logs: HookLogEntry[] = [];

    const health = tracker.analyze('non-existent', logs);

    expect(health.status).toBe('UNKNOWN');
    expect(health.successRate).toBe(0);
    expect(health.totalExecutions).toBe(0);
  });

  it('should ignore old logs beyond 24h window', () => {
    const tracker = new HookHealthTracker();
    const now = new Date('2026-01-08T10:00:00Z');
    const logs: HookLogEntry[] = [
      { hookName: 'test', status: 'error', timestamp: '2026-01-07T09:00:00Z' }, // 25h ago - ignored
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T09:30:00Z' }, // 30m ago - counted
      { hookName: 'test', status: 'success', timestamp: '2026-01-08T10:00:00Z' }  // now - counted
    ];

    const health = tracker.analyze('session-start', logs, now);

    expect(health.totalExecutions).toBe(2); // Only recent 2
    expect(health.successRate).toBe(1.0); // Ignore old error
  });

  it('should provide recommendations for degraded hooks', () => {
    const tracker = new HookHealthTracker();
    const referenceTime = new Date('2026-01-08T10:10:00Z');
    const logs: HookLogEntry[] = [
      { hookName: 'test', status: 'warning', duration: 5200, timestamp: '2026-01-08T10:00:00Z' },
      { hookName: 'test', status: 'warning', duration: 5300, timestamp: '2026-01-08T10:01:00Z' },
      { hookName: 'test', status: 'warning', duration: 5400, timestamp: '2026-01-08T10:02:00Z' }
    ];

    const health = tracker.analyze('user-prompt-submit', logs, referenceTime);

    const hasCheckHooksRecommendation = health.recommendations.some(r => r.includes('check-hooks'));
    expect(hasCheckHooksRecommendation).toBe(true);
  });
});
