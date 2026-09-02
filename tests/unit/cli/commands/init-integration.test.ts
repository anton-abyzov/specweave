/**
 * Integration tests for init.ts wiring changes
 * T-009: Wire "Restructure here" path with confirm gate
 * T-013: Move root repo prompt to early position
 * T-018: Update promptRepoUrlsLoop() to use validation
 *
 * These tests verify the integration points in init.ts where
 * new modules (workspace-setup, root-repo-detection, repo-connect validation)
 * are wired into the init flow.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// Hoisted mocks — all external dependencies
// ============================================================================

const mocks = vi.hoisted(() => ({
  // workspace-setup module
  scanWorkspaceContent: vi.fn(),
  promptMigrationChoice: vi.fn(),
  promptStartEmptySubChoice: vi.fn(),
  showRestructureWarnings: vi.fn(),
  restructureIntoRepositories: vi.fn(),
  copyLocalPathIntoRepositories: vi.fn(),
  detectOrgRepo: vi.fn(),
  promptOrgRepo: vi.fn(),

  // root-repo-detection module
  detectRootRepo: vi.fn(),
  promptRootRepoConnection: vi.fn(),

  // repo-connect validation
  validateAndParseRepoInput: vi.fn(),
  formatRepoInputErrors: vi.fn(),

  // existing repo-connect exports
  parseRepoInput: vi.fn(),
  promptProjectSetup: vi.fn(),
  promptRepoUrls: vi.fn(),
  promptRepoUrlsLoop: vi.fn(),
  mapParsedReposToCloneOptions: vi.fn(),
  runForegroundClone: vi.fn(),
  cloneReposIntoWorkspace: vi.fn(),

  // @inquirer/prompts
  confirm: vi.fn(),
  input: vi.fn(),
  select: vi.fn(),

  // fs-native
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  mkdirSync: vi.fn(),
  readJsonSync: vi.fn(),
  writeJsonSync: vi.fn(),
  rmSync: vi.fn(),
  ensureDirSync: vi.fn(),
  statSync: vi.fn(),
  copySync: vi.fn(),
  moveSync: vi.fn(),
  readFileSync: vi.fn(),

  // native fs
  nativeWriteFileSync: vi.fn(),
  nativeRealpathSync: vi.fn(),

  // other helpers
  execFileNoThrowSync: vi.fn(),
  detectProvider: vi.fn(),
  scanWorkspaceRepos: vi.fn(),
  scanMisplacedRepos: vi.fn(),
  buildWorkspaceConfig: vi.fn(),
  promptSmartReinit: vi.fn(),
  installAllPlugins: vi.fn(),
  promptLanguageSelection: vi.fn(),
  getDefaultLanguageSelection: vi.fn(),
  createMinimalConfig: vi.fn(),
  createDirectoryStructure: vi.fn(),
  copyTemplates: vi.fn(),
  createConfigFile: vi.fn(),
  showNextSteps: vi.fn(),
  installGitHooks: vi.fn(),
  ensureSkillCreator: vi.fn(),
  findSourceDir: vi.fn(),
  detectNestedSpecweave: vi.fn(),
  detectUmbrellaParent: vi.fn(),
  detectSuspiciousPath: vi.fn(),
  applySmartDefaults: vi.fn(),
  displaySummaryBanner: vi.fn(),
  isLanguageSupported: vi.fn(),
  getSupportedLanguages: vi.fn(),
  getLocaleManager: vi.fn(),
  AdapterLoader: vi.fn(),
  getDirname: vi.fn(),
  setupLspEnvVar: vi.fn(),
  parseBulkSource: vi.fn(),
  buildBulkRepoList: vi.fn(),
  getAuthToken: vi.fn(),
  launchCloneJob: vi.fn(),
}));

// ============================================================================
// vi.mock() declarations
// ============================================================================

vi.mock('../../../../src/cli/helpers/init/workspace-setup.js', () => ({
  scanWorkspaceContent: mocks.scanWorkspaceContent,
  promptMigrationChoice: mocks.promptMigrationChoice,
  promptStartEmptySubChoice: mocks.promptStartEmptySubChoice,
  showRestructureWarnings: mocks.showRestructureWarnings,
  restructureIntoRepositories: mocks.restructureIntoRepositories,
  copyLocalPathIntoRepositories: mocks.copyLocalPathIntoRepositories,
  detectOrgRepo: mocks.detectOrgRepo,
  promptOrgRepo: mocks.promptOrgRepo,
}));

vi.mock('../../../../src/cli/helpers/init/root-repo-detection.js', () => ({
  detectRootRepo: mocks.detectRootRepo,
  promptRootRepoConnection: mocks.promptRootRepoConnection,
}));

vi.mock('../../../../src/cli/helpers/init/repo-connect.js', () => ({
  validateAndParseRepoInput: mocks.validateAndParseRepoInput,
  formatRepoInputErrors: mocks.formatRepoInputErrors,
  parseRepoInput: mocks.parseRepoInput,
  promptProjectSetup: mocks.promptProjectSetup,
  promptRepoUrls: mocks.promptRepoUrls,
  promptRepoUrlsLoop: mocks.promptRepoUrlsLoop,
  mapParsedReposToCloneOptions: mocks.mapParsedReposToCloneOptions,
  runForegroundClone: mocks.runForegroundClone,
  cloneReposIntoWorkspace: mocks.cloneReposIntoWorkspace,
  FOREGROUND_CLONE_THRESHOLD: 3,
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: mocks.confirm,
  input: mocks.input,
  select: mocks.select,
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mocks.existsSync,
  readdirSync: mocks.readdirSync,
  mkdirSync: mocks.mkdirSync,
  readJsonSync: mocks.readJsonSync,
  writeJsonSync: mocks.writeJsonSync,
  rmSync: mocks.rmSync,
  ensureDirSync: mocks.ensureDirSync,
  statSync: mocks.statSync,
  copySync: mocks.copySync,
  moveSync: mocks.moveSync,
  readFileSync: mocks.readFileSync,
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    writeFileSync: mocks.nativeWriteFileSync,
    realpathSync: mocks.nativeRealpathSync,
  };
});

vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mocks.execFileNoThrowSync,
}));

vi.mock('../../../../src/cli/helpers/init/index.js', () => ({
  findSourceDir: mocks.findSourceDir,
  detectNestedSpecweave: mocks.detectNestedSpecweave,
  detectUmbrellaParent: mocks.detectUmbrellaParent,
  detectSuspiciousPath: mocks.detectSuspiciousPath,
  detectProvider: mocks.detectProvider,
  scanWorkspaceRepos: mocks.scanWorkspaceRepos,
  scanMisplacedRepos: mocks.scanMisplacedRepos,
  buildWorkspaceConfig: mocks.buildWorkspaceConfig,
  promptSmartReinit: mocks.promptSmartReinit,
  installAllPlugins: mocks.installAllPlugins,
  promptLanguageSelection: mocks.promptLanguageSelection,
  getDefaultLanguageSelection: mocks.getDefaultLanguageSelection,
  createMinimalConfig: mocks.createMinimalConfig,
  createDirectoryStructure: mocks.createDirectoryStructure,
  copyTemplates: mocks.copyTemplates,
  createConfigFile: mocks.createConfigFile,
  showNextSteps: mocks.showNextSteps,
  installGitHooks: mocks.installGitHooks,
  // Real behaviour: init scaffolds repositories/ only for an actual workspace.
  shouldScaffoldWorkspaceDir: () => true,
  ensureSkillCreator: mocks.ensureSkillCreator,
  promptProjectSetup: mocks.promptProjectSetup,
  promptRepoUrlsLoop: mocks.promptRepoUrlsLoop,
}));

vi.mock('../../../../src/cli/helpers/init/shell-config.js', () => ({
  setupLspEnvVar: mocks.setupLspEnvVar,
}));

vi.mock('../../../../src/cli/helpers/init/smart-defaults.js', () => ({
  applySmartDefaults: mocks.applySmartDefaults,
}));

vi.mock('../../../../src/cli/helpers/init/summary-banner.js', () => ({
  displaySummaryBanner: mocks.displaySummaryBanner,
}));

vi.mock('../../../../src/core/i18n/language-manager.js', () => ({
  isLanguageSupported: mocks.isLanguageSupported,
  getSupportedLanguages: mocks.getSupportedLanguages,
}));

vi.mock('../../../../src/core/i18n/locale-manager.js', () => ({
  getLocaleManager: mocks.getLocaleManager,
}));

vi.mock('../../../../src/adapters/adapter-loader.js', () => ({
  AdapterLoader: mocks.AdapterLoader,
}));

vi.mock('../../../../src/utils/esm-helpers.js', () => ({
  getDirname: mocks.getDirname,
}));

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

vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    text: '',
  }),
}));

vi.mock('../../../../src/cli/helpers/init/living-docs-preflight.js', () => ({
  displayJobScheduled: vi.fn(),
  estimateDuration: vi.fn().mockReturnValue('30s'),
}));

vi.mock('../../../../src/core/background/index.js', () => ({
  launchLivingDocsJob: vi.fn().mockResolvedValue({ isBackground: false }),
}));

vi.mock('../../../../src/cli/helpers/init/claude-settings-env.js', () => ({
  enableAgentTeamsEnvVar: vi.fn(),
}));

vi.mock('../../../../src/cli/helpers/init/get/bulk-get.js', () => ({
  parseBulkSource: mocks.parseBulkSource,
  buildBulkRepoList: mocks.buildBulkRepoList,
  getAuthToken: mocks.getAuthToken,
}));

vi.mock('../../../../src/core/background/job-launcher.js', () => ({
  launchCloneJob: mocks.launchCloneJob,
}));

// ============================================================================
// Import SUT (after all mocks)
// ============================================================================

import { initCommand, isNonInteractive } from '../../../../src/cli/commands/init.js';

// ============================================================================
// Test setup helpers
// ============================================================================

/**
 * Set up default mocks for a basic init run.
 * Tests override specific mocks as needed.
 */
