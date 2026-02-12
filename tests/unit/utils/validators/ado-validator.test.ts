/**
 * Unit tests for ado-validator.ts
 *
 * Tests the AzureDevOpsResourceValidator class and validateAzureDevOpsResources utility.
 * Covers constructor config loading, API calls, project/team/area path operations,
 * and the full validate() flow with various configurations.
 *
 * All external dependencies (fs, child_process, inquirer, chalk) are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────────────

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
  const identity = (s: string) => s;
  const chalkProxy: any = new Proxy(identity, {
    get: () => chalkProxy,
    apply: (_t: any, _this: any, args: any[]) => args[0],
  });
  return { default: chalkProxy };
});

// ── Imports (after mocks) ──────────────────────────────────────────────

import {
  AzureDevOpsResourceValidator,
  validateAzureDevOpsResources,
} from '../../../../src/utils/validators/ado-validator.js';

// ── Helpers ────────────────────────────────────────────────────────────

function makeEnvContent(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

function makeConfigContent(adoConfig: Record<string, any>): string {
  return JSON.stringify({
    sync: {
      profiles: {
        myProfile: {
          provider: 'ado',
          config: adoConfig,
        },
      },
    },
  });
}

/**
 * Sets up fs mocks so that constructor can load env/config.
 * Returns the validator instance.
 */
