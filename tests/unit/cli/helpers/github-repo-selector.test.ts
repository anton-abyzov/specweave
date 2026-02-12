/**
 * Unit Tests: GitHub Repository Selector
 *
 * Tests fetchUserOrganizations, fetchOrgRepositories, fetchPersonalRepositories,
 * filterRepositoriesByPattern, filterRepositoriesByRegex, validateRepositoryAccess,
 * showRepositoryPreview, and the interactive selectRepositories flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockSelect,
  mockInput,
  mockConfirm,
  mockMinimatch,
  mockParsePatternShortcut,
  mockValidateRegex,
  mockOctokitOrgsListForAuthenticatedUser,
  mockOctokitReposListForOrg,
  mockOctokitReposListForAuthenticatedUser,
  mockOctokitReposGet,
  mockOctokitUsersGetAuthenticated,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInput: vi.fn(),
  mockConfirm: vi.fn(),
  mockMinimatch: vi.fn(),
  mockParsePatternShortcut: vi.fn((input: string) => input),
  mockValidateRegex: vi.fn(() => true as true | string),
  mockOctokitOrgsListForAuthenticatedUser: vi.fn(),
  mockOctokitReposListForOrg: vi.fn(),
  mockOctokitReposListForAuthenticatedUser: vi.fn(),
  mockOctokitReposGet: vi.fn(),
  mockOctokitUsersGetAuthenticated: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
  confirm: mockConfirm,
}));

vi.mock('minimatch', () => ({
  minimatch: mockMinimatch,
}));

vi.mock('chalk', () => {
  const passthrough = (s: string) => s;
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'default') return new Proxy(passthrough, handler);
      return passthrough;
    },
    apply(_target, _thisArg, args) {
      return args[0];
    },
  };
  return { default: new Proxy(passthrough, handler) };
});

vi.mock('../../../../src/cli/helpers/selection-strategy.js', () => ({
  parsePatternShortcut: mockParsePatternShortcut,
  validateRegex: mockValidateRegex,
}));

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------

import {
  fetchUserOrganizations,
  fetchOrgRepositories,
  fetchPersonalRepositories,
  filterRepositoriesByPattern,
  filterRepositoriesByRegex,
  validateRepositoryAccess,
  showRepositoryPreview,
  selectRepositories,
  type GitHubRepo,
} from '../../../../src/cli/helpers/github-repo-selector.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOctokit() {
  return {
    orgs: {
      listForAuthenticatedUser: mockOctokitOrgsListForAuthenticatedUser,
    },
    repos: {
      listForOrg: mockOctokitReposListForOrg,
      listForAuthenticatedUser: mockOctokitReposListForAuthenticatedUser,
      get: mockOctokitReposGet,
    },
    users: {
      getAuthenticated: mockOctokitUsersGetAuthenticated,
    },
  } as any;
}

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    owner: { login: 'testuser', type: 'User' },
    private: false,
    updated_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

function makeRepos(count: number, prefix = 'repo'): GitHubRepo[] {
  return Array.from({ length: count }, (_, i) =>
    makeRepo({
      name: `${prefix}-${i}`,
      full_name: `testuser/${prefix}-${i}`,
    })
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('github-repo-selector', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default parsePatternShortcut: passthrough
    mockParsePatternShortcut.mockImplementation((input: string) => input);

    // Default minimatch: simple glob simulation
    mockMinimatch.mockImplementation((value: string, pattern: string, _opts: any) => {
      const regexStr = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
      return new RegExp(`^${regexStr}$`, 'i').test(value);
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // =========================================================================
  // fetchUserOrganizations
  // =========================================================================

  describe('fetchUserOrganizations', () => {
    it('should return organization login names', async () => {
      mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({
        data: [{ login: 'org-a' }, { login: 'org-b' }, { login: 'org-c' }],
      });

      const result = await fetchUserOrganizations(makeOctokit());

      expect(result).toEqual(['org-a', 'org-b', 'org-c']);
    });

    it('should pass per_page: 100 to the API call', async () => {
      mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });

      await fetchUserOrganizations(makeOctokit());

      expect(mockOctokitOrgsListForAuthenticatedUser).toHaveBeenCalledWith({
        per_page: 100,
      });
    });

    it('should return empty array when no organizations exist', async () => {
      mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });

      const result = await fetchUserOrganizations(makeOctokit());

      expect(result).toEqual([]);
    });

    it('should return empty array on API error', async () => {
      mockOctokitOrgsListForAuthenticatedUser.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      const result = await fetchUserOrganizations(makeOctokit());

      expect(result).toEqual([]);
    });

    it('should log warning on API error', async () => {
      mockOctokitOrgsListForAuthenticatedUser.mockRejectedValue(
        new Error('Network failure')
      );

      await fetchUserOrganizations(makeOctokit());

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorMsg = consoleErrorSpy.mock.calls[0].join(' ');
      expect(errorMsg).toContain('Failed to fetch organizations');
    });

    it('should handle non-Error thrown values', async () => {
      mockOctokitOrgsListForAuthenticatedUser.mockRejectedValue('string error');

      const result = await fetchUserOrganizations(makeOctokit());

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // fetchOrgRepositories
  // =========================================================================

  describe('fetchOrgRepositories', () => {
    it('should fetch repositories for a given org', async () => {
      mockOctokitReposListForOrg.mockResolvedValue({
        data: [makeRepo({ name: 'repo-1' }), makeRepo({ name: 'repo-2' })],
      });

      const result = await fetchOrgRepositories(makeOctokit(), 'my-org');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('repo-1');
      expect(result[1].name).toBe('repo-2');
    });

    it('should pass org, per_page, and page to the API', async () => {
      mockOctokitReposListForOrg.mockResolvedValue({ data: [] });

      await fetchOrgRepositories(makeOctokit(), 'my-org');

      expect(mockOctokitReposListForOrg).toHaveBeenCalledWith({
        org: 'my-org',
        per_page: 100,
        page: 1,
      });
    });

    it('should paginate when API returns 100 results per page', async () => {
      const page1 = makeRepos(100, 'page1');
      const page2 = makeRepos(30, 'page2');

      mockOctokitReposListForOrg
        .mockResolvedValueOnce({ data: page1 })
        .mockResolvedValueOnce({ data: page2 });

      const result = await fetchOrgRepositories(makeOctokit(), 'my-org');

      expect(result).toHaveLength(130);
      expect(mockOctokitReposListForOrg).toHaveBeenCalledTimes(2);
      expect(mockOctokitReposListForOrg).toHaveBeenCalledWith({
        org: 'my-org',
        per_page: 100,
        page: 2,
      });
    });

    it('should stop paginating when API returns fewer than 100 results', async () => {
      mockOctokitReposListForOrg.mockResolvedValue({
        data: makeRepos(50),
      });

      await fetchOrgRepositories(makeOctokit(), 'my-org');

      expect(mockOctokitReposListForOrg).toHaveBeenCalledTimes(1);
    });

    it('should return empty array on API error', async () => {
      mockOctokitReposListForOrg.mockRejectedValue(new Error('Forbidden'));

      const result = await fetchOrgRepositories(makeOctokit(), 'my-org');

      expect(result).toEqual([]);
    });

    it('should log warning on API error', async () => {
      mockOctokitReposListForOrg.mockRejectedValue(new Error('Forbidden'));

      await fetchOrgRepositories(makeOctokit(), 'my-org');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorMsg = consoleErrorSpy.mock.calls[0].join(' ');
      expect(errorMsg).toContain('Failed to fetch repos for org my-org');
    });

    it('should return partial results if error occurs on second page', async () => {
      const page1 = makeRepos(100, 'page1');

      mockOctokitReposListForOrg
        .mockResolvedValueOnce({ data: page1 })
        .mockRejectedValueOnce(new Error('Timeout'));

      const result = await fetchOrgRepositories(makeOctokit(), 'my-org');

      expect(result).toHaveLength(100);
    });

    it('should handle non-Error thrown values', async () => {
      mockOctokitReposListForOrg.mockRejectedValue('string error');

      const result = await fetchOrgRepositories(makeOctokit(), 'my-org');

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // fetchPersonalRepositories
  // =========================================================================

  describe('fetchPersonalRepositories', () => {
    it('should fetch personal repositories', async () => {
      mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
        data: [makeRepo({ name: 'personal-1' }), makeRepo({ name: 'personal-2' })],
      });

      const result = await fetchPersonalRepositories(makeOctokit());

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('personal-1');
    });

    it('should pass affiliation owner, per_page, and page to the API', async () => {
      mockOctokitReposListForAuthenticatedUser.mockResolvedValue({ data: [] });

      await fetchPersonalRepositories(makeOctokit());

      expect(mockOctokitReposListForAuthenticatedUser).toHaveBeenCalledWith({
        affiliation: 'owner',
        per_page: 100,
        page: 1,
      });
    });

    it('should paginate when API returns 100 results per page', async () => {
      const page1 = makeRepos(100, 'p1');
      const page2 = makeRepos(25, 'p2');

      mockOctokitReposListForAuthenticatedUser
        .mockResolvedValueOnce({ data: page1 })
        .mockResolvedValueOnce({ data: page2 });

      const result = await fetchPersonalRepositories(makeOctokit());

      expect(result).toHaveLength(125);
      expect(mockOctokitReposListForAuthenticatedUser).toHaveBeenCalledTimes(2);
    });

    it('should stop paginating when API returns fewer than 100 results', async () => {
      mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
        data: makeRepos(42),
      });

      await fetchPersonalRepositories(makeOctokit());

      expect(mockOctokitReposListForAuthenticatedUser).toHaveBeenCalledTimes(1);
    });

    it('should return empty array on API error', async () => {
      mockOctokitReposListForAuthenticatedUser.mockRejectedValue(
        new Error('Unauthorized')
      );

      const result = await fetchPersonalRepositories(makeOctokit());

      expect(result).toEqual([]);
    });

    it('should log warning on API error', async () => {
      mockOctokitReposListForAuthenticatedUser.mockRejectedValue(
        new Error('Token expired')
      );

      await fetchPersonalRepositories(makeOctokit());

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorMsg = consoleErrorSpy.mock.calls[0].join(' ');
      expect(errorMsg).toContain('Failed to fetch personal repos');
    });

    it('should return partial results if error occurs on second page', async () => {
      const page1 = makeRepos(100, 'p1');

      mockOctokitReposListForAuthenticatedUser
        .mockResolvedValueOnce({ data: page1 })
        .mockRejectedValueOnce(new Error('Timeout'));

      const result = await fetchPersonalRepositories(makeOctokit());

      expect(result).toHaveLength(100);
    });

    it('should handle non-Error thrown values', async () => {
      mockOctokitReposListForAuthenticatedUser.mockRejectedValue(42);

      const result = await fetchPersonalRepositories(makeOctokit());

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // filterRepositoriesByPattern
  // =========================================================================

  describe('filterRepositoriesByPattern', () => {
    const repos: GitHubRepo[] = [
      makeRepo({ name: 'ec-frontend' }),
      makeRepo({ name: 'ec-backend' }),
      makeRepo({ name: 'other-service' }),
      makeRepo({ name: 'api-gateway' }),
    ];

    it('should filter repos matching a glob pattern', () => {
      mockParsePatternShortcut.mockReturnValue('ec-*');

      const result = filterRepositoriesByPattern(repos, 'ec-*');

      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toEqual(['ec-frontend', 'ec-backend']);
    });

    it('should call parsePatternShortcut with the given pattern', () => {
      mockParsePatternShortcut.mockReturnValue('ec-*');

      filterRepositoriesByPattern(repos, 'starts: ec-');

      expect(mockParsePatternShortcut).toHaveBeenCalledWith('starts: ec-');
    });

    it('should call minimatch with nocase: true', () => {
      mockParsePatternShortcut.mockReturnValue('*');

      filterRepositoriesByPattern(repos, '*');

      expect(mockMinimatch).toHaveBeenCalledWith(
        expect.any(String),
        '*',
        expect.objectContaining({ nocase: true })
      );
    });

    it('should match against repo.name, not full_name', () => {
      mockParsePatternShortcut.mockReturnValue('ec-frontend');
      mockMinimatch.mockImplementation((value: string, _pattern: string) => {
        return value === 'ec-frontend';
      });

      const result = filterRepositoriesByPattern(repos, 'ec-frontend');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ec-frontend');
    });

    it('should return empty array when no repos match', () => {
      mockParsePatternShortcut.mockReturnValue('nonexistent-*');

      const result = filterRepositoriesByPattern(repos, 'nonexistent-*');

      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty repos input', () => {
      mockParsePatternShortcut.mockReturnValue('*');

      const result = filterRepositoriesByPattern([], '*');

      expect(result).toHaveLength(0);
    });

    it('should filter using suffix pattern', () => {
      mockParsePatternShortcut.mockReturnValue('*-service');

      const result = filterRepositoriesByPattern(repos, '*-service');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('other-service');
    });
  });

  // =========================================================================
  // filterRepositoriesByRegex
  // =========================================================================

  describe('filterRepositoriesByRegex', () => {
    const repos: GitHubRepo[] = [
      makeRepo({ name: 'ec-frontend' }),
      makeRepo({ name: 'ec-backend' }),
      makeRepo({ name: 'other-service' }),
      makeRepo({ name: 'api-gateway' }),
    ];

    it('should filter repos matching a regex prefix pattern', () => {
      const result = filterRepositoriesByRegex(repos, '^ec-');

      expect(result.items).toHaveLength(2);
      expect(result.items.map(r => r.name)).toEqual(['ec-frontend', 'ec-backend']);
      expect(result.error).toBeUndefined();
    });

    it('should filter repos matching a regex suffix pattern', () => {
      const result = filterRepositoriesByRegex(repos, '-service$');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('other-service');
    });

    it('should be case-insensitive', () => {
      const result = filterRepositoriesByRegex(repos, '^EC-');

      expect(result.items).toHaveLength(2);
    });

    it('should return error for invalid regex', () => {
      const result = filterRepositoriesByRegex(repos, '[invalid');

      expect(result.items).toHaveLength(0);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should return empty items for no matches with valid regex', () => {
      const result = filterRepositoriesByRegex(repos, '^zzz');

      expect(result.items).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle empty repos array', () => {
      const result = filterRepositoriesByRegex([], '^ec');

      expect(result.items).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle complex regex patterns', () => {
      const result = filterRepositoriesByRegex(repos, '^(ec|api)-');

      expect(result.items).toHaveLength(3);
    });

    it('should match against repo.name', () => {
      const result = filterRepositoriesByRegex(repos, 'gateway');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('api-gateway');
    });

    it('should handle non-Error thrown from RegExp', () => {
      // Invalid regex always throws Error, but we verify the function never crashes
      const result = filterRepositoriesByRegex(repos, '*bad');

      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  // =========================================================================
  // validateRepositoryAccess
  // =========================================================================

  describe('validateRepositoryAccess', () => {
    it('should return true when repo is accessible', async () => {
      mockOctokitReposGet.mockResolvedValue({ data: makeRepo() });

      const result = await validateRepositoryAccess(makeOctokit(), 'owner', 'repo');

      expect(result).toBe(true);
    });

    it('should pass owner and repo to the API', async () => {
      mockOctokitReposGet.mockResolvedValue({ data: makeRepo() });

      await validateRepositoryAccess(makeOctokit(), 'my-owner', 'my-repo');

      expect(mockOctokitReposGet).toHaveBeenCalledWith({
        owner: 'my-owner',
        repo: 'my-repo',
      });
    });

    it('should return false when repo is not accessible', async () => {
      mockOctokitReposGet.mockRejectedValue(new Error('Not Found'));

      const result = await validateRepositoryAccess(makeOctokit(), 'owner', 'nonexistent');

      expect(result).toBe(false);
    });

    it('should return false on any error', async () => {
      mockOctokitReposGet.mockRejectedValue(new Error('Forbidden'));

      const result = await validateRepositoryAccess(makeOctokit(), 'owner', 'private-repo');

      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // showRepositoryPreview
  // =========================================================================

  describe('showRepositoryPreview', () => {
    it('should log repo information to console', () => {
      const repos = [makeRepo({ name: 'my-repo', owner: { login: 'alice', type: 'User' }, private: false })];

      showRepositoryPreview(repos);

      expect(consoleLogSpy).toHaveBeenCalled();
      const allOutput = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(allOutput).toContain('my-repo');
    });

    it('should display at most 20 repositories', () => {
      const repos = makeRepos(25);

      showRepositoryPreview(repos);

      // Count how many repo lines are logged (exclude header, separator, etc.)
      const allOutput = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(allOutput).toContain('and 5 more repositories');
    });

    it('should not show "more" message when repos <= 20', () => {
      const repos = makeRepos(5);

      showRepositoryPreview(repos);

      const allOutput = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(allOutput).not.toContain('more repositories');
    });

    it('should display visibility as private or public', () => {
      const repos = [
        makeRepo({ name: 'pub-repo', private: false }),
        makeRepo({ name: 'priv-repo', private: true }),
      ];

      showRepositoryPreview(repos);

      const allOutput = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(allOutput).toContain('public');
      expect(allOutput).toContain('private');
    });

    it('should display owner login', () => {
      const repos = [makeRepo({ owner: { login: 'org-name', type: 'Organization' } })];

      showRepositoryPreview(repos);

      const allOutput = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(allOutput).toContain('org-name');
    });

    it('should handle empty repos array', () => {
      showRepositoryPreview([]);

      // Should not throw, just log the header
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // selectRepositories
  // =========================================================================

  describe('selectRepositories', () => {
    const octokit = makeOctokit();
    const githubToken = 'ghp_test123';

    // -----------------------------------------------------------------------
    // Strategy: all-org
    // -----------------------------------------------------------------------

    describe('strategy: all-org', () => {
      it('should fetch and return all org repos when confirmed', async () => {
        const orgRepos = [
          makeRepo({ name: 'org-repo-1', full_name: 'my-org/org-repo-1' }),
          makeRepo({ name: 'org-repo-2', full_name: 'my-org/org-repo-2' }),
        ];

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({
          data: [{ login: 'my-org' }],
        });
        mockSelect
          .mockResolvedValueOnce('all-org')    // strategy selection
          .mockResolvedValueOnce('my-org');     // org selection
        mockOctokitReposListForOrg.mockResolvedValue({ data: orgRepos });
        mockConfirm.mockResolvedValue(true);

        const result = await selectRepositories(octokit, githubToken);

        expect(result).not.toBeNull();
        expect(result!.selectionStrategy).toBe('all-org');
        expect(result!.organizationName).toBe('my-org');
        expect(result!.repositories).toEqual(['my-org/org-repo-1', 'my-org/org-repo-2']);
      });

      it('should disable all-org when no organizations exist', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('all-personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: [makeRepo({ name: 'personal', full_name: 'user/personal' })],
        });
        mockConfirm.mockResolvedValue(true);

        await selectRepositories(octokit, githubToken);

        // Verify the first select call has all-org disabled
        const firstSelectCall = mockSelect.mock.calls[0][0];
        const allOrgChoice = firstSelectCall.choices.find(
          (c: any) => c.value === 'all-org'
        );
        expect(allOrgChoice.disabled).toBe('No organizations found');
      });

      it('should default to all-org when orgs exist', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({
          data: [{ login: 'my-org' }],
        });
        mockSelect
          .mockResolvedValueOnce('all-org')
          .mockResolvedValueOnce('my-org');
        mockOctokitReposListForOrg.mockResolvedValue({ data: [] });
        mockConfirm.mockResolvedValue(true);

        await selectRepositories(octokit, githubToken);

        const firstSelectCall = mockSelect.mock.calls[0][0];
        expect(firstSelectCall.default).toBe('all-org');
      });
    });

    // -----------------------------------------------------------------------
    // Strategy: all-personal
    // -----------------------------------------------------------------------

    describe('strategy: all-personal', () => {
      it('should fetch and return all personal repos when confirmed', async () => {
        const personalRepos = [
          makeRepo({ name: 'my-project', full_name: 'user/my-project' }),
        ];

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('all-personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: personalRepos,
        });
        mockConfirm.mockResolvedValue(true);

        const result = await selectRepositories(octokit, githubToken);

        expect(result).not.toBeNull();
        expect(result!.selectionStrategy).toBe('all-personal');
        expect(result!.repositories).toEqual(['user/my-project']);
      });

      it('should default to all-personal when no orgs exist', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('all-personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: [makeRepo({ full_name: 'user/r' })],
        });
        mockConfirm.mockResolvedValue(true);

        await selectRepositories(octokit, githubToken);

        const firstSelectCall = mockSelect.mock.calls[0][0];
        expect(firstSelectCall.default).toBe('all-personal');
      });
    });

    // -----------------------------------------------------------------------
    // Strategy: pattern-glob
    // -----------------------------------------------------------------------

    describe('strategy: pattern-glob', () => {
      it('should filter personal repos by glob pattern', async () => {
        const allRepos = [
          makeRepo({ name: 'ec-frontend', full_name: 'user/ec-frontend' }),
          makeRepo({ name: 'ec-backend', full_name: 'user/ec-backend' }),
          makeRepo({ name: 'other', full_name: 'user/other' }),
        ];

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect
          .mockResolvedValueOnce('pattern-glob')
          .mockResolvedValueOnce('personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({ data: allRepos });
        mockParsePatternShortcut.mockReturnValue('ec-*');
        mockInput.mockResolvedValue('ec-*');
        mockConfirm.mockResolvedValue(true);

        const result = await selectRepositories(octokit, githubToken);

        expect(result).not.toBeNull();
        expect(result!.selectionStrategy).toBe('pattern-glob');
        expect(result!.repositories).toEqual(['user/ec-frontend', 'user/ec-backend']);
        expect(result!.pattern).toBe('ec-*');
      });

      it('should filter org repos by glob pattern', async () => {
        const orgRepos = [
          makeRepo({ name: 'api-v1', full_name: 'org/api-v1' }),
          makeRepo({ name: 'api-v2', full_name: 'org/api-v2' }),
          makeRepo({ name: 'web-app', full_name: 'org/web-app' }),
        ];

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({
          data: [{ login: 'my-org' }],
        });
        mockSelect
          .mockResolvedValueOnce('pattern-glob')
          .mockResolvedValueOnce('org:my-org');
        mockOctokitReposListForOrg.mockResolvedValue({ data: orgRepos });
        mockParsePatternShortcut.mockReturnValue('api-*');
        mockInput.mockResolvedValue('api-*');
        mockConfirm.mockResolvedValue(true);

        const result = await selectRepositories(octokit, githubToken);

        expect(result).not.toBeNull();
        expect(result!.organizationName).toBe('my-org');
        expect(result!.repositories).toEqual(['org/api-v1', 'org/api-v2']);
      });

      it('should return null when no repos match and user declines retry', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect
          .mockResolvedValueOnce('pattern-glob')
          .mockResolvedValueOnce('personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: [makeRepo({ name: 'something' })],
        });
        mockParsePatternShortcut.mockReturnValue('nonexistent-*');
        mockInput.mockResolvedValue('nonexistent-*');
        mockConfirm.mockResolvedValue(false); // decline retry

        const result = await selectRepositories(octokit, githubToken);

        expect(result).toBeNull();
      });

      it('should retry recursively when no repos match and user accepts retry', async () => {
        const repos = [
          makeRepo({ name: 'ec-web', full_name: 'user/ec-web' }),
        ];

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });

        let selectCallCount = 0;
        mockSelect.mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return 'pattern-glob';
          if (selectCallCount === 2) return 'personal';
          // Retry: second round
          if (selectCallCount === 3) return 'all-personal';
          return 'all-personal';
        });

        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({ data: repos });

        let inputCallCount = 0;
        mockInput.mockImplementation(() => {
          inputCallCount++;
          return 'nonexistent-*';
        });

        mockParsePatternShortcut.mockReturnValue('nonexistent-*');

        mockConfirm
          .mockResolvedValueOnce(true)   // retry
          .mockResolvedValueOnce(true);  // confirm final selection

        const result = await selectRepositories(octokit, githubToken);

        expect(result).not.toBeNull();
        expect(result!.selectionStrategy).toBe('all-personal');
      });
    });

    // -----------------------------------------------------------------------
    // Strategy: pattern-regex
    // -----------------------------------------------------------------------

    describe('strategy: pattern-regex', () => {
      it('should filter personal repos by regex pattern', async () => {
        const allRepos = [
          makeRepo({ name: 'ec-frontend', full_name: 'user/ec-frontend' }),
          makeRepo({ name: 'ec-backend', full_name: 'user/ec-backend' }),
          makeRepo({ name: 'other', full_name: 'user/other' }),
        ];

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect
          .mockResolvedValueOnce('pattern-regex')
          .mockResolvedValueOnce('personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({ data: allRepos });
        mockInput.mockResolvedValue('^ec-');
        mockValidateRegex.mockReturnValue(true);
        mockConfirm.mockResolvedValue(true);

        const result = await selectRepositories(octokit, githubToken);

        expect(result).not.toBeNull();
        expect(result!.selectionStrategy).toBe('pattern-regex');
        expect(result!.isRegex).toBe(true);
        expect(result!.pattern).toBe('^ec-');
        expect(result!.repositories).toEqual(['user/ec-frontend', 'user/ec-backend']);
      });

      it('should filter org repos by regex pattern', async () => {
        const orgRepos = [
          makeRepo({ name: 'api-v1', full_name: 'org/api-v1' }),
          makeRepo({ name: 'web-app', full_name: 'org/web-app' }),
        ];

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({
          data: [{ login: 'my-org' }],
        });
        mockSelect
          .mockResolvedValueOnce('pattern-regex')
          .mockResolvedValueOnce('org:my-org');
        mockOctokitReposListForOrg.mockResolvedValue({ data: orgRepos });
        mockInput.mockResolvedValue('^api-');
        mockValidateRegex.mockReturnValue(true);
        mockConfirm.mockResolvedValue(true);

        const result = await selectRepositories(octokit, githubToken);

        expect(result).not.toBeNull();
        expect(result!.organizationName).toBe('my-org');
        expect(result!.repositories).toEqual(['org/api-v1']);
      });

      it('should return null when regex result has error', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect
          .mockResolvedValueOnce('pattern-regex')
          .mockResolvedValueOnce('personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: [makeRepo({ name: 'repo' })],
        });
        // The validate function uses validateRegex from selection-strategy.
        // But the actual filterRepositoriesByRegex in github-repo-selector uses
        // its own regex parsing. We need to return a pattern that passes validation
        // but then we intercept the actual filterRepositoriesByRegex behavior...
        // Actually filterRepositoriesByRegex creates its own RegExp, so if we
        // give it an invalid regex, it'll return an error.
        mockInput.mockResolvedValue('[invalid');
        mockValidateRegex.mockReturnValue(true); // validation passes (mocked)

        const result = await selectRepositories(octokit, githubToken);

        expect(result).toBeNull();
      });

      it('should return null when no repos match and user declines retry', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect
          .mockResolvedValueOnce('pattern-regex')
          .mockResolvedValueOnce('personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: [makeRepo({ name: 'something' })],
        });
        mockInput.mockResolvedValue('^zzz');
        mockValidateRegex.mockReturnValue(true);
        mockConfirm.mockResolvedValue(false); // decline retry

        const result = await selectRepositories(octokit, githubToken);

        expect(result).toBeNull();
      });

      it('should retry when no repos match regex and user accepts retry', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });

        let selectCallCount = 0;
        mockSelect.mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return 'pattern-regex';
          if (selectCallCount === 2) return 'personal';
          if (selectCallCount === 3) return 'all-personal';
          return 'all-personal';
        });

        const repos = [makeRepo({ name: 'my-repo', full_name: 'user/my-repo' })];
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({ data: repos });
        mockInput.mockResolvedValue('^zzz');
        mockValidateRegex.mockReturnValue(true);

        mockConfirm
          .mockResolvedValueOnce(true)   // retry
          .mockResolvedValueOnce(true);  // confirm final

        const result = await selectRepositories(octokit, githubToken);

        expect(result).not.toBeNull();
      });
    });

    // -----------------------------------------------------------------------
    // Strategy: explicit
    // -----------------------------------------------------------------------

    describe('strategy: explicit', () => {
      it('should validate and return accessible repos', async () => {
        const repoData = makeRepo({
          name: 'valid-repo',
          full_name: 'testuser/valid-repo',
        });

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('explicit');
        mockInput.mockResolvedValue('valid-repo');
        mockOctokitUsersGetAuthenticated.mockResolvedValue({
          data: { login: 'testuser' },
        });
        mockOctokitReposGet.mockResolvedValue({ data: repoData });
        mockConfirm.mockResolvedValue(true);

        const result = await selectRepositories(octokit, githubToken);

        expect(result).not.toBeNull();
        expect(result!.selectionStrategy).toBe('explicit');
        expect(result!.repositories).toEqual(['testuser/valid-repo']);
      });

      it('should handle multiple comma-separated repos', async () => {
        const repo1 = makeRepo({ name: 'repo-1', full_name: 'user/repo-1' });
        const repo2 = makeRepo({ name: 'repo-2', full_name: 'user/repo-2' });

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('explicit');
        mockInput.mockResolvedValue('repo-1, repo-2');
        mockOctokitUsersGetAuthenticated.mockResolvedValue({
          data: { login: 'user' },
        });
        mockOctokitReposGet
          .mockResolvedValueOnce({ data: repo1 })
          .mockResolvedValueOnce({ data: repo2 });
        mockConfirm.mockResolvedValue(true);

        const result = await selectRepositories(octokit, githubToken);

        expect(result).not.toBeNull();
        expect(result!.repositories).toEqual(['user/repo-1', 'user/repo-2']);
      });

      it('should skip inaccessible repos and include accessible ones', async () => {
        const repo1 = makeRepo({ name: 'accessible', full_name: 'user/accessible' });

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('explicit');
        mockInput.mockResolvedValue('accessible, inaccessible');
        mockOctokitUsersGetAuthenticated.mockResolvedValue({
          data: { login: 'user' },
        });
        mockOctokitReposGet
          .mockResolvedValueOnce({ data: repo1 })
          .mockRejectedValueOnce(new Error('Not Found'));
        mockConfirm.mockResolvedValue(true);

        const result = await selectRepositories(octokit, githubToken);

        expect(result).not.toBeNull();
        expect(result!.repositories).toEqual(['user/accessible']);
      });

      it('should log warning for inaccessible repos', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('explicit');
        mockInput.mockResolvedValue('bad-repo');
        mockOctokitUsersGetAuthenticated.mockResolvedValue({
          data: { login: 'user' },
        });
        mockOctokitReposGet.mockRejectedValue(new Error('Not Found'));
        // No confirm needed since all repos are inaccessible

        await selectRepositories(octokit, githubToken);

        const allOutput = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');
        expect(allOutput).toContain('Cannot access repository');
      });

      it('should return null when no accessible repos found', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('explicit');
        mockInput.mockResolvedValue('bad-1, bad-2');
        mockOctokitUsersGetAuthenticated.mockResolvedValue({
          data: { login: 'user' },
        });
        mockOctokitReposGet.mockRejectedValue(new Error('Not Found'));

        const result = await selectRepositories(octokit, githubToken);

        expect(result).toBeNull();
      });

      it('should filter empty entries from comma-separated input', async () => {
        const repo = makeRepo({ name: 'valid', full_name: 'user/valid' });

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('explicit');
        mockInput.mockResolvedValue('valid, , ,');
        mockOctokitUsersGetAuthenticated.mockResolvedValue({
          data: { login: 'user' },
        });
        mockOctokitReposGet.mockResolvedValue({ data: repo });
        mockConfirm.mockResolvedValue(true);

        const result = await selectRepositories(octokit, githubToken);

        expect(result).not.toBeNull();
        // Only 'valid' should be validated (empty strings filtered out)
        expect(mockOctokitReposGet).toHaveBeenCalledTimes(1);
      });
    });

    // -----------------------------------------------------------------------
    // Confirmation flow
    // -----------------------------------------------------------------------

    describe('confirmation flow', () => {
      it('should return null when user declines confirmation', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('all-personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: [makeRepo({ full_name: 'user/repo' })],
        });
        mockConfirm.mockResolvedValue(false); // decline

        const result = await selectRepositories(octokit, githubToken);

        expect(result).toBeNull();
      });

      it('should log cancellation message when user declines', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('all-personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: [makeRepo({ full_name: 'user/repo' })],
        });
        mockConfirm.mockResolvedValue(false);

        await selectRepositories(octokit, githubToken);

        const allOutput = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');
        expect(allOutput).toContain('Repository selection cancelled');
      });

      it('should log selected count on confirmation', async () => {
        const repos = makeRepos(3).map((r, i) => ({
          ...r,
          full_name: `user/repo-${i}`,
        }));

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('all-personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: repos,
        });
        mockConfirm.mockResolvedValue(true);

        await selectRepositories(octokit, githubToken);

        const allOutput = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');
        expect(allOutput).toContain('Selected 3 repositories');
      });

      it('should include repo count in confirmation prompt', async () => {
        const repos = [
          makeRepo({ name: 'r1', full_name: 'user/r1' }),
          makeRepo({ name: 'r2', full_name: 'user/r2' }),
        ];

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('all-personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({ data: repos });
        mockConfirm.mockResolvedValue(true);

        await selectRepositories(octokit, githubToken);

        const confirmCall = mockConfirm.mock.calls[0][0];
        expect(confirmCall.message).toContain('2');
      });
    });

    // -----------------------------------------------------------------------
    // Strategy choices
    // -----------------------------------------------------------------------

    describe('strategy choices', () => {
      it('should include all five strategies in choices', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({
          data: [{ login: 'org' }],
        });
        mockSelect.mockResolvedValueOnce('all-personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: [makeRepo({ full_name: 'user/r' })],
        });
        mockConfirm.mockResolvedValue(true);

        await selectRepositories(octokit, githubToken);

        const firstSelectCall = mockSelect.mock.calls[0][0];
        const values = firstSelectCall.choices.map((c: any) => c.value);
        expect(values).toContain('all-org');
        expect(values).toContain('all-personal');
        expect(values).toContain('pattern-glob');
        expect(values).toContain('pattern-regex');
        expect(values).toContain('explicit');
      });

      it('should not disable all-org when organizations exist', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({
          data: [{ login: 'org' }],
        });
        mockSelect.mockResolvedValueOnce('all-personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: [makeRepo({ full_name: 'user/r' })],
        });
        mockConfirm.mockResolvedValue(true);

        await selectRepositories(octokit, githubToken);

        const firstSelectCall = mockSelect.mock.calls[0][0];
        const allOrgChoice = firstSelectCall.choices.find(
          (c: any) => c.value === 'all-org'
        );
        expect(allOrgChoice.disabled).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Repository preview
    // -----------------------------------------------------------------------

    describe('repository preview', () => {
      it('should call showRepositoryPreview before confirmation', async () => {
        const repos = [
          makeRepo({ name: 'show-me', full_name: 'user/show-me' }),
        ];

        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({ data: [] });
        mockSelect.mockResolvedValueOnce('all-personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({ data: repos });
        mockConfirm.mockResolvedValue(true);

        await selectRepositories(octokit, githubToken);

        const allOutput = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');
        expect(allOutput).toContain('Repository Preview');
        expect(allOutput).toContain('show-me');
      });
    });

    // -----------------------------------------------------------------------
    // Pattern-glob source selection with orgs
    // -----------------------------------------------------------------------

    describe('pattern-glob source selection', () => {
      it('should include org choices in source selection when orgs exist', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({
          data: [{ login: 'org-a' }, { login: 'org-b' }],
        });
        mockSelect
          .mockResolvedValueOnce('pattern-glob')
          .mockResolvedValueOnce('personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: [makeRepo({ name: 'repo', full_name: 'user/repo' })],
        });
        mockParsePatternShortcut.mockReturnValue('*');
        mockInput.mockResolvedValue('*');
        mockConfirm.mockResolvedValue(true);

        await selectRepositories(octokit, githubToken);

        // The second select call is for source selection
        const sourceSelectCall = mockSelect.mock.calls[1][0];
        const sourceValues = sourceSelectCall.choices.map((c: any) => c.value);
        expect(sourceValues).toContain('personal');
        expect(sourceValues).toContain('org:org-a');
        expect(sourceValues).toContain('org:org-b');
      });
    });

    // -----------------------------------------------------------------------
    // Pattern-regex source selection with orgs
    // -----------------------------------------------------------------------

    describe('pattern-regex source selection', () => {
      it('should include org choices in source selection when orgs exist', async () => {
        mockOctokitOrgsListForAuthenticatedUser.mockResolvedValue({
          data: [{ login: 'my-org' }],
        });
        mockSelect
          .mockResolvedValueOnce('pattern-regex')
          .mockResolvedValueOnce('personal');
        mockOctokitReposListForAuthenticatedUser.mockResolvedValue({
          data: [makeRepo({ name: 'repo', full_name: 'user/repo' })],
        });
        mockInput.mockResolvedValue('.*');
        mockValidateRegex.mockReturnValue(true);
        mockConfirm.mockResolvedValue(true);

        await selectRepositories(octokit, githubToken);

        const sourceSelectCall = mockSelect.mock.calls[1][0];
        const sourceValues = sourceSelectCall.choices.map((c: any) => c.value);
        expect(sourceValues).toContain('personal');
        expect(sourceValues).toContain('org:my-org');
      });
    });
  });
});
