/**
 * Unit tests for cli/helpers/issue-tracker/github-multi-repo.ts
 *
 * Tests multi-repository GitHub integration including:
 * - promptGitHubSetupType with various repositoryHosting values
 * - Recursion depth protection (Issue #5 fix)
 * - RepoStructureManager integration paths (success, partial failure, full failure)
 * - configureSingleRepository with detected and manual entry
 * - configureMultipleRepositories
 * - configureMonorepo
 * - autoDetectRepositories with recursion protection
 * - configureNoRepository
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------
// Hoisted mocks (ESM-compatible)
// ---------------------------------------------------------------

const {
  mockDetectGitHubRemotes,
  mockDetectPrimaryGitHubRemote,
  mockHasMultipleGitHubRemotes,
  mockGetUniqueRepositories,
  mockSelect,
  mockInput,
  mockConfirm,
  mockNumber,
  mockOraStart,
  mockOraFail,
  mockOraSucceed,
  mockGetLocaleManager,
  mockGetGitHubAuth,
  mockPromptStructure,
  mockCreateRepositories,
  mockInitializeLocalRepos,
  mockCreateSpecWeaveStructure,
  MockRepoStructureManager,
} = vi.hoisted(() => {
  const _mockPromptStructure = vi.fn();
  const _mockCreateRepositories = vi.fn();
  const _mockInitializeLocalRepos = vi.fn();
  const _mockCreateSpecWeaveStructure = vi.fn();

  class _MockRepoStructureManager {
    promptStructure = _mockPromptStructure;
    createRepositories = _mockCreateRepositories;
    initializeLocalRepos = _mockInitializeLocalRepos;
    createSpecWeaveStructure = _mockCreateSpecWeaveStructure;
  }

  return {
    mockDetectGitHubRemotes: vi.fn(),
    mockDetectPrimaryGitHubRemote: vi.fn(),
    mockHasMultipleGitHubRemotes: vi.fn(),
    mockGetUniqueRepositories: vi.fn(),
    mockSelect: vi.fn(),
    mockInput: vi.fn(),
    mockConfirm: vi.fn(),
    mockNumber: vi.fn(),
    mockOraStart: vi.fn(),
    mockOraFail: vi.fn(),
    mockOraSucceed: vi.fn(),
    mockGetLocaleManager: vi.fn(),
    mockGetGitHubAuth: vi.fn(),
    mockPromptStructure: _mockPromptStructure,
    mockCreateRepositories: _mockCreateRepositories,
    mockInitializeLocalRepos: _mockInitializeLocalRepos,
    mockCreateSpecWeaveStructure: _mockCreateSpecWeaveStructure,
    MockRepoStructureManager: _MockRepoStructureManager,
  };
});

vi.mock('../../../../../src/utils/git-detector.js', () => ({
  detectGitHubRemotes: mockDetectGitHubRemotes,
  detectPrimaryGitHubRemote: mockDetectPrimaryGitHubRemote,
  hasMultipleGitHubRemotes: mockHasMultipleGitHubRemotes,
  formatGitRemote: vi.fn((r: any) => `${r.owner}/${r.repo}`),
  getUniqueRepositories: mockGetUniqueRepositories,
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
  confirm: mockConfirm,
  number: mockNumber,
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: mockOraStart.mockReturnThis(),
    fail: mockOraFail.mockReturnThis(),
    succeed: mockOraSucceed.mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  })),
}));

vi.mock('chalk', () => {
  const identity = (s: string) => s;
  const chainable: any = new Proxy(identity, {
    get: () => chainable,
    apply: (_target: any, _thisArg: any, args: any[]) => args[0],
  });
  return { default: chainable };
});

vi.mock('../../../../../src/core/i18n/locale-manager.js', () => ({
  getLocaleManager: mockGetLocaleManager,
}));

vi.mock('../../../../../src/utils/auth-helpers.js', () => ({
  getGitHubAuth: mockGetGitHubAuth,
}));

vi.mock('../../../../../src/core/repo-structure/repo-structure-manager.js', () => ({
  RepoStructureManager: MockRepoStructureManager,
}));

// ---------------------------------------------------------------
// Import module under test AFTER mocks are registered
// ---------------------------------------------------------------

import {
  promptGitHubSetupType,
  configureNoRepository,
  configureSingleRepository,
  configureMultipleRepositories,
  configureMonorepo,
  autoDetectRepositories,
} from '../../../../../src/cli/helpers/issue-tracker/github-multi-repo.js';

import type {
  GitHubSetupType,
  GitHubProfile,
  GitHubConfiguration,
  GitHubSetupResult,
} from '../../../../../src/cli/helpers/issue-tracker/github-multi-repo.js';

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/** Suppress console output during tests */
let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.clearAllMocks();
});

