/**
 * TDD Red: Tests for init repo cloning prompt flow fixes
 *
 * Bug 1: 'clone-github' sub-choice is unhandled (init.ts:227-242)
 * Bug 2: !hasGit guard blocks repo prompt for brownfield dirs (init.ts:416)
 * Bug 3: Umbrella "No" blocks child repo prompt (side-effect of Bug 2)
 *
 * Increment: 0643-init-repo-clone-flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// Hoisted mocks — mirrors init-integration.test.ts pattern
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

  // repo-connect
  validateAndParseRepoInput: vi.fn(),
  formatRepoInputErrors: vi.fn(),
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

import { initCommand } from '../../../../src/cli/commands/init.js';

// ============================================================================
// Test setup
// ============================================================================

const CWD = '/test/my-project';

function setupDefaultMocks() {
  vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

  // Language
  mocks.getDefaultLanguageSelection.mockReturnValue({ language: 'en', keepEnglishOriginals: false });
  mocks.getLocaleManager.mockReturnValue({ t: (_ns: string, key: string) => key });
  mocks.isLanguageSupported.mockReturnValue(true);

  // Path resolution
  vi.spyOn(process, 'cwd').mockReturnValue(CWD);

  // Guard clauses
  mocks.detectUmbrellaParent.mockReturnValue(null);
  mocks.detectSuspiciousPath.mockReturnValue(null);
  mocks.detectNestedSpecweave.mockReturnValue(null);

  // Default: non-empty dir without .specweave, without .git
  mocks.existsSync.mockImplementation((p: string) => {
    if (p.endsWith('.specweave')) return false;
    if (p.endsWith('.git')) return false;
    if (p.endsWith('config.json')) return true;
    return false;
  });
  mocks.readdirSync.mockReturnValue(['src', 'package.json']);

  // Workspace scan: non-empty
  mocks.scanWorkspaceContent.mockReturnValue({
    hasSourceFiles: true,
    hasPackageManager: true,
    hasGitRepo: false,
    hasUncommittedChanges: false,
    fileCount: 5,
    detectedLanguages: ['TypeScript'],
  });

  // Default: continue-in-place
  mocks.promptMigrationChoice.mockResolvedValue('continue-in-place');

  // Root repo: null (user says No)
  mocks.promptRootRepoConnection.mockResolvedValue(null);

  // Post-scaffold: add-later
  mocks.promptProjectSetup.mockResolvedValue('add-later');
  mocks.promptRepoUrlsLoop.mockResolvedValue({
    foregroundResults: [{ totalCloned: 1, totalFailed: 0, repos: [] }],
    jobIds: [],
  });

  // Adapter
  mocks.AdapterLoader.mockImplementation(function (this: any) {
    this.detectTool = vi.fn().mockResolvedValue('claude');
    this.getAdapter = vi.fn().mockReturnValue(null);
    this.checkRequirements = vi.fn();
  });
  mocks.confirm.mockResolvedValue(true);

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

  // Config
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
// Tests
// ============================================================================

describe('0643: Init repo clone flow fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Bug 1: clone-github sub-choice must call promptRepoUrlsLoop
  // ==========================================================================

  describe('US-001: Clone from GitHub sub-choice', () => {
    it('TC-001: clone-github calls promptRepoUrlsLoop', async () => {
      // Given: user picks Start empty > Clone from GitHub
      mocks.promptMigrationChoice.mockResolvedValue('start-empty');
      mocks.promptStartEmptySubChoice.mockResolvedValue('clone-github');

      await initCommand('.', { language: 'en' });

      // Then: promptRepoUrlsLoop was called (from the sub-menu handler)
      expect(mocks.promptRepoUrlsLoop).toHaveBeenCalledWith(CWD, 'en');
    });

    it('TC-002: clone-github prevents post-scaffold re-ask', async () => {
      // Given: user cloned repos via migration sub-menu
      mocks.promptMigrationChoice.mockResolvedValue('start-empty');
      mocks.promptStartEmptySubChoice.mockResolvedValue('clone-github');

      await initCommand('.', { language: 'en' });

      // Then: promptProjectSetup (the post-scaffold prompt) was NOT called
      expect(mocks.promptProjectSetup).not.toHaveBeenCalled();
    });

    it('TC-003: copy-local prevents post-scaffold re-ask', async () => {
      // Given: user copied local repo via sub-menu
      mocks.promptMigrationChoice.mockResolvedValue('start-empty');
      mocks.promptStartEmptySubChoice.mockResolvedValue('copy-local');
      mocks.input.mockResolvedValue('/some/local/path');
      mocks.promptOrgRepo.mockResolvedValue({ org: 'myorg', repoName: 'myrepo' });
      mocks.copyLocalPathIntoRepositories.mockReturnValue({
        copied: ['src'], errors: [],
        targetDir: `${CWD}/repositories/myorg/myrepo`,
      });

      await initCommand('.', { language: 'en' });

      // Then: post-scaffold promptProjectSetup was NOT called
      expect(mocks.promptProjectSetup).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Bug 2: !hasGit guard must be replaced with repositories-emptiness check
  // ==========================================================================

  describe('US-002: Brownfield .git + empty repositories/', () => {
    it('TC-004: brownfield with .git + empty repositories/ shows prompt', async () => {
      // Given: dir has .git but empty repositories/
      mocks.existsSync.mockImplementation((p: string) => {
        if (p.endsWith('.specweave')) return false;
        if (p.endsWith('.git')) return true;  // <-- .git EXISTS
        if (p.endsWith('repositories')) return true; // repos dir exists
        if (p.endsWith('config.json')) return true;
        return false;
      });
      // repositories/ has no entries (or only dotfiles)
      mocks.readdirSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('repositories')) return ['.gitkeep'];
        return ['src', 'package.json'];
      });

      // Non-empty: skip to continue-in-place (no migration sub-menu)
      mocks.scanWorkspaceContent.mockReturnValue({
        hasSourceFiles: false, hasPackageManager: false, hasGitRepo: true,
        hasUncommittedChanges: false, fileCount: 0, detectedLanguages: [],
      });

      await initCommand('.', { language: 'en' });

      // Then: post-scaffold promptProjectSetup IS called despite .git existing
      expect(mocks.promptProjectSetup).toHaveBeenCalled();
    });

    it('TC-005: populated repositories/ skips prompt', async () => {
      // Given: dir has .git AND repositories/ with content
      mocks.existsSync.mockImplementation((p: string) => {
        if (p.endsWith('.specweave')) return false;
        if (p.endsWith('.git')) return true;
        if (p.endsWith('repositories')) return true;
        if (p.endsWith('config.json')) return true;
        return false;
      });
      mocks.readdirSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('repositories')) return ['some-org'];
        return ['src', 'package.json'];
      });

      mocks.scanWorkspaceContent.mockReturnValue({
        hasSourceFiles: false, hasPackageManager: false, hasGitRepo: true,
        hasUncommittedChanges: false, fileCount: 0, detectedLanguages: [],
      });

      await initCommand('.', { language: 'en' });

      // Then: post-scaffold promptProjectSetup is NOT called
      expect(mocks.promptProjectSetup).not.toHaveBeenCalled();
    });

    it('TC-006: greenfield (no .git) still shows prompt', async () => {
      // Given: fresh dir, no .git, no files
      mocks.existsSync.mockImplementation((p: string) => {
        if (p.endsWith('.specweave')) return false;
        if (p.endsWith('.git')) return false;
        if (p.endsWith('repositories')) return false;
        if (p.endsWith('config.json')) return true;
        return false;
      });
      mocks.scanWorkspaceContent.mockReturnValue({
        hasSourceFiles: false, hasPackageManager: false, hasGitRepo: false,
        hasUncommittedChanges: false, fileCount: 0, detectedLanguages: [],
      });

      await initCommand('.', { language: 'en' });

      // Then: promptProjectSetup IS called
      expect(mocks.promptProjectSetup).toHaveBeenCalled();
    });

    it('TC-007: CI mode always skips prompt', async () => {
      await initCommand('.', { quick: true, language: 'en' });

      // Then: no interactive prompts
      expect(mocks.promptProjectSetup).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Bug 3: Umbrella "No" must not block child repo prompt
  // ==========================================================================

  describe('US-003: Umbrella No independence', () => {
    it('TC-008: umbrella No does not block child repo prompt', async () => {
      // Given: user says No to umbrella, dir has .git, empty repositories/
      mocks.promptRootRepoConnection.mockResolvedValue(null); // No
      mocks.existsSync.mockImplementation((p: string) => {
        if (p.endsWith('.specweave')) return false;
        if (p.endsWith('.git')) return true;
        if (p.endsWith('repositories')) return true;
        if (p.endsWith('config.json')) return true;
        return false;
      });
      mocks.readdirSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('repositories')) return [];
        return ['src'];
      });
      mocks.scanWorkspaceContent.mockReturnValue({
        hasSourceFiles: false, hasPackageManager: false, hasGitRepo: true,
        hasUncommittedChanges: false, fileCount: 0, detectedLanguages: [],
      });

      await initCommand('.', { language: 'en' });

      // Then: promptProjectSetup IS still called
      expect(mocks.promptProjectSetup).toHaveBeenCalled();
    });
  });
});
