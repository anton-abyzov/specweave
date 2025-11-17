/**
 * Adaptive Question Generator
 *
 * Generates context-aware follow-up questions based on product vision,
 * market category, and detected patterns.
 *
 * **Approach**:
 * 1. Analyze vision insights (market, viral potential, etc.)
 * 2. Select relevant question templates
 * 3. Return 2-3 adaptive questions max
 * 4. Prioritize most impactful questions
 *
 * **Benefits**:
 * - Context-aware questioning
 * - Progressive disclosure (not overwhelming)
 * - Deterministic and testable
 */

import { MarketCategory, Question } from './types.js';

/**
 * Question template with conditions
 */
interface QuestionTemplate {
  /** Condition for when this question should be asked */
  condition: (insights: QuestionContext) => boolean;

  /** Question factory function */
  generate: (insights: QuestionContext) => Question;

  /** Priority (higher = more important) */
  priority: number;
}

/**
 * Context for generating questions
 */
export interface QuestionContext {
  /** Detected market category */
  marketCategory: MarketCategory;

  /** Viral growth potential */
  viralPotential: boolean;

  /** Opportunity score (1-10) */
  opportunityScore: number;

  /** Extracted keywords */
  keywords: string[];

  /** Number of competitors */
  competitorCount: number;
}

/**
 * Question templates organized by context
 *
 * Each template has:
 * - Condition: When to ask this question
 * - Generator: How to build the question
 * - Priority: How important this question is
 */
const QUESTION_TEMPLATES: QuestionTemplate[] = [
  // Viral Potential → Ask about scaling and growth
  {
    condition: (ctx) => ctx.viralPotential,
    priority: 10,
    generate: () => ({
      question: 'What are your expected user growth targets in the first 6 months?',
      type: 'multiple-choice',
      options: [
        '< 1,000 users (slow growth)',
        '1K - 10K users (moderate growth)',
        '10K - 100K users (viral growth)',
        '100K+ users (explosive growth)'
      ],
      rationale: 'Understanding growth expectations helps recommend scalable architecture (serverless vs traditional).'
    })
  },

  // Viral Potential → Ask about viral mechanisms
  {
    condition: (ctx) => ctx.viralPotential,
    priority: 9,
    generate: () => ({
      question: 'How will users discover and share your product?',
      type: 'multiple-choice',
      options: [
        'Social sharing (built-in share features)',
        'Network effects (more users = more value)',
        'User-generated content',
        'Referral program',
        'Paid advertising'
      ],
      rationale: 'Viral mechanisms influence product architecture and feature priorities.'
    })
  },

  // Enterprise/Healthcare → Ask about compliance
  {
    condition: (ctx) =>
      ctx.marketCategory === 'enterprise-b2b' ||
      ctx.marketCategory === 'healthcare',
    priority: 10,
    generate: (ctx) => ({
      question: `Will you handle sensitive data? (${ctx.marketCategory === 'healthcare' ? 'PHI, medical records' : 'confidential business data'})`,
      type: 'multiple-choice',
      options: [
        'Yes - Healthcare data (PHI)',
        'Yes - Payment data (PCI)',
        'Yes - Personal data (GDPR/CCPA)',
        'Yes - Government data (FedRAMP)',
        'No sensitive data'
      ],
      rationale: 'Compliance requirements determine architecture, team structure, and costs.'
    })
  },

  // Healthcare specific
  {
    condition: (ctx) => ctx.marketCategory === 'healthcare',
    priority: 9,
    generate: () => ({
      question: 'What regions will your healthcare product operate in?',
      type: 'multiple-choice',
      options: [
        'United States only (HIPAA)',
        'European Union (GDPR + local)',
        'Global (multiple compliance standards)',
        'Not decided yet'
      ],
      rationale: 'Regional compliance affects team requirements and infrastructure choices.'
    })
  },

  // Fintech specific
  {
    condition: (ctx) => ctx.marketCategory === 'fintech',
    priority: 10,
    generate: () => ({
      question: 'How will you handle payments and financial data?',
      type: 'multiple-choice',
      options: [
        'Use Stripe/PayPal (outsource PCI compliance)',
        'Build in-house (full PCI-DSS compliance)',
        'Hybrid (some in-house, some third-party)',
        'Not decided yet'
      ],
      rationale: 'Payment handling determines compliance overhead and team requirements.'
    })
  },

  // High competition → Ask about differentiation
  {
    condition: (ctx) => ctx.competitorCount >= 5,
    priority: 8,
    generate: () => ({
      question: 'What makes your product different from existing competitors?',
      type: 'open',
      rationale: 'Understanding differentiation helps identify unique technical requirements.'
    })
  },

  // Low competition → Ask about barriers
  {
    condition: (ctx) => ctx.competitorCount <= 2,
    priority: 7,
    generate: () => ({
      question: 'Why do you think this market is underserved?',
      type: 'open',
      rationale: 'Understanding market gaps helps validate opportunity and identify technical challenges.'
    })
  },

  // B2C/Consumer → Ask about monetization
  {
    condition: (ctx) =>
      ctx.marketCategory === 'consumer-b2c' ||
      ctx.marketCategory === 'social-network',
    priority: 7,
    generate: () => ({
      question: 'How will you monetize your product?',
      type: 'multiple-choice',
      options: [
        'Freemium (free tier + paid upgrades)',
        'Subscription (monthly/annual)',
        'Advertising',
        'Transaction fees',
        'Not decided yet'
      ],
      rationale: 'Monetization strategy affects feature priorities and infrastructure needs.'
    })
  },

  // Enterprise → Ask about team size
  {
    condition: (ctx) => ctx.marketCategory === 'enterprise-b2b',
    priority: 8,
    generate: () => ({
      question: 'How large is your target customer organization?',
      type: 'multiple-choice',
      options: [
        'Small businesses (< 50 employees)',
        'Mid-market (50-500 employees)',
        'Enterprise (500-5000 employees)',
        'Large enterprise (5000+ employees)'
      ],
      rationale: 'Customer size affects feature complexity, compliance needs, and support requirements.'
    })
  },

  // Default → Ask about timeline
  {
    condition: () => true, // Always applicable
    priority: 5,
    generate: () => ({
      question: 'What is your target launch timeline?',
      type: 'multiple-choice',
      options: [
        'MVP in 1-3 months',
        'Beta in 3-6 months',
        'Full launch in 6-12 months',
        'Longer than 1 year'
      ],
      rationale: 'Timeline affects technology choices and architectural decisions (YAGNI vs future-proof).'
    })
  },

  // Default → Ask about budget
  {
    condition: () => true,
    priority: 6,
    generate: () => ({
      question: 'What is your development approach?',
      type: 'multiple-choice',
      options: [
        'Bootstrapped (self-funded)',
        'Pre-seed / Angel funded',
        'Seed / Series A funded',
        'Series B+ funded',
        'Learning project (non-commercial)'
      ],
      rationale: 'Funding stage affects architecture recommendations and cloud credit eligibility.'
    })
  }
];

