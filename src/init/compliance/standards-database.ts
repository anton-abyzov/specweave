/**
 * Compliance Standards Database
 *
 * Comprehensive database of 30+ compliance standards across:
 * - Healthcare (8 standards)
 * - Payment (6 standards)
 * - Privacy (10 standards)
 * - Government (7 standards)
 * - Education (2 standards)
 * - Financial (3 standards)
 * - Infrastructure (1 standard)
 *
 * All intelligence is encoded at spec-time based on official documentation.
 */

import { ComplianceStandard } from './types.js';

/**
 * Healthcare compliance standards (8 total)
 */
export const HEALTHCARE_STANDARDS: ComplianceStandard[] = [
  {
    id: 'HIPAA',
    name: 'Health Insurance Portability and Accountability Act',
    dataTypes: ['healthcare'],
    regions: ['US'],
    teamImpact: ['auth-team', 'data-team', 'devsecops-team'],
    costImpact: '$3K+/month minimum',
    certificationRequired: true,
    auditFrequency: 'annual',
    description: 'US federal law requiring safeguards for protected health information (PHI). Requires BAA agreements, encryption, access controls, and audit logs.',
    documentationUrl: 'https://www.hhs.gov/hipaa/index.html'
  },
  {
    id: 'HITRUST',
    name: 'Health Information Trust Alliance',
    dataTypes: ['healthcare'],
    regions: ['US', 'global'],
    teamImpact: ['auth-team', 'data-team', 'devsecops-team', 'ciso'],
    costImpact: '$5K+/month (certification $15K-$50K)',
    certificationRequired: true,
    auditFrequency: 'annual',
    description: 'Comprehensive security framework for healthcare. More stringent than HIPAA, often required by hospitals and payers.',
    documentationUrl: 'https://hitrustalliance.net/'
  },
  {
    id: 'FDA-21-CFR-Part-11',
    name: 'FDA 21 CFR Part 11 (Electronic Records)',
    dataTypes: ['healthcare'],
    regions: ['US'],
    teamImpact: ['data-team', 'compliance-team'],
    costImpact: '$2K+/month',
    certificationRequired: false,
    auditFrequency: 'continuous',
    description: 'FDA regulation for electronic records and signatures in pharmaceutical and medical device industries.',
    documentationUrl: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application'
  },
  {
    id: 'HL7-FHIR',
    name: 'HL7 Fast Healthcare Interoperability Resources',
    dataTypes: ['healthcare'],
    regions: ['global'],
    teamImpact: ['data-team'],
    costImpact: '$1K+/month (implementation)',
    certificationRequired: false,
    auditFrequency: 'none',
    description: 'Healthcare interoperability standard for exchanging electronic health records.',
    documentationUrl: 'https://www.hl7.org/fhir/'
  },
  {
    id: 'GDPR-Healthcare',
    name: 'GDPR (Healthcare-specific requirements)',
    dataTypes: ['healthcare', 'personal'],
    regions: ['EU'],
    teamImpact: ['data-team', 'dpo', 'privacy-engineering'],
    costImpact: '$2K+/month + DPO ($500-$1K/month)',
    certificationRequired: false,
    auditFrequency: 'continuous',
    description: 'GDPR with additional healthcare data protection requirements for EU patients.',
    documentationUrl: 'https://gdpr.eu/'
  },
  {
    id: 'PIPEDA-Healthcare',
    name: 'PIPEDA (Healthcare)',
    dataTypes: ['healthcare', 'personal'],
    regions: ['CA'],
    teamImpact: ['privacy-engineering'],
    costImpact: '$1K+/month',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'Canadian privacy law for health information.',
    documentationUrl: 'https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/'
  },
  {
    id: 'PHIPA',
    name: 'Personal Health Information Protection Act',
    dataTypes: ['healthcare'],
    regions: ['CA-ON'],
    teamImpact: ['privacy-engineering', 'data-team'],
    costImpact: '$1K+/month',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'Ontario (Canada) provincial law governing healthcare privacy.',
    documentationUrl: 'https://www.ontario.ca/laws/statute/04p03'
  },
  {
    id: 'LGPD-Healthcare',
    name: 'LGPD (Healthcare data)',
    dataTypes: ['healthcare', 'personal'],
    regions: ['BR'],
    teamImpact: ['privacy-engineering', 'dpo'],
    costImpact: '$1K+/month',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'Brazilian data protection law with specific healthcare provisions.',
    documentationUrl: 'https://iapp.org/resources/article/brazilian-data-protection-law-lgpd-english-translation/'
  }
];

/**
 * Payment compliance standards (6 total)
 */
