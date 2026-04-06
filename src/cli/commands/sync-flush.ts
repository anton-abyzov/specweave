/**
 * Sync flush CLI command.
 *
 * Replaces PostToolUse event queuing (--queue mode) and
 * stop-sync event flushing (default mode).
 *
 *   specweave sync flush              — flush pending events
 *   specweave sync flush --queue JSON — append event to queue
 *   specweave sync flush --dry-run    — report without clearing
 *
 * @module cli/commands/sync-flush
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  queueEvent,
  flushEventQueue,
  readPendingEvents,
} from '../../core/sync/event-queue-ops.js';

export interface SyncFlushResult {
  success: boolean;
  mode: 'queue' | 'flush';
  eventsQueued?: number;
  eventsFlushed?: number;
  incrementIds?: string[];
}

export interface SyncFlushOptions {
  queue?: string;
  projectRoot?: string;
  silent?: boolean;
  json?: boolean;
  dryRun?: boolean;
}

function resolveProjectRoot(provided?: string): string | null {
  const root = provided ?? process.cwd();
  const configPath = path.join(root, '.specweave', 'config.json');
  if (!fs.existsSync(configPath)) return null;
  return root;
}

/**
 * Execute `specweave sync flush`.
 */
export async function syncFlushCommand(
  options: SyncFlushOptions = {},
): Promise<SyncFlushResult> {
  const projectRoot = resolveProjectRoot(options.projectRoot);
  if (!projectRoot) {
    const msg = 'Not a SpecWeave project (no .specweave/config.json found)';
    if (!options.silent) console.error(msg);
    return { success: false, mode: options.queue ? 'queue' : 'flush' };
  }

  const stateDir = path.join(projectRoot, '.specweave', 'state');

  // Queue mode
  if (options.queue) {
    try {
      const parsed = JSON.parse(options.queue);
      const event = parsed.event ?? 'unknown';
      const incrementId = parsed.incrementId ?? 'unknown';
      const timestamp = parsed.timestamp ?? new Date().toISOString();
      const data = parsed.data;

      const qResult = queueEvent(stateDir, event, incrementId, timestamp, data);

      const result: SyncFlushResult = {
        success: qResult.queued > 0,
        mode: 'queue',
        eventsQueued: qResult.queued,
      };

      if (!options.silent) {
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`Queued event: ${event} for increment ${incrementId}`);
        }
      }

      return result;
    } catch {
      const msg = 'Invalid JSON in --queue argument';
      if (!options.silent) console.error(msg);
      return { success: false, mode: 'queue', eventsQueued: 0 };
    }
  }

  // Dry-run mode
  if (options.dryRun) {
    const events = readPendingEvents(stateDir);
    const uniqueIds = [...new Set(events.map((e) => e.incrementId).filter(Boolean))];

    const result: SyncFlushResult = {
      success: true,
      mode: 'flush',
      eventsFlushed: uniqueIds.length,
      incrementIds: uniqueIds as string[],
    };

    if (!options.silent) {
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (uniqueIds.length === 0) {
        console.log('No pending events to flush');
      } else {
        console.log(`Would flush ${uniqueIds.length} unique increment(s):`);
        for (const id of uniqueIds) console.log(`  - ${id}`);
      }
    }

    return result;
  }

  // Flush mode (default)
  const fResult = flushEventQueue(stateDir);

  const result: SyncFlushResult = {
    success: true,
    mode: 'flush',
    eventsFlushed: fResult.flushed,
    incrementIds: fResult.incrementIds,
  };

  if (!options.silent) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (fResult.flushed === 0) {
      console.log('No pending events to flush');
    } else {
      console.log(`Flushed ${fResult.flushed} unique increment(s):`);
      for (const id of fResult.incrementIds) console.log(`  - ${id}`);
    }
  }

  return result;
}
