/**
 * Types for Team Recommendation System
 */

import { z } from 'zod';

/**
 * Serverless alternative for a team/service
 */
export interface ServerlessAlternative {
  /** Service name (e.g., "AWS Cognito", "Stripe") */
  service: string;

  /** Monthly cost savings compared to in-house */
  costSavings: number;

  /** Tradeoffs of using serverless */
  tradeoffs: string[];

  /** Pricing model */
  pricingModel?: string;
}

/**
 * Team recommendation
 */
export interface TeamRecommendation {
  /** Team name identifier */
  teamName: string;

  /** Human-readable role */
  role: string;

  /** Whether this team is required (true) or optional (false) */
  required: boolean;

  /** Why this team is needed */
  reason: string;

  /** Recommended team size */
  size: string;

  /** Required skills for this team */
  skills: string[];

  /** Serverless alternative (if applicable) */
  serverlessAlternative?: ServerlessAlternative;

  /** Priority (higher = more important) */
  priority?: number;
}

/**
 * Zod schema for TeamRecommendation
 */
export const TeamRecommendationSchema = z.object({
  teamName: z.string(),
  role: z.string(),
  required: z.boolean(),
  reason: z.string(),
  size: z.string(),
  skills: z.array(z.string()),
  serverlessAlternative: z.object({
    service: z.string(),
    costSavings: z.number(),
    tradeoffs: z.array(z.string()),
    pricingModel: z.string().optional()
  }).optional(),
  priority: z.number().optional()
});
