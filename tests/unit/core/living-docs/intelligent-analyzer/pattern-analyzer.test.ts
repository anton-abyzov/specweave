/**
 * Pattern Analyzer Unit Tests
 *
 * Tests for PatternAnalyzer class that detects architectural patterns
 * and framework choices from codebase analysis.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PatternAnalyzer } from '../../../../../src/core/living-docs/intelligent-analyzer/pattern-analyzer.js';
import type { RepoInfo } from '../../../../../src/core/living-docs/intelligent-analyzer/repo-scanner.js';

function makeRepoInfo(repoPath: string, overrides: Partial<RepoInfo> = {}): RepoInfo {
  return {
    path: repoPath,
    name: path.basename(repoPath),
    type: 'backend',
    techStack: { primary: 'typescript' },
    fileCount: 0,
    lineCount: 0,
    languages: [],
    lastCommit: 'abc123',
    branch: 'main',
    ...overrides,
  };
}

describe('PatternAnalyzer', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pattern-analyzer-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should accept an array of repos', () => {
      const repos = [makeRepoInfo(testDir)];
      const analyzer = new PatternAnalyzer(repos);
      expect(analyzer).toBeInstanceOf(PatternAnalyzer);
    });

    it('should accept an empty array', () => {
      const analyzer = new PatternAnalyzer([]);
      expect(analyzer).toBeInstanceOf(PatternAnalyzer);
    });
  });

  describe('analyzeAll', () => {
    it('should return empty patterns and inconsistencies for empty repos', async () => {
      const analyzer = new PatternAnalyzer([]);
      const result = await analyzer.analyzeAll();

      expect(result.patterns).toEqual([]);
      expect(result.inconsistencies).toEqual([]);
    });

    it('should analyze patterns across all repos', async () => {
      const repoPath = path.join(testDir, 'app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({
          dependencies: { express: '^4.0.0', jsonwebtoken: '^9.0.0' },
          devDependencies: { vitest: '^1.0.0' },
        })
      );

      const repos = [makeRepoInfo(repoPath)];
      const analyzer = new PatternAnalyzer(repos);
      const result = await analyzer.analyzeAll();

      expect(result.patterns.length).toBeGreaterThan(0);
      const categories = result.patterns.map(p => p.category);
      expect(categories).toContain('api-style');
      expect(categories).toContain('auth');
      expect(categories).toContain('testing');
    });

    it('should aggregate patterns from multiple repos', async () => {
      const repo1 = path.join(testDir, 'repo1');
      const repo2 = path.join(testDir, 'repo2');
      fs.mkdirSync(repo1, { recursive: true });
      fs.mkdirSync(repo2, { recursive: true });
      fs.writeFileSync(
        path.join(repo1, 'package.json'),
        JSON.stringify({ dependencies: { express: '^4.0.0' } })
      );
      fs.writeFileSync(
        path.join(repo2, 'package.json'),
        JSON.stringify({ dependencies: { graphql: '^16.0.0' } })
      );

      const repos = [makeRepoInfo(repo1), makeRepoInfo(repo2)];
      const analyzer = new PatternAnalyzer(repos);
      const result = await analyzer.analyzeAll();

      const names = result.patterns.map(p => p.name);
      expect(names).toContain('REST API');
      expect(names).toContain('GraphQL');
    });
  });

  describe('detectStateManagement', () => {
    it('should detect Redux via package.json dependencies', async () => {
      const repoPath = path.join(testDir, 'redux-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { redux: '^4.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectStateManagement(repo);

      expect(patterns.length).toBeGreaterThan(0);
      const redux = patterns.find(p => p.name === 'Redux');
      expect(redux).toBeDefined();
      expect(redux!.category).toBe('state-management');
      expect(redux!.decision).toContain('Redux');
    });

    it('should detect Redux via @reduxjs/toolkit', async () => {
      const repoPath = path.join(testDir, 'rtk-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { '@reduxjs/toolkit': '^1.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectStateManagement(repo);

      const redux = patterns.find(p => p.name === 'Redux');
      expect(redux).toBeDefined();
    });

    it('should detect Redux via store directory', async () => {
      const repoPath = path.join(testDir, 'store-app');
      fs.mkdirSync(path.join(repoPath, 'src', 'store'), { recursive: true });
      // No package.json with redux dep, but store dir exists
      // Should not detect without package.json redux dep
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: {} })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectStateManagement(repo);

      // Store directory alone triggers evidence, but without redux dep in package.json,
      // the evidence only comes from the store directory
      const redux = patterns.find(p => p.name === 'Redux');
      expect(redux).toBeDefined();
      expect(redux!.evidence.some(e => e.reason.includes('store directory'))).toBe(true);
    });

    it('should compute confidence for Redux based on usage count', async () => {
      const repoPath = path.join(testDir, 'redux-usage');
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { redux: '^4.0.0' } })
      );
      // Create component files using Redux hooks
      fs.writeFileSync(
        path.join(repoPath, 'src', 'App.tsx'),
        'const x = useSelector(state => state.user); useDispatch();'
      );
      fs.writeFileSync(
        path.join(repoPath, 'src', 'Home.tsx'),
        'const y = useSelector(state => state.items);'
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectStateManagement(repo);

      const redux = patterns.find(p => p.name === 'Redux');
      expect(redux).toBeDefined();
      expect(redux!.confidence).toBeGreaterThan(0);
    });

    it('should return 0 confidence when no component files exist', async () => {
      const repoPath = path.join(testDir, 'redux-no-components');
      fs.mkdirSync(repoPath, { recursive: true });
      // Only has package.json with redux, but no tsx/jsx/ts/js files
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { redux: '^4.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectStateManagement(repo);

      const redux = patterns.find(p => p.name === 'Redux');
      expect(redux).toBeDefined();
      // confidence should be 0 because countFiles returns 0
      // Actually package.json is not matched by /\.(tsx?|jsx?)$/ pattern
      // but countPatternUsage walks .tsx? and .jsx? files only
      expect(redux!.confidence).toBe(0);
    });

    it('should return empty for Context API (simplified implementation)', async () => {
      const repoPath = path.join(testDir, 'context-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectStateManagement(repo);

      // Context API evidence always returns [] in current implementation
      const context = patterns.find(p => p.name === 'Context API');
      expect(context).toBeUndefined();
    });

    it('should detect MobX from package.json', async () => {
      const repoPath = path.join(testDir, 'mobx-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { mobx: '^6.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectStateManagement(repo);

      const mobx = patterns.find(p => p.name === 'MobX');
      expect(mobx).toBeDefined();
      expect(mobx!.confidence).toBe(50);
      expect(mobx!.category).toBe('state-management');
    });

    it('should detect Zustand from package.json', async () => {
      const repoPath = path.join(testDir, 'zustand-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { zustand: '^4.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectStateManagement(repo);

      const zustand = patterns.find(p => p.name === 'Zustand');
      expect(zustand).toBeDefined();
      expect(zustand!.confidence).toBe(50);
    });

    it('should not detect MobX when not in dependencies', async () => {
      const repoPath = path.join(testDir, 'no-mobx');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectStateManagement(repo);

      const mobx = patterns.find(p => p.name === 'MobX');
      expect(mobx).toBeUndefined();
    });

    it('should detect multiple state management libraries simultaneously', async () => {
      const repoPath = path.join(testDir, 'multi-state');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({
          dependencies: { redux: '^4.0.0', mobx: '^6.0.0', zustand: '^4.0.0' },
        })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectStateManagement(repo);

      const names = patterns.map(p => p.name);
      expect(names).toContain('Redux');
      expect(names).toContain('MobX');
      expect(names).toContain('Zustand');
    });

    it('should return empty when no package.json exists', async () => {
      const repoPath = path.join(testDir, 'no-pkg');
      fs.mkdirSync(repoPath, { recursive: true });

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectStateManagement(repo);

      expect(patterns).toEqual([]);
    });
  });

  describe('detectAPIStyle', () => {
    it('should detect REST API via Express', async () => {
      const repoPath = path.join(testDir, 'express-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { express: '^4.18.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectAPIStyle(repo);

      const rest = patterns.find(p => p.name === 'REST API');
      expect(rest).toBeDefined();
      expect(rest!.confidence).toBe(80);
      expect(rest!.category).toBe('api-style');
    });

    it('should detect REST API via Fastify', async () => {
      const repoPath = path.join(testDir, 'fastify-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { fastify: '^4.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectAPIStyle(repo);

      const rest = patterns.find(p => p.name === 'REST API');
      expect(rest).toBeDefined();
    });

    it('should detect GraphQL via graphql package', async () => {
      const repoPath = path.join(testDir, 'gql-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { graphql: '^16.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectAPIStyle(repo);

      const gql = patterns.find(p => p.name === 'GraphQL');
      expect(gql).toBeDefined();
      expect(gql!.confidence).toBe(70);
    });

    it('should detect GraphQL via apollo-server', async () => {
      const repoPath = path.join(testDir, 'apollo-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { 'apollo-server': '^3.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectAPIStyle(repo);

      const gql = patterns.find(p => p.name === 'GraphQL');
      expect(gql).toBeDefined();
    });

    it('should detect both REST and GraphQL', async () => {
      const repoPath = path.join(testDir, 'rest-gql');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({
          dependencies: { express: '^4.0.0', graphql: '^16.0.0' },
        })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectAPIStyle(repo);

      expect(patterns.length).toBe(2);
    });

    it('should return empty when no API framework found', async () => {
      const repoPath = path.join(testDir, 'no-api');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { lodash: '^4.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectAPIStyle(repo);

      expect(patterns).toEqual([]);
    });
  });

  describe('detectAuthStrategy', () => {
    it('should detect JWT via jsonwebtoken', async () => {
      const repoPath = path.join(testDir, 'jwt-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { jsonwebtoken: '^9.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectAuthStrategy(repo);

      const jwt = patterns.find(p => p.name === 'JWT');
      expect(jwt).toBeDefined();
      expect(jwt!.confidence).toBe(90);
      expect(jwt!.category).toBe('auth');
    });

    it('should detect OAuth via passport', async () => {
      const repoPath = path.join(testDir, 'passport-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { passport: '^0.6.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectAuthStrategy(repo);

      const oauth = patterns.find(p => p.name === 'OAuth/SSO');
      expect(oauth).toBeDefined();
      expect(oauth!.confidence).toBe(80);
    });

    it('should detect OAuth via next-auth', async () => {
      const repoPath = path.join(testDir, 'nextauth-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { 'next-auth': '^4.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectAuthStrategy(repo);

      const oauth = patterns.find(p => p.name === 'OAuth/SSO');
      expect(oauth).toBeDefined();
    });

    it('should detect both JWT and OAuth', async () => {
      const repoPath = path.join(testDir, 'both-auth');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({
          dependencies: { jsonwebtoken: '^9.0.0', passport: '^0.6.0' },
        })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectAuthStrategy(repo);

      expect(patterns.length).toBe(2);
    });

    it('should return empty when no auth packages found', async () => {
      const repoPath = path.join(testDir, 'no-auth');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectAuthStrategy(repo);

      expect(patterns).toEqual([]);
    });
  });

  describe('detectDatabaseAccess', () => {
    it('should detect Prisma via schema file', async () => {
      const repoPath = path.join(testDir, 'prisma-app');
      fs.mkdirSync(path.join(repoPath, 'prisma'), { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'prisma', 'schema.prisma'),
        'model User { id Int @id }'
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectDatabaseAccess(repo);

      const prisma = patterns.find(p => p.name === 'Prisma ORM');
      expect(prisma).toBeDefined();
      expect(prisma!.confidence).toBe(95);
      expect(prisma!.category).toBe('database');
    });

    it('should detect TypeORM from package.json', async () => {
      const repoPath = path.join(testDir, 'typeorm-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { typeorm: '^0.3.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectDatabaseAccess(repo);

      const typeorm = patterns.find(p => p.name === 'TypeORM');
      expect(typeorm).toBeDefined();
      expect(typeorm!.confidence).toBe(90);
    });

    it('should detect both Prisma and TypeORM', async () => {
      const repoPath = path.join(testDir, 'dual-orm');
      fs.mkdirSync(path.join(repoPath, 'prisma'), { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'prisma', 'schema.prisma'),
        'model User { id Int @id }'
      );
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { typeorm: '^0.3.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectDatabaseAccess(repo);

      expect(patterns.length).toBe(2);
    });

    it('should return empty when no ORM found', async () => {
      const repoPath = path.join(testDir, 'no-orm');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: {} })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectDatabaseAccess(repo);

      expect(patterns).toEqual([]);
    });
  });

  describe('detectTestingApproach', () => {
    it('should detect Jest from devDependencies', async () => {
      const repoPath = path.join(testDir, 'jest-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ devDependencies: { jest: '^29.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectTestingApproach(repo);

      const jest = patterns.find(p => p.name === 'Jest');
      expect(jest).toBeDefined();
      expect(jest!.confidence).toBe(85);
      expect(jest!.category).toBe('testing');
    });

    it('should detect Vitest from devDependencies', async () => {
      const repoPath = path.join(testDir, 'vitest-app');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ devDependencies: { vitest: '^1.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectTestingApproach(repo);

      const vitest = patterns.find(p => p.name === 'Vitest');
      expect(vitest).toBeDefined();
      expect(vitest!.confidence).toBe(85);
    });

    it('should not detect Jest from dependencies (only devDependencies)', async () => {
      const repoPath = path.join(testDir, 'jest-wrong');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { jest: '^29.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectTestingApproach(repo);

      const jest = patterns.find(p => p.name === 'Jest');
      expect(jest).toBeUndefined();
    });

    it('should detect both Jest and Vitest', async () => {
      const repoPath = path.join(testDir, 'dual-test');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ devDependencies: { jest: '^29.0.0', vitest: '^1.0.0' } })
      );

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectTestingApproach(repo);

      expect(patterns.length).toBe(2);
    });

    it('should return empty when no package.json', async () => {
      const repoPath = path.join(testDir, 'no-test-pkg');
      fs.mkdirSync(repoPath, { recursive: true });

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectTestingApproach(repo);

      expect(patterns).toEqual([]);
    });
  });

  describe('detectInconsistencies', () => {
    it('should detect TS/JS mix when both are significant', async () => {
      const repoPath = path.join(testDir, 'mixed-repo');
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });

      // Create significant mix: 50% TS, 50% JS
      for (let i = 0; i < 5; i++) {
        fs.writeFileSync(path.join(repoPath, 'src', `file${i}.ts`), `export const x${i} = 1;`);
        fs.writeFileSync(path.join(repoPath, 'src', `file${i}.js`), `module.exports = {};`);
      }

      const repos = [makeRepoInfo(repoPath)];
      const analyzer = new PatternAnalyzer(repos);
      const inconsistencies = await analyzer.detectInconsistencies();

      expect(inconsistencies.length).toBe(1);
      expect(inconsistencies[0].type).toBe('mixed-patterns');
      expect(inconsistencies[0].severity).toBe('P2');
      expect(inconsistencies[0].description).toContain('TypeScript');
      expect(inconsistencies[0].description).toContain('JavaScript');
    });

    it('should not flag when one language dominates (>80%)', async () => {
      const repoPath = path.join(testDir, 'ts-dominant');
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });

      // 9 TS files vs 1 JS file: 90% TS, 10% JS - threshold is 20%
      for (let i = 0; i < 9; i++) {
        fs.writeFileSync(path.join(repoPath, 'src', `file${i}.ts`), `export const x${i} = 1;`);
      }
      fs.writeFileSync(path.join(repoPath, 'src', 'legacy.js'), 'module.exports = {};');

      const repos = [makeRepoInfo(repoPath)];
      const analyzer = new PatternAnalyzer(repos);
      const inconsistencies = await analyzer.detectInconsistencies();

      expect(inconsistencies).toEqual([]);
    });

    it('should not flag pure TypeScript repos', async () => {
      const repoPath = path.join(testDir, 'pure-ts');
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });

      for (let i = 0; i < 5; i++) {
        fs.writeFileSync(path.join(repoPath, 'src', `file${i}.ts`), `export const x${i} = 1;`);
      }

      const repos = [makeRepoInfo(repoPath)];
      const analyzer = new PatternAnalyzer(repos);
      const inconsistencies = await analyzer.detectInconsistencies();

      expect(inconsistencies).toEqual([]);
    });

    it('should not flag empty repos', async () => {
      const repoPath = path.join(testDir, 'empty-repo');
      fs.mkdirSync(repoPath, { recursive: true });

      const repos = [makeRepoInfo(repoPath)];
      const analyzer = new PatternAnalyzer(repos);
      const inconsistencies = await analyzer.detectInconsistencies();

      expect(inconsistencies).toEqual([]);
    });

    it('should check all repos for inconsistencies', async () => {
      const repo1 = path.join(testDir, 'repo1');
      const repo2 = path.join(testDir, 'repo2');
      fs.mkdirSync(path.join(repo1, 'src'), { recursive: true });
      fs.mkdirSync(path.join(repo2, 'src'), { recursive: true });

      // Both repos have a significant mix
      for (let i = 0; i < 3; i++) {
        fs.writeFileSync(path.join(repo1, 'src', `f${i}.ts`), '');
        fs.writeFileSync(path.join(repo1, 'src', `f${i}.js`), '');
        fs.writeFileSync(path.join(repo2, 'src', `f${i}.ts`), '');
        fs.writeFileSync(path.join(repo2, 'src', `f${i}.js`), '');
      }

      const repos = [makeRepoInfo(repo1), makeRepoInfo(repo2)];
      const analyzer = new PatternAnalyzer(repos);
      const inconsistencies = await analyzer.detectInconsistencies();

      expect(inconsistencies.length).toBe(2);
    });

    it('should exclude node_modules from file counts', async () => {
      const repoPath = path.join(testDir, 'nm-repo');
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
      fs.mkdirSync(path.join(repoPath, 'node_modules', 'some-dep'), { recursive: true });

      // Only TS in src
      fs.writeFileSync(path.join(repoPath, 'src', 'app.ts'), 'export default {};');
      // JS in node_modules (should be excluded)
      for (let i = 0; i < 100; i++) {
        fs.writeFileSync(path.join(repoPath, 'node_modules', 'some-dep', `file${i}.js`), '');
      }

      const repos = [makeRepoInfo(repoPath)];
      const analyzer = new PatternAnalyzer(repos);
      const inconsistencies = await analyzer.detectInconsistencies();

      // node_modules excluded, so pure TS => no inconsistency
      expect(inconsistencies).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle malformed package.json gracefully', async () => {
      const repoPath = path.join(testDir, 'bad-pkg');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(path.join(repoPath, 'package.json'), 'not valid json{{{');

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);

      // Should throw because JSON.parse fails in helper methods
      await expect(analyzer.detectAPIStyle(repo)).rejects.toThrow();
    });

    it('should handle missing package.json for all detection methods', async () => {
      const repoPath = path.join(testDir, 'no-pkg-all');
      fs.mkdirSync(repoPath, { recursive: true });

      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);

      expect(await analyzer.detectAPIStyle(repo)).toEqual([]);
      expect(await analyzer.detectAuthStrategy(repo)).toEqual([]);
      expect(await analyzer.detectDatabaseAccess(repo)).toEqual([]);
      expect(await analyzer.detectTestingApproach(repo)).toEqual([]);
    });

    it('should handle permission errors in countFiles gracefully', async () => {
      const repoPath = path.join(testDir, 'perm-error');
      fs.mkdirSync(repoPath, { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ dependencies: { redux: '^4.0.0' } })
      );

      // The countFiles method has try/catch for permission errors
      const repo = makeRepoInfo(repoPath);
      const analyzer = new PatternAnalyzer([repo]);
      const patterns = await analyzer.detectStateManagement(repo);

      // Should succeed even if walking fails
      expect(patterns).toBeDefined();
    });
  });
});
