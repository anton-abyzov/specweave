/**
 * Integration test: init config.json ordering
 *
 * Verifies that `.specweave/config.json` exists before `.specweave/increments/`
 * is created during init. This prevents `findProjectRoot()` from resolving to
 * a sibling project during the init window (AD-3 / US-002).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import * as fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { findProjectRoot } from '../../../src/utils/find-project-root.js';

function tmpPath(name: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return path.join(os.tmpdir(), `sw-config-order-${name}-${suffix}`);
}

describe('init config.json ordering (AD-3)', () => {
  let parentDir: string;
  let targetDir: string;
  let siblingDir: string;

  beforeEach(() => {
    parentDir = tmpPath('parent');
    targetDir = path.join(parentDir, 'new-project');
    siblingDir = path.join(parentDir, 'other-project');

    mkdirSync(targetDir, { recursive: true });

    // Create sibling project with increments 0001-0005
    mkdirSync(path.join(siblingDir, '.specweave', 'increments', '0001-feature-a'), { recursive: true });
    mkdirSync(path.join(siblingDir, '.specweave', 'increments', '0002-feature-b'), { recursive: true });
    mkdirSync(path.join(siblingDir, '.specweave', 'increments', '0003-feature-c'), { recursive: true });
    mkdirSync(path.join(siblingDir, '.specweave', 'increments', '0004-feature-d'), { recursive: true });
    mkdirSync(path.join(siblingDir, '.specweave', 'increments', '0005-feature-e'), { recursive: true });
    writeFileSync(
      path.join(siblingDir, '.specweave', 'config.json'),
      JSON.stringify({ version: '2.0', project: { name: 'other-project' } }),
    );
  });

  afterEach(async () => {
    await fs.rm(parentDir, { recursive: true, force: true }).catch(() => {});
  });

  describe('createMinimalConfig', () => {
    it('creates .specweave/config.json with version and project name', async () => {
      // Import createMinimalConfig — this will fail (RED) because the function doesn't exist yet
      const { createMinimalConfig } = await import(
        '../../../src/cli/helpers/init/directory-structure.js'
      );

      createMinimalConfig(targetDir, 'new-project');

      const configPath = path.join(targetDir, '.specweave', 'config.json');
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(
        await fs.readFile(configPath, 'utf-8'),
      );
      expect(config.version).toBe('2.0');
      expect(config.project.name).toBe('new-project');
    });

    it('makes findProjectRoot() resolve to the new project', async () => {
      const { createMinimalConfig } = await import(
        '../../../src/cli/helpers/init/directory-structure.js'
      );

      createMinimalConfig(targetDir, 'new-project');

      // findProjectRoot from inside the new project should find IT, not the sibling
      const resolved = findProjectRoot(targetDir);
      expect(resolved).toBe(targetDir);
    });

    it('does not overwrite an existing config.json', async () => {
      const { createMinimalConfig } = await import(
        '../../../src/cli/helpers/init/directory-structure.js'
      );

      // Pre-create config with extra fields
      mkdirSync(path.join(targetDir, '.specweave'), { recursive: true });
      writeFileSync(
        path.join(targetDir, '.specweave', 'config.json'),
        JSON.stringify({ version: '2.0', project: { name: 'existing' }, custom: true }),
      );

      createMinimalConfig(targetDir, 'new-project');

      const config = JSON.parse(
        await fs.readFile(path.join(targetDir, '.specweave', 'config.json'), 'utf-8'),
      );
      // Should preserve existing config, not overwrite
      expect(config.project.name).toBe('existing');
      expect(config.custom).toBe(true);
    });
  });

  describe('createConfigFile merges into existing minimal config', () => {
    it('preserves version from minimal config and adds full settings', async () => {
      const { createMinimalConfig, createConfigFile } = await import(
        '../../../src/cli/helpers/init/directory-structure.js'
      );

      // Step 1: Write minimal config (simulating pre-createDirectoryStructure step)
      createMinimalConfig(targetDir, 'new-project');

      // Step 2: Write full config (simulating post-createDirectoryStructure step)
      createConfigFile(targetDir, 'new-project', 'claude', 'en', true);

      const config = JSON.parse(
        await fs.readFile(path.join(targetDir, '.specweave', 'config.json'), 'utf-8'),
      );

      // Full config should be present
      expect(config.version).toBe('2.0');
      expect(config.project.name).toBe('new-project');
      expect(config.adapters.default).toBe('claude');
      expect(config.language).toBe('en');
    });
  });

  describe('ordering guarantee', () => {
    it('config.json exists before increments/ is created', async () => {
      const { createMinimalConfig, createDirectoryStructure } = await import(
        '../../../src/cli/helpers/init/directory-structure.js'
      );

      // Step 1: Write minimal config FIRST
      createMinimalConfig(targetDir, 'new-project');

      // Verify config exists before creating directory structure
      const configExists = existsSync(path.join(targetDir, '.specweave', 'config.json'));
      expect(configExists).toBe(true);

      // Step 2: Create directory structure (which creates increments/)
      await createDirectoryStructure(targetDir, 'claude');

      // Both should exist now
      expect(existsSync(path.join(targetDir, '.specweave', 'config.json'))).toBe(true);
      expect(existsSync(path.join(targetDir, '.specweave', 'increments'))).toBe(true);

      // findProjectRoot should resolve to this project, not the sibling
      const resolved = findProjectRoot(path.join(targetDir, '.specweave', 'increments'));
      expect(resolved).toBe(targetDir);
    });
  });
});
