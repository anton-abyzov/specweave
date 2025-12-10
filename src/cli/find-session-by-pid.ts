#!/usr/bin/env node
/**
 * Find Session By PID CLI
 *
 * Finds a session in the registry by its PID
 *
 * Usage:
 *   node dist/src/cli/find-session-by-pid.js <pid>
 *
 * Output:
 *   JSON session info or empty string
 */

import { SessionRegistry } from '../utils/session-registry.js';
import { consoleLogger } from '../utils/logger.js';

async function main() {
  const pidStr = process.argv[2];

  if (!pidStr) {
    console.error('Usage: node find-session-by-pid.js <pid>');
    process.exit(1);
  }

  const pid = parseInt(pidStr, 10);
  if (isNaN(pid)) {
    console.error(`Invalid PID: ${pidStr}`);
    process.exit(1);
  }

  const registry = new SessionRegistry(process.cwd(), { logger: consoleLogger });

  try {
    const sessions = await registry.getAllSessions();
    const session = sessions.find((s) => s.pid === pid);

    if (session) {
      console.log(JSON.stringify(session));
      process.exit(0);
    } else {
      // No session found
      process.exit(0);
    }
  } catch (err) {
    console.error('Error finding session:', err);
    process.exit(1);
  }
}

main();
