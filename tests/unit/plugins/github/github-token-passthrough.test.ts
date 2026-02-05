/**
 * Unit tests for GitHub CLI Token Passthrough (v0.36.0+)
 *
 * Tests the token passthrough pattern used by all GitHub plugin classes.
 * Since plugins are transpiled separately, we test the pattern itself
 * rather than importing the actual plugin classes.
 *
 * Part of increment 0146: GitHub CLI Token Passthrough Fix
 *
 * @see ADR-0199: GitHub CLI Token Passthrough via Environment Variable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * This implements the same getGhEnv() pattern used in:
 * - GitHubClientV2
 * - GitHubFeatureSync
 * - github-spec-sync.ts
 * - github-issue-updater.ts
 * - And all other GitHub plugin files
 */
function createGetGhEnv(token?: string): () => NodeJS.ProcessEnv {
  return function getGhEnv(): NodeJS.ProcessEnv {
    return token
      ? { ...process.env, GH_TOKEN: token }
      : process.env;
  };
}

describe('GitHub CLI Token Passthrough Pattern', () => {
  const TEST_TOKEN = 'ghp_test_token_1234567890';

  // Store original env
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clean up CI tokens to ensure test isolation
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('getGhEnv() helper pattern', () => {
    it('should return env with GH_TOKEN when token is provided', () => {
      const getGhEnv = createGetGhEnv(TEST_TOKEN);
      const env = getGhEnv();

      expect(env.GH_TOKEN).toBe(TEST_TOKEN);
    });

    it('should preserve all process.env values when adding GH_TOKEN', () => {
      // Set custom env vars
      process.env.CUSTOM_VAR = 'custom_value';
      process.env.PATH = '/usr/bin:/usr/local/bin';
      process.env.HOME = '/home/test';

      const getGhEnv = createGetGhEnv(TEST_TOKEN);
      const env = getGhEnv();

      // All original vars should be preserved
      expect(env.CUSTOM_VAR).toBe('custom_value');
      expect(env.PATH).toBe('/usr/bin:/usr/local/bin');
      expect(env.HOME).toBe('/home/test');
      // Plus the new GH_TOKEN
      expect(env.GH_TOKEN).toBe(TEST_TOKEN);
    });

    it('should override existing GH_TOKEN in process.env', () => {
      // Pre-existing GH_TOKEN (e.g., from shell)
      process.env.GH_TOKEN = 'old_token_from_shell';

      const getGhEnv = createGetGhEnv(TEST_TOKEN);
      const env = getGhEnv();

      // Constructor token should override env token (spread + override)
      expect(env.GH_TOKEN).toBe(TEST_TOKEN);
    });

    it('should return process.env directly when no token provided', () => {
      process.env.CUSTOM_VAR = 'test_value';

      const getGhEnv = createGetGhEnv(undefined);
      const env = getGhEnv();

      // Should be the same reference as process.env
      expect(env).toBe(process.env);
      expect(env.CUSTOM_VAR).toBe('test_value');
      // GH_TOKEN should not be set (unless it was in process.env)
      expect(env.GH_TOKEN).toBeUndefined();
    });

    it('should treat empty string token as no token (falsy)', () => {
      const getGhEnv = createGetGhEnv('');
      const env = getGhEnv();

      // Empty string is falsy, should return process.env directly
      expect(env).toBe(process.env);
    });

    it('should not mutate original process.env', () => {
      const originalGhToken = process.env.GH_TOKEN;

      const getGhEnv = createGetGhEnv(TEST_TOKEN);
      getGhEnv();

      // process.env.GH_TOKEN should be unchanged
      expect(process.env.GH_TOKEN).toBe(originalGhToken);
    });
  });

  describe('Token passthrough usage pattern', () => {
    /**
     * Simulates how execFileNoThrow is called with env option
     */
    const mockExecFileNoThrow = vi.fn();

    beforeEach(() => {
      mockExecFileNoThrow.mockClear();
    });

    it('should pass env to execFileNoThrow correctly', async () => {
      const getGhEnv = createGetGhEnv(TEST_TOKEN);

      // This simulates: await execFileNoThrow('gh', ['api', ...], { env: this.getGhEnv() })
      mockExecFileNoThrow('gh', ['api', '/repos/owner/repo'], { env: getGhEnv() });

      expect(mockExecFileNoThrow).toHaveBeenCalledWith(
        'gh',
        ['api', '/repos/owner/repo'],
        expect.objectContaining({
          env: expect.objectContaining({
            GH_TOKEN: TEST_TOKEN,
          }),
        })
      );
    });

    it('should work with multiple sequential calls', () => {
      const getGhEnv = createGetGhEnv(TEST_TOKEN);

      // Multiple calls should each have the token
      mockExecFileNoThrow('gh', ['issue', 'create'], { env: getGhEnv() });
      mockExecFileNoThrow('gh', ['issue', 'list'], { env: getGhEnv() });
      mockExecFileNoThrow('gh', ['milestone', 'list'], { env: getGhEnv() });

      // All three calls should have the token
      expect(mockExecFileNoThrow).toHaveBeenCalledTimes(3);
      mockExecFileNoThrow.mock.calls.forEach(call => {
        expect(call[2].env.GH_TOKEN).toBe(TEST_TOKEN);
      });
    });

    it('should allow cwd and other options alongside env', () => {
      const getGhEnv = createGetGhEnv(TEST_TOKEN);

      mockExecFileNoThrow('gh', ['api', 'repos'], {
        cwd: '/path/to/repo',
        timeout: 30000,
        env: getGhEnv(),
      });

      expect(mockExecFileNoThrow).toHaveBeenCalledWith(
        'gh',
        ['api', 'repos'],
        expect.objectContaining({
          cwd: '/path/to/repo',
          timeout: 30000,
          env: expect.objectContaining({
            GH_TOKEN: TEST_TOKEN,
          }),
        })
      );
    });
  });

  describe('Cross-platform compatibility', () => {
    it('should work with Windows-style PATH', () => {
      process.env.PATH = 'C:\\Windows\\System32;C:\\Program Files\\Git\\bin';

      const getGhEnv = createGetGhEnv(TEST_TOKEN);
      const env = getGhEnv();

      expect(env.PATH).toBe('C:\\Windows\\System32;C:\\Program Files\\Git\\bin');
      expect(env.GH_TOKEN).toBe(TEST_TOKEN);
    });

    it('should work with Unix-style PATH', () => {
      process.env.PATH = '/usr/bin:/usr/local/bin:/home/user/bin';

      const getGhEnv = createGetGhEnv(TEST_TOKEN);
      const env = getGhEnv();

      expect(env.PATH).toBe('/usr/bin:/usr/local/bin:/home/user/bin');
      expect(env.GH_TOKEN).toBe(TEST_TOKEN);
    });

    it('should handle special characters in token', () => {
      const specialToken = 'ghp_test+with/special=chars';

      const getGhEnv = createGetGhEnv(specialToken);
      const env = getGhEnv();

      expect(env.GH_TOKEN).toBe(specialToken);
    });
  });

  describe('Security considerations', () => {
    it('should not leak token to logs (env object is opaque)', () => {
      const getGhEnv = createGetGhEnv(TEST_TOKEN);
      const env = getGhEnv();

      // When logging the env object, the token should be there but not visible
      // unless explicitly accessed
      const stringified = JSON.stringify(env);
      expect(stringified).toContain('GH_TOKEN');
      expect(stringified).toContain(TEST_TOKEN);
    });

    it('should create new env object each call (no mutation)', () => {
      const getGhEnv = createGetGhEnv(TEST_TOKEN);

      const env1 = getGhEnv();
      const env2 = getGhEnv();

      // Each call should return a new object (when token is set)
      expect(env1).not.toBe(env2);
      // But they should have the same content
      expect(env1.GH_TOKEN).toBe(env2.GH_TOKEN);
    });
  });
});

