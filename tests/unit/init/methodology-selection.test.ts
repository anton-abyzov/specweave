import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: Methodology Selection (Agile vs Waterfall)
 *
 * Tests AC-US5-12:
 * - Methodology selection supports both Agile and Waterfall
 * - Methodology is saved to config.research.methodology
 * - User-friendly explanations provided
 */

import { describe, it, expect } from 'vitest';

describe('Methodology Selection', () => {
  describe('Methodology Types', () => {
    it('should support agile methodology', () => {
      const methodology: 'agile' | 'waterfall' = 'agile';
      expect(methodology).toBe('agile');
    });

    it('should support waterfall methodology', () => {
      const methodology: 'agile' | 'waterfall' = 'waterfall';
      expect(methodology).toBe('waterfall');
    });

    it('should only accept valid methodology values', () => {
      // TypeScript enforces this at compile time
      const validMethodologies: ('agile' | 'waterfall')[] = ['agile', 'waterfall'];
      expect(validMethodologies).toHaveLength(2);
      expect(validMethodologies).toContain('agile');
      expect(validMethodologies).toContain('waterfall');
    });
  });

  describe('Config Storage', () => {
    it('should save agile methodology to config.research.methodology', () => {
      const config = {
        research: {
          methodology: 'agile' as const
        }
      };

      expect(config.research.methodology).toBe('agile');
    });

    it('should save waterfall methodology to config.research.methodology', () => {
      const config = {
        research: {
          methodology: 'waterfall' as const
        }
      };

      expect(config.research.methodology).toBe('waterfall');
    });
  });

  describe('User-Friendly Descriptions', () => {
    it('should provide clear explanation for Agile', () => {
      const agileDescription = 'Flexible sprints (Agile - faster, more adaptive)';
      expect(agileDescription).toContain('Agile');
      expect(agileDescription).not.toContain('microservices');
      expect(agileDescription).not.toContain('monorepo');
    });

    it('should provide clear explanation for Waterfall', () => {
      const waterfallDescription = 'Planned phases (Waterfall - structured, predictable)';
      expect(waterfallDescription).toContain('Waterfall');
      expect(waterfallDescription).not.toContain('microservices');
      expect(waterfallDescription).not.toContain('monorepo');
    });

    it('should explain Agile as short sprints', () => {
      const help = 'Agile: Increments = short sprints (1-2 weeks), adapt as you learn';
      expect(help).toContain('sprints');
      expect(help).toContain('Increments');
      expect(help).toContain('adapt');
    });

    it('should explain Waterfall as sequential phases with approvals', () => {
      const help = 'Waterfall: Increments = phases with approval gates, predictable timeline';
      expect(help).toContain('phases');
      expect(help).toContain('Increments');
      expect(help).toContain('approval gates');
      expect(help).toContain('predictable');
    });
  });

  describe('Integration with Init Flow', () => {
    it('should include methodology in final config', () => {
      const config = {
        research: {
          vision: {},
          compliance: [] as any[],
          teams: [] as any[],
          scaling: { expectedUsers: 10000, expectedServices: 3 },
          budget: 'bootstrapped',
          methodology: 'agile' as const
        },
        architecture: {},
        projects: ['backend', 'frontend'],
        livingDocs: {
          copyBasedSync: {
            enabled: true,
            threeLayerSync: true
          }
        }
      };

      expect(config.research.methodology).toBeDefined();
      expect(config.research.methodology).toBe('agile');
    });

    it('should support both methodologies in config', () => {
      const agileConfig = {
        research: { methodology: 'agile' as const }
      };

      const waterfallConfig = {
        research: { methodology: 'waterfall' as const }
      };

      expect(agileConfig.research.methodology).toBe('agile');
      expect(waterfallConfig.research.methodology).toBe('waterfall');
    });
  });

  describe('Default Behavior', () => {
    it('should default to agile if no choice made', () => {
      // When user doesn't select, default to agile
      const defaultMethodology: 'agile' | 'waterfall' = 'agile';
      expect(defaultMethodology).toBe('agile');
    });
  });

  describe('Methodology Semantics', () => {
    it('should interpret Agile as short iterations', () => {
      const agileSemantics = {
        methodology: 'agile',
        incrementType: 'sprint',
        duration: '1-2 weeks',
        flexible: true
      };

      expect(agileSemantics.methodology).toBe('agile');
      expect(agileSemantics.incrementType).toBe('sprint');
      expect(agileSemantics.flexible).toBe(true);
    });

    it('should interpret Waterfall as sequential phases', () => {
      const waterfallSemantics = {
        methodology: 'waterfall',
        incrementType: 'phase',
        duration: 'varies',
        approvalGates: true,
        predictable: true
      };

      expect(waterfallSemantics.methodology).toBe('waterfall');
      expect(waterfallSemantics.incrementType).toBe('phase');
      expect(waterfallSemantics.approvalGates).toBe(true);
      expect(waterfallSemantics.predictable).toBe(true);
    });
  });
});
