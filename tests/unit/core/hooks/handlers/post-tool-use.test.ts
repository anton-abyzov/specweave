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

describe('post-tool-use handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('always returns { continue: true }', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use.js'
    );
    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: { file_path: '/project/src/index.ts' },
    };
    const result = await handle(input, makeContext());
    expect(result.continue).toBe(true);
  });

  it('ignores files not in .specweave/increments/', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use.js'
    );
    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: { file_path: '/project/src/foo.ts' },
    };
    const result = await handle(input, makeContext());
    expect(result.continue).toBe(true);
    expect(mockedFs.appendFileSync).not.toHaveBeenCalled();
  });

  // ---- metadata.json changes ----

  it('queues status_changed event when metadata.json is edited', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use.js'
    );

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/metadata.json',
      },
    };
    const result = await handle(input, makeContext());
    expect(result.continue).toBe(true);

    // Should append to pending.jsonl
    expect(mockedFs.mkdirSync).toHaveBeenCalled();
    expect(mockedFs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('pending.jsonl'),
      expect.stringContaining('increment.status_changed'),
    );
  });

  it('includes incrementId and status value in queued metadata event', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use.js'
    );

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({ status: 'active' }));

    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/.specweave/increments/0042-login/metadata.json',
      },
    };
    await handle(input, makeContext());

    const appendCall = mockedFs.appendFileSync.mock.calls.find(
      (c) => String(c[0]).includes('pending.jsonl'),
    );
    expect(appendCall).toBeDefined();
    const event = JSON.parse(String(appendCall![1]).trim());
    expect(event.incrementId).toBe('0042-login');
    expect(event.data.value).toBe('active');
  });

  // ---- tasks.md / spec.md changes ----

  it('queues task.updated event for tasks.md changes', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use.js'
    );

    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/tasks.md',
      },
    };
    await handle(input, makeContext());

    expect(mockedFs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('pending.jsonl'),
      expect.stringContaining('task.updated'),
    );
  });

  it('queues spec.updated event for spec.md changes', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use.js'
    );

    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/spec.md',
      },
    };
    await handle(input, makeContext());

    expect(mockedFs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('pending.jsonl'),
      expect.stringContaining('spec.updated'),
    );
  });

  it('extracts incrementId from file path correctly', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use.js'
    );

    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/.specweave/increments/0123-my-feature/tasks.md',
      },
    };
    await handle(input, makeContext());

    const appendCall = mockedFs.appendFileSync.mock.calls.find(
      (c) => String(c[0]).includes('pending.jsonl'),
    );
    const event = JSON.parse(String(appendCall![1]).trim());
    expect(event.incrementId).toBe('0123-my-feature');
  });

  // ---- Edge cases ----

  it('handles missing file_path gracefully', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use.js'
    );
    const input: HookInput = { tool_name: 'Edit', tool_input: {} };
    const result = await handle(input, makeContext());
    expect(result.continue).toBe(true);
  });

  it('handles metadata.json read failure gracefully', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use.js'
    );

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('read error');
    });

    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/metadata.json',
      },
    };
    const result = await handle(input, makeContext());
    expect(result.continue).toBe(true);
  });

  it('uses toolInput fallback when tool_input is missing', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/post-tool-use.js'
    );
    const input: HookInput = {
      toolName: 'Edit',
      toolInput: {
        file_path: '/project/.specweave/increments/0001-feat/tasks.md',
      },
    };
    await handle(input, makeContext());

    expect(mockedFs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('pending.jsonl'),
      expect.stringContaining('task.updated'),
    );
  });
});
