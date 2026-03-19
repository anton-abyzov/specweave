/**
 * Unit tests for session-start.ts — per-session state isolation
 *
 * Tests the v0.608 session state setup path in the session-start hook.
 * Uses vi.resetModules() + dynamic import since session-start.ts auto-executes main().
 *
 * session-start.ts calls consumeStdin() from platform.js and parses JSON inline,
 * then uses static imports of session-state-manager functions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as realFs from 'fs';
import * as path from 'path';
import * as os from 'os';

// -------------------------------------------------------------------
// Hoisted mocks
// -------------------------------------------------------------------

const {
  mockFindProjectRoot,
  mockSpawnNodeBackground,
  mockOutputHookResult,
  mockConsumeStdin,
  mockAppendLog,
  mockExistsSync,
  mockCreateSessionDir,
  mockBridgeSessionId,
  mockGcDeadSessions,
  mockCleanOrphanedStateFiles,
  mockCleanupStalePlugins,
} = vi.hoisted(() => ({
  mockFindProjectRoot: vi.fn().mockReturnValue(null),
  mockSpawnNodeBackground: vi.fn().mockReturnValue(null),
  mockOutputHookResult: vi.fn(),
  mockConsumeStdin: vi.fn().mockResolvedValue(''),
  mockAppendLog: vi.fn(),
  mockExistsSync: vi.fn().mockReturnValue(false),
  mockCreateSessionDir: vi.fn().mockReturnValue('/tmp/session-dir'),
  mockBridgeSessionId: vi.fn(),
  mockGcDeadSessions: vi.fn().mockReturnValue(0),
  mockCleanOrphanedStateFiles: vi.fn().mockReturnValue(0),
  mockCleanupStalePlugins: vi.fn().mockResolvedValue({ removedCount: 0, removedPlugins: [] }),
}));

vi.mock('../../../src/hooks/platform.js', () => ({
  findProjectRoot: mockFindProjectRoot,
  spawnNodeBackground: mockSpawnNodeBackground,
  outputHookResult: mockOutputHookResult,
  consumeStdin: mockConsumeStdin,
  appendLog: mockAppendLog,
}));

vi.mock('../../../src/core/session/session-state-manager.js', () => ({
  createSessionDir: mockCreateSessionDir,
  bridgeSessionId: mockBridgeSessionId,
  gcDeadSessions: mockGcDeadSessions,
}));

vi.mock('../../../src/utils/state-cleanup.js', () => ({
  cleanOrphanedStateFiles: mockCleanOrphanedStateFiles,
}));

vi.mock('../../../src/utils/cleanup-stale-plugins.js', () => ({
  cleanupStalePlugins: mockCleanupStalePlugins,
}));

// Mock fs to control existsSync
vi.mock('fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('fs')>();
  return {
    ...original,
    existsSync: (...args: Parameters<typeof original.existsSync>) => mockExistsSync(...args),
  };
});

describe('hooks/session-start — session state', () => {
  let tmpDir: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = realFs.mkdtempSync(path.join(os.tmpdir(), 'ss-session-test-'));
    vi.clearAllMocks();
    process.env.SPECWEAVE_DISABLE_HOOKS = '1';
    mockFindProjectRoot.mockReturnValue(null);
    mockExistsSync.mockReturnValue(false);
    mockConsumeStdin.mockResolvedValue('');
  });

  afterEach(() => {
    realFs.rmSync(tmpDir, { recursive: true, force: true });
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  // -------------------------------------------------------------------
  // Session state setup with session_id and env_file
  // -------------------------------------------------------------------

  describe('session state setup', () => {
    it('should call createSessionDir and bridgeSessionId when hook input has session_id and env_file', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockConsumeStdin.mockResolvedValue(
        JSON.stringify({ session_id: 'test-session-123', env_file: '/tmp/env.sh' }),
      );
      mockExistsSync.mockReturnValue(false);

      await import('../../../src/hooks/session-start.js');

      expect(mockCreateSessionDir).toHaveBeenCalledWith('test-session-123', tmpDir);
      expect(mockBridgeSessionId).toHaveBeenCalledWith('test-session-123', '/tmp/env.sh');
      expect(mockGcDeadSessions).toHaveBeenCalledWith(tmpDir);
    });

    it('should call createSessionDir but not bridgeSessionId when no env_file', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockConsumeStdin.mockResolvedValue(JSON.stringify({ session_id: 'test-session-456' }));
      mockExistsSync.mockReturnValue(false);

      await import('../../../src/hooks/session-start.js');

      expect(mockCreateSessionDir).toHaveBeenCalledWith('test-session-456', tmpDir);
      expect(mockBridgeSessionId).not.toHaveBeenCalled();
      expect(mockGcDeadSessions).toHaveBeenCalledWith(tmpDir);
    });

    it('should skip session setup when stdin is empty', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockConsumeStdin.mockResolvedValue('');
      mockExistsSync.mockReturnValue(false);

      await import('../../../src/hooks/session-start.js');

      expect(mockCreateSessionDir).not.toHaveBeenCalled();
      expect(mockBridgeSessionId).not.toHaveBeenCalled();
      expect(mockGcDeadSessions).not.toHaveBeenCalled();
    });

    it('should skip session setup when stdin is invalid JSON', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockConsumeStdin.mockResolvedValue('not-json{{{');
      mockExistsSync.mockReturnValue(false);

      await import('../../../src/hooks/session-start.js');

      expect(mockCreateSessionDir).not.toHaveBeenCalled();
      expect(mockBridgeSessionId).not.toHaveBeenCalled();
    });

    it('should skip session setup when stdin JSON has no session_id', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockConsumeStdin.mockResolvedValue(JSON.stringify({ other: 'data' }));
      mockExistsSync.mockReturnValue(false);

      await import('../../../src/hooks/session-start.js');

      expect(mockCreateSessionDir).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // GC logging
  // -------------------------------------------------------------------

  describe('GC logging', () => {
    it('should log when GC removes dead sessions', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockConsumeStdin.mockResolvedValue(JSON.stringify({ session_id: 'gc-test' }));
      mockGcDeadSessions.mockReturnValue(3);
      mockExistsSync.mockReturnValue(false);

      await import('../../../src/hooks/session-start.js');

      expect(mockAppendLog).toHaveBeenCalledWith(
        expect.stringContaining('session-start.log'),
        'GC: removed 3 dead session(s)',
      );
    });

    it('should not log when GC removes 0 sessions', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockConsumeStdin.mockResolvedValue(JSON.stringify({ session_id: 'gc-test-0' }));
      mockGcDeadSessions.mockReturnValue(0);
      mockExistsSync.mockReturnValue(false);

      await import('../../../src/hooks/session-start.js');

      const gcCalls = mockAppendLog.mock.calls.filter(
        (call: any[]) => typeof call[1] === 'string' && call[1].includes('GC:'),
      );
      expect(gcCalls).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------

  describe('error handling', () => {
    it('should log and continue when session state setup throws', async () => {
      delete process.env.SPECWEAVE_DISABLE_HOOKS;
      mockFindProjectRoot.mockReturnValue(tmpDir);
      mockConsumeStdin.mockResolvedValue(JSON.stringify({ session_id: 'err-test' }));
      mockCreateSessionDir.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      mockExistsSync.mockReturnValue(false);

      await import('../../../src/hooks/session-start.js');

      expect(mockAppendLog).toHaveBeenCalledWith(
        expect.stringContaining('session-start.log'),
        expect.stringContaining('Session state setup failed'),
      );
      // Should still output hook result (not crash)
      expect(mockOutputHookResult).toHaveBeenCalledWith({ continue: true });
    });
  });
});
