/**
 * Types for Vision & Market Research Engine
 *
 * This module defines the core types for analyzing product vision,
 * detecting market categories, identifying competitors, and calculating
 * opportunity scores.
 */

import { z } from 'zod';

/**
 * Market category classification
 *
 * 13+ market categories covering common product types
 */
export type MarketCategory =
  | 'productivity-saas'
  | 'healthcare'
  | 'fintech'
  | 'e-commerce'
  | 'education'
  | 'gaming'
  | 'social-network'
  | 'enterprise-b2b'
  | 'consumer-b2c'
  | 'marketplace'
  | 'iot'
  | 'blockchain'
  | 'ai-ml'
  | 'unknown';

/**
 * Competitor information
 */
export interface Competitor {
  /** Competitor product name */
  name: string;

  /** Product URL (optional) */
  url?: string;

  /** Key strengths of the competitor */
  strengths: string[];

  /** Key weaknesses or gaps */
  weaknesses: string[];
}

/**
 * Follow-up question for adaptive questioning
 */
export interface Question {
  /** Question text */
  question: string;

  /** Question type (open-ended, multiple-choice, etc.) */
  type: 'open' | 'multiple-choice' | 'scale';

  /** Options for multiple-choice questions */
  options?: string[];

  /** Why this question is being asked */
  rationale: string;
}

/**
 * Vision insights extracted from product description
 *
 * This is the primary output of the VisionAnalyzer
 */
export interface VisionInsights {
  /** 5-10 domain-specific keywords extracted from vision */
  keywords: string[];

  /** Detected market category */
  market: MarketCategory;

  /** 3-5 comparable products (competitors) */
  competitors: Competitor[];

  /** Market opportunity score (1-10 scale) */
  opportunityScore: number;

  /** Whether product has viral growth potential */
  viralPotential: boolean;

  /** Adaptive follow-up questions based on vision */
  followUpQuestions: Question[];

  /** Confidence score for market detection (0-1) */
  confidence?: number;

  /** Raw vision text provided by user */
  rawVision: string;
}

/**
 * Zod schema for VisionInsights validation
 */
export const VisionInsightsSchema = z.object({
  keywords: z.array(z.string()).min(3).max(15),
  market: z.enum([
    'productivity-saas',
    'healthcare',
    'fintech',
    'e-commerce',
    'education',
    'gaming',
    'social-network',
    'enterprise-b2b',
    'consumer-b2c',
    'marketplace',
    'iot',
    'blockchain',
    'ai-ml',
    'unknown'
  ]),
  competitors: z.array(
    z.object({
      name: z.string(),
      url: z.string().url().optional(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string())
    })
  ).min(0).max(10),
  opportunityScore: z.number().min(1).max(10),
  viralPotential: z.boolean(),
  followUpQuestions: z.array(
    z.object({
      question: z.string(),
      type: z.enum(['open', 'multiple-choice', 'scale']),
      options: z.array(z.string()).optional(),
      rationale: z.string()
    })
  ),
  confidence: z.number().min(0).max(1).optional(),
  rawVision: z.string()
});

/**
 * Zod schema for Competitor validation
 */
export const CompetitorSchema = z.object({
  name: z.string(),
  url: z.string().url().optional(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string())
});

/**
 * Zod schema for Question validation
 */
export const QuestionSchema = z.object({
  question: z.string(),
  type: z.enum(['open', 'multiple-choice', 'scale']),
  options: z.array(z.string()).optional(),
  rationale: z.string()
});
