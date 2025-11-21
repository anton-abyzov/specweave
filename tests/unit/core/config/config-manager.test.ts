/**
 * ConfigManager Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../../../../src/core/config/config-manager.js';
import { DEFAULT_CONFIG } from '../../../../src/core/config/types.js';
import type { SpecWeaveConfig } from '../../../../src/core/config/types.js';

describe('ConfigManager', () => {
  let testDir: string;
  let configManager: ConfigManager;
  let configPath: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), 'config-test-' + Date.now());
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

    it('should throw error for malformed JSON', async () => {
      await fs.writeFile(configPath, 'invalid json {');
      await expect(configManager.read()).rejects.toThrow(/Failed to read config/);
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
});
