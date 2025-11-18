/**
 * Integration tests for LocaleManager
 *
 * Tests the i18n infrastructure for CLI localization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getLocaleManager, resetLocaleManager } from '../../src/core/i18n/locale-manager.js';
import { SupportedLanguage } from '../../src/core/i18n/types.js';

describe('LocaleManager Integration Tests', () => {
  beforeEach(() => {
    resetLocaleManager(); // Reset singleton between tests
  });

  describe('Basic Functionality', () => {
    it('should load English locale by default', () => {
      const locale = getLocaleManager('en');
      const welcome = locale.t('cli', 'init.welcome');

      expect(welcome).toBe('🚀 SpecWeave Initialization');
      expect(welcome).not.toBe('init.welcome'); // Should not return key
    });

    it('should load Russian locale', () => {
      const locale = getLocaleManager('ru');
      const welcome = locale.t('cli', 'init.welcome');

      expect(welcome).toBe('🚀 Инициализация SpecWeave');
      expect(welcome).not.toBe('init.welcome'); // Should not return key
    });

    it('should switch languages', () => {
      const locale = getLocaleManager('en');
      expect(locale.t('cli', 'init.welcome')).toBe('🚀 SpecWeave Initialization');

      locale.setLanguage('ru');
      expect(locale.t('cli', 'init.welcome')).toBe('🚀 Инициализация SpecWeave');
    });
  });

  describe('Nested Key Navigation', () => {
    it('should handle nested keys', () => {
      const locale = getLocaleManager('en');

      const cancelled = locale.t('cli', 'init.errors.cancelled');
      expect(cancelled).toBe('❌ Initialization cancelled');
    });

    it('should handle deeply nested keys', () => {
      const locale = getLocaleManager('en');

      const invalidLanguage = locale.t('cli', 'init.errors.invalidLanguage', { language: 'xyz' });
      expect(invalidLanguage).toContain('Invalid language');
      expect(invalidLanguage).toContain('xyz');
    });

    it('should return key as fallback if path not found', () => {
      const locale = getLocaleManager('en');

      const missing = locale.t('cli', 'nonexistent.path.key');
      expect(missing).toBe('nonexistent.path.key');
    });
  });

  describe('String Interpolation', () => {
    it('should support {{param}} interpolation', () => {
      const locale = getLocaleManager('en');

      const result = locale.t('cli', 'init.errors.invalidLanguage', { language: 'xyz' });
      expect(result).toContain('xyz');
    });

    it('should support multiple parameters', () => {
      const locale = getLocaleManager('en');

      const result = locale.t('cli', 'init.info.copiedFiles', { count: 5 });
      expect(result).toContain('5');
      expect(result).toContain('command files');
    });

    it('should handle numeric parameters', () => {
      const locale = getLocaleManager('ru');

      const result = locale.t('cli', 'init.info.copiedAgents', { count: 21 });
      expect(result).toContain('21');
    });
  });

  describe('Error Messages', () => {
    it('should load all init error messages', () => {
      const locale = getLocaleManager('en');

      const errors = [
        'init.errors.cancelled',
        'init.errors.invalidLanguage',
        'init.errors.commandsCopyFailed',
        'init.errors.sourceNotFound',
        'init.errors.sourceEmpty',
        'init.errors.installationIssue'
      ];

      errors.forEach(errorKey => {
        const result = locale.t('cli', errorKey, { language: 'test', type: 'test', error: 'test', path: 'test' });
        expect(result).not.toBe(errorKey); // Should translate, not return key
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should translate error messages to Russian', () => {
      const locale = getLocaleManager('ru');

      const cancelled = locale.t('cli', 'init.errors.cancelled');
      expect(cancelled).toContain('Инициализация');
      expect(cancelled).not.toContain('Initialization');
    });
  });

  describe('Warning Messages', () => {
    it('should load warning messages', () => {
      const locale = getLocaleManager('en');

      const dirWarning = locale.t('cli', 'init.warnings.invalidDirName', { dirName: 'Test-Dir' });
      expect(dirWarning).toContain('Test-Dir');
      expect(dirWarning).toContain('invalid characters');
    });
  });

  describe('Success Messages', () => {
    it('should load copy success messages', () => {
      const locale = getLocaleManager('en');

      const copied = locale.t('cli', 'init.info.copiedFiles', { count: 10 });
      expect(copied).toContain('10');
      expect(copied).toContain('command files');
    });

    it('should load Russian success messages', () => {
      const locale = getLocaleManager('ru');

      const copied = locale.t('cli', 'init.info.copiedFiles', { count: 10 });
      expect(copied).toContain('10');
      expect(copied).toContain('файлов команд');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const locale1 = getLocaleManager('en');
      const locale2 = getLocaleManager('en');

      expect(locale1).toBe(locale2);
    });

    it('should reset singleton', () => {
      const locale1 = getLocaleManager('en');
      resetLocaleManager();
      const locale2 = getLocaleManager('ru');

      expect(locale1).not.toBe(locale2);
      expect(locale2.getCurrentLanguage()).toBe('ru');
    });
  });

  describe('Multiple Languages', () => {
    const languages: SupportedLanguage[] = ['en', 'ru', 'zh', 'de', 'fr', 'ja', 'ko', 'pt', 'es'];

    it('should load all supported languages', () => {
      languages.forEach(lang => {
        resetLocaleManager();
        const locale = getLocaleManager(lang);
        const welcome = locale.t('cli', 'init.welcome');

        // Should not return key (meaning locale file loaded)
        expect(welcome).not.toBe('init.welcome');
        expect(welcome.length).toBeGreaterThan(0);
      });
    });
  });
});
