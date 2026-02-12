/**
 * Unit tests for external-import.ts
 *
 * Tests the external tool import functionality including:
 * - buildAdoConfigFromProjects (ADO multi-project config builder)
 * - buildJiraConfigFromProjects (JIRA multi-project config builder)
 * - promptAndRunExternalImport (main import orchestrator)
 * - preCreateProjectFolders (folder pre-creation)
 * - emptyResult (empty result factory)
 * - getExternalImportStrings (i18n strings)
 * - __test__ exports (grouping functions re-exports)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockExistsSync,
  mockMkdirSync,
  mockReadFileSync,
  mockWriteFileSync,
  mockEnsureDirSync,
  mockLoadImportConfig,
  mockDetectAllConfigs,
  mockGetExistingSyncProfiles,
  mockIsUmbrellaModeFromConfig,
  mockGetSyncProfileProviders,
  mockLoadAdoConfigFromSyncProfile,
  mockLoadJiraConfigFromSyncProfile,
  mockGetUmbrellaProjects,
  mockSelect,
  mockConfirm,
  mockCheckbox,
  mockGetGoBackStrings,
  mockGetGitHubAuthFromProject,
  mockSelectRepositories,
  mockDetectJiraStructure,
  mockConfirmJiraMapping,
  mockDetectAdoStructure,
  mockConfirmAdoMapping,
  mockBuildJiraCoordinatorConfig,
  mockBuildAdoCoordinatorConfig,
  mockNormalizeToProjectId,
  mockImportCoordinatorInstance,
  mockImportCoordinatorConstructor,
  mockItemConverterInstance,
  mockItemConverterConstructor,
  mockValidateNoIncrementsCreated,
  mockGroupItemsByExternalContainer,
  mockOra,
  mockOraInstance,
  mockParseEnvFile,
} = vi.hoisted(() => {
  const oraInst = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  };
  const coordinatorInst = {
    importAll: vi.fn(),
  };
  const converterInst = {
    convertItems: vi.fn(),
  };
  return {
    mockExistsSync: vi.fn(),
    mockMkdirSync: vi.fn(),
    mockReadFileSync: vi.fn(),
    mockWriteFileSync: vi.fn(),
    mockEnsureDirSync: vi.fn(),
    mockLoadImportConfig: vi.fn(),
    mockDetectAllConfigs: vi.fn(),
    mockGetExistingSyncProfiles: vi.fn(),
    mockIsUmbrellaModeFromConfig: vi.fn(),
    mockGetSyncProfileProviders: vi.fn(),
    mockLoadAdoConfigFromSyncProfile: vi.fn(),
    mockLoadJiraConfigFromSyncProfile: vi.fn(),
    mockGetUmbrellaProjects: vi.fn(),
    mockSelect: vi.fn(),
    mockConfirm: vi.fn(),
    mockCheckbox: vi.fn(),
    mockGetGoBackStrings: vi.fn(),
    mockGetGitHubAuthFromProject: vi.fn(),
    mockSelectRepositories: vi.fn(),
    mockDetectJiraStructure: vi.fn(),
    mockConfirmJiraMapping: vi.fn(),
    mockDetectAdoStructure: vi.fn(),
    mockConfirmAdoMapping: vi.fn(),
    mockBuildJiraCoordinatorConfig: vi.fn(),
    mockBuildAdoCoordinatorConfig: vi.fn(),
    mockNormalizeToProjectId: vi.fn((name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    ),
    mockImportCoordinatorInstance: coordinatorInst,
    mockImportCoordinatorConstructor: vi.fn(() => coordinatorInst),
    mockItemConverterInstance: converterInst,
    mockItemConverterConstructor: vi.fn(() => converterInst),
    mockValidateNoIncrementsCreated: vi.fn(),
    mockGroupItemsByExternalContainer: vi.fn(),
    mockOra: vi.fn(),
    mockOraInstance: oraInst,
    mockParseEnvFile: vi.fn(),
  };
});

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock('../../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  ensureDirSync: mockEnsureDirSync,
}));

vi.mock('chalk', () => ({
  default: {
    blue: (s: string) => s,
    gray: (s: string) => s,
    green: (s: string) => s,
    yellow: (s: string) => s,
    cyan: (s: string) => s,
    red: (s: string) => s,
  },
}));

vi.mock('ora', () => ({
  default: (...args: any[]) => {
    mockOra(...args);
    return mockOraInstance;
  },
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  confirm: mockConfirm,
  checkbox: mockCheckbox,
}));

vi.mock('../../../../../src/cli/helpers/init/wizard-navigation.js', () => ({
  WIZARD_BACK: Symbol.for('WIZARD_BACK_TEST'),
  createGoBackChoice: vi.fn(),
  getGoBackStrings: mockGetGoBackStrings,
}));

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => ({})),
}));

vi.mock('../../../../../src/importers/import-coordinator.js', () => ({
  ImportCoordinator: class ImportCoordinator {
    constructor(...args: any[]) {
      mockImportCoordinatorConstructor(...args);
      return mockImportCoordinatorInstance;
    }
  },
}));

vi.mock('../../../../../src/importers/item-converter.js', () => ({
  ItemConverter: class ItemConverter {
    constructor(...args: any[]) {
      mockItemConverterConstructor(...args);
      return mockItemConverterInstance;
    }
    static validateNoIncrementsCreated = mockValidateNoIncrementsCreated;
  },
}));

vi.mock('../../../../../src/config/import-config.js', () => ({
  loadImportConfig: mockLoadImportConfig,
}));

vi.mock('../../../../../src/cli/helpers/github-repo-selector.js', () => ({
  selectRepositories: mockSelectRepositories,
}));

vi.mock('../../../../../src/cli/helpers/init/config-detection.js', () => ({
  detectAllConfigs: mockDetectAllConfigs,
}));

vi.mock('../../../../../src/cli/helpers/init/types.js', () => ({}));

vi.mock('../../../../../src/cli/helpers/init/jira-ado-auto-detect.js', () => ({
  detectJiraStructure: mockDetectJiraStructure,
  confirmJiraMapping: mockConfirmJiraMapping,
  detectAdoStructure: mockDetectAdoStructure,
  confirmAdoMapping: mockConfirmAdoMapping,
  buildJiraCoordinatorConfig: mockBuildJiraCoordinatorConfig,
  buildAdoCoordinatorConfig: mockBuildAdoCoordinatorConfig,
}));

vi.mock('../../../../../src/utils/project-id-generator.js', () => ({
  normalizeToProjectId: mockNormalizeToProjectId,
}));

vi.mock('../../../../../src/cli/helpers/init/sync-profile-helpers.js', () => ({
  getExistingSyncProfiles: mockGetExistingSyncProfiles,
  isUmbrellaModeFromConfig: mockIsUmbrellaModeFromConfig,
  getSyncProfileProviders: mockGetSyncProfileProviders,
  loadAdoConfigFromSyncProfile: mockLoadAdoConfigFromSyncProfile,
  loadJiraConfigFromSyncProfile: mockLoadJiraConfigFromSyncProfile,
  getUmbrellaProjects: mockGetUmbrellaProjects,
}));

vi.mock('../../../../../src/cli/helpers/init/external-import-grouping.js', () => ({
  groupItemsByExternalContainer: mockGroupItemsByExternalContainer,
  groupItemsBySourceRepo: vi.fn(),
  groupAdoItemsByParentHierarchy: vi.fn(),
  groupNonHierarchyItems: vi.fn(),
}));

vi.mock('../../../../../src/utils/env-file.js', () => ({
  parseEnvFile: mockParseEnvFile,
}));

vi.mock('../../../../../src/utils/auth-helpers.js', () => ({
  getGitHubAuthFromProject: mockGetGitHubAuthFromProject,
  isOAuthToken: vi.fn((t: string) => t.startsWith('gho_')),
  isPersonalAccessToken: vi.fn((t: string) => t.startsWith('ghp_') || t.startsWith('github_pat_')),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEmptyCoordinatorResult() {
  return {
    results: [],
    totalCount: 0,
    allItems: [],
    errors: {},
    platforms: [],
  };
}

function makeCoordinatorResult(overrides: Record<string, any> = {}) {
  return {
    results: [],
    totalCount: 0,
    allItems: [],
    errors: {},
    platforms: [],
    ...overrides,
  };
}

// ─── Setup defaults ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});

  // Defaults
  mockLoadImportConfig.mockReturnValue({ enabled: true, timeRangeMonths: 3, pageSize: 100 });
  mockDetectAllConfigs.mockReturnValue({ github: null, jira: null, ado: null, availableTools: [] });
  mockGetExistingSyncProfiles.mockReturnValue(null);
  mockGetSyncProfileProviders.mockReturnValue([]);
  mockGetUmbrellaProjects.mockReturnValue([]);
  mockIsUmbrellaModeFromConfig.mockReturnValue(false);
  mockGetGitHubAuthFromProject.mockReturnValue({ token: '', source: 'none' });
  mockGetGoBackStrings.mockReturnValue({ goBack: '← Go back', goBackHint: '' });
  mockExistsSync.mockReturnValue(false);
  mockLoadAdoConfigFromSyncProfile.mockReturnValue(null);
  mockLoadJiraConfigFromSyncProfile.mockReturnValue(null);
  mockOraInstance.start.mockReturnThis();
  mockOraInstance.succeed.mockReturnThis();
  mockOraInstance.fail.mockReturnThis();
  mockValidateNoIncrementsCreated.mockImplementation(() => {}); // Default: no-op (validation passes)
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Import the module under test ───────────────────────────────────────────

// We import after all mocks are set up
import {
  promptAndRunExternalImport,
  __test__,
  type ImportOptions,
  type BackgroundImportResult,
} from '../../../../../src/cli/helpers/init/external-import.js';

// ═════════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe('external-import', () => {
  // ─── __test__ exports ───────────────────────────────────────────────────

  describe('__test__ exports', () => {
    it('should export groupAdoItemsByParentHierarchy', () => {
      expect(__test__.groupAdoItemsByParentHierarchy).toBeDefined();
    });

    it('should export groupItemsByExternalContainer', () => {
      expect(__test__.groupItemsByExternalContainer).toBeDefined();
    });

    it('should export groupNonHierarchyItems', () => {
      expect(__test__.groupNonHierarchyItems).toBeDefined();
    });
  });

  // ─── promptAndRunExternalImport: early exits ────────────────────────────

  describe('promptAndRunExternalImport - early exits', () => {
    it('should return empty result when import is disabled via config', async () => {
      mockLoadImportConfig.mockReturnValue({ enabled: false, timeRangeMonths: 3, pageSize: 100 });

      const result = await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(result).toEqual(makeEmptyCoordinatorResult());
      expect(mockDetectAllConfigs).not.toHaveBeenCalled();
    });

    it('should return empty result when no tools detected', async () => {
      mockDetectAllConfigs.mockReturnValue({ github: null, jira: null, ado: null, availableTools: [] });
      mockGetExistingSyncProfiles.mockReturnValue(null);
      mockGetSyncProfileProviders.mockReturnValue([]);

      const result = await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(result).toEqual(makeEmptyCoordinatorResult());
    });

    it('should return empty result in CI mode without prompting', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });

      const result = await promptAndRunExternalImport('/test/dir', true, 'en');

      expect(result).toEqual(makeEmptyCoordinatorResult());
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it('should return empty result when user selects skip', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockSelect.mockResolvedValueOnce('no');

      const result = await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(result).toEqual(makeEmptyCoordinatorResult());
    });

    it('should return result with goBack when user selects back', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockSelect.mockResolvedValueOnce('back');

      const result = await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(result.totalCount).toBe(0);
      expect((result as any).goBack).toBeDefined();
    });
  });

  // ─── promptAndRunExternalImport: tool detection ─────────────────────────

  describe('promptAndRunExternalImport - tool detection', () => {
    it('should add GitHub to available tools when sync profiles exist', async () => {
      mockDetectAllConfigs.mockReturnValue({ github: null, jira: null, ado: null, availableTools: [] });
      mockGetExistingSyncProfiles.mockReturnValue(['acme/repo1', 'acme/repo2']);
      mockSelect.mockResolvedValueOnce('no');

      await promptAndRunExternalImport('/test/dir', false, 'en');

      // Should have shown prompt since tools were detected via sync profiles
      expect(mockSelect).toHaveBeenCalled();
    });

    it('should add JIRA to available tools from sync profile providers', async () => {
      mockDetectAllConfigs.mockReturnValue({ github: null, jira: null, ado: null, availableTools: [] });
      mockGetSyncProfileProviders.mockReturnValue(['jira']);
      mockSelect.mockResolvedValueOnce('no');

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockSelect).toHaveBeenCalled();
    });

    it('should add Azure DevOps to available tools from sync profile providers', async () => {
      mockDetectAllConfigs.mockReturnValue({ github: null, jira: null, ado: null, availableTools: [] });
      mockGetSyncProfileProviders.mockReturnValue(['ado']);
      mockSelect.mockResolvedValueOnce('no');

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockSelect).toHaveBeenCalled();
    });

    it('should not duplicate GitHub in available tools', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetExistingSyncProfiles.mockReturnValue(['acme/app']);
      mockSelect.mockResolvedValueOnce('no');

      await promptAndRunExternalImport('/test/dir', false, 'en');

      // The select prompt message should contain 'GitHub' only once
      const selectCall = mockSelect.mock.calls[0][0];
      const message = selectCall.message as string;
      const githubCount = (message.match(/GitHub/g) || []).length;
      expect(githubCount).toBe(1);
    });
  });

  // ─── promptAndRunExternalImport: ADO config from sync profile ───────────

  describe('promptAndRunExternalImport - ADO config from sync profile', () => {
    it('should load ADO config from sync profile when detectAllConfigs returns null', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MyProject',
        pat: 'test-pat',
        projects: [{ name: 'Project1', areaPaths: ['Project1\\Team'] }],
      };
      mockDetectAllConfigs.mockReturnValue({ github: null, jira: null, ado: null, availableTools: [] });
      mockGetSyncProfileProviders.mockReturnValue(['ado']);
      mockLoadAdoConfigFromSyncProfile.mockReturnValue(adoConfig);
      mockSelect.mockResolvedValueOnce('no');

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockLoadAdoConfigFromSyncProfile).toHaveBeenCalledWith('/test/dir');
      expect(mockSelect).toHaveBeenCalled();
    });

    it('should merge ADO projects from sync profile when ado exists but has no projects', async () => {
      const existingAdo = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MyProject',
        pat: 'test-pat',
      };
      const profileConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MyProject',
        pat: 'test-pat',
        projects: [{ name: 'Project1', areaPaths: ['Project1\\Area1'] }],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: existingAdo,
        availableTools: ['Azure DevOps'],
      });
      mockGetSyncProfileProviders.mockReturnValue(['ado']);
      mockLoadAdoConfigFromSyncProfile.mockReturnValue(profileConfig);
      mockSelect.mockResolvedValueOnce('no');

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockLoadAdoConfigFromSyncProfile).toHaveBeenCalledWith('/test/dir');
    });
  });

  // ─── promptAndRunExternalImport: JIRA config from sync profile ──────────

  describe('promptAndRunExternalImport - JIRA config from sync profile', () => {
    it('should load JIRA config from sync profile when detectAllConfigs returns null', async () => {
      const jiraConfig = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        projects: [{ key: 'PROJ', boards: [{ id: '1', name: 'Sprint Board' }] }],
      };
      mockDetectAllConfigs.mockReturnValue({ github: null, jira: null, ado: null, availableTools: [] });
      mockGetSyncProfileProviders.mockReturnValue(['jira']);
      mockLoadJiraConfigFromSyncProfile.mockReturnValue(jiraConfig);
      mockSelect.mockResolvedValueOnce('no');

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockLoadJiraConfigFromSyncProfile).toHaveBeenCalledWith('/test/dir');
    });

    it('should merge JIRA projects from sync profile when jira exists but has no projects', async () => {
      const existingJira = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      const profileConfig = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        projects: [{ key: 'PROJ' }],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: existingJira,
        ado: null,
        availableTools: ['JIRA'],
      });
      mockGetSyncProfileProviders.mockReturnValue(['jira']);
      mockLoadJiraConfigFromSyncProfile.mockReturnValue(profileConfig);
      mockSelect.mockResolvedValueOnce('no');

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockLoadJiraConfigFromSyncProfile).toHaveBeenCalledWith('/test/dir');
    });
  });

  // ─── promptAndRunExternalImport: OAuth token warning ────────────────────

  describe('promptAndRunExternalImport - OAuth token warning', () => {
    it('should warn about OAuth token and skip import if user declines', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({
        token: 'gho_test123',
        source: 'GH_TOKEN',
        isOAuthToken: true,
      });
      // User selects "yes" to import
      mockSelect.mockResolvedValueOnce('yes');
      // User declines to continue with OAuth token
      mockConfirm.mockResolvedValueOnce(false);

      const result = await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(result).toEqual(makeEmptyCoordinatorResult());
    });

    it('should continue with OAuth token if user confirms', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({
        token: 'gho_test123',
        source: 'GH_TOKEN',
        isOAuthToken: true,
      });
      // User selects "yes" to import
      mockSelect.mockResolvedValueOnce('yes');
      // User confirms OAuth
      mockConfirm.mockResolvedValueOnce(true);
      // No multi-repo
      mockConfirm.mockResolvedValueOnce(false);
      // Time range select
      mockSelect.mockResolvedValueOnce(3);
      // Include closed
      mockConfirm.mockResolvedValueOnce(true);

      // Import returns 0 items
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockImportCoordinatorConstructor).toHaveBeenCalled();
    });
  });

  // ─── promptAndRunExternalImport: full import flow (GitHub) ──────────────

  describe('promptAndRunExternalImport - full import flow', () => {
    it('should run GitHub single-repo import successfully', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'my-app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({
        token: 'ghp_test123',
        source: 'GITHUB_TOKEN',
      });
      // Select import
      mockSelect.mockResolvedValueOnce('yes');
      // No multi-repo
      mockConfirm.mockResolvedValueOnce(false);
      // Time range
      mockSelect.mockResolvedValueOnce(3);
      // Include closed
      mockConfirm.mockResolvedValueOnce(true);

      const mockResult = makeCoordinatorResult({
        totalCount: 5,
        allItems: [
          { id: '1', platform: 'github', sourceRepo: 'acme/my-app', status: 'open', title: 'Issue 1' },
          { id: '2', platform: 'github', sourceRepo: 'acme/my-app', status: 'closed', title: 'Issue 2' },
          { id: '3', platform: 'github', sourceRepo: 'acme/my-app', status: 'open', title: 'Issue 3' },
          { id: '4', platform: 'github', sourceRepo: 'acme/my-app', status: 'open', title: 'Issue 4' },
          { id: '5', platform: 'github', sourceRepo: 'acme/my-app', status: 'in-progress', title: 'Issue 5' },
        ],
        results: [{ platform: 'github', count: 5, items: [], errors: [] }],
      });
      mockImportCoordinatorInstance.importAll.mockResolvedValue(mockResult);

      // Mock convertToLivingDocs dependencies
      mockGroupItemsByExternalContainer.mockReturnValue([
        {
          projectId: 'my-app',
          items: mockResult.allItems,
          containerId: 'my-app',
          containerType: null,
          externalContainer: undefined,
        },
      ]);
      mockItemConverterInstance.convertItems.mockResolvedValue([
        { id: 'US-001E', featureId: 'FS-001E' },
        { id: 'US-002E', featureId: 'FS-001E' },
      ]);

      const result = await promptAndRunExternalImport('/test/dir', false, 'en');

      expect((result as any).totalCount).toBe(5);
      expect(mockImportCoordinatorConstructor).toHaveBeenCalled();
      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.github).toEqual({
        owner: 'acme',
        repo: 'my-app',
        token: 'ghp_test123',
      });
      expect(config.importConfig.timeRangeMonths).toBe(3);
      expect(config.importConfig.includeClosed).toBe(true);
    });

    it('should run multi-repo GitHub import with existing sync profiles', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({
        token: 'ghp_test123',
        source: 'GITHUB_TOKEN',
      });
      mockGetExistingSyncProfiles.mockReturnValue(['acme/repo1', 'acme/repo2']);

      // Select import
      mockSelect.mockResolvedValueOnce('yes');
      // Time range
      mockSelect.mockResolvedValueOnce(6);
      // Include closed
      mockConfirm.mockResolvedValueOnce(false);

      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.githubRepositories).toEqual([
        { owner: 'acme', repo: 'repo1' },
        { owner: 'acme', repo: 'repo2' },
      ]);
      expect(config.githubToken).toBe('ghp_test123');
      expect(config.github).toBeUndefined();
    });

    it('should run import with ADO pre-configured projects', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        pat: 'test-pat',
        projects: [
          { name: 'Project1', areaPaths: ['Project1\\TeamA', 'Project1\\TeamB'], isUmbrella: false },
          { name: 'Project2', areaPaths: [], isUmbrella: false },
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      // Select import
      mockSelect.mockResolvedValueOnce('yes');
      // Time range
      mockSelect.mockResolvedValueOnce(3);
      // Include closed
      mockConfirm.mockResolvedValueOnce(true);

      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.ado).toBeDefined();
      expect(config.ado.orgUrl).toBe('https://dev.azure.com/myorg');
      expect(config.ado.mode).toBe('by-area');
      expect(config.ado.projectMappings.length).toBe(2);
    });

    it('should run import with JIRA pre-configured projects', async () => {
      const jiraConfig = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        projects: [
          { key: 'PROJ1', boards: [{ id: '10', name: 'Sprint Board' }] },
          { key: 'PROJ2', boards: [{ id: '20', name: 'Kanban Board' }] },
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: jiraConfig,
        ado: null,
        availableTools: ['JIRA'],
      });
      // Select import
      mockSelect.mockResolvedValueOnce('yes');
      // Time range
      mockSelect.mockResolvedValueOnce(3);
      // Include closed
      mockConfirm.mockResolvedValueOnce(true);

      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.jira).toBeDefined();
      expect(config.jira.host).toBe('https://myorg.atlassian.net');
      expect(config.jira.mode).toBe('by-board');
      expect(config.jira.projectMappings.length).toBe(2);
    });

    it('should use JIRA auto-detect for legacy single-project mode', async () => {
      const jiraConfig = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        // No projects array = legacy mode
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: jiraConfig,
        ado: null,
        availableTools: ['JIRA'],
      });
      mockDetectJiraStructure.mockResolvedValue({ projects: [{ key: 'PROJ' }] });
      mockConfirmJiraMapping.mockResolvedValue({ mode: 'simple' });
      mockBuildJiraCoordinatorConfig.mockReturnValue({
        host: 'https://myorg.atlassian.net',
        mode: 'simple',
        projectMappings: [],
      });

      // Select import
      mockSelect.mockResolvedValueOnce('yes');
      // Time range
      mockSelect.mockResolvedValueOnce(3);
      // Include closed
      mockConfirm.mockResolvedValueOnce(true);

      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockDetectJiraStructure).toHaveBeenCalled();
      expect(mockConfirmJiraMapping).toHaveBeenCalled();
    });

    it('should fallback to JIRA simple mode when auto-detect returns null', async () => {
      const jiraConfig = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: jiraConfig,
        ado: null,
        availableTools: ['JIRA'],
      });
      mockDetectJiraStructure.mockResolvedValue(null);

      // Select import
      mockSelect.mockResolvedValueOnce('yes');
      // Time range
      mockSelect.mockResolvedValueOnce(3);
      // Include closed
      mockConfirm.mockResolvedValueOnce(true);

      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.jira.mode).toBe('simple');
      expect(config.jira.projectMappings).toEqual([]);
    });

    it('should fallback to JIRA simple mode when user declines mapping', async () => {
      const jiraConfig = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: jiraConfig,
        ado: null,
        availableTools: ['JIRA'],
      });
      mockDetectJiraStructure.mockResolvedValue({ projects: [{ key: 'PROJ' }] });
      mockConfirmJiraMapping.mockResolvedValue(null); // User declined

      // Select import
      mockSelect.mockResolvedValueOnce('yes');
      // Time range
      mockSelect.mockResolvedValueOnce(3);
      // Include closed
      mockConfirm.mockResolvedValueOnce(true);

      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.jira.mode).toBe('simple');
    });

    it('should use ADO auto-detect for legacy single-project mode', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        pat: 'test-pat',
        // No projects array = legacy mode
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      mockDetectAdoStructure.mockResolvedValue({ projects: [{ name: 'MainProject' }] });
      mockConfirmAdoMapping.mockResolvedValue({ mode: 'simple' });
      mockBuildAdoCoordinatorConfig.mockReturnValue({
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        mode: 'simple',
        projectMappings: [],
      });

      // Select import
      mockSelect.mockResolvedValueOnce('yes');
      // Time range
      mockSelect.mockResolvedValueOnce(3);
      // Include closed
      mockConfirm.mockResolvedValueOnce(true);

      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockDetectAdoStructure).toHaveBeenCalledWith('myorg', 'test-pat');
    });

    it('should filter umbrella projects from ADO config', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        pat: 'test-pat',
        projects: [
          { name: 'Project1', areaPaths: [], isUmbrella: true },
          { name: 'Project2', areaPaths: ['Project2\\TeamA'], isUmbrella: false },
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      mockGetUmbrellaProjects.mockReturnValue(['UmbrellaProject']);

      // Select import
      mockSelect.mockResolvedValueOnce('yes');
      // Time range
      mockSelect.mockResolvedValueOnce(3);
      // Include closed
      mockConfirm.mockResolvedValueOnce(true);

      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      // Only Project2 should be in projectMappings (Project1 is umbrella)
      expect(config.ado.projectMappings.length).toBe(1);
      expect(config.ado.projectMappings[0].projectName).toBe('Project2');
    });
  });

  // ─── promptAndRunExternalImport: import error handling ──────────────────

  describe('promptAndRunExternalImport - error handling', () => {
    it('should propagate import errors', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({
        token: 'ghp_test123',
        source: 'GITHUB_TOKEN',
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false); // no multi-repo
      mockSelect.mockResolvedValueOnce(3); // time range
      mockConfirm.mockResolvedValueOnce(true); // include closed

      mockImportCoordinatorInstance.importAll.mockRejectedValue(new Error('API rate limit'));

      await expect(
        promptAndRunExternalImport('/test/dir', false, 'en')
      ).rejects.toThrow('API rate limit');

      expect(mockOraInstance.fail).toHaveBeenCalledWith(expect.stringContaining('API rate limit'));
    });

    it('should show import errors in result', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({
        token: 'ghp_test123',
        source: 'GITHUB_TOKEN',
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false); // no multi-repo
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);

      const resultWithErrors = makeCoordinatorResult({
        totalCount: 0,
        errors: { github: ['Auth failed'] },
      });
      mockImportCoordinatorInstance.importAll.mockResolvedValue(resultWithErrors);

      const result = await promptAndRunExternalImport('/test/dir', false, 'en');

      expect((result as any).errors).toEqual({ github: ['Auth failed'] });
    });

    it('should show troubleshooting checklist when 0 items imported', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({
        token: 'ghp_test123',
        source: 'GITHUB_TOKEN',
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false);
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);

      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      // Troubleshooting messages logged
      const logCalls = (console.log as any).mock.calls.flat().join('\n');
      expect(logCalls).toContain('Troubleshooting');
    });

    it('should warn about large datasets (>100 items)', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({
        token: 'ghp_test123',
        source: 'GITHUB_TOKEN',
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false);
      mockSelect.mockResolvedValueOnce(999);
      mockConfirm.mockResolvedValueOnce(true);

      // 150 items
      const items = Array.from({ length: 150 }, (_, i) => ({
        id: String(i + 1),
        platform: 'github',
        sourceRepo: 'acme/app',
        status: 'open',
        title: `Issue ${i + 1}`,
      }));
      const bigResult = makeCoordinatorResult({
        totalCount: 150,
        allItems: items,
        results: [{ platform: 'github', count: 150, items, errors: [] }],
      });
      mockImportCoordinatorInstance.importAll.mockResolvedValue(bigResult);

      // Mock living docs conversion
      mockGroupItemsByExternalContainer.mockReturnValue([
        { projectId: 'app', items, containerId: 'app', containerType: null, externalContainer: undefined },
      ]);
      mockItemConverterInstance.convertItems.mockResolvedValue(
        items.map((_, i) => ({ id: `US-${String(i + 1).padStart(3, '0')}E`, featureId: 'FS-001E' }))
      );

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const logCalls = (console.log as any).mock.calls.flat().join('\n');
      expect(logCalls).toContain('large dataset');
    });
  });

  // ─── promptAndRunExternalImport: time range defaults ────────────────────

  describe('promptAndRunExternalImport - time range config', () => {
    it('should map timeRangeMonths=1 to default 1', async () => {
      mockLoadImportConfig.mockReturnValue({ enabled: true, timeRangeMonths: 1, pageSize: 100 });
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({ token: 'ghp_test', source: 'GITHUB_TOKEN' });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false);
      // Capture time range default
      mockSelect.mockResolvedValueOnce(1);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      // The time range prompt should have default=1
      const timeRangeCall = mockSelect.mock.calls[1][0];
      expect(timeRangeCall.default).toBe(1);
    });

    it('should map timeRangeMonths=12 to default 999 (all time)', async () => {
      mockLoadImportConfig.mockReturnValue({ enabled: true, timeRangeMonths: 12, pageSize: 100 });
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({ token: 'ghp_test', source: 'GITHUB_TOKEN' });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false);
      mockSelect.mockResolvedValueOnce(999);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const timeRangeCall = mockSelect.mock.calls[1][0];
      expect(timeRangeCall.default).toBe(999);
    });
  });

  // ─── promptAndRunExternalImport: conversion to living docs ──────────────

  describe('promptAndRunExternalImport - conversion to living docs', () => {
    function setupBasicGithubImport() {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({
        token: 'ghp_test123',
        source: 'GITHUB_TOKEN',
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false); // no multi-repo
      mockSelect.mockResolvedValueOnce(3);       // time range
      mockConfirm.mockResolvedValueOnce(true);   // include closed
    }

    it('should convert items to living docs after successful import', async () => {
      setupBasicGithubImport();

      const items = [
        { id: '1', platform: 'github', sourceRepo: 'acme/app', status: 'open', title: 'Issue 1' },
        { id: '2', platform: 'github', sourceRepo: 'acme/app', status: 'closed', title: 'Issue 2' },
      ];
      mockImportCoordinatorInstance.importAll.mockResolvedValue(
        makeCoordinatorResult({ totalCount: 2, allItems: items })
      );

      mockGroupItemsByExternalContainer.mockReturnValue([
        { projectId: 'app', items, containerId: 'app', containerType: null, externalContainer: undefined },
      ]);
      mockItemConverterInstance.convertItems.mockResolvedValue([
        { id: 'US-001E', featureId: 'FS-001E' },
        { id: 'US-002E', featureId: 'FS-001E' },
      ]);

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockItemConverterConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'app',
          enableFeatureAllocation: true,
          enableGlobalCollisionDetection: false,
          autoArchiveAfterDays: 30,
        })
      );
      expect(mockItemConverterInstance.convertItems).toHaveBeenCalledWith(items);
    });

    it('should validate no increments were created after conversion', async () => {
      setupBasicGithubImport();

      const items = [{ id: '1', platform: 'github', sourceRepo: 'acme/app', status: 'open', title: 'T' }];
      mockImportCoordinatorInstance.importAll.mockResolvedValue(
        makeCoordinatorResult({ totalCount: 1, allItems: items })
      );
      mockGroupItemsByExternalContainer.mockReturnValue([
        { projectId: 'app', items, containerId: 'app', containerType: null, externalContainer: undefined },
      ]);
      mockItemConverterInstance.convertItems.mockResolvedValue([{ id: 'US-001E' }]);

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockValidateNoIncrementsCreated).toHaveBeenCalledWith('/test/dir');
    });

    it('should throw if increment validation fails', async () => {
      setupBasicGithubImport();

      const items = [{ id: '1', platform: 'github', sourceRepo: 'acme/app', status: 'open', title: 'T' }];
      mockImportCoordinatorInstance.importAll.mockResolvedValue(
        makeCoordinatorResult({ totalCount: 1, allItems: items })
      );
      mockGroupItemsByExternalContainer.mockReturnValue([
        { projectId: 'app', items, containerId: 'app', containerType: null, externalContainer: undefined },
      ]);
      mockItemConverterInstance.convertItems.mockResolvedValue([{ id: 'US-001E' }]);
      mockValidateNoIncrementsCreated.mockImplementation(() => {
        throw new Error('Increments created during import!');
      });

      await expect(
        promptAndRunExternalImport('/test/dir', false, 'en')
      ).rejects.toThrow('CRITICAL ERROR');
    });

    it('should handle multiple container groups', async () => {
      setupBasicGithubImport();

      const items1 = [{ id: '1', platform: 'github', sourceRepo: 'acme/repo1', status: 'open', title: 'R1' }];
      const items2 = [{ id: '2', platform: 'github', sourceRepo: 'acme/repo2', status: 'open', title: 'R2' }];
      mockImportCoordinatorInstance.importAll.mockResolvedValue(
        makeCoordinatorResult({ totalCount: 2, allItems: [...items1, ...items2] })
      );

      mockGroupItemsByExternalContainer.mockReturnValue([
        { projectId: 'repo1', items: items1, containerId: 'repo1', containerType: null, externalContainer: undefined },
        { projectId: 'repo2', items: items2, containerId: 'repo2', containerType: null, externalContainer: undefined },
      ]);
      mockItemConverterInstance.convertItems
        .mockResolvedValueOnce([{ id: 'US-001E', featureId: 'FS-001E' }])
        .mockResolvedValueOnce([{ id: 'US-001E', featureId: 'FS-001E' }]);

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockItemConverterConstructor).toHaveBeenCalledTimes(2);
    });

    it('should detect umbrella mode from config even with single group', async () => {
      setupBasicGithubImport();
      mockIsUmbrellaModeFromConfig.mockReturnValue(true);

      const items = [{ id: '1', platform: 'github', sourceRepo: 'acme/app', status: 'open', title: 'T' }];
      mockImportCoordinatorInstance.importAll.mockResolvedValue(
        makeCoordinatorResult({ totalCount: 1, allItems: items })
      );
      mockGroupItemsByExternalContainer.mockReturnValue([
        { projectId: 'app', items, containerId: 'app', containerType: null, externalContainer: undefined },
      ]);
      mockItemConverterInstance.convertItems.mockResolvedValue([{ id: 'US-001E' }]);

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const logCalls = (console.log as any).mock.calls.flat().join('\n');
      expect(logCalls).toContain('Per-project sequences');
    });
  });

  // ─── promptAndRunExternalImport: pre-create project folders ─────────────

  describe('promptAndRunExternalImport - preCreateProjectFolders', () => {
    it('should pre-create GitHub repo folders', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'my-app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({ token: 'ghp_test', source: 'GITHUB_TOKEN' });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false);
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockExistsSync.mockReturnValue(false);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('my-app'),
        { recursive: true }
      );
    });

    it('should pre-create ADO project/area folders', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        pat: 'test-pat',
        projects: [
          { name: 'Project1', areaPaths: ['Project1\\TeamA'], isUmbrella: false },
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockExistsSync.mockReturnValue(false);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      // Should create folder for Project1/TeamA area mapping
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('project1'),
        { recursive: true }
      );
    });

    it('should pre-create JIRA project/board folders', async () => {
      const jiraConfig = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        projects: [
          { key: 'PROJ', boards: [{ id: '10', name: 'Sprint Board' }] },
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: jiraConfig,
        ado: null,
        availableTools: ['JIRA'],
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockExistsSync.mockReturnValue(false);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      // Should create folder for PROJ/sprint-board
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('proj'),
        { recursive: true }
      );
    });

    it('should not re-create folders that already exist', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'my-app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({ token: 'ghp_test', source: 'GITHUB_TOKEN' });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false);
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockExistsSync.mockReturnValue(true); // Folders already exist
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      // mkdirSync should NOT have been called since folders exist
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    it('should pre-create multi-repo folders from sync profiles', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({ token: 'ghp_test', source: 'GITHUB_TOKEN' });
      mockGetExistingSyncProfiles.mockReturnValue(['acme/repo1', 'acme/repo2']);
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockExistsSync.mockReturnValue(false);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      // Should create folders for repo1 and repo2
      const mkdirCalls = mockMkdirSync.mock.calls.map(c => c[0]);
      expect(mkdirCalls.some((p: string) => p.includes('repo1'))).toBe(true);
      expect(mkdirCalls.some((p: string) => p.includes('repo2'))).toBe(true);
    });
  });

  // ─── promptAndRunExternalImport: progress tracking ──────────────────────

  describe('promptAndRunExternalImport - progress tracking', () => {
    it('should set up progress callbacks on coordinator config', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({ token: 'ghp_test', source: 'GITHUB_TOKEN' });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false);
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.onProgressEnhanced).toBeTypeOf('function');
      expect(config.onProgress).toBeTypeOf('function');
      expect(config.onRateLimitWarning).toBeTypeOf('function');
      expect(config.onRateLimitPause).toBeTypeOf('function');
    });
  });

  // ─── promptAndRunExternalImport: language support ───────────────────────

  describe('promptAndRunExternalImport - language support', () => {
    it('should use Russian strings when language is ru', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockSelect.mockResolvedValueOnce('no');

      await promptAndRunExternalImport('/test/dir', false, 'ru');

      // Select prompt should contain Russian text
      const selectCall = mockSelect.mock.calls[0][0];
      const importChoice = selectCall.choices.find((c: any) => c.value === 'yes');
      expect(importChoice.name).toContain('импортировать');
    });

    it('should use English strings as default fallback', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockSelect.mockResolvedValueOnce('no');

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const selectCall = mockSelect.mock.calls[0][0];
      const importChoice = selectCall.choices.find((c: any) => c.value === 'yes');
      expect(importChoice.name).toContain('import');
    });

    it('should support all languages without errors', async () => {
      const languages = ['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'] as const;

      for (const lang of languages) {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        mockLoadImportConfig.mockReturnValue({ enabled: true, timeRangeMonths: 3, pageSize: 100 });
        mockDetectAllConfigs.mockReturnValue({ github: null, jira: null, ado: null, availableTools: [] });
        mockGetExistingSyncProfiles.mockReturnValue(null);
        mockGetSyncProfileProviders.mockReturnValue([]);

        const result = await promptAndRunExternalImport('/test/dir', false, lang);
        expect(result).toEqual(makeEmptyCoordinatorResult());
      }
    });
  });

  // ─── buildAdoConfigFromProjects (tested via promptAndRunExternalImport) ─

  describe('buildAdoConfigFromProjects - via integration', () => {
    it('should build by-area mode when projects have area paths', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        pat: 'test-pat',
        projects: [
          {
            name: 'Project1',
            areaPaths: ['Project1\\Frontend', 'Project1\\Backend'],
            isUmbrella: false,
          },
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.ado.mode).toBe('by-area');
      expect(config.ado.projectMappings[0].projectName).toBe('Project1');
      expect(config.ado.projectMappings[0].areaMappings).toHaveLength(2);
      expect(config.ado.projectMappings[0].areaMappings[0].areaPath).toBe('Project1\\Frontend');
      expect(config.ado.projectMappings[0].areaMappings[0].specweaveFolder).toBe('project1/frontend');
    });

    it('should build by-project mode when projects have no area paths', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        pat: 'test-pat',
        projects: [
          { name: 'Project1', areaPaths: [], isUmbrella: false },
          { name: 'Project2', isUmbrella: false },
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.ado.mode).toBe('by-project');
      // Project1 has empty area paths - in by-project mode this is normal
      expect(config.ado.projectMappings[0].projectName).toBe('Project1');
      expect(config.ado.projectMappings[1].projectName).toBe('Project2');
    });

    it('should fallback to simple mode when no projects configured', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        pat: 'test-pat',
        // No projects array, no org match
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.ado.mode).toBe('simple');
      expect(config.ado.projectMappings).toEqual([]);
    });

    it('should exclude umbrella projects from ADO config', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        pat: 'test-pat',
        projects: [
          { name: 'UmbrellaProj', areaPaths: [], isUmbrella: true },
          { name: 'RealProject', areaPaths: ['RealProject\\TeamA'], isUmbrella: false },
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      mockGetUmbrellaProjects.mockReturnValue(['AnotherUmbrella']);
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.ado.projectMappings.length).toBe(1);
      expect(config.ado.projectMappings[0].projectName).toBe('RealProject');
    });

    it('should handle area paths with backslash correctly', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        pat: 'test-pat',
        projects: [
          {
            name: 'Acme',
            areaPaths: ['Acme\\Platform-Engineering\\Core'],
            isUmbrella: false,
          },
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      // Should extract last segment "Core"
      expect(config.ado.projectMappings[0].areaMappings[0].areaPath).toBe('Acme\\Platform-Engineering\\Core');
      expect(config.ado.projectMappings[0].areaMappings[0].specweaveFolder).toBe('acme/core');
    });
  });

  // ─── buildJiraConfigFromProjects (tested via promptAndRunExternalImport) ─

  describe('buildJiraConfigFromProjects - via integration', () => {
    it('should build by-board mode when projects have boards', async () => {
      const jiraConfig = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        projects: [
          {
            key: 'PROJ1',
            boards: [
              { id: '10', name: 'Sprint Board' },
              { id: '20', name: 'Kanban Board' },
            ],
          },
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: jiraConfig,
        ado: null,
        availableTools: ['JIRA'],
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.jira.mode).toBe('by-board');
      expect(config.jira.projectMappings[0].projectKey).toBe('PROJ1');
      expect(config.jira.projectMappings[0].boardMappings).toHaveLength(2);
      expect(config.jira.projectMappings[0].boardMappings[0].boardName).toBe('Sprint Board');
      expect(config.jira.projectMappings[0].boardMappings[0].specweaveFolder).toBe('proj1/sprint-board');
    });

    it('should build by-project mode when projects have no boards', async () => {
      const jiraConfig = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        projects: [
          { key: 'PROJ1' },
          { key: 'PROJ2' },
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: jiraConfig,
        ado: null,
        availableTools: ['JIRA'],
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.jira.mode).toBe('by-project');
      expect(config.jira.projectMappings[0].boardMappings[0].specweaveFolder).toBe('proj1/_default');
    });

    it('should fallback to simple mode when no projects configured', async () => {
      const jiraConfig = {
        host: 'https://myorg.atlassian.net',
        // No email/apiToken = no auto-detect, no projects = simple fallback
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: jiraConfig,
        ado: null,
        availableTools: ['JIRA'],
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      // JIRA with no projects, no email/apiToken -> no jira config added
      expect(config.jira).toBeUndefined();
    });

    it('should include board IDs in board mappings', async () => {
      const jiraConfig = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        projects: [
          { key: 'PROJ', boards: [{ id: '42', name: 'Main Board' }] },
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: jiraConfig,
        ado: null,
        availableTools: ['JIRA'],
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.jira.projectMappings[0].boardMappings[0].boardId).toBe(42);
    });

    it('should use board name or generate fallback name from ID', async () => {
      const jiraConfig = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        projects: [
          { key: 'PROJ', boards: [{ id: '42' }] }, // No name
        ],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: jiraConfig,
        ado: null,
        availableTools: ['JIRA'],
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.jira.projectMappings[0].boardMappings[0].boardName).toBe('board-42');
    });
  });

  // ─── promptAndRunExternalImport: ADO legacy auto-detect ─────────────────

  describe('promptAndRunExternalImport - ADO legacy auto-detect', () => {
    it('should fallback to simple mode when ADO auto-detect fails', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        pat: 'test-pat',
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      mockDetectAdoStructure.mockResolvedValue(null);
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.ado.mode).toBe('simple');
    });

    it('should fallback to simple mode when user declines ADO mapping', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        pat: 'test-pat',
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      mockDetectAdoStructure.mockResolvedValue({ projects: [{ name: 'MainProject' }] });
      mockConfirmAdoMapping.mockResolvedValue(null); // User declined

      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.ado.mode).toBe('simple');
    });

    it('should filter umbrella projects from ADO auto-detect mapping', async () => {
      const adoConfig = {
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        pat: 'test-pat',
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      mockDetectAdoStructure.mockResolvedValue({ projects: [{ name: 'MainProject' }] });
      mockConfirmAdoMapping.mockResolvedValue({ mode: 'by-area' });
      mockBuildAdoCoordinatorConfig.mockReturnValue({
        orgUrl: 'https://dev.azure.com/myorg',
        project: 'MainProject',
        mode: 'by-area',
        projectMappings: [
          { projectName: 'MainProject', areaMappings: [] },
          { projectName: 'UmbrellaProject', areaMappings: [] },
        ],
      });
      mockGetUmbrellaProjects.mockReturnValue(['UmbrellaProject']);

      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.ado.projectMappings.length).toBe(1);
      expect(config.ado.projectMappings[0].projectName).toBe('MainProject');
    });

    it('should use simple mode when ADO has no org or PAT', async () => {
      const adoConfig = {
        orgUrl: 'https://some-other-url.com/something',
        project: 'MainProject',
        // No PAT
      };
      mockDetectAllConfigs.mockReturnValue({
        github: null,
        jira: null,
        ado: adoConfig,
        availableTools: ['Azure DevOps'],
      });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.ado.mode).toBe('simple');
      expect(mockDetectAdoStructure).not.toHaveBeenCalled();
    });
  });

  // ─── Import summary display ─────────────────────────────────────────────

  describe('promptAndRunExternalImport - import summary display', () => {
    function setupImportWithResult(result: any) {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({ token: 'ghp_test', source: 'GITHUB_TOKEN' });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false);
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(result);
    }

    it('should show per-repo breakdown with open/closed counts', async () => {
      const items = [
        { id: '1', platform: 'github', sourceRepo: 'acme/repo1', status: 'open' },
        { id: '2', platform: 'github', sourceRepo: 'acme/repo1', status: 'closed' },
        { id: '3', platform: 'github', sourceRepo: 'acme/repo2', status: 'open' },
      ];
      setupImportWithResult(makeCoordinatorResult({ totalCount: 3, allItems: items }));
      mockGroupItemsByExternalContainer.mockReturnValue([
        { projectId: 'repo1', items: items.slice(0, 2), containerId: 'repo1', containerType: null, externalContainer: undefined },
        { projectId: 'repo2', items: items.slice(2), containerId: 'repo2', containerType: null, externalContainer: undefined },
      ]);
      mockItemConverterInstance.convertItems
        .mockResolvedValueOnce([{ id: 'US-001E' }])
        .mockResolvedValueOnce([{ id: 'US-001E' }]);

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const logCalls = (console.log as any).mock.calls.flat().join('\n');
      expect(logCalls).toContain('acme/repo1');
      expect(logCalls).toContain('acme/repo2');
    });

    it('should show platform-level summary when no allItems detailed info', async () => {
      setupImportWithResult(
        makeCoordinatorResult({
          totalCount: 0,
          allItems: [],
          results: [{ platform: 'github', count: 5, items: [], errors: [] }],
        })
      );

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const logCalls = (console.log as any).mock.calls.flat().join('\n');
      expect(logCalls).toContain('github: 5 items');
    });
  });

  // ─── Import options ─────────────────────────────────────────────────────

  describe('promptAndRunExternalImport - ImportOptions', () => {
    it('should use default estimatedTotal when not provided', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({ token: 'ghp_test', source: 'GITHUB_TOKEN' });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false);
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      // No options = default estimatedTotal of 100
      await promptAndRunExternalImport('/test/dir', false, 'en');

      // Just verify it completed without errors
      expect(mockImportCoordinatorConstructor).toHaveBeenCalled();
    });

    it('should accept custom estimatedTotal', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({ token: 'ghp_test', source: 'GITHUB_TOKEN' });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false);
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en', { estimatedTotal: 500 });

      expect(mockImportCoordinatorConstructor).toHaveBeenCalled();
    });
  });

  // ─── GitHub + no token ──────────────────────────────────────────────────

  describe('promptAndRunExternalImport - no GitHub token', () => {
    it('should not configure GitHub import when no token available', async () => {
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: null,
        ado: null,
        availableTools: ['GitHub'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({ token: '', source: 'none' });
      mockSelect.mockResolvedValueOnce('yes');
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      // No GitHub config added since no token
      expect(config.github).toBeUndefined();
      expect(config.githubRepositories).toBeUndefined();
    });
  });

  // ─── Combined providers ─────────────────────────────────────────────────

  describe('promptAndRunExternalImport - combined providers', () => {
    it('should configure both GitHub and JIRA when both detected', async () => {
      const jiraConfig = {
        host: 'https://myorg.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        projects: [{ key: 'PROJ', boards: [{ id: '10', name: 'Board' }] }],
      };
      mockDetectAllConfigs.mockReturnValue({
        github: { owner: 'acme', repo: 'app' },
        jira: jiraConfig,
        ado: null,
        availableTools: ['GitHub', 'JIRA'],
      });
      mockGetGitHubAuthFromProject.mockReturnValue({ token: 'ghp_test', source: 'GITHUB_TOKEN' });
      mockSelect.mockResolvedValueOnce('yes');
      mockConfirm.mockResolvedValueOnce(false); // no multi-repo
      mockSelect.mockResolvedValueOnce(3);
      mockConfirm.mockResolvedValueOnce(true);
      mockImportCoordinatorInstance.importAll.mockResolvedValue(makeCoordinatorResult());

      await promptAndRunExternalImport('/test/dir', false, 'en');

      const config = mockImportCoordinatorConstructor.mock.calls[0][0];
      expect(config.github).toBeDefined();
      expect(config.jira).toBeDefined();
      expect(config.jira.host).toBe('https://myorg.atlassian.net');
    });
  });
});
