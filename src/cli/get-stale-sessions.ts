#!/usr/bin/env node
/**
 * Get Stale Sessions CLI
 *
 * Returns all stale sessions from the registry based on heartbeat threshold.
 *
 * Usage:
 *   node dist/src/cli/get-stale-sessions.js [threshold_seconds]
 *
 * Arguments:
 *   threshold_seconds - Max age of heartbeat before considered stale (default: 60)
 *
 * Output:
 *   JSON array of stale session info
 */

import { SessionRegistry } from '../utils/session-registry.js';

const thresholdStr = process.argv[2] || '60';
const threshold = parseInt(thresholdStr, 10);

if (isNaN(threshold)) {
  console.error('Error: threshold must be a number');
  process.exit(1);
}

const registry = new SessionRegistry(process.cwd());

(async () => {
  try {
    const staleSessions = await registry.getStaleSessions(threshold);

    // Output as JSON for easy parsing in bash
    console.log(JSON.stringify(staleSessions, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(`Error getting stale sessions: ${err}`);
    process.exit(1);
  }
})();
