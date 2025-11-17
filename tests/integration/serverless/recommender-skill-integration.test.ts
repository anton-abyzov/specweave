/**
 * Serverless Recommender Skill Integration Tests
 *
 * Tests the complete serverless recommendation workflow integrating:
 * - Context detection
 * - Suitability analysis
 * - Platform selection
 */

import { describe, it, expect } from 'vitest';
import { detectContext } from '../../../src/core/serverless/context-detector.js';
import { analyzeSuitability } from '../../../src/core/serverless/suitability-analyzer.js';
import { selectPlatforms } from '../../../src/core/serverless/platform-selector.js';
import { loadAllPlatforms } from '../../../src/core/serverless/platform-data-loader.js';
import type { ProjectMetadata } from '../../../src/core/serverless/types.js';

describe('Serverless Recommender Skill Integration', () => {
  describe('testEndToEndRecommendationWorkflow', () => {
    it('should execute complete recommendation workflow from user input to platform selection', () => {
      // Step 1: User provides initial input
      const userInput = 'Building a startup MVP with API backend for mobile app, expecting variable traffic';
      const metadata: ProjectMetadata = {
        teamSize: 5,
        monthlyBudget: 500,
        expectedTrafficRequestsPerMonth: 1000000,
      };

      // Step 2: Detect project context
      const contextResult = detectContext(userInput, metadata);
      expect(contextResult.context).toBe('startup');
      expect(contextResult.confidence).toMatch(/medium|high/);

      // Step 3: Analyze serverless suitability
      const suitabilityResult = analyzeSuitability({
        description: userInput,
        trafficPattern: 'variable',
        expectedExecutionTime: 200,
        memoryRequirements: 0.5,
      });
      expect(suitabilityResult.recommendation).toBe('yes');
      expect(suitabilityResult.workloadType).toBe('api-driven');

      // Step 4: Load platform knowledge base
      const knowledgeBase = loadAllPlatforms();
      expect(knowledgeBase.platforms.size).toBeGreaterThan(0);

      // Step 5: Select optimal platform
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        preferredEcosystem: 'mobile',
        prioritizeStartupCredits: true,
      });

      // Verify complete recommendation
      expect(selectionResult.recommendedPlatform).toBeDefined();
      expect(selectionResult.recommendedPlatform.platform.provider).toMatch(/firebase|aws|gcp|azure|supabase/);
      expect(selectionResult.recommendedPlatform.score).toBeGreaterThan(0);
      expect(selectionResult.recommendedPlatform.rationale).toBeDefined();
      expect(selectionResult.rankedPlatforms.length).toBeGreaterThan(1);
    });

    it('should recommend Firebase for pet project with learning focus and mobile ecosystem', () => {
      // Pet project scenario
      const userInput = 'Personal mobile app project for learning full-stack development';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 0,
        expectedTrafficRequestsPerMonth: 10000,
      };

      const contextResult = detectContext(userInput, metadata);
      expect(contextResult.context).toBe('pet-project');

      const suitabilityResult = analyzeSuitability({
        description: userInput,
        trafficPattern: 'variable',
      });
      expect(suitabilityResult.recommendation).toBe('yes');

      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        preferredEcosystem: 'mobile',
        prioritizeLearning: true,
      });

      // Firebase should be recommended for mobile + learning
      expect(selectionResult.recommendedPlatform.platform.provider).toBe('firebase');
      expect(selectionResult.recommendedPlatform.rationale).toContain('Free tier');
    });

    it('should recommend AWS Lambda for startup with AWS ecosystem preference', () => {
      const userInput = 'Startup building SaaS product, need to integrate with existing AWS infrastructure';
      const metadata: ProjectMetadata = {
        teamSize: 15,
        monthlyBudget: 2000,
        expectedTrafficRequestsPerMonth: 5000000,
        hasExistingInfrastructure: true,
      };

      const contextResult = detectContext(userInput, metadata);
      expect(contextResult.context).toBe('startup');

      const suitabilityResult = analyzeSuitability({
        description: 'REST API backend with event-driven processing',
        trafficPattern: 'variable',
      });
      expect(suitabilityResult.recommendation).toBe('yes');

      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        preferredEcosystem: 'aws',
        prioritizeStartupCredits: true,
      });

      expect(selectionResult.recommendedPlatform.platform.provider).toBe('aws');
      expect(selectionResult.recommendedPlatform.rationale).toContain('Startup credits');
    });

    it('should recommend Azure Functions for enterprise with existing Azure infrastructure', () => {
      const userInput = 'Enterprise migration to serverless, existing Azure infrastructure with Active Directory';
      const metadata: ProjectMetadata = {
        teamSize: 150,
        monthlyBudget: 30000,
        expectedTrafficRequestsPerMonth: 100000000,
        complianceRequirements: ['SOC 2', 'HIPAA'],
        hasExistingInfrastructure: true,
      };

      const contextResult = detectContext(userInput, metadata);
      expect(contextResult.context).toBe('enterprise');

      const suitabilityResult = analyzeSuitability({
        description: 'Enterprise API backend with batch processing',
        trafficPattern: 'consistent',
      });
      expect(suitabilityResult.recommendation).toMatch(/yes|conditional/);

      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        preferredEcosystem: 'azure',
        isProduction: true,
      });

      expect(selectionResult.recommendedPlatform.platform.provider).toBe('azure');
      expect(selectionResult.recommendedPlatform.score).toBeGreaterThan(60);
    });

    it('should recommend Supabase for open-source preference', () => {
      const userInput = 'Building an open-source project, want to avoid vendor lock-in';
      const metadata: ProjectMetadata = {
        teamSize: 3,
        monthlyBudget: 100,
        expectedTrafficRequestsPerMonth: 500000,
      };

      const contextResult = detectContext(userInput, metadata);
      expect(contextResult.context).toMatch(/pet-project|startup/);

      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        preferredEcosystem: 'open-source',
      });

      expect(selectionResult.recommendedPlatform.platform.provider).toBe('supabase');
      expect(selectionResult.recommendedPlatform.platform.lockIn.portability).toBe('high');
    });
  });

  describe('testNegativeScenarios', () => {
    it('should not recommend serverless for WebSocket-based real-time application', () => {
      const userInput = 'Real-time multiplayer game with persistent WebSocket connections';
      const metadata: ProjectMetadata = {
        teamSize: 10,
        monthlyBudget: 1000,
        expectedTrafficRequestsPerMonth: 2000000,
      };

      const contextResult = detectContext(userInput, metadata);
      expect(contextResult.context).toMatch(/startup/);

      const suitabilityResult = analyzeSuitability({
        description: userInput,
        isStateful: true,
        hasWebSockets: true,
        requiresContinuousConnection: true,
      });

      expect(suitabilityResult.recommendation).toBe('no');
      expect(suitabilityResult.workloadType).toBe('stateful');
      expect(suitabilityResult.warnings.length).toBeGreaterThan(0);
      expect(suitabilityResult.warnings.some((w) => w.includes('WebSocket'))).toBe(true);
    });

    it('should not recommend serverless for long-running video processing', () => {
      const userInput = 'Video transcoding service processing hours of 4K content';

      const suitabilityResult = analyzeSuitability({
        description: userInput,
        expectedExecutionTime: 7200, // 2 hours
        memoryRequirements: 8,
      });

      expect(suitabilityResult.recommendation).toBe('no');
      expect(suitabilityResult.warnings.some((w) => w.includes('Long-running'))).toBe(true);
      expect(suitabilityResult.warnings.some((w) => w.includes('containers'))).toBe(true);
    });

    it('should provide conditional recommendation for consistent high-traffic API', () => {
      const userInput = 'High-traffic production API with consistent 24/7 load';
      const metadata: ProjectMetadata = {
        teamSize: 50,
        monthlyBudget: 10000,
        expectedTrafficRequestsPerMonth: 500000000,
      };

      const contextResult = detectContext(userInput, metadata);
      expect(contextResult.context).toBe('enterprise');

      const suitabilityResult = analyzeSuitability({
        description: userInput,
        trafficPattern: 'consistent',
      });

      expect(suitabilityResult.recommendation).toBe('conditional');
      expect(suitabilityResult.rationale.cost).toContain('containers or VMs');
    });
  });

  describe('testRefinementWorkflow', () => {
    it('should improve recommendations when user provides more context', () => {
      // Initial vague input
      const initialInput = 'Need to build a backend';
      const initialContext = detectContext(initialInput);
      expect(initialContext.confidence).toBe('low');
      expect(initialContext.clarifyingQuestions).toBeDefined();
      expect(initialContext.clarifyingQuestions!.length).toBeGreaterThan(0);

      // Refined input with more details
      const refinedInput = 'Need to build a REST API backend for mobile app with webhook processing';
      const refinedMetadata: ProjectMetadata = {
        teamSize: 5,
        monthlyBudget: 500,
        expectedTrafficRequestsPerMonth: 1000000,
      };

      const refinedContext = detectContext(refinedInput, refinedMetadata);
      expect(refinedContext.confidence).toMatch(/medium|high/);
      expect(refinedContext.confidenceScore).toBeGreaterThan(initialContext.confidenceScore);

      // Should now be able to make good recommendation
      const suitabilityResult = analyzeSuitability({
        description: refinedInput,
        trafficPattern: 'variable',
      });
      expect(suitabilityResult.recommendation).toBe('yes');

      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: refinedContext.context,
        preferredEcosystem: 'mobile',
      });
      expect(selectionResult.recommendedPlatform).toBeDefined();
    });
  });

  describe('testMultiCriteriaIntegration', () => {
    it('should balance multiple criteria: context + ecosystem + runtime + learning', () => {
      const userInput = 'Pet project to learn Python serverless development on AWS';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 0,
        expectedTrafficRequestsPerMonth: 50000,
      };

      const contextResult = detectContext(userInput, metadata);
      expect(contextResult.context).toBe('pet-project');

      const suitabilityResult = analyzeSuitability({
        description: 'API backend with scheduled batch jobs',
        trafficPattern: 'variable',
      });
      expect(suitabilityResult.recommendation).toBe('yes');

      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        preferredEcosystem: 'aws',
        runtimeRequired: 'python',
        prioritizeLearning: true,
      });

      expect(selectionResult.recommendedPlatform.platform.provider).toBe('aws');
      expect(
        selectionResult.recommendedPlatform.platform.features.runtimeSupport.some((r) =>
          r.toLowerCase().includes('python')
        )
      ).toBe(true);
    });

    it('should handle conflicting criteria gracefully', () => {
      // Conflict: enterprise context but open-source preference
      const userInput = 'Enterprise application but need to avoid vendor lock-in';
      const metadata: ProjectMetadata = {
        teamSize: 100,
        monthlyBudget: 20000,
        expectedTrafficRequestsPerMonth: 50000000,
        complianceRequirements: ['SOC 2'],
      };

      const contextResult = detectContext(userInput, metadata);
      expect(contextResult.context).toBe('enterprise');

      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
        preferredEcosystem: 'open-source',
        isProduction: true,
      });

      // Should still provide valid recommendation (balancing requirements)
      expect(selectionResult.recommendedPlatform).toBeDefined();
      expect(selectionResult.rankedPlatforms.length).toBe(5);

      // Check that rationale explains the tradeoff
      expect(selectionResult.recommendedPlatform.rationale).toBeDefined();
      expect(selectionResult.recommendedPlatform.tradeoffs.pros.length).toBeGreaterThan(0);
    });
  });

  describe('testComparisonFeature', () => {
    it('should enable comparison of top 3 suitable platforms', () => {
      const userInput = 'Startup building production API';
      const metadata: ProjectMetadata = {
        teamSize: 10,
        monthlyBudget: 1000,
        expectedTrafficRequestsPerMonth: 3000000,
      };

      const contextResult = detectContext(userInput, metadata);
      const knowledgeBase = loadAllPlatforms();
      const selectionResult = selectPlatforms(knowledgeBase, {
        context: contextResult.context,
      });

      // Top 3 platforms should have clear rationale and tradeoffs
      const top3 = selectionResult.rankedPlatforms.slice(0, 3);
      expect(top3.length).toBe(3);

      for (const ranking of top3) {
        expect(ranking.score).toBeGreaterThan(0);
        expect(ranking.rationale).toBeDefined();
        expect(ranking.rationale.length).toBeGreaterThan(0);
        expect(ranking.tradeoffs.pros.length).toBeGreaterThan(0);

        // Platform attributes should be accessible
        expect(ranking.platform.pricing.freeTier).toBeDefined();
        expect(ranking.platform.features.runtimeSupport.length).toBeGreaterThan(0);
        expect(ranking.platform.ecosystem.integrations.length).toBeGreaterThan(0);
      }

      // Verify platforms are sorted by score
      expect(top3[0].score).toBeGreaterThanOrEqual(top3[1].score);
      expect(top3[1].score).toBeGreaterThanOrEqual(top3[2].score);
    });
  });
});
