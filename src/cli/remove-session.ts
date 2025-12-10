#!/usr/bin/env node
/**
 * Remove Session CLI
 *
 * Removes a session from the registry
 *
 * Usage:
 *   node dist/src/cli/remove-session.js <session-id>
 */

import { SessionRegistry } from '../utils/session-registry.js';
import { consoleLogger } from '../utils/logger.js';

async function main() {
  const sessionId = process.argv[2];

  if (!sessionId) {
    console.error('Usage: node remove-session.js <session-id>');
    process.exit(1);
  }

  const registry = new SessionRegistry(process.cwd(), { logger: consoleLogger });

  try {
    const success = await registry.removeSession(sessionId);

    if (success) {
      console.log(`Session removed: ${sessionId}`);
      process.exit(0);
    } else {
      console.error(`Session not found: ${sessionId}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error removing session:', err);
    process.exit(1);
  }
}

main();
