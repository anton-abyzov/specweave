/**
 * Router contract: `{}` on every failure path, results passed through
 * untouched, blocks/errors logged to hooks.jsonl (nothing else logged).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

let root = '';
const cwd0 = process.cwd();

function logLines(): Array<Record<string, unknown>> {
  const p = path.join(root, '.specweave', 'logs', 'hooks.jsonl');
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

beforeEach(() => {
  vi.resetModules();
  delete process.env.SPECWEAVE_DISABLE_HOOKS;
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-router-'));
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  process.chdir(root);
});
afterEach(() => {
  process.chdir(cwd0);
  vi.doUnmock('../../../../../src/core/hooks/handlers/pre-tool-use.js');
  fs.rmSync(root, { recursive: true, force: true });
});

async function routerWithPreToolUse(impl: () => Promise<unknown>) {
  vi.doMock('../../../../../src/core/hooks/handlers/pre-tool-use.js', () => ({ handle: vi.fn(impl) }));
  return (await import('../../../../../src/core/hooks/handlers/hook-router.js')).hookRouter;
}

describe('hookRouter', () => {
  it('passes a handler deny through untouched and logs it as a block', async () => {
    const deny = {
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'Increment Required.' },
    };
    const hookRouter = await routerWithPreToolUse(async () => deny);
    expect(await hookRouter('pre-tool-use', '{}')).toEqual(deny);
    const lines = logLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ hook: 'pre-tool-use', level: 'block', msg: 'Increment Required.' });
  });

  it('does not log successful passes', async () => {
    const hookRouter = await routerWithPreToolUse(async () => ({}));
    expect(await hookRouter('pre-tool-use', '{}')).toEqual({});
    expect(logLines()).toEqual([]);
  });

  it('returns {} and logs an error when the handler throws', async () => {
    const hookRouter = await routerWithPreToolUse(async () => {
      throw new Error('Handler crashed');
    });
    expect(await hookRouter('pre-tool-use', '{}')).toEqual({});
    const lines = logLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: 'error', hook: 'pre-tool-use' });
    expect(String(lines[0].msg)).toContain('Handler crashed');
  });

  it('logs Stop blocks too', async () => {
    fs.writeFileSync(path.join(root, '.specweave', 'state', 'auto-mode.json'), JSON.stringify({ active: true, incrementIds: ['0001-x'] }));
    const inc = path.join(root, '.specweave', 'increments', '0001-x');
    fs.mkdirSync(inc, { recursive: true });
    fs.writeFileSync(path.join(inc, 'metadata.json'), '{"status":"active"}');
    fs.writeFileSync(path.join(inc, 'tasks.md'), '### T-001: a\n**Status**: [ ] pending\n');
    const { hookRouter } = await import('../../../../../src/core/hooks/handlers/hook-router.js');
    const res = await hookRouter('stop', '{}');
    expect(res.decision).toBe('block');
    expect(logLines()[0]).toMatchObject({ hook: 'stop', level: 'block' });
  });

  it('uses the payload cwd to locate the project (worktrees)', async () => {
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-elsewhere-'));
    try {
      process.chdir(elsewhere);
      const hookRouter = await routerWithPreToolUse(async () => ({}));
      // With cwd pointing at the project the handler is reached (mock → {}), and
      // no "unknown event" line is written for a registered event.
      expect(await hookRouter('pre-tool-use', JSON.stringify({ cwd: root }))).toEqual({});
      expect(await hookRouter('nonexistent-event', JSON.stringify({ cwd: root }))).toEqual({});
      expect(logLines().map((l) => l.msg)).toEqual(['Unknown event type: nonexistent-event']);
    } finally {
      process.chdir(cwd0);
      fs.rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  it('returns {} when SPECWEAVE_DISABLE_HOOKS=1', async () => {
    process.env.SPECWEAVE_DISABLE_HOOKS = '1';
    const { hookRouter } = await import('../../../../../src/core/hooks/handlers/hook-router.js');
    expect(await hookRouter('stop', '{}')).toEqual({});
  });
});