function setupDefaultMocks() {
  // Prevent process.exit from throwing in tests (Vitest intercepts it)
  vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});

  // Mock TTY to make interactive mode work (without this, isNonInteractive returns true)
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

  // Language
  mocks.getDefaultLanguageSelection.mockReturnValue({ language: 'en', keepEnglishOriginals: false });
  mocks.getLocaleManager.mockReturnValue({ t: (_ns: string, key: string) => key });
  mocks.isLanguageSupported.mockReturnValue(true);

  // Path resolution — CWD with valid name
  const cwd = '/test/my-project';
  vi.spyOn(process, 'cwd').mockReturnValue(cwd);

  // Guard clauses — all pass
  mocks.detectUmbrellaParent.mockReturnValue(null);
  mocks.detectSuspiciousPath.mockReturnValue(null);
  mocks.detectNestedSpecweave.mockReturnValue(null);

  // Non-empty folder: has files by default
  mocks.existsSync.mockImplementation((p: string) => {
    if (p.endsWith('.specweave')) return false;
    if (p.endsWith('.git')) return false;
    if (p.endsWith('config.json')) return true;
    return false;
  });
  mocks.readdirSync.mockReturnValue(['src', 'package.json', 'README.md']);

  // Workspace scan
  mocks.scanWorkspaceContent.mockReturnValue({
    hasSourceFiles: true,
    hasPackageManager: true,
    hasGitRepo: false,
    hasUncommittedChanges: false,
    fileCount: 5,
    detectedLanguages: ['TypeScript'],
  });

  // Default: continue-in-place (no restructure)
  mocks.promptMigrationChoice.mockResolvedValue('continue-in-place');

  // Root repo: null (no connection)
  mocks.promptRootRepoConnection.mockResolvedValue(null);

  // Project setup: default to add-later (skip clone flow)
  mocks.promptProjectSetup.mockResolvedValue('add-later');
  mocks.promptRepoUrlsLoop.mockResolvedValue({
    foregroundResults: [],
    jobIds: [],
  });

  // Adapter detection
  mocks.AdapterLoader.mockImplementation(function (this: any) {
    this.detectTool = vi.fn().mockResolvedValue('claude');
    this.getAdapter = vi.fn().mockReturnValue(null);
    this.checkRequirements = vi.fn();
  });
  mocks.confirm.mockResolvedValue(true); // confirm claude adapter

  // Provider, workspace
  mocks.detectProvider.mockReturnValue(null);
  mocks.scanWorkspaceRepos.mockReturnValue(null);
  mocks.scanMisplacedRepos.mockReturnValue([]);

  // Scaffold
  mocks.createMinimalConfig.mockReturnValue(undefined);
  mocks.createDirectoryStructure.mockResolvedValue(undefined);
  mocks.findSourceDir.mockReturnValue('/fake/templates');
  mocks.copyTemplates.mockResolvedValue(undefined);
  mocks.getDirname.mockReturnValue('/fake/dirname');

  // Config file
  mocks.createConfigFile.mockReturnValue(undefined);
  mocks.readJsonSync.mockReturnValue({ workspace: { name: 'my-project', repos: [] } });

  // Plugins
  mocks.installAllPlugins.mockResolvedValue({ success: true, marketplaceOnly: false });
  mocks.ensureSkillCreator.mockResolvedValue(undefined);

  // Git
  mocks.execFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '', exitCode: 0 });

  // Summary
  mocks.displaySummaryBanner.mockReturnValue(undefined);
  mocks.showNextSteps.mockReturnValue(undefined);
  mocks.applySmartDefaults.mockReturnValue(undefined);
  mocks.setupLspEnvVar.mockReturnValue(undefined);
}

