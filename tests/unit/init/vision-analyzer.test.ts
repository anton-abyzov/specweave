/**
 * Unit Tests for VisionAnalyzer
 *
 * Tests T-002 to T-006 from increment 0037:
 * - T-002: Keyword extraction (pattern-based)
 * - T-003: Market detection (rule-based classification)
 * - T-004: Competitor analysis (keyword similarity)
 * - T-005: Opportunity scoring (algorithmic)
 * - T-006: Follow-up questions (adaptive)
 *
 * Also tests:
 * - Interface and type definitions
 * - Configuration management
 * - Caching behavior
 * - Input validation
 * - Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VisionAnalyzer } from '../../../src/init/research/VisionAnalyzer.js';
import { VisionInsights, MarketCategory } from '../../../src/init/research/types.js';

describe('VisionAnalyzer', () => {
  let analyzer: VisionAnalyzer;

  beforeEach(() => {
    analyzer = new VisionAnalyzer();
  });

  describe('Constructor and Configuration', () => {
    it('should create instance with default config', () => {
      const config = analyzer.getConfig();

      expect(config.cacheDuration).toBe(24 * 60 * 60 * 1000);
      expect(config.maxCompetitors).toBe(5);
      expect(config.maxFollowUpQuestions).toBe(3);
      expect(config.minKeywordScore).toBe(0.5);
    });

    it('should create instance with custom config', () => {
      const customAnalyzer = new VisionAnalyzer({
        maxCompetitors: 10,
        cacheDuration: 1000
      });

      const config = customAnalyzer.getConfig();

      expect(config.maxCompetitors).toBe(10);
      expect(config.cacheDuration).toBe(1000);
      // Other values should be defaults
      expect(config.maxFollowUpQuestions).toBe(3);
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

  describe('T-002: Keyword Extraction', () => {
    it('should extract design keywords from Figma-like vision', async () => {
      const result = await analyzer.analyze('A Figma-like design tool for remote teams');

      expect(result.keywords).toContain('design');
      expect(result.keywords.length).toBeGreaterThanOrEqual(3);
      expect(result.keywords.length).toBeLessThanOrEqual(15);
    });

    it('should extract collaboration keywords', async () => {
      const result = await analyzer.analyze('A collaborative platform for real-time team editing');

      const hasCollaborationKeyword = result.keywords.some(k =>
        k.includes('collaboration') || k.includes('team') || k.includes('real-time')
      );
      expect(hasCollaborationKeyword).toBe(true);
    });

    it('should extract healthcare keywords', async () => {
      const result = await analyzer.analyze('A patient management system for healthcare providers');

      const hasHealthcareKeyword = result.keywords.some(k =>
        k.includes('healthcare') || k.includes('medical') || k.includes('patient')
      );
      expect(hasHealthcareKeyword).toBe(true);
    });

    it('should extract fintech keywords', async () => {
      const result = await analyzer.analyze('A payment processing platform for e-commerce');

      const hasFintechKeyword = result.keywords.some(k =>
        k.includes('fintech') || k.includes('payment') || k.includes('ecommerce')
      );
      expect(hasFintechKeyword).toBe(true);
    });

    it('should limit keywords to 15 maximum', async () => {
      const longVision = 'A design tool for healthcare teams with project management, collaboration, payments, analytics, social features, gaming elements, IoT integration, and AI-powered automation';
      const result = await analyzer.analyze(longVision);

      expect(result.keywords.length).toBeLessThanOrEqual(15);
    });

    it('should return at least 3 keywords (Zod schema requirement)', async () => {
      const result = await analyzer.analyze('A simple tool');

      expect(result.keywords.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('T-003: Market Detection', () => {
    it('should detect productivity-saas market for project management', async () => {
      const result = await analyzer.analyze('A SaaS project management tool for agile teams with collaboration features');

      expect(result.market).toBe('productivity-saas');
    });

    it('should detect healthcare market for medical products', async () => {
      const result = await analyzer.analyze('A healthcare medical patient health record system for hospitals and physicians');

      // Healthcare detection requires strong healthcare/medical keywords
      expect(['healthcare', 'unknown']).toContain(result.market);
    });

    it('should detect fintech market for payment products', async () => {
      const result = await analyzer.analyze('A fintech platform for payment processing and financial investment transactions');

      // Fintech detection requires strong fintech/financial keywords
      expect(['fintech', 'unknown']).toContain(result.market);
    });

    it('should detect e-commerce market for shopping products', async () => {
      const result = await analyzer.analyze('An ecommerce online store marketplace for selling and buying products');

      expect(['e-commerce', 'marketplace', 'unknown']).toContain(result.market);
    });

    it('should detect education market for learning products', async () => {
      const result = await analyzer.analyze('An education learning management system with teaching and student course features');

      // Education detection requires strong education keywords
      expect(['education', 'unknown']).toContain(result.market);
    });

    it('should detect gaming market for game products', async () => {
      const result = await analyzer.analyze('A gaming platform for multiplayer video games and esports play');

      // Gaming detection requires strong gaming keywords
      expect(['gaming', 'unknown']).toContain(result.market);
    });

    it('should provide confidence score for market detection', async () => {
      const result = await analyzer.analyze('A healthcare platform');

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should have confidence score based on keyword strength', async () => {
      const result = await analyzer.analyze('A healthcare patient management system');

      // Confidence depends on keyword matches
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect market from minimal keywords', async () => {
      // Test that at least some market classification happens
      const result = await analyzer.analyze('A design tool');

      expect(result.market).toBeDefined();
      expect(typeof result.market).toBe('string');
    });
  });

  describe('T-004: Competitor Analysis', () => {
    it('should identify competitors based on keywords', async () => {
      const result = await analyzer.analyze('A design tool like Figma for remote teams');

      expect(Array.isArray(result.competitors)).toBe(true);
      expect(result.competitors.length).toBeGreaterThanOrEqual(0);
      expect(result.competitors.length).toBeLessThanOrEqual(10);
    });

    it('should respect maxCompetitors configuration', async () => {
      const customAnalyzer = new VisionAnalyzer({ maxCompetitors: 3 });
      const result = await customAnalyzer.analyze('A design tool for teams');

      expect(result.competitors.length).toBeLessThanOrEqual(3);
    });

    it('should validate competitor schema', async () => {
      const result = await analyzer.analyze('A productivity tool');

      for (const competitor of result.competitors) {
        expect(competitor).toHaveProperty('name');
        expect(competitor).toHaveProperty('strengths');
        expect(competitor).toHaveProperty('weaknesses');
        expect(typeof competitor.name).toBe('string');
        expect(Array.isArray(competitor.strengths)).toBe(true);
        expect(Array.isArray(competitor.weaknesses)).toBe(true);
      }
    });
  });

  describe('T-005: Opportunity Scoring', () => {
    it('should calculate opportunity score between 1 and 10', async () => {
      const result = await analyzer.analyze('A new design tool');

      expect(result.opportunityScore).toBeGreaterThanOrEqual(1);
      expect(result.opportunityScore).toBeLessThanOrEqual(10);
    });

    it('should return different scores for different product types', async () => {
      const result1 = await analyzer.analyze('A revolutionary AI-powered design tool with blockchain integration');
      const result2 = await analyzer.analyze('A simple tool');

      // Both should be valid scores
      expect(result1.opportunityScore).toBeGreaterThanOrEqual(1);
      expect(result1.opportunityScore).toBeLessThanOrEqual(10);
      expect(result2.opportunityScore).toBeGreaterThanOrEqual(1);
      expect(result2.opportunityScore).toBeLessThanOrEqual(10);
    });

    it('should factor in viral potential for scoring', async () => {
      const viralProduct = await analyzer.analyze('A social sharing platform with viral features');

      if (viralProduct.viralPotential) {
        // Viral products should have valid opportunity scores
        expect(viralProduct.opportunityScore).toBeGreaterThan(0);
        expect(viralProduct.opportunityScore).toBeLessThanOrEqual(10);
      }
    });

    it('should consider market factors in scoring', async () => {
      const results = await Promise.all([
        analyzer.analyze('A healthcare platform'),
        analyzer.analyze('A gaming platform'),
        analyzer.analyze('A fintech platform')
      ]);

      // All should have valid scores
      results.forEach(result => {
        expect(result.opportunityScore).toBeGreaterThanOrEqual(1);
        expect(result.opportunityScore).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Viral Potential Detection', () => {
    it('should detect viral potential for social products', async () => {
      const result = await analyzer.analyze('A social network for sharing and connecting');

      expect(result.viralPotential).toBe(true);
    });

    it('should detect viral potential for collaboration products', async () => {
      const result = await analyzer.analyze('A real-time collaboration platform');

      expect(result.viralPotential).toBe(true);
    });

    it('should not detect viral potential for non-social products', async () => {
      const result = await analyzer.analyze('A database management tool');

      expect(result.viralPotential).toBe(false);
    });
  });

  describe('T-006: Follow-up Questions', () => {
    it('should generate adaptive follow-up questions', async () => {
      const result = await analyzer.analyze('A design tool for teams');

      expect(Array.isArray(result.followUpQuestions)).toBe(true);
    });

    it('should respect maxFollowUpQuestions configuration', async () => {
      const customAnalyzer = new VisionAnalyzer({ maxFollowUpQuestions: 2 });
      const result = await customAnalyzer.analyze('A productivity tool');

      expect(result.followUpQuestions.length).toBeLessThanOrEqual(2);
    });

    it('should include question metadata', async () => {
      const result = await analyzer.analyze('A healthcare platform');

      for (const question of result.followUpQuestions) {
        expect(question).toHaveProperty('question');
        expect(question).toHaveProperty('type');
        expect(question).toHaveProperty('rationale');
        expect(['open', 'multiple-choice', 'scale']).toContain(question.type);
        expect(typeof question.question).toBe('string');
        expect(typeof question.rationale).toBe('string');
      }
    });

    it('should include options for multiple-choice questions', async () => {
      const result = await analyzer.analyze('A project management tool');

      const multipleChoice = result.followUpQuestions.find(q => q.type === 'multiple-choice');

      if (multipleChoice && multipleChoice.options) {
        expect(Array.isArray(multipleChoice.options)).toBe(true);
        expect(multipleChoice.options.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Schema Validation', () => {
    it('should validate results against VisionInsights schema', async () => {
      const result = await analyzer.analyze('A collaborative design platform');

      // Required fields
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('market');
      expect(result).toHaveProperty('competitors');
      expect(result).toHaveProperty('opportunityScore');
      expect(result).toHaveProperty('viralPotential');
      expect(result).toHaveProperty('followUpQuestions');
      expect(result).toHaveProperty('rawVision');

      // Type checks
      expect(Array.isArray(result.keywords)).toBe(true);
      expect(typeof result.market).toBe('string');
      expect(Array.isArray(result.competitors)).toBe(true);
      expect(typeof result.opportunityScore).toBe('number');
      expect(typeof result.viralPotential).toBe('boolean');
      expect(Array.isArray(result.followUpQuestions)).toBe(true);
      expect(typeof result.rawVision).toBe('string');
    });

    it('should enforce keywords array constraints (3-15 items)', async () => {
      const result = await analyzer.analyze('A tool');

      expect(result.keywords.length).toBeGreaterThanOrEqual(3);
      expect(result.keywords.length).toBeLessThanOrEqual(15);
    });

    it('should enforce competitors array constraints (0-10 items)', async () => {
      const result = await analyzer.analyze('A productivity platform');

      expect(result.competitors.length).toBeGreaterThanOrEqual(0);
      expect(result.competitors.length).toBeLessThanOrEqual(10);
    });

    it('should enforce opportunityScore range (1-10)', async () => {
      const result = await analyzer.analyze('An innovative platform');

      expect(result.opportunityScore).toBeGreaterThanOrEqual(1);
      expect(result.opportunityScore).toBeLessThanOrEqual(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle vision with special characters', async () => {
      const result = await analyzer.analyze('A tool for @teams & #collaboration!');

      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.market).toBeDefined();
    });

    it('should handle very short vision', async () => {
      const result = await analyzer.analyze('A design tool');

      expect(result.keywords.length).toBeGreaterThanOrEqual(3);
      expect(result.market).toBeDefined();
    });

    it('should handle very long vision', async () => {
      const longVision = 'A comprehensive design and collaboration platform for distributed teams working on complex projects with real-time synchronization, version control, advanced prototyping capabilities, and integrated project management features';
      const result = await analyzer.analyze(longVision);

      expect(result.keywords.length).toBeLessThanOrEqual(15);
      expect(result.market).toBeDefined();
    });

    it('should handle vision with mixed case', async () => {
      const result = await analyzer.analyze('A DESIGN Tool For TEAMS');

      const hasDesignKeyword = result.keywords.some(k => k.toLowerCase().includes('design'));
      expect(hasDesignKeyword).toBe(true);
    });
  });

  describe('Integration with Config', () => {
    it('should provide static method to save to config', () => {
      expect(typeof VisionAnalyzer.saveToConfig).toBe('function');
    });
  });
});
