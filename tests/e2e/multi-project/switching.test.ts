/**
 * E2E Tests: Project Switching
 * Coverage Target: 76%
 *
 * Tests end-to-end project switching workflow:
 * - Switching between projects
 * - Config updates
 * - Commands using new active project
 * - Error handling for invalid projects
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Project Switching (E2E)', () => {
  let testDir: string;
  let specweaveRoot: string;

  test.beforeEach(async ({ }, testInfo) => {
    // Create unique directory for each test
    testDir = path.join(__dirname, '../../fixtures/e2e-project-switching', `test-${testInfo.workerIndex}-${Date.now()}`);
    specweaveRoot = path.join(testDir, '.specweave');

    // Clean up any existing test directory
    await fs.remove(testDir);

    // Create fresh directories
    await fs.ensureDir(testDir);
    await fs.ensureDir(specweaveRoot);

    // Create config with multiple projects
    const configPath = path.join(specweaveRoot, 'config.json');
    await fs.writeFile(configPath, JSON.stringify({
      multiProject: {
        enabled: true,
        activeProject: 'frontend',
        projects: {
          frontend: {
            id: 'frontend',
            name: 'Frontend Application',
            description: 'React frontend',
            techStack: ['react', 'typescript'],
            team: 'Frontend Team'
          },
          backend: {
            id: 'backend',
            name: 'Backend API',
            description: 'Node.js API',
            techStack: ['nodejs', 'express'],
            team: 'Backend Team'
          },
          mobile: {
            id: 'mobile',
            name: 'Mobile App',
            description: 'React Native app',
            techStack: ['react-native'],
            team: 'Mobile Team'
          }
        }
      }
    }, null, 2));

    // Create project directories (simplified structure, increment 0026)
    // Only specs folder is created - all docs live at root internal/ level
    for (const projectId of ['frontend', 'backend', 'mobile']) {
      await fs.ensureDir(path.join(specweaveRoot, `docs/internal/specs/${projectId}`));
    }

    // Add content to frontend project
    await fs.writeFile(
      path.join(specweaveRoot, 'docs/internal/specs/frontend/ui-components.md'),
      '# UI Components\n\nReact component library...'
    );

    // Add content to backend project
    await fs.writeFile(
      path.join(specweaveRoot, 'docs/internal/specs/backend/api-endpoints.md'),
      '# API Endpoints\n\nREST API specification...'
    );

    // Add content to mobile project
    await fs.writeFile(
      path.join(specweaveRoot, 'docs/internal/specs/mobile/biometric-auth.md'),
      '# Biometric Authentication\n\nFace ID and fingerprint...'
    );
  });

  test.afterEach(async () => {
    await fs.remove(testDir);
  });

  test('should switch project successfully and update config', async () => {
    // Dynamically import ProjectManager
    const { ProjectManager } = await import('../../../src/core/project-manager.js');
    const manager = new ProjectManager(testDir);

    // Verify initial active project
    const initialProject = manager.getActiveProject();
    expect(initialProject.id).toBe('frontend');

    // Switch to backend
    await manager.switchProject('backend');

    // Verify active project updated
    const currentProject = manager.getActiveProject();
    expect(currentProject.id).toBe('backend');
    expect(currentProject.name).toBe('Backend API');

    // Verify config file updated
    const configPath = path.join(specweaveRoot, 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(config.multiProject.activeProject).toBe('backend');
  });

  test('should use new active project for path resolution after switch', async () => {
    const { ProjectManager } = await import('../../../src/core/project-manager.js');
    const manager = new ProjectManager(testDir);

    // Initial paths (frontend) - flattened structure (v0.15.0+, ADR-0028)
    const frontendSpecsPath = manager.getSpecsPath();
    expect(frontendSpecsPath).toContain('specs/frontend');

    // Switch to mobile
    await manager.switchProject('mobile');

    // Verify new paths (mobile)
    const mobileSpecsPath = manager.getSpecsPath();
    expect(mobileSpecsPath).toContain('specs/mobile');
    expect(mobileSpecsPath).not.toContain('frontend');

    // Verify file exists in mobile project
    const biometricFile = path.join(mobileSpecsPath, 'biometric-auth.md');
    expect(await fs.pathExists(biometricFile)).toBe(true);

    // Verify frontend file not in mobile path
    const uiFile = path.join(mobileSpecsPath, 'ui-components.md');
    expect(await fs.pathExists(uiFile)).toBe(false);
  });

  test('should throw error when switching to non-existent project', async () => {
    const { ProjectManager } = await import('../../../src/core/project-manager.js');
    const manager = new ProjectManager(testDir);

    // Attempt to switch to invalid project
    await expect(async () => {
      await manager.switchProject('non-existent-project');
    }).rejects.toThrow(/not found/i);

    // Verify active project unchanged
    const currentProject = manager.getActiveProject();
    expect(currentProject.id).toBe('frontend'); // Still frontend
  });

  test('should allow switching to same project (idempotent)', async () => {
    const { ProjectManager } = await import('../../../src/core/project-manager.js');
    const manager = new ProjectManager(testDir);

    // Switch to current project (frontend)
    await manager.switchProject('frontend');

    // Verify no error and active project still frontend
    const currentProject = manager.getActiveProject();
    expect(currentProject.id).toBe('frontend');

    // Verify config unchanged
    const configPath = path.join(specweaveRoot, 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(config.multiProject.activeProject).toBe('frontend');
  });
});
