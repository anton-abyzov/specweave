/**
 * Hook wiring parity + output-schema guard (0869, extended for 2.0).
 *
 * 1. Every event plugins/specweave/hooks/hooks.json launches via
 *    `node ${CLAUDE_PLUGIN_ROOT}/hooks/run.mjs <event>` is registered in the
 *    router, and vice versa (no silent no-op hooks, no dead handlers).
 * 2. Every hooks.json entry is exec-form (`command: "node"` + `args`), never a
 *    shell string (Windows without Git Bash), and every timeout is <= 60 s
 *    (the unit is SECONDS — `15000` once meant 4.2 h).
 * 3. Invoking the router with a sample payload for each event yields output
 *    that is valid per the Claude Code hook schema for that event.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { hookRouter, registeredHookEvents } from '../../../src/core/hooks/handlers/hook-router.js';
import { HOOK_EVENTS, deny, pass, sessionContext, stopBlock, validateHookOutput, warn } from '../../../src/core/hooks/handlers/types.js';

interface HookEntry { type?: string; command?: string; args?: string[]; timeout?: number }
interface HooksJson { hooks: Record<string, Array<{ matcher?: string; hooks: HookEntry[] }>> }

function readHooksJson(): HooksJson {
  const p = path.resolve(process.cwd(), 'plugins/specweave/hooks/hooks.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as HooksJson;
}

function allEntries(): Array<{ event: string; matcher?: string; entry: HookEntry }> {
  const out: Array<{ event: string; matcher?: string; entry: HookEntry }> = [];
  for (const [event, groups] of Object.entries(readHooksJson().hooks)) {
    for (const g of groups) for (const entry of g.hooks) out.push({ event, matcher: g.matcher, entry });
  }
  return out;
}

/** The `<event>` argument each hooks.json entry passes to run.mjs. */
function launchedEvents(): string[] {
  return [...new Set(allEntries().map(({ entry }) => entry.args?.[1] ?? ''))].sort();
}

describe('hooks.json ↔ router parity', () => {
  it('registers exactly the four 2.0 events (SessionStart, PreToolUse, Stop, PreCompact)', () => {
    expect(Object.keys(readHooksJson().hooks).sort()).toEqual(['PreCompact', 'PreToolUse', 'SessionStart', 'Stop']);
    expect(launchedEvents()).toEqual([...HOOK_EVENTS].sort());
    expect(registeredHookEvents()).toEqual([...HOOK_EVENTS].sort());
  });

  it('every entry is exec-form node + run.mjs, no shell, no matcher_content', () => {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'plugins/specweave/hooks/hooks.json'), 'utf-8');
    expect(raw).not.toContain('bash');
    expect(raw).not.toContain('matcher_content');
    for (const { event, entry } of allEntries()) {
      expect(entry.type, event).toBe('command');
      expect(entry.command, event).toBe('node');
      expect(entry.args?.[0], event).toBe('${CLAUDE_PLUGIN_ROOT}/hooks/run.mjs');
      expect(HOOK_EVENTS, event).toContain(entry.args?.[1]);
    }
  });

  it('PreToolUse is scoped to Write|Edit', () => {
    const pre = readHooksJson().hooks.PreToolUse;
    expect(pre).toHaveLength(1);
    expect(pre[0].matcher).toBe('Write|Edit');
  });

  it('timeouts are in seconds and <= 60', () => {
    for (const { event, entry } of allEntries()) {
      expect(typeof entry.timeout, event).toBe('number');
      expect(entry.timeout!, event).toBeGreaterThan(0);
      expect(entry.timeout!, event).toBeLessThanOrEqual(60);
    }
  });
});

