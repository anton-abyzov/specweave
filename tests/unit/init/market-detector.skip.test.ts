/**
 * Unit tests for MarketDetector
 */

import { describe, it, expect } from 'vitest';
import { detectMarketCategory, analyzeMarketCategories } from '../../../src/init/research/MarketDetector.js';

describe('MarketDetector', () => {
  describe('detectMarketCategory', () => {
    it('should detect productivity-saas from collaboration keywords', () => {
      const vision = 'A Figma-like design tool for remote teams with real-time collaboration';
      const result = detectMarketCategory(vision);

      expect(result.category).toBe('productivity-saas');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect healthcare from medical keywords', () => {
      const vision = 'A platform for managing patient records and HIPAA-compliant healthcare data';
      const result = detectMarketCategory(vision);

      expect(result.category).toBe('healthcare');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect fintech from payment keywords', () => {
      const vision = 'A payment processing platform for online merchants with cryptocurrency support';
      const result = detectMarketCategory(vision);

      expect(result.category).toBe('fintech');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect e-commerce from shopping keywords', () => {
      const vision = 'An online marketplace for buying and selling handmade products';
      const result = detectMarketCategory(vision);

      expect(result.category).toBe('e-commerce');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect education from learning keywords', () => {
      const vision = 'An online learning platform for teaching programming courses';
      const result = detectMarketCategory(vision);

      expect(result.category).toBe('education');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect gaming from game keywords', () => {
      const vision = 'A multiplayer gaming platform with esports tournaments';
      const result = detectMarketCategory(vision);

      expect(result.category).toBe('gaming');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect social-network from social keywords', () => {
      const vision = 'A social networking app for connecting professionals';
      const result = detectMarketCategory(vision);

      expect(result.category).toBe('social-network');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect ai-ml from AI keywords', () => {
      const vision = 'A machine learning platform for predictive analytics';
      const result = detectMarketCategory(vision);

      expect(result.category).toBe('ai-ml');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should return unknown for empty vision', () => {
      const vision = '';
      const result = detectMarketCategory(vision);

      expect(result.category).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('should return unknown for unrecognized vision', () => {
      const vision = 'A thing that does stuff';
      const result = detectMarketCategory(vision);

      expect(result.category).toBe('unknown');
    });

    it('should include runner-up if categories are close', () => {
      const vision = 'A collaboration platform for healthcare teams';
      const result = detectMarketCategory(vision);

      // Should detect either healthcare or productivity
      expect(['healthcare', 'productivity-saas']).toContain(result.category);

      if (result.runnerUp) {
        expect(result.runnerUp.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('analyzeMarketCategories', () => {
    it('should return all categories with confidence scores', () => {
      const vision = 'A Figma-like design tool for remote teams';
      const results = analyzeMarketCategories(vision);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('category');
      expect(results[0]).toHaveProperty('confidence');
      expect(results[0]).toHaveProperty('matchedDomains');

      // First result should be highest confidence
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
      }
    });

    it('should return empty for empty vision', () => {
      const vision = '';
      const results = analyzeMarketCategories(vision);

      expect(results).toEqual([]);
    });
  });
});
