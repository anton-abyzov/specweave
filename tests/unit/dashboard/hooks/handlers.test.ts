import { describe, it, expect, vi, beforeEach } from 'vitest';
import { preToolUseHandler } from '../../../../src/dashboard/server/hooks/handlers/pre-tool-use.js';
import { createSubagentStartHandler, createSubagentStopHandler } from '../../../../src/dashboard/server/hooks/handlers/subagent-lifecycle.js';
import { passthroughHandler } from '../../../../src/dashboard/server/hooks/handlers/passthrough.js';
import type { HookPayload } from '../../../../src/dashboard/server/hooks/hook-event-router.js';
import type { HookEventStore } from '../../../../src/dashboard/server/hooks/hook-event-store.js';

function makePayload(overrides: Partial<HookPayload> = {}): HookPayload {
  return { eventName: 'PreToolUse', body: {}, sessionId: 'sess-1', ...overrides };
}

function makeStubStore(): HookEventStore {
  return {
    addEvent: vi.fn(),
    updateAgent: vi.fn(),
    getEvents: vi.fn().mockReturnValue([]),
    getAgents: vi.fn().mockReturnValue([]),
    getStats: vi.fn().mockReturnValue({ totalEvents: 0, activeSessions: 0, activeAgents: 0 }),
    flush: vi.fn(),
    cleanup: vi.fn(),
    hydrate: vi.fn().mockResolvedValue(undefined),
  } as unknown as HookEventStore;
}

describe('PreToolUse handler', () => {
  it('allows non-restricted tools', async () => {
    const result = await preToolUseHandler(makePayload({ body: { tool_name: 'Read', tool_input: { file_path: '/any/file.ts' } } }));
    expect(result.status).toBe(200);
    const output = (result.body as Record<string, unknown>).hookSpecificOutput as Record<string, string>;
    expect(output.permissionDecision).toBe('allow');
  });

  it('allows Write tool on normal paths', async () => {
    const result = await preToolUseHandler(makePayload({ body: { tool_name: 'Write', tool_input: { file_path: '/project/src/index.ts' } } }));
    expect(result.status).toBe(200);
    const output = (result.body as Record<string, unknown>).hookSpecificOutput as Record<string, string>;
    expect(output.permissionDecision).toBe('allow');
  });

  it('denies Write to .specweave/config.json', async () => {
    const result = await preToolUseHandler(makePayload({ body: { tool_name: 'Write', tool_input: { file_path: '/project/.specweave/config.json' } } }));
    expect(result.status).toBe(200);
    const output = (result.body as Record<string, unknown>).hookSpecificOutput as Record<string, string>;
    expect(output.permissionDecision).toBe('deny');
  });

  it('allows Edit to .specweave/config.json', async () => {
    const result = await preToolUseHandler(makePayload({ body: { tool_name: 'Edit', tool_input: { file_path: '/project/.specweave/config.json' } } }));
    expect(result.status).toBe(200);
    const output = (result.body as Record<string, unknown>).hookSpecificOutput as Record<string, string>;
    expect(output.permissionDecision).toBe('allow');
  });

  it('never throws even with malformed payload', async () => {
    const result = await preToolUseHandler(makePayload({ body: null }));
    expect(result.status).toBe(200);
  });
});

describe('SubagentLifecycle handlers', () => {
  let store: HookEventStore;

  beforeEach(() => {
    store = makeStubStore();
  });

  it('SubagentStart creates agent record', async () => {
    const handler = createSubagentStartHandler(store);
    const result = await handler(makePayload({
      eventName: 'SubagentStart',
      body: { agent_id: 'agent-1', agent_type: 'explorer' },
    }));
    expect(result.status).toBe(200);
    expect(store.updateAgent).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'agent-1', agentType: 'explorer' }),
    );
  });

  it('SubagentStop updates agent record', async () => {
    const handler = createSubagentStopHandler(store);
    const result = await handler(makePayload({
      eventName: 'SubagentStop',
      body: { agent_id: 'agent-1', agent_type: 'explorer' },
    }));
    expect(result.status).toBe(200);
    expect(store.updateAgent).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'agent-1', stoppedAt: expect.any(String) }),
    );
  });
});

describe('Passthrough handler', () => {
  it('returns 200 with empty body for any event', async () => {
    const result = await passthroughHandler(makePayload({ eventName: 'Notification' }));
    expect(result.status).toBe(200);
    expect(result.body).toEqual({});
  });

  it('works for TaskCompleted events', async () => {
    const result = await passthroughHandler(makePayload({
      eventName: 'TaskCompleted',
      body: { task_id: 'T-001' },
    }));
    expect(result.status).toBe(200);
    expect(result.body).toEqual({});
  });
});
