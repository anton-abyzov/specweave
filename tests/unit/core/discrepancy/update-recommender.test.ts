/**
 * Tests for Update Recommender
 */

import { describe, it, expect } from 'vitest';
import { UpdateRecommender } from '../../../../src/core/discrepancy/update-recommender.js';
import { Discrepancy } from '../../../../src/core/discrepancy/detector.js';

describe('UpdateRecommender', () => {
  const recommender = new UpdateRecommender();

  const createDiscrepancy = (overrides: Partial<Discrepancy>): Discrepancy => ({
    id: 'DISC-0001',
    type: 'api-route',
    category: 'added',
    severity: 'major',
    recommendation: 'notify',
    specPath: '',
    specLineNumber: 0,
    codePath: 'src/routes.ts',
    codeLineNumber: 10,
    specValue: '',
    codeValue: 'GET /users',
    description: 'New API route',
    detectedAt: new Date().toISOString(),
    ...overrides,
  });

  describe('recommend', () => {
    it('should recommend auto-update for trivial severity', () => {
      const discrepancy = createDiscrepancy({ severity: 'trivial' });
      const result = recommender.recommend(discrepancy);

      expect(result.recommendation).toBe('auto-update');
      expect(result.riskLevel).toBe('low');
    });

    it('should recommend review-required for minor severity', () => {
      const discrepancy = createDiscrepancy({ severity: 'minor' });
      const result = recommender.recommend(discrepancy);

      expect(result.recommendation).toBe('review-required');
    });

    it('should recommend notify for major severity', () => {
      const discrepancy = createDiscrepancy({ severity: 'major' });
      const result = recommender.recommend(discrepancy);

      expect(result.recommendation).toBe('notify');
    });

    it('should recommend alert for breaking severity', () => {
      const discrepancy = createDiscrepancy({ severity: 'breaking' });
      const result = recommender.recommend(discrepancy);

      expect(result.recommendation).toBe('alert');
      expect(result.riskLevel).toBe('high');
    });

    it('should assess medium risk for removals', () => {
      const discrepancy = createDiscrepancy({
        category: 'removed',
        severity: 'major',
      });
      const result = recommender.recommend(discrepancy);

      expect(result.riskLevel).toBe('medium');
    });

    it('should assess low risk for additions', () => {
      const discrepancy = createDiscrepancy({
        category: 'added',
        severity: 'minor',
      });
      const result = recommender.recommend(discrepancy);

      expect(result.riskLevel).toBe('low');
    });
  });

  describe('generatePatch', () => {
    it('should generate patch for added API routes', () => {
      const discrepancy = createDiscrepancy({
        category: 'added',
        type: 'api-route',
        codeValue: 'POST /users',
        codePath: 'src/routes.ts',
      });

      const patch = recommender.generatePatch(discrepancy);

      expect(patch).toBeDefined();
      expect(patch?.newText).toContain('## POST /users');
      expect(patch?.reason).toContain('Add documentation');
    });

    it('should generate patch for modified routes', () => {
      const discrepancy = createDiscrepancy({
        category: 'modified',
        type: 'api-route',
        specPath: 'docs/api.md',
        specLineNumber: 5,
        specValue: 'GET /users',
        codeValue: 'GET /api/v2/users',
        description: 'Path changed',
      });

      const patch = recommender.generatePatch(discrepancy);

      expect(patch).toBeDefined();
      expect(patch?.originalText).toBe('GET /users');
      expect(patch?.newText).toBe('GET /api/v2/users');
    });

    it('should generate patch for added functions', () => {
      const discrepancy = createDiscrepancy({
        category: 'added',
        type: 'function-signature',
        codeValue: 'myFunction(a: number, b: string): boolean',
      });

      const patch = recommender.generatePatch(discrepancy);

      expect(patch).toBeDefined();
      expect(patch?.newText).toContain('myFunction');
    });

    it('should not generate patch for alerts', () => {
      const discrepancy = createDiscrepancy({
        severity: 'breaking',
      });

      const result = recommender.recommend(discrepancy);

      expect(result.patch).toBeUndefined();
    });
  });

  describe('recommendAll', () => {
    it('should process multiple discrepancies', () => {
      const discrepancies = [
        createDiscrepancy({ id: 'DISC-0001', severity: 'trivial' }),
        createDiscrepancy({ id: 'DISC-0002', severity: 'major' }),
        createDiscrepancy({ id: 'DISC-0003', severity: 'breaking' }),
      ];

      const results = recommender.recommendAll(discrepancies);

      expect(results).toHaveLength(3);
      expect(results[0].recommendation).toBe('auto-update');
      expect(results[1].recommendation).toBe('notify');
      expect(results[2].recommendation).toBe('alert');
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', () => {
      const recommendations = recommender.recommendAll([
        createDiscrepancy({ id: 'DISC-0001', severity: 'trivial' }),
        createDiscrepancy({ id: 'DISC-0002', severity: 'breaking', category: 'removed' }),
      ]);

      const report = recommender.generateReport(recommendations);

      expect(report).toContain('# Discrepancy Recommendations Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('⚠️ Alerts');
      expect(report).toContain('Auto-Update');
    });

    it('should include summary counts', () => {
      const recommendations = recommender.recommendAll([
        createDiscrepancy({ severity: 'trivial' }),
        createDiscrepancy({ severity: 'trivial' }),
        createDiscrepancy({ severity: 'major' }),
      ]);

      const report = recommender.generateReport(recommendations);

      expect(report).toContain('Total discrepancies: 3');
      expect(report).toContain('Auto-update: 2');
    });
  });
});
