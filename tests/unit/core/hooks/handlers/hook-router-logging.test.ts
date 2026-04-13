import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

describe('hook-router structured logging', () => {
  let testDir: string;
  let logsDir: string;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    delete process.env.SPECWEAVE_DISABLE_HOOKS;

    testDir = fs.mkdtempSync(path.join(tmpdir(), 'sw-hook-test-'));
    logsDir = path.join(testDir, 'logs');
    fs.mkdirSync(path.join(testDir, 'state'), { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  function setupMocks(handlerResult: unknown, handlerError?: Error) {
    vi.doMock('../../../../../src/core/hooks/handlers/utils.js', () => ({
      findProjectRoot: vi.fn().mockReturnValue(testDir),
      createContext: vi.fn().mockReturnValue({
        projectRoot: testDir,
        stateDir: path.join(testDir, 'state'),
        logsDir,
        configPath: path.join(testDir, 'config.json'),
        timestamp: '2026-04-06T00:00:00.000Z',
      }),
      parseStdinJson: vi.fn().mockReturnValue({ tool_name: 'Edit' }),
      logHook: vi.fn(),
    }));

    if (handlerError) {
      vi.doMock('../../../../../src/core/hooks/handlers/pre-tool-use.js', () => ({
        handle: vi.fn().mockRejectedValue(handlerError),
      }));
    } else {
      vi.doMock('../../../../../src/core/hooks/handlers/pre-tool-use.js', () => ({
        handle: vi.fn().mockResolvedValue(handlerResult),
      }));
    }
  }

  function readLogEntries(hookName: string): Record<string, unknown>[] {
    const logFile = path.join(logsDir, 'hooks', `${hookName}.log`);
    if (!fs.existsSync(logFile)) return [];
    return fs.readFileSync(logFile, 'utf-8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  it('logs structured entry via HookLogger on successful handler execution', async () => {
    setupMocks({ decision: 'allow' });

    const { hookRouter } = await import(
      '../../../../../src/core/hooks/handlers/hook-router.js'
    );

    await hookRouter('pre-tool-use', '{}');

    const entries = readLogEntries('pre-tool-use');
    expect(entries.length).toBe(1);
    expect(entries[0].hookName).toBe('pre-tool-use');
    expect(entries[0].status).toBe('success');
    expect(typeof entries[0].duration).toBe('number');
  });

  it('logs block decisions with warning status', async () => {
    setupMocks({ decision: 'block', reason: 'Increment Required.' });

    const { hookRouter } = await import(
      '../../../../../src/core/hooks/handlers/hook-router.js'
    );

    await hookRouter('pre-tool-use', '{}');

    const entries = readLogEntries('pre-tool-use');
    expect(entries.length).toBe(1);
    expect(entries[0].status).toBe('warning');
    expect(entries[0].error).toContain('Increment Required.');
  });

  it('logs errors with error status when handler throws', async () => {
    setupMocks(null, new Error('Handler crashed'));

    const { hookRouter } = await import(
      '../../../../../src/core/hooks/handlers/hook-router.js'
    );

    await hookRouter('pre-tool-use', '{}');

    const entries = readLogEntries('pre-tool-use');
    expect(entries.length).toBe(1);
    expect(entries[0].status).toBe('error');
    expect(entries[0].error).toContain('Handler crashed');
  });

  it('includes duration in all log entries', async () => {
    setupMocks({ decision: 'allow' });

    const { hookRouter } = await import(
      '../../../../../src/core/hooks/handlers/hook-router.js'
    );

    await hookRouter('pre-tool-use', '{}');

    const entries = readLogEntries('pre-tool-use');
    expect(entries[0].duration).toBeGreaterThanOrEqual(0);
  });
});
