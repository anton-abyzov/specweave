/**
 * Event queue operations core module.
 *
 * Extracted from hooks/handlers/post-tool-use.ts (queue append)
 * and hooks/handlers/stop-sync.ts (flush + dedup).
 *
 * Operates on .specweave/state/event-queue/pending.jsonl.
 * Never throws.
 *
 * @module core/sync/event-queue-ops
 */

import * as fs from 'fs';
import * as path from 'path';

export interface QueuedEvent {
  event?: string;
  incrementId?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

export interface QueueResult {
  queued: number;
}

export interface FlushResult {
  flushed: number;
  incrementIds: string[];
  events: QueuedEvent[];
}

function getPendingPath(stateDir: string): string {
  return path.join(stateDir, 'event-queue', 'pending.jsonl');
}

function parseEventLine(line: string): QueuedEvent | null {
  try {
    return JSON.parse(line) as QueuedEvent;
  } catch {
    return null;
  }
}

/**
 * Append an event to the pending queue.
 */
export function queueEvent(
  stateDir: string,
  event: string,
  incrementId: string,
  timestamp: string,
  data?: Record<string, unknown>,
): QueueResult {
  try {
    const queueDir = path.join(stateDir, 'event-queue');
    fs.mkdirSync(queueDir, { recursive: true });
    const entry: QueuedEvent = {
      event,
      incrementId,
      timestamp,
      ...(data ? { data } : {}),
    };
    fs.appendFileSync(
      path.join(queueDir, 'pending.jsonl'),
      JSON.stringify(entry) + '\n',
    );
    return { queued: 1 };
  } catch {
    return { queued: 0 };
  }
}

/**
 * Read all pending events without clearing.
 */
export function readPendingEvents(stateDir: string): QueuedEvent[] {
  try {
    const pendingPath = getPendingPath(stateDir);
    if (!fs.existsSync(pendingPath)) return [];

    const content = fs.readFileSync(pendingPath, 'utf8').trim();
    if (!content) return [];

    return content
      .split('\n')
      .filter((l) => l.trim())
      .map(parseEventLine)
      .filter((e): e is QueuedEvent => e !== null);
  } catch {
    return [];
  }
}

/**
 * Flush the event queue: read, deduplicate by increment ID, clear.
 * Returns the unique increment IDs and events that were flushed.
 */
export function flushEventQueue(stateDir: string): FlushResult {
  try {
    const pendingPath = getPendingPath(stateDir);
    if (!fs.existsSync(pendingPath)) {
      return { flushed: 0, incrementIds: [], events: [] };
    }

    const content = fs.readFileSync(pendingPath, 'utf8').trim();
    if (!content) {
      return { flushed: 0, incrementIds: [], events: [] };
    }

    const lines = content.split('\n').filter((l) => l.trim());
    const seenIncrements = new Set<string>();
    const events: QueuedEvent[] = [];

    for (const line of lines) {
      const event = parseEventLine(line);
      if (!event?.incrementId) continue;
      if (!seenIncrements.has(event.incrementId)) {
        seenIncrements.add(event.incrementId);
        events.push(event);
      }
    }

    // Clear the queue
    try {
      fs.writeFileSync(pendingPath, '');
    } catch {
      // Non-critical
    }

    return {
      flushed: seenIncrements.size,
      incrementIds: [...seenIncrements],
      events,
    };
  } catch {
    return { flushed: 0, incrementIds: [], events: [] };
  }
}
