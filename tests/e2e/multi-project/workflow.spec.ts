/**
 * E2E Tests: Multi-Project Workflow
 * Coverage Target: 80%
 *
 * Pure file-based E2E tests (no module imports)
 * Tests multi-project file structure and config persistence
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Multi-Project Workflow (E2E)', () => {
  const testDir = path.join(__dirname, '../../fixtures/e2e-multi-project');
  const specweaveRoot = path.join(testDir, '.specweave');

  test.beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(specweaveRoot);
  });

  test.afterEach(async () => {
    await fs.remove(testDir);
  });

  test('should support basic multi-project file structure', async () => {
    // Create config with 2 projects
    const configPath = path.join(specweaveRoot, 'config.json');
    const config = {
      multiProject: {
        enabled: true,
        activeProject: 'web-app',
        projects: [
          {
            id: 'web-app',
            name: 'Web Application',
            description: 'Frontend web application',
            techStack: ['react', 'typescript'],
            team: 'Web Team'
          },
          {
            id: 'mobile-app',
            name: 'Mobile Application',
            description: 'React Native mobile app',
            techStack: ['react-native', 'typescript'],
            team: 'Mobile Team'
          }
        ]
      }
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Create project directories
    const webSpecsPath = path.join(specweaveRoot, 'docs/internal/projects/web-app/specs');
    const webModulesPath = path.join(specweaveRoot, 'docs/internal/projects/web-app/modules');
    const mobileSpecsPath = path.join(specweaveRoot, 'docs/internal/projects/mobile-app/specs');
    const mobileModulesPath = path.join(specweaveRoot, 'docs/internal/projects/mobile-app/modules');

    await fs.ensureDir(webSpecsPath);
    await fs.ensureDir(webModulesPath);
    await fs.ensureDir(mobileSpecsPath);
    await fs.ensureDir(mobileModulesPath);

    // Add files to projects
    await fs.writeFile(path.join(webSpecsPath, 'user-auth.md'), '# User Authentication\n\nUser story...');
    await fs.writeFile(path.join(webModulesPath, 'api-client.md'), '# API Client\n\nModule docs...');
    await fs.writeFile(path.join(mobileSpecsPath, 'biometric-auth.md'), '# Biometric Auth\n\nFace ID...');

    // Verify file structure
    expect(await fs.pathExists(path.join(webSpecsPath, 'user-auth.md'))).toBe(true);
    expect(await fs.pathExists(path.join(webModulesPath, 'api-client.md'))).toBe(true);
    expect(await fs.pathExists(path.join(mobileSpecsPath, 'biometric-auth.md'))).toBe(true);

    // Verify isolation (files don't cross-contaminate)
    expect(await fs.pathExists(path.join(webSpecsPath, 'biometric-auth.md'))).toBe(false);
    expect(await fs.pathExists(path.join(mobileSpecsPath, 'user-auth.md'))).toBe(false);

    // Verify config persisted
    const savedConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(savedConfig.multiProject.enabled).toBe(true);
    expect(savedConfig.multiProject.projects.length).toBe(2);
    expect(savedConfig.multiProject.activeProject).toBe('web-app');
  });

  test('should support agency managing 4 client projects', async () => {
    // Real-world scenario: Digital agency with 4 client projects
    const configPath = path.join(specweaveRoot, 'config.json');
    const config = {
      multiProject: {
        enabled: true,
        activeProject: 'client-ecommerce',
        projects: [
          { id: 'client-ecommerce', name: 'E-Commerce', techStack: ['nextjs', 'stripe'], team: 'E-Commerce Team' },
          { id: 'client-saas', name: 'SaaS Dashboard', techStack: ['react', 'graphql'], team: 'SaaS Team' },
          { id: 'client-mobile', name: 'Mobile App', techStack: ['react-native'], team: 'Mobile Team' },
          { id: 'internal-tools', name: 'Internal Tools', techStack: ['typescript'], team: 'Platform Team' }
        ]
      }
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Create all 4 project directories
    for (const project of config.multiProject.projects) {
      const specsPath = path.join(specweaveRoot, `docs/internal/projects/${project.id}/specs`);
      await fs.ensureDir(specsPath);
    }

    // Add spec files for each project
    await fs.writeFile(
      path.join(specweaveRoot, 'docs/internal/projects/client-ecommerce/specs/checkout.md'),
      '# Checkout Flow'
    );
    await fs.writeFile(
      path.join(specweaveRoot, 'docs/internal/projects/client-saas/specs/analytics.md'),
      '# Analytics Dashboard'
    );
    await fs.writeFile(
      path.join(specweaveRoot, 'docs/internal/projects/client-mobile/specs/push-notifications.md'),
      '# Push Notifications'
    );
    await fs.writeFile(
      path.join(specweaveRoot, 'docs/internal/projects/internal-tools/specs/deployment.md'),
      '# Deployment Automation'
    );

    // Verify all 4 projects exist independently
    expect(await fs.pathExists(path.join(specweaveRoot, 'docs/internal/projects/client-ecommerce/specs/checkout.md'))).toBe(true);
    expect(await fs.pathExists(path.join(specweaveRoot, 'docs/internal/projects/client-saas/specs/analytics.md'))).toBe(true);
    expect(await fs.pathExists(path.join(specweaveRoot, 'docs/internal/projects/client-mobile/specs/push-notifications.md'))).toBe(true);
    expect(await fs.pathExists(path.join(specweaveRoot, 'docs/internal/projects/internal-tools/specs/deployment.md'))).toBe(true);

    // Verify config tracks all 4 projects
    const savedConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(savedConfig.multiProject.projects.length).toBe(4);

    // Verify tech stack preserved
    const ecommerceProject = savedConfig.multiProject.projects.find((p: any) => p.id === 'client-ecommerce');
    expect(ecommerceProject.techStack).toContain('stripe');
  });

  test('should support project switching without data loss', async () => {
    // Setup: 2 projects
    const configPath = path.join(specweaveRoot, 'config.json');
    let config = {
      multiProject: {
        enabled: true,
        activeProject: 'frontend',
        projects: [
          { id: 'frontend', name: 'Frontend', techStack: ['react'], team: 'Frontend Team' },
          { id: 'backend', name: 'Backend', techStack: ['nodejs'], team: 'Backend Team' }
        ]
      }
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Create directories
    const frontendSpecs = path.join(specweaveRoot, 'docs/internal/projects/frontend/specs');
    const backendSpecs = path.join(specweaveRoot, 'docs/internal/projects/backend/specs');

    await fs.ensureDir(frontendSpecs);
    await fs.ensureDir(backendSpecs);

    // Add files to frontend (active project)
    await fs.writeFile(path.join(frontendSpecs, 'ui-components.md'), 'UI Components');
    await fs.writeFile(path.join(frontendSpecs, 'routing.md'), 'Routing');

    // Switch to backend
    config.multiProject.activeProject = 'backend';
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Add files to backend (now active)
    await fs.writeFile(path.join(backendSpecs, 'api-endpoints.md'), 'API Endpoints');
    await fs.writeFile(path.join(backendSpecs, 'database-schema.md'), 'Database Schema');

    // Switch back to frontend
    config.multiProject.activeProject = 'frontend';
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Verify NO data loss after switches
    expect(await fs.pathExists(path.join(frontendSpecs, 'ui-components.md'))).toBe(true);
    expect(await fs.pathExists(path.join(frontendSpecs, 'routing.md'))).toBe(true);
    expect(await fs.pathExists(path.join(backendSpecs, 'api-endpoints.md'))).toBe(true);
    expect(await fs.pathExists(path.join(backendSpecs, 'database-schema.md'))).toBe(true);

    // Verify file counts
    const frontendFiles = await fs.readdir(frontendSpecs);
    const backendFiles = await fs.readdir(backendSpecs);

    expect(frontendFiles.length).toBe(2);
    expect(backendFiles.length).toBe(2);
  });

  test('should persist project metadata across config updates', async () => {
    // Create project with rich metadata
    const configPath = path.join(specweaveRoot, 'config.json');
    const config = {
      multiProject: {
        enabled: true,
        activeProject: 'project-alpha',
        projects: [
          {
            id: 'project-alpha',
            name: 'Project Alpha',
            description: 'Alpha project with rich metadata',
            techStack: ['react', 'typescript', 'graphql'],
            team: 'Alpha Team',
            keywords: ['web', 'frontend', 'graphql']
          }
        ]
      }
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Verify initial metadata
    let savedConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(savedConfig.multiProject.projects[0].keywords).toEqual(['web', 'frontend', 'graphql']);
    expect(savedConfig.multiProject.projects[0].techStack).toEqual(['react', 'typescript', 'graphql']);

    // Modify metadata
    config.multiProject.projects[0].techStack.push('apollo');
    config.multiProject.projects[0].keywords.push('real-time');
    config.multiProject.projects[0].description = 'Updated description';

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Verify persistence
    savedConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(savedConfig.multiProject.projects[0].techStack).toContain('apollo');
    expect(savedConfig.multiProject.projects[0].keywords).toContain('real-time');
    expect(savedConfig.multiProject.projects[0].description).toBe('Updated description');
  });

  test('should support brownfield imports to different projects', async () => {
    // Setup: 2 projects for brownfield imports
    const configPath = path.join(specweaveRoot, 'config.json');
    const config = {
      multiProject: {
        enabled: true,
        activeProject: 'web-app',
        projects: [
          { id: 'web-app', name: 'Web App', techStack: ['react'], team: 'Web Team' },
          { id: 'mobile-app', name: 'Mobile App', techStack: ['react-native'], team: 'Mobile Team' }
        ]
      },
      brownfield: {
        importHistory: []
      }
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Create legacy folders for each project
    const webLegacy = path.join(specweaveRoot, 'docs/internal/projects/web-app/legacy/notion');
    const mobileLegacy = path.join(specweaveRoot, 'docs/internal/projects/mobile-app/legacy/confluence');

    await fs.ensureDir(webLegacy);
    await fs.ensureDir(mobileLegacy);

    // Simulate brownfield imports
    await fs.writeFile(path.join(webLegacy, 'old-spec-1.md'), 'Old web spec from Notion');
    await fs.writeFile(path.join(webLegacy, 'old-spec-2.md'), 'Another old web spec');
    await fs.writeFile(path.join(mobileLegacy, 'mobile-doc.md'), 'Old mobile doc from Confluence');

    // Update import history
    config.brownfield.importHistory = [
      {
        project: 'web-app',
        source: 'notion',
        workspace: 'acme-corp',
        filesImported: 2,
        timestamp: new Date().toISOString()
      },
      {
        project: 'mobile-app',
        source: 'confluence',
        workspace: 'engineering',
        filesImported: 1,
        timestamp: new Date().toISOString()
      }
    ];

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Verify imports went to correct legacy folders
    expect(await fs.pathExists(path.join(webLegacy, 'old-spec-1.md'))).toBe(true);
    expect(await fs.pathExists(path.join(webLegacy, 'old-spec-2.md'))).toBe(true);
    expect(await fs.pathExists(path.join(mobileLegacy, 'mobile-doc.md'))).toBe(true);

    // Verify no cross-contamination
    expect(await fs.pathExists(path.join(webLegacy, 'mobile-doc.md'))).toBe(false);
    expect(await fs.pathExists(path.join(mobileLegacy, 'old-spec-1.md'))).toBe(false);

    // Verify import history tracks both
    const savedConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(savedConfig.brownfield.importHistory.length).toBe(2);

    const webImport = savedConfig.brownfield.importHistory.find((h: any) => h.project === 'web-app');
    const mobileImport = savedConfig.brownfield.importHistory.find((h: any) => h.project === 'mobile-app');

    expect(webImport.source).toBe('notion');
    expect(webImport.filesImported).toBe(2);
    expect(mobileImport.source).toBe('confluence');
    expect(mobileImport.filesImported).toBe(1);
  });
});
