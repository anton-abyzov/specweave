/**
 * Stop-sync hook handler.
 *
 * Fires at session end (after stop-reflect and stop-auto). Reads pending
 * sync events, deduplicates by increment ID, logs sync intent, and clears
 * the event queue. Actual sync calls (LivingDocsSync, GitHub/JIRA/ADO)
 * will be added in a follow-up.
 *
 * NEVER blocks — always returns approve.
 *
 * @module core/hooks/handlers/stop-sync
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn } from './types.js';
import { logHook } from './utils.js';

/** Parsed event from pending.jsonl */
interface QueuedEvent {
  event?: string;
  incrementId?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

/** Parse a JSONL line safely */
function parseEventLine(line: string): QueuedEvent | null {
  try {
    return JSON.parse(line) as QueuedEvent;
  } catch {
    return null;
  }
}

export const handle: HandlerFn = async (input, context) => {
  try {
    const pendingPath = path.join(context.stateDir, 'event-queue', 'pending.jsonl');

    // 1. Check if pending events exist
    if (!fs.existsSync(pendingPath)) {
      logHook(context, 'stop-sync', 'No pending events');
      return { decision: 'approve' };
    }

    const content = fs.readFileSync(pendingPath, 'utf8').trim();
    if (!content) {
      logHook(context, 'stop-sync', 'No pending events');
      return { decision: 'approve' };
    }

    // 2. Parse and deduplicate events by increment ID
    const lines = content.split('\n').filter((l) => l.trim());
    const seenIncrements = new Set<string>();

    for (const line of lines) {
      const event = parseEventLine(line);
      if (!event?.incrementId) continue;

      const incId = event.incrementId;
      if (seenIncrements.has(incId)) continue;

      seenIncrements.add(incId);
      logHook(context, 'stop-sync', `Sync requested for increment: ${incId} (event: ${event.event ?? 'unknown'})`);
    }

    // 3. Clear processed events
    try {
      fs.writeFileSync(pendingPath, '');
    } catch {
      // Non-critical — events may be re-processed next time
    }

    if (seenIncrements.size > 0) {
      logHook(context, 'stop-sync', `Processed ${seenIncrements.size} unique increment(s)`);
    }

    return { decision: 'approve' };
  } catch {
    // Never throw — always approve
    return { decision: 'approve' };
  }
};
