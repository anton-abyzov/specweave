/**
 * Tests for Severity Classifier
 */

import { describe, it, expect } from 'vitest';
import { SeverityClassifier } from '../../../../src/core/discrepancy/severity-classifier.js';

describe('SeverityClassifier', () => {
  const classifier = new SeverityClassifier();

  describe('classify', () => {
    describe('removals', () => {
      it('should classify removed API routes as breaking', () => {
        const result = classifier.classify({
          category: 'removed',
          itemType: 'api-route',
          specValue: 'GET /users',
          codeValue: '',
        });

        expect(result.severity).toBe('breaking');
        expect(result.confidence).toBe('high');
      });

      it('should classify removed functions as breaking', () => {
        const result = classifier.classify({
          category: 'removed',
          itemType: 'function-signature',
          specValue: 'myFunction()',
          codeValue: '',
        });

        expect(result.severity).toBe('breaking');
      });

      it('should classify removed types as major', () => {
        const classifier = new SeverityClassifier({
          config: { strictRemovals: false },
        });

        const result = classifier.classify({
          category: 'removed',
          itemType: 'type-definition',
          specValue: 'interface User',
          codeValue: '',
        });

        expect(result.severity).toBe('major');
      });
    });

    describe('additions', () => {
      it('should classify added API routes as major', () => {
        const result = classifier.classify({
          category: 'added',
          itemType: 'api-route',
          specValue: '',
          codeValue: 'POST /users',
        });

        expect(result.severity).toBe('major');
      });

      it('should classify added functions as major', () => {
        const result = classifier.classify({
          category: 'added',
          itemType: 'function-signature',
          specValue: '',
          codeValue: 'newFunction()',
        });

        expect(result.severity).toBe('major');
      });

      it('should classify added types as minor', () => {
        const result = classifier.classify({
          category: 'added',
          itemType: 'type-definition',
          specValue: '',
          codeValue: 'interface NewType',
        });

        expect(result.severity).toBe('minor');
      });
    });

    describe('modifications', () => {
      it('should classify trivial changes as trivial', () => {
        const result = classifier.classify({
          category: 'modified',
          itemType: 'function-signature',
          specValue: 'myFunction(a, b)',
          codeValue: 'myfunction(a, b)', // Just case difference
          description: 'typo fix',
        });

        expect(result.severity).toBe('trivial');
      });

      it('should classify return type changes as breaking', () => {
        const result = classifier.classify({
          category: 'modified',
          itemType: 'function-signature',
          specValue: 'myFunc(): string',
          codeValue: 'myFunc(): number',
          description: 'Return type: spec says string, code returns number',
        });

        expect(result.severity).toBe('breaking');
      });

      it('should classify API version changes as major', () => {
        const result = classifier.classify({
          category: 'modified',
          itemType: 'api-route',
          specValue: 'GET /v1/users',
          codeValue: 'GET /v2/users',
        });

        expect(result.severity).toBe('major');
      });

      it('should classify parameter count decrease as breaking', () => {
        const result = classifier.classify({
          category: 'modified',
          itemType: 'function-signature',
          specValue: 'myFunc(a, b, c)',
          codeValue: 'myFunc(a, b)',
          description: 'Parameter count: spec has 3, code has 2',
        });

        expect(result.severity).toBe('breaking');
      });
    });
  });

  describe('getRecommendation', () => {
    it('should recommend auto-update for trivial', () => {
      expect(classifier.getRecommendation('trivial')).toBe('auto-update');
    });

    it('should recommend review-required for minor', () => {
      expect(classifier.getRecommendation('minor')).toBe('review-required');
    });

    it('should recommend notify for major', () => {
      expect(classifier.getRecommendation('major')).toBe('notify');
    });

    it('should recommend alert for breaking', () => {
      expect(classifier.getRecommendation('breaking')).toBe('alert');
    });
  });

  describe('conservative mode', () => {
    it('should classify higher when uncertain in conservative mode', () => {
      const conservative = new SeverityClassifier({ config: { conservative: true } });
      // When the values are different enough, conservative mode classifies higher
      const result = conservative.classify({
        category: 'modified',
        itemType: 'function-signature',
        specValue: 'func(a)',
        codeValue: 'func(a, b)', // Different signature
        description: 'Parameter added',
      });

      expect(result.severity).toBe('minor'); // Conservative for unclear modifications
    });

    it('should classify trivial for identical normalized values', () => {
      const nonConservative = new SeverityClassifier({ config: { conservative: false } });
      const result = nonConservative.classify({
        category: 'modified',
        itemType: 'function-signature',
        specValue: 'func()',
        codeValue: 'func()', // Same value = trivial
      });

      expect(result.severity).toBe('trivial');
    });
  });
});