afterEach(() => {
  consoleSpy.mockRestore();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe('github-multi-repo', () => {
  // =============================================================
  // promptGitHubSetupType
  // =============================================================
  describe('promptGitHubSetupType', () => {
    describe('recursion depth guard (Issue #5)', () => {
      it('should return single setup when max recursion depth reached', async () => {
        const result = await promptGitHubSetupType(undefined, undefined, undefined, 3);
        expect(result).toEqual({ setupType: 'single' });
      });

      it('should return single setup when recursion depth exceeds max', async () => {
        const result = await promptGitHubSetupType(undefined, undefined, undefined, 5);
        expect(result).toEqual({ setupType: 'single' });
      });

      it('should NOT trigger guard at depth 0', async () => {
        // Legacy prompt fallback (no projectPath/token, no repositoryHosting)
        mockSelect.mockResolvedValueOnce('none');
        const result = await promptGitHubSetupType();
        expect(result).toEqual({ setupType: 'none' });
      });
    });

    describe('repositoryHosting mapping (pre-selected architecture)', () => {
      it('should map github-single to single architecture via RepoStructureManager', async () => {
        const config = {
          architecture: 'single' as const,
          repositories: [
            { id: 'main', name: 'my-repo', owner: 'myorg', description: 'Main', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
          monorepoProjects: undefined,
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockResolvedValueOnce(undefined);
        mockCreateSpecWeaveStructure.mockResolvedValueOnce(undefined);

        const result = await promptGitHubSetupType('/project', 'ghp_token', 'github-single');
        expect(result.setupType).toBe('single');
        expect(result.profiles).toHaveLength(1);
        expect(result.profiles![0].owner).toBe('myorg');
        expect(result.profiles![0].isDefault).toBe(true);
      });

      it('should map github to single architecture', async () => {
        const config = {
          architecture: 'single' as const,
          repositories: [
            { id: 'main', name: 'app', owner: 'org', description: 'App', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockResolvedValueOnce(undefined);
        mockCreateSpecWeaveStructure.mockResolvedValueOnce(undefined);

        const result = await promptGitHubSetupType('/project', 'ghp_token', 'github');
        expect(result.setupType).toBe('single');
      });

      it('should map github-multirepo to github-parent architecture', async () => {
        const config = {
          architecture: 'multi-repo' as const,
          repositories: [
            { id: 'frontend', name: 'fe', owner: 'org', description: 'FE', createOnGitHub: false },
            { id: 'backend', name: 'be', owner: 'org', description: 'BE', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockResolvedValueOnce(undefined);
        mockCreateSpecWeaveStructure.mockResolvedValueOnce(undefined);

        const result = await promptGitHubSetupType('/project', 'ghp_token', 'github-multirepo');
        expect(result.setupType).toBe('multiple');
        expect(result.profiles).toHaveLength(2);
        expect(result.profiles![0].isDefault).toBe(true);
        expect(result.profiles![1].isDefault).toBe(false);
      });

      it('should fall through to legacy prompt for unknown repositoryHosting without preSelectedArchitecture', async () => {
        // e.g., repositoryHosting = 'bitbucket' -> preSelectedArchitecture stays undefined
        // No projectPath/token -> skip RepoStructureManager
        // repositoryHosting set but preSelectedArchitecture is undefined -> skip direct return
        // Falls to legacy select prompt
        mockSelect.mockResolvedValueOnce('single');
        const result = await promptGitHubSetupType(undefined, undefined, 'bitbucket');
        expect(result).toEqual({ setupType: 'single' });
      });
    });

    describe('RepoStructureManager integration', () => {
      it('should handle repositories needing creation on GitHub', async () => {
        const config = {
          architecture: 'single' as const,
          repositories: [
            { id: 'main', name: 'new-repo', owner: 'org', description: 'New', createOnGitHub: true },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockCreateRepositories.mockResolvedValueOnce(undefined);
        mockInitializeLocalRepos.mockResolvedValueOnce(undefined);
        mockCreateSpecWeaveStructure.mockResolvedValueOnce(undefined);

        const result = await promptGitHubSetupType('/project', 'ghp_token');
        expect(mockCreateRepositories).toHaveBeenCalledWith(config);
        expect(result.setupType).toBe('single');
      });

      it('should continue when repository creation fails (non-fatal)', async () => {
        const config = {
          architecture: 'single' as const,
          repositories: [
            { id: 'main', name: 'new-repo', owner: 'org', description: 'New', createOnGitHub: true },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockCreateRepositories.mockRejectedValueOnce(new Error('API rate limit'));
        mockInitializeLocalRepos.mockResolvedValueOnce(undefined);
        mockCreateSpecWeaveStructure.mockResolvedValueOnce(undefined);

        const result = await promptGitHubSetupType('/project', 'ghp_token');
        expect(result.setupType).toBe('single');
        expect(result.profiles).toHaveLength(1);
      });

      it('should skip repo creation when no repo needs creation', async () => {
        const config = {
          architecture: 'single' as const,
          repositories: [
            { id: 'main', name: 'existing', owner: 'org', description: 'Existing', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockResolvedValueOnce(undefined);
        mockCreateSpecWeaveStructure.mockResolvedValueOnce(undefined);

        await promptGitHubSetupType('/project', 'ghp_token');
        expect(mockCreateRepositories).not.toHaveBeenCalled();
      });

      it('should fall back when promptStructure throws and repositoryHosting=github-single', async () => {
        mockPromptStructure.mockRejectedValueOnce(new Error('network error'));

        const result = await promptGitHubSetupType('/project', 'ghp_token', 'github-single');
        expect(result).toEqual({ setupType: 'single' });
      });

      it('should fall back when promptStructure throws and repositoryHosting=github-multirepo', async () => {
        mockPromptStructure.mockRejectedValueOnce(new Error('network error'));

        const result = await promptGitHubSetupType('/project', 'ghp_token', 'github-multirepo');
        expect(result).toEqual({ setupType: 'multiple' });
      });

      it('should fall back to none when promptStructure throws with unknown repositoryHosting', async () => {
        mockPromptStructure.mockRejectedValueOnce(new Error('fail'));
        // repositoryHosting is set but preSelectedArchitecture is undefined (non-github hosting)
        // However, repositoryHosting is truthy so it enters the "if repositoryHosting" block
        // But preSelectedArchitecture is undefined, so it returns { setupType: 'none' }
        const result = await promptGitHubSetupType('/project', 'ghp_token', 'local');
        expect(result).toEqual({ setupType: 'none' });
      });

      it('should fall back to legacy prompt when promptStructure throws and no repositoryHosting', async () => {
        mockPromptStructure.mockRejectedValueOnce(new Error('fail'));
        // config becomes null, no repositoryHosting -> falls to legacy select
        mockSelect.mockResolvedValueOnce('monorepo');

        const result = await promptGitHubSetupType('/project', 'ghp_token');
        expect(result).toEqual({ setupType: 'monorepo' });
      });

      it('should handle initializeLocalRepos failure with repositoryHosting=github-single', async () => {
        const config = {
          architecture: 'single' as const,
          repositories: [
            { id: 'main', name: 'repo', owner: 'org', description: 'Repo', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockRejectedValueOnce(new Error('permission denied'));

        const result = await promptGitHubSetupType('/project', 'ghp_token', 'github-single');
        expect(result).toEqual({ setupType: 'single' });
      });

      it('should handle initializeLocalRepos failure with repositoryHosting=github-multirepo', async () => {
        const config = {
          architecture: 'multi-repo' as const,
          repositories: [
            { id: 'fe', name: 'fe', owner: 'org', description: 'FE', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockRejectedValueOnce(new Error('fail'));

        const result = await promptGitHubSetupType('/project', 'ghp_token', 'github-multirepo');
        expect(result).toEqual({ setupType: 'multiple' });
      });

      it('should handle initializeLocalRepos failure and fall to legacy prompt without repositoryHosting', async () => {
        const config = {
          architecture: 'single' as const,
          repositories: [
            { id: 'main', name: 'repo', owner: 'org', description: 'Repo', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockRejectedValueOnce(new Error('fail'));
        mockSelect.mockResolvedValueOnce('none');

        const result = await promptGitHubSetupType('/project', 'ghp_token');
        expect(result).toEqual({ setupType: 'none' });
      });

      it('should handle createSpecWeaveStructure failure gracefully (non-fatal)', async () => {
        const config = {
          architecture: 'single' as const,
          repositories: [
            { id: 'main', name: 'repo', owner: 'org', description: 'Repo', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockResolvedValueOnce(undefined);
        mockCreateSpecWeaveStructure.mockRejectedValueOnce(new Error('disk full'));

        const result = await promptGitHubSetupType('/project', 'ghp_token');
        // Should still succeed - createSpecWeaveStructure failure is non-fatal
        expect(result.setupType).toBe('single');
        expect(result.profiles).toHaveLength(1);
      });

      it('should map monorepo architecture and include monorepoProjects', async () => {
        const config = {
          architecture: 'monorepo' as const,
          repositories: [
            { id: 'mono', name: 'monorepo', owner: 'org', description: 'Mono', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
          monorepoProjects: ['frontend', 'backend', 'shared'],
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockResolvedValueOnce(undefined);
        mockCreateSpecWeaveStructure.mockResolvedValueOnce(undefined);

        const result = await promptGitHubSetupType('/project', 'ghp_token');
        expect(result.setupType).toBe('monorepo');
        expect(result.monorepoProjects).toEqual(['frontend', 'backend', 'shared']);
      });

      it('should use repository description as displayName when available', async () => {
        const config = {
          architecture: 'single' as const,
          repositories: [
            { id: 'main', name: 'repo', owner: 'org', description: 'My Amazing App', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockResolvedValueOnce(undefined);
        mockCreateSpecWeaveStructure.mockResolvedValueOnce(undefined);

        const result = await promptGitHubSetupType('/project', 'ghp_token');
        expect(result.profiles![0].displayName).toBe('My Amazing App');
      });

      it('should fall back to repo name when description is empty', async () => {
        const config = {
          architecture: 'single' as const,
          repositories: [
            { id: 'main', name: 'repo', owner: 'org', description: '', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockResolvedValueOnce(undefined);
        mockCreateSpecWeaveStructure.mockResolvedValueOnce(undefined);

        const result = await promptGitHubSetupType('/project', 'ghp_token');
        expect(result.profiles![0].displayName).toBe('repo');
      });
    });

    describe('without projectPath/githubToken (legacy prompt)', () => {
      it('should show legacy select prompt and return selected setup type', async () => {
        mockSelect.mockResolvedValueOnce('multiple');
        const result = await promptGitHubSetupType();
        expect(result).toEqual({ setupType: 'multiple' });
        expect(mockSelect).toHaveBeenCalled();
      });

      it('should handle auto-detect selection', async () => {
        mockSelect.mockResolvedValueOnce('auto-detect');
        const result = await promptGitHubSetupType();
        expect(result).toEqual({ setupType: 'auto-detect' });
      });
    });

    describe('repositoryHosting without projectPath/token', () => {
      it('should return single directly when github-single and no projectPath', async () => {
        const result = await promptGitHubSetupType(undefined, undefined, 'github-single');
        expect(result).toEqual({ setupType: 'single' });
      });

      it('should return multiple directly when github-multirepo and no projectPath', async () => {
        const result = await promptGitHubSetupType(undefined, undefined, 'github-multirepo');
        expect(result).toEqual({ setupType: 'multiple' });
      });
    });

    describe('DEBUG mode stack traces', () => {
      it('should log stack trace when DEBUG is set and promptStructure fails', async () => {
        const origDebug = process.env.DEBUG;
        process.env.DEBUG = '1';
        const error = new Error('debug-test');
        error.stack = 'Error: debug-test\n    at test.ts:1';
        mockPromptStructure.mockRejectedValueOnce(error);

        await promptGitHubSetupType('/project', 'ghp_token', 'github-single');

        expect(console.error).toHaveBeenCalled();
        process.env.DEBUG = origDebug;
      });

      it('should log stack trace when SPECWEAVE_DEBUG is set', async () => {
        const origDebug = process.env.SPECWEAVE_DEBUG;
        process.env.SPECWEAVE_DEBUG = '1';
        mockPromptStructure.mockRejectedValueOnce(new Error('sw-debug'));

        await promptGitHubSetupType('/project', 'ghp_token', 'github-single');

        expect(console.error).toHaveBeenCalled();
        process.env.SPECWEAVE_DEBUG = origDebug;
      });
    });

    describe('gitUrlFormat passthrough', () => {
      it('should pass gitUrlFormat to manager.promptStructure', async () => {
        const config = {
          architecture: 'single' as const,
          repositories: [
            { id: 'main', name: 'repo', owner: 'org', description: 'Repo', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockResolvedValueOnce(undefined);
        mockCreateSpecWeaveStructure.mockResolvedValueOnce(undefined);

        await promptGitHubSetupType('/project', 'ghp_token', 'github-single', 0, 'ssh');
        expect(mockPromptStructure).toHaveBeenCalledWith('single', 'github', 'ssh');
      });

      it('should pass https gitUrlFormat', async () => {
        const config = {
          architecture: 'single' as const,
          repositories: [
            { id: 'main', name: 'repo', owner: 'org', description: 'Repo', createOnGitHub: false },
          ],
          provider: { config: { name: 'GitHub' } },
        };
        mockPromptStructure.mockResolvedValueOnce(config);
        mockInitializeLocalRepos.mockResolvedValueOnce(undefined);
        mockCreateSpecWeaveStructure.mockResolvedValueOnce(undefined);

        await promptGitHubSetupType('/project', 'ghp_token', 'github', 0, 'https');
        expect(mockPromptStructure).toHaveBeenCalledWith('single', 'github', 'https');
      });
    });
  });

  // =============================================================
  // configureNoRepository
  // =============================================================
  describe('configureNoRepository', () => {
    it('should return an empty array', async () => {
      const result = await configureNoRepository();
      expect(result).toEqual([]);
    });

    it('should log deferred message', async () => {
      await configureNoRepository();
      expect(console.log).toHaveBeenCalled();
    });
  });

  // =============================================================
  // configureSingleRepository
  // =============================================================
  describe('configureSingleRepository', () => {
    it('should use detected remote when user confirms', async () => {
      mockDetectPrimaryGitHubRemote.mockResolvedValueOnce({
        name: 'origin',
        url: 'git@github.com:myorg/my-app.git',
        owner: 'myorg',
        repo: 'my-app',
        provider: 'github',
      });
      mockConfirm.mockResolvedValueOnce(true);

      const result = await configureSingleRepository('/project');
      expect(result).toEqual([{
        id: 'main',
        displayName: 'Main Repository',
        owner: 'myorg',
        repo: 'my-app',
        isDefault: true,
      }]);
    });

    it('should fall back to manual entry when user rejects detected remote', async () => {
      mockDetectPrimaryGitHubRemote.mockResolvedValueOnce({
        name: 'origin',
        url: 'https://github.com/detected/repo.git',
        owner: 'detected',
        repo: 'repo',
        provider: 'github',
      });
      mockConfirm.mockResolvedValueOnce(false);
      mockInput.mockResolvedValueOnce('custom-org');
      mockInput.mockResolvedValueOnce('custom-repo');

      const result = await configureSingleRepository('/project');
      expect(result).toEqual([{
        id: 'main',
        displayName: 'Main Repository',
        owner: 'custom-org',
        repo: 'custom-repo',
        isDefault: true,
      }]);
    });

    it('should prompt manual entry when no remote detected', async () => {
      mockDetectPrimaryGitHubRemote.mockResolvedValueOnce(null);
      mockInput.mockResolvedValueOnce('my-org');
      mockInput.mockResolvedValueOnce('my-repo');

      const result = await configureSingleRepository('/project');
      expect(result).toEqual([{
        id: 'main',
        displayName: 'Main Repository',
        owner: 'my-org',
        repo: 'my-repo',
        isDefault: true,
      }]);
    });

    it('should prompt manual entry when remote has no owner/repo', async () => {
      mockDetectPrimaryGitHubRemote.mockResolvedValueOnce({
        name: 'origin',
        url: 'https://example.com/unknown',
        owner: undefined,
        repo: undefined,
        provider: 'unknown',
      });
      mockInput.mockResolvedValueOnce('entered-org');
      mockInput.mockResolvedValueOnce('entered-repo');

      const result = await configureSingleRepository('/project');
      expect(result).toEqual([{
        id: 'main',
        displayName: 'Main Repository',
        owner: 'entered-org',
        repo: 'entered-repo',
        isDefault: true,
      }]);
    });
  });

  // =============================================================
  // configureMultipleRepositories
  // =============================================================
  describe('configureMultipleRepositories', () => {
    it('should collect profiles for the requested number of repos', async () => {
      mockNumber.mockResolvedValueOnce(2);
      mockDetectGitHubRemotes.mockResolvedValueOnce([]);
      mockGetUniqueRepositories.mockReturnValueOnce([]);

      // Repo 1
      mockInput.mockResolvedValueOnce('frontend');       // id
      mockInput.mockResolvedValueOnce('Frontend App');    // displayName
      mockInput.mockResolvedValueOnce('myorg');           // owner
      mockInput.mockResolvedValueOnce('frontend-app');    // repo name

      // Repo 2
      mockInput.mockResolvedValueOnce('backend');         // id
      mockInput.mockResolvedValueOnce('Backend Service'); // displayName
      mockInput.mockResolvedValueOnce('myorg');           // owner
      mockInput.mockResolvedValueOnce('backend-service'); // repo name

      const result = await configureMultipleRepositories('/project');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'frontend',
        displayName: 'Frontend App',
        owner: 'myorg',
        repo: 'frontend-app',
        isDefault: true,
      });
      expect(result[1]).toEqual({
        id: 'backend',
        displayName: 'Backend Service',
        owner: 'myorg',
        repo: 'backend-service',
        isDefault: false,
      });
    });

    it('should use detected repos as suggestions', async () => {
      mockNumber.mockResolvedValueOnce(2);
      mockDetectGitHubRemotes.mockResolvedValueOnce([
        { owner: 'org', repo: 'svc-a' },
        { owner: 'org', repo: 'svc-b' },
      ]);
      mockGetUniqueRepositories.mockReturnValueOnce([
        { owner: 'org', repo: 'svc-a' },
        { owner: 'org', repo: 'svc-b' },
      ]);

      // Repo 1
      mockInput.mockResolvedValueOnce('svc-a');
      mockInput.mockResolvedValueOnce('Service A');
      mockInput.mockResolvedValueOnce('org');
      mockInput.mockResolvedValueOnce('svc-a');

      // Repo 2
      mockInput.mockResolvedValueOnce('svc-b');
      mockInput.mockResolvedValueOnce('Service B');
      mockInput.mockResolvedValueOnce('org');
      mockInput.mockResolvedValueOnce('svc-b');

      const result = await configureMultipleRepositories('/project');
      expect(result).toHaveLength(2);
      expect(console.log).toHaveBeenCalled();
    });

    it('should default to 2 repos when number returns undefined', async () => {
      mockNumber.mockResolvedValueOnce(undefined);
      mockDetectGitHubRemotes.mockResolvedValueOnce([]);
      mockGetUniqueRepositories.mockReturnValueOnce([]);

      // Repo 1
      mockInput.mockResolvedValueOnce('aa');
      mockInput.mockResolvedValueOnce('A');
      mockInput.mockResolvedValueOnce('org');
      mockInput.mockResolvedValueOnce('repo-a');

      // Repo 2
      mockInput.mockResolvedValueOnce('bb');
      mockInput.mockResolvedValueOnce('B');
      mockInput.mockResolvedValueOnce('org');
      mockInput.mockResolvedValueOnce('repo-b');

      const result = await configureMultipleRepositories('/project');
      expect(result).toHaveLength(2);
    });
  });

  // =============================================================
  // configureMonorepo
  // =============================================================
  describe('configureMonorepo', () => {
    it('should configure a monorepo with single repo and multiple projects', async () => {
      // configureSingleRepository internals
      mockDetectPrimaryGitHubRemote.mockResolvedValueOnce(null);
      mockInput.mockResolvedValueOnce('myorg');         // owner
      mockInput.mockResolvedValueOnce('mono-repo');     // repo
      // monorepo projects input
      mockInput.mockResolvedValueOnce('frontend,backend,shared');

      const result = await configureMonorepo('/project');
      expect(result.profiles).toEqual([{
        id: 'main',
        displayName: 'Main Repository',
        owner: 'myorg',
        repo: 'mono-repo',
        isDefault: true,
      }]);
      expect(result.projects).toEqual(['frontend', 'backend', 'shared']);
    });

    it('should work with detected remote for the repo part', async () => {
      mockDetectPrimaryGitHubRemote.mockResolvedValueOnce({
        name: 'origin',
        url: 'git@github.com:org/monorepo.git',
        owner: 'org',
        repo: 'monorepo',
        provider: 'github',
      });
      mockConfirm.mockResolvedValueOnce(true);
      mockInput.mockResolvedValueOnce('pkg-a,pkg-b');

      const result = await configureMonorepo('/project');
      expect(result.profiles[0].owner).toBe('org');
      expect(result.profiles[0].repo).toBe('monorepo');
      expect(result.projects).toEqual(['pkg-a', 'pkg-b']);
    });
  });

  // =============================================================
  // autoDetectRepositories
  // =============================================================
  describe('autoDetectRepositories', () => {
    it('should return single profile when one repo detected and user confirms', async () => {
      mockDetectGitHubRemotes.mockResolvedValueOnce([
        { name: 'origin', owner: 'org', repo: 'app', provider: 'github' },
      ]);
      mockGetUniqueRepositories.mockReturnValueOnce([
        { owner: 'org', repo: 'app' },
      ]);
      mockConfirm.mockResolvedValueOnce(true);

      const result = await autoDetectRepositories('/project');
      expect(result).toEqual([{
        id: 'main',
        displayName: 'Main Repository',
        owner: 'org',
        repo: 'app',
        isDefault: true,
      }]);
      expect(mockOraSucceed).toHaveBeenCalled();
    });

    it('should prompt for IDs when multiple repos detected and confirmed', async () => {
      mockDetectGitHubRemotes.mockResolvedValueOnce([
        { name: 'origin', owner: 'org', repo: 'frontend-app' },
        { name: 'backend', owner: 'org', repo: 'backend-service' },
      ]);
      mockGetUniqueRepositories.mockReturnValueOnce([
        { owner: 'org', repo: 'frontend-app' },
        { owner: 'org', repo: 'backend-service' },
      ]);
      mockConfirm.mockResolvedValueOnce(true);

      // For first repo
      mockInput.mockResolvedValueOnce('frontend');
      mockInput.mockResolvedValueOnce('Frontend App');

      // For second repo
      mockInput.mockResolvedValueOnce('backend');
      mockInput.mockResolvedValueOnce('Backend Service');

      const result = await autoDetectRepositories('/project');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('frontend');
      expect(result[0].isDefault).toBe(true);
      expect(result[1].id).toBe('backend');
      expect(result[1].isDefault).toBe(false);
    });

    it('should fall back to configureSingleRepository when no repos detected', async () => {
      mockDetectGitHubRemotes.mockResolvedValueOnce([]);
      mockGetUniqueRepositories.mockReturnValueOnce([]);
      // configureSingleRepository: no detected remote -> manual entry
      mockDetectPrimaryGitHubRemote.mockResolvedValueOnce(null);
      mockInput.mockResolvedValueOnce('fallback-org');
      mockInput.mockResolvedValueOnce('fallback-repo');

      const result = await autoDetectRepositories('/project');
      expect(mockOraFail).toHaveBeenCalled();
      expect(result).toEqual([{
        id: 'main',
        displayName: 'Main Repository',
        owner: 'fallback-org',
        repo: 'fallback-repo',
        isDefault: true,
      }]);
    });

    it('should redirect to setup type prompt when user rejects detected repos', async () => {
      mockDetectGitHubRemotes.mockResolvedValueOnce([
        { name: 'origin', owner: 'org', repo: 'app' },
      ]);
      mockGetUniqueRepositories.mockReturnValueOnce([
        { owner: 'org', repo: 'app' },
      ]);
      mockConfirm.mockResolvedValueOnce(false);

      // promptGitHubSetupType legacy prompt (no projectPath/token passed)
      mockSelect.mockResolvedValueOnce('none');

      const result = await autoDetectRepositories('/project');
      expect(result).toEqual([]);
    });

    it('should redirect to single repo when user rejects and picks single', async () => {
      mockDetectGitHubRemotes.mockResolvedValueOnce([
        { name: 'origin', owner: 'org', repo: 'app' },
      ]);
      mockGetUniqueRepositories.mockReturnValueOnce([
        { owner: 'org', repo: 'app' },
      ]);
      mockConfirm.mockResolvedValueOnce(false);

      // promptGitHubSetupType -> select 'single'
      mockSelect.mockResolvedValueOnce('single');
      // configureSingleRepository
      mockDetectPrimaryGitHubRemote.mockResolvedValueOnce(null);
      mockInput.mockResolvedValueOnce('manual-org');
      mockInput.mockResolvedValueOnce('manual-repo');

      const result = await autoDetectRepositories('/project');
      expect(result).toEqual([{
        id: 'main',
        displayName: 'Main Repository',
        owner: 'manual-org',
        repo: 'manual-repo',
        isDefault: true,
      }]);
    });

    it('should redirect to multiple repos when user rejects and picks multiple', async () => {
      mockDetectGitHubRemotes.mockResolvedValueOnce([
        { name: 'origin', owner: 'org', repo: 'app' },
      ]);
      mockGetUniqueRepositories.mockReturnValueOnce([
        { owner: 'org', repo: 'app' },
      ]);
      mockConfirm.mockResolvedValueOnce(false);

      // promptGitHubSetupType -> select 'multiple'
      mockSelect.mockResolvedValueOnce('multiple');
      // configureMultipleRepositories
      mockNumber.mockResolvedValueOnce(2);
      mockDetectGitHubRemotes.mockResolvedValueOnce([]);
      mockGetUniqueRepositories.mockReturnValueOnce([]);

      mockInput.mockResolvedValueOnce('aa');
      mockInput.mockResolvedValueOnce('A');
      mockInput.mockResolvedValueOnce('org');
      mockInput.mockResolvedValueOnce('repo-a');
      mockInput.mockResolvedValueOnce('bb');
      mockInput.mockResolvedValueOnce('B');
      mockInput.mockResolvedValueOnce('org');
      mockInput.mockResolvedValueOnce('repo-b');

      const result = await autoDetectRepositories('/project');
      expect(result).toHaveLength(2);
    });

    it('should redirect to monorepo when user rejects and picks monorepo', async () => {
      mockDetectGitHubRemotes.mockResolvedValueOnce([
        { name: 'origin', owner: 'org', repo: 'app' },
      ]);
      mockGetUniqueRepositories.mockReturnValueOnce([
        { owner: 'org', repo: 'app' },
      ]);
      mockConfirm.mockResolvedValueOnce(false);

      // promptGitHubSetupType -> select 'monorepo'
      mockSelect.mockResolvedValueOnce('monorepo');
      // configureMonorepo -> configureSingleRepository
      mockDetectPrimaryGitHubRemote.mockResolvedValueOnce(null);
      mockInput.mockResolvedValueOnce('org');
      mockInput.mockResolvedValueOnce('mono');
      // monorepo projects
      mockInput.mockResolvedValueOnce('pkg-a,pkg-b');

      const result = await autoDetectRepositories('/project');
      expect(result).toHaveLength(1);
      expect(result[0].owner).toBe('org');
    });

    describe('recursion depth guard (Issue #5)', () => {
      it('should fall back to configureSingleRepository at max recursion depth', async () => {
        // At depth 3, should not call detectGitHubRemotes
        mockDetectPrimaryGitHubRemote.mockResolvedValueOnce(null);
        mockInput.mockResolvedValueOnce('safe-org');
        mockInput.mockResolvedValueOnce('safe-repo');

        const result = await autoDetectRepositories('/project', 3);
        expect(mockDetectGitHubRemotes).not.toHaveBeenCalled();
        expect(result).toEqual([{
          id: 'main',
          displayName: 'Main Repository',
          owner: 'safe-org',
          repo: 'safe-repo',
          isDefault: true,
        }]);
      });

      it('should work at depth 0 (default)', async () => {
        mockDetectGitHubRemotes.mockResolvedValueOnce([
          { name: 'origin', owner: 'org', repo: 'app' },
        ]);
        mockGetUniqueRepositories.mockReturnValueOnce([
          { owner: 'org', repo: 'app' },
        ]);
        mockConfirm.mockResolvedValueOnce(true);

        const result = await autoDetectRepositories('/project', 0);
        expect(result).toHaveLength(1);
      });
    });
  });

  // =============================================================
  // Type exports
  // =============================================================
  describe('type exports', () => {
    it('should export GitHubSetupType values', () => {
      const types: GitHubSetupType[] = ['none', 'single', 'multiple', 'monorepo', 'auto-detect'];
      expect(types).toHaveLength(5);
    });

    it('should export GitHubProfile interface shape', () => {
      const profile: GitHubProfile = {
        id: 'test',
        displayName: 'Test',
        owner: 'org',
        repo: 'repo',
        isDefault: true,
      };
      expect(profile.id).toBe('test');
    });

    it('should export GitHubConfiguration interface shape', () => {
      const config: GitHubConfiguration = {
        token: 'tok',
        instanceType: 'cloud',
        setupType: 'single',
        profiles: [],
      };
      expect(config.instanceType).toBe('cloud');
    });

    it('should export GitHubSetupResult interface shape', () => {
      const result: GitHubSetupResult = {
        setupType: 'multiple',
        profiles: [],
        monorepoProjects: ['a'],
      };
      expect(result.setupType).toBe('multiple');
    });
  });
});
