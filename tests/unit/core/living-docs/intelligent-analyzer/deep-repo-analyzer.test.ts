/**
 * Deep Repo Analyzer Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { analyzeRepo, analyzeAllRepos } from '../../../../../src/core/living-docs/intelligent-analyzer/deep-repo-analyzer.js';

describe('deep-repo-analyzer', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyzer-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('analyzeRepo (basic mode - no LLM)', () => {
    it('should extract purpose from README', async () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# My API\n\nThis service handles user authentication and session management.');
      fs.writeFileSync(path.join(testDir, 'package.json'), '{"name": "my-api"}');

      const log = vi.fn();
      const analysis = await analyzeRepo(testDir, 'my-api', null, log);

      expect(analysis.name).toBe('my-api');
      expect(analysis.purpose).toContain('authentication');
      expect(analysis.confidence).toBe('low'); // No LLM = low confidence
    });

    it('should detect REST API pattern', async () => {
      fs.writeFileSync(path.join(testDir, 'index.ts'), `
        import express from 'express';
        const app = express();
        app.get('/users', (req, res) => res.json([]));
      `);
      fs.writeFileSync(path.join(testDir, 'package.json'), '{"dependencies": {"express": "^4.0.0"}}');

      const log = vi.fn();
      const analysis = await analyzeRepo(testDir, 'express-api', null, log);

      const restPattern = analysis.patternsUsed.find(p => p.pattern === 'REST API');
      expect(restPattern).toBeDefined();
      expect(restPattern!.confidence).toBe('high');
    });

    it('should detect GraphQL pattern', async () => {
      fs.writeFileSync(path.join(testDir, 'index.ts'), `
        import { ApolloServer } from '@apollo/server';
        import { graphql } from 'graphql';
      `);

      const log = vi.fn();
      const analysis = await analyzeRepo(testDir, 'graphql-api', null, log);

      const gqlPattern = analysis.patternsUsed.find(p => p.pattern === 'GraphQL');
      expect(gqlPattern).toBeDefined();
    });

    it('should detect ORM pattern', async () => {
      fs.writeFileSync(path.join(testDir, 'index.ts'), `
        import { PrismaClient } from '@prisma/client';
        const prisma = new PrismaClient();
      `);

      const log = vi.fn();
      const analysis = await analyzeRepo(testDir, 'prisma-app', null, log);

      const ormPattern = analysis.patternsUsed.find(p => p.pattern === 'ORM');
      expect(ormPattern).toBeDefined();
    });

    it('should extract external dependencies from package.json', async () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        dependencies: {
          'aws-sdk': '^3.0.0',
          'redis': '^4.0.0',
          'express': '^4.0.0'
        }
      }));

      const log = vi.fn();
      const analysis = await analyzeRepo(testDir, 'aws-app', null, log);

      expect(analysis.externalDependencies).toContain('aws-sdk');
      expect(analysis.externalDependencies).toContain('redis');
    });

    it('should extract basic APIs from exports', async () => {
      fs.writeFileSync(path.join(testDir, 'index.ts'), `
        export function createUser() {}
        export async function deleteUser() {}
        export class UserService {}
      `);

      const log = vi.fn();
      const analysis = await analyzeRepo(testDir, 'user-service', null, log);

      expect(analysis.mainApis.length).toBeGreaterThan(0);
      const createUserApi = analysis.mainApis.find(a => a.name === 'createUser');
      expect(createUserApi).toBeDefined();
    });
  });

  describe('analyzeAllRepos', () => {
    it('should analyze multiple repos', async () => {
      const repo1 = path.join(testDir, 'repo1');
      const repo2 = path.join(testDir, 'repo2');
      fs.mkdirSync(repo1);
      fs.mkdirSync(repo2);
      fs.writeFileSync(path.join(repo1, 'README.md'), '# Repo 1');
      fs.writeFileSync(path.join(repo2, 'README.md'), '# Repo 2');

      const repos = [
        { name: 'repo1', path: repo1 },
        { name: 'repo2', path: repo2 },
      ];

      const log = vi.fn();
      const onProgress = vi.fn();
      const results = await analyzeAllRepos(repos, null, onProgress, log);

      expect(results.size).toBe(2);
      expect(results.has('repo1')).toBe(true);
      expect(results.has('repo2')).toBe(true);
    });

    it('should skip already completed repos from checkpoint', async () => {
      const repo1 = path.join(testDir, 'repo1');
      const repo2 = path.join(testDir, 'repo2');
      fs.mkdirSync(repo1);
      fs.mkdirSync(repo2);
      fs.writeFileSync(path.join(repo1, 'README.md'), '# Repo 1');
      fs.writeFileSync(path.join(repo2, 'README.md'), '# Repo 2');

      const repos = [
        { name: 'repo1', path: repo1 },
        { name: 'repo2', path: repo2 },
      ];

      const log = vi.fn();
      const onProgress = vi.fn();
      const results = await analyzeAllRepos(repos, null, onProgress, log, { reposCompleted: ['repo1'] });

      // Should only have repo2 since repo1 was skipped
      expect(results.size).toBe(1);
      expect(results.has('repo2')).toBe(true);
    });

    it('should include enterprise enhancements (v1.0.48)', async () => {
      const repo = path.join(testDir, 'repo-with-jsdoc');
      fs.mkdirSync(repo);
      fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({
        name: 'test-repo',
        dependencies: { express: '^4.0.0' },
      }));
      fs.writeFileSync(path.join(repo, 'index.ts'), `
/**
 * Creates a new user in the system.
 * @param {string} name - The user's name
 * @param {string} email - The user's email address
 * @returns {Promise<User>} The created user object
 * @example
 * const user = await createUser('John', 'john@example.com');
 */
