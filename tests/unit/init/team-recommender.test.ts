/**
 * Unit tests for TeamRecommender
 *
 * Tests compliance-driven team recommendations:
 * - T-020: HIPAA teams (auth + data)
 * - T-021: PCI-DSS teams (with Stripe alternative)
 * - T-022: SOC2/ISO 27001 teams (DevSecOps + CISO)
 * - T-023: Infrastructure teams (platform, data, observability)
 * - T-024: Specialized services
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TeamRecommender } from '../../../src/init/team/TeamRecommender.js';
import type { TeamRecommendationInput } from '../../../src/init/team/TeamRecommender.js';

describe('TeamRecommender', () => {
  let recommender: TeamRecommender;

  beforeEach(() => {
    recommender = new TeamRecommender();
  });

  describe('Core Teams', () => {
    it('should always recommend backend and frontend teams', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: [],
        useCases: []
      };

      const teams = recommender.recommend(input);

      const backend = teams.find(t => t.teamName === 'backend');
      const frontend = teams.find(t => t.teamName === 'frontend');

      expect(backend).toBeDefined();
      expect(backend?.required).toBe(true);
      expect(backend?.priority).toBe(100);

      expect(frontend).toBeDefined();
      expect(frontend?.required).toBe(true);
      expect(frontend?.priority).toBe(100);
    });
  });

  describe('T-020: HIPAA-driven team recommendations', () => {
    it('should recommend auth-team for HIPAA compliance', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: ['HIPAA'],
        useCases: []
      };

      const teams = recommender.recommend(input);
      const authTeam = teams.find(t => t.teamName === 'auth-team');

      expect(authTeam).toBeDefined();
      expect(authTeam?.required).toBe(true);
      expect(authTeam?.reason).toContain('HIPAA');
      expect(authTeam?.reason).toContain('BAA');
      expect(authTeam?.skills).toContain('HIPAA security controls');
      expect(authTeam?.serverlessAlternative?.service).toContain('AWS Cognito');
      expect(authTeam?.serverlessAlternative?.costSavings).toBe(185);
    });

    it('should recommend data-team for HIPAA compliance', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: ['HIPAA'],
        useCases: []
      };

      const teams = recommender.recommend(input);
      const dataTeam = teams.find(t => t.teamName === 'data-team');

      expect(dataTeam).toBeDefined();
      expect(dataTeam?.required).toBe(true);
      expect(dataTeam?.reason).toContain('PHI');
      expect(dataTeam?.skills).toContain('Encryption at rest (AES-256)');
      expect(dataTeam?.skills).toContain('HIPAA data lifecycle management');
    });

    it('should recommend HIPAA teams for FDA21CFR', () => {
      const inputFDA: TeamRecommendationInput = {
        complianceStandards: ['FDA21CFR'],
        useCases: []
      };

      const teamsFDA = recommender.recommend(inputFDA);

      expect(teamsFDA.find(t => t.teamName === 'auth-team')).toBeDefined();
      expect(teamsFDA.find(t => t.teamName === 'data-team')).toBeDefined();
    });
  });

  describe('T-021: PCI-DSS team recommendations', () => {
    it('should recommend payments-team (optional) with Stripe alternative', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: ['PCI-DSS'],
        useCases: []
      };

      const teams = recommender.recommend(input);
      const paymentsTeam = teams.find(t => t.teamName === 'payments-team');

      expect(paymentsTeam).toBeDefined();
      expect(paymentsTeam?.required).toBe(false); // Optional because Stripe is better
      expect(paymentsTeam?.reason).toContain('PCI-DSS');
      expect(paymentsTeam?.serverlessAlternative?.service).toBe('Stripe');
      expect(paymentsTeam?.serverlessAlternative?.costSavings).toBe(3500);
      expect(paymentsTeam?.serverlessAlternative?.pricingModel).toContain('2.9%');
      expect(paymentsTeam?.priority).toBe(50); // Low priority
    });

    it('should include PCI compliance skills', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: ['PCI-DSS'],
        useCases: []
      };

      const teams = recommender.recommend(input);
      const paymentsTeam = teams.find(t => t.teamName === 'payments-team');

      expect(paymentsTeam?.skills).toContain('PCI-DSS Level 1 certification');
      expect(paymentsTeam?.skills).toContain('Tokenization');
      expect(paymentsTeam?.skills).toContain('Network segmentation');
    });
  });

  describe('T-022: SOC2/ISO 27001 team recommendations', () => {
    it('should NOT recommend DevSecOps team for small teams (<= 15)', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: ['SOC2'],
        teamSize: 10,
        useCases: []
      };

      const teams = recommender.recommend(input);
      const devsecopsTeam = teams.find(t => t.teamName === 'devsecops-team');

      expect(devsecopsTeam).toBeUndefined();
    });

    it('should recommend DevSecOps team for teams > 15 people', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: ['SOC2'],
        teamSize: 20,
        useCases: []
      };

      const teams = recommender.recommend(input);
      const devsecopsTeam = teams.find(t => t.teamName === 'devsecops-team');

      expect(devsecopsTeam).toBeDefined();
      expect(devsecopsTeam?.required).toBe(true);
      expect(devsecopsTeam?.reason).toContain('SOC2');
      expect(devsecopsTeam?.skills).toContain('SOC2 Type II controls');
      expect(devsecopsTeam?.skills).toContain('Security monitoring (SIEM)');
      expect(devsecopsTeam?.priority).toBe(90);
    });

    it('should recommend CISO role (optional) for teams > 15 people', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: ['ISO27001'],
        teamSize: 25,
        useCases: []
      };

      const teams = recommender.recommend(input);
      const ciso = teams.find(t => t.teamName === 'ciso');

      expect(ciso).toBeDefined();
      expect(ciso?.required).toBe(false); // Optional
      expect(ciso?.role).toBe('Chief Information Security Officer');
      expect(ciso?.skills).toContain('Security strategy');
      expect(ciso?.priority).toBe(70);
    });

    it('should recommend teams for both SOC2 and ISO27001', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: ['SOC2', 'ISO27001'],
        teamSize: 20,
        useCases: []
      };

      const teams = recommender.recommend(input);
      const devsecopsTeam = teams.find(t => t.teamName === 'devsecops-team');

      expect(devsecopsTeam).toBeDefined();
      expect(devsecopsTeam?.skills).toContain('SOC2 Type II controls');
      expect(devsecopsTeam?.skills).toContain('ISO 27001 ISMS implementation');
    });
  });

  describe('T-023: Infrastructure team recommendations', () => {
    it('should recommend platform-team for > 5 microservices', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: [],
        microserviceCount: 8,
        useCases: []
      };

      const teams = recommender.recommend(input);
      const platformTeam = teams.find(t => t.teamName === 'platform-team');

      expect(platformTeam).toBeDefined();
      expect(platformTeam?.required).toBe(true);
      expect(platformTeam?.reason).toContain('8 microservices');
      expect(platformTeam?.skills).toContain('Kubernetes (EKS/AKS/GKE)');
      expect(platformTeam?.skills).toContain('Service mesh (Istio/Linkerd)');
      expect(platformTeam?.priority).toBe(85);
    });

    it('should NOT recommend platform-team for <= 5 microservices', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: [],
        microserviceCount: 3,
        useCases: []
      };

      const teams = recommender.recommend(input);
      const platformTeam = teams.find(t => t.teamName === 'platform-team');

      expect(platformTeam).toBeUndefined();
    });

    it('should recommend data-team when analytics detected', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: [],
        hasAnalytics: true,
        useCases: []
      };

      const teams = recommender.recommend(input);
      const dataTeam = teams.find(t => t.teamName === 'data-team');

      expect(dataTeam).toBeDefined();
      expect(dataTeam?.required).toBe(true);
      expect(dataTeam?.reason).toContain('Analytics');
      expect(dataTeam?.skills).toContain('Data pipelines (Airflow/Prefect)');
      expect(dataTeam?.skills).toContain('ML model deployment');
      expect(dataTeam?.priority).toBe(80);
    });

    it('should recommend observability-team for > 20 services', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: [],
        microserviceCount: 25,
        useCases: []
      };

      const teams = recommender.recommend(input);
      const observabilityTeam = teams.find(t => t.teamName === 'observability-team');

      expect(observabilityTeam).toBeDefined();
      expect(observabilityTeam?.required).toBe(false); // Optional
      expect(observabilityTeam?.reason).toContain('25 services');
      expect(observabilityTeam?.skills).toContain('Distributed tracing (Jaeger/Zipkin)');
      expect(observabilityTeam?.priority).toBe(60);
    });

    it('should recommend observability-team for large teams (> 30 people)', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: [],
        microserviceCount: 10,
        teamSize: 35,
        useCases: []
      };

      const teams = recommender.recommend(input);
      const observabilityTeam = teams.find(t => t.teamName === 'observability-team');

      expect(observabilityTeam).toBeDefined();
    });
  });

  describe('T-024: Specialized service teams', () => {
    it('should recommend notifications service for email use case', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: [],
        useCases: ['email'],
        dataTypes: []
      };

      const teams = recommender.recommend(input);
      const notificationsTeam = teams.find(t => t.teamName === 'notifications-service');

      expect(notificationsTeam).toBeDefined();
      expect(notificationsTeam?.required).toBe(false);
      expect(notificationsTeam?.skills).toContain('SendGrid/SES');
      expect(notificationsTeam?.serverlessAlternative).toBeDefined();
      expect(notificationsTeam?.serverlessAlternative?.costSavings).toBeGreaterThan(0);
    });

    it('should recommend payment integration for payment data type', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: [],
        useCases: [],
        dataTypes: ['payment']
      };

      const teams = recommender.recommend(input);
      const paymentIntegration = teams.find(t => t.teamName === 'payment-integration');

      expect(paymentIntegration).toBeDefined();
      expect(paymentIntegration?.serverlessAlternative?.service).toBe('Stripe');
      expect(paymentIntegration?.serverlessAlternative?.costSavings).toBe(3500);
    });
  });

  describe('Priority Sorting', () => {
    it('should sort teams by priority descending', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: ['HIPAA', 'SOC2'],
        teamSize: 20,
        microserviceCount: 10,
        useCases: ['email']
      };

      const teams = recommender.recommend(input);

      // Verify teams are sorted by priority descending
      for (let i = 0; i < teams.length - 1; i++) {
        const currentPriority = teams[i].priority || 0;
        const nextPriority = teams[i + 1].priority || 0;
        expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
      }

      // Highest priority teams should be first
      expect(teams[0].priority).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Serverless Savings Integration', () => {
    it('should calculate serverless savings for detected use cases', () => {
      const useCases = ['auth', 'file-uploads', 'email'];
      const analysis = recommender.getServerlessSavings(useCases);

      expect(analysis.totalSavings).toBeGreaterThan(0);
      expect(analysis.breakdown.length).toBe(3);
      expect(analysis.recommendation).toMatch(/serverless|hybrid|traditional/);
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Report Formatting', () => {
    it('should format team recommendations as markdown', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: ['HIPAA'],
        useCases: []
      };

      const teams = recommender.recommend(input);
      const report = recommender.formatReport(teams);

      expect(report).toContain('# Team Structure Recommendations');
      expect(report).toContain('## Required Teams');
      expect(report).toContain('auth-team');
      expect(report).toContain('AWS Cognito');
      expect(report).toContain('Cost Savings: $185/month');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle enterprise HIPAA + SOC2 project with analytics', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: ['HIPAA', 'SOC2'],
        teamSize: 30,
        microserviceCount: 12,
        hasAnalytics: true,
        useCases: ['auth', 'file-uploads', 'email'],
        projectType: 'enterprise',
        dataTypes: ['healthcare', 'personal']
      };

      const teams = recommender.recommend(input);

      // Should have all compliance teams
      expect(teams.find(t => t.teamName === 'auth-team')).toBeDefined();
      expect(teams.find(t => t.teamName === 'data-team')).toBeDefined();
      expect(teams.find(t => t.teamName === 'devsecops-team')).toBeDefined();

      // Should have infrastructure teams
      expect(teams.find(t => t.teamName === 'platform-team')).toBeDefined();

      // Should have specialized teams
      expect(teams.find(t => t.teamName === 'notifications-service')).toBeDefined();

      // Verify reasonable team count (not too many)
      expect(teams.length).toBeGreaterThan(5);
      expect(teams.length).toBeLessThan(15);
    });

    it('should handle minimal startup with no compliance', () => {
      const input: TeamRecommendationInput = {
        complianceStandards: [],
        teamSize: 3,
        microserviceCount: 1,
        useCases: ['auth'],
        projectType: 'startup'
      };

      const teams = recommender.recommend(input);

      // Should only have core teams
      expect(teams.find(t => t.teamName === 'backend')).toBeDefined();
      expect(teams.find(t => t.teamName === 'frontend')).toBeDefined();

      // Should NOT have compliance teams
      expect(teams.find(t => t.teamName === 'auth-team')).toBeUndefined();
      expect(teams.find(t => t.teamName === 'devsecops-team')).toBeUndefined();

      // Should have minimal teams
      expect(teams.length).toBeLessThanOrEqual(4);
    });
  });
});
