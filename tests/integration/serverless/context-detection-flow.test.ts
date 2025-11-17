/**
 * Context Detection Flow Integration Tests
 *
 * Tests for full context detection workflow with refinement.
 */

import { describe, it, expect } from 'vitest';
import { detectContext } from '../../../src/core/serverless/context-detector.js';
import type { ProjectMetadata } from '../../../src/core/serverless/types.js';

describe('Context Detection Flow Integration', () => {
  describe('testFullContextDetectionFlow', () => {
    it('should execute complete flow: user input → classification → confidence → questions', () => {
      // Step 1: Initial detection with minimal input
      const initialInput = 'I want to build a web application';
      const initialResult = detectContext(initialInput);

      // Verify basic detection works
      expect(initialResult.context).toMatch(/pet-project|startup|enterprise/);
      expect(initialResult.confidence).toMatch(/low|medium|high/);
      expect(initialResult.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(initialResult.confidenceScore).toBeLessThanOrEqual(100);

      // Step 2: If confidence is low, clarifying questions should be generated
      if (initialResult.confidence === 'low') {
        expect(initialResult.clarifyingQuestions).toBeDefined();
        expect(initialResult.clarifyingQuestions!.length).toBeGreaterThan(0);
      }

      // Step 3: Verify signals are captured
      expect(Array.isArray(initialResult.signals)).toBe(true);
    });

    it('should detect pet project workflow end-to-end', () => {
      const input = 'Personal side project for learning serverless development, hobby project for portfolio';
      const metadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 0,
        expectedTrafficRequestsPerMonth: 5000,
      };

      const result = detectContext(input, metadata);

      expect(result.context).toBe('pet-project');
      expect(result.confidence).toMatch(/medium|high/);
      expect(result.signals.length).toBeGreaterThan(0);
      expect(result.signals).toContain('personal');
      expect(result.signals).toContain('learning');
    });

    it('should detect startup workflow end-to-end', () => {
      const input = 'Building MVP for early stage startup, founders seeking product-market fit';
      const metadata: ProjectMetadata = {
        teamSize: 8,
        monthlyBudget: 800,
        expectedTrafficRequestsPerMonth: 2000000,
      };

      const result = detectContext(input, metadata);

      expect(result.context).toBe('startup');
      expect(result.confidence).toMatch(/medium|high/);
      expect(result.signals.length).toBeGreaterThan(0);
      expect(result.signals).toContain('mvp');
      expect(result.signals).toContain('startup');
    });

    it('should detect enterprise workflow end-to-end', () => {
      const input = 'Production enterprise application requiring SOC 2 compliance and HIPAA certification';
      const metadata: ProjectMetadata = {
        teamSize: 120,
        monthlyBudget: 25000,
        expectedTrafficRequestsPerMonth: 150000000,
        complianceRequirements: ['SOC 2', 'HIPAA'],
        hasExistingInfrastructure: true,
      };

      const result = detectContext(input, metadata);

      expect(result.context).toBe('enterprise');
      expect(result.confidence).toBe('high');
      expect(result.signals.length).toBeGreaterThan(0);
      expect(result.signals).toContain('production');
      expect(result.signals).toContain('enterprise');
    });
  });

  describe('testContextRefinement', () => {
    it('should refine classification when metadata is added to ambiguous input', () => {
      const ambiguousInput = 'Building a web app';

      // Step 1: Initial detection without metadata (should be low confidence)
      const initialResult = detectContext(ambiguousInput);
      expect(initialResult.confidence).toBe('low');

      // Step 2: Refine with pet project metadata
      const petProjectMetadata: ProjectMetadata = {
        teamSize: 1,
        monthlyBudget: 0,
        expectedTrafficRequestsPerMonth: 500,
      };
      const refinedResult = detectContext(ambiguousInput, petProjectMetadata);

      expect(refinedResult.context).toBe('pet-project');
      expect(refinedResult.confidenceScore).toBeGreaterThan(initialResult.confidenceScore);
    });

    it('should improve confidence when adding metadata', () => {
      const input = 'Need to deploy an application';

      // Without metadata
      const withoutMetadata = detectContext(input);

      // With metadata
      const metadata: ProjectMetadata = {
        teamSize: 10,
        monthlyBudget: 1000,
        expectedTrafficRequestsPerMonth: 5000000,
      };
      const withMetadata = detectContext(input, metadata);

      // Confidence should improve with metadata
      expect(withMetadata.confidenceScore).toBeGreaterThanOrEqual(withoutMetadata.confidenceScore);
    });

    it('should override keyword-based detection when metadata is strong', () => {
      // Input suggests pet project
      const input = 'Personal learning project';

      // But metadata suggests enterprise
      const enterpriseMetadata: ProjectMetadata = {
        teamSize: 200,
        monthlyBudget: 50000,
        expectedTrafficRequestsPerMonth: 500000000,
        complianceRequirements: ['SOC 2', 'HIPAA', 'GDPR'],
        hasExistingInfrastructure: true,
      };

      const result = detectContext(input, enterpriseMetadata);

      // Enterprise metadata should override weak pet project keyword
      expect(result.context).toBe('enterprise');
    });
  });
});
