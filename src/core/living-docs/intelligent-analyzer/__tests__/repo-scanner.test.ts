/**
 * Tests for RepoScanner
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RepoScanner } from '../repo-scanner.js';

describe('RepoScanner', () => {
  let tempDir: string;
  let scanner: RepoScanner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-scanner-test-'));
    scanner = new RepoScanner(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('detectRepoType', () => {
    it('should detect frontend repo (React)', () => {
      const packageJson = {
        dependencies: { react: '^18.0.0' },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const type = scanner.detectRepoType(tempDir);
      expect(type).toBe('frontend');
    });

    it('should detect backend repo (Express)', () => {
      const packageJson = {
        dependencies: { express: '^4.18.0' },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const type = scanner.detectRepoType(tempDir);
      expect(type).toBe('backend');
    });

    it('should detect mobile repo (React Native)', () => {
      const packageJson = {
        dependencies: { 'react-native': '^0.70.0' },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const type = scanner.detectRepoType(tempDir);
      expect(type).toBe('mobile');
    });

    it('should detect Go backend', () => {
      fs.writeFileSync(path.join(tempDir, 'go.mod'), 'module example.com/app\n');

      const type = scanner.detectRepoType(tempDir);
      expect(type).toBe('backend');
    });

    it('should detect infrastructure repo (Terraform)', () => {
      fs.writeFileSync(path.join(tempDir, 'main.tf'), 'resource "aws_instance" "example" {}');

      const type = scanner.detectRepoType(tempDir);
      expect(type).toBe('infrastructure');
    });

    it('should detect shared library', () => {
      fs.mkdirSync(path.join(tempDir, 'types'));
      const packageJson = {
        main: 'dist/index.js',
        dependencies: {},
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const type = scanner.detectRepoType(tempDir);
      expect(type).toBe('shared-lib');
    });
  });

  describe('extractTechStack', () => {
    it('should detect TypeScript + Next.js + Prisma stack', async () => {
      const packageJson = {
        dependencies: {
          next: '^14.0.0',
          '@prisma/client': '^5.0.0',
          react: '^18.0.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techStack = await scanner.extractTechStack(tempDir);

      expect(techStack.primary).toBe('typescript');
      expect(techStack.framework).toBe('nextjs');
      expect(techStack.orm).toBe('prisma');
      expect(techStack.testing).toBe('vitest');
    });

    it('should detect Python + Django stack', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'requirements.txt'),
        'django==4.2.0\nsqlalchemy==2.0.0\npytest==7.0.0\n'
      );

      const techStack = await scanner.extractTechStack(tempDir);

      expect(techStack.primary).toBe('python');
      expect(techStack.framework).toBe('django');
      expect(techStack.orm).toBe('sqlalchemy');
      expect(techStack.testing).toBe('pytest');
    });

    it('should detect Go + Gin stack', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'go.mod'),
        'module example.com/app\n\nrequire github.com/gin-gonic/gin v1.9.0\nrequire gorm.io/gorm v1.25.0\n'
      );

      const techStack = await scanner.extractTechStack(tempDir);

      expect(techStack.primary).toBe('go');
      expect(techStack.framework).toBe('gin');
      expect(techStack.orm).toBe('gorm');
    });
  });

  describe('scanRepo', () => {
    it('should scan repository and return complete info', async () => {
      // Create a simple TypeScript repo
      const packageJson = {
        dependencies: { express: '^4.18.0' },
        devDependencies: { typescript: '^5.0.0' },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson)
      );
      fs.writeFileSync(path.join(tempDir, 'index.ts'), 'console.log("hello");');

      const info = await scanner.scanRepo(tempDir);

      expect(info.name).toBeTruthy();
      expect(info.type).toBe('backend');
      expect(info.techStack.primary).toBe('typescript');
      expect(info.techStack.framework).toBe('express');
      expect(info.fileCount).toBeGreaterThan(0);
    });
  });
});
