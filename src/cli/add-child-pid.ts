#!/usr/bin/env node
/**
 * Add Child PID CLI
 *
 * Adds a child PID to a session
 *
 * Usage:
 *   node dist/src/cli/add-child-pid.js <session-id> <child-pid>
 */

import { SessionRegistry } from '../utils/session-registry.js';
import { consoleLogger } from '../utils/logger.js';

async function main() {
  const sessionId = process.argv[2];
  const childPidStr = process.argv[3];

  if (!sessionId || !childPidStr) {
    console.error('Usage: node add-child-pid.js <session-id> <child-pid>');
    process.exit(1);
  }

  const childPid = parseInt(childPidStr, 10);
  if (isNaN(childPid)) {
    console.error(`Invalid child PID: ${childPidStr}`);
    process.exit(1);
  }

  const registry = new SessionRegistry(process.cwd(), { logger: consoleLogger });

  try {
    const success = await registry.addChildProcess(sessionId, childPid);

    if (success) {
      console.log(`Child PID ${childPid} added to session ${sessionId}`);
      process.exit(0);
    } else {
      console.error('Failed to add child PID');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error adding child PID:', err);
    process.exit(1);
  }
}

main();
