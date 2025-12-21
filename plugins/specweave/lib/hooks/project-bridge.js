#!/usr/bin/env node
/**
 * project-bridge.js - Bridge increment events to project-level EDA
 *
 * Called by project-bridge-handler.sh to connect increment-level
 * events to the ProjectService and trigger project sync.
 *
 * Usage: node project-bridge.js <event-type> <event-data>
 *
 * Event types:
 * - increment.created - New increment created
 * - increment.done - Increment completed
 * - increment.archived - Increment archived
 * - increment.reopened - Increment reopened
 * - user-story.completed - User story completed
 * - user-story.reopened - User story reopened
 */

import { ProjectService } from '../../../../dist/src/core/project/project-service.js';
import { consoleLogger } from '../vendor/utils/logger.js';

/**
 * Bridge increment event to project-level EDA
 */
async function bridgeIncrementEvent(eventType, eventData) {
  try {
    console.log(`[project-bridge] Processing: ${eventType} ${eventData}`);

    const projectRoot = process.cwd();
    const service = ProjectService.getInstance(projectRoot, consoleLogger);

    // Initialize adapters (no-op if already initialized)
    await service.initialize();

    // Emit the increment event to project-level EDA
    await service.emitIncrementEvent(eventType, eventData);

    console.log(`[project-bridge] Successfully bridged: ${eventType}`);
    return { success: true };
  } catch (error) {
    console.error(`[project-bridge] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main entry point
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const eventType = process.argv[2];
  const eventData = process.argv[3];

  if (!eventType || !eventData) {
    console.error('Usage: node project-bridge.js <event-type> <event-data>');
    console.error('Example: node project-bridge.js increment.done 0145-project-registry');
    process.exit(1);
  }

  bridgeIncrementEvent(eventType, eventData)
    .then((result) => {
      if (result.success) {
        process.exit(0);
      } else {
        // Non-blocking error - don't fail the hook
        console.error(`[project-bridge] Bridge failed: ${result.error}`);
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('[project-bridge] Fatal error:', error);
      // Non-blocking - don't fail the hook
      process.exit(0);
    });
}

export { bridgeIncrementEvent };
