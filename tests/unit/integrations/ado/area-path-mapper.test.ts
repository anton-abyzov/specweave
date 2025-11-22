/**
 * Unit Tests: ADO Area Path Mapper
 *
 * Tests area path fetching, parsing, mapping, and granularity selection.
 *
 * @group unit
 * @module tests/unit/integrations/ado/area-path-mapper
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AreaPathMapper, type AreaPathNode } from '../../../../src/integrations/ado/area-path-mapper.js';
import { silentLogger } from '../../../../src/utils/logger.js';

// Mock fetch
global.fetch = vi.fn();

describe('AreaPathMapper', () => {
  let mapper: AreaPathMapper;
  const mockCredentials = {
    organization: 'test-org',
    pat: 'test-pat'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mapper = new AreaPathMapper({
      credentials: mockCredentials,
      project: 'TestProject',
      logger: silentLogger
    });
  });

  describe('fetchAreaPaths', () => {
    it('should fetch area path tree from ADO API', async () => {
      // TC-077: Fetch Area Path Tree (Recursive)
      const mockResponse = {
        id: '1',
        name: 'TestProject',
        hasChildren: true,
        children: [
          {
            id: '2',
            name: 'Backend',
            hasChildren: true,
            children: [
              { id: '3', name: 'API', hasChildren: false },
              { id: '4', name: 'Database', hasChildren: false }
            ]
          },
          {
            id: '5',
            name: 'Frontend',
            hasChildren: false
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers()
      } as Response);

      const result = await mapper.fetchAreaPaths();

      expect(result.name).toBe('TestProject');
      expect(result.level).toBe(0);
      expect(result.children).toHaveLength(2);
      expect(result.children![0].name).toBe('Backend');
      expect(result.children![0].children).toHaveLength(2);
      expect(result.children![0].children![0].name).toBe('API');
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
        headers: new Headers()
      } as Response);

      await expect(mapper.fetchAreaPaths()).rejects.toThrow('ADO API error (401)');
    });
  });

  describe('parseAreaPathTree', () => {
    it('should parse flat area path tree correctly', () => {
      const mockNode = {
        id: '1',
        name: 'TestProject',
        hasChildren: false
      };

      const result = mapper.parseAreaPathTree(mockNode, 0, '');

      expect(result.id).toBe('1');
      expect(result.name).toBe('TestProject');
      expect(result.path).toBe('TestProject');
      expect(result.level).toBe(0);
      expect(result.hasChildren).toBe(false);
      expect(result.children).toBeUndefined();
    });

    it('should parse nested area path tree recursively', () => {
      const mockNode = {
        id: '1',
        name: 'TestProject',
        hasChildren: true,
        children: [
          {
            id: '2',
            name: 'Backend',
            hasChildren: true,
            children: [
              { id: '3', name: 'API', hasChildren: false }
            ]
          }
        ]
      };

      const result = mapper.parseAreaPathTree(mockNode, 0, '');

      expect(result.path).toBe('TestProject');
      expect(result.level).toBe(0);
      expect(result.children).toHaveLength(1);

      const backend = result.children![0];
      expect(backend.path).toBe('TestProject/Backend');
      expect(backend.level).toBe(1);
      expect(backend.children).toHaveLength(1);

      const api = backend.children![0];
      expect(api.path).toBe('TestProject/Backend/API');
      expect(api.level).toBe(2);
    });
  });

  describe('mapToProjectId', () => {
    it('should map root area path to kebab-case', () => {
      // TC-079: Map Area Path to Project ID (Root)
      const result = mapper.mapToProjectId('Platform');

      expect(result).toBe('platform');
    });

    it('should map nested area path to kebab-case (exclude root)', () => {
      // TC-078: Map Area Path to Project ID (Kebab-Case)
      const result = mapper.mapToProjectId('Platform/Backend/API');

      expect(result).toBe('backend-api');
    });

    it('should handle special characters in area path names', () => {
      const result = mapper.mapToProjectId('Platform/Backend Services/RESTful API');

      expect(result).toBe('backend-services-restful-api');
    });

    it('should handle two-level area paths', () => {
      const result = mapper.mapToProjectId('Platform/Frontend');

      expect(result).toBe('frontend');
    });

    it('should handle deep hierarchies', () => {
      const result = mapper.mapToProjectId('Platform/Backend/API/v2/GraphQL');

      expect(result).toBe('backend-api-v2-graphql');
    });
  });

  describe('flattenAreaPaths', () => {
    let mockTree: AreaPathNode;

    beforeEach(() => {
      mockTree = {
        id: '1',
        name: 'Platform',
        path: 'Platform',
        level: 0,
        hasChildren: true,
        children: [
          {
            id: '2',
            name: 'Backend',
            path: 'Platform/Backend',
            level: 1,
            parentPath: 'Platform',
            hasChildren: true,
            children: [
              {
                id: '3',
                name: 'API',
                path: 'Platform/Backend/API',
                level: 2,
                parentPath: 'Platform/Backend',
                hasChildren: false
              },
              {
                id: '4',
                name: 'Database',
                path: 'Platform/Backend/Database',
                level: 2,
                parentPath: 'Platform/Backend',
                hasChildren: false
              }
            ]
          },
          {
            id: '5',
            name: 'Frontend',
            path: 'Platform/Frontend',
            level: 1,
            parentPath: 'Platform',
            hasChildren: true,
            children: [
              {
                id: '6',
                name: 'Web',
                path: 'Platform/Frontend/Web',
                level: 2,
                parentPath: 'Platform/Frontend',
                hasChildren: false
              }
            ]
          },
          {
            id: '7',
            name: 'Infrastructure',
            path: 'Platform/Infrastructure',
            level: 1,
            parentPath: 'Platform',
            hasChildren: false
          }
        ]
      };
    });

    it('should flatten top-level only', () => {
      // TC-080: Flatten Top-Level Only
      const result = mapper.flattenAreaPaths(mockTree, 'top-level');

      expect(result).toHaveLength(3);
      expect(result.map(n => n.name)).toEqual(['Backend', 'Frontend', 'Infrastructure']);
      expect(result.every(n => n.level === 1)).toBe(true);
    });

    it('should flatten two-level', () => {
      // TC-081: Flatten Two-Level
      const result = mapper.flattenAreaPaths(mockTree, 'two-level');

      expect(result).toHaveLength(4);
      expect(result.map(n => n.name)).toEqual(['API', 'Database', 'Web', 'Infrastructure']);
      expect(result.every(n => n.level === 2 || n.level === 1)).toBe(true);
    });

    it('should flatten full tree', () => {
      // TC-082: Flatten Full Tree
      const result = mapper.flattenAreaPaths(mockTree, 'full-tree');

      expect(result).toHaveLength(7); // All nodes including root
      expect(result[0].name).toBe('Platform'); // Includes root
    });

    it('should throw error for invalid granularity', () => {
      expect(() => {
        mapper.flattenAreaPaths(mockTree, 'invalid' as any);
      }).toThrow('Invalid granularity');
    });
  });

  describe('suggestGranularity', () => {
    it('should suggest top-level for small hierarchies', () => {
      const smallTree: AreaPathNode = {
        id: '1',
        name: 'Project',
        path: 'Project',
        level: 0,
        hasChildren: true,
        children: [
          { id: '2', name: 'Backend', path: 'Project/Backend', level: 1, hasChildren: false },
          { id: '3', name: 'Frontend', path: 'Project/Frontend', level: 1, hasChildren: false }
        ]
      };

      const result = mapper.suggestGranularity(smallTree);

      expect(result.suggested).toBe('top-level');
      expect(result.reasoning).toContain('Small hierarchy');
    });

    it('should suggest two-level for balanced hierarchies', () => {
      const balancedTree: AreaPathNode = {
        id: '1',
        name: 'Platform',
        path: 'Platform',
        level: 0,
        hasChildren: true,
        children: Array.from({ length: 6 }, (_, i) => ({
          id: `${i + 2}`,
          name: `Area${i + 1}`,
          path: `Platform/Area${i + 1}`,
          level: 1,
          hasChildren: true,
          children: [
            { id: `${i + 2}-1`, name: `Sub${i + 1}`, path: `Platform/Area${i + 1}/Sub${i + 1}`, level: 2, hasChildren: false }
          ]
        }))
      };

      const result = mapper.suggestGranularity(balancedTree);

      expect(result.suggested).toBe('two-level');
      expect(result.reasoning).toContain('Balanced hierarchy');
    });

    it('should suggest top-level for very large hierarchies', () => {
      const largeTree: AreaPathNode = {
        id: '1',
        name: 'Enterprise',
        path: 'Enterprise',
        level: 0,
        hasChildren: true,
        children: Array.from({ length: 30 }, (_, i) => ({
          id: `${i + 2}`,
          name: `Division${i + 1}`,
          path: `Enterprise/Division${i + 1}`,
          level: 1,
          hasChildren: true,
          children: Array.from({ length: 5 }, (_, j) => ({
            id: `${i + 2}-${j + 1}`,
            name: `Team${j + 1}`,
            path: `Enterprise/Division${i + 1}/Team${j + 1}`,
            level: 2,
            hasChildren: false
          }))
        }))
      };

      const result = mapper.suggestGranularity(largeTree);

      expect(result.suggested).toBe('top-level');
      expect(result.reasoning).toContain('Large hierarchy');
    });
  });
});
