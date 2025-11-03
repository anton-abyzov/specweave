/**
 * Locale String Manager
 * 
 * Manages locale-specific strings for CLI messages and prompts.
 * 
 * @module core/i18n
 */

import { SupportedLanguage, LocaleStrings } from './types.js';
import { getLanguageConfig } from './language-registry.js';

/**
 * Locale Manager for CLI strings
 */
export class LocaleManager {
  private currentLanguage: SupportedLanguage;
  private localeStrings: LocaleStrings;

  constructor(language: SupportedLanguage = 'en') {
    this.currentLanguage = language;
    const config = getLanguageConfig(language);
    this.localeStrings = config.strings;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Set current language
   */
  setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
    const config = getLanguageConfig(language);
    this.localeStrings = config.strings;
  }

  /**
   * Get CLI string
   */
  getCLI(key: keyof LocaleStrings['cli']): string {
    return this.localeStrings.cli[key];
  }

  /**
   * Get increment string
   */
  getIncrement(key: keyof LocaleStrings['increment']): string {
    return this.localeStrings.increment[key];
  }

  /**
   * Get validation string
   */
  getValidation(key: keyof LocaleStrings['validation']): string {
    return this.localeStrings.validation[key];
  }

  /**
   * Get gate string
   */
  getGate(key: keyof LocaleStrings['gates']): string {
    return this.localeStrings.gates[key];
  }

  /**
   * Get translated string with interpolation
   */
  t(category: keyof LocaleStrings, key: string, params?: Record<string, string>): string {
    let text = (this.localeStrings[category] as any)[key] as string;

    if (params) {
      Object.keys(params).forEach((param) => {
        text = text.replace(`{${param}}`, params[param]);
      });
    }

    return text;
  }
}

// Singleton instance
let instance: LocaleManager | null = null;

/**
 * Get singleton instance
 */
export function getLocaleManager(language?: SupportedLanguage): LocaleManager {
  if (!instance) {
    instance = new LocaleManager(language);
  }
  return instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetLocaleManager(): void {
  instance = null;
}
