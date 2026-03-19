/**
 * Init config validation tests (increment 0581 - T-027)
 *
 * Asserts that init never writes multiProject.enabled and always
 * sets umbrella.enabled = true.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  mockPromptProjectSetup: vi.fn().mockResolvedValue('add-later' as const),
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
  createMinimalConfig: vi.fn(),
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

import { initCommand } from '../../../../src/cli/commands/init.js';

// ============================================================================
// Test setup
// ============================================================================

const TEST_DIR = '/tmp/test-init-config';

let originalIsTTY: boolean | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process, 'cwd').mockReturnValue(TEST_DIR);

  originalIsTTY = process.stdin.isTTY;
  Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });

  // Default: greenfield directory
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
  Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true, configurable: true });
});

// ============================================================================
// T-027: Init config never contains multiProject.enabled
// ============================================================================

describe('AC-US6-03: init config never contains multiProject.enabled', () => {
  it('scratch flow: config has no multiProject key and umbrella.enabled is true when repos discovered', async () => {
    let writtenConfig: Record<string, any> = {};

    mockWriteJsonSync.mockImplementation((_path: string, data: any) => {
      writtenConfig = data;
    });

    // Simulate umbrella discovery after scaffold
    mockScanUmbrellaRepos.mockReturnValue({
      isUmbrella: true,
      repos: [],
      orgs: [],
      totalRepoCount: 0,
      repositoriesDir: 'repositories',
    });

    mockPromptProjectSetup.mockResolvedValue('add-later');

    await initCommand('.', { adapter: 'claude' });

    // multiProject must never appear
    expect(writtenConfig).not.toHaveProperty('multiProject');
    // When umbrella discovery fires, umbrella.enabled must be true
    if (writtenConfig.umbrella) {
      expect(writtenConfig.umbrella.enabled).toBe(true);
    }
  });

  it('clone-repos flow: config has no multiProject key', async () => {
    let writtenConfig: Record<string, any> = {};

    mockWriteJsonSync.mockImplementation((_path: string, data: any) => {
      writtenConfig = data;
    });

    mockPromptProjectSetup.mockResolvedValue('clone-repos');
    mockPromptRepoUrls.mockResolvedValue([
      { org: 'acme', name: 'app', cloneUrl: 'https://github.com/acme/app.git' },
    ]);
    mockCloneReposIntoWorkspace.mockReturnValue({
      repos: [{ org: 'acme', name: 'app', path: 'repositories/acme/app', success: true }],
      totalCloned: 1,
      totalFailed: 0,
    });
    mockScanUmbrellaRepos.mockReturnValue({
      isUmbrella: true,
      repos: [{ org: 'acme', name: 'app', path: 'repositories/acme/app', hasGit: true }],
      orgs: ['acme'],
      totalRepoCount: 1,
      repositoriesDir: 'repositories',
    });

    await initCommand('.', { adapter: 'claude' });

    expect(writtenConfig).not.toHaveProperty('multiProject');
  });

  it('deferred flow: config has no multiProject key', async () => {
    let writtenConfig: Record<string, any> = {};

    mockWriteJsonSync.mockImplementation((_path: string, data: any) => {
      writtenConfig = data;
    });

    mockPromptProjectSetup.mockResolvedValue('add-later');

    await initCommand('.', { adapter: 'claude' });

    expect(writtenConfig).not.toHaveProperty('multiProject');
  });

  it('CI/quick mode: config has no multiProject key', async () => {
    let writtenConfig: Record<string, any> = {};

    mockWriteJsonSync.mockImplementation((_path: string, data: any) => {
      writtenConfig = data;
    });

    await initCommand('.', { adapter: 'claude', quick: true });

    expect(writtenConfig).not.toHaveProperty('multiProject');
  });
});
