#!/usr/bin/env node
/**
 * Add Child Process CLI
 *
 * Adds a child process PID to a session's child_pids array
 *
 * Usage:
 *   node dist/src/cli/add-child-process.js <session-id> <child-pid>
 *
 * Arguments:
 *   session-id: Session identifier
 *   child-pid: Child process ID to add
 */

import { SessionRegistry } from '../utils/session-registry.js';
import { consoleLogger } from '../utils/logger.js';

async function main() {
  const sessionId = process.argv[2];
  const childPidStr = process.argv[3];

  if (!sessionId || !childPidStr) {
    console.error('Usage: node add-child-process.js <session-id> <child-pid>');
    process.exit(1);
  }

  const childPid = parseInt(childPidStr, 10);
  if (isNaN(childPid)) {
    console.error(`Invalid child PID: ${childPidStr}`);
    process.exit(1);
  }

  const registry = new SessionRegistry(process.cwd(), { logger: consoleLogger });

  try {
    await registry.addChildProcess(sessionId, childPid);
    console.log(`Child process ${childPid} added to session ${sessionId}`);
    process.exit(0);
  } catch (err) {
    console.error('Error adding child process:', err);
    process.exit(1);
  }
}

main();
