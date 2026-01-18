/**
 * Auto Configuration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadAutoConfig,
  saveAutoConfig,
  isAutoEnabled,
  getEffectiveMode,
} from '../../../src/core/auto/config.js';
import { DEFAULT_AUTO_CONFIG, DEFAULT_PARALLEL_AUTO_CONFIG } from '../../../src/core/auto/types.js';

describe('Auto Config', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('loadAutoConfig', () => {
    it('should return defaults when no config file exists', () => {
      const result = loadAutoConfig(tempDir);

      expect(result.source).toBe('defaults');
      expect(result.config).toEqual(DEFAULT_AUTO_CONFIG);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return defaults when config has no auto section', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }), 'utf-8');

      const result = loadAutoConfig(tempDir);

      expect(result.source).toBe('defaults');
      expect(result.config.enabled).toBe(true);
    });

    it('should merge partial config with defaults', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            maxIterations: 50,
            coverageThreshold: 90,
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.source).toBe('merged');
      expect(result.config.maxIterations).toBe(50);
      expect(result.config.coverageThreshold).toBe(90);
      expect(result.config.testCommand).toBe('npm test'); // Default preserved
    });

    it('should warn for invalid maxIterations', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            maxIterations: 0,
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.warnings).toContain('maxIterations must be >= 1, using default');
      expect(result.config.maxIterations).toBe(2500);
    });

    it('should cap maxIterations at 5000', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            maxIterations: 10000,
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.warnings).toContain('maxIterations exceeds 5000, capping at 5000');
      expect(result.config.maxIterations).toBe(5000);
    });

    it('should throw for invalid JSON', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, 'invalid json{', 'utf-8');

      expect(() => loadAutoConfig(tempDir)).toThrow('Failed to load auto config');
    });

    it('should merge humanGated config', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            humanGated: {
              patterns: ['custom-deploy', 'danger'],
              timeout: 3600,
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.config.humanGated.patterns).toEqual(['custom-deploy', 'danger']);
      expect(result.config.humanGated.timeout).toBe(3600);
    });

    it('should merge circuitBreakers config', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            circuitBreakers: {
              failureThreshold: 5,
              resetTimeout: 600,
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.config.circuitBreakers.failureThreshold).toBe(5);
      expect(result.config.circuitBreakers.resetTimeout).toBe(600);
    });
  });

  describe('saveAutoConfig', () => {
    it('should create config file when none exists', () => {
      saveAutoConfig(tempDir, { maxIterations: 75 });

      const configPath = path.join(tempDir, '.specweave/config.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(content.auto.maxIterations).toBe(75);
    });

    it('should merge with existing config', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          project: { name: 'test' },
          auto: { enabled: true },
        }),
        'utf-8'
      );

      saveAutoConfig(tempDir, { maxIterations: 75 });

      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(content.project.name).toBe('test');
      expect(content.auto.enabled).toBe(true);
      expect(content.auto.maxIterations).toBe(75);
    });
  });

  describe('isAutoEnabled', () => {
    it('should return true by default', () => {
      expect(isAutoEnabled(tempDir)).toBe(true);
    });

    it('should return false when disabled in config', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({ auto: { enabled: false } }),
        'utf-8'
      );

      expect(isAutoEnabled(tempDir)).toBe(false);
    });
  });

  describe('getEffectiveMode', () => {
    it('should return auto mode by default', () => {
      const result = getEffectiveMode(tempDir, {});

      expect(result.mode).toBe('auto');
      expect(result.simple).toBe(false);
    });

    it('should return manual mode when --manual flag set', () => {
      const result = getEffectiveMode(tempDir, { manual: true });

      expect(result.mode).toBe('manual');
    });

    it('should return auto mode when --auto flag set', () => {
      // Disable in config
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({ auto: { enabled: false } }),
        'utf-8'
      );

      const result = getEffectiveMode(tempDir, { auto: true });

      expect(result.mode).toBe('auto');
    });

    it('should set simple mode when --simple flag set', () => {
      const result = getEffectiveMode(tempDir, { auto: true, simple: true });

      expect(result.mode).toBe('auto');
      expect(result.simple).toBe(true);
    });

    it('should use config default when no flags', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({ auto: { enabled: false } }),
        'utf-8'
      );

      const result = getEffectiveMode(tempDir, {});

      expect(result.mode).toBe('manual');
    });
  });

  // ========================================================================
  // PARALLEL CONFIG TESTS
  // ========================================================================

  describe('Parallel Config', () => {
    it('should return default parallel config when no parallel section exists', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({ auto: { enabled: true } }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      // Default AUTO_CONFIG should have parallel section
      expect(result.config.parallel).toBeDefined();
      expect(result.config.parallel?.enabled).toBe(false);
      expect(result.config.parallel?.maxParallel).toBe(3);
    });

    it('should merge partial parallel config with defaults', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            parallel: {
              enabled: true,
              maxParallel: 5,
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.config.parallel?.enabled).toBe(true);
      expect(result.config.parallel?.maxParallel).toBe(5);
      expect(result.config.parallel?.defaultMergeStrategy).toBe('auto'); // Default preserved
      expect(result.config.parallel?.defaultBaseBranch).toBe('main'); // Default preserved
    });

    it('should parse all parallel config fields', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            parallel: {
              enabled: true,
              maxParallel: 4,
              defaultDomains: ['frontend', 'backend'],
              defaultMergeStrategy: 'pr',
              defaultBaseBranch: 'develop',
              createPR: true,
              draftPR: true,
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.config.parallel?.enabled).toBe(true);
      expect(result.config.parallel?.maxParallel).toBe(4);
      expect(result.config.parallel?.defaultDomains).toEqual(['frontend', 'backend']);
      expect(result.config.parallel?.defaultMergeStrategy).toBe('pr');
      expect(result.config.parallel?.defaultBaseBranch).toBe('develop');
      expect(result.config.parallel?.createPR).toBe(true);
      expect(result.config.parallel?.draftPR).toBe(true);
    });

    it('should cap maxParallel at 10', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            parallel: {
              maxParallel: 100,
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.warnings).toContain('parallel.maxParallel exceeds 10, capping at 10');
      expect(result.config.parallel?.maxParallel).toBe(10);
    });

    it('should warn for maxParallel less than 1', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            parallel: {
              maxParallel: 0,
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.warnings).toContain('parallel.maxParallel must be >= 1, using default');
      // When maxParallel < 1, clampWithWarning returns undefined, so default from DEFAULT_AUTO_CONFIG is preserved
      expect(result.config.parallel?.maxParallel).toBe(DEFAULT_PARALLEL_AUTO_CONFIG.maxParallel);
    });

    it('should filter invalid domains from defaultDomains', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            parallel: {
              defaultDomains: ['frontend', 'invalid-domain', 'backend'],
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      // Only valid domains should be kept
      expect(result.config.parallel?.defaultDomains).toEqual(['frontend', 'backend']);
    });

    it('should warn when all domains are invalid', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            parallel: {
              defaultDomains: ['invalid', 'also-invalid'],
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.warnings).toContain('parallel.defaultDomains contains invalid domains, using default');
      expect(result.config.parallel?.defaultDomains).toEqual([]); // Default empty
    });

    it('should ignore invalid merge strategy values', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            parallel: {
              defaultMergeStrategy: 'invalid-strategy',
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      // Should use default when invalid
      expect(result.config.parallel?.defaultMergeStrategy).toBe('auto');
    });

    it('should accept manual merge strategy', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            parallel: {
              defaultMergeStrategy: 'manual',
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.config.parallel?.defaultMergeStrategy).toBe('manual');
    });

    it('should trim whitespace from defaultBaseBranch', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            parallel: {
              defaultBaseBranch: '  develop  ',
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.config.parallel?.defaultBaseBranch).toBe('develop');
    });

    it('should ignore empty defaultBaseBranch string', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            parallel: {
              defaultBaseBranch: '   ',
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      // Should use default when empty
      expect(result.config.parallel?.defaultBaseBranch).toBe('main');
    });

    it('should accept all valid domain types', () => {
      const configPath = path.join(tempDir, '.specweave/config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          auto: {
            parallel: {
              defaultDomains: ['frontend', 'backend', 'database', 'devops', 'qa', 'general'],
            },
          },
        }),
        'utf-8'
      );

      const result = loadAutoConfig(tempDir);

      expect(result.config.parallel?.defaultDomains).toEqual([
        'frontend', 'backend', 'database', 'devops', 'qa', 'general'
      ]);
    });

    it('should save parallel config', () => {
      saveAutoConfig(tempDir, {
        parallel: {
          enabled: true,
          maxParallel: 6,
          createPR: true,
        },
      });

      const configPath = path.join(tempDir, '.specweave/config.json');
      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(content.auto.parallel.enabled).toBe(true);
      expect(content.auto.parallel.maxParallel).toBe(6);
      expect(content.auto.parallel.createPR).toBe(true);
    });
  });
});
