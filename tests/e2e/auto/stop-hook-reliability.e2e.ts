/**
 * Stop Hook Reliability E2E Tests
 *
 * DEPRECATED: These tests tested stop-auto.sh which was replaced by stop-dispatcher.sh
 * The hook architecture changed in increment 0161-hook-execution-visibility:
 * - stop-auto.sh → stop-dispatcher.sh (chains stop-reflect.sh + stop-auto-simple.sh)
 * - Different input/output contract
 * - Simplified logic (removed many features tested here)
 *
 * Features that were removed/simplified:
 * - Xcode/iOS test parsing (not needed in simplified version)
 * - Failure classification system (removed complexity)
 * - Heartbeat mechanism (replaced with simpler state tracking)
 * - Task-level checkpoints (replaced with hooks)
 * - Watchdog detection (removed)
 *
 * TODO: Rewrite tests for new hook architecture or remove if features no longer needed
 */

import { describe, it } from 'vitest';

describe.skip('Stop Hook Reliability (v2.1) - DEPRECATED', () => {
  it.skip('placeholder for removed tests', () => {
    // Tests skipped - hook architecture changed in 0161-hook-execution-visibility
    // stop-auto.sh no longer exists, replaced by stop-dispatcher.sh
  });
});
