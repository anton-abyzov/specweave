/**
 * Unit tests for ADOProjectAdapter
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.hoisted(() => vi.fn());

vi.mock('../../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// We need to mock global fetch
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

import { ADOProjectAdapter } from '../../../../../src/core/project/adapters/ado-project-adapter.js';
import { ProjectEventBus } from '../../../../../src/core/project/project-event-bus.js';
import type {
  Project,
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
  ProjectDeletedEvent,
  ProjectSyncRequestedEvent,
} from '../../../../../src/core/project/types/project-types.js';
import type { ProjectRegistry } from '../../../../../src/core/project/project-registry.js';

function createMockLogger() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test-project',
    name: 'Test Project',
    created: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRegistry(overrides: Partial<ProjectRegistry> = {}) {
  return {
    getEventBus: vi.fn().mockReturnValue(new ProjectEventBus()),
    updateProject: vi.fn().mockResolvedValue(undefined),
    getProject: vi.fn().mockResolvedValue(null),
    listProjects: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as ProjectRegistry;
}

describe('ADOProjectAdapter', () => {
  let adapter: ADOProjectAdapter;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();

    adapter = new ADOProjectAdapter({
      logger: mockLogger,
      organization: 'test-org',
      project: 'TestProject',
      pat: 'test-pat-token',
    });
  });

  describe('constructor', () => {
    it('should initialize with provided options', () => {
      expect(adapter).toBeDefined();
    });

    it('should use consoleLogger when no logger provided', () => {
      const adapterNoLogger = new ADOProjectAdapter({
        organization: 'org',
        project: 'proj',
      });
      expect(adapterNoLogger).toBeDefined();
    });

    it('should fallback to process.env.AZURE_DEVOPS_PAT when no pat provided', () => {
      const originalPat = process.env.AZURE_DEVOPS_PAT;
      process.env.AZURE_DEVOPS_PAT = 'env-pat-token';

      const adapterEnv = new ADOProjectAdapter({
        logger: mockLogger,
        organization: 'org',
        project: 'proj',
      });

      // Verify it was created (PAT is private, tested via behavior)
      expect(adapterEnv).toBeDefined();

      process.env.AZURE_DEVOPS_PAT = originalPat;
    });
  });

  describe('subscribe', () => {
    it('should subscribe to all project events from registry event bus', () => {
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
      });

      adapter.subscribe(registry);

      expect(registry.getEventBus).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'ADOProjectAdapter subscribed to project events'
      );

      // Verify all 4 event types have listeners
      expect(eventBus.listenerCount('ProjectCreated')).toBe(1);
      expect(eventBus.listenerCount('ProjectUpdated')).toBe(1);
      expect(eventBus.listenerCount('ProjectDeleted')).toBe(1);
      expect(eventBus.listenerCount('ProjectSyncRequested')).toBe(1);
    });
  });

  describe('handleProjectCreated (via event bus)', () => {
    it('should create area path and update registry on successful creation', async () => {
      const project = createMockProject();
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
        updateProject: vi.fn().mockResolvedValue(undefined),
      });

      // Mock fetch for createAreaPath (POST returns 201)
      mockFetch.mockResolvedValueOnce({
        status: 201,
        ok: true,
      });

      adapter.subscribe(registry);

      const event: ProjectCreatedEvent = {
        type: 'ProjectCreated',
        project,
        timestamp: new Date().toISOString(),
      };

      await eventBus.emitAndWait(event);

      expect(registry.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          external: expect.objectContaining({
            ado: expect.objectContaining({
              areaPath: 'TestProject\\TestProject',
            }),
          }),
        }),
        { emitEvent: false }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Created ADO area path')
      );
    });

    it('should handle area path creation failure (no permissions)', async () => {
      const project = createMockProject();
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
        updateProject: vi.fn().mockResolvedValue(undefined),
      });

      // Mock fetch for createAreaPath (POST returns 403)
      mockFetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
      });

      adapter.subscribe(registry);

      await eventBus.emitAndWait({
        type: 'ProjectCreated',
        project,
        timestamp: new Date().toISOString(),
      });

      expect(registry.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          external: expect.objectContaining({
            ado: expect.objectContaining({
              syncError: 'Area path creation requires admin permissions',
            }),
          }),
        }),
        { emitEvent: false }
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('ADO area path mapping saved')
      );
    });

    it('should handle error during area path creation and update registry with error', async () => {
      const project = createMockProject();
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
        updateProject: vi.fn().mockResolvedValue(undefined),
      });

      // Mock fetch to throw error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      adapter.subscribe(registry);

      await eventBus.emitAndWait({
        type: 'ProjectCreated',
        project,
        timestamp: new Date().toISOString(),
      });

      // Should have been called twice - first in the catch block
      expect(registry.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          external: expect.objectContaining({
            ado: expect.objectContaining({
              syncError: expect.stringContaining('Network error'),
            }),
          }),
        }),
        { emitEvent: false }
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to handle ADO mapping for project')
      );
    });

    it('should handle creation without registry', async () => {
      // Create adapter without subscribing (no registry)
      const adapterNoReg = new ADOProjectAdapter({
        logger: mockLogger,
        organization: 'test-org',
        project: 'TestProject',
        pat: 'test-pat',
      });

      // Access private method directly for coverage
      mockFetch.mockResolvedValueOnce({ status: 201, ok: true });

      await (adapterNoReg as any).handleProjectCreated({
        type: 'ProjectCreated',
        project: createMockProject(),
        timestamp: new Date().toISOString(),
      });

      // No error should have been thrown
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Created ADO area path')
      );
    });
  });

  describe('handleProjectUpdated (via event bus)', () => {
    it('should skip update if no relevant fields changed', async () => {
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
      });

      adapter.subscribe(registry);

      await eventBus.emitAndWait({
        type: 'ProjectUpdated',
        projectId: 'test-project',
        changes: { description: 'New description' },
        timestamp: new Date().toISOString(),
      });

      expect(registry.updateProject).not.toHaveBeenCalled();
    });

    it('should update mapping when name changes', async () => {
      const project = createMockProject();
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
        getProject: vi.fn().mockResolvedValue(project),
        updateProject: vi.fn().mockResolvedValue(undefined),
      });

      adapter.subscribe(registry);

      await eventBus.emitAndWait({
        type: 'ProjectUpdated',
        projectId: 'test-project',
        changes: { name: 'New Name' },
        timestamp: new Date().toISOString(),
      });

      expect(registry.getProject).toHaveBeenCalledWith('test-project');
      expect(registry.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          external: expect.objectContaining({
            ado: expect.objectContaining({
              areaPath: expect.any(String),
              syncError: undefined,
            }),
          }),
        }),
        { emitEvent: false }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Updated ADO mapping')
      );
    });

    it('should update mapping when external.ado changes', async () => {
      const project = createMockProject();
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
        getProject: vi.fn().mockResolvedValue(project),
        updateProject: vi.fn().mockResolvedValue(undefined),
      });

      adapter.subscribe(registry);

      await eventBus.emitAndWait({
        type: 'ProjectUpdated',
        projectId: 'test-project',
        changes: { external: { ado: { areaPath: 'NewPath\\Test' } } },
        timestamp: new Date().toISOString(),
      });

      expect(registry.updateProject).toHaveBeenCalled();
    });

    it('should skip update if project not found', async () => {
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
        getProject: vi.fn().mockResolvedValue(null),
      });

      adapter.subscribe(registry);

      await eventBus.emitAndWait({
        type: 'ProjectUpdated',
        projectId: 'nonexistent',
        changes: { name: 'test' },
        timestamp: new Date().toISOString(),
      });

      expect(registry.updateProject).not.toHaveBeenCalled();
    });

    it('should handle error during update gracefully', async () => {
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
        getProject: vi.fn().mockRejectedValue(new Error('DB error')),
      });

      adapter.subscribe(registry);

      await eventBus.emitAndWait({
        type: 'ProjectUpdated',
        projectId: 'test-project',
        changes: { name: 'test' },
        timestamp: new Date().toISOString(),
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update ADO mapping')
      );
    });
  });

  describe('handleProjectDeleted (via event bus)', () => {
    it('should log deletion without deleting area path', async () => {
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
      });

      adapter.subscribe(registry);

      await eventBus.emitAndWait({
        type: 'ProjectDeleted',
        projectId: 'test-project',
        project: createMockProject(),
        timestamp: new Date().toISOString(),
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Project test-project deleted. ADO area path preserved')
      );
    });
  });

  describe('handleSyncRequested (via event bus)', () => {
    it('should skip if ado is not in targets', async () => {
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
      });

      adapter.subscribe(registry);

      await eventBus.emitAndWait({
        type: 'ProjectSyncRequested',
        targets: ['github'],
        timestamp: new Date().toISOString(),
      });

      expect(registry.getProject).not.toHaveBeenCalled();
      expect(registry.listProjects).not.toHaveBeenCalled();
    });

    it('should sync specific project when projectId provided', async () => {
      const project = createMockProject();
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
        getProject: vi.fn().mockResolvedValue(project),
        updateProject: vi.fn().mockResolvedValue(undefined),
      });

      // Mock for areaPathExists call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ children: [{ name: 'TestProject' }] }),
      });

      adapter.subscribe(registry);

      await eventBus.emitAndWait({
        type: 'ProjectSyncRequested',
        projectId: 'test-project',
        targets: ['ado'],
        timestamp: new Date().toISOString(),
      });

      expect(registry.getProject).toHaveBeenCalledWith('test-project');
      expect(registry.updateProject).toHaveBeenCalled();
    });

    it('should sync all projects when no projectId provided', async () => {
      const projects = [createMockProject({ id: 'proj-1' }), createMockProject({ id: 'proj-2' })];
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
        listProjects: vi.fn().mockResolvedValue(projects),
        updateProject: vi.fn().mockResolvedValue(undefined),
      });

      // Mock for areaPathExists calls (one per project)
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      adapter.subscribe(registry);

      await eventBus.emitAndWait({
        type: 'ProjectSyncRequested',
        targets: ['ado'],
        timestamp: new Date().toISOString(),
      });

      expect(registry.listProjects).toHaveBeenCalled();
      expect(registry.updateProject).toHaveBeenCalledTimes(2);
    });

    it('should handle sync error gracefully', async () => {
      const eventBus = new ProjectEventBus();
      const registry = createMockRegistry({
        getEventBus: vi.fn().mockReturnValue(eventBus),
        getProject: vi.fn().mockRejectedValue(new Error('Sync failure')),
      });

      adapter.subscribe(registry);

      await eventBus.emitAndWait({
        type: 'ProjectSyncRequested',
        projectId: 'test',
        targets: ['ado'],
        timestamp: new Date().toISOString(),
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to handle ADO sync request')
      );
    });
  });

  describe('getAreaPath (private)', () => {
    it('should convert kebab-case to PascalCase area path', () => {
      const areaPath = (adapter as any).getAreaPath('my-cool-project');
      expect(areaPath).toBe('TestProject\\MyCoolProject');
    });

    it('should handle single word', () => {
      const areaPath = (adapter as any).getAreaPath('frontend');
      expect(areaPath).toBe('TestProject\\Frontend');
    });

    it('should handle multiple dashes', () => {
      const areaPath = (adapter as any).getAreaPath('my-very-cool-project');
      expect(areaPath).toBe('TestProject\\MyVeryCoolProject');
    });
  });

  describe('getAuthHeader (private)', () => {
    it('should generate Base64 encoded auth header with PAT', () => {
      const header = (adapter as any).getAuthHeader();
      const expected = `Basic ${Buffer.from(':test-pat-token').toString('base64')}`;
      expect(header).toBe(expected);
    });

    it('should handle empty PAT', () => {
      const adapterNoPat = new ADOProjectAdapter({
        logger: mockLogger,
        organization: 'org',
        project: 'proj',
      });
      const header = (adapterNoPat as any).getAuthHeader();
      const expected = `Basic ${Buffer.from(':').toString('base64')}`;
      expect(header).toBe(expected);
    });
  });

  describe('areaPathExists (private)', () => {
    it('should return false when no PAT configured', async () => {
      const adapterNoPat = new ADOProjectAdapter({
        logger: mockLogger,
        organization: 'org',
        project: 'proj',
      });

      const exists = await (adapterNoPat as any).areaPathExists('proj\\Test');
      expect(exists).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No PAT configured, cannot verify area path'
      );
    });

    it('should return true when area path found in tree', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          children: [{ name: 'TestProject', children: [] }],
        }),
      });

      const exists = await (adapter as any).areaPathExists('TestProject\\TestProject');
      expect(exists).toBe(true);
    });

    it('should return false when response not ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const exists = await (adapter as any).areaPathExists('TestProject\\Missing');
      expect(exists).toBe(false);
    });

    it('should return false on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const exists = await (adapter as any).areaPathExists('TestProject\\Test');
      expect(exists).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check area path')
      );
    });
  });

  describe('findAreaPath (private)', () => {
    it('should return true when path parts are empty', () => {
      const result = (adapter as any).findAreaPath({}, []);
      expect(result).toBe(true);
    });

    it('should find matching child', () => {
      const node = { children: [{ name: 'Frontend', children: [] }] };
      const result = (adapter as any).findAreaPath(node, ['Frontend']);
      expect(result).toBe(true);
    });

    it('should return false when child not found', () => {
      const node = { children: [{ name: 'Backend' }] };
      const result = (adapter as any).findAreaPath(node, ['Frontend']);
      expect(result).toBe(false);
    });

    it('should handle nested paths', () => {
      const node = {
        children: [
          {
            name: 'MyArea',
            children: [{ name: 'SubArea', children: [] }],
          },
        ],
      };
      const result = (adapter as any).findAreaPath(node, ['MyArea', 'SubArea']);
      expect(result).toBe(true);
    });

    it('should handle node with no children', () => {
      const node = {};
      const result = (adapter as any).findAreaPath(node, ['Anything']);
      expect(result).toBe(false);
    });
  });

  describe('createAreaPath (private)', () => {
    it('should return false when no PAT configured', async () => {
      const adapterNoPat = new ADOProjectAdapter({
        logger: mockLogger,
        organization: 'org',
        project: 'proj',
      });

      const created = await (adapterNoPat as any).createAreaPath('proj\\Test');
      expect(created).toBe(false);
    });

    it('should return true on 201 response', async () => {
      mockFetch.mockResolvedValueOnce({ status: 201, ok: true });

      const created = await (adapter as any).createAreaPath('TestProject\\NewArea');
      expect(created).toBe(true);
    });

    it('should return true on 200 response', async () => {
      mockFetch.mockResolvedValueOnce({ status: 200, ok: true });

      const created = await (adapter as any).createAreaPath('TestProject\\NewArea');
      expect(created).toBe(true);
    });

    it('should return false on 403 response and log warning', async () => {
      mockFetch.mockResolvedValueOnce({ status: 403, ok: false });

      const created = await (adapter as any).createAreaPath('TestProject\\NewArea');
      expect(created).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Insufficient permissions to create area path'
      );
    });

    it('should return false on other error status', async () => {
      mockFetch.mockResolvedValueOnce({ status: 500, ok: false });

      const created = await (adapter as any).createAreaPath('TestProject\\NewArea');
      expect(created).toBe(false);
    });

    it('should return false on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      const created = await (adapter as any).createAreaPath('TestProject\\Test');
      expect(created).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create area path')
      );
    });
  });

  describe('discoverProjects', () => {
    it('should return empty array when no PAT configured', async () => {
      const adapterNoPat = new ADOProjectAdapter({
        logger: mockLogger,
        organization: 'org',
        project: 'proj',
      });

      const projects = await adapterNoPat.discoverProjects();
      expect(projects).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No PAT configured, cannot discover ADO projects'
      );
    });

    it('should discover area paths and convert to projects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          children: [
            { name: 'Frontend App' },
            { name: 'Backend API' },
          ],
        }),
      });

      const projects = await adapter.discoverProjects();

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({
        id: 'frontend-app',
        name: 'Frontend App',
        external: {
          ado: { areaPath: 'TestProject\\Frontend App' },
        },
      });
      expect(projects[1]).toEqual({
        id: 'backend-api',
        name: 'Backend API',
        external: {
          ado: { areaPath: 'TestProject\\Backend API' },
        },
      });
    });

    it('should return empty array when response not ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const projects = await adapter.discoverProjects();
      expect(projects).toEqual([]);
    });

    it('should handle empty children', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ children: [] }),
      });

      const projects = await adapter.discoverProjects();
      expect(projects).toEqual([]);
    });

    it('should handle missing children field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      const projects = await adapter.discoverProjects();
      expect(projects).toEqual([]);
    });

    it('should handle fetch error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const projects = await adapter.discoverProjects();
      expect(projects).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to discover ADO area paths')
      );
    });
  });
});
