/**
 * Unit tests for repository-setup.ts
 *
 * Tests the repository hosting setup wizard including:
 * - safeParseJsonResponse (HTML detection, JSON parsing)
 * - fetchAdoProjects (API calls, error handling)
 * - getRepoStrings (i18n string resolution)
 * - setupRepositoryHosting (main flow for CI and interactive modes)
 * - promptAdoProjectSelection (ADO credential flow)
 * - promptGitHubRepoSelection (GitHub credential flow)
 * - promptBitbucketRepoSelection (Bitbucket credential flow)
 * - promptMultiRepoPatternSelection (unified pattern selection)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// -------------------------------------------------------------------
// Hoisted mocks
// -------------------------------------------------------------------

const {
  mockSelect,
  mockInput,
  mockCheckbox,
  mockPassword,
  mockOraStart,
  mockOraSucceed,
  mockOraFail,
  mockParsePatternShortcut,
  mockValidateRegex,
  mockGetAzureDevOpsAuth,
  mockParseEnvFile,
  mockReadEnvFile,
  mockFetch,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInput: vi.fn(),
  mockCheckbox: vi.fn(),
  mockPassword: vi.fn(),
  mockOraStart: vi.fn(),
  mockOraSucceed: vi.fn(),
  mockOraFail: vi.fn(),
  mockParsePatternShortcut: vi.fn((input: string) => input),
  mockValidateRegex: vi.fn(() => true as true | string),
  mockGetAzureDevOpsAuth: vi.fn(),
  mockParseEnvFile: vi.fn(() => ({} as Record<string, string>)),
  mockReadEnvFile: vi.fn(() => ''),
  mockFetch: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
  checkbox: mockCheckbox,
  password: mockPassword,
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: mockOraStart.mockReturnThis(),
    succeed: mockOraSucceed.mockReturnThis(),
    fail: mockOraFail.mockReturnThis(),
  })),
}));

vi.mock('chalk', () => {
  const passThroughChalk = (str: string) => str;
  const handler: ProxyHandler<object> = {
    get: () => new Proxy(passThroughChalk, handler),
    apply: (_target, _thisArg, args: unknown[]) => String(args[0]),
  };
  return {
    default: new Proxy(passThroughChalk, handler),
  };
});

vi.mock('../../../../../src/cli/helpers/selection-strategy.js', () => ({
  parsePatternShortcut: mockParsePatternShortcut,
  validateRegex: mockValidateRegex,
}));


vi.mock('../../../../../src/utils/auth-helpers.js', () => ({
  getAzureDevOpsAuth: mockGetAzureDevOpsAuth,
}));

vi.mock('../../../../../src/utils/env-file.js', () => ({
  parseEnvFile: mockParseEnvFile,
  readEnvFile: mockReadEnvFile,
}));

// Mock global fetch
vi.stubGlobal('fetch', mockFetch);

import { setupRepositoryHosting } from '../../../../../src/cli/helpers/init/repository-setup.js';
import type { RepositorySetupOptions } from '../../../../../src/cli/helpers/init/repository-setup.js';

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function makeOptions(overrides?: Partial<RepositorySetupOptions>): RepositorySetupOptions {
  return {
    targetDir: '/tmp/test-project',
    isCI: false,
    gitHubRemote: null,
    language: 'en',
    ...overrides,
  };
}

// Suppress console.log during tests
let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  // Re-stub fetch after unstubAllGlobals in afterEach
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  consoleSpy.mockRestore();
  vi.unstubAllGlobals();
});

// ====================================================================
// Tests
// ====================================================================

describe('repository-setup', () => {
  // ----------------------------------------------------------------
  // CI mode tests
  // ----------------------------------------------------------------
  describe('setupRepositoryHosting - CI mode', () => {
    it('should auto-detect github-single when gitHubRemote is present in CI', async () => {
      const result = await setupRepositoryHosting(
        makeOptions({ isCI: true, gitHubRemote: { owner: 'org', repo: 'repo' } })
      );

      expect(result.hosting).toBe('github-single');
      expect(result.isMultiRepo).toBe(false);
      // No prompts should be called in CI mode
      expect(mockSelect).not.toHaveBeenCalled();
      expect(mockInput).not.toHaveBeenCalled();
    });

    it('should auto-detect local when no gitHubRemote in CI', async () => {
      const result = await setupRepositoryHosting(
        makeOptions({ isCI: true, gitHubRemote: null })
      );

      expect(result.hosting).toBe('local');
      expect(result.isMultiRepo).toBe(false);
    });

    it('should not prompt for URL format in CI mode', async () => {
      await setupRepositoryHosting(makeOptions({ isCI: true }));
      expect(mockSelect).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // Interactive mode - single repo
  // ----------------------------------------------------------------
  describe('setupRepositoryHosting - single repo', () => {
    it('should return github-single when user selects single + github', async () => {
      // Step 1: structure = single, Step 2: provider = github, Step 2b: url format = ssh
      mockSelect
        .mockResolvedValueOnce('single')    // structure
        .mockResolvedValueOnce('github')    // provider
        .mockResolvedValueOnce('ssh');      // url format

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.hosting).toBe('github-single');
      expect(result.isMultiRepo).toBe(false);
      expect(result.gitUrlFormat).toBe('ssh');
    });

    it('should return ado-single when user selects single + ado + https', async () => {
      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('https');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.hosting).toBe('ado-single');
      expect(result.isMultiRepo).toBe(false);
      expect(result.gitUrlFormat).toBe('https');
    });

    it('should return bitbucket-single for single + bitbucket', async () => {
      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('bitbucket')
        .mockResolvedValueOnce('ssh');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.hosting).toBe('bitbucket-single');
      expect(result.isMultiRepo).toBe(false);
    });

    it('should return local when user selects single + local', async () => {
      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('local');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.hosting).toBe('local');
      expect(result.isMultiRepo).toBe(false);
      // No URL format prompt for local
      expect(result.gitUrlFormat).toBeUndefined();
    });

    it('should return other-single when user selects single + other (no URL format)', async () => {
      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('other');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.hosting).toBe('other-single');
      expect(result.isMultiRepo).toBe(false);
      expect(result.gitUrlFormat).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // Interactive mode - multi-repo with GitHub
  // ----------------------------------------------------------------
  describe('setupRepositoryHosting - multi-repo GitHub', () => {
    it('should handle multi-repo GitHub with all repos strategy', async () => {
      // Step 1: structure = multirepo
      // Step 2: provider = github
      // Step 2b: url format = ssh
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('none')          // no umbrella
        // Step 3b: pattern strategy = all
        .mockResolvedValueOnce('all');

      // GitHub credential prompts
      mockInput.mockResolvedValueOnce('my-org');    // org
      mockPassword.mockResolvedValueOnce('ghp_token123'); // PAT

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.hosting).toBe('github-multirepo');
      expect(result.isMultiRepo).toBe(true);
      expect(result.githubRepoSelection).toEqual({ org: 'my-org', pat: 'ghp_token123' });
      expect(result.adoClonePattern).toBe('*');
      expect(result.adoClonePatternResult?.strategy).toBe('all');
    });

    it('should handle multi-repo GitHub with glob pattern', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('https')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('pattern-glob');

      mockInput
        .mockResolvedValueOnce('my-org')     // org
        .mockResolvedValueOnce('sw-*');      // pattern

      mockPassword.mockResolvedValueOnce('ghp_token');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockParsePatternShortcut.mockReturnValue('sw-*');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.hosting).toBe('github-multirepo');
      expect(result.adoClonePattern).toBe('sw-*');
      expect(result.adoClonePatternResult?.strategy).toBe('pattern-glob');
      expect(result.adoClonePatternResult?.pattern).toBe('sw-*');
    });

    it('should handle multi-repo GitHub with regex pattern', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('pattern-regex');

      mockInput
        .mockResolvedValueOnce('my-org')       // org
        .mockResolvedValueOnce('^sw-.*$');     // regex pattern

      mockPassword.mockResolvedValueOnce('ghp_token');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.adoClonePattern).toBe('regex:^sw-.*$');
      expect(result.adoClonePatternResult?.strategy).toBe('pattern-regex');
      expect(result.adoClonePatternResult?.isRegex).toBe(true);
    });

    it('should handle multi-repo GitHub with skip strategy', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('skip');

      mockInput.mockResolvedValueOnce('my-org');
      mockPassword.mockResolvedValueOnce('ghp_token');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.adoClonePattern).toBeUndefined();
      expect(result.adoClonePatternResult?.strategy).toBe('skip');
    });

    it('should read existing GitHub credentials from .env', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('all');

      mockReadEnvFile.mockReturnValue('GITHUB_ORG=env-org\nGITHUB_TOKEN=env-token');
      mockParseEnvFile.mockReturnValue({
        GITHUB_ORG: 'env-org',
        GITHUB_TOKEN: 'env-token',
      });

      // User accepts defaults from .env
      mockInput.mockResolvedValueOnce('env-org');
      mockPassword.mockResolvedValueOnce('env-token');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.githubRepoSelection).toEqual({ org: 'env-org', pat: 'env-token' });
    });

    it('should use gitHubRemote owner as default org', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('all');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      mockInput.mockResolvedValueOnce('detected-owner');
      mockPassword.mockResolvedValueOnce('ghp_abc');

      const result = await setupRepositoryHosting(
        makeOptions({ gitHubRemote: { owner: 'detected-owner', repo: 'my-repo' } })
      );

      expect(result.githubRepoSelection?.org).toBe('detected-owner');
    });
  });

  // ----------------------------------------------------------------
  // Interactive mode - multi-repo with ADO
  // ----------------------------------------------------------------
  describe('setupRepositoryHosting - multi-repo ADO', () => {
    it('should handle multi-repo ADO with project selection and all repos', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      // ADO project selection prompts
      mockInput.mockResolvedValueOnce('my-ado-org');
      mockPassword.mockResolvedValueOnce('ado-pat-123');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      // fetchAdoProjects mock
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        text: vi.fn().mockResolvedValue(
          JSON.stringify({ value: [{ name: 'Project1', id: '1' }, { name: 'Project2', id: '2' }] })
        ),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      // checkbox for project selection
      mockCheckbox.mockResolvedValueOnce(['Project1']);

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.hosting).toBe('ado-multirepo');
      expect(result.isMultiRepo).toBe(true);
      expect(result.adoProjectSelection).toEqual({
        org: 'my-ado-org',
        pat: 'ado-pat-123',
        projects: ['Project1'],
      });
      expect(result.adoClonePattern).toBe('*');
    });

    it('should handle ADO fetch failure gracefully', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      mockInput.mockResolvedValueOnce('bad-org');
      mockPassword.mockResolvedValueOnce('bad-pat');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      // fetchAdoProjects fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue('Unauthorized'),
      });

      const result = await setupRepositoryHosting(makeOptions());

      // ADO selection should be undefined since it failed
      expect(result.adoProjectSelection).toBeUndefined();
      expect(mockOraFail).toHaveBeenCalled();
    });

    it('should handle ADO HTML error page on non-OK response', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      mockInput.mockResolvedValueOnce('corp-org');
      mockPassword.mockResolvedValueOnce('expired-pat');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      // fetchAdoProjects returns HTML error page
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue('<!DOCTYPE html><html><body>SSO redirect</body></html>'),
      });

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.adoProjectSelection).toBeUndefined();
      expect(mockOraFail).toHaveBeenCalled();
    });

    it('should handle ADO with no projects found', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      mockInput.mockResolvedValueOnce('empty-org');
      mockPassword.mockResolvedValueOnce('valid-pat');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      // fetchAdoProjects returns empty
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({ value: [] })),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await setupRepositoryHosting(makeOptions());

      // No project selection since no projects found
      expect(result.adoProjectSelection).toBeUndefined();
      expect(mockCheckbox).not.toHaveBeenCalled();
    });

    it('should read existing ADO credentials from .env', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      mockReadEnvFile.mockReturnValue('AZURE_DEVOPS_ORG=env-ado-org\nAZURE_DEVOPS_PAT=env-ado-pat');
      mockParseEnvFile.mockReturnValue({
        AZURE_DEVOPS_ORG: 'env-ado-org',
        AZURE_DEVOPS_PAT: 'env-ado-pat',
      });
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      mockInput.mockResolvedValueOnce('env-ado-org');
      mockPassword.mockResolvedValueOnce('env-ado-pat');

      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({ value: [{ name: 'Proj1', id: '1' }] })),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      mockCheckbox.mockResolvedValueOnce(['Proj1']);

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.adoProjectSelection).toEqual({
        org: 'env-ado-org',
        pat: 'env-ado-pat',
        projects: ['Proj1'],
      });
    });

    it('should fall back to getAzureDevOpsAuth when .env has no creds', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockGetAzureDevOpsAuth.mockReturnValue({
        org: 'env-var-org',
        pat: 'env-var-pat',
        project: 'some-project',
      });

      mockInput.mockResolvedValueOnce('env-var-org');
      mockPassword.mockResolvedValueOnce('env-var-pat');

      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({ value: [{ name: 'P1', id: '1' }] })),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);
      mockCheckbox.mockResolvedValueOnce(['P1']);

      const result = await setupRepositoryHosting(makeOptions());

      expect(mockGetAzureDevOpsAuth).toHaveBeenCalled();
      expect(result.adoProjectSelection).toBeDefined();
    });

    it('should handle ADO HTML response on OK status (safeParseJsonResponse)', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      mockInput.mockResolvedValueOnce('proxy-org');
      mockPassword.mockResolvedValueOnce('some-pat');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      // 200 OK but response is HTML (proxy interception)
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('text/html'),
        },
        text: vi.fn().mockResolvedValue('<!DOCTYPE html><html><body>Proxy Error</body></html>'),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await setupRepositoryHosting(makeOptions());

      // Should fail gracefully because safeParseJsonResponse throws
      expect(result.adoProjectSelection).toBeUndefined();
      expect(mockOraFail).toHaveBeenCalled();
    });

    it('should handle ADO invalid JSON response (safeParseJsonResponse)', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      mockInput.mockResolvedValueOnce('some-org');
      mockPassword.mockResolvedValueOnce('some-pat');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      // 200 OK but response is garbled (not HTML, not JSON)
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        text: vi.fn().mockResolvedValue('this is not valid json {{{'),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.adoProjectSelection).toBeUndefined();
      expect(mockOraFail).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // Interactive mode - multi-repo with Bitbucket
  // ----------------------------------------------------------------
  describe('setupRepositoryHosting - multi-repo Bitbucket', () => {
    it('should handle multi-repo Bitbucket with credentials and all repos', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('bitbucket')
        .mockResolvedValueOnce('https')
        .mockResolvedValueOnce('all');

      // Bitbucket credential prompts
      mockInput
        .mockResolvedValueOnce('my-workspace')   // workspace
        .mockResolvedValueOnce('bb-user');        // username
      mockPassword.mockResolvedValueOnce('app-password-123');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.hosting).toBe('bitbucket-multirepo');
      expect(result.isMultiRepo).toBe(true);
      expect(result.bitbucketRepoSelection).toEqual({
        workspace: 'my-workspace',
        username: 'bb-user',
        appPassword: 'app-password-123',
      });
      expect(result.adoClonePattern).toBe('*');
    });

    it('should read existing Bitbucket credentials from .env', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('bitbucket')
        .mockResolvedValueOnce('https')
        .mockResolvedValueOnce('all');

      mockReadEnvFile.mockReturnValue('BITBUCKET_WORKSPACE=env-ws\nBITBUCKET_USERNAME=env-user');
      mockParseEnvFile.mockReturnValue({
        BITBUCKET_WORKSPACE: 'env-ws',
        BITBUCKET_USERNAME: 'env-user',
        BITBUCKET_APP_PASSWORD: 'env-app-pass',
      });

      mockInput
        .mockResolvedValueOnce('env-ws')
        .mockResolvedValueOnce('env-user');
      mockPassword.mockResolvedValueOnce('env-app-pass');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.bitbucketRepoSelection).toEqual({
        workspace: 'env-ws',
        username: 'env-user',
        appPassword: 'env-app-pass',
      });
    });

    it('should fall back to env vars for Bitbucket credentials', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('bitbucket')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      // Set env vars (fall back)
      const originalEnv = { ...process.env };
      process.env.BITBUCKET_WORKSPACE = 'env-var-ws';
      process.env.BITBUCKET_USERNAME = 'env-var-user';
      process.env.BITBUCKET_APP_PASSWORD = 'env-var-pass';

      mockInput
        .mockResolvedValueOnce('env-var-ws')
        .mockResolvedValueOnce('env-var-user');
      mockPassword.mockResolvedValueOnce('env-var-pass');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.bitbucketRepoSelection).toBeDefined();

      // Cleanup
      process.env = originalEnv;
    });
  });

  // ----------------------------------------------------------------
  // Multi-repo local/other (no pattern prompts)
  // ----------------------------------------------------------------
  describe('setupRepositoryHosting - multi-repo without pattern selection', () => {
    it('should skip pattern selection for local provider even if multirepo', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('local');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.hosting).toBe('local');
      expect(result.isMultiRepo).toBe(true);
      // No pattern prompts for local
      expect(result.adoClonePattern).toBeUndefined();
      expect(result.adoClonePatternResult).toBeUndefined();
    });

    it('should skip pattern selection for other provider when multirepo', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('other');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.hosting).toBe('other-multirepo');
      expect(result.isMultiRepo).toBe(true);
      expect(result.adoClonePattern).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // i18n / getRepoStrings tests
  // ----------------------------------------------------------------
  describe('getRepoStrings (via setupRepositoryHosting language parameter)', () => {
    it('should use English strings by default', async () => {
      const result = await setupRepositoryHosting(makeOptions({ isCI: true }));
      // Verify it ran without error (EN strings loaded)
      expect(result).toBeDefined();
    });

    it('should handle Russian language', async () => {
      const result = await setupRepositoryHosting(
        makeOptions({ isCI: true, language: 'ru' })
      );
      expect(result).toBeDefined();
    });

    it('should handle Spanish language', async () => {
      const result = await setupRepositoryHosting(
        makeOptions({ isCI: true, language: 'es' })
      );
      expect(result).toBeDefined();
    });

    it('should handle Chinese language', async () => {
      const result = await setupRepositoryHosting(
        makeOptions({ isCI: true, language: 'zh' })
      );
      expect(result).toBeDefined();
    });

    it('should handle German language', async () => {
      const result = await setupRepositoryHosting(
        makeOptions({ isCI: true, language: 'de' })
      );
      expect(result).toBeDefined();
    });

    it('should handle French language', async () => {
      const result = await setupRepositoryHosting(
        makeOptions({ isCI: true, language: 'fr' })
      );
      expect(result).toBeDefined();
    });

    it('should handle Japanese language', async () => {
      const result = await setupRepositoryHosting(
        makeOptions({ isCI: true, language: 'ja' })
      );
      expect(result).toBeDefined();
    });

    it('should handle Korean language', async () => {
      const result = await setupRepositoryHosting(
        makeOptions({ isCI: true, language: 'ko' })
      );
      expect(result).toBeDefined();
    });

    it('should handle Portuguese language', async () => {
      const result = await setupRepositoryHosting(
        makeOptions({ isCI: true, language: 'pt' })
      );
      expect(result).toBeDefined();
    });

    it('should fall back to English for undefined language', async () => {
      const result = await setupRepositoryHosting(
        makeOptions({ isCI: true, language: undefined })
      );
      expect(result).toBeDefined();
    });
  });

  // ----------------------------------------------------------------
  // ----------------------------------------------------------------
  // Umbrella repository selection
  // ----------------------------------------------------------------
  describe('umbrella repository selection', () => {
    it('should ask about umbrella repo and store selection when user picks one', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')    // repo structure
        .mockResolvedValueOnce('github')       // provider
        .mockResolvedValueOnce('https')        // url format
        .mockResolvedValueOnce('select')       // umbrella: select from GitHub
        .mockResolvedValueOnce('specweave-umb') // which repo is umbrella
        .mockResolvedValueOnce('all');          // nested repo pattern

      mockInput.mockResolvedValueOnce('test-org');
      mockPassword.mockResolvedValueOnce('ghp_token');

      // Mock fetch for umbrella repo selection (fetchGitHubReposForSelection uses global fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: async () => [
          { name: 'specweave-umb', owner: { login: 'test-org' }, archived: false, fork: false },
          { name: 'specweave', owner: { login: 'test-org' }, archived: false, fork: false },
          { name: 'vskill', owner: { login: 'test-org' }, archived: false, fork: false },
        ],
      });

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.umbrellaRepo).toBe('specweave-umb');
      expect(result.umbrellaSource).toBe('select');
      expect(result.adoClonePatternResult?.strategy).toBe('all');
    });

    it('should skip umbrella when user says no', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')    // repo structure
        .mockResolvedValueOnce('github')       // provider
        .mockResolvedValueOnce('https')        // url format
        .mockResolvedValueOnce('none')         // no umbrella repo
        .mockResolvedValueOnce('all');          // pattern

      mockInput.mockResolvedValueOnce('test-org');
      mockPassword.mockResolvedValueOnce('ghp_token');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.umbrellaRepo).toBeUndefined();
      expect(result.umbrellaSource).toBeUndefined();
      expect(result.adoClonePatternResult?.strategy).toBe('all');
    });

    it('should allow using current directory as umbrella via gitHubRemote', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')    // repo structure
        .mockResolvedValueOnce('github')       // provider
        .mockResolvedValueOnce('https')        // url format
        .mockResolvedValueOnce('current-dir')  // use current directory as umbrella
        .mockResolvedValueOnce('all');          // nested repo pattern

      mockInput.mockResolvedValueOnce('test-org');
      mockPassword.mockResolvedValueOnce('ghp_token');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      const result = await setupRepositoryHosting(makeOptions({
        gitHubRemote: { owner: 'test-org', repo: 'specweave-umb' },
      }));

      expect(result.umbrellaRepo).toBe('specweave-umb');
      expect(result.umbrellaSource).toBe('current-dir');
    });
  });

  // Pattern selection edge cases
  // ----------------------------------------------------------------
  describe('pattern selection edge cases', () => {
    it('should pass org name to skip guidance for GitHub', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('skip');

      mockInput.mockResolvedValueOnce('skip-test-org');
      mockPassword.mockResolvedValueOnce('ghp_token');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.adoClonePatternResult?.strategy).toBe('skip');
      // Verify console.log was called with path guidance containing org name
      const logCalls = consoleSpy.mock.calls.map(c => String(c[0]));
      const hasOrgGuidance = logCalls.some(
        msg => msg.includes('skip-test-org') || msg.includes('repositories/')
      );
      expect(hasOrgGuidance).toBe(true);
    });

    it('should handle manual strategy with checkbox repo selection', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('manual');

      mockInput.mockResolvedValueOnce('manual-test-org');
      mockPassword.mockResolvedValueOnce('ghp_token');

      // Mock fetchGitHubRepos response (used by manual selection)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: async () => [
          { name: 'repo-a', full_name: 'manual-test-org/repo-a', owner: { login: 'manual-test-org' }, archived: false, fork: false },
          { name: 'repo-b', full_name: 'manual-test-org/repo-b', owner: { login: 'manual-test-org' }, archived: false, fork: false },
          { name: 'repo-c', full_name: 'manual-test-org/repo-c', owner: { login: 'manual-test-org' }, archived: false, fork: false },
        ],
      });

      // User selects repo-a and repo-c from checkbox
      mockCheckbox.mockResolvedValueOnce(['repo-a', 'repo-c']);

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.adoClonePatternResult?.strategy).toBe('manual');
      expect(result.adoClonePatternResult?.selectedRepos).toEqual(['repo-a', 'repo-c']);
    });

    it('should use parsePatternShortcut for glob patterns', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('pattern-glob');

      mockInput
        .mockResolvedValueOnce('test-org')
        .mockResolvedValueOnce('starts: sw-');

      mockPassword.mockResolvedValueOnce('ghp_token');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockParsePatternShortcut.mockReturnValue('sw-*');

      const result = await setupRepositoryHosting(makeOptions());

      expect(mockParsePatternShortcut).toHaveBeenCalledWith('starts: sw-');
      expect(result.adoClonePatternResult?.pattern).toBe('sw-*');
    });

    it('should handle regex pattern with validateRegex', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('bitbucket')
        .mockResolvedValueOnce('https')
        .mockResolvedValueOnce('pattern-regex');

      mockInput
        .mockResolvedValueOnce('bb-workspace')
        .mockResolvedValueOnce('bb-user')
        .mockResolvedValueOnce('^api-.*$');

      mockPassword.mockResolvedValueOnce('bb-app-pass');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockValidateRegex.mockReturnValue(true);

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.adoClonePatternResult?.strategy).toBe('pattern-regex');
      expect(result.adoClonePatternResult?.pattern).toBe('^api-.*$');
      expect(result.adoClonePatternResult?.isRegex).toBe(true);
      expect(result.adoClonePattern).toBe('regex:^api-.*$');
    });
  });

  // ----------------------------------------------------------------
  // fetchAdoProjects edge cases (tested through setupRepositoryHosting)
  // ----------------------------------------------------------------
  describe('fetchAdoProjects edge cases', () => {
    it('should handle ADO response with missing value field', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      mockInput.mockResolvedValueOnce('org');
      mockPassword.mockResolvedValueOnce('pat');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      // Response with no 'value' field
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({})),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await setupRepositoryHosting(makeOptions());

      // Should be null because no projects found
      expect(result.adoProjectSelection).toBeUndefined();
    });

    it('should handle ADO fetch throwing network error', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      mockInput.mockResolvedValueOnce('org');
      mockPassword.mockResolvedValueOnce('pat');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.adoProjectSelection).toBeUndefined();
      expect(mockOraFail).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // SSH PAT message for GitHub
  // ----------------------------------------------------------------
  describe('GitHub SSH PAT context message', () => {
    it('should show SSH PAT context message when gitUrlFormat is ssh', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('all');

      mockInput.mockResolvedValueOnce('org-name');
      mockPassword.mockResolvedValueOnce('ghp_token');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      await setupRepositoryHosting(makeOptions());

      // PAT message hint for SSH should appear
      const logCalls = consoleSpy.mock.calls.map(c => String(c[0]));
      const hasPATHint = logCalls.some(msg => msg.includes('PAT is required to list repositories'));
      expect(hasPATHint).toBe(true);
    });

    it('should not show SSH PAT hint when gitUrlFormat is https', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('https')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('all');

      mockInput.mockResolvedValueOnce('org-name');
      mockPassword.mockResolvedValueOnce('ghp_token');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      await setupRepositoryHosting(makeOptions());

      const logCalls = consoleSpy.mock.calls.map(c => String(c[0]));
      const hasPATHint = logCalls.some(msg => msg.includes('PAT is required to list repositories'));
      expect(hasPATHint).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // GitHub env variable fallback
  // ----------------------------------------------------------------
  describe('GitHub env variable fallback', () => {
    it('should fall back to process.env for GitHub credentials', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('all');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      const originalEnv = { ...process.env };
      process.env.GITHUB_ORG = 'process-env-org';
      process.env.GITHUB_TOKEN = 'process-env-token';

      mockInput.mockResolvedValueOnce('process-env-org');
      mockPassword.mockResolvedValueOnce('process-env-token');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.githubRepoSelection).toBeDefined();

      process.env = originalEnv;
    });

    it('should prefer .env GITHUB_PAT over GITHUB_TOKEN', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('all');

      mockReadEnvFile.mockReturnValue('GITHUB_PAT=pat-value\nGITHUB_TOKEN=token-value');
      mockParseEnvFile.mockReturnValue({
        GITHUB_PAT: 'pat-value',
        GITHUB_TOKEN: 'token-value',
      });

      mockInput.mockResolvedValueOnce('org');
      mockPassword.mockResolvedValueOnce('pat-value');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.githubRepoSelection).toBeDefined();
    });
  });

  // ----------------------------------------------------------------
  // ADO combined .env + env var credentials
  // ----------------------------------------------------------------
  describe('ADO combined credential resolution', () => {
    it('should use .env org but fall back to env var pat', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      // .env has org but no pat
      mockReadEnvFile.mockReturnValue('AZURE_DEVOPS_ORG=env-org');
      mockParseEnvFile.mockReturnValue({ AZURE_DEVOPS_ORG: 'env-org' });
      // getAzureDevOpsAuth provides pat
      mockGetAzureDevOpsAuth.mockReturnValue({
        org: 'other-org',
        pat: 'auth-pat',
        project: 'proj',
      });

      mockInput.mockResolvedValueOnce('env-org');
      mockPassword.mockResolvedValueOnce('auth-pat');

      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({ value: [{ name: 'P', id: '1' }] })),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);
      mockCheckbox.mockResolvedValueOnce(['P']);

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.adoProjectSelection).toBeDefined();
    });
  });

  // ----------------------------------------------------------------
  // Return shape validation
  // ----------------------------------------------------------------
  describe('return value shape', () => {
    it('should always return hosting and isMultiRepo', async () => {
      const ciResult = await setupRepositoryHosting(makeOptions({ isCI: true }));
      expect(ciResult).toHaveProperty('hosting');
      expect(ciResult).toHaveProperty('isMultiRepo');
    });

    it('should include gitUrlFormat for non-local, non-other providers', async () => {
      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.gitUrlFormat).toBe('ssh');
    });

    it('should not include gitUrlFormat for local provider', async () => {
      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('local');

      const result = await setupRepositoryHosting(makeOptions());

      expect(result.gitUrlFormat).toBeUndefined();
    });

    it('should include all multi-repo fields when applicable', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('none')          // no umbrella
        .mockResolvedValueOnce('all');

      mockInput.mockResolvedValueOnce('org');
      mockPassword.mockResolvedValueOnce('pat');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});

      const result = await setupRepositoryHosting(makeOptions());

      expect(result).toHaveProperty('adoClonePattern');
      expect(result).toHaveProperty('adoClonePatternResult');
      expect(result).toHaveProperty('githubRepoSelection');
    });
  });

  // ----------------------------------------------------------------
  // ADO URL construction
  // ----------------------------------------------------------------
  describe('fetchAdoProjects URL construction', () => {
    it('should call Azure DevOps API with correct URL and auth', async () => {
      mockSelect
        .mockResolvedValueOnce('multirepo')
        .mockResolvedValueOnce('ado')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('all');

      mockInput.mockResolvedValueOnce('test-org');
      mockPassword.mockResolvedValueOnce('my-pat');

      mockReadEnvFile.mockReturnValue('');
      mockParseEnvFile.mockReturnValue({});
      mockGetAzureDevOpsAuth.mockReturnValue(null);

      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({ value: [{ name: 'P', id: '1' }] })),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);
      mockCheckbox.mockResolvedValueOnce(['P']);

      await setupRepositoryHosting(makeOptions());

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.azure.com/test-org/_apis/projects?api-version=7.0',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic '),
            'Accept': 'application/json',
          }),
        })
      );

      // Verify base64 auth encoding (:my-pat -> base64)
      const expectedAuth = Buffer.from(':my-pat').toString('base64');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Basic ${expectedAuth}`,
          }),
        })
      );
    });
  });
});
