#!/usr/bin/env node
/**
 * Update Heartbeat CLI
 *
 * Updates the heartbeat timestamp for a session in the registry
 *
 * Usage:
 *   node dist/src/cli/update-heartbeat.js <session-id>
 */

import { SessionRegistry } from '../utils/session-registry.js';
import { consoleLogger } from '../utils/logger.js';

async function main() {
  const sessionId = process.argv[2];

  if (!sessionId) {
    console.error('Usage: node update-heartbeat.js <session-id>');
    process.exit(1);
  }

  const registry = new SessionRegistry(process.cwd(), { logger: consoleLogger });

  try {
    const success = await registry.updateHeartbeat(sessionId);

    if (success) {
      // Silent success (no output to avoid log spam)
      process.exit(0);
    } else {
      console.error(`Failed to update heartbeat for session: ${sessionId}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error updating heartbeat:', err);
    process.exit(1);
  }
}

main();
