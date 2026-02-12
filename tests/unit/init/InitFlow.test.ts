/**
 * InitFlow Tests
 *
 * Tests for the strategic init flow:
 * - executeStrategicInit orchestration
 * - Helper functions: getRelevantCredits, presentArchitectureRecommendation
 * - Phase execution and config assembly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mocks
const {
  mockSelect,
  mockVisionAnalyzerAnalyze,
  mockComplianceDetectorDetect,
  mockTeamRecommenderRecommend,
  mockArchitectureDecisionEngineDecide,
  mockSelectRepositories,
  mockGetAdaptiveRecommendation,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockVisionAnalyzerAnalyze: vi.fn(),
  mockComplianceDetectorDetect: vi.fn(),
  mockTeamRecommenderRecommend: vi.fn(),
  mockArchitectureDecisionEngineDecide: vi.fn(),
  mockSelectRepositories: vi.fn(),
  mockGetAdaptiveRecommendation: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
}));

vi.mock('../../../src/init/research/VisionAnalyzer.js', () => ({
  VisionAnalyzer: class {
    analyze = mockVisionAnalyzerAnalyze;
  },
}));

vi.mock('../../../src/init/compliance/ComplianceDetector.js', () => ({
  ComplianceDetector: class {
    detect = mockComplianceDetectorDetect;
  },
}));

vi.mock('../../../src/init/team/TeamRecommender.js', () => ({
  TeamRecommender: class {
    recommend = mockTeamRecommenderRecommend;
  },
}));

vi.mock('../../../src/init/architecture/ArchitectureDecisionEngine.js', () => ({
  ArchitectureDecisionEngine: class {
    decide = mockArchitectureDecisionEngineDecide;
  },
}));

vi.mock('../../../src/init/repo/GitHubAPIClient.js', () => ({
  GitHubAPIClient: class {},
}));

vi.mock('../../../src/init/repo/RepositorySelector.js', () => ({
  selectRepositories: mockSelectRepositories,
  getAdaptiveRecommendation: mockGetAdaptiveRecommendation,
}));

import { executeStrategicInit } from '../../../src/init/InitFlow.js';

describe('InitFlow', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Default mock returns for all phases
    mockVisionAnalyzerAnalyze.mockResolvedValue({
      market: 'SaaS',
      keywords: ['design', 'collaboration', 'remote', 'team'],
      opportunityScore: 7,
      viralPotential: false,
      competitors: [],
      followUpQuestions: [],
    });

    mockComplianceDetectorDetect.mockReturnValue([]);

    mockTeamRecommenderRecommend.mockReturnValue({
      recommended: 3,
      min: 2,
      max: 5,
      roles: ['Frontend', 'Backend', 'DevOps'],
      rationale: 'Small team for early stage',
    });

    mockArchitectureDecisionEngineDecide.mockReturnValue([
      {
        category: 'Architecture',
        decision: 'Modular Monolith',
        rationale: 'Best for bootstrapped project',
      },
    ]);

    // Methodology selection
    mockSelect.mockResolvedValue('agile');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('executeStrategicInit', () => {
    it('should return a complete InitFlowResult', async () => {
      const result = await executeStrategicInit();

      expect(result).toHaveProperty('vision');
      expect(result).toHaveProperty('compliance');
      expect(result).toHaveProperty('teams');
      expect(result).toHaveProperty('architecture');
      expect(result).toHaveProperty('config');
    });

    it('should contain vision analysis results', async () => {
      const result = await executeStrategicInit();

      expect(result.vision.market).toBe('SaaS');
      expect(result.vision.keywords).toContain('design');
    });

    it('should call VisionAnalyzer.analyze', async () => {
      await executeStrategicInit();

      expect(mockVisionAnalyzerAnalyze).toHaveBeenCalledTimes(1);
    });

    it('should call ComplianceDetector.detect', async () => {
      await executeStrategicInit();

      expect(mockComplianceDetectorDetect).toHaveBeenCalledTimes(1);
    });

    it('should call TeamRecommender.recommend with correct input', async () => {
      await executeStrategicInit();

      expect(mockTeamRecommenderRecommend).toHaveBeenCalledTimes(1);
      const input = mockTeamRecommenderRecommend.mock.calls[0][0];
      expect(input).toHaveProperty('complianceStandards');
      expect(input).toHaveProperty('microserviceCount');
      expect(input).toHaveProperty('projectType');
    });

    it('should call ArchitectureDecisionEngine.decide', async () => {
      await executeStrategicInit();

      expect(mockArchitectureDecisionEngineDecide).toHaveBeenCalledTimes(1);
    });

    it('should detect use cases from vision keywords', async () => {
      mockVisionAnalyzerAnalyze.mockResolvedValue({
        market: 'SaaS',
        keywords: ['authentication', 'file upload', 'image processing', 'email'],
        opportunityScore: 8,
        viralPotential: true,
        competitors: [],
        followUpQuestions: [],
      });

      await executeStrategicInit();

      // TeamRecommender should receive detected use cases
      const input = mockTeamRecommenderRecommend.mock.calls[0][0];
      expect(input).toHaveProperty('useCases');
    });

    it('should detect analytics from keywords', async () => {
      mockVisionAnalyzerAnalyze.mockResolvedValue({
        market: 'Analytics',
        keywords: ['analytics', 'ml', 'data'],
        opportunityScore: 9,
        viralPotential: false,
        competitors: [],
        followUpQuestions: [],
      });

      await executeStrategicInit();

      const input = mockTeamRecommenderRecommend.mock.calls[0][0];
      expect(input.hasAnalytics).toBe(true);
    });

    it('should map budget to project type correctly', async () => {
      // Default budget is 'bootstrapped' which maps to 'startup'
      await executeStrategicInit();

      const input = mockTeamRecommenderRecommend.mock.calls[0][0];
      expect(input.projectType).toBe('startup');
    });

    it('should handle compliance requirements', async () => {
      mockComplianceDetectorDetect.mockReturnValue([
        {
          standard: 'GDPR',
          confidence: 0.9,
          rationale: 'Personal data handling',
          keyRequirements: ['Data protection', 'Right to erasure'],
          priority: 'critical',
        },
        {
          standard: 'SOC2',
          confidence: 0.8,
          rationale: 'SaaS product',
          keyRequirements: ['Access control', 'Audit logging'],
          priority: 'high',
        },
      ]);

      const result = await executeStrategicInit();

      expect(result.compliance).toHaveLength(2);
      expect(result.compliance[0].standard).toBe('GDPR');
    });

    it('should show competitor info when available', async () => {
      mockVisionAnalyzerAnalyze.mockResolvedValue({
        market: 'Design',
        keywords: ['design'],
        opportunityScore: 6,
        viralPotential: false,
        competitors: [{ name: 'Figma', url: 'https://figma.com' }],
        followUpQuestions: [],
      });

      const result = await executeStrategicInit();

      expect(result.vision.competitors).toHaveLength(1);
      expect(result.vision.competitors[0].name).toBe('Figma');
    });

    it('should include methodology in config', async () => {
      mockSelect.mockResolvedValue('waterfall');

      const result = await executeStrategicInit();

      expect(result.config.research.methodology).toBe('waterfall');
    });

    it('should include living docs config with copy-based sync enabled', async () => {
      const result = await executeStrategicInit();

      expect(result.config.livingDocs.copyBasedSync.enabled).toBe(true);
      expect(result.config.livingDocs.copyBasedSync.threeLayerSync).toBe(true);
    });

    it('should not include repositories when not multi-repo', async () => {
      const result = await executeStrategicInit();

      expect(result.repositories).toBeUndefined();
    });

    it('should include scaling info in config', async () => {
      const result = await executeStrategicInit();

      expect(result.config.research.scaling).toBeDefined();
      expect(result.config.research.scaling.expectedUsers).toBeDefined();
      expect(result.config.research.scaling.expectedServices).toBeDefined();
    });

    it('should include default projects in config', async () => {
      const result = await executeStrategicInit();

      expect(result.config.projects).toEqual(['backend', 'frontend']);
    });

    it('should wrap teams in array for compatibility', async () => {
      const result = await executeStrategicInit();

      expect(Array.isArray(result.teams)).toBe(true);
    });

    it('should include architecture in result', async () => {
      const result = await executeStrategicInit();

      expect(result.architecture).toBeDefined();
      expect(Array.isArray(result.architecture)).toBe(true);
      expect(result.architecture[0].category).toBe('Architecture');
    });

    it('should log phase progress messages', async () => {
      await executeStrategicInit();

      // Check that key phase messages were logged
      const logCalls = consoleLogSpy.mock.calls.map(c => c.join(' '));
      const allText = logCalls.join('\n');
      expect(allText).toContain('Strategic Init');
      expect(allText).toContain('Phase 1');
    });

    it('should handle empty compliance gracefully', async () => {
      mockComplianceDetectorDetect.mockReturnValue([]);

      const result = await executeStrategicInit();

      expect(result.compliance).toEqual([]);
    });

    it('should generate cloud credit suggestions', async () => {
      await executeStrategicInit();

      // getRelevantCredits is called internally; verify via console output
      const logCalls = consoleLogSpy.mock.calls.map(c => c.join(' '));
      const allText = logCalls.join('\n');
      expect(allText).toContain('AWS Activate');
    });

    it('should filter dataTypes for TeamRecommender input', async () => {
      // The stub promptDataTypes returns ['personal']
      await executeStrategicInit();

      const input = mockTeamRecommenderRecommend.mock.calls[0][0];
      expect(input.dataTypes).toEqual(['personal']);
    });

    it('should present architecture recommendation', async () => {
      await executeStrategicInit();

      const logCalls = consoleLogSpy.mock.calls.map(c => c.join(' '));
      const allText = logCalls.join('\n');
      expect(allText).toContain('ARCHITECTURE RECOMMENDATIONS');
    });
  });
});
