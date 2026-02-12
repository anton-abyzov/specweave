/**
 * Comprehensive unit tests for the init command
 *
 * Tests: isNonInteractive, isSpecWeaveFrameworkRepo (via initCommand),
 * createMultiProjectFolders (via initCommand), initCommand main flow,
 * installNonClaudeAdapter (via initCommand), setupIssueTrackerWrapper (via initCommand),
 * saveLivingDocsConfig, displayLivingDocsInstructions, autoInstallSelectedExternalPlugin.
 *
 * Strategy: Mock ALL external dependencies to isolate the init command logic.
 * Uses vi.hoisted() + vi.mock() pattern for ESM mocking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Hoisted mocks (must be defined before vi.mock calls)
// ============================================================================

const {
  mockExistsSync,
  mockReadJson,
  mockReadJsonSync,
  mockWriteJson,
  mockMkdirSync,
  mockReaddirSync,
  mockEnsureDirSync,
  mockWriteFileSync,
  mockCopySync,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadJson: vi.fn(),
  mockReadJsonSync: vi.fn(),
  mockWriteJson: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockEnsureDirSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockCopySync: vi.fn(),
}));

const { mockExecFileNoThrowSync } = vi.hoisted(() => ({
  mockExecFileNoThrowSync: vi.fn(),
}));

const {
  mockDetectTool,
  mockGetAdapter,
  mockCheckRequirements,
} = vi.hoisted(() => ({
  mockDetectTool: vi.fn(),
  mockGetAdapter: vi.fn(),
  mockCheckRequirements: vi.fn(),
}));

const { mockGetDirname } = vi.hoisted(() => ({
  mockGetDirname: vi.fn().mockReturnValue('/mock/dirname'),
}));

const { mockIsLanguageSupported, mockGetSupportedLanguages } = vi.hoisted(() => ({
  mockIsLanguageSupported: vi.fn().mockReturnValue(true),
  mockGetSupportedLanguages: vi.fn().mockReturnValue(['en', 'es', 'de', 'fr']),
}));

const { mockGetLocaleManager, mockLocaleT } = vi.hoisted(() => {
  const mockLocaleT = vi.fn().mockImplementation((_ns: string, key: string) => `[${key}]`);
  return {
    mockGetLocaleManager: vi.fn().mockReturnValue({ t: mockLocaleT }),
    mockLocaleT,
  };
});

const { mockReadEnvFile, mockParseEnvFile } = vi.hoisted(() => ({
  mockReadEnvFile: vi.fn().mockReturnValue(''),
  mockParseEnvFile: vi.fn().mockReturnValue({}),
}));

const { mockInput, mockConfirm } = vi.hoisted(() => ({
  mockInput: vi.fn(),
  mockConfirm: vi.fn(),
}));

const {
  mockFindSourceDir,
  mockFindPackageRoot,
  mockDetectNestedSpecweave,
  mockDetectGitHubRemote,
  mockPromptSmartReinit,
  mockInstallAllPlugins,
  mockSetupRepositoryHosting,
  mockPromptTestingConfig,
  mockUpdateConfigWithTesting,
  mockPromptLanguageSelection,
  mockGetDefaultLanguageSelection,
  mockPromptTranslationConfig,
  mockUpdateConfigWithTranslation,
  mockGetDefaultTranslationConfig,
  mockPromptAndRunExternalImport,
  mockCreateDirectoryStructure,
  mockCopyTemplates,
  mockCreateConfigFile,
  mockShowNextSteps,
  mockInstallGitHooks,
  mockPromptDeepInterviewConfig,
  mockUpdateConfigWithDeepInterview,
  mockPromptQualityGatesConfig,
  mockUpdateConfigWithQualityGates,
  mockLogGoingBack,
  MOCK_WIZARD_BACK,
} = vi.hoisted(() => ({
  mockFindSourceDir: vi.fn().mockReturnValue('/mock/templates'),
  mockFindPackageRoot: vi.fn().mockReturnValue('/mock/package-root'),
  mockDetectNestedSpecweave: vi.fn().mockReturnValue(null),
  mockDetectGitHubRemote: vi.fn().mockReturnValue(null),
  mockPromptSmartReinit: vi.fn(),
  mockInstallAllPlugins: vi.fn().mockResolvedValue({ success: true, marketplaceOnly: false }),
  mockSetupRepositoryHosting: vi.fn().mockResolvedValue({ hosting: 'local' }),
  mockPromptTestingConfig: vi.fn().mockResolvedValue({ testMode: 'test-after', coverageTarget: 80, goBack: null }),
  mockUpdateConfigWithTesting: vi.fn(),
  mockPromptLanguageSelection: vi.fn().mockResolvedValue({ language: 'en', keepEnglishOriginals: false }),
  mockGetDefaultLanguageSelection: vi.fn().mockReturnValue({ language: 'en', keepEnglishOriginals: false }),
  mockPromptTranslationConfig: vi.fn().mockResolvedValue({ enabled: false, languages: ['en'], primary: 'en', method: 'none', preserveFrameworkTerms: true, scope: { incrementSpecs: false, livingDocs: false, externalSync: false }, keepEnglishOriginals: false }),
  mockUpdateConfigWithTranslation: vi.fn(),
  mockGetDefaultTranslationConfig: vi.fn().mockReturnValue({ enabled: false, languages: ['en'], primary: 'en', method: 'none', preserveFrameworkTerms: true, scope: { incrementSpecs: false, livingDocs: false, externalSync: false }, keepEnglishOriginals: false }),
  mockPromptAndRunExternalImport: vi.fn().mockResolvedValue({ totalCount: 0, platforms: [] }),
  mockCreateDirectoryStructure: vi.fn(),
  mockCopyTemplates: vi.fn(),
  mockCreateConfigFile: vi.fn(),
  mockShowNextSteps: vi.fn(),
  mockInstallGitHooks: vi.fn(),
  mockPromptDeepInterviewConfig: vi.fn().mockResolvedValue({ enabled: false, goBack: null }),
  mockUpdateConfigWithDeepInterview: vi.fn(),
  mockPromptQualityGatesConfig: vi.fn().mockResolvedValue({ preset: 'standard', goBack: null }),
  mockUpdateConfigWithQualityGates: vi.fn(),
  mockLogGoingBack: vi.fn(),
  MOCK_WIZARD_BACK: Symbol('WIZARD_BACK'),
}));

const { mockTriggerAdoRepoCloning } = vi.hoisted(() => ({
  mockTriggerAdoRepoCloning: vi.fn().mockResolvedValue(null),
}));

const { mockTriggerGitHubRepoCloning } = vi.hoisted(() => ({
  mockTriggerGitHubRepoCloning: vi.fn().mockResolvedValue({ jobId: null, clonedRepos: [] }),
}));

const { mockTriggerBitbucketRepoCloning } = vi.hoisted(() => ({
  mockTriggerBitbucketRepoCloning: vi.fn().mockResolvedValue(null),
}));

const { mockCreateProjectFolders } = vi.hoisted(() => ({
  mockCreateProjectFolders: vi.fn().mockResolvedValue([]),
}));

const { mockCollectLivingDocsInputs } = vi.hoisted(() => ({
  mockCollectLivingDocsInputs: vi.fn().mockResolvedValue(null),
}));

const { mockSetupLspEnvVar } = vi.hoisted(() => ({
  mockSetupLspEnvVar: vi.fn().mockReturnValue({ success: true, alreadyConfigured: false, configPath: '~/.zshrc', exportSyntax: 'export ENABLE_LSP_TOOL=1' }),
}));

const { mockGetPluginScope, mockGetScopeArgs } = vi.hoisted(() => ({
  mockGetPluginScope: vi.fn().mockReturnValue('user'),
  mockGetScopeArgs: vi.fn().mockReturnValue([]),
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

const { mockEnablePlugin } = vi.hoisted(() => ({
  mockEnablePlugin: vi.fn(),
}));

const { mockEnableAgentTeamsEnvVar } = vi.hoisted(() => ({
  mockEnableAgentTeamsEnvVar: vi.fn(),
}));

const { mockSetupIssueTracker } = vi.hoisted(() => ({
  mockSetupIssueTracker: vi.fn(),
}));

// ============================================================================
// vi.mock() declarations (run at module load time)
// ============================================================================

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readJson: mockReadJson,
  readJsonSync: mockReadJsonSync,
  writeJson: mockWriteJson,
  mkdirSync: mockMkdirSync,
  readdirSync: mockReaddirSync,
  ensureDirSync: mockEnsureDirSync,
  writeFileSync: mockWriteFileSync,
  copySync: mockCopySync,
}));

vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
}));

vi.mock('../../../../src/adapters/adapter-loader.js', () => ({
  AdapterLoader: vi.fn().mockImplementation(() => ({
    detectTool: mockDetectTool,
    getAdapter: mockGetAdapter,
    checkRequirements: mockCheckRequirements,
  })),
}));

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

vi.mock('../../../../src/utils/env-file.js', () => ({
  readEnvFile: mockReadEnvFile,
  parseEnvFile: mockParseEnvFile,
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  Logger: vi.fn(),
  consoleLogger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), verbose: vi.fn() },
}));

vi.mock('@inquirer/prompts', () => ({
  input: mockInput,
  confirm: mockConfirm,
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
  detectGitHubRemote: mockDetectGitHubRemote,
  promptSmartReinit: mockPromptSmartReinit,
  installAllPlugins: mockInstallAllPlugins,
  setupRepositoryHosting: mockSetupRepositoryHosting,
  promptTestingConfig: mockPromptTestingConfig,
  updateConfigWithTesting: mockUpdateConfigWithTesting,
  promptLanguageSelection: mockPromptLanguageSelection,
  getDefaultLanguageSelection: mockGetDefaultLanguageSelection,
  promptTranslationConfig: mockPromptTranslationConfig,
  updateConfigWithTranslation: mockUpdateConfigWithTranslation,
  getDefaultTranslationConfig: mockGetDefaultTranslationConfig,
  promptAndRunExternalImport: mockPromptAndRunExternalImport,
  createDirectoryStructure: mockCreateDirectoryStructure,
  copyTemplates: mockCopyTemplates,
  createConfigFile: mockCreateConfigFile,
  showNextSteps: mockShowNextSteps,
  installGitHooks: mockInstallGitHooks,
  promptDeepInterviewConfig: mockPromptDeepInterviewConfig,
  updateConfigWithDeepInterview: mockUpdateConfigWithDeepInterview,
  promptQualityGatesConfig: mockPromptQualityGatesConfig,
  updateConfigWithQualityGates: mockUpdateConfigWithQualityGates,
  logGoingBack: mockLogGoingBack,
  WIZARD_BACK: MOCK_WIZARD_BACK,
}));

vi.mock('../../../../src/cli/helpers/init/ado-repo-cloning.js', () => ({
  triggerAdoRepoCloning: mockTriggerAdoRepoCloning,
}));

vi.mock('../../../../src/cli/helpers/init/github-repo-cloning.js', () => ({
  triggerGitHubRepoCloning: mockTriggerGitHubRepoCloning,
}));

vi.mock('../../../../src/cli/helpers/init/bitbucket-repo-cloning.js', () => ({
  triggerBitbucketRepoCloning: mockTriggerBitbucketRepoCloning,
}));

vi.mock('../../../../src/cli/helpers/init/multi-project-folders.js', () => ({
  createProjectFolders: mockCreateProjectFolders,
}));

vi.mock('../../../../src/cli/helpers/init/living-docs-preflight.js', () => ({
  collectLivingDocsInputs: mockCollectLivingDocsInputs,
}));

vi.mock('../../../../src/cli/helpers/init/shell-config.js', () => ({
  setupLspEnvVar: mockSetupLspEnvVar,
}));

vi.mock('../../../../src/core/types/plugin-scope.js', () => ({
  getPluginScope: mockGetPluginScope,
  getScopeArgs: mockGetScopeArgs,
}));

vi.mock('../../../../src/cli/helpers/init/claude-plugin-enabler.js', () => ({
  enablePlugin: mockEnablePlugin,
  enablePluginsInSettings: vi.fn(),
}));

vi.mock('../../../../src/cli/helpers/init/claude-settings-env.js', () => ({
  enableAgentTeamsEnvVar: mockEnableAgentTeamsEnvVar,
}));

vi.mock('../../../../src/cli/helpers/issue-tracker/index.js', () => ({
  setupIssueTracker: mockSetupIssueTracker,
}));

vi.mock('../../../../src/cli/commands/lsp.js', () => ({
  scanLanguagesAcrossRepos: vi.fn().mockResolvedValue({ success: false, languages: [], reposScanned: [] }),
  handleLspSetup: vi.fn(),
}));

// ============================================================================
// Imports (must come AFTER vi.mock declarations)
// ============================================================================

import { isNonInteractive, initCommand } from '../../../../src/cli/commands/init.js';

// ============================================================================
// Test suite
// ============================================================================

describe('init command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  const savedEnv: Record<string, string | undefined> = {};
  const ciEnvVars = ['CI', 'GITHUB_ACTIONS', 'GITLAB_CI', 'CIRCLECI', 'JENKINS_URL'];

  beforeEach(() => {
    vi.clearAllMocks();

    // Save CI env vars
    for (const key of ciEnvVars) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Default mock behaviors
    mockExistsSync.mockReturnValue(false);
    mockReadJson.mockResolvedValue({});
    mockReaddirSync.mockReturnValue([]);
    mockDetectTool.mockResolvedValue('claude');
    mockGetAdapter.mockReturnValue(null);
    mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '', exitCode: 0 });
    mockConfirm.mockResolvedValue(true);
    mockInput.mockResolvedValue('my-project');

    // Default: CI/quick mode for most tests
    process.env.CI = 'true';

    // Setup repository hosting default
    mockSetupRepositoryHosting.mockResolvedValue({
      hosting: 'local',
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();

    // Restore CI env vars
    for (const key of ciEnvVars) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  // ==========================================================================
  // isNonInteractive
  // ==========================================================================

  describe('isNonInteractive()', () => {
    beforeEach(() => {
      // Clear CI env vars for these tests
      for (const key of ciEnvVars) {
        delete process.env[key];
      }
    });

    it('should return true when quick flag is set', () => {
      expect(isNonInteractive({ quick: true })).toBe(true);
    });

    it('should return true when CI=true', () => {
      process.env.CI = 'true';
      expect(isNonInteractive({})).toBe(true);
    });

    it('should return true when GITHUB_ACTIONS=true', () => {
      process.env.GITHUB_ACTIONS = 'true';
      expect(isNonInteractive({})).toBe(true);
    });

    it('should return true when GITLAB_CI=true', () => {
      process.env.GITLAB_CI = 'true';
      expect(isNonInteractive({})).toBe(true);
    });

    it('should return true when CIRCLECI=true', () => {
      process.env.CIRCLECI = 'true';
      expect(isNonInteractive({})).toBe(true);
    });

    it('should return true when JENKINS_URL is set', () => {
      process.env.JENKINS_URL = 'http://jenkins.local';
      expect(isNonInteractive({})).toBe(true);
    });

    it('should handle multiple CI vars set simultaneously', () => {
      process.env.CI = 'true';
      process.env.GITHUB_ACTIONS = 'true';
      expect(isNonInteractive({})).toBe(true);
    });

    it('should return false when no CI vars and has TTY', () => {
      const result = isNonInteractive({});
      // In test env, stdin.isTTY might be false
      if (process.stdin.isTTY) {
        expect(result).toBe(false);
      }
    });

    it('should return true when stdin is not a TTY', () => {
      // When no CI vars are set and stdin is not a TTY, should be non-interactive
      const result = isNonInteractive({});
      if (!process.stdin.isTTY) {
        expect(result).toBe(true);
      }
    });

    it('should not consider CI=false as non-interactive', () => {
      process.env.CI = 'false';
      // CI=false is a truthy string in JS, but the code checks === 'true'
      if (process.stdin.isTTY) {
        expect(isNonInteractive({})).toBe(false);
      }
    });
  });

  // ==========================================================================
  // initCommand - Language validation
  // ==========================================================================

  describe('initCommand - language validation', () => {
    it('should reject unsupported language with error and exit', async () => {
      mockIsLanguageSupported.mockReturnValue(false);

      await expect(
        initCommand('test-project', { language: 'xx', quick: true })
      ).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should accept supported language via CLI option', async () => {
      mockIsLanguageSupported.mockReturnValue(true);
      mockGetDefaultLanguageSelection.mockReturnValue({ language: 'es', keepEnglishOriginals: false });

      // Target dir does not exist so mkdirSync is called
      mockExistsSync.mockReturnValue(false);

      await initCommand('test-project', { language: 'es', quick: true });

      expect(mockGetDefaultLanguageSelection).toHaveBeenCalledWith('es');
    });

    it('should use en as default language in CI mode without --language', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('test-project', { quick: true });

      expect(mockGetDefaultLanguageSelection).toHaveBeenCalledWith('en');
    });
  });

  // ==========================================================================
  // initCommand - Project name handling
  // ==========================================================================

  describe('initCommand - project name handling', () => {
    it('should handle project name as path.basename to strip prefixes', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('./my-cool-project', { quick: true });

      // path.basename('./my-cool-project') = 'my-cool-project'
      expect(mockCreateConfigFile).toHaveBeenCalledWith(
        expect.any(String),
        'my-cool-project',
        expect.any(String),
        expect.any(String),
        false,
      );
    });

    it('should create target directory when it does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('brand-new', { quick: true });

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('brand-new'),
        { recursive: true }
      );
    });
  });

  // ==========================================================================
  // initCommand - Dot notation (current directory)
  // ==========================================================================

  describe('initCommand - dot notation (.)', () => {
    it('should use cwd when project name is "."', async () => {
      // No existing specweave
      mockExistsSync.mockReturnValue(false);
      mockReaddirSync.mockReturnValue([]);

      await initCommand('.', { quick: true });

      // Should NOT call mkdirSync for new directory since using cwd
      // Instead it uses process.cwd()
      expect(mockCreateDirectoryStructure).toHaveBeenCalled();
    });

    it('should block initialization in home directory', async () => {
      const realCwd = process.cwd();
      try {
        // Temporarily mock cwd to home directory
        vi.spyOn(process, 'cwd').mockReturnValue(os.homedir());
        vi.spyOn(path, 'resolve').mockImplementation((...args) => {
          if (args.length === 1) return args[0];
          return path.join(...args);
        });

        await expect(
          initCommand('.', { quick: true })
        ).rejects.toThrow('process.exit called');

        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        vi.restoreAllMocks();
        // Re-setup mocks that were cleared by restoreAllMocks
      }
    });

    it('should warn and auto-sanitize invalid directory names in CI mode', async () => {
      mockExistsSync.mockReturnValue(false);
      mockReaddirSync.mockReturnValue([]);

      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/tmp/My Project');

      await initCommand('.', { quick: true });

      // Should sanitize "My Project" to "my-project"
      expect(mockCreateConfigFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/^[a-z0-9-]+$/),
        expect.any(String),
        expect.any(String),
        false,
      );

      cwdSpy.mockRestore();
    });

    it('should warn about non-empty directory in CI mode and proceed', async () => {
      // Directory exists, has files, no .specweave
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.specweave')) return false;
        if (typeof p === 'string' && p.endsWith('.git')) return false;
        return false;
      });
      mockReaddirSync.mockReturnValue(['file1.ts', 'file2.ts']);

      await initCommand('.', { quick: true });

      // Should proceed without asking in CI mode
      expect(mockCreateDirectoryStructure).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Quick mode without project name
  // ==========================================================================

  describe('initCommand - quick mode without project name', () => {
    it('should use current directory when --quick and no project name', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand(undefined, { quick: true });

      // In CI/quick mode without project name, uses cwd
      expect(mockCreateDirectoryStructure).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Existing directory with .specweave (re-init)
  // ==========================================================================

  describe('initCommand - smart re-initialization', () => {
    it('should call promptSmartReinit when .specweave exists in target', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.specweave')) return true;
        return false;
      });
      mockPromptSmartReinit.mockResolvedValue({ action: 'continue', continueExisting: true });

      await initCommand('.', { quick: true });

      expect(mockPromptSmartReinit).toHaveBeenCalledWith(
        expect.objectContaining({
          isCI: true,
          hasForce: false,
        })
      );
    });

    it('should exit when user cancels re-init', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.specweave')) return true;
        return false;
      });
      mockPromptSmartReinit.mockResolvedValue({ action: 'cancel', continueExisting: false });

      await expect(
        initCommand('.', { quick: true })
      ).rejects.toThrow('process.exit called');

      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('should skip external import step when continuing existing project', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.specweave')) return true;
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockPromptSmartReinit.mockResolvedValue({ action: 'continue', continueExisting: true });
      mockReadJsonSync.mockReturnValue({ adapters: { default: 'claude' } });

      await initCommand('.', { quick: true });

      // External import is skipped when continueExisting
      // Wizard starts at living-docs instead
      expect(mockPromptAndRunExternalImport).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Nested .specweave detection
  // ==========================================================================

  describe('initCommand - nested specweave detection', () => {
    it('should block init when problematic parent .specweave is found', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectNestedSpecweave.mockReturnValue([
        { path: '/parent/.specweave', depth: 1, isUserLevel: false },
      ]);

      await expect(
        initCommand('nested-project', { quick: true })
      ).rejects.toThrow('process.exit called');

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should allow init when only user-level .specweave folders are found', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectNestedSpecweave.mockReturnValue([
        { path: `${os.homedir()}/.specweave`, depth: 3, isUserLevel: true },
      ]);

      await initCommand('allowed-project', { quick: true });

      // Should proceed normally
      expect(mockCreateDirectoryStructure).toHaveBeenCalled();
    });

    it('should allow init when no parent .specweave is detected', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectNestedSpecweave.mockReturnValue(null);

      await initCommand('clean-project', { quick: true });

      expect(mockCreateDirectoryStructure).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Tool detection
  // ==========================================================================

  describe('initCommand - tool detection', () => {
    it('should use adapter from options when provided', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('test-project', { adapter: 'generic', quick: true });

      // Should not call detectTool when adapter is specified
      expect(mockDetectTool).not.toHaveBeenCalled();
    });

    it('should auto-confirm detected tool in CI mode', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectTool.mockResolvedValue('claude');

      await initCommand('test-project', { quick: true });

      // Should not prompt for confirmation in CI mode
      expect(mockConfirm).not.toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('confirmPrompt') })
      );
    });
  });

  // ==========================================================================
  // initCommand - Directory structure creation
  // ==========================================================================

  describe('initCommand - directory and template setup', () => {
    it('should create directory structure for new projects', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('fresh-project', { quick: true });

      expect(mockCreateDirectoryStructure).toHaveBeenCalledWith(
        expect.stringContaining('fresh-project'),
        expect.any(String)
      );
    });

    it('should copy templates for new projects', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('fresh-project', { quick: true });

      expect(mockCopyTemplates).toHaveBeenCalledWith(
        '/mock/templates',
        expect.stringContaining('fresh-project'),
        'fresh-project',
        'en'
      );
    });

    it('should skip directory structure for continue-existing', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.specweave')) return true;
        return false;
      });
      mockPromptSmartReinit.mockResolvedValue({ action: 'continue', continueExisting: true });

      await initCommand('.', { quick: true });

      expect(mockCreateDirectoryStructure).not.toHaveBeenCalled();
      expect(mockCopyTemplates).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Git initialization
  // ==========================================================================

  describe('initCommand - git initialization', () => {
    it('should initialize git when no .git directory exists', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.git')) return false;
        return false;
      });

      await initCommand('git-project', { quick: true });

      expect(mockExecFileNoThrowSync).toHaveBeenCalledWith(
        'git',
        ['init'],
        expect.objectContaining({ shell: false })
      );
    });

    it('should skip git init when .git already exists', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.git')) return true;
        return false;
      });

      await initCommand('existing-git', { quick: true });

      expect(mockExecFileNoThrowSync).not.toHaveBeenCalledWith(
        'git',
        ['init'],
        expect.anything()
      );
    });

    it('should run git add and commit after successful git init', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.git')) return false;
        return false;
      });
      mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '', exitCode: 0 });

      await initCommand('git-commit', { quick: true });

      expect(mockExecFileNoThrowSync).toHaveBeenCalledWith(
        'git',
        ['add', '.'],
        expect.objectContaining({ shell: false })
      );
      expect(mockExecFileNoThrowSync).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', 'Initial commit with SpecWeave'],
        expect.objectContaining({ shell: false })
      );
    });
  });

  // ==========================================================================
  // initCommand - Config creation
  // ==========================================================================

  describe('initCommand - config creation', () => {
    it('should create config file with correct parameters', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('config-test', { quick: true });

      expect(mockCreateConfigFile).toHaveBeenCalledWith(
        expect.stringContaining('config-test'),
        'config-test',
        expect.any(String),
        'en',
        false,
      );
    });
  });

  // ==========================================================================
  // initCommand - Plugin installation (Claude)
  // ==========================================================================

  describe('initCommand - Claude plugin installation', () => {
    it('should install plugins when tool is claude and new project', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectTool.mockResolvedValue('claude');

      await initCommand('claude-project', { quick: true });

      expect(mockInstallAllPlugins).toHaveBeenCalledWith(
        expect.objectContaining({
          forceRefresh: undefined,
          lazyMode: true,
        })
      );
    });

    it('should pass lazyMode=false when fullInstall option is set', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectTool.mockResolvedValue('claude');

      await initCommand('full-install', { quick: true, fullInstall: true });

      expect(mockInstallAllPlugins).toHaveBeenCalledWith(
        expect.objectContaining({
          lazyMode: false,
        })
      );
    });

    it('should skip plugin install for continue-existing', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.specweave')) return true;
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockPromptSmartReinit.mockResolvedValue({ action: 'continue', continueExisting: true });
      mockReadJsonSync.mockReturnValue({ adapters: { default: 'claude' } });

      await initCommand('.', { quick: true });

      expect(mockInstallAllPlugins).not.toHaveBeenCalled();
    });

    it('should enable agent teams env var for claude tool', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectTool.mockResolvedValue('claude');

      await initCommand('agent-teams', { quick: true });

      expect(mockEnableAgentTeamsEnvVar).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Non-Claude adapter
  // ==========================================================================

  describe('initCommand - non-Claude adapter installation', () => {
    it('should install adapter for non-Claude tools', async () => {
      mockExistsSync.mockReturnValue(false);
      const mockAdapter = {
        install: vi.fn(),
        postInstall: vi.fn(),
        supportsPlugins: vi.fn().mockReturnValue(false),
        compilePlugin: vi.fn(),
      };
      mockGetAdapter.mockReturnValue(mockAdapter);

      await initCommand('cursor-project', { adapter: 'cursor', quick: true });

      expect(mockAdapter.install).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: expect.stringContaining('cursor-project'),
          projectName: 'cursor-project',
        })
      );
    });

    it('should throw when non-Claude adapter is not found', async () => {
      mockExistsSync.mockReturnValue(false);
      mockGetAdapter.mockReturnValue(null);

      await expect(
        initCommand('bad-adapter', { adapter: 'nonexistent', quick: true })
      ).rejects.toThrow('process.exit called');
    });

    it('should call postInstall for non-Claude tools', async () => {
      mockExistsSync.mockReturnValue(false);
      const mockAdapter = {
        install: vi.fn(),
        postInstall: vi.fn(),
        supportsPlugins: vi.fn().mockReturnValue(false),
        compilePlugin: vi.fn(),
      };
      mockGetAdapter.mockReturnValue(mockAdapter);

      await initCommand('generic-project', { adapter: 'generic', quick: true });

      expect(mockAdapter.postInstall).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: expect.stringContaining('generic-project'),
          projectName: 'generic-project',
          docsApproach: 'incremental',
        })
      );
    });

    it('should copy plugins folder for non-Claude adapters', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('plugins')) return true;
        return false;
      });
      const mockAdapter = {
        install: vi.fn(),
        postInstall: vi.fn(),
        supportsPlugins: vi.fn().mockReturnValue(false),
        compilePlugin: vi.fn(),
      };
      mockGetAdapter.mockReturnValue(mockAdapter);

      await initCommand('plugins-copy', { adapter: 'generic', quick: true });

      expect(mockCopySync).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Repository hosting setup
  // ==========================================================================

  describe('initCommand - repository hosting', () => {
    it('should call setupRepositoryHosting', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('repo-test', { quick: true });

      expect(mockSetupRepositoryHosting).toHaveBeenCalledWith(
        expect.objectContaining({
          isCI: true,
          language: 'en',
        })
      );
    });

    it('should update config with github provider when hosting is github', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockReadJson.mockResolvedValue({ repository: {} });
      mockSetupRepositoryHosting.mockResolvedValue({
        hosting: 'github-single',
        githubRepoSelection: { org: 'my-org', pat: 'token' },
      });

      await initCommand('github-repo', { quick: true });

      expect(mockWriteJson).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.objectContaining({
          repository: expect.objectContaining({ provider: 'github' }),
        }),
        expect.anything()
      );
    });

    it('should update config with ado provider when hosting is ado', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockReadJson.mockResolvedValue({ repository: {} });
      mockSetupRepositoryHosting.mockResolvedValue({
        hosting: 'ado-single',
        adoProjectSelection: { org: 'my-ado-org', pat: 'token', projects: ['proj'] },
      });

      await initCommand('ado-repo', { quick: true });

      expect(mockWriteJson).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.objectContaining({
          repository: expect.objectContaining({ provider: 'ado' }),
        }),
        expect.anything()
      );
    });

    it('should update config with bitbucket provider', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockReadJson.mockResolvedValue({ repository: {} });
      mockSetupRepositoryHosting.mockResolvedValue({
        hosting: 'bitbucket-single',
        bitbucketRepoSelection: { workspace: 'my-workspace' },
      });

      await initCommand('bb-repo', { quick: true });

      expect(mockWriteJson).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.objectContaining({
          repository: expect.objectContaining({ provider: 'bitbucket' }),
        }),
        expect.anything()
      );
    });

    it('should trigger ADO repo cloning when adoProjectSelection exists', async () => {
      mockExistsSync.mockReturnValue(false);
      mockSetupRepositoryHosting.mockResolvedValue({
        hosting: 'ado-multirepo',
        adoProjectSelection: { org: 'org', pat: 'pat', projects: ['p1'] },
        adoClonePatternResult: { pattern: 'all' },
      });

      await initCommand('ado-clone', { quick: true });

      expect(mockTriggerAdoRepoCloning).toHaveBeenCalled();
    });

    it('should trigger GitHub repo cloning when githubRepoSelection exists', async () => {
      mockExistsSync.mockReturnValue(false);
      mockSetupRepositoryHosting.mockResolvedValue({
        hosting: 'github-multirepo',
        githubRepoSelection: { org: 'gh-org', pat: 'token' },
        adoClonePatternResult: { pattern: 'all' },
        gitUrlFormat: 'https',
      });
      mockTriggerGitHubRepoCloning.mockResolvedValue({ jobId: 'job-1', clonedRepos: ['repo-a', 'repo-b'] });

      await initCommand('gh-clone', { quick: true });

      expect(mockTriggerGitHubRepoCloning).toHaveBeenCalled();
    });

    it('should trigger Bitbucket repo cloning when bitbucketRepoSelection exists', async () => {
      mockExistsSync.mockReturnValue(false);
      mockSetupRepositoryHosting.mockResolvedValue({
        hosting: 'bitbucket-multirepo',
        bitbucketRepoSelection: { workspace: 'ws' },
        adoClonePatternResult: { pattern: 'all' },
      });

      await initCommand('bb-clone', { quick: true });

      expect(mockTriggerBitbucketRepoCloning).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - GitHub project folder creation
  // ==========================================================================

  describe('initCommand - GitHub project folder creation', () => {
    it('should create project folders when repos are cloned', async () => {
      mockExistsSync.mockReturnValue(false);
      mockSetupRepositoryHosting.mockResolvedValue({
        hosting: 'github-multirepo',
        githubRepoSelection: { org: 'org', pat: 'token' },
        adoClonePatternResult: { pattern: 'all' },
        gitUrlFormat: 'https',
      });
      mockTriggerGitHubRepoCloning.mockResolvedValue({ jobId: 'job-1', clonedRepos: ['repo-a', 'repo-b'] });
      mockCreateProjectFolders.mockResolvedValue(['repo-a', 'repo-b']);

      await initCommand('multi-repo', { quick: true });

      expect(mockCreateProjectFolders).toHaveBeenCalledWith(
        expect.stringContaining('multi-repo'),
        ['repo-a', 'repo-b']
      );
    });
  });

  // ==========================================================================
  // initCommand - Wizard flow (external import, testing, etc.)
  // ==========================================================================

  describe('initCommand - wizard steps', () => {
    it('should run external import in wizard flow for new projects', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('wizard-test', { quick: true });

      expect(mockPromptAndRunExternalImport).toHaveBeenCalled();
    });

    it('should handle background import results', async () => {
      mockExistsSync.mockReturnValue(false);
      mockPromptAndRunExternalImport.mockResolvedValue({
        isBackground: true,
        jobId: 'import-job-1',
      });

      await initCommand('bg-import', { quick: true });

      // Should continue without error
      expect(mockShowNextSteps).toHaveBeenCalled();
    });

    it('should handle import failure gracefully', async () => {
      mockExistsSync.mockReturnValue(false);
      mockPromptAndRunExternalImport.mockRejectedValue(new Error('Import failed'));

      await initCommand('import-fail', { quick: true });

      // Should continue past the error
      expect(mockShowNextSteps).toHaveBeenCalled();
    });

    it('should skip testing config in CI mode', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('ci-test', { quick: true });

      // CI mode skips interactive testing config
      expect(mockPromptTestingConfig).not.toHaveBeenCalled();
    });

    it('should skip deep interview config in CI mode', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('ci-interview', { quick: true });

      expect(mockPromptDeepInterviewConfig).not.toHaveBeenCalled();
    });

    it('should skip quality gates config in CI mode', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('ci-quality', { quick: true });

      expect(mockPromptQualityGatesConfig).not.toHaveBeenCalled();
    });

    it('should apply default translation config in CI mode', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('ci-translation', { quick: true });

      expect(mockGetDefaultTranslationConfig).toHaveBeenCalledWith('en');
      expect(mockUpdateConfigWithTranslation).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Living docs
  // ==========================================================================

  describe('initCommand - living docs', () => {
    it('should skip living docs when noLivingDocs option is set', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('no-docs', { quick: true, noLivingDocs: true });

      expect(mockCollectLivingDocsInputs).not.toHaveBeenCalled();
    });

    it('should call collectLivingDocsInputs when not disabled', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('with-docs', { quick: true });

      expect(mockCollectLivingDocsInputs).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'en',
          isCi: true,
        })
      );
    });

    it('should handle living docs failure gracefully', async () => {
      mockExistsSync.mockReturnValue(false);
      mockCollectLivingDocsInputs.mockRejectedValue(new Error('Living docs failed'));

      await initCommand('docs-fail', { quick: true });

      // Should continue without crashing
      expect(mockShowNextSteps).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - LSP setup (CI mode)
  // ==========================================================================

  describe('initCommand - LSP setup in CI mode', () => {
    it('should auto-enable LSP in CI mode for claude tool', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockReadJson.mockResolvedValue({});
      mockDetectTool.mockResolvedValue('claude');

      await initCommand('lsp-ci', { quick: true });

      expect(mockSetupLspEnvVar).toHaveBeenCalled();
    });

    it('should write LSP config to config.json in CI mode', async () => {
      // Make config.json exist at the right check point
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockReadJson.mockResolvedValue({ repository: {} });
      mockDetectTool.mockResolvedValue('claude');

      await initCommand('lsp-config', { quick: true });

      // Should have written LSP config
      expect(mockWriteJson).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.objectContaining({
          lsp: expect.objectContaining({
            enabled: true,
          }),
        }),
        expect.anything()
      );
    });

    it('should not set up LSP for non-Claude tools', async () => {
      mockExistsSync.mockReturnValue(false);
      const mockAdapter = {
        install: vi.fn(),
        postInstall: vi.fn(),
        supportsPlugins: vi.fn().mockReturnValue(false),
        compilePlugin: vi.fn(),
      };
      mockGetAdapter.mockReturnValue(mockAdapter);

      await initCommand('no-lsp', { adapter: 'generic', quick: true });

      expect(mockSetupLspEnvVar).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - showNextSteps
  // ==========================================================================

  describe('initCommand - showNextSteps', () => {
    it('should call showNextSteps with correct parameters on completion', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectTool.mockResolvedValue('claude');

      await initCommand('final-test', { quick: true });

      expect(mockShowNextSteps).toHaveBeenCalledWith(
        'final-test',
        'claude',
        'en',
        false, // usedDotNotation
        expect.objectContaining({
          pluginAutoInstalled: true,
        })
      );
    });

    it('should pass usedDotNotation=true when using dot notation', async () => {
      mockExistsSync.mockReturnValue(false);
      mockReaddirSync.mockReturnValue([]);

      await initCommand('.', { quick: true });

      expect(mockShowNextSteps).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'en',
        true, // usedDotNotation
        expect.anything()
      );
    });

    it('should not pass plugin info for non-Claude tools', async () => {
      mockExistsSync.mockReturnValue(false);
      const mockAdapter = {
        install: vi.fn(),
        postInstall: vi.fn(),
        supportsPlugins: vi.fn().mockReturnValue(false),
        compilePlugin: vi.fn(),
      };
      mockGetAdapter.mockReturnValue(mockAdapter);

      await initCommand('generic-final', { adapter: 'generic', quick: true });

      expect(mockShowNextSteps).toHaveBeenCalledWith(
        'generic-final',
        'generic',
        'en',
        false,
        undefined
      );
    });
  });

  // ==========================================================================
  // initCommand - Error handling
  // ==========================================================================

  describe('initCommand - error handling', () => {
    it('should handle spinner fail on error and exit', async () => {
      mockExistsSync.mockReturnValue(false);
      mockCreateDirectoryStructure.mockRejectedValue(new Error('Disk full'));

      await expect(
        initCommand('error-project', { quick: true })
      ).rejects.toThrow('process.exit called');

      expect(mockOraInstance.fail).toHaveBeenCalledWith('Failed to create project');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ==========================================================================
  // initCommand - Existing directory without .specweave
  // ==========================================================================

  describe('initCommand - existing directory without .specweave', () => {
    it('should proceed in CI when existing dir has files but no .specweave', async () => {
      let callCount = 0;
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.specweave')) return false;
        if (typeof p === 'string' && p.endsWith('.git')) return false;
        // The target directory itself exists
        if (typeof p === 'string' && p.endsWith('existing-dir')) {
          return true;
        }
        return false;
      });
      // readdirSync should return non-hidden files for the existing dir check
      mockReaddirSync.mockReturnValue(['README.md', 'package.json']);

      await initCommand('existing-dir', { quick: true });

      // Should proceed and create structure
      expect(mockCreateDirectoryStructure).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Force refresh
  // ==========================================================================

  describe('initCommand - force refresh option', () => {
    it('should pass forceRefresh to installAllPlugins', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectTool.mockResolvedValue('claude');

      await initCommand('force-refresh', { quick: true, forceRefresh: true });

      expect(mockInstallAllPlugins).toHaveBeenCalledWith(
        expect.objectContaining({
          forceRefresh: true,
        })
      );
    });
  });

  // ==========================================================================
  // initCommand - Auto-install external plugin
  // ==========================================================================

  describe('initCommand - auto-install external plugin', () => {
    it('should auto-install github plugin when default profile is github', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockDetectTool.mockResolvedValue('claude');
      mockReadJson.mockResolvedValue({
        repository: {},
        sync: {
          defaultProfile: 'github-default',
          profiles: {
            'github-default': { provider: 'github' },
          },
        },
      });
      mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '', exitCode: 0 });

      await initCommand('auto-plugin', { quick: true });

      expect(mockExecFileNoThrowSync).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['plugin', 'install', 'specweave-github@specweave']),
      );
    });

    it('should auto-install jira plugin when default profile is jira', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockDetectTool.mockResolvedValue('claude');
      mockReadJson.mockResolvedValue({
        repository: {},
        sync: {
          defaultProfile: 'jira-default',
          profiles: {
            'jira-default': { provider: 'jira' },
          },
        },
      });
      mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '', exitCode: 0 });

      await initCommand('auto-jira', { quick: true });

      expect(mockExecFileNoThrowSync).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['plugin', 'install', 'specweave-jira@specweave']),
      );
    });
  });

  // ==========================================================================
  // initCommand - Interactive mode (non-CI)
  // ==========================================================================

  describe('initCommand - interactive mode', () => {
    beforeEach(() => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      // Ensure we have a TTY-like environment for interactive tests
      // Note: These tests mock the prompts, so TTY state doesn't affect outcomes
    });

    it('should prompt for language selection in interactive mode', async () => {
      // We need stdin.isTTY to be true for interactive detection
      // Since we can't easily control that, check that the right path is taken
      // based on isNonInteractive returning false

      // With no CI vars and TTY, should call promptLanguageSelection
      // But in test env, stdin.isTTY might be false, making it non-interactive
      // So we test with quick=false and no CI vars
      if (!process.stdin.isTTY) {
        // Non-TTY: still CI-like, uses defaults
        mockExistsSync.mockReturnValue(false);
        await initCommand('interactive', {});
        // In non-TTY, getDefaultLanguageSelection is used
        expect(mockGetDefaultLanguageSelection).toHaveBeenCalled();
      } else {
        mockExistsSync.mockReturnValue(false);
        mockConfirm.mockResolvedValue(true);
        mockInput.mockResolvedValue('interactive');

        await initCommand(undefined, {});

        expect(mockPromptLanguageSelection).toHaveBeenCalled();
      }
    });

    it('should prompt for project name when not provided in interactive mode', async () => {
      if (process.stdin.isTTY) {
        mockExistsSync.mockReturnValue(false);
        mockConfirm.mockResolvedValue(true);
        mockInput.mockResolvedValue('my-cool-project');

        await initCommand(undefined, {});

        expect(mockInput).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Project name:',
            default: 'my-saas',
          })
        );
      }
    });

    it('should ask to confirm tool detection in interactive mode', async () => {
      if (process.stdin.isTTY) {
        mockExistsSync.mockReturnValue(false);
        mockDetectTool.mockResolvedValue('claude');
        mockConfirm.mockResolvedValue(true);
        mockInput.mockResolvedValue('interactive-tool');

        await initCommand('interactive-tool', {});

        // Should have called confirm for tool detection
        expect(mockConfirm).toHaveBeenCalled();
      }
    });

    it('should use generic adapter when user declines detected tool', async () => {
      if (process.stdin.isTTY) {
        mockExistsSync.mockReturnValue(false);
        mockDetectTool.mockResolvedValue('claude');

        // First confirm = tool detection (decline), rest = true
        let confirmCallCount = 0;
        mockConfirm.mockImplementation(() => {
          confirmCallCount++;
          // The tool confirm is typically the first confirm after tool detection
          if (confirmCallCount === 1) return Promise.resolve(false);
          return Promise.resolve(true);
        });

        const mockGenericAdapter = {
          install: vi.fn(),
          postInstall: vi.fn(),
          supportsPlugins: vi.fn().mockReturnValue(false),
          compilePlugin: vi.fn(),
        };
        mockGetAdapter.mockReturnValue(mockGenericAdapter);

        await initCommand('decline-tool', {});

        expect(mockGenericAdapter.install).toHaveBeenCalled();
      }
    });
  });

  // ==========================================================================
  // initCommand - Existing directory with files and prompt
  // ==========================================================================

  describe('initCommand - directory with existing files (non-CI)', () => {
    it('should exit when user declines init in non-empty directory', async () => {
      if (process.stdin.isTTY) {
        delete process.env.CI;
        mockExistsSync.mockImplementation((p: string) => {
          if (typeof p === 'string' && p.endsWith('.specweave')) return false;
          if (typeof p === 'string' && p.endsWith('.git')) return false;
          return true; // directory exists
        });
        mockReaddirSync.mockReturnValue(['file1.ts']);
        mockConfirm.mockResolvedValueOnce(false); // decline init in existing dir

        await expect(
          initCommand('.', {})
        ).rejects.toThrow('process.exit called');

        expect(exitSpy).toHaveBeenCalledWith(0);
      }
    });
  });

  // ==========================================================================
  // initCommand - Wizard go-back navigation
  // ==========================================================================

  describe('initCommand - wizard go-back navigation', () => {
    it('should handle go-back from external import step', async () => {
      mockExistsSync.mockReturnValue(false);
      let importCallCount = 0;
      mockPromptAndRunExternalImport.mockImplementation(() => {
        importCallCount++;
        if (importCallCount === 1) {
          return Promise.resolve({ goBack: MOCK_WIZARD_BACK });
        }
        return Promise.resolve({ totalCount: 0, platforms: [] });
      });

      await initCommand('goback-import', { quick: true });

      // logGoingBack should have been called
      expect(mockLogGoingBack).toHaveBeenCalled();
      // The import should have been retried
      expect(importCallCount).toBe(2);
    });
  });

  // ==========================================================================
  // initCommand - Git hooks (CI mode)
  // ==========================================================================

  describe('initCommand - git hooks in CI mode', () => {
    it('should NOT prompt for git hooks in CI mode', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.git')) return true;
        return false;
      });

      await initCommand('hooks-ci', { quick: true });

      // installGitHooks should NOT be called directly in CI mode
      // (no prompt in CI)
      expect(mockInstallGitHooks).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Framework repo detection
  // ==========================================================================

  describe('initCommand - framework repo detection', () => {
    it('should detect specweave framework repo from package.json', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('package.json')) return true;
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (typeof p === 'string' && p.includes('package.json')) {
          return { name: 'specweave' };
        }
        return {};
      });

      await initCommand('framework-project', { quick: true });

      // setupIssueTracker should be called with isFrameworkRepo=true
      expect(mockSetupIssueTracker).toHaveBeenCalledWith(
        expect.objectContaining({
          isFrameworkRepo: true,
        })
      );
    });

    it('should not flag as framework repo for other packages', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('package.json')) return true;
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (typeof p === 'string' && p.includes('package.json')) {
          return { name: 'my-regular-project' };
        }
        return {};
      });

      await initCommand('regular-project', { quick: true });

      expect(mockSetupIssueTracker).toHaveBeenCalledWith(
        expect.objectContaining({
          isFrameworkRepo: false,
        })
      );
    });
  });

  // ==========================================================================
  // initCommand - Issue tracker wrapper
  // ==========================================================================

  describe('initCommand - issue tracker setup', () => {
    it('should call setupIssueTracker during init', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('tracker-test', { quick: true });

      expect(mockSetupIssueTracker).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'en',
          maxRetries: 3,
          isCI: true,
        })
      );
    });

    it('should handle issue tracker setup failure gracefully', async () => {
      mockExistsSync.mockReturnValue(false);
      mockSetupIssueTracker.mockRejectedValue(new Error('Tracker fail'));

      await initCommand('tracker-fail', { quick: true });

      // Should continue without crashing
      expect(mockShowNextSteps).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Tech stack option
  // ==========================================================================

  describe('initCommand - tech stack option', () => {
    it('should pass techStack to adapter install for non-Claude', async () => {
      mockExistsSync.mockReturnValue(false);
      const mockAdapter = {
        install: vi.fn(),
        postInstall: vi.fn(),
        supportsPlugins: vi.fn().mockReturnValue(false),
        compilePlugin: vi.fn(),
      };
      mockGetAdapter.mockReturnValue(mockAdapter);

      await initCommand('ts-project', { adapter: 'generic', quick: true, techStack: 'typescript' });

      expect(mockAdapter.install).toHaveBeenCalledWith(
        expect.objectContaining({
          techStack: { language: 'typescript' },
        })
      );
    });
  });

  // ==========================================================================
  // initCommand - Smart re-init with named project (not dot)
  // ==========================================================================

  describe('initCommand - named project with existing .specweave', () => {
    it('should call promptSmartReinit for named project with .specweave', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        // Target dir exists
        if (typeof p === 'string' && p.endsWith('named-reinit')) return true;
        // .specweave exists inside it
        if (typeof p === 'string' && p.includes('named-reinit') && p.endsWith('.specweave')) return true;
        return false;
      });
      mockPromptSmartReinit.mockResolvedValue({ action: 'fresh', continueExisting: false });

      await initCommand('named-reinit', { quick: true });

      expect(mockPromptSmartReinit).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Plugin enablement in project settings
  // ==========================================================================

  describe('initCommand - plugin enablement', () => {
    it('should enable plugins in project settings when install succeeds', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectTool.mockResolvedValue('claude');
      mockInstallAllPlugins.mockResolvedValue({ success: true, marketplaceOnly: false });

      await initCommand('plugin-enable', { quick: true });

      expect(mockEnablePlugin).toHaveBeenCalledWith(
        'sw',
        'specweave',
        expect.stringContaining('.claude')
      );
    });

    it('should skip plugin enablement when marketplace-only install', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectTool.mockResolvedValue('claude');
      mockInstallAllPlugins.mockResolvedValue({ success: true, marketplaceOnly: true });

      await initCommand('marketplace-only', { quick: true });

      expect(mockEnablePlugin).not.toHaveBeenCalled();
    });
  });
});
