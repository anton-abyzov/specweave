/**
 * Sync Event Queue
 *
 * Replaces direct LivingDocsSync/SyncCoordinator calls in trigger paths.
 * Events are appended to .specweave/state/event-queue/pending.jsonl
 * and drained by explicit CLI commands (specweave complete, sw:sync-progress).
 *
 * Design:
 * - Append-only JSONL (one JSON object per line)
 * - appendFile is atomic-ish for single-line appends on all major OS
 * - No locking needed: worst case is reordered lines, not data loss
 *
 * @module core/sync/event-queue
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * A queued sync event waiting to be processed.
 */
export interface SyncEvent {
  incrementId: string;
  eventType: string; // 'task.completed' | 'user-story.completed' | 'increment.done' | 'status.changed'
  metadata?: Record<string, any>;
  timestamp: string; // ISO 8601
}

const QUEUE_DIR = '.specweave/state/event-queue';
const PENDING_FILE = 'pending.jsonl';

/**
 * Append a sync event to the pending queue.
 *
 * Creates the queue directory and file if they don't exist.
 * Uses appendFile for atomic-ish single-line writes.
 *
 * @param projectRoot - Project root directory
 * @param incrementId - Increment identifier (e.g., '0618-simplify-sync-setup')
 * @param eventType - Event type (e.g., 'task.completed', 'status.changed')
 * @param metadata - Optional metadata (taskId, newStatus, etc.)
 */
export async function queueSyncEvent(
  projectRoot: string,
  incrementId: string,
  eventType: string,
  metadata?: Record<string, any>,
): Promise<void> {
  const queueDir = path.join(projectRoot, QUEUE_DIR);
  const pendingPath = path.join(queueDir, PENDING_FILE);

  // Ensure directory exists
  await fs.mkdir(queueDir, { recursive: true });

  const event: SyncEvent = {
    incrementId,
    eventType,
    ...(metadata !== undefined ? { metadata } : {}),
    timestamp: new Date().toISOString(),
  };

  // Append single JSON line (atomic-ish for single-line appends)
  await fs.appendFile(pendingPath, JSON.stringify(event) + '\n', 'utf-8');
}

/**
 * Read all pending events from the queue.
 *
 * @param projectRoot - Project root directory
 * @returns Array of pending SyncEvent objects
 */
export async function readPendingEvents(
  projectRoot: string,
): Promise<SyncEvent[]> {
  const pendingPath = path.join(projectRoot, QUEUE_DIR, PENDING_FILE);

  try {
    const content = await fs.readFile(pendingPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line) as SyncEvent);
  } catch {
    // File doesn't exist or can't be read
    return [];
  }
}
