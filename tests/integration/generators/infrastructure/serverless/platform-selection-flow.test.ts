/**
 * Platform Selection Flow Integration Tests
 *
 * Tests for full platform selection workflow.
 */

import { describe, it, expect } from 'vitest';
import { selectPlatforms } from '../../src/core/serverless/platform-selector.js';
import { loadAllPlatforms } from '../../src/core/serverless/platform-data-loader.js';
import type { ProjectContext } from '../../src/core/serverless/types.js';

describe('Platform Selection Flow Integration', () => {
  describe('testFullPlatformSelectionFlow', () => {
    it('should execute complete flow: knowledge base → criteria → ranking → recommendation', () => {
      // Step 1: Load platform knowledge base
      const knowledgeBase = loadAllPlatforms();
      expect(knowledgeBase.platforms.size).toBe(5);

      // Step 2: Define selection criteria (pet project, learning focus)
      const criteria = {
        context: 'pet-project' as ProjectContext,
        prioritizeLearning: true,
        preferredEcosystem: 'mobile' as const,
      };

      // Step 3: Select platforms
      const result = selectPlatforms(knowledgeBase, criteria);

      // Step 4: Verify recommendation structure
      expect(result.rankedPlatforms).toBeDefined();
      expect(result.rankedPlatforms.length).toBe(5);
      expect(result.recommendedPlatform).toBeDefined();
      expect(result.context).toBe('pet-project');

      // Step 5: Verify recommended platform (Firebase for mobile + learning)
      expect(result.recommendedPlatform.platform.provider).toBe('firebase');
      expect(result.recommendedPlatform.score).toBeGreaterThan(0);

      // Step 6: Verify rationale is provided
      expect(result.recommendedPlatform.rationale).toBeDefined();
      expect(result.recommendedPlatform.rationale.length).toBeGreaterThan(0);

      // Step 7: Verify tradeoffs are provided
      expect(result.recommendedPlatform.tradeoffs.pros.length).toBeGreaterThan(0);
      expect(result.recommendedPlatform.tradeoffs.cons.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle startup with AWS ecosystem workflow', () => {
      const knowledgeBase = loadAllPlatforms();

      const criteria = {
        context: 'startup' as ProjectContext,
        preferredEcosystem: 'aws' as const,
        prioritizeStartupCredits: true,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      expect(result.recommendedPlatform.platform.provider).toBe('aws');
      expect(result.recommendedPlatform.rationale).toContain('Startup credits');
      expect(result.recommendedPlatform.platform.startupPrograms.length).toBeGreaterThan(0);
    });

    it('should handle enterprise production workflow', () => {
      const knowledgeBase = loadAllPlatforms();

      const criteria = {
        context: 'enterprise' as ProjectContext,
        isProduction: true,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // Enterprise production should favor mature platforms
      expect(['aws', 'azure', 'gcp']).toContain(
        result.recommendedPlatform.platform.provider
      );
      expect(result.recommendedPlatform.score).toBeGreaterThan(60);
    });

    it('should handle open-source preference workflow', () => {
      const knowledgeBase = loadAllPlatforms();

      const criteria = {
        context: 'pet-project' as ProjectContext,
        preferredEcosystem: 'open-source' as const,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      expect(result.recommendedPlatform.platform.provider).toBe('supabase');
      expect(result.recommendedPlatform.platform.lockIn.portability).toBe('high');
    });
  });

  describe('testPlatformComparisonWorkflow', () => {
    it('should enable comparison between multiple suitable platforms', () => {
      const knowledgeBase = loadAllPlatforms();

      const criteria = {
        context: 'startup' as ProjectContext,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // Verify all platforms are ranked
      expect(result.rankedPlatforms.length).toBe(5);

      // Verify top 3 platforms are clearly distinguished
      const top3 = result.rankedPlatforms.slice(0, 3);
      for (let i = 0; i < top3.length; i++) {
        expect(top3[i].score).toBeGreaterThan(0); // Should have positive scores
        expect(top3[i].rationale).toBeDefined();
        expect(top3[i].tradeoffs.pros.length).toBeGreaterThan(0);
      }

      // Verify platforms are sorted by score
      for (let i = 0; i < result.rankedPlatforms.length - 1; i++) {
        expect(result.rankedPlatforms[i].score).toBeGreaterThanOrEqual(
          result.rankedPlatforms[i + 1].score
        );
      }
    });

    it('should provide differentiated tradeoffs for each platform', () => {
      const knowledgeBase = loadAllPlatforms();

      const criteria = {
        context: 'pet-project' as ProjectContext,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // Check that Firebase has low portability warning
      const firebase = result.rankedPlatforms.find(
        (r) => r.platform.provider === 'firebase'
      )!;
      expect(firebase.tradeoffs.cons.some((con) => con.includes('portability'))).toBe(true);

      // Check that Supabase has high portability pro
      const supabase = result.rankedPlatforms.find(
        (r) => r.platform.provider === 'supabase'
      )!;
      expect(supabase.tradeoffs.pros.some((pro) => pro.includes('portability'))).toBe(true);
    });
  });

  describe('testMultiCriteriaSelectionWorkflow', () => {
    it('should balance multiple criteria (ecosystem + runtime + learning)', () => {
      const knowledgeBase = loadAllPlatforms();

      const criteria = {
        context: 'pet-project' as ProjectContext,
        preferredEcosystem: 'aws' as const,
        runtimeRequired: 'python',
        prioritizeLearning: true,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // AWS Lambda should score high (ecosystem match + Python support + good docs)
      expect(result.recommendedPlatform.platform.provider).toBe('aws');
      expect(
        result.recommendedPlatform.platform.features.runtimeSupport.some((r) =>
          r.toLowerCase().includes('python')
        )
      ).toBe(true);
    });

    it('should handle conflicting criteria gracefully', () => {
      const knowledgeBase = loadAllPlatforms();

      // Conflict: open-source preference but enterprise context
      const criteria = {
        context: 'enterprise' as ProjectContext,
        preferredEcosystem: 'open-source' as const,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // Should still provide valid recommendation (likely Supabase or a major cloud)
      expect(result.recommendedPlatform).toBeDefined();
      expect(result.rankedPlatforms.length).toBe(5);
    });
  });

  describe('testKnowledgeBaseCollaboration', () => {
    it('should use loaded platform data for scoring', () => {
      const knowledgeBase = loadAllPlatforms();

      const criteria = {
        context: 'startup' as ProjectContext,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // Verify platform data is used (e.g., free tier, integrations)
      for (const ranking of result.rankedPlatforms) {
        expect(ranking.platform.pricing.freeTier).toBeDefined();
        expect(ranking.platform.ecosystem.integrations).toBeDefined();
        expect(ranking.platform.features.runtimeSupport.length).toBeGreaterThan(0);
      }
    });

    it('should reflect platform data in rationale', () => {
      const knowledgeBase = loadAllPlatforms();

      const criteria = {
        context: 'pet-project' as ProjectContext,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // Rationale should mention specific platform attributes
      const rationale = result.recommendedPlatform.rationale;
      expect(
        rationale.includes('Free tier') ||
          rationale.includes('Documentation') ||
          rationale.includes('Community')
      ).toBe(true);
    });
  });
});
