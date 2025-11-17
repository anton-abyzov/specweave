import { describe, it, expect } from 'vitest';
import { InfrastructureMapper } from '../../../src/init/architecture/InfrastructureMapper.js';
import type { ArchitectureType } from '../../../src/init/architecture/types.js';
import type { ComplianceStandard } from '../../../src/init/compliance/types.js';

/**
 * Unit tests for InfrastructureMapper (T-039)
 *
 * Tests infrastructure component mapping for different architecture types
 * and compliance requirements.
 */

describe('InfrastructureMapper', () => {
  const mapper = new InfrastructureMapper();

  describe('Basic infrastructure mapping', () => {
    it('should map serverless infrastructure', () => {
      const infra = mapper.mapInfrastructure('serverless', []);

      expect(Array.isArray(infra)).toBe(true);
      expect(infra.length).toBeGreaterThan(0);
      expect(infra).toContain('AWS Lambda');
      expect(infra).toContain('Supabase (PostgreSQL)');
      expect(infra).toContain('Vercel');
      expect(infra).toContain('S3');
      expect(infra).toContain('CloudFront CDN');
      expect(infra).toContain('API Gateway');
    });

    it('should map traditional-monolith infrastructure', () => {
      const infra = mapper.mapInfrastructure('traditional-monolith', []);

      expect(Array.isArray(infra)).toBe(true);
      expect(infra).toContain('AWS ECS');
      expect(infra).toContain('RDS (PostgreSQL)');
      expect(infra).toContain('ElastiCache');
      expect(infra).toContain('S3');
      expect(infra).toContain('CloudFront');
    });

    it('should map microservices infrastructure', () => {
      const infra = mapper.mapInfrastructure('microservices', []);

      expect(Array.isArray(infra)).toBe(true);
      expect(infra).toContain('AWS EKS (Kubernetes)');
      expect(infra).toContain('RDS');
      expect(infra).toContain('DynamoDB');
      expect(infra).toContain('S3');
      expect(infra).toContain('CloudFront');
      expect(infra).toContain('API Gateway');
      expect(infra).toContain('Service Mesh (Istio)');
    });

    it('should map modular-monolith infrastructure', () => {
      const infra = mapper.mapInfrastructure('modular-monolith', []);

      expect(Array.isArray(infra)).toBe(true);
      expect(infra).toContain('AWS ECS');
      expect(infra).toContain('RDS');
      expect(infra).toContain('S3');
      expect(infra).toContain('CloudFront');
    });

    it('should map jamstack infrastructure', () => {
      const infra = mapper.mapInfrastructure('jamstack', []);

      expect(Array.isArray(infra)).toBe(true);
      expect(infra).toContain('Vercel/Netlify');
      expect(infra).toContain('Supabase');
      expect(infra).toContain('Cloudflare CDN');
      expect(infra).toContain('Vercel Storage');
    });

    it('should map hybrid infrastructure', () => {
      const infra = mapper.mapInfrastructure('hybrid', []);

      expect(Array.isArray(infra)).toBe(true);
      expect(infra).toContain('AWS ECS (monolith)');
      expect(infra).toContain('AWS Lambda (services)');
      expect(infra).toContain('RDS');
      expect(infra).toContain('S3');
      expect(infra).toContain('CloudFront');
      expect(infra).toContain('API Gateway');
    });
  });

  describe('Compliance-specific infrastructure (HIPAA)', () => {
    it('should add HIPAA infrastructure requirements', () => {
      const standard: ComplianceStandard = {
        id: 'HIPAA',
        name: 'Health Insurance Portability and Accountability Act',
        dataTypes: ['healthcare'],
        regions: ['US'],
        teamImpact: ['auth-team', 'data-team', 'ciso'],
        costImpact: '$50K-$200K/year',
        certificationRequired: true,
        auditFrequency: 'annual'
      };

      const infra = mapper.mapInfrastructure('traditional-monolith', [standard]);

      expect(infra).toContain('RDS (encrypted at rest + in transit)');
      expect(infra).toContain('CloudTrail (audit logs)');
      expect(infra).toContain('VPC (network isolation)');
      expect(infra).toContain('AWS WAF (DDoS protection)');
      expect(infra).toContain('S3 (encryption + versioning)');
    });

    it('should deduplicate infrastructure components', () => {
      const standard: ComplianceStandard = {
        id: 'HIPAA',
        name: 'Health Insurance Portability and Accountability Act',
        dataTypes: ['healthcare'],
        regions: ['US'],
        teamImpact: ['auth-team', 'data-team', 'ciso'],
        costImpact: '$50K-$200K/year',
        certificationRequired: true,
        auditFrequency: 'annual'
      };

      const infra = mapper.mapInfrastructure('traditional-monolith', [standard]);

      // Should not have duplicate S3 entries
      const s3Count = infra.filter((item) => item.includes('S3')).length;
      expect(s3Count).toBeGreaterThan(0);

      // Check uniqueness
      const uniqueInfra = Array.from(new Set(infra));
      expect(infra.length).toBe(uniqueInfra.length);
    });
  });

  describe('Compliance-specific infrastructure (PCI-DSS)', () => {
    it('should add PCI-DSS infrastructure requirements', () => {
      const standard: ComplianceStandard = {
        id: 'PCI-DSS',
        name: 'Payment Card Industry Data Security Standard',
        dataTypes: ['payment'],
        regions: ['Global'],
        teamImpact: ['auth-team', 'data-team', 'payments-team'],
        costImpact: '$30K-$100K/year',
        certificationRequired: true,
        auditFrequency: 'quarterly'
      };

      const infra = mapper.mapInfrastructure('traditional-monolith', [standard]);

      expect(infra).toContain('Isolated VPC segment');
      expect(infra).toContain('RDS (encrypted + quarterly scans)');
      expect(infra).toContain('CloudTrail (all access logged)');
      expect(infra).toContain('Security Groups (firewall rules)');
      expect(infra).toContain('Quarterly vulnerability scans');
    });
  });

  describe('Compliance-specific infrastructure (FedRAMP)', () => {
    it('should add FedRAMP infrastructure requirements', () => {
      const standard: ComplianceStandard = {
        id: 'FedRAMP',
        name: 'Federal Risk and Authorization Management Program',
        dataTypes: ['government'],
        regions: ['US'],
        teamImpact: ['auth-team', 'data-team', 'devsecops-team', 'ciso'],
        costImpact: '$500K-$2M/year',
        certificationRequired: true,
        auditFrequency: 'continuous'
      };

      const infra = mapper.mapInfrastructure('traditional-monolith', [standard]);

      expect(infra).toContain('AWS GovCloud (FedRAMP-certified region)');
      expect(infra).toContain('RDS (FedRAMP-certified)');
      expect(infra).toContain('S3 (FedRAMP-certified)');
      expect(infra).toContain('CloudTrail + SIEM (continuous monitoring)');
      expect(infra).toContain('FIPS 140-2 encryption');
    });
  });

  describe('Multiple compliance standards', () => {
    it('should combine infrastructure from multiple standards', () => {
      const hipaa: ComplianceStandard = {
        id: 'HIPAA',
        name: 'HIPAA',
        dataTypes: ['healthcare'],
        regions: ['US'],
        teamImpact: ['auth-team'],
        costImpact: '$50K/year',
        certificationRequired: true,
        auditFrequency: 'annual'
      };

      const pci: ComplianceStandard = {
        id: 'PCI-DSS',
        name: 'PCI-DSS',
        dataTypes: ['payment'],
        regions: ['Global'],
        teamImpact: ['payments-team'],
        costImpact: '$30K/year',
        certificationRequired: true,
        auditFrequency: 'quarterly'
      };

      const infra = mapper.mapInfrastructure('traditional-monolith', [hipaa, pci]);

      // Should contain components from both standards
      expect(infra).toContain('VPC (network isolation)');
      expect(infra).toContain('Isolated VPC segment');
      expect(infra).toContain('CloudTrail (audit logs)');
      expect(infra).toContain('CloudTrail (all access logged)');
    });

    it('should deduplicate common infrastructure across standards', () => {
      const hipaa: ComplianceStandard = {
        id: 'HIPAA',
        name: 'HIPAA',
        dataTypes: ['healthcare'],
        regions: ['US'],
        teamImpact: ['auth-team'],
        costImpact: '$50K/year',
        certificationRequired: true,
        auditFrequency: 'annual'
      };

      const pci: ComplianceStandard = {
        id: 'PCI-DSS',
        name: 'PCI-DSS',
        dataTypes: ['payment'],
        regions: ['Global'],
        teamImpact: ['payments-team'],
        costImpact: '$30K/year',
        certificationRequired: true,
        auditFrequency: 'quarterly'
      };

      const infra = mapper.mapInfrastructure('traditional-monolith', [hipaa, pci]);

      // Check uniqueness
      const uniqueInfra = Array.from(new Set(infra));
      expect(infra.length).toBe(uniqueInfra.length);
    });
  });

  describe('getComplianceRequirements', () => {
    it('should return HIPAA-specific requirements', () => {
      const standard: ComplianceStandard = {
        id: 'HIPAA',
        name: 'HIPAA',
        dataTypes: ['healthcare'],
        regions: ['US'],
        teamImpact: ['auth-team'],
        costImpact: '$50K/year',
        certificationRequired: true,
        auditFrequency: 'annual'
      };

      const requirements = mapper.getComplianceRequirements([standard]);

      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements).toContain('RDS (encrypted at rest + in transit)');
      expect(requirements).toContain('CloudTrail (audit logs)');
    });

    it('should return PCI-DSS-specific requirements', () => {
      const standard: ComplianceStandard = {
        id: 'PCI-DSS',
        name: 'PCI-DSS',
        dataTypes: ['payment'],
        regions: ['Global'],
        teamImpact: ['payments-team'],
        costImpact: '$30K/year',
        certificationRequired: true,
        auditFrequency: 'quarterly'
      };

      const requirements = mapper.getComplianceRequirements([standard]);

      expect(requirements).toContain('Isolated VPC segment');
      expect(requirements).toContain('Quarterly vulnerability scans');
    });

    it('should return empty array for unknown compliance standard', () => {
      const standard: ComplianceStandard = {
        id: 'UNKNOWN-STANDARD',
        name: 'Unknown',
        dataTypes: ['personal'],
        regions: ['Global'],
        teamImpact: [],
        costImpact: '$0',
        certificationRequired: false,
        auditFrequency: 'none'
      };

      const requirements = mapper.getComplianceRequirements([standard]);

      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBe(0);
    });

    it('should deduplicate requirements across multiple standards', () => {
      const hipaa: ComplianceStandard = {
        id: 'HIPAA',
        name: 'HIPAA',
        dataTypes: ['healthcare'],
        regions: ['US'],
        teamImpact: ['auth-team'],
        costImpact: '$50K/year',
        certificationRequired: true,
        auditFrequency: 'annual'
      };

      const pci: ComplianceStandard = {
        id: 'PCI-DSS',
        name: 'PCI-DSS',
        dataTypes: ['payment'],
        regions: ['Global'],
        teamImpact: ['payments-team'],
        costImpact: '$30K/year',
        certificationRequired: true,
        auditFrequency: 'quarterly'
      };

      const requirements = mapper.getComplianceRequirements([hipaa, pci]);

      const uniqueRequirements = Array.from(new Set(requirements));
      expect(requirements.length).toBe(uniqueRequirements.length);
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

    it('should reject jamstack for HIPAA', () => {
      const supports = mapper.supportsCompliance('jamstack', 'HIPAA');

      expect(supports).toBe(false);
    });

    it('should reject jamstack for PCI-DSS', () => {
      const supports = mapper.supportsCompliance('jamstack', 'PCI-DSS');

      expect(supports).toBe(false);
    });

    it('should reject jamstack for FedRAMP', () => {
      const supports = mapper.supportsCompliance('jamstack', 'FedRAMP');

      expect(supports).toBe(false);
    });

    it('should support traditional-monolith for HIPAA', () => {
      const supports = mapper.supportsCompliance('traditional-monolith', 'HIPAA');

      expect(supports).toBe(true);
    });

    it('should support traditional-monolith for PCI-DSS', () => {
      const supports = mapper.supportsCompliance('traditional-monolith', 'PCI-DSS');

      expect(supports).toBe(true);
    });

    it('should support traditional-monolith for FedRAMP', () => {
      const supports = mapper.supportsCompliance('traditional-monolith', 'FedRAMP');

      expect(supports).toBe(true);
    });

    it('should support microservices for all compliance standards', () => {
      expect(mapper.supportsCompliance('microservices', 'HIPAA')).toBe(true);
      expect(mapper.supportsCompliance('microservices', 'PCI-DSS')).toBe(true);
      expect(mapper.supportsCompliance('microservices', 'FedRAMP')).toBe(true);
    });

    it('should support hybrid for all compliance standards', () => {
      expect(mapper.supportsCompliance('hybrid', 'HIPAA')).toBe(true);
      expect(mapper.supportsCompliance('hybrid', 'PCI-DSS')).toBe(true);
      expect(mapper.supportsCompliance('hybrid', 'FedRAMP')).toBe(true);
    });

    it('should support modular-monolith for all compliance standards', () => {
      expect(mapper.supportsCompliance('modular-monolith', 'HIPAA')).toBe(true);
      expect(mapper.supportsCompliance('modular-monolith', 'PCI-DSS')).toBe(true);
      expect(mapper.supportsCompliance('modular-monolith', 'FedRAMP')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty compliance array', () => {
      const infra = mapper.mapInfrastructure('serverless', []);

      expect(Array.isArray(infra)).toBe(true);
      expect(infra.length).toBeGreaterThan(0);
    });

    it('should handle undefined compliance array', () => {
      const infra = mapper.mapInfrastructure('serverless', undefined as any);

      expect(Array.isArray(infra)).toBe(true);
      expect(infra.length).toBeGreaterThan(0);
    });

    it('should return unique infrastructure components', () => {
      const infra = mapper.mapInfrastructure('traditional-monolith', []);

      const uniqueInfra = Array.from(new Set(infra));
      expect(infra.length).toBe(uniqueInfra.length);
    });

    it('should handle compliance standards without infrastructure mappings', () => {
      const standard: ComplianceStandard = {
        id: 'GDPR',
        name: 'General Data Protection Regulation',
        dataTypes: ['personal'],
        regions: ['EU'],
        teamImpact: ['dpo'],
        costImpact: '$10K/year',
        certificationRequired: false,
        auditFrequency: 'none'
      };

      const infra = mapper.mapInfrastructure('serverless', [standard]);

      // Should still return base infrastructure
      expect(infra.length).toBeGreaterThan(0);
      expect(infra).toContain('AWS Lambda');
    });
  });

  describe('Infrastructure consistency', () => {
    it('should always include storage for all architectures', () => {
      const architectures: ArchitectureType[] = [
        'serverless',
        'traditional-monolith',
        'microservices',
        'modular-monolith',
        'jamstack',
        'hybrid'
      ];

      architectures.forEach((arch) => {
        const infra = mapper.mapInfrastructure(arch, []);
        const hasStorage = infra.some((item) => item.includes('S3') || item.includes('Storage'));
        expect(hasStorage).toBe(true);
      });
    });

    it('should always include CDN for all architectures', () => {
      const architectures: ArchitectureType[] = [
        'serverless',
        'traditional-monolith',
        'microservices',
        'modular-monolith',
        'jamstack',
        'hybrid'
      ];

      architectures.forEach((arch) => {
        const infra = mapper.mapInfrastructure(arch, []);
        const hasCDN = infra.some((item) => item.toLowerCase().includes('cdn') || item.toLowerCase().includes('cloudfront'));
        expect(hasCDN).toBe(true);
      });
    });
  });
});
