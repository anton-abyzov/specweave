/**
 * Language Registry Tests
 *
 * Tests for all exported constants (LANGUAGE_METADATA, SYSTEM_PROMPTS, LANGUAGE_CONFIGS)
 * and functions (getLanguageMetadata, getLanguageConfig, getSystemPrompt, getAllLanguages, isLanguageSupported).
 */

import { describe, it, expect } from 'vitest';
import {
  LANGUAGE_METADATA,
  SYSTEM_PROMPTS,
  LANGUAGE_CONFIGS,
  getLanguageMetadata,
  getLanguageConfig,
  getSystemPrompt,
  getAllLanguages,
  isLanguageSupported,
} from '../../../../src/core/i18n/language-registry.js';
import type { SupportedLanguage } from '../../../../src/core/i18n/types.js';

const ALL_LANGUAGE_CODES: SupportedLanguage[] = ['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'];

describe('language-registry', () => {
  // ─── LANGUAGE_METADATA ────────────────────────────────────────────

  describe('LANGUAGE_METADATA', () => {
    it('should contain exactly 9 supported languages', () => {
      const keys = Object.keys(LANGUAGE_METADATA);
      expect(keys).toHaveLength(9);
      expect(keys.sort()).toEqual([...ALL_LANGUAGE_CODES].sort());
    });

    it.each(ALL_LANGUAGE_CODES)('should have valid metadata structure for "%s"', (code) => {
      const meta = LANGUAGE_METADATA[code];
      expect(meta).toBeDefined();
      expect(meta.code).toBe(code);
      expect(typeof meta.nativeName).toBe('string');
      expect(meta.nativeName.length).toBeGreaterThan(0);
      expect(typeof meta.englishName).toBe('string');
      expect(meta.englishName.length).toBeGreaterThan(0);
      expect(typeof meta.flag).toBe('string');
      expect(meta.flag.length).toBeGreaterThan(0);
      expect(typeof meta.completionPercent).toBe('number');
      expect(meta.completionPercent).toBeGreaterThanOrEqual(0);
      expect(meta.completionPercent).toBeLessThanOrEqual(100);
    });

    it('should have English at 100% completion', () => {
      expect(LANGUAGE_METADATA.en.completionPercent).toBe(100);
    });

    it('should have non-English languages at 0% completion', () => {
      const nonEnglish = ALL_LANGUAGE_CODES.filter((c) => c !== 'en');
      for (const code of nonEnglish) {
        expect(LANGUAGE_METADATA[code].completionPercent).toBe(0);
      }
    });

    it('should have correct native names for each language', () => {
      expect(LANGUAGE_METADATA.en.nativeName).toBe('English');
      expect(LANGUAGE_METADATA.ru.nativeName).toBe('Русский');
      expect(LANGUAGE_METADATA.es.nativeName).toBe('Español');
      expect(LANGUAGE_METADATA.zh.nativeName).toBe('中文');
      expect(LANGUAGE_METADATA.de.nativeName).toBe('Deutsch');
      expect(LANGUAGE_METADATA.fr.nativeName).toBe('Français');
      expect(LANGUAGE_METADATA.ja.nativeName).toBe('日本語');
      expect(LANGUAGE_METADATA.ko.nativeName).toBe('한국어');
      expect(LANGUAGE_METADATA.pt.nativeName).toBe('Português');
    });

    it('should have correct english names for each language', () => {
      const expectedNames: Record<SupportedLanguage, string> = {
        en: 'English',
        ru: 'Russian',
        es: 'Spanish',
        zh: 'Chinese',
        de: 'German',
        fr: 'French',
        ja: 'Japanese',
        ko: 'Korean',
        pt: 'Portuguese',
      };
      for (const code of ALL_LANGUAGE_CODES) {
        expect(LANGUAGE_METADATA[code].englishName).toBe(expectedNames[code]);
      }
    });

    it('should have a code property that matches the key for every entry', () => {
      for (const [key, meta] of Object.entries(LANGUAGE_METADATA)) {
        expect(meta.code).toBe(key);
      }
    });
  });

  // ─── SYSTEM_PROMPTS ───────────────────────────────────────────────

  describe('SYSTEM_PROMPTS', () => {
    it('should contain exactly 9 language entries', () => {
      expect(Object.keys(SYSTEM_PROMPTS)).toHaveLength(9);
    });

    it('should have an empty string prompt for English', () => {
      expect(SYSTEM_PROMPTS.en).toBe('');
    });

    it('should have non-empty prompts for all non-English languages', () => {
      const nonEnglish = ALL_LANGUAGE_CODES.filter((c) => c !== 'en');
      for (const code of nonEnglish) {
        expect(SYSTEM_PROMPTS[code].length).toBeGreaterThan(0);
      }
    });

    it('should include "LANGUAGE INSTRUCTION" in every non-English prompt', () => {
      const nonEnglish = ALL_LANGUAGE_CODES.filter((c) => c !== 'en');
      for (const code of nonEnglish) {
        expect(SYSTEM_PROMPTS[code]).toContain('LANGUAGE INSTRUCTION');
      }
    });

    it('should include "Maintain technical terms in English" in every non-English prompt', () => {
      const nonEnglish = ALL_LANGUAGE_CODES.filter((c) => c !== 'en');
      for (const code of nonEnglish) {
        expect(SYSTEM_PROMPTS[code]).toContain('Maintain technical terms in English when appropriate');
      }
    });

    it('should mention the native name in each non-English prompt', () => {
      const nativeInPrompt: Record<string, string> = {
        ru: 'Русский',
        es: 'Español',
        zh: '简体中文',
        de: 'Deutsch',
        fr: 'Français',
        ja: '日本語',
        ko: '한국어',
        pt: 'Português',
      };
      for (const [code, name] of Object.entries(nativeInPrompt)) {
        expect(SYSTEM_PROMPTS[code as SupportedLanguage]).toContain(name);
      }
    });
  });

  // ─── LANGUAGE_CONFIGS ─────────────────────────────────────────────

  describe('LANGUAGE_CONFIGS', () => {
    it('should contain exactly 9 languages', () => {
      expect(Object.keys(LANGUAGE_CONFIGS)).toHaveLength(9);
    });

    it.each(ALL_LANGUAGE_CODES)('should have valid config structure for "%s"', (code) => {
      const config = LANGUAGE_CONFIGS[code];
      expect(config).toBeDefined();
      expect(config.code).toBe(code);
      expect(typeof config.nativeName).toBe('string');
      expect(typeof config.englishName).toBe('string');
      expect(typeof config.systemPrompt).toBe('string');
      expect(config.rtl).toBe(false);
      expect(config.strings).toBeDefined();
    });

    it('should have rtl set to false for all languages', () => {
      for (const code of ALL_LANGUAGE_CODES) {
        expect(LANGUAGE_CONFIGS[code].rtl).toBe(false);
      }
    });

    it('should have systemPrompt matching SYSTEM_PROMPTS for each language', () => {
      for (const code of ALL_LANGUAGE_CODES) {
        expect(LANGUAGE_CONFIGS[code].systemPrompt).toBe(SYSTEM_PROMPTS[code]);
      }
    });

    it('should have locale strings with all required sections', () => {
      for (const code of ALL_LANGUAGE_CODES) {
        const strings = LANGUAGE_CONFIGS[code].strings;
        expect(strings.cli).toBeDefined();
        expect(strings.increment).toBeDefined();
        expect(strings.validation).toBeDefined();
        expect(strings.gates).toBeDefined();
      }
    });

    it('should have consistent nativeName between LANGUAGE_CONFIGS and LANGUAGE_METADATA', () => {
      for (const code of ALL_LANGUAGE_CODES) {
        expect(LANGUAGE_CONFIGS[code].nativeName).toBe(LANGUAGE_METADATA[code].nativeName);
      }
    });

    it('should have consistent englishName between LANGUAGE_CONFIGS and LANGUAGE_METADATA', () => {
      for (const code of ALL_LANGUAGE_CODES) {
        expect(LANGUAGE_CONFIGS[code].englishName).toBe(LANGUAGE_METADATA[code].englishName);
      }
    });

    it('should use English strings for all languages (fallback before LLM translation)', () => {
      const enStrings = LANGUAGE_CONFIGS.en.strings;
      for (const code of ALL_LANGUAGE_CODES) {
        expect(LANGUAGE_CONFIGS[code].strings).toBe(enStrings);
      }
    });

    it('should have complete English strings with expected values', () => {
      const strings = LANGUAGE_CONFIGS.en.strings;
      expect(strings.cli.welcome).toBe('Welcome to SpecWeave!');
      expect(strings.cli.error).toBe('Error');
      expect(strings.cli.success).toBe('Success');
      expect(strings.cli.warning).toBe('Warning');
      expect(strings.cli.info).toBe('Info');
      expect(strings.increment.created).toBe('Increment created');
      expect(strings.increment.inProgress).toBe('In progress');
      expect(strings.increment.completed).toBe('Completed');
      expect(strings.increment.failed).toBe('Failed');
      expect(strings.increment.taskComplete).toBe('Task completed');
      expect(strings.increment.allTasksComplete).toBe('All tasks completed');
      expect(strings.validation.invalidInput).toBe('Invalid input');
      expect(strings.validation.missingFile).toBe('File not found');
      expect(strings.validation.incompleteTasks).toBe('Incomplete tasks found');
      expect(strings.validation.blockingIncrement).toBe('Previous increments must be completed first');
      expect(strings.gates.taskGatePass).toBe('All tasks completed');
      expect(strings.gates.taskGateFail).toBe('Some tasks incomplete');
      expect(strings.gates.testGatePass).toBe('All tests passing');
      expect(strings.gates.testGateFail).toBe('Some tests failing');
      expect(strings.gates.docsGatePass).toBe('Documentation up to date');
      expect(strings.gates.docsGateFail).toBe('Documentation needs update');
    });
  });

  // ─── getLanguageMetadata ──────────────────────────────────────────

  describe('getLanguageMetadata', () => {
    it('should return metadata for English', () => {
      const meta = getLanguageMetadata('en');
      expect(meta).toBe(LANGUAGE_METADATA.en);
      expect(meta.code).toBe('en');
      expect(meta.nativeName).toBe('English');
    });

    it('should return metadata for every supported language', () => {
      for (const code of ALL_LANGUAGE_CODES) {
        const meta = getLanguageMetadata(code);
        expect(meta).toBe(LANGUAGE_METADATA[code]);
      }
    });
  });

  // ─── getLanguageConfig ────────────────────────────────────────────

  describe('getLanguageConfig', () => {
    it('should return config for English', () => {
      const config = getLanguageConfig('en');
      expect(config).toBe(LANGUAGE_CONFIGS.en);
      expect(config.code).toBe('en');
      expect(config.systemPrompt).toBe('');
    });

    it('should return config for every supported language', () => {
      for (const code of ALL_LANGUAGE_CODES) {
        const config = getLanguageConfig(code);
        expect(config).toBe(LANGUAGE_CONFIGS[code]);
      }
    });

    it('should return a config with strings property for any language', () => {
      const config = getLanguageConfig('ja');
      expect(config.strings).toBeDefined();
      expect(config.strings.cli).toBeDefined();
      expect(config.strings.increment).toBeDefined();
      expect(config.strings.validation).toBeDefined();
      expect(config.strings.gates).toBeDefined();
    });
  });

  // ─── getSystemPrompt ──────────────────────────────────────────────

  describe('getSystemPrompt', () => {
    it('should return empty string for English', () => {
      expect(getSystemPrompt('en')).toBe('');
    });

    it('should return non-empty string for non-English languages', () => {
      const nonEnglish = ALL_LANGUAGE_CODES.filter((c) => c !== 'en');
      for (const code of nonEnglish) {
        const prompt = getSystemPrompt(code);
        expect(prompt.length).toBeGreaterThan(0);
      }
    });

    it('should return the same value as SYSTEM_PROMPTS for each language', () => {
      for (const code of ALL_LANGUAGE_CODES) {
        expect(getSystemPrompt(code)).toBe(SYSTEM_PROMPTS[code]);
      }
    });
  });

  // ─── getAllLanguages ───────────────────────────────────────────────

  describe('getAllLanguages', () => {
    it('should return an array of 9 language metadata objects', () => {
      const languages = getAllLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toHaveLength(9);
    });

    it('should include all supported language codes', () => {
      const languages = getAllLanguages();
      const codes = languages.map((l) => l.code);
      for (const code of ALL_LANGUAGE_CODES) {
        expect(codes).toContain(code);
      }
    });

    it('should return LanguageMetadata objects with all required properties', () => {
      const languages = getAllLanguages();
      for (const lang of languages) {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('nativeName');
        expect(lang).toHaveProperty('englishName');
        expect(lang).toHaveProperty('flag');
        expect(lang).toHaveProperty('completionPercent');
      }
    });

    it('should return references to the same objects in LANGUAGE_METADATA', () => {
      const languages = getAllLanguages();
      for (const lang of languages) {
        expect(lang).toBe(LANGUAGE_METADATA[lang.code]);
      }
    });
  });

  // ─── isLanguageSupported ──────────────────────────────────────────

  describe('isLanguageSupported', () => {
    it('should return true for all 9 supported language codes', () => {
      for (const code of ALL_LANGUAGE_CODES) {
        expect(isLanguageSupported(code)).toBe(true);
      }
    });

    it('should return false for unsupported language codes', () => {
      expect(isLanguageSupported('xx')).toBe(false);
      expect(isLanguageSupported('it')).toBe(false);
      expect(isLanguageSupported('ar')).toBe(false);
      expect(isLanguageSupported('hi')).toBe(false);
      expect(isLanguageSupported('nl')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isLanguageSupported('')).toBe(false);
    });

    it('should return false for case-insensitive variants', () => {
      expect(isLanguageSupported('EN')).toBe(false);
      expect(isLanguageSupported('En')).toBe(false);
      expect(isLanguageSupported('RU')).toBe(false);
    });

    it('should act as a type guard narrowing to SupportedLanguage', () => {
      const code: string = 'fr';
      if (isLanguageSupported(code)) {
        // If the type guard works, 'code' is now SupportedLanguage and this compiles
        const meta = getLanguageMetadata(code);
        expect(meta.code).toBe('fr');
      }
    });
  });
});
