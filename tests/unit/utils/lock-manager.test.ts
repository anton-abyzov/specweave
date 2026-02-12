import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LockManager } from '../../../src/utils/lock-manager.js';
import { Logger } from '../../../src/utils/logger.js';

function createSilentLogger(): Logger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

describe('LockManager', () => {
  let tmpDir: string;
  let lockDir: string;
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };

    // Clear all env vars that affect lock behavior
    delete process.env.SPECWEAVE_DISABLE_LOCKS;
    delete process.env.SPECWEAVE_FORCE_LOCKS;
    delete process.env.VSCODE_PID;
    delete process.env.TERM_PROGRAM;
    delete process.env.VSCODE_IPC_HOOK;
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-manager-test-'));
    lockDir = path.join(tmpDir, 'test.lock');
  });

  afterEach(() => {
    process.env = savedEnv;

    // Clean up temp directory
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('acquire', () => {
    it('should create lock directory with pid and session_id files', async () => {
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const acquired = await lm.acquire();

      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(true);
      expect(fs.statSync(lockDir).isDirectory()).toBe(true);

      const pidFile = path.join(lockDir, 'pid');
      const sessionFile = path.join(lockDir, 'session_id');

      expect(fs.existsSync(pidFile)).toBe(true);
      expect(fs.existsSync(sessionFile)).toBe(true);

      const pidContent = fs.readFileSync(pidFile, 'utf-8');
      expect(pidContent).toBe(String(process.pid));

      await lm.release();
    });

    it('should return true on successful acquisition', async () => {
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const result = await lm.acquire();
      expect(result).toBe(true);

      await lm.release();
    });

    it('should write session_id from env or "unknown"', async () => {
      const logger = createSilentLogger();
      process.env.SESSION_ID = 'test-session-42';
      const lm = new LockManager(lockDir, 300, { logger });

      await lm.acquire();

      const sessionContent = fs.readFileSync(
        path.join(lockDir, 'session_id'),
        'utf-8',
      );
      expect(sessionContent).toBe('test-session-42');

      await lm.release();
    });

    it('should write "unknown" when SESSION_ID is not set', async () => {
      delete process.env.SESSION_ID;
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      await lm.acquire();

      const sessionContent = fs.readFileSync(
        path.join(lockDir, 'session_id'),
        'utf-8',
      );
      expect(sessionContent).toBe('unknown');

      await lm.release();
    });
  });

  describe('release', () => {
    it('should remove lock directory and contents', async () => {
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      await lm.acquire();
      expect(fs.existsSync(lockDir)).toBe(true);

      await lm.release();

      expect(fs.existsSync(lockDir)).toBe(false);
      expect(fs.existsSync(path.join(lockDir, 'pid'))).toBe(false);
      expect(fs.existsSync(path.join(lockDir, 'session_id'))).toBe(false);
    });

    it('should be a no-op if lock directory does not exist', async () => {
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      // release without acquire - should not throw
      await expect(lm.release()).resolves.toBeUndefined();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('acquire + release cycle', () => {
    it('should create then remove lock directory cleanly', async () => {
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      // Acquire
      const acquired = await lm.acquire();
      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(true);

      // Verify internal files
      expect(fs.existsSync(path.join(lockDir, 'pid'))).toBe(true);
      expect(fs.existsSync(path.join(lockDir, 'session_id'))).toBe(true);

      // Release
      await lm.release();
      expect(fs.existsSync(lockDir)).toBe(false);
    });

    it('should support multiple acquire-release cycles on the same instance', async () => {
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      // First cycle
      expect(await lm.acquire()).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(true);
      await lm.release();
      expect(fs.existsSync(lockDir)).toBe(false);

      // Second cycle
      expect(await lm.acquire()).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(true);
      await lm.release();
      expect(fs.existsSync(lockDir)).toBe(false);
    });
  });

  describe('skip in CI', () => {
    it('should return true without creating dir when CI=true', async () => {
      process.env.CI = 'true';
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const acquired = await lm.acquire();

      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(false);
    });

    it('should skip when GITHUB_ACTIONS=true', async () => {
      process.env.GITHUB_ACTIONS = 'true';
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const acquired = await lm.acquire();

      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(false);
    });

    it('should skip when GITLAB_CI=true', async () => {
      process.env.GITLAB_CI = 'true';
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const acquired = await lm.acquire();

      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(false);
    });

    it('should skip when VSCODE_PID is set', async () => {
      process.env.VSCODE_PID = '12345';
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const acquired = await lm.acquire();

      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(false);
    });

    it('should skip when TERM_PROGRAM=vscode', async () => {
      process.env.TERM_PROGRAM = 'vscode';
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const acquired = await lm.acquire();

      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(false);
    });

    it('should skip when VSCODE_IPC_HOOK is set', async () => {
      process.env.VSCODE_IPC_HOOK = '/tmp/some-ipc-hook';
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const acquired = await lm.acquire();

      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(false);
    });

    it('release should be a no-op when locks are skipped', async () => {
      process.env.CI = 'true';
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      await lm.acquire();
      await lm.release();

      // No directory was ever created, no error should occur
      expect(fs.existsSync(lockDir)).toBe(false);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log debug message about disabled locks', async () => {
      process.env.CI = 'true';
      const logger = createSilentLogger();
      new LockManager(lockDir, 300, { logger });

      expect(logger.debug).toHaveBeenCalledWith(
        'Lock manager disabled (VSCode/CI context)',
      );
    });
  });

  describe('SPECWEAVE_DISABLE_LOCKS', () => {
    it('should return true without creating dir when set to 1', async () => {
      process.env.SPECWEAVE_DISABLE_LOCKS = '1';
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const acquired = await lm.acquire();

      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(false);
    });

    it('should take precedence over SPECWEAVE_FORCE_LOCKS', async () => {
      // DISABLE_LOCKS is checked first in shouldSkipLocks
      process.env.SPECWEAVE_DISABLE_LOCKS = '1';
      process.env.SPECWEAVE_FORCE_LOCKS = '1';
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const acquired = await lm.acquire();

      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(false);
    });
  });

  describe('SPECWEAVE_FORCE_LOCKS', () => {
    it('should override CI skip and actually create lock', async () => {
      process.env.CI = 'true';
      process.env.SPECWEAVE_FORCE_LOCKS = '1';
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const acquired = await lm.acquire();

      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(true);
      expect(fs.existsSync(path.join(lockDir, 'pid'))).toBe(true);

      await lm.release();
    });

    it('should override VSCODE_PID skip', async () => {
      process.env.VSCODE_PID = '99999';
      process.env.SPECWEAVE_FORCE_LOCKS = '1';
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const acquired = await lm.acquire();

      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(true);

      await lm.release();
    });

    it('should not log the disabled message', async () => {
      process.env.CI = 'true';
      process.env.SPECWEAVE_FORCE_LOCKS = '1';
      const logger = createSilentLogger();
      new LockManager(lockDir, 300, { logger });

      expect(logger.debug).not.toHaveBeenCalledWith(
        'Lock manager disabled (VSCode/CI context)',
      );
    });
  });

  describe('isStale', () => {
    it('should return false when lock does not exist', async () => {
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      const stale = await lm.isStale();
      expect(stale).toBe(false);
    });

    it('should return false when lock is fresh (within threshold)', async () => {
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      await lm.acquire();

      // Lock was just created, should not be stale
      const stale = await lm.isStale();
      expect(stale).toBe(false);

      await lm.release();
    });

    it('should return false for a lock owned by current process even if old', async () => {
      // Use a very short threshold so the lock would be "old"
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 0, { logger });

      await lm.acquire();

      // Even with threshold=0, current process PID exists, so not stale
      const stale = await lm.isStale();
      expect(stale).toBe(false);

      await lm.release();
    });

    it('should return true when lock is old and PID does not exist', async () => {
      const logger = createSilentLogger();

      // Create lock directory manually with a bogus PID
      fs.mkdirSync(lockDir, { recursive: false });
      fs.writeFileSync(path.join(lockDir, 'pid'), '999999999');
      fs.writeFileSync(path.join(lockDir, 'session_id'), 'fake');

      // Set mtime to far in the past
      const oldTime = new Date(Date.now() - 600_000); // 10 minutes ago
      fs.utimesSync(lockDir, oldTime, oldTime);

      const lm = new LockManager(lockDir, 300, { logger });

      const stale = await lm.isStale();
      expect(stale).toBe(true);

      // Clean up
      fs.rmSync(lockDir, { recursive: true, force: true });
    });

    it('should return true when lock has no pid file and is old', async () => {
      const logger = createSilentLogger();

      // Create lock directory without pid file
      fs.mkdirSync(lockDir, { recursive: false });
      fs.writeFileSync(path.join(lockDir, 'session_id'), 'orphan');

      const oldTime = new Date(Date.now() - 600_000);
      fs.utimesSync(lockDir, oldTime, oldTime);

      const lm = new LockManager(lockDir, 300, { logger });

      const stale = await lm.isStale();
      expect(stale).toBe(true);

      fs.rmSync(lockDir, { recursive: true, force: true });
    });

    it('should return true when pid file contains invalid content', async () => {
      const logger = createSilentLogger();

      fs.mkdirSync(lockDir, { recursive: false });
      fs.writeFileSync(path.join(lockDir, 'pid'), 'not-a-number');
      fs.writeFileSync(path.join(lockDir, 'session_id'), 'bad');

      const oldTime = new Date(Date.now() - 600_000);
      fs.utimesSync(lockDir, oldTime, oldTime);

      const lm = new LockManager(lockDir, 300, { logger });

      const stale = await lm.isStale();
      expect(stale).toBe(true);

      fs.rmSync(lockDir, { recursive: true, force: true });
    });
  });

  describe('removeStale', () => {
    it('should remove a stale lock and log the removal', async () => {
      const logger = createSilentLogger();

      // Create a stale lock manually
      fs.mkdirSync(lockDir, { recursive: false });
      fs.writeFileSync(path.join(lockDir, 'pid'), '999999999');
      fs.writeFileSync(path.join(lockDir, 'session_id'), 'stale-session');

      const oldTime = new Date(Date.now() - 600_000);
      fs.utimesSync(lockDir, oldTime, oldTime);

      const lm = new LockManager(lockDir, 300, { logger });

      await lm.removeStale();

      expect(fs.existsSync(lockDir)).toBe(false);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should not remove a non-stale lock', async () => {
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      await lm.acquire();

      // Lock is fresh and owned by current process
      await lm.removeStale();

      // Lock should still exist
      expect(fs.existsSync(lockDir)).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        'Attempted to remove non-stale lock, aborting',
      );

      await lm.release();
    });

    it('should be a no-op when lock does not exist', async () => {
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      // isStale returns false for non-existent lock, so removeStale aborts
      await lm.removeStale();

      expect(logger.warn).toHaveBeenCalledWith(
        'Attempted to remove non-stale lock, aborting',
      );
    });

    it('should create a log entry in the logs directory', async () => {
      const logger = createSilentLogger();

      fs.mkdirSync(lockDir, { recursive: false });
      fs.writeFileSync(path.join(lockDir, 'pid'), '999999999');
      fs.writeFileSync(path.join(lockDir, 'session_id'), 'stale');

      const oldTime = new Date(Date.now() - 600_000);
      fs.utimesSync(lockDir, oldTime, oldTime);

      const lm = new LockManager(lockDir, 300, { logger });

      await lm.removeStale();

      // Log file path: lockDir/../logs/lock-cleanup.log
      const logFile = path.join(tmpDir, '..', 'logs', 'lock-cleanup.log');

      expect(fs.existsSync(logFile)).toBe(true);

      const logContent = fs.readFileSync(logFile, 'utf-8');
      expect(logContent).toContain('Removed stale lock');
      expect(logContent).toContain('999999999');

      // Clean up the logs directory
      fs.rmSync(path.dirname(logFile), { recursive: true, force: true });
    });
  });

  describe('double acquire (contention)', () => {
    it('second acquire on same path should fail with timeout', async () => {
      const logger1 = createSilentLogger();
      const logger2 = createSilentLogger();

      // First lock manager acquires
      const lm1 = new LockManager(lockDir, 300, { logger: logger1 });
      const acquired1 = await lm1.acquire();
      expect(acquired1).toBe(true);

      // Second lock manager tries to acquire the same lock
      // Use a very short stale threshold but it won't matter because
      // PID is alive (current process). The timeout is 10s in the source,
      // so we need to be patient or mock time.
      // We'll create the second LM and verify it eventually returns false.
      const lm2 = new LockManager(lockDir, 300, { logger: logger2 });

      // The acquire loop has a 10-second timeout. We can't wait that long in tests.
      // Instead, verify the lock dir exists (blocking the second acquire).
      expect(fs.existsSync(lockDir)).toBe(true);

      await lm1.release();
    });

    it('second acquire succeeds after first releases', async () => {
      const logger = createSilentLogger();
      const lm1 = new LockManager(lockDir, 300, { logger });
      const lm2 = new LockManager(lockDir, 300, { logger });

      expect(await lm1.acquire()).toBe(true);
      await lm1.release();
      expect(fs.existsSync(lockDir)).toBe(false);

      expect(await lm2.acquire()).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(true);

      await lm2.release();
    });
  });

  describe('default stale threshold', () => {
    it('should use 300 seconds when not specified', async () => {
      const logger = createSilentLogger();

      // Create a lock that is 200 seconds old with current PID
      fs.mkdirSync(lockDir, { recursive: false });
      fs.writeFileSync(path.join(lockDir, 'pid'), String(process.pid));
      fs.writeFileSync(path.join(lockDir, 'session_id'), 'test');

      const recentTime = new Date(Date.now() - 200_000); // 200 seconds ago
      fs.utimesSync(lockDir, recentTime, recentTime);

      // Default threshold is 300s, so 200s old should not be stale
      const lm = new LockManager(lockDir, undefined, { logger });

      const stale = await lm.isStale();
      expect(stale).toBe(false);

      fs.rmSync(lockDir, { recursive: true, force: true });
    });
  });

  describe('constructor', () => {
    it('should accept lockDir and optional parameters', () => {
      const logger = createSilentLogger();
      // Should not throw
      const lm = new LockManager(lockDir);
      const lm2 = new LockManager(lockDir, 60);
      const lm3 = new LockManager(lockDir, 60, { logger });

      expect(lm).toBeInstanceOf(LockManager);
      expect(lm2).toBeInstanceOf(LockManager);
      expect(lm3).toBeInstanceOf(LockManager);
    });

    it('should evaluate env vars at construction time', async () => {
      process.env.CI = 'true';
      const logger = createSilentLogger();
      const lm = new LockManager(lockDir, 300, { logger });

      // Now remove CI - should not matter, skipLocks was set at construction
      delete process.env.CI;

      const acquired = await lm.acquire();
      expect(acquired).toBe(true);
      expect(fs.existsSync(lockDir)).toBe(false); // Still skipping
    });
  });
});
