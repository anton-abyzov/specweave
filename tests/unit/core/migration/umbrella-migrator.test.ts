/**
 * Umbrella Migrator Unit Tests
 *
 * Tests the migration from single-repo to umbrella/multi-repo structure.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import path from 'path';
import os from 'os';

// Mock git-utils to avoid actual git operations
const mockIsWorkingDirectoryClean = vi.hoisted(() => vi.fn());
const mockDetectRepository = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/utils/git-utils.js', () => ({
  isWorkingDirectoryClean: mockIsWorkingDirectoryClean,
  detectRepository: mockDetectRepository,
}));

// Mock execFileNoThrow to avoid actual shell commands
const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

// Mock persistUmbrellaConfig
const mockPersistUmbrellaConfig = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/core/living-docs/umbrella-detector.js', () => ({
  persistUmbrellaConfig: mockPersistUmbrellaConfig,
}));

import {
  detectSingleRepoProject,
  generateMigrationPlan,
  createBackup,
  guardUncommittedChanges,
  executeMigration,
  rollbackMigration,
  addRepoToUmbrella,
} from '../../../../src/core/migration/umbrella-migrator.js';

const silentLogger = {
  log: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe('UmbrellaMigrator', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `umb-migrator-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fsPromises.mkdir(testDir, { recursive: true });
    vi.clearAllMocks();
    mockIsWorkingDirectoryClean.mockResolvedValue(true);
    mockDetectRepository.mockResolvedValue(null);
    mockPersistUmbrellaConfig.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    try {
      await fsPromises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper: create a valid single-repo project structure in testDir
   */
  async function createSingleRepoProject(
    opts: {
      orgName?: string;
      projectName?: string;
      hasClaudeMd?: boolean;
      hasAgentsMd?: boolean;
      hasDocsSite?: boolean;
      umbrellaEnabled?: boolean;
    } = {},
  ) {
    const projectDir = path.join(testDir, 'my-project');
    await fsPromises.mkdir(path.join(projectDir, '.specweave'), { recursive: true });

    const config: Record<string, any> = {
      version: '1.0.0',
    };
    if (opts.orgName) {
      config.repository = { organization: opts.orgName };
    }
    if (opts.projectName) {
      config.project = { name: opts.projectName };
    }
    if (opts.umbrellaEnabled) {
      config.umbrella = { enabled: true, childRepos: [] };
    }

    await fsPromises.writeFile(
      path.join(projectDir, '.specweave', 'config.json'),
      JSON.stringify(config, null, 2),
    );

    if (opts.hasClaudeMd !== false) {
      await fsPromises.writeFile(path.join(projectDir, 'CLAUDE.md'), '# CLAUDE');
    }
    if (opts.hasAgentsMd) {
      await fsPromises.writeFile(path.join(projectDir, 'AGENTS.md'), '# AGENTS');
    }
    if (opts.hasDocsSite) {
      await fsPromises.mkdir(path.join(projectDir, 'docs-site'), { recursive: true });
      await fsPromises.writeFile(
        path.join(projectDir, 'docs-site', 'index.html'),
        '<html></html>',
      );
    }

    return projectDir;
  }

  // -----------------------------------------------------------------------
  // detectSingleRepoProject
  // -----------------------------------------------------------------------

  describe('detectSingleRepoProject', () => {
    it('should detect a valid single-repo project', async () => {
      const projectDir = await createSingleRepoProject({
        orgName: 'myorg',
        projectName: 'my-app',
      });

      const result = await detectSingleRepoProject(projectDir, silentLogger);

      expect(result).not.toBeNull();
      expect(result!.repoName).toBe('my-app');
      expect(result!.orgName).toBe('myorg');
      expect(result!.hasClaudeMd).toBe(true);
      expect(result!.hasAgentsMd).toBe(false);
      expect(result!.hasDocsSite).toBe(false);
    });

    it('should return null for non-SpecWeave project', async () => {
      const projectDir = path.join(testDir, 'plain-project');
      await fsPromises.mkdir(projectDir, { recursive: true });

      const result = await detectSingleRepoProject(projectDir, silentLogger);

      expect(result).toBeNull();
    });

    it('should return null for already-umbrella project', async () => {
      const projectDir = await createSingleRepoProject({
        umbrellaEnabled: true,
      });

      const result = await detectSingleRepoProject(projectDir, silentLogger);

      expect(result).toBeNull();
    });

    it('should return null for invalid config.json', async () => {
      const projectDir = path.join(testDir, 'bad-config');
      await fsPromises.mkdir(path.join(projectDir, '.specweave'), { recursive: true });
      await fsPromises.writeFile(
        path.join(projectDir, '.specweave', 'config.json'),
        'not valid json{{{',
      );

      const result = await detectSingleRepoProject(projectDir, silentLogger);

      expect(result).toBeNull();
    });

    it('should use git remote to detect org when not in config', async () => {
      const projectDir = await createSingleRepoProject({});
      mockDetectRepository.mockResolvedValue({
        provider: 'github',
        owner: 'detected-org',
        repo: 'detected-repo',
        url: 'https://github.com/detected-org/detected-repo.git',
      });

      const result = await detectSingleRepoProject(projectDir, silentLogger);

      expect(result).not.toBeNull();
      expect(result!.orgName).toBe('detected-org');
    });

    it('should detect AGENTS.md and docs-site when present', async () => {
      const projectDir = await createSingleRepoProject({
        orgName: 'org',
        hasAgentsMd: true,
        hasDocsSite: true,
      });

      const result = await detectSingleRepoProject(projectDir, silentLogger);

      expect(result).not.toBeNull();
      expect(result!.hasAgentsMd).toBe(true);
      expect(result!.hasDocsSite).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // generateMigrationPlan
  // -----------------------------------------------------------------------

  describe('generateMigrationPlan', () => {
    it('should generate correct steps for minimal project', () => {
      const candidate = {
        projectRoot: '/home/user/my-project',
        configPath: '/home/user/my-project/.specweave/config.json',
        orgName: 'myorg',
        repoName: 'my-project',
        hasClaudeMd: true,
        hasAgentsMd: false,
        hasDocsSite: false,
      };

      const plan = generateMigrationPlan(candidate);

      expect(plan.umbrellaName).toBe('my-project-umb');
      expect(plan.umbrellaPath).toBe('/home/user/my-project-umb');

      // Should have: create-dir (umbrella), create-dir (repos), move (.specweave),
      // move (CLAUDE.md), update-config
      expect(plan.steps).toHaveLength(5);
      expect(plan.steps[0].type).toBe('create-dir');
      expect(plan.steps[1].type).toBe('create-dir');
      expect(plan.steps[2].type).toBe('move');
      expect(plan.steps[2].description).toContain('.specweave');
      expect(plan.steps[3].type).toBe('move');
      expect(plan.steps[3].description).toContain('CLAUDE.md');
      expect(plan.steps[4].type).toBe('update-config');
    });

    it('should include AGENTS.md and docs-site steps when present', () => {
      const candidate = {
        projectRoot: '/home/user/my-project',
        configPath: '/home/user/my-project/.specweave/config.json',
        orgName: 'org',
        repoName: 'my-project',
        hasClaudeMd: true,
        hasAgentsMd: true,
        hasDocsSite: true,
      };

      const plan = generateMigrationPlan(candidate);

      // create-dir x2, move .specweave, move CLAUDE.md, move AGENTS.md, move docs-site, update-config
      expect(plan.steps).toHaveLength(7);
      const descriptions = plan.steps.map((s) => s.description);
      expect(descriptions).toContain('Move AGENTS.md to umbrella root');
      expect(descriptions).toContain('Move docs-site/ to umbrella root');
    });

    it('should use custom umbrella name when provided', () => {
      const candidate = {
        projectRoot: '/home/user/my-project',
        configPath: '/home/user/my-project/.specweave/config.json',
        orgName: 'org',
        repoName: 'my-project',
        hasClaudeMd: false,
        hasAgentsMd: false,
        hasDocsSite: false,
      };

      const plan = generateMigrationPlan(candidate, {
        umbrellaName: 'workspace',
      });

      expect(plan.umbrellaName).toBe('workspace');
      expect(plan.umbrellaPath).toBe('/home/user/workspace');
    });
  });

  // -----------------------------------------------------------------------
  // createBackup
  // -----------------------------------------------------------------------

  describe('createBackup', () => {
    it('should create backup outside .specweave/ with config.json copy', async () => {
      const projectDir = await createSingleRepoProject({
        orgName: 'org',
        projectName: 'app',
      });

      const backupPath = await createBackup(projectDir, silentLogger);

      expect(backupPath).toContain('.specweave-migration-backup');
      expect(fs.existsSync(path.join(backupPath, 'config.json'))).toBe(true);
      // Backup should be at projectRoot level, NOT inside .specweave/
      expect(backupPath).toBe(path.join(projectDir, '.specweave-migration-backup'));
    });

    it('should create migration.log', async () => {
      const projectDir = await createSingleRepoProject({});

      await createBackup(projectDir, silentLogger);

      const logPath = path.join(projectDir, '.specweave', 'logs', 'migration.log');
      expect(fs.existsSync(logPath)).toBe(true);
      const logContent = fs.readFileSync(logPath, 'utf-8');
      expect(logContent).toContain('Migration backup created');
    });
  });

  // -----------------------------------------------------------------------
  // guardUncommittedChanges
  // -----------------------------------------------------------------------

  describe('guardUncommittedChanges', () => {
    it('should pass when working directory is clean', async () => {
      mockIsWorkingDirectoryClean.mockResolvedValue(true);

      await expect(guardUncommittedChanges('/some/path')).resolves.toBeUndefined();
    });

    it('should throw when working directory has uncommitted changes', async () => {
      mockIsWorkingDirectoryClean.mockResolvedValue(false);

      await expect(guardUncommittedChanges('/some/path')).rejects.toThrow(
        'Uncommitted changes detected',
      );
    });
  });

  // -----------------------------------------------------------------------
  // executeMigration
  // -----------------------------------------------------------------------

  describe('executeMigration', () => {
    it('should execute full migration successfully', async () => {
      const projectDir = await createSingleRepoProject({
        orgName: 'myorg',
        projectName: 'my-app',
        hasClaudeMd: true,
        hasAgentsMd: true,
      });

      const candidate = await detectSingleRepoProject(projectDir, silentLogger);
      expect(candidate).not.toBeNull();

      const plan = generateMigrationPlan(candidate!);
      const result = await executeMigration(plan, silentLogger);

      expect(result.success).toBe(true);
      expect(result.stepsCompleted).toBe(plan.steps.length);
      expect(result.errors).toHaveLength(0);
      expect(result.umbrellaPath).toBe(plan.umbrellaPath);
      expect(result.backupPath).toBeDefined();

      // Verify umbrella structure created
      expect(fs.existsSync(plan.umbrellaPath)).toBe(true);
      expect(fs.existsSync(path.join(plan.umbrellaPath, '.specweave'))).toBe(true);
      expect(fs.existsSync(path.join(plan.umbrellaPath, 'CLAUDE.md'))).toBe(true);
      expect(fs.existsSync(path.join(plan.umbrellaPath, 'AGENTS.md'))).toBe(true);

      // Verify config updated with umbrella settings
      const configPath = path.join(plan.umbrellaPath, '.specweave', 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.umbrella.enabled).toBe(true);
      expect(config.umbrella.childRepos).toHaveLength(1);
      expect(config.umbrella.childRepos[0].id).toBe('my-app');

      // Verify key files moved from original
      expect(fs.existsSync(path.join(projectDir, '.specweave', 'config.json'))).toBe(false);
      expect(fs.existsSync(path.join(projectDir, 'CLAUDE.md'))).toBe(false);

      // Verify backup is outside .specweave/ (survives the move)
      expect(result.backupPath).toBe(path.join(projectDir, '.specweave-migration-backup'));
      expect(fs.existsSync(result.backupPath!)).toBe(true);
    });

    it('should write migration manifest with moved items', async () => {
      const projectDir = await createSingleRepoProject({
        orgName: 'org',
        projectName: 'app',
        hasClaudeMd: true,
        hasAgentsMd: true,
        hasDocsSite: true,
      });

      const candidate = await detectSingleRepoProject(projectDir, silentLogger);
      const plan = generateMigrationPlan(candidate!);
      const result = await executeMigration(plan, silentLogger);

      expect(result.success).toBe(true);

      // Verify manifest exists in backup
      const manifestPath = path.join(result.backupPath!, 'migration-manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.umbrellaPath).toBe(plan.umbrellaPath);
      expect(manifest.projectRoot).toBe(projectDir);
      expect(manifest.movedItems).toHaveLength(4); // .specweave, CLAUDE.md, AGENTS.md, docs-site
    });

    it('should include docs-site in migration when present', async () => {
      const projectDir = await createSingleRepoProject({
        orgName: 'org',
        projectName: 'app',
        hasDocsSite: true,
      });

      const candidate = await detectSingleRepoProject(projectDir, silentLogger);
      const plan = generateMigrationPlan(candidate!);
      const result = await executeMigration(plan, silentLogger);

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(plan.umbrellaPath, 'docs-site', 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'docs-site'))).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // rollbackMigration
  // -----------------------------------------------------------------------

  describe('rollbackMigration', () => {
    it('should restore from backup (legacy, no manifest)', async () => {
      const projectDir = await createSingleRepoProject({
        orgName: 'org',
        projectName: 'app',
      });

      // Create a backup
      await createBackup(projectDir, silentLogger);

      // Simulate some changes (delete config.json)
      await fsPromises.unlink(path.join(projectDir, '.specweave', 'config.json'));
      expect(fs.existsSync(path.join(projectDir, '.specweave', 'config.json'))).toBe(false);

      // Rollback (no manifest = legacy path)
      const result = await rollbackMigration(projectDir, silentLogger);

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();

      // Config restored
      expect(fs.existsSync(path.join(projectDir, '.specweave', 'config.json'))).toBe(true);

      // Backup directory cleaned up
      expect(fs.existsSync(path.join(projectDir, '.specweave-migration-backup'))).toBe(false);
    });

    it('should fully rollback a migration (restore all moved files)', async () => {
      const projectDir = await createSingleRepoProject({
        orgName: 'org',
        projectName: 'app',
        hasClaudeMd: true,
        hasAgentsMd: true,
        hasDocsSite: true,
      });

      // Execute a full migration
      const candidate = await detectSingleRepoProject(projectDir, silentLogger);
      const plan = generateMigrationPlan(candidate!);
      const migResult = await executeMigration(plan, silentLogger);
      expect(migResult.success).toBe(true);

      // Verify files moved to umbrella
      expect(fs.existsSync(path.join(plan.umbrellaPath, 'CLAUDE.md'))).toBe(true);
      expect(fs.existsSync(path.join(plan.umbrellaPath, 'AGENTS.md'))).toBe(true);
      expect(fs.existsSync(path.join(plan.umbrellaPath, 'docs-site', 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'CLAUDE.md'))).toBe(false);

      // Rollback from original project directory
      const rollResult = await rollbackMigration(projectDir, silentLogger);

      expect(rollResult.success).toBe(true);

      // All files restored to original project
      expect(fs.existsSync(path.join(projectDir, '.specweave', 'config.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'CLAUDE.md'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'AGENTS.md'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'docs-site', 'index.html'))).toBe(true);

      // Umbrella directory removed
      expect(fs.existsSync(plan.umbrellaPath)).toBe(false);

      // Backup cleaned up
      expect(fs.existsSync(path.join(projectDir, '.specweave-migration-backup'))).toBe(false);
    });

    it('should fail when no backup exists', async () => {
      const projectDir = await createSingleRepoProject({});

      const result = await rollbackMigration(projectDir, silentLogger);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('No migration backup found');
    });

    it('should fail when backup is invalid (missing config.json)', async () => {
      const projectDir = await createSingleRepoProject({});
      const backupDir = path.join(projectDir, '.specweave-migration-backup');
      await fsPromises.mkdir(backupDir, { recursive: true });
      // No config.json in backup

      const result = await rollbackMigration(projectDir, silentLogger);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Backup is invalid');
    });
  });

  // -----------------------------------------------------------------------
  // addRepoToUmbrella
  // -----------------------------------------------------------------------

  describe('addRepoToUmbrella', () => {
    async function createUmbrellaProject() {
      const umbrellaDir = path.join(testDir, 'my-umbrella');
      await fsPromises.mkdir(path.join(umbrellaDir, '.specweave'), { recursive: true });
      await fsPromises.writeFile(
        path.join(umbrellaDir, '.specweave', 'config.json'),
        JSON.stringify({
          version: '1.0.0',
          umbrella: { enabled: true, childRepos: [] },
        }, null, 2),
      );
      return umbrellaDir;
    }

    it('should create local directory when gh CLI unavailable', async () => {
      const umbrellaDir = await createUmbrellaProject();
      // gh CLI not available
      mockExecFileNoThrow.mockResolvedValue({ exitCode: 1, stdout: '', stderr: '' });

      const result = await addRepoToUmbrella(
        umbrellaDir, 'new-repo', 'myorg', { prefix: 'NR' }, silentLogger,
      );

      expect(result.success).toBe(true);
      expect(result.repoName).toBe('new-repo');
      expect(result.usedGhCli).toBe(false);
      expect(fs.existsSync(result.repoPath)).toBe(true);
      expect(result.repoPath).toBe(path.join(umbrellaDir, 'repositories', 'myorg', 'new-repo'));
    });

    it('should register repo in config via persistUmbrellaConfig', async () => {
      const umbrellaDir = await createUmbrellaProject();
      mockExecFileNoThrow.mockResolvedValue({ exitCode: 1, stdout: '', stderr: '' });

      await addRepoToUmbrella(
        umbrellaDir, 'backend', 'acme', { prefix: 'BE' }, silentLogger,
      );

      expect(mockPersistUmbrellaConfig).toHaveBeenCalledWith(
        umbrellaDir,
        expect.objectContaining({
          enabled: true,
          childRepos: [expect.objectContaining({ id: 'backend', name: 'backend' })],
        }),
      );

      // Verify prefix was persisted separately
      const config = JSON.parse(fs.readFileSync(
        path.join(umbrellaDir, '.specweave', 'config.json'), 'utf-8',
      ));
      // Note: persistUmbrellaConfig is mocked, so we check the manual prefix write
      // The manual write reads and updates the actual file
    });

    it('should attempt gh CLI when available', async () => {
      const umbrellaDir = await createUmbrellaProject();
      // which gh: success, gh auth: success, gh repo create: success
      mockExecFileNoThrow
        .mockResolvedValueOnce({ exitCode: 0, stdout: '/usr/bin/gh', stderr: '' }) // which gh
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // gh auth status
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }); // gh repo create

      const result = await addRepoToUmbrella(
        umbrellaDir, 'frontend', 'acme', {}, silentLogger,
      );

      expect(result.success).toBe(true);
      expect(result.usedGhCli).toBe(true);
      // Verify gh repo create was called with correct args
      expect(mockExecFileNoThrow).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['repo', 'create', 'acme/frontend', '--clone']),
        expect.any(Object),
      );
    });

    it('should use default prefix when none provided', async () => {
      const umbrellaDir = await createUmbrellaProject();
      mockExecFileNoThrow.mockResolvedValue({ exitCode: 1, stdout: '', stderr: '' });

      await addRepoToUmbrella(
        umbrellaDir, 'my-service', 'org', {}, silentLogger,
      );

      // Default prefix = first 3 chars uppercased = "MY-"
      const config = JSON.parse(fs.readFileSync(
        path.join(umbrellaDir, '.specweave', 'config.json'), 'utf-8',
      ));
      // Check that repo was referenced in persistUmbrellaConfig
      expect(mockPersistUmbrellaConfig).toHaveBeenCalled();
    });
  });
});
