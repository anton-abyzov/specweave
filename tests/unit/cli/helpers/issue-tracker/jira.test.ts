/**
 * Unit Tests: Jira Integration for Issue Tracker Setup
 *
 * Covers all exported functions from src/cli/helpers/issue-tracker/jira.ts:
 * - checkExistingJiraCredentials
 * - validateJiraConnection
 * - getJiraEnvVars
 * - getJiraConfig
 * - createJiraProjectFolders
 * - showJiraSetupComplete
 * - showJiraSetupSkipped
 * - promptJiraCredentials (interactive, heavily mocked)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fsPromises } from 'fs';
import path from 'path';
import os from 'os';

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockReadEnvFile,
  mockParseEnvFile,
  mockGetJiraAuth,
  mockGetLocaleManager,
  mockIsValidEmail,
  mockRetryWithBackoff,
  mockCheckRateLimit,
  mockSelect,
  mockInput,
  mockConfirm,
  mockCheckbox,
  mockPassword,
  mockOraInstance,
  mockOra,
  mockExistsSyncFn,
  mockMkdirSyncFn,
  mockGetProjectCount,
  mockCacheGet,
  mockCacheSet,
  MockCacheManager,
  mockFetchAllProjects,
  mockFetchBatch,
  MockAsyncProjectLoader,
  mockPromptImportStrategy,
} = vi.hoisted(() => {
  const oraInst = {
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    isSpinning: false,
  };

  const mockCacheGet = vi.fn().mockResolvedValue(null);
  const mockCacheSet = vi.fn().mockResolvedValue(undefined);
  const mockFetchAllProjects = vi.fn().mockResolvedValue({ projects: [], failed: 0, canceled: false });
  const mockFetchBatch = vi.fn().mockResolvedValue([]);

  class _MockCacheManager {
    get = mockCacheGet;
    set = mockCacheSet;
  }

  class _MockAsyncProjectLoader {
    fetchAllProjects = mockFetchAllProjects;
    fetchBatch = mockFetchBatch;
  }

  const MockCacheManagerSpy = vi.fn().mockImplementation((projectRoot: string) => new _MockCacheManager());
  const MockAsyncProjectLoaderSpy = vi.fn().mockImplementation(() => new _MockAsyncProjectLoader());

  return {
    mockReadEnvFile: vi.fn().mockReturnValue(''),
    mockParseEnvFile: vi.fn().mockReturnValue({}),
    mockGetJiraAuth: vi.fn().mockReturnValue(null),
    mockGetLocaleManager: vi.fn().mockReturnValue({ t: vi.fn((k: string) => k) }),
    mockIsValidEmail: vi.fn().mockReturnValue(true),
    mockRetryWithBackoff: vi.fn(async (fn: () => Promise<any>) => fn()),
    mockCheckRateLimit: vi.fn().mockReturnValue(null),
    mockSelect: vi.fn(),
    mockInput: vi.fn(),
    mockConfirm: vi.fn(),
    mockCheckbox: vi.fn(),
    mockPassword: vi.fn(),
    mockOraInstance: oraInst,
    mockOra: vi.fn(() => oraInst),
    mockExistsSyncFn: vi.fn().mockReturnValue(false),
    mockMkdirSyncFn: vi.fn(),
    mockGetProjectCount: vi.fn().mockResolvedValue({ accessible: 0, error: null }),
    mockCacheGet,
    mockCacheSet,
    MockCacheManager: MockCacheManagerSpy,
    mockFetchAllProjects,
    mockFetchBatch,
    MockAsyncProjectLoader: MockAsyncProjectLoaderSpy,
    mockPromptImportStrategy: vi.fn().mockResolvedValue({ strategy: 'import-all' }),
  };
});

// ── Module mocks ───────────────────────────────────────────────────────────

vi.mock('../../../../../src/utils/env-file.js', () => ({
  readEnvFile: mockReadEnvFile,
  parseEnvFile: mockParseEnvFile,
}));

vi.mock('../../../../../src/utils/auth-helpers.js', () => ({
  getJiraAuth: mockGetJiraAuth,
}));

vi.mock('../../../../../src/core/i18n/locale-manager.js', () => ({
  getLocaleManager: mockGetLocaleManager,
}));

vi.mock('../../../../../src/cli/helpers/issue-tracker/utils.js', () => ({
  isValidEmail: mockIsValidEmail,
  retryWithBackoff: mockRetryWithBackoff,
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
  confirm: mockConfirm,
  checkbox: mockCheckbox,
  password: mockPassword,
}));

vi.mock('ora', () => ({ default: mockOra }));

vi.mock('chalk', () => {
  const handler: ProxyHandler<any> = {
    get: (_target, prop) => {
      if (prop === 'default') return new Proxy(() => {}, handler);
      // Methods like .bold, .cyan, .gray, .green, .yellow, .white, .red all return the passthrough
      return new Proxy((...args: any[]) => args.join(' '), handler);
    },
    apply: (_target, _this, args) => args.join(' '),
  };
  const chalkProxy = new Proxy(() => {}, handler);
  return { default: chalkProxy };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: mockExistsSyncFn,
    mkdirSync: mockMkdirSyncFn,
  };
});

vi.mock('../../../../../src/cli/helpers/project-count-fetcher.js', () => ({
  getProjectCount: mockGetProjectCount,
}));

vi.mock('../../../../../src/core/cache/cache-manager.js', () => ({
  CacheManager: MockCacheManager,
}));

vi.mock('../../../../../src/cli/helpers/async-project-loader.js', () => ({
  AsyncProjectLoader: MockAsyncProjectLoader,
}));

vi.mock('../../../../../src/cli/helpers/import-strategy-prompter.js', () => ({
  promptImportStrategy: mockPromptImportStrategy,
}));

vi.mock('../../../../../src/integrations/jira/jira-client.js', () => ({
  JiraClient: vi.fn(),
}));

// ── Mock global fetch ──────────────────────────────────────────────────────
global.fetch = vi.fn();

// ── Imports (after mocks) ──────────────────────────────────────────────────

import {
  checkExistingJiraCredentials,
  validateJiraConnection,
  getJiraEnvVars,
  getJiraConfig,
  createJiraProjectFolders,
  showJiraSetupComplete,
  showJiraSetupSkipped,
  promptJiraCredentials,
} from '../../../../../src/cli/helpers/issue-tracker/jira.js';

import type { JiraCredentials } from '../../../../../src/cli/helpers/issue-tracker/types.js';
import { RateLimitError } from '../../../../../src/cli/helpers/issue-tracker/types.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeCredentials(overrides: Partial<JiraCredentials> = {}): JiraCredentials {
  return {
    token: 'test-token-abc123',
    email: 'user@example.com',
    domain: 'acme.atlassian.net',
    instanceType: 'cloud',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Jira Integration', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockOraInstance.isSpinning = false;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // ════════════════════════════════════════════════════════════════════════
  // checkExistingJiraCredentials
  // ════════════════════════════════════════════════════════════════════════

  describe('checkExistingJiraCredentials', () => {
    it('returns credentials from .env file when all three values exist', async () => {
      mockReadEnvFile.mockReturnValue('JIRA_API_TOKEN=tok\nJIRA_EMAIL=e@x.com\nJIRA_DOMAIN=acme.atlassian.net');
      mockParseEnvFile.mockReturnValue({
        JIRA_API_TOKEN: 'tok',
        JIRA_EMAIL: 'e@x.com',
        JIRA_DOMAIN: 'acme.atlassian.net',
      });

      const result = await checkExistingJiraCredentials('/project');

      expect(result).not.toBeNull();
      expect(result!.source).toBe('.env');
      expect(result!.credentials).toEqual({
        token: 'tok',
        email: 'e@x.com',
        domain: 'acme.atlassian.net',
        instanceType: 'cloud',
      });
    });

    it('returns null when .env file is missing token', async () => {
      mockReadEnvFile.mockReturnValue('JIRA_EMAIL=e@x.com\nJIRA_DOMAIN=acme.atlassian.net');
      mockParseEnvFile.mockReturnValue({
        JIRA_EMAIL: 'e@x.com',
        JIRA_DOMAIN: 'acme.atlassian.net',
      });
      mockGetJiraAuth.mockReturnValue(null);

      const result = await checkExistingJiraCredentials('/project');
      expect(result).toBeNull();
    });

    it('returns null when .env file is empty', async () => {
      mockReadEnvFile.mockReturnValue('');
      mockGetJiraAuth.mockReturnValue(null);

      const result = await checkExistingJiraCredentials('/project');
      expect(result).toBeNull();
    });

    it('falls back to environment variables when .env lacks credentials', async () => {
      mockReadEnvFile.mockReturnValue('');
      mockGetJiraAuth.mockReturnValue({
        token: 'env-token',
        email: 'env@x.com',
        domain: 'env.atlassian.net',
      });

      const result = await checkExistingJiraCredentials('/project');

      expect(result).not.toBeNull();
      expect(result!.source).toBe('env-vars');
      expect(result!.credentials).toEqual({
        token: 'env-token',
        email: 'env@x.com',
        domain: 'env.atlassian.net',
        instanceType: 'cloud',
      });
    });

    it('prefers .env over environment variables', async () => {
      mockReadEnvFile.mockReturnValue('content');
      mockParseEnvFile.mockReturnValue({
        JIRA_API_TOKEN: 'env-file-tok',
        JIRA_EMAIL: 'envfile@x.com',
        JIRA_DOMAIN: 'envfile.atlassian.net',
      });
      mockGetJiraAuth.mockReturnValue({
        token: 'process-env-tok',
        email: 'processenv@x.com',
        domain: 'processenv.atlassian.net',
      });

      const result = await checkExistingJiraCredentials('/project');

      expect(result!.source).toBe('.env');
      expect(result!.credentials).toMatchObject({ token: 'env-file-tok' });
    });

    it('returns null when .env partial and no env vars', async () => {
      mockReadEnvFile.mockReturnValue('content');
      mockParseEnvFile.mockReturnValue({ JIRA_API_TOKEN: 'tok' }); // missing email, domain
      mockGetJiraAuth.mockReturnValue(null);

      const result = await checkExistingJiraCredentials('/project');
      expect(result).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // validateJiraConnection
  // ════════════════════════════════════════════════════════════════════════

  describe('validateJiraConnection', () => {
    it('returns success with displayName on 200 response', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ displayName: 'John Doe', name: 'jdoe' }),
        headers: new Headers(),
      } as Response);

      const creds = makeCredentials();
      const result = await validateJiraConnection(creds);

      expect(result.success).toBe(true);
      expect(result.username).toBe('John Doe');
    });

    it('returns success with name fallback when displayName is absent', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ name: 'jdoe' }),
        headers: new Headers(),
      } as Response);

      const result = await validateJiraConnection(makeCredentials());

      expect(result.success).toBe(true);
      expect(result.username).toBe('jdoe');
    });

    it('uses api/3 for cloud instance type', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ displayName: 'User' }),
        headers: new Headers(),
      } as Response);

      await validateJiraConnection(makeCredentials({ instanceType: 'cloud' }));

      expect(fetch).toHaveBeenCalledWith(
        'https://acme.atlassian.net/rest/api/3/myself',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );
    });

    it('uses api/2 for server instance type', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ displayName: 'User' }),
        headers: new Headers(),
      } as Response);

      await validateJiraConnection(makeCredentials({ instanceType: 'server', domain: 'jira.corp.com' }));

      expect(fetch).toHaveBeenCalledWith(
        'https://jira.corp.com/rest/api/2/myself',
        expect.any(Object),
      );
    });

    it('returns failure with message on 401 response', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
        headers: new Headers(),
      } as Response);

      const result = await validateJiraConnection(makeCredentials());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    it('returns failure with message on 403 response', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
        headers: new Headers(),
      } as Response);

      const result = await validateJiraConnection(makeCredentials());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access forbidden');
    });

    it('returns failure with message on 404 response', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
        headers: new Headers(),
      } as Response);

      const result = await validateJiraConnection(makeCredentials());

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns failure with HTTP status on other error codes', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
        headers: new Headers(),
      } as Response);

      const result = await validateJiraConnection(makeCredentials());

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('throws RateLimitError when rate limit detected', async () => {
      const rateLimitInfo = {
        limit: 100,
        remaining: 0,
        reset: new Date(Date.now() + 60000),
      };

      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(rateLimitInfo);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({}),
      } as Response);

      const result = await validateJiraConnection(makeCredentials());

      // The retryWithBackoff re-throws the error which is caught in validateJiraConnection
      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('handles network error gracefully', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await validateJiraConnection(makeCredentials());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('sends correct Basic auth header', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ displayName: 'Test' }),
        headers: new Headers(),
      } as Response);

      const creds = makeCredentials({ email: 'me@test.com', token: 'mytoken' });
      await validateJiraConnection(creds);

      const expectedAuth = Buffer.from('me@test.com:mytoken').toString('base64');
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedAuth}`,
          }),
        }),
      );
    });

    it('calls spinner.succeed on success', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ displayName: 'Joe' }),
        headers: new Headers(),
      } as Response);

      await validateJiraConnection(makeCredentials());

      expect(mockOraInstance.succeed).toHaveBeenCalledWith(expect.stringContaining('Joe'));
    });

    it('calls spinner.fail on failure', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());

      vi.mocked(fetch).mockRejectedValueOnce(new Error('fail'));

      await validateJiraConnection(makeCredentials());

      expect(mockOraInstance.fail).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // getJiraEnvVars
  // ════════════════════════════════════════════════════════════════════════

  describe('getJiraEnvVars', () => {
    it('returns only token and email (secrets)', () => {
      const creds = makeCredentials({ token: 'secret-tok', email: 'secret@x.com' });
      const vars = getJiraEnvVars(creds);

      expect(vars).toEqual([
        { key: 'JIRA_API_TOKEN', value: 'secret-tok' },
        { key: 'JIRA_EMAIL', value: 'secret@x.com' },
      ]);
    });

    it('does not include domain or instance type', () => {
      const vars = getJiraEnvVars(makeCredentials());
      const keys = vars.map(v => v.key);

      expect(keys).not.toContain('JIRA_DOMAIN');
      expect(keys).not.toContain('JIRA_INSTANCE_TYPE');
    });

    it('always returns exactly 2 entries', () => {
      const vars = getJiraEnvVars(makeCredentials({ strategy: 'board-based', projects: ['A', 'B'] }));
      expect(vars).toHaveLength(2);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // getJiraConfig
  // ════════════════════════════════════════════════════════════════════════

  describe('getJiraConfig', () => {
    it('returns base config with provider, domain, and instanceType', () => {
      const config = getJiraConfig(makeCredentials());

      expect(config.issueTracker.provider).toBe('jira');
      expect(config.issueTracker.domain).toBe('acme.atlassian.net');
      expect(config.issueTracker.instanceType).toBe('cloud');
    });

    it('includes strategy when specified', () => {
      const config = getJiraConfig(makeCredentials({ strategy: 'project-per-team' }));
      expect(config.issueTracker.strategy).toBe('project-per-team');
    });

    it('omits strategy when not specified', () => {
      const config = getJiraConfig(makeCredentials({ strategy: undefined }));
      expect(config.issueTracker.strategy).toBeUndefined();
    });

    // ── projectConfigs (v0.33.0+ 2-level structure) ──

    it('maps projectConfigs with boards to config.projects', () => {
      const creds = makeCredentials({
        projectConfigs: [
          {
            key: 'FE',
            name: 'Frontend',
            id: '10001',
            boards: [{ id: '1', name: 'Sprint Board' }],
          },
          {
            key: 'BE',
            name: 'Backend',
            id: '10002',
          },
        ],
      });

      const config = getJiraConfig(creds);

      expect(config.issueTracker.projects).toEqual([
        { key: 'FE', name: 'Frontend', id: '10001', boards: [{ id: '1', name: 'Sprint Board' }] },
        { key: 'BE', name: 'Backend', id: '10002', boards: undefined },
      ]);
    });

    it('returns early when projectConfigs is present (skips legacy paths)', () => {
      const creds = makeCredentials({
        projectConfigs: [{ key: 'X' }],
        strategy: 'project-per-team',
        projects: ['A', 'B'],
      });

      const config = getJiraConfig(creds);

      // Should have used projectConfigs path, not the legacy project-per-team path
      expect(config.issueTracker.projects).toEqual([{ key: 'X', name: undefined, id: undefined, boards: undefined }]);
    });

    // ── Legacy: project-per-team with string array ──

    it('maps legacy project-per-team string array', () => {
      const creds = makeCredentials({
        strategy: 'project-per-team',
        projects: ['ALPHA', 'BETA'],
      });

      const config = getJiraConfig(creds);
      expect(config.issueTracker.projects).toEqual([{ key: 'ALPHA' }, { key: 'BETA' }]);
    });

    // ── component-based strategy ──

    it('maps component-based strategy with project and components', () => {
      const creds = makeCredentials({
        strategy: 'component-based',
        project: 'MAIN',
        components: ['Frontend', 'Backend'],
      });

      const config = getJiraConfig(creds);

      expect(config.issueTracker.project).toBe('MAIN');
      expect(config.issueTracker.components).toEqual(['Frontend', 'Backend']);
    });

    it('handles component-based with missing project', () => {
      const creds = makeCredentials({
        strategy: 'component-based',
        components: ['UI'],
      });

      const config = getJiraConfig(creds);
      expect(config.issueTracker.project).toBeUndefined();
      expect(config.issueTracker.components).toEqual(['UI']);
    });

    // ── board-based strategy ──

    it('maps board-based strategy with project and boards', () => {
      const creds = makeCredentials({
        strategy: 'board-based',
        project: 'PROJ',
        boards: ['100', '200'],
      });

      const config = getJiraConfig(creds);

      expect(config.issueTracker.project).toBe('PROJ');
      expect(config.issueTracker.boards).toEqual([{ id: '100' }, { id: '200' }]);
    });

    it('handles board-based with missing boards array', () => {
      const creds = makeCredentials({
        strategy: 'board-based',
        project: 'PROJ',
      });

      const config = getJiraConfig(creds);
      expect(config.issueTracker.project).toBe('PROJ');
      expect(config.issueTracker.boards).toBeUndefined();
    });

    // ── server instance type ──

    it('handles server instance type', () => {
      const config = getJiraConfig(makeCredentials({ instanceType: 'server', domain: 'jira.corp.com' }));
      expect(config.issueTracker.instanceType).toBe('server');
      expect(config.issueTracker.domain).toBe('jira.corp.com');
    });

    // ── no strategy, no projects ──

    it('returns minimal config when no strategy or projects', () => {
      const config = getJiraConfig(makeCredentials());

      expect(config.issueTracker.projects).toBeUndefined();
      expect(config.issueTracker.project).toBeUndefined();
      expect(config.issueTracker.components).toBeUndefined();
      expect(config.issueTracker.boards).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // createJiraProjectFolders
  // ════════════════════════════════════════════════════════════════════════

  describe('createJiraProjectFolders', () => {
    const projectPath = '/test/project';
    const specsDir = path.join(projectPath, '.specweave', 'docs', 'internal', 'specs');

    beforeEach(() => {
      mockExistsSyncFn.mockReturnValue(false);
    });

    it('creates base specs directory if it does not exist', () => {
      const creds = makeCredentials({ projectConfigs: [{ key: 'APP' }] });
      createJiraProjectFolders(projectPath, creds);

      expect(mockMkdirSyncFn).toHaveBeenCalledWith(specsDir, { recursive: true });
    });

    it('skips creating base specs directory when it already exists', () => {
      mockExistsSyncFn.mockImplementation((p: string) => p === specsDir);

      const creds = makeCredentials({ projectConfigs: [{ key: 'APP' }] });
      createJiraProjectFolders(projectPath, creds);

      // First call is for specsDir check, should not re-create
      const specsDirCalls = mockMkdirSyncFn.mock.calls.filter(
        (c: any[]) => c[0] === specsDir,
      );
      expect(specsDirCalls).toHaveLength(0);
    });

    // ── projectConfigs (v0.33.0+) ──

    it('creates folders for each projectConfig', () => {
      const creds = makeCredentials({
        projectConfigs: [
          { key: 'FRONTEND', name: 'Frontend' },
          { key: 'BACKEND', name: 'Backend' },
        ],
      });

      createJiraProjectFolders(projectPath, creds);

      expect(mockMkdirSyncFn).toHaveBeenCalledWith(
        path.join(specsDir, 'frontend'),
        { recursive: true },
      );
      expect(mockMkdirSyncFn).toHaveBeenCalledWith(
        path.join(specsDir, 'backend'),
        { recursive: true },
      );
    });

    it('sanitizes project keys to lowercase and replaces non-alphanumeric chars', () => {
      const creds = makeCredentials({
        projectConfigs: [{ key: 'MY_PROJECT-123' }],
      });

      createJiraProjectFolders(projectPath, creds);

      expect(mockMkdirSyncFn).toHaveBeenCalledWith(
        path.join(specsDir, 'my-project-123'),
        { recursive: true },
      );
    });

    it('creates board subfolders under project when boards exist', () => {
      const creds = makeCredentials({
        projectConfigs: [{
          key: 'FE',
          boards: [
            { id: '1', name: 'Sprint Board' },
            { id: '2', name: 'Kanban Board' },
          ],
        }],
      });

      createJiraProjectFolders(projectPath, creds);

      expect(mockMkdirSyncFn).toHaveBeenCalledWith(
        path.join(specsDir, 'fe', 'sprint-board'),
        { recursive: true },
      );
      expect(mockMkdirSyncFn).toHaveBeenCalledWith(
        path.join(specsDir, 'fe', 'kanban-board'),
        { recursive: true },
      );
    });

    it('uses fallback board name when board.name is missing', () => {
      const creds = makeCredentials({
        projectConfigs: [{
          key: 'FE',
          boards: [{ id: '42' }],
        }],
      });

      createJiraProjectFolders(projectPath, creds);

      expect(mockMkdirSyncFn).toHaveBeenCalledWith(
        path.join(specsDir, 'fe', 'board-42'),
        { recursive: true },
      );
    });

    it('skips existing project directories', () => {
      mockExistsSyncFn.mockImplementation((p: string) => {
        return p === path.join(specsDir, 'fe');
      });

      const creds = makeCredentials({
        projectConfigs: [{ key: 'FE' }],
      });

      createJiraProjectFolders(projectPath, creds);

      // mkdirSync should still be called for specsDir, but NOT for 'fe'
      const feCalls = mockMkdirSyncFn.mock.calls.filter(
        (c: any[]) => c[0] === path.join(specsDir, 'fe'),
      );
      expect(feCalls).toHaveLength(0);
    });

    // ── Legacy string array ──

    it('creates folders from legacy projects string array', () => {
      const creds = makeCredentials({
        projects: ['ALPHA', 'BETA'],
      });

      createJiraProjectFolders(projectPath, creds);

      expect(mockMkdirSyncFn).toHaveBeenCalledWith(
        path.join(specsDir, 'alpha'),
        { recursive: true },
      );
      expect(mockMkdirSyncFn).toHaveBeenCalledWith(
        path.join(specsDir, 'beta'),
        { recursive: true },
      );
    });

    // ── Single project (backward compat) ──

    it('creates folder for single project (backward compatibility)', () => {
      const creds = makeCredentials({
        project: 'LEGACY',
      });

      createJiraProjectFolders(projectPath, creds);

      expect(mockMkdirSyncFn).toHaveBeenCalledWith(
        path.join(specsDir, 'legacy'),
        { recursive: true },
      );
    });

    // ── No projects at all ──

    it('only creates specs dir when no projects configured', () => {
      const creds = makeCredentials();
      createJiraProjectFolders(projectPath, creds);

      // specsDir creation + no project-specific dirs
      const projectDirCalls = mockMkdirSyncFn.mock.calls.filter(
        (c: any[]) => c[0] !== specsDir,
      );
      expect(projectDirCalls).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // showJiraSetupComplete
  // ════════════════════════════════════════════════════════════════════════

  describe('showJiraSetupComplete', () => {
    it('logs setup complete message', () => {
      showJiraSetupComplete('en');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('calls getLocaleManager with the provided language', () => {
      showJiraSetupComplete('en');
      expect(mockGetLocaleManager).toHaveBeenCalledWith('en');
    });

    it('does not throw for any supported language', () => {
      expect(() => showJiraSetupComplete('en')).not.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // showJiraSetupSkipped
  // ════════════════════════════════════════════════════════════════════════

  describe('showJiraSetupSkipped', () => {
    it('logs skip message', () => {
      showJiraSetupSkipped('en');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('calls getLocaleManager with the provided language', () => {
      showJiraSetupSkipped('en');
      expect(mockGetLocaleManager).toHaveBeenCalledWith('en');
    });

    it('does not throw for any supported language', () => {
      expect(() => showJiraSetupSkipped('en')).not.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // promptJiraCredentials
  // ════════════════════════════════════════════════════════════════════════

  describe('promptJiraCredentials', () => {
    it('returns null when user cancels at continue prompt', async () => {
      mockSelect.mockResolvedValueOnce('cloud'); // instance type
      mockConfirm.mockResolvedValueOnce(false);   // continue? -> no

      const result = await promptJiraCredentials('en');
      expect(result).toBeNull();
    });

    it('returns null when project count returns error', async () => {
      mockSelect.mockResolvedValueOnce('cloud');
      mockConfirm.mockResolvedValueOnce(true);
      mockInput.mockResolvedValueOnce('acme.atlassian.net'); // domain
      mockInput.mockResolvedValueOnce('user@test.com');       // email
      mockPassword.mockResolvedValueOnce('test-token');       // token
      mockGetProjectCount.mockResolvedValueOnce({ accessible: 0, error: 'Auth failed' });

      const result = await promptJiraCredentials('en');
      expect(result).toBeNull();
    });

    it('returns null when zero accessible projects', async () => {
      mockSelect.mockResolvedValueOnce('cloud');
      mockConfirm.mockResolvedValueOnce(true);
      mockInput.mockResolvedValueOnce('acme.atlassian.net');
      mockInput.mockResolvedValueOnce('user@test.com');
      mockPassword.mockResolvedValueOnce('test-token');
      mockGetProjectCount.mockResolvedValueOnce({ accessible: 0, error: null });

      const result = await promptJiraCredentials('en');
      expect(result).toBeNull();
    });

    it('handles single project mode and returns credentials', async () => {
      // Setup: cloud, continue, credentials
      mockSelect
        .mockResolvedValueOnce('cloud')   // instance type
        .mockResolvedValueOnce('single')  // single project mode
        .mockResolvedValueOnce('FE');     // select project

      mockConfirm.mockResolvedValueOnce(true); // continue setup

      mockInput
        .mockResolvedValueOnce('acme.atlassian.net')
        .mockResolvedValueOnce('user@test.com');

      mockPassword.mockResolvedValueOnce('test-token');

      // Project count
      mockGetProjectCount.mockResolvedValueOnce({ accessible: 2, error: null });

      // Loader returns projects
      mockFetchAllProjects.mockResolvedValueOnce({
        projects: [
          { key: 'FE', name: 'Frontend', id: '10001' },
          { key: 'BE', name: 'Backend', id: '10002' },
        ],
        failed: 0,
        canceled: false,
      });

      // fetchProjectBoards - mock global fetch for board fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: [] }),
      } as Response);

      const result = await promptJiraCredentials('en');

      expect(result).not.toBeNull();
      expect(result!.token).toBe('test-token');
      expect(result!.email).toBe('user@test.com');
      expect(result!.domain).toBe('acme.atlassian.net');
      expect(result!.instanceType).toBe('cloud');
      expect(result!.projects).toEqual(['FE']);
      expect(result!.projectConfigs).toHaveLength(1);
      expect(result!.projectConfigs![0].key).toBe('FE');
      expect(result!.projectConfigs![0].isDefault).toBe(true);
    });

    it('handles multi project mode and returns credentials', async () => {
      mockSelect
        .mockResolvedValueOnce('cloud')
        .mockResolvedValueOnce('multi');

      mockConfirm.mockResolvedValueOnce(true);

      mockInput
        .mockResolvedValueOnce('acme.atlassian.net')
        .mockResolvedValueOnce('user@test.com');

      mockPassword.mockResolvedValueOnce('test-token');

      mockGetProjectCount.mockResolvedValueOnce({ accessible: 3, error: null });

      mockFetchAllProjects.mockResolvedValueOnce({
        projects: [
          { key: 'FE', name: 'Frontend', id: '10001' },
          { key: 'BE', name: 'Backend', id: '10002' },
          { key: 'MOB', name: 'Mobile', id: '10003' },
        ],
        failed: 0,
        canceled: false,
      });

      // Multi-project checkbox selection
      mockCheckbox.mockResolvedValueOnce(['FE', 'BE']);

      // fetchProjectBoards for each selected project (2 calls)
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ values: [] }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ values: [] }) } as Response);

      const result = await promptJiraCredentials('en');

      expect(result).not.toBeNull();
      expect(result!.projects).toEqual(['FE', 'BE']);
      expect(result!.projectConfigs).toHaveLength(2);
      expect(result!.projectConfigs![0].isDefault).toBe(true);
      expect(result!.projectConfigs![1].isDefault).toBe(false);
    });

    it('handles server instance type selection', async () => {
      mockSelect
        .mockResolvedValueOnce('server')  // server instance
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('PROJ');

      mockConfirm.mockResolvedValueOnce(true);

      mockInput
        .mockResolvedValueOnce('jira.corp.com')
        .mockResolvedValueOnce('user@corp.com');

      mockPassword.mockResolvedValueOnce('pat-token');

      mockGetProjectCount.mockResolvedValueOnce({ accessible: 1, error: null });

      mockFetchAllProjects.mockResolvedValueOnce({
        projects: [{ key: 'PROJ', name: 'Project', id: '1' }],
        failed: 0,
        canceled: false,
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: [] }),
      } as Response);

      const result = await promptJiraCredentials('en');

      expect(result).not.toBeNull();
      expect(result!.instanceType).toBe('server');
      expect(result!.domain).toBe('jira.corp.com');
    });

    it('returns null when fetch projects throws an error', async () => {
      mockSelect.mockResolvedValueOnce('cloud');
      mockConfirm.mockResolvedValueOnce(true);
      mockInput
        .mockResolvedValueOnce('acme.atlassian.net')
        .mockResolvedValueOnce('user@test.com');
      mockPassword.mockResolvedValueOnce('test-token');

      mockGetProjectCount.mockRejectedValueOnce(new Error('Network error'));

      const result = await promptJiraCredentials('en');
      expect(result).toBeNull();
    });

    it('returns null when multi-project checkbox returns empty selection', async () => {
      mockSelect
        .mockResolvedValueOnce('cloud')
        .mockResolvedValueOnce('multi');

      mockConfirm.mockResolvedValueOnce(true);

      mockInput
        .mockResolvedValueOnce('acme.atlassian.net')
        .mockResolvedValueOnce('user@test.com');

      mockPassword.mockResolvedValueOnce('test-token');

      mockGetProjectCount.mockResolvedValueOnce({ accessible: 2, error: null });

      mockFetchAllProjects.mockResolvedValueOnce({
        projects: [
          { key: 'FE', name: 'Frontend', id: '10001' },
          { key: 'BE', name: 'Backend', id: '10002' },
        ],
        failed: 0,
        canceled: false,
      });

      mockCheckbox.mockResolvedValueOnce([]);

      const result = await promptJiraCredentials('en');
      expect(result).toBeNull();
    });

    it('caches multi-project config when projectRoot is provided', async () => {
      mockSelect
        .mockResolvedValueOnce('cloud')
        .mockResolvedValueOnce('multi');

      mockConfirm.mockResolvedValueOnce(true);

      mockInput
        .mockResolvedValueOnce('acme.atlassian.net')
        .mockResolvedValueOnce('user@test.com');

      mockPassword.mockResolvedValueOnce('test-token');

      mockGetProjectCount.mockResolvedValueOnce({ accessible: 1, error: null });

      mockFetchAllProjects.mockResolvedValueOnce({
        projects: [{ key: 'FE', name: 'Frontend', id: '10001' }],
        failed: 0,
        canceled: false,
      });

      mockCheckbox.mockResolvedValueOnce(['FE']);

      // Board fetch for FE
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: [] }),
      } as Response);

      await promptJiraCredentials('en', '/project-root');

      expect(MockCacheManager).toHaveBeenCalledWith('/project-root');
      expect(mockCacheSet).toHaveBeenCalledWith(
        'jira-config',
        expect.objectContaining({ domain: 'acme.atlassian.net' }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // fetchProjectBoards (tested indirectly through promptJiraCredentials)
  // ════════════════════════════════════════════════════════════════════════

  describe('fetchProjectBoards (indirect)', () => {
    /**
     * fetchProjectBoards is a private function. We test it indirectly via
     * the single-project path of promptJiraCredentials which calls it.
     */

    it('handles board API returning non-ok response gracefully', async () => {
      mockSelect
        .mockResolvedValueOnce('cloud')
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('FE');

      mockConfirm.mockResolvedValueOnce(true);
      mockInput
        .mockResolvedValueOnce('acme.atlassian.net')
        .mockResolvedValueOnce('user@test.com');
      mockPassword.mockResolvedValueOnce('test-token');

      mockGetProjectCount.mockResolvedValueOnce({ accessible: 1, error: null });
      mockFetchAllProjects.mockResolvedValueOnce({
        projects: [{ key: 'FE', name: 'Frontend', id: '10001' }],
        failed: 0,
        canceled: false,
      });

      // Board API returns non-ok (e.g., 404)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      // Should still succeed despite board fetch returning empty
      const result = await promptJiraCredentials('en');
      expect(result).not.toBeNull();
      expect(result!.projectConfigs![0].key).toBe('FE');
    });

    it('handles board API returning boards', async () => {
      mockSelect
        .mockResolvedValueOnce('cloud')
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('FE');

      mockConfirm.mockResolvedValueOnce(true);
      mockInput
        .mockResolvedValueOnce('acme.atlassian.net')
        .mockResolvedValueOnce('user@test.com');
      mockPassword.mockResolvedValueOnce('test-token');

      mockGetProjectCount.mockResolvedValueOnce({ accessible: 1, error: null });
      mockFetchAllProjects.mockResolvedValueOnce({
        projects: [{ key: 'FE', name: 'Frontend', id: '10001' }],
        failed: 0,
        canceled: false,
      });

      // Board API returns boards
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          values: [
            { id: 1, name: 'Sprint Board' },
            { id: 2, name: 'Kanban Board' },
          ],
        }),
      } as Response);

      const result = await promptJiraCredentials('en');

      // v0.35.3: boards are no longer included in projectConfigs
      // (simplification: boards are views not organizational units)
      expect(result).not.toBeNull();
      expect(result!.projectConfigs![0].key).toBe('FE');
    });

    it('sends correct auth and URL for board fetch', async () => {
      mockSelect
        .mockResolvedValueOnce('cloud')
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('FE');

      mockConfirm.mockResolvedValueOnce(true);
      mockInput
        .mockResolvedValueOnce('acme.atlassian.net')
        .mockResolvedValueOnce('user@test.com');
      mockPassword.mockResolvedValueOnce('my-token');

      mockGetProjectCount.mockResolvedValueOnce({ accessible: 1, error: null });
      mockFetchAllProjects.mockResolvedValueOnce({
        projects: [{ key: 'FE', name: 'Frontend', id: '10001' }],
        failed: 0,
        canceled: false,
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: [] }),
      } as Response);

      await promptJiraCredentials('en');

      // Board fetch should use agile API
      const expectedAuth = Buffer.from('user@test.com:my-token').toString('base64');
      expect(fetch).toHaveBeenCalledWith(
        'https://acme.atlassian.net/rest/agile/1.0/board?projectKeyOrId=FE',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedAuth}`,
          }),
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Edge cases and error handling
  // ════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('getJiraConfig handles empty projectConfigs array (returns early with empty projects)', () => {
      const creds = makeCredentials({ projectConfigs: [] });
      const config = getJiraConfig(creds);
      // Empty array is falsy for length check, falls through to legacy
      expect(config.issueTracker.projects).toBeUndefined();
    });

    it('getJiraConfig handles project-per-team with empty projects array', () => {
      const creds = makeCredentials({ strategy: 'project-per-team', projects: [] });
      const config = getJiraConfig(creds);
      // Empty projects array still maps
      expect(config.issueTracker.projects).toEqual([]);
    });

    it('createJiraProjectFolders handles empty projectConfigs array', () => {
      const creds = makeCredentials({ projectConfigs: [] });
      createJiraProjectFolders('/test', creds);

      // Should not create any project-specific dirs
      const projectDirCalls = mockMkdirSyncFn.mock.calls.filter(
        (c: any[]) => !c[0].endsWith('specs'),
      );
      expect(projectDirCalls).toHaveLength(0);
    });

    it('createJiraProjectFolders handles empty legacy projects array', () => {
      const creds = makeCredentials({ projects: [] });
      createJiraProjectFolders('/test', creds);

      // Should not create any project-specific dirs
      const projectDirCalls = mockMkdirSyncFn.mock.calls.filter(
        (c: any[]) => !c[0].endsWith('specs'),
      );
      expect(projectDirCalls).toHaveLength(0);
    });

    it('validateJiraConnection defaults maxRetries to 3', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ displayName: 'User' }),
        headers: new Headers(),
      } as Response);

      await validateJiraConnection(makeCredentials());

      expect(mockRetryWithBackoff).toHaveBeenCalledWith(expect.any(Function), 3);
    });

    it('validateJiraConnection accepts custom maxRetries', async () => {
      mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
      mockCheckRateLimit.mockReturnValue(null);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ displayName: 'User' }),
        headers: new Headers(),
      } as Response);

      await validateJiraConnection(makeCredentials(), 5);

      expect(mockRetryWithBackoff).toHaveBeenCalledWith(expect.any(Function), 5);
    });

    it('getJiraEnvVars handles empty token', () => {
      const vars = getJiraEnvVars(makeCredentials({ token: '' }));
      expect(vars[0]).toEqual({ key: 'JIRA_API_TOKEN', value: '' });
    });

    it('getJiraConfig with component-based but no components', () => {
      const creds = makeCredentials({
        strategy: 'component-based',
        project: 'MAIN',
      });

      const config = getJiraConfig(creds);
      expect(config.issueTracker.project).toBe('MAIN');
      expect(config.issueTracker.components).toBeUndefined();
    });

    it('checkExistingJiraCredentials passes projectPath to readEnvFile', async () => {
      mockReadEnvFile.mockReturnValue('');
      mockGetJiraAuth.mockReturnValue(null);

      await checkExistingJiraCredentials('/my/project');

      expect(mockReadEnvFile).toHaveBeenCalledWith('/my/project');
    });
  });
});
