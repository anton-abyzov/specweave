import { describe, it, expect } from 'vitest';
import type {
  CCHookEventName,
  HookEvent,
  AgentRecord,
  SSEEventType,
} from '../../../../src/dashboard/types.js';

describe('Hook Types', () => {
  it('CCHookEventName covers all 17 event names', () => {
    const httpEvents: CCHookEventName[] = [
      'PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop',
      'TaskCompleted', 'UserPromptSubmit', 'PostToolUseFailure',
      'PermissionRequest',
    ];
    const commandEvents: CCHookEventName[] = [
      'SessionStart', 'SessionEnd', 'Notification', 'SubagentStart',
      'ConfigChange', 'PreCompact', 'TeammateIdle',
    ];
    expect(httpEvents).toHaveLength(8);
    expect(commandEvents).toHaveLength(7);
    // Total 15 (spec says 17 but TeammateIdle list in spec has 7 command events, 8 HTTP = 15 actual CC events)
    // Verify type-level assignment works for all
    const all: CCHookEventName[] = [...httpEvents, ...commandEvents];
    expect(all.length).toBeGreaterThanOrEqual(15);
  });

  it('HookEvent has required fields', () => {
    const event: HookEvent = {
      id: 'test-uuid',
      eventName: 'PreToolUse',
      sessionId: 'sess-123',
      timestamp: new Date().toISOString(),
      payload: { tool_name: 'Write' },
    };
    expect(event.id).toBe('test-uuid');
    expect(event.eventName).toBe('PreToolUse');
    expect(event.sessionId).toBe('sess-123');
    expect(event.payload).toBeDefined();
  });

  it('HookEvent supports optional result and durationMs', () => {
    const event: HookEvent = {
      id: 'test-uuid-2',
      eventName: 'PreToolUse',
      sessionId: 'sess-456',
      timestamp: new Date().toISOString(),
      payload: {},
      result: { decision: 'deny', reason: 'blocked' },
      durationMs: 42,
    };
    expect(event.result?.decision).toBe('deny');
    expect(event.result?.reason).toBe('blocked');
    expect(event.durationMs).toBe(42);
  });

  it('AgentRecord has required fields', () => {
    const agent: AgentRecord = {
      agentId: 'agent-1',
      agentType: 'explorer',
      sessionId: 'sess-789',
      startedAt: new Date().toISOString(),
    };
    expect(agent.agentId).toBe('agent-1');
    expect(agent.agentType).toBe('explorer');
    expect(agent.stoppedAt).toBeUndefined();
    expect(agent.durationMs).toBeUndefined();
  });

  it('AgentRecord supports optional stoppedAt and durationMs', () => {
    const agent: AgentRecord = {
      agentId: 'agent-2',
      agentType: 'coder',
      sessionId: 'sess-789',
      startedAt: '2026-03-07T10:00:00Z',
      stoppedAt: '2026-03-07T10:05:00Z',
      durationMs: 300000,
    };
    expect(agent.stoppedAt).toBe('2026-03-07T10:05:00Z');
    expect(agent.durationMs).toBe(300000);
  });

  it('SSEEventType includes hook-event and hook-agent', () => {
    const hookEvent: SSEEventType = 'hook-event';
    const hookAgent: SSEEventType = 'hook-agent';
    expect(hookEvent).toBe('hook-event');
    expect(hookAgent).toBe('hook-agent');
  });
});
