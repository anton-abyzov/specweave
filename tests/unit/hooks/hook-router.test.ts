import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SAFE_DEFAULTS, HookEventType } from '../../../src/core/hooks/handlers/types.js';

// We need a real project root for hookRouter to find — use a temp dir with .specweave/config.json
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-hook-router-'));
  const swDir = path.join(tmpDir, '.specweave');
  fs.mkdirSync(path.join(swDir, 'logs'), { recursive: true });
  fs.mkdirSync(path.join(swDir, 'state'), { recursive: true });
  fs.writeFileSync(path.join(swDir, 'config.json'), '{}');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// 0867 added the work-handoff auto-write handlers: PreCompact (always) and a
// gated Stop variant. These pins now expect 4 entries — pre-tool-use,
// user-prompt-submit, pre-compact, stop.
const EXPECTED_HOOK_KEYS = ['user-prompt-submit', 'pre-tool-use', 'pre-compact', 'stop'];

describe('hook-router HANDLERS map', () => {
  // TC-001: HANDLERS map has exactly the expected keys
  it('should register pre-tool-use, user-prompt-submit, pre-compact, and stop', async () => {
    // Read the source and check the HANDLERS map keys via a regex parse
    const routerSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../src/core/hooks/handlers/hook-router.ts'),
      'utf-8',
    );
    const handlerKeys = [...routerSrc.matchAll(/'([a-z-]+)':\s*\(\)\s*=>/g)].map(m => m[1]);
    expect(handlerKeys).toHaveLength(EXPECTED_HOOK_KEYS.length);
    for (const key of EXPECTED_HOOK_KEYS) expect(handlerKeys).toContain(key);
  });
});

describe('HookEventType union', () => {
  // TC-002: HookEventType members match the registered handlers
  it('should contain pre-tool-use, user-prompt-submit, pre-compact, and stop', () => {
    // Verify at the type level by checking SAFE_DEFAULTS keys which mirror HookEventType
    // Also parse the source for the union members
    const typesSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../src/core/hooks/handlers/types.ts'),
      'utf-8',
    );
    const unionMatch = typesSrc.match(/export type HookEventType\s*=\s*([\s\S]*?);/);
    expect(unionMatch).toBeTruthy();
    const members = [...unionMatch![1].matchAll(/'([a-z-]+)'/g)].map(m => m[1]);
    expect(members).toHaveLength(EXPECTED_HOOK_KEYS.length);
    for (const key of EXPECTED_HOOK_KEYS) expect(members).toContain(key);
  });
});

describe('SAFE_DEFAULTS map', () => {
  // TC-003: SAFE_DEFAULTS has an entry per registered hook type
  it('should contain entries matching the registered hook types', () => {
    const keys = Object.keys(SAFE_DEFAULTS);
    expect(keys).toHaveLength(EXPECTED_HOOK_KEYS.length);
    for (const key of EXPECTED_HOOK_KEYS) expect(keys).toContain(key);
  });
});

describe('hookRouter behavior', () => {
  // TC-004: Calling router with removed event type returns safe default
  it('should return safe default for a removed event type without throwing', async () => {
    const origCwd = process.cwd();
    try {
      process.chdir(tmpDir);
      const { hookRouter } = await import('../../../src/core/hooks/handlers/hook-router.js');
      const result = await hookRouter('session-start', '{}');
      // Unknown event falls back to the generic safe default: { continue: true }
      expect(result).toEqual({ continue: true });
    } finally {
      process.chdir(origCwd);
    }
  });

  // TC-005: pre-tool-use still routes correctly
  it('should route pre-tool-use to its handler', async () => {
    const origCwd = process.cwd();
    try {
      process.chdir(tmpDir);
      const { hookRouter } = await import('../../../src/core/hooks/handlers/hook-router.js');
      const result = await hookRouter('pre-tool-use', JSON.stringify({ tool_name: 'Write' }));
      // Router yields a Claude-Code-schema-valid PreToolUse output:
      // either {decision:'block', reason} or pass-through {continue:true}.
      const isPassThrough = result.continue === true && result.decision === undefined;
      const isBlock = result.decision === 'block' && typeof result.reason === 'string';
      expect(isPassThrough || isBlock).toBe(true);
    } finally {
      process.chdir(origCwd);
    }
  });
});
