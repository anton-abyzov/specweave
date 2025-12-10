#!/usr/bin/env node
/**
 * Register Session CLI
 *
 * Registers a new session in the registry
 *
 * Usage:
 *   node dist/src/cli/register-session.js <session-id> <pid> <type>
 *
 * Arguments:
 *   session-id: Unique session identifier
 *   pid: Process ID
 *   type: Session type (claude-code | watchdog | heartbeat | processor)
 */

import { SessionRegistry } from '../utils/session-registry.js';
import { SessionType } from '../types/session.js';
import { consoleLogger } from '../utils/logger.js';

async function main() {
  const sessionId = process.argv[2];
  const pidStr = process.argv[3];
  const type = (process.argv[4] || 'claude-code') as SessionType;

  if (!sessionId || !pidStr) {
    console.error('Usage: node register-session.js <session-id> <pid> [type]');
    process.exit(1);
  }

  const pid = parseInt(pidStr, 10);
  if (isNaN(pid)) {
    console.error(`Invalid PID: ${pidStr}`);
    process.exit(1);
  }

  const registry = new SessionRegistry(process.cwd(), { logger: consoleLogger });

  try {
    const success = await registry.registerSession(sessionId, pid, { type });

    if (success) {
      console.log(`Session registered: ${sessionId} (PID: ${pid}, Type: ${type})`);
      process.exit(0);
    } else {
      console.error('Failed to register session');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error registering session:', err);
    process.exit(1);
  }
}

main();
