/**
 * Opportunity Score Calculator
 *
 * Calculates market opportunity score (1-10 scale) based on:
 * - Market size estimate
 * - Competition density
 * - Viral potential
 * - Innovation factor
 *
 * **Formula**:
 * score = (marketSize / 10) - (competitionDensity / 2) + viralBonus + innovationBonus
 * Clamped to 1-10 range
 *
 * **Benefits**:
 * - Algorithmic calculation (no LLM needed)
 * - Transparent scoring logic
 * - Deterministic and testable
 */

import { MarketCategory } from './types.js';

/**
 * Market size estimates by category (1-10 scale)
 *
 * Based on general market research and industry reports
 */
const MARKET_SIZE_ESTIMATES: Record<MarketCategory, number> = {
  'productivity-saas': 8,    // Large and growing
  'healthcare': 10,          // Massive market
  'fintech': 9,              // Very large market
  'e-commerce': 9,           // Huge market
  'education': 8,            // Large market
  'gaming': 7,               // Large but competitive
  'social-network': 6,       // Saturated market
  'enterprise-b2b': 8,       // Large market
  'consumer-b2c': 7,         // Moderate market
  'marketplace': 7,          // Good market
  'iot': 6,                  // Growing market
  'blockchain': 5,           // Emerging market
  'ai-ml': 9,                // Very large market
  'unknown': 5               // Default
};

/**
 * Competition density estimates by category (1-10 scale)
 *
 * Higher = more competitive
 */
const COMPETITION_DENSITY: Record<MarketCategory, number> = {
  'productivity-saas': 8,    // Very competitive
  'healthcare': 6,           // Moderate (high barriers)
  'fintech': 7,              // High competition
  'e-commerce': 9,           // Extremely competitive
  'education': 7,            // High competition
  'gaming': 8,               // Very competitive
  'social-network': 10,      // Extremely competitive
  'enterprise-b2b': 6,       // Moderate
  'consumer-b2c': 8,         // Very competitive
  'marketplace': 8,          // Very competitive
  'iot': 5,                  // Moderate
  'blockchain': 6,           // Moderate (niche)
  'ai-ml': 7,                // High competition
  'unknown': 5               // Default
};

/**
 * Calculate market opportunity score
 *
 * @param marketCategory - Detected market category
 * @param competitorCount - Number of direct competitors identified
 * @param viralPotential - Whether product has viral growth potential
 * @param innovationFactor - Innovation score (0-1) based on uniqueness
 * @returns Opportunity score (1-10) with rationale
 *
 * @example
 * ```typescript
 * const result = calculateOpportunityScore('productivity-saas', 5, true, 0.7);
 * // Returns: { score: 7, rationale: '...' }
 * ```
 */
export function calculateOpportunityScore(
  marketCategory: MarketCategory,
  competitorCount: number,
  viralPotential: boolean,
  innovationFactor: number = 0.5
): {
  score: number;
  rationale: string;
  breakdown: {
    marketSize: number;
    competition: number;
    viral: number;
    innovation: number;
  };
} {
  // Get market size and competition for this category
  const marketSize = MARKET_SIZE_ESTIMATES[marketCategory] || 5;
  const competitionBase = COMPETITION_DENSITY[marketCategory] || 5;

  // Adjust competition based on competitor count
  // More competitors = higher competition
  const competitionAdjustment = Math.min(competitorCount * 0.5, 3);
  const competition = Math.min(competitionBase + competitionAdjustment, 10);

  // Calculate base score
  let score = (marketSize / 10) * 10 - (competition / 2);

  // Viral bonus (+2 points)
  const viralBonus = viralPotential ? 2 : 0;
  score += viralBonus;

  // Innovation bonus (0-2 points based on innovation factor)
  const innovationBonus = innovationFactor * 2;
  score += innovationBonus;

  // Clamp to 1-10 range
  score = Math.max(1, Math.min(10, score));

  // Round to 1 decimal place
  score = Math.round(score * 10) / 10;

  // Generate rationale
  const rationale = generateRationale(
    marketCategory,
    marketSize,
    competition,
    viralPotential,
    innovationFactor,
    score
  );

  return {
    score,
    rationale,
    breakdown: {
      marketSize,
      competition,
      viral: viralBonus,
      innovation: innovationBonus
    }
  };
}

/**
 * Generate human-readable rationale for the score
 */
function generateRationale(
  category: MarketCategory,
  marketSize: number,
  competition: number,
  viral: boolean,
  innovation: number,
  finalScore: number
): string {
  const parts: string[] = [];

  // Market size assessment
  if (marketSize >= 8) {
    parts.push('Large market size');
  } else if (marketSize >= 6) {
    parts.push('Moderate market size');
  } else {
    parts.push('Emerging market');
  }

  // Competition assessment
  if (competition >= 8) {
    parts.push('highly competitive landscape');
  } else if (competition >= 6) {
    parts.push('moderate competition');
  } else {
    parts.push('low competition');
  }

  // Viral potential
  if (viral) {
    parts.push('viral growth potential');
  }

  // Innovation
  if (innovation >= 0.7) {
    parts.push('high innovation factor');
  } else if (innovation >= 0.4) {
    parts.push('moderate innovation');
  }

  // Overall assessment
  let assessment: string;
  if (finalScore >= 8) {
    assessment = 'Strong opportunity';
  } else if (finalScore >= 6) {
    assessment = 'Good opportunity';
  } else if (finalScore >= 4) {
    assessment = 'Moderate opportunity';
  } else {
    assessment = 'Challenging opportunity';
  }

  return `${assessment}: ${parts.join(', ')}.`;
}

/**
 * Estimate innovation factor from keywords and competitors
 *
 * Innovation factor is based on:
 * - Unique keyword combinations
 * - Number of competitors (fewer = more innovative)
 * - Presence of emerging tech keywords
 *
 * @param keywords - Product keywords
 * @param competitorCount - Number of competitors
 * @returns Innovation score (0-1)
 */
export function estimateInnovationFactor(
  keywords: string[],
  competitorCount: number
): number {
  let score = 0.5; // Start at moderate

  // Fewer competitors suggests more innovation
  if (competitorCount === 0) {
    score += 0.3;
  } else if (competitorCount <= 2) {
    score += 0.2;
  } else if (competitorCount <= 5) {
    score += 0.1;
  }

  // Emerging tech keywords boost innovation
  const emergingTech = ['ai', 'machine-learning', 'blockchain', 'crypto', 'web3', 'ar', 'vr'];
  const hasEmergingTech = keywords.some(k =>
    emergingTech.some(tech => k.toLowerCase().includes(tech))
  );

  if (hasEmergingTech) {
    score += 0.2;
  }

  // Clamp to 0-1
  return Math.max(0, Math.min(1, score));
}
