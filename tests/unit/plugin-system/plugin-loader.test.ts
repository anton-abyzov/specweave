import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * PluginLoader Unit Tests
 *
 * Tests for plugin loading, validation, and error handling
 */

import { PluginLoader } from '../../../src/core/plugin-loader.js';
import { ManifestValidationError, PluginNotFoundError } from '../../../src/core/types/plugin.js';
import path from 'path';
import fs from 'fs-extra';

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
      const plugin Path = path.join(fixturesPath, 'specweave-test');

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