export const PAYMENT_STANDARDS: ComplianceStandard[] = [
  {
    id: 'PCI-DSS',
    name: 'Payment Card Industry Data Security Standard',
    dataTypes: ['payment'],
    regions: ['global'],
    teamImpact: ['payments-team', 'devsecops-team', 'auth-team'],
    costImpact: '$15K+/month OR use Stripe ($0 + 2.9% + $0.30/txn)',
    certificationRequired: true,
    auditFrequency: 'annual',
    description: 'Security standard for organizations handling credit card data. Level 1-4 based on transaction volume.',
    documentationUrl: 'https://www.pcisecuritystandards.org/'
  },
  {
    id: 'PSD2',
    name: 'Payment Services Directive 2',
    dataTypes: ['payment', 'financial'],
    regions: ['EU'],
    teamImpact: ['payments-team', 'auth-team'],
    costImpact: '$3K+/month',
    certificationRequired: true,
    auditFrequency: 'annual',
    description: 'EU regulation for electronic payment services and strong customer authentication (SCA).',
    documentationUrl: 'https://ec.europa.eu/info/law/payment-services-psd-2-directive-eu-2015-2366_en'
  },
  {
    id: 'SOX',
    name: 'Sarbanes-Oxley Act',
    dataTypes: ['financial'],
    regions: ['US'],
    teamImpact: ['compliance-team', 'devsecops-team'],
    costImpact: '$5K+/month (public companies)',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'US federal law for financial reporting accuracy in public companies.',
    documentationUrl: 'https://www.sec.gov/spotlight/sarbanes-oxley.htm'
  },
  {
    id: 'GLBA',
    name: 'Gramm-Leach-Bliley Act',
    dataTypes: ['financial', 'personal'],
    regions: ['US'],
    teamImpact: ['privacy-engineering', 'data-team'],
    costImpact: '$2K+/month',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'US law requiring financial institutions to protect consumer financial information.',
    documentationUrl: 'https://www.ftc.gov/business-guidance/privacy-security/gramm-leach-bliley-act'
  },
  {
    id: 'FINRA',
    name: 'Financial Industry Regulatory Authority',
    dataTypes: ['financial'],
    regions: ['US'],
    teamImpact: ['compliance-team', 'data-team'],
    costImpact: '$3K+/month',
    certificationRequired: true,
    auditFrequency: 'continuous',
    description: 'Self-regulatory organization for US brokerage firms and exchange markets.',
    documentationUrl: 'https://www.finra.org/'
  },
  {
    id: 'AML-KYC',
    name: 'Anti-Money Laundering / Know Your Customer',
    dataTypes: ['financial', 'personal'],
    regions: ['global'],
    teamImpact: ['compliance-team', 'data-team'],
    costImpact: '$2K+/month',
    certificationRequired: false,
    auditFrequency: 'continuous',
    description: 'Global financial regulations requiring customer identity verification.',
    documentationUrl: 'https://www.fincen.gov/'
  }
];

/**
 * Privacy compliance standards (10 total)
 */
