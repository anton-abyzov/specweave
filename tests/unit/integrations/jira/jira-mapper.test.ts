/**
 * Unit tests for JiraMapper bidirectional sync
 *
 * Tests:
 * - setJiraMapperLogger
 * - JiraMapper constructor
 * - importEpicAsIncrement (success, error, subtask mapping)
 * - exportIncrementAsEpic (success, error, already-synced redirect)
 * - syncIncrement (success, conflict detection, unlinked error)
 * - parseMarkdownWithFrontmatter / serializeMarkdownWithFrontmatter
 * - extractTextFromJiraDescription (string, ADF, null)
 * - extractDescription / extractUserStories / parseTasksMd
 * - mapJiraStatusToSpecWeave / mapJiraPriorityToSpecWeave / mapPriorityToJira
 * - slugify
 * - getNextIncrementId (with/without targetProjectId)
 * - ensureDir
 * - generateSpecMd / generateTasksMd / generateRFC
 * - updateSpecWithJiraMetadata
 *
 * @module tests/unit/integrations/jira/jira-mapper.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fsReal from 'fs';

// ==================== Hoisted mocks ====================

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

const mockYaml = vi.hoisted(() => ({
  load: vi.fn(),
  dump: vi.fn(),
}));

const mockIncrementNumberManager = vi.hoisted(() => ({
  getNextIncrementNumber: vi.fn(),
  getNextIncrementNumberForProject: vi.fn(),
}));

const mockMetadataManager = vi.hoisted(() => ({
  validateBeforeCreate: vi.fn(),
}));

const mockConsoleLogger = vi.hoisted(() => ({
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

const mockSilentLogger = vi.hoisted(() => ({
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

// ==================== vi.mock calls ====================

vi.mock('fs', () => ({
  ...mockFs,
  default: mockFs,
}));

vi.mock('js-yaml', () => ({
  ...mockYaml,
  default: mockYaml,
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: mockConsoleLogger,
  silentLogger: mockSilentLogger,
}));

vi.mock('../../../../src/core/increment/increment-utils.js', () => ({
  IncrementNumberManager: mockIncrementNumberManager,
}));

vi.mock('../../../../src/core/config/config-manager.js', () => ({
  ConfigManager: {},
}));

vi.mock('../../../../src/integrations/jira/jira-client.js', () => ({
  JiraClient: class MockJiraClient {},
  JiraIssue: {},
}));

vi.mock('../../../../src/core/increment/metadata-manager.js', () => ({
  MetadataManager: mockMetadataManager,
}));

// ==================== Dynamic imports (after mocks) ====================

const {
  JiraMapper,
  setJiraMapperLogger,
} = await import('../../../../src/integrations/jira/jira-mapper.js');

// ==================== Test helpers ====================

function createMockClient(overrides: Record<string, any> = {}) {
  return {
    getIssue: vi.fn(),
    searchIssues: vi.fn(),
    createIssue: vi.fn(),
    updateIssue: vi.fn(),
    ...overrides,
  } as any;
}

function createMockJiraIssue(overrides: Partial<any> = {}): any {
  return {
    id: '10001',
    key: 'PROJ-1',
    self: 'https://test.atlassian.net/rest/api/3/issue/10001',
    fields: {
      summary: 'Test Epic Summary',
      description: null,
      issuetype: { id: '10000', name: 'Epic' },
      status: { id: '1', name: 'To Do' },
      priority: { id: '3', name: 'Medium' },
      labels: [],
      ...overrides.fields,
    },
    ...overrides,
  };
}

function createMockStory(key: string, summary: string, statusName = 'To Do'): any {
  return createMockJiraIssue({
    key,
    id: key.replace('-', ''),
    fields: {
      summary,
      description: `Description for ${summary}`,
      issuetype: { id: '10001', name: 'Story' },
      status: { id: '1', name: statusName },
      priority: { id: '3', name: 'Medium' },
    },
  });
}

function createMockSubtask(key: string, summary: string, statusName = 'To Do'): any {
  return createMockJiraIssue({
    key,
    id: key.replace('-', ''),
    fields: {
      summary,
      description: null,
      issuetype: { id: '10002', name: 'Sub-task' },
      status: { id: '1', name: statusName },
      priority: { id: '3', name: 'Medium' },
    },
  });
}

const TEST_CONFIG = { domain: 'test-company.atlassian.net' };
const TEST_ROOT = path.join(os.tmpdir(), 'specweave-jira-mapper-test');

// ==================== Tests ====================

describe('JiraMapper', () => {
  let mapper: InstanceType<typeof JiraMapper>;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    mapper = new JiraMapper(mockClient, TEST_CONFIG, TEST_ROOT);
    // Suppress console output during tests
    setJiraMapperLogger(mockSilentLogger);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // setJiraMapperLogger
  // ==========================================
  describe('setJiraMapperLogger', () => {
    it('should accept and use a custom logger', () => {
      const customLogger = {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };
      setJiraMapperLogger(customLogger);
      // Calling a method that logs errors to verify logger is used
      // We will trigger an error path to check this
      expect(() => setJiraMapperLogger(customLogger)).not.toThrow();
    });
  });

  // ==========================================
  // Constructor
  // ==========================================
  describe('constructor', () => {
    it('should initialize with client, config, and project root', () => {
      const m = new JiraMapper(mockClient, TEST_CONFIG, TEST_ROOT);
      expect(m).toBeDefined();
    });

    it('should accept optional targetProjectId', () => {
      const m = new JiraMapper(mockClient, TEST_CONFIG, TEST_ROOT, 'my-project');
      expect(m).toBeDefined();
    });

    it('should default projectRoot to process.cwd() if not provided', () => {
      const m = new JiraMapper(mockClient, TEST_CONFIG);
      expect(m).toBeDefined();
    });
  });

  // ==========================================
  // importEpicAsIncrement
  // ==========================================
  describe('importEpicAsIncrement', () => {
    const mockEpic = createMockJiraIssue({
      key: 'PROJ-100',
      id: '10100',
      fields: {
        summary: 'My Epic Feature',
        description: 'Epic description text',
        issuetype: { id: '10000', name: 'Epic' },
        status: { id: '1', name: 'To Do' },
        priority: { id: '3', name: 'Medium' },
      },
    });

    const mockStories = [
      createMockStory('PROJ-101', 'User Story 1'),
      createMockStory('PROJ-102', 'User Story 2'),
    ];

    const mockSubtasks1 = [
      createMockSubtask('PROJ-201', 'Subtask A'),
      createMockSubtask('PROJ-202', 'Subtask B', 'Done'),
    ];
    const mockSubtasks2 = [
      createMockSubtask('PROJ-203', 'Subtask C'),
    ];

    beforeEach(() => {
      mockClient.getIssue.mockResolvedValue(mockEpic);
      mockClient.searchIssues
        .mockResolvedValueOnce(mockStories) // stories for epic
        .mockResolvedValueOnce(mockSubtasks1) // subtasks for story 1
        .mockResolvedValueOnce(mockSubtasks2); // subtasks for story 2
      mockClient.updateIssue.mockResolvedValue(mockEpic);

      mockIncrementNumberManager.getNextIncrementNumber.mockReturnValue('0042');
      mockMetadataManager.validateBeforeCreate.mockResolvedValue(undefined);
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);
      mockYaml.dump.mockReturnValue('mocked: yaml\n');
    });

    it('should successfully import an epic as increment', async () => {
      const result = await mapper.importEpicAsIncrement('PROJ-100');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('import');
      expect(result.direction).toBe('jira-to-specweave');
      expect(result.conflicts).toEqual([]);
      expect(result.changes.created).toBe(1 + 2 + 3); // 1 increment + 2 stories + 3 subtasks
      expect(result.changes.updated).toBe(1); // Updated Epic with SpecWeave ID
      expect(result.changes.deleted).toBe(0);
      expect(result.summary).toContain('PROJ-100');
      expect(result.summary).toContain('0042');
    });

    it('should fetch epic from client', async () => {
      await mapper.importEpicAsIncrement('PROJ-100');
      expect(mockClient.getIssue).toHaveBeenCalledWith('PROJ-100');
    });

    it('should search for stories linked to the epic', async () => {
      await mapper.importEpicAsIncrement('PROJ-100');
      expect(mockClient.searchIssues).toHaveBeenCalledWith({
        jql: 'parent = PROJ-100 AND issuetype = Story',
        maxResults: 100,
      });
    });

    it('should search for subtasks of each story', async () => {
      await mapper.importEpicAsIncrement('PROJ-100');
      expect(mockClient.searchIssues).toHaveBeenCalledWith({
        jql: 'parent = PROJ-101 AND issuetype = Sub-task',
        maxResults: 50,
      });
      expect(mockClient.searchIssues).toHaveBeenCalledWith({
        jql: 'parent = PROJ-102 AND issuetype = Sub-task',
        maxResults: 50,
      });
    });

    it('should create the increment folder', async () => {
      await mapper.importEpicAsIncrement('PROJ-100');
      const expectedFolder = path.join(TEST_ROOT, '.specweave', 'increments', '0042');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(expectedFolder, { recursive: true });
    });

    it('should validate before create to check for duplicate IDs', async () => {
      await mapper.importEpicAsIncrement('PROJ-100');
      expect(mockMetadataManager.validateBeforeCreate).toHaveBeenCalledWith('0042', TEST_ROOT);
    });

    it('should update the epic in Jira with the SpecWeave ID', async () => {
      await mapper.importEpicAsIncrement('PROJ-100');
      expect(mockClient.updateIssue).toHaveBeenCalledWith({
        key: 'PROJ-100',
        customFields: {
          'SpecWeave-Increment-ID': '0042',
        },
      });
    });

    it('should generate spec.md, tasks.md, and RFC', async () => {
      await mapper.importEpicAsIncrement('PROJ-100');
      // spec.md
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('spec.md'),
        expect.any(String),
        'utf-8'
      );
      // tasks.md
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('tasks.md'),
        expect.any(String),
        'utf-8'
      );
      // RFC
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('rfc-'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should return failure result on error', async () => {
      mockClient.getIssue.mockRejectedValue(new Error('Network error'));

      const result = await mapper.importEpicAsIncrement('PROJ-100');

      expect(result.success).toBe(false);
      expect(result.operation).toBe('import');
      expect(result.direction).toBe('jira-to-specweave');
      expect(result.summary).toContain('Network error');
      expect(result.changes.created).toBe(0);
    });

    it('should use project-scoped ID when targetProjectId is set', async () => {
      const projectMapper = new JiraMapper(mockClient, TEST_CONFIG, TEST_ROOT, 'my-project');
      setJiraMapperLogger(mockSilentLogger);
      mockIncrementNumberManager.getNextIncrementNumberForProject.mockReturnValue('0005');

      await projectMapper.importEpicAsIncrement('PROJ-100');

      expect(mockIncrementNumberManager.getNextIncrementNumberForProject).toHaveBeenCalledWith(
        TEST_ROOT,
        'my-project'
      );
    });

    it('should use global ID when targetProjectId is NOT set', async () => {
      await mapper.importEpicAsIncrement('PROJ-100');
      expect(mockIncrementNumberManager.getNextIncrementNumber).toHaveBeenCalledWith(
        TEST_ROOT,
        false
      );
    });

    it('should handle zero stories', async () => {
      mockClient.searchIssues.mockReset();
      mockClient.searchIssues.mockResolvedValue([]);

      const result = await mapper.importEpicAsIncrement('PROJ-100');
      expect(result.success).toBe(true);
      expect(result.changes.created).toBe(1); // Just the increment itself
    });
  });

  // ==========================================
  // exportIncrementAsEpic
  // ==========================================
  describe('exportIncrementAsEpic', () => {
    const specContentNoJira = [
      '---',
      'title: My Feature',
      'status: planned',
      'priority: P2',
      '---',
      '',
      '# My Feature',
      '',
      'Some description here.',
      'More description.',
      '',
      '## User Stories',
      '',
      '### US0042-001: First Story',
      '',
      'First story description.',
      '',
      '### US0042-002: Second Story',
      '',
      'Second story description.',
      '',
    ].join('\n');

    const specContentWithJira = [
      '---',
      'title: Already Synced Feature',
      'status: in-progress',
      'priority: P1',
      'jira:',
      '  epic_key: PROJ-50',
      '---',
      '',
      '# Already Synced',
      '',
    ].join('\n');

    const tasksContent = [
      '# Tasks',
      '',
      '## User Story: US-001',
      '',
      '- [x] Complete task one (Jira: PROJ-301)',
      '- [ ] Incomplete task two',
      '',
      '## User Story: US-002',
      '',
      '- [ ] Task three',
      '',
    ].join('\n');

    const createdEpic = createMockJiraIssue({
      key: 'PROJ-200',
      id: '10200',
      fields: {
        summary: '[Increment 0042] My Feature',
        issuetype: { id: '10000', name: 'Epic' },
        status: { id: '1', name: 'To Do' },
      },
    });

    const createdStory1 = createMockJiraIssue({
      key: 'PROJ-201',
      id: '10201',
      fields: {
        summary: 'First Story',
        issuetype: { id: '10001', name: 'Story' },
        status: { id: '1', name: 'To Do' },
      },
    });

    const createdStory2 = createMockJiraIssue({
      key: 'PROJ-202',
      id: '10202',
      fields: {
        summary: 'Second Story',
        issuetype: { id: '10001', name: 'Story' },
        status: { id: '1', name: 'To Do' },
      },
    });

    beforeEach(() => {
      // parseMarkdownWithFrontmatter needs yaml.load
      mockYaml.load.mockImplementation((yamlStr: string) => {
        if (yamlStr.includes('Already Synced')) {
          return {
            title: 'Already Synced Feature',
            status: 'in-progress',
            priority: 'P1',
            jira: { epic_key: 'PROJ-50' },
          };
        }
        return {
          title: 'My Feature',
          status: 'planned',
          priority: 'P2',
        };
      });
      mockYaml.dump.mockReturnValue('mocked: yaml\n');

      mockFs.readFileSync.mockImplementation((filePath: string) => {
        if (String(filePath).endsWith('tasks.md')) return tasksContent;
        return specContentNoJira;
      });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockReturnValue(undefined);

      mockClient.createIssue
        .mockResolvedValueOnce(createdEpic)
        .mockResolvedValueOnce(createdStory1)
        .mockResolvedValueOnce(createdStory2);
    });

    it('should successfully export an increment as epic', async () => {
      const result = await mapper.exportIncrementAsEpic('0042', 'PROJ');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('export');
      expect(result.direction).toBe('specweave-to-jira');
      expect(result.changes.created).toBeGreaterThanOrEqual(3); // 1 epic + 2 stories
      expect(result.summary).toContain('0042');
      expect(result.summary).toContain('PROJ-200');
    });

    it('should read spec.md from the correct path', async () => {
      await mapper.exportIncrementAsEpic('0042', 'PROJ');
      const expectedPath = path.join(TEST_ROOT, '.specweave', 'increments', '0042', 'spec.md');
      expect(mockFs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf-8');
    });

    it('should create an Epic in Jira with correct parameters', async () => {
      await mapper.exportIncrementAsEpic('0042', 'PROJ');
      expect(mockClient.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          issueType: 'Epic',
          summary: expect.stringContaining('My Feature'),
          labels: expect.arrayContaining(['specweave']),
        }),
        'PROJ'
      );
    });

    it('should create Stories for each user story', async () => {
      await mapper.exportIncrementAsEpic('0042', 'PROJ');
      // At least 2 story creation calls + 1 epic = 3 createIssue calls
      expect(mockClient.createIssue).toHaveBeenCalledTimes(3);
    });

    it('should redirect to syncIncrement if already synced', async () => {
      mockFs.readFileSync.mockReturnValue(specContentWithJira);
      mockYaml.load.mockReturnValue({
        title: 'Already Synced Feature',
        status: 'in-progress',
        priority: 'P1',
        jira: { epic_key: 'PROJ-50' },
      });

      // Need to mock for syncIncrement path
      const syncEpic = createMockJiraIssue({
        key: 'PROJ-50',
        fields: {
          summary: 'Already Synced Feature',
          status: { id: '1', name: 'To Do' },
        },
      });
      mockClient.getIssue.mockResolvedValue(syncEpic);

      const result = await mapper.exportIncrementAsEpic('0042', 'PROJ');
      // Should call syncIncrement instead of creating a new epic
      expect(mockClient.createIssue).not.toHaveBeenCalled();
    });

    it('should return failure result on error', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await mapper.exportIncrementAsEpic('0042', 'PROJ');

      expect(result.success).toBe(false);
      expect(result.operation).toBe('export');
      expect(result.direction).toBe('specweave-to-jira');
      expect(result.summary).toContain('File not found');
    });

    it('should handle case when tasks.md does not exist', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (String(p).endsWith('tasks.md')) return false;
        return true;
      });

      // Only epic + stories, no subtask creation
      const result = await mapper.exportIncrementAsEpic('0042', 'PROJ');
      expect(result.success).toBe(true);
    });

    it('should update spec.md with Jira metadata after export', async () => {
      await mapper.exportIncrementAsEpic('0042', 'PROJ');
      // writeFileSync should be called to update spec with jira metadata
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('spec.md'),
        expect.any(String),
        'utf-8'
      );
    });
  });

  // ==========================================
  // syncIncrement
  // ==========================================
  describe('syncIncrement', () => {
    const syncSpecContent = [
      '---',
      'title: Synced Feature',
      'status: planned',
      'jira:',
      '  epic_key: PROJ-50',
      '  last_sync: "2024-01-01T00:00:00.000Z"',
      '---',
      '',
      '# Synced Feature',
      '',
    ].join('\n');

    beforeEach(() => {
      mockFs.readFileSync.mockReturnValue(syncSpecContent);
      mockYaml.load.mockReturnValue({
        title: 'Synced Feature',
        status: 'planned',
        jira: {
          epic_key: 'PROJ-50',
          last_sync: '2024-01-01T00:00:00.000Z',
        },
      });
      mockYaml.dump.mockReturnValue('mocked: yaml\n');
      mockFs.writeFileSync.mockReturnValue(undefined);
    });

    it('should sync when title and status match (no conflicts)', async () => {
      mockClient.getIssue.mockResolvedValue(
        createMockJiraIssue({
          key: 'PROJ-50',
          fields: {
            summary: 'Synced Feature',
            status: { id: '1', name: 'To Do' },
          },
        })
      );

      const result = await mapper.syncIncrement('0042');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('sync');
      expect(result.direction).toBe('bidirectional');
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect title conflict', async () => {
      mockClient.getIssue.mockResolvedValue(
        createMockJiraIssue({
          key: 'PROJ-50',
          fields: {
            summary: 'Different Jira Title',
            status: { id: '1', name: 'To Do' },
          },
        })
      );

      const result = await mapper.syncIncrement('0042');

      expect(result.success).toBe(true);
      expect(result.conflicts.length).toBeGreaterThanOrEqual(1);
      const titleConflict = result.conflicts.find((c: any) => c.type === 'title');
      expect(titleConflict).toBeDefined();
      expect(titleConflict!.jira_value).toBe('Different Jira Title');
      expect(titleConflict!.specweave_value).toBe('Synced Feature');
      expect(titleConflict!.resolution).toBe('jira');
    });

    it('should detect status conflict', async () => {
      mockClient.getIssue.mockResolvedValue(
        createMockJiraIssue({
          key: 'PROJ-50',
          fields: {
            summary: 'Synced Feature',
            status: { id: '3', name: 'Done' },
          },
        })
      );

      const result = await mapper.syncIncrement('0042');

      expect(result.success).toBe(true);
      const statusConflict = result.conflicts.find((c: any) => c.type === 'status');
      expect(statusConflict).toBeDefined();
      expect(statusConflict!.jira_value).toBe('Done');
      expect(statusConflict!.specweave_value).toBe('planned');
    });

    it('should strip "[Increment XXXX] " prefix from Jira title when comparing', async () => {
      mockClient.getIssue.mockResolvedValue(
        createMockJiraIssue({
          key: 'PROJ-50',
          fields: {
            summary: '[Increment 0042] Synced Feature',
            status: { id: '1', name: 'To Do' },
          },
        })
      );

      const result = await mapper.syncIncrement('0042');
      // After stripping prefix, titles should match
      expect(result.conflicts.filter((c: any) => c.type === 'title')).toHaveLength(0);
    });

    it('should throw error if increment not linked to Jira', async () => {
      mockYaml.load.mockReturnValue({
        title: 'Unlinked Feature',
        status: 'planned',
        // no jira field
      });

      const result = await mapper.syncIncrement('0042');
      expect(result.success).toBe(false);
      expect(result.summary).toContain('not linked');
    });

    it('should return failure result on network error', async () => {
      mockClient.getIssue.mockRejectedValue(new Error('Connection timeout'));

      const result = await mapper.syncIncrement('0042');
      expect(result.success).toBe(false);
      expect(result.summary).toContain('Connection timeout');
    });

    it('should update spec.md with last_sync timestamp', async () => {
      mockClient.getIssue.mockResolvedValue(
        createMockJiraIssue({
          key: 'PROJ-50',
          fields: {
            summary: 'Synced Feature',
            status: { id: '1', name: 'To Do' },
          },
        })
      );

      await mapper.syncIncrement('0042');
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should update changes.updated count when conflicts resolved', async () => {
      mockClient.getIssue.mockResolvedValue(
        createMockJiraIssue({
          key: 'PROJ-50',
          fields: {
            summary: 'Changed Title',
            status: { id: '3', name: 'Done' },
          },
        })
      );

      const result = await mapper.syncIncrement('0042');
      expect(result.changes.updated).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================
  // Private helper methods (tested via public API + direct access)
  // ==========================================

  describe('parseMarkdownWithFrontmatter (via export)', () => {
    it('should parse frontmatter from valid markdown', async () => {
      // Test through exportIncrementAsEpic which calls parseMarkdownWithFrontmatter
      const yamlContent = 'title: Test\nstatus: planned\n';
      mockYaml.load.mockReturnValue({ title: 'Test', status: 'planned' });
      mockFs.readFileSync.mockReturnValue(`---\n${yamlContent}---\n\n# Test\n`);

      // Access private method via type assertion for unit test coverage
      const m = mapper as any;
      const result = m.parseMarkdownWithFrontmatter(`---\n${yamlContent}---\n\n# Test Content\n`);

      expect(mockYaml.load).toHaveBeenCalled();
      expect(result.content).toContain('# Test Content');
    });

    it('should return empty frontmatter for content without frontmatter', () => {
      const m = mapper as any;
      const result = m.parseMarkdownWithFrontmatter('# Just markdown\n\nNo frontmatter here.');

      expect(result.frontmatter).toEqual({});
      expect(result.content).toContain('# Just markdown');
    });
  });

  describe('serializeMarkdownWithFrontmatter', () => {
    it('should produce yaml frontmatter + content', () => {
      mockYaml.dump.mockReturnValue('title: Test\n');

      const m = mapper as any;
      const result = m.serializeMarkdownWithFrontmatter({ title: 'Test' }, '# Content\n');

      expect(result).toBe('---\ntitle: Test\n---\n\n# Content\n');
    });
  });

  describe('extractTextFromJiraDescription', () => {
    it('should return empty string for null description', () => {
      const m = mapper as any;
      expect(m.extractTextFromJiraDescription(null)).toBe('');
    });

    it('should return empty string for undefined description', () => {
      const m = mapper as any;
      expect(m.extractTextFromJiraDescription(undefined)).toBe('');
    });

    it('should return string description as-is', () => {
      const m = mapper as any;
      expect(m.extractTextFromJiraDescription('Plain text description')).toBe('Plain text description');
    });

    it('should extract text from ADF document format', () => {
      const m = mapper as any;
      const adfDoc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello' },
              { type: 'text', text: 'World' },
            ],
          },
        ],
      };

      // texts.join(' ') separates each text node with a space
      expect(m.extractTextFromJiraDescription(adfDoc)).toBe('Hello World');
    });

    it('should handle ADF with nested content nodes', () => {
      const m = mapper as any;
      const adfDoc = {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  { type: 'text', text: 'Item 1' },
                ],
              },
            ],
          },
        ],
      };

      expect(m.extractTextFromJiraDescription(adfDoc)).toBe('Item 1');
    });

    it('should handle ADF with empty content array', () => {
      const m = mapper as any;
      const adfDoc = {
        type: 'doc',
        content: [],
      };

      expect(m.extractTextFromJiraDescription(adfDoc)).toBe('');
    });

    it('should convert non-string, non-ADF description to string', () => {
      const m = mapper as any;
      expect(m.extractTextFromJiraDescription(42)).toBe('42');
    });
  });

  describe('extractDescription', () => {
    it('should extract first 5 lines of content', () => {
      const m = mapper as any;
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7';
      const result = m.extractDescription(content);
      expect(result).toBe('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
    });

    it('should handle content with fewer than 5 lines', () => {
      const m = mapper as any;
      const result = m.extractDescription('Short\ncontent');
      expect(result).toBe('Short\ncontent');
    });

    it('should trim the result', () => {
      const m = mapper as any;
      const result = m.extractDescription('  Line 1  \n  Line 2  ');
      expect(result).toBe('Line 1  \n  Line 2');
    });
  });

  describe('extractUserStories', () => {
    it('should extract user stories from markdown content', () => {
      const m = mapper as any;
      const content = [
        '### US0042-001: First Story',
        '',
        'First description line.',
        '',
        '### US0042-002: Second Story',
        '',
        'Second description line.',
      ].join('\n');

      const stories = m.extractUserStories(content);
      expect(stories).toHaveLength(2);
      expect(stories[0].id).toBe('US0042-001');
      expect(stories[0].title).toBe('First Story');
      expect(stories[0].description).toContain('First description line.');
      expect(stories[1].id).toBe('US0042-002');
      expect(stories[1].title).toBe('Second Story');
    });

    it('should return empty array for content without user stories', () => {
      const m = mapper as any;
      const result = m.extractUserStories('# No stories here\n\nJust text.');
      expect(result).toEqual([]);
    });

    it('should handle single user story', () => {
      const m = mapper as any;
      const content = '### US1-001: Only Story\n\nSome description.';
      const stories = m.extractUserStories(content);
      expect(stories).toHaveLength(1);
      expect(stories[0].id).toBe('US1-001');
    });

    it('should skip empty lines in story descriptions', () => {
      const m = mapper as any;
      const content = '### US1-001: My Story\n\nDesc line 1\nDesc line 2\n\n### US1-002: Next';
      const stories = m.extractUserStories(content);
      expect(stories[0].description).toContain('Desc line 1');
      expect(stories[0].description).toContain('Desc line 2');
    });
  });

  describe('parseTasksMd', () => {
    it('should parse tasks grouped by user story', () => {
      const tasksContent = [
        '# Tasks',
        '',
        '## User Story: US-001',
        '',
        '- [x] Completed task (Jira: PROJ-301)',
        '- [ ] Pending task',
        '',
        '## User Story: US-002',
        '',
        '- [ ] Another task',
      ].join('\n');

      mockFs.readFileSync.mockReturnValue(tasksContent);

      const m = mapper as any;
      const tasks = m.parseTasksMd('/fake/tasks.md');

      expect(tasks['US-001']).toHaveLength(2);
      expect(tasks['US-001'][0].completed).toBe(true);
      expect(tasks['US-001'][0].description).toBe('Completed task');
      expect(tasks['US-001'][1].completed).toBe(false);
      expect(tasks['US-001'][1].description).toBe('Pending task');
      expect(tasks['US-002']).toHaveLength(1);
      expect(tasks['US-002'][0].description).toBe('Another task');
    });

    it('should handle empty tasks file', () => {
      mockFs.readFileSync.mockReturnValue('# Tasks\n');

      const m = mapper as any;
      const tasks = m.parseTasksMd('/fake/tasks.md');
      expect(Object.keys(tasks)).toHaveLength(0);
    });

    it('should handle user story with no tasks', () => {
      const content = '## User Story: US-001\n\nSome notes but no task checkboxes.\n';
      mockFs.readFileSync.mockReturnValue(content);

      const m = mapper as any;
      const tasks = m.parseTasksMd('/fake/tasks.md');
      expect(tasks['US-001']).toEqual([]);
    });
  });

  describe('mapJiraStatusToSpecWeave', () => {
    it('should map "Done" to "completed"', () => {
      const m = mapper as any;
      expect(m.mapJiraStatusToSpecWeave('Done')).toBe('completed');
    });

    it('should map "Complete" to "completed"', () => {
      const m = mapper as any;
      expect(m.mapJiraStatusToSpecWeave('Complete')).toBe('completed');
    });

    it('should map "In Progress" to "in-progress"', () => {
      const m = mapper as any;
      expect(m.mapJiraStatusToSpecWeave('In Progress')).toBe('in-progress');
    });

    it('should map "To Do" to "planned"', () => {
      const m = mapper as any;
      expect(m.mapJiraStatusToSpecWeave('To Do')).toBe('planned');
    });

    it('should map unknown status to "planned"', () => {
      const m = mapper as any;
      expect(m.mapJiraStatusToSpecWeave('Custom Status')).toBe('planned');
    });

    it('should be case-insensitive', () => {
      const m = mapper as any;
      expect(m.mapJiraStatusToSpecWeave('DONE')).toBe('completed');
      expect(m.mapJiraStatusToSpecWeave('in progress')).toBe('in-progress');
      expect(m.mapJiraStatusToSpecWeave('dOnE')).toBe('completed');
    });
  });

  describe('mapJiraPriorityToSpecWeave', () => {
    it('should map "Highest" to "P1"', () => {
      const m = mapper as any;
      expect(m.mapJiraPriorityToSpecWeave('Highest')).toBe('P1');
    });

    it('should map "Critical" to "P1"', () => {
      const m = mapper as any;
      expect(m.mapJiraPriorityToSpecWeave('Critical')).toBe('P1');
    });

    it('should map "High" to "P2"', () => {
      const m = mapper as any;
      expect(m.mapJiraPriorityToSpecWeave('High')).toBe('P2');
    });

    it('should map "Medium" to "P3"', () => {
      const m = mapper as any;
      expect(m.mapJiraPriorityToSpecWeave('Medium')).toBe('P3');
    });

    it('should map "Low" to "P3"', () => {
      const m = mapper as any;
      expect(m.mapJiraPriorityToSpecWeave('Low')).toBe('P3');
    });

    it('should return "P3" for undefined priority', () => {
      const m = mapper as any;
      expect(m.mapJiraPriorityToSpecWeave(undefined)).toBe('P3');
    });

    it('should be case-insensitive', () => {
      const m = mapper as any;
      expect(m.mapJiraPriorityToSpecWeave('HIGHEST')).toBe('P1');
      expect(m.mapJiraPriorityToSpecWeave('high')).toBe('P2');
    });
  });

  describe('mapPriorityToJira', () => {
    it('should map "P1" to "Highest"', () => {
      const m = mapper as any;
      expect(m.mapPriorityToJira('P1')).toBe('Highest');
    });

    it('should map "P2" to "High"', () => {
      const m = mapper as any;
      expect(m.mapPriorityToJira('P2')).toBe('High');
    });

    it('should map "P3" to "Medium"', () => {
      const m = mapper as any;
      expect(m.mapPriorityToJira('P3')).toBe('Medium');
    });

    it('should default to "Medium" for unknown priority', () => {
      const m = mapper as any;
      expect(m.mapPriorityToJira('P4')).toBe('Medium');
      expect(m.mapPriorityToJira('')).toBe('Medium');
    });
  });

  describe('slugify', () => {
    it('should convert text to lowercase slug', () => {
      const m = mapper as any;
      expect(m.slugify('Hello World')).toBe('hello-world');
    });

    it('should replace special characters with hyphens', () => {
      const m = mapper as any;
      expect(m.slugify('Feature: Add Auth (OAuth 2.0)')).toBe('feature-add-auth-oauth-2-0');
    });

    it('should trim leading/trailing hyphens', () => {
      const m = mapper as any;
      expect(m.slugify('---Hello---')).toBe('hello');
    });

    it('should collapse multiple hyphens', () => {
      const m = mapper as any;
      expect(m.slugify('a   b   c')).toBe('a-b-c');
    });

    it('should handle empty string', () => {
      const m = mapper as any;
      expect(m.slugify('')).toBe('');
    });
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const m = mapper as any;
      m.ensureDir('/tmp/test/dir');

      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/tmp/test/dir', { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      mockFs.existsSync.mockReturnValue(true);

      const m = mapper as any;
      m.ensureDir('/tmp/test/dir');

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // generateSpecMd (via import flow)
  // ==========================================
  describe('generateSpecMd', () => {
    it('should write spec.md with frontmatter and user stories', async () => {
      mockYaml.dump.mockReturnValue('increment_id: "0042"\ntitle: Epic Title\n');
      mockFs.writeFileSync.mockReturnValue(undefined);

      const m = mapper as any;
      const epic = createMockJiraIssue({
        key: 'PROJ-1',
        id: '10001',
        fields: {
          summary: 'Epic Title',
          description: 'Epic description',
          status: { id: '1', name: 'To Do' },
          priority: { id: '3', name: 'Medium' },
        },
      });
      const stories = [
        createMockStory('PROJ-2', 'Story One'),
        createMockStory('PROJ-3', 'Story Two'),
      ];

      await m.generateSpecMd('/tmp/increment', epic, stories, '0042');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join('/tmp/increment', 'spec.md'),
        expect.any(String),
        'utf-8'
      );

      const writtenContent = mockFs.writeFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('Epic Title');
    });

    it('should include Jira links for each story', async () => {
      mockYaml.dump.mockReturnValue('title: Test\n');
      mockFs.writeFileSync.mockReturnValue(undefined);

      const m = mapper as any;
      const epic = createMockJiraIssue({
        fields: {
          summary: 'Test Epic',
          description: null,
          status: { id: '1', name: 'To Do' },
          priority: { id: '3', name: 'Medium' },
        },
      });
      const stories = [createMockStory('PROJ-5', 'My Story')];

      await m.generateSpecMd('/tmp/increment', epic, stories, '0042');

      const writtenContent = mockFs.writeFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('PROJ-5');
      expect(writtenContent).toContain('test-company.atlassian.net');
    });
  });

  // ==========================================
  // generateTasksMd
  // ==========================================
  describe('generateTasksMd', () => {
    it('should write tasks.md with checkboxes for subtasks', async () => {
      mockFs.writeFileSync.mockReturnValue(undefined);

      const m = mapper as any;
      const storyTasks = [
        {
          story: createMockStory('PROJ-10', 'Story 1'),
          subtasks: [
            createMockSubtask('PROJ-20', 'Task A'),
            createMockSubtask('PROJ-21', 'Task B', 'Done'),
          ],
        },
      ];

      await m.generateTasksMd('/tmp/increment', storyTasks);

      const writtenContent = mockFs.writeFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('- [ ] Task A');
      expect(writtenContent).toContain('- [x] Task B');
      expect(writtenContent).toContain('PROJ-20');
      expect(writtenContent).toContain('PROJ-21');
    });

    it('should skip stories with no subtasks', async () => {
      mockFs.writeFileSync.mockReturnValue(undefined);

      const m = mapper as any;
      const storyTasks = [
        {
          story: createMockStory('PROJ-10', 'Story 1'),
          subtasks: [],
        },
        {
          story: createMockStory('PROJ-11', 'Story 2'),
          subtasks: [createMockSubtask('PROJ-22', 'One task')],
        },
      ];

      await m.generateTasksMd('/tmp/increment', storyTasks);

      const writtenContent = mockFs.writeFileSync.mock.calls[0][1];
      expect(writtenContent).not.toContain('US-001');
      expect(writtenContent).toContain('US-002');
    });
  });

  // ==========================================
  // generateRFC
  // ==========================================
  describe('generateRFC', () => {
    it('should write RFC markdown file', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      const m = mapper as any;
      const epic = createMockJiraIssue({
        key: 'PROJ-1',
        fields: {
          summary: 'My New Feature',
          description: 'Feature description',
          status: { id: '1', name: 'To Do' },
        },
      });
      const stories = [createMockStory('PROJ-2', 'Story One')];

      await m.generateRFC(epic, stories, '0042');

      const rfcDir = path.join(TEST_ROOT, '.specweave', 'docs', 'rfcs');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(rfcDir, { recursive: true });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('rfc-0042-my-new-feature.md'),
        expect.any(String),
        'utf-8'
      );

      const writtenContent = mockFs.writeFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('RFC 0042');
      expect(writtenContent).toContain('My New Feature');
      expect(writtenContent).toContain('PROJ-1');
      expect(writtenContent).toContain('Story One');
    });
  });

  // ==========================================
  // updateSpecWithJiraMetadata
  // ==========================================
  describe('updateSpecWithJiraMetadata', () => {
    it('should update spec.md with Jira epic and story metadata', async () => {
      const originalContent = '---\ntitle: Test\n---\n\n# Test\n';
      mockFs.readFileSync.mockReturnValue(originalContent);
      mockYaml.load.mockReturnValue({ title: 'Test' });
      mockYaml.dump.mockReturnValue('title: Test\njira:\n  epic_key: PROJ-1\n');
      mockFs.writeFileSync.mockReturnValue(undefined);

      const m = mapper as any;
      const epic = createMockJiraIssue({ key: 'PROJ-1', id: '10001' });
      const stories = [
        createMockJiraIssue({ key: 'PROJ-2', id: '10002' }),
        createMockJiraIssue({ key: 'PROJ-3', id: '10003' }),
      ];

      await m.updateSpecWithJiraMetadata('/tmp/spec.md', epic, stories);

      expect(mockYaml.dump).toHaveBeenCalled();
      const dumpArg = mockYaml.dump.mock.calls[0][0];
      expect(dumpArg.jira.epic_key).toBe('PROJ-1');
      expect(dumpArg.jira.epic_id).toBe('10001');
      expect(dumpArg.jira.stories).toHaveLength(2);
      expect(dumpArg.jira.sync_direction).toBe('export');
      expect(dumpArg.jira.epic_url).toContain('test-company.atlassian.net');
    });
  });

  // ==========================================
  // Edge cases and integration-like scenarios
  // ==========================================
  describe('edge cases', () => {
    it('should handle ADF description without content field', () => {
      const m = mapper as any;
      const adfDoc = { type: 'doc' };
      // content is undefined, so forEach won't be called
      expect(m.extractTextFromJiraDescription(adfDoc)).toBe('');
    });

    it('should handle epic without priority field', async () => {
      const epicNoPriority = createMockJiraIssue({
        key: 'PROJ-999',
        fields: {
          summary: 'No Priority Epic',
          description: null,
          issuetype: { id: '10000', name: 'Epic' },
          status: { id: '1', name: 'To Do' },
          priority: undefined,
        },
      });

      mockClient.getIssue.mockResolvedValue(epicNoPriority);
      mockClient.searchIssues.mockResolvedValue([]);
      mockClient.updateIssue.mockResolvedValue(epicNoPriority);
      mockIncrementNumberManager.getNextIncrementNumber.mockReturnValue('0001');
      mockMetadataManager.validateBeforeCreate.mockResolvedValue(undefined);
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);
      mockYaml.dump.mockReturnValue('title: test\n');

      const result = await mapper.importEpicAsIncrement('PROJ-999');
      expect(result.success).toBe(true);
    });

    it('should handle validation failure during import', async () => {
      const epic = createMockJiraIssue({ key: 'PROJ-100' });
      mockClient.getIssue.mockResolvedValue(epic);
      mockClient.searchIssues.mockResolvedValue([]);
      mockIncrementNumberManager.getNextIncrementNumber.mockReturnValue('0001');
      mockMetadataManager.validateBeforeCreate.mockRejectedValue(
        new Error('Duplicate increment ID')
      );

      const result = await mapper.importEpicAsIncrement('PROJ-100');
      expect(result.success).toBe(false);
      expect(result.summary).toContain('Duplicate increment ID');
    });
  });
});
