/**
 * Types for Compliance Standards Detection
 *
 * Defines data types, compliance standards, team requirements,
 * and all related types for the compliance detection system.
 */

import { z } from 'zod';

/**
 * Data types that trigger compliance requirements
 */
export type DataType =
  | 'healthcare'      // PHI (Protected Health Information)
  | 'payment'         // PCI (Payment Card Industry)
  | 'personal'        // PII (Personally Identifiable Information)
  | 'government'      // CUI (Controlled Unclassified Information)
  | 'student'         // Educational records
  | 'financial'       // Financial services data
  | 'biometric'       // Biometric identifiers
  | 'location'        // GPS/location data
  | 'children'        // Data from users under 13
  | 'sensitive';      // Race, religion, sexual orientation, etc.

/**
 * Team requirements driven by compliance
 */
export type TeamRequirement =
  | 'auth-team'          // Authentication & authorization specialists
  | 'data-team'          // Data security & privacy engineers
  | 'devsecops-team'     // DevSecOps engineers
  | 'ciso'               // Chief Information Security Officer
  | 'dpo'                // Data Protection Officer
  | 'privacy-engineering' // Privacy engineers
  | 'payments-team'      // Payment processing specialists
  | 'compliance-team';   // Compliance and legal

/**
 * Compliance standard definition
 */
export interface ComplianceStandard {
  /** Unique identifier (e.g., "HIPAA") */
  id: string;

  /** Full name of the standard */
  name: string;

  /** Data types that trigger this standard */
  dataTypes: DataType[];

  /** Regions where this standard applies */
  regions: string[];

  /** Team requirements for compliance */
  teamImpact: TeamRequirement[];

  /** Estimated cost impact */
  costImpact: string;

  /** Whether certification is required */
  certificationRequired: boolean;

  /** Audit frequency */
  auditFrequency: 'annual' | 'quarterly' | 'continuous' | 'none';

  /** Description and key requirements */
  description?: string;

  /** Official documentation URL */
  documentationUrl?: string;
}

/**
 * Compliance detection result
 */
export interface ComplianceDetectionResult {
  /** All detected standards */
  standards: ComplianceStandard[];

  /** Unique team requirements across all standards */
  teamRequirements: TeamRequirement[];

  /** Total estimated cost impact (combined) */
  totalCostEstimate: string;

  /** Recommendations for user */
  recommendations: string[];
}

/**
 * Zod schema for ComplianceStandard validation
 */
export const ComplianceStandardSchema = z.object({
  id: z.string(),
  name: z.string(),
  dataTypes: z.array(z.enum([
    'healthcare',
    'payment',
    'personal',
    'government',
    'student',
    'financial',
    'biometric',
    'location',
    'children',
    'sensitive'
  ])),
  regions: z.array(z.string()),
  teamImpact: z.array(z.enum([
    'auth-team',
    'data-team',
    'devsecops-team',
    'ciso',
    'dpo',
    'privacy-engineering',
    'payments-team',
    'compliance-team'
  ])),
  costImpact: z.string(),
  certificationRequired: z.boolean(),
  auditFrequency: z.enum(['annual', 'quarterly', 'continuous', 'none']),
  description: z.string().optional(),
  documentationUrl: z.string().url().optional()
});