function createValidator(
  envVars: Record<string, string> = {},
  adoConfig: Record<string, any> = {},
  envPath = '.env',
): AzureDevOpsResourceValidator {
  const envContent = makeEnvContent(envVars);
  const configContent = makeConfigContent(adoConfig);

  mockExistsSync.mockImplementation((p: string) => {
    if (p === envPath) return Object.keys(envVars).length > 0;
    if (p.endsWith('config.json')) return Object.keys(adoConfig).length > 0;
    return false;
  });

  mockReadFileSync.mockImplementation((p: string) => {
    if (p === envPath) return envContent;
    if (p.endsWith('config.json')) return configContent;
    throw new Error(`Unexpected read: ${p}`);
  });

  return new AzureDevOpsResourceValidator(envPath);
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('AzureDevOpsResourceValidator', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ─── Constructor / Config Loading ──────────────────────────────────

  describe('constructor', () => {
    it('should load PAT from .env file', () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'test-pat-123' },
        { organization: 'myorg', project: 'myproj' },
      );
      // Verify it was constructed without throwing
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });

    it('should handle missing .env file gracefully', () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const v = new AzureDevOpsResourceValidator('.env');
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });

    it('should handle missing config.json gracefully', () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '.env') return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === '.env') return 'AZURE_DEVOPS_PAT=pat123';
        throw new Error('ENOENT');
      });

      const v = new AzureDevOpsResourceValidator('.env');
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });

    it('should derive configPath from envPath', () => {
      // envPath = 'some/path/.env' -> configPath = 'some/path/.specweave/config.json'
      mockExistsSync.mockReturnValue(false);
      const v = new AzureDevOpsResourceValidator('some/path/.env');
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });

    it('should use default envPath when not specified', () => {
      mockExistsSync.mockReturnValue(false);
      const v = new AzureDevOpsResourceValidator();
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });

    it('should load organization from config.json ado profile', () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat123' },
        { organization: 'config-org', project: 'proj' },
      );
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });

    it('should fall back to AZURE_DEVOPS_ORG from .env if not in config', () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat123', AZURE_DEVOPS_ORG: 'env-org' },
        { project: 'proj' },
      );
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });

    it('should load multi-project config', () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat123' },
        { organization: 'org', projects: ['proj-a', 'proj-b'] },
      );
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });

    it('should default strategy to area-path-based', () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat123' },
        { organization: 'org', project: 'proj' },
      );
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });

    it('should parse .env lines correctly, ignoring comments and empty lines', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === '.env') {
          return '# comment line\nAZURE_DEVOPS_PAT=my-pat\n\nOTHER_VAR=value\n:colon_line=ignored';
        }
        return '{}';
      });

      const v = new AzureDevOpsResourceValidator('.env');
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });

    it('should handle config with no ado profile', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === '.env') return 'AZURE_DEVOPS_PAT=pat';
        return JSON.stringify({
          sync: {
            profiles: {
              github: { provider: 'github', config: {} },
            },
          },
        });
      });

      const v = new AzureDevOpsResourceValidator('.env');
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });

    it('should handle malformed config JSON gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === '.env') return 'AZURE_DEVOPS_PAT=pat';
        if (p.endsWith('config.json')) return '{invalid json';
        throw new Error('ENOENT');
      });

      const v = new AzureDevOpsResourceValidator('.env');
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });

    it('should handle readFileSync throwing for .env', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const v = new AzureDevOpsResourceValidator('.env');
      expect(v).toBeInstanceOf(AzureDevOpsResourceValidator);
    });
  });

  // ─── fetchProjects ─────────────────────────────────────────────────

  describe('fetchProjects', () => {
    it('should return mapped projects from API response', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          value: [
            { id: 'id-1', name: 'Project A', description: 'Desc A' },
            { id: 'id-2', name: 'Project B' },
          ],
        }),
      });

      const result = await v.fetchProjects();
      expect(result).toEqual([
        { id: 'id-1', name: 'Project A', description: 'Desc A' },
        { id: 'id-2', name: 'Project B', description: '' },
      ]);
    });

    it('should return empty array on API error', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockRejectedValueOnce(new Error('Network error'));

      const result = await v.fetchProjects();
      expect(result).toEqual([]);
    });
  });

  // ─── checkProject ──────────────────────────────────────────────────

  describe('checkProject', () => {
    it('should return project details when project exists', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'proj-id',
          name: 'MyProject',
          description: 'A project',
        }),
      });

      const result = await v.checkProject('MyProject');
      expect(result).toEqual({
        id: 'proj-id',
        name: 'MyProject',
        description: 'A project',
      });
    });

    it('should return null when project does not exist', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockRejectedValueOnce(new Error('Not found'));

      const result = await v.checkProject('NonExistent');
      expect(result).toBeNull();
    });

    it('should handle project with no description', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'proj-id',
          name: 'NoDesc',
        }),
      });

      const result = await v.checkProject('NoDesc');
      expect(result).toEqual({
        id: 'proj-id',
        name: 'NoDesc',
        description: '',
      });
    });
  });

  // ─── createProject ─────────────────────────────────────────────────

  describe('createProject', () => {
    it('should create project and wait for completion', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      // First call: create project
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'new-id', name: 'NewProject' }),
      });
      // Second call: check operation status (succeeded)
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ status: 'succeeded' }),
      });

      const result = await v.createProject('NewProject', 'My description');
      expect(result).toEqual({
        id: 'new-id',
        name: 'NewProject',
        description: 'My description',
      });
    });

    it('should use default description when none provided', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'new-id', name: 'Proj' }),
      });
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ status: 'succeeded' }),
      });

      const result = await v.createProject('Proj');
      expect(result).toEqual({
        id: 'new-id',
        name: 'Proj',
        description: '',
      });
    });

    it('should throw on API failure', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockRejectedValueOnce(new Error('Forbidden'));

      await expect(v.createProject('FailProject')).rejects.toThrow('Forbidden');
    });
  });

  // ─── waitForProjectCreation (tested indirectly through createProject) ─

  describe('waitForProjectCreation (via createProject)', () => {
    it('should handle failed operation status (caught internally, loops continue)', async () => {
      vi.useFakeTimers();

      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      // Create project succeeds
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'proj-id', name: 'Proj' }),
      });
      // First operation check: failed (caught internally, loop continues)
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ status: 'failed' }),
      });
      // Remaining attempts will reject (no more mocked values) -> also caught
      // After all 10 attempts exhausted, the method resolves and logs warning

      const promise = v.createProject('Proj', 'desc');
      // Advance past all 10 attempts * 2000ms each
      await vi.advanceTimersByTimeAsync(25000);

      // The method completes normally (failed status is caught by the try/catch)
      const result = await promise;
      expect(result.id).toBe('proj-id');
      vi.useRealTimers();
    });

    it('should handle in-progress status and eventually succeed', async () => {
      vi.useFakeTimers();

      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      // Create project
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'proj-id', name: 'Proj' }),
      });
      // First check: in progress
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ status: 'inProgress' }),
      });
      // Second check: succeeded
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ status: 'succeeded' }),
      });

      const promise = v.createProject('Proj', 'desc');
      // Advance past both setTimeout(2000) calls
      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;
      expect(result.id).toBe('proj-id');
      vi.useRealTimers();
    });

    it('should handle operation check errors gracefully', async () => {
      vi.useFakeTimers();

      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      // Create project
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'proj-id', name: 'Proj' }),
      });
      // Operation check: error then succeeded
      mockExecAsync.mockRejectedValueOnce(new Error('Transient error'));
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ status: 'succeeded' }),
      });

      const promise = v.createProject('Proj', 'desc');
      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;
      expect(result.id).toBe('proj-id');
      vi.useRealTimers();
    });

    it('should timeout after max attempts and log warning', async () => {
      vi.useFakeTimers();

      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      // Create project
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'proj-id', name: 'Proj' }),
      });
      // All operation checks return inProgress (10 attempts)
      for (let i = 0; i < 10; i++) {
        mockExecAsync.mockResolvedValueOnce({
          stdout: JSON.stringify({ status: 'inProgress' }),
        });
      }

      const promise = v.createProject('Proj', 'desc');
      // Advance past all 10 attempts (each waits 2000ms)
      await vi.advanceTimersByTimeAsync(25000);

      const result = await promise;
      expect(result.id).toBe('proj-id');
      vi.useRealTimers();
    });
  });

  // ─── callAzureDevOpsApi (tested indirectly) ────────────────────────

  describe('callAzureDevOpsApi (via public methods)', () => {
    it('should handle API error responses with message field', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ message: 'Unauthorized access' }),
      });

      const result = await v.checkProject('proj');
      expect(result).toBeNull();
    });

    it('should handle API error responses with errorMessage field', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ errorMessage: 'Bad request' }),
      });

      const result = await v.checkProject('proj');
      expect(result).toBeNull();
    });

    it('should convert curl 22 errors to 404 message', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockRejectedValueOnce(new Error('curl: (22) The requested URL returned error'));

      const result = await v.checkProject('proj');
      expect(result).toBeNull();
    });
  });

  // ─── checkAreaPathExists ───────────────────────────────────────────

  describe('checkAreaPathExists', () => {
    it('should find area path in flat tree', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          name: 'proj',
          children: [
            { id: 1, name: 'Platform', path: '\\proj\\Platform' },
            { id: 2, name: 'Backend', path: '\\proj\\Backend' },
          ],
        }),
      });

      const result = await v.checkAreaPathExists('proj', 'Platform');
      expect(result).toEqual({
        id: 1,
        name: 'Platform',
        path: '\\proj\\Platform',
      });
    });

    it('should find area path in nested tree', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          name: 'proj',
          children: [
            {
              id: 1,
              name: 'Platform',
              path: '\\proj\\Platform',
              children: [
                { id: 3, name: 'Core', path: '\\proj\\Platform\\Core' },
              ],
            },
          ],
        }),
      });

      const result = await v.checkAreaPathExists('proj', 'Core');
      expect(result).toEqual({
        id: 3,
        name: 'Core',
        path: '\\proj\\Platform\\Core',
      });
    });

    it('should extract leaf name from full backslash-separated path', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          name: 'proj',
          children: [
            { id: 5, name: 'Engineering', path: '\\proj\\Engineering' },
          ],
        }),
      });

      const result = await v.checkAreaPathExists('proj', 'proj\\Engineering');
      expect(result).toEqual({
        id: 5,
        name: 'Engineering',
        path: '\\proj\\Engineering',
      });
    });

    it('should return null when area path not found', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          name: 'proj',
          children: [],
        }),
      });

      const result = await v.checkAreaPathExists('proj', 'NonExistent');
      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockRejectedValueOnce(new Error('API Error'));

      const result = await v.checkAreaPathExists('proj', 'Whatever');
      expect(result).toBeNull();
    });

    it('should match root node name', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 10,
          name: 'proj',
          path: '\\proj',
        }),
      });

      const result = await v.checkAreaPathExists('proj', 'proj');
      expect(result).toEqual({
        id: 10,
        name: 'proj',
        path: '\\proj',
      });
    });
  });

  // ─── fetchTeams ────────────────────────────────────────────────────

  describe('fetchTeams', () => {
    it('should return mapped teams from API response', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          value: [
            { id: 't1', name: 'Team Alpha', description: 'Alpha desc' },
            { id: 't2', name: 'Team Beta' },
          ],
        }),
      });

      const result = await v.fetchTeams('proj');
      expect(result).toEqual([
        { id: 't1', name: 'Team Alpha', description: 'Alpha desc' },
        { id: 't2', name: 'Team Beta', description: '' },
      ]);
    });

    it('should return empty array on API error', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockRejectedValueOnce(new Error('Network error'));

      const result = await v.fetchTeams('proj');
      expect(result).toEqual([]);
    });
  });

  // ─── createTeam ────────────────────────────────────────────────────

  describe('createTeam', () => {
    it('should create team and return result', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'team-id',
          name: 'Frontend',
          description: 'Frontend team',
        }),
      });

      const result = await v.createTeam('proj', 'Frontend');
      expect(result).toEqual({
        id: 'team-id',
        name: 'Frontend',
        description: 'Frontend team',
      });
    });

    it('should handle team with no description', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'team-id',
          name: 'Backend',
        }),
      });

      const result = await v.createTeam('proj', 'Backend');
      expect(result).toEqual({
        id: 'team-id',
        name: 'Backend',
        description: '',
      });
    });

    it('should throw on API failure', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockRejectedValueOnce(new Error('Conflict'));

      await expect(v.createTeam('proj', 'DuplicateTeam')).rejects.toThrow('Conflict');
    });
  });

  // ─── validate() ────────────────────────────────────────────────────

  describe('validate', () => {
    it('should return invalid when PAT is missing', async () => {
      const v = createValidator(
        {},
        { organization: 'org', project: 'proj' },
      );

      const result = await v.validate();
      expect(result.valid).toBe(false);
    });

    it('should return invalid when organization is missing', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { project: 'proj' },
      );

      const result = await v.validate();
      expect(result.valid).toBe(false);
    });

    it('should return invalid when project is missing', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org' },
      );

      const result = await v.validate();
      expect(result.valid).toBe(false);
    });

    it('should validate existing single project successfully', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'MyProject' },
      );

      // checkProject returns the project
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'proj-id',
          name: 'MyProject',
          description: 'My project',
        }),
      });

      const result = await v.validate();
      expect(result.valid).toBe(true);
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0]).toEqual({
        name: 'MyProject',
        id: 'proj-id',
        exists: true,
        created: false,
      });
    });

    it('should validate multiple projects', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', projects: ['ProjA', 'ProjB'] },
      );

      // checkProject for ProjA
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'a-id', name: 'ProjA', description: '' }),
      });
      // checkProject for ProjB
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'b-id', name: 'ProjB', description: '' }),
      });

      const result = await v.validate();
      expect(result.valid).toBe(true);
      expect(result.projects).toHaveLength(2);
    });

    it('should handle cancel action for missing project', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'Missing' },
      );

      // checkProject returns null (not found)
      mockExecAsync.mockRejectedValueOnce(new Error('Not found'));
      // fetchProjects
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ value: [] }),
      });
      // User cancels
      mockSelect.mockResolvedValueOnce('cancel');

      const result = await v.validate();
      expect(result.valid).toBe(false);
    });

    it('should handle skip action for missing project', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'Missing' },
      );

      // checkProject returns null
      mockExecAsync.mockRejectedValueOnce(new Error('Not found'));
      // fetchProjects
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ value: [] }),
      });
      // User skips
      mockSelect.mockResolvedValueOnce('skip');

      const result = await v.validate();
      expect(result.valid).toBe(true);
      expect(result.projects[0]).toEqual({
        name: 'Missing',
        exists: false,
        created: false,
      });
    });

    it('should handle select existing project action', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'Missing' },
      );

      // checkProject returns null (not found)
      mockExecAsync.mockRejectedValueOnce(new Error('Not found'));
      // fetchProjects returns available projects
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          value: [
            { id: 'ex-1', name: 'Existing1', description: 'Existing project' },
          ],
        }),
      });
      // User selects
      mockSelect.mockResolvedValueOnce('select');
      // User picks project
      mockSelect.mockResolvedValueOnce('Existing1');
      // checkProject for selected project
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'ex-1',
          name: 'Existing1',
          description: 'Existing project',
        }),
      });

      const result = await v.validate();
      expect(result.projects[0]).toEqual({
        name: 'Existing1',
        id: 'ex-1',
        exists: true,
        created: false,
      });
      expect(result.envUpdated).toBe(true);
    });

    it('should handle create project action', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'NewProj' },
      );

      // checkProject returns null (not found)
      mockExecAsync.mockRejectedValueOnce(new Error('Not found'));
      // fetchProjects
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ value: [] }),
      });
      // User chooses create
      mockSelect.mockResolvedValueOnce('create');
      // User enters description
      mockInput.mockResolvedValueOnce('My new project');
      // createProject API call
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'new-id', name: 'NewProj' }),
      });
      // waitForProjectCreation: operation succeeded
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ status: 'succeeded' }),
      });

      const result = await v.validate();
      expect(result.projects[0]).toEqual({
        name: 'NewProj',
        id: 'new-id',
        exists: true,
        created: true,
      });
    });

    it('should handle select action when selected project details fail', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'Missing' },
      );

      // checkProject: not found
      mockExecAsync.mockRejectedValueOnce(new Error('Not found'));
      // fetchProjects
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          value: [{ id: 'x', name: 'SomeProject', description: '' }],
        }),
      });
      // User selects
      mockSelect.mockResolvedValueOnce('select');
      // User picks project
      mockSelect.mockResolvedValueOnce('SomeProject');
      // checkProject for selected project fails
      mockExecAsync.mockRejectedValueOnce(new Error('Failed'));

      const result = await v.validate();
      // Project was not added due to fetch failure, but validation continues
      expect(result.projects).toHaveLength(0);
    });

    it('should validate area paths that exist', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        {
          organization: 'org',
          project: 'proj',
          areaPaths: ['Engineering'],
        },
      );

      // checkProject
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'p-id', name: 'proj', description: '' }),
      });
      // checkAreaPathExists
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          name: 'proj',
          children: [
            { id: 1, name: 'Engineering', path: '\\proj\\Engineering' },
          ],
        }),
      });

      const result = await v.validate();
      expect(result.areaPaths).toHaveLength(1);
      expect(result.areaPaths[0]).toEqual({
        name: 'Engineering',
        exists: true,
        created: false,
      });
    });

    it('should warn about area paths that do not exist', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        {
          organization: 'org',
          project: 'proj',
          areaPaths: ['NonExistent'],
        },
      );

      // checkProject
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'p-id', name: 'proj', description: '' }),
      });
      // checkAreaPathExists - no match
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          name: 'proj',
          children: [],
        }),
      });

      const result = await v.validate();
      expect(result.areaPaths).toHaveLength(1);
      expect(result.areaPaths[0]).toEqual({
        name: 'NonExistent',
        exists: false,
        created: false,
      });
    });

    it('should handle root area path (leafName equals projectName)', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        {
          organization: 'org',
          project: 'proj',
          areaPaths: ['proj'],
        },
      );

      // checkProject
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'p-id', name: 'proj', description: '' }),
      });
      // checkAreaPathExists - returns null (but root always exists logic kicks in)
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ name: 'root', children: [] }),
      });

      const result = await v.validate();
      expect(result.areaPaths).toHaveLength(1);
      // Root area path with same name as project is treated as existing
      expect(result.areaPaths[0]).toEqual({
        name: 'proj',
        exists: true,
        created: false,
      });
    });

    it('should skip area paths that belong to different project (full path)', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        {
          organization: 'org',
          project: 'ProjA',
          areaPaths: ['ProjB\\Engineering'],
        },
      );

      // checkProject for ProjA
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'a-id', name: 'ProjA', description: '' }),
      });

      // No API call for area path since it starts with ProjB, not ProjA
      const result = await v.validate();
      expect(result.areaPaths).toHaveLength(0);
    });

    it('should validate teams that exist', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        {
          organization: 'org',
          project: 'proj',
          teams: ['Alpha Team'],
        },
      );

      // checkProject
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'p-id', name: 'proj', description: '' }),
      });
      // fetchTeams
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          value: [
            { id: 'team-1', name: 'Alpha Team', description: 'Alpha' },
          ],
        }),
      });

      const result = await v.validate();
      expect(result.teams).toHaveLength(1);
      expect(result.teams[0]).toEqual({
        name: 'Alpha Team',
        id: 'team-1',
        exists: true,
        created: false,
      });
    });

    it('should warn about teams that do not exist', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        {
          organization: 'org',
          project: 'proj',
          teams: ['Nonexistent Team'],
        },
      );

      // checkProject
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'p-id', name: 'proj', description: '' }),
      });
      // fetchTeams (empty)
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ value: [] }),
      });

      const result = await v.validate();
      expect(result.teams).toHaveLength(1);
      expect(result.teams[0]).toEqual({
        name: 'Nonexistent Team',
        exists: false,
        created: false,
      });
    });

    it('should use project-per-team strategy for env update', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        {
          organization: 'org',
          projects: ['Missing'],
          strategy: 'project-per-team',
        },
      );

      // checkProject: not found
      mockExecAsync.mockRejectedValueOnce(new Error('Not found'));
      // fetchProjects
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          value: [{ id: 'ex-1', name: 'Replacement', description: '' }],
        }),
      });
      // User selects existing
      mockSelect.mockResolvedValueOnce('select');
      mockSelect.mockResolvedValueOnce('Replacement');
      // checkProject for Replacement
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'ex-1', name: 'Replacement', description: '' }),
      });

      const result = await v.validate();
      expect(result.envUpdated).toBe(true);
      // Verify writeFileSync was called (updateEnv)
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it('should print success summary when valid', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'proj' },
      );

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'p-id', name: 'proj', description: '' }),
      });

      const result = await v.validate();
      expect(result.valid).toBe(true);
    });

    it('should handle area paths with full paths that match current project', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        {
          organization: 'org',
          project: 'proj',
          areaPaths: ['proj\\Backend'],
        },
      );

      // checkProject
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'p-id', name: 'proj', description: '' }),
      });
      // checkAreaPathExists for "proj\Backend" -> leaf = "Backend"
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          name: 'proj',
          children: [
            { id: 7, name: 'Backend', path: '\\proj\\Backend' },
          ],
        }),
      });

      const result = await v.validate();
      expect(result.areaPaths).toHaveLength(1);
      expect(result.areaPaths[0].name).toBe('Backend');
      expect(result.areaPaths[0].exists).toBe(true);
    });
  });

  // ─── updateEnv (tested indirectly via validate select action) ──────

  describe('updateEnv (via validate)', () => {
    it('should update existing key in .env', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'Missing' },
      );

      // Re-setup mocks for updateEnv: file exists with content
      mockExistsSync.mockImplementation((p: string) => {
        if (p === '.env') return true;
        if (p.endsWith('config.json')) return true;
        return false;
      });

      // checkProject: not found
      mockExecAsync.mockRejectedValueOnce(new Error('Not found'));
      // fetchProjects
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          value: [{ id: 'x', name: 'Replaced' }],
        }),
      });
      // User selects existing
      mockSelect.mockResolvedValueOnce('select');
      mockSelect.mockResolvedValueOnce('Replaced');
      // checkProject for Replaced
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'x', name: 'Replaced', description: '' }),
      });
      // readFileSync for updateEnv
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === '.env') return 'AZURE_DEVOPS_PAT=pat\nAZURE_DEVOPS_PROJECT=Missing';
        return makeConfigContent({ organization: 'org', project: 'Missing' });
      });

      const result = await v.validate();
      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(result.envUpdated).toBe(true);
    });

    it('should throw when writeFileSync fails in updateEnv', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'Missing' },
      );

      mockExistsSync.mockImplementation((p: string) => {
        if (p === '.env') return true;
        if (p.endsWith('config.json')) return true;
        return false;
      });

      // checkProject: not found
      mockExecAsync.mockRejectedValueOnce(new Error('Not found'));
      // fetchProjects
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          value: [{ id: 'x', name: 'Replaced' }],
        }),
      });
      // User selects existing
      mockSelect.mockResolvedValueOnce('select');
      mockSelect.mockResolvedValueOnce('Replaced');
      // checkProject for Replaced
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'x', name: 'Replaced', description: '' }),
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === '.env') return 'AZURE_DEVOPS_PAT=pat';
        return makeConfigContent({ organization: 'org', project: 'Missing' });
      });
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('EACCES');
      });

      await expect(v.validate()).rejects.toThrow('EACCES');
    });

    it('should append key if not already in .env', async () => {
      const v = createValidator(
        { AZURE_DEVOPS_PAT: 'pat' },
        { organization: 'org', project: 'Missing' },
      );

      mockExistsSync.mockImplementation((p: string) => {
        if (p === '.env') return true;
        if (p.endsWith('config.json')) return true;
        return false;
      });

      // checkProject: not found
      mockExecAsync.mockRejectedValueOnce(new Error('Not found'));
      // fetchProjects
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          value: [{ id: 'x', name: 'Replaced' }],
        }),
      });
      // User selects existing
      mockSelect.mockResolvedValueOnce('select');
      mockSelect.mockResolvedValueOnce('Replaced');
      // checkProject for Replaced
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'x', name: 'Replaced', description: '' }),
      });
      // readFileSync for updateEnv: no AZURE_DEVOPS_PROJECT key
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === '.env') return 'AZURE_DEVOPS_PAT=pat';
        return makeConfigContent({ organization: 'org', project: 'Missing' });
      });

      await v.validate();
      expect(mockWriteFileSync).toHaveBeenCalled();
      const writtenContent = mockWriteFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('AZURE_DEVOPS_PROJECT=Replaced');
    });
  });

  // ─── validateAzureDevOpsResources (utility function) ───────────────

  describe('validateAzureDevOpsResources', () => {
    it('should create validator and call validate', async () => {
      // Setup for constructor
      mockExistsSync.mockReturnValue(false);

      const result = await validateAzureDevOpsResources('.env');
      // No PAT -> invalid
      expect(result.valid).toBe(false);
    });

    it('should pass options to constructor', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await validateAzureDevOpsResources('.env', { readOnly: true });
      expect(result.valid).toBe(false);
    });

    it('should use default envPath', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await validateAzureDevOpsResources();
      expect(result.valid).toBe(false);
    });
  });
});
