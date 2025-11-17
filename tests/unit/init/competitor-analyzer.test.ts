/**
 * Unit tests for CompetitorAnalyzer
 */

import { describe, it, expect } from 'vitest';
import { analyzeCompetitors, getDetailedCompetitorAnalysis } from '../../../src/init/research/CompetitorAnalyzer.js';

describe('CompetitorAnalyzer', () => {
  describe('analyzeCompetitors', () => {
    it('should find Figma for design + collaboration keywords', () => {
      const keywords = ['design', 'collaboration', 'visual', 'team'];
      const competitors = analyzeCompetitors(keywords, 5);

      expect(competitors.length).toBeGreaterThan(0);
      const figma = competitors.find(c => c.name === 'Figma');
      expect(figma).toBeDefined();
      expect(figma?.strengths.length).toBeGreaterThan(0);
      expect(figma?.weaknesses.length).toBeGreaterThan(0);
    });

    it('should find productivity tools for productivity keywords', () => {
      const keywords = ['productivity', 'task', 'project', 'team'];
      const competitors = analyzeCompetitors(keywords, 5);

      expect(competitors.length).toBeGreaterThan(0);
      const names = competitors.map(c => c.name);
      // Should include at least one productivity tool
      const hasProductivityTool = names.some(n =>
        ['Notion', 'Asana', 'Monday.com'].includes(n)
      );
      expect(hasProductivityTool).toBe(true);
    });

    it('should find healthcare products for healthcare keywords', () => {
      const keywords = ['healthcare', 'medical', 'patient'];
      const competitors = analyzeCompetitors(keywords, 3);

      expect(competitors.length).toBeGreaterThan(0);
      const names = competitors.map(c => c.name);
      const hasHealthcareTool = names.some(n =>
        ['Epic', 'Cerner'].includes(n)
      );
      expect(hasHealthcareTool).toBe(true);
    });

    it('should find payment tools for fintech keywords', () => {
      const keywords = ['fintech', 'payment', 'transaction'];
      const competitors = analyzeCompetitors(keywords, 3);

      expect(competitors.length).toBeGreaterThan(0);
      const names = competitors.map(c => c.name);
      const hasPaymentTool = names.some(n =>
        ['Stripe', 'Square'].includes(n)
      );
      expect(hasPaymentTool).toBe(true);
    });

    it('should return empty array for empty keywords', () => {
      const keywords: string[] = [];
      const competitors = analyzeCompetitors(keywords, 5);

      expect(competitors).toEqual([]);
    });

    it('should limit results to maxCompetitors', () => {
      const keywords = ['design', 'collaboration', 'saas'];
      const competitors = analyzeCompetitors(keywords, 2);

      expect(competitors.length).toBeLessThanOrEqual(2);
    });

    it('should include URL for all competitors', () => {
      const keywords = ['design', 'team'];
      const competitors = analyzeCompetitors(keywords, 3);

      for (const competitor of competitors) {
        expect(competitor.url).toBeDefined();
        expect(competitor.url).toMatch(/^https?:\/\//);
      }
    });
  });

  describe('getDetailedCompetitorAnalysis', () => {
    it('should return detailed analysis with similarity scores', () => {
      const keywords = ['design', 'collaboration'];
      const results = getDetailedCompetitorAnalysis(keywords);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('similarity');
      expect(results[0]).toHaveProperty('matchedKeywords');
      expect(results[0]).toHaveProperty('category');

      // Results should be sorted by similarity (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it('should return empty for empty keywords', () => {
      const keywords: string[] = [];
      const results = getDetailedCompetitorAnalysis(keywords);

      expect(results).toEqual([]);
    });
  });
});
