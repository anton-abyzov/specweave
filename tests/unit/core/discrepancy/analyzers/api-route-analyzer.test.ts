/**
 * Tests for ApiRouteAnalyzer
 *
 * Covers Express, Fastify, and Next.js route extraction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

// ============================================================================
// Mocks
// ============================================================================

const { mockExistsSync, mockReadFileSync, mockReaddirSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockReaddirSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  readdirSync: mockReaddirSync,
}));

vi.mock('../../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
  },
}));

import { ApiRouteAnalyzer } from '../../../../../src/core/discrepancy/analyzers/api-route-analyzer.js';
import type { ApiRoute } from '../../../../../src/core/discrepancy/analyzers/api-route-analyzer.js';

// ============================================================================
// Test Helpers
// ============================================================================

function makeDirent(name: string, isDir: boolean) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    parentPath: '',
    path: '',
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('ApiRouteAnalyzer', () => {
  let analyzer: ApiRouteAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new ApiRouteAnalyzer({
      config: { projectRoot: '/project' },
    });
  });

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const defaultAnalyzer = new ApiRouteAnalyzer();
      // Should not throw
      expect(defaultAnalyzer).toBeDefined();
    });

    it('should accept custom logger', () => {
      const customLogger = {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        success: vi.fn(),
      };
      const a = new ApiRouteAnalyzer({ logger: customLogger });
      expect(a).toBeDefined();
    });

    it('should accept custom config values', () => {
      const a = new ApiRouteAnalyzer({
        config: {
          projectRoot: '/custom',
          routePatterns: ['api/**/*.ts'],
          nextjsApiDir: 'src/pages/api',
        },
      });
      expect(a).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // analyzeFile - Express routes
  // --------------------------------------------------------------------------

  describe('analyzeFile - Express routes', () => {
    it('should extract Express GET route with string literal path', async () => {
      const code = `
import express from 'express';
const app = express();
app.get('/users', listUsers);
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.errors).toHaveLength(0);
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].method).toBe('GET');
      expect(result.routes[0].path).toBe('/users');
      expect(result.routes[0].framework).toBe('express');
      expect(result.routes[0].handlerName).toBe('listUsers');
    });

    it('should extract Express POST route', async () => {
      const code = `
const router = require('express').Router();
router.post('/users', createUser);
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].method).toBe('POST');
      expect(result.routes[0].path).toBe('/users');
    });

    it('should extract Express route with params', async () => {
      const code = `
app.delete('/users/:id', deleteUser);
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].method).toBe('DELETE');
      expect(result.routes[0].params).toEqual(['id']);
    });

    it('should extract multiple params from route path', async () => {
      const code = `
app.put('/users/:userId/posts/:postId', updatePost);
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes[0].params).toEqual(['userId', 'postId']);
    });

    it('should extract optional params', async () => {
      const code = `
app.get('/users/:id?', getUser);
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes[0].params).toEqual(['id']);
    });

    it('should extract PATCH route', async () => {
      const code = `
app.patch('/items/:id', patchItem);
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes[0].method).toBe('PATCH');
    });

    it('should extract multiple routes from one file', async () => {
      const code = `
app.get('/users', listUsers);
app.post('/users', createUser);
app.get('/users/:id', getUser);
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes).toHaveLength(3);
    });

    it('should handle anonymous handler (no handler name)', async () => {
      const code = `
app.get('/health', (req, res) => res.json({ ok: true }));
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].handlerName).toBeUndefined();
    });

    it('should record correct line numbers', async () => {
      const code = `import express from 'express';
const app = express();
app.get('/users', listUsers);
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes[0].lineNumber).toBe(3);
    });

    it('should resolve relative paths against project root', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`app.get('/test', handler);`);

      const result = await analyzer.analyzeFile('src/routes.ts');

      expect(result.routes[0].filePath).toBe(path.resolve('/project', 'src/routes.ts'));
    });
  });

  // --------------------------------------------------------------------------
  // analyzeFile - Fastify routes
  // --------------------------------------------------------------------------

  describe('analyzeFile - Fastify routes', () => {
    it('should extract Fastify route object config', async () => {
      const code = `
fastify.route({
  method: 'GET',
  url: '/items',
  handler: getItems,
});
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].method).toBe('GET');
      expect(result.routes[0].path).toBe('/items');
      expect(result.routes[0].framework).toBe('fastify');
    });

    it('should extract Fastify POST route', async () => {
      const code = `
server.route({
  method: 'POST',
  url: '/items',
  handler: createItem,
});
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes[0].method).toBe('POST');
    });

    it('should extract params from Fastify route url', async () => {
      const code = `
fastify.route({
  method: 'DELETE',
  url: '/items/:id',
  handler: deleteItem,
});
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes[0].params).toEqual(['id']);
    });

    it('should skip Fastify route with missing method', async () => {
      const code = `
fastify.route({
  url: '/items',
  handler: getItems,
});
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes).toHaveLength(0);
    });

    it('should skip Fastify route with missing url', async () => {
      const code = `
fastify.route({
  method: 'GET',
  handler: getItems,
});
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/routes.ts');

      expect(result.routes).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // analyzeFile - File not found
  // --------------------------------------------------------------------------

  describe('analyzeFile - error handling', () => {
    it('should return error for non-existent file', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await analyzer.analyzeFile('/project/missing.ts');

      expect(result.routes).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('File not found');
    });

    it('should return no routes for file without route definitions', async () => {
      const code = `
const x = 1;
function helper() { return x; }
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeFile('/project/src/utils.ts');

      expect(result.routes).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // analyzeFiles (batch)
  // --------------------------------------------------------------------------

  describe('analyzeFiles', () => {
    it('should analyze multiple files', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync
        .mockReturnValueOnce(`app.get('/a', handlerA);`)
        .mockReturnValueOnce(`app.post('/b', handlerB);`);

      const result = await analyzer.analyzeFiles([
        '/project/src/a.ts',
        '/project/src/b.ts',
      ]);

      expect(result.routes).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect errors from individual files', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await analyzer.analyzeFiles(['/project/missing1.ts', '/project/missing2.ts']);

      expect(result.routes).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
    });

    it('should catch thrown errors from file analysis', async () => {
      mockExistsSync.mockImplementation(() => {
        throw new Error('permission denied');
      });

      const result = await analyzer.analyzeFiles(['/project/secret.ts']);

      expect(result.routes).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to analyze');
      expect(result.errors[0]).toContain('permission denied');
    });

    it('should return empty results for empty file list', async () => {
      const result = await analyzer.analyzeFiles([]);

      expect(result.routes).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // analyzeNextjsRoutes
  // --------------------------------------------------------------------------

  describe('analyzeNextjsRoutes', () => {
    it('should return empty when no api directories exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should discover Next.js pages/api routes', async () => {
      // Only pages/api exists
      mockExistsSync.mockImplementation((p: string) => {
        return p === path.join('/project', 'pages', 'api');
      });

      mockReaddirSync.mockReturnValue([
        makeDirent('users.ts', false),
      ]);

      mockReadFileSync.mockReturnValue('export default function handler(req, res) {}');

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].path).toBe('/api/users');
      expect(result.routes[0].framework).toBe('nextjs');
    });

    it('should convert [id] to :id in Next.js routes', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        return p === path.join('/project', 'pages', 'api');
      });

      mockReaddirSync.mockReturnValue([
        makeDirent('[id].ts', false),
      ]);

      mockReadFileSync.mockReturnValue('export default function handler() {}');

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes[0].path).toBe('/api/:id');
      expect(result.routes[0].params).toEqual(['id']);
    });

    it('should convert [...slug] to *slug in Next.js routes', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        return p === path.join('/project', 'pages', 'api');
      });

      mockReaddirSync.mockReturnValue([
        makeDirent('[...slug].ts', false),
      ]);

      mockReadFileSync.mockReturnValue('export default function handler() {}');

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes[0].path).toBe('/api/*slug');
    });

    it('should handle index.ts files as root routes', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        return p === path.join('/project', 'pages', 'api');
      });

      mockReaddirSync.mockReturnValue([
        makeDirent('index.ts', false),
      ]);

      mockReadFileSync.mockReturnValue('export default function handler() {}');

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes[0].path).toBe('/api');
    });

    it('should scan subdirectories recursively', async () => {
      const apiDir = path.join('/project', 'pages', 'api');
      const usersDir = path.join(apiDir, 'users');

      mockExistsSync.mockImplementation((p: string) => {
        return p === apiDir || p === usersDir;
      });

      mockReaddirSync.mockImplementation((dir: string) => {
        if (dir === apiDir) {
          return [makeDirent('users', true)];
        }
        if (dir === usersDir) {
          return [makeDirent('index.ts', false)];
        }
        return [];
      });

      mockReadFileSync.mockReturnValue('export default function handler() {}');

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].path).toBe('/api/users');
    });

    it('should skip files starting with underscore', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        return p === path.join('/project', 'pages', 'api');
      });

      mockReaddirSync.mockReturnValue([
        makeDirent('_middleware.ts', false),
        makeDirent('users.ts', false),
      ]);

      mockReadFileSync.mockReturnValue('export default function handler() {}');

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].path).toBe('/api/users');
    });

    it('should skip non-ts/js files', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        return p === path.join('/project', 'pages', 'api');
      });

      mockReaddirSync.mockReturnValue([
        makeDirent('readme.md', false),
        makeDirent('data.json', false),
      ]);

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Next.js exported method detection
  // --------------------------------------------------------------------------

  describe('Next.js exported method detection', () => {
    beforeEach(() => {
      mockExistsSync.mockImplementation((p: string) => {
        return p === path.join('/project', 'pages', 'api');
      });
      mockReaddirSync.mockReturnValue([
        makeDirent('items.ts', false),
      ]);
    });

    it('should detect export async function GET', async () => {
      mockReadFileSync.mockReturnValue('export async function GET(req) { return Response.json({}); }');

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].method).toBe('GET');
    });

    it('should detect export function POST', async () => {
      mockReadFileSync.mockReturnValue('export function POST(req) {}');

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].method).toBe('POST');
    });

    it('should detect export const DELETE', async () => {
      mockReadFileSync.mockReturnValue('export const DELETE = async (req) => {};');

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].method).toBe('DELETE');
    });

    it('should detect export const PUT', async () => {
      mockReadFileSync.mockReturnValue('export const PUT = async (req) => {};');

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes[0].method).toBe('PUT');
    });

    it('should detect export const PATCH', async () => {
      mockReadFileSync.mockReturnValue('export const PATCH = (req) => {};');

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes[0].method).toBe('PATCH');
    });

    it('should detect multiple exported methods', async () => {
      const code = `
export async function GET(req) { return Response.json({}); }
export async function POST(req) { return Response.json({}); }
export const DELETE = async (req) => {};
`;
      mockReadFileSync.mockReturnValue(code);

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes).toHaveLength(3);
      const methods = result.routes.map(r => r.method).sort();
      expect(methods).toEqual(['DELETE', 'GET', 'POST']);
    });

    it('should default to GET for default export only', async () => {
      mockReadFileSync.mockReturnValue('export default function handler(req, res) {}');

      const result = await analyzer.analyzeNextjsRoutes('/project');

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].method).toBe('GET');
    });
  });

  // --------------------------------------------------------------------------
  // analyze (top-level)
  // --------------------------------------------------------------------------

  describe('analyze', () => {
    it('should use project root from config when none provided', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await analyzer.analyze();

      expect(result.routes).toHaveLength(0);
      // Should have checked all 4 Next.js api dirs under /project
      expect(mockExistsSync).toHaveBeenCalledWith(path.join('/project', 'pages', 'api'));
    });

    it('should use provided project root', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await analyzer.analyze('/other');

      expect(mockExistsSync).toHaveBeenCalledWith(path.join('/other', 'pages', 'api'));
    });

    it('should aggregate routes and errors from Next.js analysis', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        return p === path.join('/project', 'app', 'api');
      });

      mockReaddirSync.mockReturnValue([
        makeDirent('health.ts', false),
      ]);
      mockReadFileSync.mockReturnValue('export async function GET() {}');

      const result = await analyzer.analyze();

      expect(result.routes.length).toBeGreaterThanOrEqual(1);
    });
  });
});
