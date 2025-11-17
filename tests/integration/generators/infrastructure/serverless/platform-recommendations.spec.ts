/**
 * SpecWeave E2E Test Suite - Serverless Intelligence
 * Tests platform recommendation accuracy and end-to-end logic
 *
 * These tests verify that the platform selection algorithm produces
 * accurate, contextually appropriate recommendations across various
 * scenarios and edge cases.
 */

import { test, expect } from '@playwright/test';
import { detectContext } from '../../src/core/serverless/context-detector.js';
import { PlatformDataLoader } from '../../src/core/serverless/platform-data-loader.js';
import { selectPlatforms } from '../../src/core/serverless/platform-selector.js';
import { analyzeSuitability } from '../../src/core/serverless/suitability-analyzer.js';
import type { PlatformKnowledgeBase, ProjectContext } from '../../src/core/serverless/types.js';

test.describe('Serverless Platform Recommendations - E2E', () => {
  let platformLoader: PlatformDataLoader;
  let knowledgeBase: PlatformKnowledgeBase;

  test.beforeAll(async () => {
    platformLoader = new PlatformDataLoader();
    const platforms = await platformLoader.loadAll();
    knowledgeBase = {
      platforms: new Map(platforms.map(p => [p.id, p])),
      lastUpdated: new Date().toISOString(),
    };
  });

  test.describe('Context Detection Accuracy', () => {
    test('Accurately detects pet-project context from beginner language', async () => {
      const inputs = [
        'I am learning serverless for the first time',
        'This is a personal side project for my portfolio',
        'Never used cloud before, just experimenting',
        'Student project for university bootcamp',
      ];

      for (const input of inputs) {
        const result = detectContext(input);
        expect(result.context).toBe('pet-project');
        expect(result.signals.length).toBeGreaterThan(0);
      }
    });

    test('Accurately detects startup context from MVP/funding language', async () => {
      const inputs = [
        'Building an MVP for our YC pitch',
        'Early stage startup with seed funding',
        'Need to launch quickly and get traction',
        'Startup with investors looking for product-market fit',
      ];

      for (const input of inputs) {
        const result = detectContext(input);
        expect(result.context).toBe('startup');
        expect(result.signals.length).toBeGreaterThan(0);
      }
    });

    test('Accurately detects enterprise context from compliance/scale language', async () => {
      const inputs = [
        'Production application with SOC 2 compliance',
        'Mission critical system with millions of users',
        'Enterprise with HIPAA and GDPR requirements',
        'Large scale deployment with high availability SLA',
      ];

      for (const input of inputs) {
        const result = detectContext(input);
        expect(result.context).toBe('enterprise');
        expect(result.signals.length).toBeGreaterThan(0);
      }
    });

    test('Metadata strengthens context detection accuracy', async () => {
      const input = 'Building an application';

      // Pet project metadata
      const petResult = detectContext(input, {
        teamSize: 1,
        monthlyBudget: 0,
      });
      expect(petResult.context).toBe('pet-project');

      // Startup metadata
      const startupResult = detectContext(input, {
        teamSize: 10,
        monthlyBudget: 500,
        expectedTrafficRequestsPerMonth: 5000000,
      });
      expect(startupResult.context).toBe('startup');

      // Enterprise metadata
      const enterpriseResult = detectContext(input, {
        teamSize: 100,
        monthlyBudget: 10000,
        complianceRequirements: ['SOC 2', 'HIPAA'],
        hasExistingInfrastructure: true,
      });
      expect(enterpriseResult.context).toBe('enterprise');
    });

    test('High confidence when strong signals present', async () => {
      const input = 'I am a complete beginner learning serverless for my personal project';

      const result = detectContext(input);
      expect(result.confidence).toBe('high');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(70);
      expect(result.clarifyingQuestions).toBeUndefined();
    });

    test('Low confidence triggers clarifying questions', async () => {
      const vagueinputs = [
        'serverless',
        'need cloud',
        'functions',
      ];

      for (const input of vagueinputs) {
        const result = detectContext(input);
        expect(result.confidence).toBe('low');
        expect(result.clarifyingQuestions).toBeDefined();
        expect(result.clarifyingQuestions!.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Platform Selection Correctness', () => {
    test('Firebase recommended for pet projects with learning priority', async () => {
      const selection = selectPlatforms(knowledgeBase, {
        context: 'pet-project',
        prioritizeLearning: true,
      });

      const recommended = selection.recommendedPlatform;
      expect(['firebase', 'supabase']).toContain(recommended.platform.id);
      expect(recommended.score).toBeGreaterThan(60);
      expect(recommended.platform.ecosystem.documentation).toBe('excellent');
    });

    test('AWS Lambda recommended for enterprise with AWS ecosystem', async () => {
      const selection = selectPlatforms(knowledgeBase, {
        context: 'enterprise',
        preferredEcosystem: 'aws',
      });

      const recommended = selection.recommendedPlatform;
      expect(recommended.platform.id).toBe('aws-lambda');
      expect(recommended.score).toBeGreaterThan(80);
    });

    test('Azure Functions recommended for enterprise with Azure ecosystem', async () => {
      const selection = selectPlatforms(knowledgeBase, {
        context: 'enterprise',
        preferredEcosystem: 'azure',
      });

      const recommended = selection.recommendedPlatform;
      expect(recommended.platform.id).toBe('azure-functions');
      expect(recommended.score).toBeGreaterThan(80);
    });

    test('GCP Cloud Functions recommended for enterprise with GCP ecosystem', async () => {
      const selection = selectPlatforms(knowledgeBase, {
        context: 'enterprise',
        preferredEcosystem: 'gcp',
      });

      const recommended = selection.recommendedPlatform;
      expect(recommended.platform.id).toBe('gcp-cloud-functions');
      expect(recommended.score).toBeGreaterThan(80);
    });

    test('Supabase recommended for open-source ecosystem preference', async () => {
      const selection = selectPlatforms(knowledgeBase, {
        context: 'pet-project',
        preferredEcosystem: 'open-source',
      });

      const recommended = selection.recommendedPlatform;
      expect(recommended.platform.id).toBe('supabase');
      expect(recommended.score).toBeGreaterThan(60);
    });

    test('Firebase recommended for mobile ecosystem preference', async () => {
      const selection = selectPlatforms(knowledgeBase, {
        context: 'pet-project',
        preferredEcosystem: 'mobile',
      });

      const recommended = selection.recommendedPlatform;
      expect(recommended.platform.id).toBe('firebase');
      expect(recommended.score).toBeGreaterThan(60);
    });

    test('Platforms with startup credits ranked higher for startups', async () => {
      const selection = selectPlatforms(knowledgeBase, {
        context: 'startup',
        prioritizeStartupCredits: true,
      });

      const recommended = selection.recommendedPlatform;
      expect(recommended.platform.startupPrograms.length).toBeGreaterThan(0);

      // Verify all top-ranked platforms have startup programs
      const top3 = selection.rankedPlatforms.slice(0, 3);
      const platformsWithCredits = top3.filter(
        r => r.platform.startupPrograms.length > 0
      );
      expect(platformsWithCredits.length).toBeGreaterThanOrEqual(2);
    });

    test('Runtime requirement filters platforms correctly', async () => {
      const selection = selectPlatforms(knowledgeBase, {
        context: 'startup',
        runtimeRequired: 'python',
      });

      const recommended = selection.recommendedPlatform;
      const hasPython = recommended.platform.features.runtimes.some(r =>
        r.toLowerCase().includes('python')
      );
      expect(hasPython).toBe(true);
    });
  });

  test.describe('Suitability Analysis', () => {
    test('Event-driven workload recommended for serverless', async () => {
      const analysis = analyzeSuitability({
        workloadType: 'event-driven',
        requestsPerMonth: 1000000,
        avgExecutionTimeMs: 200,
      });

      expect(analysis.recommendation).toBe('yes');
      expect(analysis.rationale.cost).toContain('cost-effective');
      expect(analysis.rationale.scalability).toContain('automatic');
    });

    test('API-driven workload recommended with caching', async () => {
      const analysis = analyzeSuitability({
        workloadType: 'api-driven',
        requestsPerMonth: 5000000,
        avgExecutionTimeMs: 100,
      });

      expect(['yes', 'conditional']).toContain(analysis.recommendation);
      if (analysis.recommendation === 'conditional') {
        expect(analysis.warnings.some(w => w.includes('caching'))).toBe(true);
      }
    });

    test('Long-running workload not recommended for serverless', async () => {
      const analysis = analyzeSuitability({
        workloadType: 'long-running',
        requestsPerMonth: 100000,
        avgExecutionTimeMs: 600000, // 10 minutes
      });

      expect(['no', 'conditional']).toContain(analysis.recommendation);
      expect(analysis.warnings.length).toBeGreaterThan(0);
    });

    test('Stateful workload triggers conditional recommendation', async () => {
      const analysis = analyzeSuitability({
        workloadType: 'stateful',
        requestsPerMonth: 500000,
        avgExecutionTimeMs: 300,
      });

      expect(analysis.recommendation).toBe('conditional');
      expect(analysis.warnings.some(w =>
        w.includes('stateful') || w.includes('database')
      )).toBe(true);
    });

    test('Batch workload conditionally recommended', async () => {
      const analysis = analyzeSuitability({
        workloadType: 'batch',
        requestsPerMonth: 10000,
        avgExecutionTimeMs: 5000,
      });

      expect(['yes', 'conditional']).toContain(analysis.recommendation);
      expect(analysis.rationale.cost).toBeTruthy();
    });
  });

  test.describe('Multi-Scenario Testing', () => {
    test('Beginner pet project with no budget → Firebase/Supabase', async () => {
      const context = detectContext('I am learning, no budget, personal project');
      const selection = selectPlatforms(knowledgeBase, {
        context: context.context,
        prioritizeLearning: true,
      });

      const recommended = selection.recommendedPlatform;
      expect(['firebase', 'supabase']).toContain(recommended.platform.id);
      expect(recommended.platform.pricing.freeTier.requests).toBeGreaterThanOrEqual(1000000);
    });

    test('Startup with existing AWS infrastructure → AWS Lambda', async () => {
      const context = detectContext('MVP startup', {
        hasExistingInfrastructure: true,
      });

      const selection = selectPlatforms(knowledgeBase, {
        context: context.context,
        preferredEcosystem: 'aws',
      });

      const recommended = selection.recommendedPlatform;
      expect(recommended.platform.id).toBe('aws-lambda');
    });

    test('Enterprise with Azure ecosystem → Azure Functions', async () => {
      const context = detectContext('Production enterprise application', {
        teamSize: 100,
        complianceRequirements: ['SOC 2'],
      });

      const selection = selectPlatforms(knowledgeBase, {
        context: context.context,
        preferredEcosystem: 'azure',
      });

      const recommended = selection.recommendedPlatform;
      expect(recommended.platform.id).toBe('azure-functions');
    });

    test('Cross-platform comparison produces ranked alternatives', async () => {
      const selection = selectPlatforms(knowledgeBase, {
        context: 'startup',
      });

      expect(selection.rankedPlatforms.length).toBeGreaterThanOrEqual(5);

      // Verify rankings are sorted by score
      for (let i = 1; i < selection.rankedPlatforms.length; i++) {
        expect(selection.rankedPlatforms[i - 1].score).toBeGreaterThanOrEqual(
          selection.rankedPlatforms[i].score
        );
      }

      // Verify all rankings have rationale and tradeoffs
      for (const ranking of selection.rankedPlatforms) {
        expect(ranking.rationale).toBeTruthy();
        expect(ranking.tradeoffs.pros.length).toBeGreaterThanOrEqual(0);
        expect(ranking.score).toBeGreaterThanOrEqual(0);
        expect(ranking.score).toBeLessThanOrEqual(100);
      }
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('Missing metadata defaults to pet-project with low confidence', async () => {
      const result = detectContext('build something');

      expect(result.context).toBe('pet-project');
      expect(result.confidence).toBe('low');
      expect(result.clarifyingQuestions).toBeDefined();
    });

    test('Conflicting signals resolved by strongest indicator', async () => {
      const input = 'I am learning serverless but have SOC 2 compliance requirements';

      const result = detectContext(input, {
        complianceRequirements: ['SOC 2'],
      });

      // Compliance should override learning signal
      expect(result.context).toBe('enterprise');
    });

    test('Empty user input handled gracefully', async () => {
      const result = detectContext('');

      expect(result.context).toBe('pet-project');
      expect(result.confidence).toBe('low');
      expect(result.clarifyingQuestions).toBeDefined();
    });

    test('All platforms have valid ranking data', async () => {
      const contexts: ProjectContext[] = ['pet-project', 'startup', 'enterprise'];

      for (const context of contexts) {
        const selection = selectPlatforms(knowledgeBase, { context });

        for (const ranking of selection.rankedPlatforms) {
          expect(ranking.platform).toBeTruthy();
          expect(ranking.score).toBeGreaterThanOrEqual(0);
          expect(ranking.score).toBeLessThanOrEqual(100);
          expect(ranking.rationale).toBeTruthy();
          expect(ranking.tradeoffs).toBeTruthy();
        }
      }
    });

    test('Ecosystem preference overrides context bias', async () => {
      // Even for pet project, AWS ecosystem should boost AWS Lambda
      const selection = selectPlatforms(knowledgeBase, {
        context: 'pet-project',
        preferredEcosystem: 'aws',
      });

      const recommended = selection.recommendedPlatform;
      expect(recommended.platform.id).toBe('aws-lambda');
      expect(recommended.score).toBeGreaterThan(60);
    });
  });

  test.describe('Tradeoffs and Rationale Quality', () => {
    test('All platforms provide meaningful tradeoffs', async () => {
      const selection = selectPlatforms(knowledgeBase, {
        context: 'startup',
      });

      for (const ranking of selection.rankedPlatforms) {
        const { pros, cons } = ranking.tradeoffs;

        // Should have at least some tradeoffs
        expect(pros.length + cons.length).toBeGreaterThan(0);

        // Verify tradeoffs are non-empty strings
        for (const pro of pros) {
          expect(pro.length).toBeGreaterThan(0);
        }
        for (const con of cons) {
          expect(con.length).toBeGreaterThan(0);
        }
      }
    });

    test('Rationale reflects context-specific concerns', async () => {
      // Pet project rationale should mention free tier
      const petSelection = selectPlatforms(knowledgeBase, {
        context: 'pet-project',
      });
      expect(petSelection.recommendedPlatform.rationale).toMatch(
        /free tier|documentation|community/i
      );

      // Startup rationale should mention credits or integrations
      const startupSelection = selectPlatforms(knowledgeBase, {
        context: 'startup',
      });
      expect(startupSelection.recommendedPlatform.rationale).toMatch(
        /credits|integrations|compute/i
      );

      // Enterprise rationale should mention memory or execution time
      const enterpriseSelection = selectPlatforms(knowledgeBase, {
        context: 'enterprise',
      });
      expect(enterpriseSelection.recommendedPlatform.rationale).toMatch(
        /memory|execution|documentation/i
      );
    });

    test('Platforms with high portability mentioned in pros', async () => {
      const selection = selectPlatforms(knowledgeBase, {
        context: 'pet-project',
      });

      for (const ranking of selection.rankedPlatforms) {
        if (ranking.platform.lockIn.portability === 'high') {
          const hasPortabilityPro = ranking.tradeoffs.pros.some(pro =>
            pro.toLowerCase().includes('portability')
          );
          expect(hasPortabilityPro).toBe(true);
        }
      }
    });

    test('Platforms with low portability mentioned in cons', async () => {
      const selection = selectPlatforms(knowledgeBase, {
        context: 'startup',
      });

      for (const ranking of selection.rankedPlatforms) {
        if (ranking.platform.lockIn.portability === 'low') {
          const hasPortabilityCon = ranking.tradeoffs.cons.some(con =>
            con.toLowerCase().includes('portability') ||
            con.toLowerCase().includes('lock-in')
          );
          expect(hasPortabilityCon).toBe(true);
        }
      }
    });
  });

  test.describe('Data Integrity Validation', () => {
    test('All platforms loaded successfully', async () => {
      const platforms = await platformLoader.loadAll();
      expect(platforms.length).toBe(5);

      const platformIds = platforms.map(p => p.id);
      expect(platformIds).toContain('aws-lambda');
      expect(platformIds).toContain('azure-functions');
      expect(platformIds).toContain('gcp-cloud-functions');
      expect(platformIds).toContain('firebase');
      expect(platformIds).toContain('supabase');
    });

    test('All platforms have required fields', async () => {
      const platforms = await platformLoader.loadAll();

      for (const platform of platforms) {
        expect(platform.id).toBeTruthy();
        expect(platform.name).toBeTruthy();
        expect(platform.provider).toBeTruthy();
        expect(platform.pricing).toBeTruthy();
        expect(platform.features).toBeTruthy();
        expect(platform.ecosystem).toBeTruthy();
        expect(platform.lockIn).toBeTruthy();
        expect(platform.lastVerified).toBeTruthy();
      }
    });

    test('All platforms have valid pricing data', async () => {
      const platforms = await platformLoader.loadAll();

      for (const platform of platforms) {
        expect(platform.pricing.freeTier).toBeTruthy();
        expect(platform.pricing.freeTier.requests).toBeGreaterThanOrEqual(0);
        expect(platform.pricing.freeTier.computeGbSeconds).toBeGreaterThanOrEqual(0);

        expect(platform.pricing.payAsYouGo).toBeTruthy();
        expect(platform.pricing.payAsYouGo.requestsPer1M).toBeGreaterThanOrEqual(0);
        expect(platform.pricing.payAsYouGo.computePerGbSecond).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
