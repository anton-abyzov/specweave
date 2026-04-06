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

describe('hook-router HANDLERS map', () => {
  // TC-001: HANDLERS map has exactly 2 keys
  it('should have exactly 2 handler entries: pre-tool-use and user-prompt-submit', async () => {
    // Read the source and check the HANDLERS map keys via a regex parse
    const routerSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../src/core/hooks/handlers/hook-router.ts'),
      'utf-8',
    );
    const handlerKeys = [...routerSrc.matchAll(/'([a-z-]+)':\s*\(\)\s*=>/g)].map(m => m[1]);
    expect(handlerKeys).toHaveLength(2);
    expect(handlerKeys).toContain('user-prompt-submit');
    expect(handlerKeys).toContain('pre-tool-use');
  });
});

describe('HookEventType union', () => {
  // TC-002: HookEventType has exactly 2 members
  it('should contain exactly pre-tool-use and user-prompt-submit', () => {
    // Verify at the type level by checking SAFE_DEFAULTS keys which mirror HookEventType
    // Also parse the source for the union members
    const typesSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../src/core/hooks/handlers/types.ts'),
      'utf-8',
    );
    const unionMatch = typesSrc.match(/export type HookEventType\s*=\s*([\s\S]*?);/);
    expect(unionMatch).toBeTruthy();
    const members = [...unionMatch![1].matchAll(/'([a-z-]+)'/g)].map(m => m[1]);
    expect(members).toHaveLength(2);
    expect(members).toContain('user-prompt-submit');
    expect(members).toContain('pre-tool-use');
  });
});

describe('SAFE_DEFAULTS map', () => {
  // TC-003: SAFE_DEFAULTS has exactly 2 entries
  it('should contain exactly 2 entries matching remaining hook types', () => {
    const keys = Object.keys(SAFE_DEFAULTS);
    expect(keys).toHaveLength(2);
    expect(keys).toContain('user-prompt-submit');
    expect(keys).toContain('pre-tool-use');
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
      // The pre-tool-use handler returns a result with a decision field
      expect(result).toHaveProperty('decision');
    } finally {
      process.chdir(origCwd);
    }
  });
});
