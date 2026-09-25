import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { limitHitTarget, writeSettings } from '../../../../src/core/session/usage-guard.js';
import { autoHandoffCommand, grokHook } from '../../../../src/cli/commands/auto-handoff.js';

let home: string;
let project: string;

beforeEach(() => {
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
    writeSettings({ at: 90 }, home);
    expect(limitHitTarget(failure({ error: 'server_error' }), { home })).toBeUndefined();
    // ~/.specweave holds auto-handoff settings; that alone must not make home a project
    expect(limitHitTarget(failure({ cwd: home, sessionId: 'g-out' }), { home })).toBeUndefined();
    expect(limitHitTarget(failure(), { home })).toBe(project);
    expect(limitHitTarget(failure(), { home })).toBeUndefined();
    expect(fs.readFileSync(path.join(home, '.specweave', 'usage', 'g-1.handed-off'), 'utf8')).toContain('rate_limit');
  });

  it('accepts the snake_case session id too and rejects ids that escape the usage folder', () => {
    writeSettings({ at: 90 }, home);
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
