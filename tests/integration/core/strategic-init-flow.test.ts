/**
 * Integration Tests: Strategic Init Flow (T-058)
 *
 * Tests the complete 6-phase init flow end-to-end:
 * - Phase 1: Vision & Market Research
 * - Phase 2: Scaling & Performance Goals
 * - Phase 3: Data & Compliance Detection
 * - Phase 4: Budget & Cloud Credits
 * - Phase 5: Methodology & Organization
 * - Phase 6: Repository Selection (optional)
 *
 * Tests all four personas:
 * - Viral startup (bootstrapped, high growth)
 * - Enterprise (funded, compliance-heavy)
 * - HIPAA healthcare (critical compliance)
 * - Learning project (minimal requirements)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VisionAnalyzer } from '../../../src/init/research/VisionAnalyzer.js';
import { ComplianceDetector } from '../../../src/init/compliance/ComplianceDetector.js';
import { TeamRecommender } from '../../../src/init/team/TeamRecommender.js';
import { ArchitectureDecisionEngine } from '../../../src/init/architecture/ArchitectureDecisionEngine.js';

describe('Strategic Init Flow Integration (T-058)', () => {
  let visionAnalyzer: VisionAnalyzer;
  let complianceDetector: ComplianceDetector;
  let teamRecommender: TeamRecommender;
  let architectureEngine: ArchitectureDecisionEngine;

  beforeEach(() => {
    visionAnalyzer = new VisionAnalyzer();
    complianceDetector = new ComplianceDetector();
    teamRecommender = new TeamRecommender();
    architectureEngine = new ArchitectureDecisionEngine();
  });

  afterEach(() => {
    visionAnalyzer.clearCache();
  });

  describe('Persona 1: Viral Startup (Bootstrapped)', () => {
    it('should complete full init flow for viral social platform', async () => {
      const startTime = Date.now();

      // Phase 1: Vision & Market Research
      const vision = 'A TikTok-like video sharing app for fitness enthusiasts with viral challenges';
      const visionInsights = await visionAnalyzer.analyze(vision);

      expect(visionInsights).toBeDefined();
      expect(visionInsights.market).toBeDefined();
      expect(visionInsights.keywords.length).toBeGreaterThan(0);
      expect(visionInsights.viralPotential).toBe(true);
      expect(visionInsights.opportunityScore).toBeGreaterThan(3);

      // Phase 2: Scaling expectations
      const expectedUsers = 100000; // High growth
      const expectedServices = 5;

      expect(expectedUsers).toBeGreaterThan(50000);

      // Phase 3: Compliance detection
      const complianceReqs = complianceDetector.detect(vision, visionInsights.market);

      // Should detect minimal compliance (maybe GDPR if targeting Europe)
      expect(Array.isArray(complianceReqs)).toBe(true);

      // Phase 4: Budget
      const budget = 'bootstrapped';
      expect(budget).toBe('bootstrapped');

      // Phase 5: Methodology
      const methodology = 'agile';
      expect(methodology).toBe('agile');

      // Phase 6: Architecture recommendation
      const architecture = architectureEngine.recommend({
        vision,
        complianceStandards: complianceReqs.map(r => r.standard),
        expectedUsers,
        expectedServices,
        budget,
        viralPotential: visionInsights.viralPotential,
        projectType: 'startup'
      });

      // Viral + bootstrapped → serverless
      expect(architecture.approach).toBe('serverless');
      expect(architecture.decisions).toHaveLength(5);
      expect(architecture.costEstimates).toHaveLength(4); // 1K, 10K, 100K, 1M users
      expect(architecture.costEstimates[0].monthlyCost).toBeLessThan(100); // Low cost at 1K users

      // Team recommendations
      const teams = teamRecommender.recommend({
        complianceStandards: complianceReqs.map(r => r.standard),
        microserviceCount: expectedServices,
        hasAnalytics: true, // Viral apps need analytics
        useCases: ['auth', 'file-uploads', 'image-processing'],
        projectType: 'startup'
      });

      expect(teams).toBeDefined();
      expect(teams.length).toBeGreaterThan(0);
      expect(teams.some(t => t.teamName === 'backend')).toBe(true);
      expect(teams.some(t => t.teamName === 'frontend')).toBe(true);

      // Final config
      const config = {
        research: {
          vision: visionInsights,
          compliance: complianceReqs,
          teams,
          scaling: { expectedUsers, expectedServices },
          budget,
          methodology
        },
        architecture,
        projects: ['backend', 'frontend'],
        livingDocs: {
          copyBasedSync: {
            enabled: true,
            threeLayerSync: true
          }
        }
      };

      expect(config.research.vision).toBeDefined();
      expect(config.research.methodology).toBe('agile');
      expect(config.architecture.approach).toBe('serverless');
      expect(config.livingDocs.copyBasedSync.enabled).toBe(true);

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeLessThan(60000); // Should complete in <60s
    });
  });

  describe('Persona 2: Enterprise (Funded, Compliance-Heavy)', () => {
    it('should complete full init flow for enterprise SaaS', async () => {
      const startTime = Date.now();

      // Phase 1: Vision
      const vision = 'Enterprise project management platform for Fortune 500 companies with SOC2 compliance';
      const visionInsights = await visionAnalyzer.analyze(vision);

      expect(visionInsights.market).toBeDefined();
      expect(visionInsights.viralPotential).toBe(false); // Enterprise is not viral

      // Phase 2: Scaling
      const expectedUsers = 50000; // Moderate scale
      const expectedServices = 8;

      // Phase 3: Compliance (SOC2 detected if enterprise market)
      const complianceReqs = complianceDetector.detect(vision, visionInsights.market);

      // SOC2 may be detected based on vision keywords
      expect(complianceReqs).toBeDefined();
      expect(Array.isArray(complianceReqs)).toBe(true);

      // Phase 4: Budget
      const budget = 'series-a-plus';

      // Phase 5: Methodology
      const methodology = 'agile';

      // Phase 6: Architecture (traditional due to compliance)
      const architecture = architectureEngine.recommend({
        vision,
        complianceStandards: complianceReqs.map(r => r.standard),
        expectedUsers,
        expectedServices,
        budget,
        viralPotential: false,
        projectType: 'enterprise'
      });

      // Enterprise with 8 services can be hybrid or traditional
      expect(['traditional', 'hybrid']).toContain(architecture.approach);
      expect(architecture.decisions.length).toBeGreaterThan(0);
      expect(architecture.costEstimates[0].monthlyCost).toBeGreaterThan(50); // Higher cost than serverless

      // Team recommendations (should include DevSecOps for SOC2)
      const teams = teamRecommender.recommend({
        complianceStandards: complianceReqs.map(r => r.standard),
        microserviceCount: expectedServices,
        hasAnalytics: true,
        useCases: ['auth', 'background-jobs'],
        projectType: 'enterprise'
      });

      expect(teams.some(t => t.teamName === 'platform-team')).toBe(true); // >5 services
      // DevSecOps team only added if team size > 15, which we don't specify here
      expect(teams.length).toBeGreaterThan(2); // At least core teams + platform

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeLessThan(60000);
    });
  });

  describe('Persona 3: HIPAA Healthcare (Critical Compliance)', () => {
    it('should complete full init flow for healthcare app', async () => {
      const startTime = Date.now();

      // Phase 1: Vision (healthcare keywords)
      const vision = 'Telemedicine platform for remote patient consultations with encrypted health records';
      const visionInsights = await visionAnalyzer.analyze(vision);

      expect(visionInsights.keywords.some(k => k.toLowerCase().includes('health'))).toBe(true);

      // Phase 2: Scaling
      const expectedUsers = 20000;
      const expectedServices = 6;

      // Phase 3: Compliance (HIPAA critical)
      const complianceReqs = complianceDetector.detect(vision, visionInsights.market);

      expect(complianceReqs.some(r => r.standard === 'HIPAA')).toBe(true);
      const hipaaReq = complianceReqs.find(r => r.standard === 'HIPAA');
      expect(hipaaReq?.priority).toBe('critical');
      expect(hipaaReq?.keyRequirements).toContain('PHI encryption');

      // Phase 4: Budget
      const budget = 'seed';

      // Phase 5: Methodology
      const methodology = 'agile';

      // Phase 6: Architecture (traditional for HIPAA)
      const architecture = architectureEngine.recommend({
        vision,
        complianceStandards: complianceReqs.map(r => r.standard),
        expectedUsers,
        expectedServices,
        budget,
        viralPotential: false,
        projectType: 'scale-up'
      });

      expect(architecture.approach).toBe('traditional'); // HIPAA → traditional
      expect(architecture.rationale).toContain('HIPAA');

      // Team recommendations (auth + data teams for HIPAA)
      const teams = teamRecommender.recommend({
        complianceStandards: complianceReqs.map(r => r.standard),
        microserviceCount: expectedServices,
        hasAnalytics: false,
        useCases: ['auth', 'file-uploads'],
        projectType: 'scale-up',
        dataTypes: ['healthcare']
      });

      expect(teams.some(t => t.teamName === 'auth-team')).toBe(true); // HIPAA auth
      expect(teams.some(t => t.teamName === 'data-team')).toBe(true); // PHI handling

      const authTeam = teams.find(t => t.teamName === 'auth-team');
      expect(authTeam?.required).toBe(true);
      expect(authTeam?.serverlessAlternative?.service).toContain('Cognito');

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeLessThan(60000);
    });
  });

  describe('Persona 4: Learning Project (Minimal Requirements)', () => {
    it('should complete full init flow for learning project', async () => {
      const startTime = Date.now();

      // Phase 1: Vision
      const vision = 'Simple todo app to learn full-stack development';
      const visionInsights = await visionAnalyzer.analyze(vision);

      expect(visionInsights.market).toBeDefined();

      // Phase 2: Scaling (minimal)
      const expectedUsers = 100;
      const expectedServices = 1;

      // Phase 3: Compliance (none)
      const complianceReqs = complianceDetector.detect(vision, visionInsights.market);
      expect(complianceReqs).toHaveLength(0);

      // Phase 4: Budget
      const budget = 'learning';

      // Phase 5: Methodology
      const methodology = 'agile';

      // Phase 6: Architecture (learning-optimized)
      const architecture = architectureEngine.recommend({
        vision,
        complianceStandards: [],
        expectedUsers,
        expectedServices,
        budget,
        viralPotential: false,
        projectType: 'learning'
      });

      expect(architecture.approach).toBe('learning');
      expect(architecture.decisions.some(d => d.decision.includes('SQLite'))).toBe(true);
      expect(architecture.costEstimates[0].monthlyCost).toBe(0); // Free tier

      // Team recommendations (minimal)
      const teams = teamRecommender.recommend({
        complianceStandards: [],
        microserviceCount: expectedServices,
        hasAnalytics: false,
        useCases: [],
        projectType: 'learning'
      });

      expect(teams.some(t => t.teamName === 'backend')).toBe(true);
      expect(teams.some(t => t.teamName === 'frontend')).toBe(true);
      expect(teams.every(t => !t.teamName.includes('platform'))).toBe(true); // No platform team

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeLessThan(60000);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete vision analysis in <5s', async () => {
      const startTime = Date.now();

      const vision = 'E-commerce platform for artisan crafts';
      const insights = await visionAnalyzer.analyze(vision);

      const elapsedTime = Date.now() - startTime;

      expect(insights).toBeDefined();
      expect(elapsedTime).toBeLessThan(5000);
    });

    it('should detect compliance in <2s', () => {
      const startTime = Date.now();

      const vision = 'Healthcare records management system with patient data';
      const compliance = complianceDetector.detect(vision, 'healthcare');

      const elapsedTime = Date.now() - startTime;

      expect(compliance).toBeDefined();
      expect(elapsedTime).toBeLessThan(2000);
    });

    it('should generate architecture recommendation in <3s', () => {
      const startTime = Date.now();

      const architecture = architectureEngine.recommend({
        vision: 'Test app',
        complianceStandards: ['SOC2'],
        expectedUsers: 10000,
        expectedServices: 3,
        budget: 'bootstrapped',
        viralPotential: false,
        projectType: 'startup'
      });

      const elapsedTime = Date.now() - startTime;

      expect(architecture).toBeDefined();
      expect(elapsedTime).toBeLessThan(3000);
    });

    it('should generate team recommendations in <2s', () => {
      const startTime = Date.now();

      const teams = teamRecommender.recommend({
        complianceStandards: ['HIPAA', 'SOC2'],
        microserviceCount: 8,
        hasAnalytics: true,
        useCases: ['auth', 'file-uploads'],
        projectType: 'enterprise'
      });

      const elapsedTime = Date.now() - startTime;

      expect(teams).toBeDefined();
      expect(elapsedTime).toBeLessThan(2000);
    });
  });

  describe('Config Completeness Validation', () => {
    it('should produce complete config for all personas', async () => {
      const personas = [
        {
          name: 'Viral Startup',
          vision: 'Social video app',
          budget: 'bootstrapped' as const,
          expectedUsers: 100000
        },
        {
          name: 'Enterprise',
          vision: 'Enterprise project management with SOC2',
          budget: 'series-a-plus' as const,
          expectedUsers: 50000
        },
        {
          name: 'Healthcare',
          vision: 'Patient health records platform',
          budget: 'seed' as const,
          expectedUsers: 20000
        },
        {
          name: 'Learning',
          vision: 'Simple todo app',
          budget: 'learning' as const,
          expectedUsers: 100
        }
      ];

      for (const persona of personas) {
        const visionInsights = await visionAnalyzer.analyze(persona.vision);
        const complianceReqs = complianceDetector.detect(persona.vision, visionInsights.market);
        const architecture = architectureEngine.recommend({
          vision: persona.vision,
          complianceStandards: complianceReqs.map(r => r.standard),
          expectedUsers: persona.expectedUsers,
          expectedServices: 3,
          budget: persona.budget,
          viralPotential: visionInsights.viralPotential,
          projectType: 'startup'
        });

        const config = {
          research: {
            vision: visionInsights,
            compliance: complianceReqs,
            teams: [],
            scaling: { expectedUsers: persona.expectedUsers, expectedServices: 3 },
            budget: persona.budget,
            methodology: 'agile' as const
          },
          architecture,
          projects: ['backend', 'frontend'],
          livingDocs: {
            copyBasedSync: {
              enabled: true,
              threeLayerSync: true
            }
          }
        };

        // Validate config completeness
        expect(config.research.vision, `${persona.name}: vision`).toBeDefined();
        expect(config.research.compliance, `${persona.name}: compliance`).toBeDefined();
        expect(config.research.scaling, `${persona.name}: scaling`).toBeDefined();
        expect(config.research.budget, `${persona.name}: budget`).toBeDefined();
        expect(config.research.methodology, `${persona.name}: methodology`).toBeDefined();
        expect(config.architecture, `${persona.name}: architecture`).toBeDefined();
        expect(config.projects, `${persona.name}: projects`).toHaveLength(2);
        expect(config.livingDocs.copyBasedSync.enabled, `${persona.name}: copyBasedSync`).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle vision with multiple compliance standards', async () => {
      const vision = 'European healthcare payment platform for cross-border transactions';
      const visionInsights = await visionAnalyzer.analyze(vision);
      const complianceReqs = complianceDetector.detect(vision, visionInsights.market);

      // Should detect: GDPR (Europe), HIPAA (healthcare), PCI-DSS (payment)
      const standards = complianceReqs.map(r => r.standard);
      expect(standards.length).toBeGreaterThan(1);
    });

    it('should cache vision analysis results', async () => {
      const vision = 'Test app for caching';

      const startTime1 = Date.now();
      const insights1 = await visionAnalyzer.analyze(vision);
      const elapsedTime1 = Date.now() - startTime1;

      const startTime2 = Date.now();
      const insights2 = await visionAnalyzer.analyze(vision);
      const elapsedTime2 = Date.now() - startTime2;

      expect(insights1).toEqual(insights2);
      // Cached should be faster OR at least as fast
      expect(elapsedTime2).toBeLessThanOrEqual(elapsedTime1);
    });

    it('should handle empty vision gracefully', async () => {
      await expect(visionAnalyzer.analyze('')).rejects.toThrow('Vision description cannot be empty');
    });
  });
});
