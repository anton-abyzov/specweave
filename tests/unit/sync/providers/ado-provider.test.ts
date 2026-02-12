import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockGenerateLabels, mockFormatIssueTitle } = vi.hoisted(() => ({
  mockGenerateLabels: vi.fn().mockReturnValue([
    { name: 'priority:P2', color: 'fbca04' },
    { name: 'type:user-story', color: 'e4e669' },
    { name: 'project:my-project', color: '0075ca' },
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

import { AdoAdapter, type AdoAdapterConfig } from '../../../../src/sync/providers/ado.js';
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

function makeConfig(overrides?: Partial<AdoAdapterConfig>): AdoAdapterConfig {
  return {
    organization: 'test-org',
    project: 'my-project',
    pat: 'ado-pat-token-123',
    ...overrides,
  };
}

function makeRef(overrides?: Partial<ExternalRef>): ExternalRef {
  return {
    platform: 'ado',
    id: '42',
    url: 'https://dev.azure.com/test-org/my-project/_workitems/edit/42',
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

describe('AdoAdapter', () => {
  let adapter: AdoAdapter;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    adapter = new AdoAdapter(makeConfig());
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
      expect(adapter.platform).toBe('ado');
      expect(adapter.suffix).toBe('A');
    });

    it('constructs correct base URL from org and project', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      // Use testConnection to verify the base URL construction
      await adapter.testConnection();

      const url = fetchSpy.mock.calls[0]![0] as string;
      expect(url).toContain('https://dev.azure.com/test-org/');
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

    it('calls the projects endpoint with api-version', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.testConnection();

      const url = fetchSpy.mock.calls[0]![0] as string;
      expect(url).toBe('https://dev.azure.com/test-org/_apis/projects/my-project?api-version=7.1');
    });

    it('returns error on non-ok response', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, 'Unauthorized', 401));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('401');
    });

    it('returns error on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('DNS resolution failed'));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('DNS resolution failed');
    });
  });

  // -----------------------------------------------------------------------
  // createIssue
  // -----------------------------------------------------------------------

  describe('createIssue', () => {
    it('creates a work item and returns ExternalRef', async () => {
      const workItem = {
        id: 99,
        rev: 1,
        url: 'https://dev.azure.com/test-org/my-project/_apis/wit/workitems/99',
        fields: { 'System.Title': 'US-001: Test Story' },
        _links: { html: { href: 'https://dev.azure.com/test-org/my-project/_workitems/edit/99' } },
      };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      const ref = await adapter.createIssue(makeStory(), makeFeature());

      expect(ref.platform).toBe('ado');
      expect(ref.id).toBe('99');
      expect(ref.url).toBe('https://dev.azure.com/test-org/my-project/_workitems/edit/99');
      expect(ref.userStory).toBe('US-001');
    });

    it('uses formatIssueTitle', async () => {
      const workItem = { id: 1, rev: 1, url: '', fields: {}, _links: { html: { href: '' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      await adapter.createIssue(makeStory({ id: 'US-005', title: 'My Story' }), makeFeature());
      expect(mockFormatIssueTitle).toHaveBeenCalledWith('US-005', 'My Story');
    });

    it('sends JSON Patch operations', async () => {
      const workItem = { id: 1, rev: 1, url: '', fields: {}, _links: { html: { href: '' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      await adapter.createIssue(makeStory(), makeFeature());

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body).toEqual(expect.arrayContaining([
        expect.objectContaining({ op: 'add', path: '/fields/System.Title' }),
        expect.objectContaining({ op: 'add', path: '/fields/System.Description' }),
        expect.objectContaining({ op: 'add', path: '/fields/System.Tags', value: 'specweave;priority:P2' }),
      ]));
    });

    it('defaults to P2 tags when story has no priority', async () => {
      const workItem = { id: 1, rev: 1, url: '', fields: {}, _links: { html: { href: '' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      await adapter.createIssue(makeStory({ priority: undefined }), makeFeature());

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      const tagsOp = body.find((op: { path: string }) => op.path === '/fields/System.Tags');
      expect(tagsOp.value).toContain('priority:P2');
    });

    it('includes acceptance criteria when present', async () => {
      const workItem = { id: 1, rev: 1, url: '', fields: {}, _links: { html: { href: '' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      await adapter.createIssue(makeStory({ acceptanceCriteria: ['AC-X', 'AC-Y'] }), makeFeature());

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      const acOp = body.find((op: { path: string }) => op.path === '/fields/Microsoft.VSTS.Common.AcceptanceCriteria');
      expect(acOp).toBeDefined();
      expect(acOp.value).toContain('<li>AC-X</li>');
      expect(acOp.value).toContain('<li>AC-Y</li>');
      expect(acOp.value).toContain('<ul>');
    });

    it('does not include acceptance criteria when empty', async () => {
      const workItem = { id: 1, rev: 1, url: '', fields: {}, _links: { html: { href: '' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      await adapter.createIssue(makeStory({ acceptanceCriteria: [] }), makeFeature());

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      const acOp = body.find((op: { path: string }) => op.path === '/fields/Microsoft.VSTS.Common.AcceptanceCriteria');
      expect(acOp).toBeUndefined();
    });

    it('uses application/json-patch+json content type', async () => {
      const workItem = { id: 1, rev: 1, url: '', fields: {}, _links: { html: { href: '' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      await adapter.createIssue(makeStory(), makeFeature());

      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json-patch+json');
    });

    it('uses $Issue work item type in URL', async () => {
      const workItem = { id: 1, rev: 1, url: '', fields: {}, _links: { html: { href: '' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      await adapter.createIssue(makeStory(), makeFeature());

      const url = fetchSpy.mock.calls[0]![0] as string;
      expect(url).toContain('/wit/workitems/$Issue');
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, 'Bad Request', 400));
      await expect(adapter.createIssue(makeStory(), makeFeature())).rejects.toThrow('Failed to create work item');
    });

    it('throws when no ID is returned', async () => {
      const workItem = { rev: 1, url: '', fields: {} }; // missing id
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      await expect(adapter.createIssue(makeStory(), makeFeature())).rejects.toThrow('Work item created but no ID returned');
    });

    it('constructs fallback URL when _links.html is missing', async () => {
      const workItem = { id: 55, rev: 1, url: '', fields: {} }; // no _links
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      const ref = await adapter.createIssue(makeStory(), makeFeature());
      expect(ref.url).toBe('https://dev.azure.com/test-org/my-project/_workitems/edit/55');
    });

    it('builds HTML description with feature info', async () => {
      const workItem = { id: 1, rev: 1, url: '', fields: {}, _links: { html: { href: '' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      await adapter.createIssue(
        makeStory({ description: 'Story desc' }),
        makeFeature({ id: 'FS-010', title: 'Big Feat' }),
      );

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      const descOp = body.find((op: { path: string }) => op.path === '/fields/System.Description');
      expect(descOp.value).toContain('FS-010');
      expect(descOp.value).toContain('Big Feat');
      expect(descOp.value).toContain('Story desc');
      expect(descOp.value).toContain('Auto-synced from SpecWeave');
    });
  });

  // -----------------------------------------------------------------------
  // updateIssue
  // -----------------------------------------------------------------------

  describe('updateIssue', () => {
    it('sends title patch operation', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.updateIssue(makeRef(), { title: 'New Title' });

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body).toEqual(expect.arrayContaining([
        { op: 'add', path: '/fields/System.Title', value: 'New Title' },
      ]));
    });

    it('sends description patch operation', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.updateIssue(makeRef(), { description: 'New Desc' });

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body).toEqual(expect.arrayContaining([
        { op: 'add', path: '/fields/System.Description', value: 'New Desc' },
      ]));
    });

    it('maps status to ADO state', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.updateIssue(makeRef(), { status: 'completed' });

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body).toEqual(expect.arrayContaining([
        { op: 'add', path: '/fields/System.State', value: 'Closed' },
      ]));
    });

    it('does not make API call when no changes provided', async () => {
      await adapter.updateIssue(makeRef(), {});
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sends multiple operations in single PATCH', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.updateIssue(makeRef(), { title: 'T', description: 'D', status: 'active' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body).toHaveLength(3);
    });
  });

  // -----------------------------------------------------------------------
  // closeIssue
  // -----------------------------------------------------------------------

  describe('closeIssue', () => {
    it('sets state to Done', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.closeIssue(makeRef());

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body).toEqual(expect.arrayContaining([
        { op: 'add', path: '/fields/System.State', value: 'Done' },
      ]));
    });

    it('adds comment as System.History when provided', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.closeIssue(makeRef(), 'Closing note');

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body).toEqual(expect.arrayContaining([
        { op: 'add', path: '/fields/System.State', value: 'Done' },
        { op: 'add', path: '/fields/System.History', value: 'Closing note' },
      ]));
    });

    it('does not add history field when no comment', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.closeIssue(makeRef());

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      const historyOp = body.find((op: { path: string }) => op.path === '/fields/System.History');
      expect(historyOp).toBeUndefined();
    });

    it('uses json-patch content type', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.closeIssue(makeRef());

      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json-patch+json');
    });
  });

  // -----------------------------------------------------------------------
  // reopenIssue
  // -----------------------------------------------------------------------

  describe('reopenIssue', () => {
    it('sets state to Active', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.reopenIssue(makeRef());

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body).toEqual([
        { op: 'add', path: '/fields/System.State', value: 'Active' },
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // pullChanges
  // -----------------------------------------------------------------------

  describe('pullChanges', () => {
    it('queries work items using WIQL and returns changes', async () => {
      const wiqlResult = {
        workItems: [{ id: 10 }, { id: 11 }],
      };
      const itemsResult = {
        value: [
          {
            id: 10,
            rev: 1,
            url: '',
            fields: {
              'System.Title': 'US-001A: Feature A',
              'System.State': 'Active',
              'System.Tags': 'specweave;priority:P1',
            },
            _links: { html: { href: 'https://dev.azure.com/test-org/my-project/_workitems/edit/10' } },
          },
          {
            id: 11,
            rev: 2,
            url: '',
            fields: {
              'System.Title': 'US-002: Feature B',
              'System.State': 'Closed',
              'System.Tags': 'specweave',
            },
          },
        ],
      };

      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, wiqlResult)) // WIQL query
        .mockResolvedValueOnce(mockResponse(true, itemsResult)); // Get work items

      const changes = await adapter.pullChanges();

      expect(changes).toHaveLength(2);
      expect(changes[0]!.type).toBe('status_change');
      expect(changes[0]!.ref.id).toBe('10');
      expect(changes[0]!.ref.platform).toBe('ado');
      expect(changes[0]!.ref.userStory).toBe('US-001A');
      expect(changes[0]!.data.tags).toEqual(['specweave', 'priority:P1']);

      expect(changes[1]!.type).toBe('closed');
      expect(changes[1]!.ref.userStory).toBe('US-002');
    });

    it('returns empty array when WIQL returns no work items', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, { workItems: [] }));
      const changes = await adapter.pullChanges();
      expect(changes).toEqual([]);
    });

    it('returns empty array when workItems is undefined', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      const changes = await adapter.pullChanges();
      expect(changes).toEqual([]);
    });

    it('includes date filter when since is provided', async () => {
      const wiqlResult = { workItems: [] };
      fetchSpy.mockResolvedValue(mockResponse(true, wiqlResult));

      const since = new Date('2025-06-01T00:00:00Z');
      await adapter.pullChanges(since);

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.query).toContain('2025-06-01');
      expect(body.query).toContain('[System.ChangedDate] >=');
    });

    it('limits to 50 items', async () => {
      const ids = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
      const wiqlResult = { workItems: ids };
      const itemsResult = { value: [] };

      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, wiqlResult))
        .mockResolvedValueOnce(mockResponse(true, itemsResult));

      await adapter.pullChanges();

      const url = fetchSpy.mock.calls[1]![0] as string;
      const idsParam = url.match(/ids=([^&]+)/)?.[1];
      const idCount = idsParam?.split(',').length;
      expect(idCount).toBe(50);
    });

    it('identifies all ADO closed states', async () => {
      const closedStates = ['Closed', 'Done', 'Resolved', 'Removed'];
      const items = closedStates.map((state, i) => ({
        id: i + 1,
        rev: 1,
        url: '',
        fields: {
          'System.Title': `US-00${i}: Story`,
          'System.State': state,
          'System.Tags': 'specweave',
        },
      }));
      const wiqlResult = { workItems: items.map(item => ({ id: item.id })) };

      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, wiqlResult))
        .mockResolvedValueOnce(mockResponse(true, { value: items }));

      const changes = await adapter.pullChanges();
      expect(changes.every(c => c.type === 'closed')).toBe(true);
    });

    it('identifies open states as status_change', async () => {
      const openStates = ['Active', 'New', 'In Progress', 'Committed'];
      const items = openStates.map((state, i) => ({
        id: i + 1,
        rev: 1,
        url: '',
        fields: {
          'System.Title': `US-00${i}: Story`,
          'System.State': state,
          'System.Tags': 'specweave',
        },
      }));
      const wiqlResult = { workItems: items.map(item => ({ id: item.id })) };

      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, wiqlResult))
        .mockResolvedValueOnce(mockResponse(true, { value: items }));

      const changes = await adapter.pullChanges();
      expect(changes.every(c => c.type === 'status_change')).toBe(true);
    });

    it('constructs fallback URL when _links.html is missing', async () => {
      const wiqlResult = { workItems: [{ id: 77 }] };
      const itemsResult = {
        value: [{
          id: 77,
          rev: 1,
          url: '',
          fields: {
            'System.Title': 'US-001: T',
            'System.State': 'Active',
            'System.Tags': '',
          },
          // No _links
        }],
      };

      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, wiqlResult))
        .mockResolvedValueOnce(mockResponse(true, itemsResult));

      const changes = await adapter.pullChanges();
      expect(changes[0]!.ref.url).toBe('https://dev.azure.com/test-org/my-project/_workitems/edit/77');
    });

    it('handles missing System.Tags gracefully', async () => {
      const wiqlResult = { workItems: [{ id: 1 }] };
      const itemsResult = {
        value: [{
          id: 1,
          rev: 1,
          url: '',
          fields: {
            'System.Title': 'US-001: T',
            'System.State': 'Active',
            // No System.Tags
          },
        }],
      };

      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, wiqlResult))
        .mockResolvedValueOnce(mockResponse(true, itemsResult));

      const changes = await adapter.pullChanges();
      expect(changes[0]!.data.tags).toEqual([]);
    });

    it('escapes single quotes in project name for WIQL', async () => {
      const a = new AdoAdapter(makeConfig({ project: "my'project" }));
      fetchSpy.mockResolvedValue(mockResponse(true, { workItems: [] }));
      await a.pullChanges();

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body.query).toContain("my''project");
    });

    it('handles empty value array from items response', async () => {
      const wiqlResult = { workItems: [{ id: 1 }] };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, wiqlResult))
        .mockResolvedValueOnce(mockResponse(true, { value: [] }));

      const changes = await adapter.pullChanges();
      expect(changes).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getIssueState
  // -----------------------------------------------------------------------

  describe('getIssueState', () => {
    it('returns item state from work item data', async () => {
      const workItem = {
        id: 42,
        rev: 3,
        url: '',
        fields: {
          'System.Title': 'US-001: Test',
          'System.State': 'Active',
          'System.Tags': 'specweave;priority:P1;bug',
        },
      };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      const state = await adapter.getIssueState(makeRef());

      expect(state.status).toBe('Active');
      expect(state.labels).toEqual(['specweave', 'priority:P1', 'bug']);
      expect(state.title).toBe('US-001: Test');
    });

    it('handles empty tags', async () => {
      const workItem = {
        id: 42, rev: 1, url: '',
        fields: { 'System.Title': 'T', 'System.State': 'New', 'System.Tags': '' },
      };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      const state = await adapter.getIssueState(makeRef());
      expect(state.labels).toEqual([]);
    });

    it('handles missing tags field', async () => {
      const workItem = {
        id: 42, rev: 1, url: '',
        fields: { 'System.Title': 'T', 'System.State': 'New' },
      };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      const state = await adapter.getIssueState(makeRef());
      expect(state.labels).toEqual([]);
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue(mockResponse(false, 'Not found', 404));
      await expect(adapter.getIssueState(makeRef())).rejects.toThrow('Failed to get work item 42');
    });
  });

  // -----------------------------------------------------------------------
  // applyLabels
  // -----------------------------------------------------------------------

  describe('applyLabels', () => {
    it('sends tags as semicolon-separated values', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));

      const labels: Label[] = [
        { name: 'specweave', color: '000000' },
        { name: 'priority:P0', color: 'b60205' },
        { name: 'bug', color: 'd73a4a' },
      ];
      await adapter.applyLabels(makeRef(), labels);

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      expect(body).toEqual([
        { op: 'add', path: '/fields/System.Tags', value: 'specweave; priority:P0; bug' },
      ]);
    });

    it('uses json-patch content type', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));

      await adapter.applyLabels(makeRef(), [{ name: 'tag', color: '000' }]);

      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json-patch+json');
    });
  });

  // -----------------------------------------------------------------------
  // detectHierarchy
  // -----------------------------------------------------------------------

  describe('detectHierarchy', () => {
    it('returns full hierarchy with epic, feature, user story, and task', async () => {
      const data = {
        value: [
          { name: 'Epic' },
          { name: 'Feature' },
          { name: 'User Story' },
          { name: 'Task' },
          { name: 'Bug' },
        ],
      };
      fetchSpy.mockResolvedValue(mockResponse(true, data));

      const hierarchy = await adapter.detectHierarchy();

      expect(hierarchy.pattern).toBe('standard');
      expect(hierarchy.levels).toEqual([
        { externalType: 'Epic', specweaveMapping: 'skip' },
        { externalType: 'Feature', specweaveMapping: 'feature' },
        { externalType: 'User Story', specweaveMapping: 'user-story' },
        { externalType: 'Task', specweaveMapping: 'task' },
      ]);
    });

    it('returns flat hierarchy with only task type', async () => {
      const data = { value: [{ name: 'Task' }] };
      fetchSpy.mockResolvedValue(mockResponse(true, data));

      const hierarchy = await adapter.detectHierarchy();
      expect(hierarchy.pattern).toBe('flat');
      expect(hierarchy.levels).toEqual([
        { externalType: 'Task', specweaveMapping: 'user-story' },
      ]);
    });

    it('returns default standard hierarchy for unrecognized types', async () => {
      const data = { value: [{ name: 'Custom A' }, { name: 'Custom B' }] };
      fetchSpy.mockResolvedValue(mockResponse(true, data));

      const hierarchy = await adapter.detectHierarchy();
      expect(hierarchy.pattern).toBe('standard');
      expect(hierarchy.levels).toEqual([
        { externalType: 'Feature', specweaveMapping: 'feature' },
        { externalType: 'User Story', specweaveMapping: 'user-story' },
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

    it('handles missing value array', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      const hierarchy = await adapter.detectHierarchy();
      // No types → default standard
      expect(hierarchy.pattern).toBe('standard');
    });

    it('returns flat for task-only without user story or feature', async () => {
      const data = { value: [{ name: 'Task' }, { name: 'Bug' }] };
      fetchSpy.mockResolvedValue(mockResponse(true, data));

      const hierarchy = await adapter.detectHierarchy();
      expect(hierarchy.pattern).toBe('flat');
    });
  });

  // -----------------------------------------------------------------------
  // reconcile
  // -----------------------------------------------------------------------

  describe('reconcile', () => {
    it('closes open work items that should be completed', async () => {
      const workItem = {
        id: 42, rev: 1, url: '',
        fields: { 'System.Title': 'US-001: T', 'System.State': 'Active', 'System.Tags': '' },
      };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, workItem))  // getIssueState
        .mockResolvedValueOnce(mockResponse(true, {}));         // closeIssue PATCH

      const result = await adapter.reconcile([
        { ref: makeRef(), expected: { status: 'completed' } },
      ]);

      expect(result.closed).toBe(1);
    });

    it('closes open work items when abandoned', async () => {
      const workItem = {
        id: 42, rev: 1, url: '',
        fields: { 'System.Title': 'US-001: T', 'System.State': 'New', 'System.Tags': '' },
      };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, workItem))  // getIssueState
        .mockResolvedValueOnce(mockResponse(true, {}));         // closeIssue PATCH

      const result = await adapter.reconcile([
        { ref: makeRef(), expected: { status: 'abandoned' } },
      ]);

      expect(result.closed).toBe(1);
    });

    it('reopens closed work items that should be active', async () => {
      const workItem = {
        id: 42, rev: 1, url: '',
        fields: { 'System.Title': 'US-001: T', 'System.State': 'Closed', 'System.Tags': '' },
      };
      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, workItem))  // getIssueState
        .mockResolvedValueOnce(mockResponse(true, {}));         // reopenIssue PATCH

      const result = await adapter.reconcile([
        { ref: makeRef(), expected: { status: 'active' } },
      ]);

      expect(result.updated).toBe(1);
      expect(result.closed).toBe(0);
    });

    it('does nothing when states already match (active/open)', async () => {
      const workItem = {
        id: 42, rev: 1, url: '',
        fields: { 'System.Title': 'US-001: T', 'System.State': 'Active', 'System.Tags': '' },
      };
      fetchSpy.mockResolvedValueOnce(mockResponse(true, workItem)); // getIssueState only

      const result = await adapter.reconcile([
        { ref: makeRef(), expected: { status: 'active' } },
      ]);

      expect(result.closed).toBe(0);
      expect(result.updated).toBe(0);
    });

    it('does nothing when states already match (closed/completed)', async () => {
      const workItem = {
        id: 42, rev: 1, url: '',
        fields: { 'System.Title': 'US-001: T', 'System.State': 'Done', 'System.Tags': '' },
      };
      fetchSpy.mockResolvedValueOnce(mockResponse(true, workItem)); // getIssueState only

      const result = await adapter.reconcile([
        { ref: makeRef(), expected: { status: 'completed' } },
      ]);

      expect(result.closed).toBe(0);
      expect(result.updated).toBe(0);
    });

    it('records errors and continues processing', async () => {
      const workItem = {
        id: 43, rev: 1, url: '',
        fields: { 'System.Title': 'US-002: T', 'System.State': 'Active', 'System.Tags': '' },
      };
      fetchSpy
        .mockRejectedValueOnce(new Error('API down'))            // getIssueState for item 42 fails
        .mockResolvedValueOnce(mockResponse(true, workItem));     // getIssueState for item 43

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
    it('delegates to engine generateLabels', () => {
      const config = { priority: 'P0', type: 'feature', projectName: 'my-project' };
      adapter.generateLabels(config);
      expect(mockGenerateLabels).toHaveBeenCalledWith(config);
    });
  });

  // -----------------------------------------------------------------------
  // mapStatusToAdo (tested indirectly through updateIssue)
  // -----------------------------------------------------------------------

  describe('status mapping', () => {
    const statusMap: Array<[string, string]> = [
      ['completed', 'Closed'],
      ['abandoned', 'Removed'],
      ['active', 'Active'],
      ['planning', 'New'],
      ['backlog', 'New'],
      ['done', 'Closed'],
    ];

    for (const [input, expected] of statusMap) {
      it(`maps "${input}" to "${expected}"`, async () => {
        fetchSpy.mockResolvedValue(mockResponse(true, {}));
        await adapter.updateIssue(makeRef(), { status: input });
        const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
        const stateOp = body.find((op: { path: string }) => op.path === '/fields/System.State');
        expect(stateOp.value).toBe(expected);
      });
    }

    it('defaults to Active for unknown statuses', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.updateIssue(makeRef(), { status: 'unknown-status' });
      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      const stateOp = body.find((op: { path: string }) => op.path === '/fields/System.State');
      expect(stateOp.value).toBe('Active');
    });
  });

  // -----------------------------------------------------------------------
  // apiRequest (tested indirectly)
  // -----------------------------------------------------------------------

  describe('apiRequest behavior', () => {
    it('uses Basic auth with PAT (empty username)', async () => {
      fetchSpy.mockResolvedValue(mockResponse(true, {}));
      await adapter.testConnection();

      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      const expected = Buffer.from(':ado-pat-token-123').toString('base64');
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

    it('uses custom content type when specified', async () => {
      const workItem = { id: 1, rev: 1, url: '', fields: {}, _links: { html: { href: '' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));
      await adapter.createIssue(makeStory(), makeFeature());

      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json-patch+json');
    });

    it('defaults to application/json when no custom content type', async () => {
      // pullChanges WIQL query uses default content type
      fetchSpy.mockResolvedValue(mockResponse(true, { workItems: [] }));
      await adapter.pullChanges();

      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  // -----------------------------------------------------------------------
  // extractUsId (tested indirectly through pullChanges)
  // -----------------------------------------------------------------------

  describe('extractUsId', () => {
    it('extracts US ID with suffix from title', async () => {
      const wiqlResult = { workItems: [{ id: 1 }] };
      const itemsResult = {
        value: [{
          id: 1, rev: 1, url: '',
          fields: {
            'System.Title': 'US-010A: ADO Story',
            'System.State': 'Active',
            'System.Tags': '',
          },
        }],
      };

      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, wiqlResult))
        .mockResolvedValueOnce(mockResponse(true, itemsResult));

      const changes = await adapter.pullChanges();
      expect(changes[0]!.ref.userStory).toBe('US-010A');
    });

    it('returns empty string for non-matching titles', async () => {
      const wiqlResult = { workItems: [{ id: 1 }] };
      const itemsResult = {
        value: [{
          id: 1, rev: 1, url: '',
          fields: {
            'System.Title': 'Random task title',
            'System.State': 'Active',
            'System.Tags': '',
          },
        }],
      };

      fetchSpy
        .mockResolvedValueOnce(mockResponse(true, wiqlResult))
        .mockResolvedValueOnce(mockResponse(true, itemsResult));

      const changes = await adapter.pullChanges();
      expect(changes[0]!.ref.userStory).toBe('');
    });
  });

  // -----------------------------------------------------------------------
  // buildDescription (tested indirectly)
  // -----------------------------------------------------------------------

  describe('buildDescription', () => {
    it('produces HTML format with feature info', async () => {
      const workItem = { id: 1, rev: 1, url: '', fields: {}, _links: { html: { href: '' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      await adapter.createIssue(
        makeStory({ description: 'Story details' }),
        makeFeature({ id: 'FS-050', title: 'Major Feature' }),
      );

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      const descOp = body.find((op: { path: string }) => op.path === '/fields/System.Description');
      expect(descOp.value).toContain('<b>Feature</b>');
      expect(descOp.value).toContain('FS-050');
      expect(descOp.value).toContain('Major Feature');
      expect(descOp.value).toContain('<p>Story details</p>');
      expect(descOp.value).toContain('<em>Auto-synced from SpecWeave</em>');
    });

    it('omits description paragraph when not provided', async () => {
      const workItem = { id: 1, rev: 1, url: '', fields: {}, _links: { html: { href: '' } } };
      fetchSpy.mockResolvedValue(mockResponse(true, workItem));

      await adapter.createIssue(
        makeStory({ description: undefined }),
        makeFeature(),
      );

      const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
      const descOp = body.find((op: { path: string }) => op.path === '/fields/System.Description');
      expect(descOp.value).not.toContain('<p>undefined</p>');
    });
  });
});
