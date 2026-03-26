/**
 * PostToolUse hook handler — non-blocking event detector and queue writer.
 *
 * Detects changes to increment files and queues events to pending.jsonl
 * for later processing by stop-sync.
 *
 * @module core/hooks/handlers/post-tool-use
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn, HookInput } from './types.js';

const CONTINUE = { continue: true as const };

function getToolInput(input: HookInput): Record<string, unknown> {
  return (input.tool_input ?? input.toolInput ?? {}) as Record<string, unknown>;
}

function getFilePath(input: HookInput): string {
  const ti = getToolInput(input);
  return (ti.file_path ?? '') as string;
}

function extractIncrementId(filePath: string): string | null {
  const match = filePath.match(/(\d{4}-[^/]+)/);
  return match ? match[1] : null;
}

function queueEvent(
  stateDir: string,
  event: string,
  incrementId: string,
  timestamp: string,
  data?: Record<string, unknown>,
): void {
  try {
    const queueDir = path.join(stateDir, 'event-queue');
    fs.mkdirSync(queueDir, { recursive: true });
    const entry = {
      event,
      incrementId,
      timestamp,
      ...(data ? { data } : {}),
    };
    fs.appendFileSync(
      path.join(queueDir, 'pending.jsonl'),
      JSON.stringify(entry) + '\n',
    );
  } catch {
    // Never throw from event queuing
  }
}

export const handle: HandlerFn = async (input, context) => {
  const filePath = getFilePath(input);

  // Ignore non-increment files
  if (!filePath.includes('.specweave/increments/')) {
    return CONTINUE;
  }

  const incrementId = extractIncrementId(filePath);
  if (!incrementId) return CONTINUE;

  const basename = path.basename(filePath);

  // metadata.json → detect status changes
  if (basename === 'metadata.json') {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const meta = JSON.parse(raw);
        const status = meta.status ?? 'unknown';
        queueEvent(
          context.stateDir,
          'increment.status_changed',
          incrementId,
          context.timestamp,
          { field: 'status', value: status },
        );
      }
    } catch {
      // Read failure — skip silently
    }
    return CONTINUE;
  }

  // tasks.md → queue task.updated
  if (basename === 'tasks.md') {
    queueEvent(context.stateDir, 'task.updated', incrementId, context.timestamp);
    return CONTINUE;
  }

  // spec.md → queue spec.updated
  if (basename === 'spec.md') {
    queueEvent(context.stateDir, 'spec.updated', incrementId, context.timestamp);
    return CONTINUE;
  }

  return CONTINUE;
};
