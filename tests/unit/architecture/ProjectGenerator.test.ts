import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for ProjectGenerator (T-042)
 */

import { ProjectGenerator } from '../../../src/init/architecture/ProjectGenerator.js.js';
import type { ComplianceStandard } from '../../../src/init/compliance/types.js.js';
import type { VisionInsights } from '../../../src/init/research/types.js.js';

describe('ProjectGenerator', () => {
  const generator = new ProjectGenerator();

  describe('generateProjects - Architecture-specific', () => {
    it('should generate serverless projects', () => {
      const projects = generator.generateProjects('serverless', []);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'frontend' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'backend-functions' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'api-gateway' })
      );
    });

    it('should generate traditional monolith projects', () => {
      const projects = generator.generateProjects('traditional-monolith', []);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'frontend' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'backend' })
      );
    });

    it('should generate microservices projects', () => {
      const projects = generator.generateProjects('microservices', []);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'frontend' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'api-gateway' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'user-service' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'auth-service' })
      );
    });

    it('should generate JAMstack projects', () => {
      const projects = generator.generateProjects('jamstack', []);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'frontend' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'cms' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'backend-functions' })
      );
    });

    it('should generate hybrid projects', () => {
      const projects = generator.generateProjects('hybrid', []);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'frontend' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'backend-monolith' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'backend-functions' })
      );
    });

    it('should generate modular monolith projects', () => {
      const projects = generator.generateProjects('modular-monolith', []);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'frontend' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'backend' })
      );
    });
  });

  describe('generateProjects - Compliance-driven', () => {
    it('should add HIPAA projects', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'HIPAA',
          name: 'HIPAA',
          dataTypes: ['healthcare'],
          regions: ['US'],
          teamImpact: [],
          costImpact: '$5000-10000/year',
          certificationRequired: true,
          auditFrequency: 'annual'
        }
      ];

      const projects = generator.generateProjects('traditional-monolith', compliance);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'auth-service' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'data-service' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'audit-logs' })
      );
    });

    it('should add PCI-DSS payment project', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'PCI-DSS',
          name: 'PCI-DSS',
          dataTypes: ['payment'],
          regions: ['global'],
          teamImpact: [],
          costImpact: '$3000-5000/year',
          certificationRequired: true,
          auditFrequency: 'quarterly'
        }
      ];

      const projects = generator.generateProjects('traditional-monolith', compliance);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'payment-service' })
      );
    });

    it('should handle multiple compliance standards', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'HIPAA',
          name: 'HIPAA',
          dataTypes: ['healthcare'],
          regions: ['US'],
          teamImpact: [],
          costImpact: '$5000-10000/year',
          certificationRequired: true,
          auditFrequency: 'annual'
        },
        {
          id: 'PCI-DSS',
          name: 'PCI-DSS',
          dataTypes: ['payment'],
          regions: ['global'],
          teamImpact: [],
          costImpact: '$3000-5000/year',
          certificationRequired: true,
          auditFrequency: 'quarterly'
        }
      ];

      const projects = generator.generateProjects('traditional-monolith', compliance);

      // Should include projects from both standards
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'auth-service' })
      ); // HIPAA
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'payment-service' })
      ); // PCI-DSS
    });
  });

  describe('generateProjects - Vision-driven', () => {
    it('should add mobile project when vision includes mobile', () => {
      const vision: VisionInsights = {
        keywords: ['mobile', 'app', 'design'],
        market: 'productivity-saas',
        competitors: [],
        opportunityScore: 8,
        viralPotential: true,
        followUpQuestions: [],
        rawVision: 'Test vision for mobile app'
      };

      const projects = generator.generateProjects('serverless', [], vision);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'mobile' })
      );
    });

    it('should add payment project when vision includes payment', () => {
      const vision: VisionInsights = {
        keywords: ['payment', 'ecommerce', 'shopping'],
        market: 'e-commerce',
        competitors: [],
        opportunityScore: 7,
        viralPotential: false,
        followUpQuestions: [],
        rawVision: 'Test vision for payment/ecommerce'
      };

      const projects = generator.generateProjects('serverless', [], vision);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'payment-service' })
      );
    });

    it('should add notification project when vision includes messaging', () => {
      const vision: VisionInsights = {
        keywords: ['notification', 'messaging', 'email'],
        market: 'productivity-saas',
        competitors: [],
        opportunityScore: 6,
        viralPotential: true,
        followUpQuestions: [],
        rawVision: 'Test vision for notification/messaging'
      };

      const projects = generator.generateProjects('serverless', [], vision);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'notification-service' })
      );
    });

    it('should add analytics project when vision includes ML/AI', () => {
      const vision: VisionInsights = {
        keywords: ['analytics', 'ml', 'ai'],
        market: 'ai-ml',
        competitors: [],
        opportunityScore: 9,
        viralPotential: false,
        followUpQuestions: [],
        rawVision: 'Test vision for analytics/ml/ai'
      };

      const projects = generator.generateProjects('serverless', [], vision);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'analytics-service' })
      );
    });

    it('should skip frontend for API-only projects', () => {
      const vision: VisionInsights = {
        keywords: ['api-only', 'backend'],
        market: 'enterprise-b2b',
        competitors: [],
        opportunityScore: 7,
        viralPotential: false,
        followUpQuestions: [],
        rawVision: 'Test vision for API-only backend'
      };

      const projects = generator.generateProjects('serverless', [], vision);

      expect(projects).not.toContainEqual(
        expect.objectContaining({ name: 'frontend' })
      );
    });

    it('should add multiple vision-driven projects', () => {
      const vision: VisionInsights = {
        keywords: ['mobile', 'payment', 'notification', 'analytics'],
        market: 'productivity-saas',
        competitors: [],
        opportunityScore: 8,
        viralPotential: true,
        followUpQuestions: [],
        rawVision: 'Test vision for mobile/payment/notification/analytics'
      };

      const projects = generator.generateProjects('serverless', [], vision);

      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'mobile' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'payment-service' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'notification-service' })
      );
      expect(projects).toContainEqual(
        expect.objectContaining({ name: 'analytics-service' })
      );
    });
  });

  describe('generateProjects - Deduplication', () => {
    it('should deduplicate projects by name', () => {
      // Microservices includes auth-service
      // HIPAA compliance also adds auth-service
      // Should only appear once
      const compliance: ComplianceStandard[] = [
        {
          id: 'HIPAA',
          name: 'HIPAA',
          dataTypes: ['healthcare'],
          regions: ['US'],
          teamImpact: [],
          costImpact: '$5000-10000/year',
          certificationRequired: true,
          auditFrequency: 'annual'
        }
      ];

      const projects = generator.generateProjects('microservices', compliance);

      const authServiceCount = projects.filter((p) => p.name === 'auth-service').length;
      expect(authServiceCount).toBe(1);
    });

    it('should deduplicate payment-service from vision and compliance', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'PCI-DSS',
          name: 'PCI-DSS',
          dataTypes: ['payment'],
          regions: ['global'],
          teamImpact: [],
          costImpact: '$3000-5000/year',
          certificationRequired: true,
          auditFrequency: 'quarterly'
        }
      ];

      const vision: VisionInsights = {
        keywords: ['payment', 'ecommerce'],
        market: 'e-commerce',
        competitors: [],
        opportunityScore: 7,
        viralPotential: false,
        followUpQuestions: [],
        rawVision: 'Test vision for payment/ecommerce'
      };

      const projects = generator.generateProjects('serverless', compliance, vision);

      const paymentServiceCount = projects.filter((p) => p.name === 'payment-service').length;
      expect(paymentServiceCount).toBe(1);
    });
  });

  describe('generateProjects - Complex scenarios', () => {
    it('should generate complete project list for HIPAA + mobile + analytics', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'HIPAA',
          name: 'HIPAA',
          dataTypes: ['healthcare'],
          regions: ['US'],
          teamImpact: [],
          costImpact: '$5000-10000/year',
          certificationRequired: true,
          auditFrequency: 'annual'
        }
      ];

      const vision: VisionInsights = {
        keywords: ['mobile', 'analytics', 'healthcare'],
        market: 'healthcare',
        competitors: [],
        opportunityScore: 9,
        viralPotential: false,
        followUpQuestions: [],
        rawVision: 'Test vision for mobile/analytics/healthcare'
      };

      const projects = generator.generateProjects('traditional-monolith', compliance, vision);

      // Architecture projects
      expect(projects).toContainEqual(expect.objectContaining({ name: 'frontend' }));
      expect(projects).toContainEqual(expect.objectContaining({ name: 'backend' }));

      // Compliance projects
      expect(projects).toContainEqual(expect.objectContaining({ name: 'auth-service' }));
      expect(projects).toContainEqual(expect.objectContaining({ name: 'data-service' }));
      expect(projects).toContainEqual(expect.objectContaining({ name: 'audit-logs' }));

      // Vision projects
      expect(projects).toContainEqual(expect.objectContaining({ name: 'mobile' }));
      expect(projects).toContainEqual(expect.objectContaining({ name: 'analytics-service' }));

      // Should have ~7 unique projects
      expect(projects.length).toBeGreaterThanOrEqual(7);
    });

    it('should generate minimal projects for simple serverless app', () => {
      const projects = generator.generateProjects('serverless', []);

      // Just frontend, backend-functions, api-gateway
      expect(projects.length).toBe(3);
      expect(projects).toContainEqual(expect.objectContaining({ name: 'frontend' }));
      expect(projects).toContainEqual(expect.objectContaining({ name: 'backend-functions' }));
      expect(projects).toContainEqual(expect.objectContaining({ name: 'api-gateway' }));
    });

    it('should include stack information in all projects', () => {
      const projects = generator.generateProjects('serverless', []);

      for (const project of projects) {
        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('description');
        expect(project).toHaveProperty('stack');
        expect(Array.isArray(project.stack)).toBe(true);
        expect(project.stack.length).toBeGreaterThan(0);
      }
    });
  });
});
