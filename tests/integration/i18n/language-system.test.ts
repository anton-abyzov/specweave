/**
 * Integration tests for i18n language system
 *
 * Tests real-world integration between components
 */

import { LanguageManager, getSystemPromptForLanguage } from '../../../src/core/i18n/language-manager.js';
import { LocaleManager, getLocaleManager, resetLocaleManager } from '../../../src/core/i18n/locale-manager.js';
import type { SupportedLanguage } from '../../../src/core/i18n/types.js';

describe('Language System Integration', () => {
  afterEach(() => {
    resetLocaleManager();
  });

  describe('LanguageManager + System Prompts', () => {
    it('should provide system prompts for all non-English languages', () => {
      const languages: SupportedLanguage[] = ['ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'];

      languages.forEach(lang => {
        const prompt = getSystemPromptForLanguage(lang);

        // System prompts should exist and be non-empty
        expect(prompt).toBeTruthy();
        expect(prompt.length).toBeGreaterThan(20);

        // Should mention maintaining English for technical terms
        expect(prompt.toLowerCase()).toContain('english');
      });
    });

    it('should return empty prompt for English', () => {
      const prompt = getSystemPromptForLanguage('en');
      expect(prompt).toBe('');
    });
  });

  describe('LanguageManager Language Switching', () => {
    it('should switch languages and return correct configs', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });

      expect(manager.getCurrentLanguage()).toBe('en');
      expect(manager.getLanguageConfig().englishName).toBe('English');

      manager.setCurrentLanguage('ru');
      expect(manager.getCurrentLanguage()).toBe('ru');
      expect(manager.getLanguageConfig().englishName).toBe('Russian');

      manager.setCurrentLanguage('es');
      expect(manager.getCurrentLanguage()).toBe('es');
      expect(manager.getLanguageConfig().englishName).toBe('Spanish');
    });
  });

  describe('LocaleManager Integration', () => {
    it('should work with LanguageManager for consistent language', () => {
      const langManager = new LanguageManager({ defaultLanguage: 'ru' });
      const localeManager = new LocaleManager('ru');

      expect(langManager.getCurrentLanguage()).toBe(localeManager.getCurrentLanguage());
    });

    it('should provide locale strings for initialized language', () => {
      const manager = new LocaleManager('en');

      // Should be able to access locale strings using t() method
      expect(() => {
        manager.t('cli', 'init.welcome');
      }).not.toThrow();
    });
  });

  describe('Singleton Pattern Integration', () => {
    it('should maintain language across singleton calls', () => {
      const manager1 = getLocaleManager('ru');
      expect(manager1.getCurrentLanguage()).toBe('ru');

      const manager2 = getLocaleManager();
      expect(manager2.getCurrentLanguage()).toBe('ru');
      expect(manager2).toBe(manager1);
    });

    it('should reset singleton and allow new language', () => {
      const manager1 = getLocaleManager('en');
      expect(manager1.getCurrentLanguage()).toBe('en');

      resetLocaleManager();

      const manager2 = getLocaleManager('es');
      expect(manager2.getCurrentLanguage()).toBe('es');
      expect(manager2).not.toBe(manager1);
    });
  });

  describe('Language Detection + Config', () => {
    it('should initialize with default language when provided', () => {
      const manager1 = new LanguageManager({ defaultLanguage: 'ru' });
      expect(manager1.getCurrentLanguage()).toBe('ru');

      const manager2 = new LanguageManager({ defaultLanguage: 'es' });
      expect(manager2.getCurrentLanguage()).toBe('es');
    });

    it('should get language config for any supported language', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });

      const enConfig = manager.getLanguageConfig('en');
      expect(enConfig.code).toBe('en');
      expect(enConfig.englishName).toBe('English');

      const ruConfig = manager.getLanguageConfig('ru');
      expect(ruConfig.code).toBe('ru');
      expect(ruConfig.englishName).toBe('Russian');

      const esConfig = manager.getLanguageConfig('es');
      expect(esConfig.code).toBe('es');
      expect(esConfig.englishName).toBe('Spanish');
    });
  });

  describe('All 9 Languages Support', () => {
    it('should support all 9 languages end-to-end', () => {
      const languages: SupportedLanguage[] = ['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'];

      languages.forEach(lang => {
        // Language Manager should work
        const langManager = new LanguageManager({ defaultLanguage: lang });
        expect(langManager.getCurrentLanguage()).toBe(lang);

        // Locale Manager should work
        const localeManager = new LocaleManager(lang);
        expect(localeManager.getCurrentLanguage()).toBe(lang);

        // System prompts should exist (or be empty for English)
        const prompt = getSystemPromptForLanguage(lang);
        if (lang === 'en') {
          expect(prompt).toBe('');
        } else {
          expect(prompt.length).toBeGreaterThan(20);
        }
      });
    });
  });
});
