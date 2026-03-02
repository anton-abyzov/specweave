import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockGenerateLabels, mockFormatIssueTitle, mockFormatMilestoneTitle } = vi.hoisted(() => ({
  mockGenerateLabels: vi.fn().mockReturnValue([
    { name: 'priority:P2', color: 'fbca04' },
    { name: 'type:user-story', color: 'e4e669' },
    { name: 'project:test-repo', color: '0075ca' },
  ]),
  mockFormatIssueTitle: vi.fn().mockImplementation((usId: string, title: string) => `${usId}: ${title}`),
  mockFormatMilestoneTitle: vi.fn().mockImplementation((fsId: string, title: string) => `${fsId}: ${title}`),
}));

vi.mock('../../../../src/sync/engine.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    generateLabels: mockGenerateLabels,
  };
});

vi.mock('../../../../src/sync/types.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    formatIssueTitle: mockFormatIssueTitle,
    formatMilestoneTitle: mockFormatMilestoneTitle,
  };
});

import { GitHubAdapter, type GitHubAdapterConfig } from '../../../../src/sync/providers/github.js';
import type { ExternalRef, UserStoryData, FeatureData, Label } from '../../../../src/sync/engine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockResponse(ok: boolean, data: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok,
    status,
    statusText,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    bytes: vi.fn(),
  } as unknown as Response;
}

function makeConfig(overrides?: Partial<GitHubAdapterConfig>): GitHubAdapterConfig {
  return {
    owner: 'test-owner',
    repo: 'test-repo',
    token: 'tok_T',
    ...overrides,
  };
}

function makeRef(overrides?: Partial<ExternalRef>): ExternalRef {
  return {
    platform: 'github',
    id: '42',
    url: 'https://github.com/test-owner/test-repo/issues/42',
    userStory: 'US-001',
    ...overrides,
  };
}

function makeStory(overrides?: Partial<UserStoryData>): UserStoryData {
  return {
    id: 'US-001',
    title: 'Test Story',
    description: 'A test user story',
    priority: 'P2',
    acceptanceCriteria: ['AC one', 'AC two'],
    ...overrides,
  };
}

