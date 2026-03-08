import type { HookHandler, HookPayload, HookResponse } from '../hook-event-router.js';
import type { HookEventStore } from '../hook-event-store.js';

export function createSubagentStartHandler(store: HookEventStore): HookHandler {
  return async (payload: HookPayload): Promise<HookResponse> => {
    const body = payload.body as Record<string, unknown> | undefined;
    const agentId = String(body?.agent_id ?? body?.agentId ?? 'unknown');
    const agentType = String(body?.agent_type ?? body?.agentType ?? 'unknown');
    const sessionId = payload.sessionId;

    store.updateAgent({
      agentId,
      agentType,
      sessionId,
      startedAt: new Date().toISOString(),
    });

    return { status: 200, body: {} };
  };
}

export function createSubagentStopHandler(store: HookEventStore): HookHandler {
  return async (payload: HookPayload): Promise<HookResponse> => {
    const body = payload.body as Record<string, unknown> | undefined;
    const agentId = String(body?.agent_id ?? body?.agentId ?? 'unknown');
    const agentType = String(body?.agent_type ?? body?.agentType ?? 'unknown');
    const sessionId = payload.sessionId;

    store.updateAgent({
      agentId,
      agentType,
      sessionId,
      stoppedAt: new Date().toISOString(),
    });

    return { status: 200, body: {} };
  };
}
