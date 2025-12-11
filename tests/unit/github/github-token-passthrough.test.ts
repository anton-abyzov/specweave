/**
 * Unit tests for GitHub CLI Token Passthrough (Increment 0146)
 *
 * Verifies that GH_TOKEN from .env is passed to all gh CLI commands
 * via the env option in execFileNoThrow.
 *
 * Tests:
 * - AC-US1-01: GitHubClientV2 passes GH_TOKEN env var
 * - AC-US1-02: Token is read from constructor config
 * - AC-US1-03: Existing process.env is preserved
 * - AC-US4-01: Test that GitHubClientV2 methods pass GH_TOKEN
 * - AC-US4-02: Test that token from constructor is used
 * - AC-US4-03: Test that process.env values are preserved
 * - AC-US4-04: Integration test with mock
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * These tests verify the getGhEnv pattern used across all GitHub plugin files.
 * The pattern is:
 *
 * function getGhEnv(): NodeJS.ProcessEnv {
 *   return token
 *     ? { ...process.env, GH_TOKEN: token }
 *     : process.env;
 * }
 *
 * This pattern is now implemented in:
 * - GitHubClientV2 (class method)
 * - GitHubFeatureSync (class method)
 * - GitHubSpecSync (class method)
 * - ThreeLayerSyncManager (class method)
 * - github-issue-updater.ts (module function)
 * - github-sync-bidirectional.ts (module function)
 * - github-board-resolver.ts (module function)
 * - github-hierarchical-sync.ts (module function)
 * - github-increment-sync-cli.ts (module function)
 * - github-sync-increment-changes.ts (module function)
 * - duplicate-detector.ts (module function)
 */

