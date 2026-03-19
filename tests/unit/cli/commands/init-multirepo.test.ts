/**
 * Unit tests for init unified flow (increment 0581)
 *
 * Tests: 2-choice prompt (no 4-way), repositories/ always created,
 * umbrella config unconditional, banner shows "Workspace", next-steps
 * always show "specweave get", sync-setup chain removed.
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

  // Default: greenfield directory (no .specweave, no .git)
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
// AC-US1-01: No 4-way promptProjectSetup prompt
// ============================================================================

describe('AC-US1-01: No 4-way prompt — only 2-choice prompt', () => {
  it('promptProjectSetup is called for greenfield projects (no .git)', async () => {
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

    mockPromptProjectSetup.mockResolvedValue('add-later');

    await initCommand('.', { adapter: 'claude' });

    expect(mockPromptProjectSetup).toHaveBeenCalled();
  });

  it('promptProjectSetup is NOT called for existing projects (continueExisting)', async () => {
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

  it('no standalone confirm question about "multiple repositories"', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockPromptProjectSetup.mockResolvedValue('add-later');

    await initCommand('.', { adapter: 'claude' });

    const confirmCalls = mockConfirm.mock.calls;
    for (const call of confirmCalls) {
      const message = call[0]?.message || '';
      expect(message).not.toMatch(/multiple.*(repos|repositories)/i);
    }
  });

  it('CI/non-interactive: promptProjectSetup is NOT called', async () => {
    await initCommand('.', { adapter: 'claude', quick: true });

    expect(mockPromptProjectSetup).not.toHaveBeenCalled();
  });
});

// ============================================================================
// AC-US1-03: repositories/ always created
// ============================================================================

describe('AC-US1-03: repositories/ always created', () => {
  it('repositories/ created when user selects add-later', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockPromptProjectSetup.mockResolvedValue('add-later');

    await initCommand('.', { adapter: 'claude' });

    expect(mockMkdirSync).toHaveBeenCalledWith(
      path.join(TEST_DIR, 'repositories'),
      expect.objectContaining({ recursive: true })
    );
  });

  it('repositories/ created when user selects clone-repos', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockPromptProjectSetup.mockResolvedValue('clone-repos');
    mockPromptRepoUrls.mockResolvedValue([]);

    await initCommand('.', { adapter: 'claude' });

    expect(mockMkdirSync).toHaveBeenCalledWith(
      path.join(TEST_DIR, 'repositories'),
      expect.objectContaining({ recursive: true })
    );
  });

  it('repositories/ created in CI mode (no prompt)', async () => {
    await initCommand('.', { adapter: 'claude', quick: true });

    expect(mockMkdirSync).toHaveBeenCalledWith(
      path.join(TEST_DIR, 'repositories'),
      expect.objectContaining({ recursive: true })
    );
  });
});

// ============================================================================
// AC-US1-03: umbrella config always written
// ============================================================================

describe('AC-US1-03: umbrella config unconditional', () => {
  it('config has umbrella.enabled=true even with zero repos (add-later)', async () => {
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

    mockPromptProjectSetup.mockResolvedValue('add-later');

    await initCommand('.', { adapter: 'claude' });

    // umbrella.enabled is always set
    expect(writtenConfig.umbrella?.enabled).toBe(true);
    expect(writtenConfig.umbrella?.childRepos).toEqual([]);
    // multiProject.enabled is never written
    expect(writtenConfig.multiProject).toBeUndefined();
  });

  it('config uses buildUmbrellaConfig when repos are discovered', async () => {
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

    await initCommand('.', { adapter: 'claude' });

    expect(mockBuildUmbrellaConfig).toHaveBeenCalled();
    expect(writtenConfig.umbrella?.enabled).toBe(true);
  });

  it('config never contains multiProject.enabled', async () => {
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

    mockPromptProjectSetup.mockResolvedValue('add-later');

    await initCommand('.', { adapter: 'claude' });

    expect(writtenConfig.multiProject).toBeUndefined();
  });
});

// ============================================================================
// Clone-repos flow
// ============================================================================

describe('Clone-repos flow', () => {
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

    await initCommand('.', { adapter: 'claude' });

    expect(mockCloneReposIntoWorkspace).toHaveBeenCalledWith(
      TEST_DIR,
      expect.arrayContaining([expect.objectContaining({ org: 'acme', name: 'app' })]),
    );
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

    await expect(initCommand('.', { adapter: 'claude' })).resolves.toBeUndefined();
  });
});

// ============================================================================
// Sync-setup chain removed
// ============================================================================

describe('Sync-setup chain removed', () => {
  it('sync-setup is never called after init (no chain)', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockPromptProjectSetup.mockResolvedValue('add-later');
    mockConfirm.mockResolvedValue(true);

    await initCommand('.', { adapter: 'claude' });

    expect(mockSyncSetupCommand).not.toHaveBeenCalled();
  });
});

// ============================================================================
// AC-US1-04: Banner shows "Workspace (N repositories)"
// ============================================================================

describe('AC-US1-04: Banner shows "Workspace"', () => {
  it('displaySummaryBanner is called (banner renders)', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.endsWith('.git')) return false;
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('repositories')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mockPromptProjectSetup.mockResolvedValue('add-later');

    await initCommand('.', { adapter: 'claude' });

    expect(mockDisplaySummaryBanner).toHaveBeenCalled();
  });
});

// ============================================================================
// AC-US1-05: Next-steps messaging
// ============================================================================

describe('AC-US1-05: Next-steps always show specweave get, never migrate-to-umbrella', () => {
  it('never shows migrate-to-umbrella', () => {
    showNextSteps('test-project', 'claude', 'en', true, { pluginAutoInstalled: true }, {});

    const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).not.toContain('migrate-to-umbrella');
  });

  it('always shows specweave get', () => {
    showNextSteps('test-project', 'claude', 'en', true, { pluginAutoInstalled: true }, {});

    const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('specweave get');
  });

  it('shows specweave get with empty context', () => {
    showNextSteps('test-project', 'claude', 'en', true, { pluginAutoInstalled: true });

    const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('specweave get');
    expect(output).not.toContain('migrate-to-umbrella');
  });
});

// ============================================================================
// Dead config writes removed
// ============================================================================

describe('Dead config writes removed', () => {
  it('config does not contain repository.structure or project.structureDeferred', async () => {
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

    mockPromptProjectSetup.mockResolvedValue('add-later');

    await initCommand('.', { adapter: 'claude' });

    expect(writtenConfig.repository?.structure).toBeUndefined();
    expect(writtenConfig.project?.structureDeferred).toBeUndefined();
  });
});

// ============================================================================
// showNextSteps context type — isUmbrella removed
// ============================================================================

describe('NextStepsContext type cleanup', () => {
  it('showNextSteps works with empty context (no isUmbrella field)', () => {
    // This verifies the type change — isUmbrella no longer exists
    expect(() => {
      showNextSteps('test', 'claude', 'en', true, { pluginAutoInstalled: true }, {});
    }).not.toThrow();
  });

  it('showNextSteps warns about misplaced repos', () => {
    showNextSteps('test', 'claude', 'en', true, { pluginAutoInstalled: true }, { misplacedRepos: ['orphan-repo'] });

    const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('orphan-repo');
  });
});
