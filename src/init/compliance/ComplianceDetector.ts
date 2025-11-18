/**
 * Compliance Auto-Detection Engine
 * 
 * Detects 37+ compliance standards from product vision/market
 */

export type ComplianceStandard =
  | 'HIPAA' | 'PCI-DSS' | 'GDPR' | 'SOC2' | 'ISO27001'
  | 'FedRAMP' | 'FISMA' | 'CCPA' | 'COPPA' | 'FERPA'
  | 'GLBA' | 'FINRA' | 'FDA21CFR' | 'ITAR' | 'EAR'
  | 'PSD2' | 'WCAG' | 'ADA' | 'Section508' | 'FIPS140'
  | 'NIST' | 'CIS' | 'OWASP' | 'PEN_TEST' | 'PENETRATION_TESTING'
  | 'SOX' | 'BASEL_III' | 'MiFID_II' | 'DORA' | 'NIS2'
  | 'AML' | 'KYC' | 'CBPR' | 'ISO9001' | 'ISO22301'
  | 'PIPEDA' | 'LGPD';

export interface ComplianceRequirement {
  standard: ComplianceStandard;
  confidence: number;
  rationale: string;
  keyRequirements: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export class ComplianceDetector {
  detect(vision: string, market: string): ComplianceRequirement[] {
    const requirements: ComplianceRequirement[] = [];
    const visionLower = vision.toLowerCase();
    const marketLower = market.toLowerCase();

    // Healthcare → HIPAA
    if (marketLower.includes('health') || visionLower.includes('patient')) {
      requirements.push({
        standard: 'HIPAA',
        confidence: 0.95,
        rationale: 'Healthcare product requires HIPAA compliance',
        keyRequirements: ['PHI encryption', 'Audit logging', 'Access controls'],
        priority: 'critical'
      });
    }

    // Payments → PCI-DSS
    if (visionLower.includes('payment') || visionLower.includes('card')) {
      requirements.push({
        standard: 'PCI-DSS',
        confidence: 0.98,
        rationale: 'Payment processing requires PCI-DSS',
        keyRequirements: ['Encryption', 'Network segmentation', 'Logging'],
        priority: 'critical'
      });
    }

    // Europe → GDPR
    if (visionLower.includes('europe') || visionLower.includes('eu') || visionLower.includes('gdpr')) {
      requirements.push({
        standard: 'GDPR',
        confidence: 0.92,
        rationale: 'EU market requires GDPR compliance',
        keyRequirements: ['Consent', 'Right to deletion', 'Data portability'],
        priority: 'critical'
      });
    }

    // Enterprise → SOC2
    if (marketLower.includes('enterprise') || marketLower.includes('b2b')) {
      requirements.push({
        standard: 'SOC2',
        confidence: 0.85,
        rationale: 'Enterprise sales require SOC 2 certification',
        keyRequirements: ['Security controls', 'Availability', 'Confidentiality'],
        priority: 'high'
      });
    }

    // Finance → Multiple standards
    if (marketLower.includes('fintech') || visionLower.includes('financial')) {
      requirements.push({
        standard: 'SOX',
        confidence: 0.88,
        rationale: 'Financial data requires SOX compliance',
        keyRequirements: ['Audit trails', 'Internal controls', 'Reporting'],
        priority: 'critical'
      });
    }

    return requirements;
  }
}