describe('per-event output schema (router invoked with sample payloads)', () => {
  let repo = '';
  const cwd0 = process.cwd();

  afterEach(() => {
    process.chdir(cwd0);
    if (repo && fs.existsSync(repo)) fs.rmSync(repo, { recursive: true, force: true });
    repo = '';
  });

  function mkProject(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-schema-'));
    fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
    fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
    return root;
  }

  const samples: Record<(typeof HOOK_EVENTS)[number], Record<string, unknown>> = {
    'session-start': { hook_event_name: 'SessionStart', source: 'startup' },
    'pre-tool-use': {
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: 'C:\\p\\.specweave\\increments\\0001-x\\metadata.json', old_string: '"status": "active"', new_string: '"status": "completed"' },
    },
    'stop': { hook_event_name: 'Stop', stop_hook_active: false },
    'pre-compact': { hook_event_name: 'PreCompact', trigger: 'auto' },
  };

  for (const event of HOOK_EVENTS) {
    it(`${event}: valid output inside a SpecWeave project`, async () => {
      repo = mkProject();
      process.chdir(repo);
      const out = await hookRouter(event, JSON.stringify({ ...samples[event], cwd: repo }));
      expect(validateHookOutput(event, out)).toBeNull();
      expect(JSON.stringify(out)).not.toMatch(/"decision":"(allow|approve)"/);
    });

    it(`${event}: {} outside a SpecWeave project`, async () => {
      const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-bare-'));
      try {
        process.chdir(bare);
        expect(await hookRouter(event, JSON.stringify({ ...samples[event], cwd: bare }))).toEqual({});
      } finally {
        process.chdir(cwd0);
        fs.rmSync(bare, { recursive: true, force: true });
      }
    });
  }

  it('pre-tool-use sample (status→completed on a Windows path) is a deny', async () => {
    repo = mkProject();
    process.chdir(repo);
    const out = await hookRouter('pre-tool-use', JSON.stringify({ ...samples['pre-tool-use'], cwd: repo }));
    expect(out.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(out.hookSpecificOutput?.permissionDecisionReason).toContain('0001-x');
  });

  it('unknown events and SPECWEAVE_DISABLE_HOOKS=1 return {}', async () => {
    repo = mkProject();
    process.chdir(repo);
    expect(await hookRouter('user-prompt-submit', '{}')).toEqual({});
    process.env.SPECWEAVE_DISABLE_HOOKS = '1';
    try {
      expect(await hookRouter('stop', '{}')).toEqual({});
    } finally {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
    }
  });

  it('never throws on garbage stdin', async () => {
    repo = mkProject();
    process.chdir(repo);
    expect(await hookRouter('pre-compact', 'COMPLETELY_INVALID{{{{')).toEqual({});
    expect(await hookRouter('stop', '[1,2,3]')).toEqual({});
  });
});

describe('validateHookOutput accepts every shape the helpers produce', () => {
  it('accepts pass() for all four events', () => {
    for (const event of HOOK_EVENTS) expect(validateHookOutput(event, pass())).toBeNull();
  });

  it('accepts deny() and warn() for pre-tool-use', () => {
    expect(validateHookOutput('pre-tool-use', deny('nope'))).toBeNull();
    expect(validateHookOutput('pre-tool-use', warn('heads up'))).toBeNull();
  });

  it('accepts sessionContext() for session-start and stopBlock() for stop', () => {
    expect(validateHookOutput('session-start', sessionContext('hello'))).toBeNull();
    expect(validateHookOutput('stop', stopBlock('keep going'))).toBeNull();
  });

  it('rejects the invalid shapes issue #1847 was about', () => {
    expect(validateHookOutput('pre-tool-use', { decision: 'allow' })).not.toBeNull();
    expect(validateHookOutput('pre-tool-use', { decision: 'approve' })).not.toBeNull();
    expect(validateHookOutput('session-start', { decision: 'block', reason: 'x' })).not.toBeNull();
    expect(validateHookOutput('stop', { decision: 'block' })).not.toBeNull();
    expect(validateHookOutput('pre-tool-use', { hookSpecificOutput: { hookEventName: 'Stop' } })).not.toBeNull();
    expect(validateHookOutput('pre-tool-use', { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'yes' } })).not.toBeNull();
    expect(validateHookOutput('pre-tool-use', { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny' } })).not.toBeNull();
    expect(validateHookOutput('pre-tool-use', { hookSpecificOutput: { hookEventName: 'PreToolUse' } })).not.toBeNull();
    expect(validateHookOutput('unknown-event', {})).not.toBeNull();
    expect(validateHookOutput('stop', null)).not.toBeNull();
  });
});
