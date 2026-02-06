/**
 * Multi-Project Folder Helper Tests (0188 T-016)
 *
 * Tests the extracted createProjectFolders() function that
 * creates specs directories for any provider's multi-project setup.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('createProjectFolders() - Multi-Project Helper (0188 T-016)', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `multi-project-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, '.specweave', 'docs', 'internal', 'specs'), { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should export createProjectFolders function', async () => {
    const mod = await import('../../../../../src/cli/helpers/init/multi-project-folders.js');
    expect(typeof mod.createProjectFolders).toBe('function');
  });

  it('should create folders for GitHub repos', async () => {
    const { createProjectFolders } = await import('../../../../../src/cli/helpers/init/multi-project-folders.js');
    await createProjectFolders(testDir, ['frontend', 'backend', 'shared']);

    const specsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs');
    const frontendExists = await fs.stat(path.join(specsDir, 'frontend')).then(() => true).catch(() => false);
    const backendExists = await fs.stat(path.join(specsDir, 'backend')).then(() => true).catch(() => false);
    const sharedExists = await fs.stat(path.join(specsDir, 'shared')).then(() => true).catch(() => false);

    expect(frontendExists).toBe(true);
    expect(backendExists).toBe(true);
    expect(sharedExists).toBe(true);
  });

  it('should normalize folder names (lowercase, spaces to hyphens)', async () => {
    const { createProjectFolders } = await import('../../../../../src/cli/helpers/init/multi-project-folders.js');
    await createProjectFolders(testDir, ['Frontend App', 'My Backend']);

    const specsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs');
    const feExists = await fs.stat(path.join(specsDir, 'frontend-app')).then(() => true).catch(() => false);
    const beExists = await fs.stat(path.join(specsDir, 'my-backend')).then(() => true).catch(() => false);

    expect(feExists).toBe(true);
    expect(beExists).toBe(true);
  });

  it('should not fail if folders already exist', async () => {
    const { createProjectFolders } = await import('../../../../../src/cli/helpers/init/multi-project-folders.js');
    const specsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs');
    await fs.mkdir(path.join(specsDir, 'existing'), { recursive: true });

    // Should not throw
    await createProjectFolders(testDir, ['existing', 'new-project']);

    const existingExists = await fs.stat(path.join(specsDir, 'existing')).then(() => true).catch(() => false);
    const newExists = await fs.stat(path.join(specsDir, 'new-project')).then(() => true).catch(() => false);

    expect(existingExists).toBe(true);
    expect(newExists).toBe(true);
  });

  it('should return list of created folder names', async () => {
    const { createProjectFolders } = await import('../../../../../src/cli/helpers/init/multi-project-folders.js');
    const result = await createProjectFolders(testDir, ['alpha', 'beta']);

    expect(result).toEqual(['alpha', 'beta']);
  });
});
