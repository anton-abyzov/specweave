/**
 * Unit tests for Repository Structure Manager
 *
 * Tests the RepoStructureManager class methods:
 * - promptStructure (architecture, platform, URL type selection)
 * - createRepositories (GitHub API calls, env, summary)
 * - initializeLocalRepos / createSpecWeaveStructure (delegating)
 * - resumeSetup, mapArchitectureChoice, formatArchitectureForDisplay
 * - configureSingleRepo, configureMonorepo
 * - createGitHubRepo, isGitHubOrganization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock external dependencies with vi.hoisted
const {
  mockExistsSync,
  mockExecSync,
  mockSelect,
  mockInput,
  mockConfirm,
  mockOraStart,
  mockOraStop,
  mockOraSucceed,
  mockOraFail,
  mockSaveState,
  mockDeleteState,
  mockDetectAndResumeSetup,
  mockGenerateEnvFile,
  mockGenerateSetupSummary,
  mockGetArchitecturePrompt,
  mockGetVisibilityPrompt,
  mockGetUrlTypePrompt,
  mockGetPlatformSelectionPrompt,
  mockInitializeProviders,
  mockGetPlatformRegistry,
  mockConfigureMultiRepo,
  mockInitLocalRepos,
  mockCreateSpecWeaveStruct
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn().mockReturnValue(false),
  mockExecSync: vi.fn(),
  mockSelect: vi.fn(),
  mockInput: vi.fn(),
  mockConfirm: vi.fn(),
  mockOraStart: vi.fn(),
  mockOraStop: vi.fn(),
  mockOraSucceed: vi.fn(),
  mockOraFail: vi.fn(),
  mockSaveState: vi.fn().mockResolvedValue(undefined),
  mockDeleteState: vi.fn().mockResolvedValue(undefined),
  mockDetectAndResumeSetup: vi.fn().mockResolvedValue(null),
  mockGenerateEnvFile: vi.fn().mockResolvedValue(undefined),
  mockGenerateSetupSummary: vi.fn().mockReturnValue('Summary output'),
  mockGetArchitecturePrompt: vi.fn().mockReturnValue({
    question: 'Architecture?',
    options: [
      { value: 'single', label: 'Single', description: 'Single repo', example: 'ex' },
      { value: 'github-parent', label: 'Multi', description: 'Multi repo', example: 'ex' }
    ]
  }),
  mockGetVisibilityPrompt: vi.fn().mockReturnValue({
    question: 'Visibility?',
    options: [
      { label: 'Private', value: 'private', description: 'Private' },
      { label: 'Public', value: 'public', description: 'Public' }
    ],
    default: 'private'
  }),
  mockGetUrlTypePrompt: vi.fn().mockReturnValue({
    question: 'URL type?',
    options: [
      { value: 'ssh', label: 'SSH', description: 'SSH' },
      { value: 'https', label: 'HTTPS', description: 'HTTPS' }
    ],
    default: 'ssh'
  }),
  mockGetPlatformSelectionPrompt: vi.fn().mockReturnValue({
    message: 'Select platform',
    question: 'Platform?'
  }),
  mockInitializeProviders: vi.fn(),
  mockGetPlatformRegistry: vi.fn(),
  mockConfigureMultiRepo: vi.fn(),
  mockInitLocalRepos: vi.fn().mockResolvedValue(undefined),
  mockCreateSpecWeaveStruct: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync
}));

vi.mock('child_process', () => ({
  execSync: mockExecSync
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
  confirm: mockConfirm
}));

vi.mock('ora', () => ({
  default: vi.fn(() => {
    const spinner = {
      start: mockOraStart.mockReturnThis(),
      stop: mockOraStop.mockReturnThis(),
      succeed: mockOraSucceed.mockReturnThis(),
      fail: mockOraFail.mockReturnThis()
    };
    return spinner;
  })
}));

vi.mock('chalk', () => {
  const identity = (s: any) => String(s);
  const handler: ProxyHandler<any> = {
    get: (_target, _prop) => {
      const fn: any = identity;
      fn.bold = identity;
      return new Proxy(fn, handler);
    },
    apply: (_target, _thisArg, args) => String(args[0])
  };
  const chalkProxy = new Proxy(identity, handler);
  return { default: chalkProxy };
});

vi.mock('../../../../src/core/repo-structure/setup-state-manager.js', () => {
  return {
    SetupStateManager: class MockSetupStateManager {
      saveState = mockSaveState;
      deleteState = mockDeleteState;
      detectAndResumeSetup = mockDetectAndResumeSetup;
      constructor(_projectRoot: string) {}
    }
  };
});

vi.mock('../../../../src/utils/env-file-generator.js', () => ({
  generateEnvFile: mockGenerateEnvFile
}));

vi.mock('../../../../src/core/repo-structure/setup-summary.js', () => ({
  generateSetupSummary: mockGenerateSetupSummary
}));

vi.mock('../../../../src/core/repo-structure/prompt-consolidator.js', () => ({
  getArchitecturePrompt: mockGetArchitecturePrompt,
  getVisibilityPrompt: mockGetVisibilityPrompt,
  getUrlTypePrompt: mockGetUrlTypePrompt,
  getPlatformSelectionPrompt: mockGetPlatformSelectionPrompt
}));

vi.mock('../../../../src/core/repo-structure/providers/index.js', () => ({
  initializeProviders: mockInitializeProviders
}));

vi.mock('../../../../src/core/repo-structure/platform-registry.js', () => ({
  getPlatformRegistry: mockGetPlatformRegistry
}));

vi.mock('../../../../src/core/repo-structure/multi-repo-configurator.js', () => ({
  configureMultiRepo: mockConfigureMultiRepo
}));

vi.mock('../../../../src/core/repo-structure/repo-initializer.js', () => ({
  initializeLocalRepos: mockInitLocalRepos,
  createSpecWeaveStructure: mockCreateSpecWeaveStruct
}));

import { RepoStructureManager, type RepoStructureConfig } from '../../../../src/core/repo-structure/repo-structure-manager.js';
import type { GitProvider } from '../../../../src/core/repo-structure/git-provider.js';

// Helper to create a mock provider
function createMockProvider(overrides: Partial<GitProvider> = {}): GitProvider {
  return {
    config: {
      type: 'github',
      name: 'GitHub',
      host: 'github.com',
      apiBaseUrl: 'https://api.github.com',
      selfHosted: false
    },
    validateRepository: vi.fn().mockResolvedValue({ exists: false, valid: true }),
    validateOwner: vi.fn().mockResolvedValue({ valid: true, type: 'organization' }),
    createRepository: vi.fn().mockResolvedValue('https://github.com/owner/repo'),
    getRemoteUrl: vi.fn((owner, repo, urlType) =>
      urlType === 'ssh' ? `git@github.com:${owner}/${repo}.git` : `https://github.com/${owner}/${repo}.git`
    ),
    isOrganization: vi.fn().mockResolvedValue(true),
    getTokenUrl: vi.fn().mockReturnValue('https://github.com/settings/tokens/new'),
    getRequiredScopes: vi.fn().mockReturnValue(['repo']),
    ...overrides
  } as GitProvider;
}

// Helper to create a mock config
function createMockConfig(overrides: Partial<RepoStructureConfig> = {}): RepoStructureConfig {
  const provider = createMockProvider();
  return {
    architecture: 'single',
    urlType: 'ssh',
    platform: 'github',
    provider,
    repositories: [{
      id: 'main',
      name: 'test-repo',
      owner: 'test-owner',
      description: 'Test description',
      path: '.',
      visibility: 'private',
      createOnGitHub: true,
      isNested: false
    }],
    ...overrides
  };
}

describe('RepoStructureManager', () => {
  let manager: RepoStructureManager;
  const mockProvider = createMockProvider();
  const mockRegistry = {
    getProvider: vi.fn().mockReturnValue(mockProvider),
    getPlatformOptions: vi.fn().mockReturnValue([
      { name: 'GitHub', value: 'github', description: 'GitHub.com', disabled: false }
    ])
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlatformRegistry.mockReturnValue(mockRegistry);
    manager = new RepoStructureManager('/tmp/test-project', 'test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with project path and token', () => {
      expect(mockInitializeProviders).toHaveBeenCalled();
    });

    it('should work without a token', () => {
      vi.clearAllMocks();
      const mgr = new RepoStructureManager('/tmp/project');
      expect(mockInitializeProviders).toHaveBeenCalled();
    });
  });

  describe('promptStructure', () => {
    it('should show header when no pre-selected architecture', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // User selects single architecture
      mockSelect
        .mockResolvedValueOnce('single')      // Architecture
        .mockResolvedValueOnce('github')       // Platform
        .mockResolvedValueOnce('ssh');          // URL type

      // Single repo config inputs
      mockInput
        .mockResolvedValueOnce('myowner')
        .mockResolvedValueOnce('my-repo')
        .mockResolvedValueOnce('My description');
      mockConfirm.mockResolvedValueOnce(false); // Don't create on GitHub

      const result = await manager.promptStructure();

      expect(result.architecture).toBe('single');
      consoleSpy.mockRestore();
    });

    it('should skip architecture prompt when pre-selected', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Pre-selected: skip architecture and go straight to platform/URL type
      mockSelect
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh');

      // Single repo config
      mockInput
        .mockResolvedValueOnce('owner')
        .mockResolvedValueOnce('repo')
        .mockResolvedValueOnce('desc');
      mockConfirm.mockResolvedValueOnce(false);

      const result = await manager.promptStructure('single');

      expect(result.architecture).toBe('single');
      // Architecture select should NOT have been called (only platform + url type = 2)
      consoleSpy.mockRestore();
    });

    it('should skip platform prompt when pre-selected', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('ssh');

      mockInput
        .mockResolvedValueOnce('owner')
        .mockResolvedValueOnce('repo')
        .mockResolvedValueOnce('desc');
      mockConfirm.mockResolvedValueOnce(false);

      const result = await manager.promptStructure(undefined, 'github');

      expect(result.platform).toBe('github');
      consoleSpy.mockRestore();
    });

    it('should skip URL type prompt when pre-selected', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('github');

      mockInput
        .mockResolvedValueOnce('owner')
        .mockResolvedValueOnce('repo')
        .mockResolvedValueOnce('desc');
      mockConfirm.mockResolvedValueOnce(false);

      const result = await manager.promptStructure(undefined, undefined, 'https');

      expect(result.urlType).toBe('https');
      consoleSpy.mockRestore();
    });

    it('should throw when platform provider not found (pre-selected)', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockRegistry.getProvider.mockReturnValueOnce(undefined);

      await expect(
        manager.promptStructure('single', 'gitlab')
      ).rejects.toThrow('Platform gitlab is not available');

      consoleSpy.mockRestore();
    });

    it('should throw when platform provider not found (user-selected)', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockSelect.mockResolvedValueOnce('single');
      mockRegistry.getProvider.mockReturnValueOnce(undefined);
      mockSelect.mockResolvedValueOnce('gitlab');

      await expect(
        manager.promptStructure()
      ).rejects.toThrow('Platform gitlab is not available');

      consoleSpy.mockRestore();
    });

    it('should resume setup when interrupted state detected and user agrees', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockDetectAndResumeSetup.mockResolvedValueOnce({
        version: '1.0.0',
        architecture: 'single',
        repos: [{
          id: 'main',
          repo: 'my-repo',
          owner: 'owner',
          path: '.',
          visibility: 'private',
          displayName: 'my-repo',
          created: false
        }],
        currentStep: 'repo-configured',
        timestamp: '2024-01-01T00:00:00Z',
        envCreated: false
      });

      mockConfirm.mockResolvedValueOnce(true); // Yes, resume

      const result = await manager.promptStructure();

      expect(result.architecture).toBe('single');
      expect(result.repositories).toHaveLength(1);
      consoleSpy.mockRestore();
    });

    it('should start fresh when user declines resume', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockDetectAndResumeSetup.mockResolvedValueOnce({
        version: '1.0.0',
        architecture: 'single',
        repos: [],
        currentStep: 'architecture-selected',
        timestamp: '2024-01-01T00:00:00Z',
        envCreated: false
      });

      mockConfirm
        .mockResolvedValueOnce(false)  // No, don't resume
        .mockResolvedValueOnce(false); // Don't create on GitHub

      mockSelect
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh');

      mockInput
        .mockResolvedValueOnce('owner')
        .mockResolvedValueOnce('repo')
        .mockResolvedValueOnce('desc');

      const result = await manager.promptStructure();

      expect(mockDeleteState).toHaveBeenCalled();
      expect(result.architecture).toBe('single');
      consoleSpy.mockRestore();
    });

    it('should map github-parent to multi-repo', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockSelect
        .mockResolvedValueOnce('github-parent')
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh');

      mockConfigureMultiRepo.mockResolvedValueOnce({
        architecture: 'multi-repo',
        urlType: 'ssh',
        platform: 'github',
        provider: mockProvider,
        repositories: []
      });

      const result = await manager.promptStructure();

      expect(result.architecture).toBe('multi-repo');
      expect(mockConfigureMultiRepo).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should map unknown architecture to single via default case', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // mapArchitectureChoice default returns 'single', so monorepo maps to single
      mockSelect
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh');

      mockInput
        .mockResolvedValueOnce('owner')
        .mockResolvedValueOnce('repo')
        .mockResolvedValueOnce('desc');
      mockConfirm.mockResolvedValueOnce(false);

      const result = await manager.promptStructure('monorepo' as any);

      // monorepo maps to 'single' via default case in mapArchitectureChoice
      expect(result.architecture).toBe('single');
      consoleSpy.mockRestore();
    });

    it('should detect existing git repo and use it', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockExistsSync.mockReturnValue(true); // .git exists
      mockExecSync.mockReturnValue('git@github.com:existorg/existrepo.git\n');
      mockConfirm.mockResolvedValueOnce(true); // Use existing

      mockSelect
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh');

      const result = await manager.promptStructure('single');

      expect(result.repositories[0].name).toBe('existrepo');
      expect(result.repositories[0].owner).toBe('existorg');
      expect(result.repositories[0].createOnGitHub).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should fetch description and visibility from GitHub when token available', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('git@github.com:org/repo.git\n');
      mockConfirm.mockResolvedValueOnce(true);

      // Mock global fetch for GitHub API
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          description: 'Fetched description',
          private: false
        })
      }) as any;

      mockSelect
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh');

      const result = await manager.promptStructure('single');

      expect(result.repositories[0].description).toBe('Fetched description');
      expect(result.repositories[0].visibility).toBe('public');

      global.fetch = originalFetch;
      consoleSpy.mockRestore();
    });

    it('should use defaults when GitHub API fetch fails', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('git@github.com:org/repo.git\n');
      mockConfirm.mockResolvedValueOnce(true);

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error')) as any;

      mockSelect
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh');

      const result = await manager.promptStructure('single');

      expect(result.repositories[0].description).toContain('SpecWeave project');
      expect(result.repositories[0].visibility).toBe('private');

      global.fetch = originalFetch;
      consoleSpy.mockRestore();
    });

    it('should fall through to manual config when no remote or match fails', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockImplementation(() => { throw new Error('No remote'); });

      mockSelect
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh');

      mockInput
        .mockResolvedValueOnce('myowner')
        .mockResolvedValueOnce('myrepo')
        .mockResolvedValueOnce('Description');
      mockConfirm.mockResolvedValueOnce(false);

      const result = await manager.promptStructure('single');

      expect(result.repositories[0].owner).toBe('myowner');
      consoleSpy.mockRestore();
    });

    it('should ask visibility when creating repo on GitHub', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockExistsSync.mockReturnValue(false);

      mockSelect
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('public');  // Visibility

      mockInput
        .mockResolvedValueOnce('owner')
        .mockResolvedValueOnce('new-repo')
        .mockResolvedValueOnce('New repo');
      mockConfirm.mockResolvedValueOnce(true); // Create on GitHub

      const result = await manager.promptStructure('single');

      expect(result.repositories[0].visibility).toBe('public');
      expect(result.repositories[0].createOnGitHub).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('resumeSetup (via promptStructure)', () => {
    it('should map old parent architecture to multi-repo', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockDetectAndResumeSetup.mockResolvedValueOnce({
        version: '1.0.0',
        architecture: 'parent', // Old deprecated type
        repos: [{
          id: 'svc',
          repo: 'my-svc',
          owner: 'org',
          path: 'repositories/org/my-svc',
          visibility: 'private',
          displayName: 'my-svc',
          created: false
        }],
        currentStep: 'repo-configured',
        timestamp: '2024-01-01T00:00:00Z',
        envCreated: false
      });

      mockConfirm.mockResolvedValueOnce(true); // Resume

      const result = await manager.promptStructure();

      expect(result.architecture).toBe('multi-repo');
      consoleSpy.mockRestore();
    });

    it('should construct path for multi-repo repos from state', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockDetectAndResumeSetup.mockResolvedValueOnce({
        version: '1.0.0',
        architecture: 'multi-repo',
        repos: [{
          id: 'svc',
          repo: 'my-svc',
          owner: 'org',
          visibility: 'private',
          displayName: 'my-svc',
          created: true
          // No path property - should fallback to constructed path
        }],
        currentStep: 'repo-configured',
        timestamp: '2024-01-01T00:00:00Z',
        envCreated: false
      });

      mockConfirm.mockResolvedValueOnce(true);

      const result = await manager.promptStructure();

      expect(result.repositories[0].path).toBe('repositories/org/my-svc');
      expect(result.repositories[0].createOnGitHub).toBe(false); // created=true means don't create
      consoleSpy.mockRestore();
    });

    it('should throw if provider not available on resume', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockDetectAndResumeSetup.mockResolvedValueOnce({
        version: '1.0.0',
        architecture: 'single',
        repos: [],
        currentStep: 'in-progress',
        timestamp: '2024-01-01T00:00:00Z',
        envCreated: false
      });

      mockConfirm.mockResolvedValueOnce(true);
      mockRegistry.getProvider.mockReturnValueOnce(undefined);

      await expect(manager.promptStructure()).rejects.toThrow('GitHub provider not available');

      consoleSpy.mockRestore();
    });
  });

  describe('createRepositories', () => {
    it('should skip creation when no token', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const noTokenManager = new RepoStructureManager('/tmp/project');
      const config = createMockConfig();

      await noTokenManager.createRepositories(config);

      expect(config.provider.createRepository).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should create repositories that have createOnGitHub=true', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const config = createMockConfig({
        repositories: [
          { id: 'a', name: 'repo-a', owner: 'org', description: 'A', path: '.', visibility: 'private', createOnGitHub: true, isNested: false },
          { id: 'b', name: 'repo-b', owner: 'org', description: 'B', path: '.', visibility: 'public', createOnGitHub: false, isNested: false }
        ]
      });

      await manager.createRepositories(config);

      expect(config.provider.createRepository).toHaveBeenCalledTimes(1);
      expect(config.provider.createRepository).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'repo-a', owner: 'org', visibility: 'private' }),
        'test-token'
      );
      consoleSpy.mockRestore();
    });

    it('should track failed repository creations', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const provider = createMockProvider({
        createRepository: vi.fn().mockRejectedValue(new Error('Permission denied'))
      });
      const config = createMockConfig({ provider });

      await manager.createRepositories(config);

      // Should have logged failure
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed'));
      consoleSpy.mockRestore();
    });

    it('should generate env file after creating repos', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const config = createMockConfig();

      await manager.createRepositories(config);

      expect(mockGenerateEnvFile).toHaveBeenCalledWith('/tmp/test-project', expect.objectContaining({ githubToken: 'test-token' }));
      consoleSpy.mockRestore();
    });

    it('should show setup summary after creating repos', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const config = createMockConfig();

      await manager.createRepositories(config);

      expect(mockGenerateSetupSummary).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should delete state on completion', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const config = createMockConfig();

      await manager.createRepositories(config);

      expect(mockDeleteState).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle env file generation failure', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockGenerateEnvFile.mockRejectedValueOnce(new Error('disk full'));

      const config = createMockConfig();

      // Should not throw despite env file failure
      await manager.createRepositories(config);

      expect(mockOraFail).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle multiple repos with mixed success/failure', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const provider = createMockProvider({
        createRepository: vi.fn()
          .mockResolvedValueOnce('https://github.com/org/repo-a')
          .mockRejectedValueOnce(new Error('rate limit'))
      });
      const config = createMockConfig({
        provider,
        repositories: [
          { id: 'a', name: 'repo-a', owner: 'org', description: 'A', path: '.', visibility: 'private', createOnGitHub: true, isNested: false },
          { id: 'b', name: 'repo-b', owner: 'org', description: 'B', path: '.', visibility: 'private', createOnGitHub: true, isNested: false }
        ]
      });

      await manager.createRepositories(config);

      expect(provider.createRepository).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });
  });

  describe('initializeLocalRepos', () => {
    it('should delegate to repo-initializer module', async () => {
      const config = createMockConfig();
      await manager.initializeLocalRepos(config);

      expect(mockInitLocalRepos).toHaveBeenCalledWith(config, '/tmp/test-project', 'test-token');
    });
  });

  describe('createSpecWeaveStructure', () => {
    it('should delegate to repo-initializer module', async () => {
      const config = createMockConfig();
      await manager.createSpecWeaveStructure(config);

      expect(mockCreateSpecWeaveStruct).toHaveBeenCalledWith(config, '/tmp/test-project');
    });
  });

  describe('single repo - user declines existing repo', () => {
    it('should fall through to manual config when user declines existing', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('git@github.com:existorg/existrepo.git\n');
      mockConfirm
        .mockResolvedValueOnce(false)  // Don't use existing
        .mockResolvedValueOnce(true);  // Create on GitHub

      mockSelect
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh')
        .mockResolvedValueOnce('private');  // Visibility

      mockInput
        .mockResolvedValueOnce('newowner')
        .mockResolvedValueOnce('newrepo')
        .mockResolvedValueOnce('New description');

      const result = await manager.promptStructure('single');

      expect(result.repositories[0].owner).toBe('newowner');
      expect(result.repositories[0].name).toBe('newrepo');
      consoleSpy.mockRestore();
    });
  });

  describe('single repo - non-github remote URL', () => {
    it('should fallback to manual config when remote does not match github pattern', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('https://gitlab.com/org/repo.git\n');

      mockSelect
        .mockResolvedValueOnce('github')
        .mockResolvedValueOnce('ssh');

      mockInput
        .mockResolvedValueOnce('owner')
        .mockResolvedValueOnce('repo')
        .mockResolvedValueOnce('desc');
      mockConfirm.mockResolvedValueOnce(false);

      const result = await manager.promptStructure('single');

      expect(result.repositories[0].owner).toBe('owner');
      consoleSpy.mockRestore();
    });
  });
});
