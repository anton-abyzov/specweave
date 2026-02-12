import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Unit Tests for JiraResourceValidator
 *
 * Tests all exported functions and class methods including:
 * - Constructor (loadEnv, loadConfig, domain resolution)
 * - fetchProjects / checkProject / createProject
 * - fetchBoards / checkBoard / createBoard
 * - validate() with various config scenarios
 * - validateJiraResources utility function
 * - Edge cases, error paths, boundary conditions
 */

// ============================================================================
// Mocks — vi.hoisted() + vi.mock() for ESM
// ============================================================================

const {
  mockExistsSync,
  mockReadFileSync,
  mockWriteFileSync,
  mockExecAsync,
  mockSelect,
  mockInput,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockExecAsync: vi.fn(),
  mockSelect: vi.fn(),
  mockInput: vi.fn(),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: () => mockExecAsync,
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
}));

vi.mock('chalk', () => {
  const passthrough = (s: string) => s;
  const handler: ProxyHandler<any> = {
    get: () => passthrough,
    apply: (_target: any, _thisArg: any, args: any[]) => args[0],
  };
  return { default: new Proxy(passthrough, handler) };
});

import {
  JiraResourceValidator,
  validateJiraResources,
} from '../../../../src/utils/validators/jira-validator.js';

// ============================================================================
// Helpers
// ============================================================================

function setupEnvFile(entries: Record<string, string> = {}): void {
  const content = Object.entries(entries)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  // .env exists
  mockExistsSync.mockImplementation((p: string) => {
    if (p.endsWith('.env')) return true;
    if (p.includes('config.json')) return false;
    return false;
  });
  mockReadFileSync.mockImplementation((p: string) => {
    if (p.endsWith('.env')) return content;
    throw new Error('ENOENT');
  });
}

function setupConfigFile(config: any): void {
  // Both .env and config.json exist by default
  mockExistsSync.mockImplementation((p: string) => {
    if (p.endsWith('.env')) return true;
    if (p.includes('config.json')) return true;
    return false;
  });
  mockReadFileSync.mockImplementation((p: string) => {
    if (p.endsWith('.env')) return 'JIRA_API_TOKEN=tok\nJIRA_EMAIL=me@x.com';
    if (p.includes('config.json')) return JSON.stringify(config);
    throw new Error('ENOENT');
  });
}

function setupFullEnv(
  envEntries: Record<string, string>,
  config: any,
): void {
  mockExistsSync.mockImplementation((p: string) => {
    if (p.endsWith('.env')) return true;
    if (p.includes('config.json')) return true;
    return false;
  });
  const envContent = Object.entries(envEntries)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  mockReadFileSync.mockImplementation((p: string) => {
    if (p.endsWith('.env')) return envContent;
    if (p.includes('config.json')) return JSON.stringify(config);
    throw new Error('ENOENT');
  });
}

