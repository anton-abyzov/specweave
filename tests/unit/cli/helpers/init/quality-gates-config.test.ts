/**
 * Tests for Quality Gates Configuration during init
 * TDD RED Phase: Tests written first
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Import the module under test
import {
  promptQualityGatesConfig,
  updateConfigWithQualityGates,
  getQualityGatePreset,
  type QualityGatesConfigResult,
  type QualityGatePreset,
} from '../../../../../src/cli/helpers/init/quality-gates-config.js';

// Mock inquirer prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
}));

import { select, confirm } from '@inquirer/prompts';

describe('quality-gates-config', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-quality-gates-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('getQualityGatePreset', () => {
    it('should return production preset with all gates enabled', () => {
      const preset = getQualityGatePreset('production');

      expect(preset).toEqual({
        requireTests: true,
        requireValidation: true,
        requireLLMEval: true,
        requireJudgeLLM: false, // Too heavy for every run
        requireGrill: true,
        skipQualityGates: false,
      });
    });

    it('should return standard preset with tests and validation', () => {
      const preset = getQualityGatePreset('standard');

      expect(preset).toEqual({
        requireTests: true,
        requireValidation: true,
        requireLLMEval: false,
        requireJudgeLLM: false,
        requireGrill: true,
        skipQualityGates: false,
      });
    });

    it('should return minimal preset with validation only', () => {
      const preset = getQualityGatePreset('minimal');

      expect(preset).toEqual({
        requireTests: false,
        requireValidation: true,
        requireLLMEval: false,
        requireJudgeLLM: false,
        requireGrill: false,
        skipQualityGates: false,
      });
    });

    it('should return none preset with all gates disabled', () => {
      const preset = getQualityGatePreset('none');

      expect(preset).toEqual({
        requireTests: false,
        requireValidation: false,
        requireLLMEval: false,
        requireJudgeLLM: false,
        requireGrill: false,
        skipQualityGates: true,
      });
    });
  });

  describe('promptQualityGatesConfig', () => {
    it('should return production preset when selected', async () => {
      vi.mocked(select).mockResolvedValueOnce('production');

      const result = await promptQualityGatesConfig('en');

      expect(result.preset).toBe('production');
      expect(result.requireTests).toBe(true);
      expect(result.requireValidation).toBe(true);
      expect(result.requireLLMEval).toBe(true);
    });

    it('should return standard preset when selected', async () => {
      vi.mocked(select).mockResolvedValueOnce('standard');

      const result = await promptQualityGatesConfig('en');

      expect(result.preset).toBe('standard');
      expect(result.requireTests).toBe(true);
      expect(result.requireValidation).toBe(true);
      expect(result.requireLLMEval).toBe(false);
    });

    it('should return minimal preset when selected', async () => {
      vi.mocked(select).mockResolvedValueOnce('minimal');

      const result = await promptQualityGatesConfig('en');

      expect(result.preset).toBe('minimal');
      expect(result.requireTests).toBe(false);
      expect(result.requireValidation).toBe(true);
    });

    it('should return none preset when selected (hackathon mode)', async () => {
      vi.mocked(select).mockResolvedValueOnce('none');

      const result = await promptQualityGatesConfig('en');

      expect(result.preset).toBe('none');
      expect(result.requireTests).toBe(false);
      expect(result.requireValidation).toBe(false);
      expect(result.skipQualityGates).toBe(true);
    });

    it('should support go-back action', async () => {
      vi.mocked(select).mockResolvedValueOnce('back');

      const result = await promptQualityGatesConfig('en');

      expect(result.goBack).toBeDefined();
    });

    it('should support Russian language', async () => {
      vi.mocked(select).mockResolvedValueOnce('production');

      const result = await promptQualityGatesConfig('ru');

      expect(result.preset).toBe('production');
    });
  });

  describe('updateConfigWithQualityGates', () => {
    it('should update config.json with quality gate settings', () => {
      // Create test config
      const configDir = path.join(tmpDir, '.specweave');
      fs.mkdirSync(configDir, { recursive: true });
      const configPath = path.join(configDir, 'config.json');
      const initialConfig = {
        version: '2.0',
        project: { name: 'test' },
        auto: {
          enabled: true,
          maxRetries: 20,
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));

      // Update config
      updateConfigWithQualityGates(tmpDir, 'production', 'en');

      // Read and verify
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(updatedConfig.auto.requireTests).toBe(true);
      expect(updatedConfig.auto.requireValidation).toBe(true);
      expect(updatedConfig.auto.requireLLMEval).toBe(true);
      expect(updatedConfig.auto.requireJudgeLLM).toBe(false);
      expect(updatedConfig.auto.skipQualityGates).toBe(false);
    });

    it('should update config.json with minimal settings', () => {
      // Create test config
      const configDir = path.join(tmpDir, '.specweave');
      fs.mkdirSync(configDir, { recursive: true });
      const configPath = path.join(configDir, 'config.json');
      const initialConfig = {
        version: '2.0',
        project: { name: 'test' },
        auto: {
          enabled: true,
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));

      // Update config
      updateConfigWithQualityGates(tmpDir, 'minimal', 'en');

      // Read and verify
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(updatedConfig.auto.requireTests).toBe(false);
      expect(updatedConfig.auto.requireValidation).toBe(true);
      expect(updatedConfig.auto.requireLLMEval).toBe(false);
    });

    it('should preserve existing auto config properties', () => {
      // Create test config with custom settings
      const configDir = path.join(tmpDir, '.specweave');
      fs.mkdirSync(configDir, { recursive: true });
      const configPath = path.join(configDir, 'config.json');
      const initialConfig = {
        version: '2.0',
        project: { name: 'test' },
        auto: {
          enabled: true,
          maxRetries: 50,
          maxTurns: 100,
          testCommand: 'yarn test',
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));

      // Update config
      updateConfigWithQualityGates(tmpDir, 'standard', 'en');

      // Read and verify existing properties are preserved
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(updatedConfig.auto.maxRetries).toBe(50);
      expect(updatedConfig.auto.maxTurns).toBe(100);
      expect(updatedConfig.auto.testCommand).toBe('yarn test');
      expect(updatedConfig.auto.requireTests).toBe(true);
    });

    it('should handle missing config.json gracefully', () => {
      // Don't create config - should not throw
      expect(() => {
        updateConfigWithQualityGates(tmpDir, 'production', 'en');
      }).not.toThrow();
    });

    it('should create auto section if missing', () => {
      // Create config without auto section
      const configDir = path.join(tmpDir, '.specweave');
      fs.mkdirSync(configDir, { recursive: true });
      const configPath = path.join(configDir, 'config.json');
      const initialConfig = {
        version: '2.0',
        project: { name: 'test' },
      };
      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));

      // Update config
      updateConfigWithQualityGates(tmpDir, 'production', 'en');

      // Read and verify
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(updatedConfig.auto).toBeDefined();
      expect(updatedConfig.auto.requireTests).toBe(true);
    });
  });

  describe('QualityGatesConfigResult type', () => {
    it('should have all required properties', () => {
      const result: QualityGatesConfigResult = {
        preset: 'production',
        requireTests: true,
        requireValidation: true,
        requireLLMEval: true,
        requireJudgeLLM: false,
        skipQualityGates: false,
      };

      expect(result.preset).toBeDefined();
      expect(typeof result.requireTests).toBe('boolean');
      expect(typeof result.requireValidation).toBe('boolean');
      expect(typeof result.requireLLMEval).toBe('boolean');
      expect(typeof result.requireJudgeLLM).toBe('boolean');
      expect(typeof result.skipQualityGates).toBe('boolean');
    });
  });
});

describe('Quality gates and LLM eval relationship', () => {
  it('requireLLMEval should be independent from requireJudgeLLM', () => {
    // requireLLMEval: Lightweight LLM check integrated in stop hook
    // requireJudgeLLM: Heavy /sw:judge-llm call (separate command)
    // They serve different purposes and should not be mutually exclusive

    const production = getQualityGatePreset('production');

    // Production enables requireLLMEval (lightweight) but not requireJudgeLLM (heavy)
    expect(production.requireLLMEval).toBe(true);
    expect(production.requireJudgeLLM).toBe(false);
  });

  it('none preset should disable all quality gates', () => {
    const none = getQualityGatePreset('none');

    expect(none.requireTests).toBe(false);
    expect(none.requireValidation).toBe(false);
    expect(none.requireLLMEval).toBe(false);
    expect(none.requireJudgeLLM).toBe(false);
    expect(none.skipQualityGates).toBe(true);
  });
});
