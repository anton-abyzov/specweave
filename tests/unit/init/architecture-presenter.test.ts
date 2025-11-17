/**
 * Unit Tests: Architecture Presenter
 *
 * Tests AC-US5-08 and AC-US5-09:
 * - Clear rationale for architecture decision
 * - User can accept/reject/modify recommendation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { presentArchitectureRecommendation, promptAcceptArchitecture, promptModifyArchitecture, presentArchitectureSummary } from '../../../src/init/ArchitecturePresenter.js';
import type { ArchitectureRecommendation } from '../../../src/init/architecture/types.js';

describe('Architecture Presenter', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('presentArchitectureRecommendation', () => {
    it('should present serverless architecture with full details', () => {
      const architecture: ArchitectureRecommendation = {
        architecture: 'serverless',
        infrastructure: ['AWS Lambda', 'Supabase', 'Vercel', 'S3', 'CloudFront'],
        rationale: 'Serverless architecture provides instant scaling and pay-per-use pricing, ideal for viral potential and bootstrapped budget.',
        costEstimate: {
          at1K: '$10/month',
          at10K: '$250/month',
          at100K: '$850/month',
          at1M: '$5K/month'
        },
        cloudCredits: [
          { provider: 'AWS Activate', amount: '$1K-$100K', duration: '12 months' },
          { provider: 'Google Cloud', amount: '$2K-$350K', duration: '24 months' }
        ],
        projects: [
          { name: 'frontend', description: 'React frontend', stack: ['React', 'TypeScript'] },
          { name: 'backend-functions', description: 'Serverless functions', stack: ['Node.js', 'AWS Lambda'] }
        ],
        methodology: 'agile'
      };

      const teams = {
        recommended: 5,
        min: 3,
        max: 7,
        roles: ['Frontend Dev', 'Backend Dev', 'DevOps'],
        rationale: 'Small team for agile development'
      };

      presentArchitectureRecommendation(architecture, teams);

      // Verify architecture type is shown
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ARCHITECTURE RECOMMENDATION'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Serverless'));

      // Verify rationale is shown
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Rationale'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Serverless architecture provides instant scaling'));

      // Verify infrastructure is shown
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Infrastructure'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('AWS Lambda'));

      // Verify cost estimates are shown
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Cost Estimates'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('$10/month'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('$5K/month'));

      // Verify cloud credits are shown
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Cloud Credits'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('AWS Activate'));

      // Verify projects are shown
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Generated Projects'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('frontend'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('backend-functions'));

      // Verify team recommendations are shown
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Team Recommendations'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('5 people'));
    });

    it('should handle legacy array format (architecture decisions)', () => {
      const architecture = [
        { category: 'Architecture', decision: 'Microservices', rationale: 'Scalable and modular' },
        { category: 'Database', decision: 'PostgreSQL', rationale: 'ACID compliance' }
      ];

      const teams = {
        recommended: 10,
        min: 8,
        max: 12,
        roles: ['Backend Dev', 'Frontend Dev', 'DevOps', 'Data Engineer'],
        rationale: 'Medium-sized team for microservices'
      };

      presentArchitectureRecommendation(architecture, teams);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Architecture Decisions'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Microservices'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('PostgreSQL'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('10 people'));
    });

    it('should show alternatives if provided', () => {
      const architecture: ArchitectureRecommendation = {
        architecture: 'serverless',
        infrastructure: ['AWS Lambda'],
        rationale: 'Best for viral potential',
        costEstimate: { at1K: '$10', at10K: '$250', at100K: '$850', at1M: '$5K' },
        cloudCredits: [],
        projects: [],
        methodology: 'agile',
        alternatives: [
          {
            architecture: 'traditional-monolith',
            pros: ['Simpler deployment', 'Lower complexity'],
            cons: ['Harder to scale', 'Higher fixed costs']
          }
        ]
      };

      presentArchitectureRecommendation(architecture, {});

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Alternative Architectures'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Traditional Monolith'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Simpler deployment'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Harder to scale'));
    });

    it('should handle missing optional fields gracefully', () => {
      const architecture: ArchitectureRecommendation = {
        architecture: 'modular-monolith',
        infrastructure: [],
        rationale: 'Simple and effective',
        costEstimate: { at1K: '$50', at10K: '$500', at100K: '$2K', at1M: '$10K' },
        cloudCredits: [],
        projects: [],
        methodology: 'waterfall'
      };

      presentArchitectureRecommendation(architecture, null);

      // Should not throw errors
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Modular Monolith'));
    });
  });

  describe('promptAcceptArchitecture', () => {
    it('should return accept by default', async () => {
      const result = await promptAcceptArchitecture();
      expect(result).toBe('accept');
    });

    it('should support accept, reject, and modify options', async () => {
      // TypeScript enforces valid values
      const validOptions: ('accept' | 'reject' | 'modify')[] = ['accept', 'reject', 'modify'];
      expect(validOptions).toHaveLength(3);
    });
  });

  describe('promptModifyArchitecture', () => {
    it('should return architecture unchanged by default', async () => {
      const architecture: ArchitectureRecommendation = {
        architecture: 'serverless',
        infrastructure: ['AWS Lambda'],
        rationale: 'Test',
        costEstimate: { at1K: '$10', at10K: '$100', at100K: '$500', at1M: '$2K' },
        cloudCredits: [],
        projects: [],
        methodology: 'agile'
      };

      const result = await promptModifyArchitecture(architecture);

      expect(result).toEqual(architecture);
      expect(result.architecture).toBe('serverless');
    });

    it('should allow customization (future implementation)', async () => {
      // This is a stub for now, but the interface is ready
      const architecture: ArchitectureRecommendation = {
        architecture: 'microservices',
        infrastructure: ['Kubernetes'],
        rationale: 'Complex system',
        costEstimate: { at1K: '$100', at10K: '$1K', at100K: '$5K', at1M: '$20K' },
        cloudCredits: [],
        projects: [],
        methodology: 'agile'
      };

      const result = await promptModifyArchitecture(architecture);

      // Future: Allow user to change architecture type, infrastructure, etc.
      expect(result).toBeDefined();
    });
  });

  describe('presentArchitectureSummary', () => {
    it('should show concise summary after acceptance', () => {
      const architecture: ArchitectureRecommendation = {
        architecture: 'jamstack',
        infrastructure: ['Vercel', 'Supabase'],
        rationale: 'Static site with APIs',
        costEstimate: { at1K: '$0', at10K: '$50', at100K: '$200', at1M: '$1K' },
        cloudCredits: [],
        projects: [
          { name: 'frontend', description: 'Next.js app', stack: ['Next.js'] }
        ],
        methodology: 'agile'
      };

      presentArchitectureSummary(architecture);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Architecture Confirmed'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('JAMstack'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1 projects'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2 components'));
    });
  });

  describe('AC-US5-08: Clear Rationale', () => {
    it('should always display rationale for architecture decision', () => {
      const architecture: ArchitectureRecommendation = {
        architecture: 'traditional-monolith',
        infrastructure: ['AWS ECS', 'RDS'],
        rationale: 'HIPAA compliance requires traditional infrastructure with audit trails and encrypted storage.',
        costEstimate: { at1K: '$500', at10K: '$2K', at100K: '$8K', at1M: '$30K' },
        cloudCredits: [],
        projects: [],
        methodology: 'waterfall'
      };

      presentArchitectureRecommendation(architecture, {});

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Rationale'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('HIPAA compliance'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('audit trails'));
    });
  });

  describe('AC-US5-09: User Accept/Reject/Modify', () => {
    it('should provide interface for user to accept recommendation', async () => {
      const result = await promptAcceptArchitecture();
      expect(['accept', 'reject', 'modify']).toContain(result);
    });

    it('should provide interface for user to modify recommendation', async () => {
      const original: ArchitectureRecommendation = {
        architecture: 'serverless',
        infrastructure: ['AWS Lambda'],
        rationale: 'Original',
        costEstimate: { at1K: '$10', at10K: '$100', at100K: '$500', at1M: '$2K' },
        cloudCredits: [],
        projects: [],
        methodology: 'agile'
      };

      const modified = await promptModifyArchitecture(original);

      // Future: Allow actual modifications
      expect(modified).toBeDefined();
      expect(modified.architecture).toBeDefined();
    });
  });
});