export const PRIVACY_STANDARDS: ComplianceStandard[] = [
  {
    id: 'GDPR',
    name: 'General Data Protection Regulation',
    dataTypes: ['personal'],
    regions: ['EU'],
    teamImpact: ['dpo', 'privacy-engineering'],
    costImpact: '$500-$1K/month (DPO) + implementation',
    certificationRequired: false,
    auditFrequency: 'continuous',
    description: 'EU data protection law requiring consent, data portability, right to be forgotten.',
    documentationUrl: 'https://gdpr.eu/'
  },
  {
    id: 'CCPA',
    name: 'California Consumer Privacy Act',
    dataTypes: ['personal'],
    regions: ['US-CA'],
    teamImpact: ['privacy-engineering'],
    costImpact: '$500+/month',
    certificationRequired: false,
    auditFrequency: 'continuous',
    description: 'California privacy law requiring disclosure, deletion, and opt-out rights.',
    documentationUrl: 'https://oag.ca.gov/privacy/ccpa'
  },
  {
    id: 'CPRA',
    name: 'California Privacy Rights Act',
    dataTypes: ['personal', 'sensitive'],
    regions: ['US-CA'],
    teamImpact: ['privacy-engineering', 'dpo'],
    costImpact: '$1K+/month',
    certificationRequired: false,
    auditFrequency: 'continuous',
    description: 'Enhanced California privacy law (CCPA 2.0) with additional sensitive data protections.',
    documentationUrl: 'https://cppa.ca.gov/'
  },
  {
    id: 'PIPEDA',
    name: 'Personal Information Protection and Electronic Documents Act',
    dataTypes: ['personal'],
    regions: ['CA'],
    teamImpact: ['privacy-engineering'],
    costImpact: '$500+/month',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'Canadian federal privacy law for commercial activities.',
    documentationUrl: 'https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/'
  },
  {
    id: 'LGPD',
    name: 'Lei Geral de Proteção de Dados',
    dataTypes: ['personal'],
    regions: ['BR'],
    teamImpact: ['dpo', 'privacy-engineering'],
    costImpact: '$500+/month',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'Brazilian general data protection law (similar to GDPR).',
    documentationUrl: 'https://iapp.org/resources/article/brazilian-data-protection-law-lgpd-english-translation/'
  },
  {
    id: 'PDPA-Singapore',
    name: 'Personal Data Protection Act (Singapore)',
    dataTypes: ['personal'],
    regions: ['SG'],
    teamImpact: ['privacy-engineering'],
    costImpact: '$500+/month',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'Singapore personal data protection law.',
    documentationUrl: 'https://www.pdpc.gov.sg/'
  },
  {
    id: 'PDPA-Thailand',
    name: 'Personal Data Protection Act (Thailand)',
    dataTypes: ['personal'],
    regions: ['TH'],
    teamImpact: ['privacy-engineering'],
    costImpact: '$500+/month',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'Thailand personal data protection law.',
    documentationUrl: 'https://www.pdpc.or.th/'
  },
  {
    id: 'POPIA',
    name: 'Protection of Personal Information Act',
    dataTypes: ['personal'],
    regions: ['ZA'],
    teamImpact: ['privacy-engineering'],
    costImpact: '$500+/month',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'South African data protection law.',
    documentationUrl: 'https://popia.co.za/'
  },
  {
    id: 'DPA-UK',
    name: 'UK Data Protection Act',
    dataTypes: ['personal'],
    regions: ['UK'],
    teamImpact: ['dpo', 'privacy-engineering'],
    costImpact: '$500+/month',
    certificationRequired: false,
    auditFrequency: 'continuous',
    description: 'UK data protection law (GDPR equivalent post-Brexit).',
    documentationUrl: 'https://www.gov.uk/data-protection'
  },
  {
    id: 'APPI',
    name: 'Act on the Protection of Personal Information',
    dataTypes: ['personal'],
    regions: ['JP'],
    teamImpact: ['privacy-engineering'],
    costImpact: '$500+/month',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'Japanese personal data protection law.',
    documentationUrl: 'https://www.ppc.go.jp/en/'
  }
];

/**
 * Government compliance standards (7 total)
 */
export const GOVERNMENT_STANDARDS: ComplianceStandard[] = [
  {
    id: 'FedRAMP',
    name: 'Federal Risk and Authorization Management Program',
    dataTypes: ['government'],
    regions: ['US'],
    teamImpact: ['devsecops-team', 'ciso', 'compliance-team'],
    costImpact: '$50K+/month (certification $250K-$5M)',
    certificationRequired: true,
    auditFrequency: 'continuous',
    description: 'US government cloud security authorization program. Required for cloud services used by federal agencies.',
    documentationUrl: 'https://www.fedramp.gov/'
  },
  {
    id: 'FISMA',
    name: 'Federal Information Security Management Act',
    dataTypes: ['government'],
    regions: ['US'],
    teamImpact: ['devsecops-team', 'ciso'],
    costImpact: '$10K+/month',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'US federal law for information security in government systems.',
    documentationUrl: 'https://csrc.nist.gov/topics/laws-and-regulations/laws/fisma'
  },
  {
    id: 'CMMC',
    name: 'Cybersecurity Maturity Model Certification',
    dataTypes: ['government'],
    regions: ['US-DOD'],
    teamImpact: ['devsecops-team', 'ciso', 'compliance-team'],
    costImpact: '$20K+/month (certification $15K-$100K)',
    certificationRequired: true,
    auditFrequency: 'annual',
    description: 'DoD cybersecurity certification for defense contractors.',
    documentationUrl: 'https://dodcio.defense.gov/CMMC/'
  },
  {
    id: 'ITAR',
    name: 'International Traffic in Arms Regulations',
    dataTypes: ['government'],
    regions: ['US'],
    teamImpact: ['compliance-team', 'data-team'],
    costImpact: '$5K+/month',
    certificationRequired: true,
    auditFrequency: 'continuous',
    description: 'US export control for defense-related articles and services.',
    documentationUrl: 'https://www.pmddtc.state.gov/ddtc_public'
  },
  {
    id: 'StateRAMP',
    name: 'State Risk and Authorization Management Program',
    dataTypes: ['government'],
    regions: ['US-State'],
    teamImpact: ['devsecops-team', 'ciso'],
    costImpact: '$10K+/month',
    certificationRequired: true,
    auditFrequency: 'annual',
    description: 'State-level FedRAMP equivalent for state and local government cloud services.',
    documentationUrl: 'https://www.stateramp.org/'
  },
  {
    id: 'NIST-800-171',
    name: 'NIST Special Publication 800-171',
    dataTypes: ['government'],
    regions: ['US'],
    teamImpact: ['devsecops-team'],
    costImpact: '$3K+/month',
    certificationRequired: false,
    auditFrequency: 'continuous',
    description: 'NIST framework for protecting Controlled Unclassified Information (CUI).',
    documentationUrl: 'https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final'
  },
  {
    id: 'CJIS',
    name: 'Criminal Justice Information Services Security Policy',
    dataTypes: ['government'],
    regions: ['US'],
    teamImpact: ['devsecops-team', 'auth-team'],
    costImpact: '$5K+/month',
    certificationRequired: true,
    auditFrequency: 'annual',
    description: 'FBI security policy for criminal justice information systems.',
    documentationUrl: 'https://www.fbi.gov/services/cjis/cjis-security-policy-resource-center'
  }
];

