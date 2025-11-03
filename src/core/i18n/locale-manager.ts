/**
 * Locale String Manager
 *
 * Manages locale-specific strings for CLI messages and prompts.
 *
 * @module core/i18n
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { SupportedLanguage, LocaleStrings } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Locale Manager for CLI strings
 */
export class LocaleManager {
  private currentLanguage: SupportedLanguage;
  private localeStrings: any;

  constructor(language: SupportedLanguage = 'en') {
    this.currentLanguage = language;
    this.localeStrings = this.loadLocaleStrings(language);
  }

  /**
   * Load locale strings from JSON file
   */
  private loadLocaleStrings(language: SupportedLanguage): any {
    try {
      // Try to load from src/locales first (development)
      const srcPath = path.join(__dirname, `../../locales/${language}/cli.json`);
      if (fs.existsSync(srcPath)) {
        return fs.readJSONSync(srcPath);
      }

      // Fallback to dist/locales (production)
      const distPath = path.join(__dirname, `../locales/${language}/cli.json`);
      if (fs.existsSync(distPath)) {
        return fs.readJSONSync(distPath);
      }

      // Fallback to English if language file not found
      const enPath = path.join(__dirname, `../../locales/en/cli.json`);
      if (fs.existsSync(enPath)) {
        return fs.readJSONSync(enPath);
      }

      // Last resort: return empty object
      return {};
    } catch (error) {
      console.warn(`Failed to load locale strings for ${language}, using English fallback`);
      return {};
    }
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
    this.localeStrings = this.loadLocaleStrings(language);
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
   * Supports nested keys like 'init.welcome' or 'init.errors.cancelled'
   *
   * @param category - For compatibility, but ignored (JSON has flat structure)
   * @param key - Nested key path (e.g., 'init.welcome')
   * @param params - Optional parameters for interpolation
   */
  t(category: keyof LocaleStrings, key: string, params?: Record<string, string | number>): string {
    // Navigate nested object path from root (ignore category parameter)
    const keys = key.split('.');
    let text: any = this.localeStrings;

    for (const k of keys) {
      if (text && typeof text === 'object') {
        text = text[k];
      } else {
        return key; // Return key as fallback if path not found
      }
    }

    if (typeof text !== 'string') {
      return key; // Return key as fallback if not a string
    }

    // Support both {param} and {{param}} interpolation
    if (params) {
      Object.keys(params).forEach((param) => {
        const value = String(params[param]);
        text = text.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), value);
        text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
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
