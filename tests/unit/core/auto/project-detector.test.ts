/**
 * Unit tests for project-detector.ts
 * Tests all project type detection logic with fixtures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  detectProjectType,
  getProjectTypeDescription,
  ProjectType,
} from '../../../../src/core/auto/project-detector.js';

// Mock fs module
vi.mock('fs');

describe('project-detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper to mock a project structure
   */
  function mockProject(config: {
    files?: string[];
    directories?: string[];
    packageJson?: any;
  }) {
    const { files = [], directories = [], packageJson = null } = config;

    vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
      const pathStr = String(filePath);
      const basename = path.basename(pathStr);

      // Check files
      if (files.includes(basename)) return true;

      // Check directories
      const dirMatch = directories.find((dir) => pathStr.includes(dir));
      if (dirMatch) return true;

      // Check package.json
      if (basename === 'package.json' && packageJson) return true;

      return false;
    });

    vi.mocked(fs.statSync).mockImplementation((filePath: any) => {
      const pathStr = String(filePath);
      const isDir = directories.some((dir) => pathStr.includes(dir));

      return {
        isDirectory: () => isDir,
      } as any;
    });

    vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
      const pathStr = String(filePath);
      if (pathStr.includes('package.json') && packageJson) {
        return JSON.stringify(packageJson);
      }
      return '';
    });
  }

  describe('Web Frontend Detection', () => {
    it('should detect web-frontend with Playwright config', () => {
      mockProject({
        files: ['playwright.config.ts', 'package.json'],
        packageJson: {
          dependencies: { react: '^18.0.0' },
          devDependencies: { '@playwright/test': '^1.40.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('web-frontend');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.frameworks).toContain('React');
      expect(result.testFrameworks).toContain('Playwright');
      expect(result.mandatoryConditions).toContain('e2e');
      expect(result.mandatoryConditions).toContain('e2e-coverage');
    });

    it('should detect web-frontend with Next.js', () => {
      mockProject({
        files: ['next.config.js', 'package.json'],
        directories: ['src/pages'],
        packageJson: {
          dependencies: { next: '^14.0.0', react: '^18.0.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('web-frontend');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.frameworks).toContain('Next.js');
      expect(result.frameworks).toContain('React');
    });

    it('should detect web-frontend with Vite + Vue', () => {
      mockProject({
        files: ['vite.config.ts', 'package.json'],
        directories: ['src/app'],
        packageJson: {
          dependencies: { vue: '^3.0.0' },
          devDependencies: { vite: '^5.0.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('web-frontend');
      expect(result.frameworks).toContain('Vue');
    });

    it('should detect web-frontend with Cypress', () => {
      mockProject({
        files: ['cypress.config.ts', 'package.json'],
        packageJson: {
          dependencies: { '@angular/core': '^17.0.0' },
          devDependencies: { cypress: '^13.0.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('web-frontend');
      expect(result.testFrameworks).toContain('Cypress');
      expect(result.frameworks).toContain('Angular');
    });
  });

  describe('Mobile Native Detection', () => {
    it('should detect mobile-native with Detox', () => {
      mockProject({
        files: ['.detoxrc.js', 'package.json'],
        directories: ['android/app', 'ios'],
        packageJson: {
          dependencies: { 'react-native': '^0.73.0' },
          devDependencies: { detox: '^20.0.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('mobile-native');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.frameworks).toContain('React Native');
      expect(result.testFrameworks).toContain('Detox');
      expect(result.mandatoryConditions).toContain('e2e');
    });

    it('should detect mobile-native with Maestro', () => {
      mockProject({
        files: ['maestro.yaml', 'package.json', 'app.json'],
        packageJson: {
          dependencies: { 'react-native': '^0.73.0', expo: '^50.0.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('mobile-native');
      expect(result.testFrameworks).toContain('Maestro');
      expect(result.frameworks).toContain('React Native');
      expect(result.frameworks).toContain('Expo');
    });

    it('should detect mobile-native with Flutter', () => {
      mockProject({
        files: ['pubspec.yaml'],
        directories: ['android/app', 'ios'],
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('mobile-native');
    });
  });

  describe('Backend API Detection', () => {
    it('should detect backend-api with OpenAPI + Express', () => {
      mockProject({
        files: ['openapi.yaml', 'package.json'],
        directories: ['src/routes', 'src/controllers'],
        packageJson: {
          dependencies: { express: '^4.18.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('backend-api');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.frameworks).toContain('Express');
      expect(result.mandatoryConditions).toContain('integration');
      expect(result.mandatoryConditions).toContain('coverage');
    });

    it('should detect backend-api with NestJS', () => {
      mockProject({
        files: ['swagger.yml', 'package.json'],
        directories: ['src/controllers'],
        packageJson: {
          dependencies: { '@nestjs/core': '^10.0.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('backend-api');
      expect(result.frameworks).toContain('NestJS');
    });

    it('should detect backend-api with Fastify', () => {
      mockProject({
        files: ['package.json'],
        directories: ['routes', 'controllers'],
        packageJson: {
          dependencies: { fastify: '^4.0.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('backend-api');
      expect(result.frameworks).toContain('Fastify');
    });
  });

  describe('Desktop App Detection', () => {
    it('should detect desktop-app with Electron', () => {
      mockProject({
        files: ['electron-builder.yml', 'package.json'],
        packageJson: {
          dependencies: { electron: '^28.0.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('desktop-app');
      expect(result.frameworks).toContain('Electron');
      expect(result.mandatoryConditions).toContain('e2e');
    });

    it('should detect desktop-app with Tauri', () => {
      mockProject({
        files: ['tauri.conf.json', 'package.json'],
        packageJson: {
          dependencies: { '@tauri-apps/api': '^1.5.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('desktop-app');
      expect(result.frameworks).toContain('Tauri');
    });
  });

  describe('Library Detection', () => {
    it('should detect library with main field', () => {
      mockProject({
        files: ['package.json'],
        directories: ['lib'],
        packageJson: {
          main: 'dist/index.js',
          dependencies: {},
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('library');
      expect(result.mandatoryConditions).toContain('tests');
      expect(result.mandatoryConditions).toContain('coverage');
      expect(result.mandatoryConditions).toContain('types');
    });

    it('should detect library with exports field', () => {
      mockProject({
        files: ['package.json', 'src/index.ts'],
        packageJson: {
          exports: {
            '.': './dist/index.js',
          },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('library');
    });

    it('should not detect library if pages directory exists', () => {
      mockProject({
        files: ['package.json'],
        directories: ['pages', 'lib'],
        packageJson: {
          main: 'dist/index.js',
        },
      });

      const result = detectProjectType('/test-project');

      // Should not be library due to pages directory (web project indicator)
      expect(result.type).not.toBe('library');
    });
  });

  describe('CLI Tool Detection', () => {
    it('should detect cli-tool with bin field', () => {
      mockProject({
        files: ['package.json'],
        packageJson: {
          bin: {
            'my-cli': './bin/cli.js',
          },
          dependencies: {
            commander: '^11.0.0',
            chalk: '^5.0.0',
          },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('cli-tool');
      expect(result.mandatoryConditions).toContain('tests');
    });

    it('should detect cli-tool with yargs', () => {
      mockProject({
        files: ['package.json'],
        packageJson: {
          bin: './cli.js',
          dependencies: {
            yargs: '^17.0.0',
            inquirer: '^9.0.0',
            ora: '^7.0.0',
          },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('cli-tool');
    });
  });

  describe('Multi-Factor Validation', () => {
    it('should fallback to generic with low confidence', () => {
      mockProject({
        files: ['package.json'],
        packageJson: {
          dependencies: { react: '^18.0.0' },
        },
      });

      const result = detectProjectType('/test-project');

      // Only one weak indicator (react dependency = 0.5 weight)
      expect(result.type).toBe('generic');
      expect(result.confidence).toBe(0);
    });

    it('should fallback to generic with single indicator', () => {
      mockProject({
        files: ['vite.config.ts', 'package.json'],
        packageJson: {},
      });

      const result = detectProjectType('/test-project');

      // Only one indicator, should require 2+
      expect(result.type).toBe('generic');
    });

    it('should succeed with multiple weak indicators', () => {
      mockProject({
        files: ['vite.config.ts', 'package.json'],
        directories: ['src/pages'],
        packageJson: {
          dependencies: { react: '^18.0.0' },
        },
      });

      const result = detectProjectType('/test-project');

      // Multiple indicators: vite (0.7) + pages (0.6) + react (0.5) = 1.8/2.8 = 0.64
      // But pages + react = 2 indicators, confidence may vary
      expect(result.indicators.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Framework Detection', () => {
    it('should detect multiple frameworks', () => {
      mockProject({
        files: ['package.json'],
        packageJson: {
          dependencies: {
            react: '^18.0.0',
            next: '^14.0.0',
            express: '^4.18.0',
          },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.frameworks).toContain('React');
      expect(result.frameworks).toContain('Next.js');
      expect(result.frameworks).toContain('Express');
    });

    it('should detect test frameworks from config files', () => {
      mockProject({
        files: ['jest.config.js', 'playwright.config.ts', 'package.json'],
        packageJson: {
          devDependencies: {
            jest: '^29.0.0',
            '@playwright/test': '^1.40.0',
            vitest: '^1.0.0',
          },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.testFrameworks).toContain('Jest');
      expect(result.testFrameworks).toContain('Playwright');
      expect(result.testFrameworks).toContain('Vitest');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing package.json', () => {
      mockProject({
        files: ['playwright.config.ts'],
      });

      const result = detectProjectType('/test-project');

      // Should still detect based on config file
      expect(result.type).not.toBe('generic');
    });

    it('should handle invalid package.json', () => {
      // Mock only package.json exists (invalid content), no other files
      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        return pathStr.includes('package.json');
      });
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result = detectProjectType('/test-project');

      // Should not crash, fallback to generic (no valid indicators found)
      expect(result.type).toBe('generic');
    });

    it('should handle ambiguous project (Next.js fullstack)', () => {
      mockProject({
        files: ['next.config.js', 'openapi.yaml', 'package.json'],
        directories: ['pages', 'api/routes'],
        packageJson: {
          dependencies: {
            next: '^14.0.0',
            react: '^18.0.0',
          },
        },
      });

      const result = detectProjectType('/test-project');

      // Should prefer web-frontend (higher weight from next.config + pages)
      expect(result.type).toBe('web-frontend');
    });
  });

  describe('Performance', () => {
    it('should complete detection in <100ms', () => {
      mockProject({
        files: ['playwright.config.ts', 'package.json'],
        packageJson: {
          dependencies: { react: '^18.0.0' },
        },
      });

      const start = Date.now();
      detectProjectType('/test-project');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('getProjectTypeDescription', () => {
    it('should return correct descriptions', () => {
      expect(getProjectTypeDescription('web-frontend')).toContain('Web frontend');
      expect(getProjectTypeDescription('mobile-native')).toContain('Mobile native');
      expect(getProjectTypeDescription('backend-api')).toContain('Backend API');
      expect(getProjectTypeDescription('library')).toContain('Library');
      expect(getProjectTypeDescription('cli-tool')).toContain('Command-line');
      expect(getProjectTypeDescription('desktop-app')).toContain('Desktop');
      expect(getProjectTypeDescription('generic')).toContain('Generic');
    });
  });

  describe('Mandatory Conditions by Type', () => {
    it('web-frontend should require e2e and e2e-coverage', () => {
      mockProject({
        files: ['playwright.config.ts', 'package.json'],
        packageJson: {
          dependencies: { react: '^18.0.0' },
          devDependencies: { '@playwright/test': '^1.40.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.mandatoryConditions).toEqual([
        'build',
        'tests',
        'e2e',
        'e2e-coverage',
        'types',
      ]);
    });

    it('backend-api should require integration and coverage', () => {
      mockProject({
        files: ['openapi.yaml', 'package.json'],
        directories: ['src/routes'],
        packageJson: {
          dependencies: { express: '^4.18.0' },
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.mandatoryConditions).toEqual([
        'build',
        'tests',
        'integration',
        'coverage',
        'types',
      ]);
    });

    it('library should require tests, coverage, and types', () => {
      mockProject({
        files: ['package.json'],
        packageJson: {
          main: 'dist/index.js',
        },
      });

      const result = detectProjectType('/test-project');

      expect(result.mandatoryConditions).toEqual([
        'build',
        'tests',
        'coverage',
        'types',
      ]);
    });

    it('generic should have minimal requirements', () => {
      mockProject({
        files: ['package.json'],
        packageJson: {},
      });

      const result = detectProjectType('/test-project');

      expect(result.type).toBe('generic');
      expect(result.mandatoryConditions).toEqual(['tests']);
    });
  });
});
