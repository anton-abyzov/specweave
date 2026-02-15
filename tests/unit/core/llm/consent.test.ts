/**
 * Consent Manager Unit Tests (TDD RED phase)
 *
 * Tests for external API key cost consent management.
 * Ensures users are never surprised by extra API charges.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

import {
  isExternalProvider,
  checkConsent,
  grantStandingConsent,
  FREE_PROVIDERS,
  ExternalApiConsentDeniedError,
} from '../../../../src/core/llm/consent.js';
import { createProvider } from '../../../../src/core/llm/provider-factory.js';
import type { LLMConfig } from '../../../../src/core/llm/types.js';

describe('consent', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `consent-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(path.join(testDir, '.specweave'), { recursive: true });
    configPath = path.join(testDir, '.specweave', 'config.json');
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  async function writeConfig(config: Record<string, unknown>): Promise<void> {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  describe('FREE_PROVIDERS', () => {
    it('should include claude-code', () => {
      expect(FREE_PROVIDERS.has('claude-code')).toBe(true);
    });

    it('should include ollama', () => {
      expect(FREE_PROVIDERS.has('ollama')).toBe(true);
    });

    it('should not include anthropic', () => {
      expect(FREE_PROVIDERS.has('anthropic')).toBe(false);
    });
  });

  describe('isExternalProvider', () => {
    it('should return false for claude-code', () => {
      expect(isExternalProvider('claude-code')).toBe(false);
    });

    it('should return false for ollama', () => {
      expect(isExternalProvider('ollama')).toBe(false);
    });

    it('should return true for anthropic', () => {
      expect(isExternalProvider('anthropic')).toBe(true);
    });

    it('should return true for openai', () => {
      expect(isExternalProvider('openai')).toBe(true);
    });

    it('should return true for azure-openai', () => {
      expect(isExternalProvider('azure-openai')).toBe(true);
    });

    it('should return true for bedrock', () => {
      expect(isExternalProvider('bedrock')).toBe(true);
    });

    it('should return true for vertex-ai', () => {
      expect(isExternalProvider('vertex-ai')).toBe(true);
    });
  });

  describe('checkConsent', () => {
    it('should grant consent for free providers regardless of config', async () => {
      await writeConfig({
        version: '2.0',
        externalModels: { consent: 'never', allowedProviders: [] },
      });
      expect(checkConsent('claude-code', testDir)).toBe('granted');
      expect(checkConsent('ollama', testDir)).toBe('granted');
    });

    it('should grant consent for any provider when consent=always-allow', async () => {
      await writeConfig({
        version: '2.0',
        externalModels: { consent: 'always-allow', allowedProviders: [] },
      });
      expect(checkConsent('anthropic', testDir)).toBe('granted');
      expect(checkConsent('openai', testDir)).toBe('granted');
    });

    it('should deny consent for all external providers when consent=never', async () => {
      await writeConfig({
        version: '2.0',
        externalModels: { consent: 'never', allowedProviders: [] },
      });
      expect(checkConsent('anthropic', testDir)).toBe('denied');
      expect(checkConsent('openai', testDir)).toBe('denied');
    });

    it('should grant when provider is in allowedProviders', async () => {
      await writeConfig({
        version: '2.0',
        externalModels: { consent: 'ask', allowedProviders: ['anthropic'] },
      });
      expect(checkConsent('anthropic', testDir)).toBe('granted');
    });

    it('should return ask when provider not in allowedProviders', async () => {
      await writeConfig({
        version: '2.0',
        externalModels: { consent: 'ask', allowedProviders: ['anthropic'] },
      });
      expect(checkConsent('openai', testDir)).toBe('ask');
    });

    it('should return ask when no externalModels config exists (default)', async () => {
      await writeConfig({ version: '2.0' });
      expect(checkConsent('anthropic', testDir)).toBe('ask');
    });

    it('should return ask when config file does not exist', () => {
      expect(checkConsent('anthropic', testDir)).toBe('ask');
    });
  });

  describe('grantStandingConsent', () => {
    it('should add provider to allowedProviders in config', async () => {
      await writeConfig({
        version: '2.0',
        externalModels: { consent: 'ask', allowedProviders: [] },
      });
      grantStandingConsent('anthropic', testDir);
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(config.externalModels.allowedProviders).toContain('anthropic');
    });

    it('should not duplicate existing providers', async () => {
      await writeConfig({
        version: '2.0',
        externalModels: { consent: 'ask', allowedProviders: ['anthropic'] },
      });
      grantStandingConsent('anthropic', testDir);
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(config.externalModels.allowedProviders.filter((p: string) => p === 'anthropic')).toHaveLength(1);
    });

    it('should create externalModels section if missing', async () => {
      await writeConfig({ version: '2.0' });
      grantStandingConsent('openai', testDir);
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(config.externalModels).toBeDefined();
      expect(config.externalModels.consent).toBe('ask');
      expect(config.externalModels.allowedProviders).toContain('openai');
    });
  });

  describe('ExternalApiConsentDeniedError', () => {
    it('should include provider name in message', () => {
      const error = new ExternalApiConsentDeniedError('anthropic');
      expect(error.message).toContain('anthropic');
      expect(error.provider).toBe('anthropic');
    });

    it('should be an instance of Error', () => {
      const error = new ExternalApiConsentDeniedError('openai');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('createProvider consent gate', () => {
    it('should throw ExternalApiConsentDeniedError when consent=never for anthropic', async () => {
      await writeConfig({
        version: '2.0',
        externalModels: { consent: 'never', allowedProviders: [] },
      });
      const config: LLMConfig = { provider: 'anthropic', model: 'opus' };
      await expect(createProvider(config, { projectRoot: testDir }))
        .rejects.toThrow(ExternalApiConsentDeniedError);
    });

    it('should throw ExternalApiConsentDeniedError when consent=ask and no standing permission', async () => {
      await writeConfig({
        version: '2.0',
        externalModels: { consent: 'ask', allowedProviders: [] },
      });
      const config: LLMConfig = { provider: 'openai', model: 'gpt-4o' };
      await expect(createProvider(config, { projectRoot: testDir }))
        .rejects.toThrow(ExternalApiConsentDeniedError);
    });

    it('should not throw for consent=always-allow (may fail for missing API key, not consent)', async () => {
      await writeConfig({
        version: '2.0',
        externalModels: { consent: 'always-allow', allowedProviders: [] },
      });
      const config: LLMConfig = { provider: 'anthropic', model: 'opus' };
      // Should pass consent gate but may fail for missing API key
      try {
        await createProvider(config, { projectRoot: testDir });
      } catch (error) {
        // Should NOT be a consent error — should be an API key error
        expect(error).not.toBeInstanceOf(ExternalApiConsentDeniedError);
      }
    });
  });
});
