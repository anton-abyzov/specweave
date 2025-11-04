/**
 * Plugin Detection Utility Tests
 *
 * Tests the plugin detection logic for various tech stacks
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { scanProjectStructure, detectPlugins, formatDetectedPlugins, generateInstallCommands } from '../../src/utils/plugin-detection';

describe('Plugin Detection Utility', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for test projects
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  describe('scanProjectStructure', () => {
    it('should detect package.json with dependencies', async () => {
      // Create test package.json
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test-project',
        dependencies: {
          'react': '^18.0.0',
          'next': '^13.0.0',
        },
        devDependencies: {
          '@playwright/test': '^1.40.0',
        },
      });

      const signals = await scanProjectStructure(tempDir);

      expect(signals.hasPackageJson).toBe(true);
      expect(signals.dependencies).toContain('react');
      expect(signals.dependencies).toContain('next');
      expect(signals.devDependencies).toContain('@playwright/test');
    });

    it('should detect .NET project files', async () => {
      // Create test .csproj file
      await fs.writeFile(path.join(tempDir, 'MyApp.csproj'), '<Project></Project>');

      const signals = await scanProjectStructure(tempDir);

      expect(signals.hasCsproj).toBe(true);
    });

    it('should detect Python project files', async () => {
      // Create test Python files
      await fs.writeFile(path.join(tempDir, 'requirements.txt'), 'django\nfastapi');
      await fs.writeFile(path.join(tempDir, 'pyproject.toml'), '[tool.poetry]');

      const signals = await scanProjectStructure(tempDir);

      expect(signals.hasRequirementsTxt).toBe(true);
      expect(signals.hasPyProject).toBe(true);
    });

    it('should detect infrastructure files', async () => {
      // Create test infrastructure files
      await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), 'version: "3"');
      await fs.writeFile(path.join(tempDir, 'Dockerfile'), 'FROM node:18');
      await fs.mkdir(path.join(tempDir, 'k8s'));

      const signals = await scanProjectStructure(tempDir);

      expect(signals.files).toContain('docker-compose.yml');
      expect(signals.files).toContain('Dockerfile');
      expect(signals.folders).toContain('k8s');
    });

    it('should detect git remote', async () => {
      // Create test git config
      await fs.mkdir(path.join(tempDir, '.git'));
      await fs.writeFile(
        path.join(tempDir, '.git', 'config'),
        '[remote "origin"]\n  url = https://github.com/user/repo.git'
      );

      const signals = await scanProjectStructure(tempDir);

      expect(signals.gitRemote).toContain('github.com');
    });
  });

  describe('detectPlugins', () => {
    it('should detect frontend plugin for Next.js + React', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        dependencies: { 'next': '^13.0.0', 'react': '^18.0.0' },
      });

      const signals = await scanProjectStructure(tempDir);
      const detected = detectPlugins(signals);

      const frontend = detected.find(p => p.name === 'specweave-frontend');
      expect(frontend).toBeDefined();
      expect(frontend?.confidence).toBe('high');
      expect(frontend?.signals).toContain('next');
      expect(frontend?.signals).toContain('react');
    });

    it('should detect backend plugin for .NET', async () => {
      await fs.writeFile(path.join(tempDir, 'MyApp.csproj'), '<Project></Project>');

      const signals = await scanProjectStructure(tempDir);
      const detected = detectPlugins(signals);

      const backend = detected.find(p => p.name === 'specweave-backend');
      expect(backend).toBeDefined();
      expect(backend?.confidence).toBe('high');
      expect(backend?.reason).toContain('.NET');
    });

    it('should detect infrastructure plugin for Docker', async () => {
      await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), 'version: "3"');

      const signals = await scanProjectStructure(tempDir);
      const detected = detectPlugins(signals);

      const infra = detected.find(p => p.name === 'specweave-infrastructure');
      expect(infra).toBeDefined();
      expect(infra?.confidence).toBe('high');
      expect(infra?.signals).toContain('docker-compose.yml');
    });

    it('should detect Kubernetes plugin for k8s folder', async () => {
      await fs.mkdir(path.join(tempDir, 'k8s'));

      const signals = await scanProjectStructure(tempDir);
      const detected = detectPlugins(signals);

      const k8s = detected.find(p => p.name === 'specweave-kubernetes');
      expect(k8s).toBeDefined();
      expect(k8s?.confidence).toBe('high');
      expect(k8s?.signals).toContain('k8s');
    });

    it('should detect GitHub plugin for GitHub remote', async () => {
      await fs.mkdir(path.join(tempDir, '.git'));
      await fs.writeFile(
        path.join(tempDir, '.git', 'config'),
        '[remote "origin"]\n  url = https://github.com/user/repo.git'
      );

      const signals = await scanProjectStructure(tempDir);
      const detected = detectPlugins(signals);

      const github = detected.find(p => p.name === 'specweave-github');
      expect(github).toBeDefined();
      expect(github?.confidence).toBe('high');
    });

    it('should detect payment plugin for Stripe', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        dependencies: { 'stripe': '^10.0.0', '@stripe/stripe-js': '^1.0.0' },
      });

      const signals = await scanProjectStructure(tempDir);
      const detected = detectPlugins(signals);

      const payments = detected.find(p => p.name === 'specweave-payments');
      expect(payments).toBeDefined();
      expect(payments?.confidence).toBe('high');
      expect(payments?.signals).toContain('stripe');
    });

    it('should detect ML plugin for TensorFlow', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        dependencies: { '@tensorflow/tfjs': '^4.0.0' },
      });

      const signals = await scanProjectStructure(tempDir);
      const detected = detectPlugins(signals);

      const ml = detected.find(p => p.name === 'specweave-ml');
      expect(ml).toBeDefined();
      expect(ml?.confidence).toBe('high');
    });

    it('should detect testing plugin for Playwright', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        devDependencies: { '@playwright/test': '^1.40.0' },
      });

      const signals = await scanProjectStructure(tempDir);
      const detected = detectPlugins(signals);

      const testing = detected.find(p => p.name === 'specweave-testing');
      expect(testing).toBeDefined();
      expect(testing?.confidence).toBe('medium');
    });

    it('should detect multiple plugins for complex project', async () => {
      // Real-world scenario: Next.js + .NET + PostgreSQL + Docker
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        dependencies: { 'next': '^13.0.0', 'react': '^18.0.0' },
        devDependencies: { '@playwright/test': '^1.40.0' },
      });
      await fs.writeFile(path.join(tempDir, 'MyApi.csproj'), '<Project></Project>');
      await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), 'version: "3"');
      await fs.mkdir(path.join(tempDir, '.git'));
      await fs.writeFile(
        path.join(tempDir, '.git', 'config'),
        '[remote "origin"]\n  url = https://github.com/user/repo.git'
      );

      const signals = await scanProjectStructure(tempDir);
      const detected = detectPlugins(signals);

      // Should detect 5 plugins
      expect(detected.length).toBeGreaterThanOrEqual(5);
      expect(detected.find(p => p.name === 'specweave-frontend')).toBeDefined();
      expect(detected.find(p => p.name === 'specweave-backend')).toBeDefined();
      expect(detected.find(p => p.name === 'specweave-infrastructure')).toBeDefined();
      expect(detected.find(p => p.name === 'specweave-testing')).toBeDefined();
      expect(detected.find(p => p.name === 'specweave-github')).toBeDefined();
    });
  });

  describe('formatDetectedPlugins', () => {
    it('should format plugins grouped by confidence', () => {
      const plugins = [
        { name: 'specweave-frontend', reason: 'Next.js detected', confidence: 'high' as const, signals: ['next'] },
        { name: 'specweave-backend', reason: '.NET detected', confidence: 'high' as const, signals: ['*.csproj'] },
        { name: 'specweave-testing', reason: 'Playwright detected', confidence: 'medium' as const, signals: ['@playwright/test'] },
        { name: 'specweave-diagrams', reason: 'Diagrams folder', confidence: 'low' as const, signals: ['diagrams'] },
      ];

      const formatted = formatDetectedPlugins(plugins);

      expect(formatted).toContain('Recommended (high confidence)');
      expect(formatted).toContain('specweave-frontend');
      expect(formatted).toContain('specweave-backend');
      expect(formatted).toContain('Suggested (medium confidence)');
      expect(formatted).toContain('specweave-testing');
      expect(formatted).toContain('Optional (low confidence)');
      expect(formatted).toContain('specweave-diagrams');
    });

    it('should return message when no plugins detected', () => {
      const formatted = formatDetectedPlugins([]);
      expect(formatted).toContain('No additional plugins recommended');
    });
  });

  describe('generateInstallCommands', () => {
    it('should generate install commands for high and medium confidence', () => {
      const plugins = [
        { name: 'specweave-frontend', reason: 'Next.js', confidence: 'high' as const, signals: [] as string[] },
        { name: 'specweave-backend', reason: '.NET', confidence: 'medium' as const, signals: [] as string[] },
        { name: 'specweave-diagrams', reason: 'Folder', confidence: 'low' as const, signals: [] as string[] },
      ];

      const commands = generateInstallCommands(plugins);

      expect(commands).toHaveLength(2); // Only high + medium
      expect(commands).toContain('/plugin install specweave-frontend@specweave');
      expect(commands).toContain('/plugin install specweave-backend@specweave');
      expect(commands.find(c => c.includes('diagrams'))).toBeUndefined(); // Low confidence excluded
    });

    it('should deduplicate plugin names', () => {
      const plugins = [
        { name: 'specweave-frontend', reason: 'Next.js', confidence: 'high' as const, signals: [] as string[] },
        { name: 'specweave-frontend', reason: 'React', confidence: 'high' as const, signals: [] as string[] },
      ];

      const commands = generateInstallCommands(plugins);

      expect(commands).toHaveLength(1); // Deduplicated
    });
  });
});
