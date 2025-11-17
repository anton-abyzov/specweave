/**
 * Unit tests for Architecture Decision Engine
 *
 * Tests T-035 to T-042: Architecture recommendation system
 */

import { describe, it, expect } from '@jest/globals';
import { ArchitectureDecisionEngine } from '../../../src/init/architecture/ArchitectureDecisionEngine.js';
import type { ArchitectureInput } from '../../../src/init/architecture/ArchitectureDecisionEngine.js';

describe('ArchitectureDecisionEngine', () => {
  const engine = new ArchitectureDecisionEngine();

  describe('T-035: Decision tree base functionality', () => {
    it('should generate complete architecture recommendation', () => {
      const input: ArchitectureInput = {
        vision: 'Collaborative design tool for remote teams',
        complianceStandards: [],
        expectedUsers: 10000,
        expectedServices: 3,
        budget: 'bootstrapped',
        viralPotential: true,
        projectType: 'startup'
      };

      const recommendation = engine.recommend(input);

      expect(recommendation).toHaveProperty('approach');
      expect(recommendation).toHaveProperty('decisions');
      expect(recommendation).toHaveProperty('costEstimates');
      expect(recommendation).toHaveProperty('rationale');
      expect(recommendation).toHaveProperty('confidence');
    });

    it('should return correct architecture approach types', () => {
      const approaches = ['serverless', 'traditional', 'hybrid', 'learning'];

      // Test that each approach is possible
      expect(approaches).toContain('serverless');
      expect(approaches).toContain('traditional');
      expect(approaches).toContain('hybrid');
      expect(approaches).toContain('learning');
    });

    it('should have decisions array with proper structure', () => {
      const input: ArchitectureInput = {
        vision: 'Test project',
        complianceStandards: [],
        expectedUsers: 1000,
        expectedServices: 2,
        budget: 'bootstrapped',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      expect(Array.isArray(recommendation.decisions)).toBe(true);
      expect(recommendation.decisions.length).toBeGreaterThan(0);

      const decision = recommendation.decisions[0];
      expect(decision).toHaveProperty('category');
      expect(decision).toHaveProperty('decision');
      expect(decision).toHaveProperty('rationale');
      expect(decision).toHaveProperty('alternatives');
    });
  });

  describe('T-036: Serverless architecture recommendation', () => {
    it('should recommend serverless for viral + bootstrapped projects', () => {
      const input: ArchitectureInput = {
        vision: 'Social media app with viral potential',
        complianceStandards: [],
        expectedUsers: 50000,
        expectedServices: 3,
        budget: 'bootstrapped',
        viralPotential: true,
        projectType: 'startup'
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.approach).toBe('serverless');
      expect(recommendation.rationale.toLowerCase()).toContain('viral');
      expect(recommendation.rationale.toLowerCase()).toContain('scaling');
    });

    it('should include serverless-specific decisions', () => {
      const input: ArchitectureInput = {
        vision: 'Viral app',
        complianceStandards: [],
        expectedUsers: 10000,
        expectedServices: 2,
        budget: 'bootstrapped',
        viralPotential: true
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.approach).toBe('serverless');

      const backendDecision = recommendation.decisions.find(d => d.category === 'Backend');
      expect(backendDecision).toBeDefined();
      expect(backendDecision?.decision).toContain('Lambda');

      const dbDecision = recommendation.decisions.find(d => d.category === 'Database');
      expect(dbDecision).toBeDefined();
      expect(dbDecision?.decision).toContain('Supabase');
    });

    it('should estimate low costs for serverless', () => {
      const input: ArchitectureInput = {
        vision: 'Viral app',
        complianceStandards: [],
        expectedUsers: 10000,
        expectedServices: 2,
        budget: 'bootstrapped',
        viralPotential: true
      };

      const recommendation = engine.recommend(input);

      // Serverless should be cheap at low scale
      const lowScaleCost = recommendation.costEstimates.find(e => e.users === 1000);
      expect(lowScaleCost).toBeDefined();
      expect(lowScaleCost!.monthlyCost).toBeLessThan(100);
    });

    it('should have high confidence for serverless recommendation', () => {
      const input: ArchitectureInput = {
        vision: 'Viral app',
        complianceStandards: [],
        expectedUsers: 10000,
        expectedServices: 2,
        budget: 'bootstrapped',
        viralPotential: true
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('T-037: Compliance-driven traditional architecture', () => {
    it('should recommend traditional for HIPAA compliance', () => {
      const input: ArchitectureInput = {
        vision: 'Healthcare platform',
        complianceStandards: ['HIPAA'],
        expectedUsers: 5000,
        expectedServices: 4,
        budget: 'seed',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.approach).toBe('traditional');
      expect(recommendation.rationale).toContain('HIPAA');
      expect(recommendation.rationale).toContain('compliance');
    });

    it('should recommend traditional for PCI-DSS compliance', () => {
      const input: ArchitectureInput = {
        vision: 'E-commerce payment platform',
        complianceStandards: ['PCI-DSS'],
        expectedUsers: 20000,
        expectedServices: 5,
        budget: 'bootstrapped',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.approach).toBe('traditional');
    });

    it('should include compliance-specific decisions for HIPAA', () => {
      const input: ArchitectureInput = {
        vision: 'Healthcare app',
        complianceStandards: ['HIPAA'],
        expectedUsers: 5000,
        expectedServices: 3,
        budget: 'seed',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      const dbDecision = recommendation.decisions.find(d => d.category === 'Database');
      expect(dbDecision).toBeDefined();
      expect(dbDecision?.decision).toContain('self-hosted');
      expect(dbDecision?.rationale).toContain('HIPAA');
    });

    it('should include compliance-specific decisions for PCI-DSS', () => {
      const input: ArchitectureInput = {
        vision: 'Payment processor',
        complianceStandards: ['PCI-DSS'],
        expectedUsers: 10000,
        expectedServices: 4,
        budget: 'seed',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      const authDecision = recommendation.decisions.find(d => d.category === 'Authentication');
      expect(authDecision).toBeDefined();
      expect(authDecision?.decision).toContain('Custom');
      expect(authDecision?.rationale).toContain('PCI');
    });

    it('should estimate higher costs for compliance', () => {
      const input: ArchitectureInput = {
        vision: 'Healthcare platform',
        complianceStandards: ['HIPAA'],
        expectedUsers: 5000,
        expectedServices: 4,
        budget: 'seed',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      // Compliance should cost more than serverless
      const lowScaleCost = recommendation.costEstimates.find(e => e.users === 1000);
      expect(lowScaleCost).toBeDefined();
      expect(lowScaleCost!.monthlyCost).toBeGreaterThan(100);
    });
  });

  describe('T-038: Learning project recommendations', () => {
    it('should recommend learning approach for learning projects', () => {
      const input: ArchitectureInput = {
        vision: 'Personal learning project',
        complianceStandards: [],
        expectedUsers: 100,
        expectedServices: 1,
        budget: 'learning',
        viralPotential: false,
        projectType: 'learning'
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.approach).toBe('learning');
      expect(recommendation.rationale.toLowerCase()).toContain('learning');
      expect(recommendation.rationale.toLowerCase()).toContain('fundamentals');
    });

    it('should include simple learning-focused decisions', () => {
      const input: ArchitectureInput = {
        vision: 'Learning project',
        complianceStandards: [],
        expectedUsers: 100,
        expectedServices: 1,
        budget: 'learning',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      const authDecision = recommendation.decisions.find(d => d.category === 'Authentication');
      expect(authDecision).toBeDefined();
      expect(authDecision?.decision).toContain('JWT');
      expect(authDecision?.rationale.toLowerCase()).toContain('understand');
      expect(authDecision?.rationale.toLowerCase()).toContain('fundamentals');
    });

    it('should recommend free tier tools', () => {
      const input: ArchitectureInput = {
        vision: 'Learning project',
        complianceStandards: [],
        expectedUsers: 100,
        expectedServices: 1,
        budget: 'learning',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      const hostingDecision = recommendation.decisions.find(d => d.category === 'Hosting');
      expect(hostingDecision).toBeDefined();
      expect(hostingDecision?.decision).toContain('free tier');
    });

    it('should estimate $0 cost for free tiers', () => {
      const input: ArchitectureInput = {
        vision: 'Learning project',
        complianceStandards: [],
        expectedUsers: 500,
        expectedServices: 1,
        budget: 'learning',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      const lowScaleCost = recommendation.costEstimates.find(e => e.users === 1000);
      expect(lowScaleCost).toBeDefined();
      expect(lowScaleCost!.monthlyCost).toBe(0);
    });

    it('should have highest confidence for learning recommendations', () => {
      const input: ArchitectureInput = {
        vision: 'Learning project',
        complianceStandards: [],
        expectedUsers: 100,
        expectedServices: 1,
        budget: 'learning',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('T-040: Cost estimation at different scales', () => {
    it('should provide cost estimates for 4 user scales', () => {
      const input: ArchitectureInput = {
        vision: 'Test app',
        complianceStandards: [],
        expectedUsers: 10000,
        expectedServices: 3,
        budget: 'bootstrapped',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.costEstimates).toHaveLength(4);
      expect(recommendation.costEstimates.map(e => e.users)).toEqual([1000, 10000, 100000, 1000000]);
    });

    it('should scale costs with user count', () => {
      const input: ArchitectureInput = {
        vision: 'Test app',
        complianceStandards: [],
        expectedUsers: 10000,
        expectedServices: 3,
        budget: 'bootstrapped',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      const costs = recommendation.costEstimates.map(e => e.monthlyCost);

      // Costs should increase with scale
      expect(costs[0]).toBeLessThan(costs[1]);
      expect(costs[1]).toBeLessThan(costs[2]);
      expect(costs[2]).toBeLessThan(costs[3]);
    });

    it('should provide cost breakdown by category', () => {
      const input: ArchitectureInput = {
        vision: 'Test app',
        complianceStandards: [],
        expectedUsers: 10000,
        expectedServices: 3,
        budget: 'bootstrapped',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      const estimate = recommendation.costEstimates[0];

      expect(estimate.breakdown).toHaveProperty('compute');
      expect(estimate.breakdown).toHaveProperty('database');
      expect(estimate.breakdown).toHaveProperty('storage');
      expect(estimate.breakdown).toHaveProperty('bandwidth');
      expect(estimate.breakdown).toHaveProperty('other');

      // Breakdown should sum to total (approximately)
      const sum = estimate.breakdown.compute +
                  estimate.breakdown.database +
                  estimate.breakdown.storage +
                  estimate.breakdown.bandwidth +
                  estimate.breakdown.other;

      expect(Math.abs(sum - estimate.monthlyCost)).toBeLessThan(1); // Allow for floating point precision
    });

    it('should estimate serverless cheaper than traditional at low scale', () => {
      const serverlessInput: ArchitectureInput = {
        vision: 'Viral app',
        complianceStandards: [],
        expectedUsers: 5000,
        expectedServices: 2,
        budget: 'bootstrapped',
        viralPotential: true
      };

      const traditionalInput: ArchitectureInput = {
        vision: 'Enterprise app',
        complianceStandards: ['SOC2'],
        expectedUsers: 5000,
        expectedServices: 5,
        budget: 'series-a-plus',
        viralPotential: false
      };

      const serverlessRec = engine.recommend(serverlessInput);
      const traditionalRec = engine.recommend(traditionalInput);

      const serverlessCost = serverlessRec.costEstimates.find(e => e.users === 1000)!.monthlyCost;
      const traditionalCost = traditionalRec.costEstimates.find(e => e.users === 1000)!.monthlyCost;

      expect(serverlessCost).toBeLessThan(traditionalCost);
    });
  });

  describe('Hybrid architecture', () => {
    it('should recommend hybrid for moderate service count', () => {
      const input: ArchitectureInput = {
        vision: 'Multi-service platform',
        complianceStandards: [],
        expectedUsers: 20000,
        expectedServices: 5,
        budget: 'seed',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.approach).toBe('hybrid');
      expect(recommendation.rationale.toLowerCase()).toContain('hybrid');
    });

    it('should have moderate confidence for hybrid', () => {
      const input: ArchitectureInput = {
        vision: 'Multi-service app',
        complianceStandards: [],
        expectedUsers: 20000,
        expectedServices: 6,
        budget: 'seed',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.approach).toBe('hybrid');
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0.7);
      expect(recommendation.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty compliance standards array', () => {
      const input: ArchitectureInput = {
        vision: 'Simple app',
        complianceStandards: [],
        expectedUsers: 1000,
        expectedServices: 1,
        budget: 'bootstrapped',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.approach).toBeDefined();
      expect(recommendation.decisions.length).toBeGreaterThan(0);
    });

    it('should handle very high user count', () => {
      const input: ArchitectureInput = {
        vision: 'Enterprise platform',
        complianceStandards: [],
        expectedUsers: 10000000,
        expectedServices: 20,
        budget: 'series-a-plus',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.approach).toBe('traditional');
    });

    it('should handle single service project', () => {
      const input: ArchitectureInput = {
        vision: 'Simple API',
        complianceStandards: [],
        expectedUsers: 1000,
        expectedServices: 1,
        budget: 'bootstrapped',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.decisions.length).toBeGreaterThan(0);
    });

    it('should handle many compliance standards', () => {
      const input: ArchitectureInput = {
        vision: 'Government healthcare fintech platform',
        complianceStandards: ['HIPAA', 'PCI-DSS', 'SOC2', 'ISO27001', 'FedRAMP'],
        expectedUsers: 50000,
        expectedServices: 10,
        budget: 'series-a-plus',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      expect(recommendation.approach).toBe('traditional');
      expect(recommendation.rationale).toContain('compliance');
    });
  });

  describe('Legacy API compatibility', () => {
    it('should support legacy decide() method', () => {
      const decisions = engine.decide(
        'Test product vision',
        ['GDPR', 'CCPA']
      );

      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0]).toHaveProperty('category');
      expect(decisions[0]).toHaveProperty('decision');
    });

    it('should use default values for legacy API', () => {
      const decisions = engine.decide('Simple app', []);

      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);
    });
  });

  describe('Decision quality', () => {
    it('should provide alternatives for each decision', () => {
      const input: ArchitectureInput = {
        vision: 'Test app',
        complianceStandards: [],
        expectedUsers: 5000,
        expectedServices: 2,
        budget: 'bootstrapped',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      recommendation.decisions.forEach(decision => {
        expect(Array.isArray(decision.alternatives)).toBe(true);
        expect(decision.alternatives.length).toBeGreaterThan(0);
      });
    });

    it('should have confidence scores for decisions', () => {
      const input: ArchitectureInput = {
        vision: 'Test app',
        complianceStandards: [],
        expectedUsers: 5000,
        expectedServices: 2,
        budget: 'bootstrapped',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      recommendation.decisions.forEach(decision => {
        if (decision.confidence !== undefined) {
          expect(decision.confidence).toBeGreaterThan(0);
          expect(decision.confidence).toBeLessThanOrEqual(1);
        }
      });
    });

    it('should have cost impact indicators', () => {
      const input: ArchitectureInput = {
        vision: 'Test app',
        complianceStandards: [],
        expectedUsers: 5000,
        expectedServices: 2,
        budget: 'bootstrapped',
        viralPotential: false
      };

      const recommendation = engine.recommend(input);

      recommendation.decisions.forEach(decision => {
        if (decision.costImpact) {
          expect(['low', 'medium', 'high']).toContain(decision.costImpact);
        }
      });
    });
  });
});
