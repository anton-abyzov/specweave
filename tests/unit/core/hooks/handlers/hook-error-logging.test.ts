/**
 * Hook error logging tests (T-012)
 *
 * TC-001: pre-tool-use readJsonSafe catches and logs on corrupt JSON
 * TC-002: hook-router catches dynamic import failure and logs
 * TC-003: Normal execution produces no extra error log lines
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import type { HookContext, HookInput } from '../../../../../src/core/hooks/handlers/types.js';

describe('hook error logging', () => {
  let tempDir: string;
  let logsDir: string;
  let context: HookContext;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'sw-error-log-'));
    logsDir = path.join(tempDir, '.specweave', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.specweave', 'config.json'),
      JSON.stringify({ version: '1.0.0' }),
    );

    context = {
      projectRoot: tempDir,
      stateDir: path.join(tempDir, '.specweave', 'state'),
      logsDir,
      configPath: path.join(tempDir, '.specweave', 'config.json'),
      timestamp: new Date().toISOString(),
    };
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function readLogFile(): string {
    const logPath = path.join(logsDir, 'hooks.log');
    if (!fs.existsSync(logPath)) return '';
    return fs.readFileSync(logPath, 'utf-8');
  }

  // TC-001: pre-tool-use readJsonSafe catches and logs on corrupt JSON
  describe('pre-tool-use readJsonSafe error logging', () => {
    it('logs error when reading corrupt JSON file', async () => {
      // Write corrupt JSON to a file that readJsonSafe will try to parse
      const corruptPath = path.join(tempDir, '.specweave', 'state', 'auto', 'session.json');
      fs.mkdirSync(path.dirname(corruptPath), { recursive: true });
      fs.writeFileSync(corruptPath, '{{{CORRUPT_JSON');

      const { handle } = await import(
        '../../../../../src/core/hooks/handlers/pre-tool-use.js'
      );

      // Trigger the status completion guard path which reads auto session.json
      const input: HookInput = {
        tool_name: 'Edit',
        tool_input: {
          file_path: `${tempDir}/.specweave/increments/0001-test/metadata.json`,
          old_string: '"status": "active"',
          new_string: '"status": "completed"',
        },
      };

      // Write the sw-done marker so status guard path reads auto session
      // Actually, don't write it — let it go through the auto session check
      await handle(input, context);

      const logs = readLogFile();
      expect(logs).toContain('readJsonSafe error');
    });
  });

  // TC-002: hook-router catches dynamic import failure and logs
  describe('hook-router error logging', () => {
    it('logs error when handler throws and returns safe default', async () => {
      // We need to test that hookRouter logs errors. Since we can't easily
      // make a real handler fail without mocking, we test via the outer catch.
      // Using a fresh import with mocked utils that has a real project root
      vi.resetModules();

      const mockUtils = {
        findProjectRoot: vi.fn().mockReturnValue(tempDir),
        createContext: vi.fn().mockReturnValue(context),
        parseStdinJson: vi.fn().mockImplementation(() => {
          throw new Error('simulated parse explosion');
        }),
        logHook: vi.fn(),
      };

      vi.doMock('../../../../../src/core/hooks/handlers/utils.js', () => mockUtils);

      const { hookRouter } = await import(
        '../../../../../src/core/hooks/handlers/hook-router.js'
      );

      const result = await hookRouter('pre-tool-use', '{}');

      // Should return the schema-valid safe default and fail OPEN.
      // PreToolUse rejects decision='allow'; the safe pass-through is
      // { continue: true } (no decision field) — migrated in 112a102c2.
      expect(result).toHaveProperty('continue', true);
      expect(result.decision).toBeUndefined();
      // Should have logged the error
      expect(mockUtils.logHook).toHaveBeenCalledWith(
        context,
        'router',
        expect.stringContaining('simulated parse explosion'),
      );

      vi.doUnmock('../../../../../src/core/hooks/handlers/utils.js');
    });
  });

  // TC-003: Normal execution produces no extra error log lines
  describe('normal execution — no error logs', () => {
    it('pre-tool-use produces no error logs on clean allow', async () => {
      const { handle } = await import(
        '../../../../../src/core/hooks/handlers/pre-tool-use.js'
      );

      const input: HookInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/project/src/index.ts' },
      };

      await handle(input, context);

      const logs = readLogFile();
      expect(logs).not.toContain('error');
    });

    it('user-prompt-submit produces no error logs on clean approve', async () => {
      const { handle } = await import(
        '../../../../../src/core/hooks/handlers/user-prompt-submit.js'
      );

      await handle({ prompt: 'hello world' }, context);

      const logs = readLogFile();
      expect(logs).not.toContain('error');
    });
  });
});
