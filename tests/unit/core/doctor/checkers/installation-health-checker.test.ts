/**
 * Tests for InstallationHealthChecker
 * Covers: ghost commands, stale cache, lockfile integrity, namespace pollution
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockExecSync = vi.hoisted(() => vi.fn());
vi.mock('child_process', () => ({ execSync: mockExecSync }));
import { InstallationHealthChecker } from '../../../../../src/core/doctor/checkers/installation-health-checker.js';

describe('InstallationHealthChecker', () => {
  let tmpDir: string;
  let commandsDir: string;
  let cacheDir: string;
  let projectRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-install-checker-'));
    commandsDir = path.join(tmpDir, 'commands');
    cacheDir = path.join(tmpDir, 'plugins', 'cache');
    projectRoot = path.join(tmpDir, 'project');
    fs.mkdirSync(commandsDir, { recursive: true });
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.mkdirSync(projectRoot, { recursive: true });
    mockExecSync.mockReset();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // =========================================================================
  // Ghost Slash Command Detection (US-001)
  // =========================================================================
  describe('checkGhostCommands', () => {
    it('TC-001: should pass when no ghost commands exist', async () => {
      // Only valid SKILL.md files
      fs.mkdirSync(path.join(commandsDir, 'sw', 'grill'), { recursive: true });
      fs.writeFileSync(path.join(commandsDir, 'sw', 'grill', 'SKILL.md'), '# Grill');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const ghostCheck = result.checks.find(c => c.name === 'Ghost slash commands');

      expect(ghostCheck).toBeDefined();
      expect(ghostCheck!.status).toBe('pass');
    });

    it('TC-002: should warn when PLUGIN.md exists at plugin root', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw'), { recursive: true });
      fs.writeFileSync(path.join(commandsDir, 'sw', 'PLUGIN.md'), '# Plugin manifest');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const ghostCheck = result.checks.find(c => c.name === 'Ghost slash commands');

      expect(ghostCheck).toBeDefined();
      expect(ghostCheck!.status).toBe('warn');
      expect(ghostCheck!.details).toBeDefined();
      expect(ghostCheck!.details!.some(d => d.includes('PLUGIN.md'))).toBe(true);
    });

    it('TC-003: should warn when README.md exists in nested dir', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw', 'knowledge-base'), { recursive: true });
      fs.writeFileSync(
        path.join(commandsDir, 'sw', 'knowledge-base', 'README.md'),
        '# KB docs'
      );

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const ghostCheck = result.checks.find(c => c.name === 'Ghost slash commands');

      expect(ghostCheck).toBeDefined();
      expect(ghostCheck!.status).toBe('warn');
    });

    it('TC-003b: should warn when FRESHNESS.md exists', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw', 'knowledge-base', 'serverless'), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(commandsDir, 'sw', 'knowledge-base', 'serverless', 'FRESHNESS.md'),
        '# Freshness'
      );

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const ghostCheck = result.checks.find(c => c.name === 'Ghost slash commands');

      expect(ghostCheck).toBeDefined();
      expect(ghostCheck!.status).toBe('warn');
    });

    it('TC-004: should delete ghost files in fix mode', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw'), { recursive: true });
      const ghostPath = path.join(commandsDir, 'sw', 'PLUGIN.md');
      fs.writeFileSync(ghostPath, '# Ghost');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      await checker.check(projectRoot, { fix: true });

      expect(fs.existsSync(ghostPath)).toBe(false);
    });

    it('TC-004b: should report deleted files in fix summary', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw'), { recursive: true });
      fs.writeFileSync(path.join(commandsDir, 'sw', 'PLUGIN.md'), '# Ghost');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { fix: true });
      const ghostCheck = result.checks.find(c => c.name === 'Ghost slash commands');

      expect(ghostCheck).toBeDefined();
      expect(ghostCheck!.fixSuggestion).toBeDefined();
      expect(ghostCheck!.fixSuggestion!).toContain('Deleted');
    });

    it('should pass when commands dir does not exist', async () => {
      const nonExistent = path.join(tmpDir, 'nonexistent');
      const checker = new InstallationHealthChecker({ commandsDir: nonExistent, cacheDir });
      const result = await checker.check(projectRoot, {});
      const ghostCheck = result.checks.find(c => c.name === 'Ghost slash commands');

      expect(ghostCheck).toBeDefined();
      expect(ghostCheck!.status).toBe('pass');
    });
  });

  // =========================================================================
  // Stale Cache Directory Detection (US-002)
  // =========================================================================
  describe('checkStaleCacheDirs', () => {
    it('TC-005: should pass when cache dir is clean', async () => {
      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const cacheCheck = result.checks.find(c => c.name === 'Stale cache directories');

      expect(cacheCheck).toBeDefined();
      expect(cacheCheck!.status).toBe('pass');
    });

    it('TC-006: should warn when temp_local dir present', async () => {
      fs.mkdirSync(path.join(cacheDir, 'temp_local_123_abc'), { recursive: true });

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const cacheCheck = result.checks.find(c => c.name === 'Stale cache directories');

      expect(cacheCheck).toBeDefined();
      expect(cacheCheck!.status).toBe('warn');
      expect(cacheCheck!.details!.some(d => d.includes('temp_local'))).toBe(true);
    });

    it('TC-007: should remove temp_local in fix mode', async () => {
      const tempDir2 = path.join(cacheDir, 'temp_local_456_def');
      fs.mkdirSync(tempDir2, { recursive: true });
      fs.writeFileSync(path.join(tempDir2, 'file.txt'), 'data');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      await checker.check(projectRoot, { fix: true });

      expect(fs.existsSync(tempDir2)).toBe(false);
    });

    it('TC-008: should NOT auto-delete unreferenced non-temp cache dirs', async () => {
      fs.mkdirSync(path.join(cacheDir, 'specweave', 'some-plugin'), { recursive: true });

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      await checker.check(projectRoot, { fix: true });

      // Should still exist — unreferenced dirs are only reported, not deleted
      expect(fs.existsSync(path.join(cacheDir, 'specweave', 'some-plugin'))).toBe(true);
    });

    it('should pass when cache dir does not exist', async () => {
      const nonExistent = path.join(tmpDir, 'nonexistent-cache');
      const checker = new InstallationHealthChecker({ commandsDir, cacheDir: nonExistent });
      const result = await checker.check(projectRoot, {});
      const cacheCheck = result.checks.find(c => c.name === 'Stale cache directories');

      expect(cacheCheck).toBeDefined();
      expect(cacheCheck!.status).toBe('pass');
    });
  });

  // =========================================================================
  // Cache-Lockfile Hash Integrity (US-003)
  // =========================================================================
  describe('checkLockfileIntegrity', () => {
    it('TC-009: should pass when lockfile hash matches installed files', async () => {
      // Create a plugin dir with a file
      const pluginDir = path.join(commandsDir, 'sw');
      fs.mkdirSync(path.join(pluginDir, 'do'), { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'do', 'SKILL.md'), '# Do skill');

      // We need to compute the actual hash and write the lockfile
      // For this test, we write a lockfile that deliberately matches
      const { computePluginHash } = await import(
        '../../../../../src/utils/plugin-copier.js'
      );
      const hash = computePluginHash(pluginDir);
      const lockfile = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0',
            sha: hash,
            tier: 'BUNDLED',
            installedAt: new Date().toISOString(),
            source: 'local:specweave',
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(projectRoot, 'vskill.lock'),
        JSON.stringify(lockfile, null, 2)
      );

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const lockCheck = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(lockCheck).toBeDefined();
      expect(lockCheck!.status).toBe('pass');
    });

    it('TC-010: should warn when lockfile hash differs from installed', async () => {
      const pluginDir = path.join(commandsDir, 'sw');
      fs.mkdirSync(path.join(pluginDir, 'do'), { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'do', 'SKILL.md'), '# Do skill');

      const lockfile = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0',
            sha: 'deadbeef1234', // deliberately wrong
            tier: 'BUNDLED',
            installedAt: new Date().toISOString(),
            source: 'local:specweave',
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(projectRoot, 'vskill.lock'),
        JSON.stringify(lockfile, null, 2)
      );

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const lockCheck = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(lockCheck).toBeDefined();
      expect(lockCheck!.status).toBe('warn');
      expect(lockCheck!.message).toContain('mismatch');
    });

    it('TC-011: should fail when skill in lockfile but dir missing', async () => {
      const lockfile = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0',
            sha: 'abc123def456',
            tier: 'BUNDLED',
            installedAt: new Date().toISOString(),
            source: 'local:specweave',
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(projectRoot, 'vskill.lock'),
        JSON.stringify(lockfile, null, 2)
      );

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const lockCheck = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(lockCheck).toBeDefined();
      expect(lockCheck!.status).toBe('fail');
    });

    it('TC-012: should skip when no lockfile exists', async () => {
      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const lockCheck = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(lockCheck).toBeDefined();
      expect(lockCheck!.status).toBe('skip');
    });

    it('should suggest doctor --fix in non-fix mode on mismatch', async () => {
      const pluginDir = path.join(commandsDir, 'sw');
      fs.mkdirSync(path.join(pluginDir, 'do'), { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'do', 'SKILL.md'), '# Do skill');

      const lockfile = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0',
            sha: 'wrong_hash_val',
            tier: 'BUNDLED',
            installedAt: new Date().toISOString(),
            source: 'local:specweave',
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(projectRoot, 'vskill.lock'),
        JSON.stringify(lockfile, null, 2)
      );

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { fix: false });
      const lockCheck = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(lockCheck).toBeDefined();
      expect(lockCheck!.fixSuggestion).toContain('doctor --fix');
    });

    // ─── New: TC-LF-01 to TC-LF-04 (fix mode) ───────────────────────────

    it('TC-LF-01: fix=true with hash mismatches updates lockfile hashes directly', async () => {
      const pluginDir = path.join(commandsDir, 'sw');
      fs.mkdirSync(path.join(pluginDir, 'do'), { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'do', 'SKILL.md'), '# Do skill');

      const lockPath = path.join(projectRoot, 'vskill.lock');
      const lockfile = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0',
            sha: 'wrong_hash_123',
            tier: 'BUNDLED',
            installedAt: new Date().toISOString(),
            source: 'local:specweave',
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(lockPath, JSON.stringify(lockfile, null, 2));

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { fix: true });
      const lockCheck = result.checks.find(c => c.name === 'Lockfile integrity');

      // No execSync needed — fixes lockfile in-place
      expect(mockExecSync).not.toHaveBeenCalled();
      expect(lockCheck?.status).toBe('pass');
      expect(lockCheck?.message).toContain('corrected');

      // Lockfile hash should be updated to actual value
      const updated = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      expect(updated.skills.sw.sha).not.toBe('wrong_hash_123');
    });

    it('TC-LF-02: fix=true with missing skills runs refresh-plugins and returns warn', async () => {
      // Lockfile references 'sw' but the dir doesn't exist in commandsDir
      const lockfile = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0',
            sha: 'abc123def456',
            tier: 'BUNDLED',
            installedAt: new Date().toISOString(),
            source: 'local:specweave',
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(projectRoot, 'vskill.lock'),
        JSON.stringify(lockfile, null, 2)
      );

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { fix: true });
      const lockCheck = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(mockExecSync).toHaveBeenCalledWith('specweave refresh-plugins', { stdio: 'pipe' });
      expect(lockCheck?.status).toBe('warn');
    });

    it('TC-LF-03: fix=true but refresh-plugins throws for missing skills returns fail status', async () => {
      // Lockfile references 'sw' but dir doesn't exist → missing, not mismatch
      const lockfile = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0',
            sha: 'abc123def456',
            tier: 'BUNDLED',
            installedAt: new Date().toISOString(),
            source: 'local:specweave',
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(projectRoot, 'vskill.lock'),
        JSON.stringify(lockfile, null, 2)
      );

      mockExecSync.mockImplementationOnce(() => {
        throw new Error('command not found: specweave');
      });

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { fix: true });
      const lockCheck = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(lockCheck?.status).toBe('fail');
      expect(lockCheck?.message).toContain('refresh-plugins failed');
    });

    it('TC-LF-04: fix=false does not call execSync for hash mismatch', async () => {
      const pluginDir = path.join(commandsDir, 'sw');
      fs.mkdirSync(path.join(pluginDir, 'do'), { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'do', 'SKILL.md'), '# Do skill');

      const lockfile = {
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.0',
            sha: 'wrong_hash_no_fix',
            tier: 'BUNDLED',
            installedAt: new Date().toISOString(),
            source: 'local:specweave',
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(projectRoot, 'vskill.lock'),
        JSON.stringify(lockfile, null, 2)
      );

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      await checker.check(projectRoot, { fix: false });

      expect(mockExecSync).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Namespace Pollution Detection (US-004)
  // =========================================================================
  describe('checkNamespacePollution', () => {
    it('TC-013: should pass when no pollution exists', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw', 'do'), { recursive: true });
      fs.writeFileSync(path.join(commandsDir, 'sw', 'do', 'SKILL.md'), '# Do');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const pollCheck = result.checks.find(c => c.name === 'Command namespace pollution');

      expect(pollCheck).toBeDefined();
      expect(pollCheck!.status).toBe('pass');
    });

    it('TC-014: should warn when lib/ contains .md files', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw', 'lib'), { recursive: true });
      fs.writeFileSync(path.join(commandsDir, 'sw', 'lib', 'utils.md'), '# Utils');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const pollCheck = result.checks.find(c => c.name === 'Command namespace pollution');

      expect(pollCheck).toBeDefined();
      expect(pollCheck!.status).toBe('warn');
      expect(pollCheck!.details).toBeDefined();
      expect(pollCheck!.details!.some(d => d.includes('lib/utils.md'))).toBe(true);
    });

    it('TC-014b: should warn when knowledge-base/ contains .md files', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw', 'knowledge-base'), { recursive: true });
      fs.writeFileSync(
        path.join(commandsDir, 'sw', 'knowledge-base', 'guide.md'),
        '# Guide'
      );

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const pollCheck = result.checks.find(c => c.name === 'Command namespace pollution');

      expect(pollCheck).toBeDefined();
      expect(pollCheck!.status).toBe('warn');
    });

    it('TC-015: should delete pollution files in fix mode', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw', 'lib'), { recursive: true });
      const pollutionPath = path.join(commandsDir, 'sw', 'lib', 'utils.md');
      fs.writeFileSync(pollutionPath, '# Utils');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      await checker.check(projectRoot, { fix: true });

      expect(fs.existsSync(pollutionPath)).toBe(false);
    });

    it('should pass when commands dir does not exist', async () => {
      const nonExistent = path.join(tmpDir, 'nonexistent2');
      const checker = new InstallationHealthChecker({ commandsDir: nonExistent, cacheDir });
      const result = await checker.check(projectRoot, {});
      const pollCheck = result.checks.find(c => c.name === 'Command namespace pollution');

      expect(pollCheck).toBeDefined();
      expect(pollCheck!.status).toBe('pass');
    });
  });

  // =========================================================================
  // Full check() method (T-006)
  // =========================================================================
  describe('check() integration', () => {
    it('TC-016: should return all 4 check categories', async () => {
      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});

      expect(result.category).toBe('Installation Health');
      expect(result.checks.length).toBe(4);

      const checkNames = result.checks.map(c => c.name);
      expect(checkNames).toContain('Ghost slash commands');
      expect(checkNames).toContain('Stale cache directories');
      expect(checkNames).toContain('Lockfile integrity');
      expect(checkNames).toContain('Command namespace pollution');
    });

    it('TC-016b: should calculate overall status from worst check', async () => {
      // Create a ghost file to produce a warning
      fs.mkdirSync(path.join(commandsDir, 'sw'), { recursive: true });
      fs.writeFileSync(path.join(commandsDir, 'sw', 'PLUGIN.md'), '# Ghost');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});

      expect(result.status).toBe('warn');
    });
  });
});
