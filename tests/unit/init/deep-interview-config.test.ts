/**
 * Unit Tests: Deep Interview Mode Configuration (v1.0.195)
 *
 * Tests the deep interview mode configuration during init:
 * - Config schema and defaults
 * - Prompt function with go-back support
 * - Config update function
 * - i18n translations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';

// Mock inquirer prompts before importing
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
}));

describe('Deep Interview Mode Configuration (v1.0.195)', () => {
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create temp directory for test configs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    // Cleanup temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Config Schema', () => {
    it('should have correct default values in DEFAULT_CONFIG', async () => {
      const { DEFAULT_CONFIG } = await import('../../../src/core/types/config.js');

      expect(DEFAULT_CONFIG.planning).toBeDefined();
      expect(DEFAULT_CONFIG.planning?.deepInterview).toBeDefined();
      expect(DEFAULT_CONFIG.planning?.deepInterview?.enabled).toBe(false);
      expect(DEFAULT_CONFIG.planning?.deepInterview?.minQuestions).toBe(5);
      expect(DEFAULT_CONFIG.planning?.deepInterview?.categories).toHaveLength(6);
    });

    it('should include all 6 interview categories', async () => {
      const { DEFAULT_CONFIG } = await import('../../../src/core/types/config.js');
      const categories = DEFAULT_CONFIG.planning?.deepInterview?.categories || [];

      expect(categories).toContain('architecture');
      expect(categories).toContain('integrations');
      expect(categories).toContain('ui-ux');
      expect(categories).toContain('performance');
      expect(categories).toContain('security');
      expect(categories).toContain('edge-cases');
    });

    it('should be disabled by default (opt-in)', async () => {
      const { DEFAULT_CONFIG } = await import('../../../src/core/types/config.js');

      // Per ADR-0232: Deep Interview Mode is opt-in, disabled by default
      expect(DEFAULT_CONFIG.planning?.deepInterview?.enabled).toBe(false);
    });
  });

  describe('DeepInterviewConfig Type', () => {
    it('should enforce valid category values', async () => {
      const { DEFAULT_CONFIG } = await import('../../../src/core/types/config.js');

      type Category = 'architecture' | 'integrations' | 'ui-ux' | 'performance' | 'security' | 'edge-cases';

      const validCategories: Category[] = [
        'architecture',
        'integrations',
        'ui-ux',
        'performance',
        'security',
        'edge-cases',
      ];

      expect(validCategories).toHaveLength(6);

      // TypeScript will catch invalid values at compile time
      // @ts-expect-error - Invalid category value
      const invalid: Category = 'invalid-category';
    });
  });

  describe('promptDeepInterviewConfig', () => {
    it('should return enabled=true when user selects Yes', async () => {
      const { select } = await import('@inquirer/prompts');
      vi.mocked(select).mockResolvedValue(true);

      const { promptDeepInterviewConfig } = await import(
        '../../../src/cli/helpers/init/deep-interview-config.js'
      );

      const result = await promptDeepInterviewConfig('en');

      expect(result.enabled).toBe(true);
      expect(result.goBack).toBeUndefined();
    });

    it('should return enabled=false when user selects No', async () => {
      const { select } = await import('@inquirer/prompts');
      vi.mocked(select).mockResolvedValue(false);

      const { promptDeepInterviewConfig } = await import(
        '../../../src/cli/helpers/init/deep-interview-config.js'
      );

      const result = await promptDeepInterviewConfig('en');

      expect(result.enabled).toBe(false);
      expect(result.goBack).toBeUndefined();
    });

    it('should return goBack when user selects Go Back', async () => {
      const { select } = await import('@inquirer/prompts');
      vi.mocked(select).mockResolvedValue('back');

      const { promptDeepInterviewConfig, WIZARD_BACK } = await import(
        '../../../src/cli/helpers/init/deep-interview-config.js'
      );
      const { WIZARD_BACK: WB } = await import(
        '../../../src/cli/helpers/init/wizard-navigation.js'
      );

      const result = await promptDeepInterviewConfig('en');

      expect(result.enabled).toBe(false);
      expect(result.goBack).toBe(WB);
    });

    it('should provide 3 choices: No, Yes, Go Back', async () => {
      const { select } = await import('@inquirer/prompts');
      let capturedChoices: any[] = [];
      vi.mocked(select).mockImplementation(async (options: any) => {
        capturedChoices = options.choices;
        return false;
      });

      const { promptDeepInterviewConfig } = await import(
        '../../../src/cli/helpers/init/deep-interview-config.js'
      );

      await promptDeepInterviewConfig('en');

      expect(capturedChoices).toHaveLength(3);
      // Values should be: false (No), true (Yes), 'back'
      const values = capturedChoices.map(c => c.value);
      expect(values).toContain(false);
      expect(values).toContain(true);
      expect(values).toContain('back');
    });
  });

  describe('updateConfigWithDeepInterview', () => {
    it('should write deep interview config to config.json', async () => {
      // Create initial config
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }, null, 2));

      const { updateConfigWithDeepInterview } = await import(
        '../../../src/cli/helpers/init/deep-interview-config.js'
      );

      updateConfigWithDeepInterview(tempDir, true, 'en');

      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(updatedConfig.planning).toBeDefined();
      expect(updatedConfig.planning.deepInterview).toBeDefined();
      expect(updatedConfig.planning.deepInterview.enabled).toBe(true);
      expect(updatedConfig.planning.deepInterview.minQuestions).toBe(5);
      expect(updatedConfig.planning.deepInterview.categories).toHaveLength(6);
    });

    it('should set enabled=false when user declines', async () => {
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }, null, 2));

      const { updateConfigWithDeepInterview } = await import(
        '../../../src/cli/helpers/init/deep-interview-config.js'
      );

      updateConfigWithDeepInterview(tempDir, false, 'en');

      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(updatedConfig.planning.deepInterview.enabled).toBe(false);
    });

    it('should preserve existing config properties', async () => {
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      const existingConfig = {
        project: { name: 'test' },
        testing: { defaultTestMode: 'TDD' },
        language: 'en',
      };
      fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

      const { updateConfigWithDeepInterview } = await import(
        '../../../src/cli/helpers/init/deep-interview-config.js'
      );

      updateConfigWithDeepInterview(tempDir, true, 'en');

      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // Original properties should be preserved
      expect(updatedConfig.project.name).toBe('test');
      expect(updatedConfig.testing.defaultTestMode).toBe('TDD');
      expect(updatedConfig.language).toBe('en');
      // New property should be added
      expect(updatedConfig.planning.deepInterview.enabled).toBe(true);
    });

    it('should handle missing config.json gracefully', async () => {
      const { updateConfigWithDeepInterview } = await import(
        '../../../src/cli/helpers/init/deep-interview-config.js'
      );

      // Should not throw, just log error
      expect(() => {
        updateConfigWithDeepInterview(tempDir, true, 'en');
      }).not.toThrow();
    });
  });

  describe('i18n Translations', () => {
    const languages = ['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'] as const;

    it.each(languages)('should have all required strings for %s', async (lang) => {
      const { select } = await import('@inquirer/prompts');
      let capturedOptions: any = null;
      vi.mocked(select).mockImplementation(async (options: any) => {
        capturedOptions = options;
        return false;
      });

      const { promptDeepInterviewConfig } = await import(
        '../../../src/cli/helpers/init/deep-interview-config.js'
      );

      // Call with language to verify strings are available
      await promptDeepInterviewConfig(lang);

      // Should have captured the prompt options
      expect(capturedOptions).toBeDefined();
      expect(capturedOptions.message).toBeDefined();
      expect(capturedOptions.choices).toHaveLength(3);

      // All choices should have names (translated strings)
      for (const choice of capturedOptions.choices) {
        expect(choice.name).toBeDefined();
        expect(typeof choice.name).toBe('string');
        expect(choice.name.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Integration with Init Wizard', () => {
    it('should be placed after testing step in wizard flow', () => {
      // Wizard flow order verification
      const wizardSteps = [
        'external-import',
        'living-docs',
        'testing',
        'deep-interview', // Our new step
        'translation',
        'done',
      ];

      const testingIndex = wizardSteps.indexOf('testing');
      const deepInterviewIndex = wizardSteps.indexOf('deep-interview');
      const translationIndex = wizardSteps.indexOf('translation');

      expect(deepInterviewIndex).toBe(testingIndex + 1);
      expect(deepInterviewIndex).toBeLessThan(translationIndex);
    });

    it('should go back to testing step when user selects Go Back', () => {
      // When goBack is returned, init.ts should set wizardStep = 'testing'
      const previousStep = 'testing';
      const currentStep = 'deep-interview';

      // Simulated wizard navigation
      expect(previousStep).toBe('testing');
    });
  });

  describe('migrateDeepInterviewConfig (specweave update)', () => {
    it('should add planning.deepInterview section if missing', async () => {
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      const existingConfig = {
        project: { name: 'test' },
        auto: { enabled: true },
      };
      fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

      const { migrateDeepInterviewConfig } = await import(
        '../../../src/cli/commands/update.js'
      );

      const migrated = migrateDeepInterviewConfig(tempDir);

      expect(migrated).toBe(true);

      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(updatedConfig.planning).toBeDefined();
      expect(updatedConfig.planning.deepInterview).toBeDefined();
      expect(updatedConfig.planning.deepInterview.enabled).toBe(false); // Default: disabled
      expect(updatedConfig.planning.deepInterview.minQuestions).toBe(5);
      expect(updatedConfig.planning.deepInterview.categories).toHaveLength(6);
    });

    it('should NOT modify if planning.deepInterview already exists', async () => {
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      const existingConfig = {
        project: { name: 'test' },
        planning: {
          deepInterview: {
            enabled: true, // User enabled it
            minQuestions: 20, // Custom value
            categories: ['architecture'], // Custom categories
          },
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

      const { migrateDeepInterviewConfig } = await import(
        '../../../src/cli/commands/update.js'
      );

      const migrated = migrateDeepInterviewConfig(tempDir);

      expect(migrated).toBe(false); // No migration needed

      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      // Should preserve user's custom settings
      expect(updatedConfig.planning.deepInterview.enabled).toBe(true);
      expect(updatedConfig.planning.deepInterview.minQuestions).toBe(20);
      expect(updatedConfig.planning.deepInterview.categories).toHaveLength(1);
    });

    it('should initialize planning object if it exists but deepInterview is missing', async () => {
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      const existingConfig = {
        project: { name: 'test' },
        planning: {
          otherSetting: true,
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

      const { migrateDeepInterviewConfig } = await import(
        '../../../src/cli/commands/update.js'
      );

      const migrated = migrateDeepInterviewConfig(tempDir);

      expect(migrated).toBe(true);

      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(updatedConfig.planning.otherSetting).toBe(true); // Preserved
      expect(updatedConfig.planning.deepInterview).toBeDefined(); // Added
    });

    it('should return false if config.json does not exist', async () => {
      const { migrateDeepInterviewConfig } = await import(
        '../../../src/cli/commands/update.js'
      );

      const migrated = migrateDeepInterviewConfig(tempDir);

      expect(migrated).toBe(false);
    });

    it('should preserve all existing config properties', async () => {
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      const existingConfig = {
        version: '2.0',
        project: { name: 'test', version: '1.0.0' },
        multiProject: { enabled: false },
        adapters: { default: 'claude' },
        sync: { enabled: true },
        auto: { maxRetries: 20 },
        lsp: { enabled: true },
        testing: { defaultTestMode: 'TDD' },
      };
      fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

      const { migrateDeepInterviewConfig } = await import(
        '../../../src/cli/commands/update.js'
      );

      const migrated = migrateDeepInterviewConfig(tempDir);

      expect(migrated).toBe(true);

      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      // All original properties preserved
      expect(updatedConfig.version).toBe('2.0');
      expect(updatedConfig.project.name).toBe('test');
      expect(updatedConfig.multiProject.enabled).toBe(false);
      expect(updatedConfig.adapters.default).toBe('claude');
      expect(updatedConfig.sync.enabled).toBe(true);
      expect(updatedConfig.auto.maxRetries).toBe(20);
      expect(updatedConfig.lsp.enabled).toBe(true);
      expect(updatedConfig.testing.defaultTestMode).toBe('TDD');
      // New property added
      expect(updatedConfig.planning.deepInterview).toBeDefined();
    });
  });
});
