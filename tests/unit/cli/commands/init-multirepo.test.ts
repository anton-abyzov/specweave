/**
 * Unit tests for init multi-repo flow (increment 0571)
 *
 * Tests: execution order fix, deferred multi-repo config, clone wiring,
 * sync-setup chain, next-steps messaging, resolve-structure deprecation.
 *
 * Uses vi.hoisted() + vi.mock() ESM mocking pattern.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
  mockExistsSync,
  mockReadJsonSync,
  mockWriteJsonSync,
  mockMkdirSync,
  mockReaddirSync,
  mockCopySync,
  mockEnsureDir,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadJsonSync: vi.fn(),
  mockWriteJsonSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockReaddirSync: vi.fn().mockReturnValue([]),
  mockCopySync: vi.fn(),
  mockEnsureDir: vi.fn(),
}));

const { mockExecFileNoThrowSync } = vi.hoisted(() => ({
  mockExecFileNoThrowSync: vi.fn(),
}));

const {
  mockDetectTool,
  mockGetAdapter,
  mockCheckRequirements,
} = vi.hoisted(() => ({
  mockDetectTool: vi.fn().mockResolvedValue('claude'),
  mockGetAdapter: vi.fn().mockReturnValue(null),
  mockCheckRequirements: vi.fn(),
}));

const { mockGetDirname } = vi.hoisted(() => ({
  mockGetDirname: vi.fn().mockReturnValue('/mock/dirname'),
}));

const { mockIsLanguageSupported, mockGetSupportedLanguages } = vi.hoisted(() => ({
  mockIsLanguageSupported: vi.fn().mockReturnValue(true),
  mockGetSupportedLanguages: vi.fn().mockReturnValue(['en']),
}));

const { mockGetLocaleManager, mockLocaleT } = vi.hoisted(() => {
  const mockLocaleT = vi.fn().mockImplementation((_ns: string, key: string) => `[${key}]`);
  return {
    mockGetLocaleManager: vi.fn().mockReturnValue({ t: mockLocaleT }),
    mockLocaleT,
  };
});

const { mockInput, mockConfirm, mockSelect } = vi.hoisted(() => ({
  mockInput: vi.fn(),
  mockConfirm: vi.fn().mockResolvedValue(false),
  mockSelect: vi.fn(),
}));

const {
  mockFindSourceDir,
  mockFindPackageRoot,
  mockDetectNestedSpecweave,
  mockDetectUmbrellaParent,
  mockDetectSuspiciousPath,
  mockDetectProvider,
  mockScanUmbrellaRepos,
  mockScanMisplacedRepos,
  mockBuildUmbrellaConfig,
  mockPromptSmartReinit,
  mockInstallAllPlugins,
  mockPromptLanguageSelection,
  mockGetDefaultLanguageSelection,
  mockCreateDirectoryStructure,
  mockCopyTemplates,
  mockCreateConfigFile,
  mockShowNextSteps,
  mockInstallGitHooks,
  mockEnsureSkillCreator,
  mockEnsureVskillInit,
} = vi.hoisted(() => ({
  mockFindSourceDir: vi.fn().mockReturnValue('/mock/templates'),
  mockFindPackageRoot: vi.fn().mockReturnValue('/mock/package-root'),
  mockDetectNestedSpecweave: vi.fn().mockReturnValue(null),
  mockDetectUmbrellaParent: vi.fn().mockReturnValue(null),
  mockDetectSuspiciousPath: vi.fn().mockReturnValue(null),
  mockDetectProvider: vi.fn().mockReturnValue(null),
  mockScanUmbrellaRepos: vi.fn().mockReturnValue(null),
  mockScanMisplacedRepos: vi.fn().mockReturnValue([]),
  mockBuildUmbrellaConfig: vi.fn().mockReturnValue({ umbrella: { enabled: true, projectName: 'test', childRepos: [] }, repository: { umbrellaRepo: true } }),
  mockPromptSmartReinit: vi.fn(),
  mockInstallAllPlugins: vi.fn().mockResolvedValue({ success: true, marketplaceOnly: false }),
  mockPromptLanguageSelection: vi.fn().mockResolvedValue({ language: 'en', keepEnglishOriginals: false }),
  mockGetDefaultLanguageSelection: vi.fn().mockReturnValue({ language: 'en', keepEnglishOriginals: false }),
  mockCreateDirectoryStructure: vi.fn(),
  mockCopyTemplates: vi.fn(),
  mockCreateConfigFile: vi.fn(),
  mockShowNextSteps: vi.fn(),
  mockInstallGitHooks: vi.fn(),
  mockEnsureSkillCreator: vi.fn().mockResolvedValue(undefined),
}));

const { mockSetupLspEnvVar } = vi.hoisted(() => ({
  mockSetupLspEnvVar: vi.fn(),
}));

const { mockApplySmartDefaults } = vi.hoisted(() => ({
  mockApplySmartDefaults: vi.fn(),
}));

const { mockDisplaySummaryBanner } = vi.hoisted(() => ({
  mockDisplaySummaryBanner: vi.fn(),
}));

const { mockPromptProjectSetup, mockPromptRepoUrls, mockCloneReposIntoWorkspace } = vi.hoisted(() => ({
  mockPromptProjectSetup: vi.fn().mockResolvedValue('existing' as const),
  mockPromptRepoUrls: vi.fn().mockResolvedValue([]),
  mockCloneReposIntoWorkspace: vi.fn().mockReturnValue({ repos: [], totalCloned: 0, totalFailed: 0 }),
}));

const { mockEnableAgentTeamsEnvVar } = vi.hoisted(() => ({
  mockEnableAgentTeamsEnvVar: vi.fn(),
}));

const { mockOraInstance, mockOra } = vi.hoisted(() => {
  const instance = {
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    text: '',
  };
  return { mockOraInstance: instance, mockOra: vi.fn().mockReturnValue(instance) };
});

const { mockSyncSetupCommand } = vi.hoisted(() => ({
  mockSyncSetupCommand: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// vi.mock() declarations
// ============================================================================

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readJsonSync: mockReadJsonSync,
  writeJsonSync: mockWriteJsonSync,
  mkdirSync: mockMkdirSync,
  readdirSync: mockReaddirSync,
  copySync: mockCopySync,
  ensureDir: mockEnsureDir,
  statSync: vi.fn().mockReturnValue({ isDirectory: () => true }),
  rmSync: vi.fn(),
  writeFileSync: vi.fn(),
  readJson: vi.fn(),
  writeJson: vi.fn(),
  ensureDirSync: vi.fn(),
}));

vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
}));

vi.mock('../../../../src/adapters/adapter-loader.js', () => {
  const MockAdapterLoader = vi.fn(function(this: any) {
    this.detectTool = mockDetectTool;
    this.getAdapter = mockGetAdapter;
    this.checkRequirements = mockCheckRequirements;
  });
  return { AdapterLoader: MockAdapterLoader };
});

vi.mock('../../../../src/utils/esm-helpers.js', () => ({
  getDirname: mockGetDirname,
}));

vi.mock('../../../../src/core/i18n/language-manager.js', () => ({
  isLanguageSupported: mockIsLanguageSupported,
  getSupportedLanguages: mockGetSupportedLanguages,
}));

vi.mock('../../../../src/core/i18n/locale-manager.js', () => ({
  getLocaleManager: mockGetLocaleManager,
}));

vi.mock('@inquirer/prompts', () => ({
  input: mockInput,
  confirm: mockConfirm,
  select: mockSelect,
}));

vi.mock('../../../../src/cli/helpers/init/index.js', () => ({
  findSourceDir: mockFindSourceDir,
  findPackageRoot: mockFindPackageRoot,
  detectNestedSpecweave: mockDetectNestedSpecweave,
  detectUmbrellaParent: mockDetectUmbrellaParent,
  detectSuspiciousPath: mockDetectSuspiciousPath,
  detectProvider: mockDetectProvider,
  scanUmbrellaRepos: mockScanUmbrellaRepos,
  scanMisplacedRepos: mockScanMisplacedRepos,
  buildUmbrellaConfig: mockBuildUmbrellaConfig,
  promptSmartReinit: mockPromptSmartReinit,
  installAllPlugins: mockInstallAllPlugins,
  promptLanguageSelection: mockPromptLanguageSelection,
  getDefaultLanguageSelection: mockGetDefaultLanguageSelection,
  createDirectoryStructure: mockCreateDirectoryStructure,
  copyTemplates: mockCopyTemplates,
  createConfigFile: mockCreateConfigFile,
  showNextSteps: mockShowNextSteps,
  installGitHooks: mockInstallGitHooks,
  ensureSkillCreator: mockEnsureSkillCreator,
  promptProjectSetup: mockPromptProjectSetup,
  promptRepoUrls: mockPromptRepoUrls,
  cloneReposIntoWorkspace: mockCloneReposIntoWorkspace,
}));

vi.mock('../../../../src/cli/helpers/init/shell-config.js', () => ({
  setupLspEnvVar: mockSetupLspEnvVar,
}));

vi.mock('../../../../src/cli/helpers/init/smart-defaults.js', () => ({
  applySmartDefaults: mockApplySmartDefaults,
}));

vi.mock('../../../../src/cli/helpers/init/summary-banner.js', () => ({
  displaySummaryBanner: mockDisplaySummaryBanner,
}));

vi.mock('../../../../src/cli/helpers/init/repo-connect.js', () => ({
  promptProjectSetup: mockPromptProjectSetup,
  promptRepoUrls: mockPromptRepoUrls,
  cloneReposIntoWorkspace: mockCloneReposIntoWorkspace,
}));

vi.mock('../../../../src/cli/commands/sync-setup.js', () => ({
  syncSetupCommand: mockSyncSetupCommand,
}));

vi.mock('../../../../src/cli/helpers/init/claude-settings-env.js', () => ({
  enableAgentTeamsEnvVar: mockEnableAgentTeamsEnvVar,
}));

vi.mock('ora', () => ({ default: mockOra }));

vi.mock('chalk', () => {
  const identity = (s: unknown) => String(s);
  const handler: ProxyHandler<typeof identity> = {
    get(_target, prop) {
      if (prop === 'default') return new Proxy(identity, handler);
      return new Proxy(identity, handler);
    },
    apply(_target, _this, args) { return String(args[0]); },
  };
  return { default: new Proxy(identity, handler) };
});

vi.mock('fs', () => ({
  realpathSync: vi.fn((p: string) => p),
}));

// ============================================================================
// Import under test (after mocks)
// ============================================================================

import { initCommand, isNonInteractive } from '../../../../src/cli/commands/init.js';
import { showNextSteps } from '../../../../src/cli/helpers/init/next-steps.js';

// ============================================================================
// Test setup
// ============================================================================

const TEST_DIR = '/tmp/test-project';
let consoleLogSpy: ReturnType<typeof vi.spyOn>;

let originalIsTTY: boolean | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process, 'cwd').mockReturnValue(TEST_DIR);

  // Simulate interactive terminal (stdin.isTTY = true) so isNonInteractive() returns false
  originalIsTTY = process.stdin.isTTY;
  Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });

  // Default: greenfield directory (no .specweave, no .git, no repositories/)
  mockExistsSync.mockImplementation((p: string) => {
    if (p.endsWith('.specweave')) return false;
    if (p.endsWith('.git')) return false;
    if (p.endsWith('repositories')) return false;
    if (p.endsWith('config.json')) return true;
    return false;
  });

  mockReadJsonSync.mockReturnValue({});
  mockConfirm.mockResolvedValue(false);
  mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '' });
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true, configurable: true });
});

// ============================================================================
// TC-003: Post-scaffold fires for greenfield projects
// ============================================================================

describe('US-001: Fix post-scaffold execution order', () => {
  it('TC-003: promptProjectSetup is called for greenfield projects (no .git)', async () => {
    // Greenfield: no .git before init, .git exists after git init
    let gitInitCalled = false;
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return gitInitCalled;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockExecFileNoThrowSync.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'init') {
        gitInitCalled = true;
      }
      return { success: true, stdout: '', stderr: '' };
    });

    mockPromptProjectSetup.mockResolvedValue('scratch');

    await initCommand('.', { adapter: 'claude' });

    expect(mockPromptProjectSetup).toHaveBeenCalled();
  });

  it('TC-004: promptProjectSetup is NOT called for existing projects (continueExisting)', async () => {
    // Existing project: has .specweave
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.specweave')) return true;
      if (p.endsWith('config.json')) return true;
      if (p.endsWith('.git')) return true;
      return false;
    });

    mockPromptSmartReinit.mockResolvedValue({ action: 'continue', continueExisting: true });
    mockReadJsonSync.mockReturnValue({ adapters: { default: 'claude' } });

    await initCommand('.', { adapter: 'claude' });

    expect(mockPromptProjectSetup).not.toHaveBeenCalled();
  });

  it('AC-US1-02: dead multi-repo confirm question is removed (no standalone confirm for multi-repo)', async () => {
    // For greenfield, the only confirm calls should NOT be for "multiple repositories"
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockPromptProjectSetup.mockResolvedValue('scratch');

    await initCommand('.', { adapter: 'claude' });

    // The old standalone confirm for "Will this project use multiple repositories?" should NOT appear
    const confirmCalls = mockConfirm.mock.calls;
    for (const call of confirmCalls) {
      const message = call[0]?.message || '';
      expect(message).not.toMatch(/multiple.*(repos|repositories)/i);
    }
  });
});

// ============================================================================
// TC-001/TC-002: Deferred multi-repo config
// ============================================================================

describe('US-002: Deferred multi-repo option', () => {
  it('TC-001: selecting deferred multi-repo sets multiProject.enabled in config', async () => {
    let writtenConfig: Record<string, any> = {};

    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockReadJsonSync.mockReturnValue({});
    mockWriteJsonSync.mockImplementation((_path: string, data: any) => {
      writtenConfig = data;
    });

    // User selects "multi-repo-deferred" in promptProjectSetup
    mockPromptProjectSetup.mockResolvedValue('multi-repo-deferred');
    mockConfirm.mockResolvedValue(false); // decline sync-setup

    await initCommand('.', { adapter: 'claude' });

    expect(writtenConfig.multiProject).toEqual({ enabled: true });
    expect(writtenConfig.umbrella?.enabled).toBeUndefined();
    expect(writtenConfig.repository?.structure).toBeUndefined();
  });

  it('TC-002: selecting deferred multi-repo creates repositories/ directory', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockPromptProjectSetup.mockResolvedValue('multi-repo-deferred');
    mockConfirm.mockResolvedValue(false);

    await initCommand('.', { adapter: 'claude' });

    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('repositories'),
      expect.objectContaining({ recursive: true })
    );
  });

  it('TC-002b: umbrella.enabled is NOT set for deferred multi-repo', async () => {
    let writtenConfig: Record<string, any> = {};

    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockReadJsonSync.mockReturnValue({});
    mockWriteJsonSync.mockImplementation((_path: string, data: any) => {
      writtenConfig = data;
    });

    mockPromptProjectSetup.mockResolvedValue('multi-repo-deferred');
    mockConfirm.mockResolvedValue(false);

    await initCommand('.', { adapter: 'claude' });

    // umbrella.enabled should NOT be set
    expect(writtenConfig.umbrella?.enabled).toBeUndefined();
  });

  it('CI/non-interactive: promptProjectSetup is NOT called', async () => {
    await initCommand('.', { adapter: 'claude', quick: true });

    expect(mockPromptProjectSetup).not.toHaveBeenCalled();
  });
});

// ============================================================================
// TC-005/TC-006: Sync-setup chain
// ============================================================================

describe('US-003: Wire clone-repos to umbrella auto-setup', () => {
  it('TC-005: sync-setup is offered after multi-repo setup (accepted)', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockPromptProjectSetup.mockResolvedValue('multi-repo-deferred');
    // First confirm call for sync-setup = true
    mockConfirm.mockResolvedValue(true);

    await initCommand('.', { adapter: 'claude' });

    expect(mockSyncSetupCommand).toHaveBeenCalled();
  });

  it('TC-006: sync-setup is NOT called when declined', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockPromptProjectSetup.mockResolvedValue('multi-repo-deferred');
    mockConfirm.mockResolvedValue(false); // decline sync-setup

    await initCommand('.', { adapter: 'claude' });

    expect(mockSyncSetupCommand).not.toHaveBeenCalled();
  });

  it('clone-repos path calls cloneReposIntoWorkspace and scanUmbrellaRepos', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockPromptProjectSetup.mockResolvedValue('clone-repos');
    mockPromptRepoUrls.mockResolvedValue([
      { org: 'acme', name: 'app', cloneUrl: 'https://github.com/acme/app.git' },
    ]);
    mockCloneReposIntoWorkspace.mockReturnValue({ repos: [{ org: 'acme', name: 'app', path: 'repositories/acme/app', success: true }], totalCloned: 1, totalFailed: 0 });
    mockScanUmbrellaRepos.mockReturnValue({
      isUmbrella: true,
      repos: [{ org: 'acme', name: 'app', path: 'repositories/acme/app', hasGit: true }],
      orgs: ['acme'],
      totalRepoCount: 1,
      repositoriesDir: 'repositories',
    });
    mockConfirm.mockResolvedValue(false);

    await initCommand('.', { adapter: 'claude' });

    expect(mockCloneReposIntoWorkspace).toHaveBeenCalledWith(
      TEST_DIR,
      expect.arrayContaining([expect.objectContaining({ org: 'acme', name: 'app' })]),
    );
    // scanUmbrellaRepos is called at least once for re-scan after clone
    expect(mockScanUmbrellaRepos).toHaveBeenCalled();
  });

  it('clone failure is non-fatal — init continues', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockPromptProjectSetup.mockResolvedValue('clone-repos');
    mockPromptRepoUrls.mockResolvedValue([
      { org: 'acme', name: 'broken', cloneUrl: 'https://github.com/acme/broken.git' },
    ]);
    mockCloneReposIntoWorkspace.mockReturnValue({ repos: [{ org: 'acme', name: 'broken', path: 'repositories/acme/broken', success: false, error: 'clone failed' }], totalCloned: 0, totalFailed: 1 });
    mockConfirm.mockResolvedValue(false);

    // Should not throw
    await expect(initCommand('.', { adapter: 'claude' })).resolves.toBeUndefined();
  });
});

// ============================================================================
// TC-007: Next-steps messaging
// ============================================================================

describe('US-004: Update next-steps messaging for multi-repo', () => {
  it('TC-007: hides migrate-to-umbrella when isMultiRepo is true', () => {
    showNextSteps('test-project', 'claude', 'en', true, { pluginAutoInstalled: true }, { isMultiRepo: true, isUmbrella: false });

    const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).not.toContain('migrate-to-umbrella');
  });

  it('shows migrate-to-umbrella for single-repo (isMultiRepo=false, isUmbrella=false)', () => {
    showNextSteps('test-project', 'claude', 'en', true, { pluginAutoInstalled: true }, { isMultiRepo: false, isUmbrella: false });

    const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('migrate-to-umbrella');
  });

  it('hides migrate-to-umbrella when isUmbrella is true (existing behavior)', () => {
    showNextSteps('test-project', 'claude', 'en', true, { pluginAutoInstalled: true }, { isUmbrella: true });

    const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).not.toContain('migrate-to-umbrella');
  });

  it('shows specweave get examples when isMultiRepo is true', () => {
    showNextSteps('test-project', 'claude', 'en', true, { pluginAutoInstalled: true }, { isMultiRepo: true });

    const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('specweave get');
  });
});

// ============================================================================
// TC-008: resolve-structure deprecation
// ============================================================================

describe('US-005: resolve-structure deprecation stub', () => {
  it('TC-008: resolveStructureCommand returns deprecation result', async () => {
    const { resolveStructureCommand } = await import('../../../../src/cli/commands/resolve-structure.js');

    const result = await resolveStructureCommand({ type: 'single' });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/deprecated/i);
    expect(result.previouslyDeferred).toBe(false);
  });
});

// ============================================================================
// Dead config writes removed (AC-US1-03)
// ============================================================================

describe('US-001: Dead config writes removed', () => {
  it('AC-US1-03: config does not contain repository.structure or project.structureDeferred', async () => {
    let writtenConfig: Record<string, any> = {};

    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockReadJsonSync.mockReturnValue({});
    mockWriteJsonSync.mockImplementation((_path: string, data: any) => {
      writtenConfig = data;
    });

    mockPromptProjectSetup.mockResolvedValue('scratch');

    await initCommand('.', { adapter: 'claude' });

    expect(writtenConfig.repository?.structure).toBeUndefined();
    expect(writtenConfig.project?.structureDeferred).toBeUndefined();
  });
});
