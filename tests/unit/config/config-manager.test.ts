/**
 * Unit tests for ConfigManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import * as os from 'os';
import { ConfigManager } from '../../../src/config/ConfigManager.js';
import type { SpecWeaveConfig } from '../../../src/config/types.js';

// ✅ SAFE: Isolated test directory (prevents .specweave deletion)
const TEST_ROOT = path.join(os.tmpdir(), 'specweave-test-config-manager-' + Date.now());
const TEST_CONFIG_PATH = path.join(TEST_ROOT, '.specweave/test-config.json');

describe('ConfigManager', () => {
  beforeEach(async () => {
    // Clean up test config before each test
    try {
      await fs.rm(path.dirname(TEST_CONFIG_PATH), { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test config after each test
    try {
      await fs.rm(path.dirname(TEST_CONFIG_PATH), { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe('initialize', () => {
    it('should create a new config file', async () => {
      const config = await ConfigManager.initialize('Test Project', TEST_CONFIG_PATH);

      expect(config.projectName).toBe('Test Project');
      expect(config.version).toBe('1.0.0');
      expect(config.livingDocs.copyBasedSync.enabled).toBe(true);
      expect(config.livingDocs.threeLayerSync).toBe(true);
    });

    it('should create .specweave directory if it doesn\'t exist', async () => {
      await ConfigManager.initialize('Test Project', TEST_CONFIG_PATH);

      const exists = await ConfigManager.exists(TEST_CONFIG_PATH);
      expect(exists).toBe(true);
    });
  });

  describe('load', () => {
    it('should load and validate config from disk', async () => {
      // Create config first
      await ConfigManager.initialize('Test Project', TEST_CONFIG_PATH);

      // Load it
      const config = await ConfigManager.load(TEST_CONFIG_PATH);

      expect(config.projectName).toBe('Test Project');
      expect(config.version).toBe('1.0.0');
    });

    it('should throw error if config file doesn\'t exist', async () => {
      await expect(ConfigManager.load(TEST_CONFIG_PATH)).rejects.toThrow('Config file not found');
    });
  });

  describe('save', () => {
    it('should save config with timestamp', async () => {
      const config: SpecWeaveConfig = {
        version: '1.0.0',
        projectName: 'Test Project',
        livingDocs: {
          copyBasedSync: { enabled: true },
          threeLayerSync: true
        }
      };

      await ConfigManager.save(config, TEST_CONFIG_PATH);

      const loaded = await ConfigManager.load(TEST_CONFIG_PATH);
      expect(loaded.lastUpdated).toBeDefined();
    });

    it('should validate config before saving', async () => {
      const invalidConfig = {
        version: '1.0.0',
        // Missing projectName
        livingDocs: {
          copyBasedSync: { enabled: true },
          threeLayerSync: true
        }
      } as SpecWeaveConfig;

      await expect(ConfigManager.save(invalidConfig, TEST_CONFIG_PATH)).rejects.toThrow();
    });
  });

  describe('updateResearch', () => {
    it('should update research config atomically', async () => {
      // Initialize config
      await ConfigManager.initialize('Test Project', TEST_CONFIG_PATH);

      // Update research insights
      await ConfigManager.updateResearch({
        vision: {
          keywords: ['design', 'collaboration', 'productivity'],
          market: 'productivity-saas',
          competitors: [],
          opportunityScore: 8,
          viralPotential: true,
          followUpQuestions: [],
          confidence: 0.9,
          rawVision: 'A Figma-like design tool'
        }
      }, TEST_CONFIG_PATH);

      // Load and verify
      const config = await ConfigManager.load(TEST_CONFIG_PATH);
      expect(config.research?.vision).toBeDefined();
      expect(config.research?.vision?.market).toBe('productivity-saas');
      expect(config.research?.vision?.keywords).toEqual(['design', 'collaboration', 'productivity']);
    });

    it('should merge with existing research data', async () => {
      // Initialize and add vision
      await ConfigManager.initialize('Test Project', TEST_CONFIG_PATH);
      await ConfigManager.updateResearch({
        vision: {
          keywords: ['design', 'collaboration', 'productivity'],
          market: 'productivity-saas',
          competitors: [],
          opportunityScore: 8,
          viralPotential: true,
          followUpQuestions: [],
          confidence: 0.9,
          rawVision: 'A design tool'
        }
      }, TEST_CONFIG_PATH);

      // Add compliance
      await ConfigManager.updateResearch({
        compliance: {
          standards: [],
          teamRequirements: ['auth-team'],
          totalCostEstimate: '$3K/month',
          recommendations: []
        }
      }, TEST_CONFIG_PATH);

      // Verify both exist
      const config = await ConfigManager.load(TEST_CONFIG_PATH);
      expect(config.research?.vision).toBeDefined();
      expect(config.research?.compliance).toBeDefined();
      expect(config.research?.compliance?.teamRequirements).toEqual(['auth-team']);
    });

    it('should throw error if config doesn\'t exist', async () => {
      await expect(
        ConfigManager.updateResearch({ vision: {} as any }, TEST_CONFIG_PATH)
      ).rejects.toThrow('Cannot update research: config file not found');
    });
  });

  describe('exists', () => {
    it('should return true if config exists', async () => {
      await ConfigManager.initialize('Test Project', TEST_CONFIG_PATH);

      const exists = await ConfigManager.exists(TEST_CONFIG_PATH);
      expect(exists).toBe(true);
    });

    it('should return false if config doesn\'t exist', async () => {
      const exists = await ConfigManager.exists(TEST_CONFIG_PATH);
      expect(exists).toBe(false);
    });
  });
});
