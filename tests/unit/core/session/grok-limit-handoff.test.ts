import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { writeSettings } from '../../../../src/core/session/usage-guard.js';
import { autoHandoffCommand, grokHook, usageGuardCommand } from '../../../../src/cli/commands/auto-handoff.js';

vi.mock('../../../../src/core/session/session-checkpoint.js', () => ({ queueSessionCheckpoint: vi.fn() }));
import { queueSessionCheckpoint } from '../../../../src/core/session/session-checkpoint.js';

let home: string;
let project: string;

beforeEach(() => {
  vi.clearAllMocks();
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

describe('rate-limit local checkpoint', () => {
  it('returns valid empty JSON without scheduling when disabled or for another failure', async () => {
    const run = (input: object) => quiet(() => usageGuardCommand({ home, limitHit: true, input: JSON.stringify(input) }));
    expect(await run(failure())).toBe('{}\n');
    writeSettings({ at: 90 }, home);
    expect(await run(failure({ error: 'server_error' }))).toBe('{}\n');
    expect(queueSessionCheckpoint).not.toHaveBeenCalled();
  });

  it.each(['sessionId', 'session_id'])('queues %s without pushing, releasing ownership or a premature success marker', async (field) => {
    writeSettings({ at: 90 }, home);
    const input = { [field]: 'g-1', cwd: project, error: 'rate_limit' };
    const out = await quiet(() => usageGuardCommand({ home, limitHit: true, input: JSON.stringify(input) }));
    expect(out).toBe('{}\n');
    expect(queueSessionCheckpoint).toHaveBeenCalledExactlyOnceWith(input, { home });
    expect(fs.existsSync(path.join(home, '.specweave', 'usage'))).toBe(false);
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
