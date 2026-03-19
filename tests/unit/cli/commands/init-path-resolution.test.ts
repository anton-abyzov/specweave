/**
 * Unit tests for init command path resolution
 *
 * Tests that undefined, '.', and explicit names resolve correctly.
 * Also tests home directory guard and project name prompting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
  mockExistsSync,
  mockReadJsonSync,
  mockWriteJsonSync,
  mockMkdirSync,
  mockReaddirSync,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadJsonSync: vi.fn(),
  mockWriteJsonSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockReaddirSync: vi.fn(),
}));

const { mockExecFileNoThrowSync } = vi.hoisted(() => ({
  mockExecFileNoThrowSync: vi.fn(),
}));

const { mockDetectTool, mockGetAdapter, mockCheckRequirements } = vi.hoisted(() => ({
  mockDetectTool: vi.fn(),
  mockGetAdapter: vi.fn(),
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

const { mockInput, mockConfirm } = vi.hoisted(() => ({
  mockInput: vi.fn(),
  mockConfirm: vi.fn(),
}));

const {
  mockFindSourceDir,
  mockFindPackageRoot,
  mockDetectNestedSpecweave,
  mockDetectUmbrellaParent,
  mockDetectSuspiciousPath,
  mockDetectProvider,
  mockScanUmbrellaRepos,
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
  mockScanMisplacedRepos,
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
  mockSetupLspEnvVar: vi.fn().mockReturnValue({ success: true }),
}));

const { mockApplySmartDefaults } = vi.hoisted(() => ({
  mockApplySmartDefaults: vi.fn(),
}));

const { mockDisplaySummaryBanner } = vi.hoisted(() => ({
  mockDisplaySummaryBanner: vi.fn(),
}));

const { mockEnableAgentTeamsEnvVar } = vi.hoisted(() => ({
  mockEnableAgentTeamsEnvVar: vi.fn(),
}));

const { mockOraInstance } = vi.hoisted(() => {
  const instance = {
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    text: '',
  };
  return { mockOraInstance: instance };
});

const { mockOra } = vi.hoisted(() => ({
  mockOra: vi.fn().mockReturnValue(mockOraInstance),
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
  ensureDirSync: vi.fn(),
  writeFileSync: vi.fn(),
  copySync: vi.fn(),
  rmSync: vi.fn(),
  readJson: vi.fn().mockResolvedValue({}),
  writeJson: vi.fn().mockResolvedValue(undefined),
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

vi.mock('../../../../src/utils/logger.js', () => ({
  Logger: vi.fn(),
  consoleLogger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), verbose: vi.fn() },
}));

vi.mock('@inquirer/prompts', () => ({
  input: mockInput,
  confirm: mockConfirm,
  select: vi.fn().mockResolvedValue('existing'),
}));

vi.mock('chalk', () => {
  const chainable = new Proxy((...args: unknown[]) => args.join(' '), {
    get: (_target, _prop) => chainable,
  });
  return { default: chainable };
});

vi.mock('ora', () => ({
  default: mockOra,
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
}));

vi.mock('../../../../src/cli/helpers/init/shell-config.js', () => ({
  setupLspEnvVar: mockSetupLspEnvVar,
}));

vi.mock('../../../../src/core/types/plugin-scope.js', () => ({
  getPluginScope: vi.fn().mockReturnValue('user'),
  getScopeArgs: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../../src/cli/helpers/init/claude-plugin-enabler.js', () => ({
  enablePlugin: vi.fn(),
  enablePluginsInSettings: vi.fn(),
}));

vi.mock('../../../../src/cli/helpers/init/claude-settings-env.js', () => ({
  enableAgentTeamsEnvVar: mockEnableAgentTeamsEnvVar,
}));

vi.mock('../../../../src/cli/commands/lsp.js', () => ({
  scanLanguagesAcrossRepos: vi.fn().mockResolvedValue({ success: false, languages: [], reposScanned: [] }),
  handleLspSetup: vi.fn(),
}));

vi.mock('../../../../src/cli/helpers/init/smart-defaults.js', () => ({
  applySmartDefaults: mockApplySmartDefaults,
}));

vi.mock('../../../../src/cli/helpers/init/summary-banner.js', () => ({
  displaySummaryBanner: mockDisplaySummaryBanner,
}));

vi.mock('../../../../src/cli/helpers/init/repo-connect.js', () => ({
  promptProjectSetup: vi.fn().mockResolvedValue('existing'),
  promptRepoUrls: vi.fn().mockResolvedValue([]),
  cloneReposIntoWorkspace: vi.fn().mockReturnValue({ repos: [], totalCloned: 0, totalFailed: 0 }),
}));

// ============================================================================
// Imports (AFTER vi.mock)
// ============================================================================

import { initCommand } from '../../../../src/cli/commands/init.js';

// ============================================================================
// Tests
// ============================================================================

describe('init path resolution', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetAllMocks();

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Default: CWD is a valid project dir
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/tmp/test-project');

    // Defaults
    mockExistsSync.mockReturnValue(false);
    mockReadJsonSync.mockReturnValue({});
    mockWriteJsonSync.mockReturnValue(undefined);
    mockReaddirSync.mockReturnValue([]);
    mockDetectTool.mockResolvedValue('claude');
    mockGetAdapter.mockReturnValue({
      install: vi.fn(),
      postInstall: vi.fn(),
      supportsPlugins: vi.fn().mockReturnValue(false),
      compilePlugin: vi.fn(),
    });
    mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '', exitCode: 0 });
    mockConfirm.mockResolvedValue(true);
    mockInput.mockResolvedValue('my-project');

    mockFindSourceDir.mockReturnValue('/mock/templates');
    mockDetectNestedSpecweave.mockReturnValue(null);
    mockDetectUmbrellaParent.mockReturnValue(null);
    mockDetectSuspiciousPath.mockReturnValue(null);
    mockDetectProvider.mockReturnValue(null);
    mockScanUmbrellaRepos.mockReturnValue(null);
    mockInstallAllPlugins.mockResolvedValue({ success: true, marketplaceOnly: false });
    mockEnsureSkillCreator.mockResolvedValue(undefined);
    mockScanMisplacedRepos.mockReturnValue([]);
    mockPromptLanguageSelection.mockResolvedValue({ language: 'en', keepEnglishOriginals: false });
    mockGetDefaultLanguageSelection.mockReturnValue({ language: 'en', keepEnglishOriginals: false });
    mockIsLanguageSupported.mockReturnValue(true);
    mockGetLocaleManager.mockReturnValue({ t: mockLocaleT });
    mockLocaleT.mockImplementation((_ns: string, key: string) => `[${key}]`);

    // Ora mock must be re-set after resetAllMocks
    mockOra.mockReturnValue(mockOraInstance);
    mockOraInstance.start.mockReturnValue(mockOraInstance);
    mockOraInstance.stop.mockReturnValue(mockOraInstance);
    mockOraInstance.succeed.mockReturnValue(mockOraInstance);
    mockOraInstance.fail.mockReturnValue(mockOraInstance);
    mockOraInstance.warn.mockReturnValue(mockOraInstance);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  // TC-006
  it('TC-006: initCommand(undefined) sets targetDir to process.cwd()', async () => {
    cwdSpy.mockReturnValue('/tmp/test-project');

    await initCommand(undefined, { quick: true });

    // createDirectoryStructure is called with the targetDir
    expect(mockCreateDirectoryStructure).toHaveBeenCalledWith('/tmp/test-project', expect.any(String));
  });

  // TC-007
  it('TC-007: initCommand(".") sets targetDir to process.cwd()', async () => {
    cwdSpy.mockReturnValue('/tmp/test-project');

    await initCommand('.', { quick: true });

    expect(mockCreateDirectoryStructure).toHaveBeenCalledWith('/tmp/test-project', expect.any(String));
  });

  // TC-008
  it('TC-008: initCommand("my-project") resolves to cwd/my-project', async () => {
    cwdSpy.mockReturnValue('/tmp/workspace');

    await initCommand('my-project', { quick: true });

    const expectedPath = path.resolve('/tmp/workspace', 'my-project');
    // mkdirSync is called for the new subdirectory
    expect(mockMkdirSync).toHaveBeenCalledWith(expectedPath, { recursive: true });
    expect(mockCreateDirectoryStructure).toHaveBeenCalledWith(expectedPath, expect.any(String));
  });

  // TC-009
  it('TC-009: initCommand(undefined) from home directory calls process.exit(1)', async () => {
    cwdSpy.mockReturnValue(os.homedir());

    await expect(initCommand(undefined, { quick: true })).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // TC-010
  it('TC-010: CWD with spaces/uppercase triggers project name prompt with suggested slug', async () => {
    cwdSpy.mockReturnValue('/tmp/My Project');
    mockInput.mockResolvedValue('my-project');

    // Simulate interactive mode: set TTY so isNonInteractive returns false
    const origIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    // Clear CI env vars that would force non-interactive mode (set in GitHub Actions)
    const ciEnvKeys = ['CI', 'GITHUB_ACTIONS', 'GITLAB_CI', 'CIRCLECI', 'JENKINS_URL'] as const;
    const savedEnv: Record<string, string | undefined> = {};
    for (const key of ciEnvKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }

    try {
      await initCommand(undefined);

      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Project name (for config):',
          default: 'my-project',
        })
      );
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true });
      for (const key of ciEnvKeys) {
        if (savedEnv[key] !== undefined) {
          process.env[key] = savedEnv[key];
        } else {
          delete process.env[key];
        }
      }
    }
  });

  // TC-011
  it('TC-011: initCommand("new-project") creates a subdirectory', async () => {
    cwdSpy.mockReturnValue('/tmp/workspace');

    await initCommand('new-project', { quick: true });

    const expectedPath = path.resolve('/tmp/workspace', 'new-project');
    expect(mockMkdirSync).toHaveBeenCalledWith(expectedPath, { recursive: true });
  });
});
