/**
 * Umbrella Migrator Collision Handling Tests
 *
 * Tests collision detection when target umbrella directory already exists,
 * post-move log path fix, and move destination safety checks.
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
  classifyExistingUmbrella,
  detectSingleRepoProject,
  generateMigrationPlan,
  executeMigration,
} from '../../../../src/core/migration/umbrella-migrator.js';

const silentLogger = {
  log: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe('UmbrellaMigrator — Collision Handling', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `umb-collision-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
   * Helper: create a valid single-repo project structure
   */
  async function createSingleRepoProject(
    opts: {
      orgName?: string;
      projectName?: string;
      hasClaudeMd?: boolean;
      hasAgentsMd?: boolean;
      hasDocsSite?: boolean;
    } = {},
  ) {
    const projectDir = path.join(testDir, 'my-project');
    await fsPromises.mkdir(path.join(projectDir, '.specweave'), { recursive: true });

    const config: Record<string, any> = {
      version: '1.0.0',
    };
    if (opts.orgName) config.repository = { organization: opts.orgName };
    if (opts.projectName) config.project = { name: opts.projectName };

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
  // classifyExistingUmbrella
  // -----------------------------------------------------------------------

  describe('classifyExistingUmbrella', () => {
    it('should return null when directory does not exist', async () => {
      const result = await classifyExistingUmbrella(
        path.join(testDir, 'nonexistent'),
        testDir,
      );
      expect(result).toBeNull();
    });

    it('should return "previous-migration" when dir has .specweave/', async () => {
      const umbrellaDir = path.join(testDir, 'my-umb');
      await fsPromises.mkdir(path.join(umbrellaDir, '.specweave'), { recursive: true });
      await fsPromises.writeFile(
        path.join(umbrellaDir, '.specweave', 'config.json'),
        '{}',
      );

      const result = await classifyExistingUmbrella(umbrellaDir, testDir);
      expect(result).toBe('previous-migration');
    });

    it('should return "partial-migration" when backup manifest exists', async () => {
      const umbrellaDir = path.join(testDir, 'my-umb');
      await fsPromises.mkdir(umbrellaDir, { recursive: true });
      // No .specweave/ inside umbrella, but backup exists at projectRoot
      const projectDir = path.join(testDir, 'my-project');
      await fsPromises.mkdir(
        path.join(projectDir, '.specweave-migration-backup'),
        { recursive: true },
      );
      await fsPromises.writeFile(
        path.join(projectDir, '.specweave-migration-backup', 'migration-manifest.json'),
        JSON.stringify({ umbrellaPath: umbrellaDir }),
      );

      const result = await classifyExistingUmbrella(umbrellaDir, projectDir);
      expect(result).toBe('partial-migration');
    });

    it('should return "unrelated" when dir exists without SpecWeave markers', async () => {
      const umbrellaDir = path.join(testDir, 'my-umb');
      await fsPromises.mkdir(umbrellaDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(umbrellaDir, 'some-file.txt'),
        'unrelated content',
      );

      const result = await classifyExistingUmbrella(umbrellaDir, testDir);
      expect(result).toBe('unrelated');
    });
  });

  // -----------------------------------------------------------------------
  // Move step destination safety
  // -----------------------------------------------------------------------

  describe('executeMigration — move destination safety', () => {
    it('should fail when move destination already exists', async () => {
      const projectDir = await createSingleRepoProject({
        orgName: 'org',
        projectName: 'app',
        hasClaudeMd: true,
      });

      const candidate = await detectSingleRepoProject(projectDir, silentLogger);
      const plan = generateMigrationPlan(candidate!);

      // Pre-create the destination for .specweave/ to trigger collision
      await fsPromises.mkdir(
        path.join(plan.umbrellaPath, '.specweave'),
        { recursive: true },
      );
      await fsPromises.writeFile(
        path.join(plan.umbrellaPath, '.specweave', 'existing-file.txt'),
        'should not be overwritten',
      );

      const result = await executeMigration(plan, silentLogger);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('already exists');
    });
  });

  // -----------------------------------------------------------------------
  // Post-move log path
  // -----------------------------------------------------------------------

  describe('executeMigration — post-move log path', () => {
    it('should not create ghost .specweave/logs/ in original project after migration', async () => {
      const projectDir = await createSingleRepoProject({
        orgName: 'org',
        projectName: 'app',
      });

      const candidate = await detectSingleRepoProject(projectDir, silentLogger);
      const plan = generateMigrationPlan(candidate!);
      const result = await executeMigration(plan, silentLogger);

      expect(result.success).toBe(true);

      // After migration, original project should NOT have a ghost .specweave/logs/
      const ghostLogs = path.join(projectDir, '.specweave', 'logs');
      expect(fs.existsSync(ghostLogs)).toBe(false);

      // Migration log should exist in umbrella instead
      const umbrellaLogs = path.join(plan.umbrellaPath, '.specweave', 'logs', 'migration.log');
      expect(fs.existsSync(umbrellaLogs)).toBe(true);
    });
  });
});
