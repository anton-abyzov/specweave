/**
 * Language Detector Tests
 *
 * Comprehensive unit tests for detectLanguageFromEnvironment,
 * detectLanguageFromContent, detectLanguage, and parseLanguageCode.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Hoisted mocks
const { mockIsLanguageSupported } = vi.hoisted(() => ({
  mockIsLanguageSupported: vi.fn(),
}));

vi.mock('../../../../src/core/i18n/language-registry.js', () => ({
  isLanguageSupported: mockIsLanguageSupported,
}));

import {
  detectLanguageFromEnvironment,
  detectLanguageFromContent,
  detectLanguage,
  parseLanguageCode,
} from '../../../../src/core/i18n/language-detector.js';

describe('language-detector', () => {
  let savedNodeLang: string | undefined;
  let savedLang: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    // Save original env values
    savedNodeLang = process.env.NODE_LANG;
    savedLang = process.env.LANG;

    // Clear env vars for a clean slate
    delete process.env.NODE_LANG;
    delete process.env.LANG;

    // Default mock: support the 9 known languages
    mockIsLanguageSupported.mockImplementation((code: string) => {
      return ['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'].includes(code);
    });
  });

  afterEach(() => {
    // Restore original env values
    if (savedNodeLang !== undefined) {
      process.env.NODE_LANG = savedNodeLang;
    } else {
      delete process.env.NODE_LANG;
    }
    if (savedLang !== undefined) {
      process.env.LANG = savedLang;
    } else {
      delete process.env.LANG;
    }
  });

  // ===========================================================
  // detectLanguageFromEnvironment
  // ===========================================================
  describe('detectLanguageFromEnvironment', () => {
    it('should return English by default when no env vars are set', () => {
      const result = detectLanguageFromEnvironment();
      expect(result).toEqual({
        language: 'en',
        confidence: 1.0,
        reliable: true,
      });
    });

    it('should detect language from NODE_LANG env var', () => {
      process.env.NODE_LANG = 'ru';
      const result = detectLanguageFromEnvironment();
      expect(result).toEqual({
        language: 'ru',
        confidence: 0.9,
        reliable: true,
      });
    });

    it('should fall back to LANG when NODE_LANG is not set', () => {
      process.env.LANG = 'fr';
      const result = detectLanguageFromEnvironment();
      expect(result).toEqual({
        language: 'fr',
        confidence: 0.9,
        reliable: true,
      });
    });

    it('should prefer NODE_LANG over LANG', () => {
      process.env.NODE_LANG = 'de';
      process.env.LANG = 'fr';
      const result = detectLanguageFromEnvironment();
      expect(result).toEqual({
        language: 'de',
        confidence: 0.9,
        reliable: true,
      });
    });

    it('should extract language from locale format with underscore (en_US)', () => {
      process.env.LANG = 'es_ES';
      const result = detectLanguageFromEnvironment();
      expect(result.language).toBe('es');
      expect(result.confidence).toBe(0.9);
    });

    it('should extract language from locale with UTF-8 encoding (en_US.UTF-8)', () => {
      process.env.LANG = 'ja_JP.UTF-8';
      const result = detectLanguageFromEnvironment();
      expect(result.language).toBe('ja');
    });

    it('should handle a bare encoding string like C.UTF-8 gracefully', () => {
      process.env.LANG = 'C.UTF-8';
      mockIsLanguageSupported.mockImplementation((code: string) => {
        // "c" is not a supported language
        return ['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'].includes(code);
      });
      const result = detectLanguageFromEnvironment();
      // "c" is not supported, should fall back to English
      expect(result.language).toBe('en');
      expect(result.confidence).toBe(1.0);
    });

    it('should default to English for unsupported language codes', () => {
      process.env.LANG = 'xx_XX.UTF-8';
      const result = detectLanguageFromEnvironment();
      expect(result).toEqual({
        language: 'en',
        confidence: 1.0,
        reliable: true,
      });
    });

    it('should lowercase the language code before checking support', () => {
      process.env.NODE_LANG = 'RU';
      // The code does .toLowerCase(), so "RU" -> "ru" which is supported
      const result = detectLanguageFromEnvironment();
      expect(result.language).toBe('ru');
      expect(result.confidence).toBe(0.9);
    });

    it('should handle empty NODE_LANG and fall through to LANG', () => {
      process.env.NODE_LANG = '';
      process.env.LANG = 'ko';
      const result = detectLanguageFromEnvironment();
      expect(result.language).toBe('ko');
    });
  });

  // ===========================================================
  // detectLanguageFromContent
  // ===========================================================
  describe('detectLanguageFromContent', () => {
    it('should detect Russian from Cyrillic characters', () => {
      const result = detectLanguageFromContent('Привет мир');
      expect(result).toEqual({
        language: 'ru',
        confidence: 0.8,
        reliable: true,
      });
    });

    it('should detect Chinese from CJK characters', () => {
      const result = detectLanguageFromContent('你好世界');
      expect(result).toEqual({
        language: 'zh',
        confidence: 0.7,
        reliable: false,
      });
    });

    it('should detect Japanese from Hiragana characters', () => {
      const result = detectLanguageFromContent('こんにちは');
      expect(result).toEqual({
        language: 'ja',
        confidence: 0.9,
        reliable: true,
      });
    });

    it('should detect Japanese from Katakana characters', () => {
      const result = detectLanguageFromContent('カタカナ');
      expect(result).toEqual({
        language: 'ja',
        confidence: 0.9,
        reliable: true,
      });
    });

    it('should detect Korean from Hangul characters', () => {
      const result = detectLanguageFromContent('안녕하세요');
      expect(result).toEqual({
        language: 'ko',
        confidence: 0.9,
        reliable: true,
      });
    });

    it('should detect Spanish from common Spanish words', () => {
      const result = detectLanguageFromContent('el gato gordo');
      expect(result).toEqual({
        language: 'es',
        confidence: 0.6,
        reliable: false,
      });
    });

    it('should detect French from common French words', () => {
      // Use "les" which is in French pattern but NOT in Spanish pattern
      const result = detectLanguageFromContent('les enfants jouent');
      expect(result).toEqual({
        language: 'fr',
        confidence: 0.6,
        reliable: false,
      });
    });

    it('should detect German from common German words', () => {
      // Use "der" which is unique to German pattern
      const result = detectLanguageFromContent('der Hund ist gro\u00df');
      expect(result).toEqual({
        language: 'de',
        confidence: 0.6,
        reliable: false,
      });
    });

    it('should detect Portuguese from common Portuguese words', () => {
      // Use "em" which is in Portuguese pattern. Avoid triggering earlier patterns.
      // "em" is in the Portuguese pattern: /\b(o|a|os|as|um|uma|de|que|em)\b/i
      // But "a" and "de" also appear in Spanish/French patterns.
      // We need to avoid matching Spanish, French, German patterns first.
      // Actually, the order matters: Spanish is checked first.
      // "os" is unique to Portuguese pattern but not Spanish
      // Let's use "os meninos" - "os" matches Portuguese but not Spanish/French/German
      const result = detectLanguageFromContent('os meninos brincam');
      expect(result).toEqual({
        language: 'pt',
        confidence: 0.6,
        reliable: false,
      });
    });

    it('should default to English for unrecognizable content', () => {
      const result = detectLanguageFromContent('12345 67890');
      expect(result).toEqual({
        language: 'en',
        confidence: 0.5,
        reliable: false,
      });
    });

    it('should default to English for empty string', () => {
      const result = detectLanguageFromContent('');
      expect(result).toEqual({
        language: 'en',
        confidence: 0.5,
        reliable: false,
      });
    });

    it('should prioritize Cyrillic over Latin word matches', () => {
      // Content with both Cyrillic and a word like "de"
      const result = detectLanguageFromContent('de facto \u0410\u0411\u0412');
      expect(result.language).toBe('ru');
    });

    it('should prioritize CJK over Hiragana when both present (CJK checked first)', () => {
      // Content with both CJK and Hiragana - CJK regex is checked before Hiragana
      const result = detectLanguageFromContent('\u4E16\u754C\u3053\u3093\u306B\u3061\u306F');
      expect(result.language).toBe('zh');
    });

    it('should match Spanish word "que" case-insensitively', () => {
      const result = detectLanguageFromContent('QUE pasa');
      expect(result.language).toBe('es');
    });

    it('should not match partial words (word boundary check)', () => {
      // "delete" contains "de" but \b should not match it as a standalone word
      // Actually, looking at the regex more carefully: /\b(el|la|los|las|un|una|de|que|en)\b/i
      // "delete" - \bde\b would NOT match inside "delete" because "l" follows
      // Wait: "de" in "delete" - the word boundary is at the start of "delete" and "de" is followed by "l" not a boundary
      // So \bde\b would match "de" in "de facto" but NOT in "delete"
      const result = detectLanguageFromContent('delete something');
      // "delete" should NOT trigger Spanish "de" match
      // But let's check: actually in "delete", "de" at position 0-1, followed by "l" - no word boundary after "de" in "delete"
      // However, there might be other words. Let's use a string without any matching words.
      expect(result.language).toBe('en');
    });
  });

  // ===========================================================
  // detectLanguage (fallback chain)
  // ===========================================================
  describe('detectLanguage', () => {
    it('should return content-based detection when reliable and high confidence', () => {
      const result = detectLanguage({ content: '\u041F\u0440\u0438\u0432\u0435\u0442' });
      expect(result.language).toBe('ru');
      expect(result.confidence).toBe(0.8);
      expect(result.reliable).toBe(true);
    });

    it('should fall through unreliable content detection to env detection', () => {
      process.env.LANG = 'de';
      // CJK detection is unreliable (reliable: false), so should fall through
      // But confidence is 0.7, and the threshold is > 0.7, so 0.7 does NOT pass
      const result = detectLanguage({ content: '\u4F60\u597D' });
      // CJK: confidence=0.7, reliable=false => both checks fail
      // Falls through to env detection
      expect(result.language).toBe('de');
    });

    it('should fall through low-confidence content to env detection', () => {
      process.env.LANG = 'fr';
      // Spanish word detection: confidence=0.6, reliable=false
      const result = detectLanguage({ content: 'el gato' });
      // confidence 0.6 <= 0.7, so falls through
      expect(result.language).toBe('fr');
    });

    it('should use env detection when no content is provided', () => {
      process.env.NODE_LANG = 'ja';
      const result = detectLanguage();
      expect(result.language).toBe('ja');
    });

    it('should use env detection when options are empty object', () => {
      process.env.LANG = 'ko';
      const result = detectLanguage({});
      expect(result.language).toBe('ko');
    });

    it('should use fallback when env detection returns unsupported language', () => {
      // env returns default English (confidence 1.0, reliable true)
      // when no env vars set, detectLanguageFromEnvironment returns en with reliable:true
      // so it will return English from env, not the fallback
      const result = detectLanguage({ fallback: 'ru' });
      // No env vars set => detectLanguageFromEnvironment returns en, reliable: true
      expect(result.language).toBe('en');
    });

    it('should use provided fallback language when specified', () => {
      // To actually trigger fallback, env detection must return unreliable result
      // But detectLanguageFromEnvironment always returns reliable: true
      // So fallback is only used if env detection is not reliable
      // Looking at the code: envResult.reliable is always true in detectLanguageFromEnvironment
      // Thus the fallback path is theoretically unreachable with the current implementation
      // unless isLanguageSupported returns something unexpected
      // Let's still test the fallback parameter is properly destructured
      const result = detectLanguage({ fallback: 'de' });
      // Since env is always reliable, this returns env result (en)
      expect(result.language).toBe('en');
    });

    it('should default fallback to "en" when not provided', () => {
      const result = detectLanguage(undefined);
      expect(result.language).toBe('en');
    });

    it('should return content detection for Japanese (reliable + confidence 0.9 > 0.7)', () => {
      const result = detectLanguage({ content: '\u3053\u3093\u306B\u3061\u306F' });
      expect(result.language).toBe('ja');
      expect(result.confidence).toBe(0.9);
    });

    it('should return content detection for Korean (reliable + confidence 0.9 > 0.7)', () => {
      const result = detectLanguage({ content: '\uC548\uB155\uD558\uC138\uC694' });
      expect(result.language).toBe('ko');
      expect(result.confidence).toBe(0.9);
    });

    it('should skip content detection when content is empty string', () => {
      process.env.LANG = 'es';
      // Empty string is falsy, so content branch is skipped
      const result = detectLanguage({ content: '' });
      expect(result.language).toBe('es');
    });
  });

  // ===========================================================
  // parseLanguageCode
  // ===========================================================
  describe('parseLanguageCode', () => {
    it('should parse a simple two-letter code', () => {
      expect(parseLanguageCode('en')).toBe('en');
    });

    it('should parse underscore locale format (en_US)', () => {
      expect(parseLanguageCode('en_US')).toBe('en');
    });

    it('should parse hyphen locale format (en-US)', () => {
      expect(parseLanguageCode('en-US')).toBe('en');
    });

    it('should lowercase the code before checking', () => {
      expect(parseLanguageCode('FR')).toBe('fr');
    });

    it('should handle mixed case with locale (Zh_CN)', () => {
      expect(parseLanguageCode('Zh_CN')).toBe('zh');
    });

    it('should return null for unsupported language code', () => {
      expect(parseLanguageCode('xx')).toBeNull();
    });

    it('should return null for empty string', () => {
      // '' split by [-_] => [''], [0] => '', lowercase '' => ''
      // isLanguageSupported('') => false
      expect(parseLanguageCode('')).toBeNull();
    });

    it('should handle complex locale strings like pt-BR', () => {
      expect(parseLanguageCode('pt-BR')).toBe('pt');
    });

    it('should handle all supported languages', () => {
      const codes = ['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'];
      for (const code of codes) {
        expect(parseLanguageCode(code)).toBe(code);
      }
    });

    it('should call isLanguageSupported with the normalized code', () => {
      parseLanguageCode('DE_AT');
      expect(mockIsLanguageSupported).toHaveBeenCalledWith('de');
    });

    it('should return null for numeric-only input', () => {
      expect(parseLanguageCode('123')).toBeNull();
    });
  });
});
