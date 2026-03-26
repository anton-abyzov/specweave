import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import type { HookContext, HookInput } from '../../../../../src/core/hooks/handlers/types.js';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
  };
});

const mockedFs = vi.mocked(fs);

function makeContext(root = '/project'): HookContext {
  return {
    projectRoot: root,
    stateDir: `${root}/.specweave/state`,
    logsDir: `${root}/.specweave/logs`,
    configPath: `${root}/.specweave/config.json`,
    timestamp: '2026-03-27T00:00:00.000Z',
  };
}

describe('post-tool-use-analytics handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('always returns { continue: true }', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use-analytics.js'
    );
    const input: HookInput = { tool_name: 'Edit' };
    const result = await handle(input, makeContext());
    expect(result.continue).toBe(true);
  });

  it('appends skill usage event for Skill tool', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use-analytics.js'
    );
    const input: HookInput = {
      tool_name: 'Skill',
      tool_input: { skill: 'sw:pm' },
    };
    await handle(input, makeContext());

    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('analytics'),
      expect.objectContaining({ recursive: true }),
    );
    expect(mockedFs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('events.jsonl'),
      expect.stringContaining('"type":"skill"'),
    );
  });

  it('extracts plugin name from skill prefix', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use-analytics.js'
    );
    const input: HookInput = {
      tool_name: 'Skill',
      tool_input: { skill: 'myplug:do-thing' },
    };
    await handle(input, makeContext());

    const appendCall = mockedFs.appendFileSync.mock.calls.find(
      (c) => String(c[0]).includes('events.jsonl'),
    );
    const event = JSON.parse(String(appendCall![1]).trim());
    expect(event.plugin).toBe('myplug');
    expect(event.name).toBe('myplug:do-thing');
  });

  it('defaults plugin to "specweave" for sw: prefix skills', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use-analytics.js'
    );
    const input: HookInput = {
      tool_name: 'Skill',
      tool_input: { skill: 'sw:increment' },
    };
    await handle(input, makeContext());

    const appendCall = mockedFs.appendFileSync.mock.calls.find(
      (c) => String(c[0]).includes('events.jsonl'),
    );
    const event = JSON.parse(String(appendCall![1]).trim());
    expect(event.plugin).toBe('specweave');
  });

  it('appends agent usage event for Task (subagent) tool', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use-analytics.js'
    );
    const input: HookInput = {
      tool_name: 'Task',
      tool_input: { subagent_type: 'Explore' },
    };
    await handle(input, makeContext());

    const appendCall = mockedFs.appendFileSync.mock.calls.find(
      (c) => String(c[0]).includes('events.jsonl'),
    );
    const event = JSON.parse(String(appendCall![1]).trim());
    expect(event.type).toBe('agent');
    expect(event.name).toBe('Explore');
  });

  it('ignores non-Skill/Task tools (no analytics written)', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use-analytics.js'
    );
    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: { file_path: '/project/src/foo.ts' },
    };
    await handle(input, makeContext());

    expect(mockedFs.appendFileSync).not.toHaveBeenCalled();
  });

  it('handles missing skill name gracefully (no crash)', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use-analytics.js'
    );
    const input: HookInput = {
      tool_name: 'Skill',
      tool_input: {},
    };
    const result = await handle(input, makeContext());
    expect(result.continue).toBe(true);
    // Should not write if no skill name
    expect(mockedFs.appendFileSync).not.toHaveBeenCalled();
  });

  it('detects Skill tool from input fields when tool_name missing', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use-analytics.js'
    );
    const input: HookInput = {
      tool_input: { skill: 'sw:architect' },
    };
    await handle(input, makeContext());

    expect(mockedFs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('events.jsonl'),
      expect.stringContaining('sw:architect'),
    );
  });

  it('detects Task tool from subagent_type field when tool_name missing', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use-analytics.js'
    );
    const input: HookInput = {
      tool_input: { subagent_type: 'CodeReview' },
    };
    await handle(input, makeContext());

    expect(mockedFs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('events.jsonl'),
      expect.stringContaining('CodeReview'),
    );
  });

  it('includes timestamp in analytics event', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use-analytics.js'
    );
    const input: HookInput = {
      tool_name: 'Skill',
      tool_input: { skill: 'sw:pm' },
    };
    const ctx = makeContext();
    await handle(input, ctx);

    const appendCall = mockedFs.appendFileSync.mock.calls.find(
      (c) => String(c[0]).includes('events.jsonl'),
    );
    const event = JSON.parse(String(appendCall![1]).trim());
    expect(event.timestamp).toBe(ctx.timestamp);
  });
});
