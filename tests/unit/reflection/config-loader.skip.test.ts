/**
 * Unit tests for Reflection Configuration Loader
 */

import fs from 'fs-extra';
import path from 'path';
import {
  findSpecweaveRoot,
  loadReflectionConfig,
  validateReflectionConfig,
  loadAndValidateReflectionConfig
} from '../../../src/hooks/lib/reflection-config-loader';
import {
  DEFAULT_REFLECTION_CONFIG,
  ReflectionMode,
  ReflectionDepth,
  ReflectionModel,
  IssueSeverity
} from '../../../src/hooks/lib/types/reflection-types';

describe('Reflection Configuration Loader', () => {
  const testDir = path.join(__dirname, '../../fixtures/reflection-config');
  const specweaveDir = path.join(testDir, '.specweave');
  const configPath = path.join(specweaveDir, 'config.json');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
    fs.mkdirpSync(specweaveDir);
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  describe('findSpecweaveRoot', () => {
    it('should find .specweave directory in current directory', () => {
      const result = findSpecweaveRoot(testDir);
      expect(result).toBe(testDir);
    });

    it('should find .specweave directory in parent directory', () => {
      const subDir = path.join(testDir, 'src', 'hooks');
      fs.mkdirpSync(subDir);
      const result = findSpecweaveRoot(subDir);
      expect(result).toBe(testDir);
    });

    it('should return null if .specweave directory not found', () => {
      fs.removeSync(specweaveDir);
      const result = findSpecweaveRoot(testDir);
      expect(result).toBeNull();
    });
  });

  describe('loadReflectionConfig', () => {
    it('should return defaults when config file does not exist', () => {
      const config = loadReflectionConfig(testDir);
      expect(config).toEqual(DEFAULT_REFLECTION_CONFIG);
    });

    it('should return defaults when reflection section is missing', () => {
      fs.writeJsonSync(configPath, { someOtherSection: {} });
      const config = loadReflectionConfig(testDir);
      expect(config).toEqual(DEFAULT_REFLECTION_CONFIG);
    });

    it('should merge user config with defaults', () => {
      fs.writeJsonSync(configPath, {
        reflection: {
          enabled: false,
          model: 'sonnet',
          categories: {
            security: false
          }
        }
      });

      const config = loadReflectionConfig(testDir);

      expect(config.enabled).toBe(false);
      expect(config.model).toBe(ReflectionModel.SONNET);
      expect(config.categories.security).toBe(false);
      // Defaults for unspecified fields
      expect(config.mode).toBe(DEFAULT_REFLECTION_CONFIG.mode);
      expect(config.depth).toBe(DEFAULT_REFLECTION_CONFIG.depth);
      expect(config.categories.quality).toBe(true);
    });

    it('should handle complete custom configuration', () => {
      const customConfig = {
        reflection: {
          enabled: true,
          mode: 'manual',
          depth: 'deep',
          model: 'opus',
          categories: {
            security: true,
            quality: false,
            testing: true,
            performance: false,
            technicalDebt: true
          },
          criticalThreshold: 'HIGH',
          storeReflections: false,
          autoCreateFollowUpTasks: false,
          soundNotifications: true
        }
      };

      fs.writeJsonSync(configPath, customConfig);
      const config = loadReflectionConfig(testDir);

      expect(config.enabled).toBe(true);
      expect(config.mode).toBe(ReflectionMode.MANUAL);
      expect(config.depth).toBe(ReflectionDepth.DEEP);
      expect(config.model).toBe(ReflectionModel.OPUS);
      expect(config.categories.security).toBe(true);
      expect(config.categories.quality).toBe(false);
      expect(config.criticalThreshold).toBe(IssueSeverity.HIGH);
      expect(config.storeReflections).toBe(false);
      expect(config.soundNotifications).toBe(true);
    });

    it('should throw error for invalid JSON', () => {
      fs.writeFileSync(configPath, '{ invalid json }', 'utf-8');
      expect(() => loadReflectionConfig(testDir)).toThrow('Invalid JSON in config file');
    });

    it('should return defaults when no .specweave directory found', () => {
      fs.removeSync(specweaveDir);
      const config = loadReflectionConfig(testDir);
      expect(config).toEqual(DEFAULT_REFLECTION_CONFIG);
    });
  });

  describe('validateReflectionConfig', () => {
    it('should validate default configuration', () => {
      const validation = validateReflectionConfig(DEFAULT_REFLECTION_CONFIG);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject config with all categories disabled', () => {
      const config = {
        ...DEFAULT_REFLECTION_CONFIG,
        categories: {
          security: false,
          quality: false,
          testing: false,
          performance: false,
          technicalDebt: false
        }
      };

      const validation = validateReflectionConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'At least one analysis category must be enabled when reflection is active'
      );
    });

    it('should allow all categories disabled if reflection is disabled', () => {
      const config = {
        ...DEFAULT_REFLECTION_CONFIG,
        enabled: false,
        mode: ReflectionMode.DISABLED,
        categories: {
          security: false,
          quality: false,
          testing: false,
          performance: false,
          technicalDebt: false
        }
      };

      const validation = validateReflectionConfig(config);
      expect(validation.valid).toBe(true);
    });

    it('should reject auto mode when reflection is disabled', () => {
      const config = {
        ...DEFAULT_REFLECTION_CONFIG,
        enabled: false,
        mode: ReflectionMode.AUTO
      };

      const validation = validateReflectionConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Reflection mode cannot be "auto" when reflection is disabled'
      );
    });

    it('should reject sound notifications without enabled reflection', () => {
      const config = {
        ...DEFAULT_REFLECTION_CONFIG,
        enabled: false,
        soundNotifications: true
      };

      const validation = validateReflectionConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Sound notifications require reflection to be enabled'
      );
    });

    it('should reject auto-create follow-up tasks without storeReflections', () => {
      const config = {
        ...DEFAULT_REFLECTION_CONFIG,
        storeReflections: false,
        autoCreateFollowUpTasks: true
      };

      const validation = validateReflectionConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Auto-create follow-up tasks requires storeReflections to be enabled'
      );
    });

    it('should accumulate multiple errors', () => {
      const config = {
        ...DEFAULT_REFLECTION_CONFIG,
        enabled: false,
        mode: ReflectionMode.AUTO,
        soundNotifications: true
      };

      const validation = validateReflectionConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
    });
  });

  describe('loadAndValidateReflectionConfig', () => {
    it('should return valid configuration', () => {
      fs.writeJsonSync(configPath, {
        reflection: {
          enabled: true,
          model: 'haiku'
        }
      });

      const config = loadAndValidateReflectionConfig(testDir);
      expect(config.enabled).toBe(true);
      expect(config.model).toBe(ReflectionModel.HAIKU);
    });

    it('should throw error for invalid configuration', () => {
      fs.writeJsonSync(configPath, {
        reflection: {
          enabled: true,
          categories: {
            security: false,
            quality: false,
            testing: false,
            performance: false,
            technicalDebt: false
          }
        }
      });

      expect(() => loadAndValidateReflectionConfig(testDir)).toThrow(
        'Invalid reflection configuration'
      );
    });

    it('should throw detailed validation errors', () => {
      fs.writeJsonSync(configPath, {
        reflection: {
          enabled: false,
          mode: 'auto',
          soundNotifications: true
        }
      });

      try {
        loadAndValidateReflectionConfig(testDir);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid reflection configuration');
        expect(error.message).toContain('mode cannot be "auto"');
        expect(error.message).toContain('Sound notifications require');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty reflection object', () => {
      fs.writeJsonSync(configPath, { reflection: {} });
      const config = loadReflectionConfig(testDir);
      expect(config).toEqual(DEFAULT_REFLECTION_CONFIG);
    });

    it('should handle partial categories object', () => {
      fs.writeJsonSync(configPath, {
        reflection: {
          categories: {
            security: false
          }
        }
      });

      const config = loadReflectionConfig(testDir);
      expect(config.categories.security).toBe(false);
      expect(config.categories.quality).toBe(true); // Default
    });

    it('should handle null values (use defaults)', () => {
      fs.writeJsonSync(configPath, {
        reflection: {
          enabled: null,
          mode: null
        }
      });

      const config = loadReflectionConfig(testDir);
      expect(config.enabled).toBe(DEFAULT_REFLECTION_CONFIG.enabled);
      expect(config.mode).toBe(DEFAULT_REFLECTION_CONFIG.mode);
    });
  });
});
