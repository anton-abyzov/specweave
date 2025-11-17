/**
 * Unit tests for RepositorySelector
 *
 * Tests T-027 to T-034: Repository batch selection functionality
 */

import { describe, it, expect } from 'vitest';
import {
  selectRepositories,
  getAdaptiveRecommendation,
  previewSelection
} from '../../../src/init/repo/RepositorySelector.js';
import type { RepositoryMetadata, RepositorySelectionRule } from '../../../src/init/repo/types.js';

describe('RepositorySelector', () => {
  // Sample repository data for testing
  const sampleRepos: RepositoryMetadata[] = [
    { name: 'ec-frontend', owner: 'acme', language: 'TypeScript', stars: 150 },
    { name: 'ec-backend', owner: 'acme', language: 'TypeScript', stars: 120 },
    { name: 'ec-mobile', owner: 'acme', language: 'Swift', stars: 80 },
    { name: 'platform-infra', owner: 'acme', language: 'Go', stars: 50 },
    { name: 'marketing-site', owner: 'acme', language: 'JavaScript', stars: 30 },
    { name: 'ec-admin', owner: 'xyz', language: 'TypeScript', stars: 40 },
    { name: 'tool-cli', owner: 'xyz', language: 'Go', stars: 60 },
  ];

  describe('T-027: RepositorySelector base functionality', () => {
    it('should return all repositories for "all" selection type', () => {
      const rule: RepositorySelectionRule = { type: 'all' };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(7);
      expect(result).toEqual(sampleRepos);
    });

    it('should return empty array for "manual" selection type', () => {
      const rule: RepositorySelectionRule = { type: 'manual' };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(0);
    });
  });

  describe('T-029: Prefix-based selection', () => {
    it('should filter repositories by prefix pattern', () => {
      const rule: RepositorySelectionRule = {
        type: 'prefix',
        pattern: 'ec-'
      };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(4);
      expect(result.map(r => r.name)).toEqual([
        'ec-frontend',
        'ec-backend',
        'ec-mobile',
        'ec-admin'
      ]);
    });

    it('should return empty array if prefix matches nothing', () => {
      const rule: RepositorySelectionRule = {
        type: 'prefix',
        pattern: 'nonexistent-'
      };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(0);
    });

    it('should handle case-sensitive prefix matching', () => {
      const rule: RepositorySelectionRule = {
        type: 'prefix',
        pattern: 'EC-'
      };
      const result = selectRepositories(rule, sampleRepos);

      // Should not match because prefixes are case-sensitive
      expect(result).toHaveLength(0);
    });
  });

  describe('T-030: Owner/org-based selection', () => {
    it('should filter repositories by owner (case-insensitive)', () => {
      const rule: RepositorySelectionRule = {
        type: 'owner',
        owner: 'acme'
      };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(5);
      expect(result.every(r => r.owner === 'acme')).toBe(true);
    });

    it('should handle owner filtering case-insensitively', () => {
      const rule: RepositorySelectionRule = {
        type: 'owner',
        owner: 'ACME'
      };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(5);
    });

    it('should filter by different owner', () => {
      const rule: RepositorySelectionRule = {
        type: 'owner',
        owner: 'xyz'
      };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toEqual(['ec-admin', 'tool-cli']);
    });
  });

  describe('T-031: Keyword-based selection', () => {
    it('should filter repositories by keyword (case-insensitive)', () => {
      const rule: RepositorySelectionRule = {
        type: 'keyword',
        pattern: 'frontend'
      };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ec-frontend');
    });

    it('should match keyword anywhere in name (case-insensitive)', () => {
      const rule: RepositorySelectionRule = {
        type: 'keyword',
        pattern: 'admin'
      };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ec-admin');
    });

    it('should handle partial keyword matches', () => {
      const rule: RepositorySelectionRule = {
        type: 'keyword',
        pattern: 'ec'
      };
      const result = selectRepositories(rule, sampleRepos);

      // Should match ec-frontend, ec-backend, ec-mobile, ec-admin
      expect(result).toHaveLength(4);
    });

    it('should be case-insensitive for keywords', () => {
      const rule: RepositorySelectionRule = {
        type: 'keyword',
        pattern: 'FRONTEND'
      };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ec-frontend');
    });
  });

  describe('T-032: Combined rules', () => {
    it('should apply both prefix and owner filters', () => {
      const rule: RepositorySelectionRule = {
        type: 'combined',
        pattern: 'ec-',
        owner: 'acme'
      };
      const result = selectRepositories(rule, sampleRepos);

      // Should match only ec-* repos owned by acme (not xyz)
      expect(result).toHaveLength(3);
      expect(result.map(r => r.name)).toEqual([
        'ec-frontend',
        'ec-backend',
        'ec-mobile'
      ]);
    });

    it('should work with only prefix in combined mode', () => {
      const rule: RepositorySelectionRule = {
        type: 'combined',
        pattern: 'platform-'
      };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('platform-infra');
    });

    it('should work with only owner in combined mode', () => {
      const rule: RepositorySelectionRule = {
        type: 'combined',
        owner: 'xyz'
      };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(2);
    });
  });

  describe('T-033: Repository preview & exclusions', () => {
    it('should exclude repositories matching exclusion patterns', () => {
      const rule: RepositorySelectionRule = {
        type: 'prefix',
        pattern: 'ec-',
        excludePatterns: ['mobile', 'admin']
      };
      const result = selectRepositories(rule, sampleRepos);

      // Should match ec-frontend, ec-backend only (exclude ec-mobile, ec-admin)
      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toEqual(['ec-frontend', 'ec-backend']);
    });

    it('should handle multiple exclusion patterns (case-insensitive)', () => {
      const rule: RepositorySelectionRule = {
        type: 'all',
        excludePatterns: ['mobile', 'CLI']
      };
      const result = selectRepositories(rule, sampleRepos);

      // Should exclude ec-mobile and tool-cli
      expect(result).toHaveLength(5);
      expect(result.every(r => !r.name.includes('mobile'))).toBe(true);
      expect(result.every(r => !r.name.includes('cli'))).toBe(true);
    });

    it('should preview selection with correct count and summary', () => {
      const preview = previewSelection(sampleRepos);

      expect(preview.count).toBe(7);
      expect(preview.summary).toContain('7 repositories');
      expect(preview.summary).toContain('languages');
      expect(preview.sample).toHaveLength(5);
      expect(preview.sample[0]).toEqual({
        name: 'ec-frontend',
        language: 'TypeScript',
        stars: 150
      });
    });

    it('should preview selection with correct language count', () => {
      const preview = previewSelection(sampleRepos);

      // Languages: TypeScript, Swift, Go, JavaScript = 4
      expect(preview.summary).toContain('4 languages');
    });

    it('should limit preview sample to 5 repos', () => {
      const manyRepos = Array.from({ length: 20 }, (_, i) => ({
        name: `repo-${i}`,
        owner: 'test',
        language: 'TypeScript',
        stars: i * 10
      }));

      const preview = previewSelection(manyRepos);

      expect(preview.count).toBe(20);
      expect(preview.sample).toHaveLength(5);
      expect(preview.sample[0].name).toBe('repo-0');
      expect(preview.sample[4].name).toBe('repo-4');
    });
  });

  describe('T-034: Adaptive UX', () => {
    it('should recommend "all" for small repo count (<= 5)', () => {
      const recommendation = getAdaptiveRecommendation(5);

      expect(recommendation.recommendedType).toBe('all');
      expect(recommendation.reason).toContain('Small number');
    });

    it('should recommend "prefix" for moderate repo count (6-20)', () => {
      const recommendation = getAdaptiveRecommendation(15);

      expect(recommendation.recommendedType).toBe('prefix');
      expect(recommendation.reason).toContain('Moderate');
    });

    it('should recommend "prefix" for large repo count (> 20)', () => {
      const recommendation = getAdaptiveRecommendation(50);

      expect(recommendation.recommendedType).toBe('prefix');
      expect(recommendation.reason).toContain('Large number');
    });

    it('should handle edge case of exactly 20 repos', () => {
      const recommendation = getAdaptiveRecommendation(20);

      expect(recommendation.recommendedType).toBe('prefix');
      expect(recommendation.reason).toContain('Moderate');
    });

    it('should handle edge case of exactly 21 repos', () => {
      const recommendation = getAdaptiveRecommendation(21);

      expect(recommendation.recommendedType).toBe('prefix');
      expect(recommendation.reason).toContain('Large');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty repository array', () => {
      const rule: RepositorySelectionRule = { type: 'all' };
      const result = selectRepositories(rule, []);

      expect(result).toHaveLength(0);
    });

    it('should handle empty exclusion patterns array', () => {
      const rule: RepositorySelectionRule = {
        type: 'all',
        excludePatterns: []
      };
      const result = selectRepositories(rule, sampleRepos);

      expect(result).toHaveLength(7);
    });

    it('should handle missing pattern in prefix mode', () => {
      const rule: RepositorySelectionRule = { type: 'prefix' };
      const result = selectRepositories(rule, sampleRepos);

      // Without pattern, should return all repos (no filter applied)
      expect(result).toHaveLength(7);
    });

    it('should handle missing owner in owner mode', () => {
      const rule: RepositorySelectionRule = { type: 'owner' };
      const result = selectRepositories(rule, sampleRepos);

      // Without owner, should return all repos (no filter applied)
      expect(result).toHaveLength(7);
    });

    it('should handle empty preview', () => {
      const preview = previewSelection([]);

      expect(preview.count).toBe(0);
      expect(preview.sample).toHaveLength(0);
      expect(preview.summary).toContain('0 repositories');
    });
  });
});
