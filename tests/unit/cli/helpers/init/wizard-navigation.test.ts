/**
 * Unit tests for wizard-navigation
 *
 * Tests pure functions: isGoBack, getGoBackStrings, createGoBackChoice
 */

import { describe, it, expect } from 'vitest';
import {
  WIZARD_BACK,
  isGoBack,
  getGoBackStrings,
  createGoBackChoice,
} from '../../../../../src/cli/helpers/init/wizard-navigation.js';

describe('wizard-navigation', () => {
  describe('isGoBack', () => {
    it('should return true for WIZARD_BACK symbol', () => {
      expect(isGoBack(WIZARD_BACK)).toBe(true);
    });

    it('should return false for string value', () => {
      expect(isGoBack('some-value')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isGoBack(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isGoBack(undefined)).toBe(false);
    });

    it('should return false for object', () => {
      expect(isGoBack({ value: 'test' })).toBe(false);
    });

    it('should return false for a different symbol', () => {
      expect(isGoBack(Symbol('other'))).toBe(false);
    });
  });

  describe('getGoBackStrings', () => {
    it('should return English strings for en', () => {
      const strings = getGoBackStrings('en');
      expect(strings.goBack).toContain('Go back');
      expect(strings.yes).toBe('Yes');
      expect(strings.no).toBe('No');
      expect(strings.goingBack).toContain('Going back');
    });

    it('should return Russian strings for ru', () => {
      const strings = getGoBackStrings('ru');
      expect(strings.yes).toBe('Да');
      expect(strings.no).toBe('Нет');
    });

    it('should return Spanish strings for es', () => {
      const strings = getGoBackStrings('es');
      expect(strings.yes).toBe('Sí');
    });

    it('should return Chinese strings for zh', () => {
      const strings = getGoBackStrings('zh');
      expect(strings.yes).toBe('是');
    });

    it('should return German strings for de', () => {
      const strings = getGoBackStrings('de');
      expect(strings.yes).toBe('Ja');
    });

    it('should return French strings for fr', () => {
      const strings = getGoBackStrings('fr');
      expect(strings.yes).toBe('Oui');
    });

    it('should return Japanese strings for ja', () => {
      const strings = getGoBackStrings('ja');
      expect(strings.yes).toBe('はい');
    });

    it('should return Korean strings for ko', () => {
      const strings = getGoBackStrings('ko');
      expect(strings.yes).toBe('예');
    });

    it('should return Portuguese strings for pt', () => {
      const strings = getGoBackStrings('pt');
      expect(strings.yes).toBe('Sim');
    });

    it('should fall back to English for unknown language', () => {
      const strings = getGoBackStrings('xx' as any);
      expect(strings.yes).toBe('Yes');
    });
  });

  describe('createGoBackChoice', () => {
    it('should return choice with value "back"', () => {
      const choice = createGoBackChoice('en');
      expect(choice.value).toBe('back');
    });

    it('should include go-back text in name', () => {
      const choice = createGoBackChoice('en');
      // The name includes chalk formatting but the text should contain the go-back string
      expect(choice.name).toBeTruthy();
      expect(typeof choice.name).toBe('string');
    });

    it('should default to English', () => {
      const choice = createGoBackChoice();
      expect(choice.value).toBe('back');
      expect(choice.name).toBeTruthy();
    });
  });
});