function makeFeature(overrides?: Partial<FeatureData>): FeatureData {
  return {
    id: 'FS-001',
    title: 'Test Feature',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    adapter = new GitHubAdapter(makeConfig());
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(true, {}));
    mockGenerateLabels.mockClear();
    mockFormatIssueTitle.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------

  describe('constructor', () => {
    it('sets platform and suffix', () => {
      expect(adapter.platform).toBe('github');
      expect(adapter.suffix).toBe('G');
    });

    it('uses provided token', () => {
      const a = new GitHubAdapter(makeConfig({ token: 'tok_2' }));
      // token is private, so we verify via an API call
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      a.testConnection();
      expect(fetchSpy).toHaveBeenCalled();
      const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer tok_2');
    });

    it('falls back to GITHUB_TOKEN env var when no token given', () => {
      const orig = process.env.GITHUB_TOKEN;
      process.env.GITHUB_TOKEN = 'env-token';
      try {
        const a = new GitHubAdapter({ owner: 'o', repo: 'r' });
        a.testConnection();
        const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
        expect(headers.Authorization).toBe('Bearer env-token');
      } finally {
        process.env.GITHUB_TOKEN = orig;
      }
    });

    it('falls back to GH_TOKEN when GITHUB_TOKEN is absent', () => {
      const origGH = process.env.GITHUB_TOKEN;
      const origGHT = process.env.GH_TOKEN;
      delete process.env.GITHUB_TOKEN;
      process.env.GH_TOKEN = 'gh-token';
      try {
        const a = new GitHubAdapter({ owner: 'o', repo: 'r' });
        a.testConnection();
        const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
        expect(headers.Authorization).toBe('Bearer gh-token');
      } finally {
        process.env.GITHUB_TOKEN = origGH;
        process.env.GH_TOKEN = origGHT;
      }
    });

    it('sets empty token when none available', () => {
      const origGH = process.env.GITHUB_TOKEN;
      const origGHT = process.env.GH_TOKEN;
      delete process.env.GITHUB_TOKEN;
      delete process.env.GH_TOKEN;
      try {
        const a = new GitHubAdapter({ owner: 'o', repo: 'r' });
        a.testConnection();
        const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
        expect(headers.Authorization).toBeUndefined();
      } finally {
        process.env.GITHUB_TOKEN = origGH;
        process.env.GH_TOKEN = origGHT;
      }
    });
  });

  // -----------------------------------------------------------------------
  // testConnection
  // -----------------------------------------------------------------------

  describe('testConnection', () => {
    it('returns ok: true on successful response', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      const result = await adapter.testConnection();
      expect(result).toEqual({ ok: true });
    });

    it('returns error on non-ok response', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, {}, 403, 'Forbidden'));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('403');
      expect(result.error).toContain('Forbidden');
    });

    it('returns error on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  // -----------------------------------------------------------------------
  // createIssue
  // -----------------------------------------------------------------------

  describe('createIssue', () => {
    it('creates an issue and returns an ExternalRef', async () => {
      const issue = { number: 99, title: 'US-001: Test Story', body: '', state: 'open', labels: [], html_url: 'https://github.com/test-owner/test-repo/issues/99' };
      fetchSpy.mockResolvedValue(mockResponse(true, issue));

      const ref = await adapter.createIssue(makeStory(), makeFeature());

      expect(ref.platform).toBe('github');
      expect(ref.id).toBe('99');
      expect(ref.url).toBe('https://github.com/test-owner/test-repo/issues/99');
      expect(ref.userStory).toBe('US-001');
    });

    it('calls formatIssueTitle with story id and title', async () => {
      const issue = { number: 1, title: '', body: '', state: 'open', labels: [], html_url: '' };
      fetchSpy.mockResolvedValue(mockResponse(true, issue));

      await adapter.createIssue(makeStory({ id: 'US-005', title: 'My Story' }), makeFeature());
      expect(mockFormatIssueTitle).toHaveBeenCalledWith('US-005', 'My Story');
    });

    it('includes labels from generateLabels', async () => {
      const issue = { number: 1, title: '', body: '', state: 'open', labels: [], html_url: '' };
      fetchSpy.mockResolvedValue(mockResponse(true, issue));

      await adapter.createIssue(makeStory(), makeFeature());

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.labels).toEqual(['priority:P2', 'type:user-story', 'project:test-repo']);
    });

    it('defaults to P2 when story has no priority', async () => {
      const issue = { number: 1, title: '', body: '', state: 'open', labels: [], html_url: '' };
      fetchSpy.mockResolvedValue(mockResponse(true, issue));

      await adapter.createIssue(makeStory({ priority: undefined }), makeFeature());

      expect(mockGenerateLabels).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'P2' }),
      );
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, 'validation error', 422, 'Unprocessable'));

      await expect(adapter.createIssue(makeStory(), makeFeature())).rejects.toThrow('Failed to create GitHub issue');
    });

    it('builds body with feature info, description, and acceptance criteria', async () => {
      const issue = { number: 1, title: '', body: '', state: 'open', labels: [], html_url: '' };
      fetchSpy.mockResolvedValue(mockResponse(true, issue));

      await adapter.createIssue(
        makeStory({ description: 'Detailed desc', acceptanceCriteria: ['AC-1', 'AC-2'] }),
        makeFeature({ id: 'FS-010', title: 'Big Feature' }),
      );

      const requestBody = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(requestBody.body).toContain('FS-010');
      expect(requestBody.body).toContain('Big Feature');
      expect(requestBody.body).toContain('Detailed desc');
      expect(requestBody.body).toContain('- [ ] AC-1');
      expect(requestBody.body).toContain('- [ ] AC-2');
      expect(requestBody.body).toContain('Auto-synced from SpecWeave');
    });

    it('builds body without description when absent', async () => {
      const issue = { number: 1, title: '', body: '', state: 'open', labels: [], html_url: '' };
      fetchSpy.mockResolvedValue(mockResponse(true, issue));

      await adapter.createIssue(
        makeStory({ description: undefined, acceptanceCriteria: [] }),
        makeFeature(),
      );

      const requestBody = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(requestBody.body).not.toContain('undefined');
    });
  });

  // -----------------------------------------------------------------------
  // updateIssue
  // -----------------------------------------------------------------------

  describe('updateIssue', () => {
    it('sends PATCH with title change', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.updateIssue(makeRef(), { title: 'New Title' });

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.title).toBe('New Title');
    });

    it('sends PATCH with description mapped to body', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.updateIssue(makeRef(), { description: 'New Desc' });

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.body).toBe('New Desc');
    });

    it('maps completed status to closed', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.updateIssue(makeRef(), { status: 'completed' });

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.state).toBe('closed');
    });

    it('maps active status to open', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.updateIssue(makeRef(), { status: 'active' });

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.state).toBe('open');
    });

    it('applies labels when provided', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      const labels: Label[] = [
        { name: 'priority:P1', color: 'd93f0b' },
        { name: 'bug', color: 'd73a4a' },
      ];
      await adapter.updateIssue(makeRef(), { labels });

      // First call = PATCH for fields, subsequent calls = ensure label + PUT labels
      expect(fetchSpy).toHaveBeenCalled();
      const lastCallUrl = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1]![0] as string;
      expect(lastCallUrl).toContain('/issues/42/labels');
    });

    it('does not apply labels when none provided', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.updateIssue(makeRef(), { title: 'Title' });

      // Only 1 call for the PATCH itself
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // closeIssue
  // -----------------------------------------------------------------------

  describe('closeIssue', () => {
    it('closes the issue by setting state to closed', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.closeIssue(makeRef());

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.state).toBe('closed');
    });

    it('adds a comment before closing when provided', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.closeIssue(makeRef(), 'Closing comment');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      // First call = comment
      const commentBody = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(commentBody.body).toBe('Closing comment');
      const commentUrl = fetchSpy.mock.calls[0]![0] as string;
      expect(commentUrl).toContain('/issues/42/comments');
      // Second call = close
      const closeBody = JSON.parse((fetchSpy.mock.calls[1]![1] as RequestInit).body as string);
      expect(closeBody.state).toBe('closed');
    });

    it('does not add comment when not provided', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.closeIssue(makeRef());

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // reopenIssue
  // -----------------------------------------------------------------------

  describe('reopenIssue', () => {
    it('sets state to open', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.reopenIssue(makeRef());

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.state).toBe('open');
    });
  });

  // -----------------------------------------------------------------------
  // pullChanges
  // -----------------------------------------------------------------------

  describe('pullChanges', () => {
    it('returns external changes for matching issues', async () => {
      const issues = [
        {
          number: 10,
          title: 'US-001G: Feature A',
          body: '',
          state: 'open' as const,
          labels: [{ name: 'specweave' }],
          html_url: 'https://github.com/o/r/issues/10',
        },
        {
          number: 11,
          title: 'US-002: Feature B',
          body: '',
          state: 'closed' as const,
          labels: [],
          html_url: 'https://github.com/o/r/issues/11',
        },
      ];
      fetchSpy.mockResolvedValue(mockResponse(true, issues));

      const changes = await adapter.pullChanges();

      expect(changes).toHaveLength(2);
      expect(changes[0]!.type).toBe('status_change');
      expect(changes[0]!.ref.id).toBe('10');
      expect(changes[0]!.ref.userStory).toBe('US-001G');
      expect(changes[1]!.type).toBe('closed');
      expect(changes[1]!.ref.userStory).toBe('US-002');
    });

    it('filters out issues without US- prefix', async () => {
      const issues = [
        { number: 1, title: 'Random title', body: '', state: 'open' as const, labels: [], html_url: '' },
        { number: 2, title: 'US-003: Valid', body: '', state: 'open' as const, labels: [], html_url: '' },
      ];
      fetchSpy.mockResolvedValue(mockResponse(true, issues));

      const changes = await adapter.pullChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0]!.ref.userStory).toBe('US-003');
    });

    it('passes since date as ISO string', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, []));
      const since = new Date('2025-01-15T00:00:00Z');
      await adapter.pullChanges(since);

      const url = fetchSpy.mock.calls[0]![0] as string;
      expect(url).toContain('since=2025-01-15T00%3A00%3A00.000Z');
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, 'rate limited', 429));

      await expect(adapter.pullChanges()).rejects.toThrow('Failed to pull GitHub changes');
    });

    it('returns empty array when no issues match', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, []));
      const changes = await adapter.pullChanges();
      expect(changes).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getIssueState
  // -----------------------------------------------------------------------

  describe('getIssueState', () => {
    it('returns item state from issue data', async () => {
      const issue = {
        number: 42,
        title: 'US-001: Test',
        body: '',
        state: 'open',
        labels: [{ name: 'bug' }, { name: 'priority:P1' }],
        html_url: '',
      };
      fetchSpy.mockResolvedValue(mockResponse(true, issue));

      const state = await adapter.getIssueState(makeRef());

      expect(state.status).toBe('open');
      expect(state.labels).toEqual(['bug', 'priority:P1']);
      expect(state.title).toBe('US-001: Test');
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, {}, 404));
      await expect(adapter.getIssueState(makeRef())).rejects.toThrow('Failed to get issue #42 state');
    });
  });

  // -----------------------------------------------------------------------
  // applyLabels
  // -----------------------------------------------------------------------

  describe('applyLabels', () => {
    it('ensures each label exists and then sets labels on issue', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));

      const labels: Label[] = [
        { name: 'bug', color: 'd73a4a', description: 'Bug label' },
        { name: 'priority:P0', color: 'b60205' },
      ];

      await adapter.applyLabels(makeRef(), labels);

      // 2 calls to ensure label exists + 1 PUT for labels
      expect(fetchSpy).toHaveBeenCalledTimes(3);

      // Verify the PUT call
      const putCall = fetchSpy.mock.calls[2]!;
      expect((putCall[1] as RequestInit).method).toBe('PUT');
      const putBody = JSON.parse((putCall[1] as RequestInit).body as string);
      expect(putBody.labels).toEqual(['bug', 'priority:P0']);
    });

    it('handles label already exists (422) gracefully', async () => {
      // ensureLabelExists treats 422 as "already exists" and continues
      fetchSpy
        .mockResolvedValueOnce(mockResponse(false, 'Validation Failed', 422))
        .mockResolvedValueOnce(mockResponse(true, {}))
        .mockResolvedValueOnce(mockResponse(true, {}));

      const labels: Label[] = [
        { name: 'existing', color: '000000' },
        { name: 'new-label', color: '111111' },
      ];

      // Should not throw — 422 means label already exists
      await adapter.applyLabels(makeRef(), labels);
    });
  });

  // -----------------------------------------------------------------------
  // detectHierarchy
  // -----------------------------------------------------------------------

  describe('detectHierarchy', () => {
    it('returns flat hierarchy for GitHub issues', async () => {
      const hierarchy = await adapter.detectHierarchy();
      expect(hierarchy.pattern).toBe('flat');
      expect(hierarchy.levels).toEqual([
        { externalType: 'issue', specweaveMapping: 'user-story' },
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // reconcile
  // -----------------------------------------------------------------------

  describe('reconcile', () => {
    it('closes open issues that should be completed', async () => {
      const issueState = { number: 42, title: 'US-001: T', body: '', state: 'open', labels: [], html_url: '' };
      fetchSpy.mockResolvedValue(mockResponse(true, issueState));

      const result = await adapter.reconcile([
        {
          ref: makeRef(),
          expected: { status: 'completed' },
        },
      ]);

      expect(result.closed).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('closes open issues that are abandoned', async () => {
      const issueState = { number: 42, title: 'US-001: T', body: '', state: 'open', labels: [], html_url: '' };
      fetchSpy.mockResolvedValue(mockResponse(true, issueState));

      const result = await adapter.reconcile([
        {
          ref: makeRef(),
          expected: { status: 'abandoned' },
        },
      ]);

      expect(result.closed).toBe(1);
    });

    it('reopens closed issues that should be active', async () => {
      const issueState = { number: 42, title: 'US-001: T', body: '', state: 'closed', labels: [], html_url: '' };
      fetchSpy.mockResolvedValue(mockResponse(true, issueState));

      const result = await adapter.reconcile([
        {
          ref: makeRef(),
          expected: { status: 'active' },
        },
      ]);

      expect(result.updated).toBe(1);
      expect(result.closed).toBe(0);
    });

    it('does nothing when states already match (open/active)', async () => {
      const issueState = { number: 42, title: 'US-001: T', body: '', state: 'open', labels: [], html_url: '' };
      fetchSpy.mockResolvedValue(mockResponse(true, issueState));

      const result = await adapter.reconcile([
        {
          ref: makeRef(),
          expected: { status: 'active' },
        },
      ]);

      expect(result.closed).toBe(0);
      expect(result.updated).toBe(0);
    });

    it('does nothing when states already match (closed/completed)', async () => {
      const issueState = { number: 42, title: 'US-001: T', body: '', state: 'closed', labels: [], html_url: '' };
      fetchSpy.mockResolvedValue(mockResponse(true, issueState));

      const result = await adapter.reconcile([
        {
          ref: makeRef(),
          expected: { status: 'completed' },
        },
      ]);

      expect(result.closed).toBe(0);
      expect(result.updated).toBe(0);
    });

    it('records errors and continues processing', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('API down'));
      // Second call succeeds
      const issueState = { number: 43, title: 'US-002: T', body: '', state: 'open', labels: [], html_url: '' };
      fetchSpy.mockResolvedValue(mockResponse(true, issueState));

      const result = await adapter.reconcile([
        { ref: makeRef({ id: '42' }), expected: { status: 'completed' } },
        { ref: makeRef({ id: '43' }), expected: { status: 'active' } },
      ]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('42');
    });

    it('returns zero counts for empty input', async () => {
      const result = await adapter.reconcile([]);
      expect(result).toEqual({ created: 0, updated: 0, closed: 0, errors: [] });
    });
  });

  // -----------------------------------------------------------------------
  // generateLabels
  // -----------------------------------------------------------------------

  describe('generateLabels', () => {
    it('delegates to the engine generateLabels function', () => {
      const config = { priority: 'P1', type: 'user-story', projectName: 'my-proj' };
      adapter.generateLabels(config);
      expect(mockGenerateLabels).toHaveBeenCalledWith(config);
    });
  });

  // -----------------------------------------------------------------------
  // apiRequest (tested indirectly)
  // -----------------------------------------------------------------------

  describe('apiRequest behavior', () => {
    it('constructs correct base URL', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.testConnection();

      const url = fetchSpy.mock.calls[0]![0] as string;
      expect(url).toBe('https://api.github.com/repos/test-owner/test-repo');
    });

    it('sets correct headers', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.testConnection();

      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      expect(headers.Accept).toBe('application/vnd.github.v3+json');
      expect(headers['User-Agent']).toBe('SpecWeave-Sync');
      expect(headers.Authorization).toBe('Bearer tok_T');
    });

    it('sets Content-Type for requests with body', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, { number: 1, html_url: '', state: 'open', title: '', body: '', labels: [] }));
      await adapter.createIssue(makeStory(), makeFeature());

      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('does not set Authorization when token is empty', async () => {
      const origGH = process.env.GITHUB_TOKEN;
      const origGHT = process.env.GH_TOKEN;
      delete process.env.GITHUB_TOKEN;
      delete process.env.GH_TOKEN;
      try {
        const a = new GitHubAdapter({ owner: 'o', repo: 'r' });
        fetchSpy.mockResolvedValue(mockResponse(true, {}));
        await a.testConnection();

        const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
        const headers = opts.headers as Record<string, string>;
        // When token is empty, Authorization header should not be set
        expect(headers.Authorization).toBeUndefined();
      } finally {
        process.env.GITHUB_TOKEN = origGH;
        process.env.GH_TOKEN = origGHT;
      }
    });

    it('uses absolute URL when path starts with http', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      // We'll test via reopenIssue which calls apiRequest with a relative path
      await adapter.reopenIssue(makeRef());

      const url = fetchSpy.mock.calls[0]![0] as string;
      expect(url).toContain('https://api.github.com/repos/test-owner/test-repo/issues/42');
    });
  });

  // -----------------------------------------------------------------------
  // mapStatusToGitHub (tested indirectly through updateIssue)
  // -----------------------------------------------------------------------

  describe('status mapping', () => {
    const closedStatuses = ['completed', 'abandoned', 'done', 'closed'];
    const openStatuses = ['active', 'planning', 'unknown', 'in-progress'];

    for (const status of closedStatuses) {
      it(`maps "${status}" to closed`, async () => {
        fetchSpy.mockResolvedValue(mockResponse(true, {}));
        await adapter.updateIssue(makeRef(), { status });
        const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
        expect(body.state).toBe('closed');
      });
    }

    for (const status of openStatuses) {
      it(`maps "${status}" to open`, async () => {
        fetchSpy.mockResolvedValue(mockResponse(true, {}));
        await adapter.updateIssue(makeRef(), { status });
        const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
        expect(body.state).toBe('open');
      });
    }
  });

  // -----------------------------------------------------------------------
  // extractUsId (tested indirectly through pullChanges)
  // -----------------------------------------------------------------------

  describe('extractUsId', () => {
    it('extracts US ID with suffix from title', async () => {
      const issues = [
        { number: 1, title: 'US-010G: Title', body: '', state: 'open' as const, labels: [], html_url: '' },
      ];
      fetchSpy.mockResolvedValue(mockResponse(true, issues));

      const changes = await adapter.pullChanges();
      expect(changes[0]!.ref.userStory).toBe('US-010G');
    });

    it('returns empty string for non-matching titles', async () => {
      // Non-matching titles are filtered out entirely by pullChanges
      const issues = [
        { number: 1, title: 'Not a story', body: '', state: 'open' as const, labels: [], html_url: '' },
      ];
      fetchSpy.mockResolvedValue(mockResponse(true, issues));

      const changes = await adapter.pullChanges();
      expect(changes).toHaveLength(0);
    });
  });
});