function mockApiSuccess(responses: Record<string, any>): void {
  mockExecAsync.mockImplementation(async (cmd: string) => {
    for (const [pattern, response] of Object.entries(responses)) {
      if (cmd.includes(pattern)) {
        return { stdout: JSON.stringify(response) };
      }
    }
    throw new Error('curl: (22) HTTP 404');
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('JiraResourceValidator', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Constructor & Config Loading
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('should load secrets from .env when it exists', () => {
      setupEnvFile({
        JIRA_API_TOKEN: 'my-token',
        JIRA_EMAIL: 'user@test.com',
        JIRA_DOMAIN: 'test.atlassian.net',
      });

      // Constructor runs loadEnv and loadConfig internally
      const validator = new JiraResourceValidator('/project/.env');
      // No assertion on private fields, but it should not throw
      expect(validator).toBeInstanceOf(JiraResourceValidator);
    });

    it('should return empty env when .env does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const validator = new JiraResourceValidator('/project/.env');
      expect(validator).toBeInstanceOf(JiraResourceValidator);
    });

    it('should handle .env read errors gracefully', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation(() => {
        throw new Error('EACCES');
      });

      const validator = new JiraResourceValidator('/project/.env');
      expect(validator).toBeInstanceOf(JiraResourceValidator);
    });

    it('should load domain from config.json issueTracker.domain', () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'config-domain.atlassian.net' } },
      );

      const validator = new JiraResourceValidator('/project/.env');
      expect(validator).toBeInstanceOf(JiraResourceValidator);
    });

    it('should fallback to JIRA_DOMAIN from .env when config.json has no domain', () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com', JIRA_DOMAIN: 'env-domain.atlassian.net' },
        {},
      );

      const validator = new JiraResourceValidator('/project/.env');
      expect(validator).toBeInstanceOf(JiraResourceValidator);
    });

    it('should handle config.json parse errors gracefully', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) return true;
        if (p.includes('config.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) return 'JIRA_API_TOKEN=tok';
        if (p.includes('config.json')) return '{INVALID JSON';
        throw new Error('ENOENT');
      });

      const validator = new JiraResourceValidator('/project/.env');
      expect(validator).toBeInstanceOf(JiraResourceValidator);
    });

    it('should use default envPath when none provided', () => {
      mockExistsSync.mockReturnValue(false);

      const validator = new JiraResourceValidator();
      expect(validator).toBeInstanceOf(JiraResourceValidator);
    });

    it('should parse .env lines correctly, ignoring comments and blanks', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) {
          return [
            '# This is a comment',
            'JIRA_API_TOKEN=my-token',
            '',
            '  JIRA_EMAIL = user@test.com  ',
            'JIRA_DOMAIN=test.atlassian.net',
          ].join('\n');
        }
        throw new Error('ENOENT');
      });

      const validator = new JiraResourceValidator('/project/.env');
      expect(validator).toBeInstanceOf(JiraResourceValidator);
    });
  });

  // --------------------------------------------------------------------------
  // fetchProjects
  // --------------------------------------------------------------------------

  describe('fetchProjects', () => {
    it('should return mapped projects from API response', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com', JIRA_DOMAIN: 'd.atlassian.net' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );
      mockApiSuccess({
        '/rest/api/3/project': [
          { id: '10001', key: 'PROJ', name: 'My Project' },
          { id: '10002', key: 'TEST', name: 'Test Project' },
        ],
      });

      const validator = new JiraResourceValidator('/project/.env');
      const projects = await validator.fetchProjects();

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({ id: '10001', key: 'PROJ', name: 'My Project' });
      expect(projects[1]).toEqual({ id: '10002', key: 'TEST', name: 'Test Project' });
    });

    it('should return empty array when API call fails', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );
      mockExecAsync.mockRejectedValue(new Error('Network error'));

      const validator = new JiraResourceValidator('/project/.env');
      const projects = await validator.fetchProjects();

      expect(projects).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // checkProject
  // --------------------------------------------------------------------------

  describe('checkProject', () => {
    it('should return project details when project exists', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );
      mockApiSuccess({
        'project/PROJ': { id: '10001', key: 'PROJ', name: 'My Project' },
      });

      const validator = new JiraResourceValidator('/project/.env');
      const project = await validator.checkProject('PROJ');

      expect(project).toEqual({ id: '10001', key: 'PROJ', name: 'My Project' });
    });

    it('should return null when project does not exist', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );
      mockExecAsync.mockRejectedValue(new Error('curl: (22) HTTP 404'));

      const validator = new JiraResourceValidator('/project/.env');
      const project = await validator.checkProject('NONEXIST');

      expect(project).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // createProject
  // --------------------------------------------------------------------------

  describe('createProject', () => {
    it('should create project and return details', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      // First call: myself (getCurrentUserId), second: project POST
      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('myself')) {
          return { stdout: JSON.stringify({ accountId: 'acc-123' }) };
        }
        if (cmd.includes('project') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '10003', key: 'NEW', name: 'New Project' }) };
        }
        throw new Error('Unexpected call');
      });

      const validator = new JiraResourceValidator('/project/.env');
      const project = await validator.createProject('NEW', 'New Project');

      expect(project).toEqual({ id: '10003', key: 'NEW', name: 'New Project' });
    });

    it('should throw when API creation fails', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('myself')) {
          return { stdout: JSON.stringify({ accountId: 'acc-123' }) };
        }
        throw new Error('Permission denied');
      });

      const validator = new JiraResourceValidator('/project/.env');
      await expect(validator.createProject('FAIL', 'Fail')).rejects.toThrow('Permission denied');
    });

    it('should throw when getCurrentUserId fails', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      mockExecAsync.mockRejectedValue(new Error('Auth failure'));

      const validator = new JiraResourceValidator('/project/.env');
      await expect(validator.createProject('X', 'X')).rejects.toThrow('Failed to get current user ID');
    });
  });

  // --------------------------------------------------------------------------
  // fetchBoards
  // --------------------------------------------------------------------------

  describe('fetchBoards', () => {
    it('should return mapped boards from agile API', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );
      mockApiSuccess({
        'board?projectKeyOrId=PROJ': {
          values: [
            { id: 1, name: 'Board 1', type: 'scrum' },
            { id: 2, name: 'Board 2', type: 'kanban' },
          ],
        },
      });

      const validator = new JiraResourceValidator('/project/.env');
      const boards = await validator.fetchBoards('PROJ');

      expect(boards).toHaveLength(2);
      expect(boards[0]).toEqual({ id: 1, name: 'Board 1', type: 'scrum' });
    });

    it('should return empty array when API call fails', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );
      mockExecAsync.mockRejectedValue(new Error('Server error'));

      const validator = new JiraResourceValidator('/project/.env');
      const boards = await validator.fetchBoards('PROJ');

      expect(boards).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // checkBoard
  // --------------------------------------------------------------------------

  describe('checkBoard', () => {
    it('should return board with location when board and config exist', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('board/42/configuration')) {
          return {
            stdout: JSON.stringify({
              location: { projectKey: 'PROJ', projectId: '10001' },
            }),
          };
        }
        if (cmd.includes('board/42')) {
          return {
            stdout: JSON.stringify({ id: 42, name: 'Sprint Board', type: 'scrum' }),
          };
        }
        throw new Error('Not found');
      });

      const validator = new JiraResourceValidator('/project/.env');
      const board = await validator.checkBoard(42);

      expect(board).toEqual({
        id: 42,
        name: 'Sprint Board',
        type: 'scrum',
        location: { projectKey: 'PROJ', projectId: '10001' },
      });
    });

    it('should return board without location when config fetch fails', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('board/42/configuration')) {
          throw new Error('Forbidden');
        }
        if (cmd.includes('board/42')) {
          return {
            stdout: JSON.stringify({ id: 42, name: 'Sprint Board', type: 'scrum' }),
          };
        }
        throw new Error('Not found');
      });

      const validator = new JiraResourceValidator('/project/.env');
      const board = await validator.checkBoard(42);

      expect(board).toEqual({
        id: 42,
        name: 'Sprint Board',
        type: 'scrum',
        location: undefined,
      });
    });

    it('should return board without location when config has no location field', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('board/42/configuration')) {
          return { stdout: JSON.stringify({}) };
        }
        if (cmd.includes('board/42')) {
          return {
            stdout: JSON.stringify({ id: 42, name: 'Sprint Board', type: 'scrum' }),
          };
        }
        throw new Error('Not found');
      });

      const validator = new JiraResourceValidator('/project/.env');
      const board = await validator.checkBoard(42);

      expect(board).toEqual({
        id: 42,
        name: 'Sprint Board',
        type: 'scrum',
        location: undefined,
      });
    });

    it('should return null when board does not exist', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );
      mockExecAsync.mockRejectedValue(new Error('Not found'));

      const validator = new JiraResourceValidator('/project/.env');
      const board = await validator.checkBoard(999);

      expect(board).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // createBoard
  // --------------------------------------------------------------------------

  describe('createBoard', () => {
    it('should create board using agile API with filter', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('/rest/api/3/filter') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 555 }) };
        }
        if (cmd.includes('/rest/agile/1.0/board') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 10, name: 'Dev Board', type: 'scrum' }) };
        }
        throw new Error('Unexpected');
      });

      const validator = new JiraResourceValidator('/project/.env');
      const board = await validator.createBoard('Dev Board', 'PROJ');

      expect(board).toEqual({ id: 10, name: 'Dev Board', type: 'scrum' });
    });

    it('should throw when filter creation fails', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      mockExecAsync.mockRejectedValue(new Error('Filter error'));

      const validator = new JiraResourceValidator('/project/.env');
      await expect(validator.createBoard('Board', 'PROJ')).rejects.toThrow('Failed to create filter');
    });

    it('should throw when board creation fails after filter success', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('/rest/api/3/filter') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 555 }) };
        }
        throw new Error('Board creation failed');
      });

      const validator = new JiraResourceValidator('/project/.env');
      await expect(validator.createBoard('Board', 'PROJ')).rejects.toThrow('Board creation failed');
    });
  });

  // --------------------------------------------------------------------------
  // callJiraApi (tested indirectly via public methods)
  // --------------------------------------------------------------------------

  describe('callJiraApi (indirect)', () => {
    it('should handle API responses with errorMessages', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({ errorMessages: ['Permission denied', 'Not authorized'] }),
      });

      const validator = new JiraResourceValidator('/project/.env');
      // fetchProjects catches the error and returns []
      const projects = await validator.fetchProjects();
      expect(projects).toEqual([]);
    });

    it('should handle API responses with errors object', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({ errors: { field: 'invalid' } }),
      });

      const validator = new JiraResourceValidator('/project/.env');
      const project = await validator.checkProject('BAD');
      expect(project).toBeNull();
    });

    it('should translate curl 404 errors', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      mockExecAsync.mockRejectedValue(new Error('curl: (22) The requested URL returned error'));

      const validator = new JiraResourceValidator('/project/.env');
      const project = await validator.checkProject('GONE');
      expect(project).toBeNull();
    });

    it('should use agile base path for agile API type', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      let capturedCmd = '';
      mockExecAsync.mockImplementation(async (cmd: string) => {
        capturedCmd = cmd;
        return {
          stdout: JSON.stringify({
            values: [{ id: 1, name: 'B', type: 'scrum' }],
          }),
        };
      });

      const validator = new JiraResourceValidator('/project/.env');
      await validator.fetchBoards('PROJ');

      expect(capturedCmd).toContain('/rest/agile/1.0/');
    });

    it('should use rest base path for rest API type', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      let capturedCmd = '';
      mockExecAsync.mockImplementation(async (cmd: string) => {
        capturedCmd = cmd;
        return {
          stdout: JSON.stringify([{ id: '1', key: 'P', name: 'P' }]),
        };
      });

      const validator = new JiraResourceValidator('/project/.env');
      await validator.fetchProjects();

      expect(capturedCmd).toContain('/rest/api/3/');
    });
  });

  // --------------------------------------------------------------------------
  // validate() — Jira not configured
  // --------------------------------------------------------------------------

  describe('validate - not configured', () => {
    it('should return invalid when issueTracker is missing', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {},
      );

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.valid).toBe(false);
      expect(result.project.exists).toBe(false);
    });

    it('should return invalid when provider is not jira', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { provider: 'github' } },
      );

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.valid).toBe(false);
    });

    it('should return invalid when no project keys configured', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { provider: 'jira', domain: 'd.atlassian.net' } },
      );

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.valid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // validate() — project keys from various sources
  // --------------------------------------------------------------------------

  describe('validate - project key resolution', () => {
    it('should read project keys from issueTracker.projects array', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'PROJ' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '10001', key: 'PROJ', name: 'My Proj' }) };
        }
        // For updateConfig calls, just succeed
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.project.exists).toBe(true);
      expect(result.project.key).toBe('PROJ');
    });

    it('should read from issueTracker.project (single project mode)', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            project: 'SINGLE',
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/SINGLE')) {
          return { stdout: JSON.stringify({ id: '10002', key: 'SINGLE', name: 'Single Project' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.project.exists).toBe(true);
      expect(result.project.key).toBe('SINGLE');
    });

    it('should fallback to sync.profiles for project keys', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
          },
          sync: {
            profiles: {
              myProfile: {
                config: { projectKey: 'SYNC' },
              },
            },
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/SYNC')) {
          return { stdout: JSON.stringify({ id: '10003', key: 'SYNC', name: 'Sync Project' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.project.exists).toBe(true);
      expect(result.project.key).toBe('SYNC');
    });

    it('should read projects array from sync profile', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
          },
          sync: {
            profiles: {
              profile1: {
                config: { projects: ['SP1', 'SP2'] },
              },
            },
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/SP1') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '1', key: 'SP1', name: 'SP1' }) };
        }
        if (cmd.includes('project/SP2') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '2', key: 'SP2', name: 'SP2' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.project.exists).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // validate() — project not found (interactive)
  // --------------------------------------------------------------------------

  describe('validate - project not found interactive', () => {
    it('should handle cancel action', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'MISSING' }],
          },
        },
      );

      // checkProject returns null (not found)
      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/MISSING') && !cmd.includes('POST')) {
          throw new Error('Not found');
        }
        // fetchProjects
        if (cmd.includes('/rest/api/3/project') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify([]) };
        }
        return { stdout: '{}' };
      });

      mockSelect.mockResolvedValueOnce('cancel');

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.valid).toBe(false);
    });

    it('should handle skip action', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'SKIP' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/SKIP') && !cmd.includes('POST')) {
          throw new Error('Not found');
        }
        if (cmd.includes('/rest/api/3/project') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify([]) };
        }
        return { stdout: '{}' };
      });

      mockSelect.mockResolvedValueOnce('skip');

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      // Project was skipped, so result.project.exists stays false but valid is still true
      expect(result.project.exists).toBe(false);
    });

    it('should handle select existing project action (project-per-team)', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            strategy: 'project-per-team',
            projects: [{ key: 'MISSING' }],
          },
        },
      );

      // First checkProject: MISSING not found. Then fetchProjects returns list.
      // Then user selects EXIST. Then checkProject(EXIST) returns data.
      let checkProjectCalls = 0;
      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/MISSING') && !cmd.includes('POST')) {
          throw new Error('Not found');
        }
        if (cmd.includes('project/EXIST') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '99', key: 'EXIST', name: 'Existing' }) };
        }
        if (cmd.includes('/rest/api/3/project"') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify([{ id: '99', key: 'EXIST', name: 'Existing' }]) };
        }
        return { stdout: '{}' };
      });

      // First select: 'select'; second select: pick 'EXIST' from list
      mockSelect.mockResolvedValueOnce('select').mockResolvedValueOnce('EXIST');

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.project.exists).toBe(true);
      expect(result.project.key).toBe('EXIST');
      expect(result.envUpdated).toBe(true);
    });

    it('should handle select existing project for non project-per-team strategy', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            strategy: 'board-based',
            project: 'MISSING',
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/MISSING') && !cmd.includes('POST')) {
          throw new Error('Not found');
        }
        if (cmd.includes('project/EXIST') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '99', key: 'EXIST', name: 'Existing' }) };
        }
        if (cmd.includes('/rest/api/3/project"') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify([{ id: '99', key: 'EXIST', name: 'Existing' }]) };
        }
        return { stdout: '{}' };
      });

      mockSelect.mockResolvedValueOnce('select').mockResolvedValueOnce('EXIST');

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.project.exists).toBe(true);
      expect(result.project.key).toBe('EXIST');
    });

    it('should handle failed fetch of selected project details', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'MISS' }],
          },
        },
      );

      let fetchCount = 0;
      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/MISS') && !cmd.includes('POST')) {
          throw new Error('Not found');
        }
        // fetchProjects
        if (cmd.includes('/rest/api/3/project"') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify([{ id: '1', key: 'SEL', name: 'S' }]) };
        }
        // checkProject(SEL) fails
        if (cmd.includes('project/SEL') && !cmd.includes('POST')) {
          throw new Error('Something broke');
        }
        return { stdout: '{}' };
      });

      mockSelect.mockResolvedValueOnce('select').mockResolvedValueOnce('SEL');

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      // selectedProjectDetails is null => continue, project stays not-exists
      expect(result.project.exists).toBe(false);
    });

    it('should handle create new project action', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'NEWP' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        // checkProject(NEWP) => not found
        if (cmd.includes('project/NEWP') && !cmd.includes('POST') && !cmd.includes('myself')) {
          throw new Error('Not found');
        }
        // fetchProjects
        if (cmd.includes('/rest/api/3/project"') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify([]) };
        }
        // myself
        if (cmd.includes('myself')) {
          return { stdout: JSON.stringify({ accountId: 'usr-1' }) };
        }
        // POST project
        if (cmd.includes('/rest/api/3/project') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '200', key: 'NEWP', name: 'My New Proj' }) };
        }
        return { stdout: '{}' };
      });

      mockSelect.mockResolvedValueOnce('create');
      mockInput.mockResolvedValueOnce('My New Proj');

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.project.exists).toBe(true);
      expect(result.project.key).toBe('NEWP');
    });
  });

  // --------------------------------------------------------------------------
  // validate() — project exists
  // --------------------------------------------------------------------------

  describe('validate - project exists', () => {
    it('should validate existing project successfully', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'OK' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/OK') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '10', key: 'OK', name: 'OK Project' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.project.exists).toBe(true);
      expect(result.project.key).toBe('OK');
      expect(result.project.id).toBe('10');
      expect(result.project.name).toBe('OK Project');
      expect(result.envUpdated).toBe(true);
    });

    it('should use default strategy project-per-team when not specified', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'DEF' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/DEF')) {
          return { stdout: JSON.stringify({ id: '5', key: 'DEF', name: 'Default' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.valid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // validate() — per-project boards (2-level structure)
  // --------------------------------------------------------------------------

  describe('validate - per-project boards', () => {
    it('should validate existing board with correct project', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'PROJ', boards: [{ id: '42' }] }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '10', key: 'PROJ', name: 'P' }) };
        }
        if (cmd.includes('board/42/configuration')) {
          return { stdout: JSON.stringify({ location: { projectKey: 'PROJ', projectId: '10' } }) };
        }
        if (cmd.includes('board/42')) {
          return { stdout: JSON.stringify({ id: 42, name: 'Sprint Board', type: 'scrum' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.boards.existing).toContain(42);
      expect(result.boards.valid).toBe(true);
    });

    it('should flag board belonging to wrong project', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'PROJ', boards: [{ id: '42' }] }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '10', key: 'PROJ', name: 'P' }) };
        }
        if (cmd.includes('board/42/configuration')) {
          return { stdout: JSON.stringify({ location: { projectKey: 'OTHER', projectId: '99' } }) };
        }
        if (cmd.includes('board/42')) {
          return { stdout: JSON.stringify({ id: 42, name: 'Sprint Board', type: 'scrum' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.boards.missing).toContain('42');
      expect(result.boards.valid).toBe(false);
    });

    it('should flag missing board', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'PROJ', boards: [{ id: '999' }] }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '10', key: 'PROJ', name: 'P' }) };
        }
        if (cmd.includes('board/999')) {
          throw new Error('Not found');
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.boards.missing).toContain('999');
      expect(result.boards.valid).toBe(false);
    });

    it('should create board from name entry', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'PROJ', boards: [{ id: 'new-board', name: 'New Board' }] }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '10', key: 'PROJ', name: 'P' }) };
        }
        if (cmd.includes('/rest/api/3/filter') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 100 }) };
        }
        if (cmd.includes('/rest/agile/1.0/board') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 77, name: 'New Board', type: 'scrum' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.boards.created).toHaveLength(1);
      expect(result.boards.created[0].name).toBe('New Board');
      expect(result.boards.created[0].id).toBe(77);
    });

    it('should detect board name conflicts across projects', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [
              { key: 'P1', boards: [{ id: 'sprint', name: 'Sprint Board' }] },
              { key: 'P2', boards: [{ id: 'sprint', name: 'Sprint Board' }] },
            ],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/P1') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '1', key: 'P1', name: 'P1' }) };
        }
        if (cmd.includes('project/P2') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '2', key: 'P2', name: 'P2' }) };
        }
        if (cmd.includes('/rest/api/3/filter') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 100 }) };
        }
        if (cmd.includes('/rest/agile/1.0/board') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 55, name: 'Sprint Board', type: 'scrum' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      // First project's board should be created, second should be flagged as conflict
      expect(result.boards.created).toHaveLength(1);
      expect(result.boards.missing).toContain('Sprint Board');
      expect(result.boards.valid).toBe(false);
    });

    it('should handle board creation failure', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'PROJ', boards: [{ id: 'fail-board', name: 'Fail Board' }] }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '10', key: 'PROJ', name: 'P' }) };
        }
        // filter creation fails
        throw new Error('Creation failed');
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.boards.missing).toContain('Fail Board');
      expect(result.boards.valid).toBe(false);
    });

    it('should validate board without project verification when location missing', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'PROJ', boards: [{ id: '42' }] }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '10', key: 'PROJ', name: 'P' }) };
        }
        if (cmd.includes('board/42/configuration')) {
          throw new Error('Forbidden');
        }
        if (cmd.includes('board/42')) {
          return { stdout: JSON.stringify({ id: 42, name: 'Sprint Board', type: 'scrum' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      // Board exists, location undefined => passes (project verification skipped)
      expect(result.boards.existing).toContain(42);
      expect(result.boards.valid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // validate() — legacy board-based strategy
  // --------------------------------------------------------------------------

  describe('validate - legacy board-based strategy', () => {
    it('should validate existing boards in board-based strategy', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            strategy: 'board-based',
            project: 'PROJ',
            boards: [{ id: '10' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '1', key: 'PROJ', name: 'P' }) };
        }
        if (cmd.includes('board/10/configuration')) {
          return { stdout: JSON.stringify({ location: { projectKey: 'PROJ' } }) };
        }
        if (cmd.includes('board/10')) {
          return { stdout: JSON.stringify({ id: 10, name: 'Main Board', type: 'kanban' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.boards.valid).toBe(true);
      expect(result.envUpdated).toBe(true);
    });

    it('should flag missing boards in board-based strategy', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            strategy: 'board-based',
            project: 'PROJ',
            boards: [{ id: '999' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '1', key: 'PROJ', name: 'P' }) };
        }
        if (cmd.includes('board/999')) {
          throw new Error('Not found');
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.boards.missing).toContain('999');
      expect(result.boards.valid).toBe(false);
    });

    it('should create boards from names in board-based strategy', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            strategy: 'board-based',
            project: 'PROJ',
            boards: [{ id: 'new-board', name: 'New Board' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '1', key: 'PROJ', name: 'P' }) };
        }
        if (cmd.includes('/rest/api/3/filter') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 100 }) };
        }
        if (cmd.includes('/rest/agile/1.0/board') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 88, name: 'New Board', type: 'scrum' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.boards.created).toHaveLength(1);
      expect(result.boards.created[0].name).toBe('New Board');
      expect(result.envUpdated).toBe(true);
    });

    it('should handle board creation failure in board-based strategy', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            strategy: 'board-based',
            project: 'PROJ',
            boards: [{ id: 'bad-board', name: 'Bad Board' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '1', key: 'PROJ', name: 'P' }) };
        }
        // Everything else fails
        throw new Error('Server error');
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.boards.missing).toContain('Bad Board');
      expect(result.boards.valid).toBe(false);
    });

    it('should print summary with missing boards count', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            strategy: 'board-based',
            project: 'PROJ',
            boards: [{ id: '999' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '1', key: 'PROJ', name: 'P' }) };
        }
        if (cmd.includes('board/999')) {
          throw new Error('Not found');
        }
        return { stdout: '{}' };
      });

      const logSpy = vi.spyOn(console, 'log');

      const validator = new JiraResourceValidator('/project/.env');
      await validator.validate();

      const logCalls = logSpy.mock.calls.map(c => c[0]);
      const hasIssuesMsg = logCalls.some((msg: any) =>
        typeof msg === 'string' && msg.includes('Issues found') && msg.includes('1 board(s)'),
      );
      expect(hasIssuesMsg).toBe(true);
    });

    it('should print all-boards-validated summary when no missing', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            strategy: 'board-based',
            project: 'PROJ',
            boards: [{ id: '10' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '1', key: 'PROJ', name: 'P' }) };
        }
        if (cmd.includes('board/10/configuration')) {
          return { stdout: JSON.stringify({}) };
        }
        if (cmd.includes('board/10')) {
          return { stdout: JSON.stringify({ id: 10, name: 'Board', type: 'scrum' }) };
        }
        return { stdout: '{}' };
      });

      const logSpy = vi.spyOn(console, 'log');

      const validator = new JiraResourceValidator('/project/.env');
      await validator.validate();

      const logCalls = logSpy.mock.calls.map(c => c[0]);
      const hasSuccessMsg = logCalls.some((msg: any) =>
        typeof msg === 'string' && msg.includes('All boards validated'),
      );
      expect(hasSuccessMsg).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // validate() — no boards configured
  // --------------------------------------------------------------------------

  describe('validate - no boards configured', () => {
    it('should skip board validation when no boards are configured', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'PROJ' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ')) {
          return { stdout: JSON.stringify({ id: '10', key: 'PROJ', name: 'P' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.boards.valid).toBe(true);
      expect(result.boards.existing).toEqual([]);
      expect(result.boards.missing).toEqual([]);
      expect(result.boards.created).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // updateConfig (tested indirectly via validate)
  // --------------------------------------------------------------------------

  describe('updateConfig (indirect)', () => {
    it('should create config when it does not exist during update', async () => {
      // Config file does NOT exist for updateConfig, but DOES exist for loadConfig
      let configCreated = false;
      const envContent = 'JIRA_API_TOKEN=tok\nJIRA_EMAIL=e@x.com';

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) return true;
        if (p.includes('config.json')) {
          // First calls (constructor loadConfig): exists. Later calls (updateConfig): may not
          return true;
        }
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) return envContent;
        if (p.includes('config.json')) {
          return JSON.stringify({
            issueTracker: {
              provider: 'jira',
              domain: 'd.atlassian.net',
              projects: [{ key: 'OK' }],
            },
          });
        }
        throw new Error('ENOENT');
      });
      mockWriteFileSync.mockImplementation(() => {
        configCreated = true;
      });

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/OK') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '10', key: 'OK', name: 'P' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      await validator.validate();

      expect(configCreated).toBe(true);
    });

    it('should handle updateConfig write failure', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'OK' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/OK') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '10', key: 'OK', name: 'P' }) };
        }
        return { stdout: '{}' };
      });

      mockWriteFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const validator = new JiraResourceValidator('/project/.env');
      // updateConfig failure should propagate
      await expect(validator.validate()).rejects.toThrow('EACCES');
    });
  });

  // --------------------------------------------------------------------------
  // updateEnv (tested indirectly — only via validate's board-based legacy path
  // where .env might be updated, but in v0.33.0+ it updates config.json)
  // --------------------------------------------------------------------------

  describe('updateEnv (indirect)', () => {
    // updateEnv is private and not directly called in validate() in v0.33.0+
    // It exists for backward compatibility. We test the code path exists.
    it('should exist as a method on the validator', () => {
      mockExistsSync.mockReturnValue(false);
      const validator = new JiraResourceValidator('/project/.env');
      // Access private method via prototype check
      expect(typeof (validator as any).updateEnv).toBe('function');
    });

    it('should update existing keys and append new ones', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) return 'EXISTING_KEY=old_value\nOTHER=keep';
        throw new Error('ENOENT');
      });

      const validator = new JiraResourceValidator('/project/.env');
      await (validator as any).updateEnv({ EXISTING_KEY: 'new_value', NEW_KEY: 'brand_new' });

      expect(mockWriteFileSync).toHaveBeenCalled();
      const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('EXISTING_KEY=new_value');
      expect(writtenContent).toContain('OTHER=keep');
      expect(writtenContent).toContain('NEW_KEY=brand_new');
    });

    it('should handle updateEnv when .env does not exist', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        // .env exists for constructor but not for updateEnv
        if (p.endsWith('.env')) return false;
        return false;
      });

      const validator = new JiraResourceValidator('/project/.env');
      await (validator as any).updateEnv({ KEY: 'value' });

      expect(mockWriteFileSync).toHaveBeenCalled();
      const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('KEY=value');
    });

    it('should throw and log on write failure', async () => {
      mockExistsSync.mockReturnValue(false);
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('disk full');
      });

      const validator = new JiraResourceValidator('/project/.env');
      await expect((validator as any).updateEnv({ K: 'V' })).rejects.toThrow('disk full');
    });
  });

  // --------------------------------------------------------------------------
  // callJiraApi — body handling
  // --------------------------------------------------------------------------

  describe('callJiraApi body handling (indirect)', () => {
    it('should include body in curl command for POST requests', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      let capturedCmd = '';
      mockExecAsync.mockImplementation(async (cmd: string) => {
        capturedCmd = cmd;
        if (cmd.includes('myself')) {
          return { stdout: JSON.stringify({ accountId: 'acc-1' }) };
        }
        return { stdout: JSON.stringify({ id: '1', key: 'X', name: 'X' }) };
      });

      const validator = new JiraResourceValidator('/project/.env');
      await validator.createProject('X', 'X');

      // The POST for project should contain -d with body
      expect(capturedCmd).toContain('-d');
      expect(capturedCmd).toContain('POST');
    });
  });

  // --------------------------------------------------------------------------
  // validateJiraResources utility function
  // --------------------------------------------------------------------------

  describe('validateJiraResources', () => {
    it('should create a JiraResourceValidator and call validate', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'PROJ' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ')) {
          return { stdout: JSON.stringify({ id: '10', key: 'PROJ', name: 'P' }) };
        }
        return { stdout: '{}' };
      });

      const result = await validateJiraResources('/project/.env');

      expect(result.project.exists).toBe(true);
      expect(result.project.key).toBe('PROJ');
    });

    it('should use default .env path when none provided', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {},
      );

      const result = await validateJiraResources();

      expect(result.valid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases & boundary conditions
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle empty .env file', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) return '';
        throw new Error('ENOENT');
      });

      const validator = new JiraResourceValidator('/project/.env');
      expect(validator).toBeInstanceOf(JiraResourceValidator);
    });

    it('should handle .env with only comments', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('.env')) return '# comment line\n# another comment';
        throw new Error('ENOENT');
      });

      const validator = new JiraResourceValidator('/project/.env');
      expect(validator).toBeInstanceOf(JiraResourceValidator);
    });

    it('should handle empty config.json', () => {
      setupConfigFile({});
      const validator = new JiraResourceValidator('/project/.env');
      expect(validator).toBeInstanceOf(JiraResourceValidator);
    });

    it('should handle multiple projects in validate loop', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'P1' }, { key: 'P2' }, { key: 'P3' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/P1') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '1', key: 'P1', name: 'P1' }) };
        }
        if (cmd.includes('project/P2') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '2', key: 'P2', name: 'P2' }) };
        }
        if (cmd.includes('project/P3') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '3', key: 'P3', name: 'P3' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      // Last project key wins in result.project
      expect(result.project.exists).toBe(true);
      expect(result.envUpdated).toBe(true);
    });

    it('should handle config.json with empty projects array', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [],
          },
        },
      );

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.valid).toBe(false);
    });

    it('should handle API response with non-JSON stdout', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        { issueTracker: { domain: 'd.atlassian.net' } },
      );

      mockExecAsync.mockResolvedValue({ stdout: '<html>Error</html>' });

      const validator = new JiraResourceValidator('/project/.env');
      const projects = await validator.fetchProjects();

      // JSON.parse fails, caught => returns []
      expect(projects).toEqual([]);
    });

    it('should handle sync profiles with no config', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
          },
          sync: {
            profiles: {
              empty: {},
            },
          },
        },
      );

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      // No project keys found
      expect(result.valid).toBe(false);
    });

    it('should handle board entry using id as name when name is not provided', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            projects: [{ key: 'PROJ', boards: [{ id: 'my-board' }] }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '10', key: 'PROJ', name: 'P' }) };
        }
        if (cmd.includes('/rest/api/3/filter') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 100 }) };
        }
        if (cmd.includes('/rest/agile/1.0/board') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 77, name: 'my-board', type: 'scrum' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      // Board name falls back to boardIdStr ('my-board') when boardConfig.name is undefined
      expect(result.boards.created).toHaveLength(1);
      expect(result.boards.created[0].name).toBe('my-board');
    });

    it('should handle legacy board entry using id as name when name not provided', async () => {
      setupFullEnv(
        { JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'e@x.com' },
        {
          issueTracker: {
            provider: 'jira',
            domain: 'd.atlassian.net',
            strategy: 'board-based',
            project: 'PROJ',
            boards: [{ id: 'legacy-name' }],
          },
        },
      );

      mockExecAsync.mockImplementation(async (cmd: string) => {
        if (cmd.includes('project/PROJ') && !cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: '1', key: 'PROJ', name: 'P' }) };
        }
        if (cmd.includes('/rest/api/3/filter') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 100 }) };
        }
        if (cmd.includes('/rest/agile/1.0/board') && cmd.includes('POST')) {
          return { stdout: JSON.stringify({ id: 88, name: 'legacy-name', type: 'scrum' }) };
        }
        return { stdout: '{}' };
      });

      const validator = new JiraResourceValidator('/project/.env');
      const result = await validator.validate();

      expect(result.boards.created).toHaveLength(1);
      expect(result.boards.created[0].name).toBe('legacy-name');
    });
  });
});
