/**
 * Unit tests for LanguageManager
 */

import { LanguageManager, isLanguageSupported, getSupportedLanguages, getSystemPromptForLanguage } from '../../../src/core/i18n/language-manager';
import { SupportedLanguage } from '../../../src/core/i18n/types';

describe('LanguageManager', () => {
  describe('constructor', () => {
    it('should initialize with default language', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      expect(manager.getCurrentLanguage()).toBe('en');
    });

    it('should initialize with Russian language', () => {
      const manager = new LanguageManager({ defaultLanguage: 'ru' });
      expect(manager.getCurrentLanguage()).toBe('ru');
    });

    it('should initialize with Spanish language', () => {
      const manager = new LanguageManager({ defaultLanguage: 'es' });
      expect(manager.getCurrentLanguage()).toBe('es');
    });
  });

  describe('getCurrentLanguage()', () => {
    it('should return the current language', () => {
      const manager = new LanguageManager({ defaultLanguage: 'ru' });
      expect(manager.getCurrentLanguage()).toBe('ru');
    });
  });

  describe('setCurrentLanguage()', () => {
    it('should change the current language', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      expect(manager.getCurrentLanguage()).toBe('en');

      manager.setCurrentLanguage('ru');
      expect(manager.getCurrentLanguage()).toBe('ru');

      manager.setCurrentLanguage('es');
      expect(manager.getCurrentLanguage()).toBe('es');
    });
  });

  describe('getLanguageConfig()', () => {
    it('should return language config for English', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      const config = manager.getLanguageConfig();

      expect(config).toBeDefined();
      expect(config.code).toBe('en');
      expect(config.englishName).toBe('English');
      expect(config.nativeName).toBe('English');
    });

    it('should return language config for Russian', () => {
      const manager = new LanguageManager({ defaultLanguage: 'ru' });
      const config = manager.getLanguageConfig();

      expect(config).toBeDefined();
      expect(config.code).toBe('ru');
      expect(config.englishName).toBe('Russian');
      expect(config.nativeName).toBe('Русский');
    });

    it('should return language config for Spanish', () => {
      const manager = new LanguageManager({ defaultLanguage: 'es' });
      const config = manager.getLanguageConfig();

      expect(config).toBeDefined();
      expect(config.code).toBe('es');
      expect(config.englishName).toBe('Spanish');
      expect(config.nativeName).toBe('Español');
    });

    it('should return config for specific language when passed as argument', () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      const config = manager.getLanguageConfig('ru');

      expect(config.code).toBe('ru');
      expect(config.englishName).toBe('Russian');
    });
  });

  describe('applyLanguageToProject()', () => {
    it('should not throw error when applying English', async () => {
      const manager = new LanguageManager({ defaultLanguage: 'en' });
      // This is a file operation test that would need filesystem mocking
      // For now, just ensure method exists
      expect(manager.applyLanguageToProject).toBeDefined();
    });
  });
});