/**
 * Generate adaptive follow-up questions based on vision insights
 *
 * Selects the most relevant 2-3 questions based on context,
 * sorted by priority.
 *
 * @param context - Question generation context
 * @param maxQuestions - Maximum questions to return (default: 3)
 * @returns Array of adaptive questions
 *
 * @example
 * ```typescript
 * const questions = generateFollowUpQuestions({
 *   marketCategory: 'healthcare',
 *   viralPotential: false,
 *   opportunityScore: 7,
 *   keywords: ['health', 'medical', 'patient'],
 *   competitorCount: 3
 * });
 * // Returns healthcare-specific compliance and region questions
 * ```
 */
export function generateFollowUpQuestions(
  context: QuestionContext,
  maxQuestions: number = 3
): Question[] {
  // Filter templates based on conditions
  const applicable = QUESTION_TEMPLATES.filter(template =>
    template.condition(context)
  );

  // Sort by priority (descending)
  applicable.sort((a, b) => b.priority - a.priority);

  // Take top N and generate questions
  const questions = applicable
    .slice(0, maxQuestions)
    .map(template => template.generate(context));

  return questions;
}

/**
 * Get all potential questions with their priorities (useful for debugging)
 *
 * @param context - Question generation context
 * @returns Array of questions with priorities and conditions
 */
export function analyzeQuestions(context: QuestionContext): Array<{
  question: Question;
  priority: number;
  applicable: boolean;
}> {
  return QUESTION_TEMPLATES.map(template => ({
    question: template.generate(context),
    priority: template.priority,
    applicable: template.condition(context)
  })).sort((a, b) => b.priority - a.priority);
}
