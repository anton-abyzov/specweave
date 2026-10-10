import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { limitHitTarget, writeSettings, recordClaudeUsage, limitResetMinutes, LIMIT_HIT_REARM_MS } from '../../../../src/core/session/usage-guard.js';
import { autoHandoffCommand, grokHook, usageGuardCommand } from '../../../../src/cli/commands/auto-handoff.js';

vi.mock('../../../../src/core/session/session-checkpoint.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../src/core/session/session-checkpoint.js')>()),
  queueSessionCheckpoint: vi.fn(),
}));
import { queueSessionCheckpoint } from '../../../../src/core/session/session-checkpoint.js';

let home: string;
let project: string;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SPECWEAVE_STUDIO_THREAD_ID;
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-grok-home-'));
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-grok-proj-'));
  fs.mkdirSync(path.join(project, '.specweave'));
  fs.writeFileSync(path.join(project, '.specweave', 'config.json'), '{}');
  fs.mkdirSync(path.join(project, 'src', 'deep'), { recursive: true });
});
afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
  fs.rmSync(project, { recursive: true, force: true });
});

// Grok Build's StopFailure input is camelCase, per its hooks guide.
const failure = (over: Record<string, unknown> = {}) => ({
  hookEventName: 'stop_failure', hook_event_name: 'StopFailure', sessionId: 'g-1', cwd: path.join(project, 'src', 'deep'), error: 'rate_limit', ...over,
});

async function quiet(fn: () => Promise<unknown>): Promise<string> {
  const chunks: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  (process.stdout as unknown as { write: (c: string) => boolean }).write = (c: string) => { chunks.push(String(c)); return true; };
  try { await fn(); } finally { (process.stdout as unknown as { write: typeof orig }).write = orig; }
  return chunks.join('');
}

describe('Grok Build rate-limit handoff', () => {
  it('does nothing until auto-handoff is on', () => {
    expect(limitHitTarget(failure(), { home })).toBeUndefined();
  });

  it('hands off once per session, only on a rate limit, only inside a project', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    expect(limitHitTarget(failure({ error: 'server_error' }), { home })).toBeUndefined();
    // ~/.specweave holds auto-handoff settings; that alone must not make home a project
    expect(limitHitTarget(failure({ cwd: home, sessionId: 'g-out' }), { home })).toBeUndefined();
    expect(limitHitTarget(failure(), { home })).toBe(project);
    expect(limitHitTarget(failure(), { home })).toBeUndefined();
    expect(fs.readFileSync(path.join(home, '.specweave', 'usage', 'g-1.limit-hit'), 'utf8')).toContain('rate_limit');
  });

  it('hands off again once the shortest window could have reset, not before', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    const now = Date.parse('2026-10-03T06:00:00Z');
    expect(limitHitTarget(failure(), { home, now })).toBe(project);
    expect(limitHitTarget(failure(), { home, now: now + LIMIT_HIT_REARM_MS - 60_000 })).toBeUndefined();
    expect(limitHitTarget(failure(), { home, now: now + LIMIT_HIT_REARM_MS + 60_000 })).toBe(project);
  });

  it('Claude Code: a StopFailure rate_limit hands off even after the Stop hook already asked', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    fs.mkdirSync(path.join(home, '.specweave', 'usage'), { recursive: true });
    fs.writeFileSync(path.join(home, '.specweave', 'usage', 'c-1.handed-off'), '{"window":"5-hour","percent":91}\n');
    const claudeInput = { session_id: 'c-1', hook_event_name: 'StopFailure', cwd: project, error: 'rate_limit', error_details: '429' };
    expect(limitHitTarget(claudeInput, { home })).toBe(project);
    expect(limitHitTarget(claudeInput, { home })).toBeUndefined();
  });

  it('accepts the snake_case session id too and rejects ids that escape the usage folder', () => {
    writeSettings({ at: 90, mode: 'enforce' }, home);
    expect(limitHitTarget({ session_id: 'g-2', cwd: project, error: 'rate_limit' }, { home })).toBe(project);
    expect(limitHitTarget(failure({ sessionId: '../../x' }), { home })).toBeUndefined();
  });

  it('auto-handoff on writes the Grok hook only when Grok is installed, and off removes it', async () => {
    const hookFile = path.join(home, '.grok', 'hooks', 'specweave-auto-handoff.json');
    await quiet(() => autoHandoffCommand('on', { home }));
    expect(fs.existsSync(hookFile)).toBe(false);

    fs.mkdirSync(path.join(home, '.grok'));
    const out = await quiet(() => autoHandoffCommand('on', { home }));
    expect(out).toContain('Grok Build');
    const hook = JSON.parse(fs.readFileSync(hookFile, 'utf8'));
    expect(hook).toEqual(grokHook());
    expect(hook.hooks.StopFailure[0].matcher).toBe('rate_limit');
    expect(hook.hooks.StopFailure[0].hooks[0]).toMatchObject({ type: 'command', command: 'specweave usage-guard --limit-hit', env: { SPECWEAVE_TOOL: 'grok' } });

    await quiet(() => autoHandoffCommand('off', { home }));
    expect(fs.existsSync(hookFile)).toBe(false);
  });
});

