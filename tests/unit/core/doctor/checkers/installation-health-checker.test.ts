/**
 * Tests for InstallationHealthChecker
 * Covers: legacy commands dirs, stale cache, lockfile integrity, plugin cache freshness
 *
 * @updated 1.0.356 - Migrated from ghost commands/namespace pollution to legacy dir detection
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockExecSync = vi.hoisted(() => vi.fn());
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    execSync: mockExecSync,
  };
});
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
  // Legacy Commands Directory Detection
  // =========================================================================
  describe('checkLegacyCommandsDirs', () => {
    it('TC-001: should pass when no legacy commands directory exists', async () => {
      const nonExistent = path.join(tmpDir, 'nonexistent');
      const checker = new InstallationHealthChecker({ commandsDir: nonExistent, cacheDir });
      const result = await checker.check(projectRoot, {});
      const check = result.checks.find(c => c.name === 'Legacy commands directories');

      expect(check).toBeDefined();
      expect(check!.status).toBe('pass');
    });

    it('TC-002: should pass when commands directory is empty', async () => {
      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const check = result.checks.find(c => c.name === 'Legacy commands directories');

      expect(check).toBeDefined();
      expect(check!.status).toBe('pass');
    });

    it('TC-003: should warn when legacy plugin dirs exist', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw'), { recursive: true });
      fs.writeFileSync(path.join(commandsDir, 'sw', 'SKILL.md'), '# Test');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const check = result.checks.find(c => c.name === 'Legacy commands directories');

      expect(check).toBeDefined();
      expect(check!.status).toBe('warn');
      expect(check!.details).toBeDefined();
      expect(check!.details!.some(d => d.includes('sw'))).toBe(true);
    });

    it('TC-004: should remove legacy dirs in fix mode', async () => {
      const legacyDir = path.join(commandsDir, 'sw');
      fs.mkdirSync(path.join(legacyDir, 'do'), { recursive: true });
      fs.writeFileSync(path.join(legacyDir, 'do', 'SKILL.md'), '# Do');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      await checker.check(projectRoot, { fix: true });

      expect(fs.existsSync(legacyDir)).toBe(false);
    });

    it('TC-004b: should report removed dirs in fix summary', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw'), { recursive: true });
      fs.writeFileSync(path.join(commandsDir, 'sw', 'SKILL.md'), '# Test');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { fix: true });
      const check = result.checks.find(c => c.name === 'Legacy commands directories');

      expect(check).toBeDefined();
      expect(check!.message).toContain('removed');
      expect(check!.message).toContain('native plugin cache');
    });
  });

  // =========================================================================
  // Stale Cache Directory Detection
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
  // Cache-Lockfile Hash Integrity
  // =========================================================================
  describe('checkLockfileIntegrity', () => {
    it('TC-009: should pass when lockfile hash matches installed files in cache', async () => {
      // Create a plugin dir in the native cache
      const pluginDir = path.join(cacheDir, 'specweave', 'sw');
      fs.mkdirSync(path.join(pluginDir, 'do'), { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'do', 'SKILL.md'), '# Do skill');

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

    it('TC-009b: should also check legacy commands dir for backward compat', async () => {
      // Create a plugin dir in the legacy commands dir (not cache)
      const pluginDir = path.join(commandsDir, 'sw');
      fs.mkdirSync(path.join(pluginDir, 'do'), { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'do', 'SKILL.md'), '# Do skill');

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
      const pluginDir = path.join(cacheDir, 'specweave', 'sw');
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
      expect(lockCheck!.message).toContain('plugin cache');
    });

    it('TC-012: should skip when no lockfile exists', async () => {
      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const lockCheck = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(lockCheck).toBeDefined();
      expect(lockCheck!.status).toBe('skip');
    });

    it('should suggest doctor --fix in non-fix mode on mismatch', async () => {
      const pluginDir = path.join(cacheDir, 'specweave', 'sw');
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

    it('TC-LF-01: fix=true with hash mismatches updates lockfile hashes directly', async () => {
      const pluginDir = path.join(cacheDir, 'specweave', 'sw');
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

      expect(mockExecSync).not.toHaveBeenCalled();
      expect(lockCheck?.status).toBe('pass');
      expect(lockCheck?.message).toContain('corrected');

      const updated = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      expect(updated.skills.sw.sha).not.toBe('wrong_hash_123');
    });

    it('TC-LF-02: fix=true with missing skills runs refresh-plugins and returns warn', async () => {
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

    it('TC-LF-03: fix=true but refresh-plugins throws returns fail status', async () => {
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
      const pluginDir = path.join(cacheDir, 'specweave', 'sw');
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
  // Full check() method
  // =========================================================================
  describe('check() integration', () => {
    it('TC-016: should return all 4 check categories', async () => {
      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});

      expect(result.category).toBe('Installation Health');
      expect(result.checks.length).toBe(4);

      const checkNames = result.checks.map(c => c.name);
      expect(checkNames).toContain('Legacy commands directories');
      expect(checkNames).toContain('Stale cache directories');
      expect(checkNames).toContain('Lockfile integrity');
      expect(checkNames).toContain('Plugin cache hook freshness');
    });

    it('TC-016b: should calculate overall status from worst check', async () => {
      // Create a legacy dir to produce a warning
      fs.mkdirSync(path.join(commandsDir, 'sw'), { recursive: true });
      fs.writeFileSync(path.join(commandsDir, 'sw', 'SKILL.md'), '# Legacy');

      const checker = new InstallationHealthChecker({ commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});

      expect(result.status).toBe('warn');
    });
  });
});
