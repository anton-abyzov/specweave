/**
 * ConfigManager Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../../../../src/core/config/config-manager.js';
import { DEFAULT_CONFIG } from '../../../../src/core/config/types.js';
import type { SpecWeaveConfig, SpecweaveConfig } from '../../../../src/core/config/types.js';

describe('ConfigManager', () => {
  let testDir: string;
  let configManager: ConfigManager;
  let configPath: string;

  beforeEach(async () => {
    // ✅ SAFE: Isolated test directory with unique ID (prevents race conditions)
    testDir = path.join(os.tmpdir(), `config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, '.specweave'), { recursive: true });
    configPath = path.join(testDir, '.specweave', 'config.json');
    configManager = new ConfigManager(testDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('read()', () => {
    it('should return default config when file does not exist', async () => {
      const config = await configManager.read();
      expect(config).toEqual(DEFAULT_CONFIG);
      expect(config.version).toBe('2.0');
    });

    it('should read existing config file', async () => {
      const testConfig: SpecWeaveConfig = {
        version: '2.0',
        repository: { provider: 'github', organization: 'test-org' },
        issueTracker: { provider: 'jira', domain: 'test.atlassian.net', strategy: 'project-per-team' }
      };
      await fs.writeFile(configPath, JSON.stringify(testConfig, null, 2));
      const config = await configManager.read();
      expect(config.repository?.provider).toBe('github');
      expect(config.issueTracker?.domain).toBe('test.atlassian.net');
    });

    it('should merge with defaults for backward compatibility', async () => {
      const partialConfig = {
        version: '2.0',
        issueTracker: { provider: 'jira' as const, domain: 'test.atlassian.net' }
      };
      await fs.writeFile(configPath, JSON.stringify(partialConfig, null, 2));
      const config = await configManager.read();
      expect(config.issueTracker?.provider).toBe('jira');
      expect(config.repository?.provider).toBe('local');
    });

    it('should throw specific error for malformed JSON', async () => {
      await fs.writeFile(configPath, 'invalid json {');
      await expect(configManager.read()).rejects.toThrow(/Invalid JSON in config\.json/);
    });

    it('should throw error with JSON error details', async () => {
      await fs.writeFile(configPath, '{ "version": "2.0", missing-quotes }');
      try {
        await configManager.read();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid JSON in config.json');
        // Check that it includes some parse context
        expect((error as Error).message).toMatch(/Unexpected|Expected|position/i);
      }
    });
  });

  describe('readSync()', () => {
    it('should return default config when file does not exist', () => {
      const config = configManager.readSync();
      expect(config).toEqual(DEFAULT_CONFIG);
      expect(config.version).toBe('2.0');
    });

    it('should read existing config file synchronously', async () => {
      const testConfig: SpecWeaveConfig = {
        version: '2.0',
        repository: { provider: 'github', organization: 'test-org' }
      };
      await fs.writeFile(configPath, JSON.stringify(testConfig, null, 2));
      const config = configManager.readSync();
      expect(config.repository?.provider).toBe('github');
      expect(config.repository?.organization).toBe('test-org');
    });

    it('should throw specific error for malformed JSON (sync)', async () => {
      await fs.writeFile(configPath, '{ not valid json }');
      expect(() => configManager.readSync()).toThrow(/Invalid JSON in config\.json/);
    });
  });

  describe('write()', () => {
    it('should write valid config to file', async () => {
      const testConfig: SpecWeaveConfig = {
        version: '2.0',
        repository: { provider: 'github', organization: 'test-org' }
      };
      await configManager.write(testConfig);
      const fileContent = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      expect(parsed.repository.provider).toBe('github');
    });

    it('should validate config before writing', async () => {
      const invalidConfig: any = {
        version: '',
        repository: { provider: 'invalid-provider' as any }
      };
      await expect(configManager.write(invalidConfig)).rejects.toThrow(/Invalid configuration/);
    });
  });

  describe('update()', () => {
    it('should merge partial config', async () => {
      const initial: SpecWeaveConfig = {
        version: '2.0',
        repository: { provider: 'local' }
      };
      await configManager.write(initial);
      await configManager.update({
        issueTracker: { provider: 'jira', domain: 'test.atlassian.net' }
      });
      const config = await configManager.read();
      expect(config.repository?.provider).toBe('local');
      expect(config.issueTracker?.provider).toBe('jira');
    });
  });

  describe('get() and set()', () => {
    beforeEach(async () => {
      await configManager.write({
        version: '2.0',
        issueTracker: { provider: 'jira', domain: 'test.atlassian.net' }
      });
    });

    it('should get nested value', async () => {
      const provider = await configManager.get('issueTracker.provider');
      expect(provider).toBe('jira');
    });

    it('should set nested value', async () => {
      await configManager.set('issueTracker.domain', 'new.atlassian.net');
      const config = await configManager.read();
      expect(config.issueTracker?.domain).toBe('new.atlassian.net');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 0188: Unified config type consolidation tests
  // ═══════════════════════════════════════════════════════════════════

  describe('unified config type (0188)', () => {
    it('should export SpecweaveConfig as alias for SpecWeaveConfig', () => {
      // SpecweaveConfig (camelCase) should be available from config/types.ts
      // This is the canonical name used by 25+ files in the old system
      const config: SpecweaveConfig = { version: '2.0' };
      const configAlt: SpecWeaveConfig = config;
      expect(configAlt.version).toBe('2.0');
    });

    it('should have testing config in DEFAULT_CONFIG', () => {
      // The comprehensive DEFAULT_CONFIG should include testing settings
      const config = DEFAULT_CONFIG as any;
      expect(config.testing).toBeDefined();
      expect(config.testing.defaultTestMode).toBe('TDD');
      expect(config.testing.defaultCoverageTarget).toBe(90);
      expect(config.testing.coverageTargets).toBeDefined();
      expect(config.testing.coverageTargets.unit).toBe(95);
    });

    it('should have limits config in DEFAULT_CONFIG', () => {
      const config = DEFAULT_CONFIG as any;
      expect(config.limits).toBeDefined();
      expect(config.limits.maxActiveIncrements).toBe(1);
      expect(config.limits.hardCap).toBe(3);
      expect(config.limits.allowEmergencyInterrupt).toBe(true);
    });

    it('should have archiving config in DEFAULT_CONFIG', () => {
      const config = DEFAULT_CONFIG as any;
      expect(config.archiving).toBeDefined();
      expect(config.archiving.keepLast).toBe(5);
      expect(config.archiving.autoArchive).toBe(false);
    });

    it('should have planning config in DEFAULT_CONFIG', () => {
      const config = DEFAULT_CONFIG as any;
      expect(config.planning).toBeDefined();
      expect(config.planning.deepInterview).toBeDefined();
      expect(config.planning.deepInterview.enabled).toBe(false);
      expect(config.planning.deepInterview.minQuestions).toBe(5);
    });

    it('should have livingDocs config in DEFAULT_CONFIG', () => {
      const config = DEFAULT_CONFIG as any;
      expect(config.livingDocs).toBeDefined();
      expect(config.livingDocs.copyBasedSync).toBeDefined();
      expect(config.livingDocs.threeLayerSync).toBeDefined();
    });

    it('should have pluginAutoLoad config in DEFAULT_CONFIG', () => {
      const config = DEFAULT_CONFIG as any;
      expect(config.pluginAutoLoad).toBeDefined();
      expect(config.pluginAutoLoad.enabled).toBe(true);
    });

    it('should have deduplication config in DEFAULT_CONFIG', () => {
      const config = DEFAULT_CONFIG as any;
      expect(config.deduplication).toBeDefined();
      expect(config.deduplication.enabled).toBe(true);
      expect(config.deduplication.windowMs).toBe(1000);
    });

    it('should have language and translation defaults in DEFAULT_CONFIG', () => {
      const config = DEFAULT_CONFIG as any;
      expect(config.language).toBe('en');
      expect(config.translation).toBeDefined();
      expect(config.translation.primary).toBe('en');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 0188 Phase 2: CI/CD Config Schema (US-002)
  // ═══════════════════════════════════════════════════════════════════

  describe('CiCdConfig type and defaults (0188 T-007)', () => {
    it('should have cicd section in DEFAULT_CONFIG', () => {
      const config = DEFAULT_CONFIG as any;
      expect(config.cicd).toBeDefined();
    });

    it('should have pushStrategy defaulting to direct', () => {
      const config = DEFAULT_CONFIG as any;
      expect(config.cicd.pushStrategy).toBe('direct');
    });

    it('should have autoFix.enabled defaulting to true', () => {
      const config = DEFAULT_CONFIG as any;
      expect(config.cicd.autoFix).toBeDefined();
      expect(config.cicd.autoFix.enabled).toBe(true);
    });

    it('should have autoFix.maxRetries defaulting to 1', () => {
      const config = DEFAULT_CONFIG as any;
      expect(config.cicd.autoFix.maxRetries).toBe(1);
    });

    it('should have autoFix.allowedBranches defaulting to develop and main', () => {
      const config = DEFAULT_CONFIG as any;
      expect(config.cicd.autoFix.allowedBranches).toEqual(['develop', 'main']);
    });
  });

  describe('validate()', () => {
    it('should validate valid config', () => {
      const valid: SpecWeaveConfig = { version: '2.0', repository: { provider: 'github' } };
      const result = configManager.validate(valid);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing version', () => {
      const invalid: any = { repository: { provider: 'local' } };
      const result = configManager.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'version')).toBe(true);
    });

    it('should detect invalid provider', () => {
      const invalid: SpecWeaveConfig = {
        version: '2.0',
        repository: { provider: 'invalid-provider' as any }
      };
      const result = configManager.validate(invalid);
      expect(result.valid).toBe(false);
    });

    it('should detect missing Jira domain', () => {
      const invalid: SpecWeaveConfig = {
        version: '2.0',
        issueTracker: { provider: 'jira' }
      };
      const result = configManager.validate(invalid);
      expect(result.valid).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 0188: Backward-compat method aliases (old ConfigManager API)
  // ═══════════════════════════════════════════════════════════════════

  describe('backward-compat methods (0188)', () => {
    it('load() should return config synchronously', () => {
      const config = (configManager as any).load();
      expect(config).toBeDefined();
      expect(config.version).toBe('2.0');
    });

    it('loadAsync() should return config asynchronously', async () => {
      const config = await (configManager as any).loadAsync();
      expect(config).toBeDefined();
      expect(config.version).toBe('2.0');
    });

    it('save() should persist config', async () => {
      const testConfig: SpecWeaveConfig = {
        version: '2.0',
        repository: { provider: 'github', organization: 'test-org' }
      };
      await (configManager as any).save(testConfig);
      const loaded = (configManager as any).load();
      expect(loaded.repository?.provider).toBe('github');
    });

    it('saveSync() should persist config synchronously', () => {
      const testConfig: SpecWeaveConfig = {
        version: '2.0',
        repository: { provider: 'local' }
      };
      (configManager as any).saveSync(testConfig);
      configManager.clearCache();
      const loaded = (configManager as any).load();
      expect(loaded.repository?.provider).toBe('local');
    });

    it('getConfigPath() should return config file path', () => {
      const configPath = (configManager as any).getConfigPath();
      expect(configPath).toContain('.specweave');
      expect(configPath).toContain('config.json');
    });
  });
});
