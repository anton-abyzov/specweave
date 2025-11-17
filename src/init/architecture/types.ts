/**
 * Types for Architecture Decision Engine
 */

import { z } from 'zod';

/**
 * Architecture type recommendations
 */
export type ArchitectureType =
  | 'serverless'           // AWS Lambda, Vercel, Supabase
  | 'traditional-monolith' // EC2/ECS with monolithic app
  | 'microservices'        // Kubernetes, multiple services
  | 'modular-monolith'     // Monolith with internal modules
  | 'jamstack'             // Static site + APIs
  | 'hybrid';              // Mix of approaches

/**
 * Budget type
 */
export type BudgetType =
  | 'bootstrapped'      // Self-funded, minimal budget
  | 'pre-seed'          // $100K-$500K
  | 'seed'              // $500K-$2M
  | 'series-a-plus'     // $2M+
  | 'learning';         // Non-commercial learning project

/**
 * Cost estimate at different scales
 */
export interface CostEstimate {
  /** Cost at 1K users */
  at1K: string;

  /** Cost at 10K users */
  at10K: string;

  /** Cost at 100K users */
  at100K: string;

  /** Cost at 1M users */
  at1M: string;
}

/**
 * Cloud credit offering
 */
export interface CloudCredit {
  /** Cloud provider */
  provider: string;

  /** Credit amount range */
  amount: string;

  /** Duration of credits */
  duration: string;

  /** Requirements to qualify */
  requirements?: string;

  /** Application URL */
  url?: string;
}

/**
 * Project definition generated from architecture
 */
export interface ProjectDefinition {
  /** Project name */
  name: string;

  /** Project description */
  description: string;

  /** Technology stack */
  stack: string[];
}

/**
 * Architecture recommendation
 */
export interface ArchitectureRecommendation {
  /** Recommended architecture type */
  architecture: ArchitectureType;

  /** Infrastructure components */
  infrastructure: string[];

  /** Clear rationale for this choice */
  rationale: string;

  /** Cost estimates at different scales */
  costEstimate: CostEstimate;

  /** Available cloud credits */
  cloudCredits: CloudCredit[];

  /** Generated project list */
  projects: ProjectDefinition[];

  /** Methodology (agile vs waterfall) */
  methodology: 'agile' | 'waterfall';

  /** Alternative architectures considered */
  alternatives?: Array<{
    architecture: ArchitectureType;
    pros: string[];
    cons: string[];
  }>;
}

/**
 * Zod schemas
 */
export const CostEstimateSchema = z.object({
  at1K: z.string(),
  at10K: z.string(),
  at100K: z.string(),
  at1M: z.string()
});

export const CloudCreditSchema = z.object({
  provider: z.string(),
  amount: z.string(),
  duration: z.string(),
  requirements: z.string().optional(),
  url: z.string().url().optional()
});

export const ProjectDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  stack: z.array(z.string())
});

export const ArchitectureRecommendationSchema = z.object({
  architecture: z.enum([
    'serverless',
    'traditional-monolith',
    'microservices',
    'modular-monolith',
    'jamstack',
    'hybrid'
  ]),
  infrastructure: z.array(z.string()),
  rationale: z.string(),
  costEstimate: CostEstimateSchema,
  cloudCredits: z.array(CloudCreditSchema),
  projects: z.array(ProjectDefinitionSchema),
  methodology: z.enum(['agile', 'waterfall']),
  alternatives: z.array(z.object({
    architecture: z.enum([
      'serverless',
      'traditional-monolith',
      'microservices',
      'modular-monolith',
      'jamstack',
      'hybrid'
    ]),
    pros: z.array(z.string()),
    cons: z.array(z.string())
  })).optional()
});
