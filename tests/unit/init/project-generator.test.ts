import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for ProjectGenerator (T-042)
 *
 * Tests project generation based on architecture, compliance, and vision
 */

import { describe, it, expect } from 'vitest';
import { ProjectGenerator } from '../../../src/init/architecture/ProjectGenerator.js';
import type { ArchitectureType } from '../../../src/init/architecture/types.js';
import type { ComplianceStandard } from '../../../src/init/compliance/types.js';
import type { VisionInsights } from '../../../src/init/research/types.js';

describe('ProjectGenerator', () => {
  const generator = new ProjectGenerator();

  describe('T-042: Project generation from architecture', () => {
    it('should generate serverless projects', () => {
      const projects = generator.generateProjects('serverless' as ArchitectureType);

      expect(projects).toBeDefined();
      expect(projects.length).toBeGreaterThan(0);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).toContain('frontend');
      expect(projectNames).toContain('backend-functions');
      expect(projectNames).toContain('api-gateway');
    });

    it('should generate traditional monolith projects', () => {
      const projects = generator.generateProjects('traditional-monolith' as ArchitectureType);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).toContain('frontend');
      expect(projectNames).toContain('backend');
    });

    it('should generate microservices projects', () => {
      const projects = generator.generateProjects('microservices' as ArchitectureType);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).toContain('frontend');
      expect(projectNames).toContain('api-gateway');
      expect(projectNames).toContain('user-service');
      expect(projectNames).toContain('auth-service');
    });

    it('should generate JAMstack projects', () => {
      const projects = generator.generateProjects('jamstack' as ArchitectureType);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).toContain('frontend');
      expect(projectNames).toContain('cms');
      expect(projectNames).toContain('backend-functions');
    });

    it('should generate hybrid projects', () => {
      const projects = generator.generateProjects('hybrid' as ArchitectureType);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).toContain('frontend');
      expect(projectNames).toContain('backend-monolith');
      expect(projectNames).toContain('backend-functions');
    });
  });

  describe('HIPAA compliance projects', () => {
    it('should add auth-service for HIPAA', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'HIPAA',
          name: 'HIPAA',
          dataTypes: [],
          regions: ['US'],
          teamImpact: [],
          costImpact: 'high',
          certificationRequired: true,
          auditFrequency: 'annual'
        }
      ];

      const projects = generator.generateProjects('traditional-monolith' as ArchitectureType, compliance);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).toContain('auth-service');
      expect(projectNames).toContain('data-service');
      expect(projectNames).toContain('audit-logs');
    });

    it('should include HIPAA-specific stack requirements', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'HIPAA',
          name: 'HIPAA',
          dataTypes: [],
          regions: ['US'],
          teamImpact: [],
          costImpact: 'high',
          certificationRequired: true,
          auditFrequency: 'annual'
        }
      ];

      const projects = generator.generateProjects('traditional-monolith' as ArchitectureType, compliance);

      const authService = projects.find(p => p.name === 'auth-service');
      expect(authService).toBeDefined();
      expect(authService?.description.toLowerCase()).toContain('hipaa');

      const dataService = projects.find(p => p.name === 'data-service');
      expect(dataService).toBeDefined();
      expect(dataService?.description.toLowerCase()).toContain('hipaa');
    });
  });

  describe('PCI-DSS compliance projects', () => {
    it('should add payment-service for PCI-DSS', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'PCI-DSS',
          name: 'PCI-DSS',
          dataTypes: [],
          regions: [],
          teamImpact: [],
          costImpact: 'high',
          certificationRequired: true,
          auditFrequency: 'quarterly'
        }
      ];

      const projects = generator.generateProjects('traditional-monolith' as ArchitectureType, compliance);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).toContain('payment-service');
    });

    it('should include PCI-DSS stack requirements', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'PCI-DSS',
          name: 'PCI-DSS',
          dataTypes: [],
          regions: [],
          teamImpact: [],
          costImpact: 'high',
          certificationRequired: true,
          auditFrequency: 'quarterly'
        }
      ];

      const projects = generator.generateProjects('serverless' as ArchitectureType, compliance);

      const paymentService = projects.find(p => p.name === 'payment-service');
      expect(paymentService).toBeDefined();
      expect(paymentService?.stack.some(s => s.includes('Stripe') || s.includes('PCI'))).toBe(true);
    });
  });

  describe('Vision-based projects', () => {
    it('should add mobile project for mobile keywords', () => {
      const vision: VisionInsights = {
        keywords: ['mobile', 'app', 'ios'],
        market: 'consumer-b2c',
        competitors: [],
        opportunityScore: 8,
        viralPotential: true,
        followUpQuestions: []
,
        rawVision: 'Test vision text'
      };

      const projects = generator.generateProjects('serverless' as ArchitectureType, [], vision);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).toContain('mobile');

      const mobileProject = projects.find(p => p.name === 'mobile');
      expect(mobileProject?.stack).toContain('React Native');
    });

    it('should add payment-service for ecommerce keywords', () => {
      const vision: VisionInsights = {
        keywords: ['ecommerce', 'shopping', 'payment'],
        market: 'e-commerce',
        competitors: [],
        opportunityScore: 7,
        viralPotential: false,
        followUpQuestions: []
,
        rawVision: 'Test vision text'
      };

      const projects = generator.generateProjects('traditional-monolith' as ArchitectureType, [], vision);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).toContain('payment-service');
    });

    it('should add notification-service for messaging keywords', () => {
      const vision: VisionInsights = {
        keywords: ['notification', 'messaging', 'email'],
        market: 'productivity-saas',
        competitors: [],
        opportunityScore: 6,
        viralPotential: false,
        followUpQuestions: []
,
        rawVision: 'Test vision text'
      };

      const projects = generator.generateProjects('microservices' as ArchitectureType, [], vision);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).toContain('notification-service');

      const notificationService = projects.find(p => p.name === 'notification-service');
      expect(notificationService?.stack.some(s => s.includes('SendGrid') || s.includes('SES'))).toBe(true);
    });

    it('should add analytics-service for ML/analytics keywords', () => {
      const vision: VisionInsights = {
        keywords: ['analytics', 'ml', 'ai'],
        market: 'ai-ml',
        competitors: [],
        opportunityScore: 9,
        viralPotential: false,
        followUpQuestions: []
,
        rawVision: 'Test vision text'
      };

      const projects = generator.generateProjects('hybrid' as ArchitectureType, [], vision);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).toContain('analytics-service');

      const analyticsService = projects.find(p => p.name === 'analytics-service');
      expect(analyticsService?.stack).toContain('Python');
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate projects by name', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'PCI-DSS',
          name: 'PCI-DSS',
          dataTypes: [],
          regions: [],
          teamImpact: [],
          costImpact: 'high',
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
        followUpQuestions: []
,
        rawVision: 'Test vision text'
      };

      // Both compliance and vision would add payment-service
      const projects = generator.generateProjects('serverless' as ArchitectureType, compliance, vision);

      const paymentServices = projects.filter(p => p.name === 'payment-service');
      expect(paymentServices).toHaveLength(1);
    });

    it('should keep first occurrence when deduplicating', () => {
      const vision: VisionInsights = {
        keywords: ['mobile', 'payment'],
        market: 'e-commerce',
        competitors: [],
        opportunityScore: 8,
        viralPotential: true,
        followUpQuestions: []
,
        rawVision: 'Test vision text'
      };

      const projects = generator.generateProjects('microservices' as ArchitectureType, [], vision);

      // Ensure unique project names
      const projectNames = projects.map(p => p.name);
      const uniqueNames = new Set(projectNames);
      expect(projectNames.length).toBe(uniqueNames.size);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty compliance array', () => {
      const projects = generator.generateProjects('serverless' as ArchitectureType, []);

      expect(projects.length).toBeGreaterThan(0);
      expect(projects.map(p => p.name)).toContain('frontend');
    });

    it('should handle undefined vision', () => {
      const projects = generator.generateProjects('traditional-monolith' as ArchitectureType);

      expect(projects.length).toBeGreaterThan(0);
      expect(projects.map(p => p.name)).toContain('frontend');
      expect(projects.map(p => p.name)).toContain('backend');
    });

    it('should skip frontend for API-only projects', () => {
      const vision: VisionInsights = {
        keywords: ['api-only', 'backend'],
        market: 'productivity-saas',
        competitors: [],
        opportunityScore: 7,
        viralPotential: false,
        followUpQuestions: []
,
        rawVision: 'Test vision text'
      };

      const projects = generator.generateProjects('serverless' as ArchitectureType, [], vision);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).not.toContain('frontend');
    });

    it('should handle multiple compliance standards', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'HIPAA',
          name: 'HIPAA',
          dataTypes: [],
          regions: ['US'],
          teamImpact: [],
          costImpact: 'high',
          certificationRequired: true,
          auditFrequency: 'annual'
        },
        {
          id: 'PCI-DSS',
          name: 'PCI-DSS',
          dataTypes: [],
          regions: [],
          teamImpact: [],
          costImpact: 'high',
          certificationRequired: true,
          auditFrequency: 'quarterly'
        }
      ];

      const projects = generator.generateProjects('traditional-monolith' as ArchitectureType, compliance);

      const projectNames = projects.map(p => p.name);
      expect(projectNames).toContain('auth-service');
      expect(projectNames).toContain('data-service');
      expect(projectNames).toContain('audit-logs');
      expect(projectNames).toContain('payment-service');
    });
  });

  describe('Project structure', () => {
    it('should include name, description, and stack for each project', () => {
      const projects = generator.generateProjects('serverless' as ArchitectureType);

      projects.forEach(project => {
        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('description');
        expect(project).toHaveProperty('stack');

        expect(typeof project.name).toBe('string');
        expect(typeof project.description).toBe('string');
        expect(Array.isArray(project.stack)).toBe(true);
        expect(project.stack.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty descriptions', () => {
      const projects = generator.generateProjects('microservices' as ArchitectureType);

      projects.forEach(project => {
        expect(project.description.length).toBeGreaterThan(0);
      });
    });

    it('should have valid stack arrays', () => {
      const projects = generator.generateProjects('hybrid' as ArchitectureType);

      projects.forEach(project => {
        expect(Array.isArray(project.stack)).toBe(true);
        expect(project.stack.length).toBeGreaterThan(0);
        project.stack.forEach(tech => {
          expect(typeof tech).toBe('string');
          expect(tech.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
