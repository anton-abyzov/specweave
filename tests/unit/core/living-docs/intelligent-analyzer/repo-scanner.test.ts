/**
 * Repo Scanner Unit Tests
 *
 * Tests for RepoScanner class that discovers and inventories repositories.
 * Detects repo type (frontend/backend/mobile/shared-lib) and extracts tech stack.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RepoScanner } from '../../../../../src/core/living-docs/intelligent-analyzer/repo-scanner.js';
import { PackageJsonCache } from '../../../../../src/utils/package-json-cache.js';
import type { Logger } from '../../../../../src/utils/logger.js';

const { mockExecSync } = vi.hoisted(() => ({
  mockExecSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

function createSilentLogger(): Logger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

describe('RepoScanner', () => {
  let testDir: string;
  let logger: Logger;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-scanner-test-'));
    logger = createSilentLogger();
    mockExecSync.mockReset();
    // Reset singleton between tests
    PackageJsonCache.resetInstance();
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    PackageJsonCache.resetInstance();
  });

  describe('constructor', () => {
    it('should create with project root', () => {
      const scanner = new RepoScanner(testDir);
      expect(scanner).toBeInstanceOf(RepoScanner);
    });

    it('should accept optional logger', () => {
      const scanner = new RepoScanner(testDir, logger);
      expect(scanner).toBeInstanceOf(RepoScanner);
    });
  });

  describe('detectRepoType', () => {
    it('should detect frontend repo with React', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('frontend');
    });

    it('should detect frontend repo with Vue', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { vue: '^3.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('frontend');
    });

    it('should detect frontend repo with Angular', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { '@angular/core': '^17.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('frontend');
    });

    it('should detect frontend repo with Svelte', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { svelte: '^4.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('frontend');
    });

    it('should detect mobile repo with React Native', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { 'react-native': '^0.72.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('mobile');
    });

    it('should detect mobile repo with Expo', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { expo: '^49.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('mobile');
    });

    it('should detect mobile repo with Ionic Angular', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { '@ionic/angular': '^7.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('mobile');
    });

    it('should detect backend repo with Express', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { express: '^4.18.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('backend');
    });

    it('should detect backend repo with Fastify', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { fastify: '^4.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('backend');
    });

    it('should detect backend repo with Koa', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { koa: '^2.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('backend');
    });

    it('should detect backend repo with NestJS', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { '@nestjs/core': '^10.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('backend');
    });

    it('should detect backend repo with go.mod', () => {
      fs.writeFileSync(path.join(testDir, 'go.mod'), 'module myapp\n\ngo 1.21');

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('backend');
    });

    it('should detect backend repo with Python Django', () => {
      fs.writeFileSync(
        path.join(testDir, 'requirements.txt'),
        'django==4.2\ncelery==5.3'
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('backend');
    });

    it('should detect backend repo with Python Flask', () => {
      fs.writeFileSync(
        path.join(testDir, 'requirements.txt'),
        'flask==3.0\n'
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('backend');
    });

    it('should detect backend repo with Python FastAPI', () => {
      fs.writeFileSync(
        path.join(testDir, 'requirements.txt'),
        'fastapi==0.104\nuvicorn==0.24'
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('backend');
    });

    it('should not detect backend for generic Python requirements', () => {
      fs.writeFileSync(
        path.join(testDir, 'requirements.txt'),
        'numpy==1.26\npandas==2.1'
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('unknown');
    });

    it('should detect infrastructure repo with Terraform files', () => {
      fs.writeFileSync(path.join(testDir, 'main.tf'), 'resource "aws_s3_bucket" "b" {}');

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('infrastructure');
    });

    it('should detect shared-lib with types folder and exports', () => {
      fs.mkdirSync(path.join(testDir, 'types'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ main: 'dist/index.js', exports: { '.': './dist/index.js' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('shared-lib');
    });

    it('should detect shared-lib with utils folder and main field', () => {
      fs.mkdirSync(path.join(testDir, 'utils'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ main: 'dist/index.js' })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('shared-lib');
    });

    it('should detect shared-lib with shared folder and exports', () => {
      fs.mkdirSync(path.join(testDir, 'shared'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ exports: { '.': './index.js' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('shared-lib');
    });

    it('should not detect shared-lib without main or exports', () => {
      fs.mkdirSync(path.join(testDir, 'types'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ name: 'types-only' })
      );

      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('unknown');
    });

    it('should return unknown when no indicators found', () => {
      // Empty directory
      const scanner = new RepoScanner(testDir, logger);
      expect(scanner.detectRepoType(testDir)).toBe('unknown');
    });

    it('should prioritize frontend over shared-lib', () => {
      fs.mkdirSync(path.join(testDir, 'types'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          main: 'dist/index.js',
          dependencies: { react: '^18.0.0' },
        })
      );

      const scanner = new RepoScanner(testDir, logger);
      // React is checked before shared-lib
      expect(scanner.detectRepoType(testDir)).toBe('frontend');
    });
  });

  describe('extractTechStack', () => {
    it('should detect TypeScript as primary language', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { typescript: '^5.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.primary).toBe('typescript');
    });

    it('should detect TypeScript via tsconfig.json', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: {} })
      );
      fs.writeFileSync(path.join(testDir, 'tsconfig.json'), '{}');

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.primary).toBe('typescript');
    });

    it('should detect JavaScript when no TypeScript', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { express: '^4.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.primary).toBe('javascript');
    });

    it('should detect Next.js framework', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '^14.0.0', typescript: '^5.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.framework).toBe('nextjs');
    });

    it('should detect NestJS framework', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { '@nestjs/core': '^10.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.framework).toBe('nestjs');
    });

    it('should detect Express framework', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { express: '^4.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.framework).toBe('express');
    });

    it('should detect Fastify framework', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { fastify: '^4.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.framework).toBe('fastify');
    });

    it('should detect React framework', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.framework).toBe('react');
    });

    it('should detect Vue framework', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { vue: '^3.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.framework).toBe('vue');
    });

    it('should detect Angular framework', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { '@angular/core': '^17.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.framework).toBe('angular');
    });

    it('should detect PostgreSQL database', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { pg: '^8.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.database).toBe('postgresql');
    });

    it('should detect MySQL database', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { mysql2: '^3.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.database).toBe('mysql');
    });

    it('should detect MongoDB database', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { mongodb: '^6.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.database).toBe('mongodb');
    });

    it('should detect Redis database', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { redis: '^4.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.database).toBe('redis');
    });

    it('should detect Prisma ORM', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { '@prisma/client': '^5.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.orm).toBe('prisma');
    });

    it('should detect TypeORM', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { typeorm: '^0.3.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.orm).toBe('typeorm');
    });

    it('should detect Sequelize ORM', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { sequelize: '^6.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.orm).toBe('sequelize');
    });

    it('should detect Mongoose ORM', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { mongoose: '^8.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.orm).toBe('mongoose');
    });

    it('should detect Jest testing framework', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ devDependencies: { jest: '^29.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.testing).toBe('jest');
    });

    it('should detect Vitest testing framework', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ devDependencies: { vitest: '^1.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.testing).toBe('vitest');
    });

    it('should detect Mocha testing framework', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ devDependencies: { mocha: '^10.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.testing).toBe('mocha');
    });

    it('should detect Playwright testing framework', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ devDependencies: { '@playwright/test': '^1.40.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.testing).toBe('playwright');
    });

    it('should detect Go tech stack from go.mod', async () => {
      fs.writeFileSync(
        path.join(testDir, 'go.mod'),
        'module myapp\n\ngo 1.21\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n\tgorm.io/gorm v1.25.0\n)'
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.primary).toBe('go');
      expect(stack.framework).toBe('gin');
      expect(stack.orm).toBe('gorm');
    });

    it('should detect Go with Gorilla Mux', async () => {
      fs.writeFileSync(
        path.join(testDir, 'go.mod'),
        'module myapp\n\ngo 1.21\n\nrequire (\n\tgithub.com/gorilla/mux v1.8.0\n)'
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.primary).toBe('go');
      expect(stack.framework).toBe('gorilla');
    });

    it('should detect Python tech stack from requirements.txt', async () => {
      fs.writeFileSync(
        path.join(testDir, 'requirements.txt'),
        'django==4.2\nsqlalchemy==2.0\npytest==7.4'
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.primary).toBe('python');
      expect(stack.framework).toBe('django');
      expect(stack.orm).toBe('sqlalchemy');
      expect(stack.testing).toBe('pytest');
    });

    it('should detect Python Flask', async () => {
      fs.writeFileSync(
        path.join(testDir, 'requirements.txt'),
        'flask==3.0'
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.primary).toBe('python');
      expect(stack.framework).toBe('flask');
    });

    it('should detect Python FastAPI', async () => {
      fs.writeFileSync(
        path.join(testDir, 'requirements.txt'),
        'fastapi==0.104'
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.primary).toBe('python');
      expect(stack.framework).toBe('fastapi');
    });

    it('should detect Rust from Cargo.toml', async () => {
      fs.writeFileSync(
        path.join(testDir, 'Cargo.toml'),
        '[package]\nname = "myapp"\nversion = "0.1.0"'
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.primary).toBe('rust');
    });

    it('should detect Java from pom.xml', async () => {
      fs.writeFileSync(
        path.join(testDir, 'pom.xml'),
        '<project><groupId>com.example</groupId></project>'
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.primary).toBe('java');
    });

    it('should detect Java from build.gradle', async () => {
      fs.writeFileSync(
        path.join(testDir, 'build.gradle'),
        "plugins { id 'java' }"
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.primary).toBe('java');
    });

    it('should return unknown when no config files found', async () => {
      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.primary).toBe('unknown');
    });

    it('should detect Postgres via postgres package name', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { postgres: '^3.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.database).toBe('postgresql');
    });

    it('should detect MySQL via mysql package', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { mysql: '^2.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.database).toBe('mysql');
    });

    it('should detect MongoDB via mongoose', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { mongoose: '^8.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.database).toBe('mongodb');
      expect(stack.orm).toBe('mongoose');
    });

    it('should detect Prisma ORM via prisma package', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { prisma: '^5.0.0' } })
      );

      const scanner = new RepoScanner(testDir, logger);
      const stack = await scanner.extractTechStack(testDir);

      expect(stack.orm).toBe('prisma');
    });
  });

  describe('scanRepo', () => {
    it('should return complete repo info', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { express: '^4.0.0', typescript: '^5.0.0' } })
      );
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), 'console.log("hello");');

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('rev-parse HEAD')) return 'abc123def456\n';
        if (cmd.includes('--abbrev-ref HEAD')) return 'main\n';
        return '';
      });

      const scanner = new RepoScanner(testDir, logger);
      const info = await scanner.scanRepo(testDir);

      expect(info.path).toBe(testDir);
      expect(info.name).toBe(path.basename(testDir));
      expect(info.type).toBe('backend');
      expect(info.techStack.primary).toBe('typescript');
      expect(info.techStack.framework).toBe('express');
      expect(info.fileCount).toBeGreaterThan(0);
      expect(info.lineCount).toBe(0); // Placeholder
      expect(info.lastCommit).toBe('abc123def456');
      expect(info.branch).toBe('main');
    });

    it('should handle git errors gracefully', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: {} })
      );

      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      const scanner = new RepoScanner(testDir, logger);
      const info = await scanner.scanRepo(testDir);

      expect(info.lastCommit).toBe('unknown');
      expect(info.branch).toBe('unknown');
    });

    it('should detect languages in the repo', async () => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'app.ts'), 'export default {};');
      fs.writeFileSync(path.join(testDir, 'src', 'utils.ts'), 'export const x = 1;');
      fs.writeFileSync(path.join(testDir, 'src', 'legacy.js'), 'module.exports = {};');

      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const info = await scanner.scanRepo(testDir);

      expect(info.languages.length).toBeGreaterThan(0);
      const ts = info.languages.find(l => l.language === 'TypeScript');
      expect(ts).toBeDefined();
      expect(ts!.fileCount).toBe(2);

      const js = info.languages.find(l => l.language === 'JavaScript');
      expect(js).toBeDefined();
      expect(js!.fileCount).toBe(1);
    });

    it('should exclude node_modules from file counts', async () => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'node_modules', 'dep'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'app.ts'), 'x');
      fs.writeFileSync(path.join(testDir, 'node_modules', 'dep', 'index.js'), 'y');

      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const info = await scanner.scanRepo(testDir);

      // Only src/app.ts should be counted (node_modules excluded)
      // package.json won't exist so fileCount should just be 1
      expect(info.fileCount).toBe(1);
    });

    it('should sort languages by file count descending', async () => {
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'a.ts'), '');
      fs.writeFileSync(path.join(testDir, 'src', 'b.ts'), '');
      fs.writeFileSync(path.join(testDir, 'src', 'c.ts'), '');
      fs.writeFileSync(path.join(testDir, 'src', 'd.js'), '');

      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const info = await scanner.scanRepo(testDir);

      if (info.languages.length >= 2) {
        expect(info.languages[0].fileCount).toBeGreaterThanOrEqual(info.languages[1].fileCount);
      }
    });
  });

  describe('scanAll', () => {
    it('should scan single repo when no config exists', async () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } })
      );

      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const repos = await scanner.scanAll();

      expect(repos.length).toBe(1);
      expect(repos[0].name).toBe(path.basename(testDir));
    });

    it('should scan umbrella repos from config', async () => {
      const repo1 = path.join(testDir, 'repos', 'api');
      const repo2 = path.join(testDir, 'repos', 'web');
      fs.mkdirSync(repo1, { recursive: true });
      fs.mkdirSync(repo2, { recursive: true });

      fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          umbrella: {
            childRepos: [
              { name: 'api', path: 'repos/api' },
              { name: 'web', path: 'repos/web' },
            ],
          },
        })
      );

      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const repos = await scanner.scanAll();

      expect(repos.length).toBe(2);
      expect(repos.map(r => r.name).sort()).toEqual(['api', 'web']);
    });

    it('should fallback to single repo if config is malformed', async () => {
      fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        'not valid json{{'
      );

      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const repos = await scanner.scanAll();

      expect(repos.length).toBe(1);
      expect((logger.warn as any)).toHaveBeenCalled();
    });

    it('should fallback to single repo if config has no umbrella', async () => {
      fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ projectName: 'my-project' })
      );

      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const repos = await scanner.scanAll();

      expect(repos.length).toBe(1);
    });
  });

  describe('language detection edge cases', () => {
    it('should detect Python files', async () => {
      fs.writeFileSync(path.join(testDir, 'app.py'), 'print("hello")');
      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const info = await scanner.scanRepo(testDir);

      const py = info.languages.find(l => l.language === 'Python');
      expect(py).toBeDefined();
    });

    it('should detect Go files', async () => {
      fs.writeFileSync(path.join(testDir, 'main.go'), 'package main');
      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const info = await scanner.scanRepo(testDir);

      const go = info.languages.find(l => l.language === 'Go');
      expect(go).toBeDefined();
    });

    it('should detect Rust files', async () => {
      fs.writeFileSync(path.join(testDir, 'main.rs'), 'fn main() {}');
      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const info = await scanner.scanRepo(testDir);

      const rs = info.languages.find(l => l.language === 'Rust');
      expect(rs).toBeDefined();
    });

    it('should detect Java files', async () => {
      fs.writeFileSync(path.join(testDir, 'Main.java'), 'public class Main {}');
      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const info = await scanner.scanRepo(testDir);

      const java = info.languages.find(l => l.language === 'Java');
      expect(java).toBeDefined();
    });

    it('should detect multiple languages with correct percentages', async () => {
      fs.writeFileSync(path.join(testDir, 'a.ts'), '');
      fs.writeFileSync(path.join(testDir, 'b.ts'), '');
      fs.writeFileSync(path.join(testDir, 'c.py'), '');
      fs.writeFileSync(path.join(testDir, 'd.go'), '');
      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const info = await scanner.scanRepo(testDir);

      const ts = info.languages.find(l => l.language === 'TypeScript');
      expect(ts).toBeDefined();
      expect(ts!.percentage).toBe(50); // 2/4

      const py = info.languages.find(l => l.language === 'Python');
      expect(py).toBeDefined();
      expect(py!.percentage).toBe(25); // 1/4
    });

    it('should ignore files with unknown extensions', async () => {
      fs.writeFileSync(path.join(testDir, 'readme.md'), '');
      fs.writeFileSync(path.join(testDir, 'config.yml'), '');
      fs.writeFileSync(path.join(testDir, 'image.png'), '');
      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const info = await scanner.scanRepo(testDir);

      expect(info.languages).toEqual([]);
    });

    it('should handle empty repo with no files', async () => {
      mockExecSync.mockImplementation(() => { throw new Error('no git'); });

      const scanner = new RepoScanner(testDir, logger);
      const info = await scanner.scanRepo(testDir);

      expect(info.languages).toEqual([]);
      expect(info.fileCount).toBe(0);
    });
  });
});
