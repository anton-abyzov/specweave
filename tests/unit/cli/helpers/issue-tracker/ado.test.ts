/**
 * Unit tests for Azure DevOps issue tracker integration
 *
 * Tests all exported functions from src/cli/helpers/issue-tracker/ado.ts:
 * - checkExistingAzureDevOpsCredentials
 * - validateAzureDevOpsConnection
 * - getAzureDevOpsEnvVars
 * - createAdoProjectFolders
 * - showAzureDevOpsSetupComplete
 * - showAzureDevOpsSetupSkipped
 * - promptAzureDevOpsCredentials (interactive prompts)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted + vi.mock for ESM)
// ---------------------------------------------------------------------------

const {
  mockReadEnvFile,
  mockParseEnvFile,
  mockGetAzureDevOpsAuth,
  mockRetryWithBackoff,
  mockCheckRateLimit,
  mockSelectAreaPaths,
  mockToAreaPathObjects,
  mockNormalizeToProjectId,
  mockGetLocaleManager,
  mockExistsSync,
  mockMkdirSync,
  mockConfirm,
  mockInput,
  mockPassword,
  mockCheckbox,
  mockSelect,
  mockOra,
  mockOraInstance,
  mockCacheGet,
  mockCacheSet,
  MockCacheManager,
  mockFetchAreaPathsForProject,
} = vi.hoisted(() => {
  const oraInstance = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  };
  const mockCacheGet = vi.fn().mockResolvedValue(null);
  const mockCacheSet = vi.fn().mockResolvedValue(undefined);

  const MockCacheManagerSpy = vi.fn();
  MockCacheManagerSpy.prototype.get = mockCacheGet;
  MockCacheManagerSpy.prototype.set = mockCacheSet;

  return {
    mockReadEnvFile: vi.fn().mockReturnValue(''),
    mockParseEnvFile: vi.fn().mockReturnValue({}),
    mockGetAzureDevOpsAuth: vi.fn().mockReturnValue(null),
    mockRetryWithBackoff: vi.fn().mockImplementation(async (fn: () => Promise<any>) => fn()),
    mockCheckRateLimit: vi.fn().mockReturnValue(null),
    mockSelectAreaPaths: vi.fn().mockResolvedValue(null),
    mockToAreaPathObjects: vi.fn().mockImplementation((paths: string[]) =>
      paths.map((p: string) => ({ name: p.split('\\').pop() || p, path: p }))
    ),
    mockNormalizeToProjectId: vi.fn().mockImplementation((name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    ),
    mockGetLocaleManager: vi.fn().mockReturnValue({
      t: vi.fn().mockImplementation((key: string) => key),
    }),
    mockExistsSync: vi.fn().mockReturnValue(true),
    mockMkdirSync: vi.fn(),
    mockConfirm: vi.fn().mockResolvedValue(true),
    mockInput: vi.fn().mockResolvedValue('test-org'),
    mockPassword: vi.fn().mockResolvedValue('a'.repeat(52)),
    mockCheckbox: vi.fn().mockResolvedValue([]),
    mockSelect: vi.fn().mockResolvedValue('single'),
    mockOra: vi.fn().mockReturnValue(oraInstance),
    mockOraInstance: oraInstance,
    mockCacheGet,
    mockCacheSet,
    MockCacheManager: MockCacheManagerSpy,
    mockFetchAreaPathsForProject: vi.fn().mockResolvedValue([]),
  };
});

vi.mock('../../../../../src/utils/env-file.js', () => ({
  readEnvFile: mockReadEnvFile,
  parseEnvFile: mockParseEnvFile,
}));

vi.mock('../../../../../src/utils/auth-helpers.js', () => ({
  getAzureDevOpsAuth: mockGetAzureDevOpsAuth,
}));

vi.mock('../../../../../src/cli/helpers/issue-tracker/utils.js', () => ({
  retryWithBackoff: mockRetryWithBackoff,
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock('../../../../../src/cli/helpers/ado-area-selector.js', () => ({
  selectAreaPaths: mockSelectAreaPaths,
  toAreaPathObjects: mockToAreaPathObjects,
}));

vi.mock('../../../../../src/utils/project-id-generator.js', () => ({
  normalizeToProjectId: mockNormalizeToProjectId,
}));

vi.mock('../../../../../src/core/i18n/locale-manager.js', () => ({
  getLocaleManager: mockGetLocaleManager,
}));

vi.mock('../../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: mockConfirm,
  input: mockInput,
  password: mockPassword,
  checkbox: mockCheckbox,
  select: mockSelect,
}));

vi.mock('ora', () => ({
  default: mockOra,
}));

vi.mock('chalk', () => {
  const passthrough = (s: string) => s;
  const handler: ProxyHandler<any> = {
    get: () => new Proxy(passthrough, handler),
    apply: (_target: any, _thisArg: any, args: any[]) => args[0],
  };
  return { default: new Proxy(passthrough, handler) };
});

vi.mock('../../../../../src/core/cache/cache-manager.js', () => ({
  CacheManager: MockCacheManager,
}));

// Mock the dynamic import for fetchProjectAreaPaths
vi.mock('../../../../../plugins/specweave-ado/lib/ado-board-resolver.js', () => ({
  fetchAreaPathsForProject: mockFetchAreaPathsForProject,
}));

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

function mockResponse(ok: boolean, data: unknown, status = 200, headers?: Record<string, string>): Response {
  const h = new Headers(headers || {});
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
    headers: h,
    redirected: false,
    type: 'basic',
    url: '',
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    bytes: vi.fn(),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Imports (AFTER mocks)
// ---------------------------------------------------------------------------

import {
  checkExistingAzureDevOpsCredentials,
  validateAzureDevOpsConnection,
  getAzureDevOpsEnvVars,
  createAdoProjectFolders,
  showAzureDevOpsSetupComplete,
  showAzureDevOpsSetupSkipped,
  promptAzureDevOpsCredentials,
} from '../../../../../src/cli/helpers/issue-tracker/ado.js';

import { RateLimitError } from '../../../../../src/cli/helpers/issue-tracker/types.js';
import type { AzureDevOpsCredentials } from '../../../../../src/cli/helpers/issue-tracker/types.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ado.ts - Azure DevOps Issue Tracker', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    globalThis.fetch = vi.fn();

    // Reset default mock behaviors
    mockReadEnvFile.mockReturnValue('');
    mockParseEnvFile.mockReturnValue({});
    mockGetAzureDevOpsAuth.mockReturnValue(null);
    mockExistsSync.mockReturnValue(true);
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
    mockOraInstance.start.mockReturnThis();
    mockOraInstance.succeed.mockReturnThis();
    mockOraInstance.fail.mockReturnThis();
    mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());
    mockCheckRateLimit.mockReturnValue(null);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    globalThis.fetch = originalFetch;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // checkExistingAzureDevOpsCredentials
  // ─────────────────────────────────────────────────────────────────────────

  describe('checkExistingAzureDevOpsCredentials', () => {
    it('should return credentials from .env file when all values present', async () => {
      mockReadEnvFile.mockReturnValue('AZURE_DEVOPS_PAT=test-pat\nAZURE_DEVOPS_ORG=myorg\nAZURE_DEVOPS_PROJECT=myproject');
      mockParseEnvFile.mockReturnValue({
        AZURE_DEVOPS_PAT: 'test-pat',
        AZURE_DEVOPS_ORG: 'myorg',
        AZURE_DEVOPS_PROJECT: 'myproject',
      });

      const result = await checkExistingAzureDevOpsCredentials('/project');

      expect(result).toEqual({
        source: '.env',
        credentials: {
          pat: 'test-pat',
          org: 'myorg',
          project: 'myproject',
        },
      });
      expect(mockReadEnvFile).toHaveBeenCalledWith('/project');
    });

    it('should return null when .env has incomplete credentials', async () => {
      mockReadEnvFile.mockReturnValue('AZURE_DEVOPS_PAT=test-pat');
      mockParseEnvFile.mockReturnValue({
        AZURE_DEVOPS_PAT: 'test-pat',
      });
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      const result = await checkExistingAzureDevOpsCredentials('/project');
      expect(result).toBeNull();
    });

    it('should fall back to environment variables when .env is empty', async () => {
      mockReadEnvFile.mockReturnValue('');
      mockGetAzureDevOpsAuth.mockReturnValue({
        pat: 'env-pat',
        org: 'env-org',
        project: 'env-project',
      });

      const result = await checkExistingAzureDevOpsCredentials('/project');

      expect(result).toEqual({
        source: 'env-vars',
        credentials: {
          pat: 'env-pat',
          org: 'env-org',
          project: 'env-project',
        },
      });
    });

    it('should return null when no credentials found anywhere', async () => {
      mockReadEnvFile.mockReturnValue('');
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      const result = await checkExistingAzureDevOpsCredentials('/project');
      expect(result).toBeNull();
    });

    it('should prefer .env credentials over environment variables', async () => {
      mockReadEnvFile.mockReturnValue('AZURE_DEVOPS_PAT=env-file-pat');
      mockParseEnvFile.mockReturnValue({
        AZURE_DEVOPS_PAT: 'env-file-pat',
        AZURE_DEVOPS_ORG: 'env-file-org',
        AZURE_DEVOPS_PROJECT: 'env-file-project',
      });
      mockGetAzureDevOpsAuth.mockReturnValue({
        pat: 'env-var-pat',
        org: 'env-var-org',
        project: 'env-var-project',
      });

      const result = await checkExistingAzureDevOpsCredentials('/project');

      expect(result?.source).toBe('.env');
      expect(result?.credentials).toEqual({
        pat: 'env-file-pat',
        org: 'env-file-org',
        project: 'env-file-project',
      });
    });

    it('should handle .env file with missing PAT', async () => {
      mockReadEnvFile.mockReturnValue('AZURE_DEVOPS_ORG=myorg\nAZURE_DEVOPS_PROJECT=myproject');
      mockParseEnvFile.mockReturnValue({
        AZURE_DEVOPS_ORG: 'myorg',
        AZURE_DEVOPS_PROJECT: 'myproject',
      });
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      const result = await checkExistingAzureDevOpsCredentials('/project');
      expect(result).toBeNull();
    });

    it('should handle .env file with missing ORG', async () => {
      mockReadEnvFile.mockReturnValue('AZURE_DEVOPS_PAT=pat\nAZURE_DEVOPS_PROJECT=proj');
      mockParseEnvFile.mockReturnValue({
        AZURE_DEVOPS_PAT: 'pat',
        AZURE_DEVOPS_PROJECT: 'proj',
      });
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      const result = await checkExistingAzureDevOpsCredentials('/project');
      expect(result).toBeNull();
    });

    it('should handle .env file with missing PROJECT', async () => {
      mockReadEnvFile.mockReturnValue('AZURE_DEVOPS_PAT=pat\nAZURE_DEVOPS_ORG=org');
      mockParseEnvFile.mockReturnValue({
        AZURE_DEVOPS_PAT: 'pat',
        AZURE_DEVOPS_ORG: 'org',
      });
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      const result = await checkExistingAzureDevOpsCredentials('/project');
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // validateAzureDevOpsConnection
  // ─────────────────────────────────────────────────────────────────────────

  describe('validateAzureDevOpsConnection', () => {
    const baseCredentials: AzureDevOpsCredentials = {
      pat: 'test-pat-token-1234567890',
      org: 'test-org',
      project: 'test-project',
    };

    it('should validate connection successfully for single project', async () => {
      const projectData = { name: 'test-project', id: 'proj-123' };

      mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => {
        // Simulate what the inner function does
        return projectData;
      });

      const result = await validateAzureDevOpsConnection(baseCredentials);

      expect(result).toEqual({
        success: true,
        username: 'test-project',
      });
      expect(mockOraInstance.succeed).toHaveBeenCalled();
    });

    it('should validate connection for multi-project (uses default project)', async () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'test-pat',
        org: 'test-org',
        projects: [
          { name: 'ProjectA', isDefault: false },
          { name: 'ProjectB', isDefault: true },
        ],
      };

      const projectData = { name: 'ProjectB', id: 'proj-b' };
      mockRetryWithBackoff.mockImplementation(async () => projectData);

      const result = await validateAzureDevOpsConnection(creds);

      expect(result).toEqual({
        success: true,
        username: 'ProjectB',
      });
    });

    it('should use first project if no default in multi-project', async () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'test-pat',
        org: 'test-org',
        projects: [
          { name: 'ProjectA' },
          { name: 'ProjectB' },
        ],
      };

      const projectData = { name: 'ProjectA', id: 'proj-a' };
      mockRetryWithBackoff.mockImplementation(async () => projectData);

      const result = await validateAzureDevOpsConnection(creds);

      expect(result.success).toBe(true);
    });

    it('should fail when no project specified', async () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'test-pat',
        org: 'test-org',
      };

      const result = await validateAzureDevOpsConnection(creds);

      expect(result).toEqual({
        success: false,
        error: 'No project specified',
      });
      expect(mockOraInstance.fail).toHaveBeenCalled();
    });

    it('should handle retryWithBackoff throwing an error', async () => {
      mockRetryWithBackoff.mockRejectedValue(new Error('Authentication failed'));

      const result = await validateAzureDevOpsConnection(baseCredentials);

      expect(result).toEqual({
        success: false,
        error: 'Authentication failed',
      });
      expect(mockOraInstance.fail).toHaveBeenCalled();
    });

    it('should handle error with no message', async () => {
      mockRetryWithBackoff.mockRejectedValue(new Error());

      const result = await validateAzureDevOpsConnection(baseCredentials);

      expect(result.success).toBe(false);
    });

    it('should show project count for multi-project on success', async () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'test-pat',
        org: 'test-org',
        projects: [
          { name: 'ProjectA', isDefault: true },
          { name: 'ProjectB' },
          { name: 'ProjectC' },
        ],
      };

      mockRetryWithBackoff.mockImplementation(async () => ({ name: 'ProjectA' }));

      const result = await validateAzureDevOpsConnection(creds);

      expect(result.success).toBe(true);
      // The spinner.succeed should show "3 projects" instead of single project name
      const succeedCall = mockOraInstance.succeed.mock.calls[0]?.[0] as string;
      expect(succeedCall).toContain('3 projects');
    });

    it('should pass maxRetries to retryWithBackoff', async () => {
      mockRetryWithBackoff.mockImplementation(async () => ({ name: 'test' }));

      await validateAzureDevOpsConnection(baseCredentials, 5);

      expect(mockRetryWithBackoff).toHaveBeenCalledWith(expect.any(Function), 5);
    });

    it('should use default maxRetries of 3', async () => {
      mockRetryWithBackoff.mockImplementation(async () => ({ name: 'test' }));

      await validateAzureDevOpsConnection(baseCredentials);

      expect(mockRetryWithBackoff).toHaveBeenCalledWith(expect.any(Function), 3);
    });

    it('should validate the retryWithBackoff inner function calls fetch correctly', async () => {
      // Let retryWithBackoff actually execute the callback
      mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());

      const projectData = { name: 'test-project', id: 'proj-123' };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, projectData)
      );

      const result = await validateAzureDevOpsConnection(baseCredentials);

      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('dev.azure.com/test-org/_apis/projects/test-project'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
            Accept: 'application/json',
          }),
        })
      );
    });

    it('should handle 401 response (invalid PAT)', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(false, 'Unauthorized', 401)
      );

      const result = await validateAzureDevOpsConnection(baseCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Personal Access Token');
    });

    it('should handle 403 response (forbidden)', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(false, 'Forbidden', 403)
      );

      const result = await validateAzureDevOpsConnection(baseCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access forbidden');
    });

    it('should handle 404 response (project not found)', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(false, 'Not Found', 404)
      );

      const result = await validateAzureDevOpsConnection(baseCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project not found');
    });

    it('should handle unknown HTTP error', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(false, 'Server Error', 500)
      );

      const result = await validateAzureDevOpsConnection(baseCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 500');
    });

    it('should detect rate limiting via checkRateLimit', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());

      const rateLimitInfo = {
        limit: 100,
        remaining: 0,
        reset: new Date(Date.now() + 60000),
      };
      mockCheckRateLimit.mockReturnValue(rateLimitInfo);

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(false, 'Rate limited', 429)
      );

      const result = await validateAzureDevOpsConnection(baseCredentials);

      expect(result.success).toBe(false);
      // The RateLimitError gets thrown by the inner function
      expect(result.error).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getAzureDevOpsEnvVars
  // ─────────────────────────────────────────────────────────────────────────

  describe('getAzureDevOpsEnvVars', () => {
    it('should return only PAT as env var', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'my-secret-pat',
        org: 'my-org',
        project: 'my-project',
      };

      const result = getAzureDevOpsEnvVars(creds);

      expect(result).toEqual([
        { key: 'AZURE_DEVOPS_PAT', value: 'my-secret-pat' },
      ]);
    });

    it('should not include org or project in env vars', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'secret-pat',
        org: 'org-name',
        project: 'proj-name',
        areaPaths: ['Team A', 'Team B'],
      };

      const result = getAzureDevOpsEnvVars(creds);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('AZURE_DEVOPS_PAT');
      // Verify org/project are NOT included
      expect(result.find(v => v.key === 'AZURE_DEVOPS_ORG')).toBeUndefined();
      expect(result.find(v => v.key === 'AZURE_DEVOPS_PROJECT')).toBeUndefined();
    });

    it('should handle multi-project credentials', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'multi-proj-pat',
        org: 'org',
        projects: [
          { name: 'ProjA', isDefault: true },
          { name: 'ProjB' },
        ],
      };

      const result = getAzureDevOpsEnvVars(creds);

      expect(result).toEqual([
        { key: 'AZURE_DEVOPS_PAT', value: 'multi-proj-pat' },
      ]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // createAdoProjectFolders
  // ─────────────────────────────────────────────────────────────────────────

  describe('createAdoProjectFolders', () => {
    it('should create specs directory if it does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        project: 'MyProject',
      };

      createAdoProjectFolders('/project', creds);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.specweave/docs/internal/specs'),
        { recursive: true }
      );
    });

    it('should create folder for single project (normalized name)', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        project: 'My Project',
      };

      createAdoProjectFolders('/project', creds);

      expect(mockNormalizeToProjectId).toHaveBeenCalledWith('My Project');
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('my-project'),
        { recursive: true }
      );
    });

    it('should create folders for multi-project configuration', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        projects: [
          { name: 'Frontend', isDefault: true },
          { name: 'Backend' },
        ],
      };

      createAdoProjectFolders('/project', creds);

      expect(mockNormalizeToProjectId).toHaveBeenCalledWith('Frontend');
      expect(mockNormalizeToProjectId).toHaveBeenCalledWith('Backend');
    });

    it('should create area path subfolders for area-path-based strategy', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        project: 'MyProject',
        areaPaths: ['Team A\\Platform', 'Team B\\Mobile'],
        strategy: 'area-path-based',
      };

      createAdoProjectFolders('/project', creds);

      // Area paths are split by backslash and last segment is used
      expect(mockNormalizeToProjectId).toHaveBeenCalledWith('Platform');
      expect(mockNormalizeToProjectId).toHaveBeenCalledWith('Mobile');
    });

    it('should use area-path-based as default strategy', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        project: 'MyProject',
        areaPaths: ['Root\\Area1'],
      };

      createAdoProjectFolders('/project', creds);

      // Default strategy is area-path-based, so subfolders should be created
      expect(mockNormalizeToProjectId).toHaveBeenCalledWith('Area1');
    });

    it('should skip folder creation when no project specified (single mode)', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
      };

      createAdoProjectFolders('/project', creds);

      // Should warn, not crash
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No project specified'));
    });

    it('should handle area paths without backslash (just name)', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        project: 'MyProject',
        areaPaths: ['SimpleArea'],
        strategy: 'area-path-based',
      };

      createAdoProjectFolders('/project', creds);

      expect(mockNormalizeToProjectId).toHaveBeenCalledWith('SimpleArea');
    });

    it('should not create area subfolders when areaPaths is empty', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        project: 'MyProject',
        areaPaths: [],
      };

      createAdoProjectFolders('/project', creds);

      // mkdirSync is called for the project folder and possibly the specs dir, but not area paths
      const mkdirCalls = mockMkdirSync.mock.calls.map(c => c[0]);
      const areaFolderCalls = mkdirCalls.filter((p: string) =>
        p.includes('myproject/') || p.includes('myproject\\')
      );
      expect(areaFolderCalls).toHaveLength(0);
    });

    it('should create area subfolders for multi-project with area paths', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        projects: [
          { name: 'ProjA', areaPaths: ['Root\\Team1', 'Root\\Team2'] },
        ],
      };

      createAdoProjectFolders('/project', creds);

      expect(mockNormalizeToProjectId).toHaveBeenCalledWith('Team1');
      expect(mockNormalizeToProjectId).toHaveBeenCalledWith('Team2');
    });

    it('should pass strategy from credentials to single project folder creation', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        projects: [
          { name: 'ProjA', areaPaths: ['Area1'] },
        ],
        strategy: 'area-path-based',
      };

      createAdoProjectFolders('/project', creds);

      expect(mockNormalizeToProjectId).toHaveBeenCalledWith('Area1');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // showAzureDevOpsSetupComplete
  // ─────────────────────────────────────────────────────────────────────────

  describe('showAzureDevOpsSetupComplete', () => {
    it('should log setup complete messages', () => {
      showAzureDevOpsSetupComplete('en');

      expect(consoleSpy).toHaveBeenCalled();
      const allOutput = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(allOutput).toContain('Azure DevOps integration complete');
      expect(allOutput).toContain('/specweave-ado:sync');
      expect(allOutput).toContain('/specweave-ado:status');
    });

    it('should call getLocaleManager with language', () => {
      showAzureDevOpsSetupComplete('en');
      expect(mockGetLocaleManager).toHaveBeenCalledWith('en');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // showAzureDevOpsSetupSkipped
  // ─────────────────────────────────────────────────────────────────────────

  describe('showAzureDevOpsSetupSkipped', () => {
    it('should log setup skipped messages', () => {
      showAzureDevOpsSetupSkipped('en');

      expect(consoleSpy).toHaveBeenCalled();
      const allOutput = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(allOutput).toContain('Skipped Azure DevOps setup');
      expect(allOutput).toContain('AZURE_DEVOPS_PAT');
    });

    it('should mention per-project configuration', () => {
      showAzureDevOpsSetupSkipped('en');

      const allOutput = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(allOutput).toContain('AZURE_DEVOPS_PROJECTS');
    });

    it('should call getLocaleManager with language', () => {
      showAzureDevOpsSetupSkipped('en');
      expect(mockGetLocaleManager).toHaveBeenCalledWith('en');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // promptAzureDevOpsCredentials
  // ─────────────────────────────────────────────────────────────────────────

  describe('promptAzureDevOpsCredentials', () => {
    beforeEach(() => {
      // Default: user says yes to continue, provides org/pat, fetch succeeds
      mockConfirm.mockResolvedValue(true);
      mockInput.mockResolvedValue('test-org');
      mockPassword.mockResolvedValue('a'.repeat(52));
      mockSelect.mockResolvedValue('single');

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [{ name: 'TestProject', id: 'proj-1' }],
        })
      );
    });

    it('should return null when user declines setup', async () => {
      // First confirm (cached config - if any) = true, second confirm (continue) = false
      mockConfirm.mockResolvedValueOnce(false);

      const result = await promptAzureDevOpsCredentials('en');
      expect(result).toBeNull();
    });

    it('should return null when no projects found', async () => {
      mockConfirm.mockResolvedValue(true);
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, { value: [] })
      );

      const result = await promptAzureDevOpsCredentials('en');
      expect(result).toBeNull();
      expect(mockOraInstance.fail).toHaveBeenCalled();
    });

    it('should return null when fetch fails (PAT validation error)', async () => {
      mockConfirm.mockResolvedValue(true);
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('401 Unauthorized')
      );

      const result = await promptAzureDevOpsCredentials('en');
      expect(result).toBeNull();
      expect(mockOraInstance.fail).toHaveBeenCalled();
    });

    it('should handle single project selection flow', async () => {
      mockConfirm.mockResolvedValue(true);
      mockSelect
        .mockResolvedValueOnce('single')    // project mode = single
        .mockResolvedValueOnce('TestProject'); // select project

      // Fetch for projects list
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [{ name: 'TestProject', id: 'proj-1' }],
        })
      );

      mockSelectAreaPaths.mockResolvedValue(null);

      const result = await promptAzureDevOpsCredentials('en');

      expect(result).not.toBeNull();
      expect(result?.org).toBe('test-org');
      expect(result?.pat).toBe('a'.repeat(52));
    });

    it('should use cached config when available and user approves', async () => {
      const cachedConfig = {
        org: 'cached-org',
        project: 'CachedProject',
        areaPaths: ['Area1'],
      };
      mockCacheGet.mockResolvedValue(cachedConfig);

      // First confirm = yes (use cached), second = yes (continue setup)
      mockConfirm.mockResolvedValueOnce(true)   // use cached config
                  .mockResolvedValueOnce(true);  // continue setup

      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('CachedProject');

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [{ name: 'CachedProject', id: 'proj-1' }],
        })
      );

      const result = await promptAzureDevOpsCredentials('en', '/project');

      // Should use cached org
      expect(result?.org).toBe('cached-org');
    });

    it('should discard cache when user declines cached config', async () => {
      const cachedConfig = {
        org: 'cached-org',
        project: 'CachedProject',
      };
      mockCacheGet.mockResolvedValue(cachedConfig);

      // First confirm = no (don't use cached), second = yes (continue setup)
      mockConfirm.mockResolvedValueOnce(false)
                  .mockResolvedValueOnce(true);

      mockInput.mockResolvedValue('new-org');
      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('NewProject');

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [{ name: 'NewProject', id: 'proj-2' }],
        })
      );

      const result = await promptAzureDevOpsCredentials('en', '/project');

      expect(result?.org).toBe('new-org');
    });

    it('should handle multi-project selection flow', async () => {
      // continue setup = yes
      mockConfirm.mockResolvedValue(true);

      // project mode = multi
      mockSelect
        .mockResolvedValueOnce('multi')
        .mockResolvedValueOnce('__none__'); // No umbrella project

      // Checkbox selects two projects
      mockCheckbox.mockResolvedValueOnce(['ProjectA', 'ProjectB']);

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [
            { name: 'ProjectA', id: 'proj-a' },
            { name: 'ProjectB', id: 'proj-b' },
          ],
        })
      );

      mockSelectAreaPaths.mockResolvedValue(null);

      const result = await promptAzureDevOpsCredentials('en', '/project');

      expect(result).not.toBeNull();
      expect(result?.projects).toHaveLength(2);
      expect(result?.projects?.[0].name).toBe('ProjectA');
      expect(result?.projects?.[0].isDefault).toBe(true); // first is default
      expect(result?.projects?.[1].name).toBe('ProjectB');
    });

    it('should return null when no projects selected in multi-mode', async () => {
      mockConfirm.mockResolvedValue(true);
      mockSelect.mockResolvedValueOnce('multi');
      mockCheckbox.mockResolvedValueOnce([]); // No projects selected

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [{ name: 'ProjectA', id: 'proj-a' }],
        })
      );

      const result = await promptAzureDevOpsCredentials('en');
      expect(result).toBeNull();
    });

    it('should set umbrella project correctly in multi-mode', async () => {
      mockConfirm.mockResolvedValue(true);

      mockSelect
        .mockResolvedValueOnce('multi')     // project mode = multi
        .mockResolvedValueOnce('ProjectA'); // umbrella = ProjectA

      mockCheckbox.mockResolvedValueOnce(['ProjectA', 'ProjectB']);

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [
            { name: 'ProjectA', id: 'proj-a' },
            { name: 'ProjectB', id: 'proj-b' },
          ],
        })
      );

      mockSelectAreaPaths.mockResolvedValue(null);

      const result = await promptAzureDevOpsCredentials('en', '/project');

      expect(result?.projects).toHaveLength(2);
      const umbrella = result?.projects?.find(p => p.isUmbrella);
      expect(umbrella?.name).toBe('ProjectA');
      // Non-umbrella project should be default
      const defaultProj = result?.projects?.find(p => p.isDefault && !p.isUmbrella);
      expect(defaultProj?.name).toBe('ProjectB');
    });

    it('should handle fetch error with 401 message', async () => {
      mockConfirm.mockResolvedValue(true);

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('HTTP 401: Unauthorized')
      );

      const result = await promptAzureDevOpsCredentials('en');

      expect(result).toBeNull();
      // Check that the error message mentions "Invalid PAT"
      const failCall = consoleSpy.mock.calls.find(c =>
        typeof c[0] === 'string' && c[0].includes('Invalid PAT')
      );
      expect(failCall).toBeDefined();
    });

    it('should handle fetch error with non-401 message', async () => {
      mockConfirm.mockResolvedValue(true);

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network timeout')
      );

      const result = await promptAzureDevOpsCredentials('en');

      expect(result).toBeNull();
      const failCall = consoleSpy.mock.calls.find(c =>
        typeof c[0] === 'string' && c[0].includes('Check organization name')
      );
      expect(failCall).toBeDefined();
    });

    it('should cache config after single project selection', async () => {
      mockConfirm.mockResolvedValue(true);
      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('TestProject');

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [{ name: 'TestProject', id: 'proj-1' }],
        })
      );

      mockSelectAreaPaths.mockResolvedValue(null);

      await promptAzureDevOpsCredentials('en', '/project');

      expect(mockCacheSet).toHaveBeenCalledWith(
        'ado-config',
        expect.objectContaining({
          org: 'test-org',
          project: 'TestProject',
        })
      );
    });

    it('should cache config after multi-project selection', async () => {
      mockConfirm.mockResolvedValue(true);

      mockSelect
        .mockResolvedValueOnce('multi')
        .mockResolvedValueOnce('__none__');

      mockCheckbox.mockResolvedValueOnce(['ProjectA']);

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [{ name: 'ProjectA', id: 'proj-a' }],
        })
      );

      mockSelectAreaPaths.mockResolvedValue(null);

      await promptAzureDevOpsCredentials('en', '/project');

      expect(mockCacheSet).toHaveBeenCalledWith(
        'ado-config',
        expect.objectContaining({
          org: 'test-org',
          projects: expect.arrayContaining([
            expect.objectContaining({ name: 'ProjectA' }),
          ]),
        })
      );
    });

    it('should display cached config with multi-project details', async () => {
      const cachedConfig = {
        org: 'cached-org',
        projects: [
          { name: 'ProjA', areaPaths: ['Team1', 'Team2'] },
          { name: 'ProjB', areaPaths: [] },
        ],
      };
      mockCacheGet.mockResolvedValue(cachedConfig);

      // Accept cached config, then continue
      mockConfirm.mockResolvedValueOnce(true)
                  .mockResolvedValueOnce(true);

      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('ProjA');

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [{ name: 'ProjA', id: 'proj-a' }],
        })
      );

      await promptAzureDevOpsCredentials('en', '/project');

      // Should display cached project info
      const outputLines = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(outputLines).toContain('ProjA');
      expect(outputLines).toContain('ProjB');
    });

    it('should not use cache when projectRoot is not provided', async () => {
      mockConfirm.mockResolvedValue(true);
      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('TestProject');

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [{ name: 'TestProject', id: 'proj-1' }],
        })
      );

      mockSelectAreaPaths.mockResolvedValue(null);

      await promptAzureDevOpsCredentials('en');

      // CacheManager should not be constructed when no projectRoot
      expect(MockCacheManager).not.toHaveBeenCalled();
    });

    it('should include areaPaths when selectAreaPaths returns results', async () => {
      mockConfirm.mockResolvedValue(true);
      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('TestProject');

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [{ name: 'TestProject', id: 'proj-1' }],
        })
      );

      // Return area paths from the API so selectAreaPaths is called
      mockFetchAreaPathsForProject.mockResolvedValue([
        { name: 'Team1', path: 'Root\\Team1' },
        { name: 'Team2', path: 'Root\\Team2' },
      ]);

      mockSelectAreaPaths.mockResolvedValue({
        areaPaths: ['Root\\Team1', 'Root\\Team2'],
        selectionStrategy: 'manual-entry',
      });

      const result = await promptAzureDevOpsCredentials('en', '/project');

      expect(result?.areaPaths).toEqual(['Root\\Team1', 'Root\\Team2']);
    });

    it('should show cached config with single project and area paths', async () => {
      const cachedConfig = {
        org: 'cached-org',
        project: 'SingleProj',
        areaPaths: ['AreaX', 'AreaY'],
      };
      mockCacheGet.mockResolvedValue(cachedConfig);

      mockConfirm.mockResolvedValueOnce(true)  // use cached
                  .mockResolvedValueOnce(true); // continue

      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('SingleProj');

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(true, {
          value: [{ name: 'SingleProj', id: 'proj-1' }],
        })
      );

      await promptAzureDevOpsCredentials('en', '/project');

      const outputLines = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(outputLines).toContain('SingleProj');
      expect(outputLines).toContain('AreaX');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Edge cases and integration scenarios
  // ─────────────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('getAzureDevOpsEnvVars with empty PAT', () => {
      const creds: AzureDevOpsCredentials = {
        pat: '',
        org: 'org',
        project: 'proj',
      };

      const result = getAzureDevOpsEnvVars(creds);
      expect(result).toEqual([{ key: 'AZURE_DEVOPS_PAT', value: '' }]);
    });

    it('createAdoProjectFolders with empty projects array', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        projects: [],
      };

      // Should handle gracefully - falls through to single project path
      createAdoProjectFolders('/project', creds);

      // No project set, should warn
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No project specified'));
    });

    it('validateAzureDevOpsConnection with empty projects array', async () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        projects: [],
      };

      const result = await validateAzureDevOpsConnection(creds);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No project specified');
    });

    it('createAdoProjectFolders handles project-per-team strategy (no area subfolders)', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        project: 'MyProject',
        areaPaths: ['Area1', 'Area2'],
        strategy: 'project-per-team',
      };

      createAdoProjectFolders('/project', creds);

      // project-per-team is not area-path-based, so area subfolders should NOT be created
      // Only project folder should be created
      const mkdirPaths = mockMkdirSync.mock.calls.map(c => c[0] as string);
      const areaSubfolders = mkdirPaths.filter((p: string) =>
        p.includes('area1') || p.includes('area2')
      );
      expect(areaSubfolders).toHaveLength(0);
    });

    it('createAdoProjectFolders with special characters in project name', () => {
      const creds: AzureDevOpsCredentials = {
        pat: 'pat',
        org: 'org',
        project: 'My (Special) Project & More!',
      };

      createAdoProjectFolders('/project', creds);

      expect(mockNormalizeToProjectId).toHaveBeenCalledWith('My (Special) Project & More!');
    });
  });
});
