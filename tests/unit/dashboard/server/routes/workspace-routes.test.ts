import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SpecWeaveConfig } from '../../../../../src/core/config/types.js';
import type { WorkspaceRepo } from '../../../../../src/core/config/types.js';

// Mock ConfigManager
const mockRead = vi.fn<() => Promise<SpecWeaveConfig>>();
const mockWrite = vi.fn<(config: SpecWeaveConfig) => Promise<void>>();

class MockConfigManager {
  read = mockRead;
  write = mockWrite;
}

vi.mock('../../../../../src/core/config/config-manager.js', () => ({
  ConfigManager: MockConfigManager,
}));

// Import after mocking
const { createWorkspaceRouteHandlers } = await import('../../../../../src/dashboard/server/routes/workspace-routes.js');

function makeConfig(overrides?: Partial<SpecWeaveConfig>): SpecWeaveConfig {
  return {
    version: '3.0',
    workspace: {
      name: 'test-workspace',
      rootRepo: { github: { owner: 'acme', repo: 'umbrella' } },
      repos: [
        { id: 'frontend', path: 'repositories/acme/frontend', prefix: 'FE', name: 'Frontend App' },
        { id: 'backend', path: 'repositories/acme/backend', prefix: 'BE', sync: { github: { owner: 'acme', repo: 'backend' } } },
      ],
    },
    ...overrides,
  } as SpecWeaveConfig;
}

// Lightweight mock for req/res
function mockReq(): import('http').IncomingMessage {
  return {} as any;
}

function mockRes(): import('http').ServerResponse & { _status: number; _body: any } {
  const res: any = {
    _status: 200,
    _body: null,
    writeHead(status: number, headers?: any) { res._status = status; },
    end(body?: string) { if (body) res._body = JSON.parse(body); },
    headersSent: false,
  };
  return res;
}

describe('workspace-routes', () => {
  const projectRoot = '/test/project';
  let handlers: ReturnType<typeof createWorkspaceRouteHandlers>;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = createWorkspaceRouteHandlers(projectRoot);
  });

  describe('GET /api/workspace', () => {
    it('returns workspace config with name, rootRepo, and repos', async () => {
      const config = makeConfig();
      mockRead.mockResolvedValue(config);
      const res = mockRes();
      await handlers.getWorkspace(mockReq(), res, {});
      expect(res._status).toBe(200);
      expect(res._body.name).toBe('test-workspace');
      expect(res._body.rootRepo).toEqual({ github: { owner: 'acme', repo: 'umbrella' } });
      expect(res._body.repos).toHaveLength(2);
      expect(res._body.repos[0].id).toBe('frontend');
    });

    it('returns empty workspace when none configured', async () => {
      mockRead.mockResolvedValue({ version: '3.0' } as SpecWeaveConfig);
      const res = mockRes();
      await handlers.getWorkspace(mockReq(), res, {});
      expect(res._status).toBe(200);
      expect(res._body.name).toBe('');
      expect(res._body.repos).toEqual([]);
    });
  });

  describe('PATCH /api/workspace/repos/:id', () => {
    it('merges body into matching repo and writes config', async () => {
      const config = makeConfig();
      mockRead.mockResolvedValue(config);
      mockWrite.mockResolvedValue(undefined);
      const res = mockRes();
      await handlers.patchRepo(mockReq(), res, { id: 'frontend' }, { name: 'New Name', prefix: 'NFE' });
      expect(res._status).toBe(200);
      expect(res._body.id).toBe('frontend');
      expect(res._body.name).toBe('New Name');
      expect(res._body.prefix).toBe('NFE');
      expect(mockWrite).toHaveBeenCalledTimes(1);
      const written = mockWrite.mock.calls[0][0];
      expect(written.workspace!.repos.find((r: WorkspaceRepo) => r.id === 'frontend')!.name).toBe('New Name');
    });

    it('returns 404 if repo id not found', async () => {
      mockRead.mockResolvedValue(makeConfig());
      const res = mockRes();
      await handlers.patchRepo(mockReq(), res, { id: 'nonexistent' }, { name: 'X' });
      expect(res._status).toBe(404);
    });

    it('merges sync config correctly', async () => {
      const config = makeConfig();
      mockRead.mockResolvedValue(config);
      mockWrite.mockResolvedValue(undefined);
      const res = mockRes();
      await handlers.patchRepo(mockReq(), res, { id: 'frontend' }, { sync: { github: { owner: 'acme', repo: 'fe-app' } } });
      expect(res._status).toBe(200);
      expect(res._body.sync.github.owner).toBe('acme');
    });
  });

  describe('POST /api/workspace/repos', () => {
    it('appends new repo and returns 201', async () => {
      const config = makeConfig();
      mockRead.mockResolvedValue(config);
      mockWrite.mockResolvedValue(undefined);
      const res = mockRes();
      await handlers.postRepo(mockReq(), res, {}, { id: 'mobile', path: 'repositories/acme/mobile', prefix: 'MOB' });
      expect(res._status).toBe(201);
      expect(res._body.id).toBe('mobile');
      const written = mockWrite.mock.calls[0][0];
      expect(written.workspace!.repos).toHaveLength(3);
    });

    it('returns 400 if id already exists', async () => {
      mockRead.mockResolvedValue(makeConfig());
      const res = mockRes();
      await handlers.postRepo(mockReq(), res, {}, { id: 'frontend', path: 'x', prefix: 'X' });
      expect(res._status).toBe(400);
      expect(res._body.error).toContain('already exists');
    });

    it('returns 400 if required fields missing', async () => {
      mockRead.mockResolvedValue(makeConfig());
      const res = mockRes();
      await handlers.postRepo(mockReq(), res, {}, { id: 'new' });
      expect(res._status).toBe(400);
      expect(res._body.error).toContain('required');
    });
  });

  describe('DELETE /api/workspace/repos/:id', () => {
    it('removes repo and returns 204', async () => {
      const config = makeConfig();
      mockRead.mockResolvedValue(config);
      mockWrite.mockResolvedValue(undefined);
      const res = mockRes();
      await handlers.deleteRepo(mockReq(), res, { id: 'frontend' });
      expect(res._status).toBe(204);
      const written = mockWrite.mock.calls[0][0];
      expect(written.workspace!.repos).toHaveLength(1);
      expect(written.workspace!.repos[0].id).toBe('backend');
    });

    it('returns 404 if repo not found', async () => {
      mockRead.mockResolvedValue(makeConfig());
      const res = mockRes();
      await handlers.deleteRepo(mockReq(), res, { id: 'nonexistent' });
      expect(res._status).toBe(404);
    });
  });

  describe('input validation (T-035)', () => {
    it('rejects POST with empty id', async () => {
      mockRead.mockResolvedValue(makeConfig());
      const res = mockRes();
      await handlers.postRepo(mockReq(), res, {}, { id: '', path: 'x', prefix: 'X' });
      expect(res._status).toBe(400);
    });

    it('rejects PATCH with invalid sync structure', async () => {
      mockRead.mockResolvedValue(makeConfig());
      const res = mockRes();
      await handlers.patchRepo(mockReq(), res, { id: 'frontend' }, { sync: { github: 'bad' } });
      expect(res._status).toBe(400);
      expect(res._body.error).toContain('sync');
    });

    it('rejects POST with duplicate id', async () => {
      mockRead.mockResolvedValue(makeConfig());
      const res = mockRes();
      await handlers.postRepo(mockReq(), res, {}, { id: 'backend', path: 'x', prefix: 'Y' });
      expect(res._status).toBe(400);
      expect(res._body.error).toContain('already exists');
    });
  });
});
