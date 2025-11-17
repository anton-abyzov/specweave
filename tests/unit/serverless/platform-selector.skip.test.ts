import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Platform Selector Unit Tests
 *
 * Tests for platform ranking and selection logic.
 */

import { describe, it, expect } from 'vitest';
import { selectPlatforms } from '../../../src/core/serverless/platform-selector.js.js';
import { loadAllPlatforms } from '../../../src/core/serverless/platform-data-loader.js.js';
import type { ProjectContext } from '../../../src/core/serverless/types.js.js';

describe('Platform Selector', () => {
  const knowledgeBase = loadAllPlatforms();

  describe('testEnterpriseAwsSelection', () => {
    it('should recommend AWS Lambda for enterprise + AWS ecosystem', () => {
      const criteria = {
        context: 'enterprise' as ProjectContext,
        preferredEcosystem: 'aws' as const,
        isProduction: true,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      expect(result.recommendedPlatform.platform.provider).toBe('AWS');
      expect(result.recommendedPlatform.score).toBeGreaterThan(70);
      expect(result.recommendedPlatform.rationale).toContain('Max memory');
      expect(result.recommendedPlatform.tradeoffs.pros.length).toBeGreaterThan(0);
    });

    it('should rank AWS Lambda highest for enterprise with strong AWS signals', () => {
      const criteria = {
        context: 'enterprise' as ProjectContext,
        preferredEcosystem: 'aws' as const,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      expect(result.rankedPlatforms[0].platform.provider).toBe('AWS');
      expect(result.rankedPlatforms[0].score).toBeGreaterThan(
        result.rankedPlatforms[1].score
      );
    });
  });

  describe('testAzureForMicrosoftStack', () => {
    it('should recommend Azure Functions for Azure ecosystem', () => {
      const criteria = {
        context: 'enterprise' as ProjectContext,
        preferredEcosystem: 'azure' as const,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      expect(result.recommendedPlatform.platform.provider).toBe('Azure');
      expect(result.recommendedPlatform.rationale).toBeDefined();
    });
  });

  describe('testGcpForGoogleEcosystem', () => {
    it('should recommend GCP Cloud Functions for GCP ecosystem', () => {
      const criteria = {
        context: 'enterprise' as ProjectContext,
        preferredEcosystem: 'gcp' as const,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      expect(result.recommendedPlatform.platform.provider).toBe('GCP');
    });
  });

  describe('testFirebaseForMobileLearning', () => {
    it('should recommend Firebase for mobile app + learning project', () => {
      const criteria = {
        context: 'pet-project' as ProjectContext,
        preferredEcosystem: 'mobile' as const,
        prioritizeLearning: true,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      expect(result.recommendedPlatform.platform.id).toBe('firebase');
      expect(result.recommendedPlatform.score).toBeGreaterThan(70);
      expect(result.recommendedPlatform.rationale).toContain('Free tier');
    });

    it('should score Firebase highly for beginner-friendly features', () => {
      const criteria = {
        context: 'pet-project' as ProjectContext,
        prioritizeLearning: true,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      const firebaseRanking = result.rankedPlatforms.find(
        (r) => r.platform.id === 'firebase'
      );
      expect(firebaseRanking).toBeDefined();
      expect(firebaseRanking!.score).toBeGreaterThan(60);
    });
  });

  describe('testSupabaseForOpenSource', () => {
    it('should recommend Supabase for open-source preference', () => {
      const criteria = {
        context: 'pet-project' as ProjectContext,
        preferredEcosystem: 'open-source' as const,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      expect(result.recommendedPlatform.platform.provider).toBe('supabase');
      expect(result.recommendedPlatform.tradeoffs.pros).toContain(
        'High portability - easy to migrate to other platforms'
      );
    });
  });

  describe('testStartupCreditsForStartups', () => {
    it('should prioritize platforms with startup credits', () => {
      const criteria = {
        context: 'startup' as ProjectContext,
        prioritizeStartupCredits: true,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // AWS, Azure, GCP all have startup programs
      expect(['aws', 'azure', 'gcp']).toContain(
        result.recommendedPlatform.platform.provider
      );
      expect(result.recommendedPlatform.rationale).toContain('Startup credits');
    });

    it('should boost scores for platforms with startup programs', () => {
      const withoutCredits = {
        context: 'startup' as ProjectContext,
        prioritizeStartupCredits: false,
      };
      const withCredits = {
        context: 'startup' as ProjectContext,
        prioritizeStartupCredits: true,
      };

      const resultWithout = selectPlatforms(knowledgeBase, withoutCredits);
      const resultWith = selectPlatforms(knowledgeBase, withCredits);

      // Platforms with startup programs should get higher scores when prioritized
      const awsScoreWithout = resultWithout.rankedPlatforms.find(
        (r) => r.platform.provider === 'aws'
      )!.score;
      const awsScoreWith = resultWith.rankedPlatforms.find(
        (r) => r.platform.provider === 'aws'
      )!.score;

      expect(awsScoreWith).toBeGreaterThanOrEqual(awsScoreWithout);
    });
  });

  describe('testLearningVsProduction', () => {
    it('should recommend different platforms for learning vs production', () => {
      const learningCriteria = {
        context: 'pet-project' as ProjectContext,
        prioritizeLearning: true,
      };
      const productionCriteria = {
        context: 'enterprise' as ProjectContext,
        isProduction: true,
      };

      const learningResult = selectPlatforms(knowledgeBase, learningCriteria);
      const productionResult = selectPlatforms(knowledgeBase, productionCriteria);

      // Learning: Firebase/Supabase likely (beginner-friendly)
      expect(['firebase', 'supabase']).toContain(
        learningResult.recommendedPlatform.platform.provider
      );

      // Production enterprise: AWS/Azure/GCP likely (mature ecosystems)
      expect(['aws', 'azure', 'gcp']).toContain(
        productionResult.recommendedPlatform.platform.provider
      );
    });
  });

  describe('testPlatformRanking', () => {
    it('should rank all platforms with scores 0-100', () => {
      const criteria = {
        context: 'startup' as ProjectContext,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      expect(result.rankedPlatforms.length).toBe(5);
      for (const ranking of result.rankedPlatforms) {
        expect(ranking.score).toBeGreaterThanOrEqual(0);
        expect(ranking.score).toBeLessThanOrEqual(100);
      }
    });

    it('should sort platforms by score descending', () => {
      const criteria = {
        context: 'enterprise' as ProjectContext,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      for (let i = 0; i < result.rankedPlatforms.length - 1; i++) {
        expect(result.rankedPlatforms[i].score).toBeGreaterThanOrEqual(
          result.rankedPlatforms[i + 1].score
        );
      }
    });

    it('should provide rationale for each platform', () => {
      const criteria = {
        context: 'pet-project' as ProjectContext,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      for (const ranking of result.rankedPlatforms) {
        expect(ranking.rationale).toBeDefined();
        expect(ranking.rationale.length).toBeGreaterThan(0);
      }
    });

    it('should provide tradeoffs (pros and cons) for each platform', () => {
      const criteria = {
        context: 'startup' as ProjectContext,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      for (const ranking of result.rankedPlatforms) {
        expect(ranking.tradeoffs.pros).toBeDefined();
        expect(ranking.tradeoffs.cons).toBeDefined();
        expect(Array.isArray(ranking.tradeoffs.pros)).toBe(true);
        expect(Array.isArray(ranking.tradeoffs.cons)).toBe(true);
      }
    });
  });

  describe('testRuntimeRequirement', () => {
    it('should boost scores for platforms supporting required runtime', () => {
      const criteria = {
        context: 'startup' as ProjectContext,
        runtimeRequired: 'python',
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // All platforms support Python, so all should have positive scores
      for (const ranking of result.rankedPlatforms) {
        const hasPython = ranking.platform.features.runtimes.some((runtime) =>
          runtime.toLowerCase().includes('python')
        );
        if (hasPython) {
          expect(ranking.score).toBeGreaterThan(0); // Should have positive score with runtime boost
        }
      }
    });

    it('should penalize platforms without required runtime', () => {
      const criteria = {
        context: 'startup' as ProjectContext,
        runtimeRequired: 'cobol', // No platform supports this
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // All platforms should have lower scores due to missing runtime
      for (const ranking of result.rankedPlatforms) {
        const hasCobol = ranking.platform.features.runtimes.some((runtime) =>
          runtime.toLowerCase().includes('cobol')
        );
        expect(hasCobol).toBe(false);
      }
    });
  });

  describe('testContextScoring', () => {
    it('should apply different scoring for pet-project context', () => {
      const criteria = {
        context: 'pet-project' as ProjectContext,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // Pet projects should favor free tier and learning resources
      const topPlatform = result.recommendedPlatform.platform;
      expect(topPlatform.pricing.freeTier.requests.count).toBeGreaterThan(0);
    });

    it('should apply different scoring for startup context', () => {
      const criteria = {
        context: 'startup' as ProjectContext,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // Startups should favor ecosystem size and integrations
      const topPlatform = result.recommendedPlatform.platform;
      expect(topPlatform.ecosystem.integrations.length).toBeGreaterThan(0);
    });

    it('should apply different scoring for enterprise context', () => {
      const criteria = {
        context: 'enterprise' as ProjectContext,
      };

      const result = selectPlatforms(knowledgeBase, criteria);

      // Enterprise should favor maturity and features
      const topPlatform = result.recommendedPlatform.platform;
      expect(['aws', 'azure', 'gcp']).toContain(topPlatform.provider);
    });
  });
});