describe('rate-limit failure and the time to reset', () => {
  const now = Date.parse('2026-10-10T18:00:00Z');
  const claude = (fiveHour: number, resetMinutes: number, weekly = 20) => ({
    session_id: 'c-1', rate_limits: {
      five_hour: { used_percentage: fiveHour, resets_at: now / 1000 + resetMinutes * 60 },
      seven_day: { used_percentage: weekly, resets_at: now / 1000 + 4 * 86400 },
    },
  });

  it('suggest mode still hands off when a turn hits the limit: the session cannot go on', () => {
    writeSettings({ at: 95 }, home);
    expect(limitHitTarget(failure(), { home, now })).toBe(project);
  });

  it('waits instead when the limit resets within the wait', () => {
    writeSettings({ at: 95 }, home);
    recordClaudeUsage(claude(100, 12), home, now);
    expect(limitHitTarget(failure({ sessionId: undefined, session_id: 'c-1' }), { home, now })).toBeUndefined();
    expect(fs.existsSync(path.join(home, '.specweave', 'usage', 'c-1.limit-hit'))).toBe(false);
    // Reset further away than the wait: hand off.
    recordClaudeUsage(claude(100, 45), home, now);
    expect(limitHitTarget(failure({ sessionId: undefined, session_id: 'c-1' }), { home, now })).toBe(project);
  });

  it('the last full window decides, and a stale reading under the threshold falls back to the fullest', () => {
    const w = (name: string, percent: number, mins?: number) => ({ name, percent, ...(mins !== undefined ? { resetsAt: now / 1000 + mins * 60 } : {}) });
    expect(limitResetMinutes([w('5-hour', 100, 10), w('weekly', 99, 3000)], 95, now)).toBe(3000);
    expect(limitResetMinutes([w('5-hour', 80, 10), w('weekly', 30, 3000)], 95, now)).toBe(10);
    expect(limitResetMinutes([w('5-hour', 100), w('weekly', 30, 3000)], 95, now)).toBeUndefined();
    expect(limitResetMinutes([], 95, now)).toBeUndefined();
  });
});

describe('rate-limit failure in checkpoint-only mode', () => {
  it('returns valid empty JSON without scheduling when disabled or for another failure', async () => {
    const run = (input: object) => quiet(() => usageGuardCommand({ home, limitHit: true, input: JSON.stringify(input) }));
    expect(await run(failure())).toBe('{}\n');
    writeSettings({ at: 90, mode: 'checkpoint' }, home);
    expect(await run(failure({ error: 'server_error' }))).toBe('{}\n');
    expect(queueSessionCheckpoint).not.toHaveBeenCalled();
  });

  it.each(['sessionId', 'session_id'])('queues %s without pushing, releasing ownership or a premature success marker', async (field) => {
    writeSettings({ at: 90, mode: 'checkpoint' }, home);
    const input = { [field]: 'g-1', cwd: project, error: 'rate_limit' };
    const out = await quiet(() => usageGuardCommand({ home, limitHit: true, input: JSON.stringify(input) }));
    expect(out).toBe('{}\n');
    expect(queueSessionCheckpoint).toHaveBeenCalledExactlyOnceWith(input, { home });
    expect(fs.existsSync(path.join(home, '.specweave', 'usage'))).toBe(false);
  });

});
