/**
 * Sync Progress Command Tests
 *
 * Tests for all helper functions in sync-progress.ts:
 * - parseArgs: CLI argument parsing
 * - isProviderConfigured / isGitHubConfigured / isJiraConfigured / isAdoConfigured
 * - checkExistingGitHubIssue: metadata.json inspection
 * - detectActiveIncrement: state file + ActiveIncrementManager fallback
 * - findIncrementPath: active/archive/prefix resolution
 * - syncProgress: integration-level with mocked deps
 *
 * Uses vi.hoisted() + vi.mock() pattern for ESM compatibility.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ─── Hoisted mocks ──────────────────────────────────────────────────
const {
  mockLivingDocsSyncInstance,
  MockLivingDocsSync,
  mockAutoCreateExternalIssue,
  mockConfigManagerInstance,
  MockConfigManager,
  mockActiveIncrementManagerInstance,
  MockActiveIncrementManager,
  mockSyncCoordinatorInstance,
  MockSyncCoordinator,
  mockFsReadFile,
  mockFsReaddir,
} = vi.hoisted(() => {
  const _mockLivingDocsSyncInstance = {
    syncIncrement: vi.fn().mockResolvedValue({
      success: true,
      featureId: 'feat-test',
      incrementId: '0001',
      filesCreated: [],
      filesUpdated: [],
      errors: [],
    }),
  };

  class _MockLivingDocsSync {
    syncIncrement = _mockLivingDocsSyncInstance.syncIncrement;
    constructor() {}
  }

  const _mockAutoCreateExternalIssue = vi.fn().mockResolvedValue({
    success: true,
    provider: 'github',
    issueNumber: 42,
    issueUrl: 'https://github.com/test/repo/issues/42',
    skipped: false,
  });

  const _mockConfigManagerInstance = {
    read: vi.fn().mockResolvedValue({}),
  };

  class _MockConfigManager {
    read = _mockConfigManagerInstance.read;
    constructor() {}
  }

  const _mockActiveIncrementManagerInstance = {
    getActive: vi.fn().mockReturnValue([]),
  };

  class _MockActiveIncrementManager {
    getActive = _mockActiveIncrementManagerInstance.getActive;
    constructor() {}
  }

  const _mockSyncCoordinatorInstance = {
    syncACCheckboxesToGitHub: vi.fn().mockResolvedValue({
      success: true,
      updated: 0,
      issues: [],
    }),
  };

  class _MockSyncCoordinator {
    syncACCheckboxesToGitHub = _mockSyncCoordinatorInstance.syncACCheckboxesToGitHub;
    constructor() {}
  }

  return {
    mockLivingDocsSyncInstance: _mockLivingDocsSyncInstance,
    MockLivingDocsSync: _MockLivingDocsSync,
    mockAutoCreateExternalIssue: _mockAutoCreateExternalIssue,
    mockConfigManagerInstance: _mockConfigManagerInstance,
    MockConfigManager: _MockConfigManager,
    mockActiveIncrementManagerInstance: _mockActiveIncrementManagerInstance,
    MockActiveIncrementManager: _MockActiveIncrementManager,
    mockSyncCoordinatorInstance: _mockSyncCoordinatorInstance,
    MockSyncCoordinator: _MockSyncCoordinator,
    mockFsReadFile: vi.fn(),
    mockFsReaddir: vi.fn(),
  };
});

vi.mock('../../../../src/core/living-docs/living-docs-sync.js', () => ({
  LivingDocsSync: MockLivingDocsSync,
}));

vi.mock('../../../../src/sync/external-issue-auto-creator.js', () => ({
  autoCreateExternalIssue: mockAutoCreateExternalIssue,
}));

vi.mock('../../../../src/core/config/config-manager.js', () => ({
  ConfigManager: MockConfigManager,
}));

vi.mock('../../../../src/core/increment/active-increment-manager.js', () => ({
  ActiveIncrementManager: MockActiveIncrementManager,
}));

vi.mock('../../../../src/sync/sync-coordinator.js', () => ({
  SyncCoordinator: MockSyncCoordinator,
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  readFile: mockFsReadFile,
  readdir: mockFsReaddir,
}));

// Import the module under test AFTER mocks
import { syncProgress } from '../../../../src/cli/commands/sync-progress.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createSilentLogger() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

function createTempProject() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-progress-test-'));
  const specweaveDir = path.join(tempDir, '.specweave');
  const incrementsDir = path.join(specweaveDir, 'increments');
  const stateDir = path.join(specweaveDir, 'state');
  const archiveDir = path.join(incrementsDir, '_archive');

  fs.mkdirSync(incrementsDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });

  return { tempDir, specweaveDir, incrementsDir, stateDir, archiveDir };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('sync-progress command', () => {
  let tempDir: string;
  let incrementsDir: string;
  let stateDir: string;
  let archiveDir: string;
  let logger: ReturnType<typeof createSilentLogger>;
  let originalCwd: string;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const project = createTempProject();
    tempDir = project.tempDir;
    incrementsDir = project.incrementsDir;
    stateDir = project.stateDir;
    archiveDir = project.archiveDir;

    logger = createSilentLogger();
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Prevent actual process.exit
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    // Reset all mocks
    vi.clearAllMocks();

    // Default config: no sync configured
    mockConfigManagerInstance.read.mockResolvedValue({});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    processExitSpy.mockRestore();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // parseArgs — tested through syncProgress behavior
  // ═══════════════════════════════════════════════════════════════════

  describe('parseArgs (via syncProgress)', () => {
    it('should accept positional incrementId', async () => {
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['0001-test-feature'], { logger });

      // Should not exit (increment found)
      expect(processExitSpy).not.toHaveBeenCalled();
      // Logger should show the increment
      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('0001-test-feature');
    });

    it('should accept --dry-run flag', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['0001-test', '--dry-run'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('DRY-RUN');
    });

    it('should accept --force flag', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['--force', '0001-test'], { logger });

      // Force should be passed to living docs sync
      expect(mockLivingDocsSyncInstance.syncIncrement).toHaveBeenCalledWith(
        '0001-test',
        expect.objectContaining({ force: true })
      );
    });

    it('should accept --no-create flag and skip issue creation', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpsertInternalItems: true },
        },
      });

      await syncProgress(['0001-test', '--no-create'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('--no-create');
      expect(mockAutoCreateExternalIssue).not.toHaveBeenCalled();
    });

    it('should accept --no-github flag', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpdateExternalItems: true },
        },
      });

      await syncProgress(['0001-test', '--no-github'], { logger });

      expect(mockAutoCreateExternalIssue).not.toHaveBeenCalled();
      expect(mockSyncCoordinatorInstance.syncACCheckboxesToGitHub).not.toHaveBeenCalled();
    });

    it('should accept --no-jira flag', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          jira: { enabled: true },
          settings: { canUpdateExternalItems: true },
        },
      });

      await syncProgress(['0001-test', '--no-jira'], { logger });

      // Jira integration should be detected but skipped
      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).not.toContain('JIRA integration detected');
    });

    it('should accept --no-ado flag', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          ado: { enabled: true },
          settings: { canUpdateExternalItems: true },
        },
      });

      await syncProgress(['0001-test', '--no-ado'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).not.toContain('Azure DevOps integration detected');
    });

    it('should handle multiple flags combined', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['--dry-run', '--no-create', '--no-github', '--no-jira', '--no-ado', '--force', '0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('DRY-RUN');
      // In dry-run mode, living docs sync should not be called
      expect(mockLivingDocsSyncInstance.syncIncrement).not.toHaveBeenCalled();
    });

    it('should use first positional arg as incrementId, ignoring subsequent positional args', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['0001-test', '0002-other'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('0001-test');
    });

    it('should ignore unknown flags', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['--unknown-flag', '0001-test'], { logger });

      expect(processExitSpy).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // isProviderConfigured — tested through syncProgress config detection
  // ═══════════════════════════════════════════════════════════════════

  describe('isProviderConfigured (via config detection)', () => {
    beforeEach(() => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });
    });

    it('should detect GitHub via sync.github.enabled', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: { github: { enabled: true } },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('GitHub integration detected');
    });

    it('should detect GitHub via sync.profiles', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          profiles: {
            main: { provider: 'github', org: 'test', repo: 'repo' },
          },
        },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('GitHub integration detected');
    });

    it('should detect GitHub via issueTracker.provider', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        issueTracker: { provider: 'github' },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('GitHub integration detected');
    });

    it('should detect JIRA via sync.jira.enabled', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: { jira: { enabled: true } },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('JIRA integration detected');
    });

    it('should detect JIRA via sync.profiles', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          profiles: {
            jira_profile: { provider: 'jira', url: 'https://jira.example.com' },
          },
        },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('JIRA integration detected');
    });

    it('should detect JIRA via issueTracker.provider', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        issueTracker: { provider: 'jira' },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('JIRA integration detected');
    });

    it('should detect ADO via sync.ado.enabled', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: { ado: { enabled: true } },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('Azure DevOps integration detected');
    });

    it('should detect ADO via azure-devops alias in profiles', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          profiles: {
            ado_profile: { provider: 'azure-devops', org: 'myorg' },
          },
        },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('Azure DevOps integration detected');
    });

    it('should detect ADO via azure-devops alias in issueTracker', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        issueTracker: { provider: 'azure-devops' },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('Azure DevOps integration detected');
    });

    it('should report no external tools when nothing configured', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({});

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('No external tools configured');
    });

    it('should detect multiple providers simultaneously', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          jira: { enabled: true },
          ado: { enabled: true },
        },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('GitHub integration detected');
      expect(logCalls).toContain('JIRA integration detected');
      expect(logCalls).toContain('Azure DevOps integration detected');
    });

    it('should not detect provider when enabled=false', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: { github: { enabled: false } },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('No external tools configured');
    });

    it('should detect provider from profiles even without explicit enabled flag', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          profiles: {
            p1: { provider: 'github' },
            p2: { provider: 'jira' },
          },
        },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('GitHub integration detected');
      expect(logCalls).toContain('JIRA integration detected');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // checkExistingGitHubIssue — tested through syncProgress auto-create
  // ═══════════════════════════════════════════════════════════════════

  describe('checkExistingGitHubIssue (via auto-create flow)', () => {
    beforeEach(() => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpsertInternalItems: true },
        },
      });
    });

    it('should auto-create when no metadata.json exists', async () => {
      const incDir = path.join(incrementsDir, '0001-no-metadata');
      fs.mkdirSync(incDir, { recursive: true });

      mockFsReadFile.mockRejectedValue(new Error('ENOENT'));

      await syncProgress(['0001-no-metadata'], { logger });

      expect(mockAutoCreateExternalIssue).toHaveBeenCalled();
    });

    it('should skip auto-create when metadata.github.issue exists', async () => {
      const incDir = path.join(incrementsDir, '0001-has-issue');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ github: { issue: 42 } })
      );

      // Mock readFile to return metadata with github.issue
      mockFsReadFile.mockResolvedValue(
        JSON.stringify({ github: { issue: 42 } })
      );

      await syncProgress(['0001-has-issue'], { logger });

      expect(mockAutoCreateExternalIssue).not.toHaveBeenCalled();
      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('GitHub issue already exists');
    });

    it('should skip auto-create when metadata.github.issues has items', async () => {
      const incDir = path.join(incrementsDir, '0001-has-issues');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ github: { issues: [42, 43] } })
      );

      mockFsReadFile.mockResolvedValue(
        JSON.stringify({ github: { issues: [42, 43] } })
      );

      await syncProgress(['0001-has-issues'], { logger });

      expect(mockAutoCreateExternalIssue).not.toHaveBeenCalled();
    });

    it('should skip auto-create when metadata.external_sync.github.issueNumber exists', async () => {
      const incDir = path.join(incrementsDir, '0001-ext-sync');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ external_sync: { github: { issueNumber: 99 } } })
      );

      mockFsReadFile.mockResolvedValue(
        JSON.stringify({ external_sync: { github: { issueNumber: 99 } } })
      );

      await syncProgress(['0001-ext-sync'], { logger });

      expect(mockAutoCreateExternalIssue).not.toHaveBeenCalled();
    });

    it('should auto-create when metadata exists but has no github info', async () => {
      const incDir = path.join(incrementsDir, '0001-no-gh');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ name: 'test', status: 'active' })
      );

      mockFsReadFile.mockResolvedValue(
        JSON.stringify({ name: 'test', status: 'active' })
      );

      await syncProgress(['0001-no-gh'], { logger });

      expect(mockAutoCreateExternalIssue).toHaveBeenCalled();
    });

    it('should auto-create when metadata.github.issues is empty array', async () => {
      const incDir = path.join(incrementsDir, '0001-empty-issues');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ github: { issues: [] } })
      );

      mockFsReadFile.mockResolvedValue(
        JSON.stringify({ github: { issues: [] } })
      );

      await syncProgress(['0001-empty-issues'], { logger });

      expect(mockAutoCreateExternalIssue).toHaveBeenCalled();
    });

    it('should not auto-create in dry-run mode', async () => {
      const incDir = path.join(incrementsDir, '0001-dry');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['0001-dry', '--dry-run'], { logger });

      expect(mockAutoCreateExternalIssue).not.toHaveBeenCalled();
      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('DRY-RUN');
    });

    it('should not auto-create when permissions not enabled', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpsertInternalItems: false, canUpdateExternalItems: false },
        },
      });

      const incDir = path.join(incrementsDir, '0001-no-perms');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['0001-no-perms'], { logger });

      expect(mockAutoCreateExternalIssue).not.toHaveBeenCalled();
      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('permissions not enabled');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // detectActiveIncrement — tested through syncProgress without id
  // ═══════════════════════════════════════════════════════════════════

  describe('detectActiveIncrement (via syncProgress without incrementId)', () => {
    it('should detect increment from active-increment.json', async () => {
      const incDir = path.join(incrementsDir, '0001-from-state');
      fs.mkdirSync(incDir, { recursive: true });

      // Create active-increment.json
      fs.writeFileSync(
        path.join(stateDir, 'active-increment.json'),
        JSON.stringify({ ids: ['0001-from-state'], lastUpdated: new Date().toISOString() })
      );

      // Mock fs-native readFile to return state file
      mockFsReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('active-increment.json')) {
          return JSON.stringify({ ids: ['0001-from-state'], lastUpdated: new Date().toISOString() });
        }
        throw new Error('ENOENT');
      });

      await syncProgress([], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('Auto-detected active increment');
      expect(logCalls).toContain('0001-from-state');
    });

    it('should fall back to ActiveIncrementManager when state file missing', async () => {
      const incDir = path.join(incrementsDir, '0002-from-manager');
      fs.mkdirSync(incDir, { recursive: true });

      mockActiveIncrementManagerInstance.getActive.mockReturnValue(['0002-from-manager']);

      // No state file exists, readFile throws
      mockFsReadFile.mockRejectedValue(new Error('ENOENT'));

      await syncProgress([], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('0002-from-manager');
    });

    it('should exit with error when no active increment found', async () => {
      mockFsReadFile.mockRejectedValue(new Error('ENOENT'));
      mockActiveIncrementManagerInstance.getActive.mockReturnValue([]);

      await syncProgress([], { logger });

      expect(processExitSpy).toHaveBeenCalledWith(1);
      const errorCalls = logger.error.mock.calls.flat().join(' ');
      expect(errorCalls).toContain('No active increment found');
    });

    it('should use first increment from state file ids array', async () => {
      const incDir1 = path.join(incrementsDir, '0001-first');
      const incDir2 = path.join(incrementsDir, '0002-second');
      fs.mkdirSync(incDir1, { recursive: true });
      fs.mkdirSync(incDir2, { recursive: true });

      fs.writeFileSync(
        path.join(stateDir, 'active-increment.json'),
        JSON.stringify({ ids: ['0001-first', '0002-second'], lastUpdated: new Date().toISOString() })
      );

      mockFsReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('active-increment.json')) {
          return JSON.stringify({ ids: ['0001-first', '0002-second'] });
        }
        throw new Error('ENOENT');
      });

      await syncProgress([], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('0001-first');
    });

    it('should handle empty ids array in state file', async () => {
      fs.writeFileSync(
        path.join(stateDir, 'active-increment.json'),
        JSON.stringify({ ids: [], lastUpdated: new Date().toISOString() })
      );

      mockFsReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('active-increment.json')) {
          return JSON.stringify({ ids: [] });
        }
        throw new Error('ENOENT');
      });

      mockActiveIncrementManagerInstance.getActive.mockReturnValue([]);

      await syncProgress([], { logger });

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle malformed JSON in state file gracefully', async () => {
      fs.writeFileSync(
        path.join(stateDir, 'active-increment.json'),
        'not valid json{'
      );

      mockFsReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('active-increment.json')) {
          return 'not valid json{';
        }
        throw new Error('ENOENT');
      });

      mockActiveIncrementManagerInstance.getActive.mockReturnValue([]);

      await syncProgress([], { logger });

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // findIncrementPath — tested through syncProgress path resolution
  // ═══════════════════════════════════════════════════════════════════

  describe('findIncrementPath (via syncProgress)', () => {
    it('should find increment in active directory (exact match)', async () => {
      const incDir = path.join(incrementsDir, '0001-exact');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['0001-exact'], { logger });

      expect(processExitSpy).not.toHaveBeenCalled();
      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('0001-exact');
    });

    it('should find increment in archive directory', async () => {
      const incDir = path.join(archiveDir, '0001-archived');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['0001-archived'], { logger });

      expect(processExitSpy).not.toHaveBeenCalled();
      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('ARCHIVED');
    });

    it('should find increment by prefix in active directory', async () => {
      const incDir = path.join(incrementsDir, '0001-some-long-feature-name');
      fs.mkdirSync(incDir, { recursive: true });

      // readdir returns the entries of increments dir
      mockFsReaddir.mockResolvedValue(['0001-some-long-feature-name', '_archive']);

      await syncProgress(['0001'], { logger });

      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should find increment by prefix in archive directory', async () => {
      const incDir = path.join(archiveDir, '0001-archived-feature');
      fs.mkdirSync(incDir, { recursive: true });

      mockFsReaddir.mockImplementation(async (dirPath: string) => {
        if (dirPath.endsWith('_archive')) {
          return ['0001-archived-feature'];
        }
        return ['_archive'];
      });

      await syncProgress(['0001'], { logger });

      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should exit with error when increment not found anywhere', async () => {
      mockFsReaddir.mockResolvedValue(['_archive']);

      await syncProgress(['9999-nonexistent'], { logger });

      expect(processExitSpy).toHaveBeenCalledWith(1);
      const errorCalls = logger.error.mock.calls.flat().join(' ');
      expect(errorCalls).toContain('not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Living docs sync integration
  // ═══════════════════════════════════════════════════════════════════

  describe('living docs sync', () => {
    beforeEach(() => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });
    });

    it('should call LivingDocsSync.syncIncrement in normal mode', async () => {
      await syncProgress(['0001-test'], { logger });

      expect(mockLivingDocsSyncInstance.syncIncrement).toHaveBeenCalledWith(
        '0001-test',
        expect.any(Object)
      );
    });

    it('should not call LivingDocsSync.syncIncrement in dry-run mode', async () => {
      await syncProgress(['0001-test', '--dry-run'], { logger });

      expect(mockLivingDocsSyncInstance.syncIncrement).not.toHaveBeenCalled();
    });

    it('should handle living docs sync failure gracefully', async () => {
      mockLivingDocsSyncInstance.syncIncrement.mockResolvedValue({
        success: false,
        errors: ['Missing spec.md'],
        featureId: '',
        incrementId: '0001-test',
        filesCreated: [],
        filesUpdated: [],
      });

      await syncProgress(['0001-test'], { logger });

      // Should not exit — warnings are captured
      expect(processExitSpy).not.toHaveBeenCalled();
      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('warnings');
    });

    it('should pass force option to living docs sync', async () => {
      await syncProgress(['0001-test', '--force'], { logger });

      expect(mockLivingDocsSyncInstance.syncIncrement).toHaveBeenCalledWith(
        '0001-test',
        { force: true }
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // External sync (AC checkboxes)
  // ═══════════════════════════════════════════════════════════════════

  describe('external AC checkbox sync', () => {
    beforeEach(() => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });
    });

    it('should sync AC checkboxes when GitHub configured with permissions', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpdateExternalItems: true },
        },
      });

      await syncProgress(['0001-test'], { logger });

      expect(mockSyncCoordinatorInstance.syncACCheckboxesToGitHub).toHaveBeenCalled();
    });

    it('should not sync AC checkboxes when permissions disabled', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpdateExternalItems: false, canUpsertInternalItems: false },
        },
      });

      await syncProgress(['0001-test'], { logger });

      expect(mockSyncCoordinatorInstance.syncACCheckboxesToGitHub).not.toHaveBeenCalled();
    });

    it('should not sync AC checkboxes in dry-run mode', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpdateExternalItems: true },
        },
      });

      await syncProgress(['0001-test', '--dry-run'], { logger });

      expect(mockSyncCoordinatorInstance.syncACCheckboxesToGitHub).not.toHaveBeenCalled();
    });

    it('should not sync AC checkboxes when --no-github flag set', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpdateExternalItems: true },
        },
      });

      await syncProgress(['0001-test', '--no-github'], { logger });

      expect(mockSyncCoordinatorInstance.syncACCheckboxesToGitHub).not.toHaveBeenCalled();
    });

    it('should handle AC sync errors gracefully', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpdateExternalItems: true },
        },
      });

      mockSyncCoordinatorInstance.syncACCheckboxesToGitHub.mockRejectedValue(
        new Error('Rate limited')
      );

      await syncProgress(['0001-test'], { logger });

      // Should not crash — warning captured
      expect(processExitSpy).not.toHaveBeenCalled();
      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('Rate limited');
    });

    it('should report updated AC checkbox count', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpdateExternalItems: true },
        },
      });

      mockSyncCoordinatorInstance.syncACCheckboxesToGitHub.mockResolvedValue({
        success: true,
        updated: 3,
        issues: [42, 43],
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('Updated 3 AC checkbox');
      expect(logCalls).toContain('2 issue(s)');
    });

    it('should report no changes when no AC checkboxes updated', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpdateExternalItems: true },
        },
      });

      mockSyncCoordinatorInstance.syncACCheckboxesToGitHub.mockResolvedValue({
        success: true,
        updated: 0,
        issues: [],
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('No AC checkbox changes needed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Permissions logic
  // ═══════════════════════════════════════════════════════════════════

  describe('permissions', () => {
    beforeEach(() => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });
    });

    it('should allow auto-create when canUpsertInternalItems=true', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpsertInternalItems: true },
        },
      });

      mockFsReadFile.mockRejectedValue(new Error('ENOENT'));

      await syncProgress(['0001-test'], { logger });

      expect(mockAutoCreateExternalIssue).toHaveBeenCalled();
    });

    it('should allow auto-create when canUpdateExternalItems=true', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpdateExternalItems: true },
        },
      });

      mockFsReadFile.mockRejectedValue(new Error('ENOENT'));

      await syncProgress(['0001-test'], { logger });

      expect(mockAutoCreateExternalIssue).toHaveBeenCalled();
    });

    it('should block auto-create when both permissions are false', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpsertInternalItems: false, canUpdateExternalItems: false },
        },
      });

      await syncProgress(['0001-test'], { logger });

      expect(mockAutoCreateExternalIssue).not.toHaveBeenCalled();
    });

    it('should block auto-create when settings object is missing', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
        },
      });

      await syncProgress(['0001-test'], { logger });

      expect(mockAutoCreateExternalIssue).not.toHaveBeenCalled();
    });

    it('should log permissions status', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          settings: { canUpsertInternalItems: true, canUpdateExternalItems: false },
        },
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('canUpsertInternalItems=true');
      expect(logCalls).toContain('canUpdateExternalItems=false');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Auto-create result handling
  // ═══════════════════════════════════════════════════════════════════

  describe('auto-create result handling', () => {
    beforeEach(() => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpsertInternalItems: true },
        },
      });

      mockFsReadFile.mockRejectedValue(new Error('ENOENT'));
    });

    it('should report successful issue creation', async () => {
      mockAutoCreateExternalIssue.mockResolvedValue({
        success: true,
        provider: 'github',
        issueNumber: 42,
        skipped: false,
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('auto-created');
      expect(logCalls).toContain('#42');
    });

    it('should report skipped issue creation', async () => {
      mockAutoCreateExternalIssue.mockResolvedValue({
        success: true,
        provider: 'github',
        skipped: true,
        skipReason: 'No GitHub token configured',
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('Skipped');
      expect(logCalls).toContain('No GitHub token configured');
    });

    it('should report failed issue creation as warning', async () => {
      mockAutoCreateExternalIssue.mockResolvedValue({
        success: false,
        provider: 'github',
        error: 'API rate limited',
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('creation failed');
      expect(logCalls).toContain('API rate limited');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Final report
  // ═══════════════════════════════════════════════════════════════════

  describe('final report', () => {
    beforeEach(() => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });
    });

    it('should show completion message', async () => {
      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('PROGRESS SYNC COMPLETE');
    });

    it('should show next steps', async () => {
      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('sw:validate');
      expect(logCalls).toContain('sw:done');
    });

    it('should include warnings in final report', async () => {
      mockLivingDocsSyncInstance.syncIncrement.mockResolvedValue({
        success: false,
        errors: ['Some warning'],
        featureId: '',
        incrementId: '0001-test',
        filesCreated: [],
        filesUpdated: [],
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('Warnings');
    });

    it('should show living docs synced in report when successful', async () => {
      mockLivingDocsSyncInstance.syncIncrement.mockResolvedValue({
        success: true,
        featureId: 'feat-test',
        incrementId: '0001-test',
        filesCreated: [],
        filesUpdated: [],
        errors: [],
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('Living docs');
    });

    it('should show auto-created issue in final report', async () => {
      mockConfigManagerInstance.read.mockResolvedValue({
        sync: {
          github: { enabled: true },
          settings: { canUpsertInternalItems: true },
        },
      });

      mockFsReadFile.mockRejectedValue(new Error('ENOENT'));

      mockAutoCreateExternalIssue.mockResolvedValue({
        success: true,
        provider: 'github',
        issueNumber: 55,
        skipped: false,
      });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('AUTO-CREATED');
      expect(logCalls).toContain('#55');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Error handling
  // ═══════════════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('should exit with error when increment not found', async () => {
      mockFsReaddir.mockResolvedValue(['_archive']);

      await syncProgress(['9999'], { logger });

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit with error on unexpected exception', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      mockLivingDocsSyncInstance.syncIncrement.mockRejectedValue(
        new Error('Unexpected crash')
      );

      await syncProgress(['0001-test'], { logger });

      expect(processExitSpy).toHaveBeenCalledWith(1);
      const errorCalls = logger.error.mock.calls.flat().join(' ');
      expect(errorCalls).toContain('Unexpected crash');
    });

    it('should handle ConfigManager.read failure', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      // Ensure syncIncrement succeeds so execution reaches configManager.read
      mockLivingDocsSyncInstance.syncIncrement.mockResolvedValue({
        success: true,
        featureId: 'feat-test',
        incrementId: '0001-test',
        filesCreated: [],
        filesUpdated: [],
        errors: [],
      });

      mockConfigManagerInstance.read.mockRejectedValue(
        new Error('Config file corrupted')
      );

      await syncProgress(['0001-test'], { logger });

      expect(processExitSpy).toHaveBeenCalledWith(1);
      const errorCalls = logger.error.mock.calls.flat().join(' ');
      expect(errorCalls).toContain('Config file corrupted');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Archived increment handling
  // ═══════════════════════════════════════════════════════════════════

  describe('archived increment handling', () => {
    it('should detect and report archived status', async () => {
      const incDir = path.join(archiveDir, '0001-completed-feature');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['0001-completed-feature'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('ARCHIVED');
    });

    it('should not report archived status for active increments', async () => {
      const incDir = path.join(incrementsDir, '0001-active-feature');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['0001-active-feature'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).not.toContain('ARCHIVED');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Logger handling
  // ═══════════════════════════════════════════════════════════════════

  describe('logger', () => {
    it('should use provided logger', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      const customLogger = createSilentLogger();
      await syncProgress(['0001-test'], { logger: customLogger });

      expect(customLogger.log).toHaveBeenCalled();
    });

    it('should show header banner', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      await syncProgress(['0001-test'], { logger });

      const logCalls = logger.log.mock.calls.flat().join(' ');
      expect(logCalls).toContain('COMPREHENSIVE PROGRESS SYNC');
    });
  });
});
