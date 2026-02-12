/**
 * Unit tests for Repository Bulk Discovery
 *
 * Tests pattern matching, regex filtering, repository fetching,
 * and the main discovery flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock external dependencies with vi.hoisted
const { mockSelect, mockInput, mockConfirm, mockMinimatch } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInput: vi.fn(),
  mockConfirm: vi.fn(),
  mockMinimatch: vi.fn((name: string, pattern: string) => {
    // Minimal glob matching for tests
    if (pattern === '*') return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return name.startsWith(prefix);
    }
    if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1);
      return name.endsWith(suffix);
    }
    return name === pattern;
  })
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
  confirm: mockConfirm
}));

vi.mock('minimatch', () => ({
  minimatch: mockMinimatch
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

// Import after mocks are set up
import { discoverRepositories, type DiscoveredRepo, type BulkDiscoveryResult } from '../../../../src/core/repo-structure/repo-bulk-discovery.js';

// Helper to create a mock Octokit instance
function createMockOctokit(repoData: any[] = []) {
  return {
    repos: {
      listForOrg: vi.fn().mockResolvedValue({ data: repoData }),
      listForAuthenticatedUser: vi.fn().mockResolvedValue({ data: repoData })
    }
  } as any;
}

// Helper to create mock repo data
function createMockRepo(overrides: Partial<any> = {}) {
  return {
    name: 'test-repo',
    full_name: 'owner/test-repo',
    owner: { login: 'owner' },
    description: 'A test repo',
    private: false,
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  };
}

describe('repo-bulk-discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('discoverRepositories', () => {
    it('should return manual strategy when user selects manual', async () => {
      mockSelect.mockResolvedValueOnce('manual');

      const octokit = createMockOctokit();
      const result = await discoverRepositories(octokit, 'myorg', true, 0);

      expect(result).toEqual({
        repositories: [],
        strategy: 'manual'
      });
    });

    it('should return greenfield strategy when user selects greenfield', async () => {
      mockSelect.mockResolvedValueOnce('greenfield');

      const octokit = createMockOctokit();
      const result = await discoverRepositories(octokit, 'myorg', true, 0);

      expect(result).toEqual({
        repositories: [],
        strategy: 'greenfield'
      });
    });

    it('should discover all repos for organization owner', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'myorg/repo-a' }),
        createMockRepo({ name: 'repo-b', full_name: 'myorg/repo-b' })
      ];
      const octokit = createMockOctokit(repos);

      // Select all-repos strategy
      mockSelect
        .mockResolvedValueOnce('all-repos')
        // Confirm selection
        .mockResolvedValueOnce('yes');

      const result = await discoverRepositories(octokit, 'myorg', true, 0, { skipValidation: true });

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe('all-repos');
      expect(result!.repositories).toHaveLength(2);
      expect(result!.source).toBe('org:myorg');
      expect(octokit.repos.listForOrg).toHaveBeenCalledWith(
        expect.objectContaining({ org: 'myorg', per_page: 100 })
      );
    });

    it('should discover all repos for personal owner', async () => {
      const repos = [
        createMockRepo({ name: 'personal-repo', full_name: 'user/personal-repo', owner: { login: 'user' } })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('all-repos')
        .mockResolvedValueOnce('yes');

      const result = await discoverRepositories(octokit, 'user', false, 0, { skipValidation: true });

      expect(result).not.toBeNull();
      expect(result!.source).toBe('personal');
      expect(octokit.repos.listForAuthenticatedUser).toHaveBeenCalled();
    });

    it('should return null when no repos found', async () => {
      const octokit = createMockOctokit([]);

      mockSelect.mockResolvedValueOnce('all-repos');

      const result = await discoverRepositories(octokit, 'empty-org', true, 0);

      expect(result).toBeNull();
    });

    it('should filter repos by pattern strategy', async () => {
      const repos = [
        createMockRepo({ name: 'sw-frontend', full_name: 'myorg/sw-frontend' }),
        createMockRepo({ name: 'sw-backend', full_name: 'myorg/sw-backend' }),
        createMockRepo({ name: 'other-repo', full_name: 'myorg/other-repo' })
      ];
      const octokit = createMockOctokit(repos);

      // Pattern matching using 'starts:sw-'
      mockSelect
        .mockResolvedValueOnce('pattern')
        .mockResolvedValueOnce('yes');
      mockInput.mockResolvedValueOnce('starts:sw-');

      // minimatch won't be called for 'starts:' prefix - handled by filterByPattern directly
      const result = await discoverRepositories(octokit, 'myorg', true, 0, { skipValidation: true });

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe('pattern');
      expect(result!.repositories).toHaveLength(2);
      expect(result!.pattern).toBe('starts:sw-');
    });

    it('should filter repos by ends: pattern', async () => {
      const repos = [
        createMockRepo({ name: 'project-api', full_name: 'myorg/project-api' }),
        createMockRepo({ name: 'project-web', full_name: 'myorg/project-web' }),
        createMockRepo({ name: 'project-api-docs', full_name: 'myorg/project-api-docs' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('pattern')
        .mockResolvedValueOnce('yes');
      mockInput.mockResolvedValueOnce('ends:-api');

      const result = await discoverRepositories(octokit, 'myorg', true, 0, { skipValidation: true });

      expect(result).not.toBeNull();
      expect(result!.repositories).toHaveLength(1);
      expect(result!.repositories[0].name).toBe('project-api');
    });

    it('should filter repos by contains: pattern', async () => {
      const repos = [
        createMockRepo({ name: 'my-app-frontend', full_name: 'org/my-app-frontend' }),
        createMockRepo({ name: 'my-app-backend', full_name: 'org/my-app-backend' }),
        createMockRepo({ name: 'other-tool', full_name: 'org/other-tool' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('pattern')
        .mockResolvedValueOnce('yes');
      mockInput.mockResolvedValueOnce('contains:app');

      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).not.toBeNull();
      expect(result!.repositories).toHaveLength(2);
    });

    it('should auto-expand plain pattern to prefix match', async () => {
      const repos = [
        createMockRepo({ name: 'sw-app', full_name: 'org/sw-app' }),
        createMockRepo({ name: 'sw-lib', full_name: 'org/sw-lib' }),
        createMockRepo({ name: 'other', full_name: 'org/other' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('pattern')
        .mockResolvedValueOnce('yes');
      mockInput.mockResolvedValueOnce('sw-');

      // minimatch will be called with auto-expanded pattern "sw-*"
      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).not.toBeNull();
      expect(mockMinimatch).toHaveBeenCalled();
    });

    it('should filter repos by regex strategy', async () => {
      const repos = [
        createMockRepo({ name: 'ec-auth-api', full_name: 'org/ec-auth-api' }),
        createMockRepo({ name: 'ec-payment-api', full_name: 'org/ec-payment-api' }),
        createMockRepo({ name: 'ec-frontend', full_name: 'org/ec-frontend' }),
        createMockRepo({ name: 'unrelated', full_name: 'org/unrelated' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('regex')
        .mockResolvedValueOnce('yes');
      mockInput.mockResolvedValueOnce('^ec-.*-api$');

      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe('regex');
      expect(result!.repositories).toHaveLength(2);
      expect(result!.pattern).toBe('^ec-.*-api$');
    });

    it('should handle invalid regex and allow retry', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        // First: regex strategy
        .mockResolvedValueOnce('regex')
        // Error recovery: choose manual
        .mockResolvedValueOnce('manual');
      mockInput.mockResolvedValueOnce('[invalid(regex');

      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).toEqual({ repositories: [], strategy: 'manual' });
    });

    it('should handle zero results from pattern and let user retry', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        // First: pattern strategy
        .mockResolvedValueOnce('pattern')
        // Zero results: user picks manual
        .mockResolvedValueOnce('manual');
      mockInput.mockResolvedValueOnce('starts:nonexistent-');

      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).toEqual({ repositories: [], strategy: 'manual' });
    });

    it('should handle zero results and let user pick greenfield', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('pattern')
        .mockResolvedValueOnce('greenfield');
      mockInput.mockResolvedValueOnce('starts:nonexistent-');

      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).toEqual({ repositories: [], strategy: 'greenfield' });
    });

    it('should allow going back to change strategy from confirmation step', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        // First: all-repos
        .mockResolvedValueOnce('all-repos')
        // Confirmation: go back
        .mockResolvedValueOnce('change-strategy')
        // Second attempt: manual
        .mockResolvedValueOnce('manual');

      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).toEqual({ repositories: [], strategy: 'manual' });
    });

    it('should switch to manual from confirmation step', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('all-repos')
        // Confirmation: switch to manual
        .mockResolvedValueOnce('manual');

      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).toEqual({ repositories: [], strategy: 'manual' });
    });

    it('should use cached repos when retrying with different strategy', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' }),
        createMockRepo({ name: 'repo-b', full_name: 'org/repo-b' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        // First: all-repos
        .mockResolvedValueOnce('all-repos')
        // Go back
        .mockResolvedValueOnce('change-strategy')
        // Second: all-repos again (uses cache)
        .mockResolvedValueOnce('all-repos')
        // Confirm
        .mockResolvedValueOnce('yes');

      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).not.toBeNull();
      expect(result!.repositories).toHaveLength(2);
      // listForOrg should have been called only once (second time uses cache)
      expect(octokit.repos.listForOrg).toHaveBeenCalledTimes(1);
    });

    it('should validate count when skipValidation is false and counts differ', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' }),
        createMockRepo({ name: 'repo-b', full_name: 'org/repo-b' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('all-repos')
        // Count mismatch: use discovered
        .mockResolvedValueOnce('use-discovered')
        // Confirm
        .mockResolvedValueOnce('yes');

      const result = await discoverRepositories(octokit, 'org', true, 5, { skipValidation: false });

      expect(result).not.toBeNull();
      expect(result!.repositories).toHaveLength(2);
    });

    it('should allow manual switch when count validation fails', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('all-repos')
        // Count mismatch: switch to manual
        .mockResolvedValueOnce('manual');

      const result = await discoverRepositories(octokit, 'org', true, 5, { skipValidation: false });

      expect(result).toEqual({ repositories: [], strategy: 'manual' });
    });

    it('should handle pagination with 100+ repos', async () => {
      // Create 100 repos for first page (triggers pagination)
      const page1Repos = Array.from({ length: 100 }, (_, i) =>
        createMockRepo({ name: `repo-${i}`, full_name: `org/repo-${i}` })
      );
      const page2Repos = [
        createMockRepo({ name: 'repo-100', full_name: 'org/repo-100' })
      ];

      const octokit = {
        repos: {
          listForOrg: vi.fn()
            .mockResolvedValueOnce({ data: page1Repos })
            .mockResolvedValueOnce({ data: page2Repos }),
          listForAuthenticatedUser: vi.fn()
        }
      } as any;

      mockSelect
        .mockResolvedValueOnce('all-repos')
        .mockResolvedValueOnce('yes');

      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).not.toBeNull();
      expect(result!.repositories).toHaveLength(101);
      expect(octokit.repos.listForOrg).toHaveBeenCalledTimes(2);
    });

    it('should handle fetch error gracefully', async () => {
      const octokit = {
        repos: {
          listForOrg: vi.fn().mockRejectedValueOnce(new Error('API rate limit')),
          listForAuthenticatedUser: vi.fn()
        }
      } as any;

      mockSelect.mockResolvedValueOnce('all-repos');

      const result = await discoverRepositories(octokit, 'org', true, 0);

      // Returns null because 0 repos found after error
      expect(result).toBeNull();
    });

    it('should map discovered repos correctly', async () => {
      const repos = [
        createMockRepo({
          name: 'my-service',
          full_name: 'myorg/my-service',
          owner: { login: 'myorg' },
          description: 'My awesome service',
          private: true,
          updated_at: '2024-06-15T10:00:00Z'
        })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('all-repos')
        .mockResolvedValueOnce('yes');

      const result = await discoverRepositories(octokit, 'myorg', true, 0, { skipValidation: true });

      expect(result).not.toBeNull();
      const discovered = result!.repositories[0];
      expect(discovered.name).toBe('my-service');
      expect(discovered.full_name).toBe('myorg/my-service');
      expect(discovered.owner).toBe('myorg');
      expect(discovered.description).toBe('My awesome service');
      expect(discovered.private).toBe(true);
      expect(discovered.updated_at).toBe('2024-06-15T10:00:00Z');
    });

    it('should skip pattern filtering for regex-like patterns in filterByPattern', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' }),
        createMockRepo({ name: 'repo-b', full_name: 'org/repo-b' })
      ];
      const octokit = createMockOctokit(repos);

      // Use a pattern that starts with ^ (regex-like)
      mockSelect
        .mockResolvedValueOnce('pattern')
        .mockResolvedValueOnce('yes');
      mockInput.mockResolvedValueOnce('^repo');

      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).not.toBeNull();
      // Regex-like patterns are returned unfiltered from filterByPattern
      expect(result!.repositories).toHaveLength(2);
    });

    it('should handle retry from regex error to retry', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        // First: regex
        .mockResolvedValueOnce('regex')
        // Error: retry
        .mockResolvedValueOnce('retry')
        // Second: manual
        .mockResolvedValueOnce('manual');
      mockInput.mockResolvedValueOnce('[invalid');

      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).toEqual({ repositories: [], strategy: 'manual' });
    });

    it('should handle change-strategy from count validation', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('all-repos')
        // Count mismatch: go back
        .mockResolvedValueOnce('change-strategy')
        // New strategy: manual
        .mockResolvedValueOnce('manual');

      const result = await discoverRepositories(octokit, 'org', true, 5, { skipValidation: false });

      expect(result).toEqual({ repositories: [], strategy: 'manual' });
    });

    it('should handle zero results retry loop back to strategy', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('pattern')
        // Zero results: retry
        .mockResolvedValueOnce('retry')
        // New strategy: manual
        .mockResolvedValueOnce('manual');
      mockInput.mockResolvedValueOnce('starts:nonexistent-');

      const result = await discoverRepositories(octokit, 'org', true, 0, { skipValidation: true });

      expect(result).toEqual({ repositories: [], strategy: 'manual' });
    });

    it('should skip count validation when skipValidation is true', async () => {
      const repos = [
        createMockRepo({ name: 'repo-a', full_name: 'org/repo-a' })
      ];
      const octokit = createMockOctokit(repos);

      mockSelect
        .mockResolvedValueOnce('all-repos')
        .mockResolvedValueOnce('yes');

      // With skipValidation true, even with expectedCount mismatch it should not ask
      const result = await discoverRepositories(octokit, 'org', true, 10, { skipValidation: true });

      expect(result).not.toBeNull();
      expect(result!.repositories).toHaveLength(1);
      // Only 2 selects: strategy + confirmation (no count validation select)
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });
});
