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
const mockReadGlobalLockfile = vi.hoisted(() => vi.fn().mockReturnValue(null));
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    execSync: mockExecSync,
  };
});
vi.mock('../../../../../src/utils/plugin-copier.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../src/utils/plugin-copier.js')>();
  return {
    ...actual,
    readGlobalLockfile: mockReadGlobalLockfile,
  };
});
import { InstallationHealthChecker } from '../../../../../src/core/doctor/checkers/installation-health-checker.js';
import { npmRegistryFlag } from '../../../../../src/utils/npm-constants.js';

describe('InstallationHealthChecker', () => {
  let tmpDir: string;
  let commandsDir: string;
  let cacheDir: string;
  let projectRoot: string;
  /**
   * Stand-in for the specweave package root. Empty by default (no
   * marketplace.json), so bundled-plugin resolution falls back to whatever is
   * installed — these tests must never reach the real repo on disk.
   */
  let pkgRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-install-checker-'));
    commandsDir = path.join(tmpDir, 'commands');
    cacheDir = path.join(tmpDir, 'plugins', 'cache');
    projectRoot = path.join(tmpDir, 'project');
    pkgRoot = path.join(tmpDir, 'pkg');
    fs.mkdirSync(pkgRoot, { recursive: true });
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
      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const check = result.checks.find(c => c.name === 'Legacy commands directories');

      expect(check).toBeDefined();
      expect(check!.status).toBe('pass');
    });

    it('TC-003: should warn when legacy plugin dirs exist', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw'), { recursive: true });
      fs.writeFileSync(path.join(commandsDir, 'sw', 'SKILL.md'), '# Test');

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
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

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      await checker.check(projectRoot, { fix: true });

      expect(fs.existsSync(legacyDir)).toBe(false);
    });

    it('TC-004b: should report removed dirs in fix summary', async () => {
      fs.mkdirSync(path.join(commandsDir, 'sw'), { recursive: true });
      fs.writeFileSync(path.join(commandsDir, 'sw', 'SKILL.md'), '# Test');

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
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
      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const cacheCheck = result.checks.find(c => c.name === 'Stale cache directories');

      expect(cacheCheck).toBeDefined();
      expect(cacheCheck!.status).toBe('pass');
    });

    it('TC-006: should warn when temp_local dir present', async () => {
      fs.mkdirSync(path.join(cacheDir, 'temp_local_123_abc'), { recursive: true });

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
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

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      await checker.check(projectRoot, { fix: true });

      expect(fs.existsSync(tempDir2)).toBe(false);
    });

    it('TC-008: should NOT auto-delete unreferenced non-temp cache dirs', async () => {
      fs.mkdirSync(path.join(cacheDir, 'specweave', 'some-plugin'), { recursive: true });

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
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

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
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

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
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

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
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

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const lockCheck = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(lockCheck).toBeDefined();
      expect(lockCheck!.status).toBe('fail');
      expect(lockCheck!.message).toContain('plugin cache');
    });

    it('TC-012: should skip when no lockfile exists', async () => {
      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
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

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
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

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { fix: true, quick: true });
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

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
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

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
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

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      await checker.check(projectRoot, { fix: false, quick: true });

      expect(mockExecSync).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Regressions from the 2.0 release proofs: a FRESH `specweave init` must
  // leave `specweave doctor` exiting 0.
  // =========================================================================
  describe('lockfile integrity after a real init (2.0 regressions)', () => {
    /** Build a fake specweave package root with one bundled marketplace plugin. */
    function writeFakePackage(skills: string[]): void {
      const pluginSrc = path.join(pkgRoot, 'plugins', 'specweave');
      fs.mkdirSync(path.join(pkgRoot, '.claude-plugin'), { recursive: true });
      fs.writeFileSync(
        path.join(pkgRoot, '.claude-plugin', 'marketplace.json'),
        JSON.stringify({ plugins: [{ name: 'sw', source: './plugins/specweave' }] })
      );
      for (const skill of skills) {
        fs.mkdirSync(path.join(pluginSrc, 'skills', skill), { recursive: true });
        fs.writeFileSync(path.join(pluginSrc, 'skills', skill, 'SKILL.md'), `# ${skill}\n`);
      }
    }

    /** Reproduce what `specweave init` actually leaves on disk. */
    async function writeGlobalSwLock(): Promise<void> {
      const { computePluginHash } = await import('../../../../../src/utils/plugin-copier.js');
      mockReadGlobalLockfile.mockReturnValue({
        version: 1,
        agents: ['claude-code'],
        skills: {
          sw: {
            version: '1.0.593',
            // init hashes the plugin SOURCE dir, not the install target
            sha: computePluginHash(path.join(pkgRoot, 'plugins', 'specweave')),
            tier: 'BUNDLED',
            installedAt: new Date().toISOString(),
            source: 'local:specweave',
          },
        },
      });
    }

    afterEach(() => {
      mockReadGlobalLockfile.mockReturnValue(null);
    });

    it('passes when init installed the sw skills PROJECT-LOCAL into .claude/skills/', async () => {
      // init's own output: "Location: .claude/skills/ (project-local)". There is
      // no dir named `sw` anywhere - the plugin is exploded skill-by-skill.
      writeFakePackage(['do', 'done', 'increment']);
      await writeGlobalSwLock();
      for (const skill of ['do', 'done', 'increment']) {
        fs.mkdirSync(path.join(projectRoot, '.claude', 'skills', skill), { recursive: true });
        fs.writeFileSync(path.join(projectRoot, '.claude', 'skills', skill, 'SKILL.md'), `# ${skill}\n`);
      }

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { quick: true });
      const check = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(check!.status).toBe('pass');
      expect(result.status).not.toBe('fail');
    });

    it('does not fail on a vskill-managed skill whose 64-char digest is not ours', async () => {
      // `specweave update` used to install skill-creator and record vskill's full
      // sha256 - incomparable with computePluginHash's 12-char digest, so doctor
      // reported a hash mismatch that no --fix could ever clear.
      writeFakePackage(['do']);
      await writeGlobalSwLock();
      fs.mkdirSync(path.join(projectRoot, '.claude', 'skills', 'do'), { recursive: true });
      fs.writeFileSync(path.join(projectRoot, '.claude', 'skills', 'do', 'SKILL.md'), '# do\n');

      const skillDir = path.join(projectRoot, '.claude', 'skills', 'skill-creator');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# skill-creator (content differs)\n');
      fs.writeFileSync(
        path.join(projectRoot, 'vskill.lock'),
        JSON.stringify({
          version: 1,
          agents: ['claude-code'],
          skills: {
            'skill-creator': {
              version: '1.0.0',
              sha: 'dcd4803e61e913e6fc27294184cd3a71f09f5e924ff20c8a9a20173e7b3c2bcf',
              tier: 'VERIFIED',
              installedAt: new Date().toISOString(),
              source: 'github:anthropics/skills',
            },
          },
        })
      );

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { quick: true });
      const check = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(check!.status).toBe('pass');
      expect(check!.message).not.toContain('mismatch');
    });

    it('warns (never fails) when a vskill-managed skill is not installed', async () => {
      writeFakePackage(['do']);
      await writeGlobalSwLock();
      fs.mkdirSync(path.join(projectRoot, '.claude', 'skills', 'do'), { recursive: true });
      fs.writeFileSync(path.join(projectRoot, '.claude', 'skills', 'do', 'SKILL.md'), '# do\n');
      fs.writeFileSync(
        path.join(projectRoot, 'vskill.lock'),
        JSON.stringify({
          version: 1,
          agents: ['claude-code'],
          skills: {
            'skill-creator': {
              version: '1.0.0',
              sha: 'dcd4803e61e913e6fc27294184cd3a71f09f5e924ff20c8a9a20173e7b3c2bcf',
              tier: 'VERIFIED',
              installedAt: new Date().toISOString(),
              source: 'github:anthropics/skills',
            },
          },
        })
      );

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { quick: true });
      const check = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(check!.status).toBe('warn');
      expect(check!.fixSuggestion).toContain('vskill install');
    });

    it('still fails when the bundled sw plugin is genuinely nowhere', async () => {
      writeFakePackage(['do']);
      await writeGlobalSwLock();

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { quick: true });
      const check = result.checks.find(c => c.name === 'Lockfile integrity');

      expect(check!.status).toBe('fail');
    });
  });

  describe('update health reports the RUNNING cli version (2.0 regression)', () => {
    it('never shells out to whatever `specweave` is first on PATH', async () => {
      // The old code ran `specweave --version`, which answered for a DIFFERENT
      // install (or the marketplace plugin cache) and told users on the newest
      // CLI that they were outdated.
      const version = new InstallationHealthChecker({
        packageRoot: pkgRoot,
        commandsDir,
        cacheDir,
      }).runningCliVersion();

      const own = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../../../../../package.json'), 'utf-8')
      ) as { version: string };
      expect(version).toBe(own.version);

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'specweave --version') throw new Error('should not be called');
        if (cmd.includes('npm view specweave version')) return own.version;
        return '';
      });

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});
      const check = result.checks.find(c => c.name === 'Update health');

      expect(check!.status).toBe('pass');
      expect(check!.message).toContain(own.version);
    });
  });

  // =========================================================================
  // Plugin cache hook freshness (2.0: hooks.json + run.mjs, no shell hooks)
  // =========================================================================
  describe('checkPluginCacheHookFreshness', () => {
    const repoRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
    const sourceHooksDir = path.join(repoRoot, 'plugins', 'specweave', 'hooks');

    /** Write a cached copy of every 2.0 hook asset. */
    function seedCache(mutate?: (asset: string, content: string) => string): void {
      const cachedHooks = path.join(cacheDir, 'specweave', 'sw', '1.0.0', 'hooks');
      fs.mkdirSync(cachedHooks, { recursive: true });
      for (const asset of ['hooks.json', 'run.mjs']) {
        const content = fs.readFileSync(path.join(sourceHooksDir, asset), 'utf-8');
        fs.writeFileSync(path.join(cachedHooks, asset), mutate ? mutate(asset, content) : content);
      }
    }

    it('ships the 2.0 hook assets it keys off (no deleted shell hooks)', () => {
      expect(fs.existsSync(path.join(sourceHooksDir, 'hooks.json'))).toBe(true);
      expect(fs.existsSync(path.join(sourceHooksDir, 'run.mjs'))).toBe(true);
      expect(fs.existsSync(path.join(sourceHooksDir, 'user-prompt-submit.sh'))).toBe(false);
    });

    it('passes when the cached hooks match the source', async () => {
      seedCache();
      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { quick: true });
      const check = result.checks.find(c => c.name === 'Plugin cache hook freshness');

      expect(check?.status).toBe('pass');
      expect(check?.message).toContain('up to date');
    });

    it('warns (never skips) when a cached hook drifts from the source', async () => {
      seedCache((asset, content) => (asset === 'run.mjs' ? `${content}\n// stale\n` : content));
      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { quick: true });
      const check = result.checks.find(c => c.name === 'Plugin cache hook freshness');

      expect(check?.status).toBe('warn');
      expect(check?.details?.some(d => d.includes('run.mjs'))).toBe(true);
    });

    it('rewrites the stale cached hook with fix=true', async () => {
      seedCache((asset, content) => (asset === 'hooks.json' ? `${content}\n` : content));
      const cachedManifest = path.join(cacheDir, 'specweave', 'sw', '1.0.0', 'hooks', 'hooks.json');

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { fix: true, quick: true });
      const check = result.checks.find(c => c.name === 'Plugin cache hook freshness');

      expect(check?.status).toBe('pass');
      expect(fs.readFileSync(cachedManifest, 'utf-8')).toBe(
        fs.readFileSync(path.join(sourceHooksDir, 'hooks.json'), 'utf-8')
      );
    });
  });

  // =========================================================================
  // Full check() method
  // =========================================================================
  describe('check() integration', () => {
    it('TC-016: should return all 7 check categories', async () => {
      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, {});

      expect(result.category).toBe('Installation Health');
      expect(result.checks.length).toBe(7);

      const checkNames = result.checks.map(c => c.name);
      expect(checkNames).toContain('Legacy commands directories');
      expect(checkNames).toContain('Stale cache directories');
      expect(checkNames).toContain('Lockfile integrity');
      expect(checkNames).toContain('Plugin cache hook freshness');
      expect(checkNames).toContain('Legacy lockfiles');
      expect(checkNames).toContain('Orphaned child lockfiles');
      expect(checkNames).toContain('Update health');
    });

    it('TC-016c: should return 6 checks when quick=true (skips update health)', async () => {
      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { quick: true });

      expect(result.checks.length).toBe(6);
      const checkNames = result.checks.map(c => c.name);
      expect(checkNames).not.toContain('Update health');
    });

    it('TC-016b: should calculate overall status from worst check (quick mode)', async () => {
      // Create a legacy dir to produce a warning
      fs.mkdirSync(path.join(commandsDir, 'sw'), { recursive: true });
      fs.writeFileSync(path.join(commandsDir, 'sw', 'SKILL.md'), '# Legacy');

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { quick: true });

      expect(result.status).toBe('warn');
    });
  });

  // =========================================================================
  // Update Health Check
  // =========================================================================
  describe('checkUpdateHealth', () => {
    it('TC-UH-01: should pass when installed version matches npm latest', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'specweave --version') return 'SHOULD NOT BE CALLED';
        if (cmd === `npm view specweave version ${npmRegistryFlag()}`) return '1.0.394';
        if (cmd.includes('npm root -g')) return '/usr/local/lib/node_modules';
        return '';
      });

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      vi.spyOn(checker, 'runningCliVersion').mockReturnValue('1.0.394');
      const result = await checker.check(projectRoot, {});
      const check = result.checks.find(c => c.name === 'Update health');

      expect(check).toBeDefined();
      expect(check!.status).toBe('pass');
      expect(check!.message).toContain('up to date');
    });

    it('TC-UH-02: should warn when outdated but resolvable', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'specweave --version') return 'SHOULD NOT BE CALLED';
        if (cmd === `npm view specweave version ${npmRegistryFlag()}`) return '1.0.394';
        if (cmd === `npm view specweave@1.0.394 version ${npmRegistryFlag()}`) return '1.0.394';
        if (cmd.includes('npm root -g')) return '/usr/local/lib/node_modules';
        return '';
      });

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      vi.spyOn(checker, 'runningCliVersion').mockReturnValue('1.0.390');
      const result = await checker.check(projectRoot, {});
      const check = result.checks.find(c => c.name === 'Update health');

      expect(check).toBeDefined();
      expect(check!.status).toBe('warn');
      expect(check!.message).toContain('outdated');
      expect(check!.fixSuggestion).toContain('specweave update');
    });

    it('TC-UH-03: should fail when CDN propagation issue detected', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'specweave --version') return '1.0.393';
        if (cmd === `npm view specweave version ${npmRegistryFlag()}`) return '1.0.394';
        if (cmd === `npm view specweave@1.0.394 version ${npmRegistryFlag()}`) {
          const err = new Error('ETARGET') as any;
          err.stderr = 'ETARGET No matching version found for specweave@1.0.394';
          throw err;
        }
        if (cmd.includes('npm root -g')) return '/usr/local/lib/node_modules';
        return '';
      });

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      vi.spyOn(checker, 'runningCliVersion').mockReturnValue('1.0.390');
      const result = await checker.check(projectRoot, {});
      const check = result.checks.find(c => c.name === 'Update health');

      expect(check).toBeDefined();
      expect(check!.status).toBe('fail');
      expect(check!.message).toContain('propagation delay');
      expect(check!.fixSuggestion).toContain('doctor --fix');
    });

    it('TC-UH-04: should clear npm cache on CDN issue with fix=true', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'specweave --version') return '1.0.393';
        if (cmd === `npm view specweave version ${npmRegistryFlag()}`) return '1.0.394';
        if (cmd === `npm view specweave@1.0.394 version ${npmRegistryFlag()}`) {
          const err = new Error('ETARGET') as any;
          err.stderr = 'ETARGET';
          throw err;
        }
        if (cmd === 'npm cache clean --force') return '';
        if (cmd.includes('npm root -g')) return '/usr/local/lib/node_modules';
        return '';
      });

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      vi.spyOn(checker, 'runningCliVersion').mockReturnValue('1.0.390');
      const result = await checker.check(projectRoot, { fix: true });
      const check = result.checks.find(c => c.name === 'Update health');

      expect(check).toBeDefined();
      expect(check!.status).toBe('warn');
      expect(check!.message).toContain('cache cleared');
    });

    it('TC-UH-05: should skip when specweave version cannot be determined', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'specweave --version') throw new Error('not found');
        if (cmd.includes('npm root -g')) return '/usr/local/lib/node_modules';
        return '';
      });

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      vi.spyOn(checker, 'runningCliVersion').mockReturnValue(null);
      const result = await checker.check(projectRoot, {});
      const check = result.checks.find(c => c.name === 'Update health');

      expect(check).toBeDefined();
      expect(check!.status).toBe('skip');
    });

    it('TC-UH-06: should warn when npm registry unreachable', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'specweave --version') return 'SHOULD NOT BE CALLED';
        if (cmd === `npm view specweave version ${npmRegistryFlag()}`) throw new Error('ETIMEDOUT');
        if (cmd.includes('npm root -g')) return '/usr/local/lib/node_modules';
        return '';
      });

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      vi.spyOn(checker, 'runningCliVersion').mockReturnValue('1.0.394');
      const result = await checker.check(projectRoot, {});
      const check = result.checks.find(c => c.name === 'Update health');

      expect(check).toBeDefined();
      expect(check!.status).toBe('warn');
      expect(check!.message).toContain('npm registry');
    });

    it('TC-UH-07: should retry with explicit registry on E401 from stale auth token', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'specweave --version') return 'SHOULD NOT BE CALLED';
        if (cmd === 'npm view specweave version') {
          const err = new Error('Command failed') as any;
          err.stderr = 'npm error code E401\nnpm error Unable to authenticate';
          throw err;
        }
        if (cmd === `npm view specweave version ${npmRegistryFlag()}`) {
          return '1.0.394';
        }
        if (cmd.includes('npm root -g')) return '/usr/local/lib/node_modules';
        return '';
      });

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      vi.spyOn(checker, 'runningCliVersion').mockReturnValue('1.0.394');
      const result = await checker.check(projectRoot, {});
      const check = result.checks.find(c => c.name === 'Update health');

      expect(check).toBeDefined();
      expect(check!.status).toBe('pass');
      expect(check!.message).toContain('up to date');
    });

    it('TC-UH-08: should warn when E401 retry also fails', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'specweave --version') return 'SHOULD NOT BE CALLED';
        if (cmd.includes('npm view specweave version')) {
          const err = new Error('Command failed') as any;
          err.stderr = 'npm error code E401\nnpm error Unable to authenticate';
          throw err;
        }
        if (cmd.includes('npm root -g')) return '/usr/local/lib/node_modules';
        return '';
      });

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      vi.spyOn(checker, 'runningCliVersion').mockReturnValue('1.0.394');
      const result = await checker.check(projectRoot, {});
      const check = result.checks.find(c => c.name === 'Update health');

      expect(check).toBeDefined();
      expect(check!.status).toBe('warn');
      expect(check!.message).toContain('npm registry');
    });
  });

  // =========================================================================
  // Stale Lockfile Checks (T-012 through T-015)
  // =========================================================================
  describe('checkStaleLockfiles', () => {
    it('T-012: detect mode warns with file paths when stale lockfiles exist', async () => {
      // Create a nested skills-lock.json (legacy lockfile)
      const nestedDir = path.join(projectRoot, 'sub');
      fs.mkdirSync(nestedDir, { recursive: true });
      const legacyLock = path.join(nestedDir, 'skills-lock.json');
      fs.writeFileSync(legacyLock, '{}');
      const oldTime = new Date(Date.now() - 60_000);
      fs.utimesSync(legacyLock, oldTime, oldTime);

      // Create umbrella config and orphaned child lock
      const specweaveDir = path.join(projectRoot, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });
      fs.writeFileSync(
        path.join(specweaveDir, 'config.json'),
        JSON.stringify({ umbrella: { enabled: true } })
      );
      const childDir = path.join(projectRoot, 'repositories', 'org', 'child');
      fs.mkdirSync(childDir, { recursive: true });
      const childLock = path.join(childDir, 'vskill.lock');
      fs.writeFileSync(childLock, '{}');
      fs.utimesSync(childLock, oldTime, oldTime);

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { fix: false, quick: true });

      const legacyCheck = result.checks.find(c => c.name === 'Legacy lockfiles');
      expect(legacyCheck).toBeDefined();
      expect(legacyCheck!.status).toBe('warn');

      const orphanCheck = result.checks.find(c => c.name === 'Orphaned child lockfiles');
      expect(orphanCheck).toBeDefined();
      expect(orphanCheck!.status).toBe('warn');
    });

    it('T-013: fix mode removes files and reports removed count', async () => {
      // Create legacy lockfile
      const legacyLock = path.join(projectRoot, 'skills-lock.json');
      fs.writeFileSync(legacyLock, '{}');
      const oldTime = new Date(Date.now() - 60_000);
      fs.utimesSync(legacyLock, oldTime, oldTime);

      // Create umbrella config and orphaned child lock
      const specweaveDir = path.join(projectRoot, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });
      fs.writeFileSync(
        path.join(specweaveDir, 'config.json'),
        JSON.stringify({ umbrella: { enabled: true } })
      );
      const childDir = path.join(projectRoot, 'repositories', 'org', 'child');
      fs.mkdirSync(childDir, { recursive: true });
      const childLock = path.join(childDir, 'vskill.lock');
      fs.writeFileSync(childLock, '{}');
      fs.utimesSync(childLock, oldTime, oldTime);

      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { fix: true, quick: true });

      const legacyCheck = result.checks.find(c => c.name === 'Legacy lockfiles');
      expect(legacyCheck).toBeDefined();
      expect(legacyCheck!.status).toBe('pass');

      const orphanCheck = result.checks.find(c => c.name === 'Orphaned child lockfiles');
      expect(orphanCheck).toBeDefined();
      expect(orphanCheck!.status).toBe('pass');

      // Files should be deleted
      expect(fs.existsSync(legacyLock)).toBe(false);
      expect(fs.existsSync(childLock)).toBe(false);
    });

    it('T-014: pass status when no stale lockfiles exist', async () => {
      // Clean project, no lockfiles at all
      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { fix: false, quick: true });

      const legacyCheck = result.checks.find(c => c.name === 'Legacy lockfiles');
      expect(legacyCheck).toBeDefined();
      expect(legacyCheck!.status).toBe('pass');

      const orphanCheck = result.checks.find(c => c.name === 'Orphaned child lockfiles');
      expect(orphanCheck).toBeDefined();
      expect(orphanCheck!.status).toBe('pass');
    });

    it('T-015: check() returns entries named "Legacy lockfiles" and "Orphaned child lockfiles"', async () => {
      const checker = new InstallationHealthChecker({ packageRoot: pkgRoot, commandsDir, cacheDir });
      const result = await checker.check(projectRoot, { quick: true });

      const checkNames = result.checks.map(c => c.name);
      expect(checkNames).toContain('Legacy lockfiles');
      expect(checkNames).toContain('Orphaned child lockfiles');
    });
  });
});
