/**
 * Stop Hook Reliability E2E Tests
 *
 * DEPRECATED: These tests tested legacy hook architecture.
 * Current architecture (hooks.json):
 * - stop-reflect.sh (learning extraction)
 * - stop-auto.sh (auto mode continuation)
 * - stop-sync.sh (external sync)
 *
 * Features that were removed/simplified:
 * - Xcode/iOS test parsing (not needed in simplified version)
 * - Failure classification system (removed complexity)
 * - Heartbeat mechanism (replaced with simpler state tracking)
 * - Task-level checkpoints (replaced with hooks)
 * - Watchdog detection (removed)
 *
 * TODO: Rewrite tests for current hook architecture if needed
 */

import { describe, it } from 'vitest';

describe.skip('Stop Hook Reliability - DEPRECATED', () => {
  it.skip('placeholder for removed tests', () => {
    // Tests skipped - hook architecture simplified
    // Current: stop-reflect.sh → stop-auto.sh → stop-sync.sh (hooks.json)
  });
});
