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
      // 2.0 defaults are merged in for keys the user did not set
      expect(config.testing?.mode).toBe('TDD');
      expect(config.livingDocs).toBe(false);
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

  describe('2.0 config surface', () => {
    it('should export SpecweaveConfig as alias for SpecWeaveConfig', () => {
      const config: SpecweaveConfig = { version: '2.0' };
      const configAlt: SpecWeaveConfig = config;
      expect(configAlt.version).toBe('2.0');
    });

    it('DEFAULT_CONFIG carries exactly the 2.0 keys', () => {
      expect(Object.keys(DEFAULT_CONFIG).sort()).toEqual(
        ['adapters', 'limits', 'livingDocs', 'planning', 'sync', 'testing', 'version'].sort(),
      );
    });

    it('has the 2.0 testing shape', () => {
      expect(DEFAULT_CONFIG.testing?.mode).toBe('TDD');
      expect(DEFAULT_CONFIG.testing?.commands).toEqual([]);
      expect(DEFAULT_CONFIG.testing?.coverage?.unit).toBe(95);
    });

    it('has an advisory limits block with no hard cap', () => {
      expect(DEFAULT_CONFIG.limits?.activeIncrements).toBe(3);
      expect((DEFAULT_CONFIG.limits as Record<string, unknown>).hardCap).toBeUndefined();
    });

    it('has planning.deepInterview as an enum defaulting to off', () => {
      expect(DEFAULT_CONFIG.planning?.deepInterview).toBe('off');
    });

    it('has livingDocs off by default', () => {
      expect(DEFAULT_CONFIG.livingDocs).toBe(false);
    });

    it('drops every 1.x key that had no reader', () => {
      const config = DEFAULT_CONFIG as Record<string, unknown>;
      for (const key of [
        'archiving', 'deduplication', 'pluginAutoLoad', 'language', 'translation',
        'contextBudget', 'quality', 'cache', 'apiDocs', 'statusLine', 'incrementAssist',
        'documentation', 'grill', 'codeReview', 'qualityGates', 'skillGen', 'cicd',
      ]) {
        expect(config[key]).toBeUndefined();
      }
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
