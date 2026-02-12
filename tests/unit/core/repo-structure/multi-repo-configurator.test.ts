/**
 * Unit tests for Multi-Repository Configurator
 *
 * Tests the configureMultiRepo function which handles multi-repo
 * setup including discovery, greenfield, and manual flows.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock external dependencies with vi.hoisted
const {
  mockSelect,
  mockInput,
  mockConfirm,
  mockNumber,
  mockNormalizeRepoName,
  mockSuggestRepoName,
  mockDetectRepositoryHints,
  mockDiscoverRepositories,
  mockGetVisibilityPrompt,
  mockSaveState,
  mockDeleteState,
  mockDetectAndResumeSetup
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInput: vi.fn(),
  mockConfirm: vi.fn(),
  mockNumber: vi.fn(),
  mockNormalizeRepoName: vi.fn((name: string) => name.toLowerCase().replace(/[^a-z0-9-]/g, '')),
  mockSuggestRepoName: vi.fn((project: string, index: number) => `${project}-service-${index}`),
  mockDetectRepositoryHints: vi.fn().mockResolvedValue({
    suggestedCount: 2,
    detectedFolders: [],
    confidence: 'low'
  }),
  mockDiscoverRepositories: vi.fn(),
  mockGetVisibilityPrompt: vi.fn(() => ({
    question: 'Repository visibility?',
    options: [
      { label: 'Private', value: 'private', description: 'Private repo' },
      { label: 'Public', value: 'public', description: 'Public repo' }
    ],
    default: 'private'
  })),
  mockSaveState: vi.fn().mockResolvedValue(undefined),
  mockDeleteState: vi.fn().mockResolvedValue(undefined),
  mockDetectAndResumeSetup: vi.fn().mockResolvedValue(null)
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
  confirm: mockConfirm,
  number: mockNumber
}));

vi.mock('@octokit/rest', () => ({
  Octokit: class MockOctokit {
    repos = {
      listForOrg: vi.fn().mockResolvedValue({ data: [] }),
      listForAuthenticatedUser: vi.fn().mockResolvedValue({ data: [] })
    };
    constructor(_opts?: any) {}
  }
}));

vi.mock('../../../../src/core/repo-structure/repo-id-generator.js', () => ({
  normalizeRepoName: mockNormalizeRepoName,
  suggestRepoName: mockSuggestRepoName
}));

vi.mock('../../../../src/core/repo-structure/setup-state-manager.js', () => ({
  SetupStateManager: class MockSetupStateManager {
    saveState = mockSaveState;
    deleteState = mockDeleteState;
    detectAndResumeSetup = mockDetectAndResumeSetup;
    constructor(_projectRoot: string) {}
  }
}));

vi.mock('../../../../src/core/repo-structure/prompt-consolidator.js', () => ({
  getVisibilityPrompt: mockGetVisibilityPrompt
}));

vi.mock('../../../../src/core/repo-structure/folder-detector.js', () => ({
  detectRepositoryHints: mockDetectRepositoryHints
}));

vi.mock('../../../../src/core/repo-structure/repo-bulk-discovery.js', () => ({
  discoverRepositories: mockDiscoverRepositories
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

import { configureMultiRepo, type MultiRepoConfigOptions } from '../../../../src/core/repo-structure/multi-repo-configurator.js';
import type { GitProvider } from '../../../../src/core/repo-structure/git-provider.js';

// Helper to create mock provider
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

// Helper to create default options
function createOptions(overrides: Partial<MultiRepoConfigOptions> = {}): MultiRepoConfigOptions {
  return {
    projectPath: '/tmp/test-project',
    githubToken: 'test-token',
    stateManager: {
      saveState: mockSaveState,
      deleteState: mockDeleteState,
      detectAndResumeSetup: mockDetectAndResumeSetup
    } as any,
    urlType: 'ssh',
    platform: 'github',
    provider: createMockProvider(),
    ...overrides
  };
}

describe('multi-repo-configurator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configureMultiRepo - manual flow (no token)', () => {
    // When no token: skip discovery menu, go straight to manual (ask owner, detect hints, ask count, configure repos)

    it('should save initial architecture state and configure repos', async () => {
      const options = createOptions({ githubToken: undefined });

      // Manual flow: owner -> hints detection -> count -> repos
      mockInput
        .mockResolvedValueOnce('myorg')       // Owner
        .mockResolvedValueOnce('frontend')    // Repo 1 name
        .mockResolvedValueOnce('Frontend service') // Repo 1 description
        .mockResolvedValueOnce('backend')     // Repo 2 name
        .mockResolvedValueOnce('Backend service'); // Repo 2 description
      mockNumber.mockResolvedValueOnce(2);
      mockConfirm
        .mockResolvedValueOnce(false)  // Don't create repo 1 on GitHub
        .mockResolvedValueOnce(false); // Don't create repo 2 on GitHub

      const result = await configureMultiRepo(options);

      expect(mockSaveState).toHaveBeenCalledWith(
        expect.objectContaining({
          architecture: 'multi-repo',
          currentStep: 'architecture-selected'
        })
      );
      expect(result.architecture).toBe('multi-repo');
      expect(result.repositories).toHaveLength(2);
    });

    it('should use default values when urlType and platform are not provided', async () => {
      const options = createOptions({
        urlType: undefined,
        platform: undefined,
        githubToken: undefined
      });

      mockInput
        .mockResolvedValueOnce('owner')
        .mockResolvedValueOnce('repo-1')
        .mockResolvedValueOnce('Desc 1')
        .mockResolvedValueOnce('repo-2')
        .mockResolvedValueOnce('Desc 2');
      mockNumber.mockResolvedValueOnce(2);
      mockConfirm
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      const result = await configureMultiRepo(options);

      expect(result.urlType).toBe('ssh');
      expect(result.platform).toBe('github');
    });

    it('should detect repository hints', async () => {
      const options = createOptions({ githubToken: undefined });

      mockDetectRepositoryHints.mockResolvedValueOnce({
        suggestedCount: 3,
        detectedFolders: ['frontend', 'backend', 'shared'],
        confidence: 'high'
      });

      mockInput
        .mockResolvedValueOnce('myorg')
        .mockResolvedValueOnce('frontend')
        .mockResolvedValueOnce('Frontend service')
        .mockResolvedValueOnce('backend')
        .mockResolvedValueOnce('Backend service');
      mockNumber.mockResolvedValueOnce(2);
      mockConfirm
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await configureMultiRepo(options);

      expect(mockDetectRepositoryHints).toHaveBeenCalledWith('/tmp/test-project');
    });

    it('should save state after each repo', async () => {
      const options = createOptions({ githubToken: undefined });

      mockInput
        .mockResolvedValueOnce('org')
        .mockResolvedValueOnce('svc-a')
        .mockResolvedValueOnce('Service A')
        .mockResolvedValueOnce('svc-b')
        .mockResolvedValueOnce('Service B');
      mockNumber.mockResolvedValueOnce(2);
      mockConfirm
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await configureMultiRepo(options);

      // Initial state + 2 per-repo states
      expect(mockSaveState).toHaveBeenCalledTimes(3);
      expect(mockSaveState).toHaveBeenCalledWith(
        expect.objectContaining({ currentStep: 'repo-1-configured' })
      );
      expect(mockSaveState).toHaveBeenCalledWith(
        expect.objectContaining({ currentStep: 'repo-2-configured' })
      );
    });

    it('should ask visibility when creating repo on GitHub', async () => {
      const options = createOptions({ githubToken: undefined });

      mockInput
        .mockResolvedValueOnce('org')
        .mockResolvedValueOnce('my-api')
        .mockResolvedValueOnce('API service')
        .mockResolvedValueOnce('my-web')
        .mockResolvedValueOnce('Web service');
      mockNumber.mockResolvedValueOnce(2);
      // No token, so validateRepository is not called
      // Repo 1: create on GitHub = yes
      // Repo 2: create on GitHub = no
      mockConfirm
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      // Visibility for repo 1
      mockSelect.mockResolvedValueOnce('public');

      const result = await configureMultiRepo(options);

      expect(result.repositories[0].createOnGitHub).toBe(true);
      expect(result.repositories[0].visibility).toBe('public');
      expect(result.repositories[1].createOnGitHub).toBe(false);
      expect(result.repositories[1].visibility).toBe('private');
    });

    it('should construct correct repo paths', async () => {
      const options = createOptions({ githubToken: undefined });

      mockInput
        .mockResolvedValueOnce('myorg')
        .mockResolvedValueOnce('my-service')
        .mockResolvedValueOnce('Service desc')
        .mockResolvedValueOnce('my-lib')
        .mockResolvedValueOnce('Lib desc');
      mockNumber.mockResolvedValueOnce(2);
      mockConfirm
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      const result = await configureMultiRepo(options);

      expect(result.repositories[0].path).toBe('repositories/myorg/my-service');
      expect(result.repositories[1].path).toBe('repositories/myorg/my-lib');
    });

    it('should handle state save failure gracefully', async () => {
      mockSaveState.mockRejectedValueOnce(new Error('disk full'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const options = createOptions({ githubToken: undefined });

      mockInput
        .mockResolvedValueOnce('org')
        .mockResolvedValueOnce('repo-1')
        .mockResolvedValueOnce('Desc 1')
        .mockResolvedValueOnce('repo-2')
        .mockResolvedValueOnce('Desc 2');
      mockNumber.mockResolvedValueOnce(2);
      mockConfirm
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      const result = await configureMultiRepo(options);
      expect(result.architecture).toBe('multi-repo');

      consoleSpy.mockRestore();
    });

    it('should set isNested to false for all repos', async () => {
      const options = createOptions({ githubToken: undefined });

      mockInput
        .mockResolvedValueOnce('org')
        .mockResolvedValueOnce('svc-a')
        .mockResolvedValueOnce('A')
        .mockResolvedValueOnce('svc-b')
        .mockResolvedValueOnce('B');
      mockNumber.mockResolvedValueOnce(2);
      mockConfirm
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      const result = await configureMultiRepo(options);

      result.repositories.forEach(repo => {
        expect(repo.isNested).toBe(false);
      });
    });
  });

  describe('configureMultiRepo - greenfield flow (from top-level)', () => {
    it('should configure greenfield repos when selected from discovery menu', async () => {
      const options = createOptions();

      // With token: discovery menu shows -> user selects greenfield
      mockSelect.mockResolvedValueOnce('greenfield');
      // Greenfield asks for owner, prefix, services
      mockInput
        .mockResolvedValueOnce('myorg')     // Owner
        .mockResolvedValueOnce('sw-ecom-')  // Prefix
        .mockResolvedValueOnce('web, api'); // Services
      mockConfirm.mockResolvedValueOnce(true); // Confirm

      const result = await configureMultiRepo(options);

      expect(result.architecture).toBe('multi-repo');
      expect(result.repositories).toHaveLength(2);
      expect(result.repositories[0].createOnGitHub).toBe(true);
      expect(mockSaveState).toHaveBeenCalledWith(
        expect.objectContaining({ currentStep: 'repos-configured' })
      );
    });
  });

  describe('configureMultiRepo - bulk discovery flow', () => {
    it('should configure repos from bulk discovery results', async () => {
      const options = createOptions();

      // Discovery menu: bulk-discovery
      mockSelect.mockResolvedValueOnce('bulk-discovery');
      // Owner input (with validation)
      mockInput.mockResolvedValueOnce('myorg');

      mockDiscoverRepositories.mockResolvedValueOnce({
        repositories: [
          { name: 'repo-a', full_name: 'myorg/repo-a', owner: 'myorg', description: 'Service A', private: true, updated_at: '' },
          { name: 'repo-b', full_name: 'myorg/repo-b', owner: 'myorg', description: null, private: false, updated_at: '' }
        ],
        strategy: 'all-repos'
      });

      const result = await configureMultiRepo(options);

      expect(result.architecture).toBe('multi-repo');
      expect(result.repositories).toHaveLength(2);
      expect(result.repositories[0].name).toBe('repo-a');
      expect(result.repositories[0].visibility).toBe('private');
      expect(result.repositories[0].createOnGitHub).toBe(false);
      expect(result.repositories[1].visibility).toBe('public');
      expect(mockSaveState).toHaveBeenCalledWith(
        expect.objectContaining({ currentStep: 'repos-configured' })
      );
    });

    it('should use description fallback for repos without description', async () => {
      const options = createOptions();

      mockSelect.mockResolvedValueOnce('bulk-discovery');
      mockInput.mockResolvedValueOnce('org');

      mockDiscoverRepositories.mockResolvedValueOnce({
        repositories: [
          { name: 'has-desc', full_name: 'org/has-desc', owner: 'org', description: 'Has description', private: false, updated_at: '' },
          { name: 'no-desc', full_name: 'org/no-desc', owner: 'org', description: null, private: false, updated_at: '' }
        ],
        strategy: 'all-repos'
      });

      const result = await configureMultiRepo(options);

      expect(result.repositories[0].description).toBe('Has description');
      expect(result.repositories[1].description).toBe('no-desc service');
    });

    it('should fall back to manual when discovery returns manual strategy', async () => {
      const options = createOptions();

      mockSelect.mockResolvedValueOnce('bulk-discovery');
      // Owner for bulk-discovery flow
      mockInput.mockResolvedValueOnce('myorg');

      // Discovery returns manual
      mockDiscoverRepositories.mockResolvedValueOnce({
        repositories: [],
        strategy: 'manual'
      });

      // Falls through to manual flow - owner already set, so no owner prompt
      // Detect hints, then count, then repos
      mockNumber.mockResolvedValueOnce(2);
      mockInput
        .mockResolvedValueOnce('frontend')   // Repo 1 name
        .mockResolvedValueOnce('Frontend')   // Repo 1 description
        .mockResolvedValueOnce('backend')    // Repo 2 name
        .mockResolvedValueOnce('Backend');   // Repo 2 description
      mockConfirm
        .mockResolvedValueOnce(true)         // Create frontend on GitHub
        .mockResolvedValueOnce(false);       // Don't create backend on GitHub
      mockSelect.mockResolvedValueOnce('private'); // Visibility for frontend

      const result = await configureMultiRepo(options);

      expect(result.architecture).toBe('multi-repo');
      expect(result.repositories).toHaveLength(2);
    });

    it('should handle greenfield from bulk discovery result', async () => {
      const options = createOptions();

      mockSelect.mockResolvedValueOnce('bulk-discovery');
      // Owner for discovery
      mockInput.mockResolvedValueOnce('myorg');

      // Discovery returns greenfield
      mockDiscoverRepositories.mockResolvedValueOnce({
        repositories: [],
        strategy: 'greenfield'
      });

      // Greenfield: prefix + services
      mockInput
        .mockResolvedValueOnce('app-')
        .mockResolvedValueOnce('web, api, gateway');
      mockConfirm.mockResolvedValueOnce(true);

      const result = await configureMultiRepo(options);

      expect(result.architecture).toBe('multi-repo');
      expect(result.repositories).toHaveLength(3);
      expect(result.repositories[0].createOnGitHub).toBe(true);
    });
  });

  describe('configureMultiRepo - manual flow with token', () => {
    it('should skip GitHub creation when repo already exists', async () => {
      const provider = createMockProvider({
        validateRepository: vi.fn().mockResolvedValue({
          exists: true,
          valid: true,
          url: 'https://github.com/org/existing-repo'
        })
      });
      const options = createOptions({ provider });

      // With token: discovery menu -> manual
      mockSelect.mockResolvedValueOnce('manual');
      // Owner for discovery section (already in discovery)
      // Falls through to manual - but owner not set yet since discoveryStrategy was manual from start
      // Actually, if user selects 'manual' from the discovery menu, it skips to manual flow,
      // and owner is '' so it asks for owner again
      mockInput
        .mockResolvedValueOnce('org')           // Owner
        .mockResolvedValueOnce('existing-repo') // Repo 1 name
        .mockResolvedValueOnce('Existing')      // Repo 1 description
        .mockResolvedValueOnce('new-repo')      // Repo 2 name
        .mockResolvedValueOnce('New service');   // Repo 2 description
      mockNumber.mockResolvedValueOnce(2);
      // existing-repo: repoAlreadyExists=true -> no create prompt
      // new-repo: repoAlreadyExists=true (same mock) -> no create prompt
      // Both skip createOnGitHub since all exist

      const result = await configureMultiRepo(options);

      expect(result.repositories[0].createOnGitHub).toBe(false);
      expect(result.repositories[1].createOnGitHub).toBe(false);
    });
  });
});
