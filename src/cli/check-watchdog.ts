#!/usr/bin/env node
/**
 * Check Watchdog CLI
 *
 * Checks if an active watchdog is running
 *
 * Usage:
 *   node dist/src/cli/check-watchdog.js
 *
 * Output:
 *   - PID of active watchdog (if exists)
 *   - Empty string (if no active watchdog)
 *
 * Note: Will exit silently (exit 0) if not a SpecWeave project
 */

import { SessionRegistry } from '../utils/session-registry.js';
import { consoleLogger } from '../utils/logger.js';

async function main() {
  const registry = new SessionRegistry(process.cwd(), { logger: consoleLogger });

  // If not a valid SpecWeave project, exit silently
  if (!registry.isValidProject()) {
    process.exit(0);
  }

  try {
    const sessions = await registry.getAllSessions();

    // Find watchdog sessions
    const watchdogs = sessions.filter((s) => s.type === 'watchdog' && s.status === 'active');

    if (watchdogs.length === 0) {
      // No active watchdog
      process.exit(0);
    }

    // Check heartbeat freshness (last 30 seconds)
    const now = Date.now();
    const threshold = 30 * 1000; // 30 seconds

    for (const watchdog of watchdogs) {
      const lastHeartbeat = new Date(watchdog.last_heartbeat).getTime();
      const age = now - lastHeartbeat;

      if (age < threshold) {
        // Active watchdog found
        console.log(watchdog.pid);
        process.exit(0);
      }
    }

    // All watchdogs are stale
    process.exit(0);
  } catch (err) {
    console.error('Error checking watchdog:', err);
    process.exit(1);
  }
}

main();
