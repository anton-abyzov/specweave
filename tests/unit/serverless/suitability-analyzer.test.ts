import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Serverless Suitability Analyzer Unit Tests
 *
 * Tests for workload suitability analysis.
 */

import { describe, it, expect } from 'vitest';
import { analyzeSuitability } from '../../../src/core/serverless/suitability-analyzer.js.js';

describe('Serverless Suitability Analyzer', () => {
  describe('testEventDrivenWorkload', () => {
    it('should recommend serverless for webhooks and file processing', () => {
      const requirements = {
        description: 'Processing webhooks from external services and triggering image processing',
        trafficPattern: 'variable' as const,
      };

      const result = analyzeSuitability(requirements);

      expect(result.recommendation).toBe('yes');
      expect(result.workloadType).toBe('event-driven');
      expect(result.rationale.cost).toContain('cost-effective');
      expect(result.warnings.length).toBe(0);
    });

    it('should recommend serverless for event-driven workloads (SNS, SQS, EventBridge)', () => {
      const requirements = {
        description: 'Process messages from SQS queue and publish events to SNS topics',
        trafficPattern: 'spiky' as const,
      };

      const result = analyzeSuitability(requirements);

      expect(result.recommendation).toBe('yes');
      expect(result.workloadType).toBe('event-driven');
      expect(result.rationale.scalability.toLowerCase()).toContain('automatic');
    });
  });

  describe('testApiDrivenWorkload', () => {
    it('should recommend serverless for REST APIs and GraphQL endpoints', () => {
      const requirements = {
        description: 'Building a REST API backend for mobile app with CRUD operations',
        trafficPattern: 'variable' as const,
      };

      const result = analyzeSuitability(requirements);

      expect(result.recommendation).toBe('yes');
      expect(result.workloadType).toBe('api-driven');
      expect(result.rationale.complexity).toContain('Managed infrastructure');
    });

    it('should recommend conditional for APIs with consistent high traffic', () => {
      const requirements = {
        description: 'GraphQL API for high-traffic e-commerce platform',
        trafficPattern: 'consistent' as const,
      };

      const result = analyzeSuitability(requirements);

      expect(result.recommendation).toBe('conditional');
      expect(result.rationale.cost).toContain('containers or VMs may be more cost-effective');
    });
  });

  describe('testVariableLoadWorkload', () => {
    it('should recommend serverless for traffic spikes', () => {
      const requirements = {
        description: 'API handles occasional traffic spikes during promotional campaigns',
        trafficPattern: 'spiky' as const,
      };

      const result = analyzeSuitability(requirements);

      expect(result.recommendation).toBe('yes');
      expect(result.rationale.scalability).toContain('traffic spikes');
    });
  });

  describe('testStatefulApp', () => {
    it('should NOT recommend serverless for WebSocket applications', () => {
      const requirements = {
        description: 'Real-time chat application using WebSocket connections',
        isStateful: true,
        hasWebSockets: true,
        requiresContinuousConnection: true,
      };

      const result = analyzeSuitability(requirements);

      expect(result.recommendation).toBe('no');
      expect(result.workloadType).toBe('stateful');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('Stateful'))).toBe(true);
    });

    it('should warn against serverless for persistent connections', () => {
      const requirements = {
        description: 'WebSocket server for real-time collaboration',
        requiresContinuousConnection: true,
      };

      const result = analyzeSuitability(requirements);

      expect(result.recommendation).toBe('no');
      expect(result.warnings.some((w) => w.includes('Continuous connections'))).toBe(true);
    });
  });

  describe('testLongRunningProcess', () => {
    it('should NOT recommend serverless for video encoding (> 15 minutes)', () => {
      const requirements = {
        description: 'Video encoding pipeline for 4K videos',
        expectedExecutionTime: 1800, // 30 minutes
      };

      const result = analyzeSuitability(requirements);

      expect(result.recommendation).toBe('no');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('Long-running processes'))).toBe(true);
    });

    it('should warn about execution limits for long processes', () => {
      const requirements = {
        description: 'Processing large files that takes hours',
      };

      const result = analyzeSuitability(requirements);

      expect(result.recommendation).toBe('no');
      expect(result.warnings.some((w) => w.includes('execution limits'))).toBe(true);
    });
  });

  describe('testHighMemoryApp', () => {
    it('should NOT recommend serverless for data processing > 10GB RAM', () => {
      const requirements = {
        description: 'In-memory data processing for large datasets',
        memoryRequirements: 15, // 15 GB
      };

      const result = analyzeSuitability(requirements);

      expect(result.recommendation).toBe('no');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('High memory'))).toBe(true);
    });

    it('should recommend serverless for moderate memory requirements (< 10GB)', () => {
      const requirements = {
        description: 'API with moderate memory needs for data processing',
        memoryRequirements: 2, // 2 GB
        trafficPattern: 'variable' as const,
      };

      const result = analyzeSuitability(requirements);

      expect(result.recommendation).toBe('yes');
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('testRationaleGeneration', () => {
    it('should provide cost, scalability, and complexity rationale for each recommendation', () => {
      const requirements = {
        description: 'REST API with variable traffic',
        trafficPattern: 'variable' as const,
      };

      const result = analyzeSuitability(requirements);

      expect(result.rationale.cost).toBeDefined();
      expect(result.rationale.cost.length).toBeGreaterThan(0);

      expect(result.rationale.scalability).toBeDefined();
      expect(result.rationale.scalability.length).toBeGreaterThan(0);

      expect(result.rationale.complexity).toBeDefined();
      expect(result.rationale.complexity.length).toBeGreaterThan(0);
    });

    it('should provide different rationales for yes/conditional/no recommendations', () => {
      const yesCase = {
        description: 'Event-driven image processing',
        trafficPattern: 'variable' as const,
      };
      const conditionalCase = {
        description: 'API with consistent traffic',
        trafficPattern: 'consistent' as const,
      };
      const noCase = {
        description: 'WebSocket real-time chat',
        isStateful: true,
      };

      const yesResult = analyzeSuitability(yesCase);
      const conditionalResult = analyzeSuitability(conditionalCase);
      const noResult = analyzeSuitability(noCase);

      expect(yesResult.rationale.cost).not.toBe(conditionalResult.rationale.cost);
      expect(yesResult.rationale.cost).not.toBe(noResult.rationale.cost);
      expect(conditionalResult.rationale.cost).not.toBe(noResult.rationale.cost);
    });
  });

  describe('testAntiPatternWarnings', () => {
    it('should warn about stateful, long-running, and high-memory anti-patterns', () => {
      const statefulReq = {
        description: 'WebSocket server',
        isStateful: true,
      };
      const longRunningReq = {
        description: 'Video encoding',
        expectedExecutionTime: 2000,
      };
      const highMemoryReq = {
        description: 'Data processing',
        memoryRequirements: 20,
      };

      const statefulResult = analyzeSuitability(statefulReq);
      const longRunningResult = analyzeSuitability(longRunningReq);
      const highMemoryResult = analyzeSuitability(highMemoryReq);

      expect(statefulResult.warnings.some((w) => w.includes('Stateful'))).toBe(true);
      expect(longRunningResult.warnings.some((w) => w.includes('Long-running'))).toBe(true);
      expect(highMemoryResult.warnings.some((w) => w.includes('High memory'))).toBe(true);
    });

    it('should provide actionable warnings (suggest alternatives)', () => {
      const requirements = {
        description: 'Real-time chat application',
        isStateful: true,
      };

      const result = analyzeSuitability(requirements);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('containers'))).toBe(true);
    });
  });
});
