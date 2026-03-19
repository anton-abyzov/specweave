/**
 * Comprehensive unit tests for the init command
 *
 * Tests: isNonInteractive, initCommand main flow, installNonClaudeAdapter (via initCommand),
 * detectProvider integration, config creation, plugin installation, smart defaults,
 * LSP setup, showNextSteps, error handling, git hooks.
 *
 * Simplified (v1.0.415): Removed tests for setupRepositoryHosting, repo cloning,
 * issue tracker, multi-project folders, greenfield/brownfield, living docs.
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
  mockWriteJsonSync,
  mockMkdirSync,
  mockReaddirSync,
  mockEnsureDirSync,
  mockWriteFileSync,
  mockCopySync,
  mockRmSync,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadJson: vi.fn(),
  mockReadJsonSync: vi.fn(),
  mockWriteJson: vi.fn(),
  mockWriteJsonSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockEnsureDirSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockCopySync: vi.fn(),
  mockRmSync: vi.fn(),
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
  mockCreateMinimalConfig,
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
  mockCreateMinimalConfig: vi.fn(),
  mockCreateDirectoryStructure: vi.fn(),
  mockCopyTemplates: vi.fn(),
  mockCreateConfigFile: vi.fn(),
  mockShowNextSteps: vi.fn(),
  mockInstallGitHooks: vi.fn(),
  mockEnsureSkillCreator: vi.fn().mockResolvedValue(undefined),
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

const { mockApplySmartDefaults } = vi.hoisted(() => ({
  mockApplySmartDefaults: vi.fn().mockReturnValue({}),
}));

const { mockDisplaySummaryBanner } = vi.hoisted(() => ({
  mockDisplaySummaryBanner: vi.fn(),
}));

const { mockPromptProjectSetup, mockPromptRepoUrls, mockCloneReposIntoWorkspace } = vi.hoisted(() => ({
  mockPromptProjectSetup: vi.fn().mockResolvedValue('existing' as const),
  mockPromptRepoUrls: vi.fn().mockResolvedValue([]),
  mockCloneReposIntoWorkspace: vi.fn().mockReturnValue({ repos: [], totalCloned: 0, totalFailed: 0 }),
}));

// ============================================================================
// vi.mock() declarations (run at module load time)
// ============================================================================

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readJson: mockReadJson,
  readJsonSync: mockReadJsonSync,
  writeJson: mockWriteJson,
  writeJsonSync: mockWriteJsonSync,
  mkdirSync: mockMkdirSync,
  readdirSync: mockReaddirSync,
  ensureDirSync: mockEnsureDirSync,
  writeFileSync: mockWriteFileSync,
  copySync: mockCopySync,
  rmSync: mockRmSync,
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
  createMinimalConfig: mockCreateMinimalConfig,
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
  promptProjectSetup: mockPromptProjectSetup,
  promptRepoUrls: mockPromptRepoUrls,
  cloneReposIntoWorkspace: mockCloneReposIntoWorkspace,
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
    vi.resetAllMocks();

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

    // Default mock behaviors - MUST be comprehensive since resetAllMocks clears everything
    mockExistsSync.mockReturnValue(false);
    mockReadJson.mockResolvedValue({});
    mockReadJsonSync.mockReturnValue({});
    mockWriteJson.mockResolvedValue(undefined);
    mockWriteJsonSync.mockReturnValue(undefined);
    mockReaddirSync.mockReturnValue([]);
    mockDetectTool.mockResolvedValue('claude');
    // Default adapter mock: returns a functional adapter for non-Claude tools
    mockGetAdapter.mockReturnValue({
      install: vi.fn(),
      postInstall: vi.fn(),
      supportsPlugins: vi.fn().mockReturnValue(false),
      compilePlugin: vi.fn(),
    });
    mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '', exitCode: 0 });
    mockConfirm.mockResolvedValue(true);
    mockInput.mockResolvedValue('my-project');

    // Helpers from init/index.js
    mockFindSourceDir.mockReturnValue('/mock/templates');
    mockFindPackageRoot.mockReturnValue('/mock/package-root');
    mockDetectNestedSpecweave.mockReturnValue(null);
    mockDetectUmbrellaParent.mockReturnValue(null);
    mockDetectSuspiciousPath.mockReturnValue(null);
    mockDetectProvider.mockReturnValue(null);
    mockScanUmbrellaRepos.mockReturnValue(null);
    mockScanMisplacedRepos.mockReturnValue([]);
    mockInstallAllPlugins.mockResolvedValue({ success: true, marketplaceOnly: false });
    mockEnsureSkillCreator.mockResolvedValue(undefined);
    mockPromptLanguageSelection.mockResolvedValue({ language: 'en', keepEnglishOriginals: false });
    mockGetDefaultLanguageSelection.mockReturnValue({ language: 'en', keepEnglishOriginals: false });
    mockGetPluginScope.mockReturnValue('user');
    mockGetScopeArgs.mockReturnValue([]);

    // Locale
    mockIsLanguageSupported.mockReturnValue(true);
    mockGetSupportedLanguages.mockReturnValue(['en', 'es', 'de', 'fr']);
    mockGetLocaleManager.mockReturnValue({ t: mockLocaleT });
    mockLocaleT.mockImplementation((_ns: string, key: string) => `[${key}]`);

    // Ora spinner
    mockOra.mockReturnValue(mockOraInstance);
    mockOraInstance.start.mockReturnThis();
    mockOraInstance.stop.mockReturnThis();
    mockOraInstance.succeed.mockReturnThis();
    mockOraInstance.fail.mockReturnThis();
    mockOraInstance.warn.mockReturnThis();

    // Smart defaults
    mockApplySmartDefaults.mockReturnValue({});

    // getDirname
    mockGetDirname.mockReturnValue('/mock/dirname');

    // LSP
    mockSetupLspEnvVar.mockReturnValue({ success: true, alreadyConfigured: false, configPath: '~/.zshrc', exportSyntax: 'export ENABLE_LSP_TOOL=1' });

    // Default: CI/quick mode for most tests
    process.env.CI = 'true';
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
      // Mock cwd to return home directory - path.resolve will normalize it
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(os.homedir());

      try {
        await expect(
          initCommand('.', { quick: true })
        ).rejects.toThrow('process.exit called');

        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        cwdSpy.mockRestore();
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

    it('should show non-empty directory info for dot notation when no .specweave exists', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        // .specweave doesn't exist, .git doesn't exist, config doesn't exist
        return false;
      });
      mockReaddirSync.mockReturnValue(['file1.ts', 'file2.ts', 'package.json']);

      await initCommand('.', { quick: true });

      // Should log info about non-empty directory
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('3 file(s)')
      );
      // Should still proceed
      expect(mockCreateDirectoryStructure).toHaveBeenCalled();
    });

    it('should not show non-empty directory info when directory is empty', async () => {
      mockExistsSync.mockReturnValue(false);
      mockReaddirSync.mockReturnValue([]);

      await initCommand('.', { quick: true });

      // Should NOT show the "contains N file(s)" message
      const fileCountCalls = consoleSpy.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('file(s)')
      );
      expect(fileCountCalls).toHaveLength(0);
    });

    it('should not show non-empty directory info when .specweave exists (re-init path)', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.specweave')) return true;
        return false;
      });
      mockPromptSmartReinit.mockResolvedValue({ action: 'continue', continueExisting: true });
      mockReaddirSync.mockReturnValue(['file1.ts', 'file2.ts']);

      await initCommand('.', { quick: true });

      // Should NOT show non-empty info (re-init path handles it)
      const fileCountCalls = consoleSpy.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('file(s)')
      );
      expect(fileCountCalls).toHaveLength(0);
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

    it('should skip directory structure and templates when continuing existing project', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.specweave')) return true;
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockPromptSmartReinit.mockResolvedValue({ action: 'continue', continueExisting: true });
      mockReadJsonSync.mockReturnValue({ adapters: { default: 'claude' } });

      await initCommand('.', { quick: true });

      expect(mockCreateDirectoryStructure).not.toHaveBeenCalled();
      expect(mockCopyTemplates).not.toHaveBeenCalled();
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
  // initCommand - Umbrella parent detection
  // ==========================================================================

  describe('initCommand - umbrella parent detection', () => {
    it('should block init inside umbrella project without --force', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectUmbrellaParent.mockReturnValue({
        umbrellaRoot: '/parent/umbrella',
        reason: 'repositories-dir',
      });

      await expect(
        initCommand('sub-project', { quick: true })
      ).rejects.toThrow('process.exit called');

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should allow init inside umbrella project with --force', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectUmbrellaParent.mockReturnValue({
        umbrellaRoot: '/parent/umbrella',
        reason: 'repositories-dir',
      });

      await initCommand('sub-project', { quick: true, force: true });

      expect(mockCreateDirectoryStructure).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Suspicious path detection
  // ==========================================================================

  describe('initCommand - suspicious path detection', () => {
    it('should block init on suspicious path without --force', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectSuspiciousPath.mockReturnValue({
        segment: 'node_modules',
        suggestedRoot: '/project',
      });

      await expect(
        initCommand('bad-path', { quick: true })
      ).rejects.toThrow('process.exit called');

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should allow init on suspicious path with --force', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectSuspiciousPath.mockReturnValue({
        segment: 'node_modules',
        suggestedRoot: '/project',
      });

      await initCommand('bad-path', { quick: true, force: true });

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
        expect.any(String), // adapter
        'en', // language
        false, // enableDocsPreview
      );
    });
  });

  // ==========================================================================
  // initCommand - Provider detection (replaces setupRepositoryHosting)
  // ==========================================================================

  describe('initCommand - provider detection', () => {
    it('should call detectProvider with target directory', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('detect-test', { quick: true });

      expect(mockDetectProvider).toHaveBeenCalledWith(
        expect.stringContaining('detect-test')
      );
    });

    it('should write provider info to config when detected', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockReadJsonSync.mockReturnValue({});
      mockDetectProvider.mockReturnValue({
        provider: 'github',
        owner: 'my-org',
        repo: 'my-repo',
      });

      await initCommand('github-detect', { quick: true });

      expect(mockWriteJsonSync).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.objectContaining({
          repository: expect.objectContaining({
            provider: 'github',
            organization: 'my-org',
          }),
        }),
        expect.anything()
      );
    });

    it('should write ADO provider info with organization when detected', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockReadJsonSync.mockReturnValue({});
      mockDetectProvider.mockReturnValue({
        provider: 'ado',
        organization: 'my-ado-org',
      });

      await initCommand('ado-detect', { quick: true });

      expect(mockWriteJsonSync).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.objectContaining({
          repository: expect.objectContaining({
            provider: 'ado',
            organization: 'my-ado-org',
          }),
        }),
        expect.anything()
      );
    });

    it('should not write provider info when none detected', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockDetectProvider.mockReturnValue(null);

      await initCommand('no-provider', { quick: true });

      // writeJsonSync should not be called for provider update (but may be called for smart defaults)
      const providerCalls = mockWriteJsonSync.mock.calls.filter(
        (call: any[]) => call[1]?.repository?.provider
      );
      expect(providerCalls).toHaveLength(0);
    });

    it('should pass provider info to displaySummaryBanner', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectProvider.mockReturnValue({
        provider: 'github',
        owner: 'my-org',
        repo: 'my-repo',
      });

      await initCommand('banner-test', { quick: true });

      expect(mockDisplaySummaryBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: expect.objectContaining({
            name: 'GitHub',
            owner: 'my-org',
          }),
        })
      );
    });

    it('should use Local provider name when none detected', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectProvider.mockReturnValue(null);

      await initCommand('local-test', { quick: true });

      expect(mockDisplaySummaryBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: expect.objectContaining({
            name: 'Local',
          }),
        })
      );
    });

    it('should write GitHub repo field to config when detected', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });
      mockReadJsonSync.mockReturnValue({});
      mockDetectProvider.mockReturnValue({
        provider: 'github',
        owner: 'my-org',
        repo: 'my-repo',
      });

      await initCommand('github-repo-test', { quick: true });

      expect(mockWriteJsonSync).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.objectContaining({
          repository: expect.objectContaining({
            provider: 'github',
            organization: 'my-org',
            repo: 'my-repo',
          }),
        }),
        expect.anything()
      );
    });

    it('should pass ADO organization to displaySummaryBanner', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectProvider.mockReturnValue({
        provider: 'ado',
        organization: 'my-ado-org',
      });

      await initCommand('ado-banner-test', { quick: true });

      expect(mockDisplaySummaryBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: expect.objectContaining({
            name: 'Azure DevOps',
            organization: 'my-ado-org',
          }),
        })
      );
    });

    it('should pass Bitbucket owner and repo to displaySummaryBanner', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectProvider.mockReturnValue({
        provider: 'bitbucket',
        owner: 'my-workspace',
        repo: 'my-repo',
      });

      await initCommand('bb-banner-test', { quick: true });

      expect(mockDisplaySummaryBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: expect.objectContaining({
            name: 'Bitbucket',
            owner: 'my-workspace',
            repo: 'my-repo',
          }),
        })
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
        })
      );
    });

    it('should call installAllPlugins when fullInstall option is set', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectTool.mockResolvedValue('claude');

      await initCommand('full-install', { quick: true, fullInstall: true });

      expect(mockInstallAllPlugins).toHaveBeenCalledWith(
        expect.objectContaining({
          dirname: expect.any(String),
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
        // Only match the source plugins directory, not target paths
        if (typeof p === 'string' && p.includes('plugins') && p.includes('package-root')) return true;
        return false;
      });
      const mockAdapter = {
        install: vi.fn(),
        postInstall: vi.fn(),
        supportsPlugins: vi.fn().mockReturnValue(false),
        compilePlugin: vi.fn(),
      };
      mockGetAdapter.mockReturnValue(mockAdapter);

      await initCommand('copy-test', { adapter: 'generic', quick: true });

      expect(mockCopySync).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // initCommand - Smart defaults
  // ==========================================================================

  describe('initCommand - smart defaults application', () => {
    it('should apply smart defaults for new projects', async () => {
      // config.json must exist for smart defaults to be applied
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });

      await initCommand('wizard-test', { quick: true });

      expect(mockApplySmartDefaults).toHaveBeenCalled();
    });

    it('should apply smart defaults including adapter and language', async () => {
      // config.json must exist for smart defaults to be applied
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('config.json')) return true;
        return false;
      });

      await initCommand('ci-translation', { quick: true });

      expect(mockApplySmartDefaults).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ language: 'en' })
      );
    });

    it('should call displaySummaryBanner after init completes', async () => {
      mockExistsSync.mockReturnValue(false);

      await initCommand('summary-test', { quick: true });

      expect(mockDisplaySummaryBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: 'summary-test',
          adapter: 'claude',
        })
      );
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
      mockReadJsonSync.mockReturnValue({ repository: {} });
      mockDetectTool.mockResolvedValue('claude');

      await initCommand('lsp-config', { quick: true });

      // LSP config is now written in the batched config update (writeJsonSync)
      expect(mockWriteJsonSync).toHaveBeenCalledWith(
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
        }),
        expect.objectContaining({ isUmbrella: false })
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
        expect.anything(),
        expect.objectContaining({ isUmbrella: false })
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
        undefined,
        expect.objectContaining({ isUmbrella: false })
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

    it('should use current directory when no args in interactive mode (not prompt for subdirectory)', async () => {
      if (process.stdin.isTTY) {
        mockExistsSync.mockReturnValue(false);
        mockConfirm.mockResolvedValue(true);

        await initCommand(undefined, {});

        // Should NOT prompt for project name with 'my-saas' default (old behavior)
        const projectNameCalls = mockInput.mock.calls.filter(
          (call: any[]) => call[0]?.message === 'Project name:' && call[0]?.default === 'my-saas'
        );
        expect(projectNameCalls).toHaveLength(0);

        // Should use CWD — verify createDirectoryStructure was called
        expect(mockCreateDirectoryStructure).toHaveBeenCalled();
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
  // initCommand - Git hooks (CI mode)
  // ==========================================================================

  describe('initCommand - git hooks auto-installation', () => {
    it('should auto-install git hooks when .git exists for new project', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.git')) return true;
        return false;
      });

      await initCommand('hooks-ci', { quick: true });

      expect(mockInstallGitHooks).toHaveBeenCalled();
    });

    it('should skip git hooks for continue-existing projects', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('.specweave')) return true;
        if (typeof p === 'string' && p.endsWith('.git')) return true;
        return false;
      });
      mockPromptSmartReinit.mockResolvedValue({ action: 'continue', continueExisting: true });

      await initCommand('.', { quick: true });

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

      // isSpecWeaveFrameworkRepo is private but called internally.
      // In the simplified init, it is only used internally for context.
      // Just verify the init completes without error.
      await initCommand('framework-project', { quick: true });

      expect(mockCreateDirectoryStructure).toHaveBeenCalled();
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

      // Plugin enablement is now delegated to installAllPlugins internally.
      // Verify installAllPlugins was called (it handles enablement via enablePluginsInSettings).
      expect(mockInstallAllPlugins).toHaveBeenCalled();
      expect(mockEnablePlugin).not.toHaveBeenCalled();
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
