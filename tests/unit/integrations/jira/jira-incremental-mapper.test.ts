/**
 * Unit tests for JiraIncrementalMapper
 *
 * Tests:
 * - Constructor and initialization
 * - setJiraIncrementalMapperLogger
 * - addItemToIncrement (story, bug, task, epic, error paths)
 * - createIncrementFromItems (success, error, mixed types)
 * - getIncrementWorkItems (reading from spec.md)
 * - mapJiraTypeToWorkItemType (all type mappings)
 * - createWorkItemFromIssue (ID generation, field mapping)
 * - addWorkItemToSpec (story/bug/task sections, new and existing)
 * - addWorkItemToTasks (new file, existing file)
 * - updateRFCWithWorkItem (with/without existing RFC, sections)
 * - generateSpecFromWorkItems (stories, bugs, tasks)
 * - generateTasksFromWorkItems
 * - generateRFCFromWorkItems (V2 flexible format)
 * - getNextIncrementId (with/without targetProjectId)
 * - ensureDir (existing/new directory)
 * - parseMarkdownWithFrontmatter (with/without frontmatter)
 * - serializeMarkdownWithFrontmatter
 * - extractTextFromJiraDescription (string, ADF doc, null)
 * - mapJiraStatusToSpecWeave (done, in progress, other)
 * - mapJiraPriorityToSpecWeave (highest, high, other, undefined)
 * - slugify
 *
 * @module tests/unit/integrations/jira/jira-incremental-mapper.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';

// ==================== Hoisted mocks ====================
const {
  mockExistsSync,
  mockReadFileSync,
  mockWriteFileSync,
  mockMkdirSync,
  mockReaddirSync,
  mockYamlLoad,
  mockYamlDump,
  mockGenerateRFC,
  mockGetNextIncrementNumber,
  mockGetNextIncrementNumberForProject,
  mockValidateBeforeCreate,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockYamlLoad: vi.fn(),
  mockYamlDump: vi.fn(),
  mockGenerateRFC: vi.fn(),
  mockGetNextIncrementNumber: vi.fn(),
  mockGetNextIncrementNumberForProject: vi.fn(),
  mockValidateBeforeCreate: vi.fn(),
}));

// ==================== Module mocks ====================
vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    readdirSync: mockReaddirSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  readdirSync: mockReaddirSync,
}));

vi.mock('js-yaml', () => ({
  default: {
    load: mockYamlLoad,
    dump: mockYamlDump,
  },
  load: mockYamlLoad,
  dump: mockYamlDump,
}));

vi.mock('../../../../src/core/rfc/rfc-generator-v2.js', () => {
  class MockFlexibleRFCGenerator {
    generateRFC = mockGenerateRFC;
    constructor(_projectRoot: string) {}
  }
  return { FlexibleRFCGenerator: MockFlexibleRFCGenerator };
});

vi.mock('../../../../src/core/increment/increment-utils.js', () => ({
  IncrementNumberManager: {
    getNextIncrementNumber: mockGetNextIncrementNumber,
    getNextIncrementNumberForProject: mockGetNextIncrementNumberForProject,
  },
}));

vi.mock('../../../../src/core/increment/metadata-manager.js', () => ({
  MetadataManager: {
    validateBeforeCreate: mockValidateBeforeCreate,
  },
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  silentLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../../src/core/config/config-manager.js', () => ({
  ConfigManager: vi.fn(),
}));

// Suppress console.log from the module under test
vi.spyOn(console, 'log').mockImplementation(() => {});

// Import after mocks
const { JiraIncrementalMapper, setJiraIncrementalMapperLogger } = await import(
  '../../../../src/integrations/jira/jira-incremental-mapper.js'
);

// ==================== Helpers ====================

const TEST_ROOT = path.join(os.tmpdir(), 'specweave-test-jira-incremental');
const TEST_DOMAIN = 'test-company.atlassian.net';

function makeJiraIssue(overrides: Record<string, any> = {}): any {
  const { fields: fieldOverrides, ...topOverrides } = overrides;
  return {
    id: '10001',
    key: 'SCRUM-1',
    fields: {
      summary: 'Test issue summary',
      description: 'Plain description text',
      issuetype: { id: '10001', name: 'Story' },
      status: { id: '1', name: 'To Do' },
      priority: { id: '3', name: 'Medium' },
      labels: ['frontend'],
      assignee: { accountId: 'abc123', displayName: 'Jane Doe', emailAddress: 'jane@example.com' },
      parent: undefined,
      ...fieldOverrides,
    },
    self: 'https://test-company.atlassian.net/rest/api/3/issue/10001',
    ...topOverrides,
  };
}

function makeMockClient(overrides: Record<string, any> = {}): any {
  return {
    getIssue: vi.fn().mockResolvedValue(makeJiraIssue()),
    ...overrides,
  };
}

function makeConfig(): any {
  return { domain: TEST_DOMAIN };
}

function makeSpecFrontmatter(workItems: any[] = []) {
  return {
    increment_id: '0001-test',
    title: 'Test Increment',
    work_items: workItems,
  };
}

function setupYamlMocks(frontmatter: any = {}) {
  mockYamlLoad.mockReturnValue(frontmatter);
  mockYamlDump.mockImplementation((obj: any) => JSON.stringify(obj, null, 2));
}

// ==================== Tests ====================

describe('JiraIncrementalMapper', () => {
  let mapper: InstanceType<typeof JiraIncrementalMapper>;
  let mockClient: ReturnType<typeof makeMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = makeMockClient();
    mapper = new JiraIncrementalMapper(mockClient, makeConfig(), TEST_ROOT);

    // Default fs mocks
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('');
    mockWriteFileSync.mockImplementation(() => {});
    mockMkdirSync.mockImplementation(() => {});
    mockReaddirSync.mockReturnValue([]);
    mockGenerateRFC.mockResolvedValue('/tmp/rfc.md');
    mockValidateBeforeCreate.mockResolvedValue(undefined);

    setupYamlMocks({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== setJiraIncrementalMapperLogger ====================
  describe('setJiraIncrementalMapperLogger', () => {
    it('should accept a custom logger without throwing', () => {
      const customLogger = {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };
      expect(() => setJiraIncrementalMapperLogger(customLogger)).not.toThrow();
    });
  });

  // ==================== Constructor ====================
  describe('Constructor', () => {
    it('should create instance with required parameters', () => {
      const inst = new JiraIncrementalMapper(mockClient, makeConfig(), TEST_ROOT);
      expect(inst).toBeDefined();
    });

    it('should accept optional targetProjectId', () => {
      const inst = new JiraIncrementalMapper(mockClient, makeConfig(), TEST_ROOT, 'project-abc');
      expect(inst).toBeDefined();
    });
  });

  // ==================== addItemToIncrement ====================
  describe('addItemToIncrement', () => {
    const incrementId = '0001-test';
    const jiraKey = 'SCRUM-1';
    const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);
    const specPath = path.join(incrementFolder, 'spec.md');

    it('should add a story to an existing increment successfully', async () => {
      const issue = makeJiraIssue();
      mockClient.getIssue.mockResolvedValue(issue);

      // Increment folder exists
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        if (p === path.join(incrementFolder, 'spec.md')) return false;
        if (p === path.join(incrementFolder, 'tasks.md')) return false;
        return false;
      });

      // spec.md content with frontmatter
      const specContent = '---\ntitle: Test\n---\n\n# Content';
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === specPath) return specContent;
        return '';
      });

      setupYamlMocks({ title: 'Test', work_items: [] });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, jiraKey);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Added story SCRUM-1');
      expect(result.workItem).toBeDefined();
      expect(result.workItem!.type).toBe('story');
      expect(result.workItem!.jira_key).toBe('SCRUM-1');
    });

    it('should add a bug to an existing increment', async () => {
      const issue = makeJiraIssue({
        fields: { issuetype: { id: '10002', name: 'Bug' } },
      });
      mockClient.getIssue.mockResolvedValue(issue);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });

      const specContent = '---\ntitle: Test\n---\n\n# Content';
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === specPath) return specContent;
        return '';
      });

      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, jiraKey);

      expect(result.success).toBe(true);
      expect(result.workItem!.type).toBe('bug');
    });

    it('should add a task to an existing increment', async () => {
      const issue = makeJiraIssue({
        fields: { issuetype: { id: '10003', name: 'Task' } },
      });
      mockClient.getIssue.mockResolvedValue(issue);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });

      const specContent = '---\ntitle: Test\n---\n\n# Content';
      mockReadFileSync.mockImplementation(() => specContent);

      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, jiraKey);

      expect(result.success).toBe(true);
      expect(result.workItem!.type).toBe('task');
    });

    it('should skip tasks.md update for epic type', async () => {
      const issue = makeJiraIssue({
        fields: { issuetype: { id: '10004', name: 'Epic' } },
      });
      mockClient.getIssue.mockResolvedValue(issue);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });

      const specContent = '---\ntitle: Test\n---\n\n# Content';
      mockReadFileSync.mockImplementation(() => specContent);

      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, jiraKey);

      expect(result.success).toBe(true);
      // tasks.md write should only happen for spec.md, not for tasks.md
      // Count writeFileSync calls - only spec.md + RFC (no tasks.md for epic)
      const writeCallPaths = mockWriteFileSync.mock.calls.map((c: any[]) => c[0]);
      expect(writeCallPaths).not.toContain(path.join(incrementFolder, 'tasks.md'));
    });

    it('should fail when increment folder does not exist', async () => {
      mockClient.getIssue.mockResolvedValue(makeJiraIssue());
      mockExistsSync.mockReturnValue(false);

      const result = await mapper.addItemToIncrement(incrementId, jiraKey);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should fail when getIssue throws', async () => {
      mockClient.getIssue.mockRejectedValue(new Error('Jira API error'));

      const result = await mapper.addItemToIncrement(incrementId, jiraKey);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Jira API error');
    });

    it('should fail when reading spec.md throws', async () => {
      mockClient.getIssue.mockResolvedValue(makeJiraIssue());
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = await mapper.addItemToIncrement(incrementId, jiraKey);

      expect(result.success).toBe(false);
      expect(result.message).toContain('File read error');
    });
  });

  // ==================== createIncrementFromItems ====================
  describe('createIncrementFromItems', () => {
    it('should create increment from multiple story issues', async () => {
      const issues = [
        makeJiraIssue({ key: 'SCRUM-1', id: '10001' }),
        makeJiraIssue({ key: 'SCRUM-2', id: '10002' }),
      ];
      mockClient.getIssue
        .mockResolvedValueOnce(issues[0])
        .mockResolvedValueOnce(issues[1]);

      mockGetNextIncrementNumber.mockReturnValue('0005');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      const result = await mapper.createIncrementFromItems('My Feature', ['SCRUM-1', 'SCRUM-2']);

      expect(result.success).toBe(true);
      expect(result.incrementId).toBe('0005');
      expect(result.message).toContain('2 work items');
      expect(mockValidateBeforeCreate).toHaveBeenCalledWith('0005', TEST_ROOT);
      expect(mockMkdirSync).toHaveBeenCalled();
    });

    it('should create increment with mixed types (story, bug, task)', async () => {
      mockClient.getIssue
        .mockResolvedValueOnce(makeJiraIssue({ key: 'SCRUM-1', fields: { issuetype: { id: '1', name: 'Story' } } }))
        .mockResolvedValueOnce(makeJiraIssue({ key: 'SCRUM-2', fields: { issuetype: { id: '2', name: 'Bug' } } }))
        .mockResolvedValueOnce(makeJiraIssue({ key: 'SCRUM-3', fields: { issuetype: { id: '3', name: 'Task' } } }));

      mockGetNextIncrementNumber.mockReturnValue('0010');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      const result = await mapper.createIncrementFromItems('Mixed', ['SCRUM-1', 'SCRUM-2', 'SCRUM-3']);

      expect(result.success).toBe(true);
      expect(result.message).toContain('3 work items');
    });

    it('should use targetProjectId for increment numbering when set', async () => {
      const mapperWithProject = new JiraIncrementalMapper(
        mockClient,
        makeConfig(),
        TEST_ROOT,
        'proj-xyz'
      );

      mockClient.getIssue.mockResolvedValue(makeJiraIssue());
      mockGetNextIncrementNumberForProject.mockReturnValue('0007');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      const result = await mapperWithProject.createIncrementFromItems('Feature', ['SCRUM-1']);

      expect(result.success).toBe(true);
      expect(result.incrementId).toBe('0007');
      expect(mockGetNextIncrementNumberForProject).toHaveBeenCalledWith(TEST_ROOT, 'proj-xyz');
    });

    it('should fail when fetching issues throws', async () => {
      mockClient.getIssue.mockRejectedValue(new Error('Network failure'));

      const result = await mapper.createIncrementFromItems('Feature', ['BAD-1']);

      expect(result.success).toBe(false);
      expect(result.incrementId).toBe('');
      expect(result.message).toContain('Network failure');
    });

    it('should fail when validateBeforeCreate throws', async () => {
      mockClient.getIssue.mockResolvedValue(makeJiraIssue());
      mockGetNextIncrementNumber.mockReturnValue('0001');
      mockValidateBeforeCreate.mockRejectedValue(new Error('Duplicate increment'));

      const result = await mapper.createIncrementFromItems('Feature', ['SCRUM-1']);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Duplicate increment');
    });
  });

  // ==================== getIncrementWorkItems ====================
  describe('getIncrementWorkItems', () => {
    it('should return grouped work items from spec.md frontmatter', () => {
      const specContent = '---\nwork_items:\n  - type: story\n---\n\n# Content';
      mockReadFileSync.mockReturnValue(specContent);

      const workItems = [
        { type: 'story', id: 'US0001-001', title: 'Story 1' },
        { type: 'bug', id: 'BUG0001-001', title: 'Bug 1' },
        { type: 'task', id: 'TASK0001-001', title: 'Task 1' },
      ];

      mockYamlLoad.mockReturnValue({ work_items: workItems });

      const result = mapper.getIncrementWorkItems('0001-test');

      expect(result.stories).toHaveLength(1);
      expect(result.bugs).toHaveLength(1);
      expect(result.tasks).toHaveLength(1);
      expect(result.stories[0].id).toBe('US0001-001');
    });

    it('should return empty groups when no work_items in frontmatter', () => {
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      mockYamlLoad.mockReturnValue({ title: 'Test' });

      const result = mapper.getIncrementWorkItems('0001-test');

      expect(result.stories).toHaveLength(0);
      expect(result.bugs).toHaveLength(0);
      expect(result.tasks).toHaveLength(0);
    });

    it('should return empty groups when no frontmatter at all', () => {
      mockReadFileSync.mockReturnValue('# Just content, no frontmatter');

      const result = mapper.getIncrementWorkItems('0001-test');

      expect(result.stories).toHaveLength(0);
      expect(result.bugs).toHaveLength(0);
      expect(result.tasks).toHaveLength(0);
    });

    it('should handle multiple items of the same type', () => {
      const specContent = '---\nwork_items: []\n---\n\n# Content';
      mockReadFileSync.mockReturnValue(specContent);

      const workItems = [
        { type: 'story', id: 'US0001-001' },
        { type: 'story', id: 'US0001-002' },
        { type: 'story', id: 'US0001-003' },
      ];
      mockYamlLoad.mockReturnValue({ work_items: workItems });

      const result = mapper.getIncrementWorkItems('0001-test');

      expect(result.stories).toHaveLength(3);
      expect(result.bugs).toHaveLength(0);
    });
  });

  // ==================== Private helpers via public interface ====================
  // These are tested indirectly through public methods

  describe('mapJiraTypeToWorkItemType (via addItemToIncrement)', () => {
    const incrementId = '0001-test';
    const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);

    beforeEach(() => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);
    });

    it('should map "Story" to story', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '1', name: 'Story' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.type).toBe('story');
    });

    it('should map "User Story" to story (contains "story")', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '1', name: 'User Story' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.type).toBe('story');
    });

    it('should map "Bug" to bug', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '2', name: 'Bug' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.type).toBe('bug');
    });

    it('should map "Epic" to epic', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '3', name: 'Epic' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.type).toBe('epic');
    });

    it('should map "Sub-task" to task (default)', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '4', name: 'Sub-task' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.type).toBe('task');
    });

    it('should map unknown type to task', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '5', name: 'Custom Type' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.type).toBe('task');
    });
  });

  describe('extractTextFromJiraDescription (via addItemToIncrement)', () => {
    const incrementId = '0001-test';
    const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);

    beforeEach(() => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);
    });

    it('should handle null/undefined description', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { description: null } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.description).toBe('');
    });

    it('should handle plain string description', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { description: 'Simple text description' } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.description).toBe('Simple text description');
    });

    it('should extract text from ADF (Atlassian Document Format)', async () => {
      const adfDoc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'text', text: 'World' },
            ],
          },
        ],
      };
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { description: adfDoc } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      // texts.join(' ') produces "Hello " + " " + "World" = "Hello  World"
      expect(result.workItem!.description).toBe('Hello  World');
    });

    it('should handle ADF document with no content', async () => {
      const adfDoc = { type: 'doc', content: undefined };
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { description: adfDoc } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.description).toBe('');
    });

    it('should handle nested ADF content', async () => {
      const adfDoc = {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Item 1' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Item 2' }],
                  },
                ],
              },
            ],
          },
        ],
      };
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { description: adfDoc } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.description).toBe('Item 1 Item 2');
    });

    it('should convert non-object, non-string description to string', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { description: 42 } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.description).toBe('42');
    });
  });

  describe('mapJiraStatusToSpecWeave (via addItemToIncrement)', () => {
    const incrementId = '0001-test';
    const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);

    beforeEach(() => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);
    });

    it('should map "Done" to completed', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { status: { id: '1', name: 'Done' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.status).toBe('completed');
    });

    it('should map "In Progress" to in-progress', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { status: { id: '2', name: 'In Progress' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.status).toBe('in-progress');
    });

    it('should map "To Do" to planning (default)', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { status: { id: '3', name: 'To Do' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.status).toBe('planning');
    });

    it('should map status containing "done" (case-insensitive)', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { status: { id: '1', name: 'DONE AND APPROVED' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.status).toBe('completed');
    });
  });

  describe('mapJiraPriorityToSpecWeave (via addItemToIncrement)', () => {
    const incrementId = '0001-test';
    const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);

    beforeEach(() => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);
    });

    it('should map "Highest" to P1', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { priority: { id: '1', name: 'Highest' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.priority).toBe('P1');
    });

    it('should map "Critical" to P1', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { priority: { id: '1', name: 'Critical' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.priority).toBe('P1');
    });

    it('should map "High" to P2', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { priority: { id: '2', name: 'High' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.priority).toBe('P2');
    });

    it('should map "Medium" to P3', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { priority: { id: '3', name: 'Medium' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.priority).toBe('P3');
    });

    it('should map "Low" to P3', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { priority: { id: '4', name: 'Low' } } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.priority).toBe('P3');
    });

    it('should map undefined priority to P3', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { priority: undefined } })
      );
      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');
      expect(result.workItem!.priority).toBe('P3');
    });
  });

  describe('createWorkItemFromIssue - ID generation (via addItemToIncrement)', () => {
    const incrementId = '0001-test';
    const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);

    it('should generate US prefix for stories', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '1', name: 'Story' } } })
      );
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      expect(result.workItem!.id).toMatch(/^US0001-test-\d{3}$/);
    });

    it('should generate BUG prefix for bugs', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '2', name: 'Bug' } } })
      );
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      expect(result.workItem!.id).toMatch(/^BUG0001-test-\d{3}$/);
    });

    it('should generate TASK prefix for tasks', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '3', name: 'Task' } } })
      );
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      expect(result.workItem!.id).toMatch(/^TASK0001-test-\d{3}$/);
    });

    it('should include parent_epic when issue has a parent', async () => {
      const issue = makeJiraIssue({
        fields: {
          issuetype: { id: '1', name: 'Story' },
          parent: {
            id: '10000',
            key: 'SCRUM-100',
            fields: { summary: 'Parent Epic Title' },
          },
        },
      });
      mockClient.getIssue.mockResolvedValue(issue);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      expect(result.workItem!.parent_epic).toEqual({
        key: 'SCRUM-100',
        title: 'Parent Epic Title',
      });
    });

    it('should increment count when existing items exist', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '1', name: 'Story' } } })
      );

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        // spec.md exists for counting
        if (p === path.join(incrementFolder, 'spec.md')) return true;
        return false;
      });

      const specContent = '---\nwork_items:\n  - type: story\n---\n\n# Content';
      mockReadFileSync.mockReturnValue(specContent);

      // First call to getIncrementWorkItems returns existing stories
      // Then the outer addItemToIncrement also calls parseMarkdownWithFrontmatter
      mockYamlLoad.mockReturnValue({
        work_items: [
          { type: 'story', id: 'US0001-test-001' },
          { type: 'story', id: 'US0001-test-002' },
        ],
      });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      // Should be count 3 since there are already 2 stories
      expect(result.workItem!.id).toBe('US0001-test-003');
    });

    it('should include labels and assignee from issue', async () => {
      const issue = makeJiraIssue({
        fields: {
          issuetype: { id: '1', name: 'Story' },
          labels: ['frontend', 'urgent'],
          assignee: { accountId: 'abc', displayName: 'Alice Smith', emailAddress: 'alice@test.com' },
        },
      });
      mockClient.getIssue.mockResolvedValue(issue);

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      expect(result.workItem!.labels).toEqual(['frontend', 'urgent']);
      expect(result.workItem!.assignee).toBe('Alice Smith');
    });
  });

  describe('addWorkItemToSpec sections (via addItemToIncrement)', () => {
    const incrementId = '0001-test';
    const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);
    const specPath = path.join(incrementFolder, 'spec.md');

    beforeEach(() => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue([]);
    });

    it('should add story to existing "User Stories" section', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '1', name: 'Story' } } })
      );
      const specContent = '---\ntitle: Test\n---\n\n## User Stories\n\nExisting content';
      mockReadFileSync.mockReturnValue(specContent);
      setupYamlMocks({ title: 'Test' });

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      // Check that writeFileSync was called with content containing the story
      const writeCall = mockWriteFileSync.mock.calls.find(
        (c: any[]) => c[0] === specPath
      );
      expect(writeCall).toBeDefined();
      const written = writeCall![1] as string;
      expect(written).toContain('User Stories');
      expect(written).toContain('SCRUM-1');
    });

    it('should create new "Bugs" section when none exists', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '2', name: 'Bug' } } })
      );
      const specContent = '---\ntitle: Test\n---\n\n# Content only';
      mockReadFileSync.mockReturnValue(specContent);
      setupYamlMocks({ title: 'Test' });

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      const writeCall = mockWriteFileSync.mock.calls.find(
        (c: any[]) => c[0] === specPath
      );
      const written = writeCall![1] as string;
      expect(written).toContain('## Bugs');
      expect(written).toContain('SCRUM-1');
    });

    it('should add task to existing "Technical Tasks" section', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '3', name: 'Task' } } })
      );
      const specContent = '---\ntitle: Test\n---\n\n## Technical Tasks\n\nExisting tasks';
      mockReadFileSync.mockReturnValue(specContent);
      setupYamlMocks({ title: 'Test' });

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      const writeCall = mockWriteFileSync.mock.calls.find(
        (c: any[]) => c[0] === specPath
      );
      const written = writeCall![1] as string;
      expect(written).toContain('Technical Tasks');
      expect(written).toContain('SCRUM-1');
    });

    it('should create new "User Stories" section when none exists', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '1', name: 'Story' } } })
      );
      const specContent = '---\ntitle: Test\n---\n\n# No story section here';
      mockReadFileSync.mockReturnValue(specContent);
      setupYamlMocks({ title: 'Test' });

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      const writeCall = mockWriteFileSync.mock.calls.find(
        (c: any[]) => c[0] === specPath
      );
      const written = writeCall![1] as string;
      expect(written).toContain('## User Stories');
    });

    it('should create new "Technical Tasks" section when none exists', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '3', name: 'Task' } } })
      );
      const specContent = '---\ntitle: Test\n---\n\n# Content only';
      mockReadFileSync.mockReturnValue(specContent);
      setupYamlMocks({ title: 'Test' });

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      const writeCall = mockWriteFileSync.mock.calls.find(
        (c: any[]) => c[0] === specPath
      );
      const written = writeCall![1] as string;
      expect(written).toContain('## Technical Tasks');
    });

    it('should include Jira link in bug section with priority', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({
          fields: {
            issuetype: { id: '2', name: 'Bug' },
            priority: { id: '1', name: 'Highest' },
          },
        })
      );
      const specContent = '---\ntitle: Test\n---\n\n# Content';
      mockReadFileSync.mockReturnValue(specContent);
      setupYamlMocks({ title: 'Test' });

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      const writeCall = mockWriteFileSync.mock.calls.find(
        (c: any[]) => c[0] === specPath
      );
      const written = writeCall![1] as string;
      expect(written).toContain(`https://${TEST_DOMAIN}/browse/SCRUM-1`);
      expect(written).toContain('**Priority**');
    });
  });

  describe('addWorkItemToTasks (via addItemToIncrement)', () => {
    const incrementId = '0001-test';
    const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);
    const tasksPath = path.join(incrementFolder, 'tasks.md');

    it('should create tasks.md if it does not exist', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '1', name: 'Story' } } })
      );

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        if (p === tasksPath) return false;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('spec.md')) return '---\ntitle: Test\n---\n\n# Content';
        throw new Error('unexpected read');
      });
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      const tasksWrite = mockWriteFileSync.mock.calls.find(
        (c: any[]) => c[0] === tasksPath
      );
      expect(tasksWrite).toBeDefined();
      const content = tasksWrite![1] as string;
      expect(content).toContain('# Tasks');
      expect(content).toContain('User Story');
      expect(content).toContain('SCRUM-1');
    });

    it('should append to existing tasks.md', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '2', name: 'Bug' } } })
      );

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        if (p === tasksPath) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('tasks.md')) return '# Tasks\n\n## Existing Task\n';
        if (typeof p === 'string' && p.endsWith('spec.md')) return '---\ntitle: Test\n---\n\n# Content';
        return '';
      });
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      const tasksWrite = mockWriteFileSync.mock.calls.find(
        (c: any[]) => c[0] === tasksPath
      );
      expect(tasksWrite).toBeDefined();
      const content = tasksWrite![1] as string;
      expect(content).toContain('Existing Task');
      expect(content).toContain('Bug Fix');
    });

    it('should use "Technical Task" section title for task type', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '3', name: 'Task' } } })
      );

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        if (p === tasksPath) return false;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('spec.md')) return '---\ntitle: Test\n---\n\n# Content';
        throw new Error('unexpected');
      });
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      const tasksWrite = mockWriteFileSync.mock.calls.find(
        (c: any[]) => c[0] === tasksPath
      );
      const content = tasksWrite![1] as string;
      expect(content).toContain('Technical Task');
    });
  });

  describe('updateRFCWithWorkItem (via addItemToIncrement)', () => {
    const incrementId = '0001-test';
    const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);
    const rfcFolder = path.join(TEST_ROOT, '.specweave', 'docs', 'rfcs');

    it('should update existing RFC with "Detailed Design" section', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '1', name: 'Story' } } })
      );

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('spec.md'))
          return '---\ntitle: Test\n---\n\n# Content';
        if (typeof p === 'string' && p.includes('rfc-'))
          return '# RFC\n\n## Detailed Design\n\nExisting design';
        return '';
      });
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue(['rfc-0001-test.md']);

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      const rfcWrite = mockWriteFileSync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('rfc-')
      );
      expect(rfcWrite).toBeDefined();
      const content = rfcWrite![1] as string;
      expect(content).toContain('STORY');
      expect(content).toContain('SCRUM-1');
    });

    it('should append "Detailed Design" section when not present', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '2', name: 'Bug' } } })
      );

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('spec.md'))
          return '---\ntitle: Test\n---\n\n# Content';
        if (typeof p === 'string' && p.includes('rfc-'))
          return '# RFC\n\n## Summary\n\nJust a summary';
        return '';
      });
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue(['rfc-0001-test.md']);

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      const rfcWrite = mockWriteFileSync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('rfc-')
      );
      expect(rfcWrite).toBeDefined();
      const content = rfcWrite![1] as string;
      expect(content).toContain('## Detailed Design');
      expect(content).toContain('BUG');
    });

    it('should skip RFC update when no RFC file exists', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '1', name: 'Story' } } })
      );

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.endsWith('spec.md'))
          return '---\ntitle: Test\n---\n\n# Content';
        return '';
      });
      setupYamlMocks({ title: 'Test' });
      // No RFC files
      mockReaddirSync.mockReturnValue([]);

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      // Only spec.md and tasks.md should be written, not RFC
      const rfcWrite = mockWriteFileSync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('rfc-')
      );
      expect(rfcWrite).toBeUndefined();
    });
  });

  describe('parseMarkdownWithFrontmatter (via getIncrementWorkItems)', () => {
    it('should parse content with YAML frontmatter', () => {
      const content = '---\ntitle: Test\nstatus: active\n---\n\n# Body content';
      mockReadFileSync.mockReturnValue(content);
      mockYamlLoad.mockReturnValue({ title: 'Test', status: 'active', work_items: [] });

      const result = mapper.getIncrementWorkItems('0001-test');

      expect(mockYamlLoad).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle content without frontmatter', () => {
      mockReadFileSync.mockReturnValue('# Just content\n\nNo frontmatter here');

      const result = mapper.getIncrementWorkItems('0001-test');

      expect(result.stories).toHaveLength(0);
      expect(result.bugs).toHaveLength(0);
      expect(result.tasks).toHaveLength(0);
    });
  });

  describe('serializeMarkdownWithFrontmatter (via addItemToIncrement)', () => {
    it('should produce output with YAML frontmatter fences', async () => {
      mockClient.getIssue.mockResolvedValue(makeJiraIssue());
      const incrementId = '0001-test';
      const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);
      const specPath = path.join(incrementFolder, 'spec.md');

      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockYamlDump.mockReturnValue('title: Test\nwork_items: []\n');
      mockReaddirSync.mockReturnValue([]);

      await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      const writeCall = mockWriteFileSync.mock.calls.find(
        (c: any[]) => c[0] === specPath
      );
      expect(writeCall).toBeDefined();
      const written = writeCall![1] as string;
      expect(written).toMatch(/^---\n/);
      expect(written).toContain('---\n\n');
    });
  });

  describe('ensureDir (via createIncrementFromItems)', () => {
    it('should create directory when it does not exist', async () => {
      mockClient.getIssue.mockResolvedValue(makeJiraIssue());
      mockGetNextIncrementNumber.mockReturnValue('0001');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      await mapper.createIncrementFromItems('Test', ['SCRUM-1']);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('0001'),
        { recursive: true }
      );
    });

    it('should not create directory when it already exists', async () => {
      mockClient.getIssue.mockResolvedValue(makeJiraIssue());
      mockGetNextIncrementNumber.mockReturnValue('0001');
      // The folder already exists
      mockExistsSync.mockReturnValue(true);
      setupYamlMocks({});

      await mapper.createIncrementFromItems('Test', ['SCRUM-1']);

      // mkdirSync should NOT be called because ensureDir checks existsSync
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('generateSpecFromWorkItems (via createIncrementFromItems)', () => {
    it('should generate spec with stories section', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '1', name: 'Story' } } })
      );
      mockGetNextIncrementNumber.mockReturnValue('0002');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      await mapper.createIncrementFromItems('Story Feature', ['SCRUM-1']);

      const specWrite = mockWriteFileSync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].endsWith('spec.md')
      );
      expect(specWrite).toBeDefined();
      const content = specWrite![1] as string;
      expect(content).toContain('## User Stories');
      expect(content).toContain('SCRUM-1');
    });

    it('should generate spec with bugs section', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '2', name: 'Bug' } } })
      );
      mockGetNextIncrementNumber.mockReturnValue('0003');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      await mapper.createIncrementFromItems('Bug Fix', ['SCRUM-1']);

      const specWrite = mockWriteFileSync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].endsWith('spec.md')
      );
      const content = specWrite![1] as string;
      expect(content).toContain('## Bugs');
    });

    it('should generate spec with technical tasks section', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '3', name: 'Task' } } })
      );
      mockGetNextIncrementNumber.mockReturnValue('0004');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      await mapper.createIncrementFromItems('Task Work', ['SCRUM-1']);

      const specWrite = mockWriteFileSync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].endsWith('spec.md')
      );
      const content = specWrite![1] as string;
      expect(content).toContain('## Technical Tasks');
    });

    it('should not include sections with no items', async () => {
      // Only story, no bugs/tasks
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '1', name: 'Story' } } })
      );
      mockGetNextIncrementNumber.mockReturnValue('0005');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      await mapper.createIncrementFromItems('Stories Only', ['SCRUM-1']);

      const specWrite = mockWriteFileSync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].endsWith('spec.md')
      );
      const content = specWrite![1] as string;
      expect(content).toContain('## User Stories');
      expect(content).not.toContain('## Bugs');
      expect(content).not.toContain('## Technical Tasks');
    });
  });

  describe('generateTasksFromWorkItems (via createIncrementFromItems)', () => {
    it('should generate tasks.md with all work item types', async () => {
      mockClient.getIssue
        .mockResolvedValueOnce(makeJiraIssue({ key: 'S-1', fields: { issuetype: { id: '1', name: 'Story' } } }))
        .mockResolvedValueOnce(makeJiraIssue({ key: 'B-1', fields: { issuetype: { id: '2', name: 'Bug' } } }))
        .mockResolvedValueOnce(makeJiraIssue({ key: 'T-1', fields: { issuetype: { id: '3', name: 'Task' } } }));

      mockGetNextIncrementNumber.mockReturnValue('0006');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      await mapper.createIncrementFromItems('All Types', ['S-1', 'B-1', 'T-1']);

      const tasksWrite = mockWriteFileSync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].endsWith('tasks.md')
      );
      expect(tasksWrite).toBeDefined();
      const content = tasksWrite![1] as string;
      expect(content).toContain('# Tasks');
      expect(content).toContain('User Story');
      expect(content).toContain('Bug Fix');
      expect(content).toContain('Technical Task');
    });
  });

  describe('generateRFCFromWorkItems (via createIncrementFromItems)', () => {
    it('should call rfcGenerator.generateRFC with correct FlexibleRFCContent', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({
          key: 'SCRUM-5',
          fields: {
            issuetype: { id: '1', name: 'Story' },
            parent: { id: '100', key: 'SCRUM-EP1', fields: { summary: 'Epic Title' } },
            labels: ['api'],
          },
        })
      );
      mockGetNextIncrementNumber.mockReturnValue('0007');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      await mapper.createIncrementFromItems('RFC Feature', ['SCRUM-5']);

      expect(mockGenerateRFC).toHaveBeenCalledTimes(1);
      const rfcArg = mockGenerateRFC.mock.calls[0][0];

      expect(rfcArg.metadata.incrementId).toBe('0007');
      expect(rfcArg.metadata.title).toBe('RFC Feature');
      expect(rfcArg.metadata.status).toBe('draft');
      expect(rfcArg.metadata.source).toBe('jira');
      expect(rfcArg.sourceMetadata.source_type).toBe('jira');
      expect(rfcArg.summary).toContain('1 user stories');
      expect(rfcArg.motivation).toContain('RFC Feature');
      expect(rfcArg.workItems).toHaveLength(1);
      expect(rfcArg.workItems[0].type).toBe('story');
      expect(rfcArg.workItems[0].source_key).toBe('SCRUM-5');
      expect(rfcArg.workItems[0].source_url).toContain(TEST_DOMAIN);
      expect(rfcArg.workItems[0].parent).toEqual({
        type: 'Epic',
        key: 'SCRUM-EP1',
        title: 'Epic Title',
      });
      expect(rfcArg.workItems[0].labels).toEqual(['api']);
    });

    it('should include bugs and tasks in workItems array', async () => {
      mockClient.getIssue
        .mockResolvedValueOnce(makeJiraIssue({ key: 'B-1', fields: { issuetype: { id: '2', name: 'Bug' } } }))
        .mockResolvedValueOnce(makeJiraIssue({ key: 'T-1', fields: { issuetype: { id: '3', name: 'Task' } } }));

      mockGetNextIncrementNumber.mockReturnValue('0008');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      await mapper.createIncrementFromItems('Bugs and Tasks', ['B-1', 'T-1']);

      const rfcArg = mockGenerateRFC.mock.calls[0][0];
      expect(rfcArg.workItems).toHaveLength(2);
      const types = rfcArg.workItems.map((w: any) => w.type);
      expect(types).toContain('bug');
      expect(types).toContain('task');
    });

    it('should handle items without parent_epic', async () => {
      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({
          key: 'SCRUM-10',
          fields: {
            issuetype: { id: '1', name: 'Story' },
            parent: undefined,
          },
        })
      );
      mockGetNextIncrementNumber.mockReturnValue('0009');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      await mapper.createIncrementFromItems('No Parent', ['SCRUM-10']);

      const rfcArg = mockGenerateRFC.mock.calls[0][0];
      expect(rfcArg.workItems[0].parent).toBeUndefined();
    });
  });

  describe('getNextIncrementId (via createIncrementFromItems)', () => {
    it('should use IncrementNumberManager.getNextIncrementNumber by default', async () => {
      mockClient.getIssue.mockResolvedValue(makeJiraIssue());
      mockGetNextIncrementNumber.mockReturnValue('0042');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      const result = await mapper.createIncrementFromItems('Test', ['SCRUM-1']);

      expect(result.incrementId).toBe('0042');
      expect(mockGetNextIncrementNumber).toHaveBeenCalledWith(TEST_ROOT, false);
    });

    it('should use getNextIncrementNumberForProject when targetProjectId is set', async () => {
      const mapperWithProject = new JiraIncrementalMapper(
        mockClient,
        makeConfig(),
        TEST_ROOT,
        'my-project'
      );

      mockClient.getIssue.mockResolvedValue(makeJiraIssue());
      mockGetNextIncrementNumberForProject.mockReturnValue('0100');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      const result = await mapperWithProject.createIncrementFromItems('Test', ['SCRUM-1']);

      expect(result.incrementId).toBe('0100');
      expect(mockGetNextIncrementNumberForProject).toHaveBeenCalledWith(TEST_ROOT, 'my-project');
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty jiraKeys array in createIncrementFromItems', async () => {
      mockGetNextIncrementNumber.mockReturnValue('0001');
      mockExistsSync.mockReturnValue(false);
      setupYamlMocks({});

      const result = await mapper.createIncrementFromItems('Empty', []);

      expect(result.success).toBe(true);
      expect(result.message).toContain('0 work items');
    });

    it('should handle issue with empty labels array', async () => {
      const incrementId = '0001-test';
      const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);

      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { labels: [] } })
      );
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      expect(result.workItem!.labels).toEqual([]);
    });

    it('should handle issue without assignee', async () => {
      const incrementId = '0001-test';
      const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);

      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { assignee: undefined } })
      );
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      expect(result.workItem!.assignee).toBeUndefined();
    });

    it('should use TASK prefix for epic type in createWorkItemFromIssue (default case)', async () => {
      const incrementId = '0001-test';
      const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);

      mockClient.getIssue.mockResolvedValue(
        makeJiraIssue({ fields: { issuetype: { id: '4', name: 'Epic' } } })
      );
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      setupYamlMocks({ title: 'Test' });
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      // Epic uses default TASK prefix in switch statement
      expect(result.workItem!.id).toMatch(/^TASK/);
    });

    it('should handle addWorkItemToSpec with existing work_items but initializing as undefined', async () => {
      const incrementId = '0001-test';
      const incrementFolder = path.join(TEST_ROOT, '.specweave', 'increments', incrementId);

      mockClient.getIssue.mockResolvedValue(makeJiraIssue());
      mockExistsSync.mockImplementation((p: string) => {
        if (p === incrementFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Content');
      // Frontmatter without work_items key
      mockYamlLoad.mockReturnValue({ title: 'Test' });
      mockYamlDump.mockImplementation((obj: any) => JSON.stringify(obj));
      mockReaddirSync.mockReturnValue([]);

      const result = await mapper.addItemToIncrement(incrementId, 'SCRUM-1');

      expect(result.success).toBe(true);
      // Verify work_items was initialized
      const specWrite = mockWriteFileSync.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].endsWith('spec.md')
      );
      expect(specWrite).toBeDefined();
    });
  });
});
