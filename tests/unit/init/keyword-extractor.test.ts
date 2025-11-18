/**
 * Unit Tests for KeywordExtractor (T-002)
 *
 * Tests the pattern-based keyword extraction logic with 90%+ coverage.
 */

import { describe, it, expect } from 'vitest';
import { extractKeywords, analyzeKeywords, DOMAIN_PATTERNS } from '../../../src/init/research/keyword-extractor.js';

describe('KeywordExtractor', () => {
  describe('extractKeywords()', () => {
    it('should extract keywords from Figma-like vision', () => {
      const vision = 'A Figma-like design tool for remote teams';
      const keywords = extractKeywords(vision);

      expect(keywords).toBeInstanceOf(Array);
      expect(keywords.length).toBeGreaterThanOrEqual(3);
      expect(keywords.length).toBeLessThanOrEqual(10);

      // Should include design-related keywords
      expect(keywords.some(k => ['design', 'creative', 'visual'].includes(k))).toBe(true);

      // Should include collaboration keywords
      expect(keywords.some(k => ['collaboration', 'team', 'remote'].includes(k))).toBe(true);
    });

    it('should extract keywords from project management vision', () => {
      const vision = 'A project management tool for agile teams with real-time collaboration';
      const keywords = extractKeywords(vision);

      expect(keywords.length).toBeGreaterThanOrEqual(3);

      // Should include productivity keywords
      expect(keywords.some(k => ['productivity', 'project', 'task', 'workflow', 'manage'].includes(k))).toBe(true);

      // Should include collaboration keywords
      expect(keywords.some(k => ['collaboration', 'team', 'real-time'].includes(k))).toBe(true);
    });

    it('should extract keywords from healthcare vision', () => {
      const vision = 'A patient management system for hospitals with HIPAA compliance';
      const keywords = extractKeywords(vision);

      expect(keywords.length).toBeGreaterThanOrEqual(3);

      // Should include healthcare keywords
      expect(keywords.some(k => ['healthcare', 'medical', 'patient', 'health', 'clinical'].includes(k))).toBe(true);
    });

    it('should extract keywords from fintech vision', () => {
      const vision = 'A payment processing platform for online merchants';
      const keywords = extractKeywords(vision);

      expect(keywords.length).toBeGreaterThanOrEqual(3);

      // Should include fintech keywords
      expect(keywords.some(k => ['fintech', 'payment', 'financial', 'banking', 'transaction'].includes(k))).toBe(true);
    });

    it('should extract keywords from ecommerce vision', () => {
      const vision = 'An online marketplace for handmade products with cart and checkout';
      const keywords = extractKeywords(vision);

      expect(keywords.length).toBeGreaterThanOrEqual(3);

      // Should include ecommerce keywords
      expect(keywords.some(k => ['ecommerce', 'shop', 'store', 'marketplace', 'retail'].includes(k))).toBe(true);
    });

    it('should extract keywords from education vision', () => {
      const vision = 'A learning management system for online courses';
      const keywords = extractKeywords(vision);

      expect(keywords.length).toBeGreaterThanOrEqual(3);

      // Should include education keywords
      expect(keywords.some(k => ['education', 'learning', 'teaching', 'course', 'student'].includes(k))).toBe(true);
    });

    it('should extract keywords from social network vision', () => {
      const vision = 'A social networking app for connecting professionals';
      const keywords = extractKeywords(vision);

      expect(keywords.length).toBeGreaterThanOrEqual(3);

      // Should include social keywords
      expect(keywords.some(k => ['social', 'network', 'community', 'connect', 'share'].includes(k))).toBe(true);
    });

    it('should extract keywords from gaming vision', () => {
      const vision = 'A multiplayer gaming platform with streaming features';
      const keywords = extractKeywords(vision);

      expect(keywords.length).toBeGreaterThanOrEqual(3);

      // Should include gaming keywords
      expect(keywords.some(k => ['gaming', 'game', 'entertainment', 'play', 'player'].includes(k))).toBe(true);
    });

    it('should extract keywords from IoT vision', () => {
      const vision = 'A smart home automation system with sensors and devices';
      const keywords = extractKeywords(vision);

      expect(keywords.length).toBeGreaterThanOrEqual(3);

      // Should include IoT keywords
      expect(keywords.some(k => ['iot', 'device', 'sensor', 'hardware', 'automation'].includes(k))).toBe(true);
    });

    it('should extract keywords from AI/ML vision', () => {
      const vision = 'A machine learning platform for predictive analytics';
      const keywords = extractKeywords(vision);

      expect(keywords.length).toBeGreaterThanOrEqual(3);

      // Should include AI/ML keywords
      expect(keywords.some(k => ['ai', 'machine-learning', 'intelligence', 'prediction', 'model'].includes(k))).toBe(true);
    });

    it('should return at least 3 keywords even for minimal input', () => {
      const vision = 'A product';
      const keywords = extractKeywords(vision);

      expect(keywords.length).toBeGreaterThanOrEqual(3);
    });

    it('should return at most 10 keywords', () => {
      const vision = 'A comprehensive platform for design, collaboration, project management, healthcare, payment processing, ecommerce, education, social networking, gaming, IoT, AI, and machine learning';
      const keywords = extractKeywords(vision);

      expect(keywords.length).toBeLessThanOrEqual(10);
    });

    it('should deduplicate keywords', () => {
      const vision = 'A design tool for design teams with design collaboration';
      const keywords = extractKeywords(vision);

      // Should have unique keywords
      const uniqueKeywords = new Set(keywords);
      expect(uniqueKeywords.size).toBe(keywords.length);
    });

    it('should throw error for empty vision', () => {
      expect(() => extractKeywords('')).toThrow('Vision text cannot be empty');
      expect(() => extractKeywords('   ')).toThrow('Vision text cannot be empty');
    });

    it('should be case-insensitive', () => {
      const vision1 = 'A FIGMA-LIKE DESIGN TOOL';
      const vision2 = 'a figma-like design tool';

      const keywords1 = extractKeywords(vision1);
      const keywords2 = extractKeywords(vision2);

      expect(keywords1).toEqual(keywords2);
    });
  });

  describe('analyzeKeywords()', () => {
    it('should return detailed keyword analysis', () => {
      const vision = 'A Figma-like design tool for remote teams';
      const analysis = analyzeKeywords(vision);

      expect(analysis).toBeInstanceOf(Array);
      expect(analysis.length).toBeGreaterThan(0);

      // Each match should have keyword, domain, score, frequency
      for (const match of analysis) {
        expect(match).toHaveProperty('keyword');
        expect(match).toHaveProperty('domain');
        expect(match).toHaveProperty('score');
        expect(match).toHaveProperty('frequency');

        expect(typeof match.keyword).toBe('string');
        expect(typeof match.domain).toBe('string');
        expect(typeof match.score).toBe('number');
        expect(typeof match.frequency).toBe('number');

        expect(match.score).toBeGreaterThan(0);
        expect(match.frequency).toBeGreaterThan(0);
      }
    });

    it('should sort results by score (descending)', () => {
      const vision = 'A Figma-like design tool for remote teams';
      const analysis = analyzeKeywords(vision);

      for (let i = 0; i < analysis.length - 1; i++) {
        expect(analysis[i].score).toBeGreaterThanOrEqual(analysis[i + 1].score);
      }
    });

    it('should return empty array for empty vision', () => {
      const analysis = analyzeKeywords('');
      expect(analysis).toEqual([]);
    });

    it('should calculate scores correctly based on frequency and weight', () => {
      const vision = 'design design design'; // Frequency = 3
      const analysis = analyzeKeywords(vision);

      // Should have design-related keywords
      const designMatch = analysis.find(m => m.domain === 'design');
      expect(designMatch).toBeDefined();

      if (designMatch) {
        // Find the design pattern weight
        const designPattern = DOMAIN_PATTERNS.find(p => p.domain === 'design');
        expect(designPattern).toBeDefined();

        if (designPattern) {
          // Score should be frequency * weight
          const expectedScore = 3 * designPattern.weight;
          expect(designMatch.score).toBe(expectedScore);
        }
      }
    });
  });

  describe('DOMAIN_PATTERNS', () => {
    it('should have valid structure', () => {
      expect(DOMAIN_PATTERNS).toBeInstanceOf(Array);
      expect(DOMAIN_PATTERNS.length).toBeGreaterThan(10);

      for (const pattern of DOMAIN_PATTERNS) {
        expect(pattern).toHaveProperty('domain');
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('weight');
        expect(pattern).toHaveProperty('keywords');

        expect(typeof pattern.domain).toBe('string');
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(typeof pattern.weight).toBe('number');
        expect(Array.isArray(pattern.keywords)).toBe(true);

        expect(pattern.weight).toBeGreaterThan(0);
        expect(pattern.keywords.length).toBeGreaterThan(0);
      }
    });

    it('should have unique domain names', () => {
      const domains = DOMAIN_PATTERNS.map(p => p.domain);
      const uniqueDomains = new Set(domains);

      expect(uniqueDomains.size).toBe(domains.length);
    });

    it('should have case-insensitive global patterns', () => {
      for (const pattern of DOMAIN_PATTERNS) {
        expect(pattern.pattern.flags).toContain('i'); // case-insensitive
        expect(pattern.pattern.flags).toContain('g'); // global
      }
    });
  });
});
