import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for VisionAnalyzer
 *
 * Tests cover:
 * - Interface and type definitions
 * - Configuration management
 * - Caching behavior
 * - Input validation
 * - Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VisionAnalyzer } from '../../../src/init/research/VisionAnalyzer.js.js';
import { VisionInsights, MarketCategory } from '../../../src/init/research/types.js.js';

describe('VisionAnalyzer', () => {
  let analyzer: VisionAnalyzer;

  beforeEach(() => {
    analyzer = new VisionAnalyzer();
  });

  describe('Constructor and Configuration', () => {
    it('should create instance with default config', () => {
      const config = analyzer.getConfig();

      expect(config.enableLLM).toBe(true);
      expect(config.fallbackToRules).toBe(true);
      expect(config.cacheDuration).toBe(24 * 60 * 60 * 1000);
      expect(config.maxCompetitors).toBe(5);
      expect(config.maxFollowUpQuestions).toBe(3);
    });

    it('should create instance with custom config', () => {
      const customAnalyzer = new VisionAnalyzer({
        enableLLM: false,
        maxCompetitors: 10
      });

      const config = customAnalyzer.getConfig();

      expect(config.enableLLM).toBe(false);
      expect(config.maxCompetitors).toBe(10);
      // Other values should be defaults
      expect(config.fallbackToRules).toBe(true);
    });

    it('should update config after creation', () => {
      analyzer.updateConfig({ maxCompetitors: 8 });

      const config = analyzer.getConfig();
      expect(config.maxCompetitors).toBe(8);
    });
  });

  describe('Input Validation', () => {
    it('should throw error for empty vision', async () => {
      await expect(analyzer.analyze('')).rejects.toThrow(
        'Vision description cannot be empty'
      );
    });

    it('should throw error for whitespace-only vision', async () => {
      await expect(analyzer.analyze('   ')).rejects.toThrow(
        'Vision description cannot be empty'
      );
    });

    it('should accept valid vision text', async () => {
      const result = await analyzer.analyze('A design tool for teams');
      expect(result).toBeDefined();
      expect(result.rawVision).toBe('A design tool for teams');
    });
  });

  describe('Caching Behavior', () => {
    it('should return cached result for same vision', async () => {
      const vision = 'A project management tool';

      const result1 = await analyzer.analyze(vision);
      const result2 = await analyzer.analyze(vision);

      // Should be exact same object reference (from cache)
      expect(result1).toBe(result2);
    });

    it('should return new result for different vision', async () => {
      const result1 = await analyzer.analyze('Project management tool');
      const result2 = await analyzer.analyze('CRM software');

      // Should be different results
      expect(result1).not.toBe(result2);
    });

    it('should clear cache when requested', async () => {
      const vision = 'A design tool';
      const result1 = await analyzer.analyze(vision);

      analyzer.clearCache();

      const result2 = await analyzer.analyze(vision);

      // Should be different objects (new analysis)
      expect(result1).not.toBe(result2);
    });

    it('should expire cached results after cacheDuration', async () => {
      // Create analyzer with very short cache duration
      const shortCacheAnalyzer = new VisionAnalyzer({
        cacheDuration: 100 // 100ms
      });

      const vision = 'A tool';
      const result1 = await shortCacheAnalyzer.analyze(vision);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const result2 = await shortCacheAnalyzer.analyze(vision);

      // Should be different objects (cache expired)
      expect(result1).not.toBe(result2);
    });
  });

  describe('Output Validation', () => {
    it('should return VisionInsights with all required fields', async () => {
      const result = await analyzer.analyze('A SaaS product');

      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('market');
      expect(result).toHaveProperty('competitors');
      expect(result).toHaveProperty('opportunityScore');
      expect(result).toHaveProperty('viralPotential');
      expect(result).toHaveProperty('followUpQuestions');
      expect(result).toHaveProperty('rawVision');
    });

    it('should return valid keywords array', async () => {
      const result = await analyzer.analyze('A product');

      expect(Array.isArray(result.keywords)).toBe(true);
    });

    it('should return valid market category', async () => {
      const result = await analyzer.analyze('A product');

      const validCategories: MarketCategory[] = [
        'productivity-saas',
        'healthcare',
        'fintech',
        'e-commerce',
        'education',
        'gaming',
        'social-network',
        'enterprise-b2b',
        'consumer-b2c',
        'marketplace',
        'iot',
        'blockchain',
        'ai-ml',
        'unknown'
      ];

      expect(validCategories).toContain(result.market);
    });

    it('should return valid competitors array', async () => {
      const result = await analyzer.analyze('A product');

      expect(Array.isArray(result.competitors)).toBe(true);
    });

    it('should return opportunity score between 1-10', async () => {
      const result = await analyzer.analyze('A product');

      expect(result.opportunityScore).toBeGreaterThanOrEqual(1);
      expect(result.opportunityScore).toBeLessThanOrEqual(10);
    });

    it('should return boolean viral potential', async () => {
      const result = await analyzer.analyze('A product');

      expect(typeof result.viralPotential).toBe('boolean');
    });

    it('should return valid follow-up questions array', async () => {
      const result = await analyzer.analyze('A product');

      expect(Array.isArray(result.followUpQuestions)).toBe(true);
    });

    it('should preserve raw vision text', async () => {
      const vision = 'A unique product vision';
      const result = await analyzer.analyze(vision);

      expect(result.rawVision).toBe(vision);
    });
  });
});