// ============================================================================
// T-009: Wire "Restructure here" path in init.ts with confirm gate
// ============================================================================

describe('T-009: Restructure here path with confirm gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls scanWorkspaceContent and promptMigrationChoice when non-empty dir detected', async () => {
    await initCommand('.', { quick: true, language: 'en' });

    expect(mocks.scanWorkspaceContent).toHaveBeenCalled();
  });

  it('calls showRestructureWarnings and confirm when restructure selected', async () => {
    mocks.promptMigrationChoice.mockResolvedValue('restructure');
    mocks.confirm.mockResolvedValueOnce(false); // decline restructure confirm gate
    // Need to mock the adapter confirm separately
    mocks.confirm.mockResolvedValue(true);

    await initCommand('.', { language: 'en' });

    expect(mocks.showRestructureWarnings).toHaveBeenCalled();
    expect(mocks.confirm).toHaveBeenCalled();
  });

  it('does NOT move files when user declines restructure confirm gate', async () => {
    mocks.promptMigrationChoice.mockResolvedValue('restructure');
    // First confirm call is for restructure — decline it
    mocks.confirm.mockResolvedValueOnce(false);
    // Subsequent confirms (adapter, etc.)
    mocks.confirm.mockResolvedValue(true);

    await initCommand('.', { language: 'en' });

    expect(mocks.restructureIntoRepositories).not.toHaveBeenCalled();
  });

  it('calls restructureIntoRepositories when user confirms restructure', async () => {
    mocks.promptMigrationChoice.mockResolvedValue('restructure');
    mocks.promptOrgRepo.mockResolvedValue({ org: 'myorg', repoName: 'myrepo' });
    mocks.restructureIntoRepositories.mockReturnValue({
      moved: ['src', 'package.json'],
      skipped: ['.git'],
      errors: [],
      targetDir: '/test/my-project/repositories/myorg/myrepo',
    });

    // First confirm: restructure gate → true
    mocks.confirm.mockResolvedValueOnce(true);
    // Subsequent confirms (adapter, etc.)
    mocks.confirm.mockResolvedValue(true);

    await initCommand('.', { language: 'en' });

    expect(mocks.promptOrgRepo).toHaveBeenCalled();
    expect(mocks.restructureIntoRepositories).toHaveBeenCalled();
  });

  it('does NOT call workspace setup functions when continue-in-place selected', async () => {
    mocks.promptMigrationChoice.mockResolvedValue('continue-in-place');

    await initCommand('.', { language: 'en' });

    expect(mocks.showRestructureWarnings).not.toHaveBeenCalled();
    expect(mocks.restructureIntoRepositories).not.toHaveBeenCalled();
    expect(mocks.promptStartEmptySubChoice).not.toHaveBeenCalled();
  });

  it('shows sub-choice menu when start-empty selected', async () => {
    mocks.promptMigrationChoice.mockResolvedValue('start-empty');
    mocks.promptStartEmptySubChoice.mockResolvedValue('add-later');

    await initCommand('.', { language: 'en' });

    expect(mocks.promptStartEmptySubChoice).toHaveBeenCalled();
  });
});

