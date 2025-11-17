/**
 * Configuration type definitions with Zod schemas
 */

import { z } from 'zod';

export const ResearchConfigSchema = z.object({
  vision: z.any().optional(),
  compliance: z.array(z.any()).optional(),
  teams: z.array(z.any()).optional(),
  repositories: z.array(z.string()).optional(),
  architecture: z.any().optional()
}).optional();

export const SpecWeaveConfigSchema = z.object({
  version: z.string(),
  project: z.object({
    name: z.string(),
    type: z.enum(['single', 'multi'])
  }),
  research: ResearchConfigSchema,
  livingDocs: z.object({
    enabled: z.boolean(),
    baseDir: z.string()
  }).optional()
});

export type ResearchConfig = z.infer<typeof ResearchConfigSchema>;
export type SpecWeaveConfig = z.infer<typeof SpecWeaveConfigSchema>;
