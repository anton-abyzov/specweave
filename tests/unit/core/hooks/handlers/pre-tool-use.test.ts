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

describe('pre-tool-use handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  // ---- FAST PATH: non-increment files ----

  it('allows tools not targeting .specweave/increments/', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );
    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: { file_path: '/project/src/index.ts', old_string: 'a', new_string: 'b' },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });

  it('allows non-Edit/Write/TeamCreate tools even for increment files', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );
    const input: HookInput = {
      tool_name: 'Read',
      tool_input: { file_path: '/project/.specweave/increments/0001-feat/spec.md' },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });

  // ---- STATUS COMPLETION GUARD (Edit on metadata.json) ----

  it('blocks Edit setting status to "completed" on metadata.json', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    mockedFs.existsSync.mockReturnValue(false); // no sw-done marker, no auto session

    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/metadata.json',
        old_string: '"status": "active"',
        new_string: '"status": "completed"',
      },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('block');
    expect(result.reason).toBeDefined();
  });

  it('allows Edit on metadata.json not changing status to completed', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );
    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/metadata.json',
        old_string: '"title": "old"',
        new_string: '"title": "new"',
      },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });

  it('allows status→completed when sw-done marker exists', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    mockedFs.existsSync.mockImplementation((p: fs.PathLike) => {
      return String(p).includes('.sw-done-in-progress');
    });

    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/metadata.json',
        old_string: '"status": "active"',
        new_string: '"status": "completed"',
      },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });

  it('allows status→completed when auto-mode active with testsVerified', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    mockedFs.existsSync.mockImplementation((p: fs.PathLike) => {
      return String(p).includes('auto/session.json');
    });
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify({ status: 'active', testsVerified: true }),
    );

    const input: HookInput = {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/metadata.json',
        old_string: '"status": "active"',
        new_string: '"status": "completed"',
      },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });

  // ---- INTERVIEW ENFORCEMENT GUARD (Write to spec.md) ----

  it('allows Write to spec.md when interview enforcement is not strict', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    mockedFs.existsSync.mockImplementation((p: fs.PathLike) => {
      return String(p).includes('config.json');
    });
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify({ planning: { deepInterview: { enabled: true, enforcement: 'advisory' } } }),
    );

    const input: HookInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/spec.md',
        content: '# Spec\nReal content here with AC-US1-01',
      },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });

  it('blocks Write to spec.md when strict interview not started', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    mockedFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = String(p);
      if (s.includes('config.json')) return true;
      return false; // no interview state file
    });
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify({ planning: { deepInterview: { enabled: true, enforcement: 'strict' } } }),
    );

    const input: HookInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/spec.md',
        content: '# Real spec with substance',
      },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('block');
    expect(result.reason).toContain('Interview');
  });

  it('blocks Write to spec.md when strict interview has missing categories', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockImplementation((p: fs.PathOrFileDescriptor) => {
      const s = String(p);
      if (s.includes('config.json')) {
        return JSON.stringify({
          planning: { deepInterview: { enabled: true, enforcement: 'strict' } },
        });
      }
      if (s.includes('interview-')) {
        return JSON.stringify({
          coveredCategories: { architecture: { summary: 'done' }, security: { summary: 'done' } },
        });
      }
      return '{}';
    });

    const input: HookInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/spec.md',
        content: '# Real spec with substance',
      },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('block');
    expect(result.reason).toContain('Incomplete');
  });

  it('allows Write to spec.md when strict interview all categories covered', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockImplementation((p: fs.PathOrFileDescriptor) => {
      const s = String(p);
      if (s.includes('config.json')) {
        return JSON.stringify({
          planning: { deepInterview: { enabled: true, enforcement: 'strict' } },
        });
      }
      if (s.includes('interview-')) {
        return JSON.stringify({
          coveredCategories: {
            architecture: { summary: 'done' },
            integrations: { summary: 'done' },
            'ui-ux': { summary: 'done' },
            performance: { summary: 'done' },
            security: { summary: 'done' },
            'edge-cases': { summary: 'done' },
          },
        });
      }
      return '{}';
    });

    const input: HookInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/spec.md',
        content: '# Real spec with substance',
      },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });

  it('allows Write to spec.md when content contains template markers', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify({
        planning: { deepInterview: { enabled: true, enforcement: 'strict' } },
      }),
    );

    const input: HookInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/.specweave/increments/0001-feat/spec.md',
        content: '# TEMPLATE FILE\n[Story Title] as [user type]',
      },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });

  // ---- INCREMENT EXISTENCE GUARD (TeamCreate) ----

  it('blocks TeamCreate when no active increment with valid spec exists', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    mockedFs.existsSync.mockReturnValue(false);

    const input: HookInput = {
      tool_name: 'TeamCreate',
      tool_input: { team_name: 'impl-team', description: 'implement the feature' },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('block');
    expect(result.reason).toContain('Increment');
  });

  it('allows TeamCreate for non-implementation teams (review- prefix)', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    const input: HookInput = {
      tool_name: 'TeamCreate',
      tool_input: { team_name: 'review-pr-123', description: 'review the PR' },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });

  it('allows TeamCreate for non-implementation teams (description keyword)', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    const input: HookInput = {
      tool_name: 'TeamCreate',
      tool_input: { team_name: 'my-team', description: 'brainstorm new ideas' },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });

  it('allows TeamCreate when valid spec.md exists in increments', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    const specContent = 'A'.repeat(600) + '\nAC-US1-01: Must do something';

    mockedFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const s = String(p);
      return s.includes('increments') || s.includes('spec.md') || s.includes('metadata.json');
    });
    mockedFs.readFileSync.mockImplementation((p: fs.PathOrFileDescriptor) => {
      const s = String(p);
      if (s.includes('metadata.json')) return JSON.stringify({ status: 'active' });
      return specContent;
    });

    // Mock readdirSync for scanning increments
    (mockedFs as any).readdirSync = vi.fn().mockReturnValue([
      { name: '0001-feat', isDirectory: () => true },
    ]);

    const input: HookInput = {
      tool_name: 'TeamCreate',
      tool_input: { team_name: 'impl-team', description: 'implement the feature' },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });

  it('allows TeamCreate when SPECWEAVE_NO_INCREMENT env var is set', async () => {
    process.env.SPECWEAVE_NO_INCREMENT = '1';

    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );

    const input: HookInput = {
      tool_name: 'TeamCreate',
      tool_input: { team_name: 'impl-team', description: 'build something' },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');

    delete process.env.SPECWEAVE_NO_INCREMENT;
  });

  // ---- Edge cases ----

  it('handles missing tool_input gracefully', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );
    const input: HookInput = { tool_name: 'Edit' };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });

  it('uses toolName fallback when tool_name is missing', async () => {
    const { handle } = await import(
      '../../../../../src/core/hooks/handlers/pre-tool-use.js'
    );
    const input: HookInput = {
      toolName: 'Edit',
      toolInput: {
        file_path: '/project/src/foo.ts',
        old_string: 'a',
        new_string: 'b',
      },
    };
    const result = await handle(input, makeContext());
    expect(result.decision).toBe('allow');
  });
});
