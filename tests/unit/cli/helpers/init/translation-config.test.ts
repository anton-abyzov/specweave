/**
 * Translation Config Tests (0188 T-013)
 *
 * Tests that all 9 languages have proper enableChoice and disableChoice fields,
 * and that no English fragments leak into non-English strings.
 */

import { describe, it, expect } from 'vitest';
import { getTranslationStrings } from '../../../../../src/cli/helpers/init/translation-config.js';

const SUPPORTED_LANGUAGES = ['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'] as const;

describe('Translation config strings (0188 T-013)', () => {
  it('should export getTranslationStrings for testability', () => {
    expect(typeof getTranslationStrings).toBe('function');
  });

  for (const lang of SUPPORTED_LANGUAGES) {
    it(`should have enableChoice field for language: ${lang}`, () => {
      const strings = getTranslationStrings(lang);
      expect(strings.enableChoice).toBeDefined();
      expect(typeof strings.enableChoice).toBe('string');
      expect(strings.enableChoice.length).toBeGreaterThan(0);
    });

    it(`should have disableChoice field for language: ${lang}`, () => {
      const strings = getTranslationStrings(lang);
      expect(strings.disableChoice).toBeDefined();
      expect(typeof strings.disableChoice).toBe('string');
      expect(strings.disableChoice.length).toBeGreaterThan(0);
    });
  }

  // Check no English fragments leak into non-English strings
  const nonEnglishLanguages = ['ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'] as const;
  const enStrings = getTranslationStrings('en');

  for (const lang of nonEnglishLanguages) {
    it(`should not reuse English choice strings in ${lang}`, () => {
      const strings = getTranslationStrings(lang);
      // Ensure non-English strings differ from English versions
      expect(strings.enableChoice).not.toBe(enStrings.enableChoice);
      expect(strings.disableChoice).not.toBe(enStrings.disableChoice);
    });
  }
});
