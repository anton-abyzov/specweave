/**
 * Suitability Analysis Flow Integration Tests
 *
 * Tests for full suitability analysis workflow.
 */

import { describe, it, expect } from 'vitest';
import { analyzeSuitability } from '../../src/core/serverless/suitability-analyzer.js';

describe('Suitability Analysis Flow Integration', () => {
  describe('testFullSuitabilityAnalysisFlow', () => {
    it('should execute complete flow: requirements → analysis → recommendation + rationale', () => {
      // Scenario 1: Event-driven workload (should recommend serverless)
      const eventDrivenReq = {
        description: 'Process webhooks from Stripe payment events and send email notifications via SNS',
        trafficPattern: 'variable' as const,
        expectedExecutionTime: 5,
        memoryRequirements: 0.5,
      };

      const eventDrivenResult = analyzeSuitability(eventDrivenReq);

      expect(eventDrivenResult.recommendation).toBe('yes');
      expect(eventDrivenResult.workloadType).toBe('event-driven');
      expect(eventDrivenResult.rationale.cost).toBeDefined();
      expect(eventDrivenResult.rationale.scalability).toBeDefined();
      expect(eventDrivenResult.rationale.complexity).toBeDefined();
      expect(eventDrivenResult.warnings.length).toBe(0);

      // Scenario 2: Stateful workload (should NOT recommend serverless)
      const statefulReq = {
        description: 'Real-time collaborative editing using WebSocket connections with session state',
        isStateful: true,
        hasWebSockets: true,
        requiresContinuousConnection: true,
      };

      const statefulResult = analyzeSuitability(statefulReq);

      expect(statefulResult.recommendation).toBe('no');
      expect(statefulResult.workloadType).toBe('stateful');
      expect(statefulResult.warnings.length).toBeGreaterThan(0);
      expect(statefulResult.warnings.some((w) => w.includes('Stateful'))).toBe(true);
      expect(statefulResult.warnings.some((w) => w.includes('containers'))).toBe(true);

      // Scenario 3: API workload with consistent traffic (conditional recommendation)
      const consistentApiReq = {
        description: 'REST API for high-traffic e-commerce site with consistent load',
        trafficPattern: 'consistent' as const,
        expectedExecutionTime: 2,
        memoryRequirements: 1,
      };

      const consistentApiResult = analyzeSuitability(consistentApiReq);

      expect(consistentApiResult.recommendation).toBe('conditional');
      expect(consistentApiResult.workloadType).toBe('api-driven');
      expect(consistentApiResult.rationale.cost).toContain('containers or VMs');

      // Scenario 4: Long-running process (should NOT recommend serverless)
      const longRunningReq = {
        description: 'Video transcoding service processing 4K videos for hours',
        expectedExecutionTime: 3600, // 1 hour
        memoryRequirements: 8,
      };

      const longRunningResult = analyzeSuitability(longRunningReq);

      expect(longRunningResult.recommendation).toBe('no');
      expect(longRunningResult.warnings.some((w) => w.includes('Long-running'))).toBe(true);

      // Scenario 5: Batch processing with variable schedule (should recommend serverless)
      const batchReq = {
        description: 'Nightly ETL jobs and daily report generation with cron schedule',
        trafficPattern: 'variable' as const,
        expectedExecutionTime: 600, // 10 minutes
        memoryRequirements: 2,
      };

      const batchResult = analyzeSuitability(batchReq);

      expect(batchResult.recommendation).toBe('yes');
      expect(batchResult.workloadType).toBe('batch');
      expect(batchResult.rationale.cost).toContain('cost-effective');
    });
  });
});