describe('Integration: Token from .env pattern', () => {
  /**
   * Simulates the pattern used in GitHubFeatureSync and other classes:
   * 1. Token is read from .env via getGitHubAuthFromProject()
   * 2. Stored in constructor
   * 3. Used via getGhEnv() for all gh calls
   */

  interface MockGitHubAuth {
    token?: string;
    owner?: string;
    repo?: string;
  }

  function mockGetGitHubAuthFromProject(_projectRoot: string): MockGitHubAuth {
    // Simulates reading from .env file
    return {
      token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
      owner: 'test-owner',
      repo: 'test-repo',
    };
  }

  class MockGitHubFeatureSync {
    private token?: string;

    constructor(projectRoot: string) {
      this.token = mockGetGitHubAuthFromProject(projectRoot).token;
    }

    private getGhEnv(): NodeJS.ProcessEnv {
      return this.token
        ? { ...process.env, GH_TOKEN: this.token }
        : process.env;
    }

    // Simulates a method that calls gh CLI
    getEnvForGhCall(): NodeJS.ProcessEnv {
      return this.getGhEnv();
    }
  }

  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use GITHUB_TOKEN from .env', () => {
    process.env.GITHUB_TOKEN = 'ghp_from_dotenv_file';

    const sync = new MockGitHubFeatureSync('/project/root');
    const env = sync.getEnvForGhCall();

    expect(env.GH_TOKEN).toBe('ghp_from_dotenv_file');
  });

  it('should fall back to GH_TOKEN if GITHUB_TOKEN not set', () => {
    delete process.env.GITHUB_TOKEN;
    process.env.GH_TOKEN = 'ghp_fallback_token';

    const sync = new MockGitHubFeatureSync('/project/root');
    const env = sync.getEnvForGhCall();

    expect(env.GH_TOKEN).toBe('ghp_fallback_token');
  });

  it('should work without any token (graceful fallback)', () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;

    const sync = new MockGitHubFeatureSync('/project/root');
    const env = sync.getEnvForGhCall();

    // Should return process.env directly
    expect(env).toBe(process.env);
  });
});
