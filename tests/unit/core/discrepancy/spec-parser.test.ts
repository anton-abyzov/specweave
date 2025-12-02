/**
 * Tests for Spec Parser
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { SpecParser } from '../../../../src/core/discrepancy/spec-parser.js';

describe('SpecParser', () => {
  const fixturesPath = path.join(__dirname, '../../../fixtures/discrepancy/sample-specs');
  let parser: SpecParser;

  beforeAll(() => {
    parser = new SpecParser({
      config: { docsPath: fixturesPath },
    });
  });

  describe('parseFile', () => {
    it('should parse API route specs', async () => {
      const result = await parser.parseFile(path.join(fixturesPath, 'api.md'));

      expect(result.errors).toHaveLength(0);

      const apiSpecs = result.specs.filter(s => s.type === 'api');
      expect(apiSpecs.length).toBeGreaterThanOrEqual(4);

      // Check GET /users
      const getUsersSpec = apiSpecs.find(s => s.identifier === '/users' && s.method === 'GET');
      expect(getUsersSpec).toBeDefined();
      expect(getUsersSpec?.description).toContain('list');
    });

    it('should extract route params', async () => {
      const result = await parser.parseFile(path.join(fixturesPath, 'api.md'));

      const getUserSpec = result.specs.find(s => s.identifier === '/users/:id' && s.method === 'GET');
      expect(getUserSpec).toBeDefined();
      expect(getUserSpec?.params).toContain('id');
    });

    it('should parse function specs', async () => {
      const result = await parser.parseFile(path.join(fixturesPath, 'api.md'));

      const funcSpecs = result.specs.filter(s => s.type === 'function');
      expect(funcSpecs.length).toBeGreaterThanOrEqual(2);

      const addSpec = funcSpecs.find(s => s.identifier === 'add');
      expect(addSpec).toBeDefined();
      expect(addSpec?.returnType).toBe('number');
    });

    it('should parse type specs', async () => {
      const result = await parser.parseFile(path.join(fixturesPath, 'api.md'));

      const typeSpecs = result.specs.filter(s => s.type === 'type');
      expect(typeSpecs.length).toBeGreaterThanOrEqual(2);

      const userSpec = typeSpecs.find(s => s.identifier === 'User');
      expect(userSpec).toBeDefined();
    });

    it('should handle file not found', async () => {
      const result = await parser.parseFile('/nonexistent/file.md');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not found');
    });
  });

  describe('parseApiSpecs', () => {
    it('should return only API specs', async () => {
      const specs = await parser.parseApiSpecs(fixturesPath);

      expect(specs.every(s => s.type === 'api')).toBe(true);
      expect(specs.length).toBeGreaterThan(0);
    });
  });

  describe('parseFunctionSpecs', () => {
    it('should return only function specs', async () => {
      const specs = await parser.parseFunctionSpecs(fixturesPath);

      expect(specs.every(s => s.type === 'function')).toBe(true);
      expect(specs.length).toBeGreaterThan(0);
    });
  });
});
