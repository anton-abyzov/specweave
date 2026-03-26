/**
 * stop-reflect hook handler tests
 *
 * Tests: config check for reflect.enabled, always approve, logging.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { HookInput, HookContext } from '../../../../../src/core/hooks/handlers/types.js';

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

vi.mock('fs', () => mockFs);

import { handle } from '../../../../../src/core/hooks/handlers/stop-reflect.js';

function makeContext(overrides?: Partial<HookContext>): HookContext {
  return {
    projectRoot: '/fake/project',
    stateDir: '/fake/project/.specweave/state',
    logsDir: '/fake/project/.specweave/logs',
    configPath: '/fake/project/.specweave/config.json',
    timestamp: '2026-03-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('stop-reflect handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
  });

  it('should always return approve decision', async () => {
    const result = await handle({}, makeContext());
    expect(result.decision).toBe('approve');
  });

  it('should approve when reflect is disabled in config', async () => {
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ reflect: { enabled: false } })
    );

    const result = await handle({}, makeContext());
    expect(result.decision).toBe('approve');
  });

  it('should approve when reflect is enabled in config', async () => {
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ reflect: { enabled: true } })
    );

    const result = await handle({}, makeContext());
    expect(result.decision).toBe('approve');
  });

  it('should approve when config file does not exist', async () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });

    const result = await handle({}, makeContext());
    expect(result.decision).toBe('approve');
  });

  it('should approve when config is malformed JSON', async () => {
    mockFs.readFileSync.mockReturnValue('not valid json {{{');

    const result = await handle({}, makeContext());
    expect(result.decision).toBe('approve');
  });

  it('should log when reflection is requested and enabled', async () => {
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ reflect: { enabled: true } })
    );

    await handle({ transcript: 'some transcript' }, makeContext());
    expect(mockFs.appendFileSync).toHaveBeenCalled();
  });

  it('should never throw', async () => {
    mockFs.existsSync.mockImplementation(() => { throw new Error('boom'); });

    const result = await handle({}, makeContext());
    expect(result.decision).toBe('approve');
  });
});
