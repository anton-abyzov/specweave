import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { HookEvent } from '../../types.js';
import type { HookEventStore } from './hook-event-store.js';

export interface HookPayload {
  eventName: string;
  body: unknown;
  sessionId: string;
}

export interface HookResponse {
  status: number;
  body?: unknown;
  storedEvent?: HookEvent;
}

export type HookHandler = (payload: HookPayload) => Promise<HookResponse>;

export class HookEventRouter {
  private handlers = new Map<string, HookHandler>();
  private logPath: string;

  constructor(
    private store: HookEventStore,
    private projectRoot: string,
  ) {
    this.logPath = path.join(projectRoot, '.specweave', 'logs', 'hooks.log');
  }

  register(eventName: string, handler: HookHandler): void {
    this.handlers.set(eventName, handler);
  }

  async handle(eventName: string, body: unknown): Promise<HookResponse> {
    const handler = this.handlers.get(eventName);
    if (!handler) {
      return { status: 400, body: { error: `Unknown event type: ${eventName}` } };
    }

    const sessionId = (body && typeof body === 'object' && 'sessionId' in body)
      ? String((body as Record<string, unknown>).sessionId)
      : 'unknown';

    const payload: HookPayload = { eventName, body, sessionId };
    const start = Date.now();

    try {
      const result = await handler(payload);
      const durationMs = Date.now() - start;

      const event: HookEvent = {
        id: randomUUID(),
        eventName: eventName as HookEvent['eventName'],
        sessionId,
        timestamp: new Date().toISOString(),
        payload: body,
        durationMs,
        result: (() => {
          if (!result.body || typeof result.body !== 'object') return undefined;
          const hso = (result.body as Record<string, unknown>).hookSpecificOutput as Record<string, unknown> | undefined;
          if (!hso) return undefined;
          const decision = hso.permissionDecision as string | undefined;
          if (!decision) return undefined;
          return { decision: decision as 'allow' | 'deny', reason: (hso.permissionDecisionReason as string) ?? undefined };
        })(),
      };
      this.store.addEvent(event);

      return { ...result, storedEvent: event };
    } catch (err) {
      const durationMs = Date.now() - start;
      this.appendLog(eventName, err);

      const event: HookEvent = {
        id: randomUUID(),
        eventName: eventName as HookEvent['eventName'],
        sessionId,
        timestamp: new Date().toISOString(),
        payload: body,
        durationMs,
      };
      this.store.addEvent(event);

      return { status: 200, body: {}, storedEvent: event };
    }
  }

  private appendLog(eventName: string, err: unknown): void {
    try {
      const logDir = path.dirname(this.logPath);
      fs.mkdirSync(logDir, { recursive: true });
      const message = err instanceof Error ? err.message : String(err);
      const line = `[${new Date().toISOString()}] [${eventName}] ERROR: ${message}\n`;
      fs.appendFileSync(this.logPath, line);
    } catch {
      // Logging failure must never propagate
    }
  }
}