export async function createUser(name: string, email: string): Promise<User> {
  return { name, email };
}
      `);

      const repos = [{ name: 'repo-with-jsdoc', path: repo }];
      const log = vi.fn();
      const onProgress = vi.fn();
      const results = await analyzeAllRepos(repos, null, onProgress, log);

      const analysis = results.get('repo-with-jsdoc');
      expect(analysis).toBeDefined();

      // Should have JSDoc entries
      expect(analysis!.jsdocEntries).toBeDefined();
      expect(analysis!.jsdocEntries!.length).toBeGreaterThan(0);

      const createUserEntry = analysis!.jsdocEntries!.find(e => e.name === 'createUser');
      expect(createUserEntry).toBeDefined();
      expect(createUserEntry!.description).toContain('Creates a new user');
      expect(createUserEntry!.params).toHaveLength(2);
      expect(createUserEntry!.exported).toBe(true);

      // Should have code health
      expect(analysis!.codeHealth).toBeDefined();
      expect(analysis!.codeHealth!.linesOfCode).toBeGreaterThan(0);

      // Should have dependency audit
      expect(analysis!.dependencyAudit).toBeDefined();
      expect(analysis!.dependencyAudit!.directDependencies).toBe(1);
    });
  });

  describe('API extraction from entry points', () => {
    it('should extract exports from index.ts entry point', async () => {
      // Basic API extraction requires index.ts (entry point pattern)
      fs.writeFileSync(path.join(testDir, 'index.ts'), `
/**
 * Add two numbers.
 * @param {number} a - First number
 * @param {number} b - Second number
 */
export function add(a: number, b: number) {
  return a + b;
}

export function subtract(a: number, b: number) {
  return a - b;
}
      `);

      const log = vi.fn();
      const analysis = await analyzeRepo(testDir, 'math-lib', null, log);

      // index.ts is an entry point, so exports should be detected
      expect(analysis.mainApis.some(a => a.name === 'add')).toBe(true);
      expect(analysis.mainApis.some(a => a.name === 'subtract')).toBe(true);
    });

    it('should extract class exports from entry point', async () => {
      fs.writeFileSync(path.join(testDir, 'index.ts'), `
/**
 * User service for managing users.
 */
export class UserService {
  /**
   * Find a user by email.
   */
  findByEmail(email: string) {}
}

export class AuthService {
  login() {}
}
      `);

      const log = vi.fn();
      const analysis = await analyzeRepo(testDir, 'services', null, log);

      const classApi = analysis.mainApis.find(a => a.name === 'UserService');
      expect(classApi).toBeDefined();
      expect(classApi!.type).toBe('class');

      const authApi = analysis.mainApis.find(a => a.name === 'AuthService');
      expect(authApi).toBeDefined();
    });

    it('should not extract from non-entry files (no index.ts)', async () => {
      // Files that don't match entry point patterns are NOT scanned for APIs
      fs.writeFileSync(path.join(testDir, 'utils.ts'), `
export function helper() {}
      `);

      const log = vi.fn();
      const analysis = await analyzeRepo(testDir, 'utils-only', null, log);

      // utils.ts is not an entry point, so no APIs extracted
      expect(analysis.mainApis.length).toBe(0);
    });
  });
});