/**
 * Education compliance standards (2 total)
 */
export const EDUCATION_STANDARDS: ComplianceStandard[] = [
  {
    id: 'FERPA',
    name: 'Family Educational Rights and Privacy Act',
    dataTypes: ['student', 'personal'],
    regions: ['US'],
    teamImpact: ['privacy-engineering', 'data-team'],
    costImpact: '$1K+/month',
    certificationRequired: false,
    auditFrequency: 'annual',
    description: 'US federal law protecting student education records.',
    documentationUrl: 'https://www2.ed.gov/policy/gen/guid/fpco/ferpa/index.html'
  },
  {
    id: 'COPPA',
    name: "Children's Online Privacy Protection Act",
    dataTypes: ['children', 'personal'],
    regions: ['US'],
    teamImpact: ['privacy-engineering', 'compliance-team'],
    costImpact: '$1K+/month',
    certificationRequired: false,
    auditFrequency: 'continuous',
    description: 'US law protecting children under 13 online. Requires parental consent.',
    documentationUrl: 'https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa'
  }
];

/**
 * Financial/security compliance standards (3 total)
 */
export const FINANCIAL_SECURITY_STANDARDS: ComplianceStandard[] = [
  {
    id: 'SOC2',
    name: 'Service Organization Control 2',
    dataTypes: ['personal', 'financial'],
    regions: ['global'],
    teamImpact: ['devsecops-team', 'ciso'],
    costImpact: '$3K+/month (audit $20K-$100K)',
    certificationRequired: true,
    auditFrequency: 'annual',
    description: 'AICPA security framework for service providers. Type I (design) or Type II (effectiveness).',
    documentationUrl: 'https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report.html'
  },
  {
    id: 'ISO-27001',
    name: 'ISO/IEC 27001 Information Security Management',
    dataTypes: ['personal'],
    regions: ['global'],
    teamImpact: ['devsecops-team', 'ciso'],
    costImpact: '$5K+/month (certification $15K-$50K)',
    certificationRequired: true,
    auditFrequency: 'annual',
    description: 'International standard for information security management systems (ISMS).',
    documentationUrl: 'https://www.iso.org/isoiec-27001-information-security.html'
  },
  {
    id: 'ISO-27701',
    name: 'ISO/IEC 27701 Privacy Information Management',
    dataTypes: ['personal'],
    regions: ['global'],
    teamImpact: ['privacy-engineering', 'dpo', 'ciso'],
    costImpact: '$5K+/month (certification $20K-$60K)',
    certificationRequired: true,
    auditFrequency: 'annual',
    description: 'Extension of ISO 27001 for privacy information management.',
    documentationUrl: 'https://www.iso.org/standard/71670.html'
  }
];

/**
 * Infrastructure compliance standards (1 total)
 */
export const INFRASTRUCTURE_STANDARDS: ComplianceStandard[] = [
  {
    id: 'NERC-CIP',
    name: 'NERC Critical Infrastructure Protection',
    dataTypes: ['sensitive'],
    regions: ['US'],
    teamImpact: ['devsecops-team', 'ciso', 'compliance-team'],
    costImpact: '$10K+/month',
    certificationRequired: true,
    auditFrequency: 'continuous',
    description: 'Cybersecurity standards for North American bulk electric system.',
    documentationUrl: 'https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx'
  }
];

/**
 * All compliance standards (37 total)
 */
export const ALL_COMPLIANCE_STANDARDS: ComplianceStandard[] = [
  ...HEALTHCARE_STANDARDS,
  ...PAYMENT_STANDARDS,
  ...PRIVACY_STANDARDS,
  ...GOVERNMENT_STANDARDS,
  ...EDUCATION_STANDARDS,
  ...FINANCIAL_SECURITY_STANDARDS,
  ...INFRASTRUCTURE_STANDARDS
];
