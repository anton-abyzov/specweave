/**
 * Unit tests for Import Configuration Loader (T-027)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadImportConfig,
  loadFromEnvironment,
  validateImportConfig,
  saveImportConfig,
  getExampleImportConfig,
  DEFAULT_IMPORT_CONFIG
} from '../../../src/config/import-config.js';
import type { ImportConfig, ProjectConfig } from '../../../src/config/import-config.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('Import Configuration (T-027)', () => {
  let testDir: string;

  beforeEach(() => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `import-config-test-${Date.now()}`);
    fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });

    // Clear environment variables
    delete process.env.SPECWEAVE_IMPORT_ENABLED;
    delete process.env.SPECWEAVE_IMPORT_TIME_RANGE_MONTHS;
    delete process.env.SPECWEAVE_IMPORT_PAGE_SIZE;
  });

  afterEach(() => {
    // Cleanup
    try {
      fs.removeSync(testDir);
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clear environment variables
    delete process.env.SPECWEAVE_IMPORT_ENABLED;
    delete process.env.SPECWEAVE_IMPORT_TIME_RANGE_MONTHS;
    delete process.env.SPECWEAVE_IMPORT_PAGE_SIZE;
  });

  describe('TC-075: Load config from file', () => {
    it('should load default config if no file exists', () => {
      const config = loadImportConfig(testDir);

      expect(config.enabled).toBe(true);
      expect(config.timeRangeMonths).toBe(1);
      expect(config.pageSize).toBe(100);
    });

    it('should load config from .specweave/config.json', () => {
      const projectConfig: ProjectConfig = {
        project: { name: 'test' },
        externalImport: {
          enabled: false,
          timeRangeMonths: 6,
          pageSize: 50,
          github: {
            labelFilter: ['bug', 'enhancement'],
            stateFilter: ['open']
          }
        }
      };

      fs.writeJsonSync(
        path.join(testDir, '.specweave', 'config.json'),
        projectConfig,
        { spaces: 2 }
      );

      const config = loadImportConfig(testDir);

      expect(config.enabled).toBe(false);
      expect(config.timeRangeMonths).toBe(6);
      expect(config.pageSize).toBe(50);
      expect(config.github?.labelFilter).toEqual(['bug', 'enhancement']);
      expect(config.github?.stateFilter).toEqual(['open']);
    });

    it('should handle invalid config file gracefully', () => {
      // Write invalid JSON
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        'invalid json content'
      );

      const config = loadImportConfig(testDir);

      // Should fall back to defaults
      expect(config).toEqual(DEFAULT_IMPORT_CONFIG);
    });

    it('should merge config with defaults', () => {
      const projectConfig: ProjectConfig = {
        externalImport: {
          timeRangeMonths: 12,
          // Other fields use defaults
          enabled: true,
          pageSize: 100
        }
      };

      fs.writeJsonSync(
        path.join(testDir, '.specweave', 'config.json'),
        projectConfig
      );

      const config = loadImportConfig(testDir);

      expect(config.timeRangeMonths).toBe(12);
      expect(config.enabled).toBe(true); // From config
      expect(config.pageSize).toBe(100); // From defaults
    });
  });

  describe('TC-076: Override with environment variables', () => {
    it('should override enabled from environment', () => {
      process.env.SPECWEAVE_IMPORT_ENABLED = 'false';

      const config = loadImportConfig(testDir);

      expect(config.enabled).toBe(false);
    });

    it('should override timeRangeMonths from environment', () => {
      process.env.SPECWEAVE_IMPORT_TIME_RANGE_MONTHS = '6';

      const config = loadImportConfig(testDir);

      expect(config.timeRangeMonths).toBe(6);
    });

    it('should override pageSize from environment', () => {
      process.env.SPECWEAVE_IMPORT_PAGE_SIZE = '200';

      const config = loadImportConfig(testDir);

      expect(config.pageSize).toBe(200);
    });

    it('should override config file with environment variables', () => {
      // Config file
      const projectConfig: ProjectConfig = {
        externalImport: {
          enabled: true,
          timeRangeMonths: 1,
          pageSize: 100
        }
      };
      fs.writeJsonSync(path.join(testDir, '.specweave', 'config.json'), projectConfig);

      // Environment overrides
      process.env.SPECWEAVE_IMPORT_ENABLED = 'false';
      process.env.SPECWEAVE_IMPORT_TIME_RANGE_MONTHS = '12';

      const config = loadImportConfig(testDir);

      expect(config.enabled).toBe(false); // From env
      expect(config.timeRangeMonths).toBe(12); // From env
      expect(config.pageSize).toBe(100); // From file
    });

    it('should ignore invalid environment variable values', () => {
      process.env.SPECWEAVE_IMPORT_TIME_RANGE_MONTHS = 'invalid';
      process.env.SPECWEAVE_IMPORT_PAGE_SIZE = 'abc';

      const config = loadImportConfig(testDir);

      // Should use defaults when env values are invalid
      expect(config.timeRangeMonths).toBe(1);
      expect(config.pageSize).toBe(100);
    });

    it('should reject page size > 1000', () => {
      process.env.SPECWEAVE_IMPORT_PAGE_SIZE = '2000';

      const config = loadImportConfig(testDir);

      // Should ignore invalid value
      expect(config.pageSize).toBe(100);
    });

    it('should load all environment variables', () => {
      process.env.SPECWEAVE_IMPORT_ENABLED = 'false';
      process.env.SPECWEAVE_IMPORT_TIME_RANGE_MONTHS = '3';
      process.env.SPECWEAVE_IMPORT_PAGE_SIZE = '50';

      const envConfig = loadFromEnvironment();

      expect(envConfig.enabled).toBe(false);
      expect(envConfig.timeRangeMonths).toBe(3);
      expect(envConfig.pageSize).toBe(50);
    });
  });

  describe('TC-077: Validate config schema', () => {
    it('should validate valid configuration', () => {
      const config: ImportConfig = {
        enabled: true,
        timeRangeMonths: 6,
        pageSize: 100
      };

      expect(() => validateImportConfig(config)).not.toThrow();
    });

    it('should reject invalid timeRangeMonths (too low)', () => {
      const config: ImportConfig = {
        enabled: true,
        timeRangeMonths: 0,
        pageSize: 100
      };

      expect(() => validateImportConfig(config)).toThrow('Invalid timeRangeMonths');
    });

    it('should reject invalid timeRangeMonths (too high)', () => {
      const config: ImportConfig = {
        enabled: true,
        timeRangeMonths: 200,
        pageSize: 100
      };

      expect(() => validateImportConfig(config)).toThrow('Invalid timeRangeMonths');
    });

    it('should reject invalid pageSize (too low)', () => {
      const config: ImportConfig = {
        enabled: true,
        timeRangeMonths: 1,
        pageSize: 0
      };

      expect(() => validateImportConfig(config)).toThrow('Invalid pageSize');
    });

    it('should reject invalid pageSize (too high)', () => {
      const config: ImportConfig = {
        enabled: true,
        timeRangeMonths: 1,
        pageSize: 2000
      };

      expect(() => validateImportConfig(config)).toThrow('Invalid pageSize');
    });

    it('should validate GitHub stateFilter', () => {
      const validConfig: ImportConfig = {
        enabled: true,
        timeRangeMonths: 1,
        pageSize: 100,
        github: {
          stateFilter: ['open', 'closed']
        }
      };

      expect(() => validateImportConfig(validConfig)).not.toThrow();
    });

    it('should reject invalid GitHub stateFilter', () => {
      const invalidConfig: ImportConfig = {
        enabled: true,
        timeRangeMonths: 1,
        pageSize: 100,
        github: {
          stateFilter: ['invalid' as any, 'open']
        }
      };

      expect(() => validateImportConfig(invalidConfig)).toThrow('Invalid GitHub stateFilter');
    });
  });

  describe('Save Configuration', () => {
    it('should save import config to file', () => {
      const config: ImportConfig = {
        enabled: false,
        timeRangeMonths: 6,
        pageSize: 200,
        github: {
          labelFilter: ['feature']
        }
      };

      saveImportConfig(testDir, config);

      const configPath = path.join(testDir, '.specweave', 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const savedConfig: ProjectConfig = fs.readJsonSync(configPath);
      expect(savedConfig.externalImport).toEqual(config);
    });

    it('should preserve existing config sections', () => {
      // Write initial config
      const initialConfig: ProjectConfig = {
        project: { name: 'test' },
        adapters: { default: 'claude' }
      };
      fs.writeJsonSync(path.join(testDir, '.specweave', 'config.json'), initialConfig);

      // Save import config
      const importConfig: ImportConfig = {
        enabled: true,
        timeRangeMonths: 3,
        pageSize: 100
      };
      saveImportConfig(testDir, importConfig);

      // Read back
      const savedConfig: ProjectConfig = fs.readJsonSync(
        path.join(testDir, '.specweave', 'config.json')
      );

      expect(savedConfig.project).toEqual({ name: 'test' });
      expect(savedConfig.adapters).toEqual({ default: 'claude' });
      expect(savedConfig.externalImport).toEqual(importConfig);
    });

    it('should create config file if not exists', () => {
      const config: ImportConfig = {
        enabled: true,
        timeRangeMonths: 1,
        pageSize: 100
      };

      saveImportConfig(testDir, config);

      const configPath = path.join(testDir, '.specweave', 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);
    });
  });

  describe('Example Configuration', () => {
    it('should provide valid example config', () => {
      const example = getExampleImportConfig();

      expect(example.enabled).toBe(true);
      expect(example.timeRangeMonths).toBeGreaterThan(0);
      expect(example.pageSize).toBeGreaterThan(0);
      expect(example.github).toBeDefined();
      expect(example.jira).toBeDefined();
      expect(example.ado).toBeDefined();

      // Example should be valid
      expect(() => validateImportConfig(example)).not.toThrow();
    });
  });
});
