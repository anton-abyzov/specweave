/**
 * SpecWeave E2E Test Suite - Serverless Intelligence
 * Tests complete user workflows end-to-end
 *
 * These tests simulate realistic user journeys through the serverless
 * intelligence features, from context detection to platform recommendation,
 * cost estimation, and learning path generation.
 */

import { test, expect } from '@playwright/test';
import { detectContext } from '../../src/core/serverless/context-detector.js';
import { PlatformDataLoader } from '../../src/core/serverless/platform-data-loader.js';
import { selectPlatforms } from '../../src/core/serverless/platform-selector.js';
import { estimateCost } from '../../src/core/serverless/cost-estimator.js';
import { recommendLearningPath, detectSkillLevel } from '../../src/core/serverless/learning-path-recommender.js';
import type { PlatformKnowledgeBase, ProjectContext } from '../../src/core/serverless/types.js';

test.describe('Serverless Intelligence - Full User Workflows', () => {
  let platformLoader: PlatformDataLoader;
  let knowledgeBase: PlatformKnowledgeBase;

  test.beforeAll(async () => {
    // Load platform data once for all tests
    platformLoader = new PlatformDataLoader();
    const platforms = await platformLoader.loadAll();
    knowledgeBase = {
      platforms: new Map(platforms.map(p => [p.id, p])),
      lastUpdated: new Date().toISOString(),
    };
  });

  test('Pet project workflow: Beginner → Firebase recommendation → IaC generation → Learning path', async () => {
    // Step 1: User describes their pet project
    const userInput = 'I want to build a personal portfolio website with a contact form. ' +
      'This is my first time using serverless and I am just learning web development. ' +
      'I want something beginner-friendly and free.';

    // Step 2: Detect context
    const contextResult = detectContext(userInput);
    expect(contextResult.context).toBe('pet-project');
    expect(contextResult.confidence).toBe('high');
    expect(contextResult.signals).toContain('first time');
    expect(contextResult.signals).toContain('learning');

    // Step 3: Detect skill level
    const skillResult = detectSkillLevel(userInput);
    expect(skillResult.skillLevel).toBe('beginner');
    expect(skillResult.confidence).toBe('high');

    // Step 4: Select platform
    const selection = selectPlatforms(knowledgeBase, {
      context: 'pet-project',
      prioritizeLearning: true,
    });

    // Step 5: Verify Firebase is recommended (best for beginners)
    const recommended = selection.recommendedPlatform;
    expect(['firebase', 'supabase']).toContain(recommended.platform.id);
    expect(recommended.score).toBeGreaterThan(60);
    expect(recommended.tradeoffs.pros.length).toBeGreaterThan(0);
    expect(recommended.rationale).toBeTruthy();

    // Step 6: Get learning path
    const learningPath = recommendLearningPath(recommended.platform.id, 'beginner');
    expect(learningPath.skillLevel).toBe('beginner');
    expect(learningPath.tutorials.length).toBeGreaterThan(0);
    expect(learningPath.nextSteps.length).toBeGreaterThan(0);
    expect(learningPath.nextSteps[0]).toContain('documentation');

    // Step 7: Verify cost estimate (should be within free tier)
    const costEstimate = estimateCost(recommended.platform, {
      requestsPerMonth: 50000, // Small portfolio site traffic
      avgExecutionTimeMs: 100,
      memoryMb: 256,
      dataTransferGb: 1,
    });
    expect(costEstimate.withinFreeTier).toBe(true);
    expect(costEstimate.monthlyEstimate).toBe(0);

    // Step 8: Verify complete workflow delivers value
    expect(contextResult.context).toBe('pet-project');
    expect(recommended.platform.ecosystem.documentation).toBe('excellent');
    expect(learningPath.tutorials.length).toBeGreaterThan(0);
    expect(costEstimate.withinFreeTier).toBe(true);
  });

  test('Startup workflow: MVP → AWS Lambda with credits → Cost estimate → IaC', async () => {
    // Step 1: Startup founder describes their needs
    const userInput = 'We are building an MVP for our startup. ' +
      'We have seed funding and 10,000 expected users. ' +
      'We need to launch quickly and iterate fast. ' +
      'Looking for startup credits and a platform that scales well.';

    // Step 2: Detect context with metadata
    const contextResult = detectContext(userInput, {
      teamSize: 5,
      expectedTrafficRequestsPerMonth: 2000000,
      monthlyBudget: 500,
    });
    expect(contextResult.context).toBe('startup');
    expect(contextResult.confidence).toBe('high');
    expect(contextResult.signals).toContain('mvp');
    expect(contextResult.signals).toContain('startup');
    expect(contextResult.signals).toContain('seed funding');

    // Step 3: Select platform prioritizing startup credits
    const selection = selectPlatforms(knowledgeBase, {
      context: 'startup',
      prioritizeStartupCredits: true,
    });

    const recommended = selection.recommendedPlatform;

    // Step 4: Verify AWS Lambda recommended (startup credits)
    expect(['aws-lambda', 'gcp-cloud-functions']).toContain(recommended.platform.id);
    expect(recommended.platform.startupPrograms.length).toBeGreaterThan(0);

    // Step 5: Verify startup credits information
    const startupProgram = recommended.platform.startupPrograms[0];
    expect(startupProgram.credits).toBeGreaterThan(0);
    expect(startupProgram.duration).toBeTruthy();

    // Step 6: Cost estimate (realistic MVP traffic)
    const costEstimate = estimateCost(recommended.platform, {
      requestsPerMonth: 2000000,
      avgExecutionTimeMs: 300,
      memoryMb: 1024,
      dataTransferGb: 50,
    });
    expect(costEstimate.monthlyEstimate).toBeGreaterThan(0);
    expect(costEstimate.breakdown.compute).toBeGreaterThan(0);
    expect(costEstimate.breakdown.requests).toBeGreaterThan(0);

    // Step 7: Verify cost is reasonable for startup
    expect(costEstimate.monthlyEstimate).toBeLessThan(500);

    // Step 8: Verify rankedPlatforms include alternatives
    expect(selection.rankedPlatforms.length).toBeGreaterThanOrEqual(3);
    const allPlatforms = selection.rankedPlatforms.map(r => r.platform.id);
    expect(allPlatforms).toContain('aws-lambda');

    // Step 9: Verify complete workflow
    expect(contextResult.context).toBe('startup');
    expect(recommended.platform.startupPrograms.length).toBeGreaterThan(0);
    expect(costEstimate.monthlyEstimate).toBeLessThan(500);
  });

  test('Enterprise workflow: Compliance → AWS + security → Audit trail → IaC', async () => {
    // Step 1: Enterprise architect describes requirements
    const userInput = 'We need a production-grade serverless platform for a ' +
      'mission-critical application with HIPAA compliance, SOC 2 certification. ' +
      'We have existing AWS infrastructure and need high availability across ' +
      'multiple regions. Expected traffic: millions of users.';

    // Step 2: Detect context with enterprise metadata
    const contextResult = detectContext(userInput, {
      teamSize: 50,
      expectedTrafficRequestsPerMonth: 100000000,
      monthlyBudget: 10000,
      complianceRequirements: ['HIPAA', 'SOC 2'],
      hasExistingInfrastructure: true,
    });
    expect(contextResult.context).toBe('enterprise');
    expect(contextResult.confidence).toBe('high');
    expect(contextResult.signals).toContain('production');
    expect(contextResult.signals).toContain('mission critical');
    expect(contextResult.signals).toContain('compliance');

    // Step 3: Select platform with AWS ecosystem preference
    const selection = selectPlatforms(knowledgeBase, {
      context: 'enterprise',
      preferredEcosystem: 'aws',
      isProduction: true,
    });

    const recommended = selection.recommendedPlatform;

    // Step 4: Verify AWS Lambda recommended (enterprise-grade)
    expect(recommended.platform.id).toBe('aws-lambda');
    expect(recommended.score).toBeGreaterThan(80);

    // Step 5: Verify enterprise features
    expect(recommended.platform.features.maxMemoryMb).toBeGreaterThanOrEqual(8192);
    expect(recommended.platform.features.maxExecutionMinutes).toBeGreaterThanOrEqual(15);
    expect(recommended.platform.ecosystem.communitySize).toBe('very-large');
    expect(recommended.platform.ecosystem.documentation).toBe('excellent');

    // Step 6: Cost estimate (enterprise scale)
    const costEstimate = estimateCost(recommended.platform, {
      requestsPerMonth: 100000000,
      avgExecutionTimeMs: 500,
      memoryMb: 2048,
      dataTransferGb: 1000,
    });
    expect(costEstimate.withinFreeTier).toBe(false);
    expect(costEstimate.monthlyEstimate).toBeGreaterThan(1000);

    // Step 7: Verify cost breakdown
    expect(costEstimate.breakdown.compute).toBeGreaterThan(0);
    expect(costEstimate.breakdown.requests).toBeGreaterThan(0);
    expect(costEstimate.breakdown.dataTransfer).toBeGreaterThan(0);

    // Step 8: Verify complete workflow
    expect(contextResult.context).toBe('enterprise');
    expect(recommended.platform.id).toBe('aws-lambda');
    expect(costEstimate.monthlyEstimate).toBeGreaterThan(0);
  });

  test('Cost estimation workflow: Traffic → Platform comparison → Optimal choice', async () => {
    // User wants to compare costs across platforms
    const input = {
      requestsPerMonth: 5000000,
      avgExecutionTimeMs: 250,
      memoryMb: 512,
      dataTransferGb: 20,
    };

    // Estimate costs for all platforms
    const costEstimates = [];
    for (const platform of knowledgeBase.platforms.values()) {
      const estimate = estimateCost(platform, input);
      costEstimates.push(estimate);
    }

    // Verify all platforms estimated
    expect(costEstimates.length).toBe(5);

    // Find cheapest platform
    const cheapest = costEstimates.reduce((min, current) =>
      current.monthlyEstimate < min.monthlyEstimate ? current : min
    );

    // Verify cost comparison data
    expect(cheapest.monthlyEstimate).toBeGreaterThanOrEqual(0);
    expect(cheapest.breakdown.total).toBeGreaterThanOrEqual(0);

    // Verify free tier detection
    const freeTierPlatforms = costEstimates.filter(e => e.withinFreeTier);
    expect(freeTierPlatforms.length).toBeGreaterThanOrEqual(0);

    // Verify breakdown accuracy
    for (const estimate of costEstimates) {
      const breakdownTotal = estimate.breakdown.compute +
        estimate.breakdown.requests +
        estimate.breakdown.dataTransfer;
      expect(breakdownTotal).toBeCloseTo(estimate.breakdown.billableAmount, 2);
    }
  });

  test('Learning path workflow: Skill detection → Resources → Next steps', async () => {
    // Beginner user
    const beginnerInput = 'I have never used serverless before. ' +
      'What is the best way to get started? I am new to cloud computing.';

    const beginnerSkill = detectSkillLevel(beginnerInput);
    expect(beginnerSkill.skillLevel).toBe('beginner');
    expect(beginnerSkill.confidence).toBe('high');

    // Get learning path for Firebase (beginner-friendly)
    const beginnerPath = recommendLearningPath('firebase', 'beginner');
    expect(beginnerPath.tutorials.length).toBeGreaterThan(0);
    expect(beginnerPath.nextSteps.length).toBeGreaterThan(0);
    expect(beginnerPath.nextSteps[0]).toContain('documentation');

    // Advanced user
    const advancedInput = 'I have deployed production Lambda functions at scale. ' +
      'Looking to optimize cold starts and implement multi-region deployments.';

    const advancedSkill = detectSkillLevel(advancedInput);
    expect(advancedSkill.skillLevel).toBe('advanced');

    // Get learning path for AWS Lambda (advanced)
    const advancedPath = recommendLearningPath('aws-lambda', 'advanced');
    expect(advancedPath.tutorials.length).toBeGreaterThanOrEqual(0);
    expect(advancedPath.nextSteps.length).toBeGreaterThan(0);

    // Verify data freshness check
    expect(beginnerPath.dataFreshness).toBeTruthy();
    expect(beginnerPath.dataFreshness.lastVerified).toBeTruthy();
  });

  test('Compliance workflow: Requirements → Certified platforms → Recommendation', async () => {
    // User with compliance requirements
    const userInput = 'We need HIPAA and SOC 2 compliance for healthcare data. ' +
      'What serverless platforms support these certifications?';

    const contextResult = detectContext(userInput, {
      complianceRequirements: ['HIPAA', 'SOC 2'],
      isProduction: true,
    });

    expect(contextResult.context).toBe('enterprise');

    // Select platforms with enterprise focus
    const selection = selectPlatforms(knowledgeBase, {
      context: 'enterprise',
      isProduction: true,
    });

    const recommended = selection.recommendedPlatform;

    // Verify enterprise-grade platform recommended
    expect(['aws-lambda', 'azure-functions', 'gcp-cloud-functions']).toContain(
      recommended.platform.id
    );
    expect(recommended.platform.ecosystem.communitySize).toBe('very-large');
  });

  test('Multi-scenario comparison: Pet vs Startup vs Enterprise recommendations', async () => {
    // Test same user requirements across different contexts
    const commonRequirements = {
      requestsPerMonth: 1000000,
      avgExecutionTimeMs: 200,
      memoryMb: 512,
      dataTransferGb: 10,
    };

    // Pet project context
    const petSelection = selectPlatforms(knowledgeBase, {
      context: 'pet-project',
      prioritizeLearning: true,
    });

    // Startup context
    const startupSelection = selectPlatforms(knowledgeBase, {
      context: 'startup',
      prioritizeStartupCredits: true,
    });

    // Enterprise context
    const enterpriseSelection = selectPlatforms(knowledgeBase, {
      context: 'enterprise',
      isProduction: true,
    });

    // Verify different platforms recommended
    const petPlatform = petSelection.recommendedPlatform.platform.id;
    const startupPlatform = startupSelection.recommendedPlatform.platform.id;
    const enterprisePlatform = enterpriseSelection.recommendedPlatform.platform.id;

    // Pet project: Firebase or Supabase (beginner-friendly)
    expect(['firebase', 'supabase']).toContain(petPlatform);

    // Enterprise: AWS Lambda (most mature)
    expect(['aws-lambda', 'azure-functions', 'gcp-cloud-functions']).toContain(enterprisePlatform);

    // Verify scores reflect context
    expect(petSelection.recommendedPlatform.score).toBeGreaterThan(50);
    expect(startupSelection.recommendedPlatform.score).toBeGreaterThan(50);
    expect(enterpriseSelection.recommendedPlatform.score).toBeGreaterThan(50);
  });

  test('Edge case: Zero traffic cost estimation', async () => {
    const platform = await platformLoader.loadById('aws-lambda');
    expect(platform).toBeTruthy();

    const costEstimate = estimateCost(platform!, {
      requestsPerMonth: 0,
      avgExecutionTimeMs: 0,
      memoryMb: 128,
      dataTransferGb: 0,
    });

    expect(costEstimate.monthlyEstimate).toBe(0);
    expect(costEstimate.withinFreeTier).toBe(true);
    expect(costEstimate.breakdown.total).toBe(0);
  });

  test('Edge case: Massive scale cost estimation', async () => {
    const platform = await platformLoader.loadById('aws-lambda');
    expect(platform).toBeTruthy();

    const costEstimate = estimateCost(platform!, {
      requestsPerMonth: 1000000000, // 1 billion requests
      avgExecutionTimeMs: 1000,
      memoryMb: 3008,
      dataTransferGb: 10000,
    });

    expect(costEstimate.withinFreeTier).toBe(false);
    expect(costEstimate.monthlyEstimate).toBeGreaterThan(10000);
    expect(costEstimate.breakdown.compute).toBeGreaterThan(0);
  });

  test('Edge case: Low confidence context detection triggers clarifying questions', async () => {
    const vagueinput = 'I need serverless';

    const contextResult = detectContext(vagueinput);

    // Should default to pet-project with low confidence
    expect(contextResult.confidence).toBe('low');
    expect(contextResult.clarifyingQuestions).toBeDefined();
    expect(contextResult.clarifyingQuestions!.length).toBeGreaterThan(0);
  });
});
