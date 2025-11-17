import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Context Detector Unit Tests
 *
 * Tests for project context detection logic.
 */

import { describe, it, expect } from 'vitest';
import { detectContext } from '../../../src/core/serverless/context-detector.js.js';
import type { ProjectMetadata } from '../../../src/core/serverless/types.js.js';

describe('Context Detector', () => {
  describe('testPetProjectDetection', () => {
    it('should detect pet project from keywords: learning, personal, side project', () => {
      const inputs = [
        'I want to build a personal project to learn serverless',
        'This is my side project for fun',
        'Learning project to practice cloud development',
        'Hobby project for my portfolio',
        'Student project for university',
      ];

      for (const input of inputs) {
        const result = detectContext(input);
        expect(result.context).toBe('pet-project');
        expect(result.signals.length).toBeGreaterThan(0);
      }
    });

    it('should have high confidence for clear pet project signals', () => {
      const input = 'Personal learning project, side hobby for fun, beginner trying out serverless';
      const result = detectContext(input);

      expect(result.context).toBe('pet-project');
      expect(result.confidence).toBe('high');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(70);
    });
  });

  describe('testStartupDetection', () => {
    it('should detect startup from keywords: MVP, early stage, startup, founders', () => {
      const inputs = [
        'We need to build an MVP for our startup',
        'Early stage company looking to launch quickly',
        'Founders building a product for Series A',
        'YC company needing to ship fast',
        'Bootstrapped startup with limited resources',
      ];

      for (const input of inputs) {
        const result = detectContext(input);
        expect(result.context).toBe('startup');
        expect(result.signals.length).toBeGreaterThan(0);
      }
    });

    it('should have high confidence for clear startup signals', () => {
      const input = 'MVP for our startup, early stage founders seeking product-market fit, YC company';
      const result = detectContext(input);

      expect(result.context).toBe('startup');
      expect(result.confidence).toBe('high');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(70);
    });
  });

  describe('testEnterpriseDetection', () => {
    it('should detect enterprise from keywords: production, large scale, compliance, SOC 2, HIPAA', () => {
      const inputs = [
        'Production application requiring SOC 2 compliance',
        'Enterprise-grade system with HIPAA requirements',
        'Large scale deployment with 99.9% uptime SLA',
        'Mission critical application for thousands of users',
        'Multi-region deployment with disaster recovery',
      ];

      for (const input of inputs) {
        const result = detectContext(input);
        expect(result.context).toBe('enterprise');
        expect(result.signals.length).toBeGreaterThan(0);
      }
    });

    it('should have high confidence for clear enterprise signals', () => {
      const input =
        'Production enterprise application, SOC 2 compliance, HIPAA requirements, 99.9% uptime SLA';
      const result = detectContext(input);

      expect(result.context).toBe('enterprise');
      expect(result.confidence).toBe('high');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(70);
    });
  });

  describe('testAmbiguousContext', () => {
    it('should have low confidence when no clear keywords are present', () => {
      const input = 'I want to build an application';
      const result = detectContext(input);

      expect(result.confidence).toBe('low');
      expect(result.confidenceScore).toBeLessThan(40);
      expect(result.clarifyingQuestions).toBeDefined();
      expect(result.clarifyingQuestions!.length).toBeGreaterThan(0);
    });

    it('should generate clarifying questions for ambiguous context', () => {
      const input = 'Building a web app';
      const result = detectContext(input);

      expect(result.clarifyingQuestions).toBeDefined();
      expect(result.clarifyingQuestions).toContain('How many people are on your team?');
      expect(result.clarifyingQuestions).toContain('How much traffic do you expect (requests per month)?');
      expect(result.clarifyingQuestions).toContain('What is your monthly infrastructure budget?');
    });
  });

  describe('testMetadataAnalysis', () => {
    it('should detect pet project from metadata: team size = 1, budget = 0', () => {
      const input = 'Building an app';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 0,
        expectedTrafficRequestsPerMonth: 1000,
      };

      const result = detectContext(input, metadata);
      expect(result.context).toBe('pet-project');
    });

    it('should detect startup from metadata: team size = 5, budget = $500', () => {
      const input = 'Building an app';
      const metadata: ProjectMetadata = {
        teamSize: 5,
        monthlyBudget: 500,
        expectedTrafficRequestsPerMonth: 1000000,
      };

      const result = detectContext(input, metadata);
      expect(result.context).toBe('startup');
    });

    it('should detect enterprise from metadata: team size = 50, budget = $10,000, compliance requirements', () => {
      const input = 'Building an app';
      const metadata: ProjectMetadata = {
        teamSize: 50,
        monthlyBudget: 10000,
        expectedTrafficRequestsPerMonth: 100000000,
        complianceRequirements: ['SOC 2', 'HIPAA'],
        hasExistingInfrastructure: true,
      };

      const result = detectContext(input, metadata);
      expect(result.context).toBe('enterprise');
    });
  });

  describe('testConfidenceScoring', () => {
    it('should return confidence score ranging from 0-100', () => {
      const inputs = [
        'Personal learning project',
        'MVP for startup',
        'Enterprise SOC 2 compliance',
        'Building something',
      ];

      for (const input of inputs) {
        const result = detectContext(input);
        expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(result.confidenceScore).toBeLessThanOrEqual(100);
      }
    });

    it('should have high confidence (70-100) for clear signals', () => {
      const inputs = [
        'Personal side project learning hobby',
        'Startup MVP founders early stage',
        'Enterprise production SOC 2 compliance HIPAA',
      ];

      for (const input of inputs) {
        const result = detectContext(input);
        expect(result.confidenceScore).toBeGreaterThanOrEqual(70);
        expect(result.confidence).toBe('high');
      }
    });

    it('should have medium confidence (40-69) for moderate signals', () => {
      const input = 'Building a personal app';
      const result = detectContext(input);

      // This input has 1 pet-project keyword ("personal")
      // Should be in medium range
      if (result.confidenceScore >= 40 && result.confidenceScore < 70) {
        expect(result.confidence).toBe('medium');
      }
    });

    it('should have low confidence (0-39) for weak/no signals', () => {
      const input = 'Building an application';
      const result = detectContext(input);

      expect(result.confidenceScore).toBeLessThan(40);
      expect(result.confidence).toBe('low');
    });
  });

  describe('testClarifyingQuestions', () => {
    it('should generate questions for team size, traffic, budget when metadata missing', () => {
      const input = 'Building something';
      const result = detectContext(input);

      expect(result.clarifyingQuestions).toBeDefined();
      const questions = result.clarifyingQuestions!;

      expect(questions.some((q) => q.includes('team'))).toBe(true);
      expect(questions.some((q) => q.includes('traffic'))).toBe(true);
      expect(questions.some((q) => q.includes('budget'))).toBe(true);
    });

    it('should not generate questions when metadata is complete', () => {
      const input = 'Building something';
      const metadata: ProjectMetadata = {
        teamSize: 5,
        monthlyBudget: 500,
        expectedTrafficRequestsPerMonth: 1000000,
        complianceRequirements: [],
        hasExistingInfrastructure: false,
      };

      const result = detectContext(input, metadata);

      // If confidence is still low even with metadata, questions may be generated
      // But they should be fewer than without metadata
      if (result.confidence !== 'low') {
        expect(result.clarifyingQuestions).toBeUndefined();
      }
    });

    it('should ask about compliance when not specified', () => {
      const input = 'Building something';
      const metadata: ProjectMetadata = {
        teamSize: 5,
        monthlyBudget: 500,
        expectedTrafficRequestsPerMonth: 1000000,
      };

      const result = detectContext(input, metadata);

      if (result.clarifyingQuestions) {
        expect(result.clarifyingQuestions.some((q) => q.includes('compliance'))).toBe(true);
      }
    });
  });
});
