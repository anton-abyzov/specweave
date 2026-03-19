/**
 * Unit tests for workspace-migrator.ts
 * Covers T-001 through T-010: types, migration paths, idempotency, logging, error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import * as os from 'os';
import { migrateToWorkspace } from '../../../src/core/config/workspace-migrator.js';
import { ConfigManager } from '../../../src/core/config/config-manager.js';
import type {
  WorkspaceConfig,
  WorkspaceRepo,
  WorkspaceRepoSync,
  SpecWeaveConfig,
  UmbrellaConfig,
  MultiProjectConfig,
  ProjectMappings,
} from '../../../src/core/config/types.js';

// ═══════════════════════════════════════════════════════════════════
// T-001: Type shape validation
// ═══════════════════════════════════════════════════════════════════

describe('WorkspaceConfig types (T-001)', () => {
  it('WorkspaceRepoSync has github, jira, ado optional fields', () => {
    const sync: WorkspaceRepoSync = {};
    expect(sync).toBeDefined();

    const syncFull: WorkspaceRepoSync = {
      github: { owner: 'acme', repo: 'fe' },
      jira: { projectKey: 'FE' },
      ado: { organization: 'acme', project: 'frontend' },
    };
    expect(syncFull.github?.owner).toBe('acme');
    expect(syncFull.jira?.projectKey).toBe('FE');
    expect(syncFull.ado?.project).toBe('frontend');
  });

  it('WorkspaceRepo has required id, path, prefix and optional fields', () => {
    const repo: WorkspaceRepo = {
      id: 'frontend',
      path: 'repositories/org/frontend',
      prefix: 'FE',
    };
    expect(repo.id).toBe('frontend');
    expect(repo.path).toBe('repositories/org/frontend');
    expect(repo.prefix).toBe('FE');

    const repoFull: WorkspaceRepo = {
      id: 'frontend',
      path: 'repositories/org/frontend',
      prefix: 'FE',
      name: 'Frontend App',
      techStack: ['React', 'TypeScript'],
      role: 'frontend',
      sync: {
        github: { owner: 'acme', repo: 'fe' },
      },
    };
    expect(repoFull.name).toBe('Frontend App');
    expect(repoFull.techStack).toEqual(['React', 'TypeScript']);
    expect(repoFull.role).toBe('frontend');
    expect(repoFull.sync?.github?.owner).toBe('acme');
  });

  it('WorkspaceConfig has name, optional rootRepo, and repos array', () => {
    const ws: WorkspaceConfig = {
      name: 'my-workspace',
      repos: [],
    };
    expect(ws.name).toBe('my-workspace');
    expect(ws.repos).toEqual([]);

    const wsFull: WorkspaceConfig = {
      name: 'my-workspace',
      rootRepo: {
        github: { owner: 'acme', repo: 'umbrella' },
      },
      repos: [
        { id: 'fe', path: 'repositories/org/fe', prefix: 'FE' },
      ],
    };
    expect(wsFull.rootRepo?.github?.owner).toBe('acme');
    expect(wsFull.repos).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// T-002: workspace field on SpecWeaveConfig
// ═══════════════════════════════════════════════════════════════════

describe('SpecWeaveConfig workspace field (T-002)', () => {
  it('accepts workspace field on SpecWeaveConfig', () => {
    const config: SpecWeaveConfig = {
      version: '3.0',
      workspace: {
        name: 'test',
        repos: [],
      },
    };
    expect(config.workspace).toBeDefined();
    expect(config.workspace!.name).toBe('test');
  });

  it('umbrella, multiProject, projectMappings fields still exist (deprecated)', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        childRepos: [],
      },
      multiProject: {
        enabled: true,
      },
      projectMappings: {},
    };
    // These should still compile but are deprecated
    expect(config.umbrella).toBeDefined();
    expect(config.multiProject).toBeDefined();
    expect(config.projectMappings).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// T-004: umbrella → workspace migration
// ═══════════════════════════════════════════════════════════════════

describe('migrateToWorkspace — umbrella migration (T-004)', () => {
  it('converts umbrella.childRepos to workspace.repos', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        projectName: 'my-project',
        childRepos: [
          {
            id: 'frontend',
            path: 'repositories/org/frontend',
            prefix: 'FE',
            name: 'Frontend App',
            techStack: ['React'],
            role: 'frontend',
            sync: {
              github: { owner: 'acme', repo: 'frontend' },
              jira: { projectKey: 'FE' },
            },
          },
          {
            id: 'backend',
            path: 'repositories/org/backend',
            prefix: 'BE',
            role: 'backend',
          },
        ],
        sync: {
          github: { owner: 'acme', repo: 'umbrella' },
        },
      },
    };

    const result = migrateToWorkspace(config);

    expect(result.workspace).toBeDefined();
    expect(result.workspace!.name).toBe('my-project');
    expect(result.workspace!.repos).toHaveLength(2);

    const feRepo = result.workspace!.repos.find(r => r.id === 'frontend');
    expect(feRepo).toBeDefined();
    expect(feRepo!.path).toBe('repositories/org/frontend');
    expect(feRepo!.prefix).toBe('FE');
    expect(feRepo!.name).toBe('Frontend App');
    expect(feRepo!.techStack).toEqual(['React']);
    expect(feRepo!.role).toBe('frontend');
    expect(feRepo!.sync?.github?.owner).toBe('acme');
    expect(feRepo!.sync?.jira?.projectKey).toBe('FE');

    const beRepo = result.workspace!.repos.find(r => r.id === 'backend');
    expect(beRepo).toBeDefined();
    expect(beRepo!.prefix).toBe('BE');

    // rootRepo from umbrella.sync
    expect(result.workspace!.rootRepo?.github?.owner).toBe('acme');
    expect(result.workspace!.rootRepo?.github?.repo).toBe('umbrella');

    // umbrella key removed
    expect(result.umbrella).toBeUndefined();
  });

  it('uses project.name as fallback when umbrella.projectName is missing', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      project: { name: 'fallback-name' },
      umbrella: {
        enabled: true,
        childRepos: [],
      },
    };

    const result = migrateToWorkspace(config);
    expect(result.workspace!.name).toBe('fallback-name');
  });

  it('defaults workspace.name to "workspace" when no name available', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        childRepos: [],
      },
    };

    const result = migrateToWorkspace(config);
    expect(result.workspace!.name).toBe('workspace');
  });
});

// ═══════════════════════════════════════════════════════════════════
// T-005: multiProject → workspace migration
// ═══════════════════════════════════════════════════════════════════

describe('migrateToWorkspace — multiProject migration (T-005)', () => {
  it('converts multiProject.projects to workspace.repos', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      multiProject: {
        enabled: true,
        projects: {
          'web-app': {
            name: 'Web Application',
            description: 'Customer-facing web app',
            techStack: ['React', 'TypeScript'],
            team: 'Frontend Team',
          },
          'mobile-app': {
            name: 'Mobile Application',
            description: 'iOS and Android',
            techStack: ['React Native'],
            team: 'Mobile Team',
          },
        },
      },
    };

    const result = migrateToWorkspace(config);

    expect(result.workspace).toBeDefined();
    expect(result.workspace!.repos).toHaveLength(2);

    const webRepo = result.workspace!.repos.find(r => r.id === 'web-app');
    expect(webRepo).toBeDefined();
    expect(webRepo!.name).toBe('Web Application');
    expect(webRepo!.techStack).toEqual(['React', 'TypeScript']);

    const mobileRepo = result.workspace!.repos.find(r => r.id === 'mobile-app');
    expect(mobileRepo).toBeDefined();

    // multiProject key removed
    expect(result.multiProject).toBeUndefined();
  });

  it('deduplicates by id — umbrella entries take precedence', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        projectName: 'test',
        childRepos: [
          {
            id: 'frontend',
            path: 'repositories/org/frontend',
            prefix: 'FE',
            role: 'frontend',
          },
        ],
      },
      multiProject: {
        enabled: true,
        projects: {
          'frontend': {
            name: 'Frontend (from multiProject)',
            description: 'Should not override umbrella entry',
            techStack: ['Vue'],
            team: 'Team A',
          },
          'backend': {
            name: 'Backend API',
            description: 'New entry from multiProject',
            techStack: ['Node.js'],
            team: 'Team B',
          },
        },
      },
    };

    const result = migrateToWorkspace(config);

    expect(result.workspace!.repos).toHaveLength(2);

    // umbrella entry preserved (not overridden by multiProject)
    const feRepo = result.workspace!.repos.find(r => r.id === 'frontend');
    expect(feRepo!.prefix).toBe('FE');
    expect(feRepo!.role).toBe('frontend');

    // new multiProject entry added
    const beRepo = result.workspace!.repos.find(r => r.id === 'backend');
    expect(beRepo).toBeDefined();
    expect(beRepo!.name).toBe('Backend API');

    expect(result.umbrella).toBeUndefined();
    expect(result.multiProject).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// T-006: projectMappings → workspace.repos[].sync migration
// ═══════════════════════════════════════════════════════════════════

describe('migrateToWorkspace — projectMappings migration (T-006)', () => {
  it('merges projectMappings into workspace.repos[].sync', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        projectName: 'test',
        childRepos: [
          {
            id: 'frontend',
            path: 'repositories/org/frontend',
            prefix: 'FE',
          },
          {
            id: 'backend',
            path: 'repositories/org/backend',
            prefix: 'BE',
          },
        ],
      },
      projectMappings: {
        'frontend': {
          github: { owner: 'acme', repo: 'fe' },
          jira: { project: 'FE' },
        },
        'backend': {
          github: { owner: 'acme', repo: 'be' },
          ado: { project: 'backend-svc' },
        },
      },
    };

    const result = migrateToWorkspace(config);

    const feRepo = result.workspace!.repos.find(r => r.id === 'frontend');
    expect(feRepo!.sync?.github?.owner).toBe('acme');
    expect(feRepo!.sync?.github?.repo).toBe('fe');
    expect(feRepo!.sync?.jira?.projectKey).toBe('FE');

    const beRepo = result.workspace!.repos.find(r => r.id === 'backend');
    expect(beRepo!.sync?.github?.owner).toBe('acme');
    expect(beRepo!.sync?.github?.repo).toBe('be');
    expect(beRepo!.sync?.ado?.project).toBe('backend-svc');

    // projectMappings key removed
    expect(result.projectMappings).toBeUndefined();
  });

  it('does not overwrite existing sync from umbrella.childRepos', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        projectName: 'test',
        childRepos: [
          {
            id: 'frontend',
            path: 'repositories/org/frontend',
            prefix: 'FE',
            sync: {
              github: { owner: 'original', repo: 'original-fe' },
            },
          },
        ],
      },
      projectMappings: {
        'frontend': {
          github: { owner: 'mapping', repo: 'mapping-fe' },
          jira: { project: 'FE' },
        },
      },
    };

    const result = migrateToWorkspace(config);

    const feRepo = result.workspace!.repos.find(r => r.id === 'frontend');
    // Existing sync.github from umbrella should be preserved
    expect(feRepo!.sync?.github?.owner).toBe('original');
    expect(feRepo!.sync?.github?.repo).toBe('original-fe');
    // But jira from projectMappings should be merged in
    expect(feRepo!.sync?.jira?.projectKey).toBe('FE');
  });

  it('creates repos from projectMappings when no matching repo exists', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      projectMappings: {
        'orphan-project': {
          github: { owner: 'acme', repo: 'orphan' },
        },
      },
    };

    const result = migrateToWorkspace(config);

    const orphan = result.workspace!.repos.find(r => r.id === 'orphan-project');
    expect(orphan).toBeDefined();
    expect(orphan!.sync?.github?.owner).toBe('acme');
    expect(orphan!.path).toBe('');
    expect(orphan!.prefix).toBe('ORPHAN-PROJECT');
  });
});

// ═══════════════════════════════════════════════════════════════════
// T-007: Idempotency and version bump
// ═══════════════════════════════════════════════════════════════════

describe('migrateToWorkspace — idempotency (T-007)', () => {
  it('returns unchanged config when already migrated (workspace present, no legacy)', () => {
    const config: SpecWeaveConfig = {
      version: '3.0',
      workspace: {
        name: 'my-project',
        rootRepo: { github: { owner: 'acme', repo: 'umbrella' } },
        repos: [
          { id: 'fe', path: 'repos/fe', prefix: 'FE' },
        ],
      },
    };

    const result = migrateToWorkspace(config);

    expect(result).toEqual(config);
    expect(result.version).toBe('3.0');
  });

  it('bumps version to 3.0 on first migration', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        projectName: 'test',
        childRepos: [],
      },
    };

    const result = migrateToWorkspace(config);
    expect(result.version).toBe('3.0');
  });

  it('running migration twice produces identical results', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        projectName: 'test',
        childRepos: [
          { id: 'fe', path: 'repos/fe', prefix: 'FE' },
        ],
        sync: { github: { owner: 'acme', repo: 'umb' } },
      },
      multiProject: {
        enabled: true,
        projects: {
          'be': { name: 'Backend', description: 'API', techStack: [], team: 'X' },
        },
      },
    };

    const first = migrateToWorkspace(config);
    const second = migrateToWorkspace(first);

    expect(second).toEqual(first);
  });
});

// ═══════════════════════════════════════════════════════════════════
// T-009: Logging and error handling
// ═══════════════════════════════════════════════════════════════════

describe('migrateToWorkspace — logging (T-009)', () => {
  it('calls info logger on successful first migration', () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    const config: SpecWeaveConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        projectName: 'test',
        childRepos: [],
      },
    };

    migrateToWorkspace(config, logger);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Config migrated from v2.0 to v3.0')
    );
  });

  it('does not log on already-migrated config', () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    const config: SpecWeaveConfig = {
      version: '3.0',
      workspace: { name: 'test', repos: [] },
    };

    migrateToWorkspace(config, logger);

    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns original config and logs warning on error', () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    // Craft a config with a null entry in childRepos — accessing .id on null throws TypeError
    const config = {
      version: '2.0',
      umbrella: {
        enabled: true,
        projectName: 'test',
        childRepos: [null],
      },
    } as unknown as SpecWeaveConfig;

    const result = migrateToWorkspace(config, logger);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Migration failed')
    );
    // Original config returned untouched
    expect(result).toEqual(config);
  });
});

// ═══════════════════════════════════════════════════════════════════
// T-010: Comprehensive edge cases
// ═══════════════════════════════════════════════════════════════════

describe('migrateToWorkspace — comprehensive tests (T-010)', () => {
  it('handles config with no legacy keys and no workspace (fresh config)', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
    };

    const result = migrateToWorkspace(config);

    // No legacy keys means no migration needed, but we still shouldn't crash
    expect(result).toEqual(config);
  });

  it('handles umbrella-only config (no multiProject, no projectMappings)', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        projectName: 'solo-umbrella',
        childRepos: [
          { id: 'app', path: 'repos/app', prefix: 'APP' },
        ],
      },
    };

    const result = migrateToWorkspace(config);

    expect(result.workspace!.name).toBe('solo-umbrella');
    expect(result.workspace!.repos).toHaveLength(1);
    expect(result.umbrella).toBeUndefined();
    expect(result.version).toBe('3.0');
  });

  it('handles multiProject-only config (no umbrella, no projectMappings)', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      multiProject: {
        enabled: true,
        projects: {
          'api': { name: 'API', description: 'REST API', techStack: ['Node.js'], team: 'Backend' },
        },
      },
    };

    const result = migrateToWorkspace(config);

    expect(result.workspace!.repos).toHaveLength(1);
    expect(result.workspace!.repos[0].id).toBe('api');
    expect(result.multiProject).toBeUndefined();
    expect(result.version).toBe('3.0');
  });

  it('handles projectMappings-only config', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      projectMappings: {
        'frontend': {
          github: { owner: 'org', repo: 'fe' },
        },
      },
    };

    const result = migrateToWorkspace(config);

    expect(result.workspace!.repos).toHaveLength(1);
    expect(result.workspace!.repos[0].sync?.github?.owner).toBe('org');
    expect(result.projectMappings).toBeUndefined();
    expect(result.version).toBe('3.0');
  });

  it('handles all three legacy configs combined', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        projectName: 'mega-project',
        childRepos: [
          { id: 'frontend', path: 'repos/fe', prefix: 'FE' },
        ],
        sync: { github: { owner: 'org', repo: 'umbrella' } },
      },
      multiProject: {
        enabled: true,
        projects: {
          'backend': { name: 'Backend', description: 'API layer', techStack: ['Go'], team: 'BE' },
        },
      },
      projectMappings: {
        'frontend': {
          jira: { project: 'FE' },
        },
        'backend': {
          github: { owner: 'org', repo: 'backend' },
        },
      },
    };

    const result = migrateToWorkspace(config);

    expect(result.workspace!.name).toBe('mega-project');
    expect(result.workspace!.rootRepo?.github?.owner).toBe('org');
    expect(result.workspace!.repos).toHaveLength(2);

    const feRepo = result.workspace!.repos.find(r => r.id === 'frontend');
    expect(feRepo!.sync?.jira?.projectKey).toBe('FE');

    const beRepo = result.workspace!.repos.find(r => r.id === 'backend');
    expect(beRepo!.name).toBe('Backend');
    expect(beRepo!.sync?.github?.owner).toBe('org');

    expect(result.umbrella).toBeUndefined();
    expect(result.multiProject).toBeUndefined();
    expect(result.projectMappings).toBeUndefined();
    expect(result.version).toBe('3.0');
  });

  it('preserves non-legacy config keys during migration', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      language: 'en',
      testing: {
        defaultTestMode: 'TDD',
        defaultCoverageTarget: 90,
        coverageTargets: { unit: 95, integration: 90, e2e: 100 },
      },
      umbrella: {
        enabled: true,
        projectName: 'test',
        childRepos: [],
      },
    };

    const result = migrateToWorkspace(config);

    expect(result.language).toBe('en');
    expect(result.testing?.defaultTestMode).toBe('TDD');
    expect(result.workspace).toBeDefined();
    expect(result.umbrella).toBeUndefined();
  });

  it('handles umbrella.childRepos with legacy githubUrl/jiraProject/adoProject fields', () => {
    const config: SpecWeaveConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        projectName: 'legacy',
        childRepos: [
          {
            id: 'old-repo',
            path: 'repos/old',
            prefix: 'OLD',
            githubUrl: 'https://github.com/org/old-repo',
            jiraProject: 'OLD',
            adoProject: 'old-project',
          },
        ],
      },
    };

    const result = migrateToWorkspace(config);

    const repo = result.workspace!.repos.find(r => r.id === 'old-repo');
    expect(repo).toBeDefined();
    // Legacy fields should be ignored (not carried over), sync comes from .sync field
    expect(repo!.prefix).toBe('OLD');
  });
});

// ═══════════════════════════════════════════════════════════════════
// T-008: ConfigManager integration — auto-migrate on read, strip on write
// ═══════════════════════════════════════════════════════════════════

describe('ConfigManager workspace integration (T-008)', () => {
  const TEST_ROOT = path.join(
    os.tmpdir(),
    `specweave-test-ws-migrator-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  beforeEach(async () => {
    await fs.mkdir(path.join(TEST_ROOT, '.specweave'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
  });

  it('read() auto-migrates legacy umbrella config to workspace', async () => {
    const legacyConfig = {
      version: '2.0',
      umbrella: {
        enabled: true,
        projectName: 'my-project',
        childRepos: [
          { id: 'fe', path: 'repos/fe', prefix: 'FE' },
        ],
        sync: { github: { owner: 'org', repo: 'umb' } },
      },
    };
    await fs.writeFile(
      path.join(TEST_ROOT, '.specweave', 'config.json'),
      JSON.stringify(legacyConfig, null, 2),
    );

    const mgr = new ConfigManager(TEST_ROOT);
    const config = await mgr.read();

    expect(config.workspace).toBeDefined();
    expect(config.workspace!.name).toBe('my-project');
    expect(config.workspace!.repos).toHaveLength(1);
    expect(config.workspace!.repos[0].id).toBe('fe');
    expect(config.workspace!.rootRepo?.github?.owner).toBe('org');
    expect(config.umbrella).toBeUndefined();
    expect(config.version).toBe('3.0');
  });

  it('write() strips legacy keys when workspace is present', async () => {
    const config: SpecWeaveConfig = {
      version: '3.0',
      workspace: { name: 'test', repos: [] },
      umbrella: { enabled: true, childRepos: [] } as any,
      multiProject: { enabled: true } as any,
      projectMappings: {} as any,
    };

    const mgr = new ConfigManager(TEST_ROOT);
    await mgr.write(config);

    const written = JSON.parse(
      await fs.readFile(path.join(TEST_ROOT, '.specweave', 'config.json'), 'utf-8'),
    );

    expect(written.workspace).toBeDefined();
    expect(written.umbrella).toBeUndefined();
    expect(written.multiProject).toBeUndefined();
    expect(written.projectMappings).toBeUndefined();
  });
});
