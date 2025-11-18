/**
 * Infrastructure Mapper (T-039)
 *
 * Maps architecture types to specific infrastructure components
 * based on requirements (compliance, scale, budget).
 */

import type { ArchitectureType } from './types.js';
import type { ComplianceStandard } from '../compliance/types.js';

/**
 * Infrastructure mapping for each architecture type
 */
const INFRASTRUCTURE_MATRIX: Record<ArchitectureType, string[]> = {
  serverless: [
    'AWS Lambda',
    'Supabase (PostgreSQL)',
    'Vercel',
    'S3',
    'CloudFront CDN',
    'API Gateway'
  ],
  'traditional-monolith': [
    'AWS ECS',
    'RDS (PostgreSQL)',
    'ElastiCache',
    'S3',
    'CloudFront'
  ],
  microservices: [
    'AWS EKS (Kubernetes)',
    'RDS',
    'DynamoDB',
    'S3',
    'CloudFront',
    'API Gateway',
    'Service Mesh (Istio)'
  ],
  'modular-monolith': ['AWS ECS', 'RDS', 'S3', 'CloudFront'],
  jamstack: ['Vercel/Netlify', 'Supabase', 'Cloudflare CDN', 'Vercel Storage'],
  hybrid: [
    'AWS ECS (monolith)',
    'AWS Lambda (services)',
    'RDS',
    'S3',
    'CloudFront',
    'API Gateway'
  ]
};

/**
 * Compliance-specific infrastructure additions
 */
const COMPLIANCE_INFRASTRUCTURE: Record<string, string[]> = {
  HIPAA: [
    'RDS (encrypted at rest + in transit)',
    'CloudTrail (audit logs)',
    'VPC (network isolation)',
    'AWS WAF (DDoS protection)',
    'S3 (encryption + versioning)'
  ],
  'PCI-DSS': [
    'Isolated VPC segment',
    'RDS (encrypted + quarterly scans)',
    'CloudTrail (all access logged)',
    'Security Groups (firewall rules)',
    'Quarterly vulnerability scans'
  ],
  FedRAMP: [
    'AWS GovCloud (FedRAMP-certified region)',
    'RDS (FedRAMP-certified)',
    'S3 (FedRAMP-certified)',
    'CloudTrail + SIEM (continuous monitoring)',
    'FIPS 140-2 encryption'
  ]
};

/**
 * Infrastructure Mapper Class
 */
export class InfrastructureMapper {
  /**
   * Get infrastructure components for architecture type
   *
   * @param architecture - Architecture type
   * @param complianceStandards - Detected compliance standards
   * @returns Infrastructure component list
   */
  public mapInfrastructure(
    architecture: ArchitectureType,
    complianceStandards: ComplianceStandard[] = []
  ): string[] {
    // Get base infrastructure for architecture
    const baseInfra = [...INFRASTRUCTURE_MATRIX[architecture]];

    // Add compliance-specific infrastructure
    const complianceInfra: string[] = [];
    for (const standard of complianceStandards) {
      if (COMPLIANCE_INFRASTRUCTURE[standard.id]) {
        complianceInfra.push(...COMPLIANCE_INFRASTRUCTURE[standard.id]);
      }
    }

    // Combine and deduplicate
    const allInfra = [...baseInfra, ...complianceInfra];
    return Array.from(new Set(allInfra));
  }

  /**
   * Get compliance-specific infrastructure modifications
   *
   * @param complianceStandards - Detected compliance standards
   * @returns Compliance infrastructure requirements
   */
  public getComplianceRequirements(
    complianceStandards: ComplianceStandard[]
  ): string[] {
    const requirements: string[] = [];

    for (const standard of complianceStandards) {
      if (COMPLIANCE_INFRASTRUCTURE[standard.id]) {
        requirements.push(...COMPLIANCE_INFRASTRUCTURE[standard.id]);
      }
    }

    return Array.from(new Set(requirements));
  }

  /**
   * Check if architecture supports compliance standard
   *
   * @param architecture - Architecture type
   * @param complianceId - Compliance standard ID
   * @returns True if architecture can support compliance
   */
  public supportsCompliance(
    architecture: ArchitectureType,
    complianceId: string
  ): boolean {
    // Serverless struggles with HIPAA/PCI (complex audit trails)
    if (
      architecture === 'serverless' &&
      (complianceId === 'HIPAA' || complianceId === 'PCI-DSS')
    ) {
      return false;
    }

    // JAMstack not suitable for heavy compliance
    if (
      architecture === 'jamstack' &&
      (complianceId === 'HIPAA' ||
        complianceId === 'PCI-DSS' ||
        complianceId === 'FedRAMP')
    ) {
      return false;
    }

    // Traditional and hybrid support all compliance
    return true;
  }
}

/**
 * Singleton instance
 */
export const infrastructureMapper = new InfrastructureMapper();
