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
  });
});