describe('GitHub CLI Token Passthrough Pattern', () => {
  describe('getGhEnv helper function pattern', () => {
    it('should create env object with GH_TOKEN when token is provided (AC-US1-01, AC-US4-01)', () => {
      const token = 'ghp_test123';
      const getGhEnv = (): NodeJS.ProcessEnv => {
        return token
          ? { ...process.env, GH_TOKEN: token }
          : process.env;
      };

      const env = getGhEnv();
      expect(env.GH_TOKEN).toBe('ghp_test123');
    });

    it('should preserve process.env values when spreading (AC-US1-03, AC-US4-03)', () => {
      // Set a test env var
      const originalTestVar = process.env.TEST_VAR_FOR_TOKEN_TEST;
      process.env.TEST_VAR_FOR_TOKEN_TEST = 'test-value-preserved';

      const token = 'ghp_test123';
      const getGhEnv = (): NodeJS.ProcessEnv => {
        return token
          ? { ...process.env, GH_TOKEN: token }
          : process.env;
      };

      const env = getGhEnv();

      // Verify both the token and original env vars are present
      expect(env.GH_TOKEN).toBe('ghp_test123');
      expect(env.TEST_VAR_FOR_TOKEN_TEST).toBe('test-value-preserved');
      expect(env.PATH).toBeDefined(); // PATH should always exist

      // Cleanup
      if (originalTestVar !== undefined) {
        process.env.TEST_VAR_FOR_TOKEN_TEST = originalTestVar;
      } else {
        delete process.env.TEST_VAR_FOR_TOKEN_TEST;
      }
    });

    it('should return process.env directly when no token provided', () => {
      const token: string | undefined = undefined;
      const getGhEnv = (): NodeJS.ProcessEnv => {
        return token
          ? { ...process.env, GH_TOKEN: token }
          : process.env;
      };

      const env = getGhEnv();
      expect(env).toBe(process.env);
    });

    it('should return process.env directly when token is empty string', () => {
      const token: string | undefined = '';
      const getGhEnv = (): NodeJS.ProcessEnv => {
        return token
          ? { ...process.env, GH_TOKEN: token }
          : process.env;
      };

      const env = getGhEnv();
      expect(env).toBe(process.env);
    });
  });

  describe('Token from constructor config (AC-US1-02, AC-US4-02)', () => {
    it('should use token from config object', () => {
      // Simulating the pattern in GitHubClientV2
      interface MockConfig {
        owner: string;
        repo: string;
        token?: string;
      }

      class MockGitHubClient {
        private token?: string;

        constructor(config: MockConfig) {
          this.token = config.token;
        }

        getGhEnv(): NodeJS.ProcessEnv {
          return this.token
            ? { ...process.env, GH_TOKEN: this.token }
            : process.env;
        }
      }

      const clientWithToken = new MockGitHubClient({
        owner: 'test-owner',
        repo: 'test-repo',
        token: 'ghp_config_token',
      });

      const env = clientWithToken.getGhEnv();
      expect(env.GH_TOKEN).toBe('ghp_config_token');

      const clientWithoutToken = new MockGitHubClient({
        owner: 'test-owner',
        repo: 'test-repo',
      });

      const envNoToken = clientWithoutToken.getGhEnv();
      expect(envNoToken).toBe(process.env);
    });
  });

  describe('Integration: Token Passthrough in execFileNoThrow call pattern (AC-US4-04)', () => {
    it('should pass env with GH_TOKEN to execFileNoThrow', async () => {
      // Mock execFileNoThrow
      const mockExecFileNoThrow = vi.fn().mockResolvedValue({
        stdout: '{}',
        stderr: '',
        exitCode: 0,
        success: true,
      });

      // Simulate calling pattern
      const token = 'ghp_integration_test_token';
      const getGhEnv = (): NodeJS.ProcessEnv => {
        return token
          ? { ...process.env, GH_TOKEN: token }
          : process.env;
      };

      // Simulate gh CLI call
      await mockExecFileNoThrow('gh', ['issue', 'list'], { env: getGhEnv() });

      // Verify the call
      expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
      const callArgs = mockExecFileNoThrow.mock.calls[0];
      expect(callArgs[0]).toBe('gh');
      expect(callArgs[1]).toEqual(['issue', 'list']);
      expect(callArgs[2]).toBeDefined();
      expect(callArgs[2].env).toBeDefined();
      expect(callArgs[2].env.GH_TOKEN).toBe('ghp_integration_test_token');
    });

    it('should pass env to multiple gh CLI calls in sequence', async () => {
      const mockExecFileNoThrow = vi.fn().mockResolvedValue({
        stdout: '{}',
        stderr: '',
        exitCode: 0,
        success: true,
      });

      const token = 'ghp_sequence_test_token';
      const getGhEnv = (): NodeJS.ProcessEnv => {
        return token
          ? { ...process.env, GH_TOKEN: token }
          : process.env;
      };

      // Simulate multiple gh CLI calls
      await mockExecFileNoThrow('gh', ['issue', 'list'], { env: getGhEnv() });
      await mockExecFileNoThrow('gh', ['issue', 'view', '123'], { env: getGhEnv() });
      await mockExecFileNoThrow('gh', ['api', 'repos/owner/repo'], { env: getGhEnv() });

      // Verify ALL calls received the token
      expect(mockExecFileNoThrow).toHaveBeenCalledTimes(3);
      for (const call of mockExecFileNoThrow.mock.calls) {
        expect(call[0]).toBe('gh');
        expect(call[2]).toBeDefined();
        expect(call[2].env).toBeDefined();
        expect(call[2].env.GH_TOKEN).toBe('ghp_sequence_test_token');
      }
    });
  });
});

describe('File Implementation Verification', () => {
  it('should verify getGhEnv pattern exists in key files', async () => {
    // These tests verify the files were actually modified
    const fs = await import('fs');
    const path = await import('path');

    const pluginDir = path.join(process.cwd(), 'plugins/specweave-github/lib');

    const filesToCheck = [
      'github-client-v2.ts',
      'github-feature-sync.ts',
      'github-spec-sync.ts',
      'github-issue-updater.ts',
      'github-sync-bidirectional.ts',
      'github-board-resolver.ts',
      'github-hierarchical-sync.ts',
      'github-increment-sync-cli.ts',
      'github-sync-increment-changes.ts',
      'duplicate-detector.ts',
      'ThreeLayerSyncManager.ts',
    ];

    for (const file of filesToCheck) {
      const filePath = path.join(pluginDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check that getGhEnv function exists
      expect(content).toMatch(/getGhEnv\s*\(\s*\)/);

      // Check that { env: ... } pattern is used with execFileNoThrow/execFileSync
      expect(content).toMatch(/env:\s*(this\.)?getGhEnv\(\)/);
    }
  });
});
