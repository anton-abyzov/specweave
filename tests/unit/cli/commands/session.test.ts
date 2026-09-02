import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { sessionStartCommand, sessionEndCommand } from '../../../../src/cli/commands/session.js';

describe('cli/commands/session', () => {
  let tmpDir: string;
  let projectRoot: string;
  let stateDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-session-cmd-'));
    projectRoot = tmpDir;
    stateDir = path.join(projectRoot, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    // Create config.json so project root resolves
    fs.writeFileSync(
      path.join(projectRoot, '.specweave', 'config.json'),
      JSON.stringify({ version: '1.0' }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('session start', () => {
    // TC-001: stale auto-mode files cleaned
    it('should clean stale auto-mode files', async () => {
      const autoFile = path.join(stateDir, 'auto-mode.json');
      fs.writeFileSync(autoFile, '{}');
      const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
      fs.utimesSync(autoFile, staleTime, staleTime);

      const result = await sessionStartCommand({ projectRoot, silent: true });
      expect(result.success).toBe(true);
      expect(result.action).toBe('start');
      expect(result.details.staleFilesCleaned).toBeGreaterThan(0);
      expect(fs.existsSync(autoFile)).toBe(false);
    });

    // TC-002: pressure files reset
    it('should reset context-pressure.json', async () => {
      fs.writeFileSync(path.join(stateDir, 'context-pressure.json'), '{}');
      const result = await sessionStartCommand({ projectRoot, silent: true });
      expect(result.success).toBe(true);
      expect(result.details.pressureReset).toBe(true);
      expect(fs.existsSync(path.join(stateDir, 'context-pressure.json'))).toBe(false);
    });

    // TC-003: prompt-health.json written
    it('should write prompt-health.json', async () => {
      const result = await sessionStartCommand({ projectRoot, silent: true });
      expect(result.success).toBe(true);
      expect(result.details.healthWritten).toBe(true);
      const healthPath = path.join(stateDir, 'prompt-health.json');
      expect(fs.existsSync(healthPath)).toBe(true);
      const health = JSON.parse(fs.readFileSync(healthPath, 'utf8'));
      expect(health.warningLevel).toBeDefined();
    });

    // TC-004: session directory created
    it('should create session directory with --session-id', async () => {
      const result = await sessionStartCommand({
        projectRoot,
        sessionId: 'test-session-42',
        silent: true,
      });
      expect(result.success).toBe(true);
      expect(result.details.sessionDirCreated).toBe(true);
      const sessionDir = path.join(stateDir, 'sessions', 'test-session-42');
      expect(fs.existsSync(sessionDir)).toBe(true);
    });

    // TC-005: orphaned files cleaned
    it('should clean orphaned state files', async () => {
      const lockPath = path.join(stateDir, '.lock');
      fs.writeFileSync(lockPath, '');
      const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
      fs.utimesSync(lockPath, staleTime, staleTime);

      const result = await sessionStartCommand({ projectRoot, silent: true });
      expect(result.success).toBe(true);
      expect(result.details.orphansCleaned).toBe(true);
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    // TC-006: JSON output
    it('should output valid JSON with --json flag', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const result = await sessionStartCommand({ projectRoot, json: true });
        expect(result.success).toBe(true);
        expect(consoleSpy).toHaveBeenCalled();
        const output = consoleSpy.mock.calls[0][0];
        const parsed = JSON.parse(output);
        expect(parsed.action).toBe('start');
        expect(parsed.success).toBe(true);
      } finally {
        consoleSpy.mockRestore();
      }
    });

    // TC-007: missing .specweave
    it('should return failure when .specweave does not exist', async () => {
      const result = await sessionStartCommand({
        projectRoot: path.join(tmpDir, 'nonexistent'),
        silent: true,
      });
      expect(result.success).toBe(false);
      expect(result.details.error).toContain('Not a SpecWeave project');
    });
  });

  describe('session end', () => {
    // TC-001: reflect check runs
    it('should check reflect config', async () => {
      const result = await sessionEndCommand({ projectRoot, silent: true });
      expect(result.success).toBe(true);
      expect(result.action).toBe('end');
      expect(result.details.reflect).toBeDefined();
      const reflect = result.details.reflect as { enabled: boolean };
      expect(typeof reflect.enabled).toBe('boolean');
    });

    // TC-002: auto-mode scan runs with pending tasks
    it('should scan auto-mode session', async () => {
      fs.writeFileSync(
        path.join(stateDir, 'auto-mode.json'),
        JSON.stringify({ active: true }),
      );
      const incDir = path.join(projectRoot, '.specweave', 'increments', '0001-test');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({ status: 'active' }));
      fs.writeFileSync(path.join(incDir, 'tasks.md'), '- [ ] T1\n- [ ] T2\n- [x] T3\n');

      const result = await sessionEndCommand({ projectRoot, silent: true });
      expect(result.success).toBe(true);
      const auto = result.details.auto as { active: boolean; pendingTasks: { pending: number } };
      expect(auto.active).toBe(true);
      expect(auto.pendingTasks.pending).toBe(2);
    });

    // TC-004: exits 0 on success
    it('should return success:true when all operations complete', async () => {
      const result = await sessionEndCommand({ projectRoot, silent: true });
      expect(result.success).toBe(true);
    });

    // TC-005: reflect error doesn't abort other operations
    it('should continue when reflect config is corrupt', async () => {
      fs.writeFileSync(path.join(projectRoot, '.specweave', 'config.json'), 'not json');

      const result = await sessionEndCommand({ projectRoot, silent: true });
      expect(result.success).toBe(true);
      // reflect should still have a result (default enabled on error)
      expect(result.details.reflect).toBeDefined();
      // auto scan should still run
      expect(result.details.auto).toBeDefined();
    });

    it('should return failure for non-specweave project', async () => {
      const result = await sessionEndCommand({
        projectRoot: path.join(tmpDir, 'nonexistent'),
        silent: true,
      });
      expect(result.success).toBe(false);
    });
  });
});
