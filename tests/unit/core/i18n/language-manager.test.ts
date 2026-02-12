/**
 * LanguageManager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks
const {
  mockPathExists,
  mockWriteJSON,
  mockReadJSON,
  mockDetectLanguage,
  mockDetectLanguageFromEnvironment,
  mockGetLanguageConfig,
  mockGetLanguageMetadata,
  mockGetAllLanguages,
  mockInjectSystemPrompt,
  mockInjectPromptsIntoDirectory,
} = vi.hoisted(() => ({
  mockPathExists: vi.fn(),
  mockWriteJSON: vi.fn(),
  mockReadJSON: vi.fn(),
  mockDetectLanguage: vi.fn(),
  mockDetectLanguageFromEnvironment: vi.fn(),
  mockGetLanguageConfig: vi.fn(),
  mockGetLanguageMetadata: vi.fn(),
  mockGetAllLanguages: vi.fn(),
  mockInjectSystemPrompt: vi.fn(),
  mockInjectPromptsIntoDirectory: vi.fn(),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  pathExists: mockPathExists,
  writeJSON: mockWriteJSON,
  readJSON: mockReadJSON,
}));

vi.mock('../../../../src/core/i18n/language-detector.js', () => ({
  detectLanguage: mockDetectLanguage,
  detectLanguageFromEnvironment: mockDetectLanguageFromEnvironment,
}));

vi.mock('../../../../src/core/i18n/language-registry.js', () => ({
  getLanguageConfig: mockGetLanguageConfig,
  getLanguageMetadata: mockGetLanguageMetadata,
  getAllLanguages: mockGetAllLanguages,
  LANGUAGE_CONFIGS: {
    en: {
      code: 'en',
      nativeName: 'English',
      englishName: 'English',
      systemPrompt: '',
      rtl: false,
      strings: {
        cli: { welcome: 'Welcome', error: 'Error', success: 'Success', warning: 'Warning', info: 'Info' },
        increment: { created: 'Created', inProgress: 'In progress', completed: 'Completed', failed: 'Failed', taskComplete: 'Task done', allTasksComplete: 'All done' },
        validation: { invalidInput: 'Invalid', missingFile: 'Missing', incompleteTasks: 'Incomplete', blockingIncrement: 'Blocking' },
        gates: { taskGatePass: 'Pass', taskGateFail: 'Fail', testGatePass: 'Pass', testGateFail: 'Fail', docsGatePass: 'Pass', docsGateFail: 'Fail' },
      },
    },
    ru: {
      code: 'ru',
      nativeName: 'Russian',
      englishName: 'Russian',
      systemPrompt: '**LANGUAGE INSTRUCTION**: Respond in Russian.',
      rtl: false,
      strings: {
        cli: { welcome: 'Welcome', error: 'Error', success: 'Success', warning: 'Warning', info: 'Info' },
        increment: { created: 'Created', inProgress: 'In progress', completed: 'Completed', failed: 'Failed', taskComplete: 'Task done', allTasksComplete: 'All done' },
        validation: { invalidInput: 'Invalid', missingFile: 'Missing', incompleteTasks: 'Incomplete', blockingIncrement: 'Blocking' },
        gates: { taskGatePass: 'Pass', taskGateFail: 'Fail', testGatePass: 'Pass', testGateFail: 'Fail', docsGatePass: 'Pass', docsGateFail: 'Fail' },
      },
    },
  },
}));

vi.mock('../../../../src/core/i18n/system-prompt-injector.js', () => ({
  injectSystemPrompt: mockInjectSystemPrompt,
  injectPromptsIntoDirectory: mockInjectPromptsIntoDirectory,
}));

import {
  LanguageManager,
  getLanguageManager,
  resetLanguageManager,
  getSystemPromptForLanguage,
  isLanguageSupported,
  getSupportedLanguages,
} from '../../../../src/core/i18n/language-manager.js';

// Suppress console output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('LanguageManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLanguageManager();

    // Default mock returns
    mockDetectLanguageFromEnvironment.mockReturnValue({
      language: 'en',
      confidence: 1.0,
      reliable: true,
    });

    mockDetectLanguage.mockReturnValue({
      language: 'en',
      confidence: 1.0,
      reliable: true,
    });

    const enConfig = {
      code: 'en',
      nativeName: 'English',
      englishName: 'English',
      systemPrompt: '',
      rtl: false,
      strings: {
        cli: { welcome: 'Welcome', error: 'Error', success: 'Success', warning: 'Warning', info: 'Info' },
        increment: { created: 'Created', inProgress: 'In progress', completed: 'Completed', failed: 'Failed', taskComplete: 'Task done', allTasksComplete: 'All done' },
        validation: { invalidInput: 'Invalid', missingFile: 'Missing', incompleteTasks: 'Incomplete', blockingIncrement: 'Blocking' },
        gates: { taskGatePass: 'Pass', taskGateFail: 'Fail', testGatePass: 'Pass', testGateFail: 'Fail', docsGatePass: 'Pass', docsGateFail: 'Fail' },
      },
    };

    const ruConfig = {
      code: 'ru',
      nativeName: 'Russian',
      englishName: 'Russian',
      systemPrompt: '**LANGUAGE INSTRUCTION**: Respond in Russian.',
      rtl: false,
      strings: {
        cli: { welcome: 'Welcome', error: 'Error', success: 'Success', warning: 'Warning', info: 'Info' },
        increment: { created: 'Created', inProgress: 'In progress', completed: 'Completed', failed: 'Failed', taskComplete: 'Task done', allTasksComplete: 'All done' },
        validation: { invalidInput: 'Invalid', missingFile: 'Missing', incompleteTasks: 'Incomplete', blockingIncrement: 'Blocking' },
        gates: { taskGatePass: 'Pass', taskGateFail: 'Fail', testGatePass: 'Pass', testGateFail: 'Fail', docsGatePass: 'Pass', docsGateFail: 'Fail' },
      },
    };

    mockGetLanguageConfig.mockImplementation((code: string) => {
      if (code === 'ru') return ruConfig;
      return enConfig;
    });

    mockGetAllLanguages.mockReturnValue([
      { code: 'en', nativeName: 'English', englishName: 'English', flag: '', completionPercent: 100 },
      { code: 'ru', nativeName: 'Russian', englishName: 'Russian', flag: '', completionPercent: 0 },
    ]);
  });

  // -------------------------------------------------------
  // 1. Constructor with default config
  // -------------------------------------------------------
  describe('constructor', () => {
    it('should default to "en" when no config is provided', () => {
      const manager = new LanguageManager();
      expect(manager.getCurrentLanguage()).toBe('en');
    });

    it('should set enabledLanguages to ["en"] by default', () => {
      const manager = new LanguageManager();
      expect(manager.isLanguageEnabled('en')).toBe(true);
    });

    // 2. Constructor with explicit defaultLanguage
    it('should use the provided defaultLanguage', () => {
      const manager = new LanguageManager({ defaultLanguage: 'ru' });
      expect(manager.getCurrentLanguage()).toBe('ru');
    });

    it('should not auto-detect when defaultLanguage is explicitly set', () => {
      new LanguageManager({ defaultLanguage: 'ru' });
      expect(mockDetectLanguageFromEnvironment).not.toHaveBeenCalled();
    });

    // 3. Constructor with autoDetect=true
    it('should call detectLanguageFromEnvironment when autoDetect is true and no defaultLanguage', () => {
      mockDetectLanguageFromEnvironment.mockReturnValue({
        language: 'ru',
        confidence: 0.9,
        reliable: true,
      });

      const manager = new LanguageManager({ autoDetect: true });
      expect(mockDetectLanguageFromEnvironment).toHaveBeenCalled();
      expect(manager.getCurrentLanguage()).toBe('ru');
    });

    it('should not auto-detect when autoDetect is explicitly false', () => {
      new LanguageManager({ autoDetect: false });
      expect(mockDetectLanguageFromEnvironment).not.toHaveBeenCalled();
    });

    it('should use detected language from environment on default config (no defaultLanguage means autoDetect)', () => {
      mockDetectLanguageFromEnvironment.mockReturnValue({
        language: 'es',
        confidence: 0.9,
        reliable: true,
      });

      // No defaultLanguage provided, so autoDetect defaults to true
      const manager = new LanguageManager();
      expect(mockDetectLanguageFromEnvironment).toHaveBeenCalled();
      expect(manager.getCurrentLanguage()).toBe('es');
    });
  });

  // -------------------------------------------------------
  // 4. getCurrentLanguage / setCurrentLanguage
  // -------------------------------------------------------
  describe('getCurrentLanguage / setCurrentLanguage', () => {
    it('should return the current language', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      expect(manager.getCurrentLanguage()).toBe('en');
    });

    it('should update current language via setCurrentLanguage', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      manager.setCurrentLanguage('ru');
      expect(manager.getCurrentLanguage()).toBe('ru');
    });
  });

  // -------------------------------------------------------
  // 5. getLanguageConfig delegates to registry
  // -------------------------------------------------------
  describe('getLanguageConfig', () => {
    it('should delegate to registry getLanguageConfig with current language', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      manager.getLanguageConfig();
      expect(mockGetLanguageConfig).toHaveBeenCalledWith('en');
    });

    it('should delegate to registry with an explicit language argument', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      manager.getLanguageConfig('ru');
      expect(mockGetLanguageConfig).toHaveBeenCalledWith('ru');
    });

    it('should return the config object from registry', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      const config = manager.getLanguageConfig('ru');
      expect(config.code).toBe('ru');
    });
  });

  // -------------------------------------------------------
  // 6. getLocaleStrings
  // -------------------------------------------------------
  describe('getLocaleStrings', () => {
    it('should return strings from the language config', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      const strings = manager.getLocaleStrings();
      expect(strings).toBeDefined();
      expect(strings.cli).toBeDefined();
      expect(strings.cli.welcome).toBe('Welcome');
    });

    it('should return strings for an explicit language', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      const strings = manager.getLocaleStrings('ru');
      expect(strings).toBeDefined();
      expect(mockGetLanguageConfig).toHaveBeenCalledWith('ru');
    });
  });

  // -------------------------------------------------------
  // 7. getAvailableLanguages
  // -------------------------------------------------------
  describe('getAvailableLanguages', () => {
    it('should delegate to getAllLanguages from registry', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      const languages = manager.getAvailableLanguages();
      expect(mockGetAllLanguages).toHaveBeenCalled();
      expect(languages).toHaveLength(2);
    });

    it('should return language metadata objects', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      const languages = manager.getAvailableLanguages();
      expect(languages[0].code).toBe('en');
      expect(languages[1].code).toBe('ru');
    });
  });

  // -------------------------------------------------------
  // 8. isLanguageEnabled / enableLanguage / disableLanguage
  // -------------------------------------------------------
  describe('isLanguageEnabled / enableLanguage / disableLanguage', () => {
    it('should report "en" as enabled by default', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      expect(manager.isLanguageEnabled('en')).toBe(true);
    });

    it('should report "ru" as not enabled by default', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      expect(manager.isLanguageEnabled('ru')).toBe(false);
    });

    it('should enable a new language', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      manager.enableLanguage('ru');
      expect(manager.isLanguageEnabled('ru')).toBe(true);
    });

    it('should not duplicate an already-enabled language', () => {
      const manager = new LanguageManager({
        defaultLanguage: 'en',
        enabledLanguages: ['en', 'ru'],
      });
      manager.enableLanguage('ru');
      // enableLanguage guards against duplicates
      manager.disableLanguage('ru');
      expect(manager.isLanguageEnabled('ru')).toBe(false);
      expect(manager.isLanguageEnabled('en')).toBe(true);
    });

    it('should disable an enabled language', () => {
      const manager = new LanguageManager({
        defaultLanguage: 'en',
        enabledLanguages: ['en', 'ru'],
      });
      manager.disableLanguage('ru');
      expect(manager.isLanguageEnabled('ru')).toBe(false);
    });

    it('should handle disabling a language that is not enabled', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      // Should not throw
      manager.disableLanguage('ru');
      expect(manager.isLanguageEnabled('ru')).toBe(false);
    });
  });

  // -------------------------------------------------------
  // 9. setUserPreference / getUserPreference
  // -------------------------------------------------------
  describe('setUserPreference / getUserPreference', () => {
    it('should return undefined when no preference is set', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      expect(manager.getUserPreference()).toBeUndefined();
    });

    it('should store and retrieve user preference', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      const pref = {
        primary: 'ru' as const,
        secondary: 'en' as const,
        codeCommentsInEnglish: true,
      };
      manager.setUserPreference(pref);
      expect(manager.getUserPreference()).toEqual(pref);
    });

    it('should update currentLanguage to preference primary', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      manager.setUserPreference({ primary: 'ru' });
      expect(manager.getCurrentLanguage()).toBe('ru');
    });
  });

  // -------------------------------------------------------
  // 10. detectLanguage delegates to detector
  // -------------------------------------------------------
  describe('detectLanguage', () => {
    it('should delegate to the detectLanguage function from detector module', () => {
      mockDetectLanguage.mockReturnValue({
        language: 'ru',
        confidence: 0.8,
        reliable: true,
      });

      const manager = new LanguageManager({ defaultLanguage: 'en' });
      const result = manager.detectLanguage('some content');
      expect(mockDetectLanguage).toHaveBeenCalledWith({ content: 'some content' });
      expect(result).toBe('ru');
    });

    it('should call detectLanguage with undefined content when none provided', () => {
      mockDetectLanguage.mockReturnValue({
        language: 'en',
        confidence: 1.0,
        reliable: true,
      });

      const manager = new LanguageManager({ defaultLanguage: 'en' });
      manager.detectLanguage();
      expect(mockDetectLanguage).toHaveBeenCalledWith({ content: undefined });
    });
  });

  // -------------------------------------------------------
  // 11. applyLanguageToProject (I/O heavy - mock fs)
  // -------------------------------------------------------
  describe('applyLanguageToProject', () => {
    it('should inject prompts into skills, agents, and commands directories', async () => {
      mockPathExists.mockResolvedValue(true);
      mockInjectPromptsIntoDirectory.mockResolvedValue(3);

      const manager = new LanguageManager({ defaultLanguage: 'en' });
      await manager.applyLanguageToProject('/project', 'ru');

      expect(mockPathExists).toHaveBeenCalledTimes(3);
      expect(mockInjectPromptsIntoDirectory).toHaveBeenCalledTimes(3);
    });

    it('should skip directories that do not exist', async () => {
      mockPathExists.mockResolvedValue(false);

      const manager = new LanguageManager({ defaultLanguage: 'en' });
      await manager.applyLanguageToProject('/project', 'ru');

      expect(mockInjectPromptsIntoDirectory).not.toHaveBeenCalled();
    });

    it('should respect option flags for which directories to process', async () => {
      mockPathExists.mockResolvedValue(true);
      mockInjectPromptsIntoDirectory.mockResolvedValue(1);

      const manager = new LanguageManager({ defaultLanguage: 'en' });
      await manager.applyLanguageToProject('/project', 'ru', {
        includeSkills: true,
        includeAgents: false,
        includeCommands: false,
      });

      // Only skills directory should be checked
      expect(mockPathExists).toHaveBeenCalledTimes(1);
      expect(mockInjectPromptsIntoDirectory).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------
  // saveConfig / loadConfig (I/O)
  // -------------------------------------------------------
  describe('saveConfig', () => {
    it('should write config to the specified path', async () => {
      mockWriteJSON.mockResolvedValue(undefined);

      const manager = new LanguageManager({ defaultLanguage: 'en' });
      await manager.saveConfig('/tmp/config.json');

      expect(mockWriteJSON).toHaveBeenCalledTimes(1);
      const [filePath, data] = mockWriteJSON.mock.calls[0];
      expect(filePath).toBe('/tmp/config.json');
      expect(data.i18n.defaultLanguage).toBe('en');
      expect(data.i18n.currentLanguage).toBe('en');
    });
  });

  describe('loadConfig', () => {
    it('should load config from file when it exists', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadJSON.mockResolvedValue({
        i18n: {
          defaultLanguage: 'ru',
          enabledLanguages: ['en', 'ru'],
          autoDetect: false,
          currentLanguage: 'ru',
        },
      });

      const manager = new LanguageManager({ defaultLanguage: 'en' });
      await manager.loadConfig('/tmp/config.json');

      expect(manager.getCurrentLanguage()).toBe('ru');
    });

    it('should do nothing when config file does not exist', async () => {
      mockPathExists.mockResolvedValue(false);

      const manager = new LanguageManager({ defaultLanguage: 'en' });
      await manager.loadConfig('/tmp/missing.json');

      // Language should remain as constructed
      expect(manager.getCurrentLanguage()).toBe('en');
      expect(mockReadJSON).not.toHaveBeenCalled();
    });

    it('should restore user preference from config', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadJSON.mockResolvedValue({
        i18n: {
          defaultLanguage: 'en',
          enabledLanguages: ['en'],
          autoDetect: true,
          currentLanguage: 'en',
          userPreference: {
            primary: 'ru',
            codeCommentsInEnglish: true,
          },
        },
      });

      const manager = new LanguageManager({ defaultLanguage: 'en' });
      await manager.loadConfig('/tmp/config.json');

      const pref = manager.getUserPreference();
      expect(pref).toBeDefined();
      expect(pref!.primary).toBe('ru');
    });
  });

  // -------------------------------------------------------
  // 11. getLanguageManager singleton behavior
  // -------------------------------------------------------
  describe('getLanguageManager (singleton)', () => {
    it('should return the same instance on subsequent calls', () => {
      const a = getLanguageManager({ defaultLanguage: 'en' });
      const b = getLanguageManager({ defaultLanguage: 'ru' });
      expect(a).toBe(b);
      // Second config is ignored since singleton already exists
      expect(b.getCurrentLanguage()).toBe('en');
    });

    it('should create a new instance after reset', () => {
      const a = getLanguageManager({ defaultLanguage: 'en' });
      resetLanguageManager();
      const b = getLanguageManager({ defaultLanguage: 'ru' });
      expect(a).not.toBe(b);
      expect(b.getCurrentLanguage()).toBe('ru');
    });
  });

  // -------------------------------------------------------
  // 12. resetLanguageManager
  // -------------------------------------------------------
  describe('resetLanguageManager', () => {
    it('should clear the singleton so next call creates a fresh instance', () => {
      const first = getLanguageManager({ defaultLanguage: 'en' });
      resetLanguageManager();
      const second = getLanguageManager({ defaultLanguage: 'ru' });
      expect(first).not.toBe(second);
    });
  });

  // -------------------------------------------------------
  // 13. getSystemPromptForLanguage
  // -------------------------------------------------------
  describe('getSystemPromptForLanguage', () => {
    it('should return the system prompt from registry for the given language', () => {
      const prompt = getSystemPromptForLanguage('ru');
      expect(mockGetLanguageConfig).toHaveBeenCalledWith('ru');
      expect(prompt).toBe('**LANGUAGE INSTRUCTION**: Respond in Russian.');
    });

    it('should return empty string for English', () => {
      const prompt = getSystemPromptForLanguage('en');
      expect(mockGetLanguageConfig).toHaveBeenCalledWith('en');
      expect(prompt).toBe('');
    });
  });

  // -------------------------------------------------------
  // 14. isLanguageSupported (valid and invalid codes)
  // -------------------------------------------------------
  describe('isLanguageSupported', () => {
    it('should return true for "en"', () => {
      expect(isLanguageSupported('en')).toBe(true);
    });

    it('should return true for "ru"', () => {
      expect(isLanguageSupported('ru')).toBe(true);
    });

    it('should return true for "es"', () => {
      expect(isLanguageSupported('es')).toBe(true);
    });

    it('should return true for "ja"', () => {
      expect(isLanguageSupported('ja')).toBe(true);
    });

    it('should return false for an unsupported code', () => {
      expect(isLanguageSupported('xx')).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(isLanguageSupported('')).toBe(false);
    });

    it('should return false for a numeric string', () => {
      expect(isLanguageSupported('123')).toBe(false);
    });
  });

  // -------------------------------------------------------
  // 15. getSupportedLanguages
  // -------------------------------------------------------
  describe('getSupportedLanguages', () => {
    it('should return an array of supported language codes', () => {
      const langs = getSupportedLanguages();
      expect(Array.isArray(langs)).toBe(true);
      expect(langs.length).toBeGreaterThan(0);
    });

    it('should include "en" in the list', () => {
      const langs = getSupportedLanguages();
      expect(langs).toContain('en');
    });

    it('should include all 9 supported languages', () => {
      const langs = getSupportedLanguages();
      expect(langs).toEqual(['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt']);
    });
  });
});
