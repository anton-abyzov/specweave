import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for InfrastructureMapper (T-039)
 */

import { InfrastructureMapper } from '../../../src/init/architecture/InfrastructureMapper.js';
import type { ComplianceStandard } from '../../../src/init/compliance/types.js';

describe('InfrastructureMapper', () => {
  const mapper = new InfrastructureMapper();

  describe('mapInfrastructure', () => {
    it('should map serverless infrastructure', () => {
      const infra = mapper.mapInfrastructure('serverless', []);

      expect(infra).toContain('AWS Lambda');
      expect(infra).toContain('Supabase (PostgreSQL)');
      expect(infra).toContain('Vercel');
      expect(infra).toContain('S3');
      expect(infra).toContain('CloudFront CDN');
      expect(infra).toContain('API Gateway');
    });

    it('should map traditional monolith infrastructure', () => {
      const infra = mapper.mapInfrastructure('traditional-monolith', []);

      expect(infra).toContain('AWS ECS');
      expect(infra).toContain('RDS (PostgreSQL)');
      expect(infra).toContain('ElastiCache');
      expect(infra).toContain('S3');
      expect(infra).toContain('CloudFront');
    });

    it('should map microservices infrastructure', () => {
      const infra = mapper.mapInfrastructure('microservices', []);

      expect(infra).toContain('AWS EKS (Kubernetes)');
      expect(infra).toContain('RDS');
      expect(infra).toContain('DynamoDB');
      expect(infra).toContain('API Gateway');
      expect(infra).toContain('Service Mesh (Istio)');
    });

    it('should map JAMstack infrastructure', () => {
      const infra = mapper.mapInfrastructure('jamstack', []);

      expect(infra).toContain('Vercel/Netlify');
      expect(infra).toContain('Supabase');
      expect(infra).toContain('Cloudflare CDN');
    });

    it('should add HIPAA-specific infrastructure', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'HIPAA',
          name: 'Health Insurance Portability and Accountability Act',
          dataTypes: ['healthcare'],
          regions: ['US'],
          teamImpact: ['auth-team', 'data-team'],
          costImpact: '$5000-10000/year',
          certificationRequired: true,
          auditFrequency: 'annual'
        }
      ];

      const infra = mapper.mapInfrastructure('traditional-monolith', compliance);

      expect(infra).toContain('RDS (encrypted at rest + in transit)');
      expect(infra).toContain('CloudTrail (audit logs)');
      expect(infra).toContain('VPC (network isolation)');
      expect(infra).toContain('AWS WAF (DDoS protection)');
    });

    it('should add PCI-DSS-specific infrastructure', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'PCI-DSS',
          name: 'Payment Card Industry Data Security Standard',
          dataTypes: ['payment'],
          regions: ['global'],
          teamImpact: ['payments-team'],
          costImpact: '$3000-5000/year',
          certificationRequired: true,
          auditFrequency: 'quarterly'
        }
      ];

      const infra = mapper.mapInfrastructure('traditional-monolith', compliance);

      expect(infra).toContain('Isolated VPC segment');
      expect(infra).toContain('CloudTrail (all access logged)');
      expect(infra).toContain('Security Groups (firewall rules)');
      expect(infra).toContain('Quarterly vulnerability scans');
    });

    it('should add FedRAMP-specific infrastructure', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'FedRAMP',
          name: 'Federal Risk and Authorization Management Program',
          dataTypes: ['government'],
          regions: ['US'],
          teamImpact: ['devsecops-team'],
          costImpact: '$20000-50000/year',
          certificationRequired: true,
          auditFrequency: 'continuous'
        }
      ];

      const infra = mapper.mapInfrastructure('traditional-monolith', compliance);

      expect(infra).toContain('AWS GovCloud (FedRAMP-certified region)');
      expect(infra).toContain('FIPS 140-2 encryption');
      expect(infra).toContain('CloudTrail + SIEM (continuous monitoring)');
    });

    it('should deduplicate infrastructure components', () => {
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

      const infra = mapper.mapInfrastructure('traditional-monolith', compliance);

      // CloudTrail appears in both HIPAA and base traditional - should only appear once
      const cloudTrailCount = infra.filter((i) => i.includes('CloudTrail')).length;
      expect(cloudTrailCount).toBe(1);
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

      const infra = mapper.mapInfrastructure('traditional-monolith', compliance);

      // Should include infrastructure from both standards
      expect(infra).toContain('VPC (network isolation)'); // HIPAA
      expect(infra).toContain('Quarterly vulnerability scans'); // PCI-DSS
    });
  });

  describe('getComplianceRequirements', () => {
    it('should return HIPAA requirements', () => {
      const compliance: ComplianceStandard[] = [
        {
          id: 'HIPAA',
          name: 'HIPAA',
          dataTypes: ['healthcare'],
          regions: ['US'],
          teamImpact: [],
          certificationRequired: true,
          auditFrequency: 'annual',
          costImpact: 'medium'
        }
      ];

      const requirements = mapper.getComplianceRequirements(compliance);

      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements).toContain('RDS (encrypted at rest + in transit)');
      expect(requirements).toContain('CloudTrail (audit logs)');
    });

    it('should return empty array for no compliance', () => {
      const requirements = mapper.getComplianceRequirements([]);
      expect(requirements).toEqual([]);
    });
  });

  describe('supportsCompliance', () => {
    it('should reject serverless for HIPAA', () => {
      const supports = mapper.supportsCompliance('serverless', 'HIPAA');
      expect(supports).toBe(false);
    });

    it('should reject serverless for PCI-DSS', () => {
      const supports = mapper.supportsCompliance('serverless', 'PCI-DSS');
      expect(supports).toBe(false);
    });

    it('should reject JAMstack for HIPAA', () => {
      const supports = mapper.supportsCompliance('jamstack', 'HIPAA');
      expect(supports).toBe(false);
    });

    it('should reject JAMstack for PCI-DSS', () => {
      const supports = mapper.supportsCompliance('jamstack', 'PCI-DSS');
      expect(supports).toBe(false);
    });

    it('should reject JAMstack for FedRAMP', () => {
      const supports = mapper.supportsCompliance('jamstack', 'FedRAMP');
      expect(supports).toBe(false);
    });

    it('should accept traditional-monolith for all compliance', () => {
      expect(mapper.supportsCompliance('traditional-monolith', 'HIPAA')).toBe(true);
      expect(mapper.supportsCompliance('traditional-monolith', 'PCI-DSS')).toBe(true);
      expect(mapper.supportsCompliance('traditional-monolith', 'FedRAMP')).toBe(true);
      expect(mapper.supportsCompliance('traditional-monolith', 'SOC2')).toBe(true);
    });

    it('should accept hybrid for all compliance', () => {
      expect(mapper.supportsCompliance('hybrid', 'HIPAA')).toBe(true);
      expect(mapper.supportsCompliance('hybrid', 'PCI-DSS')).toBe(true);
      expect(mapper.supportsCompliance('hybrid', 'FedRAMP')).toBe(true);
    });

    it('should accept microservices for all compliance', () => {
      expect(mapper.supportsCompliance('microservices', 'HIPAA')).toBe(true);
      expect(mapper.supportsCompliance('microservices', 'PCI-DSS')).toBe(true);
    });

    it('should accept modular-monolith for all compliance', () => {
      expect(mapper.supportsCompliance('modular-monolith', 'HIPAA')).toBe(true);
      expect(mapper.supportsCompliance('modular-monolith', 'PCI-DSS')).toBe(true);
    });
  });
});