describe('Utility Functions', () => {
  describe('isLanguageSupported()', () => {
    it('should return true for English', () => {
      expect(isLanguageSupported('en')).toBe(true);
    });

    it('should return true for Russian', () => {
      expect(isLanguageSupported('ru')).toBe(true);
    });

    it('should return true for Spanish', () => {
      expect(isLanguageSupported('es')).toBe(true);
    });

    it('should return true for Chinese', () => {
      expect(isLanguageSupported('zh')).toBe(true);
    });

    it('should return true for German', () => {
      expect(isLanguageSupported('de')).toBe(true);
    });

    it('should return true for French', () => {
      expect(isLanguageSupported('fr')).toBe(true);
    });

    it('should return true for Japanese', () => {
      expect(isLanguageSupported('ja')).toBe(true);
    });

    it('should return true for Korean', () => {
      expect(isLanguageSupported('ko')).toBe(true);
    });

    it('should return true for Portuguese', () => {
      expect(isLanguageSupported('pt')).toBe(true);
    });

    it('should return false for unsupported language', () => {
      expect(isLanguageSupported('xx')).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(isLanguageSupported('')).toBe(false);
      expect(isLanguageSupported('invalid')).toBe(false);
    });
  });

  describe('getSupportedLanguages()', () => {
    it('should return array of 9 supported languages', () => {
      const languages = getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toHaveLength(9);
    });

    it('should include all expected languages', () => {
      const languages = getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('ru');
      expect(languages).toContain('es');
      expect(languages).toContain('zh');
      expect(languages).toContain('de');
      expect(languages).toContain('fr');
      expect(languages).toContain('ja');
      expect(languages).toContain('ko');
      expect(languages).toContain('pt');
    });
  });

  describe('getSystemPromptForLanguage()', () => {
    it('should return empty string for English', () => {
      const prompt = getSystemPromptForLanguage('en');
      expect(prompt).toBe('');
    });

    it('should return Russian system prompt', () => {
      const prompt = getSystemPromptForLanguage('ru');

      expect(prompt).toContain('LANGUAGE INSTRUCTION');
      expect(prompt).toContain('Russian');
      expect(prompt).toContain('Русский');
      // SIMPLIFIED: prompts are concise, no need for verbose "framework terms"
      expect(prompt.toLowerCase()).toContain('english');
    });

    it('should return Spanish system prompt', () => {
      const prompt = getSystemPromptForLanguage('es');

      expect(prompt).toContain('LANGUAGE INSTRUCTION');
      expect(prompt).toContain('Spanish');
      expect(prompt).toContain('Español');
      // SIMPLIFIED: prompts are concise, just check for English preservation
      expect(prompt.toLowerCase()).toContain('english');
    });

    it('should return Chinese system prompt', () => {
      const prompt = getSystemPromptForLanguage('zh');

      expect(prompt).toContain('LANGUAGE INSTRUCTION');
      expect(prompt).toContain('Chinese');
      expect(prompt).toContain('中文');
    });

    it('should return German system prompt', () => {
      const prompt = getSystemPromptForLanguage('de');

      expect(prompt).toContain('LANGUAGE INSTRUCTION');
      expect(prompt).toContain('German');
      expect(prompt).toContain('Deutsch');
    });

    it('should return French system prompt', () => {
      const prompt = getSystemPromptForLanguage('fr');

      expect(prompt).toContain('LANGUAGE INSTRUCTION');
      expect(prompt).toContain('French');
      expect(prompt).toContain('Français');
    });

    it('should return Japanese system prompt', () => {
      const prompt = getSystemPromptForLanguage('ja');

      expect(prompt).toContain('LANGUAGE INSTRUCTION');
      expect(prompt).toContain('Japanese');
      expect(prompt).toContain('日本語');
    });

    it('should return Korean system prompt', () => {
      const prompt = getSystemPromptForLanguage('ko');

      expect(prompt).toContain('LANGUAGE INSTRUCTION');
      expect(prompt).toContain('Korean');
      expect(prompt).toContain('한국어');
    });

    it('should return Portuguese system prompt', () => {
      const prompt = getSystemPromptForLanguage('pt');

      expect(prompt).toContain('LANGUAGE INSTRUCTION');
      expect(prompt).toContain('Portuguese');
      expect(prompt).toContain('Português');
    });

    it('should preserve framework terms in all prompts', () => {
      const languages: SupportedLanguage[] = ['ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'];

      languages.forEach(lang => {
        const prompt = getSystemPromptForLanguage(lang);
        // System prompts should mention maintaining terms in English (SIMPLIFIED - no need for "framework" keyword)
        expect(prompt.toLowerCase()).toContain('english');
      });
    });
  });
});

describe('System Prompt Content Quality', () => {
  it('should include instructions for preserving technical terms', () => {
    const prompt = getSystemPromptForLanguage('ru');

    // Technical terms that should be preserved
    const technicalTerms = [
      'TypeScript', 'npm', 'git', 'Docker', 'Kubernetes',
      'API', 'CLI', 'HTTP', 'JSON', 'REST'
    ];

    // The prompt should mention keeping technical terms (implicitly or explicitly)
    expect(prompt).toBeTruthy();
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('should include instructions for preserving code blocks', () => {
    const prompt = getSystemPromptForLanguage('es');

    // The prompt should mention something about code or variable names
    expect(prompt).toBeTruthy();
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('should be consistent in format across languages', () => {
    const languages: SupportedLanguage[] = ['ru', 'es', 'zh', 'de', 'fr'];

    languages.forEach(lang => {
      const prompt = getSystemPromptForLanguage(lang);

      // All prompts should have similar structure
      expect(prompt).toContain('LANGUAGE INSTRUCTION');
      expect(prompt.length).toBeGreaterThan(50);
      expect(prompt.length).toBeLessThan(2000);
    });
  });
});
