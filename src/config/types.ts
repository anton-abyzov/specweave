/**
 * SpecWeave Configuration Types
 *
 * Defines the structure for .specweave/config.json
 * which stores all research insights and project settings.
 */

import { z } from 'zod';
import { VisionInsightsSchema } from '../init/research/types.js';
import { ComplianceStandardSchema } from '../init/compliance/types.js';
import { TeamRecommendationSchema } from '../init/team/types.js';
import { ArchitectureRecommendationSchema } from '../init/architecture/types.js';

/**
 * Research configuration schema
 */
export const ResearchConfigSchema = z.object({
  /** Vision & Market Research results */
  vision: VisionInsightsSchema.optional(),

  /** Compliance standards detected */
  compliance: z.object({
    standards: z.array(ComplianceStandardSchema),
    teamRequirements: z.array(z.string()),
    totalCostEstimate: z.string(),
    recommendations: z.array(z.string())
  }).optional(),

  /** Team recommendations */
  teams: z.array(TeamRecommendationSchema).optional(),

  /** Architecture decision */
  architecture: ArchitectureRecommendationSchema.optional(),

  /** Methodology (Agile or Waterfall) */
  methodology: z.enum(['agile', 'waterfall']).optional(),

  /** Repository selection */
  repositories: z.array(z.object({
    name: z.string(),
    url: z.string(),
    owner: z.string(),
    language: z.string().optional(),
    stars: z.number().optional(),
    lastUpdated: z.string().optional()
  })).optional()
});

/**
 * Living Docs configuration schema
 */
export const LivingDocsConfigSchema = z.object({
  /** Enable copy-based sync */
  copyBasedSync: z.object({
    enabled: z.boolean().default(true)
  }).default({ enabled: true }),

  /** Enable three-layer sync (GitHub <-> Living Docs <-> Increment) */
  threeLayerSync: z.boolean().default(true)
});

/**
 * Main SpecWeave configuration schema
 */
export const SpecWeaveConfigSchema = z.object({
  /** Config schema version */
  version: z.string().default('1.0.0'),

  /** Project name */
  projectName: z.string(),

  /** Research insights from strategic init */
  research: ResearchConfigSchema.optional(),

  /** Living docs settings */
  livingDocs: LivingDocsConfigSchema.default({ copyBasedSync: { enabled: true }, threeLayerSync: true }),

  /** Last updated timestamp */
  lastUpdated: z.string().optional()
});

/**
 * Type definitions
 */
export type ResearchConfig = z.infer<typeof ResearchConfigSchema>;
export type LivingDocsConfig = z.infer<typeof LivingDocsConfigSchema>;
export type SpecWeaveConfig = z.infer<typeof SpecWeaveConfigSchema>;
