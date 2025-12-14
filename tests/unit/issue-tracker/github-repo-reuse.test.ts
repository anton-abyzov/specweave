/**
 * Unit Tests for GitHub + GitHub Issues Optimization (v1.0.5)
 *
 * Tests the optimized flow when user selects:
 * 1. GitHub for repository hosting (init.ts)
 * 2. GitHub Issues for issue tracking (issue-tracker/index.ts)
 *
 * CRITICAL CHANGE (v1.0.5): We now pass GitHub credentials via parameters,
 * NOT by loading from config.json (which doesn't exist during init).
 *
 * Expected behavior:
 * - githubCredentialsFromRepoSetup parameter is passed from init.ts
 * - configureGitHubRepositories reuses org/pat from parameter
 * - promptGitHubSetupType skips duplicate prompts when repositoryHosting is set
 * - For multi-repo: RepoStructureManager handles parent selection
 * - For single-repo: use org directly
 *
 * @module tests/unit/issue-tracker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
  password: vi.fn()
}));

// Mock chalk - must return identity functions
vi.mock('chalk', () => {
  const identity = (x: string) => x;
  return {
    default: {
      cyan: Object.assign(identity, { bold: identity }),
      gray: identity,
      green: identity,
      yellow: identity,
      red: identity,
      white: identity
    }
  };
});

// Mock github-multi-repo module
vi.mock('../../../src/cli/helpers/issue-tracker/github-multi-repo.js', () => ({
  promptGitHubSetupType: vi.fn(),
  configureNoRepository: vi.fn(),
  configureSingleRepository: vi.fn(),
  configureMultipleRepositories: vi.fn(),
  configureMonorepo: vi.fn(),
  autoDetectRepositories: vi.fn()
}));

describe('GitHub + GitHub Issues Optimization (v1.0.5)', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));

    // Create .specweave directory
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('githubCredentialsFromRepoSetup parameter', () => {
    it('should reuse credentials from repository setup (single-repo)', async () => {
      // Mock promptGitHubSetupType to return single-repo profiles
      const { promptGitHubSetupType } = await import('../../../src/cli/helpers/issue-tracker/github-multi-repo.js');
      vi.mocked(promptGitHubSetupType).mockResolvedValue({
        setupType: 'single',
        profiles: [
          { id: '1', owner: 'myorg', repo: 'my-app', displayName: 'My App', isDefault: true }
        ]
      });

      // Import the module under test
      const githubModule = await import('../../../src/cli/helpers/issue-tracker/github.js');

      // Call with githubCredentialsFromRepoSetup
      const result = await githubModule.configureGitHubRepositories(
        tempDir,
        'en',
        undefined,  // No token param needed
        'github-single',
        { org: 'myorg', pat: 'ghp_test_token' }  // Passed from repo setup
      );

      expect(result.profiles).toBeDefined();
      expect(result.profiles.length).toBe(1);
      expect(result.profiles[0].owner).toBe('myorg');
      expect(result.profiles[0].isDefault).toBe(true);

      // Verify promptGitHubSetupType was called with the token
      expect(promptGitHubSetupType).toHaveBeenCalledWith(
        tempDir,
        'ghp_test_token',
        'github-single'
      );
    });

    it('should reuse credentials from repository setup (multi-repo)', async () => {
      // Mock promptGitHubSetupType to return multi-repo profiles
      const { promptGitHubSetupType } = await import('../../../src/cli/helpers/issue-tracker/github-multi-repo.js');
      vi.mocked(promptGitHubSetupType).mockResolvedValue({
        setupType: 'multiple',
        profiles: [
          { id: 'parent', owner: 'myorg', repo: 'parent-repo', displayName: 'Parent (umbrella)', isDefault: true },
          { id: 'frontend', owner: 'myorg', repo: 'frontend-app', displayName: 'Frontend', isDefault: false },
          { id: 'backend', owner: 'myorg', repo: 'backend-api', displayName: 'Backend', isDefault: false }
        ]
      });

      // Import the module under test
      const githubModule = await import('../../../src/cli/helpers/issue-tracker/github.js');

      // Call with githubCredentialsFromRepoSetup
      const result = await githubModule.configureGitHubRepositories(
        tempDir,
        'en',
        undefined,
        'github-multirepo',
        { org: 'myorg', pat: 'ghp_test_token' }
      );

      expect(result.profiles).toBeDefined();
      expect(result.profiles.length).toBe(3);

      // Verify parent repo is marked as default
      const parentProfile = result.profiles.find(p => p.isDefault);
      expect(parentProfile).toBeDefined();
      expect(parentProfile?.id).toBe('parent');
    });

    it('should fallback to org-based profile when promptGitHubSetupType returns no profiles', async () => {
      // Mock promptGitHubSetupType to return no profiles
      const { promptGitHubSetupType } = await import('../../../src/cli/helpers/issue-tracker/github-multi-repo.js');
      vi.mocked(promptGitHubSetupType).mockResolvedValue({
        setupType: 'single'
        // No profiles!
      });

      // Import the module under test
      const githubModule = await import('../../../src/cli/helpers/issue-tracker/github.js');

      // Call with githubCredentialsFromRepoSetup
      const result = await githubModule.configureGitHubRepositories(
        tempDir,
        'en',
        undefined,
        'github-single',
        { org: 'fallback-org', pat: 'ghp_test_token' }
      );

      // Should fall back to org-based profile
      expect(result.profiles).toBeDefined();
      expect(result.profiles.length).toBe(1);
      expect(result.profiles[0].owner).toBe('fallback-org');
      expect(result.profiles[0].repo).toBe('fallback-org');  // Fallback uses org as repo
      expect(result.profiles[0].isDefault).toBe(true);
    });

    it('should include monorepo projects from promptGitHubSetupType result', async () => {
      // Mock promptGitHubSetupType to return monorepo profiles with projects
      const { promptGitHubSetupType } = await import('../../../src/cli/helpers/issue-tracker/github-multi-repo.js');
      vi.mocked(promptGitHubSetupType).mockResolvedValue({
        setupType: 'monorepo',
        profiles: [
          { id: 'main', owner: 'myorg', repo: 'my-monorepo', displayName: 'Monorepo', isDefault: true }
        ],
        monorepoProjects: ['frontend', 'backend', 'shared']
      });

      // Import the module under test
      const githubModule = await import('../../../src/cli/helpers/issue-tracker/github.js');

      const result = await githubModule.configureGitHubRepositories(
        tempDir,
        'en',
        undefined,
        'github-single',
        { org: 'myorg', pat: 'ghp_test_token' }
      );

      expect(result.monorepoProjects).toBeDefined();
      expect(result.monorepoProjects).toEqual(['frontend', 'backend', 'shared']);
    });
  });

  describe('promptGitHubSetupType skipping duplicate prompts', () => {
    it('should pass repositoryHosting to promptGitHubSetupType to skip duplicate prompts', async () => {
      // Mock promptGitHubSetupType
      const { promptGitHubSetupType } = await import('../../../src/cli/helpers/issue-tracker/github-multi-repo.js');
      vi.mocked(promptGitHubSetupType).mockResolvedValue({
        setupType: 'single',
        profiles: [
          { id: '1', owner: 'myorg', repo: 'my-app', displayName: 'My App', isDefault: true }
        ]
      });

      // Import the module under test
      const githubModule = await import('../../../src/cli/helpers/issue-tracker/github.js');

      await githubModule.configureGitHubRepositories(
        tempDir,
        'en',
        undefined,
        'github-single',  // <-- This should be passed to promptGitHubSetupType
        { org: 'myorg', pat: 'ghp_test_token' }
      );

      // Verify repositoryHosting was passed (enables skipping duplicate prompts)
      expect(promptGitHubSetupType).toHaveBeenCalledWith(
        tempDir,
        'ghp_test_token',
        'github-single'  // <-- The key parameter that skips prompts!
      );
    });

    it('should pass github-multirepo to promptGitHubSetupType for multi-repo mode', async () => {
      // Mock promptGitHubSetupType
      const { promptGitHubSetupType } = await import('../../../src/cli/helpers/issue-tracker/github-multi-repo.js');
      vi.mocked(promptGitHubSetupType).mockResolvedValue({
        setupType: 'multiple',
        profiles: [
          { id: '1', owner: 'myorg', repo: 'parent-repo', displayName: 'Parent', isDefault: true }
        ]
      });

      // Import the module under test
      const githubModule = await import('../../../src/cli/helpers/issue-tracker/github.js');

      await githubModule.configureGitHubRepositories(
        tempDir,
        'en',
        undefined,
        'github-multirepo',  // <-- Multi-repo mode
        { org: 'myorg', pat: 'ghp_test_token' }
      );

      // Verify repositoryHosting was passed
      expect(promptGitHubSetupType).toHaveBeenCalledWith(
        tempDir,
        'ghp_test_token',
        'github-multirepo'  // <-- The key parameter that tells promptGitHubSetupType to skip architecture prompt
      );
    });
  });

  describe('Legacy flow (no githubCredentialsFromRepoSetup)', () => {
    it('should fall through to legacy flow when no credentials are passed', async () => {
      // Mock promptGitHubSetupType for legacy flow
      const { promptGitHubSetupType } = await import('../../../src/cli/helpers/issue-tracker/github-multi-repo.js');
      vi.mocked(promptGitHubSetupType).mockResolvedValue({
        setupType: 'single',
        profiles: [
          { id: '1', owner: 'legacy-org', repo: 'legacy-repo', displayName: 'Legacy', isDefault: true }
        ]
      });

      // Import the module under test
      const githubModule = await import('../../../src/cli/helpers/issue-tracker/github.js');

      // Call WITHOUT githubCredentialsFromRepoSetup (legacy flow)
      const result = await githubModule.configureGitHubRepositories(
        tempDir,
        'en',
        'ghp_legacy_token',  // Token passed directly
        'github-single'
        // No githubCredentialsFromRepoSetup!
      );

      expect(result.profiles).toBeDefined();
      expect(result.profiles[0].owner).toBe('legacy-org');

      // Verify promptGitHubSetupType was called (legacy flow)
      expect(promptGitHubSetupType).toHaveBeenCalled();
    });

    it('should skip GitHub setup for non-GitHub providers', async () => {
      // Mock promptGitHubSetupType to return 'none' for non-GitHub
      const { promptGitHubSetupType, configureNoRepository } = await import('../../../src/cli/helpers/issue-tracker/github-multi-repo.js');
      vi.mocked(promptGitHubSetupType).mockResolvedValue({
        setupType: 'none'
      });
      // Mock configureNoRepository to return empty profiles
      vi.mocked(configureNoRepository).mockResolvedValue([]);

      // Import the module under test
      const githubModule = await import('../../../src/cli/helpers/issue-tracker/github.js');

      // Call with non-GitHub repositoryHosting
      const result = await githubModule.configureGitHubRepositories(
        tempDir,
        'en',
        'token',
        'bitbucket-single'  // Not GitHub!
      );

      // Should return empty profiles (skipped)
      expect(result.profiles).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('should use pat from credentials over githubToken parameter', async () => {
      // Mock promptGitHubSetupType
      const { promptGitHubSetupType } = await import('../../../src/cli/helpers/issue-tracker/github-multi-repo.js');
      vi.mocked(promptGitHubSetupType).mockResolvedValue({
        setupType: 'single',
        profiles: [
          { id: '1', owner: 'myorg', repo: 'my-app', displayName: 'My App', isDefault: true }
        ]
      });

      // Import the module under test
      const githubModule = await import('../../../src/cli/helpers/issue-tracker/github.js');

      await githubModule.configureGitHubRepositories(
        tempDir,
        'en',
        'old_token_should_be_ignored',  // Old token
        'github-single',
        { org: 'myorg', pat: 'new_token_should_be_used' }  // New token from credentials
      );

      // Verify the new token was used (from credentials)
      expect(promptGitHubSetupType).toHaveBeenCalledWith(
        tempDir,
        'new_token_should_be_used',  // <-- New token used!
        'github-single'
      );
    });

    it('should handle empty org in credentials gracefully', async () => {
      // Mock promptGitHubSetupType to return no profiles (fallback case)
      const { promptGitHubSetupType } = await import('../../../src/cli/helpers/issue-tracker/github-multi-repo.js');
      vi.mocked(promptGitHubSetupType).mockResolvedValue({
        setupType: 'single'
        // No profiles
      });

      // Import the module under test
      const githubModule = await import('../../../src/cli/helpers/issue-tracker/github.js');

      const result = await githubModule.configureGitHubRepositories(
        tempDir,
        'en',
        undefined,
        'github-single',
        { org: '', pat: 'ghp_test_token' }  // Empty org
      );

      // Should fallback but with empty org (not ideal, but shouldn't crash)
      expect(result.profiles).toBeDefined();
      expect(result.profiles[0].owner).toBe('');
    });
  });
});