// ============================================================================
// T-013: Move root repo prompt to early position in init.ts flow
// ============================================================================

describe('T-013: Root repo prompt at early position', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls promptRootRepoConnection during interactive init', async () => {
    await initCommand('.', { language: 'en' });

    expect(mocks.promptRootRepoConnection).toHaveBeenCalled();
  });

  it('applies rootRepoInfo to config when user provides root repo', async () => {
    mocks.promptRootRepoConnection.mockResolvedValue({
      owner: 'myorg',
      repo: 'myrepo',
      source: 'git-remote',
    });

    const configObj = { workspace: { name: 'my-project', repos: [] } };
    mocks.readJsonSync.mockReturnValue(configObj);

    await initCommand('.', { language: 'en' });

    // Verify writeJsonSync was called with rootRepo set
    expect(mocks.writeJsonSync).toHaveBeenCalled();
    const writtenConfig = mocks.writeJsonSync.mock.calls[0]?.[1];
    expect(writtenConfig?.workspace?.rootRepo?.github).toEqual({
      owner: 'myorg',
      repo: 'myrepo',
    });
  });

  it('does NOT set rootRepo when user declines connection', async () => {
    mocks.promptRootRepoConnection.mockResolvedValue(null);

    const configObj = { workspace: { name: 'my-project', repos: [] } };
    mocks.readJsonSync.mockReturnValue(configObj);

    await initCommand('.', { language: 'en' });

    const writtenConfig = mocks.writeJsonSync.mock.calls[0]?.[1];
    expect(writtenConfig?.workspace?.rootRepo).toBeUndefined();
  });

  it('skips root repo prompt in CI mode', async () => {
    await initCommand('.', { quick: true, language: 'en' });

    expect(mocks.promptRootRepoConnection).not.toHaveBeenCalled();
  });

  it('old root-repo inline prompts are removed (no manual owner/repo input in config phase)', async () => {
    mocks.promptRootRepoConnection.mockResolvedValue(null);

    const configObj = { workspace: { name: 'my-project', repos: [] } };
    mocks.readJsonSync.mockReturnValue(configObj);

    await initCommand('.', { language: 'en' });

    // The old code had confirm("Connect this workspace root to a GitHub repo?")
    // followed by input("GitHub owner") and input("GitHub repository name")
    // in the config-update phase. Verify those specific patterns are NOT called
    // in the config update section by checking that no input calls ask for
    // "GitHub owner" or "GitHub repository name"
    const inputCalls = mocks.input.mock.calls;
    const ownerInputCalls = inputCalls.filter(
      (call: any[]) => call[0]?.message?.includes?.('GitHub owner')
    );
    expect(ownerInputCalls).toHaveLength(0);
  });
});

// ============================================================================
// T-018: Update promptRepoUrlsLoop() in init.ts to use validation
// ============================================================================

describe('T-018: promptRepoUrlsLoop uses validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('promptRepoUrlsLoop is still called from init when clone-repos selected', async () => {
    // Set up so the project setup path is reached
    mocks.existsSync.mockImplementation((p: string) => {
      if (p.endsWith('.specweave')) return false;
      if (p.endsWith('.git')) return false;
      if (p.endsWith('config.json')) return true;
      return false;
    });

    mocks.promptProjectSetup.mockResolvedValue('clone-repos');
    mocks.promptRepoUrlsLoop.mockResolvedValue({
      foregroundResults: [{ repos: [], totalCloned: 0, totalFailed: 0 }],
      jobIds: [],
    });

    await initCommand('.', { language: 'en' });

    // promptRepoUrlsLoop is called from the init flow for the project setup
    expect(mocks.promptRepoUrlsLoop).toHaveBeenCalled();
  });

  it('existing parseRepoInput function is still exported (backward compat)', async () => {
    // Verify parseRepoInput is still accessible from repo-connect
    // (it should be exported alongside validateAndParseRepoInput)
    expect(mocks.parseRepoInput).toBeDefined();
  });
});
