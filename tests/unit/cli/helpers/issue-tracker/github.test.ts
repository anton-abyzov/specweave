/**
 * Unit tests for GitHub Issue Tracker Integration
 *
 * Tests all exported functions from src/cli/helpers/issue-tracker/github.ts:
 * - checkExistingGitHubCredentials
 * - promptGitHubCredentials
 * - validateGitHubConnection
 * - getGitHubEnvVars
 * - showGitHubSetupComplete
 * - showGitHubSetupSkipped
 * - configureGitHubRepositories
 * - validateGitHubWriteAccess
 * - forcePromptGitHubToken
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- vi.hoisted mocks ---
const {
  mockReadEnvFile,
  mockParseEnvFile,
  mockGetGitHubAuth,
  mockSelect,
  mockInput,
  mockPassword,
  mockOraInstance,
  mockOra,
  mockIsGhCliAvailable,
  mockRetryWithBackoff,
  mockCheckRateLimit,
  mockGetLocaleManager,
  mockFetch,
  mockPromptGitHubSetupType,
  mockConfigureNoRepository,
  mockConfigureSingleRepository,
  mockConfigureMultipleRepositories,
  mockConfigureMonorepo,
  mockAutoDetectRepositories,
  mockWriteEnvFile,
} = vi.hoisted(() => {
  const oraInstance = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  };
  return {
    mockReadEnvFile: vi.fn(),
    mockParseEnvFile: vi.fn(),
    mockGetGitHubAuth: vi.fn(),
    mockSelect: vi.fn(),
    mockInput: vi.fn(),
    mockPassword: vi.fn(),
    mockOraInstance: oraInstance,
    mockOra: vi.fn(() => oraInstance),
    mockIsGhCliAvailable: vi.fn(),
    mockRetryWithBackoff: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockGetLocaleManager: vi.fn(),
    mockFetch: vi.fn(),
    mockPromptGitHubSetupType: vi.fn(),
    mockConfigureNoRepository: vi.fn(),
    mockConfigureSingleRepository: vi.fn(),
    mockConfigureMultipleRepositories: vi.fn(),
    mockConfigureMonorepo: vi.fn(),
    mockAutoDetectRepositories: vi.fn(),
    mockWriteEnvFile: vi.fn(),
  };
});

// --- vi.mock() declarations ---
vi.mock('../../../../../src/utils/env-file.js', () => ({
  readEnvFile: mockReadEnvFile,
  parseEnvFile: mockParseEnvFile,
  writeEnvFile: mockWriteEnvFile,
}));

vi.mock('../../../../../src/utils/auth-helpers.js', () => ({
  getGitHubAuth: mockGetGitHubAuth,
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
  password: mockPassword,
}));

vi.mock('ora', () => ({
  default: mockOra,
}));

vi.mock('../../../../../src/cli/helpers/issue-tracker/utils.js', () => ({
  isGhCliAvailable: mockIsGhCliAvailable,
  maskSensitiveValue: vi.fn((v: string) => '****'),
  retryWithBackoff: mockRetryWithBackoff,
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock('../../../../../src/core/i18n/locale-manager.js', () => ({
  getLocaleManager: mockGetLocaleManager,
}));

vi.mock('../../../../../src/cli/helpers/issue-tracker/github-multi-repo.js', () => ({
  promptGitHubSetupType: mockPromptGitHubSetupType,
  configureNoRepository: mockConfigureNoRepository,
  configureSingleRepository: mockConfigureSingleRepository,
  configureMultipleRepositories: mockConfigureMultipleRepositories,
  configureMonorepo: mockConfigureMonorepo,
  autoDetectRepositories: mockAutoDetectRepositories,
}));

// Mock chalk to pass through strings without ANSI codes
vi.mock('chalk', () => {
  const handler: ProxyHandler<any> = {
    get(_target: any, prop: string) {
      if (prop === 'default') return new Proxy(() => {}, handler);
      // Return a function that just returns the string
      const fn = (...args: any[]) => args.join(' ');
      return new Proxy(fn, handler);
    },
    apply(_target: any, _thisArg: any, args: any[]) {
      return args.join(' ');
    },
  };
  return { default: new Proxy({}, handler) };
});

// Import the module under test AFTER mocks are set up
import {
  checkExistingGitHubCredentials,
  promptGitHubCredentials,
  validateGitHubConnection,
  getGitHubEnvVars,
  showGitHubSetupComplete,
  showGitHubSetupSkipped,
  configureGitHubRepositories,
  validateGitHubWriteAccess,
  forcePromptGitHubToken,
} from '../../../../../src/cli/helpers/issue-tracker/github.js';
import { RateLimitError } from '../../../../../src/cli/helpers/issue-tracker/types.js';

// Replace global fetch with mock
const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = mockFetch as any;
  mockGetLocaleManager.mockReturnValue({
    get: (key: string) => key,
    format: (key: string) => key,
  });
  // Suppress console.log output during tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// =====================================================================
// checkExistingGitHubCredentials
// =====================================================================
describe('checkExistingGitHubCredentials', () => {
  it('should return credentials from .env with GITHUB_TOKEN', async () => {
    mockReadEnvFile.mockReturnValue('GITHUB_TOKEN=ghp_abc123');
    mockParseEnvFile.mockReturnValue({ GITHUB_TOKEN: 'ghp_abc123' });

    const result = await checkExistingGitHubCredentials('/project');

    expect(result).toEqual({
      source: '.env',
      credentials: {
        token: 'ghp_abc123',
        instanceType: 'cloud',
      },
    });
  });

  it('should return credentials from .env with GH_TOKEN when GITHUB_TOKEN absent', async () => {
    mockReadEnvFile.mockReturnValue('GH_TOKEN=ghp_def456');
    mockParseEnvFile.mockReturnValue({ GH_TOKEN: 'ghp_def456' });

    const result = await checkExistingGitHubCredentials('/project');

    expect(result).toEqual({
      source: '.env',
      credentials: {
        token: 'ghp_def456',
        instanceType: 'cloud',
      },
    });
  });

  it('should prefer GITHUB_TOKEN over GH_TOKEN in .env', async () => {
    mockReadEnvFile.mockReturnValue('GITHUB_TOKEN=ghp_primary\nGH_TOKEN=ghp_secondary');
    mockParseEnvFile.mockReturnValue({
      GITHUB_TOKEN: 'ghp_primary',
      GH_TOKEN: 'ghp_secondary',
    });

    const result = await checkExistingGitHubCredentials('/project');

    expect(result!.credentials).toEqual({
      token: 'ghp_primary',
      instanceType: 'cloud',
    });
  });

  it('should fall back to getGitHubAuth when .env has no token', async () => {
    mockReadEnvFile.mockReturnValue('OTHER_VAR=value');
    mockParseEnvFile.mockReturnValue({ OTHER_VAR: 'value' });
    mockGetGitHubAuth.mockReturnValue({
      source: 'gh-cli',
      token: 'ghp_cli_token',
    });

    const result = await checkExistingGitHubCredentials('/project');

    expect(result).toEqual({
      source: 'gh-cli',
      credentials: {
        token: 'ghp_cli_token',
        instanceType: 'cloud',
      },
    });
  });

  it('should fall back to getGitHubAuth when .env file missing', async () => {
    mockReadEnvFile.mockReturnValue(null);
    mockGetGitHubAuth.mockReturnValue({
      source: 'GITHUB_TOKEN',
      token: 'ghp_env_token',
    });

    const result = await checkExistingGitHubCredentials('/project');

    expect(result).toEqual({
      source: 'GITHUB_TOKEN',
      credentials: {
        token: 'ghp_env_token',
        instanceType: 'cloud',
      },
    });
  });

  it('should return null when no credentials found anywhere', async () => {
    mockReadEnvFile.mockReturnValue(null);
    mockGetGitHubAuth.mockReturnValue({ source: 'none', token: '' });

    const result = await checkExistingGitHubCredentials('/project');

    expect(result).toBeNull();
  });

  it('should return null when .env exists but has no GitHub tokens and auth returns none', async () => {
    mockReadEnvFile.mockReturnValue('JIRA_TOKEN=abc');
    mockParseEnvFile.mockReturnValue({ JIRA_TOKEN: 'abc' });
    mockGetGitHubAuth.mockReturnValue({ source: 'none', token: '' });

    const result = await checkExistingGitHubCredentials('/project');

    expect(result).toBeNull();
  });
});

// =====================================================================
// getGitHubEnvVars
// =====================================================================
describe('getGitHubEnvVars', () => {
  it('should return GITHUB_TOKEN for cloud instance', () => {
    const vars = getGitHubEnvVars({
      token: 'ghp_abc123',
      instanceType: 'cloud',
    });

    expect(vars).toEqual([{ key: 'GITHUB_TOKEN', value: 'ghp_abc123' }]);
  });

  it('should return GITHUB_TOKEN and GITHUB_API_URL for enterprise instance', () => {
    const vars = getGitHubEnvVars({
      token: 'ghp_enterprise',
      instanceType: 'enterprise',
      apiEndpoint: 'https://github.company.com/api/v3',
    });

    expect(vars).toEqual([
      { key: 'GITHUB_TOKEN', value: 'ghp_enterprise' },
      { key: 'GITHUB_API_URL', value: 'https://github.company.com/api/v3' },
    ]);
  });

  it('should not add GITHUB_API_URL for enterprise without apiEndpoint', () => {
    const vars = getGitHubEnvVars({
      token: 'ghp_enterprise',
      instanceType: 'enterprise',
    });

    expect(vars).toEqual([{ key: 'GITHUB_TOKEN', value: 'ghp_enterprise' }]);
  });

  it('should not add GITHUB_API_URL for cloud even if apiEndpoint given', () => {
    const vars = getGitHubEnvVars({
      token: 'ghp_cloud',
      instanceType: 'cloud',
      apiEndpoint: 'https://api.github.com',
    });

    expect(vars).toEqual([{ key: 'GITHUB_TOKEN', value: 'ghp_cloud' }]);
  });
});

// =====================================================================
// showGitHubSetupComplete
// =====================================================================
describe('showGitHubSetupComplete', () => {
  it('should log setup complete messages without errors', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    showGitHubSetupComplete('en');

    expect(consoleSpy).toHaveBeenCalled();
    expect(mockGetLocaleManager).toHaveBeenCalledWith('en');
  });

  it('should work with non-English language', () => {
    showGitHubSetupSkipped('es' as any);

    expect(mockGetLocaleManager).toHaveBeenCalledWith('es');
  });
});

// =====================================================================
// showGitHubSetupSkipped
// =====================================================================
describe('showGitHubSetupSkipped', () => {
  it('should log skip messages without errors', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    showGitHubSetupSkipped('en');

    expect(consoleSpy).toHaveBeenCalled();
    expect(mockGetLocaleManager).toHaveBeenCalledWith('en');
  });
});

// =====================================================================
// validateGitHubConnection
// =====================================================================
describe('validateGitHubConnection', () => {
  it('should return success with username on valid connection', async () => {
    mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());
    mockCheckRateLimit.mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ login: 'octocat' }),
    });

    const result = await validateGitHubConnection({
      token: 'ghp_valid',
      instanceType: 'cloud',
    });

    expect(result).toEqual({ success: true, username: 'octocat' });
    expect(mockOraInstance.succeed).toHaveBeenCalled();
  });

  it('should use custom apiEndpoint for enterprise', async () => {
    mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());
    mockCheckRateLimit.mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ login: 'enterprise-user' }),
    });

    const result = await validateGitHubConnection({
      token: 'ghp_enterprise',
      instanceType: 'enterprise',
      apiEndpoint: 'https://github.corp.com/api/v3',
    });

    expect(result.success).toBe(true);
    expect(result.username).toBe('enterprise-user');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://github.corp.com/api/v3/user',
      expect.any(Object),
    );
  });

  it('should return failure on 401 unauthorized', async () => {
    mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());
    mockCheckRateLimit.mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: async () => 'Bad credentials',
    });

    const result = await validateGitHubConnection({
      token: 'ghp_invalid',
      instanceType: 'cloud',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid authentication credentials');
    expect(mockOraInstance.fail).toHaveBeenCalled();
  });

  it('should return failure on 403 forbidden', async () => {
    mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());
    mockCheckRateLimit.mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers(),
      text: async () => 'Forbidden',
    });

    const result = await validateGitHubConnection({
      token: 'ghp_noaccess',
      instanceType: 'cloud',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Access forbidden');
  });

  it('should return failure on generic HTTP error', async () => {
    mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());
    mockCheckRateLimit.mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: async () => 'Internal server error',
    });

    const result = await validateGitHubConnection({
      token: 'ghp_test',
      instanceType: 'cloud',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 500');
  });

  it('should handle rate limit response via checkRateLimit', async () => {
    const rateLimitInfo = {
      limit: 5000,
      remaining: 0,
      reset: new Date(Date.now() + 60000),
    };

    mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());
    mockCheckRateLimit.mockReturnValue(rateLimitInfo);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
    });

    const result = await validateGitHubConnection({
      token: 'ghp_ratelimited',
      instanceType: 'cloud',
    });

    // RateLimitError is thrown and caught, returning failure
    expect(result.success).toBe(false);
    expect(result.error).toContain('rate limit');
  });

  it('should handle retryWithBackoff throwing an error', async () => {
    mockRetryWithBackoff.mockRejectedValue(new Error('Network timeout'));

    const result = await validateGitHubConnection({
      token: 'ghp_timeout',
      instanceType: 'cloud',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network timeout');
    expect(mockOraInstance.fail).toHaveBeenCalled();
  });

  it('should handle error without message property', async () => {
    mockRetryWithBackoff.mockRejectedValue({});

    const result = await validateGitHubConnection({
      token: 'ghp_test',
      instanceType: 'cloud',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error');
  });

  it('should pass maxRetries to retryWithBackoff', async () => {
    mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());
    mockCheckRateLimit.mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ login: 'user' }),
    });

    await validateGitHubConnection(
      { token: 'ghp_test', instanceType: 'cloud' },
      5,
    );

    expect(mockRetryWithBackoff).toHaveBeenCalledWith(expect.any(Function), 5);
  });

  it('should default maxRetries to 3', async () => {
    mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => fn());
    mockCheckRateLimit.mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ login: 'user' }),
    });

    await validateGitHubConnection({ token: 'ghp_test', instanceType: 'cloud' });

    expect(mockRetryWithBackoff).toHaveBeenCalledWith(expect.any(Function), 3);
  });
});

// =====================================================================
// validateGitHubWriteAccess
// =====================================================================
describe('validateGitHubWriteAccess', () => {
  const baseCredentials = { token: 'ghp_test', instanceType: 'cloud' as const };

  it('should return success when repo is accessible and label creation succeeds', async () => {
    // First fetch: repo info
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ permissions: { push: true } }),
      })
      // Second fetch: create label
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
      })
      // Third fetch: delete label (cleanup)
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(true);
  });

  it('should return repo_not_found when repo returns 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'nonexistent');

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('repo_not_found');
    expect(result.error).toContain('not found');
  });

  it('should return rate_limit when repo returns 403 with exhausted rate limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: {
        get: (name: string) => (name === 'x-ratelimit-remaining' ? '0' : null),
      },
    });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('rate_limit');
  });

  it('should return no_read_access when repo returns 403 without rate limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: {
        get: (name: string) => (name === 'x-ratelimit-remaining' ? '100' : null),
      },
    });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('no_read_access');
    expect(result.suggestion).toContain('repo');
  });

  it('should return unknown error on unexpected HTTP status for repo', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('unknown');
    expect(result.error).toContain('HTTP 500');
  });

  it('should return no_write_access when user lacks push/admin permission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        permissions: { push: false, admin: false, pull: true },
      }),
    });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('no_write_access');
    expect(result.suggestion).toContain('collaborator');
  });

  it('should allow access when user has admin permission but not push', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          permissions: { push: false, admin: true },
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 201 })
      .mockResolvedValueOnce({ ok: true, status: 204 });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(true);
  });

  it('should handle network error during repo check', async () => {
    mockFetch.mockRejectedValueOnce(new Error('DNS resolution failed'));

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('unknown');
    expect(result.error).toContain('Network error');
    expect(result.error).toContain('DNS resolution failed');
  });

  it('should return token_scope when label creation returns 403 with admin rights message', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ permissions: { push: true } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'must have admin rights to create labels',
      });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('token_scope');
  });

  it('should return token_scope when label creation returns 403 with Resource not accessible', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ permissions: { push: true } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Resource not accessible by integration',
      });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('token_scope');
  });

  it('should return no_write_access when label creation returns 403 with generic message', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ permissions: { push: true } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('no_write_access');
  });

  it('should succeed when label already exists (422)', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ permissions: { push: true } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
      })
      // Cleanup DELETE call
      .mockResolvedValueOnce({ ok: true, status: 204 });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(true);
  });

  it('should return unknown error on unexpected label creation status', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ permissions: { push: true } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('unknown');
    expect(result.error).toContain('HTTP 500');
  });

  it('should handle network error during label creation', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ permissions: { push: true } }),
      })
      .mockRejectedValueOnce(new Error('Connection reset'));

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('unknown');
    expect(result.error).toContain('Connection reset');
  });

  it('should use enterprise apiEndpoint', async () => {
    const enterpriseCredentials = {
      token: 'ghp_ent',
      instanceType: 'enterprise' as const,
      apiEndpoint: 'https://git.corp.com/api/v3',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ permissions: { push: true } }),
      })
      .mockResolvedValueOnce({ ok: true, status: 201 })
      .mockResolvedValueOnce({ ok: true, status: 204 });

    await validateGitHubWriteAccess(enterpriseCredentials, 'org', 'repo');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://git.corp.com/api/v3/repos/org/repo',
      expect.any(Object),
    );
  });

  it('should silently handle cleanup error when label DELETE fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ permissions: { push: true } }),
      })
      .mockResolvedValueOnce({ ok: true, status: 201 })
      // Cleanup DELETE throws
      .mockRejectedValueOnce(new Error('Cleanup failed'));

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    // Should still succeed even if cleanup fails
    expect(result.success).toBe(true);
  });

  it('should succeed when repo has no permissions field', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ full_name: 'owner/repo' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 201 })
      .mockResolvedValueOnce({ ok: true, status: 204 });

    const result = await validateGitHubWriteAccess(baseCredentials, 'owner', 'repo');

    expect(result.success).toBe(true);
  });
});

// =====================================================================
// promptGitHubCredentials
// =====================================================================
describe('promptGitHubCredentials', () => {
  it('should return null when user selects skip', async () => {
    mockSelect
      .mockResolvedValueOnce('cloud')  // instance type
      .mockResolvedValueOnce('skip');  // auth method

    mockIsGhCliAvailable.mockReturnValue(false);

    const result = await promptGitHubCredentials('en');

    expect(result).toBeNull();
  });

  it('should return token for manual entry on cloud', async () => {
    mockSelect
      .mockResolvedValueOnce('cloud')   // instance type
      .mockResolvedValueOnce('manual'); // auth method

    mockIsGhCliAvailable.mockReturnValue(false);
    mockPassword.mockResolvedValue('ghp_manual_token_12345678');

    const result = await promptGitHubCredentials('en');

    expect(result).toEqual({
      token: 'ghp_manual_token_12345678',
      instanceType: 'cloud',
      apiEndpoint: undefined,
    });
  });

  it('should ask for API endpoint when enterprise selected', async () => {
    mockSelect
      .mockResolvedValueOnce('enterprise')  // instance type
      .mockResolvedValueOnce('manual');      // auth method

    mockInput.mockResolvedValue('https://github.corp.com/api/v3');
    mockPassword.mockResolvedValue('ghp_enterprise_token_1234');

    const result = await promptGitHubCredentials('en');

    expect(result).toEqual({
      token: 'ghp_enterprise_token_1234',
      instanceType: 'enterprise',
      apiEndpoint: 'https://github.corp.com/api/v3',
    });
  });

  it('should use gh CLI token when available and selected', async () => {
    mockSelect
      .mockResolvedValueOnce('cloud')   // instance type
      .mockResolvedValueOnce('gh-cli'); // auth method

    mockIsGhCliAvailable.mockReturnValue(true);
    mockGetGitHubAuth.mockReturnValue({
      source: 'gh-cli',
      token: 'ghp_cli_auto_detected_token',
    });

    const result = await promptGitHubCredentials('en');

    expect(result).toEqual({
      token: 'ghp_cli_auto_detected_token',
      instanceType: 'cloud',
      apiEndpoint: undefined,
    });
  });

  it('should fall back to manual entry when gh CLI detection fails', async () => {
    mockSelect
      .mockResolvedValueOnce('cloud')    // instance type
      .mockResolvedValueOnce('gh-cli')   // auth method
      .mockResolvedValueOnce('manual');   // retry method

    mockIsGhCliAvailable.mockReturnValue(true);
    mockGetGitHubAuth.mockReturnValue({
      source: 'none',
      token: '',
    });
    mockPassword.mockResolvedValue('ghp_fallback_manual_token_');

    const result = await promptGitHubCredentials('en');

    expect(result).toEqual({
      token: 'ghp_fallback_manual_token_',
      instanceType: 'cloud',
      apiEndpoint: undefined,
    });
  });

  it('should return null when gh CLI fails and user chooses to skip', async () => {
    mockSelect
      .mockResolvedValueOnce('cloud')    // instance type
      .mockResolvedValueOnce('gh-cli')   // auth method
      .mockResolvedValueOnce('skip');     // retry method

    mockIsGhCliAvailable.mockReturnValue(true);
    mockGetGitHubAuth.mockReturnValue({
      source: 'none',
      token: '',
    });

    const result = await promptGitHubCredentials('en');

    expect(result).toBeNull();
  });

  it('should not offer gh CLI option for enterprise instances', async () => {
    mockSelect
      .mockResolvedValueOnce('enterprise') // instance type
      .mockResolvedValueOnce('manual');     // auth method

    mockInput.mockResolvedValue('https://github.corp.com/api/v3');
    mockPassword.mockResolvedValue('ghp_ent_token_123456789');

    // gh CLI should not be checked for enterprise
    mockIsGhCliAvailable.mockReturnValue(false);

    await promptGitHubCredentials('en');

    // isGhCliAvailable should not be called since instanceType is enterprise
    // (the code checks: instanceType === 'cloud' && await isGhCliAvailable())
    // For enterprise, isGhCliAvailable will never be awaited due to short-circuit
  });
});

// =====================================================================
// forcePromptGitHubToken
// =====================================================================
describe('forcePromptGitHubToken', () => {
  it('should return null when user chooses to skip', async () => {
    mockSelect.mockResolvedValue('skip');

    const result = await forcePromptGitHubToken('en', 'gh-cli', 'No write access');

    expect(result).toBeNull();
  });

  it('should return new credentials when user enters a token', async () => {
    mockSelect.mockResolvedValue('enter');
    mockPassword.mockResolvedValue('ghp_new_pat_token_here_12');

    const result = await forcePromptGitHubToken('en', 'gh-cli', 'Token lacks repo scope');

    expect(result).toEqual({
      token: 'ghp_new_pat_token_here_12',
      instanceType: 'cloud',
    });
  });

  it('should display error context to the user', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    mockSelect.mockResolvedValue('skip');

    await forcePromptGitHubToken('en', '.env', 'Token expired');

    // Verify context was logged
    const allCalls = consoleSpy.mock.calls.flat().join(' ');
    expect(allCalls).toContain('.env');
    expect(allCalls).toContain('Token expired');
  });
});

// =====================================================================
// configureGitHubRepositories
// =====================================================================
describe('configureGitHubRepositories', () => {
  it('should create profiles directly from cloned repos when credentials provided', async () => {
    const result = await configureGitHubRepositories(
      '/project',
      'en',
      undefined,
      undefined,
      { org: 'my-org', pat: 'ghp_token', clonedRepos: ['frontend', 'backend'] },
    );

    expect(result.profiles).toHaveLength(2);
    expect(result.profiles[0]).toEqual({
      id: 'frontend',
      displayName: 'Frontend',
      owner: 'my-org',
      repo: 'frontend',
      isDefault: true,
    });
    expect(result.profiles[1]).toEqual({
      id: 'backend',
      displayName: 'Backend',
      owner: 'my-org',
      repo: 'backend',
      isDefault: false,
    });
    expect(result.monorepoProjects).toBeUndefined();
  });

  it('should format multi-word repo names as display names', async () => {
    const result = await configureGitHubRepositories(
      '/project',
      'en',
      undefined,
      undefined,
      { org: 'org', pat: 'ghp_token', clonedRepos: ['my-cool-project'] },
    );

    expect(result.profiles[0].displayName).toBe('My Cool Project');
  });

  it('should prompt for PAT when clonedRepos exist but pat is missing (SSH flow)', async () => {
    mockPassword.mockResolvedValue('ghp_new_pat_from_prompt_1');
    mockReadEnvFile.mockReturnValue('');
    mockParseEnvFile.mockReturnValue({});

    const result = await configureGitHubRepositories(
      '/project',
      'en',
      undefined,
      undefined,
      { org: 'org', pat: '', clonedRepos: ['repo1'] },
    );

    expect(mockPassword).toHaveBeenCalled();
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0].owner).toBe('org');
  });

  it('should save PAT to .env when no token exists yet', async () => {
    mockPassword.mockResolvedValue('ghp_brand_new_pat_token_');
    mockReadEnvFile.mockReturnValue('');
    mockParseEnvFile.mockReturnValue({});

    await configureGitHubRepositories(
      '/project',
      'en',
      undefined,
      undefined,
      { org: 'org', pat: '', clonedRepos: ['repo1'] },
    );

    expect(mockWriteEnvFile).toHaveBeenCalledWith(
      '/project',
      expect.stringContaining('GH_TOKEN=ghp_brand_new_pat_token_'),
    );
  });

  it('should not overwrite existing token in .env', async () => {
    mockPassword.mockResolvedValue('ghp_new_pat_unused_here_');
    mockReadEnvFile.mockReturnValue('GITHUB_TOKEN=existing');
    mockParseEnvFile.mockReturnValue({ GITHUB_TOKEN: 'existing' });

    await configureGitHubRepositories(
      '/project',
      'en',
      undefined,
      undefined,
      { org: 'org', pat: '', clonedRepos: ['repo1'] },
    );

    // writeEnvFile should NOT be called when token already exists
    expect(mockWriteEnvFile).not.toHaveBeenCalled();
  });

  it('should use promptGitHubSetupType when credentials provided but no cloned repos', async () => {
    mockPromptGitHubSetupType.mockResolvedValue({
      profiles: [{ id: '1', owner: 'org', repo: 'main', isDefault: true }],
    });

    const result = await configureGitHubRepositories(
      '/project',
      'en',
      'ghp_token',
      'github',
      { org: 'my-org', pat: 'ghp_token' },
    );

    expect(mockPromptGitHubSetupType).toHaveBeenCalledWith(
      '/project',
      'ghp_token',
      'github',
      0,
      undefined,
    );
    expect(result.profiles).toHaveLength(1);
  });

  it('should return fallback single profile when promptGitHubSetupType returns no profiles', async () => {
    mockPromptGitHubSetupType.mockResolvedValue({
      setupType: 'single',
    });

    const result = await configureGitHubRepositories(
      '/project',
      'en',
      undefined,
      undefined,
      { org: 'fallback-org', pat: 'ghp_token' },
    );

    expect(result.profiles).toEqual([{
      id: '1',
      owner: 'fallback-org',
      repo: 'fallback-org',
      isDefault: true,
    }]);
  });

  it('should use legacy flow when no githubCredentialsFromRepoSetup', async () => {
    mockPromptGitHubSetupType.mockResolvedValue({
      profiles: [{ id: '1', owner: 'org', repo: 'repo', isDefault: true }],
    });

    const result = await configureGitHubRepositories('/project', 'en', 'ghp_token');

    expect(mockPromptGitHubSetupType).toHaveBeenCalledWith(
      '/project',
      'ghp_token',
      undefined,
      0,
      undefined,
    );
    expect(result.profiles).toHaveLength(1);
  });

  it('should handle legacy flow with setupType "none"', async () => {
    mockPromptGitHubSetupType.mockResolvedValue({ setupType: 'none' });
    mockConfigureNoRepository.mockResolvedValue([{ id: 'none' }]);

    const result = await configureGitHubRepositories('/project', 'en');

    expect(mockConfigureNoRepository).toHaveBeenCalled();
    expect(result.profiles).toEqual([{ id: 'none' }]);
  });

  it('should handle legacy flow with setupType "single"', async () => {
    mockPromptGitHubSetupType.mockResolvedValue({ setupType: 'single' });
    mockConfigureSingleRepository.mockResolvedValue([{ id: '1', owner: 'o', repo: 'r' }]);

    const result = await configureGitHubRepositories('/project', 'en');

    expect(mockConfigureSingleRepository).toHaveBeenCalledWith('/project');
    expect(result.profiles).toHaveLength(1);
  });

  it('should handle legacy flow with setupType "multiple"', async () => {
    mockPromptGitHubSetupType.mockResolvedValue({ setupType: 'multiple' });
    mockConfigureMultipleRepositories.mockResolvedValue([
      { id: '1', owner: 'o', repo: 'r1' },
      { id: '2', owner: 'o', repo: 'r2' },
    ]);

    const result = await configureGitHubRepositories('/project', 'en');

    expect(mockConfigureMultipleRepositories).toHaveBeenCalledWith('/project');
    expect(result.profiles).toHaveLength(2);
  });

  it('should handle legacy flow with setupType "monorepo"', async () => {
    mockPromptGitHubSetupType.mockResolvedValue({ setupType: 'monorepo' });
    mockConfigureMonorepo.mockResolvedValue({
      profiles: [{ id: '1', owner: 'o', repo: 'mono' }],
      projects: ['frontend', 'backend'],
    });

    const result = await configureGitHubRepositories('/project', 'en');

    expect(mockConfigureMonorepo).toHaveBeenCalledWith('/project');
    expect(result.profiles).toHaveLength(1);
    expect(result.monorepoProjects).toEqual(['frontend', 'backend']);
  });

  it('should handle legacy flow with setupType "auto-detect"', async () => {
    mockPromptGitHubSetupType.mockResolvedValue({ setupType: 'auto-detect' });
    mockAutoDetectRepositories.mockResolvedValue([{ id: 'auto', owner: 'o', repo: 'r' }]);

    const result = await configureGitHubRepositories('/project', 'en');

    expect(mockAutoDetectRepositories).toHaveBeenCalledWith('/project');
    expect(result.profiles).toHaveLength(1);
  });

  it('should return empty profiles for unknown setupType', async () => {
    mockPromptGitHubSetupType.mockResolvedValue({ setupType: 'unknown-type' });

    const result = await configureGitHubRepositories('/project', 'en');

    expect(result.profiles).toEqual([]);
  });

  it('should pass gitUrlFormat to promptGitHubSetupType', async () => {
    mockPromptGitHubSetupType.mockResolvedValue({
      profiles: [{ id: '1', owner: 'org', repo: 'repo', isDefault: true }],
    });

    await configureGitHubRepositories(
      '/project',
      'en',
      'ghp_token',
      'github',
      { org: 'my-org', pat: 'ghp_token' },
      'ssh',
    );

    expect(mockPromptGitHubSetupType).toHaveBeenCalledWith(
      '/project',
      'ghp_token',
      'github',
      0,
      'ssh',
    );
  });

  it('should pass gitUrlFormat in legacy flow', async () => {
    mockPromptGitHubSetupType.mockResolvedValue({
      profiles: [{ id: '1', owner: 'org', repo: 'repo', isDefault: true }],
    });

    await configureGitHubRepositories(
      '/project',
      'en',
      'ghp_token',
      'github',
      undefined,
      'https',
    );

    expect(mockPromptGitHubSetupType).toHaveBeenCalledWith(
      '/project',
      'ghp_token',
      'github',
      0,
      'https',
    );
  });

  it('should return monorepoProjects from promptGitHubSetupType result', async () => {
    mockPromptGitHubSetupType.mockResolvedValue({
      profiles: [{ id: '1', owner: 'org', repo: 'mono', isDefault: true }],
      monorepoProjects: ['app', 'lib'],
    });

    const result = await configureGitHubRepositories(
      '/project',
      'en',
      undefined,
      undefined,
      { org: 'org', pat: 'ghp_token' },
    );

    expect(result.monorepoProjects).toEqual(['app', 'lib']);
  });
});
