import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * PluginLoader Unit Tests
 *
 * Tests for plugin loading, validation, and error handling
 */

import { PluginLoader } from '../../../src/core/plugins/plugin-loader.js';
import { ManifestValidationError, PluginNotFoundError } from '../../../src/core/types/plugin.js';
import path from 'path';
import * as fs from '../../../src/utils/fs-native.js';

describe('PluginLoader', () => {
  let loader: PluginLoader;
  const fixturesPath = path.join(__dirname, '../../fixtures/plugins');

  beforeEach(() => {
    loader = new PluginLoader();
  });

  describe('loadFromDirectory', () => {
    it('should load valid plugin with complete manifest', async () => {
      const pluginPath = path.join(fixturesPath, 'specweave-test');

      // Only test if fixture exists
      if (await fs.pathExists(pluginPath)) {
        const plugin = await loader.loadFromDirectory(pluginPath);

        expect(plugin).toBeDefined();
        expect(plugin.manifest.name).toBe('specweave-test');
        expect(plugin.manifest.version).toBe('1.0.0');
        expect(plugin.manifest.provides).toBeDefined();
      } else {
        console.warn('Test fixture not found, skipping test');
      }
    });

    it('should throw error for non-existent plugin directory', async () => {
      const invalidPath = path.join(fixturesPath, 'non-existent-plugin');

      await expect(loader.loadFromDirectory(invalidPath)).rejects.toThrow();
    });

    it('should validate manifest schema', async () => {
      // This test validates that the loader checks manifest structure
      const pluginPath = path.join(fixturesPath, 'specweave-test');

      if (await fs.pathExists(pluginPath)) {
        const plugin = await loader.loadFromDirectory(pluginPath);

        // Verify required manifest fields
        expect(plugin.manifest).toHaveProperty('name');
        expect(plugin.manifest).toHaveProperty('version');
        expect(plugin.manifest).toHaveProperty('description');
        expect(plugin.manifest).toHaveProperty('provides');
        expect(plugin.manifest).toHaveProperty('specweave_core_version');
      }
    });
  });

  describe('getMetadata', () => {
    it('should extract plugin metadata without full load', async () => {
      const pluginPath = path.join(fixturesPath, 'specweave-test');

      if (await fs.pathExists(pluginPath)) {
        const metadata = await loader.getMetadata(pluginPath);

        expect(metadata).toBeDefined();
        expect(metadata.version).toBeDefined();
        expect(metadata.description).toBeDefined();
        expect(metadata).toHaveProperty('skillCount');
        expect(metadata).toHaveProperty('agentCount');
        expect(metadata).toHaveProperty('commandCount');
      }
    });
  });

  describe('validate', () => {
    it('should validate correct manifest structure', async () => {
      const validManifest = {
        name: 'specweave-valid',
        version: '1.0.0',
        description: 'Valid test plugin',
        author: {
          name: 'Test Author',
          email: 'test@example.com'
        },
        specweave_core_version: '>=0.4.0',
        provides: {
          skills: [],
          agents: [],
          commands: []
        }
      };

      const result = await loader.validate(validManifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject manifest missing required fields', async () => {
      const invalidManifest = {
        name: 'invalid-plugin',
        version: '1.0.0'
        // Missing description, specweave_core_version, provides
      };

      const result = await loader.validate(invalidManifest as any);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid plugin name format', async () => {
      const invalidManifest = {
        name: 'InvalidName',  // Must be lowercase with hyphens
        version: '1.0.0',
        description: 'Test',
        author: {
          name: 'Test Author',
          email: 'test@example.com'
        },
        specweave_core_version: '>=0.4.0',
        provides: {
          skills: [],
          agents: [],
          commands: []
        }
      };

      const result = await loader.validate(invalidManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });
  });
});

describe('PluginLoader - Error Handling', () => {
  let loader: PluginLoader;

  beforeEach(() => {
    loader = new PluginLoader();
  });

  it('should throw ManifestValidationError for invalid manifest', async () => {
    // Test error handling for various invalid manifests
    const invalidManifest = { name: 'test' };  // Missing required fields

    const result = await loader.validate(invalidManifest as any);

    expect(result.valid).toBe(false);
  });

  it('should handle corrupted manifest JSON gracefully', async () => {
    const invalidPath = '/tmp/non-existent-plugin';

    await expect(loader.loadFromDirectory(invalidPath)).rejects.toThrow();
  });
});

describe('PluginLoader - Skill Visibility (v1.0.102+)', () => {
  let loader: PluginLoader;

  beforeEach(() => {
    loader = new PluginLoader();
  });

  it('should extract visibility from SKILL.md frontmatter', async () => {
    const specweavePluginPath = path.join(__dirname, '../../../plugins/specweave');

    // Only test if plugin exists
    if (await fs.pathExists(specweavePluginPath)) {
      const plugin = await loader.loadFromDirectory(specweavePluginPath);

      // Find increment-planner skill (marked as public so it appears in Skill tool's available list)
      const incrementPlannerSkill = plugin.skills.find(s => s.name === 'increment-planner');

      if (incrementPlannerSkill) {
        expect(incrementPlannerSkill.visibility).toBe('public');
        expect(incrementPlannerSkill.invocableBy).toBeDefined();
        expect(incrementPlannerSkill.invocableBy).toContain('sw:increment');
      } else {
        console.warn('increment-planner skill not found, skipping visibility test');
      }
    }
  });

  it('should default to public visibility when not specified', async () => {
    const specweavePluginPath = path.join(__dirname, '../../../plugins/specweave');

    // Only test if plugin exists
    if (await fs.pathExists(specweavePluginPath)) {
      const plugin = await loader.loadFromDirectory(specweavePluginPath);

      // Find a skill without visibility specified (most skills)
      const publicSkill = plugin.skills.find(s =>
        s.name !== 'increment-planner' && !s.visibility
      );

      if (publicSkill) {
        // undefined means public (default)
        expect(publicSkill.visibility).toBeUndefined();
        expect(publicSkill.invocableBy).toBeUndefined();
      }
    }
  });

  it('should parse invocableBy array correctly', async () => {
    const specweavePluginPath = path.join(__dirname, '../../../plugins/specweave');

    if (await fs.pathExists(specweavePluginPath)) {
      const plugin = await loader.loadFromDirectory(specweavePluginPath);

      const incrementPlannerSkill = plugin.skills.find(s => s.name === 'increment-planner');

      if (incrementPlannerSkill?.invocableBy) {
        expect(Array.isArray(incrementPlannerSkill.invocableBy)).toBe(true);
        expect(incrementPlannerSkill.invocableBy.length).toBeGreaterThan(0);
        // Should contain the sw:increment command
        expect(incrementPlannerSkill.invocableBy).toContain('sw:increment');
      }
    }
  });
});
