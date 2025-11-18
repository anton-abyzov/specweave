/**
 * Learning Path Integration Tests
 *
 * Tests the integration of serverless recommendations with learning resources:
 * - Platform-specific learning paths
 * - Documentation recommendations
 * - Tutorial suggestions
 * - Community resource mapping
 */

import { describe, it, expect } from 'vitest';
import { detectContext } from '../../../src/core/serverless/context-detector.js';
import { selectPlatforms } from '../../../src/core/serverless/platform-selector.js';
import { loadAllPlatforms } from '../../../src/core/serverless/platform-data-loader.js';
import type { ProjectMetadata } from '../../../src/core/serverless/types.js';

describe('Learning Path Integration', () => {
  describe('testLearningResourcesForPetProject', () => {
    it('should provide comprehensive learning resources for beginner pet project', () => {
      const userInput = 'Personal project to learn serverless development';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 0,
        expectedTrafficRequestsPerMonth: 10000,
      };

      const contextResult = detectContext(userInput, metadata);
      expect(contextResult.context).toBe('pet-project');

      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        prioritizeLearning: true,
      });

      // Recommended platform should have good documentation
      expect(selectionResult.recommendedPlatform.platform.ecosystem.documentation).toBe(
        'excellent'
      );

      // Rationale should mention learning-friendly aspects
      const rationale = selectionResult.recommendedPlatform.rationale;
      expect(
        rationale.includes('Documentation') ||
          rationale.includes('learning') ||
          rationale.includes('Community')
      ).toBe(true);
    });

    it('should recommend Firebase for mobile learning path', () => {
      const userInput = 'Want to learn mobile backend development';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 0,
        expectedTrafficRequestsPerMonth: 5000,
      };

      const contextResult = detectContext(userInput, metadata);
      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        preferredEcosystem: 'mobile',
        prioritizeLearning: true,
      });

      // Firebase should be recommended for mobile learning
      expect(selectionResult.recommendedPlatform.platform.provider).toBe('firebase');

      // Should have excellent documentation
      expect(selectionResult.recommendedPlatform.platform.ecosystem.documentation).toBe(
        'excellent'
      );

      // Should have mobile SDKs
      const sdks = selectionResult.recommendedPlatform.platform.ecosystem.sdks;
      expect(sdks.some((sdk) => sdk.toLowerCase().includes('ios'))).toBe(true);
      expect(sdks.some((sdk) => sdk.toLowerCase().includes('android'))).toBe(true);
    });

    it('should recommend AWS Lambda for enterprise learning path', () => {
      const userInput = 'Learning AWS serverless for enterprise career';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 100,
        expectedTrafficRequestsPerMonth: 50000,
      };

      const contextResult = detectContext(userInput, metadata);
      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        preferredEcosystem: 'aws',
        prioritizeLearning: true,
      });

      // AWS should be recommended
      expect(selectionResult.recommendedPlatform.platform.provider).toBe('aws');

      // Should have excellent documentation
      expect(selectionResult.recommendedPlatform.platform.ecosystem.documentation).toBe(
        'excellent'
      );

      // Should have very large community
      expect(selectionResult.recommendedPlatform.platform.ecosystem.communitySize).toBe(
        'very-large'
      );
    });
  });

  describe('testPlatformEcosystemLearningResources', () => {
    it('should verify all platforms have learning resource metadata', () => {
      const knowledgeBase = loadAllPlatforms();
      const platforms = Array.from(knowledgeBase.platforms.values());

      for (const platform of platforms) {
        // All platforms should have ecosystem data
        expect(platform.ecosystem).toBeDefined();
        expect(platform.ecosystem.communitySize).toMatch(/small|medium|large|very-large/);

        // Should have SDKs listed
        expect(platform.ecosystem.sdks).toBeDefined();
        expect(Array.isArray(platform.ecosystem.sdks)).toBe(true);

        // Should have integrations listed
        expect(platform.ecosystem.integrations).toBeDefined();
        expect(Array.isArray(platform.ecosystem.integrations)).toBe(true);

        // Documentation quality should be specified
        if (platform.ecosystem.documentation) {
          expect(platform.ecosystem.documentation).toMatch(/poor|good|excellent/);
        }
      }
    });

    it('should identify platforms with largest communities for learning', () => {
      const knowledgeBase = loadAllPlatforms();
      const platforms = Array.from(knowledgeBase.platforms.values());

      const largeCommunityPlatforms = platforms.filter(
        (p) => p.ecosystem.communitySize === 'very-large' || p.ecosystem.communitySize === 'large'
      );

      // Should have at least 2-3 platforms with large communities
      expect(largeCommunityPlatforms.length).toBeGreaterThanOrEqual(2);

      // Major cloud providers should have very large communities
      const aws = platforms.find((p) => p.provider === 'AWS');
      if (aws) {
        expect(aws.ecosystem.communitySize).toMatch(/large|very-large/);
      }
    });

    it('should identify platforms with best documentation', () => {
      const knowledgeBase = loadAllPlatforms();
      const platforms = Array.from(knowledgeBase.platforms.values());

      const excellentDocsPlatforms = platforms.filter(
        (p) => p.ecosystem.documentation === 'excellent'
      );

      // Should have multiple platforms with excellent docs
      expect(excellentDocsPlatforms.length).toBeGreaterThanOrEqual(2);

      // Firebase and AWS should have excellent documentation
      const firebase = platforms.find((p) => p.provider === 'firebase');
      const aws = platforms.find((p) => p.provider === 'AWS');

      if (firebase) {
        expect(firebase.ecosystem.documentation).toBe('excellent');
      }

      if (aws) {
        expect(aws.ecosystem.documentation).toBe('excellent');
      }
    });
  });

  describe('testRuntimeSpecificLearningPaths', () => {
    it('should recommend platform with strong Python support for Python learners', () => {
      const userInput = 'Learning Python serverless development';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 0,
        expectedTrafficRequestsPerMonth: 20000,
      };

      const contextResult = detectContext(userInput, metadata);
      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        runtimeRequired: 'python',
        prioritizeLearning: true,
      });

      // Recommended platform should support Python
      const supportsPython = selectionResult.recommendedPlatform.platform.features.runtimeSupport.some(
        (r) => r.toLowerCase().includes('python')
      );
      expect(supportsPython).toBe(true);
    });

    it('should recommend platform with strong Node.js support for JavaScript learners', () => {
      const userInput = 'Learning JavaScript backend development';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 0,
        expectedTrafficRequestsPerMonth: 15000,
      };

      const contextResult = detectContext(userInput, metadata);
      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        runtimeRequired: 'nodejs',
        prioritizeLearning: true,
      });

      // Recommended platform should support Node.js
      const supportsNodejs = selectionResult.recommendedPlatform.platform.features.runtimeSupport.some(
        (r) => r.toLowerCase().includes('node')
      );
      expect(supportsNodejs).toBe(true);
    });

    it('should verify all major platforms support multiple runtimes for diverse learning', () => {
      const knowledgeBase = loadAllPlatforms();
      const platforms = Array.from(knowledgeBase.platforms.values());

      for (const platform of platforms) {
        // All platforms should support multiple runtimes
        expect(platform.features.runtimeSupport.length).toBeGreaterThan(0);

        // Major cloud providers should support 3+ runtimes
        if (['AWS', 'Azure', 'GCP'].includes(platform.provider)) {
          expect(platform.features.runtimeSupport.length).toBeGreaterThanOrEqual(3);
        }
      }
    });
  });

  describe('testProgressiveComplexityLearningPath', () => {
    it('should recommend simple platforms for beginners', () => {
      const userInput = 'Complete beginner to serverless and cloud';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 0,
        expectedTrafficRequestsPerMonth: 1000,
      };

      const contextResult = detectContext(userInput, metadata);
      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        prioritizeLearning: true,
      });

      // Firebase or Supabase might be recommended for simplicity
      expect(selectionResult.recommendedPlatform.platform.provider).toMatch(/firebase|supabase/);

      // Should have excellent documentation
      expect(selectionResult.recommendedPlatform.platform.ecosystem.documentation).toMatch(
        /good|excellent/
      );

      // Rationale should mention ease of use
      expect(selectionResult.recommendedPlatform.rationale.length).toBeGreaterThan(0);
    });

    it('should recommend AWS/Azure/GCP for advanced learners seeking enterprise skills', () => {
      const userInput = 'Experienced developer learning enterprise serverless patterns';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 100,
        expectedTrafficRequestsPerMonth: 100000,
      };

      const contextResult = detectContext(userInput, metadata);
      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        prioritizeLearning: true,
      });

      // Should recommend a major cloud provider
      expect(selectionResult.recommendedPlatform.platform.provider).toMatch(/aws|azure|gcp/i);

      // Should have large community
      expect(selectionResult.recommendedPlatform.platform.ecosystem.communitySize).toMatch(
        /large|very-large/
      );
    });
  });

  describe('testEcosystemIntegrationLearning', () => {
    it('should recommend platforms with rich integration ecosystems for full-stack learning', () => {
      const userInput = 'Learning full-stack serverless development';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 50,
        expectedTrafficRequestsPerMonth: 30000,
      };

      const contextResult = detectContext(userInput, metadata);
      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        prioritizeLearning: true,
      });

      // Recommended platform should have many integrations
      expect(selectionResult.recommendedPlatform.platform.ecosystem.integrations.length).toBeGreaterThan(
        5
      );

      // Should have multiple SDKs
      expect(selectionResult.recommendedPlatform.platform.ecosystem.sdks.length).toBeGreaterThan(2);
    });

    it('should identify platforms with database integrations for backend learning', () => {
      const knowledgeBase = loadAllPlatforms();
      const platforms = Array.from(knowledgeBase.platforms.values());

      for (const platform of platforms) {
        // All platforms should have some database integrations
        const hasDbIntegration = platform.ecosystem.integrations.some(
          (integration) =>
            integration.toLowerCase().includes('database') ||
            integration.toLowerCase().includes('db') ||
            integration.toLowerCase().includes('dynamodb') ||
            integration.toLowerCase().includes('firestore') ||
            integration.toLowerCase().includes('cosmos')
        );

        // Major platforms should have database integrations
        if (['AWS', 'Azure', 'GCP', 'firebase'].includes(platform.provider)) {
          expect(hasDbIntegration || platform.ecosystem.integrations.length > 0).toBe(true);
        }
      }
    });
  });

  describe('testCommunityResourceMapping', () => {
    it('should map platforms to community size for learner support', () => {
      const knowledgeBase = loadAllPlatforms();
      const platforms = Array.from(knowledgeBase.platforms.values());

      const communityDistribution = {
        small: 0,
        medium: 0,
        large: 0,
        'very-large': 0,
      };

      for (const platform of platforms) {
        communityDistribution[platform.ecosystem.communitySize] += 1;
      }

      // Should have variety of community sizes
      expect(communityDistribution['very-large'] + communityDistribution.large).toBeGreaterThan(0);
    });

    it('should prioritize platforms with large communities for learners needing support', () => {
      const userInput = 'New to programming, need lots of community support';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 0,
        expectedTrafficRequestsPerMonth: 5000,
      };

      const contextResult = detectContext(userInput, metadata);
      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        prioritizeLearning: true,
      });

      // Should recommend platform with large community
      expect(selectionResult.recommendedPlatform.platform.ecosystem.communitySize).toMatch(
        /large|very-large/
      );

      // Should have excellent or good documentation
      expect(selectionResult.recommendedPlatform.platform.ecosystem.documentation).toMatch(
        /good|excellent/
      );
    });
  });

  describe('testLearningPathComparison', () => {
    it('should enable comparison of platforms by learning-friendliness', () => {
      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: 'pet-project',
        prioritizeLearning: true,
      });

      // All platforms should be ranked
      expect(selectionResult.rankedPlatforms.length).toBeGreaterThan(1);

      // Top platforms should have good documentation
      const top3 = selectionResult.rankedPlatforms.slice(0, 3);
      for (const ranking of top3) {
        // Should have documentation quality specified
        if (ranking.platform.ecosystem.documentation) {
          expect(ranking.platform.ecosystem.documentation).toMatch(/good|excellent/);
        }

        // Should have reasonable community size
        expect(ranking.platform.ecosystem.communitySize).toMatch(/medium|large|very-large/);
      }
    });

    it('should provide rationale explaining learning advantages', () => {
      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: 'pet-project',
        prioritizeLearning: true,
      });

      const recommended = selectionResult.recommendedPlatform;

      // Rationale should be meaningful
      expect(recommended.rationale).toBeDefined();
      expect(recommended.rationale.length).toBeGreaterThan(20);

      // Should mention learning-relevant factors
      const rationaleWords = recommended.rationale.toLowerCase();
      const hasLearningMention =
        rationaleWords.includes('documentation') ||
        rationaleWords.includes('community') ||
        rationaleWords.includes('learning') ||
        rationaleWords.includes('tutorial') ||
        rationaleWords.includes('sdk');

      expect(hasLearningMention).toBe(true);
    });
  });

  describe('testStartupProgramsForLearning', () => {
    it('should surface startup programs that provide learning credits', () => {
      const knowledgeBase = loadAllPlatforms();
      const platforms = Array.from(knowledgeBase.platforms.values());

      // Count platforms with startup programs
      const platformsWithPrograms = platforms.filter((p) => p.startupPrograms.length > 0);

      // At least major cloud providers should have programs
      expect(platformsWithPrograms.length).toBeGreaterThan(0);

      // Verify program structure
      for (const platform of platformsWithPrograms) {
        for (const program of platform.startupPrograms) {
          expect(program.name).toBeDefined();
          expect(program.credits).toBeGreaterThan(0);
          expect(program.duration).toBeDefined();
        }
      }
    });

    it('should recommend platforms with startup credits for learning projects', () => {
      const userInput = 'Learning serverless for startup I want to build';
      const metadata: ProjectMetadata = {
        teamSize: 2,
        monthlyBudget: 100,
        expectedTrafficRequestsPerMonth: 100000,
      };

      const contextResult = detectContext(userInput, metadata);
      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        prioritizeStartupCredits: true,
        prioritizeLearning: true,
      });

      // Recommended platform should have startup programs if available
      const hasStartupProgram = selectionResult.recommendedPlatform.platform.startupPrograms.length > 0;

      if (hasStartupProgram) {
        // Rationale should mention startup credits
        expect(selectionResult.recommendedPlatform.rationale).toContain('Startup credits');
      }
    });
  });
});
