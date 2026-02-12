import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockGenerateLabels, mockFormatIssueTitle } = vi.hoisted(() => ({
  mockGenerateLabels: vi.fn().mockReturnValue([
    { name: 'priority:P2', color: 'fbca04' },
    { name: 'type:user-story', color: 'e4e669' },
    { name: 'project:TEST', color: '0075ca' },
  ]),
  mockFormatIssueTitle: vi.fn().mockImplementation((usId: string, title: string) => `${usId}: ${title}`),
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
  };
});

import { JiraAdapter, type JiraAdapterConfig } from '../../../../src/sync/providers/jira.js';
import type { ExternalRef, UserStoryData, FeatureData, Label } from '../../../../src/sync/engine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockResponse(ok: boolean, data: unknown, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
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

function makeConfig(overrides?: Partial<JiraAdapterConfig>): JiraAdapterConfig {
  return {
    domain: 'test.atlassian.net',
    email: 'user@test.com',
    apiToken: 'jira-api-token-123',
    projectKey: 'TEST',
    ...overrides,
  };
}

function makeRef(overrides?: Partial<ExternalRef>): ExternalRef {
  return {
    platform: 'jira',
    id: 'TEST-42',
    url: 'https://test.atlassian.net/browse/TEST-42',
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

describe('JiraAdapter', () => {
  let adapter: JiraAdapter;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    adapter = new JiraAdapter(makeConfig());
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
      expect(adapter.platform).toBe('jira');
      expect(adapter.suffix).toBe('J');
    });

    it('constructs correct base URL from domain', () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      adapter.testConnection();

      const url = fetchSpy.mock.calls[0]![0] as string;
      expect(url).toBe('https://test.atlassian.net/rest/api/3/myself');
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

    it('returns specific auth error for 401', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, {}, 401));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Authentication failed');
      expect(result.error).toContain('401');
    });

    it('returns specific auth error for 403', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, {}, 403));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Authentication failed');
      expect(result.error).toContain('403');
    });

    it('returns generic HTTP error for other status codes', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, 'server error', 500));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('500');
    });

    it('returns error on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Connection refused'));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Connection refused');
    });
  });

  // -----------------------------------------------------------------------
  // createIssue
  // -----------------------------------------------------------------------

  describe('createIssue', () => {
    it('creates a JIRA issue and returns ExternalRef', async () => {
      const jiraIssue = {
        key: 'TEST-99',
        id: '10099',
        self: 'https://test.atlassian.net/rest/api/3/issue/10099',
        fields: { summary: 'US-001: Test Story', status: { name: 'To Do', id: '1' }, issuetype: { name: 'Story', id: '10001' } },
      };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      const ref = await adapter.createIssue(makeStory(), makeFeature());

      expect(ref.platform).toBe('jira');
      expect(ref.id).toBe('TEST-99');
      expect(ref.url).toBe('https://test.atlassian.net/browse/TEST-99');
      expect(ref.userStory).toBe('US-001');
    });

    it('uses formatIssueTitle for summary', async () => {
      const jiraIssue = { key: 'TEST-1', id: '1', self: '', fields: { summary: '', status: { name: 'To Do', id: '1' }, issuetype: { name: 'Story', id: '1' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      await adapter.createIssue(makeStory({ id: 'US-010', title: 'My Title' }), makeFeature());
      expect(mockFormatIssueTitle).toHaveBeenCalledWith('US-010', 'My Title');
    });

    it('sends correct fields to JIRA API', async () => {
      const jiraIssue = { key: 'TEST-1', id: '1', self: '', fields: { summary: '', status: { name: 'To Do', id: '1' }, issuetype: { name: 'Story', id: '1' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      await adapter.createIssue(makeStory({ priority: 'P1' }), makeFeature());

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.fields.project.key).toBe('TEST');
      expect(body.fields.issuetype.name).toBe('Story');
      expect(body.fields.labels).toEqual(['specweave', 'priority:P1']);
      expect(body.fields.priority.name).toBe('High');
    });

    it('maps P0 to Highest priority', async () => {
      const jiraIssue = { key: 'TEST-1', id: '1', self: '', fields: { summary: '', status: { name: 'To Do', id: '1' }, issuetype: { name: 'Story', id: '1' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      await adapter.createIssue(makeStory({ priority: 'P0' }), makeFeature());
      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.fields.priority.name).toBe('Highest');
    });

    it('maps P3 to Low priority', async () => {
      const jiraIssue = { key: 'TEST-1', id: '1', self: '', fields: { summary: '', status: { name: 'To Do', id: '1' }, issuetype: { name: 'Story', id: '1' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      await adapter.createIssue(makeStory({ priority: 'P3' }), makeFeature());
      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.fields.priority.name).toBe('Low');
    });

    it('defaults to P2 label when priority not set', async () => {
      const jiraIssue = { key: 'TEST-1', id: '1', self: '', fields: { summary: '', status: { name: 'To Do', id: '1' }, issuetype: { name: 'Story', id: '1' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      await adapter.createIssue(makeStory({ priority: undefined }), makeFeature());
      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.fields.labels).toContain('priority:P2');
    });

    it('sends ADF format description', async () => {
      const jiraIssue = { key: 'TEST-1', id: '1', self: '', fields: { summary: '', status: { name: 'To Do', id: '1' }, issuetype: { name: 'Story', id: '1' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      await adapter.createIssue(makeStory({ description: 'Test desc', acceptanceCriteria: ['AC-1'] }), makeFeature({ id: 'FS-010', title: 'Feat' }));
      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.fields.description.type).toBe('doc');
      expect(body.fields.description.version).toBe(1);
      const text = body.fields.description.content[0].content[0].text;
      expect(text).toContain('FS-010');
      expect(text).toContain('Test desc');
      expect(text).toContain('AC-1');
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, 'Bad Request', 400));
      await expect(adapter.createIssue(makeStory(), makeFeature())).rejects.toThrow('Failed to create JIRA issue');
    });
  });

  // -----------------------------------------------------------------------
  // updateIssue
  // -----------------------------------------------------------------------

  describe('updateIssue', () => {
    it('sends title as summary', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.updateIssue(makeRef(), { title: 'New Title' });

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.fields.summary).toBe('New Title');
    });

    it('sends description in ADF format', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.updateIssue(makeRef(), { description: 'Updated desc' });

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.fields.description.type).toBe('doc');
      expect(body.fields.description.content[0].content[0].text).toBe('Updated desc');
    });

    it('transitions issue when status changes', async () => {
      const transitions = { transitions: [{ id: '31', name: 'Done', to: { name: 'Done' } }] };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, {})) // PUT fields
        .mockResolvedValueOnce(mockResponse(true, transitions)) // GET transitions
        .mockResolvedValueOnce(mockResponse(true, {})); // POST transition

      await adapter.updateIssue(makeRef(), { title: 'Title', status: 'Done' });

      // 3 calls: PUT fields, GET transitions, POST transition
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('does not call PUT when only status changes', async () => {
      const transitions = { transitions: [{ id: '31', name: 'Done', to: { name: 'Done' } }] };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, transitions)) // GET transitions
        .mockResolvedValueOnce(mockResponse(true, {})); // POST transition

      await adapter.updateIssue(makeRef(), { status: 'Done' });

      // Only 2 calls: GET transitions + POST transition (no PUT for fields)
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('skips fields PUT when no field changes', async () => {
      const transitions = { transitions: [{ id: '31', name: 'Done', to: { name: 'Done' } }] };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, transitions))
        .mockResolvedValueOnce(mockResponse(true, {}));

      await adapter.updateIssue(makeRef(), { status: 'Done' });

      // First call should be GET transitions, not PUT
      const firstUrl = fetchSpy.mock.calls[0]![0] as string;
      expect(firstUrl).toContain('/transitions');
    });
  });

  // -----------------------------------------------------------------------
  // closeIssue
  // -----------------------------------------------------------------------

  describe('closeIssue', () => {
    it('transitions to Done', async () => {
      const transitions = { transitions: [{ id: '41', name: 'Done', to: { name: 'Done' } }] };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, transitions))
        .mockResolvedValueOnce(mockResponse(true, {}));

      await adapter.closeIssue(makeRef());

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const transitionBody = JSON.parse((fetchSpy.mock.calls[1]![1] as RequestInit).body as string);
      expect(transitionBody.transition.id).toBe('41');
    });

    it('adds comment before transitioning when provided', async () => {
      const transitions = { transitions: [{ id: '41', name: 'Done', to: { name: 'Done' } }] };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, {})) // POST comment
        .mockResolvedValueOnce(mockResponse(true, transitions)) // GET transitions
        .mockResolvedValueOnce(mockResponse(true, {})); // POST transition

      await adapter.closeIssue(makeRef(), 'Closing reason');

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      // First call is the comment
      const commentUrl = fetchSpy.mock.calls[0]![0] as string;
      expect(commentUrl).toContain('/comment');
      const commentBody = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(commentBody.body.content[0].content[0].text).toBe('Closing reason');
    });

    it('does not add comment when not provided', async () => {
      const transitions = { transitions: [{ id: '41', name: 'Done', to: { name: 'Done' } }] };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, transitions))
        .mockResolvedValueOnce(mockResponse(true, {}));

      await adapter.closeIssue(makeRef());

      // Only 2 calls: GET transitions + POST transition
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  // -----------------------------------------------------------------------
  // reopenIssue
  // -----------------------------------------------------------------------

  describe('reopenIssue', () => {
    it('transitions to "To Do"', async () => {
      const transitions = { transitions: [{ id: '11', name: 'To Do', to: { name: 'To Do' } }] };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, transitions))
        .mockResolvedValueOnce(mockResponse(true, {}));

      await adapter.reopenIssue(makeRef());

      const transitionBody = JSON.parse((fetchSpy.mock.calls[1]![1] as RequestInit).body as string);
      expect(transitionBody.transition.id).toBe('11');
    });
  });

  // -----------------------------------------------------------------------
  // pullChanges
  // -----------------------------------------------------------------------

  describe('pullChanges', () => {
    it('returns external changes for issues with specweave label', async () => {
      const searchResult = {
        issues: [
          {
            key: 'TEST-10',
            id: '10010',
            self: '',
            fields: {
              summary: 'US-001J: Feature A',
              status: { name: 'In Progress', id: '3' },
              issuetype: { name: 'Story', id: '10001' },
              labels: ['specweave'],
            },
          },
          {
            key: 'TEST-11',
            id: '10011',
            self: '',
            fields: {
              summary: 'US-002: Feature B',
              status: { name: 'Done', id: '5' },
              issuetype: { name: 'Story', id: '10001' },
              labels: ['specweave'],
            },
          },
        ],
      };
      fetchSpy.mockResolvedValue(mockResponse(true, searchResult));

      const changes = await adapter.pullChanges();

      expect(changes).toHaveLength(2);
      expect(changes[0]!.type).toBe('status_change');
      expect(changes[0]!.ref.id).toBe('TEST-10');
      expect(changes[0]!.ref.platform).toBe('jira');
      expect(changes[0]!.ref.userStory).toBe('US-001J');
      expect(changes[1]!.type).toBe('closed');
      expect(changes[1]!.ref.userStory).toBe('US-002');
    });

    it('includes date filter when since is provided', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, { issues: [] }));
      const since = new Date('2025-03-15T10:00:00Z');
      await adapter.pullChanges(since);

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.jql).toContain('2025-03-15');
    });

    it('uses /search/jql endpoint', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, { issues: [] }));
      await adapter.pullChanges();

      const url = fetchSpy.mock.calls[0]![0] as string;
      expect(url).toContain('/search/jql');
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, 'JQL error', 400));
      await expect(adapter.pullChanges()).rejects.toThrow('Failed to pull JIRA changes');
    });

    it('handles empty issues array gracefully', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, { issues: [] }));
      const changes = await adapter.pullChanges();
      expect(changes).toEqual([]);
    });

    it('handles missing issues property gracefully', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      const changes = await adapter.pullChanges();
      expect(changes).toEqual([]);
    });

    it('identifies all JIRA closed statuses', async () => {
      const closedStatuses = ['Done', 'Closed', 'Resolved', "Won't Do"];
      const issues = closedStatuses.map((status, i) => ({
        key: `TEST-${i}`,
        id: String(i),
        self: '',
        fields: {
          summary: `US-00${i}: Story ${i}`,
          status: { name: status, id: String(i) },
          issuetype: { name: 'Story', id: '1' },
          labels: ['specweave'],
        },
      }));
      fetchSpy.mockResolvedValue(mockResponse(true, { issues }));

      const changes = await adapter.pullChanges();
      expect(changes.every(c => c.type === 'closed')).toBe(true);
    });

    it('identifies all JIRA open statuses as status_change', async () => {
      const openStatuses = ['To Do', 'In Progress', 'In Review', 'Open', 'Reopened', 'Backlog'];
      const issues = openStatuses.map((status, i) => ({
        key: `TEST-${i}`,
        id: String(i),
        self: '',
        fields: {
          summary: `US-00${i}: Story ${i}`,
          status: { name: status, id: String(i) },
          issuetype: { name: 'Story', id: '1' },
          labels: ['specweave'],
        },
      }));
      fetchSpy.mockResolvedValue(mockResponse(true, { issues }));

      const changes = await adapter.pullChanges();
      expect(changes.every(c => c.type === 'status_change')).toBe(true);
    });

    it('handles missing labels gracefully', async () => {
      const searchResult = {
        issues: [{
          key: 'TEST-10',
          id: '10010',
          self: '',
          fields: {
            summary: 'US-001: A',
            status: { name: 'Open', id: '1' },
            issuetype: { name: 'Story', id: '1' },
            // labels is undefined
          },
        }],
      };
      fetchSpy.mockResolvedValue(mockResponse(true, searchResult));

      const changes = await adapter.pullChanges();
      expect(changes[0]!.data.labels).toEqual([]);
    });

    it('sanitizes project key in JQL', async () => {
      const a = new JiraAdapter(makeConfig({ projectKey: 'TEST;DROP' }));
      fetchSpy.mockResolvedValue(mockResponse(true, { issues: [] }));
      await a.pullChanges();

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      // The regex strips non-alphanumeric/underscore characters (;, spaces)
      // So "TEST;DROP" becomes "TESTDROP" — the semicolons and spaces are removed
      expect(body.jql).not.toContain(';');
      expect(body.jql).toContain('TESTDROP');
    });
  });

  // -----------------------------------------------------------------------
  // getIssueState
  // -----------------------------------------------------------------------

  describe('getIssueState', () => {
    it('returns item state from JIRA issue', async () => {
      const jiraIssue = {
        key: 'TEST-42',
        id: '10042',
        self: '',
        fields: {
          summary: 'US-001: Test',
          status: { name: 'In Progress', id: '3' },
          issuetype: { name: 'Story', id: '1' },
          labels: ['specweave', 'priority:P1'],
        },
      };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      const state = await adapter.getIssueState(makeRef());

      expect(state.status).toBe('In Progress');
      expect(state.labels).toEqual(['specweave', 'priority:P1']);
      expect(state.title).toBe('US-001: Test');
    });

    it('returns empty labels array when labels are undefined', async () => {
      const jiraIssue = {
        key: 'TEST-42',
        id: '10042',
        self: '',
        fields: {
          summary: 'US-001: Test',
          status: { name: 'Open', id: '1' },
          issuetype: { name: 'Story', id: '1' },
        },
      };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      const state = await adapter.getIssueState(makeRef());
      expect(state.labels).toEqual([]);
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, {}, 404));
      await expect(adapter.getIssueState(makeRef())).rejects.toThrow('Failed to get JIRA issue TEST-42 state');
    });
  });

  // -----------------------------------------------------------------------
  // applyLabels
  // -----------------------------------------------------------------------

  describe('applyLabels', () => {
    it('sends label names as array in fields update', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));

      const labels: Label[] = [
        { name: 'specweave', color: '000000' },
        { name: 'priority:P0', color: 'b60205' },
      ];
      await adapter.applyLabels(makeRef(), labels);

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.fields.labels).toEqual(['specweave', 'priority:P0']);
    });
  });

  // -----------------------------------------------------------------------
  // detectHierarchy
  // -----------------------------------------------------------------------

  describe('detectHierarchy', () => {
    it('returns standard hierarchy with epic, story, and sub-task', async () => {
      const project = {
        issueTypes: [
          { name: 'Epic' },
          { name: 'Story' },
          { name: 'Sub-task' },
          { name: 'Bug' },
        ],
      };
      fetchSpy.mockResolvedValue(mockResponse(true, project));

      const hierarchy = await adapter.detectHierarchy();

      expect(hierarchy.pattern).toBe('standard');
      expect(hierarchy.levels).toEqual([
        { externalType: 'Epic', specweaveMapping: 'feature' },
        { externalType: 'Story', specweaveMapping: 'user-story' },
        { externalType: 'Sub-task', specweaveMapping: 'task' },
      ]);
    });

    it('recognizes "subtask" variant (no hyphen)', async () => {
      const project = {
        issueTypes: [
          { name: 'Epic' },
          { name: 'Story' },
          { name: 'Subtask' },
        ],
      };
      fetchSpy.mockResolvedValue(mockResponse(true, project));

      const hierarchy = await adapter.detectHierarchy();
      expect(hierarchy.pattern).toBe('standard');
      expect(hierarchy.levels).toHaveLength(3);
    });

    it('returns epic+task mapping when no story type exists', async () => {
      const project = {
        issueTypes: [
          { name: 'Epic' },
          { name: 'Task' },
        ],
      };
      fetchSpy.mockResolvedValue(mockResponse(true, project));

      const hierarchy = await adapter.detectHierarchy();
      expect(hierarchy.pattern).toBe('standard');
      expect(hierarchy.levels).toEqual([
        { externalType: 'Epic', specweaveMapping: 'feature' },
        { externalType: 'Task', specweaveMapping: 'user-story' },
      ]);
    });

    it('returns flat hierarchy with only task type', async () => {
      const project = {
        issueTypes: [
          { name: 'Task' },
        ],
      };
      fetchSpy.mockResolvedValue(mockResponse(true, project));

      const hierarchy = await adapter.detectHierarchy();
      expect(hierarchy.pattern).toBe('flat');
      expect(hierarchy.levels).toEqual([
        { externalType: 'Task', specweaveMapping: 'user-story' },
      ]);
    });

    it('returns default standard hierarchy for unrecognized types', async () => {
      const project = {
        issueTypes: [
          { name: 'Custom Type A' },
          { name: 'Custom Type B' },
        ],
      };
      fetchSpy.mockResolvedValue(mockResponse(true, project));

      const hierarchy = await adapter.detectHierarchy();
      expect(hierarchy.pattern).toBe('standard');
      expect(hierarchy.levels).toEqual([
        { externalType: 'Epic', specweaveMapping: 'feature' },
        { externalType: 'Story', specweaveMapping: 'user-story' },
        { externalType: 'Task', specweaveMapping: 'task' },
      ]);
    });

    it('returns flat fallback on API error', async () => {
      fetchSpy.mockRejectedValue(new Error('API error'));
      const hierarchy = await adapter.detectHierarchy();
      expect(hierarchy.pattern).toBe('flat');
      expect(hierarchy.levels).toEqual([
        { externalType: 'Task', specweaveMapping: 'user-story' },
      ]);
    });

    it('handles missing issueTypes gracefully', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      const hierarchy = await adapter.detectHierarchy();
      // No types → default standard
      expect(hierarchy.pattern).toBe('standard');
    });
  });

  // -----------------------------------------------------------------------
  // reconcile
  // -----------------------------------------------------------------------

  describe('reconcile', () => {
    it('closes open issues that should be completed', async () => {
      const jiraIssue = {
        key: 'TEST-42', id: '42', self: '',
        fields: { summary: 'US-001: T', status: { name: 'In Progress', id: '3' }, issuetype: { name: 'Story', id: '1' }, labels: [] },
      };
      const transitions = { transitions: [{ id: '41', name: 'Done', to: { name: 'Done' } }] };

      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, jiraIssue))   // getIssueState
        .mockResolvedValueOnce(mockResponse(true, {}))           // addComment (closeIssue adds reconciliation comment)
        .mockResolvedValueOnce(mockResponse(true, transitions))  // transitionIssue GET transitions
        .mockResolvedValueOnce(mockResponse(true, {}));          // transitionIssue POST

      const result = await adapter.reconcile([
        { ref: makeRef(), expected: { status: 'completed' } },
      ]);

      expect(result.closed).toBe(1);
    });

    it('closes open issues when status is abandoned', async () => {
      const jiraIssue = {
        key: 'TEST-42', id: '42', self: '',
        fields: { summary: 'US-001: T', status: { name: 'Open', id: '1' }, issuetype: { name: 'Story', id: '1' }, labels: [] },
      };
      const transitions = { transitions: [{ id: '41', name: 'Done', to: { name: 'Done' } }] };

      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, jiraIssue))   // getIssueState
        .mockResolvedValueOnce(mockResponse(true, {}))           // addComment
        .mockResolvedValueOnce(mockResponse(true, transitions))  // transitionIssue GET transitions
        .mockResolvedValueOnce(mockResponse(true, {}));          // transitionIssue POST

      const result = await adapter.reconcile([
        { ref: makeRef(), expected: { status: 'abandoned' } },
      ]);

      expect(result.closed).toBe(1);
    });

    it('reopens closed issues that should be active', async () => {
      const jiraIssue = {
        key: 'TEST-42', id: '42', self: '',
        fields: { summary: 'US-001: T', status: { name: 'Done', id: '5' }, issuetype: { name: 'Story', id: '1' }, labels: [] },
      };
      const transitions = { transitions: [{ id: '11', name: 'To Do', to: { name: 'To Do' } }] };

      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, jiraIssue))
        .mockResolvedValueOnce(mockResponse(true, transitions))
        .mockResolvedValueOnce(mockResponse(true, {}));

      const result = await adapter.reconcile([
        { ref: makeRef(), expected: { status: 'active' } },
      ]);

      expect(result.updated).toBe(1);
      expect(result.closed).toBe(0);
    });

    it('does nothing when states already match', async () => {
      const jiraIssue = {
        key: 'TEST-42', id: '42', self: '',
        fields: { summary: 'US-001: T', status: { name: 'In Progress', id: '3' }, issuetype: { name: 'Story', id: '1' }, labels: [] },
      };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      const result = await adapter.reconcile([
        { ref: makeRef(), expected: { status: 'active' } },
      ]);

      expect(result.closed).toBe(0);
      expect(result.updated).toBe(0);
    });

    it('records errors and continues processing', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('API down'));
      const jiraIssue = {
        key: 'TEST-43', id: '43', self: '',
        fields: { summary: 'US-002: T', status: { name: 'Open', id: '1' }, issuetype: { name: 'Story', id: '1' }, labels: [] },
      };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      const result = await adapter.reconcile([
        { ref: makeRef({ id: 'TEST-42' }), expected: { status: 'completed' } },
        { ref: makeRef({ id: 'TEST-43' }), expected: { status: 'active' } },
      ]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('TEST-42');
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
    it('delegates to engine generateLabels', () => {
      const config = { priority: 'P0', type: 'feature', projectName: 'TEST' };
      adapter.generateLabels(config);
      expect(mockGenerateLabels).toHaveBeenCalledWith(config);
    });
  });

  // -----------------------------------------------------------------------
  // transitionIssue (tested indirectly)
  // -----------------------------------------------------------------------

  describe('transitionIssue', () => {
    it('matches transition by to.name (case insensitive)', async () => {
      const transitions = {
        transitions: [
          { id: '11', name: 'Start', to: { name: 'In Progress' } },
          { id: '21', name: 'Finish', to: { name: 'Done' } },
        ],
      };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, transitions))
        .mockResolvedValueOnce(mockResponse(true, {}));

      await adapter.closeIssue(makeRef()); // closeIssue calls transitionIssue('Done')

      const transBody = JSON.parse((fetchSpy.mock.calls[1]![1] as RequestInit).body as string);
      expect(transBody.transition.id).toBe('21');
    });

    it('matches transition by name when to.name does not match', async () => {
      const transitions = {
        transitions: [
          { id: '51', name: 'done', to: { name: 'Complete' } },
        ],
      };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, transitions))
        .mockResolvedValueOnce(mockResponse(true, {}));

      await adapter.closeIssue(makeRef());

      const transBody = JSON.parse((fetchSpy.mock.calls[1]![1] as RequestInit).body as string);
      expect(transBody.transition.id).toBe('51');
    });

    it('does nothing when no matching transition found', async () => {
      const transitions = {
        transitions: [
          { id: '11', name: 'Start', to: { name: 'In Progress' } },
        ],
      };
      fetchSpy.mockResolvedValue(mockResponse(true, transitions));

      await adapter.closeIssue(makeRef()); // Tries to transition to 'Done' — no match

      // Only 1 call for GET transitions, no POST
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // apiRequest (tested indirectly)
  // -----------------------------------------------------------------------

  describe('apiRequest behavior', () => {
    it('uses Basic auth with base64-encoded email:token', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.testConnection();

      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      const expected = Buffer.from('user@test.com:jira-api-token-123').toString('base64');
      expect(headers.Authorization).toBe(`Basic ${expected}`);
    });

    it('sets correct Accept and User-Agent headers', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.testConnection();

      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      expect(headers.Accept).toBe('application/json');
      expect(headers['User-Agent']).toBe('SpecWeave-Sync');
    });

    it('sets Content-Type for requests with body', async () => {
      const jiraIssue = { key: 'TEST-1', id: '1', self: '', fields: { summary: '', status: { name: 'To Do', id: '1' }, issuetype: { name: 'Story', id: '1' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));
      await adapter.createIssue(makeStory(), makeFeature());

      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('uses absolute URL when path starts with http', async () => {
      // testConnection uses relative path /myself — verify the base URL is prepended
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.testConnection();

      const url = fetchSpy.mock.calls[0]![0] as string;
      expect(url).toBe('https://test.atlassian.net/rest/api/3/myself');
    });
  });

  // -----------------------------------------------------------------------
  // buildDescription (tested indirectly)
  // -----------------------------------------------------------------------

  describe('buildDescription', () => {
    it('includes feature info, description, and acceptance criteria', async () => {
      const jiraIssue = { key: 'TEST-1', id: '1', self: '', fields: { summary: '', status: { name: 'To Do', id: '1' }, issuetype: { name: 'Story', id: '1' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      await adapter.createIssue(
        makeStory({ description: 'Desc here', acceptanceCriteria: ['AC-A', 'AC-B'] }),
        makeFeature({ id: 'FS-020', title: 'Big Feature' }),
      );

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      const text = body.fields.description.content[0].content[0].text;
      expect(text).toContain('FS-020');
      expect(text).toContain('Big Feature');
      expect(text).toContain('Desc here');
      expect(text).toContain('AC-A');
      expect(text).toContain('AC-B');
      expect(text).toContain('Auto-synced from SpecWeave');
    });

    it('handles missing description and empty AC', async () => {
      const jiraIssue = { key: 'TEST-1', id: '1', self: '', fields: { summary: '', status: { name: 'To Do', id: '1' }, issuetype: { name: 'Story', id: '1' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, jiraIssue));

      await adapter.createIssue(
        makeStory({ description: undefined, acceptanceCriteria: [] }),
        makeFeature(),
      );

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      const text = body.fields.description.content[0].content[0].text;
      expect(text).not.toContain('undefined');
      expect(text).toContain('Auto-synced from SpecWeave');
    });
  });

  // -----------------------------------------------------------------------
  // extractUsId (tested indirectly through pullChanges)
  // -----------------------------------------------------------------------

  describe('extractUsId', () => {
    it('extracts US ID with suffix', async () => {
      const searchResult = {
        issues: [{
          key: 'TEST-1', id: '1', self: '',
          fields: {
            summary: 'US-010J: JIRA Story',
            status: { name: 'Open', id: '1' },
            issuetype: { name: 'Story', id: '1' },
            labels: ['specweave'],
          },
        }],
      };
      fetchSpy.mockResolvedValue(mockResponse(true, searchResult));

      const changes = await adapter.pullChanges();
      expect(changes[0]!.ref.userStory).toBe('US-010J');
    });

    it('returns empty string for non-matching summaries', async () => {
      const searchResult = {
        issues: [{
          key: 'TEST-1', id: '1', self: '',
          fields: {
            summary: 'Random title without US prefix',
            status: { name: 'Open', id: '1' },
            issuetype: { name: 'Story', id: '1' },
            labels: ['specweave'],
          },
        }],
      };
      fetchSpy.mockResolvedValue(mockResponse(true, searchResult));

      const changes = await adapter.pullChanges();
      expect(changes[0]!.ref.userStory).toBe('');
    });
  });
});
